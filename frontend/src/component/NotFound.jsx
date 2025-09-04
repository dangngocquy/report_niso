import React, { useCallback } from "react";
import { Result, Button } from "antd";
import { useNavigate } from "react-router-dom";

const NotFound = React.memo(() => {
    const navigate = useNavigate();

    const handleNavigateHome = useCallback(() => {
        navigate('/auth/dashboard/home');
    }, [navigate]);

    return (
        <div>
            <title>Không tìm thấy trang.</title>
            <Result
                icon={<div className="background-notfound" />}
                status="404"
                title="404" 
                subTitle="Xin lỗi, trang bạn truy cập không tồn tại."
                style={{ marginTop: '100px' }}
                extra={
                    <Button type="primary" onClick={handleNavigateHome}>
                        Về trang chủ
                    </Button>
                }
            />
        </div>
    );
});

export default NotFound;