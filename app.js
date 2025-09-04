const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn } = require('child_process');
const forge = require('node-forge');
const fs = require('fs');
const https = require('https');

const app = express();

const backendServer = spawn('node', ['backend/server.js'], {
  stdio: 'inherit'
});

backendServer.on('close', (code) => {
  console.log(`Backend server đã đóng với lỗi ${code}`);
});

process.on('SIGTERM', () => {
  backendServer.kill();
  process.exit();
});

const baseProxyConfig = {
  target: 'https://localhost:3002',
  changeOrigin: true,
  secure: false,
  timeout: 60000,
  proxyTimeout: 60000,
  onError: (err, req, res) => {
    console.error('Proxy Error:', err);
    res.status(500).send('Proxy Error');
  },
  hostRewrite: 'checklist.niso.com.vn',
  autoRewrite: true
};

const routes = [
  '/login',
  '/sign',
  '/users/all',
  '/api/connections',
  '/users/get/:keys',
  '/users/add',
  '/users/update/:keys',
  '/users/delete/:keys',
  '/content/all',
  '/content/views/:keys',
  '/content/update/:keys',
  '/content/delete/:keys',
  '/content/add',
  '/api/drives',
  '/api/directory',
  '/api/filesystem/*',
];

routes.forEach(route => {
  app.use(route, createProxyMiddleware({
    ...baseProxyConfig,
    onProxyRes: (proxyRes, req, res) => {
      proxyRes.headers['X-Proxied'] = 'true';
    },
    pathRewrite: {}
  }));
});

app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const pfxFile = fs.readFileSync(path.resolve(__dirname, 'SSL/star-niso-com-vn.pfx'));
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

const PORT = 3000;
const httpsServer = https.createServer({
  key: key,
  cert: cert
}, app);

httpsServer.listen(PORT, () => {
  console.log(`Frontend server đang chạy trên cổng ${PORT} (HTTPS)`);
});

// bảo vệ source
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// Chặn truy cập vào các file map
app.use('*.map', (req, res) => {
  res.status(404).send('Not found');
});
