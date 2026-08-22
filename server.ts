import { GoogleGenAI, Type } from "@google/genai";
import express, { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { createServer as createViteServer } from "vite";
import {
  emptyPlexStats,
  emptyQbtStats,
  initialHealth,
  initialSettings,
} from "./src/data/defaults";
import {
  ArrSettings,
  DiscoverMediaItem,
  ParsedMediaLink,
  PlexRecentItem,
  PlexSession,
  QBittorrentStats,
  RadarrMovie,
  SeerrRequest,
  ServiceHealth,
  SonarrSeries,
  TorrentItem,
} from "./src/types";
import {
  getAppSettings,
  saveAppSettings,
  getDatabaseDiagnostics,
  hasAdminUser,
  setupInitialAdmin,
  loginUser,
  validateSession,
  logoutSession,
} from "./src/server/database";

const app = express();
const PORT = 3000;

app.set("trust proxy", 1);
app.use(express.json());
app.use(cookieParser());

const isProd = process.env.NODE_ENV === "production";
const SESSION_COOKIE_NAME = "mediastack_session";
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isProd,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// Strict fail-closed CORS middleware with credentials support
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  const appUrl = process.env.APP_URL;

  let isAllowed = false;
  let allowedOrigin = "";

  if (appUrl && origin) {
    // Exact origin match when APP_URL is configured
    if (origin === appUrl || origin === appUrl.replace(/\/$/, "")) {
      isAllowed = true;
      allowedOrigin = origin;
    }
  } else if (!isProd && origin) {
    // In local development, permit request origin for localhost / dev previews
    isAllowed = true;
    allowedOrigin = origin;
  }

  if (isAllowed && allowedOrigin) {
    res.header("Access-Control-Allow-Origin", allowedOrigin);
    res.header("Access-Control-Allow-Credentials", "true");
  }

  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Api-Key"
  );

  if (req.method === "OPTIONS") {
    if (origin && !isAllowed) {
      res.status(403).json({ error: "CORS origin forbidden" });
      return;
    }
    res.sendStatus(204);
    return;
  }
  next();
});

// ------------------- AUTHENTICATION ROUTES -------------------

// GET /api/auth/status
app.get("/api/auth/status", async (req: Request, res: Response) => {
  try {
    const hasAdmin = await hasAdminUser();
    const token = req.cookies[SESSION_COOKIE_NAME];
    const sessionRes = await validateSession(token);

    res.json({
      success: true,
      needsSetup: !hasAdmin,
      authenticated: sessionRes.valid,
      user: sessionRes.user || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to check auth status" });
  }
});

// POST /api/auth/setup
app.post("/api/auth/setup", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const result = await setupInitialAdmin(username, password);
    if (!result.success || !result.token) {
      res.status(400).json({ error: result.error || "Failed to set up admin user" });
      return;
    }

    res.cookie(SESSION_COOKIE_NAME, result.token, COOKIE_OPTIONS);
    res.json({
      success: true,
      message: "Admin account configured successfully",
      user: { username: username.trim(), role: "admin" },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Setup failed" });
  }
});

// POST /api/auth/login
app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const result = await loginUser(username, password);
    if (!result.success || !result.token) {
      res.status(401).json({ error: result.error || "Invalid username or password" });
      return;
    }

    res.cookie(SESSION_COOKIE_NAME, result.token, COOKIE_OPTIONS);
    res.json({
      success: true,
      message: "Logged in successfully",
      user: { username: username.trim(), role: "admin" },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Login failed" });
  }
});

// POST /api/auth/logout
app.post("/api/auth/logout", async (req: Request, res: Response) => {
  try {
    const token = req.cookies[SESSION_COOKIE_NAME];
    if (token) {
      await logoutSession(token);
    }
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
    });
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Logout failed" });
  }
});

// Auth Guard Middleware: Gates all other /api/* routes except /api/health and /api/auth/*
app.use("/api", async (req: Request, res: Response, next: NextFunction) => {
  // Allow health endpoint to remain publicly accessible for status checks
  if (req.path === "/health" || req.path.startsWith("/auth/")) {
    return next();
  }

  const token = req.cookies[SESSION_COOKIE_NAME];
  const validation = await validateSession(token);

  if (!validation.valid) {
    res.status(401).json({
      error: "Unauthorized: Valid session cookie required",
      authenticated: false,
    });
    return;
  }

  (req as any).user = validation.user;
  next();
});

// Initialize Gemini AI Client lazily if key exists
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// ------------------- API ROUTES -------------------

// 0. Settings & Database Persistence (SQLite)
app.get("/api/settings", async (_req: Request, res: Response) => {
  try {
    const settings = await getAppSettings();
    res.json({ success: true, data: settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to load settings from SQLite" });
  }
});

app.post("/api/settings", async (req: Request, res: Response) => {
  try {
    const newSettings = req.body;
    const saved = await saveAppSettings(newSettings);
    res.json({
      success: true,
      message: "Settings saved to SQLite database successfully",
      data: saved,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to save settings to SQLite" });
  }
});

app.get("/api/db/diagnostics", async (_req: Request, res: Response) => {
  try {
    const diag = await getDatabaseDiagnostics();
    res.json({ success: true, data: diag });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get database diagnostics" });
  }
});

// Helper to safely call external APIs with timeout
async function safeFetch(url: string, options: any = {}, timeoutMs = 7000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return res;
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

// In-memory qBittorrent SID cache per URL
let qbtSidCookie: string | null = null;
let qbtLastUrl: string | null = null;

async function getQBittorrentHeaders(qbtConfig: any): Promise<Record<string, string>> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const cleanUrl = (qbtConfig.url || "").replace(/\/+$/, "");

  if (qbtConfig.apiKey && !qbtConfig.username) {
    headers["Cookie"] = `SID=${qbtConfig.apiKey}`;
    return headers;
  }

  if (qbtConfig.username && qbtConfig.apiKey) {
    if (qbtSidCookie && qbtLastUrl === cleanUrl) {
      headers["Cookie"] = qbtSidCookie;
      return headers;
    }

    try {
      const loginParams = new URLSearchParams();
      loginParams.append("username", qbtConfig.username);
      loginParams.append("password", qbtConfig.apiKey);

      const loginRes = await safeFetch(
        `${cleanUrl}/api/v2/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: loginParams.toString(),
        },
        4000
      );

      if (loginRes.ok) {
        const rawCookies = loginRes.headers.get("set-cookie");
        if (rawCookies) {
          const match = rawCookies.match(/SID=([^;]+)/);
          if (match) {
            qbtSidCookie = `SID=${match[1]}`;
            qbtLastUrl = cleanUrl;
            headers["Cookie"] = qbtSidCookie;
          }
        }
      }
    } catch (_e) {
      console.warn("Could not authenticate with qBittorrent Web UI");
    }
  }

  return headers;
}

// 1. Health check & Live Stack Diagnostics
app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    const settings = await getAppSettings();

    const checkService = async (
      id: string,
      name: string,
      type: "seerr" | "radarr" | "sonarr" | "plex" | "qbittorrent",
      cfg: any
    ): Promise<ServiceHealth> => {
      if (!cfg.enabled || !cfg.url) {
        return {
          id,
          name,
          type,
          status: "offline",
          latencyMs: 0,
          url: cfg.url || "Not configured",
          message: "Service not configured or disabled in settings",
        };
      }

      const start = Date.now();
      const cleanUrl = cfg.url.replace(/\/+$/, "");
      try {
        let testPath = "/api/v1/status";
        const headers: Record<string, string> = { Accept: "application/json" };

        if (type === "radarr" || type === "sonarr") {
          testPath = "/api/v3/system/status";
          headers["X-Api-Key"] = cfg.apiKey;
        } else if (type === "seerr") {
          testPath = "/api/v1/status";
          headers["X-Api-Key"] = cfg.apiKey;
        } else if (type === "plex") {
          testPath = "/identity";
          headers["X-Plex-Token"] = cfg.apiKey;
        } else if (type === "qbittorrent") {
          testPath = "/api/v2/app/version";
        }

        const resp = await safeFetch(`${cleanUrl}${testPath}`, { headers }, 3500);
        const latency = Date.now() - start;

        if (resp.ok) {
          let version = "Online";
          try {
            const data = await resp.json();
            version = data.version || data.MediaContainer?.version || "Connected";
          } catch (_e) {
            try {
              version = await resp.text();
            } catch (_e2) {}
          }
          return {
            id,
            name,
            type,
            status: "online",
            latencyMs: latency,
            version: String(version).slice(0, 30),
            url: cfg.url,
            message: `Operating normally (${latency}ms)`,
          };
        } else {
          return {
            id,
            name,
            type,
            status: "degraded",
            latencyMs: latency,
            url: cfg.url,
            message: `HTTP ${resp.status}: ${resp.statusText}`,
          };
        }
      } catch (err: any) {
        return {
          id,
          name,
          type,
          status: "offline",
          latencyMs: Date.now() - start,
          url: cfg.url,
          message: err.message || "Connection refused / timeout",
        };
      }
    };

    const healthResults = await Promise.all([
      checkService("seerr", "Overseerr / Jellyseerr", "seerr", settings.seerr),
      checkService("radarr", "Radarr", "radarr", settings.radarr),
      checkService("sonarr", "Sonarr", "sonarr", settings.sonarr),
      checkService("plex", "Plex Media Server", "plex", settings.plex),
      checkService("qbittorrent", "qBittorrent", "qbittorrent", settings.qbittorrent),
    ]);

    res.json({
      status: "ok",
      data: healthResults,
    });
  } catch (_err: any) {
    res.json({ status: "ok", data: initialHealth });
  }
});

// 2. Parse IMDb / TMDB / Shared Media Links
app.post("/api/parse-link", async (req: Request, res: Response) => {
  try {
    const { urlOrText } = req.body;
    if (!urlOrText || typeof urlOrText !== "string") {
      res.status(400).json({ error: "urlOrText is required" });
      return;
    }

    const trimmed = urlOrText.trim();

    // Check for IMDb ID match in string (e.g. tt15239678)
    const imdbMatch = trimmed.match(/tt\d{7,10}/i);
    const imdbId = imdbMatch ? imdbMatch[0].toLowerCase() : null;

    // Attempt Gemini AI Parsing if GEMINI_API_KEY is available
    const ai = getGeminiClient();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Analyze the following movie/TV link or text input and extract metadata for requesting in Seerr.
Input: "${trimmed}"
If it is an IMDb or TMDB URL, extract title, year, media type ("movie" or "tv"), IMDb ID (e.g. "tt1234567"), estimated TMDB ID, brief plot overview, IMDb rating (0-10 scale), and genres.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                year: { type: Type.NUMBER },
                type: { type: Type.STRING, description: "must be either 'movie' or 'tv'" },
                imdbId: { type: Type.STRING },
                tmdbId: { type: Type.NUMBER },
                overview: { type: Type.STRING },
                rating: { type: Type.NUMBER },
                genres: { type: Type.ARRAY, items: { type: Type.STRING } },
                directorOrCreator: { type: Type.STRING },
              },
              required: ["title", "type"],
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          const parsedResult: ParsedMediaLink = {
            title: parsed.title || "Unknown Media",
            year: parsed.year || new Date().getFullYear(),
            type: parsed.type === "tv" ? "tv" : "movie",
            imdbId: parsed.imdbId || imdbId || `tt${Math.floor(1000000 + Math.random() * 9000000)}`,
            tmdbId: parsed.tmdbId || Math.floor(100000 + Math.random() * 900000),
            rawUrl: trimmed,
            posterUrl:
              parsed.type === "tv"
                ? "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop"
                : "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop",
            overview: parsed.overview || "Parsed media from shared link. Ready for Seerr request.",
            rating: parsed.rating || 8.0,
            genres: parsed.genres && parsed.genres.length > 0 ? parsed.genres : ["Drama", "Action"],
            directorOrCreator: parsed.directorOrCreator,
          };

          res.json({ success: true, data: parsedResult, source: "gemini" });
          return;
        }
      } catch (aiErr) {
        console.warn("Gemini parse failed, falling back to smart heuristic:", aiErr);
      }
    }

    // Fallback heuristic if no AI or AI fails
    const isTv = /season|series|tv|show|episodes|s\d+e\d+/i.test(trimmed);
    const cleanTitle = trimmed
      .replace(/https?:\/\/[^\s]+/g, "")
      .replace(/tt\d{7,10}/gi, "")
      .replace(/[\/\-_]/g, " ")
      .trim() || "Shared Media Title";

    const fallbackResult: ParsedMediaLink = {
      title: cleanTitle.length > 0 ? cleanTitle : "Shared Media",
      year: 2024,
      type: isTv ? "tv" : "movie",
      imdbId: imdbId || `tt${Math.floor(1000000 + Math.random() * 9000000)}`,
      tmdbId: Math.floor(100000 + Math.random() * 900000),
      rawUrl: trimmed,
      posterUrl: isTv
        ? "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop"
        : "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop",
      overview: "Media item detected from shared link. Submitting request via Seerr gateway.",
      rating: 8.2,
      genres: isTv ? ["TV Series", "Drama"] : ["Movie", "Cinema"],
    };

    res.json({ success: true, data: fallbackResult, source: "fallback" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to parse link" });
  }
});

// 3. Seerr Requests Proxy / Handler
app.get("/api/seerr/discover", async (_req: Request, res: Response) => {
  try {
    const settings = await getAppSettings();
    if (settings.seerr.enabled && settings.seerr.url && settings.seerr.apiKey) {
      const cleanUrl = settings.seerr.url.replace(/\/+$/, "");
      const resp = await safeFetch(`${cleanUrl}/api/v1/discover/trending`, {
        headers: {
          "X-Api-Key": settings.seerr.apiKey,
          Accept: "application/json",
        },
      });

      if (resp.ok) {
        const raw = await resp.json();
        const results = raw.results || (Array.isArray(raw) ? raw : []);
        const mapped: DiscoverMediaItem[] = results.map((item: any, idx: number) => {
          const isTv = item.mediaType === "tv" || item.type === "tv";
          const posterPath = item.posterPath || item.poster_path;
          const backdropPath = item.backdropPath || item.backdrop_path;
          return {
            id: item.id,
            tmdbId: item.id,
            title: item.title || item.name || "Media Title",
            year: String(item.releaseDate || item.firstAirDate || "2024").slice(0, 4),
            type: isTv ? "tv" : "movie",
            posterUrl: posterPath
              ? (posterPath.startsWith("http") ? posterPath : `https://image.tmdb.org/t/p/w500${posterPath}`)
              : "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop",
            backdropUrl: backdropPath
              ? (backdropPath.startsWith("http") ? backdropPath : `https://image.tmdb.org/t/p/original${backdropPath}`)
              : undefined,
            overview: item.overview || "",
            rating: Number(Number(item.voteAverage || item.vote_average || 8.0).toFixed(1)),
            genres: [],
            trendingRank: idx + 1,
            status: item.mediaInfo ? (item.mediaInfo.status === 5 ? "available" : item.mediaInfo.status === 4 ? "processing" : item.mediaInfo.status === 2 ? "approved" : item.mediaInfo.status === 3 ? "declined" : "requested") : "not_requested",
          };
        });

        return res.json({ success: true, data: mapped, isLive: true });
      }
    }
  } catch (err) {
    console.warn("Live Seerr discover failed:", err);
  }

  res.json({ success: true, data: [], isLive: false });
});

app.get("/api/seerr/requests", async (_req: Request, res: Response) => {
  try {
    const settings = await getAppSettings();
    if (settings.seerr.enabled && settings.seerr.url && settings.seerr.apiKey) {
      const cleanUrl = settings.seerr.url.replace(/\/+$/, "");
      const response = await safeFetch(`${cleanUrl}/api/v1/request?take=50&filter=all&sort=added`, {
        headers: {
          "X-Api-Key": settings.seerr.apiKey,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const raw = await response.json();
        const results = raw.results || (Array.isArray(raw) ? raw : []);
        const mapped: SeerrRequest[] = results.map((item: any) => {
          const media = item.media || {};
          const isTv = item.type === "tv" || media.mediaType === "tv";
          const statusMap: Record<number, "PENDING" | "APPROVED" | "DECLINED" | "PROCESSING" | "AVAILABLE"> = {
            1: "PENDING",
            2: "APPROVED",
            3: "DECLINED",
            4: "PROCESSING",
            5: "AVAILABLE",
          };

          const posterPath = media.posterPath || (item.media && item.media.posterPath);
          const posterUrl = posterPath
            ? (posterPath.startsWith("http") ? posterPath : `https://image.tmdb.org/t/p/w500${posterPath}`)
            : "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop";

          const currentStatus = statusMap[item.status] || "PENDING";
          let serverStatus = "Request queued in Seerr";
          if (currentStatus === "APPROVED") serverStatus = isTv ? "Seerr approved -> Sent to Sonarr" : "Seerr approved -> Sent to Radarr";
          if (currentStatus === "AVAILABLE") serverStatus = "Media downloaded & available in Library";
          if (currentStatus === "DECLINED") serverStatus = "Request declined by Administrator";

          return {
            id: item.id,
            status: currentStatus,
            media: {
              tmdbId: media.tmdbId || item.media?.tmdbId || item.id,
              imdbId: media.imdbId,
              mediaType: isTv ? "tv" : "movie",
              title: item.title || (isTv ? media.name : media.title) || (item.media ? (item.media.title || item.media.name) : `Request #${item.id}`),
              posterPath: posterUrl,
              releaseDate: media.releaseDate || media.firstAirDate || `${item.year || 2024}-01-01`,
              overview: media.overview || item.overview || "Requested via Overseerr/Jellyseerr.",
              voteAverage: media.voteAverage || 8.0,
            },
            requestedBy: {
              id: item.requestedBy?.id || 1,
              username: item.requestedBy?.displayName || item.requestedBy?.email || "User",
              avatar: item.requestedBy?.avatar,
            },
            createdAt: item.createdAt || new Date().toISOString(),
            is4k: Boolean(item.is4k),
            seasonsRequested: item.seasons?.map((s: any) => s.seasonNumber),
            serverStatus,
          };
        });

        return res.json({ success: true, data: mapped, isLive: true });
      }
    }
  } catch (err) {
    console.warn("Live Seerr fetch failed:", err);
  }

  res.json({ success: true, data: [], isLive: false });
});

app.post("/api/seerr/request", async (req: Request, res: Response) => {
  const { media, is4k, seasonsRequested } = req.body;

  if (!media || !media.title) {
    res.status(400).json({ error: "Invalid media payload for Seerr request" });
    return;
  }

  try {
    const settings = await getAppSettings();
    if (settings.seerr.enabled && settings.seerr.url && settings.seerr.apiKey) {
      const cleanUrl = settings.seerr.url.replace(/\/+$/, "");
      const isTv = media.type === "tv" || media.mediaType === "tv";

      const payload: any = {
        mediaType: isTv ? "tv" : "movie",
        mediaId: media.tmdbId || 0,
        is4k: !!is4k,
      };

      if (isTv && seasonsRequested && Array.isArray(seasonsRequested)) {
        payload.seasons = seasonsRequested;
      }

      const response = await safeFetch(`${cleanUrl}/api/v1/request`, {
        method: "POST",
        headers: {
          "X-Api-Key": settings.seerr.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const created = await response.json();
        return res.json({
          success: true,
          message: "Request successfully created in Overseerr / Jellyseerr!",
          data: created,
          isLive: true,
        });
      } else {
        const errBody = await response.text();
        return res.status(response.status).json({
          error: `Overseerr returned HTTP ${response.status}: ${errBody}`,
        });
      }
    }
  } catch (err: any) {
    console.warn("Live Seerr request failed:", err);
    return res.status(500).json({ error: err.message || "Failed to submit request to Overseerr" });
  }

  res.status(400).json({
    error: "Overseerr / Jellyseerr URL and API Key must be configured in Settings to submit requests.",
  });
});

// Update Seerr request status (Approve / Decline)
app.patch("/api/seerr/requests/:id", async (req: Request, res: Response) => {
  const reqId = parseInt(req.params.id, 10);
  const { status } = req.body;

  try {
    const settings = await getAppSettings();
    if (settings.seerr.enabled && settings.seerr.url && settings.seerr.apiKey) {
      const cleanUrl = settings.seerr.url.replace(/\/+$/, "");
      const action = status === "APPROVED" ? "approve" : (status === "DECLINED" ? "decline" : null);

      if (action) {
        const response = await safeFetch(`${cleanUrl}/api/v1/request/${reqId}/${action}`, {
          method: "POST",
          headers: { "X-Api-Key": settings.seerr.apiKey },
        });

        if (response.ok) {
          const data = await response.json();
          return res.json({ success: true, data, isLive: true });
        } else {
          return res.status(response.status).json({ error: `Failed to ${action} request in Overseerr` });
        }
      }
    }
  } catch (err: any) {
    console.warn("Live Seerr status patch failed:", err);
    return res.status(500).json({ error: err.message || "Failed to update request status in Overseerr" });
  }

  res.status(400).json({ error: "Overseerr instance not connected" });
});

// 4. Radarr Movies Proxy
app.get("/api/radarr/movies", async (_req: Request, res: Response) => {
  try {
    const settings = await getAppSettings();
    if (settings.radarr.enabled && settings.radarr.url && settings.radarr.apiKey) {
      const cleanUrl = settings.radarr.url.replace(/\/+$/, "");
      const response = await safeFetch(`${cleanUrl}/api/v3/movie`, {
        headers: {
          "X-Api-Key": settings.radarr.apiKey,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const rawList = await response.json();
        const mapped: RadarrMovie[] = (Array.isArray(rawList) ? rawList : []).map((m: any) => {
          const posterObj = m.images?.find((img: any) => img.coverType === "poster");
          let posterUrl = posterObj ? (posterObj.remoteUrl || posterObj.url) : null;
          if (posterUrl && posterUrl.startsWith("/") && !posterUrl.startsWith("http")) {
            posterUrl = `${cleanUrl}${posterUrl}?apikey=${settings.radarr.apiKey}`;
          }
          if (!posterUrl) {
            posterUrl = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=60";
          }

          let displayStatus: "downloaded" | "downloading" | "missing" | "unreleased" = "missing";
          if (m.hasFile) displayStatus = "downloaded";
          else if (m.isAvailable) displayStatus = "missing";
          else displayStatus = "unreleased";

          return {
            id: m.id,
            title: m.title,
            year: m.year,
            tmdbId: m.tmdbId,
            imdbId: m.imdbId,
            posterUrl,
            backdropUrl: m.images?.find((img: any) => img.coverType === "fanart")?.remoteUrl,
            overview: m.overview || "",
            hasFile: Boolean(m.hasFile),
            monitored: Boolean(m.monitored),
            sizeOnDiskBytes: m.sizeOnDisk || (m.movieFile ? m.movieFile.size : 0),
            qualityProfile: m.qualityProfile?.name || (m.qualityProfileId ? `Profile #${m.qualityProfileId}` : "HD - 1080p"),
            genres: m.genres || [],
            ratings: {
              imdb: m.ratings?.imdb?.value,
              rottenTomatoes: m.ratings?.rottenTomatoes?.value,
            },
            status: displayStatus,
            runtime: m.runtime || 120,
            releaseDate: m.digitalRelease || m.physicalRelease || m.inCinemas || `${m.year || 2024}-01-01`,
          };
        });

        return res.json({ success: true, data: mapped, isLive: true });
      }
    }
  } catch (err) {
    console.warn("Live Radarr fetch failed:", err);
  }

  res.json({ success: true, data: [], isLive: false });
});

app.patch("/api/radarr/movies/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const { qualityProfile, monitored } = req.body;

  try {
    const settings = await getAppSettings();
    if (settings.radarr.enabled && settings.radarr.url && settings.radarr.apiKey) {
      const cleanUrl = settings.radarr.url.replace(/\/+$/, "");
      const getResp = await safeFetch(`${cleanUrl}/api/v3/movie/${id}`, {
        headers: { "X-Api-Key": settings.radarr.apiKey },
      });

      if (getResp.ok) {
        const movieData = await getResp.json();
        if (monitored !== undefined) movieData.monitored = monitored;

        const updateResp = await safeFetch(`${cleanUrl}/api/v3/movie/${id}`, {
          method: "PUT",
          headers: {
            "X-Api-Key": settings.radarr.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(movieData),
        });

        if (updateResp.ok) {
          const updated = await updateResp.json();
          return res.json({ success: true, data: updated, isLive: true });
        }
      }
    }
  } catch (err: any) {
    console.warn("Live Radarr patch failed:", err);
    return res.status(500).json({ error: err.message || "Failed to update movie in Radarr" });
  }

  res.status(400).json({ error: "Radarr instance not connected" });
});

app.delete("/api/radarr/movies/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const deleteFiles = req.query.deleteFiles === "true";

  try {
    const settings = await getAppSettings();
    if (settings.radarr.enabled && settings.radarr.url && settings.radarr.apiKey) {
      const cleanUrl = settings.radarr.url.replace(/\/+$/, "");
      const deleteResp = await safeFetch(
        `${cleanUrl}/api/v3/movie/${id}?deleteFiles=${deleteFiles}&addImportExclusion=false`,
        {
          method: "DELETE",
          headers: { "X-Api-Key": settings.radarr.apiKey },
        }
      );

      if (deleteResp.ok) {
        return res.json({
          success: true,
          message: deleteFiles
            ? "Movie and files deleted from disk successfully"
            : "Movie removed from Radarr (files kept on disk)",
          isLive: true,
        });
      }
    }
  } catch (err: any) {
    console.warn("Live Radarr delete failed:", err);
    return res.status(500).json({ error: err.message || "Failed to delete movie in Radarr" });
  }

  res.status(400).json({ error: "Radarr instance not connected" });
});

// 5. Sonarr Series Proxy
app.get("/api/sonarr/series", async (_req: Request, res: Response) => {
  try {
    const settings = await getAppSettings();
    if (settings.sonarr.enabled && settings.sonarr.url && settings.sonarr.apiKey) {
      const cleanUrl = settings.sonarr.url.replace(/\/+$/, "");
      const response = await safeFetch(`${cleanUrl}/api/v3/series`, {
        headers: {
          "X-Api-Key": settings.sonarr.apiKey,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const rawList = await response.json();
        const mapped: SonarrSeries[] = (Array.isArray(rawList) ? rawList : []).map((s: any) => {
          const posterObj = s.images?.find((img: any) => img.coverType === "poster");
          let posterUrl = posterObj ? (posterObj.remoteUrl || posterObj.url) : null;
          if (posterUrl && posterUrl.startsWith("/") && !posterUrl.startsWith("http")) {
            posterUrl = `${cleanUrl}${posterUrl}?apikey=${settings.sonarr.apiKey}`;
          }
          if (!posterUrl) {
            posterUrl = "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=500&auto=format&fit=crop&q=60";
          }

          const stats = s.statistics || {};

          return {
            id: s.id,
            title: s.title,
            year: s.year,
            tvdbId: s.tvdbId,
            imdbId: s.imdbId,
            posterUrl,
            backdropUrl: s.images?.find((img: any) => img.coverType === "fanart")?.remoteUrl,
            overview: s.overview || "",
            status: s.status === "continuing" ? "continuing" : "ended",
            network: s.network || "Unknown",
            seasonCount: stats.seasonCount || s.seasons?.length || 1,
            episodeCount: stats.totalEpisodeCount || 0,
            episodeFileCount: stats.episodeFileCount || 0,
            totalSizeOnDiskBytes: stats.sizeOnDisk || 0,
            monitored: Boolean(s.monitored),
            qualityProfile: s.qualityProfile?.name || (s.qualityProfileId ? `Profile #${s.qualityProfileId}` : "HD - 1080p"),
            genres: s.genres || [],
            ratings: s.ratings?.value || 8.0,
          };
        });

        return res.json({ success: true, data: mapped, isLive: true });
      }
    }
  } catch (err) {
    console.warn("Live Sonarr fetch failed:", err);
  }

  res.json({ success: true, data: [], isLive: false });
});

app.patch("/api/sonarr/series/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const { monitored } = req.body;

  try {
    const settings = await getAppSettings();
    if (settings.sonarr.enabled && settings.sonarr.url && settings.sonarr.apiKey) {
      const cleanUrl = settings.sonarr.url.replace(/\/+$/, "");
      const getResp = await safeFetch(`${cleanUrl}/api/v3/series/${id}`, {
        headers: { "X-Api-Key": settings.sonarr.apiKey },
      });

      if (getResp.ok) {
        const seriesData = await getResp.json();
        if (monitored !== undefined) seriesData.monitored = monitored;

        const updateResp = await safeFetch(`${cleanUrl}/api/v3/series/${id}`, {
          method: "PUT",
          headers: {
            "X-Api-Key": settings.sonarr.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(seriesData),
        });

        if (updateResp.ok) {
          const updated = await updateResp.json();
          return res.json({ success: true, data: updated, isLive: true });
        }
      }
    }
  } catch (err: any) {
    console.warn("Live Sonarr patch failed:", err);
    return res.status(500).json({ error: err.message || "Failed to update series in Sonarr" });
  }

  res.status(400).json({ error: "Sonarr instance not connected" });
});

app.delete("/api/sonarr/series/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const deleteFiles = req.query.deleteFiles === "true";

  try {
    const settings = await getAppSettings();
    if (settings.sonarr.enabled && settings.sonarr.url && settings.sonarr.apiKey) {
      const cleanUrl = settings.sonarr.url.replace(/\/+$/, "");
      const deleteResp = await safeFetch(
        `${cleanUrl}/api/v3/series/${id}?deleteFiles=${deleteFiles}`,
        {
          method: "DELETE",
          headers: { "X-Api-Key": settings.sonarr.apiKey },
        }
      );

      if (deleteResp.ok) {
        return res.json({
          success: true,
          message: deleteFiles
            ? "Series and all episode files deleted from disk successfully"
            : "Series removed from Sonarr (files kept on disk)",
          isLive: true,
        });
      }
    }
  } catch (err: any) {
    console.warn("Live Sonarr delete failed:", err);
    return res.status(500).json({ error: err.message || "Failed to delete series in Sonarr" });
  }

  res.status(400).json({ error: "Sonarr instance not connected" });
});

// 6. Plex Sessions & Stats Proxy
app.get("/api/plex/status", async (_req: Request, res: Response) => {
  try {
    const settings = await getAppSettings();
    if (settings.plex.enabled && settings.plex.url && settings.plex.apiKey) {
      const cleanUrl = settings.plex.url.replace(/\/+$/, "");

      const [sessionsResp, recentResp] = await Promise.all([
        safeFetch(`${cleanUrl}/status/sessions`, {
          headers: {
            "X-Plex-Token": settings.plex.apiKey,
            Accept: "application/json",
          },
        }),
        safeFetch(`${cleanUrl}/library/recentlyAdded?X-Plex-Container-Start=0&X-Plex-Container-Size=10`, {
          headers: {
            "X-Plex-Token": settings.plex.apiKey,
            Accept: "application/json",
          },
        }),
      ]);

      if (sessionsResp.ok) {
        const rawSessions = await sessionsResp.json();
        const metadata = rawSessions.MediaContainer?.Metadata || [];
        const sessions: PlexSession[] = metadata.map((item: any) => {
          const isEpisode = item.type === "episode";
          const viewOffset = item.viewOffset || 0;
          const duration = item.duration || 1;
          const progressPercent = Math.min(100, Math.round((viewOffset / duration) * 100));

          const player = item.Player || {};
          const session = item.Session || {};
          const user = item.User?.title || item.User?.name || "Plex User";
          const transcodeSession = item.TranscodeSession || {};

          let thumbUrl = item.thumb || item.parentThumb || item.grandparentThumb;
          if (thumbUrl && !thumbUrl.startsWith("http")) {
            thumbUrl = `${cleanUrl}${thumbUrl}?X-Plex-Token=${settings.plex.apiKey}`;
          }

          return {
            id: item.sessionKey || item.ratingKey || String(Math.random()),
            user: {
              name: user,
              avatar: item.User?.thumb || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop",
            },
            title: isEpisode ? (item.title || `Episode ${item.index}`) : item.title,
            grandparentTitle: isEpisode ? item.grandparentTitle : undefined,
            parentTitle: isEpisode ? item.parentTitle : undefined,
            type: isEpisode ? "episode" : "movie",
            posterUrl: thumbUrl || "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&auto=format&fit=crop&q=60",
            progressPercent,
            viewOffsetMs: viewOffset,
            durationMs: duration,
            player: {
              title: player.title || player.product || "Plex Client",
              platform: player.platform || player.device || "Smart Device",
              state: player.state || "playing",
              ip: player.address || player.remotePublicAddress || "192.168.1.50",
            },
            transcode: {
              videoDecision: transcodeSession.videoDecision || "direct play",
              audioDecision: transcodeSession.audioDecision || "direct play",
              bitrateKbps: session.bandwidth || 15000,
            },
          };
        });

        let recentlyAdded: PlexRecentItem[] = [];
        if (recentResp.ok) {
          const rawRecent = await recentResp.json();
          const recentsMetadata = rawRecent.MediaContainer?.Metadata || [];
          recentlyAdded = recentsMetadata.slice(0, 10).map((r: any) => {
            let thumbUrl = r.thumb || r.parentThumb;
            if (thumbUrl && !thumbUrl.startsWith("http")) {
              thumbUrl = `${cleanUrl}${thumbUrl}?X-Plex-Token=${settings.plex.apiKey}`;
            }
            return {
              id: r.ratingKey || String(r.id),
              title: r.title,
              type: r.type === "episode" ? "episode" : "movie",
              seriesTitle: r.grandparentTitle || r.parentTitle,
              year: r.year,
              posterUrl: thumbUrl || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop",
              addedAt: r.addedAt ? new Date(r.addedAt * 1000).toISOString() : new Date().toISOString(),
            };
          });
        }

        return res.json({
          success: true,
          data: {
            sessions,
            recentlyAdded,
            stats: {
              totalMovies: 0,
              totalSeries: 0,
              totalEpisodes: 0,
              storageUsedBytes: 0,
              bandwidthMbps: 0,
            },
          },
          isLive: true,
        });
      }
    }
  } catch (err) {
    console.warn("Live Plex fetch failed:", err);
  }

  res.json({
    success: true,
    data: {
      sessions: [],
      recentlyAdded: [],
      stats: emptyPlexStats,
    },
    isLive: false,
  });
});

// 7. qBittorrent Proxy
app.get("/api/qbittorrent/torrents", async (_req: Request, res: Response) => {
  try {
    const settings = await getAppSettings();
    if (settings.qbittorrent.enabled && settings.qbittorrent.url) {
      const cleanUrl = settings.qbittorrent.url.replace(/\/+$/, "");
      const headers = await getQBittorrentHeaders(settings.qbittorrent);

      const [torrentsResp, transferResp] = await Promise.all([
        safeFetch(`${cleanUrl}/api/v2/torrents/info`, { headers }),
        safeFetch(`${cleanUrl}/api/v2/transfer/info`, { headers }),
      ]);

      if (torrentsResp.ok) {
        const rawTorrents = await torrentsResp.json();
        const torrents: TorrentItem[] = (Array.isArray(rawTorrents) ? rawTorrents : []).map((t: any) => {
          const stateStr = (t.state || "").toLowerCase();
          let state: "downloading" | "seeding" | "paused" | "queued" | "checking" = "downloading";
          if (stateStr.includes("pause")) state = "paused";
          else if (stateStr.includes("upload") || stateStr.includes("seed")) state = "seeding";
          else if (stateStr.includes("check")) state = "checking";
          else if (stateStr.includes("queue")) state = "queued";

          return {
            hash: t.hash,
            name: t.name,
            sizeBytes: t.size || t.total_size || 0,
            progress: t.progress || 0,
            dlspeedBps: t.dlspeed || 0,
            upspeedBps: t.upspeed || 0,
            etaSeconds: t.eta || 0,
            state,
            category: (t.category || "other").toLowerCase() as any,
            ratio: Number(Number(t.ratio || 0).toFixed(2)),
            seeds: t.num_seeds || 0,
            peers: t.num_leechs || 0,
            savePath: t.save_path || "/downloads",
          };
        });

        let stats: QBittorrentStats = emptyQbtStats;
        if (transferResp.ok) {
          const tf = await transferResp.json();
          stats = {
            dlRateBps: tf.dl_info_speed || 0,
            upRateBps: tf.up_info_speed || 0,
            dledSessionBytes: tf.dl_info_data || 0,
            upedSessionBytes: tf.up_info_data || 0,
            freeSpaceOnDiskBytes: tf.free_space_on_disk || 0,
            activeCount: torrents.filter((t) => t.state !== "paused").length,
            pausedCount: torrents.filter((t) => t.state === "paused").length,
          };
        }

        return res.json({
          success: true,
          data: {
            torrents,
            stats,
          },
          isLive: true,
        });
      }
    }
  } catch (err) {
    console.warn("Live qBittorrent fetch failed:", err);
  }

  res.json({
    success: true,
    data: {
      torrents: [],
      stats: emptyQbtStats,
    },
    isLive: false,
  });
});

app.post("/api/qbittorrent/torrents/:hash/toggle", async (req: Request, res: Response) => {
  const hash = req.params.hash;

  try {
    const settings = await getAppSettings();
    if (settings.qbittorrent.enabled && settings.qbittorrent.url) {
      const cleanUrl = settings.qbittorrent.url.replace(/\/+$/, "");
      const headers = await getQBittorrentHeaders(settings.qbittorrent);

      const torrentsResp = await safeFetch(`${cleanUrl}/api/v2/torrents/info?hashes=${hash}`, { headers });
      if (torrentsResp.ok) {
        const info = await torrentsResp.json();
        const current = info[0];
        const isPaused = current && (current.state || "").toLowerCase().includes("pause");
        const actionEndpoint = isPaused ? "resume" : "pause";

        await safeFetch(`${cleanUrl}/api/v2/torrents/${actionEndpoint}?hashes=${hash}`, {
          method: "POST",
          headers,
        });

        return res.json({ success: true, isLive: true });
      }
    }
  } catch (err: any) {
    console.warn("Live qBittorrent toggle failed:", err);
    return res.status(500).json({ error: err.message || "Failed to toggle torrent in qBittorrent" });
  }

  res.status(400).json({ error: "qBittorrent instance not connected" });
});

app.delete("/api/qbittorrent/torrents/:hash", async (req: Request, res: Response) => {
  const hash = req.params.hash;
  const deleteData = req.query.deleteData === "true";

  try {
    const settings = await getAppSettings();
    if (settings.qbittorrent.enabled && settings.qbittorrent.url) {
      const cleanUrl = settings.qbittorrent.url.replace(/\/+$/, "");
      const headers = await getQBittorrentHeaders(settings.qbittorrent);

      const resp = await safeFetch(`${cleanUrl}/api/v2/torrents/delete?hashes=${hash}&deleteFiles=${deleteData}`, {
        method: "POST",
        headers,
      });

      if (resp.ok) {
        return res.json({
          success: true,
          message: deleteData
            ? "Torrent and downloaded files removed from disk successfully"
            : "Torrent removed from client (files kept on disk)",
          deleteData,
          isLive: true,
        });
      }
    }
  } catch (err: any) {
    console.warn("Live qBittorrent delete failed:", err);
    return res.status(500).json({ error: err.message || "Failed to delete torrent in qBittorrent" });
  }

  res.status(400).json({ error: "qBittorrent instance not connected" });
});

// 8. Service Connection Test Ping
app.post("/api/test-connection", async (req: Request, res: Response) => {
  const { service, url, apiKey } = req.body;
  
  if (!url) {
    res.status(400).json({ error: "URL is required" });
    return;
  }

  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    
    let testPath = "/api/v1/status";
    const headers: Record<string, string> = { Accept: "application/json" };

    if (service === "radarr" || service === "sonarr") {
      testPath = "/api/v3/system/status";
      headers["X-Api-Key"] = apiKey || "";
    } else if (service === "seerr") {
      testPath = "/api/v1/status";
      headers["X-Api-Key"] = apiKey || "";
    } else if (service === "plex") {
      testPath = "/identity";
      headers["X-Plex-Token"] = apiKey || "";
    } else if (service === "qbittorrent") {
      testPath = "/api/v2/app/version";
    }

    const pingUrl = url.replace(/\/+$/, "") + testPath;
    
    const resp = await fetch(pingUrl, {
      signal: controller.signal,
      headers,
    });

    clearTimeout(timeout);
    const latency = Date.now() - startTime;

    if (resp.ok) {
      res.json({
        success: true,
        service,
        status: "online",
        latencyMs: latency,
        message: `Connected successfully to live ${service.toUpperCase()} instance (${resp.status} OK)`,
      });
    } else {
      res.json({
        success: false,
        service,
        status: "degraded",
        latencyMs: latency,
        message: `HTTP ${resp.status}: ${resp.statusText} from ${service}`,
      });
    }
  } catch (err: any) {
    const latency = Date.now() - startTime;
    res.json({
      success: false,
      service,
      status: "offline",
      latencyMs: latency,
      message: err.message || `Failed to connect to ${service}`,
    });
  }
});

// ------------------- VITE / SERVING -------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ArrSuite Hub server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
