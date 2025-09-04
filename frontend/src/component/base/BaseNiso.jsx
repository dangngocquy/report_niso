import React, { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { Form, Input, Button, message, Modal, Card, Row, Col, Alert, Badge, Spin, Table, Empty, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, InfoCircleOutlined, SearchOutlined, EyeInvisibleOutlined, EyeOutlined, CheckCircleOutlined, DisconnectOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import debounce from 'lodash/debounce';

const { Search } = Input;

const BaseNiso = memo(() => {
  const [connections, setConnections] = useState([]);
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingConnection, setEditingConnection] = useState(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [connectionStatuses, setConnectionStatuses] = useState({});
  const [testingConnection, setTestingConnection] = useState({});
  const [isTestingModalVisible, setIsTestingModalVisible] = useState(false);
  const [autoReconnecting, setAutoReconnecting] = useState({});
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [isQueryModalVisible, setIsQueryModalVisible] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const navigate = useNavigate();
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState(null);
  const [isDisconnectModalVisible, setIsDisconnectModalVisible] = useState(false);
  const [connectionToDisconnect, setConnectionToDisconnect] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState({});
  const [isReconnectModalVisible, setIsReconnectModalVisible] = useState(false);
  const [connectionToReconnect, setConnectionToReconnect] = useState(null);

  const debouncedFetchConnections = useCallback(
    debounce(async (skipAutoTest = false) => {
      setIsLoading(true);
      try {
        const response = await axios.get('/api/connections', {
          headers: {
            'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
          }
        });
        setConnections(response.data.connections);
        if (!skipAutoTest) {
          await autoTestConnections(response.data.connections);
        }
      } catch (error) {
        message.error('Lỗi khi tải danh sách kết nối!');
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  const autoTestConnections = async (connections) => {
    for (const connection of connections) {
      if (connection.isManuallyDisconnected) {
        setConnectionStatuses(prev => ({
          ...prev,
          [connection.id]: false
        }));
        continue;
      }

      setAutoReconnecting(prev => ({
        ...prev,
        [connection.id]: true
      }));

      try {
        const response = await axios.post('/api/connections/test-connection',
          {
            ...connection,
            id: connection.id
          },
          {
            headers: {
              'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
            }
          }
        );

        setConnectionStatuses(prev => ({
          ...prev,
          [connection.id]: response.data.success
        }));
      } catch (error) {
        setConnectionStatuses(prev => ({
          ...prev,
          [connection.id]: false
        }));
      } finally {
        setAutoReconnecting(prev => ({
          ...prev,
          [connection.id]: false
        }));
      }
    }
  };

  useEffect(() => {
    debouncedFetchConnections();
  }, [debouncedFetchConnections]);

  const handleEdit = (connection) => {
    setEditingConnection(connection);
    form.setFieldsValue(connection);
    setIsEditModalVisible(true);
  };

  const handleUpdate = async (values) => {
    const isConnected = await testConnection(values, editingConnection.id);
    if (isConnected) {
      try {
        const response = await axios.put(`/api/connections/update/${editingConnection.id}`, values, {
          headers: {
            'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
          }
        });

        if (response.status === 200) {
          debouncedFetchConnections();
          setIsEditModalVisible(false);
          form.resetFields();
        }
      } catch (error) {
        message.error('Lỗi khi cập nhật thông tin kết nối!');
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await axios.delete(`/api/connections/delete/${id}`, {
        headers: {
          'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
        }
      });

      if (response.status === 200) {
        setConnections(prevConnections =>
          prevConnections.filter(conn => conn.id !== id)
        );

        setConnectionStatuses(prev => {
          const newStatuses = { ...prev };
          delete newStatuses[id];
          return newStatuses;
        });

        setVisiblePasswords(prev => {
          const newVisible = { ...prev };
          delete newVisible[id];
          return newVisible;
        });

        setTestingConnection(prev => {
          const newTesting = { ...prev };
          delete newTesting[id];
          return newTesting;
        });

        setAutoReconnecting(prev => {
          const newReconnecting = { ...prev };
          delete newReconnecting[id];
          return newReconnecting;
        });

        message.success('Xóa thông tin kết nối và dữ liệu liên quan thành công!');
      }
    } catch (error) {
      message.error('Lỗi khi xóa thông tin kết nối!');
    }
  };

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleAddConnection = async (values) => {
    const isConnected = await testConnection(values);
    if (isConnected) {
      try {
        const response = await axios.post('/api/connections/add', values, {
          headers: {
            'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
          }
        });

        if (response.status === 200) {
          debouncedFetchConnections();
          form.resetFields();
          setIsModalVisible(false);
        }
      } catch (error) {
        message.error('Lỗi khi thêm thông tin kết nối!');
      }
    }
  };

  const filteredConnections = useMemo(() => 
    connections.filter(conn =>
      conn.connectionName.toLowerCase().includes(searchText.toLowerCase()) ||
      conn.ipAddress.toLowerCase().includes(searchText.toLowerCase()) ||
      conn.database.toLowerCase().includes(searchText.toLowerCase())
    ),
    [connections, searchText]
  );

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const testConnection = async (values, id = null) => {
    const connectionId = id || 'new';
    setIsTestingModalVisible(true);
    setTestingConnection(prev => ({ ...prev, [connectionId]: true }));

    try {
      const response = await axios.post('/api/connections/test-connection', {
        ...values,
        id: connectionId
      }, {
        headers: {
          'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
        }
      });

      setConnectionStatuses(prev => ({
        ...prev,
        [connectionId]: response.data.success
      }));

      if (response.data.success) {
        message.success('Kết nối thành công!');
        return true;
      }
    } catch (error) {
      setConnectionStatuses(prev => ({
        ...prev,
        [connectionId]: false
      }));
      message.error('Kết nối thất bại!');
      return false;
    } finally {
      setTestingConnection(prev => ({ ...prev, [connectionId]: false }));
      setIsTestingModalVisible(false);
    }
    return false;
  };

  const handleExecuteQuery = async () => {
    if (!query.trim()) {
      message.warning('Vui lòng nhập câu query!');
      return;
    }

    setIsExecuting(true);
    try {
      const response = await axios.post('/api/connections/execute-query',
        {
          connectionId: editingConnection.id,
          query: query
        },
        {
          headers: {
            'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
          }
        }
      );

      setQueryResult(response.data);
      message.success(`Thực thi query thành công! Số dòng ảnh hưởng: ${response.data.rowsAffected}`);
    } catch (error) {
      message.error('Lỗi khi thực thi query: ' + error.response?.data?.error || error.message);
      setQueryResult(null);
    } finally {
      setIsExecuting(false);
    }
  };

  const showDeleteModal = (connection) => {
    setConnectionToDelete(connection);
    setIsDeleteModalVisible(true);
  };

  const showDisconnectModal = (connection) => {
    setConnectionToDisconnect(connection);
    setIsDisconnectModalVisible(true);
  };

  const handleDisconnect = async (connectionId) => {
    try {
      setDisconnecting(prev => ({
        ...prev,
        [connectionId]: true
      }));

      const response = await axios.post(
        `/api/connections/disconnect/${connectionId}`,
        {},
        {
          headers: {
            'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
          }
        }
      );

      if (response.status === 200) {
        message.success('Ngắt kết nối thành công');
        setConnectionStatuses(prev => ({
          ...prev,
          [connectionId]: false
        }));
        debouncedFetchConnections(true);
        setIsDisconnectModalVisible(false);
        setConnectionToDisconnect(null);

        const currentPath = window.location.pathname;
        if (currentPath.includes(`/database/query/${connectionId}`)) {
          navigate('/auth/dashboard/database');
        }
      }
    } catch (error) {
      message.error('Lỗi khi ngắt kết nối: ' + (error.response?.data?.message || error.message));
    } finally {
      setDisconnecting(prev => {
        const newDisconnecting = { ...prev };
        delete newDisconnecting[connectionId];
        return newDisconnecting;
      });
    }
  };

  const showReconnectModal = (connection) => {
    setConnectionToReconnect(connection);
    setIsReconnectModalVisible(true);
  };

  const handleReconnect = async (connectionId) => {
    try {
      setAutoReconnecting(prev => ({
        ...prev,
        [connectionId]: true
      }));

      const response = await axios.post(
        `/api/connections/reconnect/${connectionId}`,
        {},
        {
          headers: {
            'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
          }
        }
      );

      if (response.data.success) {
        message.success('Kết nối lại thành công');
        setConnectionStatuses(prev => ({
          ...prev,
          [connectionId]: true
        }));
        await debouncedFetchConnections(true);
        setConnections(prev =>
          prev.map(conn =>
            conn.id === connectionId
              ? { ...conn, connectionStatus: 'connected', isManuallyDisconnected: false }
              : conn
          )
        );
        setIsReconnectModalVisible(false);
        setConnectionToReconnect(null);
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      message.error('Lỗi khi kết nối lại: ' + (error.response?.data?.message || error.message));
      setConnectionStatuses(prev => ({
        ...prev,
        [connectionId]: false
      }));
    } finally {
      setAutoReconnecting(prev => ({
        ...prev,
        [connectionId]: false
      }));
    }
  };

  const handleConnectionClick = useCallback((connection) => {
    if (connection.connectionStatus === 'disconnected') {
      message.warning('Kết nối đã bị ngắt. Vui lòng kết nối lại để tiếp tục.');
      return;
    }
    navigate(`/auth/dashboard/database/query/${connection.id}`);
  }, [navigate]);

  const getConnectionStatus = useCallback((conn, disconnecting, autoReconnecting, testingConnection, connectionStatuses) => {
    if (disconnecting[conn.id]) return "Đang ngắt kết nối...";
    if (autoReconnecting[conn.id]) return "Đang tự động kết nối lại...";
    if (conn.isManuallyDisconnected) return "Đã ngắt kết nối";
    if (testingConnection[conn.id]) return "Đang kiểm tra kết nối...";
    return connectionStatuses[conn.id] ? "Kết nối thành công" : "Kết nối thất bại";
  }, []);

  const getConnectionColor = useCallback((conn, disconnecting, autoReconnecting, testingConnection, connectionStatuses) => {
    if (disconnecting[conn.id]) return "processing";
    if (autoReconnecting[conn.id]) return "processing";
    if (conn.isManuallyDisconnected) return "red";
    if (testingConnection[conn.id]) return "blue";
    return connectionStatuses[conn.id] ? "green" : "processing";
  }, []);

  const ConnectionCard = memo(({ conn }) => (
    <Badge.Ribbon
      text={getConnectionStatus(conn, disconnecting, autoReconnecting, testingConnection, connectionStatuses)}
      color={getConnectionColor(conn, disconnecting, autoReconnecting, testingConnection, connectionStatuses)}
    >
      <Card
        title={conn.connectionName}
        className="h-full"
        size="small"
        extra={testingConnection[conn.id] && <Spin size="small" />}
        actions={[
          <InfoCircleOutlined key="edit" onClick={() => handleEdit(conn)} />,
          !conn.isManuallyDisconnected && connectionStatuses[conn.id] && (
            <DisconnectOutlined
              key="disconnect"
              onClick={() => showDisconnectModal(conn)}
              style={{ color: '#ff4d4f' }}
            />
          ),
          conn.isManuallyDisconnected && (
            <CheckCircleOutlined 
              key="reconnect"
              onClick={() => showReconnectModal(conn)} 
            />
          ),
          <DeleteOutlined key="delete" onClick={() => showDeleteModal(conn)} />
        ].filter(Boolean)}
        hoverable
      >
        <p style={{ fontSize: '12px' }}><strong>Tên đăng nhập:</strong> {conn.username}</p>
        <p style={{ fontSize: '12px' }}>
          <strong>Mật khẩu:</strong>{' '}
          <span style={{ position: 'relative' }}>
            {visiblePasswords[conn.id] ? conn.password : '••••••••'}
            <span
              onClick={() => togglePasswordVisibility(conn.id)}
              style={{ cursor: 'pointer', marginLeft: '5px' }}
            >
              {visiblePasswords[conn.id] ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            </span>
          </span>
        </p>
        <p style={{ fontSize: '12px' }}><strong>Địa chỉ IP / Server:</strong> {conn.ipAddress}</p>
        <p style={{ fontSize: '12px' }}><strong>Port:</strong> {conn.port || 'Mặc định'}</p>
        <p style={{ fontSize: '12px' }}><strong>Database:</strong> {conn.database}</p>
        <Button
          type="primary"
          onClick={() => {
            if (connectionStatuses[conn.id]) {
              navigate(`/auth/dashboard/database/query/${conn.id}`);
            } else {
              message.warning('Vui lòng đảm bảo kết nối thành công trước khi thực thi query!');
            }
          }}
          disabled={!connectionStatuses[conn.id] || conn.isManuallyDisconnected}
          style={{ marginTop: '10px', width: '100%' }}
        >
          Danh sách database
        </Button>
      </Card>
    </Badge.Ribbon>
  ));

  const columns = useMemo(() => [
    // ... existing columns configuration ...
  ], [connectionStatuses, disconnecting, autoReconnecting]);

  return (
    <div className='layout'>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <title>Thông Tin Kết Nối</title>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <h2 style={{ marginBottom: 0, color: 'var(--main-background)', textTransform: 'uppercase' }}>Thông Tin Kết Nối</h2>
            <Search
              placeholder="Tìm kiếm kết nối..."
              enterButton={<Button icon={<SearchOutlined />} />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ flex: 1 }}
              size='large'
            />
          </Space>
        </div>

        <Alert
          message={
            filteredConnections.length === 0
              ? "Không tìm thấy kết quả phù hợp"
              : `Đã tìm thấy ${filteredConnections.length} kết quả`
          }
          type={filteredConnections.length === 0 ? "warning" : "info"}
          showIcon
        />

        <Button type="primary" icon={<PlusOutlined />} onClick={showModal}>
          Tạo kết nối mới
        </Button>

        <Spin spinning={isLoading} tip="Đang tải danh sách kết nối..." style={{ marginTop: '16px' }}>
          {connections.length === 0 ? (
            <Empty description="Không có danh sách kết nối nào." />
          ) : (
            <Row gutter={[16, 16]}>
              {filteredConnections.map((conn) => (
                <Col key={conn.id} xs={24} sm={12} md={6} lg={4}>
                  <ConnectionCard conn={conn} />
                </Col>
              ))}
            </Row>
          )}
        </Spin>

        <Modal
          title="Thêm kết nối mới"
          open={isModalVisible}
          onCancel={handleCancel}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleAddConnection}
          >
            <Form.Item
              name="connectionName"
              label="Tên kết nối"
              rules={[{ required: true, message: 'Vui lòng nhập tên kết nối!' }]}
            >
              <Input placeholder="Nhập tên kết nối" />
            </Form.Item>

            <Form.Item
              name="username"
              label="Tên đăng nhập"
              rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]}
            >
              <Input placeholder="Nhập tên đăng nhập" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
            >
              <Input.Password placeholder="Nhập mật khẩu" />
            </Form.Item>

            <Form.Item
              name="ipAddress"
              label="Địa chỉ IP / Server"
              rules={[{ required: true, message: 'Vui lòng nhập địa chỉ IP / Server!' }]}
            >
              <Input placeholder="Nhập địa chỉ IP / Server" />
            </Form.Item>

            <Form.Item
              name="port"
              label="Port (Không bắt buộc)"
              rules={[
                {
                  pattern: /^[0-9]*$/,
                  message: 'Port phải là số!'
                }
              ]}
            >
              <Input placeholder="Nhập port (tùy chọn)" />
            </Form.Item>

            <Form.Item
              name="database"
              label="Tên Database"
              rules={[{ required: true, message: 'Vui lòng nhập tên database!' }]}
            >
              <Input placeholder="Nhập tên database" />
            </Form.Item>

            <Form.Item className="mb-0 text-right">
              <Button type="default" onClick={handleCancel} style={{ marginRight: 15 }}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit">
                Kết nối
              </Button>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="Chỉnh Sửa Kết Nối"
          open={isEditModalVisible}
          onCancel={() => {
            setIsEditModalVisible(false);
            form.resetFields();
          }}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleUpdate}
          >
            <Form.Item
              name="connectionName"
              label="Tên kết nối"
              rules={[{ required: true, message: 'Vui lòng nhập tên kết nối!' }]}
            >
              <Input placeholder="Nhập tên kết nối" />
            </Form.Item>

            <Form.Item
              name="username"
              label="Tên đăng nhập"
              rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]}
            >
              <Input placeholder="Nhập tên đăng nhập" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
            >
              <Input.Password placeholder="Nhập mật khẩu" />
            </Form.Item>

            <Form.Item
              name="ipAddress"
              label="Địa chỉ IP / Server"
              rules={[{ required: true, message: 'Vui lòng nhập địa chỉ IP / Server!' }]}
            >
              <Input placeholder="Nhập địa chỉ IP / Server" />
            </Form.Item>

            <Form.Item
              name="port"
              label="Port"
              rules={[
                {
                  pattern: /^[0-9]*$/,
                  message: 'Port phải là số!'
                }
              ]}
            >
              <Input placeholder="Nhập port (tùy chọn)" />
            </Form.Item>

            <Form.Item
              name="database"
              label="Tên Database"
              rules={[{ required: true, message: 'Vui lòng nhập tên database!' }]}
            >
              <Input placeholder="Nhập tên database" />
            </Form.Item>

            <Form.Item className="mb-0 text-right">
              <Button type="default" onClick={() => setIsEditModalVisible(false)} style={{ marginRight: 15 }}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit">
                Sửa thông tin và kết nối lại
              </Button>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="Đang kiểm tra kết nối"
          open={isTestingModalVisible}
          footer={null}
          closable={false}
        >
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin size="large" />
            <p style={{ marginTop: '10px' }}>Đang kiểm tra thông tin kết nối...</p>
          </div>
        </Modal>

        <Modal
          title={`Tạo Query - ${editingConnection?.connectionName}`}
          open={isQueryModalVisible}
          onCancel={() => {
            setIsQueryModalVisible(false);
            setQuery('');
            setQueryResult(null);
          }}
          width={1000}
          footer={[
            <Button key="cancel" onClick={() => {
              setIsQueryModalVisible(false);
              setQuery('');
              setQueryResult(null);
            }}>
              Đóng
            </Button>,
            <Button
              key="execute"
              type="primary"
              onClick={handleExecuteQuery}
              loading={isExecuting}
            >
              Thực thi
            </Button>
          ]}
        >
          <Input.TextArea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập câu lệnh SQL..."
            autoSize={{ minRows: 4, maxRows: 8 }}
            style={{ marginBottom: '20px' }}
          />

          {queryResult && (
            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
              <Table
                dataSource={queryResult.data}
                columns={
                  queryResult.data?.length > 0
                    ? Object.keys(queryResult.data[0]).map(key => ({
                      title: key,
                      dataIndex: key,
                      key: key,
                      ellipsis: true
                    }))
                    : []
                }
                size="small"
                scroll={{ x: true }}
                pagination={{ pageSize: 5 }}
              />
            </div>
          )}
        </Modal>

        <Modal
          title="Xóa kết nối"
          open={isDeleteModalVisible}
          onCancel={() => {
            setIsDeleteModalVisible(false);
            setConnectionToDelete(null);
          }}
          footer={[
            <Button
              key="cancel"
              onClick={() => {
                setIsDeleteModalVisible(false);
                setConnectionToDelete(null);
              }}
            >
              Hủy
            </Button>,
            <Button
              key="delete"
              type="primary"
              danger
              onClick={() => {
                handleDelete(connectionToDelete.id);
                setIsDeleteModalVisible(false);
                setConnectionToDelete(null);
              }}
            >
              Xóa
            </Button>
          ]}
        >
          <div>
            <p>Bạn có chắc chắn muốn xóa kết nối này?</p>
            <Alert
              message="Cảnh báo: Việc xóa kết nối này sẽ xóa tất cả:"
              description={
                <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                  <li>Thông tin kết nối</li>
                  <li>Tất cả thư mục đã tạo</li>
                  <li>Tất cả query đã lưu</li>
                  <li>Mọi thông tin liên quan đến kết nối này</li>
                </ul>
              }
              type="warning"
              showIcon
            />
          </div>
        </Modal>

        <Modal
          title="Xác nhận ngắt kết nối"
          open={isDisconnectModalVisible}
          onCancel={() => {
            setIsDisconnectModalVisible(false);
            setConnectionToDisconnect(null);
          }}
          footer={[
            <Button
              key="cancel"
              onClick={() => {
                setIsDisconnectModalVisible(false);
                setConnectionToDisconnect(null);
              }}
            >
              Hủy
            </Button>,
            <Button
              key="disconnect"
              type="primary"
              danger
              onClick={() => handleDisconnect(connectionToDisconnect.id)}
            >
              Ngắt kết nối
            </Button>
          ]}
        >
          <div>
            <p>Bạn có chắc chắn muốn ngắt kết nối này?</p>
            <Alert
              message="Cảnh báo: Việc ngắt kết nối này sẽ:"
              description={
                <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                  <li>Ngắt tất cả các truy vấn đang chạy</li>
                  <li>Ngắt tất cả phân quyền từ người dùng</li>
                  <li>Không thể thực hiện truy vấn mới</li>
                  <li>Cần kết nối lại để tiếp tục sử dụng</li>
                </ul>
              }
              type="warning"
              showIcon
            />
          </div>
        </Modal>

        <Modal
          title="Xác nhận kết nối lại"
          open={isReconnectModalVisible}
          onCancel={() => {
            setIsReconnectModalVisible(false);
            setConnectionToReconnect(null);
          }}
          footer={[
            <Button
              key="cancel"
              onClick={() => {
                setIsReconnectModalVisible(false);
                setConnectionToReconnect(null);
              }}
            >
              Hủy
            </Button>,
            <Button
              key="reconnect"
              type="primary"
              onClick={() => handleReconnect(connectionToReconnect.id)}
              loading={autoReconnecting[connectionToReconnect?.id]}
            >
              Kết nối lại
            </Button>
          ]}
        >
          <div>
            <p>Bạn có chắc chắn muốn kết nối lại với database này?</p>
            <Alert
              message="Lưu ý khi kết nối lại:"
              description={
                <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                  <li>Hệ thống sẽ thử kết nối lại với database</li>
                  <li>Nếu kết nối thành công, bạn có thể tiếp tục thực hiện các thao tác</li>
                  <li>Người dùng có thể truy vấn dữ liệu</li>
                  <li>Nếu kết nối thất bại, vui lòng kiểm tra lại thông tin kết nối</li>
                </ul>
              }
              type="info"
              showIcon
            />
          </div>
        </Modal>
      </Space>
    </div>
  );
});

export default React.memo(BaseNiso);
