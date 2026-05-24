import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { analyticsAPI } from '../services/api';
import { Toaster } from 'react-hot-toast';

const Layout = () => {
  const [lowStockCount, setLowStockCount] = useState(0);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('smartstore_theme') === 'dark');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    analyticsAPI.lowStock()
      .then(r => setLowStockCount(r.data.count || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('smartstore_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = mobileSidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileSidebarOpen]);

  return (
    <div className="app-shell">
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
      <Sidebar
        lowStockCount={lowStockCount}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <div className="app-content">
        <Topbar
          lowStockCount={lowStockCount}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((value) => !value)}
          onMenuClick={() => setMobileSidebarOpen(true)}
        />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
