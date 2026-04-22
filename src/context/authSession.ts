import { getAuthenticatedUser, getAuthTokens, getUserRoles } from "../auth";
import { getEmailFromClaims, getFacilityIdFromClaims } from "./authClaims";
import { resolveRoleFromClaims, resolveRoleFromGroups } from "./authRole";
import type { AuthSession } from "./authTypes";

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

    return {
      accessToken,
      idToken,
      role:
        resolveRoleFromGroups(userRoles) ??
        resolveRoleFromClaims(accessTokenPayload) ??
        resolveRoleFromClaims(idTokenPayload),
      email: getEmailFromClaims(idTokenPayload) ?? getEmailFromClaims(accessTokenPayload),
      facilityId: getFacilityIdFromClaims(idTokenPayload) ?? getFacilityIdFromClaims(accessTokenPayload),
    };
  } catch {
    return null;
  }
};
