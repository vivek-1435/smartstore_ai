import { useState, useEffect } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { analyticsAPI } from '../services/api';
import { TrendingUp, TrendingDown, BarChart3, RefreshCw, AlertTriangle, Package } from 'lucide-react';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: '#5f6368', font: { size: 11, family: 'Inter' }, padding: 16, usePointStyle: true },
    },
    tooltip: {
      backgroundColor: '#202124',
      titleColor: '#ffffff',
      bodyColor: '#e8eaed',
      borderColor: '#5f6368',
      borderWidth: 1,
      padding: 12,
      boxPadding: 4,
    },
  },
  scales: {
    x: { grid: { color: '#f1f3f4', drawBorder: false }, ticks: { color: '#5f6368', font: { size: 11, family: 'Inter' } } },
    y: { grid: { color: '#f1f3f4', drawBorder: false }, ticks: { color: '#5f6368', font: { size: 11, family: 'Inter' } } },
  },
};

const Analytics = () => {
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [channelData, setChannelData] = useState([]);
  const [lowStock, setLowStock] = useState([]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [revRes, topRes, catRes, chanRes, lowRes] = await Promise.all([
        analyticsAPI.revenue({ days: period }),
        analyticsAPI.topProducts({ limit: 8 }),
        analyticsAPI.byCategory(),
        analyticsAPI.byChannel(),
        analyticsAPI.lowStock(),
      ]);
      setRevenueData(revRes.data.data);
      setTopProducts(topRes.data.data);
      setCategoryData(catRes.data.data);
      setChannelData(chanRes.data.data);
      setLowStock(lowRes.data.data);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [period]);

  const COLORS = ['#1a73e8', '#34a853', '#fbbc05', '#ea4335', '#a142f4', '#24c1e0', '#ff8bc8', '#ff7043'];

  const lineChartData = {
    labels: revenueData?.chart?.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
    }) || [],
    datasets: [
      {
        label: 'Revenue',
        data: revenueData?.chart?.map(d => d.revenue) || [],
        borderColor: '#1a73e8',
        backgroundColor: 'rgba(26,115,232,0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: '#1a73e8',
      },
      {
        label: 'Orders',
        data: revenueData?.chart?.map(d => d.orders * 50) || [], // scaled for visibility
        borderColor: '#34a853',
        backgroundColor: 'rgba(52,168,83,0.05)',
        tension: 0.4,
        fill: false,
        pointRadius: 3,
        pointBackgroundColor: '#34a853',
        borderDash: [4, 2],
      },
    ],
  };

  const barChartData = {
    labels: topProducts.map(p => p.name.length > 18 ? p.name.substring(0, 18) + '…' : p.name),
    datasets: [{
      label: 'Revenue ($)',
      data: topProducts.map(p => p.totalRevenue || 0),
      backgroundColor: topProducts.map((_, i) => `${COLORS[i % COLORS.length]}99`),
      borderColor: topProducts.map((_, i) => COLORS[i % COLORS.length]),
      borderWidth: 1,
      borderRadius: 6,
    }],
  };

  const doughnutData = {
    labels: categoryData.map(d => d._id),
    datasets: [{
      data: categoryData.map(d => d.revenue),
      backgroundColor: COLORS.slice(0, categoryData.length).map(c => `${c}cc`),
      borderColor: COLORS.slice(0, categoryData.length),
      borderWidth: 1,
    }],
  };

  const channelChartData = {
    labels: channelData.map(d => d._id?.charAt(0).toUpperCase() + d._id?.slice(1)),
    datasets: [{
      data: channelData.map(d => d.revenue),
      backgroundColor: COLORS.slice(0, channelData.length).map(c => `${c}cc`),
      borderColor: COLORS.slice(0, channelData.length),
      borderWidth: 1,
    }],
  };

  const totalRevenue = revenueData?.totalRevenue || 0;
  const totalOrders = revenueData?.totalOrders || 0;
  const avgValue = revenueData?.avgOrderValue || 0;

  const noscaleOptions = {
    ...CHART_DEFAULTS,
    scales: undefined,
    plugins: {
      ...CHART_DEFAULTS.plugins,
      legend: {
        ...CHART_DEFAULTS.plugins.legend,
        position: 'right',
      },
      tooltip: {
        ...CHART_DEFAULTS.plugins.tooltip,
        callbacks: {
          label: (ctx) => ` ${ctx.label}: $${ctx.parsed.toLocaleString()}`,
        },
      },
    },
  };

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="page-header" style={{ padding: '0 0 1rem 0', background: 'transparent', position: 'static' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>Analytics</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Detailed performance insights for your store</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--surface-alt)', padding: '0.25rem', borderRadius: '8px' }}>
              {[7, 30, 90].map(d => (
                <button
                  key={d}
                  onClick={() => setPeriod(d)}
                  style={{
                    padding: '0.375rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.15s', border: 'none', cursor: 'pointer',
                    background: period === d ? '#fff' : 'transparent',
                    color: period === d ? 'var(--g-blue)' : 'var(--text-secondary)',
                    boxShadow: period === d ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {d}d
                </button>
              ))}
            </div>
            <button onClick={fetchAll} className="btn btn-secondary" disabled={loading} style={{ padding: '0.5rem' }}>
              <RefreshCw size={16} className={loading ? 'spinner' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: '#34a853' },
          { label: 'Total Orders', value: totalOrders.toLocaleString(), icon: BarChart3, color: '#1a73e8' },
          { label: 'Avg Order Value', value: `$${avgValue.toFixed(2)}`, icon: TrendingDown, color: '#fbbc05' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card" style={{ '--accent-color': color }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: color + '15' }}>
                <Icon size={22} style={{ color }} />
              </div>
            </div>
            {loading ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                 <div style={{ height: 28, width: 96, background: 'var(--surface-alt)', borderRadius: 4 }} className="animate-pulse"></div>
                 <div style={{ height: 16, width: 64, background: 'var(--surface-alt)', borderRadius: 4 }} className="animate-pulse"></div>
               </div>
            ) : (
              <>
                <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{value}</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontWeight: 500 }}>{label} ({period}d)</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Main charts */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Revenue & Orders Trend</h3>
        <div style={{ height: '280px' }}>
          <Line
            data={lineChartData}
            options={{
              ...CHART_DEFAULTS,
              plugins: {
                ...CHART_DEFAULTS.plugins,
                tooltip: {
                  ...CHART_DEFAULTS.plugins.tooltip,
                  callbacks: {
                    label: (ctx) => ctx.datasetIndex === 0
                      ? ` Revenue: $${ctx.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      : ` Orders: ${(ctx.parsed.y / 50).toFixed(0)}`,
                  },
                },
              },
              scales: {
                ...CHART_DEFAULTS.scales,
                y: {
                  ...CHART_DEFAULTS.scales.y,
                  ticks: {
                    ...CHART_DEFAULTS.scales.y.ticks,
                    callback: (v) => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`,
                  },
                },
              },
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Top Products Bar */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Top Products by Revenue</h3>
          <div style={{ height: '260px' }}>
            <Bar data={barChartData} options={{
              ...CHART_DEFAULTS,
              plugins: {
                ...CHART_DEFAULTS.plugins,
                legend: { display: false },
                tooltip: {
                  ...CHART_DEFAULTS.plugins.tooltip,
                  callbacks: { label: (ctx) => ` $${ctx.parsed.y.toLocaleString()}` },
                },
              },
              scales: {
                ...CHART_DEFAULTS.scales,
                x: { ...CHART_DEFAULTS.scales.x, ticks: { ...CHART_DEFAULTS.scales.x.ticks, maxRotation: 30 } },
                y: {
                  ...CHART_DEFAULTS.scales.y,
                  ticks: { ...CHART_DEFAULTS.scales.y.ticks, callback: (v) => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}` },
                },
              },
            }} />
          </div>
        </div>

        {/* Category Doughnut */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Revenue by Category</h3>
          {categoryData.length > 0 ? (
            <div style={{ height: '260px' }}>
              <Doughnut data={doughnutData} options={noscaleOptions} />
            </div>
          ) : (
            <div className="empty-state" style={{ height: 260, padding: 0 }}>No category data available</div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Sales by Channel */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Sales by Channel</h3>
          {channelData.length > 0 ? (
            <div style={{ height: '220px' }}>
              <Doughnut data={channelChartData} options={noscaleOptions} />
            </div>
          ) : (
            <div className="empty-state" style={{ height: 220, padding: 0 }}>No channel data</div>
          )}
        </div>

        {/* Low Stock Table */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <AlertTriangle size={20} style={{ color: 'var(--g-yellow)' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Inventory Alerts</h3>
            {lowStock.length > 0 && <span className="badge badge-warning" style={{ marginLeft: 'auto' }}>{lowStock.length}</span>}
          </div>
          {lowStock.length === 0 ? (
            <div className="empty-state" style={{ height: 160, padding: 0 }}>
              <Package size={32} />
              <p>All products well-stocked!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 240, overflowY: 'auto', paddingRight: '0.5rem' }}>
              {lowStock.map(p => (
                <div key={p._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: 8, background: p.stock === 0 ? 'var(--g-red-light)' : 'var(--g-yellow-light)', border: `1px solid ${p.stock === 0 ? 'rgba(234,67,53,0.3)' : 'rgba(251,188,5,0.4)'}` }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.category} · ${p.price}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: p.stock === 0 ? 'var(--g-red)' : '#b06000' }}>
                      {p.stock === 0 ? 'Out of stock' : `${p.stock} left`}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Min: {p.lowStockThreshold}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
