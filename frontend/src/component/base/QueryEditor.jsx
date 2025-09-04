import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Input, Button, message, Modal, Form, Drawer, Layout, Menu } from 'antd';
import axios from 'axios';
import { GoDatabase } from "react-icons/go";
import { GrServerCluster } from "react-icons/gr";
import { CiViewList } from "react-icons/ci";
import { FaConnectdevelop } from "react-icons/fa";
import { LuLayoutList } from "react-icons/lu";
import { FolderOutlined, UnorderedListOutlined, PlusOutlined, FileOutlined, EditOutlined, DeleteOutlined, HomeOutlined } from '@ant-design/icons';
import LoadingState from '../../components/base/LoadingState';
import { Helmet } from 'react-helmet-async';
import ErrorState from '../../components/base/ErrorState';
const BREAKPOINTS = {
    xs: 480,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
};

const { Sider } = Layout;

const QueryEditor = ({ keysUser, username }) => {
    const { connectionId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [activeKey, setActiveKey] = useState('1');
    const [isExecuting, setIsExecuting] = useState(false);
    const [connectionInfo, setConnectionInfo] = useState(null);
    const [editingTabName, setEditingTabName] = useState(null);
    const [tempTabName, setTempTabName] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth <= BREAKPOINTS.md);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [cursorPosition, setCursorPosition] = useState({ top: 0, left: 0 });
    const [selectedTag, setSelectedTag] = useState(null);
    const [tagResults, setTagResults] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [tagSuggestions, setTagSuggestions] = useState([]);
    const [showTagSuggestions, setShowTagSuggestions] = useState(false);
    const [suggestionsPosition, setSuggestionsPosition] = useState({ top: 0, left: 0 });
    const [folders, setFolders] = useState([]);
    const [expandedFolders, setExpandedFolders] = useState([]);
    const [isFolderModalVisible, setIsFolderModalVisible] = useState(false);
    const [selectedFolderId, setSelectedFolderId] = useState(null);
    const [editingFolderId, setEditingFolderId] = useState(null);
    const [editingFolderName, setEditingFolderName] = useState('');
    const [currentFolderQueries, setCurrentFolderQueries] = useState([]);
    const [queryHistory, setQueryHistory] = useState({});
    const [currentHistoryIndex, setCurrentHistoryIndex] = useState({});
    const [loading, setLoading] = useState(true);
    const [folderForm] = Form.useForm();
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= BREAKPOINTS.md);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setProgress(30);

                const connectionResponse = await axios.get(`/api/connections/${connectionId}`, {
                    headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                });

                setProgress(70);
                setConnectionInfo(connectionResponse.data.connection);
                setProgress(100);

            } catch (error) {
                setProgress(100);
                setLoading(true);
                setConnectionInfo(null);
            } finally {
                setTimeout(() => {
                    setLoading(false);
                    setProgress(0);
                }, 500);
            }
        };

        fetchData();
    }, [connectionId, navigate]);

    useEffect(() => {
        const fetchFolders = async () => {
            try {
                const response = await axios.get(`/api/connections/folders/${connectionId}`, {
                    headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                });
                setFolders(response.data.folders);
            } catch (error) {
                message.error('Lỗi khi tải danh sách thư mục!');
                navigate('/auth/dashboard/database');
            }
        };

        if (connectionId) {
            fetchFolders();
        }
    }, [connectionId, navigate]);

    useEffect(() => {
        if (selectedFolderId) {
            const folder = folders.find(f => f.id === selectedFolderId);
            if (folder) {
                setCurrentFolderQueries(folder.queries || []);
                if (folder.queries && folder.queries.length > 0) {
                    setActiveKey(folder.queries[0].id);
                }
            }
        }
    }, [selectedFolderId, folders]);

    const handleExecuteQuery = async (queryContent) => {
        const currentQuery = currentFolderQueries.find(q => q.id === activeKey);
        const originalContent = currentQuery?.originalContent || queryContent;

        if (!originalContent.trim()) {
            message.warning('Vui lòng nhập câu query!');
            return;
        }

        setIsExecuting(true);
        let processedQuery = originalContent;

        try {
            if (startDate && endDate) {
                const formattedStartDate = startDate.format('YYYYMMDD');
                const formattedEndDate = endDate.format('YYYYMMDD');

                processedQuery = processedQuery
                    .replace(/@từ ngày/g, formattedStartDate)
                    .replace(/@đến ngày/g, formattedEndDate);
            } else {
                processedQuery = processedQuery
                    .replace(/@từ ngày/g, '19000101')
                    .replace(/@đến ngày/g, '99991231');
            }

            const matches = processedQuery.match(/@[0-9\p{L}\s]+(?!ngày)/gu);
            if (matches) {
                const tagQueries = await Promise.all(matches.map(async (match) => {
                    const queryName = match.substring(1).trim();
                    const referencedQuery = currentFolderQueries.find(q =>
                        removeDiacritics(q.queryName.toLowerCase()) === removeDiacritics(queryName.toLowerCase())
                    );

                    if (referencedQuery) {
                        try {
                            const response = await axios.post('/api/connections/execute-query',
                                {
                                    connectionId: connectionId,
                                    query: referencedQuery.queryContent
                                },
                                {
                                    headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                                }
                            );

                            if (response.data.data && response.data.data.length > 0) {
                                const values = response.data.data.map(row => {
                                    const value = Object.values(row)[0];
                                    const cleanValue = value.toString().replace(/'/g, '');
                                    return typeof value === 'string' ? `N'${cleanValue}'` : value;
                                });

                                return {
                                    match,
                                    values: values.join(',')
                                };
                            }
                        } catch (error) {
                            console.error(`Lỗi khi thực thi tag query ${queryName}:`, error);
                            return null;
                        }
                    }
                    return null;
                }));

                const validResults = tagQueries.filter(Boolean);
                validResults.forEach(result => {
                    const inClausePattern = new RegExp(`IN\\s*\\(['"]?${result.match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]?\\)`, 'i');
                    processedQuery = processedQuery.replace(
                        inClausePattern,
                        `IN (${result.values})`
                    );
                });
            }

            const response = await axios.post('/api/connections/execute-query',
                {
                    connectionId: connectionId,
                    query: processedQuery
                },
                {
                    headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                }
            );

            const result = response.data;

            const updatedQueries = currentFolderQueries.map(q => {
                if (q.id === activeKey) {
                    return {
                        ...q,
                        lastResult: {
                            data: result.data || [],
                            rowsAffected: result.total || 0
                        }
                    };
                }
                return q;
            });
            setCurrentFolderQueries(updatedQueries);

            if (result.data && result.data.length > 0) {
                message.success(`Chạy thành công! Tổng số dữ liệu trả về: ${result.total}`);
            } else {
                message.success('Chạy thành công! Không có dữ liệu trả về');
            }

        } catch (error) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra khi thực thi query');
        } finally {
            setIsExecuting(false);
        }
    };

    const handleUpdateQuery = async (queryId, queryContent) => {
        if (!queryContent.trim()) {
            message.warning('Vui lòng nhập câu query!');
            return;
        }

        const currentQuery = currentFolderQueries.find(q => q.id === queryId);
        if (!currentQuery) return;

        try {
            if (queryId.startsWith('tab-')) {
                const response = await axios.post('/api/connections/queries/add',
                    {
                        queryName: currentQuery.queryName,
                        queryContent: queryContent,
                        folderId: selectedFolderId
                    },
                    {
                        headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                    }
                );

                const updatedQueries = currentFolderQueries.map(q =>
                    q.id === queryId ? { ...response.data.query, queryContent: queryContent } : q
                );
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

                message.success('Tạo query mới thành công!');
            } else {
                await axios.put(`/api/connections/queries/${queryId}`,
                    {
                        queryName: currentQuery.queryName,
                        queryContent: queryContent,
                        folderId: selectedFolderId
                    },
                    {
                        headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                    }
                );

                const updatedQueries = currentFolderQueries.map(q =>
                    q.id === queryId ? { ...q, queryContent } : q
                );
                setCurrentFolderQueries(updatedQueries);

                message.success('Lưu query thành công!');
            }
        } catch (error) {
            message.error('Lỗi khi lưu query: ' + error.message);
        }
    };

    const handleDeleteQuery = async (queryId) => {
        try {
            if (!queryId.startsWith('tab-')) {
                await axios.delete(`/api/connections/queries/${queryId}`, {
                    headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                });
            }

            const remainingQueries = currentFolderQueries.filter(q => q.id !== queryId);
            setCurrentFolderQueries(remainingQueries);

            const updatedFolders = folders.map(folder => {
                if (folder.id === selectedFolderId) {
                    return {
                        ...folder,
                        queries: remainingQueries
                    };
                }
                return folder;
            });
            setFolders(updatedFolders);

            navigate(-1);
            message.success('Xóa query thành công!');
        } catch (error) {
            message.error('Lỗi khi xa query!');
        }
    };

    const handleAddTab = async () => {
        try {
            const tabIndex = currentFolderQueries.filter(q => q.queryName.startsWith('Query Tab')).length + 1;
            const queryName = `Query Tab ${tabIndex}`;

            const response = await axios.post('/api/connections/queries/add',
                {
                    connectionId,
                    queryName: queryName,
                    queryContent: '',
                    folderId: selectedFolderId
                },
                {
                    headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                }
            );

            const newQuery = response.data.query;

            const updatedQueries = [...currentFolderQueries, newQuery];
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

            setActiveKey(newQuery.id);
            setEditingTabName(newQuery.id);
            setTempTabName(queryName);

            return newQuery;

        } catch (error) {
            message.error('Lỗi khi tạo query mới: ' + error.message);
            return null;
        }
    };

    const handleTabNameChange = async (queryId) => {
        const trimmedName = tempTabName.trim();
        if (!trimmedName) {
            message.warning('Tên query không được để trống!');
            return;
        }

        const restrictedNames = ['từ ngày', 'đến ngày'];
        if (restrictedNames.includes(trimmedName.toLowerCase())) {
            message.warning('Không thể đặt tên query là "từ ngày" hoặc "đến ngày"!');
            return;
        }

        const isDuplicate = currentFolderQueries.some(q =>
            q.id !== queryId && q.queryName.toLowerCase() === trimmedName.toLowerCase()
        );

        if (isDuplicate) {
            message.warning('Tên query đã tồn tại!');
            return;
        }

        try {
            const currentQuery = currentFolderQueries.find(q => q.id === queryId);
            const currentContent = currentQuery?.queryContent || '';

            if (!queryId.startsWith('tab-')) {
                await axios.put(`/api/connections/queries/rename/${queryId}`,
                    {
                        queryName: trimmedName,
                        folderId: selectedFolderId
                    },
                    {
                        headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                    }
                );

                const updatedQueries = currentFolderQueries.map(q =>
                    q.id === queryId ? { ...q, queryName: trimmedName, queryContent: currentContent } : q
                );
                setCurrentFolderQueries(updatedQueries);

                const updatedFolders = folders.map(folder => {
                    if (folder.id === selectedFolderId) {
                        return {
                            ...folder,
                            queries: folder.queries.map(q =>
                                q.id === queryId ? { ...q, queryName: trimmedName, queryContent: currentContent } : q
                            )
                        };
                    }
                    return folder;
                });
                setFolders(updatedFolders);

                message.success('Đổi tên query thành công!');
            } else {
                const updatedQueries = currentFolderQueries.map(q =>
                    q.id === queryId ? { ...q, queryName: trimmedName, queryContent: currentContent } : q
                );
                setCurrentFolderQueries(updatedQueries);
            }

            setEditingTabName(null);
        } catch (error) {
            message.error('Lỗi khi đổi tên query!');
            console.error(error);
        }
    };

    const ConnectionInfo = React.memo(({ style = {} }) => (
        <div style={style}>
            <h3 className='nnn' style={!sidebarCollapsed ? { display: 'flex', alignItems: 'center', gap: '8px', marginTop: 20, color: '#ae8f3d' } : {}}>
                {!sidebarCollapsed && <FaConnectdevelop style={{ color: '#ae8f3d' }} />}
                {!sidebarCollapsed && "Thông tin kết nối"}
            </h3>
            {!sidebarCollapsed && (
                <div className='mmm'>
                    <p style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <GoDatabase /> Database: {connectionInfo.database}
                    </p>
                    <p style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <GrServerCluster />Server: {connectionInfo.ipAddress}{connectionInfo.port ? `:${connectionInfo.port}` : ''}
                    </p>
                </div>
            )}
        </div>
    ));

    const handleFolderClick = (folderId) => {
        setSelectedFolderId(folderId);
        navigate(`folder/${folderId}`);
        toggleFolder(folderId);
    };

    const MenuItems = React.memo(({ folder, selectedFolderId, editingFolderId, editingFolderName, handleFolderClick, setEditingFolderId, setEditingFolderName, handleEditFolder, handleDeleteFolder, activeKey, handleQueryClick, colors }) => {
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    color: selectedFolderId === folder.id ? '#8f732b' : 'inherit'
                }}
                onClick={() => handleFolderClick(folder.id)}
            >
                {editingFolderId === folder.id ? (
                    <Input
                        size="small"
                        value={editingFolderName}
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        onPressEnter={() => handleEditFolder(folder.id)}
                        onBlur={() => handleEditFolder(folder.id)}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                        style={{ width: 150 }}
                    />
                ) : (
                    <span className='folder-name'>{folder.folderName}</span>
                )}
                <div onClick={e => e.stopPropagation()}>
                    <Button
                        type="text"
                        icon={<EditOutlined style={{ color: colors.textColor }} />}
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            setEditingFolderId(folder.id);
                            setEditingFolderName(folder.folderName);
                        }}
                    />
                    <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        size="small"
                        danger
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder.id);
                        }}
                    />
                </div>
            </div>
        );
    });

    const SavedQueries = React.memo(({
        folders,
        selectedFolderId,
        editingFolderId,
        editingFolderName,
        activeKey,
        expandedFolders,
        sidebarCollapsed,
        colors,
        navigate,
        setIsFolderModalVisible,
        handleFolderClick,
        setEditingFolderId,
        setEditingFolderName,
        handleEditFolder,
        handleDeleteFolder,
        handleQueryClick,
        toggleFolder
    }) => {
        const getMenuItems = useCallback((folders) => {
            const defaultItems = [
                {
                    key: 'home',
                    icon: <HomeOutlined />,
                    label: 'Home',
                    onClick: () => navigate('/auth/dashboard/home')
                },
                {
                    key: 'connections',
                    icon: <LuLayoutList />,
                    label: 'Danh sách kết nối',
                    onClick: () => navigate('/auth/dashboard/database')
                },
                {
                    key: 'create-folder',
                    icon: <PlusOutlined style={{ color: '#ae8f3d' }} />,
                    label: 'Tạo thư mục',
                    onClick: () => setIsFolderModalVisible(true)
                }
            ];

            const folderItems = folders.map(folder => ({
                key: `folder-${folder.id}`,
                icon: <FolderOutlined style={{
                    color: selectedFolderId === folder.id ? '#8f732b' : '#ae8f3d'
                }} />,
                label: (
                    <MenuItems
                        folder={folder}
                        selectedFolderId={selectedFolderId}
                        editingFolderId={editingFolderId}
                        editingFolderName={editingFolderName}
                        handleFolderClick={handleFolderClick}
                        setEditingFolderId={setEditingFolderId}
                        setEditingFolderName={setEditingFolderName}
                        handleEditFolder={handleEditFolder}
                        handleDeleteFolder={handleDeleteFolder}
                        activeKey={activeKey}
                        handleQueryClick={handleQueryClick}
                        colors={colors}
                    />
                ),
                children: folder.queries?.map(query => ({
                    key: `query-${query.id}`,
                    icon: <FileOutlined />,
                    label: <span className="query-name">{query.queryName}</span>,
                    onClick: () => handleQueryClick(query),
                    style: {
                        color: query.id === activeKey ? '#ae8f3d' : 'inherit'
                    }
                }))
            }));

            return [...defaultItems, ...folderItems];
        }, [selectedFolderId, editingFolderId, editingFolderName, activeKey, colors, navigate, setIsFolderModalVisible, handleFolderClick, setEditingFolderId, setEditingFolderName, handleEditFolder, handleDeleteFolder, handleQueryClick]);

        return (
            <div>
                <div style={{
                    padding: '0 16px',
                    marginBottom: !sidebarCollapsed ? '16px' : 0,
                }} className='rpl'>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: '#ae8f3d' }}>
                        {!sidebarCollapsed && <CiViewList style={{ color: '#ae8f3d' }} />}
                        {!sidebarCollapsed && "Danh sách Query đã lưu"}
                    </h3>
                </div>
                <Menu
                    mode="inline"
                    selectedKeys={[
                        `query-${activeKey}`,
                        selectedFolderId ? `folder-${selectedFolderId}` : ''
                    ]}
                    defaultOpenKeys={expandedFolders.map(id => `folder-${id}`)}
                    onOpenChange={(keys) => toggleFolder(keys[keys.length - 1]?.replace('folder-', ''))}
                    items={getMenuItems(folders)}
                    style={{
                        background: 'transparent',
                        border: 'none'
                    }}
                />
            </div>
        );
    });

    const toggleFolder = (folderId) => {
        setExpandedFolders(prev =>
            prev.includes(folderId)
                ? prev.filter(id => id !== folderId)
                : [...prev, folderId]
        );
    };

    const handleQueryClick = (query) => {
        if (query.folderId !== selectedFolderId) {
            setSelectedFolderId(query.folderId);
            const folder = folders.find(f => f.id === query.folderId);
            if (folder) {
                setCurrentFolderQueries(folder.queries || []);
            }
        }

        navigate(`query/${query.id}`);
        setActiveKey(query.id);

        if (isMobile) {
            setDrawerVisible(false);
        }
    };

    const getThemeColors = () => ({
        background: '#ffffff',
        sidebarBg: '#ffffff',
        textColor: 'rgba(0, 0, 0, 0.85)',
        borderColor: '#e8e8e8',
        textAreaBg: '#ffffff',
        tabTextColor: 'rgba(0, 0, 0, 0.85)',
        tabActiveColor: '#ae8f3d',
        tabHoverColor: '#40a9ff',
        iconColor: '#000000',
        primaryIconColor: '#ae8f3d',
    });

    const colors = getThemeColors();

    const handleDateChange = (date, type) => {
        if (type === 'start') {
            setStartDate(date);
        } else {
            setEndDate(date);
        }
    };

    const getSuggestionList = () => {
        const defaultSuggestions = [
            { value: '@từ ngày', label: 'Từ ngày' },
            { value: '@đến ngày', label: 'Đến ngày' }
        ];

        const querySuggestions = currentFolderQueries
            .filter(q => q.id !== activeKey)
            .map(query => ({
                value: `@${query.queryName}`,
                label: query.queryName
            }));

        return [...defaultSuggestions, ...querySuggestions];
    };

    const handleQueryChange = (e, queryId) => {
        const textArea = e.target;
        const value = textArea.value;
        const cursorPos = textArea.selectionStart;
        const textBeforeCursor = value.substring(0, cursorPos);
        const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

        const currentIndex = currentHistoryIndex[queryId] || 0;
        const history = queryHistory[queryId] || [];

        const newHistory = [...history.slice(0, currentIndex + 1), value];

        setQueryHistory(prev => ({
            ...prev,
            [queryId]: newHistory
        }));

        setCurrentHistoryIndex(prev => ({
            ...prev,
            [queryId]: currentIndex + 1
        }));

        const updatedQueries = currentFolderQueries.map(q =>
            q.id === queryId ? { ...q, queryContent: value } : q
        );
        setCurrentFolderQueries(updatedQueries);

        if (lastAtSymbol !== -1 && cursorPos - lastAtSymbol <= 20) {
            const searchTerm = removeDiacritics(textBeforeCursor.substring(lastAtSymbol).toLowerCase());

            const currentQuery = updatedQueries.find(q => q.id === queryId);
            const currentQueryName = currentQuery?.queryName?.toLowerCase();

            const filtered = getSuggestionList().filter(item => {
                const itemValue = removeDiacritics(item.value.toLowerCase());
                const itemName = itemValue.startsWith('@') ? itemValue.substring(1) : itemValue;
                return itemValue.includes(searchTerm) && itemName !== currentQueryName;
            });

            if (filtered.length > 0) {
                const textBeforeAt = textBeforeCursor.substring(0, lastAtSymbol);
                const lines = textBeforeAt.split('\n');
                const lineHeight = 20;
                const currentLineNumber = lines.length;
                const lastLineLength = lines[lines.length - 1].length;

                const top = (currentLineNumber * lineHeight);
                const left = (lastLineLength * 8);

                setCursorPosition({ top, left });
                setSuggestions(filtered);
                setShowSuggestions(true);
            } else {
                setShowSuggestions(false);
            }
        } else {
            setShowSuggestions(false);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        const currentQuery = currentFolderQueries.find(q => q.id === activeKey);
        if (!currentQuery) return;

        try {
            // Lấy view của CodeMirror
            const editorElement = document.querySelector('.cm-content');
            if (!editorElement) {
                console.error('Không tìm thấy editor');
                return;
            }

            // Lấy view từ DOM element
            const view = editorElement.cmView?.view;
            if (!view) {
                console.error('Không tìm thấy CodeMirror view');
                return;
            }

            // Lấy vị trí con trỏ và text hiện tại
            const cursor = view.state.selection.main;
            const doc = view.state.doc;
            const lineText = doc.lineAt(cursor.head).text;
            const cursorPos = cursor.head - doc.lineAt(cursor.head).from;

            // Tìm vị trí @ gần nhất trước con trỏ
            const textBeforeCursor = lineText.substring(0, cursorPos);
            const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

            if (lastAtSymbol === -1) return;

            // Tính toán vị trí để thay thế
            const lineStart = doc.lineAt(cursor.head).from;
            const from = lineStart + lastAtSymbol;
            const to = cursor.head;

            // Thực hiện thay thế
            view.dispatch({
                changes: {
                    from,
                    to,
                    insert: suggestion.value
                }
            });

            // Cập nhật state
            const newContent = view.state.doc.toString();
            const updatedQueries = currentFolderQueries.map(q =>
                q.id === activeKey ? { ...q, queryContent: newContent } : q
            );
            setCurrentFolderQueries(updatedQueries);
            setShowSuggestions(false);

        } catch (error) {
            console.error('Lỗi khi xử lý suggestion:', error);
            message.error('Có lỗi xảy ra khi chèn suggestion');
        }
    };

    const handleAddTagResult = async () => {
        if (!selectedTag) return;

        try {
            const referencedQuery = currentFolderQueries.find(q =>
                q.queryName.toLowerCase() === selectedTag.substring(1).toLowerCase()
            );

            if (referencedQuery) {
                const response = await axios.post('/api/connections/execute-query',
                    {
                        connectionId: connectionId,
                        query: referencedQuery.queryContent
                    },
                    {
                        headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                    }
                );

                if (response.data.data) {
                    setTagResults(response.data.data);
                }
            }
        } catch (error) {
            message.error('Lỗi khi thực thi query tag');
        }
    };

    const handleTagInputChange = (e) => {
        const value = e.target.value;
        setTagInput(value);

        if (value.includes('@')) {
            const searchTerm = removeDiacritics(value.substring(value.lastIndexOf('@')).toLowerCase());

            const filtered = currentFolderQueries
                .filter(q => q.id !== activeKey)
                .filter(q => {
                    const queryName = removeDiacritics(`@${q.queryName}`.toLowerCase());
                    return queryName.includes(searchTerm);
                })
                .map(q => ({
                    value: `@${q.queryName}`,
                    label: q.queryName
                }));

            const inputElement = e.target;
            const rect = inputElement.getBoundingClientRect();
            setSuggestionsPosition({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX
            });

            setTagSuggestions(filtered);
            setShowTagSuggestions(filtered.length > 0);
        } else {
            setShowTagSuggestions(false);
        }
    };

    const handleTagSuggestionClick = (suggestion) => {
        setTagInput(suggestion.value);
        setSelectedTag(suggestion.value);
        setShowTagSuggestions(false);
    };

    const suggestionMenu = (
        <div style={{
            backgroundColor: colors.background,
            border: `1px solid ${colors.borderColor}`,
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            maxHeight: '200px',
            overflow: 'auto',
        }}>
            {tagSuggestions.map((suggestion, index) => (
                <div
                    key={index}
                    onClick={() => handleTagSuggestionClick(suggestion)}
                    style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: colors.textColor,
                        backgroundColor: 'transparent',
                        transition: 'background-color 0.3s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.textAreaBg;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                >
                    {suggestion.label}
                </div>
            ))}
        </div>
    );

    const handleCreateFolder = async (values) => {
        try {
            const response = await axios.post('/api/connections/folders/add',
                {
                    id: Date.now().toString(),
                    connectionId,
                    folderName: values.folderName,
                },
                {
                    headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                }
            );

            if (response.data.success === false) {
                message.warning(response.data.message);
                return;
            }

            const updatedFolders = [...folders, response.data.folder];
            setFolders(updatedFolders);
            setIsFolderModalVisible(false);
            folderForm.resetFields();
            message.success('Tạo thư mục mới thành công!');
        } catch (error) {
            if (error.response?.status === 400) {
                message.warning(error.response.data.message);
            } else {
                message.error('Lỗi khi tạo thư mục!');
            }
        }
    };

    const handleDeleteFolder = (folderId) => {
        Modal.confirm({
            title: 'Xác nhận xóa',
            content: 'Bạn có chắc chắn muốn xóa thư mục này không? Tất cả các query trong thư mục cũng sẽ bị xóa.',
            okText: 'Xóa',
            cancelText: 'Hủy',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    await axios.delete(`/api/connections/folders/${folderId}`, {
                        headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                    });

                    setFolders(folders.filter(f => f.id !== folderId));
                    if (selectedFolderId === folderId) {
                        setSelectedFolderId(null);
                    }
                    message.success('Xóa thư mục thành công');
                } catch (error) {
                    message.error('Lỗi khi xóa thư mục');
                }
            }
        });
    };

    const handleEditFolder = async (folderId) => {
        if (!editingFolderName.trim()) {
            message.warning('Tên thư mục không được để trống');
            return;
        }

        try {
            await axios.put(`/api/connections/folders/${folderId}`,
                { folderName: editingFolderName },
                { headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` } }
            );

            setFolders(folders.map(f =>
                f.id === folderId
                    ? { ...f, folderName: editingFolderName }
                    : f
            ));

            setEditingFolderId(null);
            setEditingFolderName('');
            message.success('Cập nhật tên thư mục thành công');
        } catch (error) {
            message.error('Lỗi khi cập nhật tên thư mục');
        }
    };

    useEffect(() => {
        const handleInitialNavigation = () => {
            const pathParts = location.pathname.split('/');
            const lastPart = pathParts[pathParts.length - 2];
            const id = pathParts[pathParts.length - 1];

            if (lastPart === 'folder' && id) {
                setSelectedFolderId(id);
                const folder = folders.find(f => f.id === id);
                if (folder) {
                    setCurrentFolderQueries(folder.queries || []);
                    if (!activeKey && folder.queries && folder.queries.length > 0) {
                        setActiveKey(folder.queries[0].id);
                    }
                }
            } else if (lastPart === 'query' && id) {
                const query = folders.flatMap(f => f.queries || [])
                    .find(q => q.id === id);

                if (query) {
                    setSelectedFolderId(query.folderId);
                    const folder = folders.find(f => f.id === query.folderId);
                    if (folder) {
                        setCurrentFolderQueries(folder.queries || []);
                        setActiveKey(id);
                    }
                }
            } else {
                if (folders.length > 0) {
                    navigate(`folder/${folders[0].id}`);
                }
            }
        };

        if (folders.length > 0) {
            handleInitialNavigation();
        }
    }, [folders, location.pathname, navigate, activeKey]);

    const handleUndo = (queryId) => {
        const history = queryHistory[queryId] || [];
        const currentIndex = currentHistoryIndex[queryId] || 0;

        if (currentIndex > 0) {
            const newIndex = currentIndex - 1;
            const previousContent = history[newIndex];

            setCurrentHistoryIndex(prev => ({
                ...prev,
                [queryId]: newIndex
            }));

            const updatedQueries = currentFolderQueries.map(q =>
                q.id === queryId ? { ...q, queryContent: previousContent } : q
            );
            setCurrentFolderQueries(updatedQueries);
        }
    };

    const handleRedo = (queryId) => {
        const history = queryHistory[queryId] || [];
        const currentIndex = currentHistoryIndex[queryId] || 0;

        if (currentIndex < history.length - 1) {
            const newIndex = currentIndex + 1;
            const nextContent = history[newIndex];

            setCurrentHistoryIndex(prev => ({
                ...prev,
                [queryId]: newIndex
            }));

            const updatedQueries = currentFolderQueries.map(q =>
                q.id === queryId ? { ...q, queryContent: nextContent } : q
            );
            setCurrentFolderQueries(updatedQueries);
        }
    };

    const removeDiacritics = (str) => {
        if (!str) return '';
        return str.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .trim();
    };

    if (loading) {
        return <LoadingState
            progress={progress}
            connectionInfo={connectionInfo}
            location={location}
        />;
    }

    if (!connectionInfo) {
        return <ErrorState />;
    }

    return (
        <div style={{
            backgroundColor: '#ffffff',
            color: colors.textColor,
        }}>
            <Helmet>
                <title>NISO Report - {connectionInfo.connectionName}</title>
                <meta name="description" content="Trang quản lý danh sách dữ liệu" />
            </Helmet>
            <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
                {/* Mobile Menu */}
                {isMobile && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 80, paddingRight: 20 }}>
                            <Button
                                type='primary'
                                icon={<UnorderedListOutlined />}
                                onClick={() => setDrawerVisible(true)}
                            >
                                Folder
                            </Button>
                        </div>

                        <Drawer
                            title={connectionInfo?.connectionName}
                            placement="left"
                            onClose={() => setDrawerVisible(false)}
                            open={drawerVisible}
                            width={320}
                        >
                            {!sidebarCollapsed && <ConnectionInfo />}
                            {!sidebarCollapsed && <SavedQueries
                                folders={folders}
                                selectedFolderId={selectedFolderId}
                                editingFolderId={editingFolderId}
                                editingFolderName={editingFolderName}
                                activeKey={activeKey}
                                expandedFolders={expandedFolders}
                                sidebarCollapsed={sidebarCollapsed}
                                colors={colors}
                                navigate={navigate}
                                setIsFolderModalVisible={setIsFolderModalVisible}
                                handleFolderClick={handleFolderClick}
                                setEditingFolderId={setEditingFolderId}
                                setEditingFolderName={setEditingFolderName}
                                handleEditFolder={handleEditFolder}
                                handleDeleteFolder={handleDeleteFolder}
                                handleQueryClick={handleQueryClick}
                                toggleFolder={toggleFolder}
                            />}
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
                            borderRight: `1px solid ${colors.borderColor}`,
                            overflow: 'auto',
                            height: 'calc(100vh - 64px)',
                            position: 'fixed',
                            left: 0,
                            top: 64,
                            bottom: 0,
                            backgroundColor: '#ffffff'
                        }}
                    >
                        <ConnectionInfo style={!sidebarCollapsed ? { marginBottom: '20px', padding: '0 16px' } : {}} />
                        {!sidebarCollapsed && <SavedQueries
                            folders={folders}
                            selectedFolderId={selectedFolderId}
                            editingFolderId={editingFolderId}
                            editingFolderName={editingFolderName}
                            activeKey={activeKey}
                            expandedFolders={expandedFolders}
                            sidebarCollapsed={sidebarCollapsed}
                            colors={colors}
                            navigate={navigate}
                            setIsFolderModalVisible={setIsFolderModalVisible}
                            handleFolderClick={handleFolderClick}
                            setEditingFolderId={setEditingFolderId}
                            setEditingFolderName={setEditingFolderName}
                            handleEditFolder={handleEditFolder}
                            handleDeleteFolder={handleDeleteFolder}
                            handleQueryClick={handleQueryClick}
                            toggleFolder={toggleFolder}
                        />}
                    </Sider>
                )}

                {/* Main Content */}
                <Layout style={{
                    marginLeft: !isMobile ? (sidebarCollapsed ? '80px' : '280px') : 0,
                    background: 'transparent',
                    transition: 'all 0.3s ease'
                }}>
                    <div>
                        <Outlet context={{
                            folders,
                            selectedFolderId,
                            currentFolderQueries,
                            handleQueryClick,
                            handleDeleteQuery,
                            handleAddTab,
                            activeKey,
                            editingTabName,
                            tempTabName,
                            keysUser,
                            handleTabNameChange,
                            handleQueryChange,
                            username,
                            handleExecuteQuery,
                            handleUpdateQuery,
                            setActiveKey,
                            startDate,
                            endDate,
                            handleDateChange,
                            tagInput,
                            handleTagInputChange,
                            showTagSuggestions,
                            suggestionMenu,
                            selectedTag,
                            handleAddTagResult,
                            tagResults,
                            isExecuting,
                            colors,
                            isMobile,
                            setTempTabName,
                            setEditingTabName,
                            suggestions,
                            showSuggestions,
                            cursorPosition,
                            handleSuggestionClick,
                            setShowSuggestions,
                            navigate,
                            setFolders,
                            setCurrentFolderQueries,
                            connectionId,
                            handleUndo,
                            handleRedo
                        }} />
                    </div>
                </Layout>
            </Layout>

            {showTagSuggestions && (
                <div
                    style={{
                        position: 'fixed',
                        top: suggestionsPosition.top,
                        left: suggestionsPosition.left,
                        backgroundColor: colors.background,
                        border: `1px solid ${colors.borderColor}`,
                        borderRadius: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        zIndex: 9999
                    }}
                >
                    {tagSuggestions.map((suggestion, index) => (
                        <div
                            key={index}
                            onClick={() => handleTagSuggestionClick(suggestion)}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                color: colors.textColor,
                                backgroundColor: 'transparent',
                                transition: 'background-color 0.3s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = colors.textAreaBg;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            {suggestion.label}
                        </div>
                    ))}
                </div>
            )}

            <Modal
                title="Tạo Thư Mục Mới"
                open={isFolderModalVisible}
                onCancel={() => {
                    setIsFolderModalVisible(false);
                    folderForm.resetFields();
                }}
                footer={null}
            >
                <Form
                    form={folderForm}
                    onFinish={handleCreateFolder}
                    layout="vertical"
                >
                    <Form.Item
                        name="folderName"
                        label="Tên thư mục"
                        rules={[{ required: true, message: 'Vui lòng nhp tên thư mục!' }]}
                    >
                        <Input placeholder="Nhập tên thư mục" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            Tạo thư mục
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};


export default React.memo(QueryEditor);
