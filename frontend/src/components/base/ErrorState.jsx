import React from 'react';
import { Progress } from 'antd';
import LogoLoad from '../../component/base/LogoLoad';

const ErrorState = () => {
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
          percent={100}
          status="exception"
          strokeColor="#ff4d4f"
        />
        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          color: '#ff4d4f'
        }}>
          Không thể tải thông tin kết nối.
        </div>
      </div>
    </div>
  );
};

export default React.memo(ErrorState); 