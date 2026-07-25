import type { AdminIdentity, AdminLoginResponse, AdminNotification, AdminSessionInfo, AdminSnapshot, AuditLogEntry, BillingInvoice, GuestIdentity, OrganizationAccess, OrganizationStatus, PlanCode, PlatformClientSummary, PlatformInvoice, PlatformOverview, PublicVenueSnapshot, Role, TeamMember, Venue, VenueModule, Zone } from "@vibevenue/contracts";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:4000").replace(/\/$/, "");
export function assetUrl(value: string): string { return value.startsWith("/") ? `${API_URL}${value}` : value; }
export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly requestId?: string, public readonly code?: string) { super(message); this.name = "ApiError"; }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: "include" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.message ?? `Erro HTTP ${response.status}`, response.status, data.requestId ?? response.headers.get("x-request-id") ?? undefined, data.code);
  return data as T;
}

export const api = {
  publicVenue: (slug: string) => request<{ ok: true; snapshot: PublicVenueSnapshot }>(`/api/public/venues/${encodeURIComponent(slug)}`),
  join: (body: { venueSlug: string; zoneCode: string; nickname: string; acceptedPrivacy: boolean; acceptedTerms: boolean; privacyVersion: string; termsVersion: string }) => request<{ ok: true; token: string; identity: GuestIdentity; snapshot: PublicVenueSnapshot }>("/api/public/join", { method: "POST", body: JSON.stringify(body) }),
  guestMe: (token: string) => request<{ ok: true; identity: GuestIdentity; snapshot: PublicVenueSnapshot }>("/api/public/me", {}, token),
  music: (token: string, body: { title: string; url: string }) => request("/api/public/music", { method: "POST", body: JSON.stringify(body) }, token),
  musicVote: (token: string, id: string) => request(`/api/public/music/${encodeURIComponent(id)}/vote`, { method: "POST" }, token),
  service: (token: string, body: { type: string; note: string; priority: string }) => request("/api/public/service", { method: "POST", body: JSON.stringify(body) }, token),
  order: (token: string, body: { note: string; items: Array<{ itemId: string; quantity: number }> }) => request("/api/public/orders", { method: "POST", body: JSON.stringify(body) }, token),
  pollVote: (token: string, pollId: string, optionId: string) => request(`/api/public/polls/${encodeURIComponent(pollId)}/vote`, { method: "POST", body: JSON.stringify({ optionId }) }, token),
  quizAnswer: (token: string, questionId: string, selectedIndex: number) => request<{ ok: true; correct: boolean }>("/api/public/quiz/answer", { method: "POST", body: JSON.stringify({ questionId, selectedIndex }) }, token),
  feedback: (token: string, score: number, comment: string) => request("/api/public/feedback", { method: "POST", body: JSON.stringify({ score, comment }) }, token),
  loyalty: (token: string, customerKey: string, displayName: string) => request("/api/public/loyalty/checkin", { method: "POST", body: JSON.stringify({ customerKey, displayName }) }, token),
  reserve: (token: string, eventId: string, contact: string, partySize: number) => request(`/api/public/events/${encodeURIComponent(eventId)}/reserve`, { method: "POST", body: JSON.stringify({ contact, partySize }) }, token),
  redeem: (token: string, code: string, customerKey: string) => request("/api/public/campaigns/redeem", { method: "POST", body: JSON.stringify({ code, customerKey }) }, token),
  media: (token: string, form: FormData) => request("/api/public/media", { method: "POST", body: form }, token),

  demoLogin: () => request<{ ok: true; identity: AdminIdentity; token?: string }>("/api/auth/demo", { method: "POST" }),
  login: (email: string, password: string) => request<AdminLoginResponse>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  forgotPassword: (email: string) => request<{ ok: true; message: string }>("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token: string, newPassword: string) => request<{ ok: true }>("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, newPassword }) }),
  verifyMfa: (code: string) => request<{ ok: true; identity: AdminIdentity; recoveryCodes?: string[] }>("/api/auth/mfa/verify", { method: "POST", body: JSON.stringify({ code }) }),
  mfaStatus: () => request<{ ok: true; status: { enabled: boolean; enrolledAt: string | null; recoveryCodesRemaining: number; required: boolean } }>("/api/auth/mfa/status"),
  setupMfa: () => request<{ ok: true; otpauthUri: string }>("/api/auth/mfa/setup", { method: "POST" }),
  stepUp: (currentPassword: string, code: string) => request<{ ok: true; validForMinutes: number }>("/api/auth/step-up", { method: "POST", body: JSON.stringify({ currentPassword, code }) }),
  disableMfa: () => request<{ ok: true; revoked: number }>("/api/auth/mfa/disable", { method: "POST", body: JSON.stringify({}) }),
  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),
  adminMe: () => request<{ ok: true; identity: AdminIdentity; organization: OrganizationAccess | null; venues: Venue[] }>("/api/auth/me"),
  changePassword: (currentPassword: string, newPassword: string) => request("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }),
  sessions: () => request<{ ok: true; sessions: AdminSessionInfo[] }>("/api/auth/sessions"),
  securityEvents: () => request<{ ok: true; items: import("@vibevenue/contracts").SecurityEventEntry[] }>("/api/auth/security-events?limit=30"),
  revokeSession: (sessionId: string) => request(`/api/auth/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" }),
  revokeOtherSessions: () => request<{ ok: true; revoked: number }>("/api/auth/sessions", { method: "DELETE" }),
  platformOverview: () => request<{ ok: true; overview: PlatformOverview }>("/api/platform/overview"),
  platformClients: () => request<{ ok: true; clients: PlatformClientSummary[] }>("/api/platform/clients"),
  platformCreateClient: (body: { company: string; ownerName: string; ownerEmail: string; billingEmail: string; venueName: string; city: string; description: string; plan: PlanCode; monthlyPriceCents: number; trialDays: number; maxVenues: number | null; maxUsers: number | null; maxZonesPerVenue: number | null; requireGuestConsent: boolean; privacyPolicyUrl: string; termsUrl: string; privacyVersion: string; termsVersion: string }) => request<{ ok: true; client: PlatformClientSummary; temporaryPassword: string; venueSlug: string; zoneCode: string }>("/api/platform/clients", { method: "POST", body: JSON.stringify(body) }),
  platformClientCommercial: (organizationId: string, body: { name: string; plan: PlanCode; billingEmail: string; monthlyPriceCents: number; maxVenues: number | null; maxUsers: number | null; maxZonesPerVenue: number | null }) => request<{ ok: true; client: PlatformClientSummary }>(`/api/platform/clients/${encodeURIComponent(organizationId)}/commercial`, { method: "PATCH", body: JSON.stringify(body) }),
  platformClientStatus: (organizationId: string, body: { status: OrganizationStatus; trialDays: number; accessDays: number }) => request<{ ok: true; client: PlatformClientSummary }>(`/api/platform/clients/${encodeURIComponent(organizationId)}/status`, { method: "PATCH", body: JSON.stringify(body) }),
  platformInvoices: (organizationId?: string) => request<{ ok: true; invoices: PlatformInvoice[] }>(`/api/platform/invoices${organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : ""}`),
  platformCreateInvoice: (body: { organizationId: string; reference: string; amountCents: number; dueAt: string; periodStart: string | null; periodEnd: string | null; notes: string }) => request<{ ok: true; invoice: PlatformInvoice }>("/api/platform/invoices", { method: "POST", body: JSON.stringify(body) }),
  platformSettleInvoice: (invoiceId: string, body: { status: "paid" | "void"; paymentMethod: string; externalReference: string; notes: string }) => request<{ ok: true; invoice: PlatformInvoice }>(`/api/platform/invoices/${encodeURIComponent(invoiceId)}`, { method: "PATCH", body: JSON.stringify(body) }),
  platformResetPassword: (email: string) => request<{ ok: true; userId: string; email: string; name: string; temporaryPassword: string }>("/api/platform/users/reset-password", { method: "POST", body: JSON.stringify({ email }) }),
  team: () => request<{ ok: true; members: TeamMember[] }>("/api/admin/team"),
  billing: () => request<{ ok: true; invoices: BillingInvoice[] }>("/api/admin/billing"),
  audit: (beforeId?: number) => request<{ ok: true; items: AuditLogEntry[]; nextBeforeId: number | null }>(`/api/admin/audit?limit=30${beforeId ? `&beforeId=${beforeId}` : ""}`),
  notifications: (unreadOnly = false) => request<{ ok: true; items: AdminNotification[] }>(`/api/admin/notifications?limit=50&unreadOnly=${unreadOnly}`),
  notificationRead: (id: string) => request(`/api/admin/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" }),
  notificationsReadAll: () => request<{ ok: true; updated: number }>("/api/admin/notifications/read-all", { method: "POST" }),
  updateOrganization: (body: { name: string; billingEmail: string; requireGuestConsent: boolean; privacyPolicyUrl: string; termsUrl: string; privacyVersion: string; termsVersion: string }) => request<{ ok: true; organization: OrganizationAccess }>("/api/admin/organization", { method: "PATCH", body: JSON.stringify(body) }),
  createTeamMember: (body: { name: string; email: string; password: string; role: Role }) => request<{ ok: true; member: TeamMember }>("/api/admin/team", { method: "POST", body: JSON.stringify(body) }),
  updateTeamMember: (userId: string, body: Partial<Pick<TeamMember, "name" | "role" | "active">>) => request<{ ok: true; member: TeamMember }>(`/api/admin/team/${encodeURIComponent(userId)}`, { method: "PATCH", body: JSON.stringify(body) }),
  adminSnapshot: (venueId: string) => request<{ ok: true; snapshot: AdminSnapshot }>(`/api/admin/snapshot?venueId=${encodeURIComponent(venueId)}`),
  createVenue: (body: { name: string; city: string; description: string }) => request("/api/admin/venues", { method: "POST", body: JSON.stringify(body) }),
  updateVenue: (venueId: string, body: { name?: string; city?: string; description?: string; modules?: VenueModule[]; theme?: Record<string,string> }) => request<{ ok: true; venue: Venue }>(`/api/admin/venues/${encodeURIComponent(venueId)}`, { method: "PATCH", body: JSON.stringify(body) }),
  createZone: (venueId: string, body: { name: string; code: string; capacity: number }) => request(`/api/admin/venues/${encodeURIComponent(venueId)}/zones`, { method: "POST", body: JSON.stringify(body) }),
  updateZone: (venueId: string, zoneId: string, body: Partial<Pick<Zone, "name" | "code" | "capacity" | "isActive">>) => request<{ ok: true; zone: Zone }>(`/api/admin/venues/${encodeURIComponent(venueId)}/zones/${encodeURIComponent(zoneId)}`, { method: "PATCH", body: JSON.stringify(body) }),
  musicStatus: (venueId: string, id: string, status: string) => request(`/api/admin/venues/${encodeURIComponent(venueId)}/music/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  playback: (venueId: string, body: Record<string, unknown>) => request(`/api/admin/venues/${encodeURIComponent(venueId)}/playback`, { method: "POST", body: JSON.stringify(body) }),
  serviceStatus: (venueId: string, id: string, status: string) => request(`/api/admin/venues/${encodeURIComponent(venueId)}/service/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  orderStatus: (venueId: string, id: string, status: string) => request(`/api/admin/venues/${encodeURIComponent(venueId)}/orders/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  createPoll: (venueId: string, question: string, options: string[]) => request(`/api/admin/venues/${encodeURIComponent(venueId)}/polls`, { method: "POST", body: JSON.stringify({ question, options }) }),
  createQuiz: (venueId: string, body: { title: string; prompt: string; options: string[]; correctIndex: number }) => request(`/api/admin/venues/${encodeURIComponent(venueId)}/quizzes`, { method: "POST", body: JSON.stringify(body) }),
  createEvent: (venueId: string, body: Record<string, unknown>) => request(`/api/admin/venues/${encodeURIComponent(venueId)}/events`, { method: "POST", body: JSON.stringify(body) }),
  createCampaign: (venueId: string, body: Record<string, unknown>) => request(`/api/admin/venues/${encodeURIComponent(venueId)}/campaigns`, { method: "POST", body: JSON.stringify(body) }),
  announcement: (venueId: string, body: Record<string, unknown>) => request(`/api/admin/venues/${encodeURIComponent(venueId)}/announcements`, { method: "POST", body: JSON.stringify(body) }),
  mediaStatus: (venueId: string, id: string, status: string) => request(`/api/admin/venues/${encodeURIComponent(venueId)}/media/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) })
};
