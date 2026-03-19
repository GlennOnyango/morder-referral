import axios from "axios";

export type SignInPayload = {
  email: string;
  password: string;
};

export type CognitoAuthenticationResult = {
  AccessToken: string;
  ExpiresIn: number;
  IdToken: string;
  RefreshToken?: string;
  TokenType: string;
};

export type CognitoInitiateAuthResponse = {
  AuthenticationResult?: CognitoAuthenticationResult;
  ChallengeName?: string;
  ChallengeParameters?: Record<string, string>;
  Session?: string;
};

const COGNITO_AUTH_URL =
  (import.meta.env.VITE_COGNITO_AUTH_URL as string | undefined) ??
  "https://cognito-idp.us-east-1.amazonaws.com";
const COGNITO_AUTH_TARGET = "AWSCognitoIdentityProviderService.InitiateAuth";
const COGNITO_CLIENT_ID =
  (import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined) ??
  "2v5fd6rccq9dsk1v0ijpjt02k0";
const COGNITO_AUTH_FLOW =
  (import.meta.env.VITE_COGNITO_AuthFlow as string | undefined) ?? "USER_PASSWORD_AUTH";
const COGNITO_SESSION =
  (import.meta.env.VITE_COGNITO_SESSION as string | undefined) ?? "";

export async function initiateAuth({
  email,
  password,
}: SignInPayload): Promise<CognitoInitiateAuthResponse> {
  const payload: {
    AuthFlow: string;
    ClientId: string;
    Session?: string;
    AuthParameters: {
      USERNAME: string;
      PASSWORD: string;
    };
  } = {
    AuthFlow: COGNITO_AUTH_FLOW,
    ClientId: COGNITO_CLIENT_ID,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  };

  if (COGNITO_SESSION) {
    payload.Session = COGNITO_SESSION;
  }

  const response = await axios.request<CognitoInitiateAuthResponse>({
    method: "post",
    maxBodyLength: Infinity,
    url: COGNITO_AUTH_URL,
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": COGNITO_AUTH_TARGET,
    },
    data: payload,
  });

  return response.data;
}
