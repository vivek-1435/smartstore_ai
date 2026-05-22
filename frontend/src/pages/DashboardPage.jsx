import { useState, useEffect } from 'react';
import { analyticsAPI, productAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler, ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  TrendingUp, DollarSign, ShoppingBag, Package, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Sparkles, RefreshCw,
} from 'lucide-react';
import { aiAPI } from '../services/api';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, ArcElement);

const chartDefaults = {
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
    x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#475569' } },
    y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#475569' } },
  },
};

const StatCard = ({ label, value, sub, icon: Icon, color, trend, trendUp }) => (
  <div className="stat-card" style={{ '--gradient': color }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{label}</p>
        <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</p>
        {sub && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{sub}</p>}
      </div>
      <div style={{
        width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${color.split(',')[0].replace('linear-gradient(135deg,', '').trim()}22`,
      }}>
        <Icon size={20} style={{ color: color.includes('99,102,241') ? '#818cf8' : color.includes('16,185,129') ? '#34d399' : color.includes('245,158,11') ? '#fbbf24' : '#f87171' }} />
      </div>
    </div>
    {trend && (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.75rem' }}>
        {trendUp
          ? <ArrowUpRight size={14} style={{ color: '#10b981' }} />
          : <ArrowDownRight size={14} style={{ color: '#ef4444' }} />}
        <span style={{ fontSize: '0.8rem', color: trendUp ? '#10b981' : '#ef4444', fontWeight: 600 }}>{trend}</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>vs last month</span>
      </div>
    )}
  </div>
);

const DashboardPage = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [aiInsight, setAiInsight] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sumRes, revRes, topRes, catRes, lsRes] = await Promise.all([
        analyticsAPI.summary(),
        analyticsAPI.revenue({ period: '30' }),
        analyticsAPI.topProducts({ limit: 5 }),
        analyticsAPI.byCategory(),
        analyticsAPI.lowStock(),
      ]);
      setSummary(sumRes.data);
      setRevenue(revRes.data.data || []);
      setTopProducts(topRes.data.products || []);
      setByCategory(catRes.data.categories || []);
      setLowStock(lsRes.data.products || []);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const getAiInsights = async () => {
    if (!summary) return;
    setLoadingInsight(true);
    try {
      const { data } = await aiAPI.salesInsights({
        revenue: summary.totalRevenue,
        orders: summary.totalOrders,
        topProducts,
        lowStock,
      });
      setAiInsight(data.insights);
    } catch {
      toast.error('AI service unavailable. Check your Gemini API key.');
    } finally {
      setLoadingInsight(false);
    }
  };

  // Chart data
  const revenueChartData = {
    labels: revenue.map(d => d._id),
    datasets: [{
      label: 'Revenue',
      data: revenue.map(d => d.revenue),
      fill: true,
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.08)',
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#6366f1',
    }],
  };

  const categoryColors = ['#6366f1','#8b5cf6','#ec4899','#06b6d4','#10b981','#f59e0b'];
  const categoryChartData = {
    labels: byCategory.map(c => c._id || 'Other'),
    datasets: [{
      data: byCategory.map(c => c.totalRevenue),
      backgroundColor: categoryColors.map(c => `${c}cc`),
      borderColor: categoryColors,
      borderWidth: 2,
    }],
  };

  const topProductsChartData = {
    labels: topProducts.map(p => p.name?.substring(0, 15) + (p.name?.length > 15 ? '…' : '')),
    datasets: [{
      label: 'Revenue',
      data: topProducts.map(p => p.totalRevenue),
      backgroundColor: 'rgba(99,102,241,0.6)',
      borderColor: '#6366f1',
      borderRadius: 6,
    }],
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
      <p style={{ color: 'var(--text-muted)' }}>Loading dashboard…</p>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
              <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Here's what's happening in your store today
            </p>
          </div>
          <button className="btn btn-secondary" onClick={fetchAll}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ padding: '1.5rem 2rem' }}>
        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <StatCard
            label="Total Revenue" value={`$${(summary?.totalRevenue || 0).toLocaleString()}`}
            icon={DollarSign} color="linear-gradient(135deg, #6366f1, #8b5cf6)"
            trend="+12.5%" trendUp sub="All time"
          />
          <StatCard
            label="Total Orders" value={(summary?.totalOrders || 0).toLocaleString()}
            icon={TrendingUp} color="linear-gradient(135deg, #10b981, #34d399)"
            trend="+8.2%" trendUp sub="Completed"
          />
          <StatCard
            label="Products" value={(summary?.totalProducts || 0).toLocaleString()}
            icon={Package} color="linear-gradient(135deg, #f59e0b, #fbbf24)"
            sub="In catalog"
          />
          <StatCard
            label="Low Stock" value={(summary?.lowStockCount || 0).toLocaleString()}
            icon={AlertTriangle} color="linear-gradient(135deg, #ef4444, #f87171)"
            sub="Need restock" trendUp={false}
          />
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {/* Revenue Line Chart */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Revenue Overview</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Last 30 days</p>
              </div>
              <span className="badge badge-success">↑ Live</span>
            </div>
            <div style={{ height: 220 }}>
              {revenue.length > 0
                ? <Line data={revenueChartData} options={chartDefaults} />
                : <div className="empty-state"><TrendingUp size={32} /><p>No revenue data yet</p></div>}
            </div>
          </div>

          {/* Category Doughnut */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>By Category</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Revenue split</p>
            <div style={{ height: 180 }}>
              {byCategory.length > 0
                ? <Doughnut data={categoryChartData} options={{ ...chartDefaults, scales: undefined, plugins: { ...chartDefaults.plugins, legend: { display: true, position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 }, padding: 12, boxWidth: 10 } } } }} />
                : <div className="empty-state"><Package size={32} /><p>No category data</p></div>}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Top Products Bar Chart */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Top Products</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>By revenue</p>
            <div style={{ height: 200 }}>
              {topProducts.length > 0
                ? <Bar data={topProductsChartData} options={{ ...chartDefaults, indexAxis: 'y' }} />
                : <div className="empty-state"><ShoppingBag size={32} /><p>No product data yet</p></div>}
            </div>
          </div>

          {/* AI Insights */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>AI Insights</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Powered by Gemini</p>
              </div>
              <button className="btn btn-primary" onClick={getAiInsights} disabled={loadingInsight} style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem' }}>
                {loadingInsight ? <><div className="spinner" style={{ width: 12, height: 12 }} /> Generating…</> : <><Sparkles size={14} /> Get Insights</>}
              </button>
            </div>
            {aiInsight ? (
              <div className="ai-result" style={{ maxHeight: 200, overflowY: 'auto' }}>{aiInsight}</div>
            ) : (
              <div className="empty-state" style={{ padding: '2rem', minHeight: 150 }}>
                <Sparkles size={28} style={{ color: '#6366f1' }} />
                <p style={{ fontSize: '0.875rem' }}>Click "Get Insights" to receive AI-powered sales recommendations</p>
              </div>
            )}

            {/* Low Stock Alert */}
            {lowStock.length > 0 && (
              <div style={{
                marginTop: '1rem', padding: '0.75rem', borderRadius: 10,
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b' }}>{lowStock.length} Low Stock Items</span>
                </div>
                {lowStock.slice(0, 3).map(p => (
                  <p key={p._id} style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    • {p.name} — {p.stock} left
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
