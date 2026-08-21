import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle,
  Film,
  Tv,
  Star,
  Clock,
  Send,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Layers
} from 'lucide-react';
import { ParsedMediaLink } from '../types';

interface LinkParserModalProps {
  parsedLink: ParsedMediaLink | null;
  onClose: () => void;
  onRequestSubmit: (media: ParsedMediaLink, is4k: boolean, seasons?: number[]) => Promise<void>;
}

export const LinkParserModal: React.FC<LinkParserModalProps> = ({
  parsedLink,
  onClose,
  onRequestSubmit,
}) => {
  const [is4k, setIs4k] = useState(false);
  const [selectedSeasons, setSelectedSeasons] = useState<number[]>([1]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!parsedLink) return null;

  const handleRequest = async () => {
    setIsSubmitting(true);
    try {
      await onRequestSubmit(parsedLink, is4k, parsedLink.type === 'tv' ? selectedSeasons : undefined);
      setSuccessMsg(`Successfully submitted request for "${parsedLink.title}" to Seerr!`);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to send request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSeason = (sNum: number) => {
    if (selectedSeasons.includes(sNum)) {
      if (selectedSeasons.length > 1) {
        setSelectedSeasons(selectedSeasons.filter((s) => s !== sNum));
      }
    } else {
      setSelectedSeasons([...selectedSeasons, sNum].sort());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/60 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-slate-100">
                Shared IMDb / Media Link Detected
              </h3>
              <p className="text-xs text-slate-400">
                Seerr Smart Gateway Request
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {successMsg ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center animate-bounce">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-slate-100">Request Sent to Seerr!</h4>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                {successMsg}
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <span>Radarr & Sonarr will automatically process download once approved</span>
              </div>
            </div>
          ) : (
            <>
              {/* Media Card Preview */}
              <div className="flex flex-col sm:flex-row gap-5 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                <div className="w-28 sm:w-36 h-40 sm:h-52 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 shadow-lg relative">
                  <img
                    src={parsedLink.posterUrl}
                    alt={parsedLink.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow ${
                      parsedLink.type === 'tv'
                        ? 'bg-sky-500 text-slate-950'
                        : 'bg-amber-500 text-slate-950'
                    }`}>
                      {parsedLink.type === 'tv' ? <Tv className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                      {parsedLink.type}
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xl font-bold text-slate-100 font-sans">
                        {parsedLink.title} <span className="text-slate-500 font-normal">({parsedLink.year})</span>
                      </h4>
                      {parsedLink.directorOrCreator && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          By <span className="text-slate-300">{parsedLink.directorOrCreator}</span>
                        </p>
                      )}
                    </div>
                    {parsedLink.rating && (
                      <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg text-amber-400 text-xs font-semibold">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{parsedLink.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    {parsedLink.overview}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {parsedLink.genres?.map((g) => (
                      <span
                        key={g}
                        className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[11px] text-slate-400"
                      >
                        {g}
                      </span>
                    ))}
                    {parsedLink.imdbId && (
                      <a
                        href={`https://www.imdb.com/title/${parsedLink.imdbId}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-mono flex items-center gap-1 hover:underline"
                      >
                        IMDb: {parsedLink.imdbId}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Request Config Options */}
              <div className="space-y-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-400" />
                  Request Preferences
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Quality Profile */}
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <label className="text-xs text-slate-400 block mb-2 font-medium">Quality Profile</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIs4k(false)}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-all ${
                          !is4k
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        Standard HD (1080p)
                      </button>
                      <button
                        type="button"
                        onClick={() => setIs4k(true)}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-all ${
                          is4k
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        4K Ultra HD
                      </button>
                    </div>
                  </div>

                  {/* TV Seasons selection if TV */}
                  {parsedLink.type === 'tv' && (
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 col-span-1 sm:col-span-2">
                      <label className="text-xs text-slate-400 block mb-2 font-medium">Seasons to Request</label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {[1, 2, 3, 4].map((num) => {
                          const isSelected = selectedSeasons.includes(num);
                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() => toggleSeason(num)}
                              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                                isSelected
                                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              Season {num}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Important Notice */}
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-sky-950/40 border border-sky-800/40 text-xs text-sky-300">
                  <ShieldCheck className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-sky-200">Centralized Policy:</strong> This request will pass strictly through <span className="underline font-semibold">Seerr</span> for approval and automated Radarr/Sonarr dispatching.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!successMsg && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-950/80 border-t border-slate-800">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRequest}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Request to Seerr</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
