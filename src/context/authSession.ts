import { getAuthenticatedUser, getAuthTokens, getUserRoles } from "../auth";
import { listUserOrganizations } from "../api/authAdmin";
import { getEmailFromClaims, getFacilityIdFromClaims } from "./authClaims";
import { resolveRolesFromClaims, resolveRolesFromGroups } from "./authRole";
import type { AppRole, AuthSession } from "./authTypes";


export const buildAuthSession = async (): Promise<AuthSession | null> => {
  try {
    await getAuthenticatedUser();

    const [{ accessToken, idToken, accessTokenPayload, idTokenPayload }, userRoles] = await Promise.all([
      getAuthTokens(),
      getUserRoles(),
    ]);

    if (!accessToken || !idToken) {
      return null;
    }

    const seen = new Set<AppRole>([
      ...resolveRolesFromGroups(userRoles),
      ...resolveRolesFromClaims(accessTokenPayload),
      ...resolveRolesFromClaims(idTokenPayload),
    ]);

    const claimFacilityId =
      getFacilityIdFromClaims(idTokenPayload) ?? getFacilityIdFromClaims(accessTokenPayload);

    let facilityId = claimFacilityId;
    if (!facilityId) {
      try {
        const orgs = await listUserOrganizations(accessToken);
        const first = orgs.find((o) => o.organizationId && o.active !== false);
        facilityId = first?.organizationId?.trim() || undefined;
      } catch {
        // swallow — facilityId stays undefined, resolveWorkspace handles it
      }
    }

    return {
      accessToken,
      idToken,
      roles: Array.from(seen),
      email: getEmailFromClaims(idTokenPayload) ?? getEmailFromClaims(accessTokenPayload),
      facilityId,
    };
  } catch {
    return null;
  }
};
