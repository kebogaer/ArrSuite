import React, { useState, useMemo } from 'react';
import {
  Download,
  Upload,
  Play,
  Pause,
  Trash2,
  HardDrive,
  Activity,
  ArrowDown,
  ArrowUp,
  Filter,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  FileText,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Search
} from 'lucide-react';
import { QBittorrentStats, TorrentItem } from '../../types';

interface QBittorrentTabProps {
  torrents: TorrentItem[];
  stats: QBittorrentStats;
}

export const QBittorrentTab: React.FC<QBittorrentTabProps> = ({ torrents: initialTorrents, stats }) => {
  const [torrents, setTorrents] = useState<TorrentItem[]>(initialTorrents);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'radarr' | 'sonarr'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'downloading' | 'seeding' | 'paused'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [torrentToDelete, setTorrentToDelete] = useState<TorrentItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredTorrents = useMemo(() => {
    return torrents.filter((t) => {
      if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;
      if (statusFilter !== 'ALL' && t.state !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [torrents, categoryFilter, statusFilter, searchQuery]);

  const totalFiltered = filteredTorrents.length;
  const effectivePageSize = pageSize === 0 ? totalFiltered || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / effectivePageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedTorrents = useMemo(() => {
    if (pageSize === 0) return filteredTorrents;
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredTorrents.slice(start, start + pageSize);
  }, [filteredTorrents, safeCurrentPage, pageSize]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleCategoryFilterChange = (cat: 'ALL' | 'radarr' | 'sonarr') => {
    setCategoryFilter(cat);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status: 'ALL' | 'downloading' | 'seeding' | 'paused') => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const togglePause = async (hash: string) => {
    setTorrents((prev) =>
      prev.map((t) => {
        if (t.hash === hash) {
          const newState = t.state === 'downloading' ? 'paused' : 'downloading';
          return { ...t, state: newState };
        }
        return t;
      })
    );
    try {
      await fetch(`/api/qbittorrent/torrents/${hash}/toggle`, { method: 'POST' });
    } catch {
      // fallback
    }
  };

  const confirmDeleteTorrent = async (deleteData: boolean) => {
    if (!torrentToDelete) return;
    const hash = torrentToDelete.hash;
    const name = torrentToDelete.name;

    setTorrents((prev) => prev.filter((t) => t.hash !== hash));
    setTorrentToDelete(null);

    try {
      await fetch(`/api/qbittorrent/torrents/${hash}?deleteData=${deleteData}`, {
        method: 'DELETE',
      });
    } catch {
      // fallback
    }

    if (deleteData) {
      showToast(`Deleted "${name}" AND its downloaded files from disk`);
    } else {
      showToast(`Deleted "${name}" from torrent client (Files kept on disk)`);
    }
  };

  const formatSpeed = (bps: number) => {
    if (bps > 1024 * 1024) return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
    if (bps > 1024) return `${(bps / 1024).toFixed(0)} KB/s`;
    return `${bps} B/s`;
  };

  const formatGB = (bytes: number) => {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-400 flex items-center gap-3 animate-fade-in">
          <Sparkles className="w-5 h-5 text-emerald-200" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-100 font-sans">
                qBittorrent Client
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                v4.6.3 Connected
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Active torrent transfers & indexer downloads
            </p>
          </div>
        </div>

        {/* Live Bandwidth Cards */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-slate-200 flex items-center gap-2">
            <ArrowDown className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[10px] text-slate-500 block">DOWNLOAD</span>
              <span className="font-bold text-emerald-400">{formatSpeed(stats.dlRateBps)}</span>
            </div>
          </div>
          <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-slate-200 flex items-center gap-2">
            <ArrowUp className="w-4 h-4 text-sky-400" />
            <div>
              <span className="text-[10px] text-slate-500 block">UPLOAD</span>
              <span className="font-bold text-sky-400">{formatSpeed(stats.upRateBps)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search torrents by name or category..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Stats & Configurable Limit selector */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Limit Selector */}
            <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400 text-[11px] font-medium">Show:</span>
              <div className="flex items-center gap-1">
                {[10, 20, 50, 100, 0].map((size) => (
                  <button
                    key={size}
                    onClick={() => handlePageSizeChange(size)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold transition-colors ${
                      pageSize === size
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {size === 0 ? 'All' : size}
                  </button>
                ))}
              </div>
            </div>

            {/* Free disk space */}
            <div className="text-xs text-slate-400 font-mono bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
              Free Space: <strong className="text-emerald-400">{(stats.freeSpaceOnDiskBytes / (1024 * 1024 * 1024 * 1024)).toFixed(2)} TB</strong>
            </div>
          </div>
        </div>

        {/* Secondary Filter Tags */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px] font-medium">Category:</span>
              <div className="flex items-center gap-1">
                {(['ALL', 'radarr', 'sonarr'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryFilterChange(cat)}
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold uppercase transition-colors ${
                      categoryFilter === cat
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-slate-700">|</span>

            {/* State Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px] font-medium">State:</span>
              <div className="flex items-center gap-1">
                {(['ALL', 'downloading', 'seeding', 'paused'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusFilterChange(st)}
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold capitalize transition-colors ${
                      statusFilter === st
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            Showing <strong className="text-slate-200">{paginatedTorrents.length}</strong> of <strong className="text-slate-200">{totalFiltered}</strong> torrents
          </div>
        </div>
      </div>

      {/* Torrents Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 font-semibold text-slate-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Torrent Queue</span>
            <span className="text-xs font-mono font-normal text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
              {totalFiltered} items
            </span>
          </div>
          {pageSize > 0 && totalPages > 1 && (
            <span className="text-xs font-mono text-slate-400">
              Page {safeCurrentPage} of {totalPages}
            </span>
          )}
        </div>

        {paginatedTorrents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Download className="w-10 h-10 mx-auto text-slate-600 opacity-40" />
            <p className="text-sm font-semibold text-slate-300">No torrents match your criteria</p>
            <p className="text-xs text-slate-500">Try adjusting your search or category filter</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {paginatedTorrents.map((t) => (
            <div key={t.hash} className="p-4 space-y-3 hover:bg-slate-800/30 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                    t.category === 'radarr' ? 'bg-amber-500/20 text-amber-300' : 'bg-sky-500/20 text-sky-300'
                  }`}>
                    {t.category}
                  </span>
                  <h4 className="font-mono text-sm font-semibold text-slate-100 truncate max-w-xl">
                    {t.name}
                  </h4>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => togglePause(t.hash)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title={t.state === 'downloading' ? 'Pause transfer' : 'Resume transfer'}
                  >
                    {t.state === 'downloading' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setTorrentToDelete(t)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                    title="Delete torrent"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">{formatGB(t.sizeBytes)} • Ratio: {t.ratio.toFixed(2)}</span>
                  <span className="text-emerald-400 font-bold">{(t.progress * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                    style={{ width: `${t.progress * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                <div className="flex items-center gap-4">
                  <span className="text-emerald-400">↓ {formatSpeed(t.dlspeedBps)}</span>
                  <span className="text-sky-400">↑ {formatSpeed(t.upspeedBps)}</span>
                  <span>Seeds: {t.seeds} | Peers: {t.peers}</span>
                </div>
                <div>ETA: {t.etaSeconds > 0 ? `${Math.ceil(t.etaSeconds / 60)} min` : 'Completed / Seeding'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

        {/* Pagination Footer */}
        {pageSize > 0 && totalPages > 1 && (
          <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-400 font-mono text-[11px]">
              Showing items{' '}
              <strong className="text-slate-200">
                {(safeCurrentPage - 1) * pageSize + 1}
              </strong>{' '}
              -{' '}
              <strong className="text-slate-200">
                {Math.min(safeCurrentPage * pageSize, totalFiltered)}
              </strong>{' '}
              of <strong className="text-slate-200">{totalFiltered}</strong>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-300 flex items-center gap-1 font-semibold transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    // Show first, last, and pages within 1 step of current
                    return p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1;
                  })
                  .map((p, idx, arr) => {
                    const prevP = arr[idx - 1];
                    const showEllipsis = prevP && p - prevP > 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span className="px-1 text-slate-600">…</span>}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-colors ${
                            safeCurrentPage === p
                              ? 'bg-emerald-600 text-white shadow'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-300 flex items-center gap-1 font-semibold transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {torrentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-rose-500/40 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-5">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold">Remove Torrent from qBittorrent?</h3>
                <p className="text-xs text-slate-400 font-mono truncate max-w-sm">{torrentToDelete.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              How would you like to handle the downloaded files on disk for this torrent?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => confirmDeleteTorrent(false)}
                className="p-4 bg-slate-800 hover:bg-slate-750 hover:border-slate-600 border border-slate-700 text-left rounded-xl transition-all group"
              >
                <div className="flex items-center gap-2 text-slate-200 font-bold text-xs group-hover:text-amber-400">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Delete Torrent Only</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
                  Removes the torrent entry from qBittorrent, but <strong>keeps all downloaded media files</strong> safe on disk.
                </p>
              </button>

              <button
                onClick={() => confirmDeleteTorrent(true)}
                className="p-4 bg-rose-500/10 hover:bg-rose-500/20 hover:border-rose-500/50 border border-rose-500/30 text-left rounded-xl transition-all group"
              >
                <div className="flex items-center gap-2 text-rose-300 font-bold text-xs group-hover:text-rose-200">
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Delete Torrent & Data</span>
                </div>
                <p className="text-[11px] text-rose-300/80 mt-1.5 leading-snug">
                  Removes the torrent entry <strong>AND permanently wipes</strong> all associated files from disk.
                </p>
              </button>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setTorrentToDelete(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
