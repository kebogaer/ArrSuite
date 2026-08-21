import React, { useState } from 'react';
import {
  Film,
  Search,
  RefreshCw,
  HardDrive,
  Star,
  CheckCircle,
  Download,
  AlertTriangle,
  ExternalLink,
  Info,
  Clock,
  LayoutGrid,
  List,
  Layers,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  Settings2
} from 'lucide-react';
import { RadarrMovie } from '../../types';

interface RadarrTabProps {
  movies: RadarrMovie[];
  onUpdateMovie?: (id: number, updates: { qualityProfile?: string; monitored?: boolean }) => Promise<void>;
  onDeleteMovie?: (id: number, deleteFiles?: boolean) => Promise<void>;
}

const QUALITY_PROFILES = [
  'HD - 1080p',
  'Ultra-HD - 4K',
  'HD - 720p/1080p',
  'SD',
  'Any'
];

export const RadarrTab: React.FC<RadarrTabProps> = ({
  movies,
  onUpdateMovie,
  onDeleteMovie,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'downloaded' | 'downloading' | 'missing'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'banner' | 'grid' | 'list'>('banner');
  const [selectedMovie, setSelectedMovie] = useState<RadarrMovie | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [movieToDelete, setMovieToDelete] = useState<RadarrMovie | null>(null);
  const [deleteFiles, setDeleteFiles] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredMovies = movies.filter((m) => {
    if (filter !== 'ALL' && m.status !== filter) return false;
    if (searchQuery.trim()) {
      return m.title.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1200);
  };

  const handleToggleMonitored = async (e: React.MouseEvent, movie: RadarrMovie) => {
    e.stopPropagation();
    if (!onUpdateMovie) return;
    const newMonitored = !movie.monitored;
    await onUpdateMovie(movie.id, { monitored: newMonitored });
    showToast(`"${movie.title}" is now ${newMonitored ? 'Monitored' : 'Unmonitored'}`);
    if (selectedMovie && selectedMovie.id === movie.id) {
      setSelectedMovie({ ...selectedMovie, monitored: newMonitored });
    }
  };

  const handleChangeProfile = async (
    e: React.ChangeEvent<HTMLSelectElement> | string,
    movie: RadarrMovie
  ) => {
    const newProfile = typeof e === 'string' ? e : e.target.value;
    if (!onUpdateMovie) return;
    await onUpdateMovie(movie.id, { qualityProfile: newProfile });
    showToast(`"${movie.title}" quality profile set to ${newProfile}`);
    if (selectedMovie && selectedMovie.id === movie.id) {
      setSelectedMovie({ ...selectedMovie, qualityProfile: newProfile });
    }
  };

  const confirmDeleteMovie = async () => {
    if (!movieToDelete || !onDeleteMovie) return;
    const title = movieToDelete.title;
    const wasDeletingFiles = deleteFiles;
    await onDeleteMovie(movieToDelete.id, deleteFiles);
    if (selectedMovie?.id === movieToDelete.id) {
      setSelectedMovie(null);
    }
    setMovieToDelete(null);
    setDeleteFiles(false);
    if (wasDeletingFiles) {
      showToast(`Deleted "${title}" and movie file from disk`);
    } else {
      showToast(`"${title}" removed from Radarr (Movie file preserved on disk)`);
    }
  };

  const formatGB = (bytes: number) => {
    if (bytes === 0) return '0 GB';
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getStatusBadge = (status: RadarrMovie['status']) => {
    switch (status) {
      case 'downloaded':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Downloaded
          </span>
        );
      case 'downloading':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Downloading
          </span>
        );
      case 'missing':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            Missing
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Radarr Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Film className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-100 font-sans">
                Radarr Movie Collection
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                {movies.length} Movies Monitored
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Automated movie indexing & lifecycle management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 shadow transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Radarr'}</span>
          </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['ALL', 'downloaded', 'downloading', 'missing'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                filter === st
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {st === 'ALL' ? 'All Movies' : st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Radarr library..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('banner')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${viewMode === 'banner' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400'}`}
              title="Compact Banner View (Ideal for mobile)"
            >
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Banners</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${viewMode === 'grid' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400'}`}
              title="Poster Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${viewMode === 'list' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400'}`}
              title="Table List View"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-amber-600 text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-400 flex items-center gap-3 animate-fade-in">
          <Sparkles className="w-5 h-5 text-yellow-300" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Banner View */}
      {viewMode === 'banner' ? (
        <div className="space-y-3">
          {filteredMovies.map((movie) => (
            <div
              key={movie.id}
              onClick={() => setSelectedMovie(movie)}
              className="group bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl overflow-hidden cursor-pointer transition-all shadow-md flex items-center p-3 gap-3.5"
            >
              <img
                src={movie.posterUrl}
                alt={movie.title}
                className="w-16 h-22 rounded-xl object-cover flex-shrink-0 group-hover:scale-105 transition-transform"
              />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-100 text-sm sm:text-base truncate font-sans group-hover:text-amber-400 transition-colors">
                    {movie.title}
                  </h4>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(movie.status)}
                    <button
                      onClick={(e) => handleToggleMonitored(e, movie)}
                      className={`p-1.5 rounded-lg border text-xs transition-colors ${
                        movie.monitored
                          ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                      }`}
                      title={movie.monitored ? 'Monitored (Click to unmonitor)' : 'Unmonitored (Click to monitor)'}
                    >
                      {movie.monitored ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
                  <span>{movie.year}</span>
                  <span>•</span>
                  <span>{formatGB(movie.sizeOnDiskBytes)}</span>
                  {movie.ratings.imdb && (
                    <>
                      <span>•</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {movie.ratings.imdb}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400" onClick={(e) => e.stopPropagation()}>
                    <Settings2 className="w-3 h-3 text-amber-400" />
                    <select
                      value={movie.qualityProfile}
                      onChange={(e) => handleChangeProfile(e, movie)}
                      className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[11px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                    >
                      {QUALITY_PROFILES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMovieToDelete(movie);
                    }}
                    className="p-1 rounded text-rose-400 hover:bg-rose-500/20 transition-colors"
                    title="Delete movie"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredMovies.map((movie) => (
            <div
              key={movie.id}
              onClick={() => setSelectedMovie(movie)}
              className="group bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl overflow-hidden cursor-pointer transition-all shadow-lg flex flex-col justify-between"
            >
              <div className="relative aspect-[2/3] overflow-hidden bg-slate-800">
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  {getStatusBadge(movie.status)}
                  <button
                    onClick={(e) => handleToggleMonitored(e, movie)}
                    className={`p-1.5 rounded-lg border backdrop-blur-md text-xs transition-colors ${
                      movie.monitored
                        ? 'bg-amber-500/80 border-amber-400 text-white'
                        : 'bg-slate-950/80 border-slate-700 text-slate-400'
                    }`}
                    title={movie.monitored ? 'Monitored' : 'Unmonitored'}
                  >
                    {movie.monitored ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {movie.ratings.imdb && (
                  <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold text-amber-400 flex items-center gap-1 border border-slate-800">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>{movie.ratings.imdb}</span>
                  </div>
                )}
              </div>

              <div className="p-3 space-y-2">
                <h4 className="font-bold text-slate-100 text-sm truncate font-sans group-hover:text-amber-400 transition-colors">
                  {movie.title}
                </h4>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>{movie.year}</span>
                  <span>{formatGB(movie.sizeOnDiskBytes)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80" onClick={(e) => e.stopPropagation()}>
                  <span className="text-amber-400 font-mono text-[10px]">{movie.qualityProfile}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMovieToDelete(movie);
                    }}
                    className="text-rose-400 hover:text-rose-300 p-1"
                    title="Delete movie"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Movie</th>
                <th className="py-3 px-4">Year</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Monitored</th>
                <th className="py-3 px-4">Quality Profile</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredMovies.map((movie) => (
                <tr
                  key={movie.id}
                  onClick={() => setSelectedMovie(movie)}
                  className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-semibold text-slate-100 flex items-center gap-3">
                    <img src={movie.posterUrl} alt="" className="w-8 h-12 rounded object-cover" />
                    <span>{movie.title}</span>
                  </td>
                  <td className="py-3 px-4 font-mono">{movie.year}</td>
                  <td className="py-3 px-4">{getStatusBadge(movie.status)}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={(e) => handleToggleMonitored(e, movie)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 ${
                        movie.monitored
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {movie.monitored ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{movie.monitored ? 'Monitored' : 'Unmonitored'}</span>
                    </button>
                  </td>
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={movie.qualityProfile}
                      onChange={(e) => handleChangeProfile(e, movie)}
                      className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                    >
                      {QUALITY_PROFILES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4 font-mono">{formatGB(movie.sizeOnDiskBytes)}</td>
                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setMovieToDelete(movie)}
                      className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                      title="Delete movie"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Movie Details Modal */}
      {selectedMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <img
                  src={selectedMovie.posterUrl}
                  alt={selectedMovie.title}
                  className="w-24 h-36 rounded-xl object-cover shadow-lg"
                />
                <div className="space-y-2">
                  <h3 className="text-xl font-bold font-sans text-slate-100">{selectedMovie.title}</h3>
                  <p className="text-xs text-slate-400">{selectedMovie.year} • {selectedMovie.runtime} min</p>
                  <div className="flex items-center gap-2 pt-1">
                    {getStatusBadge(selectedMovie.status)}
                    <button
                      onClick={(e) => handleToggleMonitored(e, selectedMovie)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${
                        selectedMovie.monitored
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {selectedMovie.monitored ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{selectedMovie.monitored ? 'Monitored' : 'Unmonitored'}</span>
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedMovie(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Edit Quality Profile Control */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase font-mono flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-amber-400" />
                Change Quality Profile:
              </label>
              <select
                value={selectedMovie.qualityProfile}
                onChange={(e) => handleChangeProfile(e, selectedMovie)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              >
                {QUALITY_PROFILES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              {selectedMovie.overview}
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
              <div>
                <span className="text-slate-500 block">Disk Space</span>
                <span className="text-slate-200 font-semibold">{formatGB(selectedMovie.sizeOnDiskBytes)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">IMDb / TMDB ID</span>
                <span className="text-amber-400">{selectedMovie.imdbId || selectedMovie.tmdbId}</span>
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={() => setMovieToDelete(selectedMovie)}
                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Movie</span>
              </button>

              <button
                onClick={() => setSelectedMovie(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {movieToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-lg font-bold">Delete Movie from Radarr?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to remove <strong className="text-white">"{movieToDelete.title}"</strong> from your Radarr movie monitoring?
            </p>

            {/* Delete Files Checkbox Option */}
            <label className="flex items-start gap-3 p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors select-none">
              <input
                type="checkbox"
                checked={deleteFiles}
                onChange={(e) => setDeleteFiles(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-rose-600 bg-slate-900 border-slate-700 focus:ring-rose-500 focus:ring-offset-slate-900"
              />
              <div className="text-xs space-y-0.5">
                <span className="font-bold text-slate-100 block flex items-center gap-1.5">
                  Delete movie file from disk
                  {deleteFiles && (
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      Permanent
                    </span>
                  )}
                </span>
                <span className="text-slate-400 text-[11px] block leading-tight">
                  {deleteFiles
                    ? `Will delete "${movieToDelete.title}" video file (${formatGB(movieToDelete.sizeOnDiskBytes)}) and movie folder from your storage array.`
                    : 'Leaves the movie video file intact on your hard drive (only unmonitors and removes from Radarr).'}
                </span>
              </div>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setMovieToDelete(null);
                  setDeleteFiles(false);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMovie}
                className={`px-4 py-2 text-white rounded-xl text-xs font-bold shadow-lg transition-colors ${
                  deleteFiles
                    ? 'bg-rose-700 hover:bg-rose-600 border border-rose-500/40'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {deleteFiles ? 'Delete Movie & Files' : 'Delete Movie Only'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
