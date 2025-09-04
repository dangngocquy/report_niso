import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from 'axios';
import { SearchOutlined } from '@ant-design/icons';
import { Card, Input, Button, Modal, Tag, Alert, Row, Col, Spin, Empty } from 'antd';
import { Link, useNavigate } from "react-router-dom";
import ContentModal from './ContentModal';
import AddContent from './AddContent';
import { BsClipboardData } from "react-icons/bs";
import { Helmet } from 'react-helmet-async';

const { Search } = Input;

function Body({ phanquyen, name, keys }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResultsCount, setSearchResultsCount] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [containsEmptyCategory, setContainsEmptyCategory] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showModalid, setShowModalid] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`/content/all`, {
                headers: {
                    'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                }
            });

            const filteredData = phanquyen ? response.data.data :
                response.data.data.filter(item => !item.account?.length || item.account.includes(keys));

            setData(filteredData);
            setSearchResultsCount(filteredData.length);
            setContainsEmptyCategory(filteredData.some(item => !item.category));
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [keys, phanquyen]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleIframeLoad = useCallback(() => {
        setLoading(false);
    }, []);

    const handleSearchTermChange = useCallback((event) => {
        setSearchTerm(event.target.value);
    }, []);

    const performSearch = useCallback(async () => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();

        if (!lowerCaseSearchTerm) {
            await fetchData();
        } else {
            const filteredData = data.filter((item) =>
                item.title.toLowerCase().includes(lowerCaseSearchTerm)
            );
            setData(filteredData);
            setSearchResultsCount(filteredData.length);
        }
    }, [searchTerm, data, fetchData]);

    const handleCategoryFilter = useCallback((category) => {
        if (selectedCategory === category) {
            setSelectedCategory("");
            setSearchTerm("");
            fetchData();
        } else {
            setSelectedCategory(category);
            setSearchTerm("");
            const filteredData = data.filter((item) =>
                category === "" ? true :
                    (category.toLowerCase() === "khác" ? !item.category : item.category === category)
            );
            setSearchResultsCount(filteredData.length);
        }
    }, [selectedCategory, data, fetchData]);

    const openModal = useCallback(() => setShowModal(true), []);
    const closeModal = useCallback(() => {
        setShowModal(false);
        fetchData();
    }, [fetchData]);

    const openModalid = useCallback((id) => setShowModalid(id), []);
    const closeModalid = useCallback(() => {
        setShowModalid(null);
        fetchData();
    }, [fetchData]);

    const handleClick = useCallback((id) => {
        navigate(`/auth/dashboard/views/${id}`)
    }, [navigate]);

    const categories = useMemo(() => {
        return [...new Set(data.map(item => item.category))].filter(Boolean);
    }, [data]);

    const filteredData = useMemo(() => {
        return data.filter(item =>
            selectedCategory === "" ||
            selectedCategory === item.category ||
            (selectedCategory === "Khác" && !item.category)
        );
    }, [data, selectedCategory]);

    const SearchComponent = useMemo(() => (
        <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            <h2 style={{ marginBottom: 0, color: 'var(--main-background)', textTransform: 'uppercase' }}>Tìm kiếm Report</h2>
            <span style={{ display: 'flex', gap: '10px' }}>
                <Search
                    placeholder='Nhập tiêu đề report để tìm kiếm...'
                    value={searchTerm}
                    onChange={handleSearchTermChange}
                    onSearch={performSearch}
                    enterButton={<Button icon={<SearchOutlined />} />}
                    style={{ flex: 1 }}
                    size='large'
                />
            </span>
        </div>
    ), [searchTerm, handleSearchTermChange, performSearch]);

    const CategoryTags = useMemo(() => (
        <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
                {categories.map((category, index) => (
                    <Tag
                        key={index}
                        color={selectedCategory === category ? 'var(--main-background)' : 'default'}
                        onClick={() => handleCategoryFilter(category)}
                        size='large'
                        style={{ textTransform: 'uppercase', cursor: 'pointer', fontSize: '11pt', padding: '5px 20px' }}
                    >
                        {category}
                    </Tag>
                ))}
                {containsEmptyCategory && (
                    <Tag
                        color={selectedCategory === "Khác" ? 'var(--main-background)' : 'default'}
                        onClick={() => handleCategoryFilter("Khác")}
                        style={{ cursor: 'pointer', textTransform: 'uppercase', fontSize: '11pt', padding: '5px 20px' }}
                        size='large'
                    >
                        Other
                    </Tag>
                )}
            </div>
        </div>
    ), [categories, selectedCategory, handleCategoryFilter]);

    return (
        <div className="layout">
            <Helmet>
                <title>NISO Report - Hệ thống báo cáo NISO</title>
                <meta name="description" content="NISO Report - Hệ thống báo cáo NISO" />
            </Helmet>
            <Spin spinning={isLoading} tip="Đang tải dữ liệu..." style={{ marginTop: '16px' }}>
                {SearchComponent}

                {searchResultsCount !== null && (
                    <Alert
                        message={searchResultsCount === 0 ? "Không tìm thấy kết quả." : `Tìm thấy ${searchResultsCount} kết quả.`}
                        type="info"
                        showIcon
                        style={{ marginBottom: '15px' }}
                    />
                )}

                {CategoryTags}

                <Row gutter={[16, 16]} style={{ marginTop: '10px' }}>
                    {phanquyen && (
                        <Col xs={24} sm={12} md={8} lg={6} xl={6}>
                            <Card
                                style={{ textAlign: 'center', cursor: 'pointer', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onClick={openModal}
                                hoverable
                            >
                                Thêm mới Report
                                <div style={{ marginTop: '10px' }}>
                                    <Button>Tạo mới</Button>
                                </div>
                            </Card>
                        </Col>
                    )}

                    {filteredData.length === 0 ? (
                        <Col span={24}>
                            <div style={{ textAlign: 'center' }}>
                                <Empty
                                    description="Bạn không có báo cáo nào."
                                />
                                <Button
                                    type="primary"
                                    style={{ marginTop: '10px' }}
                                    onClick={() => navigate('/auth/dashboard/querydata/folder')}
                                    icon={<BsClipboardData />}
                                >
                                    Xem data
                                </Button>
                            </div>
                        </Col>
                    ) : (
                        filteredData.slice().reverse().map((item) => (
                            <Col xs={24} sm={12} md={8} lg={6} xl={6} key={item.keys}>
                                {phanquyen ? (
                                    <Card onClick={() => openModalid(item.keys)} style={{ position: 'relative' }} hoverable>
                                        {loading && <div style={{ textAlign: 'center' }}>Loading...</div>}
                                        <iframe
                                            src={item.link}
                                            title="Preview"
                                            style={{ width: '100%', height: '250px', pointerEvents: 'none' }}
                                            onLoad={handleIframeLoad}
                                            onLoadStart={() => setLoading(true)}
                                        />
                                        <div style={{ marginTop: '10px', textAlign: 'center' }}>
                                            <span style={{ fontSize: '20px', textAlign: 'center' }}>{item.title}</span>
                                        </div>
                                    </Card>
                                ) : (
                                    <Link to={`/auth/dashboard/views/${item.keys}`} style={{ textDecoration: 'none' }}>
                                        <Card style={{ position: 'relative' }} hoverable onClick={() => handleClick(item.keys)}>
                                            {loading && <div style={{ textAlign: 'center' }}>Loading...</div>}
                                            <iframe
                                                src={item.link}
                                                title="Preview"
                                                style={{ width: '100%', height: '250px', pointerEvents: 'none' }}
                                                onLoad={handleIframeLoad}
                                                onLoadStart={() => setLoading(true)}
                                            />
                                            <div style={{ marginTop: '10px', textAlign: 'center' }}>
                                                <span style={{ fontSize: '20px' }}>{item.title}</span>
                                            </div>
                                        </Card>
                                    </Link>
                                )}
                            </Col>
                        ))
                    )}
                </Row>

                <Modal
                    title="Thêm mới report"
                    visible={showModal}
                    footer={null}
                    onCancel={closeModal}
                    width="90%"
                    className="full-width-modal"
                    centered
                >
                    <AddContent closeModal={closeModal} onSuccess={fetchData} />
                </Modal>

                {data.map(item => (
                    <Modal
                        key={item.keys}
                        title="Chỉnh sửa thông tin report"
                        visible={showModalid === item.keys}
                        footer={null}
                        onCancel={closeModalid}
                        width="90%"
                        className="full-width-modal"
                        centered
                    >
                        <ContentModal
                            ten={name}
                            nameten={item.name}
                            category={item.category}
                            key_link={item.link}
                            name={item.title}
                            id_keys={item.keys}
                            phanquyenmodal={phanquyen}
                            notes={item.note}
                            dates={item.date}
                            onSuccess={fetchData}
                            closeModalid={closeModalid}
                        />
                    </Modal>
                ))}
            </Spin>
        </div>
    );
}

export default React.memo(Body);