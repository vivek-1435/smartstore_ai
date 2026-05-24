import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Upload, Download, Plus, CheckCircle, AlertTriangle,
  FileSpreadsheet, User, ShoppingBag, Calendar, DollarSign,
  Hash, MapPin, Mail, ChevronDown, Loader, Sparkles, ArrowRight,
  Info, AlertCircle,
} from 'lucide-react';
import { salesAPI, productAPI } from '../services/api';
import toast from 'react-hot-toast';

const CHANNELS = ['online', 'in-store', 'mobile', 'marketplace', 'social'];
const STATUSES = ['completed', 'pending', 'refunded', 'cancelled'];

const FIELD_LABELS = {
  productName: 'Product Name',
  quantity: 'Quantity',
  unitPrice: 'Unit Price',
  revenue: 'Revenue',
  channel: 'Channel',
  status: 'Status',
  date: 'Date',
  customerName: 'Customer Name',
  customerEmail: 'Customer Email',
  customerLocation: 'Customer Location',
  productCategory: 'Category',
  sku: 'SKU',
};

const FIELD_REQUIRED = ['productName', 'sku', 'quantity', 'unitPrice', 'revenue'];

const inputStyle = {
  width: '100%', padding: '0.625rem 0.875rem', borderRadius: 8,
  border: '1.5px solid var(--border)', background: 'var(--surface)',
  color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none',
  transition: 'border-color 0.15s', fontFamily: 'inherit', boxSizing: 'border-box',
};
const labelStyle = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600,
  color: 'var(--text-secondary)', marginBottom: '0.375rem',
  textTransform: 'uppercase', letterSpacing: '0.04em',
};

const AddSaleModal = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState('single');

  // ── Single entry ──
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDrop, setShowProductDrop] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [form, setForm] = useState({
    quantity: '1', unitPrice: '', channel: 'online', status: 'completed',
    date: new Date().toISOString().slice(0, 10),
    customerName: '', customerEmail: '', customerLocation: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const productDropRef = useRef(null);

  // ── Bulk import ──
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [mappingPreview, setMappingPreview] = useState(null); // { headers, mapping, usedAI, totalRows, missingRequired, unmappedHeaders }
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    productAPI.getAll({ limit: 200 }).then(({ data }) => setProducts(data.data || [])).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setTab('single'); setSelectedProduct(null); setProductSearch('');
      setFile(null); setMappingPreview(null); setImportResult(null);
      setForm({
        quantity: '1', unitPrice: '', channel: 'online', status: 'completed',
        date: new Date().toISOString().slice(0, 10),
        customerName: '', customerEmail: '', customerLocation: '',
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e) => {
      if (productDropRef.current && !productDropRef.current.contains(e.target)) setShowProductDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const selectProduct = (product) => {
    setSelectedProduct(product);
    setProductSearch(product.name);
    setShowProductDrop(false);
    setForm(f => ({ ...f, unitPrice: String(product.price || '') }));
  };

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));

  // ── Single submit ──
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) { toast.error('Please select a product'); return; }
    setSubmitting(true);
    try {
      await salesAPI.create({
        productId: selectedProduct._id,
        quantity: Number(form.quantity),
        unitPrice: Number(form.unitPrice),
        channel: form.channel, status: form.status, date: form.date,
        customerName: form.customerName, customerEmail: form.customerEmail,
        customerLocation: form.customerLocation,
      });
      toast.success('Sale recorded successfully!');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create sale');
    } finally {
      setSubmitting(false);
    }
  };

  // ── File select + AI preview ──
  const handleFileSelect = useCallback(async (selectedFile) => {
    if (!selectedFile) return;
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      toast.error('Only CSV or Excel files (.csv, .xlsx, .xls) are accepted');
      return;
    }
    setFile(selectedFile);
    setMappingPreview(null);
    setImportResult(null);

    // Immediately call AI preview endpoint
    setPreviewing(true);
    try {
      const { data } = await salesAPI.previewMapping(selectedFile);
      setMappingPreview(data);
    } catch {
      toast.error('Could not analyse file columns');
    } finally {
      setPreviewing(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFileSelect(e.dataTransfer.files[0]);
  }, [handleFileSelect]);

  // ── Bulk import ──
  const handleBulkImport = async () => {
    if (!file) { toast.error('Please select a file first'); return; }
    setImporting(true);
    setImportResult(null);
    try {
      const { data } = await salesAPI.bulkImport(file, mappingPreview?.mapping);
      setImportResult(data);
      if (data.imported > 0) {
        toast.success(`${data.imported} sale(s) imported!`);
        onSuccess?.();
      } else {
        toast.error('No rows were imported. Check the errors below.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await salesAPI.downloadTemplate();
      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url; a.download = 'sales_import_template.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Failed to download template'); }
  };

  if (!isOpen) return null;

  // Compute mapping display data
  const mappingEntries = mappingPreview ? Object.entries(mappingPreview.mapping) : [];
  const mappedCount = mappingEntries.filter(([, v]) => v).length;
  const unmappedCount = mappingEntries.filter(([, v]) => !v).length;
  const canImport = mappingPreview && (mappingPreview.missingRequired || []).length === 0;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)', zIndex: 999, animation: 'fadeIn 0.2s ease',
        }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(660px, 96vw)', maxHeight: '92vh', overflowY: 'auto',
        background: 'var(--surface)', borderRadius: 16,
        boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
        zIndex: 1000, animation: 'slideUp 0.25s ease',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1,
          borderRadius: '16px 16px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #1a73e8, #0d47a1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShoppingBag size={18} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Add Sales Data</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Single entry or bulk CSV / Excel import</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6 }}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '0.875rem 1.5rem 0', gap: '0.25rem', borderBottom: '1px solid var(--border)' }}>
          {[{ id: 'single', label: 'Single Entry', icon: Plus }, { id: 'bulk', label: 'Bulk Import', icon: Upload }].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.5rem 1rem', borderRadius: '8px 8px 0 0',
              border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
              background: tab === id ? 'var(--g-blue)' : 'transparent',
              color: tab === id ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.15s', marginBottom: -1,
              borderBottom: tab === id ? '2px solid var(--g-blue)' : '2px solid transparent',
            }}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* ── SINGLE ENTRY TAB ── */}
        {tab === 'single' && (
          <form onSubmit={handleSingleSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Product search */}
            <div ref={productDropRef} style={{ position: 'relative' }}>
              <label style={labelStyle}>Product *</label>
              <div style={{ position: 'relative' }}>
                <input
                  style={{ ...inputStyle, paddingRight: '2.5rem' }}
                  placeholder="Search your product catalog..."
                  value={productSearch}
                  onChange={e => { setProductSearch(e.target.value); setShowProductDrop(true); setSelectedProduct(null); }}
                  onFocus={() => setShowProductDrop(true)}
                  required={!selectedProduct}
                />
                <ChevronDown size={16} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              </div>
              {showProductDrop && filteredProducts.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                  background: 'var(--surface)', border: '1.5px solid var(--border)',
                  borderRadius: 10, marginTop: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  maxHeight: 220, overflowY: 'auto',
                }}>
                  {filteredProducts.map(p => (
                    <div key={p._id} onClick={() => selectProduct(p)} style={{
                      padding: '0.625rem 0.875rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      fontSize: '0.875rem', transition: 'background 0.1s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-alt)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{p.category} · SKU: {p.sku}</p>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--g-blue)' }}>${p.price}</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedProduct && (
                <div style={{ marginTop: '0.375rem', padding: '0.5rem 0.75rem', borderRadius: 8, background: 'rgba(26,115,232,0.08)', border: '1px solid rgba(26,115,232,0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={14} style={{ color: 'var(--g-blue)' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--g-blue)', fontWeight: 600 }}>{selectedProduct.name} selected</span>
                </div>
              )}
            </div>

            {/* Qty + Price */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}><Hash size={11} style={{ display: 'inline', marginRight: 3 }} />Quantity *</label>
                <input style={inputStyle} type="number" min="1" step="1" required value={form.quantity} onChange={e => setField('quantity', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}><DollarSign size={11} style={{ display: 'inline', marginRight: 3 }} />Unit Price ($) *</label>
                <input style={inputStyle} type="number" min="0.01" step="0.01" required value={form.unitPrice} onChange={e => setField('unitPrice', e.target.value)} placeholder={selectedProduct ? `Default: $${selectedProduct.price}` : '0.00'} />
              </div>
            </div>

            {/* Revenue preview */}
            {form.quantity && form.unitPrice && (
              <div style={{ padding: '0.625rem 0.875rem', borderRadius: 8, background: 'rgba(52,168,83,0.08)', border: '1px solid rgba(52,168,83,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Revenue</span>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#34a853' }}>${(Number(form.quantity) * Number(form.unitPrice)).toFixed(2)}</span>
              </div>
            )}

            {/* Channel + Status + Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Channel</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.channel} onChange={e => setField('channel', e.target.value)}>
                  {CHANNELS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.status} onChange={e => setField('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}><Calendar size={11} style={{ display: 'inline', marginRight: 3 }} />Date</label>
                <input style={inputStyle} type="date" value={form.date} onChange={e => setField('date', e.target.value)} />
              </div>
            </div>

            {/* Customer */}
            <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={12} /> Customer Info <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={labelStyle}><User size={11} style={{ display: 'inline', marginRight: 3 }} />Name</label>
                  <input style={inputStyle} placeholder="Jane Smith" value={form.customerName} onChange={e => setField('customerName', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}><Mail size={11} style={{ display: 'inline', marginRight: 3 }} />Email</label>
                  <input style={inputStyle} type="email" placeholder="jane@example.com" value={form.customerEmail} onChange={e => setField('customerEmail', e.target.value)} />
                </div>
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <label style={labelStyle}><MapPin size={11} style={{ display: 'inline', marginRight: 3 }} />Location</label>
                <input style={inputStyle} placeholder="e.g. New York, USA" value={form.customerLocation} onChange={e => setField('customerLocation', e.target.value)} />
              </div>
            </div>

            <button type="submit" disabled={submitting} style={{
              padding: '0.75rem', borderRadius: 10, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg, #1a73e8, #0d47a1)', color: '#fff',
              fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '0.5rem', opacity: submitting ? 0.7 : 1, transition: 'opacity 0.15s',
            }}>
              {submitting ? <Loader size={16} className="spinner" /> : <Plus size={16} />}
              {submitting ? 'Saving...' : 'Record Sale'}
            </button>
          </form>
        )}

        {/* ── BULK IMPORT TAB ── */}
        {tab === 'bulk' && (
          <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Template download */}
            <div style={{ padding: '0.875rem 1rem', borderRadius: 10, background: 'rgba(26,115,232,0.06)', border: '1px solid rgba(26,115,232,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>📥 Download Template</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.775rem', marginTop: '0.2rem' }}>
                  Pre-formatted Excel file with correct columns and example rows
                </p>
              </div>
              <button onClick={handleDownloadTemplate} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap',
                padding: '0.5rem 0.875rem', borderRadius: 8, border: '1.5px solid var(--g-blue)',
                background: 'transparent', color: 'var(--g-blue)', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.8rem',
              }}>
                <Download size={14} /> Template
              </button>
            </div>

            {/* AI info banner */}
            <div style={{ padding: '0.75rem 1rem', borderRadius: 10, background: 'linear-gradient(135deg, rgba(161,66,244,0.08), rgba(26,115,232,0.06))', border: '1px solid rgba(161,66,244,0.2)', display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
              <Sparkles size={16} style={{ color: '#a142f4', marginTop: 1, flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--text-primary)' }}>AI Column Detection</p>
                <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Upload <em>any</em> spreadsheet format — AI will automatically map your columns to the required fields and ignore irrelevant data.
                </p>
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => !previewing && fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? 'var(--g-blue)' : file ? 'var(--g-green)' : 'var(--border)'}`,
                borderRadius: 12, padding: '2rem 1.5rem', textAlign: 'center',
                cursor: previewing ? 'default' : 'pointer',
                background: dragging ? 'rgba(26,115,232,0.05)' : file ? 'rgba(52,168,83,0.05)' : 'var(--surface-alt)',
                transition: 'all 0.2s',
              }}
            >
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={e => handleFileSelect(e.target.files[0])} />
              {previewing ? (
                <>
                  <Loader size={32} className="spinner" style={{ color: '#a142f4', margin: '0 auto 0.75rem' }} />
                  <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>AI is analysing your columns…</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>Mapping fields automatically</p>
                </>
              ) : file ? (
                <>
                  <FileSpreadsheet size={36} style={{ color: 'var(--g-green)', marginBottom: '0.75rem' }} />
                  <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{file.name}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{(file.size / 1024).toFixed(1)} KB · Click to change file</p>
                </>
              ) : (
                <>
                  <Upload size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                  <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{dragging ? 'Drop it here!' : 'Drop CSV or Excel file here'}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    or <span style={{ color: 'var(--g-blue)', fontWeight: 600 }}>click to browse</span> · .csv, .xlsx, .xls
                  </p>
                </>
              )}
            </div>

            {/* ── AI MAPPING PREVIEW ── */}
            {mappingPreview && !previewing && (
              <div style={{ borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{
                  padding: '0.75rem 1rem',
                  background: mappingPreview.usedAI
                    ? 'linear-gradient(135deg, rgba(161,66,244,0.1), rgba(26,115,232,0.08))'
                    : 'var(--surface-alt)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {mappingPreview.usedAI
                      ? <Sparkles size={15} style={{ color: '#a142f4' }} />
                      : <Info size={15} style={{ color: 'var(--text-secondary)' }} />}
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      {mappingPreview.usedAI ? 'AI Column Mapping' : 'Column Mapping (Smart Match)'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      · {mappingPreview.totalRows} row{mappingPreview.totalRows !== 1 ? 's' : ''} detected
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: 20, background: 'rgba(52,168,83,0.12)', color: '#34a853', fontWeight: 700 }}>
                      {mappedCount} mapped
                    </span>
                    {unmappedCount > 0 && (
                      <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: 20, background: 'rgba(95,99,104,0.12)', color: 'var(--text-secondary)', fontWeight: 700 }}>
                        {unmappedCount} ignored
                      </span>
                    )}
                  </div>
                </div>

                {/* Mapping rows */}
                <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: 240, overflowY: 'auto' }}>
                  {mappingEntries.map(([header, field]) => (
                    <div key={header} style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.4rem 0.625rem', borderRadius: 8,
                      background: field ? 'rgba(52,168,83,0.06)' : 'rgba(95,99,104,0.06)',
                      border: `1px solid ${field ? 'rgba(52,168,83,0.2)' : 'rgba(95,99,104,0.15)'}`,
                    }}>
                      {/* Original column name */}
                      <span style={{
                        flex: '0 0 auto', fontFamily: 'monospace', fontSize: '0.78rem',
                        fontWeight: 700, color: field ? 'var(--text-primary)' : 'var(--text-muted)',
                        maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {header}
                      </span>

                      {/* Arrow */}
                      <ArrowRight size={12} style={{ color: field ? '#34a853' : 'var(--text-muted)', flexShrink: 0 }} />

                      {/* Mapped field or "ignored" */}
                      {field ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <CheckCircle size={12} style={{ color: '#34a853', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#34a853' }}>
                            {FIELD_LABELS[field] || field}
                          </span>
                          {FIELD_REQUIRED.includes(field) && (
                            <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: 4, background: 'rgba(26,115,232,0.1)', color: 'var(--g-blue)', fontWeight: 700 }}>required</span>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <X size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>ignored (not needed)</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Missing required fields warning */}
                {(mappingPreview.missingRequired || []).length > 0 && (
                  <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', background: 'rgba(234,67,53,0.06)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <AlertCircle size={15} style={{ color: 'var(--g-red)', marginTop: 1, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--g-red)' }}>Missing required fields</p>
                      <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        Could not find: <strong>{mappingPreview.missingRequired.map(f => FIELD_LABELS[f]).join(', ')}</strong>. Please check your file or use the template.
                      </p>
                    </div>
                  </div>
                )}
                {(mappingPreview.missingRequired || []).length === 0 && (
                  <div style={{ padding: '0.625rem 1rem', borderTop: '1px solid var(--border)', background: 'rgba(52,168,83,0.06)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={14} style={{ color: '#34a853' }} />
                    <p style={{ fontSize: '0.8rem', color: '#34a853', fontWeight: 600 }}>All required fields found — ready to import</p>
                  </div>
                )}
              </div>
            )}

            {/* Import result */}
            {importResult && (
              <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{
                  padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: importResult.imported > 0 ? 'rgba(52,168,83,0.1)' : 'rgba(234,67,53,0.1)',
                }}>
                  {importResult.imported > 0
                    ? <CheckCircle size={18} style={{ color: 'var(--g-green)' }} />
                    : <AlertTriangle size={18} style={{ color: 'var(--g-red)' }} />}
                  <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{importResult.message}</p>
                  {importResult.usedAI && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#a142f4', fontWeight: 700 }}>
                      <Sparkles size={12} /> AI mapped
                    </span>
                  )}
                </div>
                {importResult.errors?.length > 0 && (
                  <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', maxHeight: 160, overflowY: 'auto' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--g-red)', marginBottom: '0.5rem' }}>Row Errors:</p>
                    {importResult.errors.map((err, i) => (
                      <p key={i} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                        <strong>Row {err.row}:</strong> {err.error}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Import button */}
            <button
              onClick={handleBulkImport}
              disabled={!file || importing || previewing || !canImport}
              style={{
                padding: '0.75rem', borderRadius: 10, border: 'none',
                cursor: (!file || importing || previewing || !canImport) ? 'not-allowed' : 'pointer',
                background: canImport && file ? 'linear-gradient(135deg, #34a853, #1e7e34)' : 'var(--surface-alt)',
                color: canImport && file ? '#fff' : 'var(--text-muted)',
                fontSize: '0.9rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                opacity: importing ? 0.7 : 1, transition: 'all 0.15s',
              }}
            >
              {importing ? <Loader size={16} className="spinner" /> : previewing ? <Loader size={16} className="spinner" /> : <Upload size={16} />}
              {importing ? 'Importing...' : previewing ? 'Analysing...' : 'Import Sales Data'}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default AddSaleModal;
