const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const usersAccount = require('./account');
const loginUser = require('./loginUser');
const Content = require('./add_content');
const baseNisoRouter = require('./baseniso');
const fileSystem = require('./fileSystem');
const forge = require('node-forge');
const crypto = require('crypto');

const pfxFile = fs.readFileSync(path.resolve(__dirname, '../SSL/star-niso-com-vn.pfx'));
const p12Asn1 = forge.asn1.fromDer(pfxFile.toString('binary'), false);
const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, '123456'); 
let cert, key;
for (const safeContents of p12.safeContents) {
  for (const safeBag of safeContents.safeBags) {
    if (safeBag.cert) {
      cert = forge.pki.certificateToPem(safeBag.cert);
    } else if (safeBag.key) {
      key = forge.pki.privateKeyToPem(safeBag.key);
    }
  }
}

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
const port = 3001;

// Cấu hình SSL
const sslOptions = {
  key: key,
  cert: cert,
  passphrase: '123456'
};

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    return res.status(200).json({});
  }
  next();
});

const basicAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ message: 'Tính hack hay gì ? ! 😈' });
    return;
  }
  const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
  const username = auth[0];
  const password = auth[1];

  if (username === 'Niso' && password === 'Niso@123') {
    next();
  } else {
    res.status(401).json({ message: 'Thông tin đăng nhập không chính xác' });
  }
};

//login users
app.post('/login', loginUser.postLoginUser);

// CRUD LOGIN
app.get('/users/all', basicAuth, usersAccount.getusersAccount);
app.get('/users/get/:keys', basicAuth, usersAccount.getusersAccountID);
app.post('/users/add', basicAuth, usersAccount.postusersAccount);
app.put('/users/update/:keys', basicAuth, usersAccount.putusersAccount);
app.delete('/users/delete/:keys', basicAuth, usersAccount.deleteusersAccount);

// CRUD nội dung
app.get('/content/all', basicAuth, Content.getTableAData);
app.get('/content/views/:keys', basicAuth, Content.getDepartmentById);
app.put('/content/update/:keys', basicAuth, Content.editTableAData);
app.delete('/content/delete/:keys', basicAuth, Content.deleteTableAData);
app.post('/content/add', basicAuth, Content.addDepartment);

// baseNiso
app.use('/api/connections', basicAuth, baseNisoRouter);

// File System APIs
app.get('/api/filesystem/drives', basicAuth, fileSystem.getDrives);
app.get('/api/filesystem/folders', basicAuth, fileSystem.getDirectoryContents);
app.get('/api/filesystem/readfile', basicAuth, fileSystem.readFileContent);
app.get('/api/filesystem/search', fileSystem.searchFiles);
app.get('/api/filesystem/execute', basicAuth, fileSystem.executeFile);
app.post('/api/filesystem/savefile', basicAuth, fileSystem.saveFileContent);
app.post('/api/filesystem/create-folder', basicAuth, fileSystem.createFolder);
app.post('/api/filesystem/create-file', basicAuth, fileSystem.createFile);
app.post('/api/filesystem/delete', basicAuth, fileSystem.deleteItem);
app.post('/api/filesystem/save-password', basicAuth, fileSystem.savePasswordToJson);
app.post('/api/filesystem/check-password', basicAuth, fileSystem.checkPassword);
app.post('/api/filesystem/remove-password', basicAuth, fileSystem.removePassword);

app.post('/sign', basicAuth, (req, res) => {
  try {
    const { data } = req.body;
    const privateKeyPath = path.resolve(__dirname, '../SSL/private_key.pem');
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

    const sign = crypto.createSign('SHA256');
    sign.update(data);
    const signature = sign.sign(privateKey, 'base64');

    console.log('Data được ký:', data);
    console.log('Chữ ký được tạo:', signature);

    res.json({ signature });
  } catch (error) {
    console.error('Lỗi ký dữ liệu:', error);
    res.status(500).json({ message: 'Lỗi ký dữ liệu' });
  }
});


const httpsServer = https.createServer(sslOptions, app);

httpsServer.on('error', (error) => {
  console.error('Lỗi khởi tạo HTTPS server:', error);
});

httpsServer.listen(port, () => {
  console.log(`REST API BACKEND REPORT NISO RUN PORT ${port}`);
});

app.use((err, req, res, next) => {
  console.error('Lỗi server:', err);
  res.status(500).json({
    message: 'Đã xảy ra lỗi server',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
