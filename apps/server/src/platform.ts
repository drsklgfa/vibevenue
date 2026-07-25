import type {
  AdminSnapshot,
  Announcement,
  Campaign,
  DashboardMetrics,
  ExperienceSession,
  LoyaltyAccount,
  MediaPost,
  MenuCategory,
  MusicItem,
  Order,
  PlaybackState,
  Poll,
  PublicVenueSnapshot,
  Quiz,
  ServiceRequest,
  Venue,
  VenueEvent,
  VenueModule,
  Zone
} from "@vibevenue/contracts";
import { extractYouTubeVideoId, normalizeSlug, normalizeZoneCode } from "@vibevenue/contracts";
import { nanoid } from "nanoid";
import { config } from "./config.js";
import { organizationAccessCondition } from "./commercial.js";
import { dbQuery, getPool } from "./integrations.js";
import { hashPassword } from "./security.js";
import { getStoredImageUrl } from "./storage.js";
import { assertCanAddVenue, assertCanAddZone } from "./plans.js";

const iso = (value: unknown): string => value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
const normalizeCustomerKey = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("@")) return normalized;
  const digits = normalized.replace(/\D/g, "");
  return digits.length >= 4 ? digits : normalized.replace(/\s+/g, "");
};
const json = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }
  return value as T;
};

function venueRow(row: any): Venue {
  return { id: row.id, organizationId: row.organization_id, name: row.name, slug: row.slug, city: row.city,
    description: row.description, logoUrl: row.logo_url ?? null, theme: json(row.theme, {}), modules: json(row.modules, []),
    isActive: Boolean(row.is_active), createdAt: iso(row.created_at) };
}
function zoneRow(row: any): Zone {
  return { id: row.id, venueId: row.venue_id, name: row.name, code: row.code, capacity: Number(row.capacity), isActive: Boolean(row.is_active) };
}
function sessionRow(row: any): ExperienceSession {
  return { id: row.id, venueId: row.venue_id, name: row.name, status: row.status,
    startedAt: row.started_at ? iso(row.started_at) : null, endedAt: row.ended_at ? iso(row.ended_at) : null,
    guestCount: Number(row.guest_count ?? 0) };
}
function musicRow(row: any): MusicItem {
  return { id: row.id, venueId: row.venue_id, sessionId: row.experience_session_id ?? null, title: row.title, url: row.url,
    youtubeId: row.youtube_id ?? null, requestedBy: row.requested_by, zoneName: row.zone_name ?? null,
    votes: Number(row.votes ?? 0), status: row.status, createdAt: iso(row.created_at) };
}
function requestRow(row: any): ServiceRequest {
  return { id: row.id, venueId: row.venue_id, zoneId: row.zone_id ?? null, zoneName: row.zone_name,
    guestName: row.guest_name, type: row.type, note: row.note, priority: row.priority, status: row.status,
    assignedTo: row.assigned_to ?? null, createdAt: iso(row.created_at), resolvedAt: row.resolved_at ? iso(row.resolved_at) : null };
}
function eventRow(row: any): VenueEvent {
  return { id: row.id, venueId: row.venue_id, title: row.title, description: row.description,
    startsAt: iso(row.starts_at), endsAt: iso(row.ends_at), capacity: Number(row.capacity),
    reservations: Number(row.reservations ?? 0), status: row.status };
}
function campaignRow(row: any): Campaign {
  return { id: row.id, venueId: row.venue_id, title: row.title, description: row.description, code: row.code,
    reward: row.reward, startsAt: iso(row.starts_at), endsAt: iso(row.ends_at), status: row.status,
    redemptions: Number(row.redemptions ?? 0) };
}
function mediaRow(row: any): MediaPost {
  return { id: row.id, venueId: row.venue_id, guestName: row.guest_name, imageUrl: row.image_url,
    caption: row.caption, status: row.status, createdAt: iso(row.created_at) };
}
function announcementRow(row: any): Announcement {
  return { id: row.id, venueId: row.venue_id, title: row.title, body: row.body, kind: row.kind,
    active: Boolean(row.active), createdAt: iso(row.created_at) };
}
function loyaltyRow(row: any): LoyaltyAccount {
  return { id: row.id, venueId: row.venue_id, customerKey: row.customer_key, displayName: row.display_name,
    points: Number(row.points), level: row.level, updatedAt: iso(row.updated_at) };
}

export async function requireVenueModule(venueId: string, module: VenueModule): Promise<void> {
  const result = await dbQuery<any>(`SELECT 1 FROM venues WHERE id=$1 AND is_active=TRUE AND modules ? $2 LIMIT 1`, [venueId, module]);
  if (!result.rows[0]) throw new Error(`O módulo ${module} não está ativo neste estabelecimento.`);
}

export async function seedDemo(): Promise<void> {
  if (!config.autoSeedDemo) return;
  const modules = ["music", "service", "orders", "polls", "quiz", "events", "loyalty", "campaigns", "media", "feedback", "signage", "analytics"];
  await dbQuery(`INSERT INTO organizations(id,name,plan,require_guest_consent) VALUES('org_demo','VibeVenue Demonstração','demo',FALSE) ON CONFLICT DO NOTHING`);
  await dbQuery(`INSERT INTO users(id,email,name,password_hash) VALUES('user_demo','demo@vibevenue.app','Administrador Demo',$1) ON CONFLICT(email) DO NOTHING`, [hashPassword("VibeVenue@2026")]);
  await dbQuery(`INSERT INTO memberships(organization_id,user_id,role) VALUES('org_demo','user_demo','owner') ON CONFLICT DO NOTHING`);
  await dbQuery(`INSERT INTO venues(id,organization_id,name,slug,city,description,theme,modules)
    VALUES('venue_demo','org_demo','Espaço Aurora','espaco-aurora','Franca/SP','Experiência interativa completa para demonstração do VibeVenue',$1::jsonb,$2::jsonb)
    ON CONFLICT(slug) DO NOTHING`, [JSON.stringify({ primary: "#7c3aed", accent: "#22d3ee", surface: "#10172a" }), JSON.stringify(modules)]);

  for (const [id, name, code, capacity] of [["zone_main", "Salão Principal", "SALAO", 80], ["zone_out", "Área Externa", "EXTERNA", 40], ["zone_vip", "Espaço VIP", "VIP", 20]] as const) {
    await dbQuery(`INSERT INTO zones(id,venue_id,name,code,capacity) VALUES($1,'venue_demo',$2,$3,$4) ON CONFLICT(venue_id,code) DO NOTHING`, [id, name, code, capacity]);
  }
  await dbQuery(`INSERT INTO experience_sessions(id,venue_id,name,status,started_at) VALUES('session_demo','venue_demo','Experiência contínua','live',NOW()) ON CONFLICT DO NOTHING`);
  await dbQuery(`INSERT INTO playback_state(venue_id,state,volume) VALUES('venue_demo','idle',70) ON CONFLICT DO NOTHING`);
  await dbQuery(`INSERT INTO polls(id,venue_id,question,status) VALUES('poll_demo','venue_demo','Qual atração deve começar primeiro?','live') ON CONFLICT DO NOTHING`);
  for (const [id, label, position] of [["poll_opt_1", "Quiz musical", 1], ["poll_opt_2", "Playlist colaborativa", 2], ["poll_opt_3", "Mural de fotos", 3]] as const) {
    await dbQuery(`INSERT INTO poll_options(id,poll_id,label,position) VALUES($1,'poll_demo',$2,$3) ON CONFLICT DO NOTHING`, [id, label, position]);
  }

  await dbQuery(`INSERT INTO quizzes(id,venue_id,title,status,current_question_id) VALUES('quiz_demo','venue_demo','Quiz da Casa','live','quiz_question_demo') ON CONFLICT DO NOTHING`);
  await dbQuery(`INSERT INTO quiz_questions(id,quiz_id,prompt,options,correct_index,position)
    VALUES('quiz_question_demo','quiz_demo','Qual destas experiências pode ser controlada pelo celular?',$1::jsonb,3,1) ON CONFLICT DO NOTHING`,
    [JSON.stringify(["Somente reservas", "Somente o mural", "Somente a fidelidade", "Música, jogos e atendimento"])]);

  await dbQuery(`INSERT INTO menu_categories(id,venue_id,name,position) VALUES('menu_cat_demo','venue_demo','Destaques',1) ON CONFLICT DO NOTHING`);
  for (const [id, name, description, price, featured] of [
    ["menu_item_1", "Combo Aurora", "Item demonstrativo personalizável pelo estabelecimento", 3490, true],
    ["menu_item_2", "Porção da Casa", "Exemplo de produto para pedidos por QR Code", 2890, true],
    ["menu_item_3", "Sobremesa Especial", "Exemplo de item complementar", 1690, false]
  ] as const) {
    await dbQuery(`INSERT INTO menu_items(id,category_id,name,description,price_cents,featured) VALUES($1,'menu_cat_demo',$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [id, name, description, price, featured]);
  }

  await dbQuery(`INSERT INTO venue_events(id,venue_id,title,description,starts_at,ends_at,capacity,status)
    VALUES('event_demo','venue_demo','Noite Interativa','Música, quiz e experiências pelo QR Code',NOW()+INTERVAL '1 day',NOW()+INTERVAL '1 day 4 hours',120,'published') ON CONFLICT DO NOTHING`);
  await dbQuery(`INSERT INTO campaigns(id,venue_id,title,description,code,reward,starts_at,ends_at,status)
    VALUES('campaign_demo','venue_demo','Boas-vindas','Cadastre sua visita e receba pontos','AURORA10','10 pontos de fidelidade',NOW()-INTERVAL '1 day',NOW()+INTERVAL '30 days','active') ON CONFLICT DO NOTHING`);
  await dbQuery(`INSERT INTO announcements(id,venue_id,title,body,kind,active)
    VALUES('announcement_demo','venue_demo','Bem-vindo ao VibeVenue','Escaneie, participe e acompanhe tudo em tempo real.','info',TRUE) ON CONFLICT DO NOTHING`);
}

async function venueBySlug(slug: string): Promise<Venue | null> {
  const result = await dbQuery<any>(`SELECT v.* FROM venues v JOIN organizations o ON o.id=v.organization_id WHERE v.slug=$1 AND v.is_active=TRUE AND ${organizationAccessCondition} LIMIT 1`, [normalizeSlug(slug)]);
  return result.rows[0] ? venueRow(result.rows[0]) : null;
}
async function venueById(id: string): Promise<Venue | null> {
  const result = await dbQuery<any>(`SELECT v.* FROM venues v JOIN organizations o ON o.id=v.organization_id WHERE v.id=$1 AND v.is_active=TRUE AND ${organizationAccessCondition} LIMIT 1`, [id]);
  return result.rows[0] ? venueRow(result.rows[0]) : null;
}
async function zones(venueId: string, all = false): Promise<Zone[]> {
  const result = await dbQuery<any>(`SELECT * FROM zones WHERE venue_id=$1 ${all ? "" : "AND is_active=TRUE"} ORDER BY is_active DESC,name`, [venueId]);
  return result.rows.map(zoneRow);
}
async function currentSession(venueId: string): Promise<ExperienceSession | null> {
  const result = await dbQuery<any>(`SELECT s.*,COUNT(g.id)::int AS guest_count FROM experience_sessions s
    LEFT JOIN guest_sessions g ON g.experience_session_id=s.id AND g.expires_at>NOW()
    WHERE s.venue_id=$1 AND s.status='live' GROUP BY s.id ORDER BY s.started_at DESC NULLS LAST LIMIT 1`, [venueId]);
  return result.rows[0] ? sessionRow(result.rows[0]) : null;
}
async function playback(venueId: string): Promise<PlaybackState> {
  const result = await dbQuery<any>(`SELECT * FROM playback_state WHERE venue_id=$1`, [venueId]);
  const row = result.rows[0];
  return row ? { venueId: row.venue_id, videoId: row.video_id ?? null, itemId: row.music_item_id ?? null,
    state: row.state, currentTime: Number(row.current_time), volume: Number(row.volume), updatedAt: iso(row.updated_at) }
    : { venueId, videoId: null, itemId: null, state: "idle", currentTime: 0, volume: 70, updatedAt: new Date().toISOString() };
}
async function music(venueId: string, publicOnly: boolean): Promise<MusicItem[]> {
  const filter = publicOnly ? `AND m.status IN ('approved','playing')` : "";
  const result = await dbQuery<any>(`SELECT m.*,COUNT(v.guest_session_id)::int AS votes FROM music_items m
    LEFT JOIN music_votes v ON v.music_item_id=m.id WHERE m.venue_id=$1 ${filter} GROUP BY m.id
    ORDER BY CASE m.status WHEN 'playing' THEN 0 WHEN 'approved' THEN 1 WHEN 'pending' THEN 2 ELSE 3 END, votes DESC, m.created_at`, [venueId]);
  return result.rows.map(musicRow);
}
async function polls(venueId: string, all = false): Promise<Poll[]> {
  const result = await dbQuery<any>(`SELECT p.*,o.id AS option_id,o.label,COUNT(v.guest_session_id)::int AS votes FROM polls p
    JOIN poll_options o ON o.poll_id=p.id LEFT JOIN poll_votes v ON v.option_id=o.id
    WHERE p.venue_id=$1 ${all ? "" : "AND p.status='live'"} GROUP BY p.id,o.id ORDER BY p.created_at DESC,o.position`, [venueId]);
  const map = new Map<string, Poll>();
  for (const row of result.rows) {
    let poll = map.get(row.id);
    if (!poll) {
      poll = { id: row.id, venueId: row.venue_id, question: row.question, status: row.status,
        options: [], totalVotes: 0, createdAt: iso(row.created_at) };
      map.set(row.id, poll);
    }
    const votes = Number(row.votes);
    poll.options.push({ id: row.option_id, label: row.label, votes });
    poll.totalVotes += votes;
  }
  return [...map.values()];
}
async function quizzes(venueId: string, all = false): Promise<Quiz[]> {
  const result = await dbQuery<any>(`SELECT q.*,qq.id AS question_id,qq.prompt,qq.options,qq.position,
    (SELECT COUNT(*) FROM quiz_questions q2 WHERE q2.quiz_id=q.id)::int AS total_questions,
    (SELECT COUNT(*) FROM quiz_answers qa WHERE qa.question_id=qq.id)::int AS answers
    FROM quizzes q LEFT JOIN quiz_questions qq ON qq.id=q.current_question_id
    WHERE q.venue_id=$1 ${all ? "" : "AND q.status='live'"} ORDER BY q.created_at DESC`, [venueId]);
  return result.rows.map((row: any) => ({
    id: row.id, venueId: row.venue_id, title: row.title, status: row.status,
    currentQuestion: row.question_id ? { id: row.question_id, prompt: row.prompt, options: json<string[]>(row.options, []),
      position: Number(row.position), answers: Number(row.answers ?? 0) } : null,
    totalQuestions: Number(row.total_questions ?? 0), createdAt: iso(row.created_at)
  }));
}
async function menu(venueId: string): Promise<MenuCategory[]> {
  const result = await dbQuery<any>(`SELECT c.id category_id,c.venue_id,c.name category_name,c.position category_position,
    i.id item_id,i.name item_name,i.description,i.price_cents,i.image_url,i.available,i.featured
    FROM menu_categories c LEFT JOIN menu_items i ON i.category_id=c.id
    WHERE c.venue_id=$1 ORDER BY c.position,c.name,i.featured DESC,i.name`, [venueId]);
  const map = new Map<string, MenuCategory>();
  for (const row of result.rows) {
    let category = map.get(row.category_id);
    if (!category) {
      category = { id: row.category_id, venueId: row.venue_id, name: row.category_name, position: Number(row.category_position), items: [] };
      map.set(row.category_id, category);
    }
    if (row.item_id) category.items.push({ id: row.item_id, categoryId: row.category_id, name: row.item_name,
      description: row.description, priceCents: Number(row.price_cents), imageUrl: row.image_url ?? null,
      available: Boolean(row.available), featured: Boolean(row.featured) });
  }
  return [...map.values()];
}
async function orders(venueId: string): Promise<Order[]> {
  const result = await dbQuery<any>(`SELECT o.*,i.id AS item_id,i.name AS item_name,i.quantity,i.unit_price_cents
    FROM venue_orders o LEFT JOIN order_items i ON i.order_id=o.id WHERE o.venue_id=$1
    ORDER BY CASE o.status WHEN 'new' THEN 0 WHEN 'accepted' THEN 1 WHEN 'preparing' THEN 2 WHEN 'ready' THEN 3 ELSE 4 END,o.created_at DESC`, [venueId]);
  const map = new Map<string, Order>();
  for (const row of result.rows) {
    let order = map.get(row.id);
    if (!order) {
      order = { id: row.id, venueId: row.venue_id, zoneName: row.zone_name, guestName: row.guest_name,
        status: row.status, note: row.note, totalCents: Number(row.total_cents), createdAt: iso(row.created_at), items: [] };
      map.set(row.id, order);
    }
    if (row.item_id) order.items.push({ name: row.item_name, quantity: Number(row.quantity), unitPriceCents: Number(row.unit_price_cents) });
  }
  return [...map.values()];
}
async function events(venueId: string, all = false): Promise<VenueEvent[]> {
  const result = await dbQuery<any>(`SELECT e.*,COALESCE(SUM(CASE WHEN r.status='confirmed' THEN r.party_size ELSE 0 END),0)::int AS reservations FROM venue_events e
    LEFT JOIN reservations r ON r.event_id=e.id WHERE e.venue_id=$1 ${all ? "" : "AND e.status='published' AND e.ends_at>NOW()"}
    GROUP BY e.id ORDER BY e.starts_at`, [venueId]);
  return result.rows.map(eventRow);
}
async function campaigns(venueId: string, all = false): Promise<Campaign[]> {
  const result = await dbQuery<any>(`SELECT c.*,COUNT(cr.id)::int AS redemptions FROM campaigns c
    LEFT JOIN coupon_redemptions cr ON cr.campaign_id=c.id WHERE c.venue_id=$1
    ${all ? "" : "AND c.status='active' AND NOW() BETWEEN c.starts_at AND c.ends_at"}
    GROUP BY c.id ORDER BY c.starts_at DESC`, [venueId]);
  return result.rows.map(campaignRow);
}
async function announcements(venueId: string): Promise<Announcement[]> {
  const result = await dbQuery<any>(`SELECT * FROM announcements WHERE venue_id=$1 AND active=TRUE ORDER BY created_at DESC LIMIT 10`, [venueId]);
  return result.rows.map(announcementRow);
}
async function media(venueId: string, status = "approved"): Promise<MediaPost[]> {
  const result = await dbQuery<any>(`SELECT * FROM media_posts WHERE venue_id=$1 AND status=$2 AND scan_status='clean' ORDER BY created_at DESC LIMIT 60`, [venueId, status]);
  return Promise.all(result.rows.map(async (row: any) => mediaRow({ ...row, image_url: await getStoredImageUrl(row.storage_key, row.image_url) })));
}

export async function venueGuestPolicy(venueId: string): Promise<PublicVenueSnapshot["legal"] | null> {
  const result = await dbQuery<any>(`SELECT o.require_guest_consent,o.privacy_policy_url,o.terms_url,o.privacy_version,o.terms_version
    FROM venues v JOIN organizations o ON o.id=v.organization_id WHERE v.id=$1 LIMIT 1`, [venueId]);
  const row = result.rows[0];
  return row ? {
    requireConsent: Boolean(row.require_guest_consent),
    privacyPolicyUrl: row.privacy_policy_url ?? "",
    termsUrl: row.terms_url ?? "",
    privacyVersion: row.privacy_version ?? "1.0",
    termsVersion: row.terms_version ?? "1.0"
  } : null;
}

export async function publicSnapshotBySlug(slug: string): Promise<PublicVenueSnapshot | null> {
  const venue = await venueBySlug(slug);
  if (!venue) return null;
  const enabled = new Set<VenueModule>(venue.modules);
  const idlePlayback: PlaybackState = { venueId: venue.id, videoId: null, itemId: null, state: "idle", currentTime: 0, volume: 70, updatedAt: new Date().toISOString() };
  const [legal, venueZones, session, venuePlayback, queue, venuePolls, venueQuizzes, venueMenu, venueEvents, venueCampaigns, venueAnnouncements, venueMedia] = await Promise.all([
    venueGuestPolicy(venue.id), zones(venue.id), currentSession(venue.id), enabled.has("music") ? playback(venue.id) : Promise.resolve(idlePlayback),
    enabled.has("music") ? music(venue.id, true) : Promise.resolve([] as MusicItem[]),
    enabled.has("polls") ? polls(venue.id) : Promise.resolve([] as Poll[]),
    enabled.has("quiz") ? quizzes(venue.id) : Promise.resolve([] as Quiz[]),
    enabled.has("orders") ? menu(venue.id) : Promise.resolve([] as MenuCategory[]),
    enabled.has("events") ? events(venue.id) : Promise.resolve([] as VenueEvent[]),
    enabled.has("campaigns") ? campaigns(venue.id) : Promise.resolve([] as Campaign[]),
    enabled.has("signage") ? announcements(venue.id) : Promise.resolve([] as Announcement[]),
    enabled.has("media") ? media(venue.id) : Promise.resolve([] as MediaPost[])
  ]);
  return { venue, legal: legal ?? { requireConsent: false, privacyPolicyUrl: "", termsUrl: "", privacyVersion: "1.0", termsVersion: "1.0" },
    zones: venueZones, currentSession: session, playback: venuePlayback, queue,
    poll: venuePolls[0] ?? null, quiz: venueQuizzes[0] ?? null, menu: venueMenu, events: venueEvents,
    campaigns: venueCampaigns, announcements: venueAnnouncements, media: venueMedia };
}
export async function publicSnapshotById(id: string): Promise<PublicVenueSnapshot | null> {
  const venue = await venueById(id);
  return venue ? publicSnapshotBySlug(venue.slug) : null;
}
export async function listOrganizationVenues(organizationId: string): Promise<Venue[]> {
  const result = await dbQuery<any>(`SELECT * FROM venues WHERE organization_id=$1 ORDER BY name`, [organizationId]);
  return result.rows.map(venueRow);
}
export async function organizationVenue(organizationId: string, venueId?: string): Promise<Venue | null> {
  const result = await dbQuery<any>(`SELECT * FROM venues WHERE organization_id=$1 AND is_active=TRUE ${venueId ? "AND id=$2" : ""} ORDER BY created_at LIMIT 1`, venueId ? [organizationId, venueId] : [organizationId]);
  return result.rows[0] ? venueRow(result.rows[0]) : null;
}

export async function adminSnapshot(organizationId: string, venueId?: string): Promise<AdminSnapshot | null> {
  const venue = await organizationVenue(organizationId, venueId);
  if (!venue) return null;
  const base = await publicSnapshotById(venue.id);
  if (!base) return null;
  const enabled = new Set<VenueModule>(venue.modules);
  const emptyRows = Promise.resolve({ rows: [] } as any);
  const [requests, venueOrders, allMusic, allPolls, allQuizzes, allEvents, allCampaigns, pendingMedia, feedbackRows, loyaltyRows, metricRows, top] = await Promise.all([
    enabled.has("service") ? dbQuery<any>(`SELECT * FROM service_requests WHERE venue_id=$1 ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'assigned' THEN 1 ELSE 2 END,created_at DESC LIMIT 100`, [venue.id]) : emptyRows,
    enabled.has("orders") ? orders(venue.id) : Promise.resolve([] as Order[]),
    enabled.has("music") ? music(venue.id, false) : Promise.resolve([] as MusicItem[]),
    enabled.has("polls") ? polls(venue.id, true) : Promise.resolve([] as Poll[]),
    enabled.has("quiz") ? quizzes(venue.id, true) : Promise.resolve([] as Quiz[]),
    enabled.has("events") ? events(venue.id, true) : Promise.resolve([] as VenueEvent[]),
    enabled.has("campaigns") ? campaigns(venue.id, true) : Promise.resolve([] as Campaign[]),
    enabled.has("media") ? media(venue.id, "pending") : Promise.resolve([] as MediaPost[]),
    enabled.has("feedback") ? dbQuery<any>(`SELECT id,score,comment,created_at FROM feedback WHERE venue_id=$1 ORDER BY created_at DESC LIMIT 100`, [venue.id]) : emptyRows,
    enabled.has("loyalty") ? dbQuery<any>(`SELECT * FROM loyalty_accounts WHERE venue_id=$1 ORDER BY points DESC LIMIT 100`, [venue.id]) : emptyRows,
    dbQuery<any>(`SELECT
      (SELECT COUNT(*) FROM guest_sessions WHERE venue_id=$1 AND expires_at>NOW())::int active_guests,
      (SELECT COUNT(*) FROM service_requests WHERE venue_id=$1 AND status IN ('open','assigned'))::int open_requests,
      (SELECT COUNT(*) FROM music_items WHERE venue_id=$1 AND status='pending')::int pending_music,
      (SELECT COUNT(*) FROM venue_orders WHERE venue_id=$1 AND status IN ('new','accepted','preparing','ready'))::int pending_orders,
      (SELECT COUNT(*) FROM media_posts WHERE venue_id=$1 AND status='approved')::int approved_media,
      (SELECT COALESCE(SUM(party_size),0) FROM reservations r JOIN venue_events e ON e.id=r.event_id WHERE e.venue_id=$1 AND e.starts_at::date=CURRENT_DATE)::int reservations_today,
      (SELECT COALESCE(AVG(score),0) FROM feedback WHERE venue_id=$1)::float feedback_score,
      (SELECT COUNT(*) FROM music_items WHERE venue_id=$1 AND created_at::date=CURRENT_DATE)::int music_today,
      (SELECT COUNT(*) FROM poll_votes pv JOIN polls p ON p.id=pv.poll_id WHERE p.venue_id=$1 AND pv.created_at::date=CURRENT_DATE)::int polls_today,
      (SELECT COUNT(*) FROM service_requests WHERE venue_id=$1 AND created_at::date=CURRENT_DATE)::int service_today,
      (SELECT COUNT(*) FROM venue_orders WHERE venue_id=$1 AND created_at::date=CURRENT_DATE)::int orders_today`, [venue.id]),
    dbQuery<any>(`SELECT COALESCE(z.name,'Área geral') name,COUNT(g.id)::int value FROM guest_sessions g LEFT JOIN zones z ON z.id=g.zone_id
      WHERE g.venue_id=$1 GROUP BY z.name ORDER BY value DESC LIMIT 5`, [venue.id])
  ]);
  const values = metricRows.rows[0] ?? {};
  const interactionsToday =
    (enabled.has("music") ? Number(values.music_today ?? 0) : 0) +
    (enabled.has("polls") ? Number(values.polls_today ?? 0) : 0) +
    (enabled.has("service") ? Number(values.service_today ?? 0) : 0) +
    (enabled.has("orders") ? Number(values.orders_today ?? 0) : 0);
  const metrics: DashboardMetrics = {
    activeGuests: Number(values.active_guests ?? 0),
    openRequests: enabled.has("service") ? Number(values.open_requests ?? 0) : 0,
    pendingMusic: enabled.has("music") ? Number(values.pending_music ?? 0) : 0,
    pendingOrders: enabled.has("orders") ? Number(values.pending_orders ?? 0) : 0,
    approvedMedia: enabled.has("media") ? Number(values.approved_media ?? 0) : 0,
    reservationsToday: enabled.has("events") ? Number(values.reservations_today ?? 0) : 0,
    feedbackScore: enabled.has("feedback") ? Number(values.feedback_score ?? 0) : 0,
    interactionsToday,
    topZones: top.rows.map((row: any) => ({ name: row.name, value: Number(row.value) }))
  };
  return { ...base, zones: await zones(venue.id, true), metrics, serviceRequests: requests.rows.map(requestRow), orders: venueOrders,
    allMusic, polls: allPolls, quizzes: allQuizzes, allEvents, allCampaigns, pendingMedia,
    feedback: feedbackRows.rows.map((row: any) => ({ id: row.id, score: Number(row.score), comment: row.comment, createdAt: iso(row.created_at) })),
    loyalty: loyaltyRows.rows.map(loyaltyRow) };
}

export async function resolveGuestVenue(venueSlug: string, zoneCode: string): Promise<{ venue: Venue; zone: Zone | null; session: ExperienceSession | null } | null> {
  const venue = await venueBySlug(venueSlug);
  if (!venue) return null;
  const result = await dbQuery<any>(`SELECT * FROM zones WHERE venue_id=$1 AND code=$2 AND is_active=TRUE LIMIT 1`, [venue.id, normalizeZoneCode(zoneCode)]);
  return { venue, zone: result.rows[0] ? zoneRow(result.rows[0]) : null, session: await currentSession(venue.id) };
}

export async function addMusic(input: { venueId: string; sessionId: string | null; guestSessionId: string; guestName: string; zoneName: string; title: string; url: string }): Promise<MusicItem> {
  const youtubeId = extractYouTubeVideoId(input.url);
  if (!youtubeId) throw new Error("Informe um link válido de vídeo do YouTube.");
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`music:${input.guestSessionId}:${youtubeId}`]);
    const duplicate = await client.query<any>(`SELECT m.*,(SELECT COUNT(*) FROM music_votes v WHERE v.music_item_id=m.id)::int AS votes
      FROM music_items m WHERE m.venue_id=$1 AND m.guest_session_id=$2 AND m.youtube_id=$3 AND m.status IN ('pending','approved','playing')
      AND m.created_at>NOW()-INTERVAL '30 seconds' ORDER BY m.created_at DESC LIMIT 1`, [input.venueId, input.guestSessionId, youtubeId]);
    if (duplicate.rows[0]) {
      await client.query("COMMIT");
      return musicRow(duplicate.rows[0]);
    }
    const id = nanoid();
    await client.query(`INSERT INTO music_items(id,venue_id,experience_session_id,guest_session_id,title,url,youtube_id,requested_by,zone_name)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [id, input.venueId, input.sessionId, input.guestSessionId, input.title, input.url, youtubeId, input.guestName, input.zoneName]);
    const result = await client.query<any>(`SELECT m.*,0::int votes FROM music_items m WHERE id=$1`, [id]);
    await client.query("COMMIT");
    return musicRow(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function voteMusic(itemId: string, guestSessionId: string, venueId: string): Promise<void> {
  const result = await dbQuery<any>(`INSERT INTO music_votes(music_item_id,guest_session_id) SELECT id,$2 FROM music_items WHERE id=$1 AND venue_id=$3 AND status IN ('approved','playing') ON CONFLICT DO NOTHING RETURNING music_item_id`, [itemId, guestSessionId, venueId]);
  if (!result.rows[0]) {
    const exists = await dbQuery<any>(`SELECT 1 FROM music_votes WHERE music_item_id=$1 AND guest_session_id=$2`, [itemId, guestSessionId]);
    if (!exists.rows[0]) throw new Error("Música indisponível para votação.");
  }
}
export async function setMusicStatus(itemId: string, venueId: string, status: string): Promise<void> {
  const allowedFrom: Record<string, string[]> = { approved: ["pending"], rejected: ["pending", "approved"], playing: ["approved"], played: ["playing"] };
  const previous = allowedFrom[status];
  if (!previous) throw new Error("Transição musical inválida.");
  const updated = await dbQuery<any>(`UPDATE music_items SET status=$3 WHERE id=$1 AND venue_id=$2 AND status=ANY($4::text[]) RETURNING youtube_id`, [itemId, venueId, status, previous]);
  if (!updated.rows[0]) throw new Error("Música não encontrada ou mudança de status não permitida.");
  if (status === "playing") {
    await dbQuery(`UPDATE music_items SET status='played' WHERE venue_id=$1 AND status='playing' AND id<>$2`, [venueId, itemId]);
    await dbQuery(`INSERT INTO playback_state(venue_id,music_item_id,video_id,state,current_time,updated_at)
      VALUES($1,$2,$3,'playing',0,NOW()) ON CONFLICT(venue_id) DO UPDATE SET music_item_id=$2,video_id=$3,state='playing',current_time=0,updated_at=NOW()`,
      [venueId, itemId, updated.rows[0].youtube_id ?? null]);
  }
}
export async function setPlayback(venueId: string, input: { state: "idle" | "playing" | "paused"; currentTime: number; volume: number; itemId?: string | null | undefined; videoId?: string | null | undefined }): Promise<PlaybackState> {
  let itemId = input.itemId ?? null;
  let videoId = input.videoId ?? null;
  if (itemId) {
    const item = await dbQuery<any>(`SELECT youtube_id FROM music_items WHERE id=$1 AND venue_id=$2 LIMIT 1`, [itemId, venueId]);
    if (!item.rows[0]) throw new Error("A música selecionada não pertence a este estabelecimento.");
    videoId = item.rows[0].youtube_id ?? null;
  } else if (videoId && !/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) {
    throw new Error("Identificador de vídeo inválido.");
  }
  await dbQuery(`INSERT INTO playback_state(venue_id,music_item_id,video_id,state,current_time,volume,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,NOW()) ON CONFLICT(venue_id) DO UPDATE SET music_item_id=$2,video_id=$3,state=$4,current_time=$5,volume=$6,updated_at=NOW()`,
    [venueId, itemId, videoId, input.state, Math.max(0, input.currentTime), Math.max(0, Math.min(100, input.volume))]);
  return playback(venueId);
}

export async function addServiceRequest(input: { venueId: string; zoneId: string | null; guestSessionId: string; zoneName: string; guestName: string; type: string; note: string; priority: string }): Promise<ServiceRequest> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`service:${input.guestSessionId}:${input.type}`]);
    const duplicate = await client.query<any>(`SELECT * FROM service_requests WHERE venue_id=$1 AND guest_session_id=$2 AND type=$3 AND note=$4 AND priority=$5 AND status IN ('open','assigned') AND created_at>NOW()-INTERVAL '2 minutes' ORDER BY created_at DESC LIMIT 1`, [input.venueId, input.guestSessionId, input.type, input.note, input.priority]);
    if (duplicate.rows[0]) { await client.query("COMMIT"); return requestRow(duplicate.rows[0]); }
    const id = nanoid();
    const result = await client.query<any>(`INSERT INTO service_requests(id,venue_id,zone_id,guest_session_id,zone_name,guest_name,type,note,priority)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [id, input.venueId, input.zoneId, input.guestSessionId, input.zoneName, input.guestName, input.type, input.note, input.priority]);
    await client.query("COMMIT");
    return requestRow(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
export async function setServiceStatus(id: string, venueId: string, status: string, assignedTo: string | null): Promise<void> {
  const allowedFrom: Record<string, string[]> = { assigned: ["open"], open: ["assigned"], resolved: ["open", "assigned"], cancelled: ["open", "assigned"] };
  const previous = allowedFrom[status];
  if (!previous) throw new Error("Transição de atendimento inválida.");
  const result = await dbQuery<any>(`UPDATE service_requests SET status=$3,assigned_to=$4,resolved_at=CASE WHEN $3='resolved' THEN NOW() WHEN $3 IN ('open','assigned') THEN NULL ELSE resolved_at END WHERE id=$1 AND venue_id=$2 AND status=ANY($5::text[]) RETURNING id`, [id, venueId, status, assignedTo, previous]);
  if (!result.rows[0]) throw new Error("Solicitação não encontrada ou mudança de status não permitida.");
}

export async function votePoll(pollId: string, optionId: string, guestSessionId: string, venueId: string): Promise<void> {
  const result = await dbQuery<any>(`INSERT INTO poll_votes(poll_id,option_id,guest_session_id)
    SELECT p.id,o.id,$3 FROM polls p JOIN poll_options o ON o.poll_id=p.id WHERE p.id=$1 AND o.id=$2 AND p.venue_id=$4 AND p.status='live'
    ON CONFLICT(poll_id,guest_session_id) DO UPDATE SET option_id=EXCLUDED.option_id,created_at=NOW() RETURNING poll_id`, [pollId, optionId, guestSessionId, venueId]);
  if (!result.rows[0]) throw new Error("Enquete ou opção indisponível.");
}
export async function createPoll(venueId: string, question: string, options: string[]): Promise<string> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`poll:${venueId}`]);
    const current = await client.query<any>(`SELECT p.id,p.question,COALESCE(jsonb_agg(o.label ORDER BY o.position),'[]'::jsonb) AS options
      FROM polls p LEFT JOIN poll_options o ON o.poll_id=p.id WHERE p.venue_id=$1 AND p.status='live'
      GROUP BY p.id ORDER BY p.created_at DESC LIMIT 1`, [venueId]);
    if (current.rows[0] && current.rows[0].question === question && JSON.stringify(json(current.rows[0].options, [])) === JSON.stringify(options)) {
      await client.query("COMMIT");
      return current.rows[0].id;
    }
    const id = nanoid();
    await client.query(`UPDATE polls SET status='closed' WHERE venue_id=$1 AND status='live'`, [venueId]);
    await client.query(`INSERT INTO polls(id,venue_id,question,status) VALUES($1,$2,$3,'live')`, [id, venueId, question]);
    for (const [index, label] of options.entries()) await client.query(`INSERT INTO poll_options(id,poll_id,label,position) VALUES($1,$2,$3,$4)`, [nanoid(), id, label, index]);
    await client.query("COMMIT");
    return id;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function createQuiz(venueId: string, input: { title: string; prompt: string; options: string[]; correctIndex: number }): Promise<string> {
  if (input.correctIndex >= input.options.length) throw new Error("A resposta correta não corresponde às opções.");
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`quiz:${venueId}`]);
    const current = await client.query<any>(`SELECT q.id,q.title,qq.prompt,qq.options,qq.correct_index FROM quizzes q
      JOIN quiz_questions qq ON qq.id=q.current_question_id WHERE q.venue_id=$1 AND q.status='live' ORDER BY q.created_at DESC LIMIT 1`, [venueId]);
    if (current.rows[0] && current.rows[0].title === input.title && current.rows[0].prompt === input.prompt &&
      Number(current.rows[0].correct_index) === input.correctIndex && JSON.stringify(json(current.rows[0].options, [])) === JSON.stringify(input.options)) {
      await client.query("COMMIT");
      return current.rows[0].id;
    }
    const quizId = nanoid();
    const questionId = nanoid();
    await client.query(`UPDATE quizzes SET status='closed' WHERE venue_id=$1 AND status='live'`, [venueId]);
    await client.query(`INSERT INTO quizzes(id,venue_id,title,status,current_question_id) VALUES($1,$2,$3,'live',$4)`, [quizId, venueId, input.title, questionId]);
    await client.query(`INSERT INTO quiz_questions(id,quiz_id,prompt,options,correct_index,position) VALUES($1,$2,$3,$4::jsonb,$5,1)`, [questionId, quizId, input.prompt, JSON.stringify(input.options), input.correctIndex]);
    await client.query("COMMIT");
    return quizId;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function answerQuiz(venueId: string, guestSessionId: string, questionId: string, selectedIndex: number): Promise<{ correct: boolean }> {
  const result = await dbQuery<any>(`SELECT qq.correct_index,jsonb_array_length(qq.options)::int AS option_count FROM quiz_questions qq JOIN quizzes q ON q.id=qq.quiz_id
    WHERE qq.id=$1 AND q.venue_id=$2 AND q.status='live'`, [questionId, venueId]);
  if (!result.rows[0]) throw new Error("Pergunta não está disponível.");
  if (selectedIndex < 0 || selectedIndex >= Number(result.rows[0].option_count)) throw new Error("Opção de resposta inválida.");
  const correct = Number(result.rows[0].correct_index) === selectedIndex;
  await dbQuery(`INSERT INTO quiz_answers(question_id,guest_session_id,selected_index,correct) VALUES($1,$2,$3,$4)
    ON CONFLICT(question_id,guest_session_id) DO UPDATE SET selected_index=$3,correct=$4,created_at=NOW()`, [questionId, guestSessionId, selectedIndex, correct]);
  return { correct };
}

export async function createOrder(input: { venueId: string; zoneId: string | null; guestSessionId: string; zoneName: string; guestName: string; note: string; items: Array<{ itemId: string; quantity: number }> }): Promise<Order> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`order:${input.guestSessionId}`]);
    const quantities = new Map<string, number>();
    for (const item of input.items) quantities.set(item.itemId, (quantities.get(item.itemId) ?? 0) + item.quantity);
    const requested = [...quantities.entries()].map(([itemId, quantity]) => {
      if (quantity > 20) throw new Error("A quantidade máxima por item é 20.");
      return { itemId, quantity };
    });
    const ids = requested.map(item => item.itemId);
    const menuResult = await client.query<any>(`SELECT i.id,i.name,i.price_cents FROM menu_items i JOIN menu_categories c ON c.id=i.category_id WHERE c.venue_id=$1 AND i.available=TRUE AND i.id=ANY($2::text[])`, [input.venueId, ids]);
    const itemsById = new Map<string, any>(menuResult.rows.map((row: any) => [row.id, row] as const));
    if (itemsById.size !== ids.length) throw new Error("Um ou mais itens não estão disponíveis.");
    const normalized = requested.map(item => {
      const row: any = itemsById.get(item.itemId);
      return { ...item, name: row.name, priceCents: Number(row.price_cents) };
    });
    const total = normalized.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
    const recent = await client.query<any>(`SELECT * FROM venue_orders WHERE venue_id=$1 AND guest_session_id=$2 AND note=$3 AND total_cents=$4 AND status='new' AND created_at>NOW()-INTERVAL '30 seconds' ORDER BY created_at DESC LIMIT 1`, [input.venueId, input.guestSessionId, input.note, total]);
    if (recent.rows[0]) {
      const existingItems = await client.query<any>(`SELECT menu_item_id,name,quantity,unit_price_cents FROM order_items WHERE order_id=$1 ORDER BY menu_item_id`, [recent.rows[0].id]);
      const expected = normalized.map(item => `${item.itemId}:${item.quantity}:${item.priceCents}`).sort().join("|");
      const actual = existingItems.rows.map((item: any) => `${item.menu_item_id}:${Number(item.quantity)}:${Number(item.unit_price_cents)}`).sort().join("|");
      if (expected === actual) {
        await client.query("COMMIT");
        return { id: recent.rows[0].id, venueId: input.venueId, zoneName: recent.rows[0].zone_name, guestName: recent.rows[0].guest_name,
          status: recent.rows[0].status, note: recent.rows[0].note, totalCents: Number(recent.rows[0].total_cents), createdAt: iso(recent.rows[0].created_at),
          items: existingItems.rows.map((item: any) => ({ name: item.name, quantity: Number(item.quantity), unitPriceCents: Number(item.unit_price_cents) })) };
      }
    }
    const orderId = nanoid();
    await client.query(`INSERT INTO venue_orders(id,venue_id,zone_id,guest_session_id,zone_name,guest_name,note,total_cents)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [orderId, input.venueId, input.zoneId, input.guestSessionId, input.zoneName, input.guestName, input.note, total]);
    for (const item of normalized) {
      await client.query(`INSERT INTO order_items(id,order_id,menu_item_id,name,quantity,unit_price_cents) VALUES($1,$2,$3,$4,$5,$6)`, [nanoid(), orderId, item.itemId, item.name, item.quantity, item.priceCents]);
    }
    await client.query("COMMIT");
    return { id: orderId, venueId: input.venueId, zoneName: input.zoneName, guestName: input.guestName,
      status: "new", note: input.note, totalCents: total, createdAt: new Date().toISOString(),
      items: normalized.map(item => ({ name: item.name, quantity: item.quantity, unitPriceCents: item.priceCents })) };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
export async function setOrderStatus(id: string, venueId: string, status: string): Promise<void> {
  const allowedFrom: Record<string, string[]> = { accepted: ["new"], preparing: ["accepted"], ready: ["preparing"], delivered: ["ready"], cancelled: ["new", "accepted", "preparing", "ready"] };
  const previous = allowedFrom[status];
  if (!previous) throw new Error("Transição de pedido inválida.");
  const result = await dbQuery<any>(`UPDATE venue_orders SET status=$3 WHERE id=$1 AND venue_id=$2 AND status=ANY($4::text[]) RETURNING id`, [id, venueId, status, previous]);
  if (!result.rows[0]) throw new Error("Pedido não encontrado ou mudança de status não permitida.");
}

export async function addEvent(venueId: string, input: { title: string; description: string; startsAt: string; endsAt: string; capacity: number }): Promise<string> {
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) throw new Error("Informe datas válidas para o evento.");
  if (endsAt <= startsAt) throw new Error("O término precisa ocorrer depois do início.");
  const id = nanoid();
  await dbQuery(`INSERT INTO venue_events(id,venue_id,title,description,starts_at,ends_at,capacity,status) VALUES($1,$2,$3,$4,$5,$6,$7,'published')`, [id, venueId, input.title, input.description, input.startsAt, input.endsAt, input.capacity]);
  return id;
}
export async function reserveEvent(eventId: string, venueId: string, input: { guestSessionId: string; guestName: string; contact: string; partySize: number }): Promise<string> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`reservation:${eventId}:${input.guestSessionId}`]);
    const event = await client.query<any>(`SELECT capacity,ends_at FROM venue_events WHERE id=$1 AND venue_id=$2 AND status='published' FOR UPDATE`, [eventId, venueId]);
    const row = event.rows[0];
    if (!row || new Date(row.ends_at).getTime() <= Date.now()) throw new Error("Evento não disponível.");
    const duplicate = await client.query<any>(`SELECT id FROM reservations WHERE event_id=$1 AND guest_session_id=$2 AND contact=$3 AND party_size=$4 AND status='confirmed' AND created_at>NOW()-INTERVAL '5 minutes' ORDER BY created_at DESC LIMIT 1`, [eventId, input.guestSessionId, input.contact, input.partySize]);
    if (duplicate.rows[0]) { await client.query("COMMIT"); return duplicate.rows[0].id; }
    const reserved = await client.query<any>(`SELECT COALESCE(SUM(party_size),0)::int AS total FROM reservations WHERE event_id=$1 AND status='confirmed'`, [eventId]);
    if (Number(row.capacity) > 0 && Number(reserved.rows[0]?.total ?? 0) + input.partySize > Number(row.capacity)) throw new Error("Não há vagas suficientes para esta reserva.");
    const id = nanoid();
    await client.query(`INSERT INTO reservations(id,event_id,guest_session_id,guest_name,contact,party_size) VALUES($1,$2,$3,$4,$5,$6)`, [id, eventId, input.guestSessionId, input.guestName, input.contact, input.partySize]);
    await client.query("COMMIT");
    return id;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
export async function addCampaign(venueId: string, input: { title: string; description: string; code: string; reward: string; startsAt: string; endsAt: string }): Promise<string> {
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) throw new Error("Informe um período válido para a campanha.");
  const id = nanoid();
  await dbQuery(`INSERT INTO campaigns(id,venue_id,title,description,code,reward,starts_at,ends_at,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'active')`, [id, venueId, input.title, input.description, input.code.toUpperCase(), input.reward, input.startsAt, input.endsAt]);
  return id;
}
export async function redeemCampaign(venueId: string, code: string, customerKey: string): Promise<{ reward: string } | null> {
  const normalizedKey = normalizeCustomerKey(customerKey);
  const result = await dbQuery<any>(`SELECT id,reward FROM campaigns WHERE venue_id=$1 AND UPPER(code)=UPPER($2) AND status='active' AND NOW() BETWEEN starts_at AND ends_at LIMIT 1`, [venueId, code]);
  const row = result.rows[0];
  if (!row) return null;
  const insert = await dbQuery<any>(`INSERT INTO coupon_redemptions(id,campaign_id,customer_key) VALUES($1,$2,$3) ON CONFLICT(campaign_id,customer_key) DO NOTHING RETURNING id`, [nanoid(), row.id, normalizedKey]);
  if (!insert.rows[0]) throw new Error("Este cupom já foi utilizado por este cliente.");
  return { reward: row.reward };
}
export async function addFeedback(venueId: string, guestSessionId: string, score: number, comment: string): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`feedback:${venueId}:${guestSessionId}`]);
    const existing = await client.query<any>(`SELECT id FROM feedback WHERE venue_id=$1 AND guest_session_id=$2 ORDER BY created_at DESC LIMIT 1`, [venueId, guestSessionId]);
    if (existing.rows[0]) await client.query(`UPDATE feedback SET score=$2,comment=$3,created_at=NOW() WHERE id=$1`, [existing.rows[0].id, score, comment]);
    else await client.query(`INSERT INTO feedback(id,venue_id,guest_session_id,score,comment) VALUES($1,$2,$3,$4,$5)`, [nanoid(), venueId, guestSessionId, score, comment]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
export async function loyaltyCheckin(venueId: string, customerKey: string, displayName: string): Promise<LoyaltyAccount> {
  const normalizedKey = normalizeCustomerKey(customerKey);
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`${venueId}:${normalizedKey}`]);
    const account = await client.query<any>(`INSERT INTO loyalty_accounts(id,venue_id,customer_key,display_name) VALUES($1,$2,$3,$4)
      ON CONFLICT(venue_id,customer_key) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING *`, [nanoid(), venueId, normalizedKey, displayName]);
    const row = account.rows[0];
    const today = await client.query<any>(`SELECT 1 FROM loyalty_transactions WHERE account_id=$1 AND reason='checkin' AND created_at::date=CURRENT_DATE`, [row.id]);
    if (!today.rows[0]) {
      await client.query(`INSERT INTO loyalty_transactions(id,account_id,points,reason) VALUES($1,$2,10,'checkin')`, [nanoid(), row.id]);
      await client.query(`UPDATE loyalty_accounts SET points=points+10,level=CASE WHEN points+10>=500 THEN 'ambassador' WHEN points+10>=200 THEN 'vip' WHEN points+10>=50 THEN 'frequent' ELSE 'visitor' END,updated_at=NOW() WHERE id=$1`, [row.id]);
    }
    const updated = await client.query<any>(`SELECT * FROM loyalty_accounts WHERE id=$1`, [row.id]);
    await client.query("COMMIT");
    return loyaltyRow(updated.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
export async function createMedia(input: { venueId: string; guestSessionId: string; guestName: string; imageUrl: string; storageKey: string; caption: string; scanEngine: string; scanDetails: string }): Promise<MediaPost> {
  const id = nanoid();
  await dbQuery(`INSERT INTO media_posts(id,venue_id,guest_session_id,guest_name,image_url,storage_key,caption,scan_status,scan_engine,scan_details,scanned_at) VALUES($1,$2,$3,$4,$5,$6,$7,'clean',$8,$9,NOW())`, [id, input.venueId, input.guestSessionId, input.guestName, input.imageUrl, input.storageKey, input.caption, input.scanEngine, input.scanDetails]);
  const result = await dbQuery<any>(`SELECT * FROM media_posts WHERE id=$1`, [id]);
  return mediaRow(result.rows[0]);
}
export async function setMediaStatus(id: string, venueId: string, status: string): Promise<{ storageKey: string }> {
  const allowedFrom: Record<string, string[]> = { approved: ["pending"], rejected: ["pending", "approved"] };
  const previous = allowedFrom[status];
  if (!previous) throw new Error("Transição de mídia inválida.");
  const result = await dbQuery<any>(`UPDATE media_posts SET status=$3 WHERE id=$1 AND venue_id=$2 AND status=ANY($4::text[]) RETURNING storage_key`, [id, venueId, status, previous]);
  if (!result.rows[0]) throw new Error("Mídia não encontrada ou mudança de status não permitida.");
  return { storageKey: result.rows[0].storage_key };
}
export async function clearMediaStorage(id: string, venueId: string): Promise<void> {
  await dbQuery(`UPDATE media_posts SET image_url='',storage_key='' WHERE id=$1 AND venue_id=$2 AND status='rejected'`, [id, venueId]);
}
export async function addAnnouncement(venueId: string, input: { title: string; body: string; kind: string }): Promise<string> {
  const id = nanoid();
  await dbQuery(`INSERT INTO announcements(id,venue_id,title,body,kind) VALUES($1,$2,$3,$4,$5)`, [id, venueId, input.title, input.body, input.kind]);
  return id;
}

export async function createVenue(organizationId: string, input: { name: string; city: string; description: string }): Promise<Venue> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await assertCanAddVenue(client, organizationId);
    const id = nanoid();
    let slug = normalizeSlug(input.name);
    if (!slug) slug = `estabelecimento-${nanoid(6).toLowerCase()}`;
    if ((await client.query<any>(`SELECT 1 FROM venues WHERE slug=$1`, [slug])).rows[0]) slug = `${slug}-${nanoid(5).toLowerCase()}`;
    const modules = ["music", "service", "orders", "polls", "quiz", "events", "loyalty", "campaigns", "media", "feedback", "signage", "analytics"];
    await client.query(`INSERT INTO venues(id,organization_id,name,slug,city,description,theme,modules) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)`,
      [id, organizationId, input.name, slug, input.city, input.description, JSON.stringify({ primary: "#7c3aed", accent: "#22d3ee", surface: "#10172a" }), JSON.stringify(modules)]);
    await client.query(`INSERT INTO playback_state(venue_id,state,volume) VALUES($1,'idle',70)`, [id]);
    await client.query("COMMIT");
    return (await venueById(id))!;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
export async function updateVenue(organizationId: string, venueId: string, input: { name?: string | undefined; city?: string | undefined; description?: string | undefined; modules?: VenueModule[] | undefined; theme?: Record<string,string> | undefined }): Promise<Venue> {
  const current = await dbQuery<any>(`SELECT * FROM venues WHERE id=$1 AND organization_id=$2 LIMIT 1`, [venueId, organizationId]);
  if (!current.rows[0]) throw new Error("Estabelecimento não encontrado.");
  const row = current.rows[0];
  const theme = { ...json<Record<string,string>>(row.theme, {}), ...(input.theme ?? {}) };
  const result = await dbQuery<any>(`UPDATE venues SET name=$3,city=$4,description=$5,is_active=$6,modules=$7::jsonb,theme=$8::jsonb WHERE id=$1 AND organization_id=$2 RETURNING *`,
    [venueId, organizationId, input.name ?? row.name, input.city ?? row.city, input.description ?? row.description, row.is_active, JSON.stringify(input.modules ?? json(row.modules, [])), JSON.stringify(theme)]);
  return venueRow(result.rows[0]);
}
export async function createZone(venueId: string, input: { name: string; code: string; capacity: number }): Promise<Zone> {
  const code = normalizeZoneCode(input.code);
  if (code.length < 2) throw new Error("Informe um código de área válido.");
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await assertCanAddZone(client, venueId);
    const id = nanoid();
    await client.query(`INSERT INTO zones(id,venue_id,name,code,capacity) VALUES($1,$2,$3,$4,$5)`, [id, venueId, input.name, code, input.capacity]);
    const result = await client.query<any>(`SELECT * FROM zones WHERE id=$1`, [id]);
    await client.query("COMMIT");
    return zoneRow(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
export async function updateZone(venueId: string, zoneId: string, input: { name?: string | undefined; code?: string | undefined; capacity?: number | undefined; isActive?: boolean | undefined }): Promise<Zone> {
  const current = await dbQuery<any>(`SELECT * FROM zones WHERE id=$1 AND venue_id=$2 LIMIT 1`, [zoneId, venueId]);
  if (!current.rows[0]) throw new Error("Área não encontrada.");
  const row = current.rows[0];
  const code = input.code === undefined ? row.code : normalizeZoneCode(input.code);
  if (code.length < 2) throw new Error("Informe um código de área válido.");
  const result = await dbQuery<any>(`UPDATE zones SET name=$3,code=$4,capacity=$5,is_active=$6 WHERE id=$1 AND venue_id=$2 RETURNING *`,
    [zoneId, venueId, input.name ?? row.name, code, input.capacity ?? row.capacity, input.isActive ?? row.is_active]);
  return zoneRow(result.rows[0]);
}
export function makeVenueSlug(value: string): string { return normalizeSlug(value); }
