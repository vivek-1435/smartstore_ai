import { useState, useEffect, useCallback } from 'react';
import { productAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  Plus, Search, Edit2, Trash2, Package, X, ChevronDown,
  Tag, DollarSign, Box, AlertTriangle, CheckCircle,
} from 'lucide-react';

const CATEGORIES = ['Electronics', 'Clothing', 'Food', 'Home & Garden', 'Sports', 'Beauty', 'Books', 'Toys', 'Other'];

const ProductModal = ({ product, onClose, onSaved }) => {
  const isEdit = !!product?._id;
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    category: product?.category || 'Electronics',
    stock: product?.stock || '',
    sku: product?.sku || '',
    tags: product?.tags?.join(', ') || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.stock) return toast.error('Name, price, and stock are required');
    setLoading(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };
      if (isEdit) {
        await productAPI.update(product._id, payload);
        toast.success('Product updated!');
      } else {
        await productAPI.create(payload);
        toast.success('Product created!');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 1.5rem 0' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label">Product Name *</label>
              <input className="input" placeholder="e.g. Wireless Headphones Pro" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Price ($) *</label>
              <input className="input" type="number" min="0" step="0.01" placeholder="0.00"
                value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            </div>
            <div>
              <label className="label">Stock *</label>
              <input className="input" type="number" min="0" placeholder="0"
                value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">SKU</label>
              <input className="input" placeholder="e.g. SKU-001" value={form.sku}
                onChange={e => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label">Description</label>
              <textarea className="input" placeholder="Product description…" rows={3}
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label">Tags (comma separated)</label>
              <input className="input" placeholder="e.g. wireless, audio, premium" value={form.tags}
                onChange={e => setForm({ ...form, tags: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><div className="spinner" /> Saving…</> : <><CheckCircle size={15} /> {isEdit ? 'Update' : 'Create'} Product</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [modal, setModal] = useState(null); // null | 'create' | product object
  const [deleteId, setDeleteId] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await productAPI.getAll({ page, limit: 12, search, category });
      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [page, search, category]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleDelete = async (id) => {
    try {
      await productAPI.delete(id);
      toast.success('Product deleted');
      fetchProducts();
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleteId(null);
    }
  };

  const totalPages = Math.ceil(total / 12);

  return (
    <div>
      {/* Modal */}
      {modal !== null && (
        <ProductModal
          product={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={fetchProducts}
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 360, padding: '2rem', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Trash2 size={22} style={{ color: '#ef4444' }} />
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Delete Product?</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              This action cannot be undone. The product will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Products</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {total} products in your catalog
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setModal('create')}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '1rem 2rem', display: 'flex', gap: '0.75rem', alignItems: 'center', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" placeholder="Search products…"
            value={searchInput} onChange={e => setSearchInput(e.target.value)}
            style={{ paddingLeft: '2.25rem' }} />
        </div>
        <div style={{ position: 'relative' }}>
          <select className="input" value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}
            style={{ minWidth: 160 }}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ padding: '1.5rem 2rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 1rem' }} />
            <p>Loading products…</p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <Package size={40} />
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>No products found</p>
            <p style={{ fontSize: '0.875rem' }}>Add your first product to get started</p>
            <button className="btn btn-primary" onClick={() => setModal('create')} style={{ marginTop: '0.5rem' }}>
              <Plus size={14} /> Add Product
            </button>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p._id}>
                      <td>
                        <div>
                          <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{p.name}</p>
                          {p.sku && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>SKU: {p.sku}</p>}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-info">{p.category}</span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        ${p.price?.toFixed(2)}
                      </td>
                      <td>{p.stock}</td>
                      <td>
                        {p.stock === 0
                          ? <span className="badge badge-danger">Out of Stock</span>
                          : p.stock <= 10
                          ? <span className="badge badge-warning">Low Stock</span>
                          : <span className="badge badge-success">In Stock</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-secondary" onClick={() => setModal(p)}
                            style={{ padding: '0.35rem 0.6rem' }}>
                            <Edit2 size={13} />
                          </button>
                          <button className="btn btn-danger" onClick={() => setDeleteId(p._id)}
                            style={{ padding: '0.35rem 0.6rem' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button className="btn btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '0.4rem 0.75rem' }}>← Prev</button>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
                <button className="btn btn-secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: '0.4rem 0.75rem' }}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;
