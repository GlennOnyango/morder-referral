import {
  onboardingRequirements,
  responsePaths,
  workflowStates,
} from "../content/marketingContent";

function HowItWorksPage() {
  return (
    <div className="info-page">
      <section className="info-hero">
        <p className="eyebrow">How It Works</p>
        <h1>Referral operations designed around clear movement, response, and handover.</h1>
        <p className="lead">
          The platform guides facilities from referral submission through review, transfer,
          and outcome capture with shared visibility at each stage.
        </p>
      </section>

      <section className="info-grid">
        <article className="info-card info-card-wide">
          <div className="section-header">
            <p className="eyebrow">Referral State Machine</p>
            <h2>How referrals move from request to clinical handover</h2>
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
        </article>

        <article className="info-card info-card-compact">
          <div className="section-header">
            <p className="eyebrow">Facility Responses</p>
            <h2>Decision paths after receiving a case</h2>
          </div>

          <ul className="detail-list">
            {responsePaths.map((path) => (
              <li key={path.title}>
                <h3>{path.title}</h3>
                <p>{path.detail}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="info-card info-card-wide">
        <div className="section-header">
          <p className="eyebrow">Hospital Onboarding</p>
          <h2>Required information before joining the referral network</h2>
        </div>

        <ul className="chip-grid">
          {onboardingRequirements.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default HowItWorksPage;
