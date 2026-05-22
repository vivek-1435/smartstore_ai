import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Package, RefreshCw, Search, ShoppingBag, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { salesAPI } from '../services/api';

const statusClass = {
  completed: 'badge-success',
  pending: 'badge-warning',
  refunded: 'badge-info',
  cancelled: 'badge-danger',
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [channel, setChannel] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await salesAPI.orders({ search, status, channel, limit: 100 });
      setOrders(data.data || []);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [search, status, channel]);

  useEffect(() => {
    const timer = setTimeout(fetchOrders, 250);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  const summary = useMemo(() => {
    const revenue = orders.reduce((sum, order) => sum + (order.revenue || 0), 0);
    const units = orders.reduce((sum, order) => sum + (order.quantity || 0), 0);
    return { revenue, units };
  }, [orders]);

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setChannel('');
  };

  return (
    <div className="dashboard-page">
      <section className="premium-hero compact">
        <div>
          <span className="hero-eyebrow">Orders</span>
          <h2>Sales and fulfillment activity</h2>
          <p>Review real order records from your sales data, filter by status or channel, and track revenue tied to each order.</p>
        </div>
        <div className="hero-metric">
          <strong>{orders.length}</strong>
          <span>orders shown</span>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="stat-card" style={{ '--accent-color': 'var(--g-blue)' }}>
          <ShoppingBag size={22} style={{ color: 'var(--g-blue)', marginBottom: '1rem' }} />
          <p style={{ fontSize: '1.6rem', fontWeight: 800 }}>{orders.length}</p>
          <p style={{ color: 'var(--text-secondary)' }}>Matching orders</p>
        </div>
        <div className="stat-card" style={{ '--accent-color': 'var(--g-green)' }}>
          <Package size={22} style={{ color: 'var(--g-green)', marginBottom: '1rem' }} />
          <p style={{ fontSize: '1.6rem', fontWeight: 800 }}>{summary.units}</p>
          <p style={{ color: 'var(--text-secondary)' }}>Units sold</p>
        </div>
        <div className="stat-card" style={{ '--accent-color': 'var(--g-yellow)' }}>
          <CalendarClock size={22} style={{ color: '#b06000', marginBottom: '1rem' }} />
          <p style={{ fontSize: '1.6rem', fontWeight: 800 }}>${summary.revenue.toLocaleString()}</p>
          <p style={{ color: 'var(--text-secondary)' }}>Revenue shown</p>
        </div>
      </div>

      <section className="card" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product or customer..." style={{ paddingLeft: '2.5rem' }} />
        </div>
        <select className="input" value={status} onChange={(event) => setStatus(event.target.value)} style={{ width: 'auto', minWidth: 150 }}>
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="refunded">Refunded</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="input" value={channel} onChange={(event) => setChannel(event.target.value)} style={{ width: 'auto', minWidth: 150 }}>
          <option value="">All Channels</option>
          <option value="online">Online</option>
          <option value="in-store">In-store</option>
          <option value="mobile">Mobile</option>
          <option value="marketplace">Marketplace</option>
          <option value="social">Social</option>
        </select>
        {(search || status || channel) && (
          <button type="button" onClick={clearFilters} className="btn btn-ghost">
            <X size={16} /> Clear
          </button>
        )}
        <button type="button" onClick={fetchOrders} className="btn btn-secondary" disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spinner' : ''} /> Refresh
        </button>
      </section>

      <section className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Channel</th>
                <th>Units</th>
                <th>Revenue</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(6).fill(0).map((_, row) => (
                  <tr key={row}>
                    {Array(7).fill(0).map((__, col) => (
                      <td key={col}><div className="animate-pulse" style={{ width: col === 0 ? 150 : 80, height: 16, background: 'var(--surface-alt)', borderRadius: 4 }} /></td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <ShoppingBag size={44} />
                      <p style={{ color: 'var(--text-primary)', fontWeight: 700 }}>No orders found</p>
                      <p>Orders will appear here when sales records exist for this store.</p>
                    </div>
                  </td>
                </tr>
              ) : orders.map((order) => (
                <tr key={order._id}>
                  <td>
                    <p style={{ fontWeight: 700 }}>{order.productName}</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>#{order._id.slice(-8).toUpperCase()}</p>
                  </td>
                  <td>
                    <p>{order.customer?.name || 'Guest customer'}</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{order.customer?.email || 'No email on sale'}</p>
                  </td>
                  <td><span className="chip">{order.channel}</span></td>
                  <td>{order.quantity}</td>
                  <td style={{ fontWeight: 700 }}>${order.revenue?.toLocaleString()}</td>
                  <td><span className={`badge ${statusClass[order.status] || 'badge-neutral'}`}>{order.status}</span></td>
                  <td>{new Date(order.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Orders;
