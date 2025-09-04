import React, { useEffect, useState, useRef } from 'react';
import { Tabs, Input, Button, Table, DatePicker, Select, Modal, Form, message, Space, Splitter, Empty, Checkbox, Dropdown, Progress, Divider, Menu, Tooltip } from 'antd';
import { PlayCircleOutlined, SaveOutlined, UndoOutlined, RedoOutlined, SearchOutlined, DownOutlined } from '@ant-design/icons';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import { SiMicrosoftexcel } from "react-icons/si";
import { LuFileJson } from "react-icons/lu";
import Loading2 from '../Loading2';
import RunMe from '../../assets/9612855.png';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { SlOptions } from "react-icons/sl";
import { EditorView } from '@codemirror/view';

const { TabPane } = Tabs;

const useWindowSize = () => {
    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return windowSize;
};

const QueryTabs = () => {
    const { queryId } = useParams();
    const navigate = useNavigate();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [selectedTags, setSelectedTags] = useState([]);
    const [tagQueryResults, setTagQueryResults] = useState([]);
    const [isTableLoading, setIsTableLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [searchVisible, setSearchVisible] = useState(false);
    const textAreaRef = useRef(null);
    const [selectedColumns, setSelectedColumns] = useState({});
    const [progress, setProgress] = useState(0);
    const [lineHeight] = useState(20);
    const [estimatedTime, setEstimatedTime] = useState(0);
    const [startTime, setStartTime] = useState(null);
    const [sumtime, setSumtime] = useState(0);
    const batchSize = 1000;
    const [excelLoading, setExcelLoading] = useState(false);
    const [jsonLoading, setJsonLoading] = useState(false);
    const [averageExecutionTime, setAverageExecutionTime] = useState(null);
    const { width } = useWindowSize();
    const [isSaving, setIsSaving] = useState(false);

    const {
        currentFolderQueries,
        selectedFolderId,
        activeKey,
        handleTabNameChange,
        handleQueryChange,
        handleExecuteQuery: executeQueryFromContext,
        handleUpdateQuery,
        setActiveKey,
        handleDateChange,
        isExecuting,
        colors,
        isDarkMode,
        setTempTabName,
        setEditingTabName,
        suggestions,
        showSuggestions,
        cursorPosition,
        handleSuggestionClick,
        folders,
        setFolders,
        setCurrentFolderQueries,
        connectionId,
        handleDeleteQuery,
        handleUndo,
        handleRedo,
        editingTabName,
        tempTabName,
        startDate,
        endDate
    } = useOutletContext();

    useEffect(() => {
        if (queryId) {
            setActiveKey(queryId);
        }
    }, [queryId, setActiveKey]);

    const handleTagSelect = (values) => {
        setSelectedTags(values);
    };

    const formatExecutionTime = (seconds) => {
        if (seconds < 1) {
            return `${(seconds).toFixed(1)}s`;
        }

        seconds = Math.round(seconds);

        if (seconds < 60) {
            return `${seconds}s`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.round(seconds % 60);
            return `${minutes}p ${remainingSeconds}s`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const remainingSeconds = Math.round(seconds % 60);
            return `${hours}h ${minutes}p ${remainingSeconds}s`;
        }
    };

    const handleExecuteWithTags = async (queryContent) => {
        setIsTableLoading(true);
        setProgress(0);
        setStartTime(Date.now());
        const startExecuteTime = Date.now();

        let processedQuery = queryContent;

        try {
            setProgress(10);
            setEstimatedTime(averageExecutionTime || 5);

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

            setProgress(20);

            if (selectedTags.length > 0) {
                const tagValues = selectedTags.map(tag =>
                    typeof tag === 'string' ? `N'${tag.replace(/'/g, "''")}'` : tag
                );

                const tagBatches = [];
                for (let i = 0; i < tagValues.length; i += batchSize) {
                    tagBatches.push(tagValues.slice(i, i + batchSize));
                }

                const tagPattern = /IN\s*\(['"]?@[0-9\p{L}\s]+['"]?\)/giu;

                processedQuery = processedQuery.replace(tagPattern, (match) => {
                    return `IN (${tagBatches[0].join(',')})`;
                });

                if (tagBatches.length > 1) {
                    const unionQueries = tagBatches.map(batch => {
                        return processedQuery.replace(tagPattern, `IN (${batch.join(',')})`);
                    });
                    processedQuery = unionQueries.join('\nUNION ALL\n');
                }
            }

            processedQuery = `SET NOCOUNT ON;\nSET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;\n${processedQuery}`;

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 300000);

            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    const elapsedTime = (Date.now() - startTime) / 1000;

                    if (averageExecutionTime) {
                        const progressPercent = Math.min(90, (elapsedTime / averageExecutionTime) * 100);
                        const remaining = Math.max(0, Math.round(averageExecutionTime - elapsedTime));
                        setEstimatedTime(remaining);
                        return Math.round(progressPercent);
                    } else {
                        if (prev >= 90) {
                            setEstimatedTime(1);
                            return prev;
                        }
                        const newProgress = prev + 1;
                        return newProgress;
                    }
                });
            }, 500);

            await executeQueryFromContext(processedQuery);

            clearInterval(progressInterval);
            clearTimeout(timeout);

            setProgress(100);
            setEstimatedTime(0);

            const endExecuteTime = Date.now();
            const executionTime = (endExecuteTime - startExecuteTime) / 1000;

            setAverageExecutionTime(prev => {
                if (!prev) return executionTime;
                return (prev * 7 + executionTime) / 8;
            });

            setSumtime(formatExecutionTime(executionTime));
        } catch (error) {
            if (error.name === 'AbortError') {
                message.error('Query đã vượt quá thời gian thực thi cho phép (5 phút)');
            } else {
                message.error('Lỗi khi thực thi query: ' + error.message);
            }
        } finally {
            setTimeout(() => {
                setIsTableLoading(false);
                setProgress(0);
                setEstimatedTime(0);
                setStartTime(null);
            }, 1000);
        }
    };

    useEffect(() => {
        const executeTagQuery = async (tagQuery) => {
            try {
                if (!tagQuery?.trim()) {
                    return [];
                }

                const response = await axios.post('/api/connections/execute-query',
                    {
                        connectionId: connectionId,
                        query: tagQuery
                    },
                    {
                        headers: {
                            'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (!response.data?.data) {
                    console.warn('Không có dữ liệu trả về từ tag query');
                    return [];
                }

                return response.data.data;
            } catch (error) {
                console.error('Lỗi thực thi tag query:', error);
                message.error(`Lỗi khi thực thi tag query: ${error.response?.data?.message || error.message}`);
                return [];
            }
        };

        const currentQuery = currentFolderQueries.find(q => q.id === activeKey);
        if (!currentQuery?.queryContent) return;

        const tagMatches = currentQuery.queryContent.match(/@[0-9\p{L}\s]+/gu);
        if (!tagMatches) return;

        const fetchTagResults = async () => {
            try {
                const results = [];
                const processedTags = new Set();

                for (const tag of tagMatches) {
                    const tagName = tag.substring(1).trim();

                    if (tagName === 'từ ngày' || tagName === 'đến ngày') continue;
                    if (processedTags.has(tagName)) continue;

                    processedTags.add(tagName);

                    const tagQuery = currentFolderQueries.find(q =>
                        removeDiacritics(q.queryName.toLowerCase()) === removeDiacritics(tagName.toLowerCase())
                    );

                    if (tagQuery) {
                        const tagResults = await executeTagQuery(tagQuery.queryContent);
                        if (tagResults.length > 0) {
                            results.push(...tagResults);
                        }
                    }
                }
                setTagQueryResults(results);
            } catch (error) {
                console.error('Lỗi khi fetch tag results:', error);
                message.error('Lỗi khi tải dữ liệu tag');
            }
        };

        fetchTagResults();
    }, [currentFolderQueries, activeKey, connectionId]);

    useEffect(() => {
        const currentQuery = currentFolderQueries.find(q => q.id === activeKey);
        if (currentQuery?.lastResult?.data?.length > 0) {
            setSelectedColumns(prev => ({
                ...prev,
                [currentQuery.id]: Object.keys(currentQuery.lastResult.data[0])
            }));
        }
    }, [currentFolderQueries, activeKey]);

    const handleColumnChange = (queryId, columnKey) => {
        setSelectedColumns(prev => {
            const currentColumns = prev[queryId] || [];
            if (currentColumns.includes(columnKey)) {
                return {
                    ...prev,
                    [queryId]: currentColumns.filter(key => key !== columnKey)
                };
            } else {
                return {
                    ...prev,
                    [queryId]: [...currentColumns, columnKey]
                };
            }
        });
    };

    const getColumnFilterMenu = (queryId, data) => (
        <div style={{
            background: 'white',
            padding: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            borderRadius: '4px',
            maxHeight: '400px',
            overflowY: 'auto'
        }}>
            {data?.length > 0 &&
                Object.keys(data[0]).map(columnKey => (
                    <div key={columnKey} style={{ marginBottom: '8px' }}>
                        <Checkbox
                            checked={selectedColumns[queryId]?.includes(columnKey)}
                            onChange={() => handleColumnChange(queryId, columnKey)}
                        >
                            {columnKey}
                        </Checkbox>
                    </div>
                ))}
        </div>
    );

    const removeDiacritics = (str) => {
        return str.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D');
    };

    const renderTabTitle = (query) => {
        if (editingTabName === query.id) {
            return (
                <Input
                    size="small"
                    value={tempTabName}
                    onChange={(e) => setTempTabName(e.target.value)}
                    onPressEnter={() => {
                        const restrictedWords = ['từ ngày', 'đến ngày'];
                        const normalizedName = tempTabName.trim().toLowerCase();
                        if (restrictedWords.includes(normalizedName)) {
                            message.warning('Không được đặt tên query là "từ ngày" hoặc "đến ngày"!');
                            return;
                        }
                        handleTabNameChange(query.id);
                    }}
                    onBlur={() => {
                        const restrictedWords = ['từ ngày', 'đến ngày'];
                        const normalizedName = tempTabName.trim().toLowerCase();
                        if (restrictedWords.includes(normalizedName)) {
                            message.warning('Không được đặt tên query là "t ngày" hoặc "đn ngày"!');
                            return;
                        }
                        handleTabNameChange(query.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                        if (e.key === ' ') {
                            e.stopPropagation();
                        }
                    }}
                    autoFocus
                    style={{ width: 120 }}
                />
            );
        }
        return (
            <div>
                <span
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingTabName(query.id);
                        setTempTabName(query.queryName);
                    }}
                    style={{
                        maxWidth: 120,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'inline-block',
                        color: '#ae8f3d'
                    }}
                    title={query.queryName}
                >
                    {query.queryName}
                </span>
            </div>
        );
    };

    const handleAddNewTab = () => {
        setIsModalVisible(true);
    };

    const handleAddQuery = async (values) => {
        try {
            const trimmedName = values.queryName.trim();
            const restrictedWords = ['từ ngày', 'đến ngày'];
            const normalizedName = trimmedName.toLowerCase();
            if (restrictedWords.includes(normalizedName)) {
                message.warning('Không được đặt tên query là "từ ngày" hoặc "đến ngày"!');
                return;
            }

            const response = await axios.post('/api/connections/queries/add',
                {
                    connectionId,
                    queryName: trimmedName,
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

            setActiveKey(response.data.query.id);
            setIsModalVisible(false);
            form.resetFields();
            message.success('Tạo query mới thành công!');

            navigate(`../query/${response.data.query.id}`);
        } catch (error) {
            message.error('Lỗi khi tạo query mới!');
            return null;
        }
    };


    const handleExportExcel = async (data, queryName) => {
        setExcelLoading(true);
        setProgress(0);
        try {
            const currentQuery = currentFolderQueries.find(q => q.id === activeKey);
            const worker = new Worker('/exportWorker.js');
            message.loading({ content: 'Đang xuất file Excel...', key: 'exportExcel', duration: 0 });

            // Tạo timestamp cho tên file
            const timestamp = moment().format('DD-MM-YYYY_HH-mm-ss');
            const exportFileName = `${queryName}_${timestamp}.xlsx`;

            worker.onmessage = function (e) {
                if (e.data.type === 'progress') {
                    setProgress(e.data.progress);
                } else if (e.data.success) {
                    const { data: fileData } = e.data;

                    const blob = new Blob([fileData], {
                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    });

                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = exportFileName; // Sử dụng tên file với timestamp
                    a.click();
                    window.URL.revokeObjectURL(url);
                    worker.terminate();
                    message.success({ content: 'Xuất file Excel thành công!', key: 'exportExcel' });
                } else {
                    message.error({ content: 'Lỗi khi xuất file Excel', key: 'exportExcel' });
                }
            };

            worker.postMessage({
                data: data.map(row => {
                    const newRow = {};
                    selectedColumns[currentQuery.id]?.forEach(col => {
                        newRow[col] = row[col];
                    });
                    return newRow;
                }),
                type: 'excel',
                queryName: exportFileName,
                batchSize: 50000
            });

        } catch (error) {
            message.error({ content: 'Lỗi khi xuất file Excel', key: 'exportExcel' });
        } finally {
            setExcelLoading(false);
            setProgress(0);
        }
    };

    const handleExportJSON = async (data, queryName) => {
        setJsonLoading(true);
        setProgress(0);
        try {
            const currentQuery = currentFolderQueries.find(q => q.id === activeKey);
            const worker = new Worker('/exportWorker.js');
            message.loading({ content: 'Đang xuất file JSON...', key: 'exportJson', duration: 0 });

            // Tạo timestamp cho tên file
            const timestamp = moment().format('DD-MM-YYYY_HH-mm-ss');
            const exportFileName = `${queryName}_${timestamp}.json`;

            worker.onmessage = function (e) {
                if (e.data.type === 'progress') {
                    setProgress(e.data.progress);
                } else if (e.data.success) {
                    const { data: fileData } = e.data;

                    const blob = new Blob([fileData], { type: 'application/json' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = exportFileName; // Sử dụng tên file với timestamp
                    a.click();
                    window.URL.revokeObjectURL(url);
                    worker.terminate();
                    message.success({ content: 'Xuất file JSON thành công!', key: 'exportJson' });
                } else {
                    message.error({ content: 'Lỗi khi xuất file JSON', key: 'exportJson' });
                }
            };

            worker.postMessage({
                data: data.map(row => {
                    const newRow = {};
                    selectedColumns[currentQuery.id]?.forEach(col => {
                        newRow[col] = row[col];
                    });
                    return newRow;
                }),
                type: 'json',
                queryName: exportFileName, // Truyền tên file mới vào worker
                batchSize: 50000
            });

        } catch (error) {
            message.error({ content: 'Lỗi khi xuất file JSON', key: 'exportJson' });
        } finally {
            setJsonLoading(false);
            setProgress(0);
        }
    };

    const handleSearch = () => {
        if (!textAreaRef.current) return;

        const textarea = textAreaRef.current.resizableTextArea.textArea;
        const text = textarea.value;
        const searchValue = searchText.toLowerCase();

        if (searchValue && text) {
            const startPos = textarea.selectionStart;
            const remainingText = text.toLowerCase().slice(startPos);
            const nextIndex = remainingText.indexOf(searchValue);

            if (nextIndex !== -1) {
                const newPosition = startPos + nextIndex;
                textarea.focus();
                textarea.setSelectionRange(newPosition, newPosition + searchValue.length);
                const linesAbove = text.slice(0, newPosition).split('\n').length;
                textarea.scrollTop = (linesAbove - 2) * lineHeight;
            } else {
                const firstIndex = text.toLowerCase().indexOf(searchValue);
                if (firstIndex !== -1) {
                    textarea.focus();
                    textarea.setSelectionRange(firstIndex, firstIndex + searchValue.length);

                    const linesAbove = text.slice(0, firstIndex).split('\n').length;
                    textarea.scrollTop = (linesAbove - 2) * lineHeight;
                } else {
                    message.info('Không tìm thấy kết quả');
                }
            }
        }
    };

    const formatEstimatedTime = (seconds) => {
        if (seconds <= 0) return '';

        const remainingTime = Math.ceil((100 - progress) * seconds / 100);

        const hours = Math.floor(remainingTime / 3600);
        const minutes = Math.floor((remainingTime % 3600) / 60);
        const remainingSeconds = remainingTime % 60;

        if (hours > 0) {
            if (minutes > 0) {
                return `${hours} giờ ${minutes} phút`;
            }
            return `${hours} giờ`;
        } else if (minutes > 0) {
            if (remainingSeconds > 0) {
                return `${minutes} phút ${remainingSeconds} giây`;
            }
            return `${minutes} phút`;
        }
        return `${remainingSeconds} giây`;
    };

    const handleUpdateQueryWithLoading = async (queryId, queryContent) => {
        setIsSaving(true);
        try {
            await handleUpdateQuery(queryId, queryContent);
        } catch (error) {
            message.error('Lỗi khi lưu query!');
        } finally {
            setIsSaving(false);
        }
    };

    // Component ActionButtons cho màn hình lớn
    const ActionButtons = ({ query, isExecuting }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} className='action-button'>
            <Tooltip title="Tìm kiếm (Ctrl+F)" placement="left">
                <Button
                    icon={<SearchOutlined />}
                    onClick={() => setSearchVisible(!searchVisible)}
                    size='large'
                />
            </Tooltip>

            <Tooltip title="Hoàn tác (Ctrl+Z)" placement="left">
                <Button
                    icon={<UndoOutlined />}
                    onClick={() => handleUndo(query.id)}
                    size='large'
                />
            </Tooltip>

            <Tooltip title="Làm lại (Ctrl+Y)" placement="left">
                <Button
                    icon={<RedoOutlined />}
                    onClick={() => handleRedo(query.id)}
                    size='large'
                />
            </Tooltip>

            <Divider />

            <Tooltip title={isSaving ? 'Đang lưu...' : 'Lưu query'} placement="left">
                <Button
                    icon={<SaveOutlined />}
                    onClick={() => handleUpdateQueryWithLoading(query.id, query.queryContent)}
                    size='large'
                    loading={isSaving}
                />
            </Tooltip>

            <Tooltip title={isTableLoading ? 'Đang chạy...' : 'Chạy query'} placement="left">
                <Button
                    icon={<PlayCircleOutlined />}
                    onClick={() => handleExecuteWithTags(query.queryContent)}
                    type='primary'
                    size='large'
                    loading={isTableLoading}
                />
            </Tooltip>
        </div>
    );

    // Component ActionButtonsDropdown cho màn hình nhỏ
    const ActionButtonsDropdown = ({ query, isExecuting }) => {
        const menu = (
            <Menu>
                <Menu.Item
                    key="search"
                    icon={<SearchOutlined />}
                    onClick={() => setSearchVisible(prev => !prev)}
                >
                    <Tooltip title="Tìm kiếm trong query (Ctrl+F)">
                        Tìm kiếm
                    </Tooltip>
                </Menu.Item>

                <Menu.Item
                    key="undo"
                    icon={<UndoOutlined />}
                    onClick={() => handleUndo(query.id)}
                >
                    <Tooltip title="Hoàn tác thay đổi (Ctrl+Z)">
                        Hoàn tác
                    </Tooltip>
                </Menu.Item>

                <Menu.Item
                    key="redo"
                    icon={<RedoOutlined />}
                    onClick={() => handleRedo(query.id)}
                >
                    <Tooltip title="Làm lại thay đổi (Ctrl+Y)">
                        Làm lại
                    </Tooltip>
                </Menu.Item>

                <Menu.Divider />

                <Menu.Item
                    key="save"
                    icon={<SaveOutlined />}
                    onClick={() => handleUpdateQueryWithLoading(query.id, query.queryContent)}
                    disabled={isSaving}
                >
                    <Tooltip title="Lưu thay đổi query">
                        {isSaving ? 'Đang lưu...' : 'Lưu query'}
                    </Tooltip>
                </Menu.Item>

                <Menu.Item
                    key="execute"
                    icon={<PlayCircleOutlined />}
                    disabled={isExecuting}
                    onClick={() => handleExecuteWithTags(query.queryContent)}
                >
                    <Tooltip title="Thực thi query">
                        {isTableLoading ? 'Đang chạy...' : 'Chạy query'}
                    </Tooltip>
                </Menu.Item>
            </Menu>
        );

        return (
            <Tooltip title="Menu tùy chọn" placement="left">
                <Dropdown overlay={menu} trigger={['click']}>
                    <Button icon={<SlOptions />} loading={isSaving || isTableLoading} />
                </Dropdown>
            </Tooltip>
        );
    };

    return (
        <div className='layout4' style={{ marginTop: 80, display: 'flex', height: 'calc(100vh - 80px)' }}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                width: width <= 768 ? '100%' : 'calc(100% - 60px)',
                height: '100%',
            }}>
                <Space direction='horizontal' style={{ justifyContent: 'space-between', width: '100%', marginBottom: 10 }}>
                    {currentFolderQueries.find(q => q.id === activeKey)?.lastModifiedAt && (
                        <div style={{ fontSize: '11px', color: '#888', textAlign: 'left' }}>
                            Cập nhật lần cuối: {moment(currentFolderQueries.find(q => q.id === activeKey).lastModifiedAt).format('DD/MM/YYYY HH:mm:ss')}
                        </div>
                    )}
                    {width <= 768 && currentFolderQueries.find(q => q.id === activeKey) && (
                        <ActionButtonsDropdown
                            query={currentFolderQueries.find(q => q.id === activeKey)}
                            isExecuting={isExecuting}
                        />
                    )}
                </Space>
                <Tabs
                    activeKey={activeKey}
                    onChange={(key) => {
                        navigate(`../query/${key}`);
                        setActiveKey(key);
                    }}
                    type="editable-card"
                    onEdit={(targetKey, action) => {
                        if (action === 'add') {
                            handleAddNewTab();
                        } else if (action === 'remove') {
                            Modal.confirm({
                                title: 'Xác nhận xóa',
                                content: 'Bạn có chắc chắn muốn xóa query này không?',
                                okText: 'Xóa',
                                cancelText: 'Hủy',
                                okButtonProps: { danger: true },
                                onOk: async () => {
                                    await handleDeleteQuery(targetKey);
                                    if (currentFolderQueries.length <= 1) {
                                        navigate(`../folder/${selectedFolderId}`);
                                    }
                                },
                            });
                        }
                    }}
                    style={{
                        marginBottom: '0',
                    }}
                    className={`${isDarkMode ? 'dark-mode-tabs' : ''} custom-tabs`}
                >
                    {currentFolderQueries.map(query => (
                        <TabPane
                            tab={renderTabTitle(query)}
                            key={query.id}
                            closable={true}
                            style={{ color: '#ae8f3d' }}
                        >
                            <Splitter
                                layout={window.innerWidth < 768 ? 'vertical' : 'vertical'}
                                style={{ height: 'calc(100vh - 180px)' }}
                            >
                                <Splitter.Panel collapsible style={{ overflow: 'hidden' }}>
                                    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
                                        {searchVisible && (
                                            <div style={{
                                                position: 'absolute',
                                                right: 10,
                                                top: 10,
                                                zIndex: 1,
                                                display: 'flex',
                                                gap: '8px',
                                                background: colors.background,
                                                padding: '5px',
                                                borderRadius: '4px',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                            }}>
                                                <Input
                                                    size="small"
                                                    placeholder="Tìm kiếm..."
                                                    value={searchText}
                                                    onChange={(e) => setSearchText(e.target.value)}
                                                    onPressEnter={handleSearch}
                                                    style={{ width: 150 }}
                                                />
                                                <Button size="small" onClick={handleSearch}>
                                                    Tìm
                                                </Button>
                                            </div>
                                        )}
                                        <CodeMirror
                                            value={query.queryContent}
                                            height="100%"
                                            theme="light"
                                            placeholder="Nhập câu lệnh SQL Query..."
                                            extensions={[sql(), EditorView.lineWrapping]}
                                            onChange={(value, viewUpdate) => {
                                                const syntheticEvent = {
                                                    target: {
                                                        value: value,
                                                        selectionStart: viewUpdate.state.selection.main.head
                                                    }
                                                };
                                                handleQueryChange(syntheticEvent, query.id);
                                            }}
                                            style={{
                                                fontSize: '14px',
                                                border: `1px solid ${colors.borderColor}`,
                                                backgroundColor: '#ffffff',
                                                height: '100%',
                                                overflow: 'auto'
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.ctrlKey || e.metaKey) {
                                                    if (e.key === 'z') {
                                                        e.preventDefault();
                                                        handleUndo(query.id);
                                                    } else if (e.key === 'y') {
                                                        e.preventDefault();
                                                        handleRedo(query.id);
                                                    } else if (e.key === 'f') {
                                                        e.preventDefault();
                                                        setSearchVisible(true);
                                                    }
                                                }
                                            }}
                                            basicSetup={{
                                                lineNumbers: true,
                                                highlightActiveLineGutter: true,
                                                highlightSpecialChars: true,
                                                history: true,
                                                foldGutter: true,
                                                drawSelection: true,
                                                dropCursor: true,
                                                allowMultipleSelections: true,
                                                indentOnInput: true,
                                                syntaxHighlighting: true,
                                                bracketMatching: true,
                                                closeBrackets: true,
                                                autocompletion: true,
                                                rectangularSelection: true,
                                                crosshairCursor: true,
                                                highlightActiveLine: true,
                                                highlightSelectionMatches: true,
                                                closeBracketsKeymap: true,
                                                defaultKeymap: true,
                                                searchKeymap: true,
                                                historyKeymap: true,
                                                foldKeymap: true,
                                                completionKeymap: true,
                                                lintKeymap: true,
                                            }}
                                        />
                                        {showSuggestions && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    top: cursorPosition.top,
                                                    left: cursorPosition.left,
                                                    backgroundColor: '#ffffff',
                                                    border: '1px solid #e8e8e8',
                                                    borderRadius: '4px',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                                    zIndex: 1000,
                                                    minWidth: '100px',
                                                    maxHeight: '200px',
                                                    overflow: 'auto',
                                                }}
                                            >
                                                {suggestions.map((suggestion, index) => (
                                                    <div
                                                        key={index}
                                                        onClick={() => handleSuggestionClick(suggestion)}
                                                        style={{
                                                            padding: '4px 8px',
                                                            cursor: 'pointer',
                                                            fontSize: '14px',
                                                            color: colors.textColor,
                                                            backgroundColor: 'transparent',
                                                            transition: 'background-color 0.3s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#f5f5f5';
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
                                    </div>
                                </Splitter.Panel>
                                <Splitter.Panel collapsible style={{ overflow: 'hidden' }}>
                                    <div style={{
                                        padding: '8px 16px',
                                        background: '#fff',
                                        position: 'sticky',
                                        top: 0,
                                        width: '100%',
                                    }}>
                                        <Space style={{ flexWrap: 'wrap' }}>
                                            <DatePicker
                                                onChange={(date) => {
                                                    if (endDate && date && date.isAfter(endDate)) {
                                                        message.error('Ngày bắt đầu không được lớn hơn ngày kết thúc');
                                                        return;
                                                    }
                                                    handleDateChange(date, 'start');
                                                }}
                                                format="DD-MM-YYYY"
                                                placeholder="Từ ngày"
                                                value={startDate}
                                                style={{ width: '150px' }}
                                                disabledDate={(current) => {
                                                    return endDate && current && current.isAfter(endDate);
                                                }}
                                            />
                                            <DatePicker
                                                onChange={(date) => {
                                                    if (startDate && date && date.isBefore(startDate)) {
                                                        message.error('Ngày kết thúc không được nhỏ hơn ngày bt đầu');
                                                        return;
                                                    }
                                                    handleDateChange(date, 'end');
                                                }}
                                                format="DD-MM-YYYY"
                                                placeholder="Đến ngày"
                                                value={endDate}
                                                style={{ width: '150px' }}
                                                disabledDate={(current) => {
                                                    return startDate && current && current.isBefore(startDate);
                                                }}
                                            />
                                            <Select
                                                mode="multiple"
                                                style={{ minWidth: '200px' }}
                                                placeholder="Chọn nhà hàng"
                                                value={selectedTags}
                                                onChange={handleTagSelect}
                                                maxTagCount={3}
                                                maxTagPlaceholder={(omittedValues) => `${omittedValues.length} mục đã chn`}
                                            >
                                                {tagQueryResults.map((result, index) => {
                                                    const value = Object.values(result)[0];
                                                    return (
                                                        <Select.Option key={index} value={value}>
                                                            {value}
                                                        </Select.Option>
                                                    );
                                                })}
                                            </Select>
                                        </Space>
                                    </div>
                                    {isTableLoading ? (
                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                                            <Loading2 />
                                            <Progress
                                                percent={progress}
                                                status="active"
                                                strokeColor={{
                                                    '0%': '#108ee9',
                                                    '100%': '#87d068',
                                                }}
                                                style={{ marginTop: 10, maxWidth: '300px' }}
                                            />
                                            <div style={{
                                                textAlign: 'center',
                                                marginTop: 5,
                                                color: '#666',
                                                fontSize: '14px'
                                            }}>
                                                {progress === 100
                                                    ? 'Tải hoàn tất!'
                                                    : `Đang tải dữ liệu... ${estimatedTime > 0 ? `(còn khoảng ${formatEstimatedTime(estimatedTime)})` : ''}`
                                                }
                                            </div>
                                        </div>
                                    ) : (currentFolderQueries.find(q => q.id === activeKey)?.lastResult &&
                                        currentFolderQueries.find(q => q.id === activeKey)?.lastResult.data) ? (
                                        <div style={{
                                            padding: '0 15px',
                                            overflow: 'auto',
                                            width: '100%',
                                            height: '100%'
                                        }}>
                                            <Space style={{ justifyContent: 'space-between', width: '100%', flexWrap: 'wrap' }}>
                                                <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
                                                    <Dropdown
                                                        overlay={getColumnFilterMenu(
                                                            currentFolderQueries.find(q => q.id === activeKey)?.id,
                                                            currentFolderQueries.find(q => q.id === activeKey)?.lastResult.data
                                                        )}
                                                        trigger={['click']}
                                                        overlayStyle={{ maxHeight: '400px', overflowY: 'auto' }}
                                                    >
                                                        <Button>
                                                            Chọn cột <DownOutlined />
                                                        </Button>
                                                    </Dropdown>
                                                    <Tooltip title="Xuất Excel">
                                                        <Button
                                                            icon={<SiMicrosoftexcel />}
                                                            disabled={!query.lastResult?.data}
                                                            onClick={() => handleExportExcel(
                                                                query.lastResult.data.map(row => {
                                                                    const newRow = {};
                                                                    selectedColumns[query.id]?.forEach(col => {
                                                                        newRow[col] = row[col];
                                                                    });
                                                                    return newRow;
                                                                }),
                                                                query.queryName
                                                            )}
                                                            loading={excelLoading}
                                                        />
                                                    </Tooltip>
                                                    <Tooltip title="Xuất JSON">
                                                        <Button
                                                            icon={<LuFileJson />}
                                                            disabled={!query.lastResult?.data}
                                                            onClick={() => handleExportJSON(
                                                                query.lastResult.data.map(row => {
                                                                    const newRow = {};
                                                                    selectedColumns[query.id]?.forEach(col => {
                                                                        newRow[col] = row[col];
                                                                    });
                                                                    return newRow;
                                                                }),
                                                                query.queryName
                                                            )}
                                                            loading={jsonLoading}
                                                        />
                                                    </Tooltip>
                                                </Space>
                                                <i style={{ fontSize: '12px', color: '#666' }}>
                                                    Tổng thời gian {sumtime}, {currentFolderQueries.find(q => q.id === activeKey)?.lastResult?.data?.length || 0} dữ liệu
                                                </i>
                                            </Space>
                                            <div style={{ overflowX: 'auto', width: '100%' }}>
                                                <Table
                                                    dataSource={currentFolderQueries.find(q => q.id === activeKey)?.lastResult.data}
                                                    columns={selectedColumns[currentFolderQueries.find(q => q.id === activeKey)?.id]?.map(key => ({
                                                        title: key,
                                                        dataIndex: key,
                                                        key: key,
                                                        fixed: false,
                                                        ellipsis: false,
                                                    }))}
                                                    size="small"
                                                    pagination={{ pageSize: 13 }}
                                                    scroll={{ x: true }}
                                                    style={{ width: '100%', whiteSpace: 'nowrap' }}
                                                    locale={{
                                                        emptyText: (
                                                            <Empty description="Không có dữ liệu" />
                                                        )
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                                            <img src={RunMe} alt="RunMe" style={{ width: '150px', height: '150px', objectFit: 'contain' }} />
                                            <p>Nhấn Run để chạy chương trình.</p>
                                        </div>
                                    )}
                                </Splitter.Panel>
                            </Splitter>
                        </TabPane>
                    ))}
                </Tabs>
            </div>
            {width > 768 && (
                <div style={{
                    width: '60px',
                    height: '100%',
                    position: 'fixed',
                    right: 0,
                    top: 80,
                    background: '#fff',
                    zIndex: 1000,
                    borderLeft: '1px solid #f0f0f0'
                }}>
                    {currentFolderQueries.find(q => q.id === activeKey) && (
                        <ActionButtons
                            query={currentFolderQueries.find(q => q.id === activeKey)}
                            isExecuting={isExecuting}
                        />
                    )}
                </div>
            )}

            <Modal
                title="Tạo query mới"
                open={isModalVisible}
                onCancel={() => {
                    setIsModalVisible(false);
                    form.resetFields();
                }}
                footer={null}
            >
                <Form
                    form={form}
                    onFinish={handleAddQuery}
                    layout="vertical"
                >
                    <Form.Item
                        name="queryName"
                        label="Tên Query"
                        rules={[{ required: true, message: 'Vui lòng nhập tên query!' }]}
                    >
                        <Input placeholder="Nhập tên query" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            Tạo Query
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            <style jsx>{`
                .ant-table-body {
                    overflow-y: auto !important;
                    height: calc(100vh - 350px) !important;
                }
                
                .ant-table-header {
                    position: sticky;
                    top: 0;
                    z-index: 1;
                    background: #fff;
                }
                
                .ant-table-row:hover {
                    cursor: pointer;
                }
                
                .ant-table-cell {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
            `}</style>
        </div>
    );
};

export default React.memo(QueryTabs);