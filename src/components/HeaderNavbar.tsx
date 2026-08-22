import React, { useState, useEffect } from 'react';
import {
  Film,
  Tv,
  Clapperboard,
  Download,
  Settings,
  LayoutDashboard,
  Sparkles,
  Link2,
  Activity,
  ArrowRight
} from 'lucide-react';
import { ServiceHealth, TabType } from '../types';

interface HeaderNavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  serviceHealth: ServiceHealth[];
  demoMode?: boolean;
  onParseLink: (urlOrText: string) => void;
  isParsingLink: boolean;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  activeTab,
  setActiveTab,
  serviceHealth,
  onParseLink,
  isParsingLink
}) => {
  const [quickInput, setQuickInput] = useState('');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let lastScrollY = window.scrollY || document.documentElement.scrollTop;

    const handleScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;

      // Always show header when at or near top of page
      if (currentScrollY <= 20) {
        setIsVisible(true);
        lastScrollY = currentScrollY;
        return;
      }

      // Filter out micro-jitter (require scroll delta > 8px)
      const diff = currentScrollY - lastScrollY;
      if (Math.abs(diff) > 8) {
        if (diff > 0) {
          // Scrolling down -> hide header
          setIsVisible(false);
        } else {
          // Scrolling up -> show header
          setIsVisible(true);
        }
        lastScrollY = currentScrollY;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmitLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    onParseLink(quickInput.trim());
    setQuickInput('');
  };

  const navTabs: { id: TabType; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'seerr', label: 'Seerr', icon: <Sparkles className="w-4 h-4 text-purple-400" />, badge: 'Requests' },
    { id: 'radarr', label: 'Radarr', icon: <Film className="w-4 h-4 text-amber-400" /> },
    { id: 'sonarr', label: 'Sonarr', icon: <Tv className="w-4 h-4 text-sky-400" /> },
    { id: 'plex', label: 'Plex', icon: <Clapperboard className="w-4 h-4 text-yellow-400" /> },
    { id: 'qbittorrent', label: 'qBittorrent', icon: <Download className="w-4 h-4 text-emerald-400" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4 text-slate-400" /> },
  ];

  const isAllOnline = serviceHealth.every((s) => s.status === 'online');

  return (
    <header
      className={`sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-xl transition-transform duration-300 ease-in-out ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div 
          onClick={() => setActiveTab('dashboard')} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-xl text-white shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform">
            A
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
                ArrSuite <span className="text-blue-500">Central</span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Unified Media Stack & Request Automation
            </p>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <nav className="flex items-center gap-1 rounded-xl bg-slate-900 p-1 border border-slate-800/80 overflow-x-auto no-scrollbar">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-white shadow border border-slate-700/60'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="hidden sm:inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* System Online Status Badge */}
        <div className="hidden lg:flex items-center gap-3 text-xs">
          <span className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1.5 text-green-400 border border-green-500/20 font-medium">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            {isAllOnline ? 'Systems Online' : 'Suite Active'}
          </span>
        </div>
      </div>
    </header>
  );
};

