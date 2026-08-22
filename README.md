# ArrSuite

Unified web management dashboard for the *Arr media stack (Overseerr/Jellyseerr, Radarr, Sonarr, Plex, and qBittorrent) with SQLite credential storage and authenticated session management.

## Features
- **Unified Overview**: Real-time status, health latency, and quick actions across all services.
- **Service Integration**: Full controls for Radarr, Sonarr, Overseerr, Plex, and qBittorrent.
- **Secure Persistence**: Database storage for API keys, user profiles, and active sessions.
- **Docker Ready**: Multi-stage production container build with SQLite volume mounting.

## Build & Run

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build
npm start
```
