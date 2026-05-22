import { useState, useEffect } from 'react';
import { aiAPI, productAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  Sparkles, FileText, Tag, Megaphone, ChevronDown, Copy,
  CheckCheck, Loader2, Package, Search,
} from 'lucide-react';

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
      {copied ? <><CheckCheck size={12} style={{ color: '#10b981' }} /> Copied</> : <><Copy size={12} /> Copy</>}
    </button>
  );
};

const ResultBox = ({ label, content, onSave, saving }) => (
  <div style={{ marginTop: '1rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
      <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <CopyButton text={content} />
        {onSave && (
          <button onClick={onSave} className="btn btn-success" disabled={saving}
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
            {saving ? <><div className="spinner" style={{ width: 10, height: 10 }} /> Saving…</> : '💾 Save to Product'}
          </button>
        )}
      </div>
    </div>
    <div className="ai-result">{content}</div>
  </div>
);

const AIContentPage = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [activeTab, setActiveTab] = useState('description');
  const [results, setResults] = useState({ description: '', tags: [], caption: '' });
  const [loading, setLoading] = useState({ description: false, tags: false, caption: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    productAPI.getAll({ limit: 100 }).then(r => setProducts(r.data.products || []));
  }, []);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const generate = async (type) => {
    if (!selectedProduct) return toast.error('Select a product first');
    setLoading(l => ({ ...l, [type]: true }));
    try {
      let data;
      if (type === 'description') {
        ({ data } = await aiAPI.generateDescription({
          name: selectedProduct.name,
          category: selectedProduct.category,
          tags: selectedProduct.tags,
        }));
        setResults(r => ({ ...r, description: data.description }));
      } else if (type === 'tags') {
        ({ data } = await aiAPI.generateTags({
          name: selectedProduct.name,
          description: selectedProduct.description || results.description,
          category: selectedProduct.category,
        }));
        setResults(r => ({ ...r, tags: data.tags }));
      } else {
        ({ data } = await aiAPI.generateCaption({
          name: selectedProduct.name,
          description: selectedProduct.description || results.description,
          platform: 'instagram',
        }));
        setResults(r => ({ ...r, caption: data.caption }));
      }
      toast.success('Generated! ✨');
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI generation failed. Check your Gemini API key.');
    } finally {
      setLoading(l => ({ ...l, [type]: false }));
    }
  };

  const saveToProduct = async () => {
    if (!selectedProduct) return;
    setSaving(true);
    try {
      await aiAPI.saveContent(selectedProduct._id, {
        description: results.description || undefined,
        tags: results.tags.length ? results.tags : undefined,
        marketingCaption: results.caption || undefined,
      });
      toast.success('Content saved to product!');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: 'description', label: 'Description', icon: FileText },
    { key: 'tags', label: 'SEO Tags', icon: Tag },
    { key: 'caption', label: 'Marketing Caption', icon: Megaphone },
  ];

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          }}>
            <Sparkles size={20} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>AI Content Generator</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Generate descriptions, SEO tags & marketing captions · Powered by Gemini</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '1.5rem 2rem', display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Product Selector */}
        <div className="card" style={{ padding: '1.25rem', position: 'sticky', top: '1rem' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem' }}>Select Product</h2>
          <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
            <Search size={13} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" placeholder="Search products…" value={productSearch}
              onChange={e => setProductSearch(e.target.value)} style={{ paddingLeft: '2rem', fontSize: '0.8rem', padding: '0.5rem 0.75rem 0.5rem 2rem' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: 380, overflowY: 'auto' }}>
            {filteredProducts.length === 0
              ? <div className="empty-state" style={{ padding: '2rem' }}><Package size={28} /><p style={{ fontSize: '0.8rem' }}>No products</p></div>
              : filteredProducts.map(p => (
                <button key={p._id}
                  onClick={() => { setSelectedProduct(p); setResults({ description: '', tags: [], caption: '' }); }}
                  style={{
                    textAlign: 'left', padding: '0.625rem 0.75rem', borderRadius: 8,
                    background: selectedProduct?._id === p._id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${selectedProduct?._id === p._id ? 'rgba(99,102,241,0.3)' : 'transparent'}`,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: 600, color: selectedProduct?._id === p._id ? '#a5b4fc' : 'var(--text-primary)' }}>{p.name}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.category} · ${p.price}</p>
                </button>
              ))}
          </div>
        </div>

        {/* Content Generator */}
        <div>
          {!selectedProduct ? (
            <div className="card empty-state" style={{ padding: '5rem' }}>
              <Sparkles size={40} style={{ color: '#6366f1' }} />
              <p style={{ fontSize: '1rem', fontWeight: 600 }}>Select a product to generate AI content</p>
              <p style={{ fontSize: '0.875rem' }}>Choose from the product list on the left</p>
            </div>
          ) : (
            <div className="card" style={{ padding: '1.5rem' }}>
              {/* Selected product info */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem',
                borderRadius: 10, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)',
                marginBottom: '1.5rem',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                }}>
                  <Package size={16} color="white" />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{selectedProduct.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{selectedProduct.category} · ${selectedProduct.price}</p>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', paddingBottom: '0' }}>
                {tabs.map(tab => (
                  <button key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem',
                      border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.875rem',
                      fontWeight: activeTab === tab.key ? 700 : 500,
                      color: activeTab === tab.key ? '#818cf8' : 'var(--text-muted)',
                      borderBottom: activeTab === tab.key ? '2px solid #6366f1' : '2px solid transparent',
                      transition: 'all 0.15s', marginBottom: -1,
                    }}>
                    <tab.icon size={14} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'description' && (
                <div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Generate a compelling product description optimized for conversions.
                  </p>
                  <button className="btn btn-primary" onClick={() => generate('description')} disabled={loading.description}>
                    {loading.description
                      ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Generating…</>
                      : <><Sparkles size={14} /> Generate Description</>}
                  </button>
                  {results.description && (
                    <ResultBox label="Generated Description" content={results.description} onSave={saveToProduct} saving={saving} />
                  )}
                </div>
              )}

              {activeTab === 'tags' && (
                <div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Generate SEO-optimized tags to improve product discoverability.
                  </p>
                  <button className="btn btn-primary" onClick={() => generate('tags')} disabled={loading.tags}>
                    {loading.tags
                      ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Generating…</>
                      : <><Tag size={14} /> Generate SEO Tags</>}
                  </button>
                  {results.tags.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Generated Tags</p>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <CopyButton text={results.tags.join(', ')} />
                          <button onClick={saveToProduct} className="btn btn-success" disabled={saving}
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                            {saving ? <><div className="spinner" style={{ width: 10, height: 10 }} /> Saving…</> : '💾 Save to Product'}
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {results.tags.map((tag, i) => (
                          <span key={i} className="badge badge-info" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>#{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'caption' && (
                <div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Generate a marketing caption for Instagram and social media.
                  </p>
                  <button className="btn btn-primary" onClick={() => generate('caption')} disabled={loading.caption}>
                    {loading.caption
                      ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Generating…</>
                      : <><Megaphone size={14} /> Generate Caption</>}
                  </button>
                  {results.caption && (
                    <ResultBox label="Marketing Caption" content={results.caption} onSave={saveToProduct} saving={saving} />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIContentPage;
