import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Package,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { analyticsAPI, aiAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const KPICard = ({
  title,
  value,
  prefix = "",
  suffix = "",
  growth,
  icon: Icon,
  color,
  loading,
}) => {
  const isPositive = growth >= 0;
  return (
    <div
      className="stat-card"
      style={{ '--accent-color': color }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div
          style={{
            width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: color + "15",
          }}
        >
          <Icon size={22} style={{ color }} />
        </div>
        {growth !== undefined && (
          <span
            className="badge"
            style={{
              background: isPositive ? 'var(--g-green-light)' : 'var(--g-red-light)',
              color: isPositive ? 'var(--g-green)' : 'var(--g-red)',
            }}
          >
            {isPositive ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {Math.abs(growth).toFixed(1)}%
          </span>
        )}
      </div>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ height: 28, width: 96, background: 'var(--surface-alt)', borderRadius: 4 }} className="animate-pulse"></div>
          <div style={{ height: 16, width: 64, background: 'var(--surface-alt)', borderRadius: 4 }} className="animate-pulse"></div>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {prefix}
            {typeof value === "number" ? value.toLocaleString() : value}
            {suffix}
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontWeight: 500 }}>
            {title}
          </p>
        </>
      )}
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [revenueChart, setRevenueChart] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [aiInsights, setAiInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [chartPeriod, setChartPeriod] = useState(30);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, revenueRes, topRes, lowStockRes] = await Promise.all([
        analyticsAPI.summary(),
        analyticsAPI.revenue({ days: chartPeriod }),
        analyticsAPI.topProducts({ limit: 5 }),
        analyticsAPI.lowStock(),
      ]);
      setSummary(summaryRes.data.data);
      setRevenueChart(revenueRes.data.data);
      setTopProducts(topRes.data.data);
      setLowStock(lowStockRes.data.data);
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [chartPeriod]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const generateInsights = async () => {
    setInsightsLoading(true);
    try {
      const { data } = await aiAPI.salesInsights({
        products: topProducts,
        totalRevenue: summary?.revenue,
        orders: summary?.totalOrders,
        lowStock,
        period: `${chartPeriod} days`,
      });
      setAiInsights(data.data);
      toast.success("AI insights generated!");
    } catch {
      toast.error("Failed to generate AI insights. Check your API key.");
    } finally {
      setInsightsLoading(false);
    }
  };

  const chartData = {
    labels:
      revenueChart?.chart?.map((d) => {
        const date = new Date(d.date);
        return date.toLocaleDateString("en", {
          month: "short",
          day: "numeric",
        });
      }) || [],
    datasets: [
      {
        label: "Revenue",
        data: revenueChart?.chart?.map((d) => d.revenue) || [],
        borderColor: "#1a73e8",
        backgroundColor: "rgba(26, 115, 232, 0.1)",
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: "#1a73e8",
        pointBorderColor: "#ffffff",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#202124",
        titleColor: "#ffffff",
        bodyColor: "#e8eaed",
        borderColor: "#5f6368",
        borderWidth: 1,
        padding: 12,
        boxPadding: 4,
        callbacks: {
          label: (ctx) =>
            ` $${ctx.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: "#f1f3f4", drawBorder: false },
        ticks: { color: "#5f6368", font: { size: 11, family: 'Inter' }, maxTicksLimit: 7 },
      },
      y: {
        grid: { color: "#f1f3f4", drawBorder: false },
        ticks: {
          color: "#5f6368",
          font: { size: 11, family: 'Inter' },
          callback: (v) => `$${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`,
        },
      },
    },
  };

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="dashboard-page">
      {/* Header */}
      <section className="premium-hero" style={{ position: 'relative' }}>
        <button
          onClick={fetchData}
          className="btn btn-secondary"
          disabled={loading}
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <RefreshCw size={15} className={loading ? "spinner" : ""} />
          Refresh
        </button>
        <div>
          <span className="hero-eyebrow">Premium SaaS Dashboard</span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {greeting}, {user?.name?.split(" ")[0]} 👋
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Analyze product performance, revenue trends, sales growth, and low-performing products for {user?.storeName}.
          </p>
        </div>
      </section>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <KPICard
          title="Revenue (30 days)"
          value={summary?.revenue?.toFixed(0) || 0}
          prefix="$"
          growth={summary?.revenueGrowth}
          icon={DollarSign}
          color="#34a853" // Google Green
          loading={loading}
        />
        <KPICard
          title="Total Orders"
          value={summary?.totalOrders || 0}
          growth={summary?.ordersGrowth}
          icon={ShoppingCart}
          color="#1a73e8" // Google Blue
          loading={loading}
        />
        <KPICard
          title="Total Products"
          value={summary?.totalProducts || 0}
          icon={Package}
          color="#fbbc05" // Google Yellow
          loading={loading}
        />
        <KPICard
          title="Avg. Order Value"
          value={summary?.avgOrderValue || 0}
          prefix="$"
          icon={TrendingUp}
          color="#ea4335" // Google Red
          loading={loading}
        />
      </div>

      {/* Charts row */}
      <div className="dashboard-charts-row">
        {/* Revenue Chart */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Revenue Overview</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                $
                {revenueChart?.totalRevenue?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                }) || "0.00"}{" "}
                total
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--surface-alt)', padding: '0.25rem', borderRadius: '8px' }}>
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setChartPeriod(d)}
                  style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    transition: 'all 0.15s',
                    border: 'none',
                    cursor: 'pointer',
                    background: chartPeriod === d ? '#fff' : 'transparent',
                    color: chartPeriod === d ? 'var(--g-blue)' : 'var(--text-secondary)',
                    boxShadow: chartPeriod === d ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: "260px" }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Top Products */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Top Products</h3>
            <Link
              to="/products"
              style={{ fontSize: '0.8rem', color: 'var(--g-blue)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {loading
              ? Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 36, height: 36, background: 'var(--surface-alt)', borderRadius: 8 }} className="animate-pulse"></div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <div style={{ height: 12, width: 120, background: 'var(--surface-alt)', borderRadius: 4 }} className="animate-pulse"></div>
                        <div style={{ height: 10, width: 80, background: 'var(--surface-alt)', borderRadius: 4 }} className="animate-pulse"></div>
                      </div>
                    </div>
                  ))
              : topProducts.map((p, i) => (
                  <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', background: 'var(--g-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--g-blue)' }}>
                          {i + 1}
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        ${p.totalRevenue?.toLocaleString()}
                      </p>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--g-green)', fontWeight: 600, flexShrink: 0, background: 'var(--g-green-light)', padding: '0.125rem 0.5rem', borderRadius: 99 }}>
                      {p.totalSales} sold
                    </span>
                  </div>
                ))}
          </div>
        </div>
      </div>

      {/* Low Stock + AI Insights */}
      <div className="dashboard-bottom-row">
        {/* Low Stock Alert */}
        {lowStock.length > 0 && (
          <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--g-yellow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertTriangle size={20} style={{ color: '#b06000' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#b06000' }}>Low Stock Alerts</h3>
              <span className="badge badge-warning" style={{ marginLeft: 'auto' }}>
                {lowStock.length} items
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {lowStock.slice(0, 5).map((p) => (
                <div
                  key={p._id}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}
                >
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {p.name}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.category}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--g-red)' }}>
                      {p.stock} left
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Min: {p.lowStockThreshold}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Insights Panel */}
        <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #ffffff, #f8faff)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Sparkles size={20} style={{ color: 'var(--g-blue)' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              AI Sales Insights
            </h3>
            <span className="badge badge-info" style={{ marginLeft: 'auto' }}>Gemini Pro</span>
          </div>

          {!aiInsights ? (
            <div className="empty-state" style={{ padding: '2rem 1rem' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--g-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Sparkles size={28} style={{ color: 'var(--g-blue)' }} />
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: 240 }}>
                Generate pricing recommendations, inventory suggestions, trending product predictions, and sales improvement advice.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.5rem', width: '100%', maxWidth: 420, marginBottom: '1.5rem' }}>
                {['Product performance', 'Revenue trends', 'Sales growth', 'Low performers'].map((item) => (
                  <span key={item} className="badge badge-neutral" style={{ justifyContent: 'center', padding: '0.5rem' }}>{item}</span>
                ))}
              </div>
              <button
                onClick={generateInsights}
                className="btn btn-primary"
                disabled={insightsLoading}
              >
                {insightsLoading ? (
                  <>
                    <div className="spinner"></div>{" "}
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Generate Insights
                  </>
                )}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="ai-result">
                {aiInsights.summary}
              </div>

              <div style={{ padding: '1rem', borderRadius: 12, background: 'var(--g-blue-light)', border: '1px solid rgba(26,115,232,0.2)' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--g-blue)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                  Example signal
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                  Wireless earbuds sales increased 24% this month. Consider increasing inventory and running a premium bundle offer.
                </p>
              </div>
              
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--g-blue)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Sales Improvement Advice
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {aiInsights.actionItems?.slice(0, 3).map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--g-blue-light)', color: 'var(--g-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0, marginTop: '0.1rem' }}>
                        {i + 1}
                      </span>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {aiInsights.trendingInsights?.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--g-green)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Trending
                  </p>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyle: 'none' }}>
                    {aiInsights.trendingInsights
                      ?.slice(0, 2)
                      .map((insight, i) => (
                        <li
                          key={i}
                          style={{ display: 'flex', alignItems: 'flex-start', gap: '0.375rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}
                        >
                          <TrendingUp
                            size={14}
                            style={{ color: 'var(--g-green)', flexShrink: 0, marginTop: '0.125rem' }}
                          />
                          {insight}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {aiInsights.pricingRecommendations?.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b06000', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Pricing Recommendations
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {aiInsights.pricingRecommendations.slice(0, 2).map((rec, i) => (
                      <div key={i} style={{ padding: '0.75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{rec.product}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          ${rec.currentPrice} {'->'} ${rec.suggestedPrice}. {rec.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <button
                onClick={generateInsights}
                className="btn btn-secondary"
                style={{ alignSelf: 'flex-start', fontSize: '0.8rem', padding: '0.375rem 0.75rem' }}
                disabled={insightsLoading}
              >
                <RefreshCw
                  size={14}
                  className={insightsLoading ? "spinner" : ""}
                />{" "}
                Refresh Analysis
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
