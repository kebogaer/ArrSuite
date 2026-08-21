import React, { useState } from 'react';
import {
  Tv,
  Search,
  RefreshCw,
  Calendar,
  CheckCircle,
  Clock,
  LayoutGrid,
  List,
  Layers,
  ChevronRight,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  Settings2,
  AlertTriangle
} from 'lucide-react';
import { SonarrSeries } from '../../types';

interface SonarrTabProps {
  series: SonarrSeries[];
  onUpdateSeries?: (id: number, updates: { qualityProfile?: string; monitored?: boolean }) => Promise<void>;
  onDeleteSeries?: (id: number, deleteFiles?: boolean) => Promise<void>;
}

const QUALITY_PROFILES = [
  'HD - 1080p',
  'Ultra-HD - 4K',
  'HD - 720p/1080p',
  'SD',
  'Any'
];

export const SonarrTab: React.FC<SonarrTabProps> = ({
  series,
  onUpdateSeries,
  onDeleteSeries,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'continuing' | 'ended'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'banner' | 'grid' | 'list'>('banner');
  const [activeSubTab, setActiveSubTab] = useState<'series' | 'calendar'>('series');
  const [selectedSeries, setSelectedSeries] = useState<SonarrSeries | null>(null);
  const [seriesToDelete, setSeriesToDelete] = useState<SonarrSeries | null>(null);
  const [deleteFiles, setDeleteFiles] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredSeries = series.filter((s) => {
    if (filter !== 'ALL' && s.status !== filter) return false;
    if (searchQuery.trim()) {
      return s.title.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1200);
  };

  const handleToggleMonitored = async (e: React.MouseEvent, show: SonarrSeries) => {
    e.stopPropagation();
    if (!onUpdateSeries) return;
    const newMonitored = !show.monitored;
    await onUpdateSeries(show.id, { monitored: newMonitored });
    showToast(`"${show.title}" is now ${newMonitored ? 'Monitored' : 'Unmonitored'}`);
    if (selectedSeries && selectedSeries.id === show.id) {
      setSelectedSeries({ ...selectedSeries, monitored: newMonitored });
    }
  };

  const handleChangeProfile = async (
    e: React.ChangeEvent<HTMLSelectElement> | string,
    show: SonarrSeries
  ) => {
    const newProfile = typeof e === 'string' ? e : e.target.value;
    if (!onUpdateSeries) return;
    await onUpdateSeries(show.id, { qualityProfile: newProfile });
    showToast(`"${show.title}" quality profile set to ${newProfile}`);
    if (selectedSeries && selectedSeries.id === show.id) {
      setSelectedSeries({ ...selectedSeries, qualityProfile: newProfile });
    }
  };

  const confirmDeleteSeries = async () => {
    if (!seriesToDelete || !onDeleteSeries) return;
    const title = seriesToDelete.title;
    const wasDeletingFiles = deleteFiles;
    await onDeleteSeries(seriesToDelete.id, deleteFiles);
    if (selectedSeries?.id === seriesToDelete.id) {
      setSelectedSeries(null);
    }
    setSeriesToDelete(null);
    setDeleteFiles(false);
    if (wasDeletingFiles) {
      showToast(`Deleted "${title}" and all episode files from disk`);
    } else {
      showToast(`"${title}" removed from Sonarr (Files preserved on disk)`);
    }
  };

  const formatGB = (bytes: number) => {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-sky-600 text-white px-5 py-3 rounded-2xl shadow-2xl border border-sky-400 flex items-center gap-3 animate-fade-in">
          <Sparkles className="w-5 h-5 text-sky-200" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Sonarr Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-100 font-sans">
                Sonarr Series Management
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold">
                {series.filter((s) => s.monitored).length} / {series.length} Monitored
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Automated TV episode tracking, calendar schedules & indexers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 shadow transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-sky-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Sonarr'}</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs: Library vs Calendar */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('series')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'series'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Tv className="w-4 h-4" />
          <span>Series Library</span>
        </button>
        <button
          onClick={() => setActiveSubTab('calendar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'calendar'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Upcoming Calendar</span>
        </button>
      </div>

      {activeSubTab === 'series' ? (
        <>
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {(['ALL', 'continuing', 'ended'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilter(st)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    filter === st
                      ? 'bg-sky-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {st === 'ALL' ? 'All Series' : st.charAt(0).toUpperCase() + st.slice(1)}
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
                  placeholder="Search Sonarr series..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setViewMode('banner')}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${viewMode === 'banner' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400'}`}
                  title="Compact Banner View (Fast mobile scrolling)"
                >
                  <Layers className="w-4 h-4" />
                  <span className="hidden sm:inline">Banners</span>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${viewMode === 'grid' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400'}`}
                  title="Card Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${viewMode === 'list' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400'}`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>
            </div>
          </div>

          {/* Banner View */}
          {viewMode === 'banner' ? (
            <div className="space-y-3">
              {filteredSeries.map((s) => {
                const progressPct = Math.round((s.episodeFileCount / s.episodeCount) * 100);
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSeries(s)}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-3 hover:border-sky-500/40 cursor-pointer transition-all shadow-md flex items-center gap-3.5"
                  >
                    <img
                      src={s.posterUrl}
                      alt={s.title}
                      className="w-16 h-22 rounded-xl object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-slate-100 text-sm sm:text-base truncate">
                          {s.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            s.status === 'continuing' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {s.status}
                          </span>
                          <button
                            onClick={(e) => handleToggleMonitored(e, s)}
                            className={`p-1.5 rounded-lg border text-xs transition-colors ${
                              s.monitored
                                ? 'bg-sky-500/20 border-sky-500/30 text-sky-300'
                                : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                            }`}
                            title={s.monitored ? 'Monitored (Click to unmonitor)' : 'Unmonitored (Click to monitor)'}
                          >
                            {s.monitored ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
                        <span className="text-slate-200">{s.network}</span>
                        <span>•</span>
                        <span>{s.seasonCount} Seasons</span>
                        <span>•</span>
                        <span>Disk: {formatGB(s.totalSizeOnDiskBytes)}</span>
                      </div>

                      {/* Episode Progress Bar */}
                      <div className="space-y-1 pt-0.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>Episode Progress</span>
                          <span className="text-sky-400 font-bold">{s.episodeFileCount}/{s.episodeCount} ({progressPct}%)</span>
                        </div>
                        <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                        <div className="flex items-center gap-1 text-[11px] text-slate-400" onClick={(e) => e.stopPropagation()}>
                          <Settings2 className="w-3 h-3 text-sky-400" />
                          <select
                            value={s.qualityProfile}
                            onChange={(e) => handleChangeProfile(e, s)}
                            className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[11px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                          >
                            {QUALITY_PROFILES.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSeriesToDelete(s);
                          }}
                          className="p-1 rounded text-rose-400 hover:bg-rose-500/20 transition-colors"
                          title="Delete series"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : viewMode === 'grid' ? (
            /* Series Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSeries.map((s) => {
                const progressPct = Math.round((s.episodeFileCount / s.episodeCount) * 100);
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSeries(s)}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-sky-500/40 cursor-pointer transition-all shadow-lg flex flex-col justify-between space-y-3"
                  >
                    <div className="flex gap-4">
                      <img
                        src={s.posterUrl}
                        alt={s.title}
                        className="w-24 h-36 rounded-xl object-cover shadow flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-slate-100 text-base leading-snug truncate">
                            {s.title}
                          </h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            s.status === 'continuing' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {s.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 font-mono">
                          Network: <strong className="text-slate-200">{s.network}</strong>
                        </p>

                        <div className="text-xs text-slate-300 pt-1">
                          <span>{s.seasonCount} Seasons • {s.episodeCount} Episodes</span>
                        </div>

                        {/* Episode Progress Bar */}
                        <div className="pt-2 space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                            <span>Progress</span>
                            <span className="text-sky-400 font-bold">{s.episodeFileCount}/{s.episodeCount} ({progressPct}%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleToggleMonitored(e, s)}
                          className={`p-1 rounded border text-[10px] font-semibold flex items-center gap-1 ${
                            s.monitored
                              ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {s.monitored ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          <span>{s.monitored ? 'Monitored' : 'Unmonitored'}</span>
                        </button>
                        <span className="text-sky-300 font-semibold">{s.qualityProfile}</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSeriesToDelete(s);
                        }}
                        className="text-rose-400 hover:text-rose-300 p-1"
                        title="Delete series"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Series List Table View */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Series</th>
                    <th className="py-3 px-4">Network</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Monitored</th>
                    <th className="py-3 px-4">Quality Profile</th>
                    <th className="py-3 px-4">Disk Size</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSeries.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedSeries(s)}
                      className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-100 flex items-center gap-3">
                        <img src={s.posterUrl} alt="" className="w-8 h-12 rounded object-cover" />
                        <span>{s.title}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">{s.network}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          s.status === 'continuing' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={(e) => handleToggleMonitored(e, s)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 ${
                            s.monitored
                              ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {s.monitored ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          <span>{s.monitored ? 'Monitored' : 'Unmonitored'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={s.qualityProfile}
                          onChange={(e) => handleChangeProfile(e, s)}
                          className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                        >
                          {QUALITY_PROFILES.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4 font-mono">{formatGB(s.totalSizeOnDiskBytes)}</td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSeriesToDelete(s)}
                          className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                          title="Delete series"
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
        </>
      ) : (
        /* Calendar Schedule View */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-400" />
            Upcoming TV Releases
          </h3>
          <div className="space-y-3">
            {series
              .filter((s) => s.nextAiring)
              .map((s) => (
                <div key={s.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={s.posterUrl} alt="" className="w-10 h-14 rounded object-cover" />
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">{s.title}</h4>
                      <p className="text-xs text-slate-400">Next Episode Airing on {s.network}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-mono font-semibold">
                      {new Date(s.nextAiring!).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Series Details Modal */}
      {selectedSeries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <img
                  src={selectedSeries.posterUrl}
                  alt={selectedSeries.title}
                  className="w-24 h-36 rounded-xl object-cover shadow-lg"
                />
                <div className="space-y-2">
                  <h3 className="text-xl font-bold font-sans text-slate-100">{selectedSeries.title}</h3>
                  <p className="text-xs text-slate-400">{selectedSeries.network} • {selectedSeries.seasonCount} Seasons ({selectedSeries.episodeCount} Ep)</p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      selectedSeries.status === 'continuing' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {selectedSeries.status}
                    </span>
                    <button
                      onClick={(e) => handleToggleMonitored(e, selectedSeries)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${
                        selectedSeries.monitored
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {selectedSeries.monitored ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{selectedSeries.monitored ? 'Monitored' : 'Unmonitored'}</span>
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedSeries(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Edit Quality Profile Control */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase font-mono flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-sky-400" />
                Change Quality Profile:
              </label>
              <select
                value={selectedSeries.qualityProfile}
                onChange={(e) => handleChangeProfile(e, selectedSeries)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
              >
                {QUALITY_PROFILES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              {selectedSeries.overview}
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
              <div>
                <span className="text-slate-500 block">Total Disk Space</span>
                <span className="text-slate-200 font-semibold">{formatGB(selectedSeries.totalSizeOnDiskBytes)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">TVDB / IMDb ID</span>
                <span className="text-sky-400">{selectedSeries.imdbId || selectedSeries.tvdbId}</span>
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={() => setSeriesToDelete(selectedSeries)}
                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Series</span>
              </button>

              <button
                onClick={() => setSelectedSeries(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {seriesToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-lg font-bold">Delete Series from Sonarr?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to remove <strong className="text-white">"{seriesToDelete.title}"</strong> from your Sonarr series monitoring?
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
                  Delete series files from disk
                  {deleteFiles && (
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      Permanent
                    </span>
                  )}
                </span>
                <span className="text-slate-400 text-[11px] block leading-tight">
                  {deleteFiles
                    ? `Will delete "${seriesToDelete.title}" folder and all episode files (${formatGB(seriesToDelete.totalSizeOnDiskBytes)}) from your storage array.`
                    : 'Leaves downloaded video files intact in your storage folder (only unmonitors and removes from Sonarr).'}
                </span>
              </div>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setSeriesToDelete(null);
                  setDeleteFiles(false);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSeries}
                className={`px-4 py-2 text-white rounded-xl text-xs font-bold shadow-lg transition-colors ${
                  deleteFiles
                    ? 'bg-rose-700 hover:bg-rose-600 border border-rose-500/40'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {deleteFiles ? 'Delete Series & Files' : 'Delete Series Only'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
