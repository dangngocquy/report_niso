import { useEffect, useState, useCallback, useMemo } from 'react';
import { Table, message, Breadcrumb, Input, Space, Button, Modal, Form, Popconfirm } from 'antd';
import { FolderOutlined, FileOutlined, SearchOutlined, ReloadOutlined, FolderAddOutlined, FileAddOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import PasswordModal from './PasswordModal';
import { usePasswordProtection } from '../../hooks/usePasswordProtection';
import Loading2 from '../Loading2';

const FolderView = ({ keys }) => {
    const [contents, setContents] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { folderId } = useParams();
    const currentPath = useMemo(() => folderId ? decodeURIComponent(folderId) : '', [folderId]);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [createType, setCreateType] = useState(null);
    const [form] = Form.useForm();
    const [selectedItem, setSelectedItem] = useState(null);
    const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
    const [isRemovePasswordModalVisible, setIsRemovePasswordModalVisible] = useState(false);
    const [hasPassword, setHasPassword] = useState({});
    const { isLoading, isAuthorized } = usePasswordProtection(currentPath, keys);

    const fetchContents = useCallback(async () => {
        if (!currentPath || !isAuthorized) return;
        
        try {
            setLoading(true);
            const response = await axios.get('/api/filesystem/folders', {
                params: { path: currentPath },
                headers: {
                    'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME + ':' + process.env.REACT_APP_API_PASSWORD)}`
                }
            });
            
            setContents(response.data);
        } catch (error) {
            if (error.code === 'ERR_NETWORK') {
                message.error('Lỗi kết nối đến server. Vui lòng kiểm tra lại kết nối mạng.');
            } else {
                message.error('Không thể lấy nội dung thư mục');
            }
            console.error('Lỗi:', error);
        } finally {
            setLoading(false);
        }
    }, [currentPath, isAuthorized]);

    useEffect(() => {
        if (isAuthorized) {
            fetchContents();
        }
    }, [fetchContents, isAuthorized]);

    const checkPathPassword = useCallback(async (path) => {
        try {
            const response = await axios.post('/api/filesystem/check-password', 
                { path, keys },
                {
                    headers: {
                        'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                    }
                }
            );
            
            setHasPassword(prev => ({
                ...prev,
                [path]: {
                    hasPassword: response.data.hasPassword,
                    isAuthorized: response.data.isAuthorized
                }
            }));

            return response.data;
        } catch (error) {
            console.error('Lỗi kiểm tra mật khẩu:', error);
            return { hasPassword: false, isAuthorized: false };
        }
    }, [keys]);

    useEffect(() => {
        contents.forEach(item => {
            checkPathPassword(item.path);
        });
    }, [contents, checkPathPassword]);

    const handleItemClick = useCallback(async (record) => {
        const passwordCheck = await checkPathPassword(record.path);
        
        if (passwordCheck.hasPassword && !passwordCheck.isAuthorized) {
            message.error(`${record.type === 'folder' ? 'Thư mục' : 'File'} này đã bị khóa`);
            return;
        }

        if (!record.isAccessible) {
            message.warning('Không thể truy cập file/thư mục này do không có quyền');
            return;
        }

        const encodedPath = encodeURIComponent(record.path);
        navigate(`/auth/dashboard/webadmin/${record.type}/${encodedPath}`, {
            state: { path: record.path }
        });
    }, [navigate, checkPathPassword]);

    const handleSearch = useCallback(async () => {
        if (!searchKeyword.trim()) {
            fetchContents();
            return;
        }

        try {
            setLoading(true);
            setIsSearching(true);
            const response = await axios.get('/api/filesystem/search', {
                params: { 
                    searchPath: currentPath,
                    keyword: searchKeyword 
                },
                headers: {
                    'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                }
            });
            setContents(response.data);
        } catch (error) {
            console.error('Lỗi khi tìm kiếm:', error);
            message.error('Lỗi khi tìm kiếm');
        } finally {
            setLoading(false);
        }
    }, [searchKeyword, currentPath, fetchContents]);

    const handleReset = useCallback(() => {
        setSearchKeyword('');
        setIsSearching(false);
        fetchContents();
    }, [fetchContents]);

    const handleCreate = useCallback(async (values) => {
        const endpoint = createType === 'folder' ? 
            '/api/filesystem/create-folder' : 
            '/api/filesystem/create-file';
        
        try {
            const response = await axios.post(endpoint, {
                path: currentPath,
                [createType === 'folder' ? 'folderName' : 'fileName']: values.name,
                ...(createType === 'file' && { content: values.content || '' })
            }, {
                headers: {
                    'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                }
            });

            if (response.data.success) {
                message.success(response.data.message);
                form.resetFields();
                setCreateModalVisible(false);
                fetchContents();
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    }, [createType, currentPath, form, fetchContents]);

    const handleDelete = useCallback(async (record) => {
        try {
            const response = await axios.post('/api/filesystem/delete', 
                { path: record.path },
                {
                    headers: {
                        'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                    }
                }
            );

            if (response.data.success) {
                message.success(response.data.message);
                fetchContents();
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa');
        }
    }, [fetchContents]);

    const handleCreatePassword = useCallback(async (values) => {
        try {
            const response = await axios.post('/api/filesystem/save-password', {
                path: selectedItem.path,
                password: values.password,
                keys: keys
            }, {
                headers: {
                    'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                }
            });

            if (response.data.success) {
                message.success('Đã tạo mật khẩu thành công');
                setIsPasswordModalVisible(false);
                setSelectedItem(null);
                checkPathPassword(selectedItem.path);
            }
        } catch (error) {
            message.error('Không thể tạo mật khẩu');
        }
    }, [selectedItem, keys, checkPathPassword]);

    const handleRemovePassword = useCallback(async () => {
        try {
            const response = await axios.post('/api/filesystem/remove-password', {
                path: selectedItem.path
            }, {
                headers: {
                    'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                }
            });

            if (response.data.success) {
                message.success('Đã xóa mật khẩu thành công');
                setIsRemovePasswordModalVisible(false);
                setSelectedItem(null);
                checkPathPassword(selectedItem.path);
            }
        } catch (error) {
            message.error('Không thể xóa mật khẩu');
        }
    }, [selectedItem, checkPathPassword]);

    const columns = useMemo(() => [
        {
            title: 'Tên',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {record.type === 'folder' ? 
                        <FolderOutlined style={{ color: record.isAccessible ? '#ffd700' : '#999' }} /> : 
                        <FileOutlined style={{ color: record.isAccessible ? '#1890ff' : '#999' }} />
                    }
                    <span style={{ color: record.isAccessible ? 'inherit' : '#999' }}>
                        {text}
                        {!record.isAccessible && ' (Không thể truy cập)'}
                    </span>
                </div>
            ),
        },
        {
            title: 'Loại',
            dataIndex: 'type',
            key: 'type',
            render: (type) => type === 'folder' ? 'Thư mục' : 'Tập tin',
        },
        {
            title: 'Kích thước',
            dataIndex: 'size',
            key: 'size',
            sorter: (a, b) => a.rawSize - b.rawSize,
        },
        {
            title: 'Ngày sửa đổi',
            dataIndex: 'modifiedDate',
            key: 'modifiedDate',
            render: (date) => new Date(date).toLocaleString('vi-VN'),
            sorter: (a, b) => new Date(a.modifiedDate) - new Date(b.modifiedDate),
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button
                        type={hasPassword[record.path]?.hasPassword ? "primary" : "default"}
                        icon={<LockOutlined />}
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(record);
                            if (hasPassword[record.path]?.hasPassword) {
                                setIsRemovePasswordModalVisible(true);
                            } else {
                                setIsPasswordModalVisible(true);
                            }
                        }}
                    >
                        {hasPassword[record.path]?.hasPassword ? 'Đã khóa' : 'Đặt mật khẩu'}
                    </Button>
                    <Popconfirm
                        title="Xác nhận xóa"
                        description={`Bạn có chắc chắn muốn xóa ${record.type === 'folder' ? 'thư mục' : 'file'} này?`}
                        onConfirm={(e) => {
                            e.stopPropagation();
                            handleDelete(record);
                        }}
                        onCancel={(e) => e.stopPropagation()}
                        okText="Xóa"
                        cancelText="Hủy"
                    >
                        <Button 
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => e.stopPropagation()}
                        >
                            Xóa
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        }
    ], [hasPassword, handleDelete]);

    if (isLoading) {
        return <Loading2 />;
    }

    if (!isAuthorized) {
        return null;
    }

    return (
        <div>
            <Breadcrumb style={{ marginBottom: '16px' }}>
                <Breadcrumb.Item 
                    onClick={() => navigate('/auth/dashboard/webadmin')}
                    style={{ cursor: 'pointer' }}
                >
                    Ổ đĩa
                </Breadcrumb.Item>
                {currentPath.split('\\').filter(p => p).map((path, index, paths) => {
                    const fullPath = paths.slice(0, index + 1).join('\\') + '\\';
                    const encodedPath = encodeURIComponent(fullPath);
                    return (
                        <Breadcrumb.Item 
                            key={index}
                            onClick={() => {
                                if (index < paths.length - 1) {
                                    navigate(`/auth/dashboard/webadmin/folder/${encodedPath}`);
                                }
                            }}
                            style={{ 
                                cursor: index < paths.length - 1 ? 'pointer' : 'default' 
                            }}
                        >
                            {path}
                        </Breadcrumb.Item>
                    );
                })}
            </Breadcrumb>
            
            <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <Space style={{flexWrap: 'wrap'}}>
                    <Input
                        placeholder="Nhập tên file hoặc thư mục cần tìm"
                        value={searchKeyword}
                        onChange={e => setSearchKeyword(e.target.value)}
                        onPressEnter={handleSearch}
                        style={{ width: 300 }}
                        prefix={<SearchOutlined />}
                    />
                    <Button 
                        type="primary" 
                        onClick={handleSearch}
                        loading={loading}
                    >
                        Tìm kiếm
                    </Button>
                    {isSearching && (
                        <Button 
                            icon={<ReloadOutlined />}
                            onClick={handleReset}
                        >
                            Xóa tìm kiếm
                        </Button>
                    )}
                </Space>
                <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
                    <Button 
                        icon={<FolderAddOutlined />} 
                        onClick={() => {
                            setCreateType('folder');
                            setCreateModalVisible(true);
                        }}
                    >
                        Tạo thư mục
                    </Button>
                    <Button 
                        icon={<FileAddOutlined />} 
                        onClick={() => {
                            setCreateType('file');
                            setCreateModalVisible(true);
                        }}
                    >
                        Tạo file
                    </Button>
                </Space>
            </Space>

            <div style={{ overflowX: 'auto' }}>
                <Table
                    columns={columns}
                    dataSource={contents}
                    rowKey="path"
                    loading={loading}
                    onRow={(record) => ({
                        onClick: () => handleItemClick(record),
                        style: { cursor: 'pointer' }
                    })}
                    pagination={{
                        pageSize: 10,
                    }}
                    scroll={{ x: 'max-content' }}
                />
            </div>

            <Modal
                title={`Tạo ${createType === 'folder' ? 'thư mục' : 'file'} mới`}
                open={createModalVisible}
                onOk={() => form.submit()}
                onCancel={() => {
                    setCreateModalVisible(false);
                    form.resetFields();
                }}
            >
                <Form
                    form={form}
                    onFinish={handleCreate}
                    layout="vertical"
                >
                    <Form.Item
                        name="name"
                        label={createType === 'folder' ? 'Tên thư mục' : 'Tên file (bao gồm đuôi file)'}
                        rules={[
                            { required: true, message: 'Vui lòng nhập tên' },
                            { 
                                pattern: createType === 'folder' ? 
                                    /^[^<>:"/\\|?*]+$/ : 
                                    /^[^<>:"/\\|?*]+\.[^<>:"/\\|?*]+$/,
                                message: createType === 'folder' ? 
                                    'Tên không được chứa ký tự đặc biệt' : 
                                    'Tên file phải có định dạng name.extension'
                            }
                        ]}
                    >
                        <Input placeholder={createType === 'file' ? 'Ví dụ: document.txt' : 'Nhập tên thư mục'} />
                    </Form.Item>
                </Form>
            </Modal>

            <PasswordModal
                visible={isPasswordModalVisible}
                onCancel={() => {
                    setIsPasswordModalVisible(false);
                    setSelectedItem(null);
                }}
                onSubmit={handleCreatePassword}
                type={selectedItem?.type}
                name={selectedItem?.name}
            />

            <PasswordModal
                visible={isRemovePasswordModalVisible}
                onCancel={() => {
                    setIsRemovePasswordModalVisible(false);
                    setSelectedItem(null);
                }}
                onSubmit={handleRemovePassword}
                type={selectedItem?.type}
                name={selectedItem?.name}
                isRemove={true}
            />
        </div>
    );
};

export default FolderView;
