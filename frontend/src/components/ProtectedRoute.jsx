import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading SmartStore AI…</p>
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
