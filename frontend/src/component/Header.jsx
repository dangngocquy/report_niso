import React, { useState, useEffect, useMemo } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Layout, Menu, Drawer, Input, Button, Empty, Divider, Dropdown } from 'antd';
import {
    MenuOutlined,
    HomeOutlined,
    LogoutOutlined
} from '@ant-design/icons';
import Logo from '../assets/Logo.svg';
import { AiOutlineCloudServer } from "react-icons/ai";
import { MdManageAccounts } from "react-icons/md";
import { BsDatabaseAdd } from "react-icons/bs"
import { IoIosArrowDown } from "react-icons/io";
import PropTypes from 'prop-types';
import { memo } from 'react';

const { Header, Footer, Content } = Layout;

const { Search } = Input;

const Headers = ({ name, handleLogout, phanquyen }) => {
    const [drawerState, setDrawerState] = useState({
        isOpen: false,
        searchQuery: ''
    });
    const [data, setData] = useState([]);
    const [currentTitle, setCurrentTitle] = useState('REPORT NISO');
    const [showFooter, setShowFooter] = useState(true);
    
    const navigate = useNavigate();
    const location = useLocation();

    const handleDrawer = (isOpen) => setDrawerState(prev => ({ ...prev, isOpen }));
    
    const navigationPaths = {
        account: "/auth/dashboard/account",
        database: "/auth/dashboard/database",
        webadmin: "/auth/dashboard/webadmin"
    };

    const navigateTo = (path) => () => navigate(path);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get('/content/all', {
                    headers: {
                        'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                    }
                });
                setData(response.data.data);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        const path = location.pathname;
        if (path.includes('querydata')) {
            setCurrentTitle('DATA NISO');
        } else if (path === '/auth/dashboard/home') {
            setCurrentTitle('REPORT NISO');
        }
        setShowFooter(!path.includes('database/query'));
    }, [location.pathname]);

    const filteredData = useMemo(() => 
        data.filter(item =>
            item.title.toLowerCase().includes(drawerState.searchQuery.toLowerCase())
        ),
        [data, drawerState.searchQuery]
    );

    const dropdownItems = useMemo(() => [
        {
            key: '1',
            label: <Link to="/auth/dashboard/home" onClick={() => setCurrentTitle('REPORT NISO')}>Report NISO</Link>,
        },
        {
            key: '2',
            label: <Link to="/auth/dashboard/querydata" onClick={() => setCurrentTitle('DATA NISO')}>Data NISO</Link>,
        },
    ], []);

    const handleLogoClick = () => {
        const path = location.pathname;
        if (path.includes('querydata')) {
            navigate('/auth/dashboard/querydata');
            setCurrentTitle('DATA NISO');
        } else {
            navigate('/auth/dashboard/home');
            setCurrentTitle('REPORT NISO');
        }
    };

    return (
        <Layout>
            <Header style={{ background: '#fff', boxShadow: 'var(--main-boxshadow)', position: 'fixed', width: '100%', zIndex: '333' }} className='mobile_report_header'>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                        <img 
                            src={Logo} 
                            alt='Logo' 
                            style={{ width: '35px', cursor: 'pointer' }} 
                            onClick={handleLogoClick}
                        />
                        <Dropdown
                            menu={{ items: dropdownItems }}
                            placement="bottomRight"
                            arrow
                        >
                            <span style={{ color: 'var(--main-background)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} className='mn'>
                                {currentTitle} <IoIosArrowDown size={21}/>
                            </span>
                        </Dropdown>
                    </div>
                    <span>
                        <span style={{ marginRight: '15px' }} className='mn'> Xin chào, <span style={{ color: 'var(--main-background)' }}>{name}</span></span>
                        <Button icon={<MenuOutlined />} size='large' onClick={() => handleDrawer(true)} />
                    </span>
                </div>
            </Header>
            <Drawer
                title="MENU"
                placement="right"
                onClose={() => handleDrawer(false)}
                width={360}
                visible={drawerState.isOpen}
            >
                <Search
                    placeholder="Tìm kiếm nhanh..."
                    value={drawerState.searchQuery}
                    onChange={(e) => setDrawerState(prev => ({ ...prev, searchQuery: e.target.value }))}
                    style={{ marginBottom: '15px' }}
                    enterButton
                    size='large'
                />
                <Menu mode='vertical' style={{ fontSize: '11pt' }}>
                    <Menu.Item icon={<HomeOutlined />}>
                        <NavLink to="/auth/dashboard/home">Home</NavLink>
                    </Menu.Item>
                    {filteredData.length > 0 ? (
                        filteredData.slice().reverse().map((item) => (
                            <Menu.Item key={item.title}>
                                <NavLink to={`/auth/dashboard/views/${item.keys}`}>{item.title}</NavLink>
                            </Menu.Item>
                        ))
                    ) : (
                        <Empty description="Không tìm thấy kết quả tìm kiếm !" />
                    )}
                    <Divider />
                    {phanquyen === true && (
                        <Menu.Item onClick={navigateTo(navigationPaths.account)} icon={<MdManageAccounts size={18} />}>
                            Quản lý tài khoản
                        </Menu.Item>
                    )}
                    {phanquyen === true && (
                        <Menu.Item onClick={navigateTo(navigationPaths.database)} icon={<BsDatabaseAdd size={18} />}>
                            Quản lý kết nối
                        </Menu.Item>
                    )}
                     {/* {phanquyen === true && (
                        <Menu.Item onClick={navigateTo(navigationPaths.webadmin)} icon={<AiOutlineCloudServer size={18} />}>
                            File Server (Beta)
                        </Menu.Item>
                    )} */}
                    <Menu.Item icon={<LogoutOutlined />} onClick={handleLogout}>
                        Log out
                    </Menu.Item>
                </Menu>
            </Drawer>
            <Content>
                <Outlet />
            </Content>
            {showFooter && (
                <Footer style={{ textAlign: 'center' }} className='ftmb'>
                    <p style={{ fontSize: '8pt' }}>&copy; 2024 IT Team - NISO Company. All rights reserved.</p>
                    <p style={{ fontSize: '8pt' }}>4th Floor, 199C Nguyen Van Huong, Thao Dien Ward, Thu Duc City, Ho Chi Minh City, Vietnam</p>
                </Footer>
            )}
        </Layout>
    );
};

Headers.propTypes = {
    name: PropTypes.string.isRequired,
    handleLogout: PropTypes.func.isRequired,
    phanquyen: PropTypes.bool.isRequired
};

export default memo(Headers);
