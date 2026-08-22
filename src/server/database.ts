import fs from 'fs';
import path from 'path';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { ArrSettings } from '../types';
import { initialSettings } from '../data/mockData';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'mediastack.sqlite');

let db: SqlJsDatabase | null = null;
let isInitialized = false;

// Ensure storage directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (_e) {}
}

/**
 * Initialize SQLite database engine (sql.js / WebAssembly)
 */
export async function initDatabase(): Promise<SqlJsDatabase> {
  if (db && isInitialized) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
    } catch (err) {
      console.warn('Could not read existing SQLite file, creating fresh DB:', err);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // Create table schema if not exists
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      demo_mode INTEGER NOT NULL DEFAULT 1,
      seerr_url TEXT NOT NULL,
      seerr_api_key TEXT NOT NULL,
      seerr_enabled INTEGER NOT NULL DEFAULT 1,
      radarr_url TEXT NOT NULL,
      radarr_api_key TEXT NOT NULL,
      radarr_enabled INTEGER NOT NULL DEFAULT 1,
      sonarr_url TEXT NOT NULL,
      sonarr_api_key TEXT NOT NULL,
      sonarr_enabled INTEGER NOT NULL DEFAULT 1,
      plex_url TEXT NOT NULL,
      plex_api_key TEXT NOT NULL,
      plex_enabled INTEGER NOT NULL DEFAULT 1,
      qbt_url TEXT NOT NULL,
      qbt_username TEXT NOT NULL,
      qbt_api_key TEXT NOT NULL,
      qbt_enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Check if initial row exists
  const check = db.exec('SELECT COUNT(*) as count FROM settings');
  const count = check.length > 0 && check[0].values.length > 0 ? (check[0].values[0][0] as number) : 0;

  if (count === 0) {
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO settings (
        id, demo_mode,
        seerr_url, seerr_api_key, seerr_enabled,
        radarr_url, radarr_api_key, radarr_enabled,
        sonarr_url, sonarr_api_key, sonarr_enabled,
        plex_url, plex_api_key, plex_enabled,
        qbt_url, qbt_username, qbt_api_key, qbt_enabled,
        updated_at
      ) VALUES (
        1, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?
      )`,
      [
        initialSettings.demoMode ? 1 : 0,
        initialSettings.seerr.url,
        initialSettings.seerr.apiKey,
        initialSettings.seerr.enabled ? 1 : 0,
        initialSettings.radarr.url,
        initialSettings.radarr.apiKey,
        initialSettings.radarr.enabled ? 1 : 0,
        initialSettings.sonarr.url,
        initialSettings.sonarr.apiKey,
        initialSettings.sonarr.enabled ? 1 : 0,
        initialSettings.plex.url,
        initialSettings.plex.apiKey,
        initialSettings.plex.enabled ? 1 : 0,
        initialSettings.qbittorrent.url,
        initialSettings.qbittorrent.username,
        initialSettings.qbittorrent.apiKey,
        initialSettings.qbittorrent.enabled ? 1 : 0,
        now,
      ]
    );

    db.run(
      `INSERT OR REPLACE INTO system_metadata (key, value, updated_at) VALUES ('initialized_at', ?, ?)`,
      [now, now]
    );

    persistToDisk(db);
  }

  isInitialized = true;
  return db;
}

/**
 * Flush SQLite binary database to disk file
 */
function persistToDisk(database: SqlJsDatabase) {
  try {
    const data = database.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Error persisting SQLite file to disk:', err);
  }
}

/**
 * Get Settings from SQLite
 */
export async function getAppSettings(): Promise<ArrSettings> {
  const database = await initDatabase();
  const res = database.exec('SELECT * FROM settings WHERE id = 1');

  if (!res.length || !res[0].values.length) {
    return initialSettings;
  }

  const columns = res[0].columns;
  const row = res[0].values[0];
  const obj: Record<string, any> = {};
  columns.forEach((col, idx) => {
    obj[col] = row[idx];
  });

  return {
    demoMode: Boolean(obj.demo_mode),
    seerr: {
      url: obj.seerr_url || initialSettings.seerr.url,
      apiKey: obj.seerr_api_key || initialSettings.seerr.apiKey,
      enabled: Boolean(obj.seerr_enabled),
    },
    radarr: {
      url: obj.radarr_url || initialSettings.radarr.url,
      apiKey: obj.radarr_api_key || initialSettings.radarr.apiKey,
      enabled: Boolean(obj.radarr_enabled),
    },
    sonarr: {
      url: obj.sonarr_url || initialSettings.sonarr.url,
      apiKey: obj.sonarr_api_key || initialSettings.sonarr.apiKey,
      enabled: Boolean(obj.sonarr_enabled),
    },
    plex: {
      url: obj.plex_url || initialSettings.plex.url,
      apiKey: obj.plex_api_key || initialSettings.plex.apiKey,
      enabled: Boolean(obj.plex_enabled),
    },
    qbittorrent: {
      url: obj.qbt_url || initialSettings.qbittorrent.url,
      username: obj.qbt_username || initialSettings.qbittorrent.username,
      apiKey: obj.qbt_api_key || initialSettings.qbittorrent.apiKey,
      enabled: Boolean(obj.qbt_enabled),
    },
  };
}

/**
 * Save settings to SQLite database and write to disk
 */
export async function saveAppSettings(newSettings: ArrSettings): Promise<ArrSettings> {
  const database = await initDatabase();
  const now = new Date().toISOString();

  database.run(
    `INSERT OR REPLACE INTO settings (
      id, demo_mode,
      seerr_url, seerr_api_key, seerr_enabled,
      radarr_url, radarr_api_key, radarr_enabled,
      sonarr_url, sonarr_api_key, sonarr_enabled,
      plex_url, plex_api_key, plex_enabled,
      qbt_url, qbt_username, qbt_api_key, qbt_enabled,
      updated_at
    ) VALUES (
      1, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?
    )`,
    [
      newSettings.demoMode ? 1 : 0,
      newSettings.seerr.url,
      newSettings.seerr.apiKey,
      newSettings.seerr.enabled ? 1 : 0,
      newSettings.radarr.url,
      newSettings.radarr.apiKey,
      newSettings.radarr.enabled ? 1 : 0,
      newSettings.sonarr.url,
      newSettings.sonarr.apiKey,
      newSettings.sonarr.enabled ? 1 : 0,
      newSettings.plex.url,
      newSettings.plex.apiKey,
      newSettings.plex.enabled ? 1 : 0,
      newSettings.qbittorrent.url,
      newSettings.qbittorrent.username,
      newSettings.qbittorrent.apiKey,
      newSettings.qbittorrent.enabled ? 1 : 0,
      now,
    ]
  );

  database.run(
    `INSERT OR REPLACE INTO system_metadata (key, value, updated_at) VALUES ('last_settings_update', ?, ?)`,
    [now, now]
  );

  persistToDisk(database);

  return getAppSettings();
}

/**
 * Get SQLite Database Diagnostics
 */
export async function getDatabaseDiagnostics() {
  await initDatabase();
  let sizeBytes = 0;
  try {
    if (fs.existsSync(DB_PATH)) {
      sizeBytes = fs.statSync(DB_PATH).size;
    }
  } catch (_e) {}

  return {
    engine: 'SQLite 3 (via WebAssembly & persistent disk storage)',
    databaseFile: 'data/mediastack.sqlite',
    databasePath: DB_PATH,
    sizeBytes,
    status: 'online',
    isPersistent: true,
  };
}
