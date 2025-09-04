import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { Button, Table, Space, Modal, Form, Input, message, Empty, Select } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, LockOutlined } from '@ant-design/icons';
import moment from 'moment';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
const { Search } = Input;

const QueryList = () => {
    const { folderId } = useParams();
    const navigate = useNavigate();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [searchText, setSearchText] = useState('');
    const [filteredQueries, setFilteredQueries] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [selectedItemPermissions, setSelectedItemPermissions] = useState([]);
    const [isPermissionModalVisible, setIsPermissionModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const {
        folders,
        currentFolderQueries,
        handleQueryClick,
        handleDeleteQuery,
        connectionId,
        setCurrentFolderQueries,
        setFolders,
        keysUser,
        selectedFolderId,
    } = useOutletContext();

    useEffect(() => {
        if (folders.length > 0) {
            const folderExists = folders.some(f => f.id === folderId);
            if (!folderExists) {
                navigate(`../folder/${folders[0].id}`, { replace: true });
            }
        }
    }, [folders, folderId, navigate]);

    const sortQueries = useCallback((queries) => {
        return [...queries].sort((a, b) => {
            const timeA = a.lastModifiedAt ? moment(a.lastModifiedAt).valueOf() : 0;
            const timeB = b.lastModifiedAt ? moment(b.lastModifiedAt).valueOf() : 0;
            
            if (timeA !== timeB) {
                return timeB - timeA;
            }
            return moment(b.createdAt).valueOf() - moment(a.createdAt).valueOf();
        });
    }, []);

    useEffect(() => {
        if (currentFolderQueries) {
            const timeoutId = setTimeout(() => {
                const filtered = currentFolderQueries.filter(query =>
                    query.queryName.toLowerCase().includes(searchText.toLowerCase())
                );
                setFilteredQueries(sortQueries(filtered));
                setIsInitialLoading(false);
            }, 300);

            return () => clearTimeout(timeoutId);
        }
    }, [currentFolderQueries, searchText, sortQueries]);

    useEffect(() => {
        if (!currentFolderQueries) return;
        
        setIsLoading(true);
        const timeoutId = setTimeout(() => {
            const filtered = currentFolderQueries.filter(query =>
                query.queryName.toLowerCase().includes(searchText.toLowerCase())
            );
            setFilteredQueries(sortQueries(filtered));
            setIsLoading(false);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [currentFolderQueries, searchText, sortQueries]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await axios.get('/users/all', {
                    headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                });
                setUsers(response.data.docs);
            } catch (error) {
                message.error('Lỗi khi tải danh sách người dùng');
            }
        };
        fetchUsers();
    }, []);

    const handleAddQuery = async (values) => {
        try {
            const response = await axios.post('/api/connections/queries/add',
                {
                    connectionId,
                    queryName: values.queryName,
                    queryContent: '',
                    folderId: selectedFolderId
                },
                {
                    headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                }
            );

            const updatedQueries = [...currentFolderQueries, response.data.query];
            setCurrentFolderQueries(updatedQueries);

            const updatedFolders = folders.map(folder => {
                if (folder.id === selectedFolderId) {
                    return {
                        ...folder,
                        queries: updatedQueries
                    };
                }
                return folder;
            });
            setFolders(updatedFolders);

            setIsModalVisible(false);
            form.resetFields();
            message.success('Tạo query mới thành công!');
            navigate(`../query/${response.data.query.id}`);
        } catch (error) {
            message.error('Lỗi khi tạo query mới!');
        }
    };

    const handleCreateNewQuery = () => {
        setIsModalVisible(true);
    };

    const handleDeleteQueryClick = useCallback((queryId) => {
        Modal.confirm({
            title: 'Xác nhận xóa',
            content: 'Bạn có chắc chắn muốn xóa query này không?',
            okText: 'Xóa',
            cancelText: 'Hủy',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    await handleDeleteQuery(queryId);
                } catch (error) {
                    console.error('Lỗi khi xóa query:', error);
                    message.error('Lỗi khi xóa query');
                }
            }
        });
    }, [handleDeleteQuery]);

    const handleSearch = (value) => {
        setSearchText(value);
    };

    const handlePermissionClick = useCallback(async (item, type) => {
        try {
            const selectedItemData = JSON.parse(JSON.stringify({
                ...item,
                type,
                id: item.id,
                queryName: item.queryName
            }));
            
            console.log('Selected item for permission:', selectedItemData);
            
            setSelectedItem(selectedItemData);
            
            const currentPermissions = item.keysUserTime ? Object.keys(item.keysUserTime) : [];
            setSelectedItemPermissions(currentPermissions);
            setIsPermissionModalVisible(true);
        } catch (error) {
            console.error('Error in handlePermissionClick:', error);
            message.error('Lỗi khi lấy thông tin phân quyền');
        }
    }, []);

    const updateQueriesAfterPermission = useCallback((queryId, newKeysUserTime) => {
        const updatedQueries = currentFolderQueries.map(query => {
            if (query.id === queryId) {
                return {
                    ...query,
                    keysUserTime: newKeysUserTime,
                    lastModifiedAt: moment().format('YYYY-MM-DD HH:mm:ss')
                };
            }
            return query;
        });

        setCurrentFolderQueries(sortQueries(updatedQueries));

        const updatedFolders = folders.map(folder => {
            if (folder.queries) {
                const updatedFolderQueries = folder.queries.map(query => {
                    if (query.id === queryId) {
                        return {
                            ...query,
                            keysUserTime: newKeysUserTime,
                            lastModifiedAt: moment().format('YYYY-MM-DD HH:mm:ss')
                        };
                    }
                    return query;
                });
                return { ...folder, queries: updatedFolderQueries };
            }
            return folder;
        });
        setFolders(updatedFolders);
    }, [currentFolderQueries, folders, sortQueries, setCurrentFolderQueries, setFolders]);

    const handlePermissionSave = useCallback(async () => {
        try {
            if (!selectedItem?.id || !selectedItem?.type) {
                message.error('Không tìm thấy thông tin item được chọn');
                return;
            }

            const response = await axios.put(
                `/api/connections/permissions/${selectedItem.id}`,
                {
                    userKeys: selectedItemPermissions,
                    itemType: selectedItem.type
                },
                {
                    headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                }
            );

            if (response.data.success) {
                if (selectedItem.type === 'query') {
                    updateQueriesAfterPermission(selectedItem.id, response.data.keysUserTime);
                }
                message.success('Cập nhật phân quyền thành công');
                setIsPermissionModalVisible(false);
            }
        } catch (error) {
            console.error('Error in handlePermissionSave:', error);
            message.error('Lỗi khi cập nhật phân quyền: ' + (error.response?.data?.message || error.message));
        }
    }, [selectedItem, selectedItemPermissions, updateQueriesAfterPermission]);

    const handlePermissionChange = useCallback((selectedUserKeys) => {
        if (selectedUserKeys.includes('all')) {
            if (selectedItemPermissions.length === users.filter(user => !keysUser.includes(user.keys)).length) {
                setSelectedItemPermissions([]);
            } else {
                const allUserKeys = users
                    .filter(user => !keysUser.includes(user.keys))
                    .map(user => user.keys);
                setSelectedItemPermissions(allUserKeys);
            }
        } else {
            setSelectedItemPermissions(selectedUserKeys.filter(key => key !== 'all'));
        }
    }, [users, keysUser, selectedItemPermissions]);

    const userOptions = useMemo(() => {
        return [
            {
                key: 'all',
                value: 'all',
                label: 'Chọn tất cả'
            },
            ...users
                .filter(user => !keysUser.includes(user.keys))
                .map(user => ({
                    key: user.keys,
                    value: user.keys,
                    label: `${user.name} (${user.username})`
                }))
        ];
    }, [users, keysUser]);

    const columns = useMemo(() => [
        {
            title: 'Tên Query',
            dataIndex: 'queryName',
            key: 'queryName',
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (text) => moment(text).format('DD/MM/YYYY HH:mm:ss'),
            sorter: (a, b) => moment(b.createdAt).valueOf() - moment(a.createdAt).valueOf()
        },
        {
            title: 'Chỉnh sửa gần nhất',
            dataIndex: 'lastModifiedAt',
            key: 'lastModifiedAt',
            render: (text) => text ? moment(text).format('DD/MM/YYYY HH:mm:ss') : 'Chưa chỉnh sửa',
            defaultSortOrder: 'descend',
            sorter: (a, b) => {
                const timeA = a.lastModifiedAt ? moment(a.lastModifiedAt).valueOf() : 0;
                const timeB = b.lastModifiedAt ? moment(b.lastModifiedAt).valueOf() : 0;
                return timeB - timeA;
            }
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button
                        icon={<LockOutlined />}
                        onClick={() => handlePermissionClick(record, 'query')}
                    >
                        Phân quyền
                    </Button>
                    <Button
                        type="primary"
                        onClick={() => {
                            handleQueryClick(record);
                            navigate(`../query/${record.id}`);
                        }}
                        icon={<EditOutlined />}
                    >
                        Chỉnh sửa
                    </Button>
                    <Button
                        danger
                        onClick={() => handleDeleteQueryClick(record.id)}
                        icon={<DeleteOutlined />}
                    >
                        Xóa
                    </Button>
                </Space>
            ),
        },
    ], [handleQueryClick, handleDeleteQueryClick, handlePermissionClick, navigate]);

    const currentFolder = folders.find(f => f.id === folderId);
    if (!currentFolder) return null;

    return (
        <div className='layout4'>
            <div style={{
                marginBottom: 16,
                marginTop: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap'
            }} className='ooo'>
                <h3 style={{ margin: 0, color: '#ae8f3d' }}>
                    {currentFolder.folderName}
                </h3>
                <Space style={{ flexWrap: 'wrap', marginTop: '16px' }}>
                    <Button
                        icon={<LockOutlined />}
                        onClick={() => handlePermissionClick(currentFolder, 'folder')}
                    >
                        Phân quyền thư mục
                    </Button>
                    <Button
                        type="primary"
                        onClick={handleCreateNewQuery}
                        icon={<PlusOutlined />}
                    >
                        Tạo Query mới
                    </Button>
                </Space>
            </div>

            <div style={{ marginBottom: 16 }}>
                <Search
                    placeholder="Tìm kiếm query..."
                    allowClear
                    onChange={e => handleSearch(e.target.value)}
                    size='large'
                    style={{ width: '100%' }}
                />
            </div>

            <Table
                columns={columns}
                dataSource={filteredQueries}
                rowKey="id"
                loading={isInitialLoading || isLoading}
                style={{ width: '100%' }}
                scroll={{ x: 'max-content' }}
                pagination={{
                    pageSize: 9,
                    showTotal: (total) => <span style={{ color: '#ae8f3d' }}>{`Tổng số ${total} bản ghi`}</span>,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50'],
                    style: { marginBottom: 0 }
                }}
                locale={{
                    emptyText: (
                        <Empty
                            description={
                                searchText
                                    ? "Không tìm thấy query nào phù hợp"
                                    : "Chưa có query nào trong thư mục này"
                            }
                            style={{ margin: '40px 0' }}
                        >
                            <Button
                                type="primary"
                                onClick={handleCreateNewQuery}
                                icon={<PlusOutlined />}
                            >
                                Tạo Query mới
                            </Button>
                        </Empty>
                    )
                }}
            />

            <Modal
                title="Tạo query mới"
                open={isModalVisible}
                onCancel={() => {
                    setIsModalVisible(false);
                    form.resetFields();
                }}
                footer={null}
                style={{ top: '20%' }}
            >
                <Form
                    form={form}
                    onFinish={handleAddQuery}
                    layout="vertical"
                    style={{ marginTop: '16px' }}
                >
                    <Form.Item
                        name="queryName"
                        label="Tên Query"
                        rules={[{ required: true, message: 'Vui lòng nhập tên query!' }]}
                    >
                        <Input placeholder="Nhp tên query" />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button type="primary" htmlType="submit">
                            Tạo Query
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={`Phân quyền truy cập - ${selectedItem?.queryName || ''}`}
                open={isPermissionModalVisible}
                onCancel={() => {
                    setIsPermissionModalVisible(false);
                    setSelectedItemPermissions(selectedItem?.keysUserTime ? Object.keys(selectedItem.keysUserTime) : []);
                }}
                footer={[
                    <Button
                        key="cancel"
                        onClick={() => {
                            setIsPermissionModalVisible(false);
                            setSelectedItemPermissions(selectedItem?.keysUserTime ? Object.keys(selectedItem.keysUserTime) : []);
                        }}
                    >
                        Hủy
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        onClick={handlePermissionSave}
                    >
                        Xác nhận
                    </Button>
                ]}
            >
                <Select
                    mode="multiple"
                    style={{ width: '100%' }}
                    placeholder="Chọn người dùng"
                    value={selectedItemPermissions}
                    onChange={handlePermissionChange}
                    optionFilterProp="label"
                    options={userOptions}
                />
            </Modal>
        </div>
    );
};

export default memo(QueryList); 