export type TabType = 
  | 'dashboard'
  | 'seerr'
  | 'radarr'
  | 'sonarr'
  | 'plex'
  | 'qbittorrent'
  | 'settings';

export interface ServiceConfig {
  url: string;
  apiKey: string;
  enabled: boolean;
}

export interface QBittorrentConfig {
  url: string;
  username: string;
  apiKey: string; // password/cookie
  enabled: boolean;
}

export interface ArrSettings {
  demoMode: boolean;
  seerr: ServiceConfig;
  radarr: ServiceConfig;
  sonarr: ServiceConfig;
  plex: ServiceConfig;
  qbittorrent: QBittorrentConfig;
}

export type HealthState = 'online' | 'degraded' | 'offline' | 'testing';

export interface ServiceHealth {
  id: string;
  name: string;
  type: 'seerr' | 'radarr' | 'sonarr' | 'plex' | 'qbittorrent';
  status: HealthState;
  latencyMs: number;
  version?: string;
  url: string;
  message?: string;
}

export interface ParsedMediaLink {
  title: string;
  year?: number;
  type: 'movie' | 'tv';
  imdbId?: string;
  tmdbId?: number;
  rawUrl: string;
  posterUrl?: string;
  overview?: string;
  rating?: number;
  genres?: string[];
  directorOrCreator?: string;
}

export interface DiscoverMediaItem {
  id: number;
  tmdbId: number;
  imdbId: string;
  title: string;
  type: 'movie' | 'tv';
  year: number;
  rating: number;
  genres: string[];
  posterUrl: string;
  backdropUrl?: string;
  overview: string;
  directorOrCreator?: string;
  trendingRank?: number;
  popularityScore?: number;
}

export interface SeerrRequest {
  id: number;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'PROCESSING' | 'AVAILABLE';
  media: {
    tmdbId: number;
    imdbId?: string;
    mediaType: 'movie' | 'tv';
    title: string;
    posterPath: string;
    backdropPath?: string;
    releaseDate: string;
    overview: string;
    voteAverage?: number;
  };
  requestedBy: {
    id: number;
    username: string;
    avatar?: string;
  };
  createdAt: string;
  is4k: boolean;
  seasonsRequested?: number[];
  serverStatus?: string;
}

export interface RadarrMovie {
  id: number;
  title: string;
  year: number;
  tmdbId: number;
  imdbId?: string;
  posterUrl: string;
  backdropUrl?: string;
  overview: string;
  hasFile: boolean;
  monitored: boolean;
  sizeOnDiskBytes: number;
  qualityProfile: string;
  genres: string[];
  ratings: {
    imdb?: number;
    rottenTomatoes?: number;
  };
  status: 'downloaded' | 'downloading' | 'missing' | 'unreleased';
  runtime: number; // in minutes
  releaseDate: string;
}

export interface SonarrSeries {
  id: number;
  title: string;
  year: number;
  tvdbId: number;
  imdbId?: string;
  posterUrl: string;
  backdropUrl?: string;
  overview: string;
  status: 'continuing' | 'ended';
  network: string;
  seasonCount: number;
  episodeCount: number;
  episodeFileCount: number;
  totalSizeOnDiskBytes: number;
  monitored: boolean;
  qualityProfile: string;
  nextAiring?: string;
  genres: string[];
  ratings: number;
}

export interface PlexSession {
  id: string;
  user: {
    name: string;
    avatar: string;
  };
  title: string;
  grandparentTitle?: string; // Series title if TV
  parentTitle?: string; // Season title if TV
  type: 'movie' | 'episode';
  posterUrl: string;
  progressPercent: number;
  viewOffsetMs: number;
  durationMs: number;
  player: {
    title: string;
    platform: string;
    state: 'playing' | 'paused' | 'buffering';
    ip: string;
  };
  transcode: {
    videoDecision: 'direct play' | 'transcode' | 'copy';
    audioDecision: 'direct play' | 'transcode' | 'copy';
    videoCodec?: string;
    audioCodec?: string;
    bitrateKbps: number;
  };
}

export interface PlexRecentItem {
  id: string;
  title: string;
  type: 'movie' | 'episode';
  seriesTitle?: string;
  year?: number;
  posterUrl: string;
  addedAt: string;
}

export interface PlexStats {
  totalMovies: number;
  totalSeries: number;
  totalEpisodes: number;
  storageUsedBytes: number;
  bandwidthMbps: number;
}

export interface TorrentItem {
  hash: string;
  name: string;
  sizeBytes: number;
  progress: number; // 0 to 1
  dlspeedBps: number; // download speed
  upspeedBps: number; // upload speed
  etaSeconds: number;
  state: 'downloading' | 'seeding' | 'paused' | 'queued' | 'checking';
  category: 'radarr' | 'sonarr' | 'other';
  ratio: number;
  seeds: number;
  peers: number;
  savePath: string;
}

export interface QBittorrentStats {
  dlRateBps: number;
  upRateBps: number;
  dledSessionBytes: number;
  upedSessionBytes: number;
  freeSpaceOnDiskBytes: number;
  activeCount: number;
  pausedCount: number;
}
