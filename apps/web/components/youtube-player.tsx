"use client";
import { useEffect, useRef, useState } from "react";
import type { PlaybackState } from "@vibevenue/contracts";

interface YouTubeVideoData {
  video_id?: string;
}

interface YouTubePlayerInstance {
  destroy?: () => void;
  getCurrentTime?: () => number;
  getVideoData?: () => YouTubeVideoData;
  loadVideoById?: (input: { videoId: string; startSeconds?: number }) => void;
  pauseVideo?: () => void;
  playVideo?: () => unknown;
  seekTo?: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume?: (volume: number) => void;
  stopVideo?: () => void;
}

interface YouTubePlayerOptions {
  height: string;
  width: string;
  videoId?: string | undefined;
  playerVars: {
    playsinline: number;
    controls: number;
    rel: number;
    origin: string;
  };
  events: {
    onAutoplayBlocked: () => void;
  };
}

interface YouTubeNamespace {
  Player: new (element: HTMLElement, options: YouTubePlayerOptions) => YouTubePlayerInstance;
}

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export function YouTubePlayer({ playback, className = "" }: { playback: PlaybackState; className?: string }) {
  const host = useRef<HTMLDivElement | null>(null);
  const player = useRef<YouTubePlayerInstance | null>(null);
  const initialVideoId = useRef(playback.videoId);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    function create() {
      const youtube = window.YT;
      if (!host.current || player.current || !youtube?.Player) return;
      player.current = new youtube.Player(host.current, {
        height: "100%",
        width: "100%",
        videoId: initialVideoId.current ?? undefined,
        playerVars: { playsinline: 1, controls: 1, rel: 0, origin: window.location.origin },
        events: { onAutoplayBlocked: () => setBlocked(true) }
      });
    }

    if (window.YT?.Player) {
      create();
    } else {
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
      }
      const previous = window.onYouTubeIframeAPIReady;
      const ready = () => {
        previous?.();
        create();
      };
      window.onYouTubeIframeAPIReady = ready;

      return () => {
        if (window.onYouTubeIframeAPIReady === ready) {
          if (previous) window.onYouTubeIframeAPIReady = previous;
          else delete window.onYouTubeIframeAPIReady;
        }
        player.current?.destroy?.();
        player.current = null;
      };
    }

    return () => {
      player.current?.destroy?.();
      player.current = null;
    };
  }, []);

  useEffect(() => {
    const currentPlayer = player.current;
    if (!currentPlayer || !playback.videoId) return;
    try {
      if (currentPlayer.getVideoData?.().video_id !== playback.videoId) {
        currentPlayer.loadVideoById?.({ videoId: playback.videoId, startSeconds: playback.currentTime });
      }
      currentPlayer.setVolume?.(playback.volume);
      const currentTime = Number(currentPlayer.getCurrentTime?.() ?? 0);
      if (Math.abs(currentTime - playback.currentTime) > 5) {
        currentPlayer.seekTo?.(playback.currentTime, true);
      }
      if (playback.state === "playing") {
        void currentPlayer.playVideo?.();
      } else if (playback.state === "paused") {
        currentPlayer.pauseVideo?.();
      } else {
        currentPlayer.stopVideo?.();
      }
    } catch {
      // The YouTube iframe can be unavailable briefly while it is loading.
    }
  }, [playback]);

  return (
    <div className={`youtube-shell ${className}`}>
      <div ref={host} />
      {blocked && (
        <button
          className="player-activate"
          onClick={() => {
            player.current?.playVideo?.();
            setBlocked(false);
          }}
        >
          Ativar reprodução
        </button>
      )}
      {!playback.videoId && <div className="player-empty">Aguardando o host iniciar uma música</div>}
    </div>
  );
}
