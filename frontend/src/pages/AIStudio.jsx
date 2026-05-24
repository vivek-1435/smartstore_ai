import { useState, useEffect } from 'react';
import { Sparkles, Package, Tag, MessageSquare, TrendingUp, Copy, Check, RefreshCw, Save, Search } from 'lucide-react';
import { productAPI, aiAPI } from '../services/api';
import toast from 'react-hot-toast';

const AIStudio = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeFeature, setActiveFeature] = useState('description');
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productSearch, setProductSearch] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [savedItems, setSavedItems] = useState(new Set());

  // Options
  const [tone, setTone] = useState('professional');
  const [platform, setPlatform] = useState('instagram');
  const [insightPeriod, setInsightPeriod] = useState('30 days');

  useEffect(() => {
    productAPI.getAll({ limit: 5000 })
      .then(r => setProducts(r.data.data || []))
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setProductsLoading(false));
  }, []);

  const filteredProducts = products.filter((product) => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return true;
    return [
      product.name,
      product.category,
      product.sku,
      product.description,
    ].some((value) => String(value || '').toLowerCase().includes(query));
  });

  const features = [
    { id: 'description', label: 'Product Description', icon: Package, desc: 'Generate compelling, SEO-optimized product descriptions', color: 'var(--g-blue)' },
    { id: 'tags', label: 'SEO Tags & Keywords', icon: Tag, desc: 'Generate tags, keywords, and meta information', color: 'var(--g-green)' },
    { id: 'caption', label: 'Marketing Caption', icon: MessageSquare, desc: 'Create social media captions for any platform', color: 'var(--g-red)' },
    { id: 'insights', label: 'Sales Insights', icon: TrendingUp, desc: 'AI-powered business intelligence and recommendations', color: 'var(--g-yellow)' },
  ];

  const generate = async () => {
    if (!selectedProduct && activeFeature !== 'insights') {
      toast.error('Please select a product first');
      return;
    }
    setLoading(true);
    setResult(null);
    setSavedItems(new Set());
    try {
      let res;
      if (activeFeature === 'description') {
        res = await aiAPI.generateDescription({ productName: selectedProduct.name, category: selectedProduct.category, price: selectedProduct.price, features: selectedProduct.description, tone });
        setResult({ type: 'description', data: res.data.data });
      } else if (activeFeature === 'tags') {
        res = await aiAPI.generateTags({ productName: selectedProduct.name, category: selectedProduct.category, description: selectedProduct.description });
        setResult({ type: 'tags', data: res.data.data });
      } else if (activeFeature === 'caption') {
        res = await aiAPI.generateCaption({ productName: selectedProduct.name, category: selectedProduct.category, price: selectedProduct.price, platform });
        setResult({ type: 'caption', data: res.data.data });
      } else if (activeFeature === 'insights') {
        res = await aiAPI.salesInsights({
          products: products.slice(0, 10),
          totalRevenue: products.reduce((sum, p) => sum + (p.totalRevenue || 0), 0),
          period: insightPeriod,
        });
        setResult({ type: 'insights', data: res.data.data });
      }
      toast.success('✨ AI generation complete!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI generation failed');
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const saveToProduct = async () => {
    if (!result || !selectedProduct?._id) return;
    const saveData = {};
    if (result.type === 'description') saveData.aiDescription = result.data.description;
    if (result.type === 'tags') { saveData.tags = result.data.tags; saveData.seoKeywords = result.data.seoKeywords; }
    if (result.type === 'caption') saveData.aiCaption = result.data.captions?.[0]?.text;
    try {
      await aiAPI.saveContent(selectedProduct._id, saveData);
      setSavedItems(s => new Set([...s, result.type]));
      toast.success('Saved to product!');
    } catch {
      toast.error('Failed to save');
    }
  };

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="page-header" style={{ padding: '0 0 1rem 0', background: 'transparent', position: 'static' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Sparkles size={24} style={{ color: 'var(--g-blue)' }} />
          AI Sales Insights
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Generate product content plus pricing, inventory, trend, and sales growth recommendations.</p>
      </div>

      <div className="ai-studio-layout">
        {/* Left Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Feature selector */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 className="section-title">AI Features</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {features.map(({ id, label, icon: Icon, desc, color }) => (
                <button
                  key={id}
                  onClick={() => { setActiveFeature(id); setResult(null); }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '0.75rem', borderRadius: 12, transition: 'all 0.15s', cursor: 'pointer',
                    background: activeFeature === id ? 'var(--g-blue-light)' : 'transparent',
                    border: activeFeature === id ? '1px solid rgba(26,115,232,0.3)' : '1px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ padding: '0.375rem', borderRadius: 8, background: activeFeature === id ? '#fff' : 'var(--surface-alt)', color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: activeFeature === id ? 'var(--g-blue-dark)' : 'var(--text-primary)' }}>{label}</p>
                      <p style={{ fontSize: '0.7rem', color: activeFeature === id ? 'var(--g-blue)' : 'var(--text-secondary)', marginTop: '0.125rem' }}>{desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Product selector */}
          {activeFeature !== 'insights' && (
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 className="section-title">Select Product</h3>
              {productsLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {Array(3).fill(0).map((_, i) => <div key={i} style={{ height: 48, background: 'var(--surface-alt)', borderRadius: 8 }} className="animate-pulse"></div>)}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      className="input"
                      value={productSearch}
                      onChange={(event) => setProductSearch(event.target.value)}
                      placeholder="Search products..."
                      style={{ paddingLeft: '2.25rem', height: 36, fontSize: '0.8rem' }}
                    />
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {filteredProducts.length} shown · {products.length} total
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: 360, overflowY: 'auto' }}>
                    {filteredProducts.length === 0 ? (
                      <div className="empty-state" style={{ padding: '1.5rem' }}>
                        <Package size={24} />
                        <p style={{ fontSize: '0.8rem' }}>No matching products</p>
                      </div>
                    ) : filteredProducts.map(p => (
                      <button
                        key={p._id}
                        onClick={() => { setSelectedProduct(p); setResult(null); }}
                        style={{
                          width: '100%', textAlign: 'left', padding: '0.625rem', borderRadius: 8, transition: 'all 0.1s', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', border: 'none',
                          background: selectedProduct?._id === p._id ? 'var(--surface-alt)' : 'transparent',
                        }}
                        className={selectedProduct?._id !== p._id ? 'hover:bg-gray-100' : ''}
                      >
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Package size={14} style={{ color: 'var(--text-muted)' }} />
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>${p.price} · {p.category || 'Uncategorized'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Options */}
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 className="section-title">Options</h3>
            {activeFeature === 'description' && (
              <div>
                <label className="label">Writing Tone</label>
                <select value={tone} onChange={e => setTone(e.target.value)} className="input">
                  {['professional', 'casual', 'luxury', 'playful', 'technical', 'urgent'].map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
            )}
            {activeFeature === 'caption' && (
              <div>
                <label className="label">Platform</label>
                <select value={platform} onChange={e => setPlatform(e.target.value)} className="input">
                  {['instagram', 'twitter', 'facebook', 'linkedin', 'tiktok', 'pinterest'].map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
            )}
            {activeFeature === 'insights' && (
              <div>
                <label className="label">Analysis Period</label>
                <select value={insightPeriod} onChange={e => setInsightPeriod(e.target.value)} className="input">
                  {['7 days', '30 days', '90 days', '6 months', '1 year'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}
            <button onClick={generate} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }} disabled={loading}>
              {loading ? <><div className="spinner" /> Generating...</> : <><Sparkles size={16} /> Generate Now</>}
            </button>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div>
          <div className="card" style={{ height: '100%', minHeight: 400, background: 'linear-gradient(135deg, #ffffff, #f8faff)' }}>
            {!result ? (
              <div className="empty-state" style={{ height: '100%' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--g-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <Sparkles size={36} style={{ color: 'var(--g-blue)' }} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Ready to Create</h3>
                <p style={{ fontSize: '0.875rem', maxWidth: 300 }}>
                  {activeFeature !== 'insights' ? 'Select a product and feature, then click Generate Now' : 'Click Generate Now to analyze your store data'}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                  {['Gemini Pro', 'SEO Optimized', 'Multi-Platform'].map(tag => (
                    <span key={tag} className="badge badge-info">{tag}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Result header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={18} style={{ color: 'var(--g-blue)' }} />
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {features.find(f => f.id === activeFeature)?.label} Result
                    </span>
                    {selectedProduct && <span className="badge badge-neutral" style={{ marginLeft: '0.5rem' }}>{selectedProduct.name}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={generate} className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }} disabled={loading}>
                      <RefreshCw size={14} className={loading ? 'spinner' : ''} /> Regenerate
                    </button>
                    {result.type !== 'insights' && selectedProduct?._id && (
                      <button onClick={saveToProduct} className={`btn ${savedItems.has(result.type) ? 'btn-success' : 'btn-primary'}`} style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>
                        {savedItems.has(result.type) ? '✓ Saved' : <><Save size={14} /> Save</>}
                      </button>
                    )}
                  </div>
                </div>

                {/* Description result */}
                {result.type === 'description' && (
                  <div style={{ position: 'relative', padding: '1.25rem', borderRadius: 12, background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                    <button
                      onClick={() => copyText(result.data.description)}
                      className="btn-ghost"
                      style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', padding: '0.5rem', borderRadius: 8 }}
                    >
                      {copied ? <Check size={16} style={{ color: 'var(--g-green)' }} /> : <Copy size={16} />}
                    </button>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-line', paddingRight: '2rem' }}>{result.data.description}</p>
                  </div>
                )}

                {/* Tags result */}
                {result.type === 'tags' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ padding: '1.25rem', borderRadius: 12, background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--g-blue)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Product Tags</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {result.data.tags?.map(t => <span key={t} className="chip">{t}</span>)}
                      </div>
                    </div>
                    <div style={{ padding: '1.25rem', borderRadius: 12, background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--g-green)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>SEO Keywords</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {result.data.seoKeywords?.map(k => <span key={k} className="chip" style={{ background: 'var(--g-green-light)', color: 'var(--g-green)', borderColor: 'rgba(52,168,83,0.3)' }}>{k}</span>)}
                      </div>
                    </div>
                    {result.data.metaTitle && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                        <div style={{ padding: '1.25rem', borderRadius: 12, background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b06000', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Meta Title</p>
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{result.data.metaTitle}</p>
                        </div>
                        <div style={{ padding: '1.25rem', borderRadius: 12, background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b06000', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Meta Description</p>
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{result.data.metaDescription}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Caption result */}
                {result.type === 'caption' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {result.data.captions?.map((c, i) => (
                      <div key={i} style={{ position: 'relative', padding: '1.25rem', borderRadius: 12, background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                          <span className="badge badge-info">{c.style}</span>
                          <button onClick={() => copyText(c.text)} className="btn-ghost" style={{ padding: '0.375rem', borderRadius: 6 }}>
                            <Copy size={14} />
                          </button>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-line', lineHeight: 1.6 }}>{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Insights result */}
                {result.type === 'insights' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ padding: '1.25rem', borderRadius: 12, background: 'var(--g-blue-light)', border: '1px solid rgba(26,115,232,0.2)' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--g-blue)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Executive Summary</p>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>{result.data.summary}</p>
                    </div>
                    {result.data.actionItems?.length > 0 && (
                      <div style={{ padding: '1.25rem', borderRadius: 12, background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--g-green)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Action Items</p>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyle: 'none' }}>
                          {result.data.actionItems.map((item, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                              <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--g-green-light)', color: 'var(--g-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0, marginTop: '0.1rem' }}>{i + 1}</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.data.pricingRecommendations?.length > 0 && (
                      <div style={{ padding: '1.25rem', borderRadius: 12, background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b06000', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Pricing Recommendations</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {result.data.pricingRecommendations.map((r, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{r.product}</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.reason}</p>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textDecoration: 'line-through' }}>${r.currentPrice}</p>
                                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--g-green)' }}>${r.suggestedPrice}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.data.growthOpportunities?.length > 0 && (
                      <div style={{ padding: '1.25rem', borderRadius: 12, background: 'var(--g-green-light)', border: '1px solid rgba(52,168,83,0.3)' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--g-green)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Growth Opportunities</p>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', listStyle: 'none' }}>
                          {result.data.growthOpportunities.map((o, i) => (
                            <li key={i} style={{ fontSize: '0.875rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                              <span style={{ color: 'var(--g-green)', marginTop: '0.125rem' }}>→</span> {o}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.data.riskAlerts?.length > 0 && (
                      <div style={{ padding: '1.25rem', borderRadius: 12, background: 'var(--g-yellow-light)', border: '1px solid rgba(251,188,5,0.4)' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b06000', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Risk Alerts</p>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', listStyle: 'none' }}>
                          {result.data.riskAlerts.map((a, i) => (
                            <li key={i} style={{ fontSize: '0.875rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                              <span style={{ color: '#b06000', marginTop: '0.125rem' }}>⚠</span> {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIStudio;
