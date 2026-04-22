const getFirstStringClaim = (
  claims: Record<string, unknown> | undefined,
  keys: readonly string[],
  shouldTrim = false,
): string | undefined => {
  if (!claims) {
    return undefined;
  }

  for (const key of keys) {
    const value = claims[key];
    if (typeof value !== "string") {
      continue;
    }

    const normalizedValue = shouldTrim ? value.trim() : value;
    if (normalizedValue.length > 0) {
      return normalizedValue;
    }
  }

  return undefined;
};

export const getEmailFromClaims = (claims?: Record<string, unknown>): string | undefined =>
  getFirstStringClaim(claims, ["email", "username", "cognito:username"]);

export const getFacilityIdFromClaims = (claims?: Record<string, unknown>): string | undefined =>
  getFirstStringClaim(claims, ["custom:facility_id", "facility_id", "facilityId"], true);
