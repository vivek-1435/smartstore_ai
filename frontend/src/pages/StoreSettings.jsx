import { useState } from 'react';
import {
  BadgeDollarSign,
  Bot,
  CreditCard,
  Globe2,
  MapPin,
  PackageCheck,
  ReceiptText,
  Save,
  Settings,
  ShieldCheck,
  Store,
  Truck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const StoreSettings = () => {
  const { user, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    storeName: user?.storeName || '',
    legalName: user?.storeName || '',
    supportEmail: user?.email || '',
    storeUrl: 'smartstore.ai/zone-store',
    currency: 'USD',
    timezone: 'Asia/Kolkata',
    address: 'Ahmedabad, Gujarat, India',
    taxId: '',
    inventoryPolicy: 'auto-alert',
    defaultMargin: 32,
    freeShipping: 99,
  });

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const saveSettings = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ storeName: form.storeName });
      toast.success('Store settings updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update store settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page">
      <section className="premium-hero compact">
        <div>
          <span className="hero-eyebrow">Store Settings</span>
          <h2>Configure your commerce workspace</h2>
          <p>Control store identity, payments, shipping, inventory rules, and AI automation settings from one operational page.</p>
        </div>
        <div className="hero-metric">
          <strong>{form.currency}</strong>
          <span>default currency</span>
        </div>
      </section>

      <form onSubmit={saveSettings} className="settings-grid">
        <section className="card settings-card span-2">
          <div className="settings-card-header">
            <div>
              <h3>Store identity</h3>
              <p>Public information customers and team members see across the storefront.</p>
            </div>
            <Store size={20} />
          </div>
          <div className="form-grid two-cols">
            <label>
              <span className="label">Store name</span>
              <input className="input" value={form.storeName} onChange={(event) => updateField('storeName', event.target.value)} />
            </label>
            <label>
              <span className="label">Legal business name</span>
              <input className="input" value={form.legalName} onChange={(event) => updateField('legalName', event.target.value)} />
            </label>
            <label>
              <span className="label">Support email</span>
              <input className="input" value={form.supportEmail} onChange={(event) => updateField('supportEmail', event.target.value)} />
            </label>
            <label>
              <span className="label">Store URL</span>
              <div className="input-with-icon">
                <Globe2 size={16} />
                <input value={form.storeUrl} onChange={(event) => updateField('storeUrl', event.target.value)} />
              </div>
            </label>
            <label className="span-2">
              <span className="label">Business address</span>
              <div className="input-with-icon">
                <MapPin size={16} />
                <input value={form.address} onChange={(event) => updateField('address', event.target.value)} />
              </div>
            </label>
          </div>
        </section>

        <section className="card settings-card">
          <div className="settings-card-header">
            <div>
              <h3>Commerce</h3>
              <p>Pricing, tax, and checkout defaults.</p>
            </div>
            <CreditCard size={20} />
          </div>
          <div className="form-grid">
            <label>
              <span className="label">Currency</span>
              <select className="input" value={form.currency} onChange={(event) => updateField('currency', event.target.value)}>
                <option value="USD">USD - US Dollar</option>
                <option value="INR">INR - Indian Rupee</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - Pound Sterling</option>
              </select>
            </label>
            <label>
              <span className="label">Tax ID</span>
              <input className="input" placeholder="GSTIN / VAT / EIN" value={form.taxId} onChange={(event) => updateField('taxId', event.target.value)} />
            </label>
            <label>
              <span className="label">Target gross margin</span>
              <input className="input" type="number" value={form.defaultMargin} onChange={(event) => updateField('defaultMargin', event.target.value)} />
            </label>
          </div>
        </section>

        <section className="card settings-card">
          <div className="settings-card-header">
            <div>
              <h3>Fulfillment</h3>
              <p>Shipping and inventory operating rules.</p>
            </div>
            <Truck size={20} />
          </div>
          <div className="form-grid">
            <label>
              <span className="label">Inventory policy</span>
              <select className="input" value={form.inventoryPolicy} onChange={(event) => updateField('inventoryPolicy', event.target.value)}>
                <option value="auto-alert">Auto alert when stock is low</option>
                <option value="manual">Manual review only</option>
                <option value="auto-reorder">Auto reorder suggestions</option>
              </select>
            </label>
            <label>
              <span className="label">Free shipping threshold</span>
              <input className="input" type="number" value={form.freeShipping} onChange={(event) => updateField('freeShipping', event.target.value)} />
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
          </div>
        </section>

        <section className="card settings-card span-2">
          <div className="settings-card-header">
            <div>
              <h3>AI automation</h3>
              <p>Choose which AI recommendations SmartStore should prepare for your team.</p>
            </div>
            <Bot size={20} />
          </div>
          <div className="settings-feature-grid">
            <label><input type="checkbox" defaultChecked /> <BadgeDollarSign size={17} /> Pricing recommendations</label>
            <label><input type="checkbox" defaultChecked /> <PackageCheck size={17} /> Inventory suggestions</label>
            <label><input type="checkbox" defaultChecked /> <ReceiptText size={17} /> Weekly sales improvement report</label>
            <label><input type="checkbox" /> <ShieldCheck size={17} /> Require approval before applying AI changes</label>
          </div>
        </section>

        <div className="settings-save-bar">
          <div>
            <Settings size={17} />
            <span>Changes update your live workspace identity and local store preferences.</span>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <div className="spinner" /> : <Save size={16} />}
            Save settings
          </button>
        </div>
      </form>
    </div>
  );
};

export default StoreSettings;
