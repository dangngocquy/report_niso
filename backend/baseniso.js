const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const sql = require('mssql');
const moment = require('moment');
const NodeCache = require('node-cache');

const connectionsFile = path.join(__dirname, 'connections.json');
const foldersFile = path.join(__dirname, 'folders.json');

const queryCache = new NodeCache({ stdTTL: 300 }); // Cache trong 5 phút

if (!fs.existsSync(connectionsFile)) {
  fs.writeFileSync(connectionsFile, JSON.stringify([]));
}

const readConnections = () => {
  const data = fs.readFileSync(connectionsFile);
  const connections = JSON.parse(data);

  return connections.sort((a, b) => {
    const timeA = a.lastChecked || a.createdAt;
    const timeB = b.lastChecked || b.createdAt;
    return moment(timeB).valueOf() - moment(timeA).valueOf();
  });
};

const writeConnections = (connections) => {
  fs.writeFileSync(connectionsFile, JSON.stringify(connections, null, 2));
};

router.post('/add', (req, res) => {
  try {
    const newConnection = req.body;
    const connections = readConnections();

    connections.push({
      ...newConnection,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    });

    writeConnections(connections);

    res.status(200).json({
      message: 'Thêm thông tin kết nối thành công',
      connection: newConnection
    });
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi khi thêm thông tin kết nối',
      error: error.message
    });
  }
});

router.get('/', (req, res) => {
  try {
    const connections = readConnections();
    const connectionsWithStatus = connections.map(conn => ({
      ...conn,
      connectionStatus: conn.connectionStatus || 'unknown',
      lastChecked: conn.lastChecked ? moment(conn.lastChecked).format('DD/MM/YYYY HH:mm:ss') : null,
      createdAt: moment(conn.createdAt).format('DD/MM/YYYY HH:mm:ss'),
      errorMessage: conn.errorMessage || null
    }));

    res.status(200).json({
      message: 'Lấy danh sách kết nối thành công',
      connections: connectionsWithStatus
    });
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi khi lấy danh sách kết nối',
      error: error.message
    });
  }
});

const handleDelete = async (req, res) => {
  try {
    const { id } = req.params;
    let connections = readConnections();
    let folders = readFolders();

    folders = folders.filter(folder => folder.connectionId !== id);
    writeFolders(folders);

    connections = connections.filter(conn => conn.id !== id);
    writeConnections(connections);

    res.status(200).json({
      message: 'Xóa thông tin kết nối và dữ liệu liên quan thành công'
    });
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi khi xóa thông tin kết nối',
      error: error.message
    });
  }
};

router.delete('/delete/:id', handleDelete);

const connectionStatus = {};

const testSqlConnection = async (connectionInfo) => {
  let pool = null;
  try {
    const config = {
      user: connectionInfo.username,
      password: connectionInfo.password,
      server: connectionInfo.ipAddress,
      database: connectionInfo.database,
      options: {
        trustServerCertificate: true,
        encrypt: false,
        enableArithAbort: true,
        connectTimeout: 30000,
        requestTimeout: 30000
      }
    };

    if (connectionInfo.port) {
      config.port = parseInt(connectionInfo.port);
    }

    pool = await new sql.ConnectionPool(config).connect();

    await pool.request().query('SELECT 1');

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Không thể kết nối đến cơ sở dữ liệu'
    };
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (err) {
        console.error('Lỗi đóng kết nối:', err);
      }
    }
  }
};

router.post('/test-connection', async (req, res) => {
  const connectionInfo = req.body;
  try {
    const result = await testSqlConnection(connectionInfo);

    if (result.success) {
      if (connectionInfo.id && connectionInfo.id !== 'new') {
        const connections = readConnections();
        const connectionIndex = connections.findIndex(conn => conn.id === connectionInfo.id);
        if (connectionIndex !== -1) {
          connections[connectionIndex] = {
            ...connections[connectionIndex],
            connectionStatus: 'connected',
            lastChecked: moment().format('YYYY-MM-DD HH:mm:ss'),
            isManuallyDisconnected: false,
            errorMessage: null
          };
          writeConnections(connections);
          connectionStatus[connectionInfo.id] = true;
        }
      }
      res.json({ success: true });
    } else {
      res.status(400).json({
        success: false,
        message: `Lỗi kết nối: ${result.error}`,
        details: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi kiểm tra kết nối',
      error: error.message
    });
  }
});

const getDefaultConfig = (connectionInfo) => {
  const config = {
    user: connectionInfo.username, //username
    password: connectionInfo.password, //password
    server: connectionInfo.ipAddress, //ip SQL Server
    database: connectionInfo.database, //tên database
    options: {
      trustServerCertificate: true, //cho phép kết nối không mã hóa
      encrypt: false, //không mã hóa
      enableArithAbort: true, //cho phép abort khi có lỗi
      connectTimeout: 30000, //thời gian chờ kết nối 30s
      requestTimeout: 300000, //thời gian chờ truy vấn 3p
      maxRetriesOnTransientErrors: 3, //số lần thử kết nối lại 2 lần
      pool: {
        max: 0, //0 giới han tối đa
        min: 0, // 0 giới hạn tối thiểu
        idleTimeoutMillis: 30000, //thời gian chờ kết nối 30s
        acquireTimeoutMillis: 30000 //thời gian chờ kết nối 30s
      },
      packetSize: 32768, //kích thước gói tin 32768
      connectionRetryInterval: 1000, //chờ kết nối lại 1s
      keepAlive: true, //giữ kết nối
      keepAliveInterval: 30000, //thời gian giữ kết nối 30s
      readOnlyIntent: false, //không đọc chỉ
      multipleActiveResultSets: true, //cho phép nhiều kết quả
      validateConnection: true, //kiểm tra kết nối
    }
  };

  if (connectionInfo.port) {
    config.port = parseInt(connectionInfo.port);
  }

  return config;
};

// Thêm hàm retry kết nối
const connectWithRetry = async (config, maxRetries = 3) => {
  let lastError;
  let pool = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (pool) {
        await pool.close();
        pool = null;
      }

      pool = await new sql.ConnectionPool(config).connect();
      return pool;
    } catch (error) {
      lastError = error;
      console.log(`Lần thử kết nối thứ ${attempt} thất bại:`, error.message);

      if (attempt < maxRetries) {
        await new Promise(resolve =>
          setTimeout(resolve, config.options.connectionRetryInterval * attempt)
        );
      }
    }
  }

  throw new Error(`Không thể kết nối sau ${maxRetries} lần thử: ${lastError.message}`);
};

router.post('/execute-query', async (req, res) => {
  const { connectionId, query, params = [], cacheKey } = req.body;
  let pool = null;

  try {
    if (connectionStatus[connectionId] === false) {
      return res.status(403).json({
        success: false,
        message: 'Kết nối đã bị ngắt. Vui lòng kết nối lại để thực hiện truy vấn.'
      });
    }

    if (!connectionId || !query) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu connectionId hoặc query'
      });
    }

    const connections = readConnections();
    const connection = connections.find(conn => conn.id === connectionId);

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin kết nối'
      });
    }

    const config = getDefaultConfig(connection);

    try {
      pool = await connectWithRetry(config);
      const request = pool.request();
      
      // Thêm xử lý timeout và network error
      request.on('error', error => {
        if (error.code === 'ETIMEOUT' || 
            error.message.includes('DBNETLIB') || 
            error.message.includes('network error')) {
          connectionStatus[connectionId] = false;
          const connections = readConnections();
          const connectionIndex = connections.findIndex(conn => conn.id === connectionId);
          if (connectionIndex !== -1) {
            connections[connectionIndex] = {
              ...connections[connectionIndex],
              connectionStatus: 'disconnected',
              errorMessage: error.message,
              lastChecked: moment().format('YYYY-MM-DD HH:mm:ss')
            };
            writeConnections(connections);
          }
        }
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Query timeout'));
        }, config.options.requestTimeout);
      });

      const queryPromise = (async () => {
        if (params && params.length > 0) {
          params.forEach(param => {
            request.input(param.name, param.type, param.value);
          });
        }
        return await request.query(query);
      })();

      const result = await Promise.race([queryPromise, timeoutPromise]);
      const recordset = result.recordset || [];
      const recordsets = result.recordsets || [];
      const rowsAffected = result.rowsAffected || [0];

      let responseData = recordset;
      if (recordset.length === 0 && recordsets.length > 0) {
        responseData = recordsets[0];
      }

      if (cacheKey && responseData.length > 0) {
        queryCache.set(cacheKey, responseData);
      }

      return res.status(200).json({
        success: true,
        data: responseData,
        total: responseData.length,
        rowsAffected: rowsAffected[0],
        message: responseData.length > 0
          ? 'Query thực thi thành công'
          : 'Query thực thi thành công nhưng không có dữ liệu trả về'
      });

    } catch (queryError) {
      if (queryError.code === 'ESOCKET' || 
          queryError.code === 'ETIMEOUT' || 
          queryError.message.includes('DBNETLIB') || 
          queryError.message.includes('network error')) {
        connectionStatus[connectionId] = false;
        const connections = readConnections();
        const connectionIndex = connections.findIndex(conn => conn.id === connectionId);
        if (connectionIndex !== -1) {
          connections[connectionIndex] = {
            ...connections[connectionIndex],
            connectionStatus: 'disconnected',
            errorMessage: queryError.message,
            lastChecked: moment().format('YYYY-MM-DD HH:mm:ss')
          };
          writeConnections(connections);
        }
        throw new Error('Lỗi kết nối mạng: ' + queryError.message);
      }
      throw queryError;
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi thực thi query',
      errorCode: error.code,
      connectionStatus: 'disconnected'
    });
  } finally {
    if (pool) {
      try {
        await pool.close();
        pool = null;
      } catch (closeError) {
        console.error('Lỗi đóng kết nối:', closeError);
      }
    }
  }
});

router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const connections = readConnections();
    const connection = connections.find(conn => conn.id === id);

    if (!connection) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin kết nối' });
    }

    res.status(200).json({
      message: 'Lấy thông tin kết nối thành công',
      connection
    });
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi khi lấy thông tin kết nối',
      error: error.message
    });
  }
});

const readFolders = () => {
  if (!fs.existsSync(foldersFile)) {
    fs.writeFileSync(foldersFile, JSON.stringify([]));
  }
  const data = fs.readFileSync(foldersFile);
  return JSON.parse(data);
};

const writeFolders = (folders) => {
  fs.writeFileSync(foldersFile, JSON.stringify(folders, null, 2));
};

router.post('/folders/add', (req, res) => {
  try {
    const { id, connectionId, folderName, parentFolderId } = req.body;
    const folders = readFolders();

    const isDuplicateFolder = folders.some(
      f => f.connectionId === connectionId &&
        f.folderName.toLowerCase() === folderName.toLowerCase()
    );

    if (isDuplicateFolder) {
      return res.status(400).json({
        success: false,
        message: 'Tên thư mục đã tồn tại'
      });
    }

    const newFolder = {
      id,
      connectionId,
      folderName,
      parentFolderId,
      createdAt: new Date().toISOString(),
      queries: [],
      keysUser: []
    };

    folders.push(newFolder);
    writeFolders(folders);

    res.status(200).json({
      message: 'Tạo thư mục thành công.',
      folder: newFolder
    });
  } catch (error) {
    console.error('Lỗi khi tạo thư mục:', error);
    res.status(500).json({
      message: 'Lỗi khi tạo thư mục',
      error: error.message
    });
  }
});

router.post('/queries/add', (req, res) => {
  try {
    const { queryName, queryContent, folderId } = req.body;
    const folders = readFolders();

    const folderIndex = folders.findIndex(f => f.id === folderId);
    if (folderIndex === -1) {
      return res.status(404).json({ message: 'Không tìm thấy thư mục' });
    }

    const isDuplicateQuery = folders[folderIndex].queries?.some(
      q => q.queryName.toLowerCase() === queryName.toLowerCase()
    );

    if (isDuplicateQuery) {
      return res.status(400).json({
        success: false,
        message: 'Tên query đã tồn tại trong thư mục này'
      });
    }

    const newQuery = {
      id: Date.now().toString(),
      queryName,
      queryContent,
      folderId,
      createdAt: new Date().toISOString(),
      keysUser: []
    };

    folders[folderIndex].queries = folders[folderIndex].queries || [];
    folders[folderIndex].queries.push(newQuery);
    writeFolders(folders);

    res.status(200).json({
      message: 'Tạo query thành công',
      query: newQuery
    });
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi khi tạo query',
      error: error.message
    });
  }
});

router.put('/queries/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { queryContent, queryName, folderId } = req.body;
    const folders = readFolders();

    const folderIndex = folders.findIndex(f => f.id === folderId);
    if (folderIndex === -1) {
      return res.status(404).json({ message: 'Không tìm thấy thư mục' });
    }

    const queryIndex = folders[folderIndex].queries.findIndex(q => q.id === id);
    if (queryIndex === -1) {
      return res.status(404).json({ message: 'Không tìm thấy query' });
    }

    folders[folderIndex].queries[queryIndex] = {
      ...folders[folderIndex].queries[queryIndex],
      queryName: queryName || folders[folderIndex].queries[queryIndex].queryName,
      queryContent: queryContent || folders[folderIndex].queries[queryIndex].queryContent,
      lastModifiedAt: new Date().toISOString()
    };

    writeFolders(folders);

    res.status(200).json({
      message: 'Cập nhật query thành công',
      query: folders[folderIndex].queries[queryIndex]
    });
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi khi cập nhật query',
      error: error.message
    });
  }
});

router.put('/queries/rename/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { queryName, folderId } = req.body;
    const folders = readFolders();

    const folderIndex = folders.findIndex(f => f.id === folderId);
    if (folderIndex === -1) {
      return res.status(404).json({ message: 'Không tìm thấy thư mục' });
    }

    const queryIndex = folders[folderIndex].queries.findIndex(q => q.id === id);
    if (queryIndex === -1) {
      return res.status(404).json({ message: 'Không tìm thấy query' });
    }

    folders[folderIndex].queries[queryIndex].queryName = queryName;
    folders[folderIndex].queries[queryIndex].updatedAt = new Date().toISOString();

    writeFolders(folders);

    res.status(200).json({
      message: 'Cập nhật tên query thành công',
      query: folders[folderIndex].queries[queryIndex]
    });
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi khi cập nhật tên query',
      error: error.message
    });
  }
});

router.delete('/queries/:queryId', async (req, res) => {
  try {
    const { queryId } = req.params;
    const folders = readFolders();
    let queryDeleted = false;
    let folderWithQuery = null;

    for (const folder of folders) {
      const queryIndex = (folder.queries || []).findIndex(q => q.id === queryId);
      if (queryIndex !== -1) {
        folder.queries.splice(queryIndex, 1);
        queryDeleted = true;
        folderWithQuery = folder;
        break;
      }
    }

    if (!queryDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy query'
      });
    }

    writeFolders(folders);

    res.status(200).json({
      success: true,
      message: 'Xóa query thành công',
      folderId: folderWithQuery?.id
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa query',
      error: error.message
    });
  }
});

router.get('/folders/:connectionId', (req, res) => {
  try {
    const { connectionId } = req.params;
    const folders = readFolders();
    const connectionFolders = folders.filter(f => f.connectionId === connectionId);

    res.status(200).json({
      message: 'Lấy danh sách thư mục thành công',
      folders: connectionFolders
    });
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi khi lấy danh sách thư mục',
      error: error.message
    });
  }
});

router.get('/queries/:connectionId', (req, res) => {
  try {
    const { connectionId } = req.params;
    const folders = readFolders();

    const queries = folders
      .filter(f => f.connectionId === connectionId)
      .reduce((acc, folder) => [...acc, ...(folder.queries || [])], []);

    res.status(200).json({
      message: 'Lấy danh sách queries thành công',
      queries: queries
    });
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi khi lấy danh sách queries',
      error: error.message
    });
  }
});

router.get('/queries/detail/:queryId', (req, res) => {
  try {
    const { queryId } = req.params;
    const folders = readFolders();

    let foundQuery = null;
    for (const folder of folders) {
      const query = folder.queries?.find(q => q.id === queryId);
      if (query) {
        foundQuery = query;
        break;
      }
    }

    if (!foundQuery) {
      return res.status(404).json({ message: 'Không tìm thấy query' });
    }

    res.status(200).json({
      message: 'Lấy thông tin query thành công',
      query: foundQuery
    });
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi khi lấy thông tin query',
      error: error.message
    });
  }
});

router.delete('/folders/:folderId', (req, res) => {
  try {
    const { folderId } = req.params;
    let folders = readFolders();

    const folderIndex = folders.findIndex(f => f.id === folderId);
    if (folderIndex === -1) {
      return res.status(404).json({ message: 'Không tìm thấy thư mục' });
    }

    folders.splice(folderIndex, 1);
    writeFolders(folders);

    res.status(200).json({
      message: 'Xóa thư mục thành công'
    });
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi khi xóa thư mục',
      error: error.message
    });
  }
});

router.put('/folders/:folderId', (req, res) => {
  try {
    const { folderId } = req.params;
    const { folderName } = req.body;
    let folders = readFolders();

    const folderIndex = folders.findIndex(f => f.id === folderId);
    if (folderIndex === -1) {
      return res.status(404).json({ message: 'Không tìm thấy thư mục' });
    }

    const isDuplicateFolder = folders.some(
      f => f.id !== folderId &&
        f.connectionId === folders[folderIndex].connectionId &&
        f.folderName.toLowerCase() === folderName.toLowerCase()
    );

    if (isDuplicateFolder) {
      return res.status(400).json({
        success: false,
        message: 'Tên thư mục đã tồn tại'
      });
    }

    folders[folderIndex].folderName = folderName;
    folders[folderIndex].updatedAt = new Date().toISOString();
    writeFolders(folders);

    res.status(200).json({
      message: 'Cập nhật tên thư mục thành công',
      folder: folders[folderIndex]
    });
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi khi cập nhật tên thư mục',
      error: error.message
    });
  }
});

router.put('/permissions/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { userKeys, itemType } = req.body;

    if (!itemId || !itemType || !Array.isArray(userKeys)) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ'
      });
    }

    const folders = readFolders();
    const validUserKeys = userKeys.filter(key => key);

    const userKeysWithTime = validUserKeys.reduce((acc, key) => {
      acc[key] = {
        grantedAt: moment().format('DD/MM/YYYY HH:mm:ss')
      };
      return acc;
    }, {});

    let updated = false;

    if (itemType === 'folder') {
      const folderIndex = folders.findIndex(f => f.id === itemId);
      if (folderIndex !== -1) {
        folders[folderIndex].keysUserTime = userKeysWithTime;
        updated = true;
      }
    } else if (itemType === 'query') {
      for (const folder of folders) {
        if (!folder.queries) continue;

        const queryIndex = folder.queries.findIndex(q => q.id === itemId);
        if (queryIndex !== -1) {
          folder.queries[queryIndex].keysUserTime = userKeysWithTime;
          updated = true;
          break;
        }
      }
    }

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy folder hoặc query'
      });
    }

    writeFolders(folders);

    res.status(200).json({
      success: true,
      message: 'Cập nhật phân quyền thành công',
      keysUserTime: userKeysWithTime
    });
  } catch (error) {
    console.error('Lỗi phân quyền:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật phân quyền',
      error: error.message
    });
  }
});

router.get('/permissions/:itemId', (req, res) => {
  try {
    const { itemId } = req.params;
    const permissions = readPermissions();

    res.status(200).json({
      message: 'Lấy thông tin phân quyền thnh công',
      permissions: permissions[itemId] || { userKeys: [] }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi khi lấy thông tin phân quyền',
      error: error.message
    });
  }
});

router.get('/folders/:folderId/queries', (req, res) => {
  try {
    const { folderId } = req.params;
    const folders = readFolders();

    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      return res.status(404).json({
        message: 'Không tìm thấy thư mục'
      });
    }

    const queries = folder.queries || [];

    const sortedQueries = queries.sort((a, b) => {
      const getLatestTime = (item) => {
        const modifiedTime = item.lastModifiedAt ? moment(item.lastModifiedAt) : moment(0);
        const createdTime = item.createdAt ? moment(item.createdAt) : moment(0);
        return moment.max(modifiedTime, createdTime);
      };

      const timeA = getLatestTime(a);
      const timeB = getLatestTime(b);

      return timeB.valueOf() - timeA.valueOf();
    });

    res.status(200).json({
      message: 'Lấy danh sách query thành công',
      folder: folder,
      queries: sortedQueries
    });
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi khi ly danh sách query',
      error: error.message
    });
  }
});

router.put('/update/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updatedConnection = req.body;
    const connections = readConnections();

    const connectionIndex = connections.findIndex(conn => conn.id === id);
    if (connectionIndex === -1) {
      return res.status(404).json({
        message: 'Không tìm thấy thông tin kết nối'
      });
    }

    connections[connectionIndex] = {
      ...connections[connectionIndex],
      ...updatedConnection,
      lastModifiedAt: new Date().toISOString()
    };

    writeConnections(connections);

    res.status(200).json({
      message: 'Cập nhật thông tin kết nối thành công.',
      connection: connections[connectionIndex]
    });
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi cập nhật thông tin kết nối.',
      error: error.message
    });
  }
});

router.post('/disconnect/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connections = readConnections();
    const connectionIndex = connections.findIndex(conn => conn.id === id);

    if (connectionIndex === -1) {
      return res.status(404).json({
        message: 'Không tìm thấy thông tin kết nối'
      });
    }

    connections[connectionIndex] = {
      ...connections[connectionIndex],
      connectionStatus: 'disconnected',
      isManuallyDisconnected: true,
      lastChecked: moment().format('YYYY-MM-DD HH:mm:ss'),
      disconnectedAt: moment().format('YYYY-MM-DD HH:mm:ss')
    };

    writeConnections(connections);
    connectionStatus[id] = false;

    res.status(200).json({
      success: true,
      message: 'Ngắt kết nối thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi ngắt kết nối',
      error: error.message
    });
  }
});

router.post('/reconnect/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connections = readConnections();
    const connectionIndex = connections.findIndex(conn => conn.id === id);

    if (connectionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin kết nối'
      });
    }

    const connectionInfo = connections[connectionIndex];
    const testResult = await testSqlConnection(connectionInfo);

    if (testResult.success) {
      connections[connectionIndex] = {
        ...connectionInfo,
        connectionStatus: 'connected',
        isManuallyDisconnected: false,
        lastChecked: moment().format('YYYY-MM-DD HH:mm:ss'),
        disconnectedAt: null,
        errorMessage: null
      };

      writeConnections(connections);
      connectionStatus[id] = true;

      res.status(200).json({
        success: true,
        message: 'Đã kết nối lại thành công',
        lastChecked: moment().format('DD/MM/YYYY HH:mm:ss')
      });
    } else {
      res.status(400).json({
        success: false,
        message: `Lỗi kết nối: ${testResult.error}`
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi kết nối lại',
      error: error.message
    });
  }
});


const executeQueryWithWebSocket = async (connectionId, query, ws) => {
  let pool = null;

  try {
    const connections = readConnections();
    const connection = connections.find(conn => conn.id === connectionId);

    if (!connection) {
      throw new Error('Không tìm thấy thông tin kết nối');
    }

    const config = {
      user: connection.username,
      password: connection.password,
      server: connection.ipAddress,
      database: connection.database,
      options: {
        trustServerCertificate: true,
        encrypt: false,
        enableArithAbort: true,
        requestTimeout: 300000
      }
    };

    if (connection.port) {
      config.port = parseInt(connection.port);
    }

    pool = await new sql.ConnectionPool(config).connect();
    const result = await pool.request().query(query);

    const batchSize = 1000;
    const data = result.recordset || [];
    const totalRows = data.length;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'data',
          data: batch,
          total: totalRows,
          isComplete: i + batchSize >= totalRows
        }));
      }
    }

    if (data.length === 0) {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'data',
          data: [],
          total: 0,
          isComplete: true
        }));
      }
    }

  } catch (error) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message || 'Lỗi khi thực thi query'
      }));
    }
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch {
        // Bỏ qua lỗi đóng kết nối
      }
    }
  }
};

module.exports = router;
module.exports.executeQueryWithWebSocket = executeQueryWithWebSocket;

