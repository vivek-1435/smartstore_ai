import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  LogOut,
  Moon,
  PackagePlus,
  Search,
  Settings,
  Store,
  Sun,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const pageMeta = {
  '/': ['Dashboard', 'Revenue, product performance, growth signals, and AI recommendations'],
  '/products': ['Products', 'Manage catalog, pricing, stock, and AI-generated content'],
  '/add-product': ['Add Product', 'Create a new product and enrich it with AI'],
  '/ai-insights': ['AI Sales Insights', 'Pricing, inventory, trend predictions, and sales advice'],
  '/analytics': ['Analytics', 'Track revenue trends, channels, categories, and product movement'],
  '/orders': ['Orders', 'Monitor fulfillment, revenue, and order activity'],
  '/customers': ['Customers', 'Understand buyers, loyalty, and customer value'],
  '/profile': ['Account Profile', 'Manage your identity, contact details, access, and preferences'],
  '/settings': ['Settings', 'Configure your store workspace and preferences'],
};

const Topbar = ({ lowStockCount = 0, darkMode = false, onToggleDarkMode }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const [title, subtitle] = pageMeta[location.pathname] || pageMeta['/'];
  const initials = user?.name
    ? user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  return (
    <header className="premium-topbar">
      <div className="topbar-title">
        <span>SmartStore AI</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="topbar-actions">
        <div className="topbar-store-name" title={user?.storeName || 'Your Store'}>
          <Store size={16} />
          <span>{user?.storeName || 'Your Store'}</span>
        </div>

        <div className="topbar-search">
          <Search size={16} />
          <input
            placeholder="Search products, orders, customers..."
            onKeyDown={(event) => {
              if (event.key === 'Enter' && event.currentTarget.value.trim()) navigate('/products');
            }}
          />
        </div>

        <Link to="/add-product" className="icon-text-button">
          <PackagePlus size={16} />
          <span>Add Product</span>
        </Link>

        <button type="button" onClick={onToggleDarkMode} className="icon-button" data-tooltip={darkMode ? 'Light mode' : 'Dark mode'}>
          {darkMode ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button type="button" className="icon-button" data-tooltip={lowStockCount ? `${lowStockCount} low stock alerts` : 'Notifications'}>
          <Bell size={17} />
          {lowStockCount > 0 && <span className="notification-dot" />}
        </button>

        <div className="account-menu">
          <button type="button" onClick={() => setAccountOpen((open) => !open)} className="avatar-button">
            <span>{initials}</span>
            <ChevronDown size={14} />
          </button>

          {accountOpen && (
            <div className="account-popover card">
              <div className="account-heading">
                <span className="avatar-large">{initials}</span>
                <div>
                  <strong>{user?.name || 'Store owner'}</strong>
                  <p>{user?.email}</p>
                </div>
              </div>
              <Link to="/profile" className="sidebar-item btn-ghost" onClick={() => setAccountOpen(false)}>
                <User size={16} /> Account profile
              </Link>
              <Link to="/settings" className="sidebar-item btn-ghost" onClick={() => setAccountOpen(false)}>
                <Settings size={16} /> Store settings
              </Link>
              <button type="button" onClick={handleLogout} className="sidebar-item btn-ghost account-logout">
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
