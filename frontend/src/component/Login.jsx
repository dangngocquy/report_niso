import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import Background from '../assets/background.png';
import { Layout, Form, Input, Button, Checkbox } from 'antd';

const Login = ({ handleLogin }) => {
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { Content } = Layout;

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      window.location.href = '/auth/dashboard/home';
      return;
    }

    const isRememberMe = localStorage.getItem('rememberMe') === 'true';
    setRememberMe(isRememberMe);
    if (!isRememberMe) {
      localStorage.clear();
    }
  }, []);

  const onFinish = useCallback(async (values) => {
    const { username, password } = values;

    setLoading(true);
    localStorage.setItem('rememberMe', rememberMe);
    try {
      await handleLogin(username, password, rememberMe);
    } finally {
      setLoading(false);
    }
  }, [handleLogin, rememberMe]);

  const onRememberChange = useCallback((e) => {
    setRememberMe(e.target.checked);
  }, []);

  return (
    <Layout className="center-report-login-niso background__Niso">
      <Helmet>
        <title>Đăng nhập - REPORT NISO</title>
        <meta name="description" content="Trang đăng nhập hệ thống NISO Report" />
      </Helmet>

      <Content className="login-content">
        <div className="containers">
          <title>Đăng nhập - REPORT NISO</title>
          <div className='margin'>
            <Form
              onFinish={onFinish}
              className='box-sign-in'
              initialValues={{ rememberMe: true }}
            >
              <h1 className='color-text'>LOGIN - REPORT NISO</h1>
              <Form.Item
                name="username"
                rules={[{ required: true, message: 'Bạn chưa nhập tài khoản!' }]}
                style={{ textAlign: 'left' }}
              >
                <Input
                  placeholder="Email or username" 
                  autoComplete="on"
                  className='input1'
                  size='large'
                />
              </Form.Item>
              <Form.Item
                name="password"
                rules={[{ required: true, message: 'Bạn chưa nhập mật khẩu !' }]}
                style={{ textAlign: 'left' }}
              >
                <Input.Password
                  placeholder="Password"
                  autoComplete="on"
                  size='large'
                />
              </Form.Item>
              <Form.Item name="rememberMe" valuePropName="checked" style={{ float: 'left', display: 'flex', flexDirection: 'row', justifyContent: 'flex-start' }}>
                <Checkbox onChange={onRememberChange}>
                  Giữ trạng thái đăng nhập
                </Checkbox>
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  style={{ width: '100%' }}
                  size='large'
                  loading={loading}
                >
                  Login
                </Button>
              </Form.Item>
            </Form>
            <img src={Background} alt="Ảnh bìa" className='background' loading="lazy" />
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default React.memo(Login);