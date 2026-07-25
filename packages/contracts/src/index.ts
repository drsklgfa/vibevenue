import { z } from "zod";

export const roleSchema = z.enum(["owner", "manager", "operator", "moderator", "marketing", "viewer"]);
export type Role = z.infer<typeof roleSchema>;

export const moduleSchema = z.enum([
  "music", "service", "orders", "polls", "quiz", "events", "loyalty", "campaigns", "media", "feedback", "signage", "analytics"
]);
export type VenueModule = z.infer<typeof moduleSchema>;

export const venueSchema = z.object({
  id: z.string(), organizationId: z.string(), name: z.string(), slug: z.string(), city: z.string(),
  description: z.string(), logoUrl: z.string().nullable(), theme: z.record(z.string(), z.string()),
  modules: z.array(moduleSchema), isActive: z.boolean(), createdAt: z.string()
});
export type Venue = z.infer<typeof venueSchema>;

export const zoneSchema = z.object({
  id: z.string(), venueId: z.string(), name: z.string(), code: z.string(), capacity: z.number().int().nonnegative(), isActive: z.boolean()
});
export type Zone = z.infer<typeof zoneSchema>;

export const experienceSessionSchema = z.object({
  id: z.string(), venueId: z.string(), name: z.string(), status: z.enum(["scheduled", "live", "ended"]),
  startedAt: z.string().nullable(), endedAt: z.string().nullable(), guestCount: z.number().int().nonnegative()
});
export type ExperienceSession = z.infer<typeof experienceSessionSchema>;

export const musicItemSchema = z.object({
  id: z.string(), venueId: z.string(), sessionId: z.string().nullable(), title: z.string(), url: z.string(),
  youtubeId: z.string().nullable(), requestedBy: z.string(), zoneName: z.string().nullable(), votes: z.number().int().nonnegative(),
  status: z.enum(["pending", "approved", "playing", "played", "rejected"]), createdAt: z.string()
});
export type MusicItem = z.infer<typeof musicItemSchema>;

export const playbackSchema = z.object({
  venueId: z.string(), videoId: z.string().nullable(), itemId: z.string().nullable(), state: z.enum(["idle", "playing", "paused"]),
  currentTime: z.number().nonnegative(), updatedAt: z.string(), volume: z.number().min(0).max(100)
});
export type PlaybackState = z.infer<typeof playbackSchema>;

export const serviceRequestSchema = z.object({
  id: z.string(), venueId: z.string(), zoneId: z.string().nullable(), zoneName: z.string(), guestName: z.string(),
  type: z.enum(["attendance", "bill", "water", "cleaning", "accessibility", "manager", "information", "other"]),
  note: z.string(), priority: z.enum(["normal", "high"]), status: z.enum(["open", "assigned", "resolved", "cancelled"]),
  assignedTo: z.string().nullable(), createdAt: z.string(), resolvedAt: z.string().nullable()
});
export type ServiceRequest = z.infer<typeof serviceRequestSchema>;

export const pollOptionSchema = z.object({ id: z.string(), label: z.string(), votes: z.number().int().nonnegative() });
export type PollOption = z.infer<typeof pollOptionSchema>;
export const pollSchema = z.object({
  id: z.string(), venueId: z.string(), question: z.string(), status: z.enum(["draft", "live", "closed"]), options: z.array(pollOptionSchema), totalVotes: z.number().int().nonnegative(), createdAt: z.string()
});
export type Poll = z.infer<typeof pollSchema>;

export const venueEventSchema = z.object({
  id: z.string(), venueId: z.string(), title: z.string(), description: z.string(), startsAt: z.string(), endsAt: z.string(),
  capacity: z.number().int().nonnegative(), reservations: z.number().int().nonnegative(), status: z.enum(["draft", "published", "cancelled", "completed"])
});
export type VenueEvent = z.infer<typeof venueEventSchema>;

export const campaignSchema = z.object({
  id: z.string(), venueId: z.string(), title: z.string(), description: z.string(), code: z.string(), reward: z.string(),
  startsAt: z.string(), endsAt: z.string(), status: z.enum(["draft", "active", "paused", "ended"]), redemptions: z.number().int().nonnegative()
});
export type Campaign = z.infer<typeof campaignSchema>;

export const mediaPostSchema = z.object({
  id: z.string(), venueId: z.string(), guestName: z.string(), imageUrl: z.string(), caption: z.string(), status: z.enum(["pending", "approved", "rejected"]), createdAt: z.string()
});
export type MediaPost = z.infer<typeof mediaPostSchema>;

export const announcementSchema = z.object({
  id: z.string(), venueId: z.string(), title: z.string(), body: z.string(), kind: z.enum(["info", "offer", "event", "alert"]), active: z.boolean(), createdAt: z.string()
});
export type Announcement = z.infer<typeof announcementSchema>;

export const loyaltyAccountSchema = z.object({
  id: z.string(), venueId: z.string(), customerKey: z.string(), displayName: z.string(), points: z.number().int(), level: z.enum(["visitor", "frequent", "vip", "ambassador"]), updatedAt: z.string()
});
export type LoyaltyAccount = z.infer<typeof loyaltyAccountSchema>;


export const quizQuestionSchema = z.object({
  id: z.string(), prompt: z.string(), options: z.array(z.string()), position: z.number().int(), answers: z.number().int().nonnegative()
});
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export const quizSchema = z.object({
  id: z.string(), venueId: z.string(), title: z.string(), status: z.enum(["draft", "live", "closed"]),
  currentQuestion: quizQuestionSchema.nullable(), totalQuestions: z.number().int().nonnegative(), createdAt: z.string()
});
export type Quiz = z.infer<typeof quizSchema>;

export const menuItemSchema = z.object({
  id: z.string(), categoryId: z.string(), name: z.string(), description: z.string(), priceCents: z.number().int().nonnegative(),
  imageUrl: z.string().nullable(), available: z.boolean(), featured: z.boolean()
});
export type MenuItem = z.infer<typeof menuItemSchema>;
export const menuCategorySchema = z.object({ id: z.string(), venueId: z.string(), name: z.string(), position: z.number().int(), items: z.array(menuItemSchema) });
export type MenuCategory = z.infer<typeof menuCategorySchema>;
export const orderSchema = z.object({
  id: z.string(), venueId: z.string(), zoneName: z.string(), guestName: z.string(), status: z.enum(["new", "accepted", "preparing", "ready", "delivered", "cancelled"]),
  note: z.string(), totalCents: z.number().int().nonnegative(), createdAt: z.string(), items: z.array(z.object({ name: z.string(), quantity: z.number().int().positive(), unitPriceCents: z.number().int().nonnegative() }))
});
export type Order = z.infer<typeof orderSchema>;

export const dashboardSchema = z.object({
  activeGuests: z.number().int().nonnegative(), openRequests: z.number().int().nonnegative(), pendingMusic: z.number().int().nonnegative(), pendingOrders: z.number().int().nonnegative(),
  approvedMedia: z.number().int().nonnegative(), reservationsToday: z.number().int().nonnegative(), feedbackScore: z.number().min(0).max(5),
  interactionsToday: z.number().int().nonnegative(), topZones: z.array(z.object({ name: z.string(), value: z.number().int().nonnegative() }))
});
export type DashboardMetrics = z.infer<typeof dashboardSchema>;


export const organizationStatusSchema = z.enum(["trial", "active", "past_due", "suspended", "cancelled"]);
export type OrganizationStatus = z.infer<typeof organizationStatusSchema>;
export const planCodeSchema = z.enum(["demo", "start", "pro", "network", "custom"]);
export type PlanCode = z.infer<typeof planCodeSchema>;

export interface PlanLimits {
  maxVenues: number;
  maxUsers: number;
  maxZonesPerVenue: number;
}
export interface OrganizationUsage {
  venues: number;
  users: number;
  activeUsers: number;
  zones: number;
}
export interface GuestLegalPolicy {
  requireConsent: boolean;
  privacyPolicyUrl: string;
  termsUrl: string;
  privacyVersion: string;
  termsVersion: string;
}
export interface OrganizationAccess {
  id: string;
  name: string;
  plan: PlanCode;
  status: OrganizationStatus;
  billingEmail: string;
  monthlyPriceCents: number;
  trialEndsAt: string | null;
  accessEndsAt: string | null;
  operational: boolean;
  limits: PlanLimits;
  usage: OrganizationUsage;
  legal: GuestLegalPolicy;
}


export const billingInvoiceStatusSchema = z.enum(["open", "overdue", "paid", "void"]);
export type BillingInvoiceStatus = z.infer<typeof billingInvoiceStatusSchema>;

export interface BillingInvoice {
  id: string;
  organizationId: string;
  reference: string;
  amountCents: number;
  dueAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  status: BillingInvoiceStatus;
  paidAt: string | null;
  paymentMethod: string;
  externalReference: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}



export interface PlatformClientSummary {
  id: string;
  name: string;
  plan: PlanCode;
  status: OrganizationStatus;
  billingEmail: string;
  monthlyPriceCents: number;
  trialEndsAt: string | null;
  accessEndsAt: string | null;
  operational: boolean;
  createdAt: string;
  limits: PlanLimits;
  usage: OrganizationUsage;
  owner: { name: string; email: string; active: boolean } | null;
}

export interface PlatformInvoice extends BillingInvoice {
  organizationName: string;
}

export interface PlatformOverview {
  organizations: { total: number; active: number; trial: number; pastDue: number; suspended: number; cancelled: number };
  invoices: { open: number; overdue: number; paidLast30DaysCents: number };
  monthlyRecurringRevenueCents: number;
}

export interface AuditLogEntry {
  id: number;
  userId: string | null;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown>;
  requestId: string | null;
  createdAt: string;
}

export const auditLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  beforeId: z.coerce.number().int().positive().optional(),
  action: z.string().trim().max(80).optional(),
  entityType: z.string().trim().max(80).optional()
});

export interface TeamMember {
  userId: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface AdminSessionInfo {
  id: string;
  userAgent: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
}

export const strongPasswordSchema = z.string().min(10).max(128)
  .regex(/[a-z]/, "Inclua uma letra minúscula.")
  .regex(/[A-Z]/, "Inclua uma letra maiúscula.")
  .regex(/[0-9]/, "Inclua um número.");
export const changePasswordInputSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: strongPasswordSchema });
export const teamMemberInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().max(254),
  password: strongPasswordSchema,
  role: roleSchema
});
export const teamMemberUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  role: roleSchema.optional(),
  active: z.boolean().optional()
}).refine((value) => Object.keys(value).length > 0, "Informe ao menos uma alteração.");

export const loginInputSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(8).max(128) });
export const guestJoinInputSchema = z.object({
  venueSlug: z.string().trim().min(2).max(80),
  zoneCode: z.string().trim().min(2).max(24),
  nickname: z.string().trim().min(2).max(30),
  acceptedPrivacy: z.boolean().default(false),
  acceptedTerms: z.boolean().default(false),
  privacyVersion: z.string().trim().max(40).default(""),
  termsVersion: z.string().trim().max(40).default("")
});
export const musicRequestInputSchema = z.object({ title: z.string().trim().min(1).max(120), url: z.string().url().max(500) });
export const serviceRequestInputSchema = z.object({
  type: serviceRequestSchema.shape.type, note: z.string().trim().max(300).default(""), priority: serviceRequestSchema.shape.priority.default("normal")
});
export const pollVoteInputSchema = z.object({ optionId: z.string().min(1) });
export const feedbackInputSchema = z.object({ score: z.number().int().min(1).max(5), comment: z.string().trim().max(800).default("") });
export const loyaltyCheckinInputSchema = z.object({ customerKey: z.string().trim().min(4).max(120), displayName: z.string().trim().min(2).max(80).optional() });
export const reservationInputSchema = z.object({ contact: z.string().trim().min(3).max(160), partySize: z.number().int().min(1).max(20) });
export const campaignRedeemInputSchema = z.object({ code: z.string().trim().min(2).max(30), customerKey: z.string().trim().min(4).max(120) });
export const playbackInputSchema = z.object({
  state: z.enum(["idle", "playing", "paused"]), currentTime: z.number().finite().min(0).max(604800), volume: z.number().int().min(0).max(100),
  itemId: z.string().min(1).max(120).nullable().optional(), videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/).nullable().optional()
});
export const announcementInputSchema = z.object({ title: z.string().trim().min(2).max(120), body: z.string().trim().min(2).max(600), kind: z.enum(["info", "offer", "event", "alert"]).default("info") });
const timedRangeSchema = z.object({ startsAt: z.string(), endsAt: z.string() })
  .refine((value) => Number.isFinite(new Date(value.startsAt).getTime()), { message: "Informe uma data inicial válida.", path: ["startsAt"] })
  .refine((value) => Number.isFinite(new Date(value.endsAt).getTime()), { message: "Informe uma data final válida.", path: ["endsAt"] })
  .refine((value) => new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime(), { message: "O término precisa ocorrer depois do início.", path: ["endsAt"] });
export const eventInputSchema = z.object({ title: z.string().trim().min(2).max(120), description: z.string().trim().max(1000), startsAt: z.string(), endsAt: z.string(), capacity: z.number().int().min(0).max(100000) })
  .and(timedRangeSchema);
export const pollInputSchema = z.object({ question: z.string().trim().min(2).max(240), options: z.array(z.string().trim().min(1).max(120)).min(2).max(8) });
export const campaignInputSchema = z.object({ title: z.string().trim().min(2).max(120), description: z.string().trim().max(500), code: z.string().trim().min(2).max(30).regex(/^[A-Za-z0-9-]+$/, "Use apenas letras, números e hífen no código."), reward: z.string().trim().min(2).max(200), startsAt: z.string(), endsAt: z.string() })
  .and(timedRangeSchema);
export const quizInputSchema = z.object({
  title: z.string().trim().min(2).max(120), prompt: z.string().trim().min(2).max(300),
  options: z.array(z.string().trim().min(1).max(160)).min(2).max(6), correctIndex: z.number().int().min(0).max(5)
});
export const quizAnswerInputSchema = z.object({ questionId: z.string().min(1), selectedIndex: z.number().int().min(0).max(5) });
export const orderInputSchema = z.object({
  note: z.string().trim().max(300).default(""), items: z.array(z.object({ itemId: z.string().min(1), quantity: z.number().int().min(1).max(20) })).min(1).max(30)
});
export const venueInputSchema = z.object({ name: z.string().trim().min(2).max(120), city: z.string().trim().max(120), description: z.string().trim().max(1000) });
export const venueUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  city: z.string().trim().max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  modules: z.array(moduleSchema).min(1).max(20).optional(),
  theme: z.object({
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    surface: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
  }).optional()
}).refine((value) => Object.keys(value).length > 0, "Informe ao menos uma alteração.");
export const zoneInputSchema = z.object({ name: z.string().trim().min(2).max(120), code: z.string().trim().min(2).max(24), capacity: z.number().int().min(0).max(100000) });
export const zoneUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  code: z.string().trim().min(2).max(24).optional(),
  capacity: z.number().int().min(0).max(100000).optional(),
  isActive: z.boolean().optional()
}).refine((value) => Object.keys(value).length > 0, "Informe ao menos uma alteração.");
const httpsUrlOrEmptySchema = z.union([
  z.string().url().max(500).refine((value) => value.startsWith("https://"), "Use um endereço HTTPS."),
  z.literal("")
]);
export const organizationSettingsSchema = z.object({
  name: z.string().trim().min(2).max(160),
  billingEmail: z.string().trim().email().max(254),
  requireGuestConsent: z.boolean(),
  privacyPolicyUrl: httpsUrlOrEmptySchema,
  termsUrl: httpsUrlOrEmptySchema,
  privacyVersion: z.string().trim().min(1).max(40),
  termsVersion: z.string().trim().min(1).max(40)
}).refine((value) => !value.requireGuestConsent || Boolean(value.privacyPolicyUrl && value.termsUrl), {
  message: "Para exigir aceite, informe as URLs da política de privacidade e dos termos.",
  path: ["requireGuestConsent"]
});


export const platformClientCreateSchema = z.object({
  company: z.string().trim().min(2).max(160),
  ownerName: z.string().trim().min(2).max(120),
  ownerEmail: z.string().trim().email().max(254),
  billingEmail: z.string().trim().email().max(254),
  venueName: z.string().trim().min(2).max(120),
  city: z.string().trim().max(120).default(""),
  description: z.string().trim().max(1000).default(""),
  plan: planCodeSchema.default("start"),
  monthlyPriceCents: z.number().int().min(0).max(100_000_000).default(0),
  trialDays: z.number().int().min(0).max(3650).default(14),
  maxVenues: z.number().int().min(1).max(10_000).nullable().default(null),
  maxUsers: z.number().int().min(1).max(100_000).nullable().default(null),
  maxZonesPerVenue: z.number().int().min(1).max(100_000).nullable().default(null),
  requireGuestConsent: z.boolean().default(false),
  privacyPolicyUrl: httpsUrlOrEmptySchema.default(""),
  termsUrl: httpsUrlOrEmptySchema.default(""),
  privacyVersion: z.string().trim().min(1).max(40).default("1.0"),
  termsVersion: z.string().trim().min(1).max(40).default("1.0")
}).refine((value) => !value.requireGuestConsent || Boolean(value.privacyPolicyUrl && value.termsUrl), {
  message: "Para exigir aceite, informe política e termos HTTPS.",
  path: ["requireGuestConsent"]
});

export const platformClientCommercialSchema = z.object({
  name: z.string().trim().min(2).max(160),
  plan: planCodeSchema,
  billingEmail: z.string().trim().email().max(254),
  monthlyPriceCents: z.number().int().min(0).max(100_000_000),
  maxVenues: z.number().int().min(1).max(10_000).nullable(),
  maxUsers: z.number().int().min(1).max(100_000).nullable(),
  maxZonesPerVenue: z.number().int().min(1).max(100_000).nullable()
});

export const platformClientStatusSchema = z.object({
  status: organizationStatusSchema,
  trialDays: z.number().int().min(0).max(3650).default(0),
  accessDays: z.number().int().min(0).max(365).default(0)
}).refine((value) => value.status !== "trial" || value.trialDays >= 1, {
  message: "Informe ao menos um dia de teste.", path: ["trialDays"]
});

export const platformInvoiceCreateSchema = z.object({
  organizationId: z.string().min(1).max(120),
  reference: z.string().trim().min(1).max(80),
  amountCents: z.number().int().min(0).max(100_000_000),
  dueAt: z.string().refine((value) => Number.isFinite(new Date(value).getTime()), "Vencimento inválido."),
  periodStart: z.string().nullable().default(null),
  periodEnd: z.string().nullable().default(null),
  notes: z.string().trim().max(500).default("")
}).refine((value) => !value.periodStart || Number.isFinite(new Date(value.periodStart).getTime()), { message: "Início do período inválido.", path: ["periodStart"] })
  .refine((value) => !value.periodEnd || Number.isFinite(new Date(value.periodEnd).getTime()), { message: "Fim do período inválido.", path: ["periodEnd"] })
  .refine((value) => !value.periodStart || !value.periodEnd || new Date(value.periodEnd).getTime() > new Date(value.periodStart).getTime(), { message: "O período final deve ser posterior ao inicial.", path: ["periodEnd"] });

export const platformInvoiceSettleSchema = z.object({
  status: z.enum(["paid", "void"]),
  paymentMethod: z.string().trim().max(80).default(""),
  externalReference: z.string().trim().max(160).default(""),
  notes: z.string().trim().max(500).default("")
});

export const platformPasswordResetSchema = z.object({
  email: z.string().trim().email().max(254),
  password: strongPasswordSchema.optional()
});


export function normalizeSlug(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export function normalizeZoneCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24);
}

export function extractYouTubeVideoId(value: string): string | null {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    let candidate: string | null = null;
    if (host === "youtu.be" || host === "www.youtu.be") candidate = url.pathname.split("/").filter(Boolean)[0] ?? null;
    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      if (url.pathname === "/watch") candidate = url.searchParams.get("v");
      else {
        const parts = url.pathname.split("/").filter(Boolean);
        if (["embed", "shorts", "live"].includes(parts[0] ?? "")) candidate = parts[1] ?? null;
      }
    }
    return candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
  } catch { return null; }
}

export interface PublicVenueSnapshot {
  venue: Venue;
  legal: GuestLegalPolicy;
  zones: Zone[];
  currentSession: ExperienceSession | null;
  playback: PlaybackState;
  queue: MusicItem[];
  poll: Poll | null;
  quiz: Quiz | null;
  menu: MenuCategory[];
  events: VenueEvent[];
  campaigns: Campaign[];
  announcements: Announcement[];
  media: MediaPost[];
}

export type NotificationSeverity = "info" | "warning" | "critical";
export interface AdminNotification {
  id: string;
  kind: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}
export const notificationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  unreadOnly: z.preprocess((value) => {
    if (value === undefined) return undefined;
    if (value === true || value === "true" || value === "1") return true;
    if (value === false || value === "false" || value === "0") return false;
    return value;
  }, z.boolean()).default(false)
});

export interface AdminSnapshot extends PublicVenueSnapshot {
  metrics: DashboardMetrics;
  serviceRequests: ServiceRequest[];
  orders: Order[];
  allMusic: MusicItem[];
  polls: Poll[];
  quizzes: Quiz[];
  allEvents: VenueEvent[];
  allCampaigns: Campaign[];
  pendingMedia: MediaPost[];
  feedback: Array<{ id: string; score: number; comment: string; createdAt: string }>;
  loyalty: LoyaltyAccount[];
}

export interface AdminIdentity {
  userId: string;
  name: string;
  email: string;
  organizationId: string;
  role: Role;
  mustChangePassword: boolean;
  isPlatformAdmin: boolean;
  mfaEnabled: boolean;
  mfaVerified: boolean;
  stepUpAt: string | null;
}

export interface GuestIdentity {
  guestSessionId: string;
  venueId: string;
  venueSlug: string;
  zoneId: string | null;
  zoneName: string;
  nickname: string;
  experienceSessionId: string | null;
}


export const mfaCodeInputSchema = z.object({ code: z.string().trim().min(6).max(32) });
export const stepUpInputSchema = z.object({ currentPassword: z.string().min(1).max(200), code: z.string().trim().min(6).max(32) });
export const disableMfaInputSchema = stepUpInputSchema;
export interface MfaStatus {
  enabled: boolean;
  enrolledAt: string | null;
  recoveryCodesRemaining: number;
  required: boolean;
}
export type AdminLoginResponse =
  | { ok: true; identity: AdminIdentity; token?: string }
  | { ok: true; mfaRequired: true; enrollmentRequired: boolean; otpauthUri?: string };
export const forgotPasswordInputSchema = z.object({ email: z.string().trim().email().max(254) });
export const resetPasswordInputSchema = z.object({ token: z.string().trim().min(20).max(300), newPassword: strongPasswordSchema });

export interface SecurityEventEntry {
  id: string;
  eventType: string;
  severity: string;
  details: Record<string, unknown>;
  userName: string | null;
  createdAt: string;
}
