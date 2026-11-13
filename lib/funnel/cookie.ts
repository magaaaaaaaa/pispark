/** Carries a new lead's link token to the pick-a-time page without putting it in a URL. */
export const LEAD_COOKIE = "pispark_lead";
export const LEAD_COOKIE_MAX_AGE = 30 * 86_400;

export function leadCookie(token: string): string {
  return `${LEAD_COOKIE}=${token}; Path=/; Max-Age=${LEAD_COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}
