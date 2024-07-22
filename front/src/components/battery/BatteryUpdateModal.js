import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import axios from 'axios';
import { Modal, Input, Form, Select, DatePicker } from 'antd';
import { Option } from 'antd/es/mentions';

const API_URL = process.env.REACT_APP_API_URL;
const { TextArea } = Input;

const BatteryUpdateModal = ({open, onOk, onCancel, selectItem }) => {
    const [form] = Form.useForm();
    const [products, setProducts] = useState([]);
    const [locations, setLocations] = useState([]);
    const [isLocationDisabled, setIsLocationDisabled] = useState(false);

    useEffect(() => {
        if (selectItem) {
            form.setFieldsValue({
                ...selectItem,
                due_date: selectItem.due_date ? dayjs(selectItem.due_date) : null,
            });

            if (selectItem.state == false) {
                setIsLocationDisabled(true);
                form.setFieldValue({location_name: "사무실"});
            } else {
                setIsLocationDisabled(false);
            }
            console.log(open);
        }
    }, [selectItem, form]);

    const fetchProducts = async () => {
        try {
            const response = await axios.get(`${API_URL}/product/`);
            setProducts(response.data);
        } catch(error) {
            console.error('Error fetching products: ', error);
        }
    };

    const fetchLocations = async () => {
        try {
            const response = await axios.get(`${API_URL}/location/`);
            setLocations(response.data);
        } catch(error) {
            console.error('Error fetching locations: ', error);
        }
    };

    const handleStateChange = (value) => {
        if (value === false) {
            setIsLocationDisabled(true);
            form.setFieldsValue({ location_name: "사무실" });
        } else {
            setIsLocationDisabled(false);
            form.setFieldsValue({ location_name: null });
        }
    };

    const handleSubmit = () => {
        form
            .validateFields()
            .then(values => {
                // moment 객체를 문자열로 변환
                const formattedValues = {
                    ...values,
                    due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
                    folder_name: values.folder_name || null,
                    marks: values.marks || null,
                };

                form.resetFields();
                onOk(formattedValues);
            })
            .catch(info => {
                console.log('Validate Failed:', info);
            });
    };

    return (
        <Modal
            title="수정"
            open={open}
            onOk={handleSubmit}
            onCancel={() => {
                form.resetFields();
                onCancel();
            }}>

            <Form form={form} layout="vertical">
                <Form.Item name="folder_id" label="순번">
                    <Input disabled />
                </Form.Item>

                <Form.Item name="product_name" label="기기 종류" rules={[{ required: true, message: '기기종류를 선택해주세요!'}]}>
                    <Select 
                        placeholder="Select a product"
                        onDropdownVisibleChange={(open) => {
                            if (open) { fetchProducts(); }
                        }}
                        >

                        {products.map(product => (
                            <Option key={product.product_name} value={product.product_name}>{product.product_name} ({product.brand_name})</Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item name="state" label="사용 여부" rules={[{ required: true, message: '배터리 사용여부를 선택해주세요!'}]}>
                    <Select placeholder="Select a state" onChange={handleStateChange}>
                        <Option value={true}>Y</Option>
                        <Option value={false}>N</Option>
                    </Select>
                </Form.Item>

                <Form.Item name="location_name" label="현장이름" rules={[{ required: true, message: '현장을 입력해주세요!' }]}>
                    <Select 
                        placeholder="Select a location" 
                        disabled={isLocationDisabled}
                        onDropdownVisibleChange={(open) => {
                            if (open) { fetchLocations(); }
                        }}    
                    >
                        {locations.map(location => (
                            <Option key={location.location_name} value={location.location_name}>{location.location_name}</Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item name="folder_name" label="폴더 이름">
                    <Input placeholder='Input folder name' disabled={isLocationDisabled}/>
                </Form.Item>

                <Form.Item name="due_date" label="교체일">
                    <DatePicker format='YYYY-MM-DD' disabled={isLocationDisabled}/>
                </Form.Item>

                <Form.Item name="marks" label="비고">
                    <TextArea rows={4} placeholder='비고를 작성해주세요'/>
                </Form.Item>

            </Form>
        </Modal>
    );
};

export default BatteryUpdateModal;