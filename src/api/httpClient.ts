import axios, { AxiosHeaders } from "axios";
import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { getAuthTokens } from "../auth";
import {
  dispatchAuthRefreshedEvent,
  dispatchAuthRequiredEvent,
} from "../authEvents";

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _authRetry?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;
let authRedirectInFlight = false;

function getErrorMessage(data: unknown): string {
  if (!data || typeof data !== "object") {
    return "";
  }

  if ("message" in data && typeof data.message === "string") {
    return data.message;
  }

  if ("error" in data && typeof data.error === "string") {
    return data.error;
  }

  return "";
}

function isTokenValidationError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;
  if (status === 401) {
    return true;
  }

  if (status !== 403) {
    return false;
  }

  const loweredMessage = getErrorMessage(error.response?.data).toLowerCase();
  if (!loweredMessage) {
    return false;
  }

  return ["token", "jwt", "expired", "unauthorized", "not authorized", "signature"].some(
    (keyword) => loweredMessage.includes(keyword),
  );
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const { accessToken, idToken } = await getAuthTokens(true);
        if (!accessToken || !idToken) {
          return null;
        }

        dispatchAuthRefreshedEvent();
        return accessToken;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

function redirectToSignIn() {
  dispatchAuthRequiredEvent();

  if (typeof window === "undefined") {
    return;
  }

  if (window.location.pathname.startsWith("/signin")) {
    return;
  }

  if (authRedirectInFlight) {
    return;
  }

  authRedirectInFlight = true;
  window.location.assign("/signin");
}

export function createApiClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      if (!isTokenValidationError(error) || !axios.isAxiosError(error) || !error.config) {
        return Promise.reject(error);
      }

      const originalRequest = error.config as RetriableRequestConfig;
      if (originalRequest._authRetry) {
        redirectToSignIn();
        return Promise.reject(error);
      }

      originalRequest._authRetry = true;

      const refreshedAccessToken = await refreshAccessToken();
      if (!refreshedAccessToken) {
        redirectToSignIn();
        return Promise.reject(error);
      }

      const requestHeaders = AxiosHeaders.from(originalRequest.headers);
      requestHeaders.set("Authorization", `Bearer ${refreshedAccessToken}`);
      originalRequest.headers = requestHeaders;

      return client.request(originalRequest);
    },
  );

  return client;
}
