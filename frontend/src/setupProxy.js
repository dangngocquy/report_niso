const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  const baseProxyConfig = {
    target: 'https://localhost:3001',
    changeOrigin: true,
    secure: false 
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
      pathRewrite: {
        // '^/sign': '/api/sign'
      },
    }));
  });
};