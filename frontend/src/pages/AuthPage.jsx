import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Eye, EyeOff, Sparkles, Camera, SkipForward } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import Webcam from 'react-webcam';
import { loadFaceApiModels, getFaceEmbeddingFromVideo } from '../utils/faceApi';
import VerificationModal from '../components/VerificationModal';

const AuthPage = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'face-setup'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', storeName: '', mobileNumber: '' });
  const [modelsLoading, setModelsLoading] = useState(true);
  const [cameraLoading, setCameraLoading] = useState(true);
  const faceLoading = modelsLoading || cameraLoading;
  
  const webcamRef = useRef(null);
  const { register, updateLocalUser, loginPreCheck, loginCommit, loginAbort } = useAuth();
  const navigate = useNavigate();

  const [showMfaModal, setShowMfaModal] = useState(false);
  const [tempUserData, setTempUserData] = useState(null);

  useEffect(() => {
    localStorage.removeItem('smartstore_temp_token');
  }, []);

  useEffect(() => {
    if (mode === 'face-setup') {
      setModelsLoading(true);
      loadFaceApiModels().then((success) => {
        if (!success) toast.error('Failed to load Face AI models');
        setModelsLoading(false);
      });
    }
  }, [mode]);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleMfaSuccess = () => {
    if (tempUserData) {
      loginCommit(tempUserData);
      toast.success('Welcome back! 👋');
      navigate('/');
    }
    setShowMfaModal(false);
    setTempUserData(null);
  };

  const handleMfaClose = () => {
    setShowMfaModal(false);
    setTempUserData(null);
    loginAbort();
  };

  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'login') {
      setLoading(true);
      try {
        const data = await loginPreCheck(form.email, form.password);
        setTempUserData(data);
        setShowMfaModal(true);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Authentication failed');
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        // Step 1: Pre-register account first to validate email and inputs immediately
        await register({ ...form, faceEmbedding: [] });
        // Proceed to optional face setup onboarding
        setMode('face-setup');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Registration failed');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRegisterWithFace = async (embedding = null) => {
    if (!embedding) {
      toast.success('Account created! Welcome to SmartStore AI 🚀');
      navigate('/');
      return;
    }
    setLoading(true);
    try {
      // Step 2: Save the face embedding for the newly registered user
      await authAPI.saveFace({ faceEmbedding: embedding });
      updateLocalUser({ hasFaceRegistered: true });
      toast.success('Face registered! Welcome to SmartStore AI 🚀');
      navigate('/');
    } catch (err) {
      console.error('Face save error:', err);
      toast.error('Could not save face profile. You can set it up later in Settings!');
      navigate('/'); // Navigate to dashboard anyway since the account is successfully created!
    } finally {
      setLoading(false);
    }
  };

  const captureFace = async () => {
    if (!webcamRef.current?.video) return;
    setLoading(true);
    try {
      const embedding = await getFaceEmbeddingFromVideo(webcamRef.current.video);
      if (!embedding) {
        toast.error('No face detected. Please ensure your face is clearly visible.');
        setLoading(false);
        return;
      }
      toast.success('Face registered successfully!');
      await handleRegisterWithFace(embedding);
    } catch (err) {
      console.error('Face capture processing error:', err);
      toast.error('Failed to process face.');
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setForm({ name: '', email: 'demo@smartstore.ai', password: 'demo123456', storeName: '', mobileNumber: '' });
    setMode('login');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: '#f8f9fa' }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem 2rem', borderTop: '4px solid var(--g-blue)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 12, background: 'var(--g-blue-light)', marginBottom: '1rem' }}>
            {mode === 'face-setup' ? <Camera size={24} style={{ color: 'var(--g-blue)' }} /> : <ShoppingCart size={24} style={{ color: 'var(--g-blue)' }} />}
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            {mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create an account' : 'Setup Face Auth'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {mode === 'login' ? 'Sign in to continue to SmartStore' : mode === 'register' ? 'Start your free trial today' : 'Register your face for secure MFA login'}
          </p>
        </div>

        {mode !== 'face-setup' ? (
          <form onSubmit={handleInitialSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {mode === 'register' && (
              <>
                <div>
                  <label className="label">Full Name</label>
                  <input type="text" name="name" value={form.name} onChange={handleChange} className="input" placeholder="John Doe" required />
                </div>
                <div>
                  <label className="label">Store Name</label>
                  <input type="text" name="storeName" value={form.storeName} onChange={handleChange} className="input" placeholder="My Awesome Store" />
                </div>
                <div>
                  <label className="label">Mobile Number</label>
                  <input type="tel" name="mobileNumber" value={form.mobileNumber} onChange={handleChange} className="input" placeholder="+1234567890" required />
                </div>
              </>
            )}

            <div>
              <label className="label">Email address</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} className="input" placeholder="name@example.com" required />
            </div>

            <div>
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="input"
                  style={{ paddingRight: '2.5rem' }}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', padding: '0.25rem', color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem 1rem', fontSize: '1rem', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? <div className="spinner"></div> : (mode === 'login' ? 'Sign In' : 'Continue')}
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: 320, height: 240, background: '#000', borderRadius: 12, overflow: 'hidden' }}>
              {faceLoading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: '0.75rem', background: 'rgba(0,0,0,0.8)', zIndex: 10 }}>
                  <div className="spinner" style={{ width: 24, height: 24 }}></div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                    {modelsLoading ? 'Loading Face AI Models...' : 'Initializing Camera...'}
                  </span>
                </div>
              )}
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "user" }}
                onUserMedia={() => setCameraLoading(false)}
                onUserMediaError={(err) => {
                  console.error('Camera capture error:', err);
                  toast.error('Could not access your camera. Please check browser permissions!');
                  setCameraLoading(false);
                }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ flex: 1, justifyContent: 'center' }} 
                onClick={() => handleRegisterWithFace(null)}
                disabled={loading}
              >
                <SkipForward size={16} /> Skip
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ flex: 2, justifyContent: 'center' }} 
                onClick={captureFace}
                disabled={loading || faceLoading}
              >
                {loading ? <div className="spinner"></div> : (faceLoading ? 'Preparing AI...' : 'Register Face')}
              </button>
            </div>
          </div>
        )}

        {mode !== 'face-setup' && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                style={{ border: 'none', background: 'transparent', color: 'var(--g-blue)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        )}

        {mode === 'login' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
              <span style={{ padding: '0 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>OR</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
            </div>
            <button type="button" onClick={fillDemo} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem 1rem' }}>
              <Sparkles size={16} style={{ color: 'var(--g-blue)' }} />
              Use Demo Account
            </button>
          </>
        )}
      </div>
      <VerificationModal
        isOpen={showMfaModal}
        onClose={handleMfaClose}
        onSuccess={handleMfaSuccess}
        user={tempUserData?.user}
      />
    </div>
  );
};

export default AuthPage;
