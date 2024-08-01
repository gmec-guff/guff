import React, { useState, useEffect, useRef } from 'react';
import { Calendar, message, Dropdown, Popover } from 'antd';
import CustomDrawer from './CustomDrawer';
import dayjs from 'dayjs';
import axios from 'axios';
import styled from 'styled-components';
import './CustomCalendarCss.css';


const EventItem = styled.div`
  border-radius: 7px;
  background: ${props => props.background ? props.background : '#d9d9d9'};
  margin-bottom: 3px;

  &:hover,
  &.group-hover {
    background-color: lightblue;
    box-shadow: 0px 1px 1px 0px rgba(0,0,0,0.1),
                0px 2px 4px 0px rgba(0,0,0,0.08),
                0px 4px 12px 0px rgba(0,0,0,0.06);
  }
`;

const CustomCalendar = () => {
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentYear, setCurrentYear] = useState(dayjs().year());
  const [currentYearData, setCurrentYearData] = useState([]);
  
  useEffect(() => {
    const fetchYearData = async() => {
      try {
        const response = await axios.get('http://localhost:8000/schedule/year/' + currentYear);
        setCurrentYearData(response.data);
      } catch (error) {
        message.error('캘린더 데이터 조회 실패')
      }
    }

    fetchYearData();
  }, [currentYear, open]);

  const onPanelChange = (value, mode) => {
    setCurrentYear(value.year());
  }

  const showDrawer = (item) => {
    const shallowItem = {...item}
    setSelectedItem(shallowItem);
    setOpen(true);
  }

  const closeDrawer = () => {
    setOpen(false);
  }

  const updateItemTitle = (id, newTitle) => {
    setCurrentYearData((prevData) =>
      prevData.map((item) =>
        item.schedule_id === id ? { ...item, schedule_title: newTitle } : item
      )
    );
  };

  const cellDataRender = (date) => {
    const targetData = Object.keys(currentYearData).map(key => {
      const startDate = dayjs(currentYearData[key].schedule_startDate).format('YYYY-MM-DD');
      const endDate = dayjs(currentYearData[key].schedule_endDate).format('YYYY-MM-DD');
      if (startDate <= date.format('YYYY-MM-DD') && endDate >= date.format('YYYY-MM-DD')) return currentYearData[key];
    }).filter(item => item != null)

    return (
      <Dropdown menu={{}} trigger={['contextMenu']}>
        <div>
          {targetData.map(item => (
            <EventItem background={item.schedule_color}>
              <Popover 
                content={
                    <div>
                      <p>시작: {dayjs(item.schedule_startDate).format("YYYY-MM-DD")}</p>
                      <p>종료: {dayjs(item.schedule_endDate).format("YYYY-MM-DD")}</p>
                    </div>
                }
                title={item.schedule_title}
              >
                <div style={{marginLeft: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: 1}} onClick={() => showDrawer(item)}>
                  {item.schedule_title}
                </div>
              </Popover>
            </EventItem>
          ))}
        </div>
      </Dropdown>
    );

  };

  return (
    <>
      <Calendar
        cellRender={cellDataRender}
        onPanelChange={onPanelChange}
      />
      <CustomDrawer
        onClose={closeDrawer}
        open={open}
        item={selectedItem}
        updateItemTitle={updateItemTitle}
      />
    </>  
  );
};

export default CustomCalendar;
