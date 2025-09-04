import { useState, useEffect, useCallback, memo } from 'react';
import { Empty, List, Progress } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { FolderOutlined } from '@ant-design/icons';
import axios from '../../axios';
import moment from 'moment';

const QueryListUser = memo(({ keys }) => {
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(30);
    const navigate = useNavigate();
    const location = useLocation();
    const [connectionStatuses, setConnectionStatuses] = useState({});

    const fetchFolders = useCallback(async () => {
        try {
            setLoading(true);
            setProgress(30);

            // Lấy tất cả connections
            const connectionsResponse = await axios.get('/api/connections', {
                headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
            });

            // Kiểm tra trạng thái của từng connection
            const statuses = {};
            for (const conn of connectionsResponse.data.connections) {
                try {
                    const statusResponse = await axios.get(`/api/connections/${conn.id}`, {
                        headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                    });
                    statuses[conn.id] = statusResponse.data.connection.connectionStatus;
                } catch (error) {
                    console.error(`Lỗi khi kiểm tra trạng thái kết nối ${conn.id}:`, error);
                    statuses[conn.id] = 'disconnected';
                }
            }
            setConnectionStatuses(statuses);

            // Lấy tất cả folders từ mọi connection và gộp lại
            const allFolders = [];
            for (const conn of connectionsResponse.data.connections) {
                // Bỏ qua connection đã bị ngắt kết nối
                if (statuses[conn.id] === 'disconnected') continue;

                const foldersResponse = await axios.get(`/api/connections/folders/${conn.id}`, {
                    headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                });

                const filteredFolders = foldersResponse.data.folders.filter(folder => {
                    // Kiểm tra quyền truy cập folder
                    const hasFolderAccess = folder.keysUserTime && folder.keysUserTime[keys];

                    // Kiểm tra quyền truy cập query
                    const hasQueryAccess = (folder.queries || []).some(
                        query => query.keysUserTime && query.keysUserTime[keys]
                    );

                    return hasFolderAccess || hasQueryAccess;
                });

                // Sắp xếp folders theo thời gian grantedAt
                const sortedFolders = filteredFolders.sort((a, b) => {
                    const timeA = a.keysUserTime?.[keys]?.grantedAt
                        ? moment(a.keysUserTime[keys].grantedAt, 'DD/MM/YYYY HH:mm:ss').valueOf()
                        : 0;
                    const timeB = b.keysUserTime?.[keys]?.grantedAt
                        ? moment(b.keysUserTime[keys].grantedAt, 'DD/MM/YYYY HH:mm:ss').valueOf()
                        : 0;
                    return timeB - timeA;
                });

                allFolders.push(...sortedFolders);
            }

            setFolders(allFolders);
            setProgress(100);
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu:', error);
        } finally {
            setTimeout(() => {
                setLoading(false);
            }, 500);
        }
    }, [keys]);

    useEffect(() => {
        fetchFolders();
    }, [fetchFolders, location.key]);

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
                <span>Đang tải thư mục...</span>
            </div>
        );
    }

    return (
        <div>
            <title>NISO | Thư mục được chia sẻ</title>
            <h1 style={{ color: '#ae8f3d' }}>Thư mục được chia sẻ</h1>
            <div style={{
                padding: '20px',
                background: '#fff',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
                <List
                    itemLayout="horizontal"
                    dataSource={folders}
                    locale={{ emptyText: <Empty description="Không có thư mục nào được chia sẻ" /> }}
                    split={true}
                    renderItem={folder => (
                        <List.Item
                            onClick={() => navigate(`/auth/dashboard/querydata/folder/files/${folder.id}`)}
                            style={{
                                cursor: 'pointer',
                                padding: '12px 24px',
                                transition: 'all 0.3s ease',
                                borderRadius: '4px'
                            }}
                            className="folder-item-hover"
                        >
                            <List.Item.Meta
                                avatar={<FolderOutlined style={{ fontSize: '20px', color: '#ae8f3d' }} />}
                                title={folder.folderName}
                            />
                        </List.Item>
                    )}
                />
            </div>
        </div>
    );
});

export default QueryListUser;

