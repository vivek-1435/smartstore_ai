import { useState, useRef } from 'react';
import {
  Bell,
  Camera,
  CheckCircle2,
  KeyRound,
  Save,
  ShieldCheck,
  User,
  ScanFace,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import VerificationModal from '../components/VerificationModal';
import Webcam from 'react-webcam';
import { loadFaceApiModels, getFaceEmbeddingFromVideo } from '../utils/faceApi';

const AccountProfile = () => {
  const { user, updateProfile, updateLocalUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'saveProfile', 'updateFace', 'removeFace'
  
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [faceLoading, setFaceLoading] = useState(false);
  const webcamRef = useRef(null);

  const [form, setForm] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('smartstore_account_preferences') || '{}');
    return {
      name: user?.name || '',
      email: user?.email || '',
      avatar: user?.avatar || '',
      phone: user?.mobileNumber || saved.phone || '',
      role: user?.role || 'admin',
      timezone: saved.timezone || 'Asia/Kolkata',
      alerts: {
        sales: saved.alerts?.sales ?? true,
        inventory: saved.alerts?.inventory ?? true,
        weekly: saved.alerts?.weekly ?? false,
        ai: saved.alerts?.ai ?? true,
      },
    };
  });

  const initials = form.name
    ? form.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const executeSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name: form.name,
        avatar: form.avatar,
        mobileNumber: form.phone, // Send the updated mobile number
      });
      localStorage.setItem('smartstore_account_preferences', JSON.stringify({
        phone: form.phone,
        timezone: form.timezone,
        alerts: form.alerts,
      }));
      toast.success('Account profile updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  const executeRemoveFace = async () => {
    setSaving(true);
    try {
      await authAPI.removeFace();
      updateLocalUser({ hasFaceRegistered: false });
      toast.success('Face authentication removed');
    } catch (err) {
      console.error('Remove face auth error:', err);
      toast.error('Failed to remove face auth');
    } finally {
      setSaving(false);
    }
  };

  const handleActionRequest = (action) => {
    setPendingAction(action);
    setShowVerification(true);
  };

  const onVerificationSuccess = () => {
    setShowVerification(false);
    if (pendingAction === 'saveProfile') executeSaveProfile();
    if (pendingAction === 'removeFace') executeRemoveFace();
    if (pendingAction === 'updateFace') {
      setShowFaceCapture(true);
      loadFaceApiModels();
    }
  };

  const captureNewFace = async () => {
    if (!webcamRef.current?.video) return;
    setFaceLoading(true);
    try {
      const embedding = await getFaceEmbeddingFromVideo(webcamRef.current.video);
      if (!embedding) {
        toast.error('No face detected.');
        setFaceLoading(false);
        return;
      }
      await authAPI.saveFace({ faceEmbedding: embedding });
      updateLocalUser({ hasFaceRegistered: true });
      toast.success('New face registered successfully!');
      setShowFaceCapture(false);
    } catch (err) {
      console.error('Capture face save error:', err);
      toast.error('Failed to save face.');
    } finally {
      setFaceLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <section className="premium-hero compact">
        <div>
          <span className="hero-eyebrow">Account Profile</span>
          <h2>Personal workspace details</h2>
          <p>Manage the owner profile, contact details, security posture, and notification preferences for your SmartStore account.</p>
        </div>
        <div className="profile-avatar-panel">
          <div className="profile-avatar-large">
            {form.avatar ? <img src={form.avatar} alt={form.name} /> : initials}
          </div>
          <strong>{form.name || 'Store owner'}</strong>
          <span>{form.email}</span>
        </div>
      </section>

      <div className="settings-grid">
        <form onSubmit={(e) => { e.preventDefault(); handleActionRequest('saveProfile'); }} className="card settings-card span-2">
          <div className="settings-card-header">
            <div>
              <h3>Profile information</h3>
              <p>Keep your account identity accurate for team activity and audit trails.</p>
            </div>
            <User size={20} />
          </div>

          <div className="form-grid two-cols">
            <label>
              <span className="label">Full name</span>
              <input className="input" value={form.name} onChange={(event) => updateField('name', event.target.value)} />
            </label>
            <label>
              <span className="label">Email address</span>
              <input className="input" value={form.email} disabled />
            </label>
            <label>
              <span className="label">Mobile number (for OTP)</span>
              <input className="input" placeholder="+1234567890" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
            </label>
            <label>
              <span className="label">Role</span>
              <select className="input" value={form.role} onChange={(event) => updateField('role', event.target.value)} disabled>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="viewer">Viewer</option>
              </select>
            </label>
            <label className="span-2">
              <span className="label">Avatar image URL</span>
              <div className="input-with-icon">
                <Camera size={16} />
                <input value={form.avatar} onChange={(event) => updateField('avatar', event.target.value)} placeholder="https://example.com/avatar.jpg" />
              </div>
            </label>
          </div>

          <div className="settings-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <div className="spinner" /> : <Save size={16} />}
              Save profile (Requires MFA)
            </button>
          </div>
        </form>

        <section className="card settings-card">
          <div className="settings-card-header">
            <div>
              <h3>Security & MFA</h3>
              <p>Manage Face Authentication and Multi-Factor settings.</p>
            </div>
            <ShieldCheck size={20} />
          </div>
          <div className="settings-list" style={{ marginBottom: '1.5rem' }}>
            <div>
              <ScanFace size={17} style={{ color: user?.hasFaceRegistered ? 'var(--g-green)' : 'var(--text-muted)' }} />
              <span>Face Authentication</span>
              <strong>{user?.hasFaceRegistered ? 'Active' : 'Not Setup'}</strong>
            </div>
            <div>
              <KeyRound size={17} />
              <span>Password security</span>
              <strong>Protected</strong>
            </div>
            <div>
              <CheckCircle2 size={17} />
              <span>SMS OTP</span>
              <strong>{user?.mobileNumber ? 'Ready' : 'Missing Number'}</strong>
            </div>
          </div>

          {showFaceCapture ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#000', borderRadius: 8, overflow: 'hidden' }}>
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "user" }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <button className="btn btn-secondary" onClick={() => setShowFaceCapture(false)} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                <button className="btn btn-primary" onClick={captureNewFace} disabled={faceLoading} style={{ flex: 1, justifyContent: 'center' }}>
                  {faceLoading ? <div className="spinner" /> : 'Save New Face'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => handleActionRequest('updateFace')} style={{ flex: 1, justifyContent: 'center' }}>
                <Camera size={16} /> {user?.hasFaceRegistered ? 'Update Face' : 'Setup Face'}
              </button>
              {user?.hasFaceRegistered && (
                <button className="btn btn-danger" onClick={() => handleActionRequest('removeFace')} style={{ flex: 1, justifyContent: 'center' }}>
                  <Trash2 size={16} /> Remove
                </button>
              )}
            </div>
          )}
        </section>

        <section className="card settings-card">
          <div className="settings-card-header">
            <div>
              <h3>Preferences</h3>
              <p>Choose how account updates reach you.</p>
            </div>
            <Bell size={20} />
          </div>
          <div className="toggle-list">
            <label><input type="checkbox" checked={form.alerts.sales} onChange={(event) => setForm(current => ({ ...current, alerts: { ...current.alerts, sales: event.target.checked } }))} /> Sales alerts</label>
            <label><input type="checkbox" checked={form.alerts.inventory} onChange={(event) => setForm(current => ({ ...current, alerts: { ...current.alerts, inventory: event.target.checked } }))} /> Low inventory alerts</label>
          </div>
        </section>
      </div>

      <VerificationModal 
        isOpen={showVerification} 
        onClose={() => { setShowVerification(false); setPendingAction(null); }} 
        onSuccess={onVerificationSuccess} 
        user={user} 
      />
    </div>
  );
};

export default AccountProfile;
