import React, { useEffect, useState, Suspense, lazy, useMemo } from 'react';
import axios from './axios';
import { message, ConfigProvider } from 'antd';
import './App.css';
import { ThemeProvider } from 'antd-style';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Loading from './component/Loading';
import QueryList from './component/base/QueryList';
import QueryTabs from './component/base/QueryTabs';
import QueryFileUser from './component/base_user/QueryFileUser';
import QueryListUser from './component/base_user/QueryListUser';
import QueryViewer from './component/base_user/QueryViewer';
import { HelmetProvider } from 'react-helmet-async';


const ProtectedRoute = React.memo(({ children, requireAdmin = false }) => {
  const navigate = useNavigate();
  const storedUsername = localStorage.getItem('username') || sessionStorage.getItem('username');
  const phanquyen = localStorage.getItem('phanquyen') === 'true';

  if (!storedUsername) {
    navigate('/');
    return null;
  }

  if (requireAdmin && !phanquyen) {
    navigate('/auth/dashboard/home');
    return null;
  }

  return children;
});

const lazyComponents = {
  Login: lazy(() => import('./component/Login')),
  Header: lazy(() => import('./component/Header')),
  Body: lazy(() => import('./component/Body')),
  ViewDetail: lazy(() => import('./component/ViewDetail')),
  AddAccount: lazy(() => import('./component/AddAccount')),
  NotFound: lazy(() => import('./component/NotFound')),
  BaseNiso: lazy(() => import('./component/base/BaseNiso')),
  QueryEditor: lazy(() => import('./component/base/QueryEditor')),
  QueryEditorUser: lazy(() => import('./component/base_user/QueryEditorUser')),
  AdminWeb: lazy(() => import('./component/AdminWeb')),
  DriveList: lazy(() => import('./component/webadmin/DriveList')),
  FolderView: lazy(() => import('./component/webadmin/FolderView')),
  FileView: lazy(() => import('./component/webadmin/ReadFile'))
};

const ScrollToTop = React.memo(() => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return null;
});

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

const AppContent = () => {
  const navigate = useNavigate();
  const [state, setState] = useState({
    username: '',
    phanquyen: false,
    password: '',
    name: '',
    keys: '',
    error: ''
  });

  useEffect(() => {
    const storedUsername = localStorage.getItem('username') || sessionStorage.getItem('username');

    if (storedUsername) {
      setState(prev => ({
        ...prev,
        username: localStorage.getItem('username'),
        phanquyen: localStorage.getItem('phanquyen') === 'true',
        name: localStorage.getItem('name'),
        keys: localStorage.getItem('keys')
      }));
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.setItem('scrollPosition', '0');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    const savedScrollPosition = sessionStorage.getItem('scrollPosition');
    if (savedScrollPosition === '0') {
      window.scrollTo(0, 0);
      sessionStorage.removeItem('scrollPosition');
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const username = localStorage.getItem('username');
      const sessionId = localStorage.getItem('sessionId');
      
      if (username && sessionId) {
        try {
          const response = await axios.post('/check-session',
            { username, sessionId },
            {
              headers: {
                'Authorization': `Basic ${btoa(`${process.env.REACT_APP_API_USERNAME}:${process.env.REACT_APP_API_PASSWORD}`)}`
              }
            }
          );

          if (!response.data.valid) {
            message.warning('Tài khoản của bạn đã đăng nhập ở thiết bị khác!', 3);
            handleLogout();
            navigate('/');
          }
        } catch (error) {
          console.error('Session check error:', error);
        }
      }
    };
    checkSession();

    const interval = setInterval(checkSession, 5000);

    const handleFocus = () => {
      checkSession();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [navigate]);

  const handleLogin = async (username, password, rememberMe) => {
    if (!username || !password) {
      message.warning("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!");
      return;
    }

    try {
      // Lấy chữ ký SSL từ client
      const clientSignatureResponse = await axios.post('/sign',
        {
          data: [username, password].join('')
        },
        {
          headers: {
            'Authorization': `Basic ${btoa(`${process.env.REACT_APP_API_USERNAME}:${process.env.REACT_APP_API_PASSWORD}`)}`
          }
        }
      );

      const clientSignature = clientSignatureResponse.data.signature;

      const response = await axios.post(`/login`,
        {
          username,
          password,
          clientSignature
        },
        {
          headers: {
            'Authorization': `Basic ${btoa(`${process.env.REACT_APP_API_USERNAME}:${process.env.REACT_APP_API_PASSWORD}`)}`
          },
          timeout: 10000
        }
      );

      const user = response.data;

      setState(prev => ({
        ...prev,
        name: user.name,
        keys: user.keys,
        phanquyen: user.phanquyen,
        username,
        error: ''
      }));

      const storage = {
        username,
        name: user.name,
        keys: user.keys,
        phanquyen: user.phanquyen.toString(),
        rememberMe: rememberMe.toString(),
        signature: user.signature
      };

      Object.entries(storage).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });

      message.success('Xác minh thành công!', 1, () => {
        const loadingMessage = message.loading('Đang chuyển hướng...', 0);
        setTimeout(() => {
          loadingMessage();
          navigate('/auth/dashboard/home');
        }, 1000);
      });

    } catch (error) {
      console.error(error);
      if (error.response) {
        switch (error.response.status) {
          case 403:
            message.error("Xác thực SSL không hợp lệ!");
            handleLogout();
            navigate('/');
            break;
          case 401:
            message.warning("Tên đăng nhập hoặc mật khẩu không chính xác!");
            break;
          case 429:
            message.error("Quá nhiều lần đăng nhập. Vui lòng thử lại sau.");
            break;
          default:
            message.error("Lỗi đăng nhập, vui lòng thử lại sau.");
        }
      } else if (error.request) {
        message.error("Không thể kết nối đến máy chủ !");
      } else {
        message.error("Đã xảy ra lỗi không xác định !");
      }
    }
  };

  const handleLogout = () => {
    setState({
      username: '',
      password: '',
      phanquyen: false,
      name: '',
      keys: '',
      error: ''
    });
    localStorage.clear();
    sessionStorage.clear();
  };

  const theme = useMemo(() => ({
    token: {
      colorPrimary: '#ae8f3d',
      borderRadius: 4,
    },
    components: {
      Button: {
        colorLink: '#8f732b',
        colorLinkHover: '#ae8f3d',
        colorLinkActive: '#ae8f3d'
      },
      Menu: {
        colorItemBg: '#ffffff',
        colorItemText: '#ae8f3d',
        colorItemTextHover: '#8f732b',
        colorItemSelectedBg: '#f5f5f5',
      },
      Input: {
        colorBorder: '#ae8f3d',
        colorPlaceholder: '#ae8f3d',
      },
      Checkbox: {
        colorPrimary: '#ae8f3d',
        element: {
          width: '100%',
        },
      },
    },
  }), []);

  return (
    <HelmetProvider>
      <ThemeProvider>
        <ConfigProvider theme={theme}>
          <ScrollToTop />
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path='/' element={
                <lazyComponents.Login
                  setUsername={(username) => setState(prev => ({ ...prev, username }))}
                  setPassword={(password) => setState(prev => ({ ...prev, password }))}
                  handleLogin={handleLogin}
                  username={state.username}
                  password={state.password}
                  setError={(error) => setState(prev => ({ ...prev, error }))}
                  phanquyen={state.phanquyen}
                  error={state.error}
                />
              } />

              <Route path='/auth/dashboard' element={
                <ProtectedRoute>
                  <lazyComponents.Header
                    name={state.name}
                    handleLogout={handleLogout}
                    phanquyen={state.phanquyen}
                  />
                </ProtectedRoute>
              }>
                <Route path='home' element={
                  <ProtectedRoute>
                    <lazyComponents.Body phanquyen={state.phanquyen} name={state.name} username={state.username} keys={state.keys} />
                  </ProtectedRoute>
                } />
                <Route path='views/:keys' element={
                  <ProtectedRoute>
                    <lazyComponents.ViewDetail phanquyen={state.phanquyen} keys={state.keys} />
                  </ProtectedRoute>
                } />
                <Route path='account' element={
                  <ProtectedRoute>
                    <lazyComponents.AddAccount />
                  </ProtectedRoute>
                } />

                <Route path='database' element={
                  <ProtectedRoute requireAdmin={true}>
                    <lazyComponents.BaseNiso />
                  </ProtectedRoute>
                } />

                <Route path='database/query/:connectionId' element={
                  <ProtectedRoute requireAdmin={true}>
                    <lazyComponents.QueryEditor phanquyen={state.phanquyen} username={state.username} keysUser={state.keys} />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <ProtectedRoute requireAdmin={true}>
                      <Navigate to="folder" />
                    </ProtectedRoute>
                  } />
                  <Route path="folder/:folderId?" element={
                    <ProtectedRoute requireAdmin={true}>
                      <QueryList />
                    </ProtectedRoute>
                  } />
                  <Route path="query/:queryId" element={
                    <ProtectedRoute requireAdmin={true}>
                      <QueryTabs />
                    </ProtectedRoute>
                  } />
                </Route>

                <Route path='querydata' element={
                  <ProtectedRoute>
                    <lazyComponents.QueryEditorUser phanquyen={state.phanquyen} username={state.username} keys={state.keys} />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <ProtectedRoute>
                      <Navigate to="folder" />
                    </ProtectedRoute>
                  } />
                  <Route path="folder" element={
                    <ProtectedRoute>
                      <QueryListUser keys={state.keys} />
                    </ProtectedRoute>
                  } />
                  <Route path="folder/files/:folderId" element={
                    <ProtectedRoute>
                      <QueryFileUser keys={state.keys} />
                    </ProtectedRoute>
                  } />
                  <Route path="query/:queryId" element={
                    <ProtectedRoute>
                      <QueryViewer keys={state.keys} />
                    </ProtectedRoute>
                  } />
                </Route>

                <Route path='webadmin' element={
                  <ProtectedRoute requireAdmin={true}>
                    <lazyComponents.AdminWeb keys={state.keys} />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <ProtectedRoute requireAdmin={true}>
                      <lazyComponents.DriveList keys={state.keys} />
                    </ProtectedRoute>
                  } />
                  <Route path="folder/:folderId?" element={
                    <ProtectedRoute requireAdmin={true}>
                      <lazyComponents.FolderView keys={state.keys} />
                    </ProtectedRoute>
                  } />
                  <Route path="file/:fileId" element={
                    <ProtectedRoute requireAdmin={true}>
                      <lazyComponents.FileView keys={state.keys} />
                    </ProtectedRoute>
                  } />
                </Route>
              </Route>

              <Route path='*' element={<lazyComponents.NotFound />} />
            </Routes>
          </Suspense>
        </ConfigProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
};

export default React.memo(App);
