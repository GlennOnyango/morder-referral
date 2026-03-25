export const performanceHighlights = [
  { label: "County Coverage", value: "47 Counties" },
  { label: "Referral Visibility", value: "Real-time" },
  { label: "Facility Levels", value: "Level 2 to 6" },
  { label: "Referral SLA Tracking", value: "24/7" },
];

export const referralLevels = [
  {
    title: "Community & Primary Care",
    detail:
      "Level 2 and 3 facilities raise referrals quickly with structured triage and digital notes.",
  },
  {
    title: "Sub-County Hospitals",
    detail:
      "Level 4 hospitals receive, accept, and coordinate diagnostics with clear handover paths.",
  },
  {
    title: "County Referral Hospitals",
    detail:
      "Level 5 teams escalate complex cases, route specialists, and monitor turnaround in one queue.",
  },
  {
    title: "National Teaching & Specialized",
    detail:
      "Level 6 centers close the loop with clinical feedback, outcomes, and return-transfer plans.",
  },
];

export const coreCapabilities = [
  "AI-assisted facility matching using service capability, capacity snapshots, urgency, and proximity.",
  "Countrywide referral pool supporting both broadcast referrals and direct targeted referrals.",
  "Secure, traceable communication between referring and receiving facilities with full history.",
  "Audit-ready workflows for county coordinators, referral desks, and national reporting.",
];

export const onboardingRequirements = [
  "Referral services offered and facility level (Level 2 to 6).",
  "Facility location, county/sub-county, and ownership type (public/private/faith-based).",
  "Payment modes accepted: cash, insurance, mobile money, and SHA pathway.",
  "Accepted insurance providers and eligibility verification process.",
  "Standard KYC, licensing status, and referral desk contacts.",
  "Operational status, emergency readiness, and ambulance/transport contacts.",
];

export const workflowStates = [
  {
    name: "Draft and Submit",
    detail:
      "Hospital A creates a referral with urgency, requested service, and stabilization notes.",
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

export const responsePaths = [
  {
    title: "Accept",
    detail:
      "Hospital B accepts the case, Hospital A releases transfer, and the referral transitions to transport and handover.",
  },
  {
    title: "Request More Info",
    detail:
      "Hospital B requests additional clinical details, Hospital A responds, then acceptance decision proceeds.",
  },
  {
    title: "Reject / Re-route",
    detail:
      "If rejected within policy window, referral is re-opened and routed to the next best matched facility.",
  },
];

export const architectureHighlights = [
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

export const operationalMetrics = [
  "Median time-to-accept and time-to-arrival by urgency class.",
  "Acceptance and decline rates by service category and facility level.",
  "Counter-referral completion rate and documented feedback loops.",
];
