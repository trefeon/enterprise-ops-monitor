import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface MediaItem {
  id: string;
  type: "image" | "video";
  url: string;
  thumbnailUrl?: string;
  filename?: string;
  durationSec: number;
}

interface DisplayPlaylistData {
  ok: boolean;
  data?: {
    screenName: string;
    items: MediaItem[];
  };
  error?: { message: string };
}

type ScreenState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "empty" }
  | { phase: "playing" }
  | { phase: "invalid-token" };

interface DisplayState {
  screen: ScreenState;
  items: MediaItem[];
  currentIndex: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 60_000; // 60s polling
const FADE_DURATION_MS = 500;
const CURSOR_HIDE_MS = 3000;
const API_BASE = "/api";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getApiUrl(screenToken: string): string {
  return `${API_BASE}/display/${encodeURIComponent(screenToken)}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function LiveTVDisplay() {
  // Extract screenToken from URL path
  const screenToken = extractScreenToken();

  const [state, setState] = useState<DisplayState>({
    screen: { phase: "loading" },
    items: [],
    currentIndex: 0,
  });

  const [transitioning, setTransitioning] = useState(false);
  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoCleanupRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  // ── Fetch playlist ─────────────────────────────────────────────────────────

  const fetchPlaylist = useCallback(async () => {
    if (!screenToken) {
      setState((prev) => ({
        ...prev,
        screen: { phase: "invalid-token" },
      }));
      return;
    }

    try {
      const res = await fetch(getApiUrl(screenToken), {
        signal: AbortSignal.timeout(15_000),
      });
      const json: DisplayPlaylistData = await res.json();

      if (!mountedRef.current) return;

      if (!json.ok || !json.data) {
        const msg = json.error?.message || "Failed to load playlist";
        if (res.status === 404) {
          setState((prev) => ({
            ...prev,
            screen: { phase: "invalid-token" },
          }));
        } else {
          setState((prev) => ({
            ...prev,
            screen: { phase: "error", message: msg },
          }));
        }
        return;
      }

      const items = json.data.items;

      if (!items || items.length === 0) {
        setState((prev) => ({
          ...prev,
          items: [],
          screen: { phase: "empty" },
          currentIndex: 0,
        }));
        return;
      }

      setState((prev) => {
        // If we were already playing, keep current index if possible
        const sameCount = prev.items.length === items.length;
        const keepIndex =
          prev.screen.phase === "playing" && sameCount
            ? Math.min(prev.currentIndex, items.length - 1)
            : 0;
        return {
          items,
          currentIndex: keepIndex,
          screen: { phase: "playing" },
        };
      });
    } catch (err) {
      if (!mountedRef.current) return;
      console.error("[LiveTVDisplay] fetch error:", err);
      setState((prev) => ({
        ...prev,
        screen: {
          phase: "error",
          message:
            err instanceof DOMException && err.name === "AbortError"
              ? "Request timed out"
              : "Connection error. Retrying...",
        },
      }));
    }
  }, [screenToken]);

  // ── Initial fetch + poll ──────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    fetchPlaylist();

    pollRef.current = setInterval(() => {
      fetchPlaylist();
    }, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
      if (imageTimerRef.current) clearTimeout(imageTimerRef.current);
      if (videoCleanupRef.current) videoCleanupRef.current();
    };
  }, [fetchPlaylist]);

  // ── Cursor idle hide ─────────────────────────────────────────────────────

  useEffect(() => {
    const showCursor = () => {
      document.body.style.cursor = "";
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);
      cursorTimerRef.current = setTimeout(() => {
        document.body.style.cursor = "none";
      }, CURSOR_HIDE_MS);
    };

    document.addEventListener("mousemove", showCursor);
    document.addEventListener("mousedown", showCursor);
    document.addEventListener("keydown", showCursor);
    showCursor(); // initial kick

    return () => {
      document.removeEventListener("mousemove", showCursor);
      document.removeEventListener("mousedown", showCursor);
      document.removeEventListener("keydown", showCursor);
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);
      document.body.style.cursor = "";
    };
  }, []);

  // ── Fullscreen ───────────────────────────────────────────────────────────

  useEffect(() => {
    const el = document.documentElement;
    const attemptFullscreen = () => {
      if (
        !document.fullscreenElement &&
        el.requestFullscreen
      ) {
        el.requestFullscreen().catch(() => {
          // User gesture may be needed - that's fine
        });
      }
    };
    document.addEventListener("click", attemptFullscreen, { once: true });
    // Also try immediately (works if user gesture already happened)
    attemptFullscreen();
    return () => {
      document.removeEventListener("click", attemptFullscreen);
    };
  }, []);

  // ── Wake Lock API ──────────────────────────────────────────────────────────

  useEffect(() => {
    let wakeLockSentinel: WakeLockSentinel | null = null;

    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockSentinel = await navigator.wakeLock.request("screen");
        }
      } catch (err) {
        // Wake Lock may be denied or unavailable — silently ignore
        console.warn("[LiveTVDisplay] Wake Lock unavailable:", err);
      }
    };

    requestWakeLock();

    // Re-acquire wake lock on visibility change (browser may release it)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !wakeLockSentinel) {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
        wakeLockSentinel = null;
      }
    };
  }, []);

  // ── Navigate to next item ────────────────────────────────────────────────

  const cycleNext = useCallback(() => {
    setState((prev) => {
      if (prev.items.length === 0) return prev;
      const nextIndex = (prev.currentIndex + 1) % prev.items.length;
      return { ...prev, currentIndex: nextIndex };
    });
    setTransitioning(true);
    setTimeout(() => setTransitioning(false), FADE_DURATION_MS);
  }, []);

  // ── Current item ────────────────────────────────────────────────────

  const currentItem: MediaItem | null =
    state.items.length > 0 ? state.items[state.currentIndex] : null;

  const isVideo = currentItem?.type === "video";

  // ── Video lifecycle management ──────────────────────────────────────────

  const handleVideoEnded = useCallback(() => {
    cycleNext();
  }, [cycleNext]);

  const handleVideoError = useCallback(() => {
    console.error("[LiveTVDisplay] Video failed to load, skipping:", currentItem?.url);
    cycleNext();
  }, [cycleNext, currentItem]);

  // Clean up previous video element to prevent memory leaks
  useEffect(() => {
    if (videoCleanupRef.current) {
      videoCleanupRef.current();
      videoCleanupRef.current = null;
    }
  }, [currentItem?.id]);

  // ── Image timer ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!currentItem || currentItem.type !== "image") return;

    const durationMs = Math.max(2000, currentItem.durationSec * 1000);
    imageTimerRef.current = setTimeout(() => {
      cycleNext();
    }, durationMs);

    return () => {
      if (imageTimerRef.current) clearTimeout(imageTimerRef.current);
    };
  }, [currentItem, cycleNext]);

  // ── Preload next image ──────────────────────────────────────────────────

  const nextIndex = currentItem
    ? (state.currentIndex + 1) % state.items.length
    : 0;
  const nextItem = state.items.length > 0 ? state.items[nextIndex] : null;

  // ── Render helpers ──────────────────────────────────────────────────────

  const renderMedia = () => {
    if (!currentItem) return null;

    if (isVideo) {
      return (
        <video
          key={currentItem.id}
          ref={(el) => {
            if (el) {
              videoRef.current = el;
              videoCleanupRef.current = () => {
                el.pause();
                el.removeAttribute("src");
                el.load();
              };
            }
          }}
          src={currentItem.url}
          autoPlay
          muted
          playsInline
          className="h-full w-full object-contain"
          onEnded={handleVideoEnded}
          onError={handleVideoError}
          aria-hidden="true"
        />
      );
    }

    return (
      <img
        key={currentItem.id}
        src={currentItem.url}
        alt={currentItem.filename || "Display content"}
        className="h-full w-full object-contain"
        onError={() => {
          console.error("[LiveTVDisplay] Image failed to load, skipping:", currentItem.url);
          cycleNext();
        }}
        draggable={false}
      />
    );
  };

  // ── Screen states ──────────────────────────────────────────────────────

  if (state.screen.phase === "loading") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white" data-debug-component-root="Live-TV-Display">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <p className="text-sm text-white/60">Connecting to display...</p>
        </div>
      </div>
    );
  }

  if (state.screen.phase === "invalid-token") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white" data-debug-component-root="Live-TV-Display">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
            <svg className="h-8 w-8 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-medium text-white/80">Invalid Display Code</h1>
          <p className="text-sm text-white/40">
            This screen code is not recognised. Please check the code and try again, or contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  if (state.screen.phase === "error") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white" data-debug-component-root="Live-TV-Display">
        <div className="text-center">
          <p className="mb-2 text-sm text-white/60">{state.screen.message}</p>
          <button
            type="button"
            onClick={fetchPlaylist}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/20 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (state.screen.phase === "empty") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white" data-debug-component-root="Live-TV-Display">
        <div className="text-center">
          <p className="text-sm text-white/40">No content scheduled for this screen.</p>
        </div>
      </div>
    );
  }

  // ── Playing state ──────────────────────────────────────────────────────

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black" data-debug-component-root="Live-TV-Display">
      {/* Preload next image for instant transition */}
      {nextItem && nextItem.type === "image" && (
        <link rel="prefetch" href={nextItem.url} as="image" />
      )}

      {/* Media container with fade transition */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-opacity duration-500"
        style={{ opacity: transitioning ? 0 : 1 }}
      >
        {renderMedia()}
      </div>

      {/* Bottom-right indicator (subtle, for debugging) */}
      {state.items.length > 1 && (
        <div className="pointer-events-none absolute bottom-4 right-4 flex gap-1.5">
          {state.items.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                idx === state.currentIndex ? "bg-white/80" : "bg-white/20"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Screen token extraction ─────────────────────────────────────────────────

function extractScreenToken(): string | null {
  if (typeof window === "undefined") return null;
  // Matches the /display/:screenToken route pattern
  const match = window.location.pathname.match(/^\/display\/([^/]+)/);
  return match ? match[1] : null;
}
