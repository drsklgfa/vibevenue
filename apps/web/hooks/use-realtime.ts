"use client";
import { useEffect } from "react";
import { io } from "socket.io-client";
import { API_URL } from "@/lib/api";

export function useRealtime(input: {
  venueId?: string | undefined;
  slug?: string | undefined;
  admin?: boolean | undefined;
  guestToken?: string | undefined;
  onUpdate: () => void;
  onPlayback?: ((value: unknown) => void) | undefined;
}) {
  const { venueId, slug, admin, guestToken, onUpdate, onPlayback } = input;

  useEffect(() => {
    if (!venueId && !slug) return;

    const socket = io(API_URL, {
      transports: ["websocket"],
      forceNew: true,
      withCredentials: true
    });

    socket.on("connect", () => {
      if (admin && venueId) {
        socket.emit("admin:watch", { venueId }, () => undefined);
      } else if (guestToken) {
        socket.emit("guest:watch", { token: guestToken }, () => undefined);
      } else {
        socket.emit("venue:watch", { venueId, slug }, () => undefined);
      }
    });

    socket.on("venue:update", onUpdate);
    socket.on("playback:update", (value) => onPlayback?.(value));

    return () => {
      socket.disconnect();
    };
  }, [venueId, slug, admin, guestToken, onUpdate, onPlayback]);
}
