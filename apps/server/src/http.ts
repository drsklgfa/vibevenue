import type { Express, NextFunction, Request, Response } from "express";
import type { VenueModule } from "@vibevenue/contracts";
import express from "express";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import path from "node:path";
import type { Server } from "socket.io";
import {
  announcementInputSchema,
  auditLogQuerySchema,
  campaignInputSchema,
  campaignRedeemInputSchema,
  changePasswordInputSchema,
  eventInputSchema,
  feedbackInputSchema,
  forgotPasswordInputSchema,
  guestJoinInputSchema,
  loginInputSchema,
  loyaltyCheckinInputSchema,
  mfaCodeInputSchema,
  musicRequestInputSchema,
  notificationQuerySchema,
  orderInputSchema,
  organizationSettingsSchema,
  playbackInputSchema,
  platformClientCommercialSchema,
  platformClientCreateSchema,
  platformClientStatusSchema,
  platformInvoiceCreateSchema,
  platformInvoiceSettleSchema,
  platformPasswordResetSchema,
  pollInputSchema,
  pollVoteInputSchema,
  quizAnswerInputSchema,
  quizInputSchema,
  reservationInputSchema,
  resetPasswordInputSchema,
  serviceRequestInputSchema,
  stepUpInputSchema,
  teamMemberInputSchema,
  teamMemberUpdateSchema,
  venueInputSchema,
  venueUpdateSchema,
  zoneInputSchema,
  zoneUpdateSchema
} from "@vibevenue/contracts";
import { config, isAllowedWebOrigin } from "./config.js";
import { changeUserPassword, createTeamMember, getOrganizationAccess, listTeamMembers, updateOrganizationSettings, updateTeamMember } from "./commercial.js";
import { listBillingInvoices } from "./billing.js";
import { listAuditLogs, recordAudit } from "./audit.js";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "./notifications.js";
import {
  beginAuthenticatedMfaEnrollment,
  completeMfaAdminSession,
  createAdminSession,
  createDemoAdminSession,
  issueGuestSession,
  listAdminSessions,
  revokeAdminSession,
  revokeOtherAdminSessions,
  performStepUp,
  requireAdmin,
  requireGuest,
  requireStepUp,
  revokeToken,
  type AdminRequest,
  type GuestRequest
} from "./auth.js";
import { adminSessionCookie, adminTokenFromHeaders, clearAdminSessionCookie, clearMfaChallengeCookie, mfaChallengeCookie, mfaChallengeTokenFromHeaders } from "./cookies.js";
import { checkIntegrationHealth } from "./integrations.js";
import { logger } from "./logger.js";
import { clientIpHash, requestId } from "./observability.js";
import { disableMfa, roleRequiresMfa, userMfaState } from "./mfa.js";
import { distributedLimiter } from "./distributed-rate-limit.js";
import { processImageSecurely } from "./media-security.js";
import { requestPasswordReset, resetPasswordWithToken } from "./account-recovery.js";
import { listSecurityEvents } from "./security-events.js";
import {
  createPlatformInvoice,
  listPlatformClients,
  listPlatformInvoices,
  platformOverview,
  provisionPlatformClient,
  resetPlatformUserPassword,
  settlePlatformInvoice,
  updatePlatformClientCommercial,
  updatePlatformClientStatus
} from "./platform-admin.js";
import { deleteImage, storageReady, localStorage, storeImage } from "./storage.js";
import {
  addAnnouncement,
  addCampaign,
  addEvent,
  addFeedback,
  addMusic,
  addServiceRequest,
  adminSnapshot,
  answerQuiz,
  clearMediaStorage,
  createMedia,
  createOrder,
  createPoll,
  createQuiz,
  createVenue,
  createZone,
  listOrganizationVenues,
  loyaltyCheckin,
  organizationVenue,
  publicSnapshotById,
  publicSnapshotBySlug,
  redeemCampaign,
  requireVenueModule,
  reserveEvent,
  resolveGuestVenue,
  setMediaStatus,
  setMusicStatus,
  setOrderStatus,
  setPlayback,
  setServiceStatus,
  updateVenue,
  updateZone,
  voteMusic,
  votePoll
} from "./platform.js";

const asyncRoute = (fn: (request: any, response: Response) => Promise<unknown>) =>
  (request: Request, response: Response, next: NextFunction) => { Promise.resolve(fn(request, response)).catch(next); };
class HttpError extends Error { constructor(public readonly status: number, message: string) { super(message); this.name = "HttpError"; } }
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Ocorreu um erro inesperado.";
function notify(io: Server, venueId: string, kind: string): void {
  io.to(`venue:${venueId}`).emit("venue:update", { venueId, kind, at: new Date().toISOString() });
}
async function adminVenue(request: AdminRequest): Promise<string> {
  const requested = String(request.params.venueId ?? request.body?.venueId ?? request.query.venueId ?? "");
  const venue = await organizationVenue(request.admin!.organizationId, requested || undefined);
  if (!venue) throw new HttpError(404, "Estabelecimento não encontrado para esta conta.");
  return venue.id;
}
async function adminVenueModule(request: AdminRequest, module: VenueModule): Promise<string> {
  const venueId = await adminVenue(request);
  await requireVenueModule(venueId, module);
  return venueId;
}
function requireRole(request: AdminRequest, roles: string[], message = "Seu perfil não permite esta ação."): void {
  if (!request.admin || !roles.includes(request.admin.role)) throw new HttpError(403, message);
}
function requireManager(request: AdminRequest): void {
  requireRole(request, ["owner", "manager"], "Esta ação exige perfil de proprietário ou gerente.");
}
function requirePlatformAdmin(request: AdminRequest, response: Response, next: NextFunction): void {
  if (!request.admin?.isPlatformAdmin) { response.status(403).json({ ok: false, message: "Acesso restrito à administração da plataforma." }); return; }
  next();
}
async function record(request: AdminRequest, action: string, entityType: string, entityId?: string, details?: Record<string, unknown>): Promise<void> {
  await recordAudit({
    organizationId: request.admin!.organizationId,
    userId: request.admin!.userId,
    action,
    entityType,
    ...(entityId ? { entityId } : {}),
    ...(details ? { details } : {}),
    requestId: requestId(request),
    ipHash: clientIpHash(request)
  });
}

export function configureHttp(app: Express, io: Server): void {
  app.set("trust proxy", config.trustProxyHops);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" }, contentSecurityPolicy: false }));
  app.use(cors({ origin(origin, callback) { return isAllowedWebOrigin(origin) ? callback(null, true) : callback(new Error("Origem não autorizada.")); }, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: "512kb" }));
  app.use((request, response, next) => {
    response.setHeader("x-permitted-cross-domain-policies", "none");
    response.setHeader("cross-origin-opener-policy", "same-origin");
    response.setHeader("origin-agent-cluster", "?1");
    if (!config.readOnlyMode || !["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) { next(); return; }
    const path = request.path;
    const allowed = path === "/api/auth/login" || path === "/api/auth/mfa/verify" || path === "/api/auth/logout" || path === "/api/auth/forgot-password" || path === "/api/auth/reset-password" || path === "/api/auth/step-up";
    if (allowed) { next(); return; }
    response.setHeader("retry-after", "300");
    response.status(503).json({ ok: false, code: "READ_ONLY_MODE", message: "O sistema está temporariamente em modo de consulta para proteção e manutenção." });
  });
  app.use(rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: "draft-8", legacyHeaders: false }));
  const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false });
  const publicWriteLimiter = rateLimit({ windowMs: 60_000, limit: 80, standardHeaders: "draft-8", legacyHeaders: false, skip: (request) => request.method === "GET" });
  const mediaLimiter = rateLimit({ windowMs: 10 * 60_000, limit: 12, standardHeaders: "draft-8", legacyHeaders: false });
  app.use("/api/auth", authLimiter);
  app.use("/api/auth/login", distributedLimiter({ name: "login", windowMs: 15 * 60_000, limit: 12, methods: ["POST"], failClosed: true }));
  app.use("/api/auth/mfa/verify", distributedLimiter({ name: "mfa-verify", windowMs: 15 * 60_000, limit: 15, methods: ["POST"], failClosed: true }));
  app.use("/api/auth/forgot-password", distributedLimiter({ name: "forgot-password", windowMs: 60 * 60_000, limit: 5, methods: ["POST"], failClosed: true }));
  app.use("/api/auth/reset-password", distributedLimiter({ name: "reset-password", windowMs: 60 * 60_000, limit: 10, methods: ["POST"], failClosed: true }));
  app.use("/api/auth/step-up", distributedLimiter({ name: "step-up", windowMs: 15 * 60_000, limit: 10, methods: ["POST"], failClosed: true }));
  app.use("/api/platform", distributedLimiter({ name: "platform", windowMs: 60_000, limit: 90, failClosed: true }));
  app.use("/api/public", publicWriteLimiter);
  app.use("/api/public", distributedLimiter({ name: "public-write", windowMs: 60_000, limit: 60, methods: ["POST", "PATCH", "DELETE"] }));
  app.use(["/api/auth", "/api/admin", "/api/platform"], (_request, response, next) => { response.setHeader("cache-control", "no-store"); next(); });
  if (localStorage()) app.use("/uploads", express.static(path.resolve(config.uploadDir), { maxAge: "1h", fallthrough: false }));

  app.get("/live", (_request, response) => response.json({ ok: true, service: "vibevenue-api", release: config.appRelease, timestamp: new Date().toISOString() }));
  const readiness = asyncRoute(async (_request, response) => {
    const dependencies = { ...await checkIntegrationHealth(), storage: storageReady() };
    const ok = config.isTest || !config.requireCloudServices || (dependencies.redis && dependencies.postgres && dependencies.storage);
    return response.status(ok ? 200 : 503).json({ ok, service: "vibevenue-api", release: config.appRelease, deploymentMode: config.deploymentMode, dependencies, timestamp: new Date().toISOString() });
  });
  app.get("/ready", readiness);
  app.get("/health", readiness);

  app.get("/api/public/venues/:slug", asyncRoute(async (request, response) => {
    const snapshot = await publicSnapshotBySlug(String(request.params.slug));
    if (!snapshot) return response.status(404).json({ ok: false, message: "Estabelecimento não encontrado." });
    return response.json({ ok: true, snapshot });
  }));
  app.post("/api/public/join", asyncRoute(async (request, response) => {
    const input = guestJoinInputSchema.parse(request.body);
    const resolved = await resolveGuestVenue(input.venueSlug, input.zoneCode);
    if (!resolved) return response.status(404).json({ ok: false, message: "Estabelecimento não encontrado." });
    if (!resolved.zone) return response.status(404).json({ ok: false, message: "Código da área ou mesa inválido." });
    const snapshot = await publicSnapshotById(resolved.venue.id);
    if (!snapshot) return response.status(404).json({ ok: false, message: "Estabelecimento indisponível." });
    if (snapshot.legal.requireConsent) {
      if (!input.acceptedPrivacy || !input.acceptedTerms) throw new HttpError(409, "Aceite a política de privacidade e os termos para continuar.");
      if (input.privacyVersion !== snapshot.legal.privacyVersion || input.termsVersion !== snapshot.legal.termsVersion) {
        throw new HttpError(409, "Os termos foram atualizados. Revise e aceite a versão atual.");
      }
    }
    const auth = await issueGuestSession({ venueId: resolved.venue.id, venueSlug: resolved.venue.slug, zoneId: resolved.zone.id,
      zoneName: resolved.zone.name, nickname: input.nickname, experienceSessionId: resolved.session?.id ?? null,
      acceptedPrivacy: snapshot.legal.requireConsent ? input.acceptedPrivacy : false,
      acceptedTerms: snapshot.legal.requireConsent ? input.acceptedTerms : false,
      privacyVersion: snapshot.legal.privacyVersion, termsVersion: snapshot.legal.termsVersion });
    notify(io, resolved.venue.id, "guest:joined");
    return response.status(201).json({ ok: true, ...auth, snapshot });
  }));
  app.get("/api/public/me", requireGuest, asyncRoute(async (request: GuestRequest, response) =>
    response.json({ ok: true, identity: request.guest, snapshot: await publicSnapshotById(request.guest!.venueId) })));
  app.post("/api/public/music", requireGuest, asyncRoute(async (request: GuestRequest, response) => {
    await requireVenueModule(request.guest!.venueId, "music");
    const input = musicRequestInputSchema.parse(request.body);
    const item = await addMusic({ venueId: request.guest!.venueId, sessionId: request.guest!.experienceSessionId,
      guestSessionId: request.guest!.guestSessionId, guestName: request.guest!.nickname, zoneName: request.guest!.zoneName,
      title: input.title, url: input.url });
    notify(io, request.guest!.venueId, "music:requested");
    return response.status(201).json({ ok: true, item });
  }));
  app.post("/api/public/music/:id/vote", requireGuest, asyncRoute(async (request: GuestRequest, response) => {
    await requireVenueModule(request.guest!.venueId, "music");
    await voteMusic(String(request.params.id), request.guest!.guestSessionId, request.guest!.venueId);
    notify(io, request.guest!.venueId, "music:voted");
    return response.json({ ok: true });
  }));
  app.post("/api/public/service", requireGuest, asyncRoute(async (request: GuestRequest, response) => {
    await requireVenueModule(request.guest!.venueId, "service");
    const input = serviceRequestInputSchema.parse(request.body);
    const item = await addServiceRequest({ venueId: request.guest!.venueId, zoneId: request.guest!.zoneId,
      guestSessionId: request.guest!.guestSessionId, zoneName: request.guest!.zoneName, guestName: request.guest!.nickname,
      type: input.type, note: input.note, priority: input.priority });
    notify(io, request.guest!.venueId, "service:created");
    return response.status(201).json({ ok: true, item });
  }));
  app.post("/api/public/orders", requireGuest, asyncRoute(async (request: GuestRequest, response) => {
    await requireVenueModule(request.guest!.venueId, "orders");
    const input = orderInputSchema.parse(request.body);
    const order = await createOrder({ venueId: request.guest!.venueId, zoneId: request.guest!.zoneId,
      guestSessionId: request.guest!.guestSessionId, zoneName: request.guest!.zoneName, guestName: request.guest!.nickname,
      note: input.note, items: input.items });
    notify(io, request.guest!.venueId, "order:created");
    return response.status(201).json({ ok: true, order });
  }));
  app.post("/api/public/polls/:pollId/vote", requireGuest, asyncRoute(async (request: GuestRequest, response) => {
    await requireVenueModule(request.guest!.venueId, "polls");
    const input = pollVoteInputSchema.parse(request.body);
    await votePoll(String(request.params.pollId), input.optionId, request.guest!.guestSessionId, request.guest!.venueId);
    notify(io, request.guest!.venueId, "poll:voted");
    return response.json({ ok: true });
  }));
  app.post("/api/public/quiz/answer", requireGuest, asyncRoute(async (request: GuestRequest, response) => {
    await requireVenueModule(request.guest!.venueId, "quiz");
    const input = quizAnswerInputSchema.parse(request.body);
    const result = await answerQuiz(request.guest!.venueId, request.guest!.guestSessionId, input.questionId, input.selectedIndex);
    notify(io, request.guest!.venueId, "quiz:answered");
    return response.json({ ok: true, ...result });
  }));
  app.post("/api/public/feedback", requireGuest, asyncRoute(async (request: GuestRequest, response) => {
    await requireVenueModule(request.guest!.venueId, "feedback");
    const input = feedbackInputSchema.parse(request.body);
    await addFeedback(request.guest!.venueId, request.guest!.guestSessionId, input.score, input.comment);
    notify(io, request.guest!.venueId, "feedback:created");
    return response.status(201).json({ ok: true });
  }));
  app.post("/api/public/loyalty/checkin", requireGuest, asyncRoute(async (request: GuestRequest, response) => {
    await requireVenueModule(request.guest!.venueId, "loyalty");
    const input = loyaltyCheckinInputSchema.parse(request.body);
    const account = await loyaltyCheckin(request.guest!.venueId, input.customerKey, input.displayName ?? request.guest!.nickname);
    notify(io, request.guest!.venueId, "loyalty:checkin");
    return response.json({ ok: true, account });
  }));
  app.post("/api/public/events/:eventId/reserve", requireGuest, asyncRoute(async (request: GuestRequest, response) => {
    await requireVenueModule(request.guest!.venueId, "events");
    const input = reservationInputSchema.parse(request.body);
    const id = await reserveEvent(String(request.params.eventId), request.guest!.venueId, { guestSessionId: request.guest!.guestSessionId, guestName: request.guest!.nickname, contact: input.contact, partySize: input.partySize });
    notify(io, request.guest!.venueId, "event:reserved");
    return response.status(201).json({ ok: true, id });
  }));
  app.post("/api/public/campaigns/redeem", requireGuest, asyncRoute(async (request: GuestRequest, response) => {
    await requireVenueModule(request.guest!.venueId, "campaigns");
    const input = campaignRedeemInputSchema.parse(request.body);
    const result = await redeemCampaign(request.guest!.venueId, input.code, input.customerKey);
    if (!result) return response.status(404).json({ ok: false, message: "Cupom inválido ou fora da validade." });
    notify(io, request.guest!.venueId, "campaign:redeemed");
    return response.json({ ok: true, ...result });
  }));

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.mediaMaxBytes, files: 1 },
    fileFilter(_request, file, callback) {
      const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
      if (!allowed.has(file.mimetype)) { callback(new Error("Formato de imagem não permitido.")); return; }
      callback(null, true);
    } });
  app.post("/api/public/media", mediaLimiter, requireGuest, upload.single("image"), asyncRoute(async (request: GuestRequest, response) => {
    await requireVenueModule(request.guest!.venueId, "media");
    if (!request.file) throw new Error("Selecione uma imagem.");
    const processed = await processImageSecurely(request.file.buffer);
    const stored = await storeImage(request.guest!.venueId, processed.buffer);
    try {
      const post = await createMedia({ venueId: request.guest!.venueId, guestSessionId: request.guest!.guestSessionId,
        guestName: request.guest!.nickname, imageUrl: stored.url, storageKey: stored.key, caption: String(request.body?.caption ?? "").slice(0, 240),
        scanEngine: processed.scan.engine, scanDetails: processed.scan.details });
      notify(io, request.guest!.venueId, "media:submitted");
      return response.status(201).json({ ok: true, post });
    } catch (error) {
      await deleteImage(stored.key).catch((cleanupError) => logger.warn({ err: cleanupError, key: stored.key }, "Falha ao remover upload órfão"));
      throw error;
    }
  }));

  app.post("/api/auth/forgot-password", asyncRoute(async (request, response) => {
    const input = forgotPasswordInputSchema.parse(request.body);
    await requestPasswordReset(input.email);
    return response.json({ ok: true, message: "Se a conta existir, as instruções serão enviadas ao e-mail cadastrado." });
  }));
  app.post("/api/auth/reset-password", asyncRoute(async (request, response) => {
    const input = resetPasswordInputSchema.parse(request.body);
    await resetPasswordWithToken(input.token, input.newPassword);
    response.setHeader("set-cookie", [clearAdminSessionCookie(), clearMfaChallengeCookie()]);
    return response.json({ ok: true });
  }));

  app.post("/api/auth/login", asyncRoute(async (request, response) => {
    const input = loginInputSchema.parse(request.body);
    const auth = await createAdminSession(input.email, input.password, request.header("user-agent"));
    if (!auth) return response.status(401).json({ ok: false, message: "E-mail ou senha inválidos, conta temporariamente bloqueada ou empresa sem acesso ativo." });
    if (auth.kind === "mfa") {
      response.setHeader("set-cookie", mfaChallengeCookie(auth.challengeToken));
      return response.json({ ok: true, mfaRequired: true, enrollmentRequired: auth.enrollmentRequired, ...(auth.otpauthUri ? { otpauthUri: auth.otpauthUri } : {}) });
    }
    response.setHeader("set-cookie", adminSessionCookie(auth.token, auth.identity.isPlatformAdmin));
    return response.json({ ok: true, identity: auth.identity, ...(config.returnAdminToken ? { token: auth.token } : {}) });
  }));
  app.post("/api/auth/mfa/verify", asyncRoute(async (request, response) => {
    const input = mfaCodeInputSchema.parse(request.body);
    const challengeToken = mfaChallengeTokenFromHeaders(request.headers);
    if (!challengeToken) return response.status(401).json({ ok: false, message: "Desafio MFA ausente ou expirado." });
    const auth = await completeMfaAdminSession(challengeToken, input.code, request.header("user-agent"));
    response.setHeader("set-cookie", [clearMfaChallengeCookie(), adminSessionCookie(auth.token, auth.identity.isPlatformAdmin)]);
    return response.json({ ok: true, identity: auth.identity, ...(auth.recoveryCodes ? { recoveryCodes: auth.recoveryCodes } : {}), ...(config.returnAdminToken ? { token: auth.token } : {}) });
  }));
  app.post("/api/auth/demo", asyncRoute(async (request, response) => {
    const auth = await createDemoAdminSession(request.header("user-agent"));
    if (!auth) return response.status(404).json({ ok: false, message: "Modo demonstração não está ativo." });
    response.setHeader("set-cookie", adminSessionCookie(auth.token, auth.identity.isPlatformAdmin));
    return response.json({ ok: true, identity: auth.identity, ...(config.returnAdminToken ? { token: auth.token } : {}) });
  }));
  app.get("/api/auth/me", requireAdmin, asyncRoute(async (request: AdminRequest, response) =>
    response.json({ ok: true, identity: request.admin, organization: await getOrganizationAccess(request.admin!.organizationId), venues: await listOrganizationVenues(request.admin!.organizationId) })));
  app.get("/api/auth/mfa/status", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    const state = await userMfaState(request.admin!.userId);
    return response.json({ ok: true, status: { ...state, required: roleRequiresMfa(request.admin!.role, request.admin!.isPlatformAdmin) } });
  }));
  app.post("/api/auth/mfa/setup", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    const challenge = await beginAuthenticatedMfaEnrollment(request.admin!);
    response.setHeader("set-cookie", mfaChallengeCookie(challenge.challengeToken));
    return response.json({ ok: true, otpauthUri: challenge.otpauthUri });
  }));
  app.post("/api/auth/step-up", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    const input = stepUpInputSchema.parse(request.body);
    await performStepUp({ userId: request.admin!.userId, organizationId: request.admin!.organizationId, token: request.accessToken!, currentPassword: input.currentPassword, code: input.code });
    return response.json({ ok: true, validForMinutes: config.stepUpMinutes });
  }));
  app.post("/api/auth/mfa/disable", requireAdmin, requireStepUp, asyncRoute(async (request: AdminRequest, response) => {
    if (roleRequiresMfa(request.admin!.role, request.admin!.isPlatformAdmin)) throw new HttpError(409, "MFA é obrigatório para este perfil e não pode ser desativado.");
    await disableMfa(request.admin!.userId);
    const revoked = await revokeOtherAdminSessions(request.admin!.userId, request.accessToken!);
    await record(request, "disable_mfa", "user", request.admin!.userId, { revoked });
    return response.json({ ok: true, revoked });
  }));
  app.post("/api/auth/change-password", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    const input = changePasswordInputSchema.parse(request.body);
    await changeUserPassword({ userId: request.admin!.userId, currentPassword: input.currentPassword, newPassword: input.newPassword, currentToken: request.accessToken! });
    await record(request, "change_password", "user", request.admin!.userId);
    return response.json({ ok: true });
  }));
  app.post("/api/auth/logout", asyncRoute(async (request, response) => {
    const authorization = request.header("authorization") ?? "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : adminTokenFromHeaders(request.headers);
    if (token) await revokeToken(token);
    response.setHeader("set-cookie", [clearAdminSessionCookie(), clearMfaChallengeCookie()]);
    return response.json({ ok: true });
  }));
  app.get("/api/auth/sessions", requireAdmin, asyncRoute(async (request: AdminRequest, response) =>
    response.json({ ok: true, sessions: await listAdminSessions(request.admin!.userId, request.accessToken!) })));
  app.get("/api/auth/security-events", requireAdmin, asyncRoute(async (request: AdminRequest, response) =>
    response.json({ ok: true, items: await listSecurityEvents(request.admin!.organizationId, Number(request.query.limit ?? 30)) })));
  app.delete("/api/auth/sessions/:sessionId", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    const revoked = await revokeAdminSession(request.admin!.userId, String(request.params.sessionId), request.accessToken!);
    if (!revoked) return response.status(404).json({ ok: false, message: "Sessão não encontrada ou é a sessão atual." });
    await record(request, "revoke_session", "auth_session", String(request.params.sessionId));
    return response.json({ ok: true });
  }));
  app.delete("/api/auth/sessions", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    const revoked = await revokeOtherAdminSessions(request.admin!.userId, request.accessToken!);
    await record(request, "revoke_other_sessions", "user", request.admin!.userId, { revoked });
    return response.json({ ok: true, revoked });
  }));


  app.get("/api/platform/overview", requireAdmin, requirePlatformAdmin, asyncRoute(async (_request: AdminRequest, response) =>
    response.json({ ok: true, overview: await platformOverview() })));
  app.get("/api/platform/clients", requireAdmin, requirePlatformAdmin, asyncRoute(async (_request: AdminRequest, response) =>
    response.json({ ok: true, clients: await listPlatformClients() })));
  app.post("/api/platform/clients", requireAdmin, requirePlatformAdmin, requireStepUp, asyncRoute(async (request: AdminRequest, response) => {
    const input = platformClientCreateSchema.parse(request.body);
    const result = await provisionPlatformClient({ actorUserId: request.admin!.userId, ...input });
    return response.status(201).json({ ok: true, ...result });
  }));
  app.patch("/api/platform/clients/:organizationId/commercial", requireAdmin, requirePlatformAdmin, requireStepUp, asyncRoute(async (request: AdminRequest, response) => {
    const input = platformClientCommercialSchema.parse(request.body);
    const client = await updatePlatformClientCommercial({ actorUserId: request.admin!.userId, organizationId: String(request.params.organizationId), ...input });
    return response.json({ ok: true, client });
  }));
  app.patch("/api/platform/clients/:organizationId/status", requireAdmin, requirePlatformAdmin, requireStepUp, asyncRoute(async (request: AdminRequest, response) => {
    const input = platformClientStatusSchema.parse(request.body);
    const client = await updatePlatformClientStatus({ actorUserId: request.admin!.userId, organizationId: String(request.params.organizationId), ...input });
    return response.json({ ok: true, client });
  }));
  app.get("/api/platform/invoices", requireAdmin, requirePlatformAdmin, asyncRoute(async (request: AdminRequest, response) => {
    const organizationId = String(request.query.organizationId ?? "").trim();
    return response.json({ ok: true, invoices: await listPlatformInvoices(organizationId || undefined) });
  }));
  app.post("/api/platform/invoices", requireAdmin, requirePlatformAdmin, requireStepUp, asyncRoute(async (request: AdminRequest, response) => {
    const input = platformInvoiceCreateSchema.parse(request.body);
    const invoice = await createPlatformInvoice({ actorUserId: request.admin!.userId, ...input });
    return response.status(201).json({ ok: true, invoice });
  }));
  app.patch("/api/platform/invoices/:invoiceId", requireAdmin, requirePlatformAdmin, requireStepUp, asyncRoute(async (request: AdminRequest, response) => {
    const input = platformInvoiceSettleSchema.parse(request.body);
    const invoice = await settlePlatformInvoice({ actorUserId: request.admin!.userId, invoiceId: String(request.params.invoiceId), ...input });
    return response.json({ ok: true, invoice });
  }));
  app.post("/api/platform/users/reset-password", requireAdmin, requirePlatformAdmin, requireStepUp, asyncRoute(async (request: AdminRequest, response) => {
    const input = platformPasswordResetSchema.parse(request.body);
    const result = await resetPlatformUserPassword({ actorUserId: request.admin!.userId, ...input });
    return response.json({ ok: true, ...result });
  }));

  app.get("/api/admin/team", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    requireManager(request);
    return response.json({ ok: true, members: await listTeamMembers(request.admin!.organizationId) });
  }));
  app.get("/api/admin/billing", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    requireRole(request, ["owner", "manager", "viewer"]);
    return response.json({ ok: true, invoices: await listBillingInvoices(request.admin!.organizationId) });
  }));
  app.get("/api/admin/audit", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    requireManager(request);
    const query = auditLogQuerySchema.parse(request.query);
    return response.json({ ok: true, ...await listAuditLogs({ organizationId: request.admin!.organizationId, ...query }) });
  }));
  app.get("/api/admin/notifications", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    const query = notificationQuerySchema.parse(request.query);
    return response.json({ ok: true, items: await listNotifications(request.admin!.organizationId, query.limit, query.unreadOnly) });
  }));
  app.patch("/api/admin/notifications/:id/read", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    const updated = await markNotificationRead(request.admin!.organizationId, String(request.params.id));
    if (!updated) throw new HttpError(404, "Aviso não encontrado.");
    return response.json({ ok: true });
  }));
  app.post("/api/admin/notifications/read-all", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    return response.json({ ok: true, updated: await markAllNotificationsRead(request.admin!.organizationId) });
  }));
  app.patch("/api/admin/organization", requireAdmin, requireStepUp, asyncRoute(async (request: AdminRequest, response) => {
    requireRole(request, ["owner"], "Somente o proprietário pode alterar os dados da empresa e os documentos legais.");
    const input = organizationSettingsSchema.parse(request.body);
    const organization = await updateOrganizationSettings({ organizationId: request.admin!.organizationId, ...input });
    await record(request, "update", "organization", organization.id, { legalVersions: organization.legal });
    return response.json({ ok: true, organization });
  }));
  app.post("/api/admin/team", requireAdmin, requireStepUp, asyncRoute(async (request: AdminRequest, response) => {
    requireManager(request);
    const input = teamMemberInputSchema.parse(request.body);
    const member = await createTeamMember({ organizationId: request.admin!.organizationId, actorRole: request.admin!.role, ...input });
    await record(request, "create", "team_member", member.userId, { role: member.role });
    return response.status(201).json({ ok: true, member });
  }));
  app.patch("/api/admin/team/:userId", requireAdmin, requireStepUp, asyncRoute(async (request: AdminRequest, response) => {
    requireManager(request);
    const input = teamMemberUpdateSchema.parse(request.body);
    const member = await updateTeamMember({ organizationId: request.admin!.organizationId, actorUserId: request.admin!.userId, actorRole: request.admin!.role, targetUserId: String(request.params.userId), ...input });
    await record(request, "update", "team_member", member.userId, input);
    return response.json({ ok: true, member });
  }));

  app.get("/api/admin/snapshot", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    const snapshot = await adminSnapshot(request.admin!.organizationId, String(request.query.venueId ?? "") || undefined);
    if (!snapshot) return response.status(404).json({ ok: false, message: "Estabelecimento não encontrado." });
    return response.json({ ok: true, snapshot });
  }));
  app.post("/api/admin/venues", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    requireManager(request);
    const input = venueInputSchema.parse(request.body);
    const venue = await createVenue(request.admin!.organizationId, input);
    await record(request, "create", "venue", venue.id, { name: venue.name });
    return response.status(201).json({ ok: true, venue });
  }));
  app.patch("/api/admin/venues/:venueId", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    requireManager(request);
    const venueId = await adminVenue(request);
    const input = venueUpdateSchema.parse(request.body);
    const venue = await updateVenue(request.admin!.organizationId, venueId, input);
    await record(request, "update", "venue", venue.id, { fields: Object.keys(input), modules: venue.modules });
    notify(io, venueId, "venue:updated");
    return response.json({ ok: true, venue });
  }));
  app.post("/api/admin/venues/:venueId/zones", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    requireManager(request);
    const venueId = await adminVenue(request);
    const input = zoneInputSchema.parse(request.body);
    const zone = await createZone(venueId, input);
    await record(request, "create", "zone", zone.id, { venueId, code: zone.code });
    notify(io, venueId, "zone:created");
    return response.status(201).json({ ok: true, zone });
  }));
  app.patch("/api/admin/venues/:venueId/zones/:zoneId", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    requireManager(request);
    const venueId = await adminVenue(request);
    const input = zoneUpdateSchema.parse(request.body);
    const zone = await updateZone(venueId, String(request.params.zoneId), input);
    await record(request, "update", "zone", zone.id, { venueId, fields: Object.keys(input), active: zone.isActive });
    notify(io, venueId, "zone:updated");
    return response.json({ ok: true, zone });
  }));
  app.patch("/api/admin/venues/:venueId/music/:id", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    requireRole(request, ["owner", "manager", "operator", "moderator"]);
    const venueId = await adminVenueModule(request, "music");
    const status = String(request.body?.status ?? "");
    if (!["pending", "approved", "playing", "played", "rejected"].includes(status)) throw new Error("Status musical inválido.");
    await setMusicStatus(String(request.params.id), venueId, status);
    await record(request, "update_status", "music", String(request.params.id), { status });
    notify(io, venueId, "music:status");
    return response.json({ ok: true });
  }));
  app.post("/api/admin/venues/:venueId/playback", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    requireRole(request, ["owner", "manager", "operator", "moderator"]);
    const venueId = await adminVenueModule(request, "music");
    const input = playbackInputSchema.parse(request.body);
    const venuePlayback = await setPlayback(venueId, input);
    notify(io, venueId, "playback:changed");
    return response.json({ ok: true, playback: venuePlayback });
  }));
  app.patch("/api/admin/venues/:venueId/service/:id", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    requireRole(request, ["owner", "manager", "operator"]);
    const venueId = await adminVenueModule(request, "service");
    const status = String(request.body?.status ?? "");
    if (!["open", "assigned", "resolved", "cancelled"].includes(status)) throw new Error("Status inválido.");
    await setServiceStatus(String(request.params.id), venueId, status, request.body?.assignedTo ? String(request.body.assignedTo) : request.admin!.name);
    await record(request, "update_status", "service_request", String(request.params.id), { status });
    notify(io, venueId, "service:status");
    return response.json({ ok: true });
  }));
  app.patch("/api/admin/venues/:venueId/orders/:id", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    requireRole(request, ["owner", "manager", "operator"]);
    const venueId = await adminVenueModule(request, "orders");
    const status = String(request.body?.status ?? "");
    if (!["new", "accepted", "preparing", "ready", "delivered", "cancelled"].includes(status)) throw new Error("Status do pedido inválido.");
    await setOrderStatus(String(request.params.id), venueId, status);
    await record(request, "update_status", "order", String(request.params.id), { status });
    notify(io, venueId, "order:status");
    return response.json({ ok: true });
  }));
  app.post("/api/admin/venues/:venueId/polls", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    requireRole(request, ["owner", "manager", "marketing"]);
    const venueId = await adminVenueModule(request, "polls");
    const input = pollInputSchema.parse(request.body);
    const id = await createPoll(venueId, input.question, input.options);
    await record(request, "create", "poll", id);
    notify(io, venueId, "poll:created");
    return response.status(201).json({ ok: true, id });
  }));
  app.post("/api/admin/venues/:venueId/quizzes", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    requireRole(request, ["owner", "manager", "marketing"]);
    const venueId = await adminVenueModule(request, "quiz");
    const input = quizInputSchema.parse(request.body);
    const id = await createQuiz(venueId, input);
    await record(request, "create", "quiz", id);
    notify(io, venueId, "quiz:created");
    return response.status(201).json({ ok: true, id });
  }));
  app.post("/api/admin/venues/:venueId/events", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    requireRole(request, ["owner", "manager", "marketing"]);
    const venueId = await adminVenueModule(request, "events");
    const input = eventInputSchema.parse(request.body);
    const id = await addEvent(venueId, input);
    await record(request, "create", "event", id);
    notify(io, venueId, "event:created");
    return response.status(201).json({ ok: true, id });
  }));
  app.post("/api/admin/venues/:venueId/campaigns", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    requireRole(request, ["owner", "manager", "marketing"]);
    const venueId = await adminVenueModule(request, "campaigns");
    const input = campaignInputSchema.parse(request.body);
    const id = await addCampaign(venueId, input);
    await record(request, "create", "campaign", id);
    notify(io, venueId, "campaign:created");
    return response.status(201).json({ ok: true, id });
  }));
  app.post("/api/admin/venues/:venueId/announcements", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    requireRole(request, ["owner", "manager", "marketing"]);
    const venueId = await adminVenueModule(request, "signage");
    const input = announcementInputSchema.parse(request.body);
    const id = await addAnnouncement(venueId, input);
    await record(request, "create", "announcement", id);
    notify(io, venueId, "announcement:created");
    return response.status(201).json({ ok: true, id });
  }));
  app.patch("/api/admin/venues/:venueId/media/:id", requireAdmin, asyncRoute(async (request: AdminRequest, response) => {
    requireRole(request, ["owner", "manager", "moderator", "marketing"]);
    const venueId = await adminVenueModule(request, "media");
    const status = String(request.body?.status ?? "");
    if (!["approved", "rejected"].includes(status)) throw new Error("Status inválido.");
    const media = await setMediaStatus(String(request.params.id), venueId, status);
    if (status === "rejected" && media.storageKey) {
      try {
        await deleteImage(media.storageKey);
        await clearMediaStorage(String(request.params.id), venueId);
      } catch (cleanupError) { logger.warn({ err: cleanupError, key: media.storageKey }, "Mídia rejeitada aguardando limpeza do storage"); }
    }
    await record(request, "update_status", "media", String(request.params.id), { status });
    notify(io, venueId, "media:status");
    return response.json({ ok: true });
  }));

  app.use((error: unknown, request: Request, response: Response, next: NextFunction) => {
    void next;
    const correlationId = requestId(request);
    if (error instanceof HttpError) return response.status(error.status).json({ ok: false, message: error.message, requestId: correlationId });
    const details = error as { name?: string; code?: string; message?: string };
    if (details.name === "ZodError" || details.name === "MulterError") return response.status(400).json({ ok: false, message: errorMessage(error), requestId: correlationId });
    if (details.code === "23505") return response.status(409).json({ ok: false, message: "Já existe um registro com estes dados.", requestId: correlationId });
    if (details.code && /^[0-9A-Z]{5,}$/.test(details.code)) {
      logger.error({ err: error, requestId: correlationId, method: request.method, path: request.path }, "Falha de infraestrutura ou persistência");
      return response.status(500).json({ ok: false, message: "Não foi possível concluir a operação. Tente novamente.", requestId: correlationId });
    }
    if (error instanceof Error) return response.status(400).json({ ok: false, message: error.message, requestId: correlationId });
    logger.error({ err: error, requestId: correlationId, method: request.method, path: request.path }, "Erro HTTP inesperado");
    return response.status(500).json({ ok: false, message: "Ocorreu um erro inesperado.", requestId: correlationId });
  });
}
