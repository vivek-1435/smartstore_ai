import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Sparkles, BarChart3, LogOut,
  ChevronLeft, ChevronRight, Zap, AlertTriangle, Store,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',  path: '/dashboard',   color: '#1a73e8' },
  { icon: Package,         label: 'Products',   path: '/products',    color: '#34a853' },
  { icon: Sparkles,        label: 'AI Studio',  path: '/ai-studio',   color: '#fbbc05' },
  { icon: BarChart3,       label: 'Analytics',  path: '/analytics',   color: '#ea4335' },
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

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <aside
      style={{
        width: collapsed ? '72px' : 'var(--sidebar-w, 256px)',
        minWidth: collapsed ? '72px' : 'var(--sidebar-w, 256px)',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        borderRight: '1px solid #e0e0e0',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1), min-width 0.25s cubic-bezier(0.4,0,0.2,1)',
        position: 'relative',
        zIndex: 30,
        overflow: 'hidden',
      }}
    >
      {/* ── Logo / Header ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '1.125rem 1rem',
        borderBottom: '1px solid #f1f3f4',
        minHeight: '64px',
        flexShrink: 0,
      }}>
        <div style={{
          width: 38, height: 38,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #4285f4, #1a73e8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(26,115,232,0.35)',
        }}>
          <Store size={18} color="white" />
        </div>

        {!collapsed && (
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <h1 style={{
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: '#202124',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.01em',
            }}>
              SmartStore
              <span style={{ color: '#1a73e8' }}> AI</span>
            </h1>
            <p style={{
              fontSize: '0.72rem',
              color: '#9aa0a6',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {user?.storeName || 'Your Store'}
            </p>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, padding: '0.75rem 0.625rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {!collapsed && (
          <p className="section-title" style={{ marginBottom: '0.5rem', marginTop: '0.25rem' }}>Menu</p>
        )}

        {navItems.map(({ icon: Icon, label, path, color }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'active' : ''}`
            }
            style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '0.625rem' : '0.6rem 0.875rem' }}
            data-tooltip={collapsed ? label : undefined}
          >
            {({ isActive }) => (
              <>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Icon
                    size={18}
                    style={{ color: isActive ? color : '#5f6368' }}
                    className="sidebar-icon"
                  />
                  {label === 'Products' && lowStockCount > 0 && (
                    <span className="notification-dot" />
                  )}
                </div>
                {!collapsed && (
                  <span style={{ whiteSpace: 'nowrap', flex: 1 }}>{label}</span>
                )}
                {!collapsed && label === 'Products' && lowStockCount > 0 && (
                  <span className="badge badge-danger" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
                    {lowStockCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Low stock alert ── */}
      {!collapsed && lowStockCount > 0 && (
        <div style={{
          margin: '0 0.625rem 0.625rem',
          padding: '0.625rem 0.875rem',
          borderRadius: 10,
          background: '#fef7e0',
          border: '1px solid rgba(251,188,5,0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <AlertTriangle size={14} style={{ color: '#b06000', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b06000' }}>
              {lowStockCount} Low Stock
            </p>
            <p style={{ fontSize: '0.7rem', color: '#9aa0a6' }}>Restock needed</p>
          </div>
        </div>
      )}

      {/* ── User section ── */}
      <div style={{
        borderTop: '1px solid #f1f3f4',
        padding: '0.625rem',
        flexShrink: 0,
      }}>
        {!collapsed && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            padding: '0.625rem 0.75rem',
            borderRadius: 10,
            background: '#f8f9fa',
            marginBottom: '4px',
          }}>
            <div style={{
              width: 32, height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4285f4, #34a853)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}>
              {initials}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#202124', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name}
              </p>
              <p style={{ fontSize: '0.7rem', color: '#9aa0a6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="sidebar-item btn-ghost"
          style={{
            width: '100%',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0.625rem' : '0.6rem 0.875rem',
            color: '#ea4335',
            fontWeight: 500,
          }}
          data-tooltip={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={16} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>

      {/* ── Collapse toggle ── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: 'absolute',
          right: -12,
          top: 76,
          width: 24, height: 24,
          borderRadius: '50%',
          background: '#ffffff',
          border: '1px solid #e0e0e0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 1px 4px rgba(60,64,67,0.2)',
          zIndex: 40,
          transition: 'box-shadow 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(60,64,67,0.3)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(60,64,67,0.2)'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRight size={13} style={{ color: '#5f6368' }} />
          : <ChevronLeft  size={13} style={{ color: '#5f6368' }} />
        }
      </button>
    </aside>
  );
};

export default Sidebar;
