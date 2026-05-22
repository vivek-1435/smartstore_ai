import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, MapPin, RefreshCw, Search, ShoppingBag, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { salesAPI } from '../services/api';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await salesAPI.customers({ search });
      setCustomers(data.data || []);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchCustomers, 250);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  const summary = useMemo(() => {
    const revenue = customers.reduce((sum, customer) => sum + (customer.revenue || 0), 0);
    const orders = customers.reduce((sum, customer) => sum + (customer.orders || 0), 0);
    return { revenue, orders };
  }, [customers]);

  return (
    <div className="dashboard-page">
      <section className="premium-hero compact">
        <div>
          <span className="hero-eyebrow">Customers</span>
          <h2>Buyer history and value</h2>
          <p>Customer records are generated from real sales that include customer email data. Search and review order count, revenue, and last purchase date.</p>
        </div>
        <div className="hero-metric">
          <strong>{customers.length}</strong>
          <span>customers found</span>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="stat-card" style={{ '--accent-color': 'var(--g-blue)' }}>
          <Users size={22} style={{ color: 'var(--g-blue)', marginBottom: '1rem' }} />
          <p style={{ fontSize: '1.6rem', fontWeight: 800 }}>{customers.length}</p>
          <p style={{ color: 'var(--text-secondary)' }}>Known customers</p>
        </div>
        <div className="stat-card" style={{ '--accent-color': 'var(--g-green)' }}>
          <ShoppingBag size={22} style={{ color: 'var(--g-green)', marginBottom: '1rem' }} />
          <p style={{ fontSize: '1.6rem', fontWeight: 800 }}>{summary.orders}</p>
          <p style={{ color: 'var(--text-secondary)' }}>Customer orders</p>
        </div>
        <div className="stat-card" style={{ '--accent-color': 'var(--g-yellow)' }}>
          <Mail size={22} style={{ color: '#b06000', marginBottom: '1rem' }} />
          <p style={{ fontSize: '1.6rem', fontWeight: 800 }}>${summary.revenue.toLocaleString()}</p>
          <p style={{ color: 'var(--text-secondary)' }}>Customer revenue</p>
        </div>
      </div>

      <section className="card" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers..." style={{ paddingLeft: '2.5rem' }} />
        </div>
        {search && (
          <button type="button" onClick={() => setSearch('')} className="btn btn-ghost">
            <X size={16} /> Clear
          </button>
        )}
        <button type="button" onClick={fetchCustomers} className="btn btn-secondary" disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spinner' : ''} /> Refresh
        </button>
      </section>

      <section className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Location</th>
                <th>Orders</th>
                <th>Units</th>
                <th>Revenue</th>
                <th>Last Order</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(6).fill(0).map((_, row) => (
                  <tr key={row}>
                    {Array(6).fill(0).map((__, col) => (
                      <td key={col}><div className="animate-pulse" style={{ width: col === 0 ? 150 : 80, height: 16, background: 'var(--surface-alt)', borderRadius: 4 }} /></td>
                    ))}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <Users size={44} />
                      <p style={{ color: 'var(--text-primary)', fontWeight: 700 }}>No customer records found</p>
                      <p>Add customer details to sales records and they will appear here automatically.</p>
                    </div>
                  </td>
                </tr>
              ) : customers.map((customer) => (
                <tr key={customer.email}>
                  <td>
                    <p style={{ fontWeight: 700 }}>{customer.name || 'Unnamed customer'}</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{customer.email}</p>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                      {customer.location || 'Unknown'}
                    </span>
                  </td>
                  <td>{customer.orders}</td>
                  <td>{customer.units}</td>
                  <td style={{ fontWeight: 700 }}>${customer.revenue?.toLocaleString()}</td>
                  <td>{customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString() : 'No date'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Customers;
