import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bot,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Package,
  PackagePlus,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', end: true },
  { icon: Package, label: 'Products', path: '/products', badgeKey: 'lowStock' },
  { icon: PackagePlus, label: 'Add Product', path: '/add-product' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: Bot, label: 'AI Insights', path: '/ai-insights' },
  { icon: ShoppingBag, label: 'Orders', path: '/orders' },
  { icon: Users, label: 'Customers', path: '/customers' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const Sidebar = ({ lowStockCount = 0 }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  return (
    <aside className={`premium-sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-mark">
          <Store size={20} />
        </div>
        {!collapsed && (
          <div className="brand-copy">
            <strong>SmartStore AI</strong>
            <span>{user?.storeName || 'Premium commerce'}</span>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {!collapsed && <p className="section-title">Workspace</p>}
        {navItems.map(({ icon: Icon, label, path, end, badgeKey }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            data-tooltip={collapsed ? label : undefined}
          >
            <span className="sidebar-icon-wrap">
              <Icon size={18} />
              {badgeKey === 'lowStock' && lowStockCount > 0 && <span className="notification-dot" />}
            </span>
            {!collapsed && <span className="sidebar-label">{label}</span>}
            {!collapsed && badgeKey === 'lowStock' && lowStockCount > 0 && (
              <span className="badge badge-danger">{lowStockCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {!collapsed && (
        <div className="sidebar-insight">
          <Sparkles size={16} />
          <p>Open AI Insights to generate recommendations from your current products and sales data.</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleLogout}
        className="sidebar-item sidebar-logout"
        data-tooltip={collapsed ? 'Logout' : undefined}
      >
        <LogOut size={18} />
        {!collapsed && <span className="sidebar-label">Logout</span>}
      </button>

      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="sidebar-collapse"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
};

export default Sidebar;
