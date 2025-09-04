import { useState, useEffect, memo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { List, Progress, Empty, Breadcrumb } from 'antd';
import { FileOutlined, HomeOutlined, FolderOutlined } from '@ant-design/icons';
import axios from '../../axios';
import moment from 'moment';

const QueryFileUser = memo(({ keys }) => {
    const [loading, setLoading] = useState(true);
    const [folder, setFolder] = useState(null);
    const [queries, setQueries] = useState([]);
    const [progress, setProgress] = useState(30);
    const { folderId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [connectionStatus, setConnectionStatus] = useState(null);

    useEffect(() => {
        const fetchQueries = async () => {
            try {
                setLoading(true);
                setProgress(30);

                const response = await axios.get(`/api/connections/folders/${folderId}/queries`, {
                    headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                });

                const folder = response.data.folder;

                const connectionResponse = await axios.get(`/api/connections/${folder.connectionId}`, {
                    headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                });

                setConnectionStatus(connectionResponse.data.connection.connectionStatus);

                if (connectionResponse.data.connection.connectionStatus === 'disconnected') {
                    setFolder(folder);
                    setQueries([]);
                    setProgress(100);
                    return;
                }

                let queries;

                if (folder.keysUserTime && folder.keysUserTime[keys]) {
                    queries = response.data.queries;
                } else {
                    queries = response.data.queries.filter(query =>
                        query.keysUserTime && query.keysUserTime[keys]
                    );
                }

                const sortedQueries = queries.sort((a, b) => {
                    const timeA = a.keysUserTime?.[keys]?.grantedAt
                        ? moment(a.keysUserTime[keys].grantedAt, 'DD/MM/YYYY HH:mm:ss').valueOf()
                        : 0;
                    const timeB = b.keysUserTime?.[keys]?.grantedAt
                        ? moment(b.keysUserTime[keys].grantedAt, 'DD/MM/YYYY HH:mm:ss').valueOf()
                        : 0;
                    return timeB - timeA;
                });

                const status = connectionResponse.data.connection.connectionStatus;
                setConnectionStatus(status);

                if (status === 'disconnected') {
                    setFolder(folder);
                    setQueries([]);
                    setProgress(100);
                    return;
                }

                setFolder(folder);
                setQueries(sortedQueries);
                setProgress(100);
            } catch (error) {
                console.error('Lỗi khi tải dữ liệu:', error);
            } finally {
                setTimeout(() => {
                    setLoading(false);
                }, 500);
            }
        };

        if (folderId) {
            fetchQueries();
        }
    }, [folderId, keys, location.key]);

    useEffect(() => {
        if (loading && progress < 90) {
            const timer = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(timer);
                        return 90;
                    }
                    return prev + (prev < 50 ? 20 : 10);
                });
            }, 800);
            return () => clearInterval(timer);
        }
    }, [loading, progress]);

    const handleQueryClick = (query) => {
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
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px',
                marginTop: '16px'
            }} className='lll'>
                <Progress
                    type="circle"
                    percent={progress}
                    status="active"
                    size={30}
                    strokeColor={{
                        '0%': '#108ee9',
                        '100%': '#87d068',
                    }}
                    format={() => ''}
                />
                <span>Đang tải dữ liệu...</span>
            </div>
        );
    }

    return (
        <div>
            <title>NISO | File được chia sẻ</title>
            <h1 style={{ color: '#ae8f3d' }}>File được chia sẻ</h1>

            <div style={{
                padding: '20px',
                background: '#fff',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
                <Breadcrumb
                    items={[
                        {
                            title: (
                                <span onClick={() => navigate('/auth/dashboard/querydata/folder')} style={{ cursor: 'pointer' }}>
                                    <HomeOutlined /> Home
                                </span>
                            ),
                        },
                        {
                            title: (
                                <span>
                                    <FolderOutlined /> {folder?.folderName}
                                </span>
                            ),
                        },
                    ]}
                    style={{ marginBottom: '20px' }}
                />

                {queries.length === 0 ? (
                    <Empty description="Không có file nào được chia sẻ." />
                ) : (
                    <List
                        itemLayout="horizontal"
                        dataSource={queries}
                        renderItem={query => (
                            <List.Item
                                className="query-item"
                                onClick={() => handleQueryClick(query)}
                                style={{ cursor: 'pointer' }}
                            >
                                <List.Item.Meta
                                    avatar={<FileOutlined style={{ fontSize: '20px', color: '#ae8f3d' }} />}
                                    title={query.queryName}
                                    description={`Cập nhật lần cuối: ${moment(query.lastModifiedAt || query.createdAt).format('DD/MM/YYYY HH:mm:ss')}`}
                                />
                            </List.Item>
                        )}
                    />
                )}
            </div>
        </div>
    );
});

export default QueryFileUser;

