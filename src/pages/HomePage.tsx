import { Link } from "react-router-dom";

const performanceHighlights = [
  { label: "County Coverage", value: "47 Counties" },
  { label: "Referral Visibility", value: "Real-time" },
  { label: "Facility Levels", value: "Level 2 to 6" },
  { label: "Referral SLA Tracking", value: "24/7" },
];

const referralLevels = [
  {
    title: "Community & Primary Care",
    detail: "Level 2 and 3 facilities raise referrals quickly with structured triage and digital notes.",
  },
  {
    title: "Sub-County Hospitals",
    detail: "Level 4 hospitals receive, accept, and coordinate diagnostics with clear handover paths.",
  },
  {
    title: "County Referral Hospitals",
    detail: "Level 5 teams escalate complex cases, route specialists, and monitor turnaround in one queue.",
  },
  {
    title: "National Teaching & Specialized",
    detail: "Level 6 centers close the loop with clinical feedback, outcomes, and return-transfer plans.",
  },
];

const coreCapabilities = [
  "AI-assisted facility matching using service capability, capacity snapshots, urgency, and proximity.",
  "Countrywide referral pool supporting both broadcast referrals and direct targeted referrals.",
  "Secure, traceable communication between referring and receiving facilities with full history.",
  "Audit-ready workflows for county coordinators, referral desks, and national reporting.",
];

const onboardingRequirements = [
  "Referral services offered and facility level (Level 2 to 6).",
  "Facility location, county/sub-county, and ownership type (public/private/faith-based).",
  "Payment modes accepted: cash, insurance, mobile money, and SHA pathway.",
  "Accepted insurance providers and eligibility verification process.",
  "Standard KYC, licensing status, and referral desk contacts.",
  "Operational status, emergency readiness, and ambulance/transport contacts.",
];

const workflowStates = [
  {
    name: "Draft and Submit",
    detail:
      "Hospital A creates a referral with patient context, urgency, requested service, and stabilization notes.",
  },
  {
    name: "Broadcast or Target",
    detail:
      "Referral pool either broadcasts by proximity/capability or sends direct referral to a selected facility.",
  },
  {
    name: "Clinical Response Loop",
    detail:
      "Receiving facility can Accept, Request More Info, or Decline with reason and response window.",
  },
  {
    name: "Accepted and In Transit",
    detail:
      "Once accepted, referral is removed from open pool and transfer logistics are activated with ETA tracking.",
  },
  {
    name: "Handover and Completion",
    detail:
      "Receiving team records handover and outcome, then supports counter-referral/back-referral when needed.",
  },
  {
    name: "Timeout and Escalation",
    detail:
      "No-response or rejection windows trigger escalation, re-open, and re-broadcast workflows.",
  },
];

const responsePaths = [
  {
    title: "Accept",
    detail:
      "Hospital B accepts the case, Hospital A releases transfer, and the referral transitions to transport and handover.",
  },
  {
    title: "Request More Info",
    detail:
      "Hospital B requests additional patient details, Hospital A responds, then acceptance decision proceeds.",
  },
  {
    title: "Reject / Re-route",
    detail:
      "If rejected within policy window, referral is re-opened and routed to the next best matched facility.",
  },
];

const architectureHighlights = [
  {
    title: "Referral Exchange Core",
    detail:
      "Event-driven referral exchange service orchestrates pool submissions, target creation, and status transitions.",
  },
  {
    title: "Interoperability Ready",
    detail:
      "API-first platform with standards-based integration path for EMRs, facility registries, and FHIR-friendly workflows.",
  },
  {
    title: "Security and Compliance",
    detail:
      "Role-based access, audit trails, encrypted data handling, and privacy controls aligned with Kenya health data requirements.",
  },
  {
    title: "Operational Intelligence",
    detail:
      "Live county dashboards track acceptance rates, SLA timers, decline reasons, and cross-county referral trends.",
  },
];

const operationalMetrics = [
  "Median time-to-accept and time-to-arrival by urgency class.",
  "Acceptance and decline rates by service category and facility level.",
  "Counter-referral completion rate and documented feedback loops.",
];

function HomePage() {
  return (
    <>

      <section className="hero">
        <div className="hero-content reveal delay-1">
          <p className="eyebrow">Kenya-wide Clinical Coordination</p>
          <h1>A modern referral network connecting every level of care.</h1>
          <p className="lead">
            Facilities across Kenya can submit, track, and complete referrals
            end-to-end with faster decisions, safer transfers, and complete
            clinical context.
          </p>

          <div className="cta-group">
            <Link className="btn btn-primary btn-lg" to="/signin">
              Access Referral Desk
            </Link>
          </div>
        </div>

        <div className="hero-panel reveal delay-2">
          <h2>Referral Through All Levels</h2>
          <ul>
            {referralLevels.map((level) => (
              <li key={level.title}>
                <h3>{level.title}</h3>
                <p>{level.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="stats">
        {performanceHighlights.map((item, index) => (
          <article key={item.label} className={`stat-card reveal delay-${index + 1}`}>
            <p>{item.label}</p>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="feature-wrap reveal delay-2">
        <h2>Built for National and County Referral Operations</h2>
        <ul className="feature-list">
          {coreCapabilities.map((capability) => (
            <li key={capability}>{capability}</li>
          ))}
        </ul>
      </section>

      <section className="onboarding reveal delay-3">
        <div className="section-header">
          <p className="eyebrow">Hospital Onboarding</p>
          <h2>Required Information Before Joining the Referral Network</h2>
        </div>

        <ul className="chip-grid">
          {onboardingRequirements.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="workflow reveal delay-4">
        <div className="workflow-main">
          <div className="section-header">
            <p className="eyebrow">Referral State Machine</p>
            <h2>How Referrals Move from Request to Clinical Handover</h2>
          </div>

          <ol className="state-track">
            {workflowStates.map((state, index) => (
              <li key={state.name}>
                <span className="state-index">{index + 1}</span>
                <div>
                  <h3>{state.name}</h3>
                  <p>{state.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <aside className="workflow-branch">
          <h3>Facility Response Paths</h3>
          <ul>
            {responsePaths.map((path) => (
              <li key={path.title}>
                <strong>{path.title}</strong>
                <p>{path.detail}</p>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="architecture reveal delay-4">
        <div className="section-header">
          <p className="eyebrow">System Blueprint</p>
          <h2>AI-Enabled and Kenya-Aligned Referral Architecture</h2>
        </div>

        <div className="architecture-grid">
          {architectureHighlights.map((item) => (
            <article key={item.title} className="architecture-card">
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>

        <ul className="metric-list">
          {operationalMetrics.map((metric) => (
            <li key={metric}>{metric}</li>
          ))}
        </ul>
      </section>
    </>
  );
}

export default HomePage;
