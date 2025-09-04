import { useState, useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { HomeOutlined, FolderOutlined, FileOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Menu, Layout, message, Progress, Button, Drawer, Pagination, Tooltip } from 'antd';
import axios from '../../axios';
import LogoLoad from '../base/LogoLoad';
import { TbReportAnalytics } from "react-icons/tb";
import moment from 'moment';
import { Helmet } from 'react-helmet-async';

const { Sider } = Layout;

const QueryEditorUser = ({ keys }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedKeys, setSelectedKeys] = useState([]);
    const [openKeys, setOpenKeys] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [connectionStatuses, setConnectionStatuses] = useState({});

    useEffect(() => {
        const fetchConnections = async () => {
            try {
                setLoading(true);
                setError(false);
                setProgress(30);

                const connectionsResponse = await axios.get('/api/connections', {
                    headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                });

                const statuses = {};
                await Promise.all(connectionsResponse.data.connections.map(async (conn) => {
                    try {
                        const statusResponse = await axios.get(`/api/connections/${conn.id}`, {
                            headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                        });
                        statuses[conn.id] = statusResponse.data.connection.connectionStatus;
                    } catch (error) {
                        console.error(`Lỗi khi kiểm tra trạng thái kết nối ${conn.id}:`, error);
                        statuses[conn.id] = 'disconnected';
                    }
                }));
                setConnectionStatuses(statuses);

                setProgress(50);

                const connectionsWithData = await Promise.all(
                    connectionsResponse.data.connections.map(async (connection) => {
                        try {
                            const foldersResponse = await axios.get(`/api/connections/folders/${connection.id}`, {
                                headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                            });

                            const filteredFolders = foldersResponse.data.folders
                                .filter(folder => {
                                    const hasFolderAccess = folder.keysUserTime && folder.keysUserTime[keys];
                                    const hasQueryAccess = (folder.queries || []).some(
                                        query => query.keysUserTime && query.keysUserTime[keys]
                                    );
                                    return hasFolderAccess || hasQueryAccess;
                                })
                                .map(folder => {
                                    let filteredQueries;

                                    if (folder.keysUserTime && folder.keysUserTime[keys]) {
                                        filteredQueries = folder.queries || [];
                                    } else {
                                        filteredQueries = (folder.queries || [])
                                            .filter(query => query.keysUserTime && query.keysUserTime[keys]);
                                    }

                                    const sortedQueries = filteredQueries.sort((a, b) => {
                                        const timeA = a.keysUserTime?.[keys]?.grantedAt
                                            ? moment(a.keysUserTime[keys].grantedAt, 'DD/MM/YYYY HH:mm:ss').valueOf()
                                            : 0;
                                        const timeB = b.keysUserTime?.[keys]?.grantedAt
                                            ? moment(b.keysUserTime[keys].grantedAt, 'DD/MM/YYYY HH:mm:ss').valueOf()
                                            : 0;
                                        return timeB - timeA;
                                    });

                                    return {
                                        ...folder,
                                        queries: sortedQueries,
                                        grantedTime: folder.keysUserTime?.[keys]?.grantedAt
                                            ? moment(folder.keysUserTime[keys].grantedAt, 'DD/MM/YYYY HH:mm:ss').valueOf()
                                            : 0
                                    };
                                })
                                .sort((a, b) => b.grantedTime - a.grantedTime);

                            return {
                                ...connection,
                                folders: filteredFolders
                            };
                        } catch (error) {
                            console.error(`Error fetching folders for connection ${connection.id}:`, error);
                            return {
                                ...connection,
                                folders: []
                            };
                        }
                    })
                );

                setProgress(80);

                const filteredConnections = connectionsWithData.filter(
                    conn => conn.folders.length > 0
                );

                setConnections(filteredConnections);
                setProgress(100);

            } catch (error) {
                setError(true);
                setProgress(100);
                message.error('Lỗi khi tải danh sách kết nối!');
            } finally {
                setTimeout(() => {
                    setLoading(false);
                    setProgress(0);
                }, 500);
            }
        };

        fetchConnections();
    }, [keys]);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) {
                setSidebarCollapsed(true);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const path = location.pathname;
        const queryMatch = path.match(/\/query\/(.+)$/);
        const folderMatch = path.match(/\/folder\/files\/(.+)$/);

        if (queryMatch) {
            const queryId = queryMatch[1];
            setSelectedKeys([`query-${queryId}`]);

            // Tìm và mở folder chứa query
            const folder = connections.flatMap(conn => conn.folders)
                .find(folder => folder.queries?.some(q => q.id === queryId));
            if (folder) {
                setOpenKeys(prev => {
                    const folderKey = `folder-${folder.id}`;
                    return sidebarCollapsed ? [] : [folderKey];
                });
            }
        } else if (folderMatch) {
            const folderId = folderMatch[1];
            setSelectedKeys([`folder-${folderId}`]);
            setOpenKeys(prev => {
                const folderKey = `folder-${folderId}`;
                return sidebarCollapsed ? [] : [folderKey];
            });
        } else if (path.includes('/home')) {
            setSelectedKeys(['home']);
        }
    }, [location.pathname, connections, sidebarCollapsed]);

    useEffect(() => {
        if (sidebarCollapsed) {
            setOpenKeys([]);
        } else {
            // Khôi phục trạng thái mở của folder dựa trên selectedKeys
            const selectedKey = selectedKeys[0];
            if (selectedKey?.startsWith('query-')) {
                const folder = connections.flatMap(conn => conn.folders)
                    .find(folder => folder.queries?.some(q => `query-${q.id}` === selectedKey));
                if (folder) {
                    setOpenKeys([`folder-${folder.id}`]);
                }
            } else if (selectedKey?.startsWith('folder-')) {
                setOpenKeys([selectedKey]);
            }
        }
    }, [sidebarCollapsed, connections, selectedKeys]);

    const renderSavedQueries = () => {
        const getMenuItems = () => {
            const items = [
                {
                    key: 'home',
                    icon: <HomeOutlined />,
                    label: 'Home',
                    onClick: () => navigate('/auth/dashboard/querydata/folder')
                },
                {
                    key: 'Report',
                    icon: <TbReportAnalytics />,
                    label: 'Report',
                    onClick: () => navigate('/auth/dashboard/home')
                }
            ];

            const allFolders = connections.flatMap(connection => {
                if (connectionStatuses[connection.id] === 'disconnected') {
                    return [];
                }

                return connection.folders
                    .filter(folder => {
                        const hasFolderAccess = folder.keysUserTime && folder.keysUserTime[keys];
                        const hasQueryAccess = (folder.queries || []).some(
                            query => query.keysUserTime && query.keysUserTime[keys]
                        );
                        return hasFolderAccess || hasQueryAccess;
                    })
                    .map(folder => ({
                        ...folder,
                        connectionId: connection.id
                    }));
            });

            // Tính toán phân trang
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedFolders = allFolders.slice(startIndex, endIndex);

            paginatedFolders.forEach(folder => {
                let queries;
                const hasFolderAccess = folder.keysUserTime && folder.keysUserTime[keys];

                if (hasFolderAccess) {
                    queries = folder.queries || [];
                } else {
                    queries = (folder.queries || [])
                        .filter(query => query.keysUserTime && query.keysUserTime[keys]);
                }

                const folderItem = {
                    key: `folder-${folder.id}`,
                    icon: <FolderOutlined />,
                    label: (
                        <Tooltip title={folder.folderName} placement="right">
                            <span onClick={() => navigate(`/auth/dashboard/querydata/folder/files/${folder.id}`)} className='folder-name'>
                                {folder.folderName}
                            </span>
                        </Tooltip>
                    ),
                    children: queries.map(query => ({
                        key: `query-${query.id}`,
                        icon: <FileOutlined />,
                        label: (
                            <Tooltip title={query.queryName} placement="right">
                                <span className="query-name">{query.queryName}</span>
                            </Tooltip>
                        ),
                        onClick: () => {
                            navigate(`/auth/dashboard/querydata/query/${query.id}`, {
                                state: {
                                    query: {
                                        ...query,
                                        connectionId: folder.connectionId,
                                        folderId: folder.id
                                    },
                                    folderAccess: folder.keysUserTime
                                }
                            });
                        }
                    }))
                };

                items.push(folderItem);
            });

            return items;
        };

        return (
            <>
                <Menu
                    mode="inline"
                    items={getMenuItems()}
                    style={{ backgroundColor: '#ffffff' }}
                    selectedKeys={selectedKeys}
                    openKeys={openKeys}
                    onOpenChange={setOpenKeys}
                />
                {connections.flatMap(conn => conn.folders).length > itemsPerPage && (
                    <div style={{ padding: '16px', textAlign: 'center' }}>
                        <Pagination
                            current={currentPage}
                            total={connections.flatMap(conn => conn.folders).length}
                            pageSize={itemsPerPage}
                            onChange={(page) => setCurrentPage(page)}
                            size="small"
                        />
                    </div>
                )}
            </>
        );
    };

    const renderContent = () => {
        return (
            <Layout style={{
                marginLeft: !isMobile ? (sidebarCollapsed ? '80px' : '280px') : 0,
                background: 'transparent',
                transition: 'all 0.3s ease'
            }}>
                <div className='layout layout3' style={{ background: '#ffffff' }}>
                    <Outlet key={location.pathname} />
                </div>
            </Layout>
        );
    };

    return (
        <>
            <Helmet>
                <title>DATA - REPORT NISO</title>
                <meta name="description" content="Trang quản lý dữ liệu" />
            </Helmet>
            <Layout style={{ minHeight: '100vh', background: '#ffffff' }}>
                {loading ? (
                    <div style={{ display: 'flex' }}>
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: '#ffffff',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            flexDirection: 'column',
                            paddingTop: '180px'
                        }}>
                            <LogoLoad />
                            <Progress
                                percent={progress}
                                status={error ? "exception" : "active"}
                                strokeColor={
                                    error
                                        ? "#ff4d4f"
                                        : {
                                            '0%': '#108ee9',
                                            '100%': '#87d068',
                                        }
                                }
                                style={{ width: '80%', maxWidth: '187.81px' }}
                            />
                            <div style={{
                                textAlign: 'center',
                                marginTop: '20px',
                                color: error ? '#ff4d4f' : '#666'
                            }}>
                                {progress < 30 && 'Đang kiểm tra thông tin kết nối...'}
                                {progress >= 30 && progress < 100 && 'Đang kết nối đến cơ sở dữ liệu...'}
                                {progress === 100 && (error ? 'Kết nối thất bại.' : 'Kết nối thành công.')}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Mobile Menu */}
                        {isMobile && (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '7vh', paddingRight: '20px' }}>
                                    <Button
                                        type='primary'
                                        icon={<UnorderedListOutlined />}
                                        onClick={() => setDrawerVisible(true)}
                                        style={{ marginTop: 15 }}
                                    >
                                        Folder
                                    </Button>
                                </div>

                                <Drawer
                                    title="Danh sách dữ liệu"
                                    placement="left"
                                    onClose={() => setDrawerVisible(false)}
                                    open={drawerVisible}
                                    width={320}
                                >
                                    {renderSavedQueries()}
                                </Drawer>
                            </>
                        )}

                        {/* Desktop Menu */}
                        {!isMobile && (
                            <Sider
                                width={sidebarCollapsed ? 80 : 280}
                                collapsible
                                collapsed={sidebarCollapsed}
                                onCollapse={setSidebarCollapsed}
                                style={{
                                    borderRight: '1px solid #e8e8e8',
                                    overflow: 'auto',
                                    height: 'calc(100vh - 64px)',
                                    position: 'fixed',
                                    left: 0,
                                    top: 64,
                                    bottom: 0,
                                    backgroundColor: '#ffffff'
                                }}
                            >
                                {renderSavedQueries()}
                            </Sider>
                        )}

                        {/* Main Content với key mới */}
                        {renderContent()}
                    </>
                )}
            </Layout>
        </>
    );
};

export default QueryEditorUser;