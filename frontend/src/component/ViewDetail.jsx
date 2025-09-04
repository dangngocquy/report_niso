import React, { useState, useEffect, useMemo } from 'react';
import axios from '../axios';
import { useParams } from 'react-router-dom';
import { Spin } from 'antd';

const ViewDetail = () => {
  const { keys } = useParams();
  const [department, setDepartment] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDepartment = useMemo(() => async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/content/views/${keys}`, {
        headers: {
          'Authorization': `Basic ${btoa(process.env.REACT_APP_API_USERNAME)}`
        }
      });
      setDepartment(response.data.data);
    } catch (error) {
      setError(error.message || 'An error occurred while fetching data');
    } finally {
      setIsLoading(false);
    }
  }, [keys]);

  useEffect(() => {
    fetchDepartment();
  }, [fetchDepartment]);

  const renderContent = useMemo(() => {
    if (error) return <p>Error: {error}</p>;
    if (!department) return <p>Loading...</p>;

    return (
      <div>
        <title>NISO - {department.title}</title>
        <iframe
          src={department.link}
          title="Preview"
          className='view_details'
          loading="lazy"
        />
      </div>
    );
  }, [department, error]);

  return (
    <Spin spinning={isLoading} tip="Đang tải dữ liệu..." style={{marginTop: '16px'}}>
      <div className='hidden-niso'>
        {renderContent}
      </div>
    </Spin>
  );
};

export default React.memo(ViewDetail);
