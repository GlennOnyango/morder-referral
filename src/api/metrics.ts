import axios from "axios";
import type {
  MsOrganizationsInternalDomainModelOrganization as Organization,
  MsOrganizationsInternalDomainModelPatient as Patient,
  MsOrganizationsInternalDomainModelService as Service,
} from "../types/api.generated";

type MetricsSummary = {
  label: string;
  value: number | string;
};

export type DashboardMetrics = {
  organizationMetrics: MetricsSummary[];
  serviceMetrics: MetricsSummary[];
  patientMetrics: MetricsSummary[];
};

const ORGANIZATIONS_BASE_URL =
  (import.meta.env.VITE_ORGANIZATIONS_API_BASE_URL as string | undefined) ??
  "https://nrs-organizations-production.up.railway.app";

const metricsApi = axios.create({
  baseURL: ORGANIZATIONS_BASE_URL,
});

function authHeaders(accessToken?: string) {
  if (!accessToken) {
    return undefined;
  }
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

function countBy(items: string[]) {
  return items.reduce<Record<string, number>>((accumulator, value) => {
    const key = value.trim().toLowerCase();
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
}

function pickTopLabel(counts: Record<string, number>, fallback: string): string {
  const entries = Object.entries(counts);
  if (entries.length === 0) {
    return fallback;
  }

  entries.sort((a, b) => b[1] - a[1]);
  const [label, count] = entries[0];
  return `${label} (${count})`;
}

async function fetchOrganizations(accessToken?: string): Promise<Organization[]> {
  const response = await metricsApi.get<Organization[]>("/organizations", {
    params: { limit: 1000, offset: 0 },
    headers: authHeaders(accessToken),
  });
  return response.data;
}

async function fetchPatients(accessToken?: string): Promise<Patient[]> {
  const response = await metricsApi.get<Patient[]>("/patients", {
    headers: authHeaders(accessToken),
  });
  return response.data;
}

async function fetchServicesForOrganization(
  organizationId: string,
  accessToken?: string,
): Promise<Service[]> {
  const response = await metricsApi.get<Service[]>(`/organizations/${organizationId}/services`, {
    headers: authHeaders(accessToken),
  });
  return response.data;
}

export async function fetchDashboardMetrics(accessToken?: string): Promise<DashboardMetrics> {
  const organizations = await fetchOrganizations(accessToken);
  const organizationIds = organizations
    .map((organization) => organization.id)
    .filter((id): id is string => Boolean(id));

  const [patients, servicesByOrganization] = await Promise.all([
    fetchPatients(accessToken),
    Promise.all(
      organizationIds.map(async (organizationId) => {
        try {
          return await fetchServicesForOrganization(organizationId, accessToken);
        } catch {
          return [];
        }
      }),
    ),
  ]);

  const services = servicesByOrganization.flat();

  const levelCounts = countBy(
    organizations
      .map((organization) =>
        organization.level === undefined ? "" : `level ${organization.level}`,
      )
      .filter((value) => value.length > 0),
  );

  const ownershipCounts = countBy(
    organizations
      .map((organization) => organization.ownership_type ?? "")
      .filter((value) => value.length > 0),
  );

  const availabilityCounts = countBy(
    services.map((service) => service.availability ?? "").filter((value) => value.length > 0),
  );

  const activePatients = patients.filter((patient) => patient.active === true).length;
  const inactivePatients = patients.length - activePatients;

  const genderCounts = countBy(
    patients.map((patient) => patient.gender ?? "").filter((value) => value.length > 0),
  );

  const servicesPerOrganization =
    organizations.length === 0 ? 0 : Number((services.length / organizations.length).toFixed(2));

  return {
    organizationMetrics: [
      { label: "Total Facilities", value: organizations.length },
      { label: "Top Facility Level", value: pickTopLabel(levelCounts, "n/a") },
      { label: "Top Ownership Type", value: pickTopLabel(ownershipCounts, "n/a") },
    ],
    serviceMetrics: [
      { label: "Total Services", value: services.length },
      { label: "Average Services / Facility", value: servicesPerOrganization },
      { label: "Most Common Availability", value: pickTopLabel(availabilityCounts, "n/a") },
    ],
    patientMetrics: [
      { label: "Total Patients", value: patients.length },
      { label: "Active Patients", value: activePatients },
      { label: "Inactive Patients", value: inactivePatients },
      { label: "Most Common Gender", value: pickTopLabel(genderCounts, "n/a") },
    ],
  };
}
