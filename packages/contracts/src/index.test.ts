import { describe, expect, it } from "vitest";
import {
  auditLogQuerySchema,
  billingInvoiceStatusSchema,
  extractYouTubeVideoId,
  normalizeSlug,
  normalizeZoneCode,
  campaignRedeemInputSchema,
  eventInputSchema,
  playbackInputSchema,
  reservationInputSchema,
  moduleSchema,
  notificationQuerySchema,
  orderInputSchema,
  organizationSettingsSchema,
  organizationStatusSchema,
  planCodeSchema,
  quizInputSchema,
  strongPasswordSchema,
  teamMemberInputSchema,
  teamMemberUpdateSchema,
  venueUpdateSchema,
  zoneUpdateSchema,
  guestJoinInputSchema,
  platformClientCreateSchema,
  platformClientStatusSchema,
  platformInvoiceCreateSchema,
  platformInvoiceSettleSchema,
  platformPasswordResetSchema
} from "./index.js";

describe("contracts helpers", () => {
  it("normalizes slugs and zone codes", () => {
    expect(normalizeSlug("Espaço Aurora - Centro")).toBe("espaco-aurora-centro");
    expect(normalizeZoneCode("mesa 01!")).toBe("MESA01");
  });
  it("extracts YouTube ids", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("https://example.com/video")).toBeNull();
    expect(extractYouTubeVideoId("https://notyoutube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(extractYouTubeVideoId("ftp://youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });
  it("validates transactional order inputs", () => {
    expect(orderInputSchema.parse({ note: "sem observação", items: [{ itemId: "item-1", quantity: 2 }] }).items[0]?.quantity).toBe(2);
    expect(() => orderInputSchema.parse({ items: [] })).toThrow();
  });
  it("validates active modules and chronological ranges", () => {
    expect(moduleSchema.parse("orders")).toBe("orders");
    expect(eventInputSchema.parse({ title: "Evento", description: "", startsAt: "2026-08-01T20:00:00.000Z", endsAt: "2026-08-01T22:00:00.000Z", capacity: 50 }).capacity).toBe(50);
    expect(() => eventInputSchema.parse({ title: "Evento", description: "", startsAt: "2026-08-01T22:00:00.000Z", endsAt: "2026-08-01T20:00:00.000Z", capacity: 50 })).toThrow();
  });

  it("validates customer identity, reservation and playback payloads", () => {
    expect(campaignRedeemInputSchema.parse({ code: "AURORA10", customerKey: "cliente@exemplo.com" }).customerKey).toBe("cliente@exemplo.com");
    expect(() => campaignRedeemInputSchema.parse({ code: "AURORA10", customerKey: "x" })).toThrow();
    expect(reservationInputSchema.parse({ contact: "(16) 99999-0000", partySize: 4 }).partySize).toBe(4);
    expect(() => reservationInputSchema.parse({ contact: "x", partySize: 21 })).toThrow();
    expect(playbackInputSchema.parse({ state: "playing", currentTime: 10, volume: 70, videoId: "dQw4w9WgXcQ" }).state).toBe("playing");
    expect(() => playbackInputSchema.parse({ state: "playing", currentTime: -1, volume: 101 })).toThrow();
  });

  it("requires a viable live quiz", () => {
    expect(quizInputSchema.parse({ title: "Quiz", prompt: "Pergunta?", options: ["A", "B"], correctIndex: 1 }).correctIndex).toBe(1);
    expect(() => quizInputSchema.parse({ title: "Q", prompt: "?", options: ["A"], correctIndex: 0 })).toThrow();
  });
  it("accepts only known organization statuses", () => {
    expect(organizationStatusSchema.parse("active")).toBe("active");
    expect(() => organizationStatusSchema.parse("blocked")).toThrow();
  });
  it("enforces a commercially safe password baseline", () => {
    expect(strongPasswordSchema.parse("SenhaForte123")).toBe("SenhaForte123");
    expect(() => strongPasswordSchema.parse("senhafraca")).toThrow();
  });

  it("validates billing and audit pagination contracts", () => {
    expect(billingInvoiceStatusSchema.parse("overdue")).toBe("overdue");
    expect(() => billingInvoiceStatusSchema.parse("processing")).toThrow();
    expect(auditLogQuerySchema.parse({ limit: "20", beforeId: "99" })).toEqual({ limit: 20, beforeId: 99 });
    expect(() => auditLogQuerySchema.parse({ limit: 1000 })).toThrow();
  });
  it("validates team creation and meaningful updates", () => {
    expect(teamMemberInputSchema.parse({ name: "Ana Silva", email: "ana@empresa.com", password: "SenhaForte123", role: "operator" }).role).toBe("operator");
    expect(teamMemberUpdateSchema.parse({ active: false }).active).toBe(false);
    expect(() => teamMemberUpdateSchema.parse({})).toThrow();
  });
  it("validates plans, legal settings and consent versions", () => {
    expect(planCodeSchema.parse("network")).toBe("network");
    expect(() => planCodeSchema.parse("unlimited-free")).toThrow();
    expect(organizationSettingsSchema.parse({ name: "Empresa", billingEmail: "financeiro@empresa.com", requireGuestConsent: true, privacyPolicyUrl: "https://empresa.com/privacidade", termsUrl: "https://empresa.com/termos", privacyVersion: "2.0", termsVersion: "1.0" }).privacyVersion).toBe("2.0");
    expect(() => organizationSettingsSchema.parse({ name: "Empresa", billingEmail: "financeiro@empresa.com", requireGuestConsent: true, privacyPolicyUrl: "https://empresa.com/privacidade", termsUrl: "", privacyVersion: "2.0", termsVersion: "1.0" })).toThrow();
    expect(() => organizationSettingsSchema.parse({ name: "Empresa", billingEmail: "financeiro@empresa.com", requireGuestConsent: true, privacyPolicyUrl: "http://empresa.com/privacidade", termsUrl: "https://empresa.com/termos", privacyVersion: "2.0", termsVersion: "1.0" })).toThrow();
    expect(guestJoinInputSchema.parse({ venueSlug: "empresa", zoneCode: "MESA1", nickname: "Ana", acceptedPrivacy: true, acceptedTerms: true, privacyVersion: "2.0", termsVersion: "1.0" }).acceptedTerms).toBe(true);
  });
  it("validates self-service venue, zone and notification inputs", () => {
    expect(venueUpdateSchema.parse({ modules: ["music", "orders"] }).modules).toEqual(["music", "orders"]);
    expect(zoneUpdateSchema.parse({ isActive: false }).isActive).toBe(false);
    expect(notificationQuerySchema.parse({ unreadOnly: "true", limit: "10" })).toEqual({ unreadOnly: true, limit: 10 });
    expect(notificationQuerySchema.parse({ unreadOnly: "false", limit: "10" })).toEqual({ unreadOnly: false, limit: 10 });
    expect(() => notificationQuerySchema.parse({ unreadOnly: "talvez", limit: "10" })).toThrow();
    expect(() => venueUpdateSchema.parse({})).toThrow();
  });
  it("validates platform client and billing operations", () => {
    const client = platformClientCreateSchema.parse({ company: "Restaurante Aurora", ownerName: "Ana Silva", ownerEmail: "ana@aurora.com", billingEmail: "financeiro@aurora.com", venueName: "Aurora Centro", city: "Franca/SP", description: "", plan: "pro", monthlyPriceCents: 49900, trialDays: 14, maxVenues: null, maxUsers: null, maxZonesPerVenue: null, requireGuestConsent: false, privacyPolicyUrl: "", termsUrl: "", privacyVersion: "1.0", termsVersion: "1.0" });
    expect(client.plan).toBe("pro");
    expect(platformClientStatusSchema.parse({ status: "trial", trialDays: 7, accessDays: 0 }).trialDays).toBe(7);
    expect(() => platformClientStatusSchema.parse({ status: "trial", trialDays: 0, accessDays: 0 })).toThrow();
    expect(platformInvoiceCreateSchema.parse({ organizationId: "org_1", reference: "2026-08", amountCents: 49900, dueAt: "2026-08-10T12:00:00.000Z", periodStart: null, periodEnd: null, notes: "" }).amountCents).toBe(49900);
    expect(platformInvoiceSettleSchema.parse({ status: "paid", paymentMethod: "pix", externalReference: "tx_1", notes: "" }).status).toBe("paid");
    expect(platformPasswordResetSchema.parse({ email: "ana@aurora.com" }).email).toBe("ana@aurora.com");
  });

});
