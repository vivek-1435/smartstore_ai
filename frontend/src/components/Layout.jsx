import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { analyticsAPI } from '../services/api';
import { Toaster } from 'react-hot-toast';

const Layout = () => {
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    analyticsAPI.lowStock()
      .then(r => setLowStockCount(r.data.count || 0))
      .catch(() => {});
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f8f9fa' }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#202124',
            color: '#fff',
            borderRadius: '10px',
            fontSize: '0.875rem',
            boxShadow: '0 4px 16px rgba(60,64,67,0.3)',
          },
          success: { iconTheme: { primary: '#34a853', secondary: '#202124' } },
          error:   { iconTheme: { primary: '#ea4335', secondary: '#202124' } },
        }}
      />
      <Sidebar lowStockCount={lowStockCount} />
      <main style={{ flex: 1, overflowY: 'auto', background: '#f8f9fa' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
