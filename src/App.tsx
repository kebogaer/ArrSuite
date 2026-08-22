import React, { useEffect, useState } from 'react';
import { HeaderNavbar } from './components/HeaderNavbar';
import { LinkParserModal } from './components/LinkParserModal';
import { DashboardTab } from './components/tabs/DashboardTab';
import { SeerrTab } from './components/tabs/SeerrTab';
import { RadarrTab } from './components/tabs/RadarrTab';
import { SonarrTab } from './components/tabs/SonarrTab';
import { PlexTab } from './components/tabs/PlexTab';
import { QBittorrentTab } from './components/tabs/QBittorrentTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import {
  emptyQbtStats,
  initialHealth,
  initialSettings,
} from './data/defaults';
import {
  ArrSettings,
  ParsedMediaLink,
  PlexRecentItem,
  PlexSession,
  QBittorrentStats,
  RadarrMovie,
  SeerrRequest,
  ServiceHealth,
  SonarrSeries,
  TabType,
  TorrentItem
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [settings, setSettings] = useState<ArrSettings>(initialSettings);
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth[]>(initialHealth);
  const [requests, setRequests] = useState<SeerrRequest[]>([]);
  const [movies, setMovies] = useState<RadarrMovie[]>([]);
  const [series, setSeries] = useState<SonarrSeries[]>([]);
  const [sessions, setSessions] = useState<PlexSession[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<PlexRecentItem[]>([]);
  const [torrents, setTorrents] = useState<TorrentItem[]>([]);
  const [qbtStats, setQbtStats] = useState<QBittorrentStats>(emptyQbtStats);

  // Link Parser Modal State
  const [parsedLink, setParsedLink] = useState<ParsedMediaLink | null>(null);
  const [isParsingLink, setIsParsingLink] = useState<boolean>(false);

  // Initial load from backend API routes
  useEffect(() => {
    fetchSettings();
    fetchAllData();

    // Periodic polling every 12 seconds for live telemetry
    const timer = setInterval(() => {
      fetchPlexStatus();
      fetchQbittorrent();
      fetchHealth();
    }, 12000);

    return () => clearInterval(timer);
  }, []);

  const fetchAllData = () => {
    fetchSeerrRequests();
    fetchRadarrMovies();
    fetchSonarrSeries();
    fetchPlexStatus();
    fetchQbittorrent();
    fetchHealth();
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (data.data && Array.isArray(data.data)) {
        setServiceHealth(data.data);
      }
    } catch (_e) {}
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.data) {
        setSettings(data.data);
      }
    } catch (_e) {}
  };

  const handleUpdateSettings = async (newSettings: ArrSettings) => {
    setSettings(newSettings);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      // Immediately reload all data from newly saved endpoints / mode
      setTimeout(() => fetchAllData(), 300);
    } catch (e) {
      console.error('Failed to persist settings to SQLite', e);
    }
  };

  const fetchSeerrRequests = async () => {
    try {
      const res = await fetch('/api/seerr/requests');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setRequests(data.data);
      }
    } catch (_e) {
      // Keep mock data if offline
    }
  };

  const fetchRadarrMovies = async () => {
    try {
      const res = await fetch('/api/radarr/movies');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMovies(data.data);
      }
    } catch (_e) {}
  };

  const fetchSonarrSeries = async () => {
    try {
      const res = await fetch('/api/sonarr/series');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSeries(data.data);
      }
    } catch (_e) {}
  };

  const fetchPlexStatus = async () => {
    try {
      const res = await fetch('/api/plex/status');
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.sessions) setSessions(data.data.sessions);
        if (data.data.recentlyAdded) setRecentlyAdded(data.data.recentlyAdded);
      }
    } catch (_e) {}
  };

  const fetchQbittorrent = async () => {
    try {
      const res = await fetch('/api/qbittorrent/torrents');
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.torrents) setTorrents(data.data.torrents);
        if (data.data.stats) setQbtStats(data.data.stats);
      }
    } catch (_e) {}
  };

  // Handle parsing an IMDb link or query text
  const handleParseLink = async (urlOrText: string) => {
    setIsParsingLink(true);
    try {
      const res = await fetch('/api/parse-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlOrText }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setParsedLink(data.data);
      } else {
        alert(data.error || 'Could not parse link');
      }
    } catch (err: any) {
      alert(err.message || 'Error parsing media link');
    } finally {
      setIsParsingLink(false);
    }
  };

  // Submit request via Seerr Gateway
  const handleRequestSubmit = async (
    media: ParsedMediaLink,
    is4k: boolean,
    seasons?: number[]
  ) => {
    const res = await fetch('/api/seerr/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media, is4k, seasonsRequested: seasons }),
    });

    const data = await res.json();
    if (data.success) {
      await fetchSeerrRequests();
    } else {
      throw new Error(data.error || 'Failed to submit request');
    }
  };

  // Approve a Seerr request
  const handleApproveRequest = async (id: number) => {
    try {
      const res = await fetch(`/api/seerr/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      const data = await res.json();
      if (data.success) {
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? data.data : r))
        );
      }
    } catch (_e) {}
  };

  // Decline a Seerr request
  const handleDeclineRequest = async (id: number) => {
    try {
      const res = await fetch(`/api/seerr/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DECLINED' }),
      });
      const data = await res.json();
      if (data.success) {
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? data.data : r))
        );
      }
    } catch (_e) {}
  };

  // Update Radarr movie profile / monitoring
  const handleUpdateRadarrMovie = async (
    id: number,
    updates: { qualityProfile?: string; monitored?: boolean }
  ) => {
    try {
      const res = await fetch(`/api/radarr/movies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setMovies((prev) => prev.map((m) => (m.id === id ? data.data : m)));
      }
    } catch (_e) {}
  };

  // Delete Radarr movie
  const handleDeleteRadarrMovie = async (id: number, deleteFiles = false) => {
    try {
      const res = await fetch(`/api/radarr/movies/${id}?deleteFiles=${deleteFiles}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setMovies((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (_e) {}
  };

  // Update Sonarr series profile / monitoring
  const handleUpdateSonarrSeries = async (
    id: number,
    updates: { qualityProfile?: string; monitored?: boolean }
  ) => {
    try {
      const res = await fetch(`/api/sonarr/series/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setSeries((prev) => prev.map((s) => (s.id === id ? data.data : s)));
      }
    } catch (_e) {}
  };

  // Delete Sonarr series
  const handleDeleteSonarrSeries = async (id: number, deleteFiles = false) => {
    try {
      const res = await fetch(`/api/sonarr/series/${id}?deleteFiles=${deleteFiles}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setSeries((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (_e) {}
  };

  // Test Connection
  const handleTestConnection = async (
    service: string,
    url: string,
    apiKey: string
  ) => {
    const res = await fetch('/api/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service, url, apiKey }),
    });
    return await res.json();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500 selection:text-slate-950">
      {/* Header & Quick Request Navbar */}
      <HeaderNavbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        serviceHealth={serviceHealth}
        demoMode={settings.demoMode}
        onParseLink={handleParseLink}
        isParsingLink={isParsingLink}
      />

      {/* Main Tab Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && (
          <DashboardTab
            requests={requests}
            movies={movies}
            series={series}
            sessions={sessions}
            torrents={torrents}
            qbtStats={qbtStats}
            serviceHealth={serviceHealth}
            setActiveTab={setActiveTab}
            onParseLink={handleParseLink}
            onApproveRequest={handleApproveRequest}
          />
        )}

        {activeTab === 'seerr' && (
          <SeerrTab
            requests={requests}
            onApproveRequest={handleApproveRequest}
            onDeclineRequest={handleDeclineRequest}
            onParseLink={handleParseLink}
            onRequestSubmit={handleRequestSubmit}
          />
        )}

        {activeTab === 'radarr' && (
          <RadarrTab
            movies={movies}
            onUpdateMovie={handleUpdateRadarrMovie}
            onDeleteMovie={handleDeleteRadarrMovie}
          />
        )}

        {activeTab === 'sonarr' && (
          <SonarrTab
            series={series}
            onUpdateSeries={handleUpdateSonarrSeries}
            onDeleteSeries={handleDeleteSonarrSeries}
          />
        )}

        {activeTab === 'plex' && (
          <PlexTab sessions={sessions} recentlyAdded={recentlyAdded} />
        )}

        {activeTab === 'qbittorrent' && (
          <QBittorrentTab torrents={torrents} stats={qbtStats} />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onTestConnection={handleTestConnection}
          />
        )}
      </main>

      {/* Link Parser Modal */}
      <LinkParserModal
        parsedLink={parsedLink}
        onClose={() => setParsedLink(null)}
        onRequestSubmit={handleRequestSubmit}
      />
    </div>
  );
}
