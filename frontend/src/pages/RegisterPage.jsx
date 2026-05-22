import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import { Store, Eye, EyeOff } from 'lucide-react';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', storeName: '' });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.storeName) {
      return toast.error('Please fill in all fields');
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.storeName);
      toast.success('Store created successfully! 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#202124', color: '#fff', borderRadius: '10px' },
      }} />
      <div className="auth-container">
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56, borderRadius: 16, marginBottom: '1.25rem',
              background: 'linear-gradient(135deg, #4285f4, #1a73e8)',
              boxShadow: '0 8px 24px rgba(26,115,232,0.3)',
            }}>
              <Store size={28} color="white" />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', color: '#202124', letterSpacing: '-0.02em' }}>
              Create Account
            </h1>
            <p style={{ color: '#5f6368', fontSize: '0.9rem' }}>
              Setup your SmartStore AI
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <input
                className="input"
                type="text"
                placeholder="Full Name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                style={{ padding: '0.875rem' }}
              />
            </div>
            <div>
              <input
                className="input"
                type="text"
                placeholder="Store Name"
                value={form.storeName}
                onChange={e => setForm({ ...form, storeName: e.target.value })}
                style={{ padding: '0.875rem' }}
              />
            </div>
            <div>
              <input
                className="input"
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                style={{ padding: '0.875rem' }}
              />
            </div>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type={showPwd ? 'text' : 'password'}
                placeholder="Password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                style={{ paddingRight: '2.5rem', padding: '0.875rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#5f6368',
                }}
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', marginTop: '0.5rem', fontSize: '0.9375rem', borderRadius: '8px' }}
            >
              {loading ? (
                <><div className="spinner" /> Creating account...</>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.875rem', color: '#5f6368' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#1a73e8', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default RegisterPage;
