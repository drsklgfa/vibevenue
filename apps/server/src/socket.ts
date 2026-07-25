import type { Server, Socket } from "socket.io";
import { playbackInputSchema } from "@vibevenue/contracts";
import { authenticateAdminToken, authenticateGuestToken } from "./auth.js";
import { adminTokenFromHeaders } from "./cookies.js";
import { organizationVenue, publicSnapshotById, publicSnapshotBySlug, requireVenueModule, setPlayback } from "./platform.js";

type Ack = (payload: { ok: boolean; message?: string; data?: unknown }) => void;
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Erro inesperado.";
export function configureSocket(io: Server): void {
  io.on("connection", (socket: Socket) => {
    socket.on("venue:watch", async (input: { slug?: string; venueId?: string }, ack: Ack) => {
      try {
        const snapshot = input.venueId ? await publicSnapshotById(input.venueId) : input.slug ? await publicSnapshotBySlug(input.slug) : null;
        if (!snapshot) throw new Error("Estabelecimento não encontrado ou indisponível.");
        await socket.join(`venue:${snapshot.venue.id}`);
        ack({ ok: true, data: { venueId: snapshot.venue.id } });
      } catch (error) { ack({ ok: false, message: errorMessage(error) }); }
    });
    socket.on("guest:watch", async (input: { token: string }, ack: Ack) => {
      try {
        const guest = await authenticateGuestToken(input.token);
        if (!guest) throw new Error("Sessão expirada.");
        await socket.join(`venue:${guest.venueId}`);
        ack({ ok: true, data: guest });
      } catch (error) { ack({ ok: false, message: errorMessage(error) }); }
    });
    socket.on("admin:watch", async (input: { venueId: string }, ack: Ack) => {
      try {
        const token = adminTokenFromHeaders(socket.request.headers);
        const admin = token ? await authenticateAdminToken(token) : null;
        if (!admin) throw new Error("Sessão inválida.");
        const venue = await organizationVenue(admin.organizationId, input.venueId);
        if (!venue) throw new Error("Acesso negado.");
        await socket.join(`venue:${venue.id}`);
        ack({ ok: true, data: admin });
      } catch (error) { ack({ ok: false, message: errorMessage(error) }); }
    });
    socket.on("playback:control", async (input: { venueId: string; state: "idle" | "playing" | "paused"; currentTime: number; volume: number; itemId?: string | null; videoId?: string | null }, ack: Ack) => {
      try {
        const token = adminTokenFromHeaders(socket.request.headers);
        const admin = token ? await authenticateAdminToken(token) : null;
        if (!admin) throw new Error("Sessão inválida.");
        if (!["owner", "manager", "operator", "moderator"].includes(admin.role)) throw new Error("Seu perfil não permite controlar a reprodução.");
        const venue = await organizationVenue(admin.organizationId, input.venueId);
        if (!venue) throw new Error("Acesso negado.");
        await requireVenueModule(venue.id, "music");
        const state = await setPlayback(venue.id, playbackInputSchema.parse(input));
        io.to(`venue:${venue.id}`).emit("playback:update", state);
        io.to(`venue:${venue.id}`).emit("venue:update", { venueId: venue.id, kind: "playback:changed", at: new Date().toISOString() });
        ack({ ok: true, data: state });
      } catch (error) { ack({ ok: false, message: errorMessage(error) }); }
    });
  });
}
