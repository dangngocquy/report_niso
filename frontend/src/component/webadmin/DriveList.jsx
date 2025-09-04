import { useEffect, useState, useCallback, memo } from 'react';
import { Table, message, Tag, Button } from 'antd';
import { HddOutlined, LockOutlined } from '@ant-design/icons';
import axios from '../../axios';
import { useNavigate } from 'react-router-dom';
import PasswordModal from './PasswordModal';
import PasswordInputModal from './PasswordInputModal';

const DriveList = ({ keys }) => {
    const [modalStates, setModalStates] = useState({
        password: false,
        removePassword: false,
        passwordInput: false,
        passwordVerify: false
    });

    const [driveStates, setDriveStates] = useState({
        list: [],
        selected: null,
        selectedForAccess: null,
        loading: false
    });

    const [passwordStates, setPasswordStates] = useState({
        hasPassword: {},
        lockedBy: {}
    });

    const [users, setUsers] = useState([]);
    const navigate = useNavigate();

    const handleModal = (modalType, isVisible, drive = null) => {
        setModalStates(prev => ({ ...prev, [modalType]: isVisible }));
        if (drive !== undefined) {
            setDriveStates(prev => ({ ...prev, selected: drive }));
        }
    };

    const apiService = {
        checkPassword: async (path, password = null) => {
            const payload = { path, keys };
            if (password) payload.password = password;
            
            return await axios.post('/api/filesystem/check-password', payload, {
                headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
            });
        },
        savePassword: async (path, password) => {
            return await axios.post('/api/filesystem/save-password', 
                { path, password, keys },
                {
                    headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                }
            );
        },
        removePassword: async (path) => {
            return await axios.post('/api/filesystem/remove-password', 
                { path },
                {
                    headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                }
            );
        }
    };

    const handleCreatePassword = async (values) => {
        try {
            const response = await apiService.savePassword(
                driveStates.selected?.path,
                values.password
            );

            if (response.data.success) {
                message.success('Đã tạo mật khẩu thành công');
                handleModal('password', false);
                setDriveStates(prev => ({ ...prev, selected: null }));
                await checkPathPassword(driveStates.selected?.path, users);
            }
        } catch (error) {
            message.error('Không thể tạo mật khẩu');
        }
    };

    const handleRemovePassword = async () => {
        try {
            const response = await apiService.removePassword(driveStates.selected?.path);

            if (response.data.success) {
                message.success('Đã xóa mật khẩu thành công');
                handleModal('removePassword', false);
                setDriveStates(prev => ({ ...prev, selected: null }));
                await checkPathPassword(driveStates.selected?.path, users);
            }
        } catch (error) {
            message.error('Không thể xóa mật khẩu');
        }
    };

    // Fetch users data
    const fetchUsers = useCallback(async () => {
        try {
            const response = await axios.get('/users/all', {
                headers: {
                    'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                }
            });
            setUsers(response.data);
            return response.data;
        } catch (error) {
            console.error('Lỗi khi lấy danh sách người dùng:', error);
            return [];
        }
    }, []);

    const getUserName = useCallback((userKey, usersList) => {
        if (!Array.isArray(usersList)) {
            console.warn('usersList không phải là mảng:', usersList);
            return 'Không xác định';
        }
        const user = usersList.find(u => u.keys === userKey);
        return user ? user.name : 'Không xác định';
    }, []);

    const checkPathPassword = useCallback(async (path, usersList) => {
        try {
            const response = await axios.post('/api/filesystem/check-password', 
                { path, keys },
                {
                    headers: {
                        'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                    }
                }
            );
            
            const safeUsersList = Array.isArray(usersList) ? usersList : [];
            
            const passwordInfo = {
                hasPassword: response.data.hasPassword,
                isAuthorized: response.data.isAuthorized,
                lockedByKey: response.data.lockedByKey
            };

            setPasswordStates(prev => ({
                ...prev,
                hasPassword: {
                    ...prev.hasPassword,
                    [path]: passwordInfo
                },
                lockedBy: {
                    ...prev.lockedBy,
                    [path]: getUserName(response.data.lockedByKey, safeUsersList)
                }
            }));

            return passwordInfo;
        } catch (error) {
            console.error('Lỗi kiểm tra mật khẩu:', error);
            return { hasPassword: false, isAuthorized: false };
        }
    }, [keys, getUserName]);

    const fetchDrives = useCallback(async () => {
        try {
            setDriveStates(prev => ({ ...prev, loading: true }));
            const usersList = await fetchUsers();
            
            const response = await axios.get('/api/filesystem/drives', {
                headers: {
                    'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                }
            });
            setDriveStates(prev => ({ ...prev, list: response.data }));
            
            response.data.forEach(drive => {
                checkPathPassword(drive.path, usersList);
            });
        } catch (error) {
            message.error('Không thể lấy danh sách ổ đĩa');
        } finally {
            setDriveStates(prev => ({ ...prev, loading: false }));
        }
    }, [checkPathPassword, fetchUsers]);

    useEffect(() => {
        fetchDrives();
    }, [fetchDrives]);

    const handleDriveClick = async (record) => {
        const passwordCheck = await checkPathPassword(record.path, users);
        
        if (passwordCheck.hasPassword && !passwordCheck.isAuthorized) {
            setDriveStates(prev => ({ ...prev, selectedForAccess: record }));
            handleModal('passwordInput', true);
            return;
        }

        const encodedPath = encodeURIComponent(record.path);
        navigate(`/auth/dashboard/webadmin/folder/${encodedPath}`);
    };

    const handlePasswordSubmit = async (values) => {
        try {
            const response = await axios.post('/api/filesystem/check-password', {
                path: driveStates.selectedForAccess?.path,
                keys,
                password: values.password
            });

            if (response.data.isAuthorized) {
                handleModal('passwordInput', false);
                const encodedPath = encodeURIComponent(driveStates.selectedForAccess?.path);
                navigate(`/auth/dashboard/webadmin/folder/${encodedPath}`);
            } else {
                message.error('Mật khẩu không chính xác');
            }
        } catch (error) {
            message.error('Có lỗi xảy ra khi xác thực mật khẩu');
        }
    };

    const handlePasswordVerification = async (values) => {
        try {
            const response = await axios.post('/api/filesystem/check-password', {
                path: driveStates.selected?.path,
                keys,
                password: values.password
            }, {
                headers: {
                    'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                }
            });

            if (response.data.isAuthorized) {
                handleModal('passwordVerify', false);
                handleModal('removePassword', true);
            } else {
                message.error('Mật khẩu không chính xác');
            }
        } catch (error) {
            message.error('Có lỗi xảy ra khi xác thực mật khẩu');
        }
    };

    const columns = [
        {
            title: 'Tên ổ đĩa',
            dataIndex: 'name',
            key: 'name',
            render: (text) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HddOutlined />
                    <span>{text}</span>
                </div>
            ),
        },
        {
            title: 'Tổng dung lượng',
            dataIndex: 'totalSize',
            key: 'totalSize',
        },
        {
            title: 'Dung lượng trống',
            dataIndex: 'freeSpace',
            key: 'freeSpace',
        },
        {
            title: 'Đã sử dụng',
            dataIndex: 'usedSpace',
            key: 'usedSpace',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status, record) => (
                <Tag color={passwordStates.hasPassword[record.path]?.hasPassword ? "red" : "green"}>
                    {passwordStates.hasPassword[record.path]?.hasPassword ? 
                        `Đã khóa bởi ${passwordStates.lockedBy[record.path] || 'Không xác định'}` : 
                        status
                    }
                </Tag>
            ),
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => (
                <Button
                    type={passwordStates.hasPassword[record.path]?.hasPassword ? "primary" : "default"}
                    icon={<LockOutlined />}
                    onClick={(e) => {
                        e.stopPropagation();
                        setDriveStates(prev => ({ ...prev, selected: record }));
                        if (passwordStates.hasPassword[record.path]?.hasPassword) {
                            handleModal('passwordVerify', true);
                        } else {
                            handleModal('password', true);
                        }
                    }}
                >
                    {passwordStates.hasPassword[record.path]?.hasPassword ? 'Đã khóa' : 'Đặt mật khẩu'}
                </Button>
            ),
        }
    ];

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <h2>Danh sách ổ đĩa</h2>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <Table
                    columns={columns}
                    dataSource={driveStates.list}
                    rowKey="name"
                    loading={driveStates.loading}
                    onRow={(record) => ({
                        onClick: () => handleDriveClick(record),
                        style: { cursor: 'pointer' }
                    })}
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                />
            </div>

            <PasswordModal
                visible={modalStates.password}
                onCancel={() => {
                    handleModal('password', false);
                    setDriveStates(prev => ({ ...prev, selected: null }));
                }}
                onSubmit={handleCreatePassword}
                type="drive"
                name={driveStates.selected?.name}
            />

            <PasswordModal
                visible={modalStates.removePassword}
                onCancel={() => {
                    handleModal('removePassword', false);
                    setDriveStates(prev => ({ ...prev, selected: null }));
                }}
                onSubmit={handleRemovePassword}
                type="drive"
                name={driveStates.selected?.name}
                isRemove={true}
            />

            <PasswordInputModal
                visible={modalStates.passwordInput}
                onCancel={() => {
                    handleModal('passwordInput', false);
                    setDriveStates(prev => ({ ...prev, selectedForAccess: null }));
                }}
                onSubmit={handlePasswordSubmit}
                type="drive"
                name={driveStates.selectedForAccess?.name}
            />

            <PasswordModal
                visible={modalStates.passwordVerify}
                onCancel={() => {
                    handleModal('passwordVerify', false);
                    setDriveStates(prev => ({ ...prev, selected: null }));
                }}
                onSubmit={handlePasswordVerification}
                type="drive"
                name={driveStates.selected?.name}
                isVerify={true}
            />
        </div>
    );
};

export default memo(DriveList);
