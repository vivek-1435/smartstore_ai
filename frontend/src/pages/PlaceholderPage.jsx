import { ArrowUpRight, Clock, Sparkles } from 'lucide-react';

const copy = {
  orders: {
    title: 'Orders',
    eyebrow: 'Operations',
    text: 'Track order velocity, fulfillment status, refunds, and revenue impact from one command center.',
    metric: '1,248',
    label: 'orders tracked',
  },
  customers: {
    title: 'Customers',
    eyebrow: 'Audience',
    text: 'Segment shoppers by lifetime value, repeat purchase behavior, and AI-predicted churn risk.',
    metric: '38%',
    label: 'repeat buyer rate',
  },
  settings: {
    title: 'Settings',
    eyebrow: 'Workspace',
    text: 'Manage store identity, team access, notifications, billing preferences, and AI automation rules.',
    metric: 'Pro',
    label: 'workspace plan',
  },
};

const PlaceholderPage = ({ type }) => {
  const page = copy[type] || copy.orders;

  return (
    <div className="dashboard-page">
      <section className="premium-hero compact">
        <div>
          <span className="hero-eyebrow">{page.eyebrow}</span>
          <h2>{page.title}</h2>
          <p>{page.text}</p>
        </div>
        <div className="hero-metric">
          <strong>{page.metric}</strong>
          <span>{page.label}</span>
        </div>
      </section>

      <section className="card placeholder-panel">
        <div className="placeholder-icon">
          <Clock size={24} />
        </div>
        <div>
          <h3>{page.title} workspace</h3>
          <p>This premium module is staged in the navigation and ready for the next data integration.</p>
        </div>
        <span className="badge badge-info">
          <Sparkles size={12} /> AI-ready
        </span>
        <ArrowUpRight size={18} className="placeholder-arrow" />
      </section>
    </div>
  );
};

export default PlaceholderPage;
