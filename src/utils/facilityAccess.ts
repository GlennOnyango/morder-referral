import type { AppRole } from "../context/authTypes";
import type { ModelOrganization as Organization } from "../types/organizations.generated";

function normalizeFacilityIdentifier(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

export function isFacilityManager(roles?: AppRole[] | null): boolean {
  return Boolean(roles?.includes("HOSPITAL_ADMIN") || roles?.includes("SUPER_ADMIN"));
}

export function canManageFacilityCatalog(roles?: AppRole[] | null): boolean {
  return Boolean(roles?.includes("SUPER_ADMIN"));
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
  roles: AppRole[] | null | undefined,
  sessionFacilityId: string | undefined,
  organization: Organization | undefined,
): boolean {
  if (roles?.includes("SUPER_ADMIN")) {
    return true;
  }

  if (!roles?.includes("HOSPITAL_ADMIN")) {
    return false;
  }

  return isOrganizationOwnedBySessionFacility(organization, sessionFacilityId);
}
