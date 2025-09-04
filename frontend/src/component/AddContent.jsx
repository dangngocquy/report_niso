import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from '../axios';
import { Input, Button, Form, message, Select, Row, Col } from 'antd';

const AddContent = ({ closeModal }) => {
    const [formData, setFormData] = useState({
        link: '',
        title: '',
        category: '',
        account: []
    });
    const [isWebpage, setIsWebpage] = useState(true);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [iframeLoading, setIframeLoading] = useState(true);
    const [users, setUsers] = useState([]);

    const fetchUsers = useCallback(async () => {
        try {
            const response = await axios.get('/users/all', {
                headers: {
                    'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                }
            });
            if (response.data?.docs) {
                setUsers(response.data.docs);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            message.error('Không thể tải danh sách người dùng');
        }
    }, []);

    useEffect(() => {
        const handleOnlineStatusChange = () => setIsOnline(navigator.onLine);

        window.addEventListener('online', handleOnlineStatusChange);
        window.addEventListener('offline', handleOnlineStatusChange);

        fetchUsers();

        return () => {
            window.removeEventListener('online', handleOnlineStatusChange);
            window.removeEventListener('offline', handleOnlineStatusChange);
        };
    }, [fetchUsers]);

    const handleInputChange = useCallback((event) => {
        const inputLink = event.target.value;
        const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;
        const iframeRegex = /<iframe.*?src=['"](.*?)['"]/;

        if (!inputLink) {
            message.warning('Vui lòng nhập Liên kết.');
        } else if (iframeRegex.test(inputLink)) {
            const iframeSrc = inputLink.match(iframeRegex)?.[1];
            setIframeLoading(true);
            setIsWebpage(true);
            setFormData(prev => ({ ...prev, link: iframeSrc }));
            return;
        } else if (!urlRegex.test(inputLink) && inputLink.indexOf('.') === -1) {
            message.warning('Vui lòng nhập đường dẫn chính xác.');
        }

        setIsWebpage(urlRegex.test(inputLink) || inputLink.indexOf('.') !== -1);
        setFormData(prev => ({ ...prev, link: inputLink }));
    }, []);

    const handleFormChange = useCallback((field) => (event) => {
        const value = event?.target ? event.target.value : event;
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const getIframeSrc = useMemo(() => {
        if (isWebpage && !formData.link.startsWith('http')) {
            return `http://${formData.link}`;
        }
        return formData.link;
    }, [formData.link, isWebpage]);

    const postContent = useCallback(async () => {
        try {
            if (!formData.link || !formData.title) {
                message.warning('Vui lòng nhập đầy đủ thông tin.');
                return;
            }

            const response = await axios.post('/content/add', formData, {
                headers: {
                    'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                }
            });

            if (response.data.success) {
                message.success('Thêm thành công !');
                closeModal();
            }
        } catch (error) {
            console.error('Error adding content:', error);
            message.error('Có lỗi xảy ra khi thêm nội dung');
        }
    }, [formData, closeModal]);

    const previewContent = useMemo(() => {
        if (!formData.link) return "Bạn chưa nhập liên kết.";
        if (!isWebpage) return "Bạn nhập sai đường dẫn.";
        if (!isOnline) return "Mất kết nối mạng. Vui lòng kiểm tra kết nối của bạn.";
        return "Liên kết không hợp lệ. Hãy chắc chắn rằng đây là một đường dẫn đúng.";
    }, [formData.link, isWebpage, isOnline]);

    return (
        <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
                <Form layout="vertical">
                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                            <Form.Item label="Nhập tiêu đề BI" required>
                                <Input
                                    placeholder="Nhập tiêu đề BI"
                                    value={formData.title}
                                    onChange={handleFormChange('title')}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="Nhập tên phòng ban" required>
                                <Input
                                    placeholder="Nhập tên phòng ban"
                                    style={{ textTransform: 'uppercase' }}
                                    value={formData.category}
                                    onChange={handleFormChange('category')}
                                />
                                <i style={{ fontSize: '11px' }}>(Nhập chữ "khác" hoặc bỏ trống khi không có bộ phận)</i>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]}>
                        <Col span={24}>
                            <Form.Item label="Nhập liên kết hoặc iframe BI" required>
                                <Input
                                    placeholder="Nhập liên kết BI"
                                    value={formData.link}
                                    onChange={handleInputChange}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]}>
                        <Col span={24}>
                            <Form.Item label="Chọn người dùng">
                                <Select
                                    mode="multiple"
                                    style={{ width: '100%' }}
                                    placeholder="Chọn người dùng"
                                    onChange={handleFormChange('account')}
                                    optionFilterProp="children"
                                >
                                    {users.map(user => (
                                        <Select.Option key={user.keys} value={user.keys}>
                                            {user.name}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]}>
                        <Col span={24}>
                            <Form.Item>
                                <Button type="primary" onClick={postContent}>
                                    Thêm
                                </Button>
                                <Button onClick={closeModal} style={{ marginLeft: '10px' }}>
                                    Close
                                </Button>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Col>

            <Col xs={24} lg={12}>
                <div style={{ position: 'relative', height: '100%' }}>
                    <p style={{ margin: '0 0 16px 0' }}>Xem trước</p>
                    {formData.link && isWebpage ? (
                        <>
                            {iframeLoading && <div>Đang tải chờ xí nhé...</div>}
                            <iframe
                                src={getIframeSrc}
                                title="Preview"
                                style={{
                                    display: iframeLoading ? 'none' : 'block',
                                    width: '100%',
                                    height: 'calc(100vh - 250px)',
                                    minHeight: '400px',
                                    border: '1px solid #d9d9d9',
                                    borderRadius: '8px'
                                }}
                                onLoad={() => setIframeLoading(false)}
                                className='view_iframe'
                            />
                        </>
                    ) : (
                        <div style={{height: 'calc(-250px + 100vh)'}}>{previewContent}</div>
                    )}
                </div>
            </Col>
        </Row>
    );
};

export default React.memo(AddContent);