import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from '../axios';
import { Link } from 'react-router-dom';
import { Modal, Input, Button, message, Form, Space, Row, Col, Select } from 'antd';
import { CopyOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
const { Option } = Select;

function ContentModal({ closeModalid, key_link, name, id_keys, phanquyenmodal, category }) {
    const [editedLink, setEditedLink] = useState(key_link);
    const [editedTitle, setEditedTitle] = useState(name);
    const [editedCategory, setEditedCategory] = useState(category);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [users, setUsers] = useState([]);

    const iframeLink = useMemo(() => editedLink, [editedLink]);

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

    const fetchCurrentUsers = useCallback(async () => {
        try {
            const contentResponse = await axios.get(`/content/views/${id_keys}`, {
                headers: {
                    'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                }
            });
            
            const usersResponse = await axios.get('/users/all', {
                headers: {
                    'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                }
            });

            if (contentResponse.data?.data?.account && usersResponse.data?.docs) {
                const accountArray = Array.isArray(contentResponse.data.data.account) 
                    ? contentResponse.data.data.account 
                    : [contentResponse.data.data.account];
                
                const selectedUserNames = usersResponse.data.docs
                    .filter(user => accountArray.includes(user.keys))
                    .map(user => user.keys);

                setSelectedUsers(selectedUserNames);
                console.log('Selected user names:', selectedUserNames);
            }
        } catch (error) {
            console.error('Error fetching current users:', error);
        }
    }, [id_keys]);

    useEffect(() => {
        console.log('Current selected users:', selectedUsers);
        console.log('Available users:', users);
    }, [selectedUsers, users]);

    useEffect(() => {
        fetchUsers();
        fetchCurrentUsers();
    }, [fetchUsers, fetchCurrentUsers]);

    const checkExistence = useCallback(async (newTitle, newLink) => {
        try {
            const response = await axios.get(`/content/all`, {
                params: { title: newTitle, link: newLink },
                headers: {
                    'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                }
            });
            return response.data.exists;
        } catch (error) {
            console.error('Error checking existence:', error);
            return false;
        }
    }, []);

    const handleEdit = useCallback(async () => {
        try {
            setIsEditing(true);

            const exists = await checkExistence(editedTitle, editedLink);
            if (exists) {
                message.error('Tên hoặc liên kết đã tồn tại.');
                return;
            }

            await axios.put(`/content/update/${id_keys}`, {
                link: editedLink,
                title: editedTitle,
                category: editedCategory,
                account: selectedUsers
            }, {
                headers: {
                    'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                }
            });

            message.success('Sửa thành công.');
            closeModalid?.();
        } catch (error) {
            console.error('Error editing content:', error);
            message.error('Lỗi khi sửa nội dung.');
        } finally {
            setIsEditing(false);
        }
    }, [editedLink, editedTitle, editedCategory, selectedUsers, id_keys, checkExistence, closeModalid]);

    const handleDelete = useCallback(async () => {
        try {
            const response = await axios.delete(`/content/delete/${id_keys}`, {
                headers: {
                    'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                }
            });

            if (response.status === 200 && response.data.success) {
                closeModalid();
                message.success('Xóa thành công!');
            } else {
                message.error('Có lỗi xảy ra khi xóa.');
            }
        } catch (error) {
            console.error('Error deleting content:', error);
            message.success('Xóa thành công, làm mới trang để áp dụng thay đổi!');
            setShowModal(false);
        }
    }, [id_keys, closeModalid]);

    const handleCopy = useCallback((content) => {
        navigator.clipboard.writeText(content)
            .then(() => message.success('Sao chép thành công!'))
            .catch(() => message.error('Lỗi khi sao chép.'));
    }, []);

    const iframeCode = useMemo(() => (
        `<iframe src="${iframeLink}" title="${name}" width="300px" height="300px" class="view_iframe"></iframe>`
    ), [iframeLink, name]);

    return (
        <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
                <Form layout="vertical">
                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                            <Form.Item label={phanquyenmodal ? "Nhập tiêu đề BI" : "Tên REPORT"}>
                                <Input
                                    placeholder={phanquyenmodal ? "Nhập tiêu đề BI" : "Tên REPORT"}
                                    value={editedTitle}
                                    onChange={(e) => setEditedTitle(e.target.value)}
                                    disabled={!phanquyenmodal}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="Nhập tên phòng ban">
                                <Input
                                    placeholder="Nhập tên phòng ban"
                                    value={editedCategory}
                                    onChange={(e) => setEditedCategory(e.target.value)}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]}>
                        <Col span={24}>
                            <Form.Item label={phanquyenmodal ? "Nhập liên kết" : "Liên kết"}>
                                <Space.Compact style={{ width: '100%' }}>
                                    <Input
                                        placeholder="Nhập liên kết BI"
                                        value={editedLink}
                                        onChange={(e) => setEditedLink(e.target.value)}
                                        disabled={!phanquyenmodal}
                                    />
                                    <Button
                                        icon={<CopyOutlined />}
                                        onClick={() => handleCopy(editedLink)}
                                    />
                                </Space.Compact>
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
                                    value={selectedUsers}
                                    onChange={(values) => {
                                        console.log('Selected values:', values);
                                        setSelectedUsers(values);
                                    }}
                                    optionFilterProp="children"
                                    allowClear
                                    showArrow
                                    showSearch
                                    filterOption={(input, option) =>
                                        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                                    }
                                >
                                    {users && users.length > 0 && users.map(user => (
                                        <Option 
                                            key={user.keys} 
                                            value={user.keys}
                                            className="select-user-option"
                                        >
                                            {user.name}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]}>
                        <Col span={24}>
                            <Form.Item label="Sao chép iframe">
                                <Space.Compact style={{ width: '100%' }}>
                                    <Input
                                        value={iframeCode}
                                        disabled
                                    />
                                    <Button
                                        icon={<CopyOutlined />}
                                        onClick={() => handleCopy(iframeCode)}
                                    />
                                </Space.Compact>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]}>
                        <Col span={24}>
                            <Form.Item>
                                <Space wrap>
                                    <Link to={`/auth/dashboard/views/${id_keys}`} target='_blank'>
                                        <Button type="primary">Xem report</Button>
                                    </Link>
                                    {phanquyenmodal && (
                                        <>
                                            <Button
                                                type="primary"
                                                onClick={handleEdit}
                                                loading={isEditing}
                                                icon={<EditOutlined />}
                                            >
                                                Lưu
                                            </Button>
                                            <Button
                                                type='primary'
                                                danger
                                                onClick={() => setShowModal(true)}
                                                loading={isEditing}
                                                icon={<DeleteOutlined />}
                                            >
                                                Xóa
                                            </Button>
                                        </>
                                    )}
                                </Space>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Col>

            <Col xs={24} lg={12}>
                <div style={{ position: 'relative', height: '100%' }}>
                    <p style={{ margin: '0 0 16px 0' }}>Xem trước</p>
                    <iframe
                        src={iframeLink}
                        title="Preview"
                        className='view_iframe'
                        style={{
                            width: '100%',
                            height: 'calc(100vh - 250px)',
                            minHeight: '400px',
                            border: '1px solid #d9d9d9',
                            borderRadius: '8px'
                        }}
                    />
                </div>
            </Col>

            <Modal
                title="Warning !"
                visible={showModal}
                onOk={handleDelete}
                onCancel={() => setShowModal(false)}
                okText="Xóa"
                cancelText="Hủy"
            >
                <p>Bạn có chắc chắn muốn xóa báo cáo này?</p>
            </Modal>
        </Row>
    );
}

export default React.memo(ContentModal);