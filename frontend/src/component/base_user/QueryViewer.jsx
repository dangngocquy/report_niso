import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Table, Button, Space, message, Empty, DatePicker, Select, Progress, Checkbox, Dropdown, Result } from 'antd';
import { ArrowLeftOutlined, DownOutlined } from '@ant-design/icons';
import { SiMicrosoftexcel } from "react-icons/si";
import axios from '../../axios';
import moment from 'moment';
import Loading2 from '../Loading2';

const removeDiacritics = (str) => {
    if (!str) return '';
    return str.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .trim();
};

const LoadingIndicator = ({ progress }) => (
    <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: '16px',
        gap: '10px',
    }}>
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
        <span>Đang kiểm tra dữ liệu...</span>
    </div>
);

const ExecutionProgress = ({ progress, loadedDataCount, estimatedTime, formatEstimatedTime }) => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <Loading2 />
        <Progress
            percent={progress}
            status="active"
            strokeColor={{
                from: '#108ee9',
                to: '#87d068'
            }}
            style={{ marginTop: 10, maxWidth: '300px' }}
            format={(percent) => `${percent}%`}
        />
        <div style={{
            textAlign: 'center',
            marginTop: 5,
            color: '#666',
            fontSize: '14px'
        }}>
            {progress === 100 
                ? 'Tải hoàn tất!'
                : `Đang tải ${loadedDataCount > 0 ? loadedDataCount.toLocaleString('vi-VN') : '0'} dữ liệu... ${estimatedTime > 0 ? `(còn khoảng ${formatEstimatedTime(estimatedTime)})` : '(Đang tính toán...)'}`
            }
        </div>
    </div>
);

const QueryViewer = memo(({ keys }) => {
    const [queryData, setQueryData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [tagQueryResults, setTagQueryResults] = useState([]);
    const [currentFolderQueries, setCurrentFolderQueries] = useState([]);
    const [tempSelectedTags, setTempSelectedTags] = useState([]);
    const [selectedColumns, setSelectedColumns] = useState([]);
    const [queryInfo, setQueryInfo] = useState(null);
    const [progress, setProgress] = useState(30);
    const { queryId } = useParams();

    const navigate = useNavigate();
    const location = useLocation();

    const [authChecked, setAuthChecked] = useState(false);

    const [estimatedTime, setEstimatedTime] = useState(0);

    const [tagQueryCache, setTagQueryCache] = useState({});

    const [loadedDataCount, setLoadedDataCount] = useState(0);

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 13;
    const [paginatedData, setPaginatedData] = useState([]);
    const [totalItems, setTotalItems] = useState(0);

    const [executionTime, setExecutionTime] = useState('');

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

    useEffect(() => {
        const fetchFolderQueries = async () => {
            if (!queryInfo?.folderId) return;

            try {
                const response = await axios.get(`/api/connections/folders/${queryInfo.folderId}/queries`, {
                    headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                });
                setCurrentFolderQueries(response.data.queries);
            } catch (error) {
                console.error('Lỗi khi tải queries:', error);
                message.error('Không thể tải danh sách dữ liệu');
            }
        };

        fetchFolderQueries();
    }, [queryInfo?.folderId]);

    const [isLoadingTags, setIsLoadingTags] = useState(false);

    useEffect(() => {
        const executeTagQuery = async (tagQuery, tagName) => {
            const cacheKey = `${tagName}_${queryInfo.connectionId}`;
            const cachedResult = tagQueryCache[cacheKey];

            if (cachedResult && Date.now() - cachedResult.timestamp < 5 * 60 * 1000) {
                return cachedResult.data;
            }

            try {
                const response = await axios.post('/api/connections/execute-query',
                    {
                        connectionId: queryInfo.connectionId,
                        query: tagQuery,
                        isTagQuery: true
                    },
                    {
                        headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                    }
                );

                if (response.data?.data) {
                    // Lưu kết quả vào cache
                    setTagQueryCache(prev => ({
                        ...prev,
                        [cacheKey]: {
                            data: response.data.data,
                            timestamp: Date.now()
                        }
                    }));
                    return response.data.data;
                }
                return [];
            } catch (error) {
                console.error('Lỗi thực thi tag query:', error);
                message.error('Lỗi khi thực thi tag query');
                return [];
            }
        };

        const fetchTagResults = async () => {
            if (!queryInfo?.queryContent) return;

            const tagMatches = queryInfo.queryContent.match(/@[0-9\p{L}\s]+/gu);
            if (!tagMatches) return;

            setIsLoadingTags(true);

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
                        const tagResults = await executeTagQuery(tagQuery.queryContent, tagName);
                        if (tagResults.length > 0) {
                            results.push(...tagResults);
                        }
                    }
                }
                setTagQueryResults(results);
            } catch (error) {
                console.error('Lỗi khi fetch tag results:', error);
                message.error('Lỗi khi tải dữ liệu tag');
            } finally {
                setIsLoadingTags(false);
            }
        };

        fetchTagResults();
    }, [queryInfo, currentFolderQueries, tagQueryCache]);

    const handleTagSelect = (values) => {
        setTempSelectedTags(values);
    };

    const [isFirstLoad, setIsFirstLoad] = useState(true);

    const executeQuery = useCallback(async (queryContent) => {
        if (!navigator.onLine) {
            message.error('Không có kết nối internet. Vui lòng kiểm tra lại kết nối của bạn.');
            return;
        }

        try {
            const connectionResponse = await axios.get(`/api/connections/${queryInfo.connectionId}`, {
                headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
            });
            
            if (connectionResponse.data.connection.connectionStatus === 'disconnected') {
                message.error('Kết nối này đã bị ngắt. Liên hệ admin để kiểm tra lại kết nối.');
                return;
            }
        } catch (error) {
            message.error('Không thể kiểm tra trạng thái kết nối');
            return;
        }
        
        if (queryInfo?.queryContent?.includes('@từ ngày') || queryInfo?.queryContent?.includes('@đến ngày')) {
            if (!startDate || !endDate) {
                message.warning('Vui lòng chọn thời gian lọc dữ liệu.');
                return;
            }
        }

        setIsFirstLoad(false);
        setIsExecuting(true);
        setProgress(0);
        setLoadedDataCount(0);

        let fakeProgress = 0;
        let estimatedQueryTime = 5;
        const progressInterval = 100;
        const totalSteps = (estimatedQueryTime * 1000) / progressInterval;
        const progressIncrement = 30 / totalSteps;
        
        const progressTimer = setInterval(() => {
            fakeProgress += progressIncrement;
            if (fakeProgress <= 30) {
                setProgress(Math.round(fakeProgress));
                const remainingTime = Math.ceil((30 - fakeProgress) * (estimatedQueryTime / 30));
                setEstimatedTime(remainingTime);
                setLoadedDataCount(Math.floor((fakeProgress / 30) * 1000));
            }
        }, progressInterval);

        let processedQuery = queryContent;

        try {
            const startExecuteTime = Date.now();
            let lastProgressUpdate = Date.now();
            let lastLoadedBytes = 0;
            let avgBytesPerSecond = 0;
            let progressUpdateCount = 0;

            // Xử lý các tham số ngày tháng
            if (startDate && endDate) {
                const formattedStartDate = startDate.format('YYYYMMDD');
                const formattedEndDate = endDate.format('YYYYMMDD');
                processedQuery = processedQuery
                    .replace(/@từ ngày/g, formattedStartDate)
                    .replace(/@đến ngày/g, formattedEndDate);
            } else {
                // Nếu không chọn ngày, sử dụng khoảng thời gian mặc định
                processedQuery = processedQuery
                    .replace(/@từ ngày/g, '19000101')
                    .replace(/@đến ngày/g, '99991231');
            }

            // Xử lý các tag được chọn
            const matches = processedQuery.match(/@[0-9\p{L}\s]+(?!ngày)/gu);
            if (matches && tempSelectedTags.length > 0) {
                // Chỉ xử lý khi có tag được chọn
                matches.forEach(match => {
                    const tagValues = tempSelectedTags.map(tag =>
                        typeof tag === 'string' ? `N'${tag.replace(/'/g, '')}'` : tag
                    ).join(',');

                    const inClausePattern = new RegExp(`IN\\s*\\(['"]?${match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]?\\)`, 'i');
                    processedQuery = processedQuery.replace(
                        inClausePattern,
                        `IN (${tagValues})`
                    );
                });
            } else if (matches) {
                matches.forEach(match => {
                    const allValues = tagQueryResults.map(result => {
                        const value = Object.values(result)[0];
                        return typeof value === 'string' ? `N'${value.replace(/'/g, '')}'` : value;
                    }).join(',');

                    const inClausePattern = new RegExp(`IN\\s*\\(['"]?${match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]?\\)`, 'i');
                    processedQuery = processedQuery.replace(
                        inClausePattern,
                        allValues ? `IN (${allValues})` : 'IN (SELECT DISTINCT value FROM your_tag_table)'
                    );
                });
            }

            processedQuery = `SET NOCOUNT ON;\nSET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;\n${processedQuery}`;

            const response = await axios.post('/api/connections/execute-query', 
                {
                    connectionId: queryInfo.connectionId,
                    query: processedQuery
                },
                {
                    headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` },
                    onDownloadProgress: (progressEvent) => {
                        clearInterval(progressTimer);
                        
                        const currentTime = Date.now();
                        const timeDiff = (currentTime - lastProgressUpdate) / 1000;
                        const byteDiff = progressEvent.loaded - lastLoadedBytes;
                        
                        if (timeDiff > 0) {
                            // Tính toán tốc độ trung bình
                            const currentBytesPerSecond = byteDiff / timeDiff;
                            progressUpdateCount++;
                            avgBytesPerSecond = (avgBytesPerSecond * (progressUpdateCount - 1) + currentBytesPerSecond) / progressUpdateCount;
                            
                            const remainingBytes = progressEvent.total - progressEvent.loaded;
                            const estimatedSeconds = remainingBytes / avgBytesPerSecond;
                            
                            // Áp dụng trọng số để làm mượt ước tính thời gian
                            const smoothingFactor = 0.3;
                            const currentEstimatedTime = Math.ceil(estimatedSeconds);
                            setEstimatedTime(prev => {
                                if (prev === 0) return currentEstimatedTime;
                                return Math.ceil(prev * (1 - smoothingFactor) + currentEstimatedTime * smoothingFactor);
                            });
                        }

                        const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                        setProgress(progress);
                        setLoadedDataCount(progressEvent.loaded);
                        
                        lastProgressUpdate = currentTime;
                        lastLoadedBytes = progressEvent.loaded;
                    }
                }
            );

            if (response.data?.data) {
                setQueryData({
                    ...queryInfo,
                    lastResult: {
                        data: response.data.data,
                        rowsAffected: response.data.total
                    }
                });
                message.success(`Lọc thành công. ${response.data.total} dữ liệu`);
            } else {
                message.success('Lọc thành công. Không có dữ liệu trả về');
            }

            const endExecuteTime = Date.now();
            const executionTime = (endExecuteTime - startExecuteTime) / 1000;
            setExecutionTime(formatExecutionTime(executionTime));

        } catch (error) {
            console.error('Execute Error:', error);
            message.error(error.message || 'Có lỗi xảy ra khi thực thi query');
        } finally {
            setIsExecuting(false);
            setProgress(0);
            setEstimatedTime(0);
            setLoadedDataCount(0);
        }
    }, [queryInfo, startDate, endDate, tempSelectedTags, tagQueryResults]);

    const handleDateChange = (date, type) => {
        if (type === 'start') {
            if (endDate && date && date.isAfter(endDate)) {
                message.error('Ngày bắt đầu không được lớn hơn ngày kết thúc');
                return;
            }
            setStartDate(date);
        } else {
            if (startDate && date && date.isBefore(startDate)) {
                message.error('Ngày kết thúc không được nh hơn ngày bắt đầu');
                return;
            }
            setEndDate(date);
        }
    };
    

    const calculateExportTime = (totalRows) => {
        const baseTime = 2;
        const timePerRow = 0.0001; 
        const estimatedTime = Math.ceil(baseTime + (totalRows * timePerRow));
        return estimatedTime;
    };
    
    const formatCountdownTime = (seconds) => {
        if (seconds < 0) return "0s";
        
        if (seconds < 60) {
            return `${Math.ceil(seconds)}s`;
        }
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.ceil(seconds % 60);
        
        if (minutes < 60) {
            return `${minutes}p ${remainingSeconds}s`;
        }
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        return `${hours}h ${remainingMinutes}p ${remainingSeconds}s`;
    };
    
    const startExportCountdown = (totalRows, onTick) => {
        const estimatedTime = calculateExportTime(totalRows);
        let remainingTime = estimatedTime;
        
        const countdownInterval = setInterval(() => {
            remainingTime--;
            
            if (remainingTime <= 0) {
                clearInterval(countdownInterval);
                onTick(0);
                return;
            }
            
            onTick(remainingTime);
        }, 1000);
        
        return () => clearInterval(countdownInterval);
    };
    
    const handleExportExcel = async (data, queryName) => {
        setLoading(true);
        setProgress(0);
        let cleanupCountdown = null;
    
        try {
            const worker = new Worker('/exportWorker.js');
            
            const timestamp = moment().format('DD-MM-YYYY_HH-mm-ss');
            const exportFileName = `${queryName}-${timestamp}.xlsx`;
    
            if (!data || data.length === 0) {
                message.error('Không có dữ liệu để xuất');
                return;
            }
            cleanupCountdown = startExportCountdown(data.length, (remainingTime) => {
                const formattedTime = formatCountdownTime(remainingTime);
                message.loading({ 
                    content: `Đang xuất file Excel...(${formattedTime})`, 
                    key: 'exportExcel', 
                    duration: 0 
                });
            });

            worker.onmessage = function (e) {
                if (e.data.type === 'progress') {
                    setProgress(e.data.progress);
                } else if (e.data.success) {
                    if (cleanupCountdown) {
                        cleanupCountdown();
                    }
    
                    const { data: fileData } = e.data;
    
                    const blob = new Blob([fileData], {
                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    });
    
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = exportFileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
    
                    worker.terminate();
                    message.success({ 
                        content: 'Xuất file Excel thành công!', 
                        key: 'exportExcel' 
                    });
                } else {
                    if (cleanupCountdown) {
                        cleanupCountdown();
                    }
                    message.error({ 
                        content: 'Lỗi khi xuất file Excel', 
                        key: 'exportExcel' 
                    });
                    worker.terminate();
                }
            };

            worker.onerror = function (error) {
                console.error('Worker error:', error);
                if (cleanupCountdown) {
                    cleanupCountdown();
                }
                message.error({ 
                    content: 'Lỗi khi xử lý file Excel', 
                    key: 'exportExcel' 
                });
                worker.terminate();
            };

            const exportData = data.map(row => {
                const newRow = {};
                selectedColumns.forEach(col => {
                    if (row[col] === null) {
                        newRow[col] = '';
                    } else if (typeof row[col] === 'object') {
                        newRow[col] = JSON.stringify(row[col]);
                    } else {
                        newRow[col] = row[col];
                    }
                });
                return newRow;
            });
    
            worker.postMessage({
                data: exportData,
                type: 'excel',
                queryName: exportFileName,
                batchSize: 50000
            });
    
        } catch (error) {
            console.error('Export Error:', error);
            if (cleanupCountdown) {
                cleanupCountdown();
            }
            message.error({ 
                content: 'Lỗi khi xuất file Excel: ' + error.message, 
                key: 'exportExcel' 
            });
        } finally {
            setLoading(false);
            setProgress(0);
        }
    };

    useEffect(() => {
        if (queryData?.lastResult?.data?.length > 0) {
            const allColumns = Object.keys(queryData.lastResult.data[0]);
            setSelectedColumns(allColumns);
        }
    }, [queryData?.lastResult?.data]);

    const handleColumnChange = (columnKey) => {
        setSelectedColumns(prev => {
            if (prev.includes(columnKey)) {
                return prev.filter(key => key !== columnKey);
            } else {
                return [...prev, columnKey];
            }
        });
    };

    // 3. Sử dụng useMemo cho các giá trị tính toán
    const columnFilterMenu = useMemo(() => (
        <div style={{
            background: 'white',
            padding: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            borderRadius: '4px',
            maxHeight: '400px',
            overflowY: 'auto'
        }}>
            {queryData?.lastResult?.data?.length > 0 &&
                Object.keys(queryData.lastResult.data[0]).map(columnKey => (
                    <div key={columnKey} style={{ marginBottom: '8px' }}>
                        <Checkbox
                            checked={selectedColumns.includes(columnKey)}
                            onChange={() => handleColumnChange(columnKey)}
                        >
                            {columnKey}
                        </Checkbox>
                    </div>
                ))}
        </div>
    ), [queryData?.lastResult?.data, selectedColumns]);

    const tableColumns = useMemo(() =>
        selectedColumns.map(key => ({
            title: key,
            dataIndex: key,
            key: key,
            ellipsis: true,
            render: (text) => {
                if (text === null) return 'NULL';
                if (typeof text === 'object') return JSON.stringify(text);
                return text;
            }
        }))
        , [selectedColumns]);

    useEffect(() => {
        const fetchQueryInfo = async () => {
            if (!queryId) return;

            try {
                setLoading(true);
                const connectionsResponse = await axios.get('/api/connections', {
                    headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                });

                let hasAccess = false;
                let folderHasAccess = false;

                for (const conn of connectionsResponse.data.connections) {
                    const foldersResponse = await axios.get(`/api/connections/folders/${conn.id}`, {
                        headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                    });

                    for (const folder of foldersResponse.data.folders) {
                        const queriesResponse = await axios.get(`/api/connections/folders/${folder.id}/queries`, {
                            headers: { 'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}` }
                        });

                        const query = queriesResponse.data.queries.find(q => q.id === queryId);
                        if (query) {
                            // Kiểm tra quyền truy cập folder
                            if (folder.keysUserTime && folder.keysUserTime[keys]) {
                                hasAccess = true;
                                folderHasAccess = true;
                            }
                            // Nếu không có quyền folder, kiểm tra quyền query
                            else if (query.keysUserTime && query.keysUserTime[keys]) {
                                hasAccess = true;
                            }

                            if (hasAccess) {
                                setQueryInfo({
                                    ...query,
                                    connectionId: conn.id,
                                    folderId: folder.id,
                                    folderAccess: folderHasAccess
                                });
                                setAuthChecked(true);
                                return;
                            }
                        }
                    }
                }

                setAuthChecked(true);
                setLoading(false);

            } catch (error) {
                console.error('Lỗi khi tải thông tin query:', error);
                message.error('Lỗi khi tải thông tin query');
                navigate('/auth/dashboard/querydata/folder');
            } finally {
                setLoading(false);
                setAuthChecked(true);
            }
        };

        if (!location.state?.query) {
            fetchQueryInfo();
        } else {
            const query = location.state.query;
            const folderAccess = location.state.folderAccess;

            // Sửa lại logic kiểm tra quyền truy cập
            const hasAccess = (folderAccess && folderAccess[keys]) || (query.keysUserTime && query.keysUserTime[keys]);

            if (!hasAccess) {
                setQueryInfo(null);
            } else {
                setQueryInfo({
                    ...query,
                    folderAccess: folderAccess && folderAccess[keys]
                });
            }
            setAuthChecked(true);
        }
    }, [queryId, keys, navigate, location.state, location.key]);

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

    const formatEstimatedTime = (seconds) => {
        if (seconds <= 0) return '';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;

        const parts = [];
        if (hours > 0) parts.push(`${hours} giờ`);
        if (minutes > 0) parts.push(`${minutes} phút`);
        if (remainingSeconds > 0) parts.push(`${remainingSeconds} giây`);

        return parts.join(' ');
    };

    const handlePagination = useCallback((data, page) => {
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return data.slice(startIndex, endIndex);
    }, [pageSize]);

    // 4. Tối ưu các useEffect
    useEffect(() => {
        if (!queryData?.lastResult?.data) return;

        setTotalItems(queryData.lastResult.data.length);
        const newPaginatedData = handlePagination(queryData.lastResult.data, currentPage);
        setPaginatedData(newPaginatedData);
    }, [queryData?.lastResult?.data, currentPage, handlePagination]);

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Thêm event listeners để theo dõi trạng thái kết nối
    useEffect(() => {
        const handleOnline = () => {
            message.success('Đã kết nối lại internet');
        };

        const handleOffline = () => {
            message.error('Mất kết nối internet');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // 5. Tối ưu render conditions
    if (loading || !authChecked || isLoadingTags) {
        return <LoadingIndicator progress={progress} />;
    }

    if (authChecked && (!queryInfo || (!queryInfo.folderAccess && !queryInfo.keysUserTime?.[keys]))) {
        return (
            <Result
                status="warning"
                title="403"
                subTitle="Xin lỗi, bạn không có quyền truy cập vào dữ liệu này."
                extra={
                    <Button type="primary" onClick={() => navigate('/auth/dashboard/querydata/folder')}>
                        Quay lại danh sách
                    </Button>
                }
            />
        );
    }

    return (
        <div style={{ padding: '20px' }}>
            <Button
                icon={<ArrowLeftOutlined />}
                style={{ marginBottom: 16 }}
                onClick={() => navigate(`../folder/files/${queryInfo?.folderId}`)}
                className='niso-back-none'
            >
                Quay lại danh sách
            </Button>

            <h1 style={{ color: '#ae8f3d' }} className='poi'>{queryInfo?.queryName}</h1>

            <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {queryInfo?.queryContent?.includes('@từ ngày') || queryInfo?.queryContent?.includes('@đến ngày') ? (
                    <>
                        <DatePicker
                            onChange={(date) => handleDateChange(date, 'start')}
                            format="DD-MM-YYYY"
                            placeholder="Từ ngày"
                            value={startDate}
                            style={{ width: '150px' }}
                            disabledDate={(current) => endDate && current && current.isAfter(endDate)}
                        />
                        <DatePicker
                            onChange={(date) => handleDateChange(date, 'end')}
                            format="DD-MM-YYYY"
                            placeholder="Đến ngày"
                            value={endDate}
                            style={{ width: '150px' }}
                            disabledDate={(current) => startDate && current && current.isBefore(startDate)}
                        />
                    </>
                ) : null}

                {tagQueryResults.length > 0 && (
                    <Select
                        mode="multiple"
                        style={{ minWidth: '200px' }}
                        placeholder="Chọn nhà hàng"
                        value={tempSelectedTags}
                        onChange={handleTagSelect}
                        maxTagCount={3}
                        maxTagPlaceholder={(omittedValues) => `${omittedValues.length} mục đã chọn`}
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
                )}

                {!isFirstLoad && (
                    <Button 
                        type="primary"
                        onClick={() => executeQuery(queryInfo.queryContent)}
                        loading={isExecuting}
                    >
                        Lọc
                    </Button>
                )}
            </div>

            {isExecuting ? (
                <ExecutionProgress
                    progress={progress}
                    loadedDataCount={loadedDataCount}
                    estimatedTime={estimatedTime}
                    formatEstimatedTime={formatEstimatedTime}
                />
            ) : queryData?.lastResult?.data ? (
                <div>
                    <div style={{ marginBottom: 16 }}>
                        <Space style={{ justifyContent: 'space-between', width: '100%', flexWrap: 'wrap' }}>
                            <Space style={{ flexWrap: 'wrap' }}>
                                <Dropdown
                                    overlay={columnFilterMenu}
                                    trigger={['click']}
                                    overlayStyle={{ maxHeight: '400px', overflowY: 'auto' }}
                                >
                                    <Button>
                                        Chọn cột <DownOutlined />
                                    </Button>
                                </Dropdown>
                                <Button
                                    icon={<SiMicrosoftexcel />}
                                    onClick={() => handleExportExcel(queryData.lastResult.data, queryData.queryName)}
                                    loading={loading}
                                >
                                    Export Excel
                                </Button>
                                {loading && (
                                    <Progress
                                        percent={progress}
                                        status="active"
                                        strokeColor={{
                                            '0%': '#108ee9',
                                            '100%': '#87d068',
                                        }}
                                        style={{ marginTop: 10, maxWidth: '300px' }}
                                    />
                                )}
                            </Space>
                            <i style={{ fontSize: '12px', color: '#666' }}>
                                {executionTime && queryData?.lastResult?.data &&
                                    `Tổng thời gian ${executionTime}, ${queryData.lastResult.data.length.toLocaleString('vi-VN')} dữ liệu`
                                }
                            </i>
                        </Space>
                    </div>

                    <Table
                        dataSource={paginatedData}
                        columns={tableColumns}
                        size="small"
                        style={{ width: '100%' }}
                        scroll={{ x: 'max-content' }}
                        pagination={{
                            current: currentPage,
                            pageSize: pageSize,
                            total: totalItems,
                            onChange: handlePageChange,
                            showSizeChanger: false,
                            showQuickJumper: true,
                            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total.toLocaleString('vi-VN')} mục`,
                            locale: {
                                items_per_page: '/ trang',
                                jump_to: 'Đến trang',
                                jump_to_confirm: 'Đi',
                                page: 'Trang',
                                prev_page: 'Trang trước',
                                next_page: 'Trang sau',
                                prev_5: '5 trang trước',
                                next_5: '5 trang sau'
                            }
                        }}
                        locale={{
                            emptyText: <Empty description="Không có dữ liệu" />
                        }}
                    />
                </div>
            ) : (
                <Empty 
                    description={
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <span>Nhấn vào đây để lấy dữ liệu.</span>
                            <Button 
                                type="primary"
                                onClick={() => executeQuery(queryInfo.queryContent)}
                                loading={isExecuting}
                            >
                                Lọc
                            </Button>
                        </div>
                    }
                    style={{
                        margin: '40px 0'
                    }}
                />
            )}
        </div>
    );
});

export default QueryViewer;

