import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from '../axios';
import { Table, Button, Drawer, Input, Switch, Popconfirm, message, Card, Badge } from 'antd';
import { Navigate } from 'react-router-dom';

const AddAccount = () => {
    const [formState, setFormState] = useState({
        data: {
            name: '',
            username: '',
            password: '',
            phanquyen: false,
        },
        initial: {
            name: '',
            username: '',
            password: '',
            phanquyen: '',
        },
        status: 'add',
        visible: false,
    });

    const [dataState, setDataState] = useState({
        users: [],
        admins: [],
        selectedId: null,
        searchQuery: '',
        loading: false,
    });

    const phanquyen = useMemo(() => {
        return localStorage.getItem('phanquyen') === 'true' || 
               sessionStorage.getItem('phanquyen') === 'true';
    }, []);

    const filteredUsers = useMemo(() => {
        return dataState.users
            .filter((user) => {
                const searchLower = dataState.searchQuery.toLowerCase();
                return (user.username?.toLowerCase() || '').includes(searchLower) ||
                       (user.name?.toLowerCase() || '').includes(searchLower);
            })
            .reverse();
    }, [dataState.users, dataState.searchQuery]);

    const resetForm = useCallback(() => {
        setFormState(prev => ({
            ...prev,
            data: {
                name: '',
                username: '',
                password: '',
                phanquyen: false,
            },
            status: 'add',
            visible: false,
        }));
        setDataState(prev => ({ ...prev, selectedId: null }));
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setDataState(prev => ({ ...prev, loading: true }));
            try {
                const response = await axios.get('/users/all', {
                    headers: {
                        'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                    }
                });
                const data = response.data.docs || response.data;
                setDataState(prev => ({
                    ...prev,
                    users: data,
                    admins: data,
                    loading: false
                }));
            } catch (error) {
                console.error('Error fetching data:', error);
                setDataState(prev => ({ ...prev, loading: false }));
            }
        };
        fetchData();
    }, []);

    if (!phanquyen) {
        return <Navigate to="/auth/dashboard/home" replace />;
    }

    const handleAdminSelection = (adminId) => {
        setDataState(prev => ({ ...prev, selectedId: adminId }));
        fetchAdminDetails(adminId);
    };

    const fetchAdminDetails = async (adminId) => {
        try {
            const response = await axios.get(`/users/get/${adminId}`, {
                headers: {
                    'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                }
            });
            const adminData = response.data;
            setFormState(prev => ({
                ...prev,
                data: {
                    name: adminData.name,
                    phanquyen: adminData.phanquyen,
                    username: adminData.username,
                    password: adminData.password,
                },
                initial: {
                    name: adminData.name,
                    phanquyen: adminData.phanquyen,
                    username: adminData.username,
                    password: adminData.password,
                },
                status: 'edit',
                visible: true,
            }));
        } catch (error) {
            console.error('Error fetching admin details:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, checked } = e.target;
        const inputValue = e.target.type === 'checkbox' ? checked : e.target.value;
        setFormState(prev => ({
            ...prev,
            data: { ...prev.data, [name]: inputValue }
        }));
    };

    const handleSearch = (e) => {
        setDataState(prev => ({ ...prev, searchQuery: e.target.value }));
    };

    const currentUsers = filteredUsers.slice();

    const handleAddAdmin = async () => {
        if (!formState.data.name || !formState.data.username || !formState.data.password) {
            message.warning("Bạn chưa nhập đầy đủ thông tin!");
            return;
        }

        const existingAdmin = dataState.admins.find(admin => admin.username === formState.data.username);
        if (existingAdmin) {
            message.warning("Tên người dùng hoặc tài khoản đã tồn tại trên hệ thống!");
            return;
        }

        try {
            const requestData = {
                name: formState.data.name,
                username: formState.data.username,
                password: formState.data.password,
                phanquyen: formState.data.phanquyen ? 1 : 0,
            };

            const response = await axios.post(`/users/add`, requestData, {
                headers: {
                    'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                }
            });

            if (response.data) {
                setDataState(prev => ({
                    ...prev,
                    users: [...prev.users, response.data],
                    loading: false
                }));
                setFormState(prev => ({
                    ...prev,
                    data: {
                        name: '',
                        phanquyen: false,
                        username: '',
                        password: '',
                    },
                    status: 'add',
                    visible: false,
                }));
                message.success("Thêm tài khoản thành công!");
            }
        } catch (error) {
            console.error('Error adding admin:', error);
            message.error(error.response?.data?.message || "Có lỗi xảy ra khi thêm tài khoản!");
        }
    };

    const handleUpdateAdmin = async () => {
        if (
            formState.data.name === formState.initial.name &&
            formState.data.username === formState.initial.username &&
            formState.data.phanquyen === formState.initial.phanquyen &&
            formState.data.password === formState.initial.password
        ) {
            message.warning("Thông tin tài khoản không thay đổi, không thể cập nhật!");
            return;
        }

        if (!formState.data.name || !formState.data.username || !formState.data.password) {
            message.warning("Bạn chưa nhập đầy đủ thông tin!");
            return;
        }

        if (formState.data.username !== formState.initial.username) {
            const existingAdmin = dataState.users.find(
                user => user.username === formState.data.username && user.keys !== dataState.selectedId
            );
            if (existingAdmin) {
                message.warning("Tên người dùng hoặc tài khoản đã tồn tại trên hệ thống!");
                return;
            }
        }

        try {
            const updatedData = {
                ...formState.data,
                phanquyen: formState.data.phanquyen ? 1 : 0,
            };

            const response = await axios.put(`/users/update/${dataState.selectedId}`, updatedData, {
                headers: {
                    'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                }
            });

            if (response.data) {
                setDataState(prev => ({
                    ...prev,
                    users: prev.users.map(user =>
                        user.keys === dataState.selectedId ? response.data : user
                    ),
                    selectedId: null,
                    loading: false
                }));
                setFormState(prev => ({
                    ...prev,
                    data: {
                        name: '',
                        phanquyen: false,
                        username: '',
                        password: '',
                    },
                    status: 'add',
                    visible: false,
                }));
                message.success("Cập nhật user thành công!");
            }
        } catch (error) {
            console.error('Error updating admin:', error);
            message.error(error.response?.data?.message || "Có lỗi xảy ra khi cập nhật tài khoản!");
        }
    };

    const handleDeleteAdmin = async (adminId) => {
        try {
            await axios.delete(`/users/delete/${adminId}`, {
                headers: {
                    'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                }
            });

            setDataState(prev => ({
                ...prev,
                users: prev.users.filter(user => user.keys !== adminId),
                loading: false
            }));
            message.success("Xóa tài khoản User thành công!");
        } catch (error) {
            console.error('Error deleting admin:', error);
            message.error("Có lỗi xảy ra khi xóa tài khoản!");
        }
    };

    const generateRandomPassword = () => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%zxcvbnmasdfghjklqwertyuiop';
        let newPassword = '';
        for (let i = 0; i < 8; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            newPassword += characters.charAt(randomIndex);
        }
        setFormState(prev => ({
            ...prev,
            data: { ...prev.data, password: newPassword }
        }));
    };

    const columns = [
        {
            title: 'STT',
            dataIndex: 'index',
            key: 'index',
            render: (text, record, index) => index + 1,
        },
        {
            title: 'Họ tên',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Loại tài khoản',
            dataIndex: 'phanquyen',
            key: 'phanquyen',
            render: (text) => (
                text ? (
                    <Badge status="error" text="Admin" />
                ) : (
                    <Badge status="success" text="User" />
                )
            ),
        },
        {
            title: 'Tài khoản',
            dataIndex: 'username',
            key: 'username',
        },
        {
            title: 'Mật khẩu',
            dataIndex: 'password',
            key: 'password',
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (text, record) => (
                <span>
                    <Button type='default' onClick={() => handleAdminSelection(record.keys)} style={{ marginRight: 15 }}>Edit</Button>
                    <Popconfirm
                        title="Bạn chắc chắn muốn xóa tài khoản này?"
                        onConfirm={() => handleDeleteAdmin(record.keys)}
                    >
                        <Button type='default' danger>Xóa</Button>
                    </Popconfirm>
                </span>
            ),
        },
    ];

    return (
        <div className='layout' style={{ minHeight: '81vh' }}>
            <title>NISO - Quản lý tài khoản nội bộ</title>
            <h2 style={{ color: 'var(--main-background)', textTransform: 'uppercase', paddingTop: 20 }}>Quản lý tài khoản nội bộ</h2>

            <Card className='account-nisso-report'>
                <div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Input
                            type='search'
                            placeholder='Nhập tên tài khoản để tìm kiếm'
                            className='input1'
                            value={dataState.searchQuery}
                            onChange={handleSearch}
                            size='large'
                            style={{ marginBottom: 15 }}
                        />
                    </span>
                    <Button type="primary" onClick={() => setFormState(prev => ({ ...prev, visible: true }))} style={{ marginBottom: 15 }}>
                        Thêm tài khoản
                    </Button>
                    <Table
                        columns={columns}
                        dataSource={currentUsers}
                        pagination={{ pageSize: 5 }}
                        scroll={{ x: true }}
                        style={{ width: '100%', whiteSpace: 'nowrap' }}
                        rowKey="keys"
                        loading={dataState.loading}
                    />
                </div>
                <div style={{ marginTop: '15px' }}>
                    <Drawer
                        title={formState.status === 'add' ? "Thêm tài khoản" : "Cập nhật tài khoản"}
                        width={360}
                        onClose={resetForm}
                        visible={formState.visible}
                        bodyStyle={{ paddingBottom: 80 }}
                    >
                        <form>
                            <span style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <label style={{ fontWeight: 'bold' }}>Họ tên:</label>
                                <Input type="text" name="name" value={formState.data.name} onChange={handleInputChange} placeholder='Nhập họ tên' />
                            </span>

                            <span style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                                <label style={{ fontWeight: 'bold' }}>Tài khoản:</label>
                                <Input type="text" name="username" value={formState.data.username} onChange={handleInputChange} placeholder='Nhập tài khoản' />
                            </span>

                            <span style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                                <label style={{ fontWeight: 'bold' }}>Mật khẩu:</label>
                                <span className='grid-create'>
                                    <Input type="text" name="password" value={formState.data.password} onChange={handleInputChange} placeholder='Nhập mật khẩu' />
                                    <Button onClick={generateRandomPassword} style={{ marginTop: 15, marginBottom: 15 }}>Tạo mật khẩu ngẫu nhiên</Button>
                                </span>
                            </span>

                            <span style={{ marginTop: '10px' }}>
                                <label style={{ fontWeight: 'bold', marginRight: '15px' }}>Phân quyền</label>
                                <Switch checked={formState.data.phanquyen} onChange={(checked) => handleInputChange({ target: { name: 'phanquyen', type: 'checkbox', checked } })} />
                            </span>
                        </form>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                            <span className='flex-btn'>
                                {formState.status === 'add' ? (
                                    <Button type="primary" onClick={handleAddAdmin}>
                                        Thêm
                                    </Button>
                                ) : (
                                    <>
                                        <Button type="primary" onClick={handleUpdateAdmin}>
                                            Cập nhật
                                        </Button>
                                    </>
                                )}
                            </span>
                        </div>
                    </Drawer>
                </div>
            </Card>
        </div>
    );
};

export default React.memo(AddAccount);
