/** Idle time before forced sign-out (1 hour). */
export const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;

/** localStorage key for last user activity timestamp. */
export const LAST_ACTIVITY_KEY = "scc:last-activity";

export const INACTIVITY_REDIRECT = "/?reason=inactive";
