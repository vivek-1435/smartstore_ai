import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Plus, Search, Edit2, Trash2, Sparkles, Package,
  ChevronUp, ChevronDown, X, Save, AlertTriangle, Image,
  Eye, MessageSquare, Tag
} from 'lucide-react';
import { productAPI, aiAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import VerificationModal from '../components/VerificationModal';

const CATEGORIES = ['Electronics', 'Clothing', 'Home & Garden', 'Beauty', 'Sports', 'Books', 'Toys', 'Food & Beverage', 'Other'];

const emptyForm = {
  name: '', description: '', price: '', comparePrice: '', stock: '',
  lowStockThreshold: 10, category: '', tags: '', imageUrl: '', sku: '', status: 'active',
};

const AIContentBadges = ({ product }) => {
  const items = [
    { key: 'description', label: 'Description', ready: !!product.aiDescription, icon: Sparkles },
    { key: 'seo', label: 'SEO', ready: product.tags?.length > 0 || product.seoKeywords?.length > 0, icon: Tag },
    { key: 'caption', label: 'Caption', ready: !!product.aiCaption, icon: MessageSquare },
  ];

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
      {items.map(({ key, label, ready, icon: Icon }) => (
        <span
          key={key}
          className={`badge ${ready ? 'badge-info' : 'badge-neutral'}`}
          style={{ opacity: ready ? 1 : 0.72, textTransform: 'none', letterSpacing: 0 }}
        >
          <Icon size={11} />
          {label}
        </span>
      ))}
    </div>
  );
};

const ProductDetailsModal = ({ product, onClose, onGenerate }) => {
  if (!product) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 880 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
            <div style={{ width: 56, height: 56, borderRadius: 10, background: 'var(--surface-alt)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Package size={24} style={{ color: 'var(--text-muted)' }} />
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                {product.category} • ${product.price?.toFixed(2)} • {product.stock} in stock
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '0.5rem', borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <section className="card" style={{ padding: '1rem', boxShadow: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={16} style={{ color: 'var(--g-blue)' }} /> AI Description
                </h3>
                <span className={`badge ${product.aiDescription ? 'badge-success' : 'badge-neutral'}`}>
                  {product.aiDescription ? 'Ready' : 'Missing'}
                </span>
              </div>
              {product.aiDescription ? (
                <p style={{ color: 'var(--text-primary)', fontSize: '0.88rem', lineHeight: 1.65, whiteSpace: 'pre-line' }}>{product.aiDescription}</p>
              ) : (
                <div className="empty-state" style={{ padding: '1.25rem', border: '1px dashed var(--border)', borderRadius: 8 }}>
                  <p>No AI description saved yet.</p>
                </div>
              )}
            </section>

            <section className="card" style={{ padding: '1rem', boxShadow: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MessageSquare size={16} style={{ color: 'var(--g-red)' }} /> Marketing Caption
                </h3>
                <span className={`badge ${product.aiCaption ? 'badge-success' : 'badge-neutral'}`}>
                  {product.aiCaption ? 'Ready' : 'Missing'}
                </span>
              </div>
              {product.aiCaption ? (
                <p style={{ color: 'var(--text-primary)', fontSize: '0.88rem', lineHeight: 1.65, whiteSpace: 'pre-line' }}>{product.aiCaption}</p>
              ) : (
                <div className="empty-state" style={{ padding: '1.25rem', border: '1px dashed var(--border)', borderRadius: 8 }}>
                  <p>No marketing caption saved yet.</p>
                </div>
              )}
            </section>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <section className="card" style={{ padding: '1rem', boxShadow: 'none' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Tag size={16} style={{ color: 'var(--g-green)' }} /> SEO & Product Tags
              </h3>
              <p className="label">Product Tags</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {product.tags?.length ? product.tags.map((tag) => <span key={tag} className="chip">{tag}</span>) : <span className="badge badge-neutral">No tags</span>}
              </div>
              <p className="label">SEO Keywords</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {product.seoKeywords?.length ? product.seoKeywords.map((keyword) => (
                  <span key={keyword} className="chip" style={{ background: 'var(--g-green-light)', color: 'var(--g-green)', borderColor: 'rgba(52,168,83,0.3)' }}>{keyword}</span>
                )) : <span className="badge badge-neutral">No keywords</span>}
              </div>
            </section>

            <section className="card" style={{ padding: '1rem', boxShadow: 'none' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>Storefront Content</h3>
              <p className="label">Manual Description</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {product.description || 'No manual description added.'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
                <div>
                  <p className="label">SKU</p>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>{product.sku || 'Not set'}</p>
                </div>
                <div>
                  <p className="label">Status</p>
                  <span className="badge badge-success">{product.status}</span>
                </div>
              </div>
            </section>

            <button onClick={() => onGenerate(product)} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}>
              <Sparkles size={16} /> Generate or Update AI Content
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductModal = ({ product, onClose, onSave }) => {
  const [form, setForm] = useState(product
    ? { ...product, tags: (product.tags || []).join(', '), price: product.price || '', stock: product.stock || '' }
    : emptyForm
  );
  const [loading, setLoading] = useState(false);
  const isEdit = !!product?._id;

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        comparePrice: parseFloat(form.comparePrice) || 0,
        stock: parseInt(form.stock, 10),
        lowStockThreshold: parseInt(form.lowStockThreshold, 10),
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };

      if (isEdit) {
        const { data } = await productAPI.update(product._id, payload);
        onSave(data.data, 'edit');
        toast.success('Product updated!');
      } else {
        const { data } = await productAPI.create(payload);
        onSave(data.data, 'create');
        toast.success('Product created!');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '0.5rem', borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="label">Product Name *</label>
              <input name="name" value={form.name} onChange={handleChange} className="input" placeholder="e.g. Wireless Headphones" required />
            </div>
            <div>
              <label className="label">Price *</label>
              <input type="number" name="price" value={form.price} onChange={handleChange} className="input" placeholder="99.99" step="0.01" min="0" required />
            </div>
            <div>
              <label className="label">Compare Price</label>
              <input type="number" name="comparePrice" value={form.comparePrice} onChange={handleChange} className="input" placeholder="129.99" step="0.01" min="0" />
            </div>
            <div>
              <label className="label">Stock *</label>
              <input type="number" name="stock" value={form.stock} onChange={handleChange} className="input" placeholder="50" min="0" required />
            </div>
            <div>
              <label className="label">Low Stock Alert</label>
              <input type="number" name="lowStockThreshold" value={form.lowStockThreshold} onChange={handleChange} className="input" min="0" />
            </div>
            <div>
              <label className="label">Category *</label>
              <select name="category" value={form.category} onChange={handleChange} className="input" required>
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="input">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="label">SKU</label>
              <input name="sku" value={form.sku} onChange={handleChange} className="input" placeholder="WH-001" />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="label">Image URL</label>
              <input name="imageUrl" value={form.imageUrl} onChange={handleChange} className="input" placeholder="https://..." />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="label">Tags (comma separated)</label>
              <input name="tags" value={form.tags} onChange={handleChange} className="input" placeholder="wireless, audio, premium" />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="label">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} className="input" rows={3} placeholder="Product description..." />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', paddingTop: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: 120, justifyContent: 'center' }}>
              {loading ? <div className="spinner" /> : <><Save size={16} />{isEdit ? 'Update' : 'Create'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AIGeneratorModal = ({ product, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState('description');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [tone, setTone] = useState('professional');
  const [platform, setPlatform] = useState('instagram');
  const [saved, setSaved] = useState(false);

  const generate = async () => {
    setLoading(true);
    setSaved(false);
    try {
      let res;
      if (activeTab === 'description') {
        res = await aiAPI.generateDescription({ productName: product.name, category: product.category, price: product.price, tone });
        setResult(res.data.data);
      } else if (activeTab === 'tags') {
        res = await aiAPI.generateTags({ productName: product.name, category: product.category, description: product.description });
        setResult(res.data.data);
      } else if (activeTab === 'caption') {
        res = await aiAPI.generateCaption({ productName: product.name, category: product.category, price: product.price, platform });
        setResult(res.data.data);
      }
      toast.success('AI content generated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI generation failed');
    } finally {
      setLoading(false);
    }
  };

  const saveToProduct = async () => {
    if (!result) return;
    try {
      const saveData = {};
      if (activeTab === 'description') saveData.aiDescription = result.description;
      if (activeTab === 'tags') { saveData.tags = result.tags; saveData.seoKeywords = result.seoKeywords; }
      if (activeTab === 'caption') saveData.aiCaption = result.captions?.[0]?.text;

      await aiAPI.saveContent(product._id, saveData);
      onSave && onSave();
      setSaved(true);
      toast.success('Saved to product!');
    } catch {
      toast.error('Failed to save content');
    }
  };

  const tabs = ['description', 'tags', 'caption'];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 660 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} style={{ color: 'var(--g-blue)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>AI Content Generator</h2>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '0.5rem', borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Product context */}
          <div style={{ padding: '1rem', borderRadius: '12px', background: 'var(--surface-alt)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={20} style={{ color: 'var(--g-blue)' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{product.name}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{product.category} • ${product.price}</p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--surface-alt)', padding: '0.25rem', borderRadius: '8px' }}>
            {tabs.map(t => (
              <button
                key={t}
                onClick={() => { setActiveTab(t); setResult(null); }}
                style={{
                  flex: 1, padding: '0.5rem 0', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize', border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: activeTab === t ? 'var(--surface)' : 'transparent',
                  color: activeTab === t ? 'var(--g-blue)' : 'var(--text-secondary)',
                  boxShadow: activeTab === t ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {t === 'description' ? '📝 Description' : t === 'tags' ? '🏷️ SEO Tags' : '📣 Caption'}
              </button>
            ))}
          </div>

          {/* Options */}
          {activeTab === 'description' && (
            <div>
              <label className="label">Writing Tone</label>
              <select value={tone} onChange={e => setTone(e.target.value)} className="input">
                {['professional', 'casual', 'luxury', 'playful', 'technical'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          )}
          {activeTab === 'caption' && (
            <div>
              <label className="label">Platform</label>
              <select value={platform} onChange={e => setPlatform(e.target.value)} className="input">
                {['instagram', 'twitter', 'facebook', 'linkedin', 'tiktok'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          )}

          <button onClick={generate} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.9rem' }} disabled={loading}>
            {loading ? <><div className="spinner" /> Generating...</> : <><Sparkles size={16} /> Generate with AI</>}
          </button>

          {/* Result */}
          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="ai-result">
                {activeTab === 'description' && (
                  <p style={{ whiteSpace: 'pre-line' }}>{result.description}</p>
                )}
                {activeTab === 'tags' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--g-blue)', fontWeight: 700, marginBottom: '0.5rem' }}>Product Tags</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {result.tags?.map(t => <span key={t} className="chip">{t}</span>)}
                      </div>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--g-green)', fontWeight: 700, marginBottom: '0.5rem' }}>SEO Keywords</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {result.seoKeywords?.map(k => <span key={k} className="chip" style={{ background: 'var(--g-green-light)', color: 'var(--g-green)', borderColor: 'rgba(52,168,83,0.3)' }}>{k}</span>)}
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'caption' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {result.captions?.map((c, i) => (
                      <div key={i} style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <span className="badge badge-info" style={{ marginBottom: '0.5rem' }}>{c.style}</span>
                        <p style={{ whiteSpace: 'pre-line', fontSize: '0.9rem' }}>{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {product._id && (
                <button onClick={saveToProduct} className={`btn ${saved ? 'btn-success' : 'btn-secondary'}`} style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }} disabled={saved}>
                  {saved ? '✓ Saved to Product' : <><Save size={16} /> Save to Product</>}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Products = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const [products, setProducts] = useState([]);
  const [showMfaDelete, setShowMfaDelete] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => query.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(() => query.get('stock') === 'low');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState(-1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [aiProduct, setAiProduct] = useState(null);
  const [detailsProduct, setDetailsProduct] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      params.sort = `${sortDir === -1 ? '-' : ''}${sortField}`;

      const { data } = await productAPI.getAll(params);
      setProducts(data.data || []);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, sortField, sortDir]);

  const executeDeleteAll = async () => {
    try {
      await productAPI.deleteAll();
      setProducts([]);
      toast.success('All products deleted successfully');
    } catch {
      toast.error('Failed to delete all products');
    } finally {
      setDeleteAllConfirm(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearch(params.get('search') || '');
    setLowStockOnly(params.get('stock') === 'low');
    if (location.pathname === '/add-product') {
      setEditProduct(null);
      setModalOpen(true);
    }
  }, [location.pathname, location.search]);

  const handleDelete = async (id) => {
    try {
      await productAPI.delete(id);
      setProducts(prev => prev.filter(p => p._id !== id));
      setDeleteConfirm(null);
      toast.success('Product deleted');
    } catch {
      toast.error('Failed to delete product');
    }
  };

  const handleSave = (product, mode) => {
    if (mode === 'create') setProducts(prev => [product, ...prev]);
    else setProducts(prev => prev.map(p => p._id === product._id ? product : p));
    setDetailsProduct(current => current?._id === product._id ? product : current);
  };

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d * -1);
    else { setSortField(field); setSortDir(-1); }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) return <ChevronUp size={14} style={{ color: 'var(--border)' }} />;
    return sortDir === -1 ? <ChevronDown size={14} style={{ color: 'var(--g-blue)' }} /> : <ChevronUp size={14} style={{ color: 'var(--g-blue)' }} />;
  };

  const getStatusBadge = (status) => {
    const map = { active: 'badge-success', inactive: 'badge-warning', archived: 'badge-neutral' };
    return `badge ${map[status] || 'badge-info'}`;
  };

  const displayedProducts = lowStockOnly ? products.filter(p => p.isLowStock) : products;
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
  const lowStockCount = products.filter(p => p.isLowStock).length;

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="page-header" style={{ padding: '0 0 1rem 0', background: 'transparent', position: 'static' }}>
        <div className="page-header-row">
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>Products</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              {displayedProducts.length} shown • {products.length} total • ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 0 })} inventory
              {lowStockCount > 0 && <span className="badge badge-warning">⚠️ {lowStockCount} low stock</span>}
            </p>
          </div>
          <div className="page-header-controls" style={{ display: 'flex', gap: '0.75rem' }}>
            {products.length > 0 && (
              <button onClick={() => setDeleteAllConfirm(true)} className="btn btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Trash2 size={16} /> Delete All
              </button>
            )}
            <button onClick={() => { setEditProduct(null); setModalOpen(true); }} className="btn btn-primary">
              <Plus size={16} /> Add Product
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input" style={{ width: 'auto', minWidth: 160 }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input" style={{ width: 'auto', minWidth: 140 }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>
        {lowStockCount > 0 && (
          <button onClick={() => setLowStockOnly(value => !value)} className={`btn ${lowStockOnly ? 'btn-secondary' : 'btn-ghost'}`} style={{ padding: '0.5rem 0.75rem' }}>
            <AlertTriangle size={16} /> Low Stock
          </button>
        )}
        {(search || categoryFilter || statusFilter || lowStockOnly) && (
          <button onClick={() => { setSearch(''); setCategoryFilter(''); setStatusFilter(''); setLowStockOnly(false); navigate('/products', { replace: true }); }} className="btn btn-ghost" style={{ padding: '0.5rem 0.75rem' }}>
            <X size={16} /> Clear
          </button>
        )}
      </div>

      {/* Mobile card view (phones) */}
      <div className="mobile-card-list">
        {loading
          ? Array(4).fill(0).map((_, i) => (
              <div key={i} className="product-mobile-card">
                <div style={{ height: 18, width: 160, background: 'var(--surface-alt)', borderRadius: 4 }} className="animate-pulse" />
                <div style={{ height: 14, width: 100, background: 'var(--surface-alt)', borderRadius: 4 }} className="animate-pulse" />
              </div>
            ))
          : displayedProducts.length === 0
          ? (
              <div className="card">
                <div className="empty-state">
                  <Package size={48} style={{ color: 'var(--text-muted)' }} />
                  <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>No products found</p>
                  <p style={{ fontSize: '0.875rem' }}>Add your first product to start selling.</p>
                </div>
              </div>
            )
          : displayedProducts.map(product => (
              <div key={product._id} className="product-mobile-card">
                <div className="product-mobile-card-header">
                  <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {product.imageUrl
                      ? <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Image size={20} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{product.category}</p>
                    {product.aiDescription && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.68rem', color: 'var(--g-blue)', fontWeight: 600 }}>
                        <Sparkles size={10} /> AI Enhanced
                      </span>
                    )}
                  </div>
                  <span className={getStatusBadge(product.status)}>{product.status}</span>
                </div>
                <div className="product-mobile-card-meta">
                  <div className="product-mobile-card-meta-item">
                    <span className="meta-label">Price</span>
                    <span className="meta-value">${product.price?.toFixed(2)}</span>
                  </div>
                  <div className="product-mobile-card-meta-item">
                    <span className="meta-label">Stock</span>
                    <span className="meta-value" style={{ color: product.isLowStock ? 'var(--g-yellow)' : product.stock === 0 ? 'var(--g-red)' : 'var(--text-primary)' }}>
                      {product.isLowStock && '⚠ '}{product.stock}
                    </span>
                  </div>
                  <div className="product-mobile-card-meta-item">
                    <span className="meta-label">Sales</span>
                    <span className="meta-value">{product.totalSales || 0} units</span>
                  </div>
                  <div className="product-mobile-card-meta-item">
                    <span className="meta-label">Revenue</span>
                    <span className="meta-value">${(product.totalRevenue || 0).toLocaleString()}</span>
                  </div>
                </div>
                <div className="product-mobile-card-actions">
                  <button onClick={() => setDetailsProduct(product)} className="btn btn-secondary"><Eye size={15} /> View</button>
                  <button onClick={() => setAiProduct(product)} className="btn btn-secondary"><Sparkles size={15} /> AI</button>
                  <button onClick={() => { setEditProduct(product); setModalOpen(true); }} className="btn btn-secondary"><Edit2 size={15} /> Edit</button>
                  <button onClick={() => setDeleteConfirm(product._id)} className="btn btn-danger"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
      </div>

      {/* Table (desktop/tablet) */}
      <div className="card products-table-wrapper" style={{ overflow: 'hidden' }}>
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('category')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>Category {renderSortIcon('category')}</div>
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('price')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>Price {renderSortIcon('price')}</div>
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('stock')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>Stock {renderSortIcon('stock')}</div>
                </th>
                <th>Sales</th>
                <th>Status</th>
                <th>AI Content</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(8).fill(0).map((_, j) => (
                      <td key={j}><div style={{ height: 16, width: j===0 ? 120 : 60, background: 'var(--surface-alt)', borderRadius: 4 }} className="animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : displayedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <Package size={48} style={{ color: 'var(--text-muted)' }} />
                      <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>No products found</p>
                      <p style={{ fontSize: '0.875rem' }}>Add your first product to start selling.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedProducts.map(product => (
                  <tr key={product._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Image size={20} style={{ color: 'var(--text-muted)' }} />
                          )}
                        </div>
                        <div>
                          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{product.name}</p>
                          {product.sku && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>SKU: {product.sku}</p>}
                          {product.aiDescription && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--g-blue)', marginTop: '0.125rem', fontWeight: 600 }}>
                              <Sparkles size={10} /> AI Enhanced
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="chip">{product.category}</span>
                    </td>
                    <td>
                      <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>${product.price?.toFixed(2)}</p>
                      {product.comparePrice > product.price && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textDecoration: 'line-through' }}>${product.comparePrice?.toFixed(2)}</p>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        {product.isLowStock && <AlertTriangle size={14} style={{ color: 'var(--g-yellow)' }} />}
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: product.isLowStock ? 'var(--g-yellow)' : product.stock === 0 ? 'var(--g-red)' : 'var(--text-primary)' }}>
                          {product.stock}
                        </span>
                      </div>
                    </td>
                    <td>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{product.totalSales || 0}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>${(product.totalRevenue || 0).toLocaleString()}</p>
                    </td>
                    <td>
                      <span className={getStatusBadge(product.status)}>{product.status}</span>
                    </td>
                    <td>
                      <AIContentBadges product={product} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <button onClick={() => setDetailsProduct(product)} className="btn-ghost" style={{ padding: '0.375rem', borderRadius: 8, color: 'var(--text-secondary)' }} data-tooltip="View Details">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => setAiProduct(product)} className="btn-ghost" style={{ padding: '0.375rem', borderRadius: 8, color: 'var(--g-blue)' }} data-tooltip="AI Enhance">
                          <Sparkles size={16} />
                        </button>
                        <button onClick={() => { setEditProduct(product); setModalOpen(true); }} className="btn-ghost" style={{ padding: '0.375rem', borderRadius: 8 }} data-tooltip="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => setDeleteConfirm(product._id)} className="btn-ghost" style={{ padding: '0.375rem', borderRadius: 8, color: 'var(--g-red)' }} data-tooltip="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {modalOpen && (
        <ProductModal
          product={editProduct}
          onClose={() => { setModalOpen(false); setEditProduct(null); }}
          onSave={handleSave}
        />
      )}
      {aiProduct && (
        <AIGeneratorModal
          product={aiProduct}
          onClose={() => setAiProduct(null)}
          onSave={fetchProducts}
        />
      )}
      {detailsProduct && (
        <ProductDetailsModal
          product={products.find(p => p._id === detailsProduct._id) || detailsProduct}
          onClose={() => setDetailsProduct(null)}
          onGenerate={(product) => {
            setDetailsProduct(null);
            setAiProduct(product);
          }}
        />
      )}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 400, padding: '2rem', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--g-red-light)', color: 'var(--g-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <Trash2 size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Delete Product?</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>This action cannot be undone. Are you sure you want to remove this product?</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {deleteAllConfirm && (
        <div className="modal-overlay" style={{ zIndex: 999 }}>
          <div className="modal-box" style={{ maxWidth: 400, padding: '2rem', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--g-red-light)', color: 'var(--g-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <Trash2 size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Delete ALL Products?</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>
              Are you sure you want to delete the **entire products dataset**? This action cannot be undone and **requires MFA verification**.
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

export default Products;
