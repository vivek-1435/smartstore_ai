import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Edit2, Package, Plus, RefreshCw, Save, Search, ShoppingBag, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { salesAPI } from '../services/api';
import AddSaleModal from '../components/AddSaleModal';
import { useAuth } from '../context/AuthContext';
import VerificationModal from '../components/VerificationModal';

const statusClass = {
  completed: 'badge-success',
  pending: 'badge-warning',
  refunded: 'badge-info',
  cancelled: 'badge-danger',
};

const CHANNELS = ['online', 'in-store', 'mobile', 'marketplace', 'social'];
const STATUSES = ['completed', 'pending', 'refunded', 'cancelled'];

const toDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const saleToEditForm = (sale) => ({
  quantity: sale.quantity || 1,
  unitPrice: sale.unitPrice || 0,
  channel: sale.channel || 'online',
  status: sale.status || 'completed',
  date: toDateInput(sale.date),
  customerName: sale.customer?.name || '',
  customerEmail: sale.customer?.email || '',
  customerLocation: sale.customer?.location || '',
});

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [showMfaDelete, setShowMfaDelete] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [channel, setChannel] = useState('');
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await salesAPI.orders({ search, status, channel, limit: 5000 });
      setOrders(data.data || []);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [search, status, channel]);

  const executeDeleteAll = async () => {
    setLoading(true);
    try {
      await salesAPI.deleteAll();
      setOrders([]);
      toast.success('All orders deleted successfully');
    } catch {
      toast.error('Failed to delete all orders');
    } finally {
      setLoading(false);
      setDeleteAllConfirm(false);
    }
  };

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

  const startEdit = (order) => {
    setEditingId(order._id);
    setEditForm(saleToEditForm(order));
  };

  const setEditField = (key, value) => setEditForm((current) => ({ ...current, [key]: value }));

  const saveEdit = async (id) => {
    setSavingId(id);
    try {
      await salesAPI.update(id, {
        ...editForm,
        quantity: Number(editForm.quantity),
        unitPrice: Number(editForm.unitPrice),
      });
      toast.success('Sale updated');
      setEditingId(null);
      setEditForm(null);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update sale');
    } finally {
      setSavingId(null);
    }
  };

  const deleteOrder = async (id) => {
    if (!window.confirm('Delete this sale record? Analytics will update from the remaining sales.')) return;
    setSavingId(id);
    try {
      await salesAPI.delete(id);
      toast.success('Sale deleted');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete sale');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="dashboard-page">
      <AddSaleModal
        isOpen={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
        onSuccess={fetchOrders}
      />

      <section className="premium-hero compact">
        <div>
          <span className="hero-eyebrow">Orders</span>
          <h2>Sales and fulfillment activity</h2>
          <p>Review real order records from your sales data, filter by status or channel, and track revenue tied to each order.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', width: '100%' }}>
          <div className="hero-metric" style={{ flex: '1 1 200px' }}>
            <strong>{orders.length}</strong>
            <span>orders shown</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginLeft: 'auto' }}>
            {orders.length > 0 && (
              <button
                onClick={() => setDeleteAllConfirm(true)}
                className="btn btn-danger"
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', whiteSpace: 'nowrap' }}
              >
                <Trash2 size={16} /> Delete All
              </button>
            )}
            <button
              onClick={() => setSaleModalOpen(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
            >
              <Plus size={16} /> Add Sale
            </button>
          </div>
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

      {/* Mobile card view (phones) */}
      <div className="mobile-card-list">
        {loading
          ? Array(4).fill(0).map((_, i) => (
              <div key={i} className="order-mobile-card">
                <div style={{ height: 18, width: 200, background: 'var(--surface-alt)', borderRadius: 4 }} className="animate-pulse" />
                <div style={{ height: 14, width: 120, background: 'var(--surface-alt)', borderRadius: 4 }} className="animate-pulse" />
              </div>
            ))
          : orders.length === 0
          ? (
              <div className="card">
                <div className="empty-state">
                  <ShoppingBag size={44} />
                  <p style={{ color: 'var(--text-primary)', fontWeight: 700 }}>No orders found</p>
                  <p>Orders will appear here when sales records exist for this store.</p>
                </div>
              </div>
            )
          : orders.map((order) => (
              <div key={order._id} className="order-mobile-card">
                <div className="order-mobile-card-row">
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{order.productName}</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>#{order._id.slice(-8).toUpperCase()}</p>
                  </div>
                  <span className={`badge ${statusClass[order.status] || 'badge-neutral'}`}>{order.status}</span>
                </div>
                <div className="order-mobile-card-row">
                  <span className="label">Customer</span>
                  <span style={{ fontSize: '0.84rem' }}>{order.customer?.name || 'Guest'}</span>
                </div>
                <div className="order-mobile-card-row">
                  <span className="label">Channel</span>
                  <span className="chip" style={{ fontSize: '0.75rem' }}>{order.channel}</span>
                </div>
                <div className="order-mobile-card-row">
                  <span className="label">Units / Revenue</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{order.quantity} × ${order.revenue?.toLocaleString()}</span>
                </div>
                <div className="order-mobile-card-row">
                  <span className="label">Date</span>
                  <span style={{ fontSize: '0.84rem' }}>{new Date(order.date).toLocaleDateString()}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid var(--border)' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => startEdit(order)}>
                    <Edit2 size={14} /> Edit
                  </button>
                  <button type="button" className="btn btn-danger" style={{ padding: '0.5rem 0.75rem' }} onClick={() => deleteOrder(order._id)} disabled={savingId === order._id}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
      </div>

      <section className="card products-table-wrapper" style={{ overflow: 'hidden' }}>
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0, maxHeight: '68vh', overflow: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Location</th>
                <th>Channel</th>
                <th>Units</th>
                <th>Revenue</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(6).fill(0).map((_, row) => (
                  <tr key={row}>
                    {Array(9).fill(0).map((__, col) => (
                      <td key={col}><div className="animate-pulse" style={{ width: col === 0 ? 150 : 80, height: 16, background: 'var(--surface-alt)', borderRadius: 4 }} /></td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">
                      <ShoppingBag size={44} />
                      <p style={{ color: 'var(--text-primary)', fontWeight: 700 }}>No orders found</p>
                      <p>Orders will appear here when sales records exist for this store.</p>
                    </div>
                  </td>
                </tr>
              ) : orders.map((order) => {
                const isEditing = editingId === order._id;
                const form = isEditing ? editForm : null;
                return (
                  <tr key={order._id}>
                    <td>
                      <p style={{ fontWeight: 700 }}>{order.productName}</p>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>#{order._id.slice(-8).toUpperCase()}</p>
                    </td>
                    <td>
                      {isEditing ? (
                        <div style={{ display: 'grid', gap: '0.35rem', minWidth: 220 }}>
                          <input className="input" value={form.customerName} onChange={(event) => setEditField('customerName', event.target.value)} placeholder="Customer name" />
                          <input className="input" value={form.customerEmail} onChange={(event) => setEditField('customerEmail', event.target.value)} placeholder="Email" />
                        </div>
                      ) : (
                        <>
                          <p>{order.customer?.name || 'Guest customer'}</p>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{order.customer?.email || 'No email on sale'}</p>
                        </>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input className="input" value={form.customerLocation} onChange={(event) => setEditField('customerLocation', event.target.value)} placeholder="Location" style={{ minWidth: 150 }} />
                      ) : order.customer?.location || 'Unknown'}
                    </td>
                    <td>
                      {isEditing ? (
                        <select className="input" value={form.channel} onChange={(event) => setEditField('channel', event.target.value)}>
                          {CHANNELS.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      ) : <span className="chip">{order.channel}</span>}
                    </td>
                    <td>
                      {isEditing ? <input className="input" type="number" min="1" value={form.quantity} onChange={(event) => setEditField('quantity', event.target.value)} style={{ width: 92 }} /> : order.quantity}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {isEditing ? <input className="input" type="number" min="0.01" step="0.01" value={form.unitPrice} onChange={(event) => setEditField('unitPrice', event.target.value)} style={{ width: 110 }} /> : `$${order.revenue?.toLocaleString()}`}
                    </td>
                    <td>
                      {isEditing ? (
                        <select className="input" value={form.status} onChange={(event) => setEditField('status', event.target.value)}>
                          {STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      ) : <span className={`badge ${statusClass[order.status] || 'badge-neutral'}`}>{order.status}</span>}
                    </td>
                    <td>
                      {isEditing ? <input className="input" type="date" value={form.date} onChange={(event) => setEditField('date', event.target.value)} /> : new Date(order.date).toLocaleDateString()}
                    </td>
                    <td>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button type="button" className="btn btn-primary" onClick={() => saveEdit(order._id)} disabled={savingId === order._id} style={{ padding: '0.45rem' }}><Save size={15} /></button>
                          <button type="button" className="btn btn-ghost" onClick={() => { setEditingId(null); setEditForm(null); }} style={{ padding: '0.45rem' }}><X size={15} /></button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button type="button" className="btn btn-secondary" onClick={() => startEdit(order)} style={{ padding: '0.45rem' }}><Edit2 size={15} /></button>
                          <button type="button" className="btn btn-ghost" onClick={() => deleteOrder(order._id)} disabled={savingId === order._id} style={{ padding: '0.45rem', color: 'var(--g-red)' }}><Trash2 size={15} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      {deleteAllConfirm && (
        <div className="modal-overlay" style={{ zIndex: 999 }}>
          <div className="modal-box" style={{ maxWidth: 400, padding: '2rem', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--g-red-light)', color: 'var(--g-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <Trash2 size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Delete ALL Orders?</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>
              Are you sure you want to delete the **entire orders dataset**? This will reset all product sales statistics and **requires MFA verification**.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setDeleteAllConfirm(false)} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
              <button onClick={() => { setDeleteAllConfirm(false); setShowMfaDelete(true); }} className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }}>Verify & Delete</button>
            </div>
          </div>
        </div>
      )}
      <VerificationModal
        isOpen={showMfaDelete}
        onClose={() => setShowMfaDelete(false)}
        onSuccess={() => {
          setShowMfaDelete(false);
          executeDeleteAll();
        }}
        user={user}
      />
    </div>
  );
};

export default Orders;
