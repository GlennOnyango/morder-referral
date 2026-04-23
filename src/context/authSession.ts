import { getAuthenticatedUser, getAuthTokens, getUserRoles } from "../auth";
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

    return {
      accessToken,
      idToken,
      roles: Array.from(seen),
      email: getEmailFromClaims(idTokenPayload) ?? getEmailFromClaims(accessTokenPayload),
      facilityId: getFacilityIdFromClaims(idTokenPayload) ?? getFacilityIdFromClaims(accessTokenPayload),
    };
  } catch {
    return null;
  }
};
