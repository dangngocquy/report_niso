import { memo } from 'react';
import { Outlet } from 'react-router-dom';

const AdminWeb = memo(() => (
    <div style={{ padding: '20px' }} className='layout2 yuy'>
        <title>NISO | File Server</title>
        <Outlet />
    </div>
));

AdminWeb.displayName = 'AdminWeb';

export default AdminWeb;
