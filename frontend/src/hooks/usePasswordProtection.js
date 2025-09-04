import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import axios from 'axios';

export const usePasswordProtection = (path, keys) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const navigate = useNavigate();

    const checkAccess = useCallback(async () => {
        if (!path) {
            setIsLoading(false);
            return;
        }
        
        try {
            const response = await axios.post('/api/filesystem/check-password',
                { path, keys },
                {
                    headers: {
                        'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
                    }
                }
            );

            if (response.data.hasPassword && !response.data.isAuthorized) {
                message.error('Không có quyền truy cập. Vui lòng nhập mật khẩu từ màn hình chính.');
                navigate('/auth/dashboard/webadmin');
                setIsAuthorized(false);
            } else {
                setIsAuthorized(true);
            }
        } catch (error) {
            console.error('Lỗi kiểm tra quyền truy cập:', error);
            message.error('Có lỗi xảy ra khi kiểm tra quyền truy cập');
            navigate('/auth/dashboard/webadmin');
        } finally {
            setIsLoading(false);
        }
    }, [path, keys, navigate]);

    useEffect(() => {
        checkAccess();
    }, [checkAccess]);

    return { isLoading, isAuthorized };
}; 