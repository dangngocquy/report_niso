import { useEffect, useState, useCallback } from 'react';
import { Card, message, Input, Button, Breadcrumb, Image, Progress, Dropdown, Space } from 'antd';
import { SearchOutlined, PlayCircleOutlined, StopOutlined, DownloadOutlined, MoreOutlined, LockOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import axios from 'axios';
import Loading2 from '../Loading2';
import PasswordModal from './PasswordModal';
import { usePasswordProtection } from '../../hooks/usePasswordProtection';
const { TextArea } = Input;

const getLanguage = (fileType) => {
    const languageMap = {
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'css': 'css',
        'html': 'html',
        'htm': 'htm',
        'json': 'json',
        'php': 'php',
        'py': 'python',
        'java': 'java'
    };
    return languageMap[fileType] || fileType;
};

const ReadFile = ({ keys }) => {
    const [content, setContent] = useState('');
    const [searchText, setSearchText] = useState('');
    const [fileType, setFileType] = useState('');
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [executingBat, setExecutingBat] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editableContent, setEditableContent] = useState('');
    const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const filePath = location.state?.path;
    const { isLoading, isAuthorized } = usePasswordProtection(filePath, keys);

    const getFileExtension = (filename) => {
        if (!filename) return '';
        return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
    };

    const isImageFile = useCallback((fileName) => {
        if (!fileName) return false;
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico'];
        const ext = fileName.slice((fileName.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
        return imageExtensions.includes(`.${ext}`);
    }, []);

    const fetchFileContent = useCallback(async () => {
        if (!filePath) return;

        try {
            setLoading(true);
            setProgress(0);

            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return prev;
                    }
                    return prev + 10;
                });
            }, 200);

            const ext = getFileExtension(filePath);
            setFileType(ext);

            if (isImageFile(filePath)) {
                const response = await axios.get('/api/filesystem/readfile', {
                    params: { path: filePath },
                    responseType: 'blob',
                    headers: {
                        'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                    }
                });

                const imageUrl = URL.createObjectURL(response.data);
                setContent(imageUrl);
            } else {
                const response = await axios.get('/api/filesystem/readfile', {
                    params: { path: filePath },
                    headers: {
                        'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                    }
                });

                if (typeof response.data === 'object' && response.data.content) {
                    setContent(response.data.content);
                } else {
                    setContent(response.data);
                }
            }

            setProgress(100);
            clearInterval(progressInterval);
        } catch (error) {
            console.error('Lỗi đọc file:', error);
            message.error('Không thể đọc nội dung file');
        } finally {
            setLoading(false);
        }
    }, [filePath, isImageFile]);

    useEffect(() => {
        if (!filePath) {
            message.error('Không tìm thấy đường dẫn file');
            navigate('/auth/dashboard/webadmin');
            return;
        }
        fetchFileContent();
    }, [filePath, navigate, fetchFileContent]);

    useEffect(() => {
        const checkBatStatus = async () => {
            if (filePath?.toLowerCase().endsWith('.bat')) {
                try {
                    const response = await axios.get('/api/filesystem/execute', {
                        params: {
                            path: filePath,
                            action: 'status'
                        },
                        headers: {
                            'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                        }
                    });
                    setIsRunning(response.data.isRunning);
                } catch (error) {
                    console.error('Lỗi kiểm tra trạng thái file:', error);
                }
            }
        };

        checkBatStatus();
    }, [filePath]);

    useEffect(() => {
        return () => {
            if (isImageFile(filePath) && content) {
                URL.revokeObjectURL(content);
            }
        };
    }, [content, filePath, isImageFile]);

    const handleSearch = () => {
        if (!searchText) return;

        const contentElement = document.querySelector('.file-content');
        if (contentElement) {
            const regex = new RegExp(searchText, 'gi');
            const highlightedContent = content.replace(regex, match => `<mark>${match}</mark>`);
            contentElement.innerHTML = highlightedContent;
        }
    };

    const handleExecuteBat = async () => {
        if (!filePath || !filePath.toLowerCase().endsWith('.bat')) {
            message.error('Không phải là file .bat hợp lệ');
            return;
        }

        try {
            setExecutingBat(true);
            const action = isRunning ? 'stop' : 'start';
            const response = await axios.get('/api/filesystem/execute', {
                params: {
                    path: filePath,
                    action: action
                },
                headers: {
                    'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                }
            });

            if (response.data.success) {
                setIsRunning(response.data.isRunning);
                message.success(response.data.message);
                if (response.data.output && response.data.output !== 'Không có output') {
                    message.info(`Output: ${response.data.output}`);
                }
            } else {
                message.warning(response.data.message || 'Thực thi file không thành công');
            }
        } catch (error) {
            console.error('Lỗi thực thi file:', error);
            message.error('Không thể thực thi file: ' + (error.response?.data || error.message));
        } finally {
            setExecutingBat(false);
        }
    };

    const handleSaveFile = async () => {
        try {
            const response = await axios.post('/api/filesystem/savefile',
                {
                    path: filePath,
                    content: editableContent
                },
                {
                    headers: {
                        'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                    }
                }
            );

            if (response.data.success) {
                message.success('Đã lưu file thành công');
                setContent(editableContent);
                setIsEditing(false);
            }
        } catch (error) {
            console.error('Lỗi lưu file:', error);
            message.error('Không thể lưu file: ' + (error.response?.data || error.message));
        }
    };

    const handleDownload = async () => {
        try {
            const response = await axios.get('/api/filesystem/readfile', {
                params: { path: filePath },
                responseType: 'blob',
                headers: {
                    'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                }
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filePath.split('\\').pop());
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Lỗi tải file:', error);
            message.error('Không thể tải file');
        }
    };

    const handleCreatePassword = async (values) => {
        try {
            const response = await axios.post('/api/filesystem/save-password', {
                path: filePath,
                password: values.password
            }, {
                headers: {
                    'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                }
            });

            if (response.data.success) {
                message.success('Đã tạo mật khẩu thành công');
                setIsPasswordModalVisible(false);
            }
        } catch (error) {
            message.error('Không thể tạo mật khẩu');
        }
    };

    const renderExecuteButton = () => {
        const ext = getFileExtension(filePath);
        if (ext.toLowerCase() === 'bat') {
            return (
                <Button
                    type={isRunning ? "danger" : "primary"}
                    icon={isRunning ? <StopOutlined /> : <PlayCircleOutlined />}
                    onClick={handleExecuteBat}
                    loading={executingBat}
                    style={{ marginRight: 16 }}
                >
                    {isRunning ? 'Dừng file' : 'Chạy file'}
                </Button>
            );
        }
        return null;
    };

    const renderControls = () => {
        const items = [
            {
                key: 'download',
                label: 'Tải xuống',
                icon: <DownloadOutlined />,
                onClick: handleDownload
            }
        ];

        return (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div>
                    {renderExecuteButton()}
                    <Input
                        placeholder="Nhập từ khóa tìm kiếm"
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        style={{ width: 300 }}
                        onPressEnter={handleSearch}
                        suffix={
                            <SearchOutlined
                                style={{ cursor: 'pointer' }}
                                onClick={handleSearch}
                            />
                        }
                    />
                </div>
                <Space>
                    {!isImageFile(filePath) && (
                        <Button
                            type={isEditing ? "primary" : "default"}
                            onClick={() => {
                                if (isEditing) {
                                    handleSaveFile();
                                } else {
                                    setEditableContent(content);
                                    setIsEditing(true);
                                }
                            }}
                        >
                            {isEditing ? 'Lưu' : 'Chỉnh sửa'}
                        </Button>
                    )}
                    {isEditing && (
                        <Button
                            onClick={() => {
                                setIsEditing(false);
                                setEditableContent('');
                            }}
                        >
                            Hủy
                        </Button>
                    )}
                    <Button
                        icon={<LockOutlined />}
                        onClick={() => setIsPasswordModalVisible(true)}
                    >
                        Đặt mật khẩu
                    </Button>
                    <Dropdown menu={{ items }} placement="bottomRight">
                        <Button icon={<MoreOutlined />} />
                    </Dropdown>
                </Space>
            </div>
        );
    };

    const renderContent = () => {
        if (loading) {
            return (
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Loading2 />
                    <Progress
                        status="active"
                        percent={progress}
                        strokeColor={{
                            from: '#108ee9',
                            to: '#87d068',
                        }}
                        style={{ maxWidth: '160px' }}
                    />
                    <div style={{ marginTop: '10px', textAlign: 'center' }}>
                        Đang tải dữ liệu...
                    </div>
                </div>
            );
        }

        if (!filePath) {
            return <div>Không tìm thấy file</div>;
        }

        if (!content) return null;

        if (isImageFile(filePath)) {
            return (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Image
                        src={content}
                        alt={filePath.split('\\').pop()}
                        style={{ maxWidth: '100%' }}
                        preview={{
                            mask: 'Nhấn để xem ảnh lớn',
                            maskClassName: 'custom-mask'
                        }}
                    />
                </div>
            );
        }

        if (isEditing) {
            return (
                <TextArea
                    value={editableContent}
                    onChange={(e) => setEditableContent(e.target.value)}
                    autoSize={{ minRows: 20 }}
                    style={{
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        backgroundColor: '#1e1e1e',
                        color: '#fff'
                    }}
                />
            );
        }

        return (
            <SyntaxHighlighter
                language={getLanguage(fileType)}
                style={oneDark}
                className="file-content"
                showLineNumbers
            >
                {content}
            </SyntaxHighlighter>
        );
    };

    const renderBreadcrumb = () => {
        const paths = filePath.split('\\').filter(p => p);
        return (
            <Breadcrumb style={{ marginBottom: '16px' }}>
                <Breadcrumb.Item
                    onClick={() => navigate('/auth/dashboard/webadmin')}
                    style={{ cursor: 'pointer' }}
                >
                    Ổ đĩa
                </Breadcrumb.Item>
                {paths.map((path, index) => {
                    const fullPath = paths.slice(0, index + 1).join('\\') + '\\';
                    const encodedPath = encodeURIComponent(fullPath);
                    return (
                        <Breadcrumb.Item
                            key={index}
                            onClick={() => {
                                if (index < paths.length - 1) {
                                    navigate(`/auth/dashboard/webadmin/folder/${encodedPath}`, {
                                        state: { path: fullPath }
                                    });
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
        );
    };

    if (isLoading) {
        return <Loading2 />;
    }

    if (!isAuthorized) {
        return null; // Component sẽ được unmount vì đã navigate trong hook
    }

    return (
        <div>
            {renderBreadcrumb()}
            {renderControls()}
            <Card>
                {renderContent()}
            </Card>

            <PasswordModal
                visible={isPasswordModalVisible}
                onCancel={() => setIsPasswordModalVisible(false)}
                onSubmit={handleCreatePassword}
                type="file"
                name={filePath?.split('\\').pop()}
            />
        </div>
    );
};

export default ReadFile;
