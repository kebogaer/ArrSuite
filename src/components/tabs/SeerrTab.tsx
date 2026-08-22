import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  CheckCircle,
  XCircle,
  Clock,
  Film,
  Tv,
  Search,
  Flame,
  TrendingUp,
  Star,
  ShieldCheck,
  Layers,
  Send,
  Plus,
  Check,
  Loader2,
  Filter,
  Tv2
} from 'lucide-react';
import { DiscoverMediaItem, ParsedMediaLink, SeerrRequest } from '../../types';

interface SeerrTabProps {
  requests: SeerrRequest[];
  onApproveRequest: (id: number) => void;
  onDeclineRequest: (id: number) => void;
  onParseLink: (input: string) => void;
  onRequestSubmit?: (media: ParsedMediaLink, is4k: boolean, seasons?: number[]) => Promise<void>;
}

export const SeerrTab: React.FC<SeerrTabProps> = ({
  requests,
  onApproveRequest,
  onDeclineRequest,
  onParseLink,
  onRequestSubmit,
}) => {
  // Main Tab View State: 'discover' vs 'queue'
  const [viewMode, setViewMode] = useState<'discover' | 'queue'>('discover');

  // Discover View Mode: 'banner' (compact horizontal rows) vs 'grid' (portrait cards)
  const [cardLayout, setCardLayout] = useState<'banner' | 'grid'>('banner');

  // Discover State
  const [popularItems, setPopularItems] = useState<DiscoverMediaItem[]>([]);
  const [discoverType, setDiscoverType] = useState<'all' | 'movie' | 'tv'>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [discoverSearch, setDiscoverSearch] = useState<string>('');
  const [requestingId, setRequestingId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Request Queue Filters State
  const [queueFilter, setQueueFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'PROCESSING' | 'AVAILABLE'>('ALL');
  const [queueSearch, setQueueSearch] = useState('');
  const [directSearchInput, setDirectSearchInput] = useState('');

  // Fetch popular items from backend on mount
  useEffect(() => {
    fetchPopularItems();
  }, []);

  const fetchPopularItems = async () => {
    try {
      const res = await fetch('/api/seerr/discover');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPopularItems(data.data);
      }
    } catch (_e) {
      // Fallback to mock data already set in state
    }
  };

  // Extract unique genres for genre pill bar
  const allGenres = Array.from(
    new Set(popularItems.flatMap((item) => item.genres || []))
  );

  // Filter popular items
  const filteredPopularItems = popularItems.filter((item) => {
    if (discoverType !== 'all' && item.type !== discoverType) return false;
    if (selectedGenre !== 'all' && !item.genres.includes(selectedGenre)) return false;
    if (discoverSearch.trim()) {
      const q = discoverSearch.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.overview.toLowerCase().includes(q) ||
        (item.directorOrCreator && item.directorOrCreator.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Filter request queue items
  const filteredRequests = requests.filter((r) => {
    if (queueFilter !== 'ALL' && r.status !== queueFilter) return false;
    if (queueSearch.trim()) {
      const q = queueSearch.toLowerCase();
      return (
        r.media.title.toLowerCase().includes(q) ||
        r.requestedBy.username.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleDirectSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directSearchInput.trim()) return;
    onParseLink(directSearchInput.trim());
    setDirectSearchInput('');
  };

  // Helper to check status of a popular item against existing Seerr requests
  const getItemStatus = (title: string) => {
    const matched = requests.find(
      (r) => r.media.title.toLowerCase() === title.toLowerCase()
    );
    if (!matched) return null;
    return matched.status;
  };

  // Instant Request Action
  const handleQuickRequest = async (item: DiscoverMediaItem, is4k: boolean) => {
    if (!onRequestSubmit) return;
    setRequestingId(item.id);
    try {
      const mediaPayload: ParsedMediaLink = {
        title: item.title,
        year: item.year,
        type: item.type,
        imdbId: item.imdbId,
        tmdbId: item.tmdbId,
        rawUrl: `https://www.imdb.com/title/${item.imdbId}/`,
        posterUrl: item.posterUrl,
        overview: item.overview,
        rating: item.rating,
        genres: item.genres,
        directorOrCreator: item.directorOrCreator,
      };

      await onRequestSubmit(mediaPayload, is4k, item.type === 'tv' ? [1] : undefined);
      setToastMessage(`" ${item.title} " requested successfully via Seerr!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Request failed');
    } finally {
      setRequestingId(null);
    }
  };

  const getStatusBadge = (status: SeerrRequest['status']) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Pending Approval
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            Approved
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 animate-pulse" />
            Processing Download
          </span>
        );
      case 'AVAILABLE':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            Available on Plex
          </span>
        );
      case 'DECLINED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            Declined
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-purple-600 text-white px-5 py-3 rounded-2xl shadow-2xl border border-purple-400 flex items-center gap-3 animate-bounce">
          <Sparkles className="w-5 h-5 text-yellow-300" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Seerr Banner & Dual Mode Switcher */}
      <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-slate-900 border border-purple-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-inner">
                <Sparkles className="w-6 h-6" />
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-sans tracking-tight">
                Seerr <span className="text-purple-400">Gateway</span>
              </h2>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Browse popular & trending titles among film lovers or process media requests. Seerr automatically dispatches approved items to Radarr and Sonarr.
            </p>
          </div>

          {/* Quick Paste Request Form */}
          <form onSubmit={handleDirectSearchSubmit} className="flex items-center gap-2 w-full lg:w-auto">
            <input
              type="text"
              value={directSearchInput}
              onChange={(e) => setDirectSearchInput(e.target.value)}
              placeholder="Paste IMDb link or movie title..."
              className="bg-slate-950/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full lg:w-72 shadow-inner"
            />
            <button
              type="submit"
              disabled={!directSearchInput.trim()}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 shadow-md transition-all whitespace-nowrap"
            >
              <Send className="w-4 h-4" />
              Request
            </button>
          </form>
        </div>

        {/* View Switcher Tabs (Popular Browse vs Request Queue) */}
        <div className="mt-6 pt-4 border-t border-purple-500/20 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('discover')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                viewMode === 'discover'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-4 h-4 text-amber-400" />
              Popular & Trending
            </button>
            <button
              onClick={() => setViewMode('queue')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                viewMode === 'queue'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-4 h-4 text-purple-300" />
              Request Queue ({requests.filter((r) => r.status === 'PENDING').length} Pending)
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-purple-300/80">
            <ShieldCheck className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span>Enforced Seerr Metadata & Quality Sync</span>
          </div>
        </div>
      </div>

      {/* ==================== VIEW 1: POPULAR & TRENDING DISCOVER ==================== */}
      {viewMode === 'discover' && (
        <div className="space-y-6">
          {/* Controls Bar: Type Filters + Genre Pills + Search */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Type Filter Buttons */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setDiscoverType('all')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    discoverType === 'all'
                      ? 'bg-slate-800 text-purple-300 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Popular
                </button>
                <button
                  onClick={() => setDiscoverType('movie')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    discoverType === 'movie'
                      ? 'bg-slate-800 text-amber-400 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  Movies
                </button>
                <button
                  onClick={() => setDiscoverType('tv')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    discoverType === 'tv'
                      ? 'bg-slate-800 text-sky-400 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" />
                  TV Series
                </button>
              </div>

              {/* Live Search Input & Layout Toggle */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={discoverSearch}
                    onChange={(e) => setDiscoverSearch(e.target.value)}
                    placeholder="Search popular movies or shows..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 flex-shrink-0">
                  <button
                    onClick={() => setCardLayout('banner')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      cardLayout === 'banner'
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Compact Banner View (Faster scrolling on mobile)"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Banners</span>
                  </button>
                  <button
                    onClick={() => setCardLayout('grid')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      cardLayout === 'grid'
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Poster Grid View"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Grid</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Genre Pill Selection Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar border-t border-slate-800/60">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pr-2 flex items-center gap-1 flex-shrink-0">
                <Filter className="w-3 h-3 text-purple-400" />
                Genres:
              </span>
              <button
                onClick={() => setSelectedGenre('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedGenre === 'all'
                    ? 'bg-purple-600 text-white shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                All Genres
              </button>
              {allGenres.map((genre) => (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    selectedGenre === genre
                      ? 'bg-purple-600 text-white shadow'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Popular Media Items Container */}
          {filteredPopularItems.length === 0 ? (
            <div className="py-16 px-6 text-center rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center space-y-3">
              <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 text-purple-400">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-200">No media discovery loaded</h3>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                Connect your Overseerr / Jellyseerr URL and API key in Settings to stream live trending recommendations, or use the quick request search above to submit a movie or TV show.
              </p>
            </div>
          ) : cardLayout === 'banner' ? (
            /* Compact Horizontal Banners Layout */
            <div className="space-y-3">
              {filteredPopularItems.map((item) => {
                const reqStatus = getItemStatus(item.title);
                const isRequesting = requestingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-purple-500/40 transition-all shadow-md flex flex-col sm:flex-row items-stretch group"
                  >
                    {/* Compact Image Banner Container */}
                    <div className="relative w-full sm:w-44 h-36 sm:h-auto overflow-hidden bg-slate-950 flex-shrink-0">
                      <img
                        src={item.posterUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                          item.type === 'tv' ? 'bg-sky-500/80 text-white' : 'bg-amber-500/80 text-white'
                        }`}>
                          {item.type}
                        </span>
                        {item.trendingRank && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-600/90 text-white flex items-center gap-1 backdrop-blur-md">
                            <Flame className="w-3 h-3 text-yellow-300" />
                            #{item.trendingRank}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content Details */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-slate-100 text-sm sm:text-base leading-snug truncate group-hover:text-purple-300 transition-colors">
                            {item.title}
                          </h3>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-xs font-bold text-yellow-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-yellow-400" />
                              {item.rating.toFixed(1)}
                            </span>
                            <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              {item.year}
                            </span>
                          </div>
                        </div>

                        {item.directorOrCreator && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {item.type === 'tv' ? 'Created by' : 'Directed by'} <strong className="text-slate-300">{item.directorOrCreator}</strong>
                          </p>
                        )}

                        <p className="text-xs text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
                          {item.overview}
                        </p>

                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.genres.map((g) => (
                            <span key={g} className="px-2 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800 text-[10px]">
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="pt-2.5 mt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
                        {reqStatus === 'AVAILABLE' ? (
                          <div className="py-1 px-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>In Library</span>
                          </div>
                        ) : reqStatus === 'PENDING' || reqStatus === 'APPROVED' || reqStatus === 'PROCESSING' ? (
                          <div className="py-1 px-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Status: {reqStatus}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 ml-auto">
                            <button
                              disabled={isRequesting}
                              onClick={() => handleQuickRequest(item, false)}
                              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all"
                            >
                              {isRequesting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Plus className="w-3.5 h-3.5" />
                              )}
                              <span>Request HD</span>
                            </button>

                            <button
                              disabled={isRequesting}
                              onClick={() => handleQuickRequest(item, true)}
                              className="px-2.5 py-1.5 bg-purple-950 hover:bg-purple-900 border border-purple-500/30 text-purple-300 rounded-xl text-xs font-bold transition-all"
                              title="Request in 4K Ultra HD"
                            >
                              4K
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Poster Grid Layout */
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredPopularItems.map((item) => {
                const reqStatus = getItemStatus(item.title);
                const isRequesting = requestingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all shadow-xl flex flex-col justify-between group"
                  >
                    {/* Poster & Badges Overlay Container */}
                    <div className="relative aspect-[2/3] overflow-hidden bg-slate-950">
                      <img
                        src={item.posterUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-90" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                          item.type === 'tv' ? 'bg-sky-500/80 text-white' : 'bg-amber-500/80 text-white'
                        }`}>
                          {item.type}
                        </span>

                        {item.trendingRank && (
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-purple-600/90 text-white flex items-center gap-1 shadow backdrop-blur-md">
                            <Flame className="w-3 h-3 text-yellow-300" />
                            #{item.trendingRank} Popular
                          </span>
                        )}
                      </div>

                      {/* Rating & Release Info overlay at bottom of poster */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-slate-200">
                        <div className="flex items-center gap-1 font-bold text-yellow-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                          <Star className="w-3.5 h-3.5 fill-yellow-400" />
                          <span>{item.rating.toFixed(1)}</span>
                        </div>
                        <span className="font-mono text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                          {item.year}
                        </span>
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-slate-100 text-base leading-snug line-clamp-1 group-hover:text-purple-300 transition-colors">
                          {item.title}
                        </h3>
                        {item.directorOrCreator && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {item.type === 'tv' ? 'Created by' : 'Directed by'} <strong className="text-slate-300">{item.directorOrCreator}</strong>
                          </p>
                        )}

                        <p className="text-xs text-slate-300 mt-2 line-clamp-3 leading-relaxed">
                          {item.overview}
                        </p>

                        {/* Genre Tags */}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {item.genres.map((g) => (
                            <span
                              key={g}
                              className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 text-[10px] font-medium"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        {reqStatus === 'AVAILABLE' ? (
                          <div className="w-full py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5">
                            <CheckCircle className="w-4 h-4" />
                            <span>In Library / Plex Ready</span>
                          </div>
                        ) : reqStatus === 'PENDING' || reqStatus === 'APPROVED' || reqStatus === 'PROCESSING' ? (
                          <div className="w-full py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>Request {reqStatus}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 w-full">
                            <button
                              disabled={isRequesting}
                              onClick={() => handleQuickRequest(item, false)}
                              className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-all"
                            >
                              {isRequesting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Plus className="w-3.5 h-3.5" />
                              )}
                              <span>Request HD</span>
                            </button>

                            <button
                              disabled={isRequesting}
                              onClick={() => handleQuickRequest(item, true)}
                              className="py-2 px-3 bg-purple-950 hover:bg-purple-900 border border-purple-500/30 text-purple-300 rounded-xl text-xs font-bold transition-all"
                              title="Request in 4K Ultra HD"
                            >
                              4K
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== VIEW 2: REQUEST QUEUE & HISTORY ==================== */}
      {viewMode === 'queue' && (
        <div className="space-y-6">
          {/* Filter Tabs & Search Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-3 rounded-2xl border border-slate-800 shadow-md">
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
              {(['ALL', 'PENDING', 'APPROVED', 'PROCESSING', 'AVAILABLE'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setQueueFilter(st)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    queueFilter === st
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {st === 'ALL' ? 'All Requests' : st}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                placeholder="Filter requests..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Request Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-all shadow-lg flex flex-col justify-between space-y-4"
              >
                <div className="flex gap-4">
                  <img
                    src={req.media.posterPath}
                    alt={req.media.title}
                    className="w-24 h-36 rounded-xl object-cover shadow-md flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-100 text-base leading-snug">
                          {req.media.title}
                        </h4>
                        <p className="text-xs text-slate-400">
                          Released: {req.media.releaseDate.split('-')[0]}
                        </p>
                      </div>
                      {getStatusBadge(req.status)}
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {req.media.overview}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        req.media.mediaType === 'tv' ? 'bg-sky-500/20 text-sky-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {req.media.mediaType}
                      </span>
                      {req.is4k && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300">
                          4K Ultra HD
                        </span>
                      )}
                      {req.media.voteAverage && (
                        <span className="flex items-center gap-1 text-amber-400 text-xs font-semibold">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {req.media.voteAverage.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Request Meta & Admin Action Buttons */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>Requested by <strong className="text-slate-200">{req.requestedBy.username}</strong></span>
                  </div>

                  {req.status === 'PENDING' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onDeclineRequest(req.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => onApproveRequest(req.id)}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-all flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] font-mono text-purple-300">
                      {req.serverStatus || 'Automated Seerr Dispatch'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
