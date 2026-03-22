import type { AppRole } from "../context/AuthContext";
import type { MsOrganizationsInternalDomainModelOrganization as Organization } from "../types/api.generated";

function normalizeFacilityIdentifier(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

export function isFacilityManager(role?: AppRole | null): boolean {
  return role === "HOSPITAL_ADMIN" || role === "SUPER_ADMIN";
}

export function canManageFacilityCatalog(role?: AppRole | null): boolean {
  return role === "SUPER_ADMIN";
}

export function isOrganizationOwnedBySessionFacility(
  organization: Organization | undefined,
  sessionFacilityId?: string,
): boolean {
  if (!organization) {
    return false;
  }

  const normalizedSessionFacility = normalizeFacilityIdentifier(sessionFacilityId);
  if (!normalizedSessionFacility) {
    return false;
  }

  const normalizedFacilityCode = normalizeFacilityIdentifier(organization.facility_code);
  const normalizedOrganizationId = normalizeFacilityIdentifier(organization.id);

  return (
    normalizedSessionFacility === normalizedFacilityCode ||
    normalizedSessionFacility === normalizedOrganizationId
  );
}

export function canAccessOrganization(
  role: AppRole | null | undefined,
  sessionFacilityId: string | undefined,
  organization: Organization | undefined,
): boolean {
  if (role === "SUPER_ADMIN") {
    return true;
  }

  if (role !== "HOSPITAL_ADMIN") {
    return false;
  }

  return isOrganizationOwnedBySessionFacility(organization, sessionFacilityId);
}
