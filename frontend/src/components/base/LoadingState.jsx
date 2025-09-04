import React from 'react';
import { Progress } from 'antd';
import LogoLoad from '../../component/base/LogoLoad';

const LoadingState = ({ progress, connectionInfo, location }) => {
  return (
    <div style={{display: 'flex', backgroundColor: '#ffffff'}}>
      <div style={{
        padding: '20px',
        maxWidth: '600px',
        margin: '180px auto 0',
        display: 'flex',
        alignItems: 'center',
        flexDirection: 'column',
        height: '100vh'
      }}>
        <LogoLoad />
        <Progress
          percent={progress}
          status={connectionInfo === null && progress === 100 ? "exception" : "active"}
          strokeColor={
            connectionInfo === null && progress === 100
              ? "#ff4d4f"
              : {
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }
          }
        />
        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          color: connectionInfo === null && progress === 100 ? '#ff4d4f' : '#666'
        }}>
          {progress < 30 && 'Đang kiểm tra thông tin kết nối...'}
          {progress >= 30 && progress < 100 && (
            location?.state?.reload ? 'Đang kết nối...' : 'Đang kết nối đến cơ sở dữ liệu...'
          )}
          {progress === 100 && connectionInfo === null && 'Kết nối thất bại.'}
          {progress === 100 && connectionInfo !== null && 'Kết nối thành công.'}
        </div>
      </div>
    </div>
  );
};

export default React.memo(LoadingState); 