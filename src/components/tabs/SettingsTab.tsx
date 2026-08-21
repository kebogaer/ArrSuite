import React, { useState } from 'react';
import {
  Settings,
  Server,
  Key,
  Globe,
  CheckCircle,
  XCircle,
  RefreshCw,
  ShieldCheck,
  HardDrive,
  Sparkles,
  Film,
  Tv,
  Clapperboard,
  Download,
  ToggleLeft,
  ToggleRight,
  Info
} from 'lucide-react';
import { ArrSettings } from '../../types';

interface SettingsTabProps {
  settings: ArrSettings;
  onUpdateSettings: (newSettings: ArrSettings) => void;
  onTestConnection: (service: string, url: string, apiKey: string) => Promise<{ success: boolean; message: string; latencyMs?: number }>;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onUpdateSettings,
  onTestConnection,
}) => {
  const [localSettings, setLocalSettings] = useState<ArrSettings>(settings);
  const [testingService, setTestingService] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; latencyMs?: number }>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleTest = async (serviceKey: string, url: string, apiKey: string) => {
    setTestingService(serviceKey);
    try {
      const res = await onTestConnection(serviceKey, url, apiKey);
      setTestResults((prev) => ({ ...prev, [serviceKey]: res }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [serviceKey]: { success: false, message: err.message || 'Connection test failed' },
      }));
    } finally {
      setTestingService(null);
    }
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-4xl mx-auto">
      {/* Settings Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-slate-800 text-sky-400 border border-slate-700">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-100 font-sans">
              Suite Connection Manager
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure URLs and API keys for your local homelab services
            </p>
          </div>
        </div>

        {/* Demo Mode Toggle */}
        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-300 font-medium">Demo Mode</span>
          <button
            type="button"
            onClick={() => {
              const updated = { ...localSettings, demoMode: !localSettings.demoMode };
              setLocalSettings(updated);
              onUpdateSettings(updated);
            }}
            className="text-sky-400 focus:outline-none"
          >
            {localSettings.demoMode ? (
              <ToggleRight className="w-8 h-8 text-sky-400" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-slate-600" />
            )}
          </button>
        </div>
      </div>

      {/* Policy Reminder Box */}
      <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-purple-100 text-sm block mb-1">Architecture & Workflow Policy</strong>
          <p className="leading-relaxed">
            Requests made through ArrSuite Hub pass strictly to <strong>Seerr</strong>. Seerr manages user approvals and automatically triggers downstream media acquisition in Radarr and Sonarr.
          </p>
        </div>
      </div>

      {/* Services List */}
      <div className="space-y-5">
        {/* Seerr */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Seerr / Jellyseerr</h3>
                <p className="text-xs text-slate-400">Request gateway & approval engine</p>
              </div>
            </div>
            {testResults['seerr'] && (
              <span className={`text-xs font-mono font-medium px-2.5 py-1 rounded-lg ${
                testResults['seerr'].success ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {testResults['seerr'].message}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">Server URL</label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={localSettings.seerr.url}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    seerr: { ...localSettings.seerr, url: e.target.value }
                  })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">API Key</label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="password"
                  value={localSettings.seerr.apiKey}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    seerr: { ...localSettings.seerr, apiKey: e.target.value }
                  })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={() => handleTest('seerr', localSettings.seerr.url, localSettings.seerr.apiKey)}
              disabled={testingService === 'seerr'}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-purple-300 font-semibold border border-slate-700 flex items-center gap-1.5"
            >
              {testingService === 'seerr' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Test Seerr</span>
            </button>
          </div>
        </div>

        {/* Radarr */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Film className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Radarr</h3>
                <p className="text-xs text-slate-400">Movie library manager</p>
              </div>
            </div>
            {testResults['radarr'] && (
              <span className={`text-xs font-mono font-medium px-2.5 py-1 rounded-lg ${
                testResults['radarr'].success ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {testResults['radarr'].message}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">Server URL</label>
              <input
                type="text"
                value={localSettings.radarr.url}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  radarr: { ...localSettings.radarr, url: e.target.value }
                })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">API Key</label>
              <input
                type="password"
                value={localSettings.radarr.apiKey}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  radarr: { ...localSettings.radarr, apiKey: e.target.value }
                })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={() => handleTest('radarr', localSettings.radarr.url, localSettings.radarr.apiKey)}
              disabled={testingService === 'radarr'}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 font-semibold border border-slate-700 flex items-center gap-1.5"
            >
              {testingService === 'radarr' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Test Radarr</span>
            </button>
          </div>
        </div>

        {/* Sonarr */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Tv className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Sonarr</h3>
                <p className="text-xs text-slate-400">TV show library manager</p>
              </div>
            </div>
            {testResults['sonarr'] && (
              <span className={`text-xs font-mono font-medium px-2.5 py-1 rounded-lg ${
                testResults['sonarr'].success ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {testResults['sonarr'].message}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">Server URL</label>
              <input
                type="text"
                value={localSettings.sonarr.url}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  sonarr: { ...localSettings.sonarr, url: e.target.value }
                })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">API Key</label>
              <input
                type="password"
                value={localSettings.sonarr.apiKey}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  sonarr: { ...localSettings.sonarr, apiKey: e.target.value }
                })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={() => handleTest('sonarr', localSettings.sonarr.url, localSettings.sonarr.apiKey)}
              disabled={testingService === 'sonarr'}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-sky-300 font-semibold border border-slate-700 flex items-center gap-1.5"
            >
              {testingService === 'sonarr' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Test Sonarr</span>
            </button>
          </div>
        </div>

        {/* Plex */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                <Clapperboard className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Plex Media Server</h3>
                <p className="text-xs text-slate-400">Media server & playback stream monitoring</p>
              </div>
            </div>
            {testResults['plex'] && (
              <span className={`text-xs font-mono font-medium px-2.5 py-1 rounded-lg ${
                testResults['plex'].success ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {testResults['plex'].message}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">Server URL</label>
              <input
                type="text"
                value={localSettings.plex.url}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  plex: { ...localSettings.plex, url: e.target.value }
                })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">Plex Token</label>
              <input
                type="password"
                value={localSettings.plex.apiKey}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  plex: { ...localSettings.plex, apiKey: e.target.value }
                })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={() => handleTest('plex', localSettings.plex.url, localSettings.plex.apiKey)}
              disabled={testingService === 'plex'}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-yellow-300 font-semibold border border-slate-700 flex items-center gap-1.5"
            >
              {testingService === 'plex' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Test Plex</span>
            </button>
          </div>
        </div>

        {/* qBittorrent */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Download className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">qBittorrent</h3>
                <p className="text-xs text-slate-400">Download client Web UI</p>
              </div>
            </div>
            {testResults['qbittorrent'] && (
              <span className={`text-xs font-mono font-medium px-2.5 py-1 rounded-lg ${
                testResults['qbittorrent'].success ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {testResults['qbittorrent'].message}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">Web UI URL</label>
              <input
                type="text"
                value={localSettings.qbittorrent.url}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  qbittorrent: { ...localSettings.qbittorrent, url: e.target.value }
                })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">Username / Password</label>
              <input
                type="text"
                value={localSettings.qbittorrent.username}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  qbittorrent: { ...localSettings.qbittorrent, username: e.target.value }
                })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={() => handleTest('qbittorrent', localSettings.qbittorrent.url, localSettings.qbittorrent.apiKey)}
              disabled={testingService === 'qbittorrent'}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-emerald-300 font-semibold border border-slate-700 flex items-center gap-1.5"
            >
              {testingService === 'qbittorrent' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Test qBittorrent</span>
            </button>
          </div>
        </div>
      </div>

      {/* Save Settings Bar */}
      <div className="sticky bottom-4 z-30 p-4 rounded-2xl bg-slate-900/90 backdrop-blur border border-slate-800 shadow-2xl flex items-center justify-between">
        <div className="text-xs text-slate-400">
          {saveSuccess ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" />
              Settings saved successfully!
            </span>
          ) : (
            <span>Changes persist locally in browser and server state</span>
          )}
        </div>
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-500/20 transition-all"
        >
          Save Configuration
        </button>
      </div>
    </div>
  );
};
