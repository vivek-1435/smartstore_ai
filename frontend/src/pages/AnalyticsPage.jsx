import { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler, ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { TrendingUp, DollarSign, Package, ShoppingBag, AlertTriangle, RefreshCw } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, ArcElement);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#13131f',
      borderColor: 'rgba(99,102,241,0.3)',
      borderWidth: 1,
      titleColor: '#f1f5f9',
      bodyColor: '#94a3b8',
      padding: 12,
      cornerRadius: 10,
    },
  },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#475569', font: { size: 11 } } },
    y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#475569', font: { size: 11 } } },
  },
};

const AnalyticsPage = () => {
  const [summary, setSummary] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [byChannel, setByChannel] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sumRes, revRes, topRes, catRes, chanRes, lsRes] = await Promise.all([
        analyticsAPI.summary(),
        analyticsAPI.revenue({ period }),
        analyticsAPI.topProducts({ limit: 10 }),
        analyticsAPI.byCategory(),
        analyticsAPI.byChannel(),
        analyticsAPI.lowStock(),
      ]);
      setSummary(sumRes.data);
      setRevenue(revRes.data.data || []);
      setTopProducts(topRes.data.products || []);
      setByCategory(catRes.data.categories || []);
      setByChannel(chanRes.data.channels || []);
      setLowStock(lsRes.data.products || []);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [period]);

  const categoryColors = ['#6366f1','#8b5cf6','#ec4899','#06b6d4','#10b981','#f59e0b','#ef4444','#84cc16'];

  const revenueChart = {
    labels: revenue.map(d => d._id),
    datasets: [{
      label: 'Revenue ($)',
      data: revenue.map(d => d.revenue),
      fill: true,
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.08)',
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#6366f1',
    }],
  };

  const ordersChart = {
    labels: revenue.map(d => d._id),
    datasets: [{
      label: 'Orders',
      data: revenue.map(d => d.orders),
      backgroundColor: 'rgba(16,185,129,0.15)',
      borderColor: '#10b981',
      borderWidth: 2,
      borderRadius: 4,
    }],
  };

  const categoryChart = {
    labels: byCategory.map(c => c._id || 'Other'),
    datasets: [{
      data: byCategory.map(c => c.totalRevenue),
      backgroundColor: categoryColors.map(c => `${c}bb`),
      borderColor: categoryColors,
      borderWidth: 2,
    }],
  };

  const topProductsChart = {
    labels: topProducts.map(p => p.name?.substring(0, 18) + (p.name?.length > 18 ? '…' : '')),
    datasets: [{
      data: topProducts.map(p => p.totalRevenue),
      backgroundColor: 'rgba(99,102,241,0.6)',
      borderColor: '#6366f1',
      borderRadius: 6,
    }],
  };

  const channelChart = {
    labels: byChannel.map(c => c._id || 'Direct'),
    datasets: [{
      data: byChannel.map(c => c.totalRevenue),
      backgroundColor: ['rgba(99,102,241,0.8)','rgba(139,92,246,0.8)','rgba(236,72,153,0.8)','rgba(6,182,212,0.8)'],
      borderColor: ['#6366f1','#8b5cf6','#ec4899','#06b6d4'],
      borderWidth: 2,
    }],
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
      <p style={{ color: 'var(--text-muted)' }}>Loading analytics…</p>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Analytics</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Store performance & insights
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select className="input" value={period} onChange={e => setPeriod(e.target.value)} style={{ minWidth: 140 }}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            <button className="btn btn-secondary" onClick={fetchAll}><RefreshCw size={14} /></button>
          </div>
        </div>
      </div>

      <div style={{ padding: '1.5rem 2rem' }}>
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Revenue', value: `$${(summary?.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, color: '#6366f1' },
            { label: 'Total Orders', value: (summary?.totalOrders || 0).toLocaleString(), icon: ShoppingBag, color: '#10b981' },
            { label: 'Products', value: (summary?.totalProducts || 0).toLocaleString(), icon: Package, color: '#8b5cf6' },
            { label: 'Low Stock', value: (summary?.lowStockCount || 0).toLocaleString(), icon: AlertTriangle, color: '#f59e0b' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="stat-card" style={{ '--gradient': `linear-gradient(135deg, ${color}, ${color}99)` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                  <p style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{value}</p>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}22` }}>
                  <Icon size={18} style={{ color }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue & Orders charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Revenue Over Time</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Daily revenue ({period} days)</p>
            <div style={{ height: 220 }}>
              {revenue.length > 0
                ? <Line data={revenueChart} options={chartOptions} />
                : <div className="empty-state"><TrendingUp size={28} /><p>No revenue data</p></div>}
            </div>
          </div>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Orders Over Time</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Daily orders ({period} days)</p>
            <div style={{ height: 220 }}>
              {revenue.length > 0
                ? <Bar data={ordersChart} options={chartOptions} />
                : <div className="empty-state"><ShoppingBag size={28} /><p>No order data</p></div>}
            </div>
          </div>
        </div>

        {/* Category & Channel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Revenue by Category</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>All time breakdown</p>
            <div style={{ height: 220 }}>
              {byCategory.length > 0
                ? <Doughnut data={categoryChart} options={{
                    ...chartOptions, scales: undefined,
                    plugins: { ...chartOptions.plugins, legend: { display: true, position: 'right', labels: { color: '#94a3b8', font: { size: 11 }, padding: 12, boxWidth: 10 } } }
                  }} />
                : <div className="empty-state"><Package size={28} /><p>No category data</p></div>}
            </div>
          </div>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Sales by Channel</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Revenue distribution</p>
            <div style={{ height: 220 }}>
              {byChannel.length > 0
                ? <Doughnut data={channelChart} options={{
                    ...chartOptions, scales: undefined,
                    plugins: { ...chartOptions.plugins, legend: { display: true, position: 'right', labels: { color: '#94a3b8', font: { size: 11 }, padding: 12, boxWidth: 10 } } }
                  }} />
                : <div className="empty-state"><TrendingUp size={28} /><p>No channel data</p></div>}
            </div>
          </div>
        </div>

        {/* Top Products Table & Low Stock */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Top Products by Revenue</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>All time top performers</p>
            {topProducts.length > 0 ? (
              <div style={{ height: 240 }}>
                <Bar data={topProductsChart} options={{ ...chartOptions, indexAxis: 'y', plugins: { ...chartOptions.plugins } }} />
              </div>
            ) : (
              <div className="empty-state"><Package size={28} /><p>No product data</p></div>
            )}
          </div>

          {/* Low Stock List */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Low Stock Alert</h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Items needing restock</p>
            {lowStock.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <Package size={28} style={{ color: '#10b981' }} />
                <p style={{ fontSize: '0.875rem' }}>All products well stocked! 🎉</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 280, overflowY: 'auto' }}>
                {lowStock.map(p => (
                  <div key={p._id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.625rem 0.75rem', borderRadius: 8,
                    background: p.stock === 0 ? 'rgba(239,68,68,0.05)' : 'rgba(245,158,11,0.05)',
                    border: `1px solid ${p.stock === 0 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'}`,
                  }}>
                    <div>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.category}</p>
                    </div>
                    <span className={p.stock === 0 ? 'badge badge-danger' : 'badge badge-warning'}>
                      {p.stock === 0 ? 'Out' : `${p.stock} left`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
