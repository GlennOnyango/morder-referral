import { Link } from "react-router-dom";
import {
  performanceHighlights,
  referralLevels,
} from "../content/marketingContent";

const referralTimeSeries = [
  { time: "08:10", title: "Referral Raised", detail: "Clinical note and service request captured." },
  { time: "08:24", title: "Matched Fast", detail: "Best-fit receiving facility identified." },
  { time: "08:41", title: "Accepted", detail: "Receiving team confirms readiness and response." },
  { time: "09:05", title: "Handover Complete", detail: "Transfer lands with full visibility." },
];

function HomePage() {
  return (
    <div className="home-page">
      <section className="hero hero-minimal">
        <div className="hero-content reveal delay-1">
          <p className="eyebrow">Kenya-wide Clinical Coordination</p>
          <h1>Minimal steps. Faster referrals. Clear movement across every level of care.</h1>
          <p className="lead">
            A calmer referral experience for facilities that need to route patients quickly,
            keep context intact, and stay visible from first escalation to final handover.
          </p>

          <div className="cta-group">
            <Link className="btn btn-primary btn-lg" to="/signin">
              Access Referral Desk
            </Link>
            <Link className="btn btn-ghost btn-lg" to="/how-it-works">
              How it works
            </Link>
          </div>

          <div className="hero-series">
            {referralTimeSeries.map((point) => (
              <article key={point.time} className="hero-series-point">
                <span>{point.time}</span>
                <strong>{point.title}</strong>
                <p>{point.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="hero-showcase reveal delay-2" aria-hidden="true">
          <div className="pulse-orb pulse-orb-one" />
          <div className="pulse-orb pulse-orb-two" />
          <div className="series-board">
            <div className="series-line" />
            {referralTimeSeries.map((point, index) => (
              <article
                key={point.time}
                className={`series-node series-node-${index + 1}`}
              >
                <div className="series-dot" />
                <span>{point.time}</span>
                <strong>{point.title}</strong>
              </article>
            ))}
          </div>

          <div className="signal-grid">
            {performanceHighlights.map((item, index) => (
              <article
                key={item.label}
                className={`signal-card signal-card-${index + 1}`}
              >
                <p>{item.label}</p>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="levels-section reveal delay-3">
        <div className="section-header section-header-split">
          <div>
            <p className="eyebrow">Referral Through All Levels</p>
            <h2>The same network supports primary care, county hospitals, and specialized centers.</h2>
          </div>
          <Link className="text-link" to="/about">
            Learn more about the platform
          </Link>
        </div>

        <div className="levels-grid">
          {referralLevels.map((level, index) => (
            <article key={level.title} className="level-card">
              <span className="level-index">0{index + 1}</span>
              <h3>{level.title}</h3>
              <p>{level.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default HomePage;
