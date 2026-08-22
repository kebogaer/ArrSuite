import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { ArrSettings } from '../types';
import { initialSettings } from '../data/mockData';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'mediastack.sqlite');
const LATEST_BAK_PATH = path.join(DATA_DIR, 'mediastack.sqlite.bak');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const MAX_ROLLING_BACKUPS = 5;

let db: SqlJsDatabase | null = null;
let isInitialized = false;

// Ensure storage directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (_e) {}
}
if (!fs.existsSync(BACKUPS_DIR)) {
  try {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
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
      console.warn('Could not read existing SQLite file, attempting backup recovery:', err);
      // Attempt auto-recovery from latest backup
      if (fs.existsSync(LATEST_BAK_PATH)) {
        try {
          const bakBuffer = fs.readFileSync(LATEST_BAK_PATH);
          db = new SQL.Database(bakBuffer);
          console.info('Successfully auto-recovered SQLite database from latest backup!');
        } catch (bakErr) {
          console.error('Backup recovery also failed, creating fresh DB:', bakErr);
          db = new SQL.Database();
        }
      } else {
        db = new SQL.Database();
      }
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

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
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
 * Atomic flush of SQLite database to disk with automated backup rotation
 * 1. Writes to temporary file on same filesystem
 * 2. fsyncs to physical disk
 * 3. Rotates existing database to backup
 * 4. Atomically renames temporary file to DB_PATH (POSIX atomic rename)
 */
function persistToDisk(database: SqlJsDatabase) {
  const tempPath = path.join(
    DATA_DIR,
    `mediastack.sqlite.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`
  );

  try {
    const data = database.export();
    const buffer = Buffer.from(data);

    // 1. Write to temporary file with explicit fsync
    const fd = fs.openSync(tempPath, 'w');
    try {
      fs.writeSync(fd, buffer, 0, buffer.length, 0);
      fs.fsyncSync(fd); // Force disk flush to physical storage
    } finally {
      fs.closeSync(fd);
    }

    // 2. If existing DB file exists and has content, create backup before atomic replace
    if (fs.existsSync(DB_PATH)) {
      try {
        // Update latest .bak
        fs.copyFileSync(DB_PATH, LATEST_BAK_PATH);

        // Create rolling timestamped backup
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const snapshotPath = path.join(BACKUPS_DIR, `mediastack-${timestamp}.sqlite`);
        fs.copyFileSync(DB_PATH, snapshotPath);

        // Prune old rolling backups
        pruneOldBackups();
      } catch (backupErr) {
        console.warn('Non-fatal warning creating SQLite backup:', backupErr);
      }
    }

    // 3. Atomically replace the database file (guaranteed atomic on POSIX/Linux)
    fs.renameSync(tempPath, DB_PATH);
  } catch (err) {
    console.error('Error during atomic SQLite persistence:', err);
    // Clean up temp file on failure
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (_e) {}
    }
    throw err;
  }
}

/**
 * Keep only the latest MAX_ROLLING_BACKUPS files in data/backups/
 */
function pruneOldBackups() {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) return;
    const files = fs
      .readdirSync(BACKUPS_DIR)
      .filter((f) => f.startsWith('mediastack-') && f.endsWith('.sqlite'))
      .map((f) => ({
        name: f,
        path: path.join(BACKUPS_DIR, f),
        time: fs.statSync(path.join(BACKUPS_DIR, f)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > MAX_ROLLING_BACKUPS) {
      for (let i = MAX_ROLLING_BACKUPS; i < files.length; i++) {
        fs.unlinkSync(files[i].path);
      }
    }
  } catch (err) {
    console.warn('Error pruning old database backups:', err);
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
    demoMode: false,
    seerr: {
      url: obj.seerr_url ?? '',
      apiKey: obj.seerr_api_key ?? '',
      enabled: Boolean(obj.seerr_enabled ?? true),
    },
    radarr: {
      url: obj.radarr_url ?? '',
      apiKey: obj.radarr_api_key ?? '',
      enabled: Boolean(obj.radarr_enabled ?? true),
    },
    sonarr: {
      url: obj.sonarr_url ?? '',
      apiKey: obj.sonarr_api_key ?? '',
      enabled: Boolean(obj.sonarr_enabled ?? true),
    },
    plex: {
      url: obj.plex_url ?? '',
      apiKey: obj.plex_api_key ?? '',
      enabled: Boolean(obj.plex_enabled ?? true),
    },
    qbittorrent: {
      url: obj.qbt_url ?? '',
      username: obj.qbt_username ?? '',
      apiKey: obj.qbt_api_key ?? '',
      enabled: Boolean(obj.qbt_enabled ?? true),
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
  let backupSizeBytes = 0;
  let backupCount = 0;
  let lastBackupTime: string | null = null;

  try {
    if (fs.existsSync(DB_PATH)) {
      sizeBytes = fs.statSync(DB_PATH).size;
    }
  } catch (_e) {}

  try {
    if (fs.existsSync(LATEST_BAK_PATH)) {
      const stat = fs.statSync(LATEST_BAK_PATH);
      backupSizeBytes = stat.size;
      lastBackupTime = stat.mtime.toISOString();
    }
    if (fs.existsSync(BACKUPS_DIR)) {
      backupCount = fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.sqlite')).length;
    }
  } catch (_e) {}

  return {
    engine: 'SQLite 3 (WASM & Atomic fsync+rename)',
    databaseFile: 'data/mediastack.sqlite',
    databasePath: DB_PATH,
    backupFile: 'data/mediastack.sqlite.bak',
    backupDir: 'data/backups',
    sizeBytes,
    backupSizeBytes,
    backupCount,
    lastBackupTime,
    atomicWriteStrategy: 'POSIX fsync + rename(2)',
    status: 'online',
    isPersistent: true,
  };
}

/**
 * Password hashing utility using scrypt
 */
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, generatedSalt, 64).toString('hex');
  return { hash, salt: generatedSalt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(hash, 'hex'));
}

/**
 * Auth: Check if any admin user exists
 */
export async function hasAdminUser(): Promise<boolean> {
  const database = await initDatabase();
  const res = database.exec('SELECT COUNT(*) as count FROM users');
  if (!res.length || !res[0].values.length) return false;
  const count = res[0].values[0][0] as number;
  return count > 0;
}

/**
 * Auth: Setup initial admin account
 */
export async function setupInitialAdmin(username: string, password: string): Promise<{ success: boolean; token?: string; error?: string }> {
  const database = await initDatabase();
  const hasAdmin = await hasAdminUser();
  if (hasAdmin) {
    return { success: false, error: 'Admin user is already configured.' };
  }

  const trimmedUser = username.trim();
  if (!trimmedUser || trimmedUser.length < 3) {
    return { success: false, error: 'Username must be at least 3 characters.' };
  }
  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters.' };
  }

  const { hash, salt } = hashPassword(password);
  const now = new Date().toISOString();

  database.run(
    'INSERT INTO users (username, password_hash, salt, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [trimmedUser, hash, salt, 'admin', now, now]
  );

  // Get newly created user ID
  const userRes = database.exec('SELECT id FROM users WHERE username = ?', [trimmedUser]);
  const userId = userRes[0].values[0][0] as number;

  // Create session
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  database.run(
    'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
    [token, userId, now, expiresAt]
  );

  persistToDisk(database);
  return { success: true, token };
}

/**
 * Auth: Login with username & password
 */
export async function loginUser(username: string, password: string): Promise<{ success: boolean; token?: string; error?: string }> {
  const database = await initDatabase();
  const trimmedUser = username.trim();

  const res = database.exec('SELECT id, password_hash, salt FROM users WHERE username = ?', [trimmedUser]);
  if (!res.length || !res[0].values.length) {
    return { success: false, error: 'Invalid username or password' };
  }

  const [userId, hash, salt] = res[0].values[0] as [number, string, string];
  const isValid = verifyPassword(password, hash, salt);
  if (!isValid) {
    return { success: false, error: 'Invalid username or password' };
  }

  // Create session token
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  database.run(
    'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
    [token, userId, now, expiresAt]
  );

  persistToDisk(database);
  return { success: true, token };
}

/**
 * Auth: Validate session token
 */
export async function validateSession(token: string): Promise<{ valid: boolean; user?: { id: number; username: string; role: string } }> {
  if (!token) return { valid: false };
  const database = await initDatabase();
  const now = new Date().toISOString();

  const res = database.exec(`
    SELECT u.id, u.username, u.role, s.expires_at 
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > ?
  `, [token, now]);

  if (!res.length || !res[0].values.length) {
    return { valid: false };
  }

  const [id, username, role] = res[0].values[0] as [number, string, string];
  return {
    valid: true,
    user: { id, username, role }
  };
}

/**
 * Auth: Destroy session (Logout)
 */
export async function logoutSession(token: string): Promise<boolean> {
  if (!token) return true;
  const database = await initDatabase();
  database.run('DELETE FROM sessions WHERE token = ?', [token]);
  persistToDisk(database);
  return true;
}

/**
 * Auth: Change user password
 */
export async function changeUserPassword(userId: number, newPass: string): Promise<boolean> {
  const database = await initDatabase();
  const { hash, salt } = hashPassword(newPass);
  const now = new Date().toISOString();
  database.run('UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?', [hash, salt, now, userId]);
  persistToDisk(database);
  return true;
}
