import React from 'react';
import {
  Clapperboard,
  Play,
  Tv,
  Film,
  HardDrive,
  Users,
  Activity,
  Zap,
  Clock,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { PlexRecentItem, PlexSession } from '../../types';

interface PlexTabProps {
  sessions: PlexSession[];
  recentlyAdded: PlexRecentItem[];
}

export const PlexTab: React.FC<PlexTabProps> = ({ sessions, recentlyAdded }) => {
  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Plex Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            <Clapperboard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-100 font-sans">
                Plex Media Server
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-semibold">
                Online • {sessions.length} Active Streams
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Central media streaming, hardware transcode & playback monitoring
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-slate-300">
            Storage: <strong className="text-yellow-400">42.9 TB</strong>
          </div>
          <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-slate-300">
            Bandwidth: <strong className="text-yellow-400">56.7 Mbps</strong>
          </div>
        </div>
      </div>

      {/* Now Playing Active Streams */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Active Playback Sessions
        </h3>

        {sessions.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            No active Plex streams currently running.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3 relative overflow-hidden"
              >
                <div className="flex gap-4">
                  <img
                    src={sess.posterUrl}
                    alt={sess.title}
                    className="w-20 h-28 rounded-xl object-cover shadow flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-yellow-500/20 text-yellow-300">
                        {sess.player.platform}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{sess.player.ip}</span>
                    </div>

                    <h4 className="font-bold text-slate-100 text-base truncate leading-snug">
                      {sess.title}
                    </h4>
                    {sess.grandparentTitle && (
                      <p className="text-xs text-slate-400 truncate">{sess.grandparentTitle} - {sess.parentTitle}</p>
                    )}

                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <img src={sess.user.avatar} alt="" className="w-4 h-4 rounded-full" />
                      <span className="font-semibold text-slate-200">{sess.user.name}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Progress</span>
                    <span className="text-yellow-400">{sess.progressPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full"
                      style={{ width: `${sess.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Transcode Details */}
                <div className="flex items-center justify-between text-[11px] font-mono px-3 py-1.5 bg-slate-900/90 rounded-xl border border-slate-800 text-slate-300">
                  <div>
                    Video: <span className="text-yellow-400 font-semibold">{sess.transcode.videoDecision}</span> ({sess.transcode.videoCodec})
                  </div>
                  <div>
                    {(sess.transcode.bitrateKbps / 1000).toFixed(1)} Mbps
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recently Added Media Gallery */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
          <Clock className="w-5 h-5 text-yellow-400" />
          Recently Added to Library
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {recentlyAdded.map((item) => (
            <div key={item.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 space-y-2">
              <img src={item.posterUrl} alt={item.title} className="w-full h-40 object-cover rounded-lg shadow" />
              <div>
                <h4 className="font-bold text-slate-100 text-xs truncate">{item.title}</h4>
                <p className="text-[10px] text-slate-400">{item.seriesTitle || item.year} • Added {item.addedAt}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
