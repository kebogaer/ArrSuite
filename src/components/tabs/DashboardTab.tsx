import React, { useEffect, useState } from 'react';
import {
  Film,
  Tv,
  Clapperboard,
  Download,
  Sparkles,
  HardDrive,
  Activity,
  ArrowUpRight,
  CheckCircle,
  Clock,
  ArrowDown,
  ArrowUp,
  Server,
  Layers,
  ChevronRight,
  Plus,
  TrendingUp,
  Star,
  PlayCircle,
  User
} from 'lucide-react';
import {
  DiscoverMediaItem,
  PlexSession,
  QBittorrentStats,
  RadarrMovie,
  SeerrRequest,
  ServiceHealth,
  SonarrSeries,
  TabType,
  TorrentItem
} from '../../types';

interface DashboardTabProps {
  requests: SeerrRequest[];
  movies: RadarrMovie[];
  series: SonarrSeries[];
  sessions: PlexSession[];
  torrents: TorrentItem[];
  qbtStats: QBittorrentStats;
  serviceHealth: ServiceHealth[];
  setActiveTab: (tab: TabType) => void;
  onParseLink: (url: string) => void;
  onApproveRequest: (id: number) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  requests,
  movies,
  series,
  sessions,
  torrents,
  qbtStats,
  serviceHealth,
  setActiveTab,
  onParseLink,
  onApproveRequest,
}) => {
  const [trendingItems, setTrendingItems] = useState<DiscoverMediaItem[]>([]);

  useEffect(() => {
    fetch('/api/seerr/discover')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setTrendingItems(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const totalEpisodes = series.reduce((acc, s) => acc + s.episodeCount, 0);
  const downloadedEpisodes = series.reduce((acc, s) => acc + s.episodeFileCount, 0);
  const totalMovies = movies.length;
  const downloadedMovies = movies.filter((m) => m.hasFile).length;
  const missingItems = movies.filter((m) => m.status === 'missing').length + (totalEpisodes - downloadedEpisodes);
  const availablePct = totalMovies > 0 ? Math.round((downloadedMovies / totalMovies) * 100) : 98;
  const waitingCount = requests.filter((r) => r.status !== 'AVAILABLE' && r.status !== 'DECLINED').length;

  const formatSpeed = (bps: number) => {
    if (bps > 1024 * 1024) return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
    if (bps > 1024) return `${(bps / 1024).toFixed(0)} KB/s`;
    return `${bps} B/s`;
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      {/* Bento Grid Matrix Container */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

        {/* 1. Latest Requests Bento Box (4 columns) */}
        <div className="md:col-span-6 lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Latest Requests
              </h3>
              <button
                onClick={() => setActiveTab('seerr')}
                className="text-xs text-purple-400 hover:underline flex items-center gap-0.5"
              >
                View Seerr <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5">
              {requests.slice(0, 4).map((req) => {
                const isDownloaded = req.status === 'AVAILABLE';
                return (
                  <div key={req.id} className="flex items-center gap-3 p-2 rounded-xl bg-slate-950/40 border border-slate-800/40">
                    <img
                      src={req.media.posterPath}
                      alt={req.media.title}
                      className="h-11 w-8 rounded object-cover bg-slate-800 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-100 truncate">{req.media.title}</p>
                      <p className="text-[11px] text-slate-500 truncate">Requested by {req.requestedBy.username}</p>
                    </div>
                    {isDownloaded ? (
                      <span className="rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20 flex items-center gap-1 flex-shrink-0">
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        Downloaded
                      </span>
                    ) : (
                      <span className="rounded-lg bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20 flex items-center gap-1 flex-shrink-0">
                        <Clock className="w-3 h-3 text-amber-400" />
                        Waiting to fill
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>Seerr Gateway (Auto-Approved)</span>
            <span className="font-mono text-amber-400 font-bold">{waitingCount} Waiting to fill</span>
          </div>
        </div>

        {/* 2. Download Queue Bento Box (4 columns) */}
        <div className="md:col-span-6 lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-400" />
                Download Queue
              </h3>
              <span className="text-xs font-mono font-semibold text-blue-400 flex items-center gap-1">
                <ArrowDown className="w-3 h-3 text-emerald-400" /> {formatSpeed(qbtStats.dlRateBps)}
              </span>
            </div>

            <div className="space-y-4">
              {torrents.slice(0, 2).map((t) => (
                <div key={t.hash} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-mono text-slate-200 truncate max-w-[200px]">{t.name}</span>
                    <span className="text-slate-400 font-mono">{(t.progress * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${t.progress * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>qBittorrent v4.6.3</span>
            <button
              onClick={() => setActiveTab('qbittorrent')}
              className="text-blue-400 hover:underline font-medium text-xs"
            >
              Manage Torrents →
            </button>
          </div>
        </div>

        {/* 3. Library Health Bento Box (4 columns) */}
        <div className="md:col-span-12 lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              Library Health
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <div 
                onClick={() => setActiveTab('sonarr')}
                className="rounded-xl bg-slate-950/50 p-2.5 border border-slate-800/50 hover:border-blue-500/40 cursor-pointer transition-colors"
              >
                <p className="text-xl font-bold text-blue-400 font-mono">{downloadedEpisodes}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold mt-0.5">TV Episodes</p>
              </div>
              <div 
                onClick={() => setActiveTab('radarr')}
                className="rounded-xl bg-slate-950/50 p-2.5 border border-slate-800/50 hover:border-amber-500/40 cursor-pointer transition-colors"
              >
                <p className="text-xl font-bold text-amber-400 font-mono">{downloadedMovies}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold mt-0.5">Movies</p>
              </div>
              <div 
                onClick={() => setActiveTab('radarr')}
                className="rounded-xl bg-slate-950/50 p-2.5 border border-slate-800/50 hover:border-rose-500/40 cursor-pointer transition-colors"
              >
                <p className="text-xl font-bold text-rose-400 font-mono">{missingItems}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold mt-0.5">Missing</p>
              </div>
              <div 
                onClick={() => setActiveTab('plex')}
                className="rounded-xl bg-slate-950/50 p-2.5 border border-slate-800/50 hover:border-green-500/40 cursor-pointer transition-colors"
              >
                <p className="text-xl font-bold text-green-400 font-mono">{availablePct}%</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold mt-0.5">Available</p>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>Arr Monitoring Active</span>
            <span className="text-emerald-400 font-semibold text-[11px]">Synced</span>
          </div>
        </div>

        {/* 4. Trending Movies & TV Shows Section (8 columns) */}
        <div className="md:col-span-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-rose-400" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">
                  Trending Movies & TV Shows
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('seerr')}
                className="text-xs text-purple-400 hover:underline flex items-center gap-1 font-semibold"
              >
                Explore More in Seerr <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {trendingItems.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {trendingItems.slice(0, 4).map((item) => (
                  <div 
                    key={item.id} 
                    className="bg-slate-950/60 border border-slate-800/70 rounded-xl p-2 flex flex-col justify-between hover:border-purple-500/40 transition-all group relative"
                  >
                    <div className="aspect-[2/3] w-full rounded-lg overflow-hidden bg-slate-800 relative mb-2">
                      <img 
                        src={item.posterUrl} 
                        alt={item.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-1.5 left-1.5 bg-slate-950/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-200 border border-slate-800 uppercase">
                        {item.type === 'movie' ? 'Movie' : 'TV'}
                      </div>
                      <div className="absolute bottom-1.5 right-1.5 bg-slate-950/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-400 border border-slate-800 flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        {item.rating}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-100 truncate group-hover:text-purple-300 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">
                        {item.year} {item.genres && item.genres.length > 0 ? `• ${item.genres[0]}` : ''}
                      </p>
                    </div>

                    <button
                      onClick={() => onParseLink(item.imdbId || item.title)}
                      className="mt-2 w-full py-1.5 px-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Request Item
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 px-4 text-center rounded-xl bg-slate-950/40 border border-slate-800/60 flex flex-col items-center justify-center space-y-2">
                <Sparkles className="w-6 h-6 text-slate-600" />
                <p className="text-xs text-slate-300 font-medium">No trending releases loaded yet</p>
                <p className="text-[11px] text-slate-500 max-w-sm">
                  Configure your Overseerr / Jellyseerr URL and API Key in Settings to populate live trending releases, or parse an IMDb link above to submit a new request.
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>Powered by Live Overseerr / Jellyseerr API</span>
            <span className="text-xs text-slate-400 font-mono">{trendingItems.length} Live Items</span>
          </div>
        </div>

        {/* 5. Currently Playing on Plex Box (4 columns) */}
        <div className="md:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Clapperboard className="w-4 h-4 text-yellow-400" />
                Now Playing on Plex
              </h3>
              <span className="text-[10px] font-mono font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                {sessions.length} Active Stream{sessions.length === 1 ? '' : 's'}
              </span>
            </div>

            {sessions.length === 0 ? (
              <div className="py-8 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/40">
                <Clapperboard className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-xs font-semibold text-slate-300">No active streams right now</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Plex server is idle</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div key={session.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-yellow-500/30 transition-all space-y-2">
                    <div className="flex items-start gap-2.5">
                      <img
                        src={session.posterUrl}
                        alt={session.title}
                        className="h-12 w-9 rounded-lg object-cover bg-slate-800 flex-shrink-0 border border-slate-800"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-slate-100 truncate">
                            {session.grandparentTitle || session.title}
                          </span>
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex-shrink-0">
                            {session.player.state}
                          </span>
                        </div>
                        {session.grandparentTitle && (
                          <p className="text-[11px] text-slate-400 truncate leading-tight">{session.title}</p>
                        )}

                        {/* Who is watching */}
                        <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                          {session.user.avatar ? (
                            <img
                              src={session.user.avatar}
                              alt={session.user.name}
                              className="w-4 h-4 rounded-full object-cover flex-shrink-0 ring-1 ring-yellow-400/40"
                            />
                          ) : (
                            <User className="w-3.5 h-3.5 text-yellow-400" />
                          )}
                          <span className="font-semibold text-yellow-300 truncate">{session.user.name}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-slate-400 truncate">{session.player.title}</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1 pt-1 border-t border-slate-800/50">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span className="truncate">{session.transcode.videoCodec || session.transcode.videoDecision}</span>
                        <span className="font-bold text-slate-300">{session.progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-yellow-500 to-amber-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${session.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px] font-mono">NVENC HW Transcoder</span>
            <button
              onClick={() => setActiveTab('plex')}
              className="text-yellow-400 hover:underline text-[11px] font-bold"
            >
              Open Plex Tab →
            </button>
          </div>
        </div>

        {/* 6. System Hardware & Storage Bento Box (12 columns full strip) */}
        <div className="md:col-span-12 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Server Hardware & Storage Uptime</h4>
              <p className="text-xs text-slate-400 font-mono mt-0.5">Storage Array: 14.2TB / 20TB (71% used) • CPU: 18% • RAM: 8.4GB / 32GB</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-slate-300">Uptime: 42d 18h</span>
            </div>
            <button
              onClick={() => setActiveTab('settings')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold border border-slate-700 transition-colors"
            >
              System Config
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};


