from fastapi import APIRouter, UploadFile, File, Form, Request, Depends, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from pathlib import Path

import os, tempfile, ast, json
import pandas as pd
import numpy as np
import openpyxl

from src.db.connection import get_db
from src.dto.HwpDTO import *
from src.dto.CustomDefaultDict import CustomDefaultDict
from src.service.HwpService import HwpService
from src.mapper.HwpMapper import HwpMapper
from src.container.ParserContainer import ParserContainer

STANDARD_COLUMNS = {
    '간단이' : { 
        '일시' : 'measurement_date', 
        '구분' : 'measurement_location',
        '진동속도(cm/s)' : 'wave_speed', 
        '진동레벨[dB(V)]' : 'wave_level', 
        '소음[dB(A)]' : 'noise', 
        '비고' : 'marks'
        }, 
    '복잡이' : {
        '일시' : 'measurement_date', 
        '시간' : 'measurement_time', 
        '발파진동(cm/s)' : 'wave_speed', 
        '진동레벨dB(V)' : 'wave_level', 
        '소음레벨dB(A)' : 'noise', 
        '측정위치' : 'measurement_location'
        }, 
    '어중이떠중이' : {
        '일자' : 'measurement_date',
        '계측위치' : 'measurement_location',
        '발파시간' : 'measurement_time', 
        '진동속도(cm/s)' : 'wave_speed', 
        '진동레벨(dB(V))' : 'wave_level', 
        '소음레벨(dB(A))' : 'noise'
        }
    }

parser = APIRouter(prefix='/parser')
service = HwpService()
mapper = HwpMapper()

def get_parser(version: str):
    parserContainer = ParserContainer()
    return parserContainer.parserVersion().get(version)

@parser.post('/', tags=['parser'])
async def parsing(
    file: UploadFile = File(...), 
    search_text: str = Form(...), 
    version: str = Form(...), 
    db=Depends(get_db),
):    
    parser = get_parser(version)
    serialize_data = []

    with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
        contents = await file.read()
        tmp_file.write(contents)
        tmp_file_path = tmp_file.name
    try:
        xml_path = service.hwp2xml(tmp_file_path)
        if not xml_path:
            return {"error": "HWP to XML conversion failed"}
    finally:
        os.unlink(tmp_file_path)  # 임시 HWP 파일 삭제

    # 만약 target_tag가 2개면 column_tag도 2개 그럴 땐 어떡하지? 
    columnTag, textTag, charShapeList = service.findTag(xml_path, search_text)
    xmlData = service.setTableData(columnTag, textTag, charShapeList)

    # print(xmlData)
    os.remove(xml_path)
    
    filteredXmlData = parser.getFilteredDataList(xmlData)

    for xmlDataList in filteredXmlData:
        serialize_data.extend(parser.getSerializeList([xmldata for xmldata in xmlDataList if xmldata['text']]))

    result = []
    for data in serialize_data:
        versionColumn = STANDARD_COLUMNS.get(version, {})
        transformedData = {newKey: data[oldKey] for oldKey, newKey in versionColumn.items() if oldKey in data}
        result.append(transformedData)

    mapper.insert(file.filename, result, db)

    return file.filename

@parser.get('/{filename}', tags=['parser'])
async def getHwpDataList(filename: str, db: Session = Depends(get_db)):
    dbData = mapper.getFileDataList(mapper.getFileID(filename, db), db)

    for idx in range(len(dbData)):
        try:
            dbData[idx].wave_level = ast.literal_eval(dbData[idx].wave_level)
            dbData[idx].wave_speed = ast.literal_eval(dbData[idx].wave_speed)
            dbData[idx].noise = ast.literal_eval(dbData[idx].noise)
        except:
            continue

    return dbData
    
@parser.get('/{filename}/locations', tags=['parser'], response_model=list[str])
async def getLocatons(filename: str, db: Session = Depends(get_db)):
    return mapper.getFileLocationDataList(mapper.getFileID(filename, db), db)

# 여기 지금 None 값 섞인 채로 리턴되면 에러가 발생함;
@parser.get('/{filename}/statistics', tags=['parser'])
async def getStatisticsData(filename: str, db: Session = Depends(get_db)):
    compareColumns = ['wave_speed', 'wave_level', 'noise']

    dbData = mapper.getFileDataList(mapper.getFileID(filename, db), db)
    locations = mapper.getFileLocationDataList(mapper.getFileID(filename, db), db)

    result = []
    for location in locations:
        statisticsResult = CustomDefaultDict()
        statisticsResult.append('measurement_location', location)
        for column in compareColumns:
            tmpList = [parseFloat(transLiteral(vars(item)[column])) for item in dbData if item.measurement_location == location]
            tmpDF = pd.DataFrame(tmpList)
            
            if isNestedList(tmpList):
                statisticsResult.append(column, [str(float(tmpDF[0].min(skipna=True))), str(float(tmpDF[0].max(skipna=True)))])
                statisticsResult.append(column, [str(float(tmpDF[1].min(skipna=True))), str(float(tmpDF[1].max(skipna=True)))])
            else:
                statisticsResult.append(column, str(float(tmpDF[0].min(skipna=True))))
                statisticsResult.append(column, str(float(tmpDF[0].max(skipna=True))))

        result.append(dict(statisticsResult))
        
    return result
        
@parser.get('/{filename}/download/{version}', tags=['parser'])
async def download_excel(filename: str, version: str, db: Session = Depends(get_db)):
    dbData = mapper.getFileDataList(mapper.getFileID(filename, db), db)

    tmp = [{key:value for key,value in i.__dict__.items()} for i in dbData]
    df = pd.DataFrame(tmp).drop(columns=['_sa_instance_state', 'data_id', 'file_id'])

    waveSpeed = df['wave_speed']
    waveLevel = df['wave_level']
    noise = df['noise']

    desired_columns = [column for column in STANDARD_COLUMNS[version].values()]
    existing_columns = [col for col in desired_columns if col in df.columns]
    df = df[existing_columns]

    mapping= {v: k for k, v in STANDARD_COLUMNS[version].items()}
    df.rename(columns=mapping, inplace=True)

    df = transExcel(waveSpeed, waveLevel, noise, df, version)
    with pd.ExcelWriter(f'{filename}.xlsx') as writer:
        for location, group in df.groupby(mapping['measurement_location']):
            group.to_excel(writer, sheet_name=location, index=False)

            # Set all columns to the same width
            column_width = 30  # Change this value to your desired width
            for column in group.columns:
                col_idx = group.columns.get_loc(column) + 1
                writer.sheets[location].column_dimensions[openpyxl.utils.get_column_letter(col_idx)].width = column_width       

    response = FileResponse(f'./{filename}.xlsx', filename=f"{filename}.xlsx", media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    return response

##################################################################################################

# def existinColumns()

def transExcel(waveSpeed, waveLevel, noise, df, version):
    if version == '간단이':
        newColumns = ['진동속도(cm/s) 최저치', '진동레벨(dB(V)) 최저치', '소음레벨(dB(A)) 최저치', '진동속도(cm/s) 최고치', '진동레벨(dB(V)) 최고치', '소음레벨(dB(A)) 최고치']
        cols = list(df.columns)

        index_at = cols.index('진동속도(cm/s)')
        for idx in range(len(newColumns)):
            cols.insert(index_at + idx, newColumns[idx])

        df['진동속도(cm/s) 최저치'] = [ast.literal_eval(i)[0] for i in waveSpeed]
        df['진동레벨(dB(V)) 최저치'] = [ast.literal_eval(i)[0] for i in waveLevel]
        df['소음레벨(dB(A)) 최저치'] = [ast.literal_eval(i)[0] for i in noise]

        df['진동속도(cm/s) 최고치'] = [ast.literal_eval(i)[1] for i in waveSpeed]
        df['진동레벨(dB(V)) 최고치'] = [ast.literal_eval(i)[1] for i in waveLevel]
        df['소음레벨(dB(A)) 최고치'] = [ast.literal_eval(i)[1] for i in noise]

        return df[cols].drop(columns=['진동속도(cm/s)', '진동레벨[dB(V)]', '소음[dB(A)]'])
    elif version == '어중이떠중이':
        df['진동속도(cm/s)'] = [ast.literal_eval(i)[1] for i in waveSpeed]
        df['진동레벨(dB(V))'] = [ast.literal_eval(i)[1] for i in waveLevel]
        df['소음레벨(dB(A))'] = [ast.literal_eval(i)[1] for i in noise]
    else:
        df['발파진동(cm/s)'] = [i for i in waveSpeed]
        df['진동레벨dB(V)'] = [i for i in waveLevel]
        df['소음레벨dB(A)'] = [i for i in noise]

    return df

def transLiteral(value):
    try:
        return ast.literal_eval(value)
    except:
        return value

def parseFloat(value):
    if isinstance(value, list):
        for idx in range(len(value)):
            try:
                value[idx] = float(value[idx])
            except:
                value[idx] = None
        return value
    else:
        try:
            return float(value)
        except:
            return None

def isNestedList(value):
    if isinstance(value, list):
        return all(isinstance(item, list) for item in value)
    else:
        return False

# def classification_evening_data(data_frame: pd.DataFrame, parser_name: str,):
#     new_columns = []

#     if not parser_name == "간단이":
#         for index, item in enumerate(list(data_frame.index)):
#             time = int(data_frame.loc[item, '발파시간'].split(" ")[1].split(':')[0])
#             if time >= 18:
#                 new_columns.append(data_frame.loc[item, '소음레벨dB(A)'])
#                 data_frame.loc[item, '소음레벨dB(A)'] = None
#             else:
#                 new_columns.append(None)

#         data_frame['Atfter 18:00'] = new_columns

#     return data_frame.to_dict()
