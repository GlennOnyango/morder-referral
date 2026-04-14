import {
  architectureHighlights,
  coreCapabilities,
  operationalMetrics,
} from "../../content/marketingContent";

function AboutPage() {
  return (
    <div className="info-page">
      <section className="info-hero">
        <p className="eyebrow">About Us</p>
        <h1>A Kenya-aligned referral exchange built for coordinated care at scale.</h1>
        <p className="lead">
          RefConnect Kenya supports counties, referral desks, and facilities with a digital
          backbone for smarter routing, safer communication, and measurable operations.
        </p>
      </section>

      <section className="info-grid">
        <article className="info-card info-card-wide">
          <div className="section-header">
            <p className="eyebrow">Core Capabilities</p>
            <h2>Built for national and county referral operations</h2>
          </div>

          <ul className="feature-list">
            {coreCapabilities.map((capability) => (
              <li key={capability}>{capability}</li>
            ))}
          </ul>
        </article>

        <article className="info-card info-card-compact">
          <div className="section-header">
            <p className="eyebrow">Operational Metrics</p>
            <h2>What the platform helps teams track</h2>
          </div>

          <ul className="metric-list">
            {operationalMetrics.map((metric) => (
              <li key={metric}>{metric}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="info-card info-card-wide">
        <div className="section-header">
          <p className="eyebrow">System Blueprint</p>
          <h2>AI-enabled and referral-ready architecture</h2>
        </div>

        <div className="architecture-grid">
          {architectureHighlights.map((item) => (
            <article key={item.title} className="architecture-card">
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default AboutPage;
