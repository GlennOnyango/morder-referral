import {
  signUp,
  confirmSignUp,
  signIn,
  signOut,
  fetchAuthSession,
  getCurrentUser,
} from "aws-amplify/auth";
import type { AuthTokens } from "aws-amplify/auth";

type TokenPayload = Record<string, unknown>;

export type LoginUserResult = {
  isSignedIn: boolean;
  nextStep?: Awaited<ReturnType<typeof signIn>>["nextStep"];
};

export type AuthTokenSnapshot = {
  accessToken?: string;
  idToken?: string;
  accessTokenPayload?: TokenPayload;
  idTokenPayload?: TokenPayload;
};

function tokenPayloadToRecord(token?: AuthTokens["accessToken"]): TokenPayload | undefined {
  if (!token?.payload || typeof token.payload !== "object") {
    return undefined;
  }

  return token.payload as TokenPayload;
}

function extractGroups(payload?: TokenPayload): string[] {
  if (!payload) {
    return [];
  }

  const groups = payload["cognito:groups"];
  if (!Array.isArray(groups)) {
    return [];
  }

  return groups.filter((group): group is string => typeof group === "string");
}

export async function registerUser(input: {
  email: string;
  password: string;
  givenName?: string;
  familyName?: string;
}) {
  const { isSignUpComplete, nextStep, userId } = await signUp({
    username: input.email,
    password: input.password,
    options: {
      userAttributes: {
        email: input.email,
        ...(input.givenName ? { given_name: input.givenName } : {}),
        ...(input.familyName ? { family_name: input.familyName } : {}),
      },
    },
  });

  return {
    isSignUpComplete,
    nextStep,
    userId,
  };
}

export async function confirmUser(email: string, code: string) {
  const { isSignUpComplete, nextStep } = await confirmSignUp({
    username: email,
    confirmationCode: code,
  });

  return {
    isSignUpComplete,
    nextStep,
  };
}

export async function loginUser(email: string, password: string): Promise<LoginUserResult> {
  const { isSignedIn, nextStep } = await signIn({
    username: email,
    password,
  });

  return {
    isSignedIn,
    nextStep,
  };
}

export async function getAuthTokens(): Promise<AuthTokenSnapshot> {
  const session = await fetchAuthSession();
  const accessToken = session.tokens?.accessToken;
  const idToken = session.tokens?.idToken;

  return {
    accessToken: accessToken?.toString(),
    idToken: idToken?.toString(),
    accessTokenPayload: tokenPayloadToRecord(accessToken),
    idTokenPayload: tokenPayloadToRecord(idToken),
  };
}

export async function getUserRoles(): Promise<string[]> {
  const { accessTokenPayload, idTokenPayload } = await getAuthTokens();
  const accessGroups = extractGroups(accessTokenPayload);
  if (accessGroups.length > 0) {
    return accessGroups;
  }

  return extractGroups(idTokenPayload);
}

export async function getAuthenticatedUser() {
  return getCurrentUser();
}

export async function logoutUser() {
  await signOut();
}
