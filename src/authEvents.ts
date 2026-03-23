export const AUTH_REFRESHED_EVENT = "refconnect:auth-refreshed";
export const AUTH_REQUIRED_EVENT = "refconnect:auth-required";

export function dispatchAuthRefreshedEvent() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(AUTH_REFRESHED_EVENT));
}

export function dispatchAuthRequiredEvent() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT));
}
