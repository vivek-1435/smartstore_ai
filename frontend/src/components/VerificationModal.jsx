import { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import toast from 'react-hot-toast';
import { Shield, Camera, MessageSquare, Key, X } from 'lucide-react';
import { loadFaceApiModels, getFaceEmbeddingFromVideo, compareEmbeddings } from '../utils/faceApi';
import { authAPI } from '../services/api';

const VerificationModal = ({ isOpen, onClose, onSuccess, user }) => {
  const [step, setStep] = useState('face'); // 'face', 'otp', 'password'
  const [loading, setLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const webcamRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setStep(user?.hasFaceRegistered ? 'face' : 'otp');
      setOtp('');
      setPassword('');
      if (user?.hasFaceRegistered) {
        loadFaceApiModels().then(success => setModelsLoaded(success));
      }
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleFaceVerify = async () => {
    if (!webcamRef.current?.video) return;
    setLoading(true);
    try {
      const liveEmbedding = await getFaceEmbeddingFromVideo(webcamRef.current.video);
      if (!liveEmbedding) {
        toast.error('No face detected.');
        setLoading(false);
        return;
      }

      // Fetch user's stored embedding securely
      const { data } = await authAPI.getFace();
      const storedEmbedding = data.faceEmbedding;

      if (!storedEmbedding || storedEmbedding.length === 0) {
        toast.error('No face registered. Falling back to OTP.');
        handleFallbackToOTP();
        return;
      }

      const isMatch = compareEmbeddings(liveEmbedding, storedEmbedding, 0.5);
      if (isMatch) {
        toast.success('Face verified successfully!');
        onSuccess();
      } else {
        toast.error('Face does not match. Falling back to OTP.');
        handleFallbackToOTP();
      }
    } catch (err) {
      console.error('Face verification handler error:', err);
      toast.error('Face verification failed.');
      handleFallbackToOTP();
    } finally {
      setLoading(false);
    }
  };

  const handleFallbackToOTP = async () => {
    setStep('otp');
    setLoading(true);
    try {
      await authAPI.sendOTP();
      toast.success('OTP sent to your mobile number.');
    } catch (err) {
      console.error('Send OTP failure error:', err);
      toast.error('Failed to send OTP. Falling back to password.');
      setStep('password');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp) return;
    setLoading(true);
    try {
      await authAPI.verifyOTP({ otp });
      toast.success('OTP verified!');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
      if (err.response?.status === 429) {
         setStep('password');
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyPassword = async () => {
    if (!password) return;
    setLoading(true);
    try {
      await authAPI.verifyPassword({ password });
      toast.success('Password verified!');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', background: 'var(--bg)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <X size={20} />
        </button>

        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', background: 'var(--g-blue-light)', color: 'var(--g-blue)', marginBottom: '1.5rem' }}>
            <Shield size={32} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Security Verification</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
            {step === 'face' ? 'Please verify your face to continue.' : step === 'otp' ? 'Enter the 6-digit OTP sent to your phone.' : 'Enter your password to continue.'}
          </p>

          {step === 'face' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#000', borderRadius: 8, overflow: 'hidden' }}>
                {!modelsLoaded && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading camera...</div>}
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "user" }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <button className="btn btn-primary" onClick={handleFaceVerify} disabled={loading || !modelsLoaded} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? <div className="spinner" /> : <><Camera size={16} /> Verify Face</>}
              </button>
              <button className="btn btn-secondary" onClick={handleFallbackToOTP} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                Use OTP Instead
              </button>
            </div>
          )}

          {step === 'otp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="text"
                placeholder="6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="input"
                style={{ textAlign: 'center', letterSpacing: '0.2em', fontSize: '1.25rem' }}
                maxLength={6}
              />
              <button className="btn btn-primary" onClick={verifyOTP} disabled={loading || otp.length !== 6} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? <div className="spinner" /> : <><MessageSquare size={16} /> Verify OTP</>}
              </button>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button type="button" onClick={handleFallbackToOTP} style={{ background: 'none', border: 'none', color: 'var(--g-blue)', fontSize: '0.875rem', cursor: 'pointer' }} disabled={loading}>
                  Resend OTP
                </button>
                <button type="button" onClick={() => setStep('password')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer' }} disabled={loading}>
                  Use Password
                </button>
              </div>
            </div>
          )}

          {step === 'password' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="password"
                placeholder="Account Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
              />
              <button className="btn btn-primary" onClick={verifyPassword} disabled={loading || !password} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? <div className="spinner" /> : <><Key size={16} /> Verify Password</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerificationModal;
