import styled from 'styled-components';
import axios from "axios";
import React, { useState, useEffect } from 'react';
import { SearchOutlined, DownloadOutlined, PlusOutlined } from '@ant-design/icons';
import { Table, Button, Form, Badge, Popconfirm, notification, Layout, Space } from 'antd';

import AssetUpdateModal from './AssetUpdateModal';
import AssetReadModal from './AssetReadModal';
import AssetCreateModal from './AssetCreateModal';

/* eslint-disable no-restricted-globals */

const { Header, Content, Footer, Sider } = Layout;

const EllipsisText = styled.div`
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px; /* 적절한 너비로 설정 */
`;

function AssetTable() {
    const [data, setData] = useState([]); // 서버에서 가져온 데이터를 상태로 관리
    const [visibleItems, setVisibleItems] = useState(10); // 초기 보여지는 아이템 수
    const [selectedItem, setSelectedItem] = useState(null); // 선택된 아이템 데이터

    // Assetpage에 필요한 상태 관리
    const [brandFilters, setBrandFilters] = useState(null);
    const [locationFilters, setLocationFilters] = useState(null);

    // 모달 관련 상태 관리
    const [isCreateModalVisible, setCreateModalVisible] = useState(false);
    const [isReadModalVisible, setReadModalVisible] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [api, contextHolder] = notification.useNotification();
    const [deleteSuccess, setDeleteSuccess] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // 처음 렌더링 할 때 필요한 데이터들 API에 요청해주는 상태 관리 함수
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get('http://192.168.0.102:8000/asset/');
                const brandResponse = await axios.get('http://192.168.0.102:8000/brand/'); // 브랜드 API
                const locationResponse = await axios.get('http://192.168.0.102:8000/location/'); // 위치 API

                setBrandFilters(brandResponse.data.map(brand => ({ text: brand.brand_name, value: brand.brand_name })));
                setLocationFilters(locationResponse.data.map(location => ({ text: location.location_name, value: location.location_name })));

                setData(response.data);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };

        fetchData();
    }, []);

    // 수정 모달 창 실행 함수
    const showModal = (record) => {
        setSelectedItem(record);
        setIsModalVisible(true);
    };

    // 조회 모달 창 실행 함수
    const showReadModal = (record) => {
        setSelectedItem(record);
        setReadModalVisible(true);
    }

    // 조회 모달 창 실행 함수
    const showCreateModal = () => {
        setCreateModalVisible(true);
    }

    // 수정 모달 창 종료 함수
    const handleCancel = () => {
        setIsModalVisible(false);
    };

    // 조회 모달 창 종료 함수
    const handleReadModalCancel = () => {
        setReadModalVisible(false);
    };

    // 추가 모달 창 종료 함수
    const handleCreateModalCancel = () => {
        setCreateModalVisible(false);
    };

    const handleTableChange = (pagination) => {
        setCurrentPage(pagination.current);
        setPageSize(pagination.pageSize);
    }

    const currentData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // 메세지를 보내서 알림 창 띄우는 함수
    const handleNotification = (message) => {
        api.info({
            message: '알림',
            description: message,
        });
    };

    // 데이터 수정을 위한 API 요청 함수
    const handleOk = async (values) => {
        try {
            const updatedItem = await form.validateFields();
            await axios.put(`http://192.168.0.102:8000/asset/put/`, values);
            const response = await axios.get('http://192.168.0.102:8000/asset/');
            setData(response.data);
            setIsModalVisible(false);

            handleNotification('자산 현황 데이터를 수정했습니다.');
        } catch (error) {
            console.error("Error updating data:", error);
        }
    };

    // 데이터 삭제를 위한 API 요청 함수
    const handleDelete = async (id) => {
        try{
            await axios.delete(`http://192.168.0.102:8000/asset/delete/${id}`);
            const response = await axios.get('http://192.168.0.102:8000/asset/');
            const updatedData = response.data;
            const totalPages = Math.ceil(updatedData.length / pageSize);
    
            if (currentPage > totalPages) {
                setCurrentPage(totalPages);
            }

            setData(updatedData);
            handleNotification('배터리 현황 데이터를 삭제했습니다.');
        } catch(error) {
            console.error('Error delete data: ', error);
        }
    };

    // 데이터 추가를 위한 API 요청 함수
    const handleCreate = async (item) => {
        try {
            console.log(item);
            const tesmp = {
                "brand_name": "NeoBlast",
                "asset_name": "test",
                "state": true,
                "location_name": "사무실",
                "start_date": "2024-06-25",
                "end_date": "2024-06-25",
                "rent_state": true,
                "marks": null
            };

            console.log(tesmp);
            console.log(item);
            await axios.post('http://192.168.0.102:8000/asset/add/', item);
            
            const response = await axios.get('http://192.168.0.102:8000/asset/');
            setData(response.data);
            setCreateModalVisible(false);

            handleNotification('자산 현황 데이터를 추가했습니다.');
        } catch(error) {
            console.error('Error create data: ', error);
        }
    }

    // 교정일 차기 교정일을 년 월 일 로 출력하기 위한 함수
    const formatDate = (dateString) => {
        if(!dateString) {
            return '';
        }
        const year = dateString.substring(2, 4); // YY
        const month = dateString.substring(5, 7); // MM
        const day = dateString.substring(8, 10); // DD
        return `${year}년 ${month}월 ${day}일`;
      };

    // 현재 날짜 기준 교정일, 차기교정일 하이라이팅 함수
    const isDateWithinNextSevenDays = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const endOfPeriod = new Date(now);
        endOfPeriod.setDate(now.getDate() + 7);

        now.setHours(0, 0, 0, 0);
        endOfPeriod.setHours(23, 59, 59, 999);

        if (!dateString) {
            return '';
        } else {
            return date >= now && date <= endOfPeriod;
        }
    };

    // 표 속성 정해주는 변수
    const columns = [
        // {
        //     title: '순번',
        //     dataIndex: 'asset_id',
        //     key: 'asset_id',
        //     align: 'center',
        // },
        {
            title: '사용 여부',
            dataIndex: 'state',
            key: 'state',
            align: 'center',
            filters: [
                { text: '사용', value: true },
                { text: '미사용', value: false },
            ],
            onFilter: (value, record) => record.state == value,
            render: (text, record) => {
                const state_badge = record.state === true ? <Badge dot color='green'></Badge> : <Badge dot color='red'></Badge>
                return (
                    state_badge
                );
            }
        },
        {
            title: '제조 회사',
            dataIndex: 'brand_name',
            key: 'brand_name',
            align: 'center',
            filters: brandFilters,
            onFilter: ( value, record ) => record.brand_name === value,
        },
        {
            title: '기기 번호',
            dataIndex: 'asset_name',
            key: 'asset_name',
            align: 'center',
        },
        {
            title: '교정일',
            key: 'start_date',
            align: 'center',
            render: (text, record) => {
                const isStartDateWithinNextSevenDays = isDateWithinNextSevenDays(record.start_date);

                const startDateStyle = {
                    color: isStartDateWithinNextSevenDays ? '#BE35FF' : 'black',
                    fontWeight: isStartDateWithinNextSevenDays ? 'bold' : 'normal'
                };

                return (
                    <span style={startDateStyle}>{formatDate(record.start_date)}</span>
                );
            },
        },
        {
            title: '차기교정일',
            key: 'end_date',
            align: 'center',
            render: (text, record) => {
                const isEndDateWithinNextSevenDays = isDateWithinNextSevenDays(record.end_date);

                const endDateStyle = {
                    color: isEndDateWithinNextSevenDays ? '#BE35FF' : 'black',
                    fontWeight: isEndDateWithinNextSevenDays ? 'bold' : 'normal'
                };

                return (
                    <span style={endDateStyle}>{formatDate(record.end_date)}</span>
                );
            },
        },
        {
            title: '현장',
            dataIndex: 'location_name',
            key: 'location_name',
            align: 'center',
            filters: locationFilters,
            onFilter: ( value, record ) => record.location_name === value,
        },
        {
            title: '임대',
            dataIndex: 'rent_state',
            key: 'rent_state',
            align: 'center',
            filters: [
                { text: '임대', value: true },
                { text: '비임대', value: false },
            ],
            onFilter: (value, record) => record.rent_state == value,
            render: (text, record) => {
                const rent_badge = record.rent_state === true ? <Badge dot color='green'></Badge> : <Badge dot color='red'></Badge>
                return (
                    rent_badge
                );
            }
        },
        {
            title: '비고',
            dataIndex: 'marks',
            key: 'marks',
            align: 'center',
            render: (text) => (
                <EllipsisText>{text}</EllipsisText>
            ),
        },
        {
            title: '수정',
            key: 'actions',
            align: 'center',
            render: (text, record) => (
                <div>
                    <Button onClick={(e) => { e.stopPropagation(); showModal(record); }} style={{ marginRight: 8 }} primary>수정</Button>
                    <Popconfirm
                        title="자산 현황 삭제"
                        description="정말 자산 현황 정보를 삭제하겠습니까?"
                        onConfirm={(e) => { e.stopPropagation(); handleDelete(record.asset_id) }}
                        okText="네"
                        cancelText="아니오"
                    >
                        <Button onClick={(e) => { e.stopPropagation(); }} danger>삭제</Button>
                    </Popconfirm>
                </div>
            ),
        },
    ];
      
    return (
        <div>
            {contextHolder}
            <Space style={{display: 'flex', justifyContent: 'flex-end'}}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={showCreateModal} style={{marginBottom: 10}} danger>데이터 등록</Button>
            </Space>
            <Table
                columns={columns}
                dataSource={data}
                rowKey="id"
                onRow={(record) => ({
                    onClick: () => showReadModal(record),
                    style: { cursor: 'pointer'},
                })}
            />
            <AssetCreateModal
                open={isCreateModalVisible}
                onOk={handleCreate}
                onCancel={handleCreateModalCancel}
            />
            <AssetUpdateModal
                open={isModalVisible}
                onOk={handleOk}
                onCancel={handleCancel}
                selectItem={selectedItem}
            />
            <AssetReadModal
                open={isReadModalVisible}
                onCancel={handleReadModalCancel}
                selectItem={selectedItem}
            />
        </div>
    );
}

export default AssetTable;