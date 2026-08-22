import { ArrSettings, PlexStats, QBittorrentStats, ServiceHealth } from '../types';

export const initialSettings: ArrSettings = {
  demoMode: false,
  seerr: {
    url: 'http://localhost:5055',
    apiKey: '',
    enabled: true,
  },
  radarr: {
    url: 'http://localhost:7878',
    apiKey: '',
    enabled: true,
  },
  sonarr: {
    url: 'http://localhost:8989',
    apiKey: '',
    enabled: true,
  },
  plex: {
    url: 'http://localhost:32400',
    apiKey: '',
    enabled: true,
  },
  qbittorrent: {
    url: 'http://localhost:8080',
    username: 'admin',
    apiKey: 'adminadmin',
    enabled: true,
  },
};

export const initialHealth: ServiceHealth[] = [
  {
    id: 'seerr',
    name: 'Overseerr / Jellyseerr',
    type: 'seerr',
    status: 'testing',
    latencyMs: 0,
    url: 'http://localhost:5055',
  },
  {
    id: 'radarr',
    name: 'Radarr (Movies)',
    type: 'radarr',
    status: 'testing',
    latencyMs: 0,
    url: 'http://localhost:7878',
  },
  {
    id: 'sonarr',
    name: 'Sonarr (TV)',
    type: 'sonarr',
    status: 'testing',
    latencyMs: 0,
    url: 'http://localhost:8989',
  },
  {
    id: 'plex',
    name: 'Plex Media Server',
    type: 'plex',
    status: 'testing',
    latencyMs: 0,
    url: 'http://localhost:32400',
  },
  {
    id: 'qbittorrent',
    name: 'qBittorrent',
    type: 'qbittorrent',
    status: 'testing',
    latencyMs: 0,
    url: 'http://localhost:8080',
  },
];

export const emptyQbtStats: QBittorrentStats = {
  dlRateBps: 0,
  upRateBps: 0,
  dledSessionBytes: 0,
  upedSessionBytes: 0,
  freeSpaceOnDiskBytes: 0,
  activeCount: 0,
  pausedCount: 0,
};

export const emptyPlexStats: PlexStats = {
  totalMovies: 0,
  totalSeries: 0,
  totalEpisodes: 0,
  storageUsedBytes: 0,
  bandwidthMbps: 0,
};
