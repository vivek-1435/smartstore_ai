import { useState } from 'react';
import {
  Bell,
  Camera,
  CheckCircle2,
  Clock,
  KeyRound,
  Mail,
  Save,
  ShieldCheck,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const AccountProfile = () => {
  const { user, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('smartstore_account_preferences') || '{}');
    return {
      name: user?.name || '',
      email: user?.email || '',
      avatar: user?.avatar || '',
      phone: saved.phone || '',
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

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        name: form.name,
        avatar: form.avatar,
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
        <form onSubmit={saveProfile} className="card settings-card span-2">
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
              <span className="label">Phone number</span>
              <input className="input" placeholder="+91 98765 43210" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
            </label>
            <label>
              <span className="label">Role</span>
              <select className="input" value={form.role} onChange={(event) => updateField('role', event.target.value)} disabled>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="viewer">Viewer</option>
              </select>
            </label>
            <label>
              <span className="label">Timezone</span>
              <select className="input" value={form.timezone} onChange={(event) => updateField('timezone', event.target.value)}>
                <option value="Asia/Kolkata">Asia/Kolkata</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Asia/Dubai">Asia/Dubai</option>
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
              Save profile
            </button>
          </div>
        </form>

        <section className="card settings-card">
          <div className="settings-card-header">
            <div>
              <h3>Security</h3>
              <p>Protect access to your commerce data.</p>
            </div>
            <ShieldCheck size={20} />
          </div>
          <div className="settings-list">
            <div>
              <KeyRound size={17} />
              <span>Password security</span>
              <strong>Protected</strong>
            </div>
            <div>
              <CheckCircle2 size={17} />
              <span>Two-factor authentication</span>
              <strong>Ready</strong>
            </div>
            <div>
              <Clock size={17} />
              <span>Active session</span>
              <strong>Current browser</strong>
            </div>
          </div>
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
            <label><input type="checkbox" checked={form.alerts.weekly} onChange={(event) => setForm(current => ({ ...current, alerts: { ...current.alerts, weekly: event.target.checked } }))} /> Weekly executive summary</label>
            <label><input type="checkbox" checked={form.alerts.ai} onChange={(event) => setForm(current => ({ ...current, alerts: { ...current.alerts, ai: event.target.checked } }))} /> AI recommendation emails</label>
          </div>
          <div className="mini-note">
            <Mail size={16} />
            Notifications are sent to {form.email || 'your account email'}.
          </div>
        </section>
      </div>
    </div>
  );
};

export default AccountProfile;
