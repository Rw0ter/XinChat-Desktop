import express from 'express';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';
import { findUserByToken, readUsers, writeUsers } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const IMAGE_DIR = path.join(DATA_DIR, 'images');
const USERFILE_DIR = path.join(DATA_DIR, 'userfile');
const USERFILE_INDEX_PATH = path.join(USERFILE_DIR, 'index.json');
const CHAT_JSON_PATH = path.join(DATA_DIR, 'chat.json');
const DB_PATH = path.join(DATA_DIR, 'chat.sqlite');
const DB_TMP_PATH = path.join(DATA_DIR, 'chat.sqlite.tmp');

const router = express.Router();
const ALLOWED_TYPES = new Set(['image', 'video', 'voice', 'text', 'gif', 'file', 'card', 'call']);
const ALLOWED_TARGET_TYPES = new Set(['private', 'group']);
const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 50;
const FLUSH_INTERVAL_MS = 250;
let chatNotifier = null;

const isValidType = (value) => typeof value === 'string' && ALLOWED_TYPES.has(value);
const isValidTargetType = (value) =>
  typeof value === 'string' && ALLOWED_TARGET_TYPES.has(value);
const DATA_IMAGE_RE = /^data:(image\/(png|jpe?g|gif|webp));base64,/i;
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
const DATA_URL_RE = /^data:([^;]+);base64,/i;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const FILE_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
let lastCleanupAt = 0;

let sqlModule = null;
let db = null;
let flushTimer = null;
let flushInFlight = false;
let pendingFlush = false;

const parseImageDataUrl = (value) => {
  if (typeof value !== 'string') return null;
  const match = value.match(DATA_IMAGE_RE);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const ext = match[2].toLowerCase() === 'jpeg' ? 'jpg' : match[2].toLowerCase();
  const base64 = value.slice(match[0].length);
  if (!base64) return null;
  try {
    const buffer = Buffer.from(base64, 'base64');
    if (!buffer.length) return null;
    return { buffer, mime, ext };
  } catch {
    return null;
  }
};

const parseDataUrl = (value) => {
  if (typeof value !== 'string') return null;
  const match = value.match(DATA_URL_RE);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const base64 = value.slice(match[0].length);
  if (!base64) return null;
  try {
    const buffer = Buffer.from(base64, 'base64');
    if (!buffer.length) return null;
    return { buffer, mime };
  } catch {
    return null;
  }
};

const fileExists = async (targetPath) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const readUserfileIndex = async () => {
  try {
    const raw = await fs.readFile(USERFILE_INDEX_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeUserfileIndex = async (index) => {
  await fs.mkdir(USERFILE_DIR, { recursive: true });
  await fs.writeFile(USERFILE_INDEX_PATH, JSON.stringify(index || {}, null, 2));
};

const pruneUserfileIndex = async (index) => {
  const next = { ...(index || {}) };
  const entries = Object.entries(next);
  for (const [hash, entry] of entries) {
    const entryPath = entry?.path;
    if (!entryPath || !(await fileExists(entryPath))) {
      delete next[hash];
    }
  }
  if (entries.length !== Object.keys(next).length) {
    await writeUserfileIndex(next);
  }
  return next;
};

const sanitizeFilename = (value) => {
  const base = path.basename(String(value || '').trim());
  if (!base) return '';
  return base.replace(/[\\/:*?"<>|]+/g, '_');
};

const guessExtension = (name, mime) => {
  const extFromName = path.extname(name || '').slice(1).toLowerCase();
  if (extFromName) return extFromName;
  const map = {
    'application/pdf': 'pdf',
    'application/zip': 'zip',
    'application/x-zip-compressed': 'zip',
    'application/json': 'json',
    'text/plain': 'txt',
  };
  return map[mime] || 'bin';
};

const cleanupUserFiles = async () => {
  const now = Date.now();
  await fs.mkdir(USERFILE_DIR, { recursive: true });
  const entries = await fs.readdir(USERFILE_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const userDir = path.join(USERFILE_DIR, entry.name);
    const files = await fs.readdir(userDir, { withFileTypes: true });
    for (const file of files) {
      if (!file.isFile()) continue;
      const filePath = path.join(userDir, file.name);
      try {
        const stat = await fs.stat(filePath);
        if (now - stat.mtimeMs > FILE_TTL_MS) {
          await fs.unlink(filePath);
        }
      } catch {}
    }
    const remaining = await fs.readdir(userDir).catch(() => []);
    if (remaining.length === 0) {
      await fs.rmdir(userDir).catch(() => {});
    }
  }
  const index = await readUserfileIndex();
  await pruneUserfileIndex(index);
};

const maybeCleanupUserFiles = async () => {
  const now = Date.now();
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;
  await cleanupUserFiles();
};

const buildFileMeta = (name, size, mime) => {
  const uploadedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + FILE_TTL_MS).toISOString();
  return {
    name,
    size,
    mime,
    uploadedAt,
    expiresAt,
  };
};

const storeUserFileBuffer = async (buffer, senderUid, name, mime) => {
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const safeBase = sanitizeFilename(name) || 'file';
  const indexRaw = await readUserfileIndex();
  const index = await pruneUserfileIndex(indexRaw);
  const existingPath = index[hash]?.path && (await fileExists(index[hash].path))
    ? index[hash].path
    : null;
  const ext = index[hash]?.ext || guessExtension(safeBase, mime);
  const userDir = path.join(USERFILE_DIR, String(senderUid));
  await fs.mkdir(userDir, { recursive: true });
  const filename = `${hash}.${ext}`;
  const filePath = path.join(userDir, filename);
  if (!(await fileExists(filePath))) {
    if (existingPath) {
      await fs.copyFile(existingPath, filePath);
    } else {
      await fs.writeFile(filePath, buffer);
    }
  }
  index[hash] = {
    path: filePath,
    ext,
    size: buffer.length,
    updatedAt: new Date().toISOString(),
  };
  await writeUserfileIndex(index);
  return { filename, hash };
};

const storeUserFileFromPath = async (sourcePath, senderUid, name, mime) => {
  const stat = await fs.stat(sourcePath);
  if (stat.size > MAX_FILE_BYTES) {
    throw new Error('File too large.');
  }
  const buffer = await fs.readFile(sourcePath);
  return storeUserFileBuffer(buffer, senderUid, name, mime);
};

const storeImageBuffer = async (buffer, ext) => {
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const filename = `${hash}.${ext}`;
  const filePath = path.join(IMAGE_DIR, filename);
  await fs.mkdir(IMAGE_DIR, { recursive: true });
  try {
    await fs.writeFile(filePath, buffer, { flag: 'wx' });
  } catch (error) {
    if (error?.code !== 'EEXIST') {
      throw error;
    }
  }
  return { filename, hash };
};

const getImageExtFromMime = (mime) => {
  const map = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  return map[String(mime || '').toLowerCase()] || '';
};

const readStreamToFile = (req, tempPath, maxBytes) =>
  new Promise((resolve, reject) => {
    let size = 0;
    let finished = false;
    const hash = crypto.createHash('sha256');
    const out = createWriteStream(tempPath);
    const cleanup = (error) => {
      if (finished) return;
      finished = true;
      out.destroy();
      fs.unlink(tempPath).catch(() => {});
      reject(error);
    };
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        req.destroy();
        cleanup(new Error('File too large.'));
        return;
      }
      hash.update(chunk);
    });
    req.on('error', cleanup);
    out.on('error', cleanup);
    out.on('finish', () => {
      if (finished) return;
      finished = true;
      resolve({ size, hash: hash.digest('hex') });
    });
    req.pipe(out);
  });

const findImageUrlByHash = async (hash, baseUrl) => {
  if (!hash) return '';
  for (const ext of IMAGE_EXTS) {
    const filename = `${hash}.${ext}`;
    const filePath = path.join(IMAGE_DIR, filename);
    if (await fileExists(filePath)) {
      return `${baseUrl}/uploads/images/${filename}`;
    }
  }
  return '';
};

const getSqlModule = async () => {
  if (sqlModule) {
    return sqlModule;
  }
  sqlModule = await initSqlJs({
    locateFile: (file) => path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', file),
  });
  return sqlModule;
};

const openDb = async () => {
  if (db) {
    return db;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  const SQL = await getSqlModule();
  try {
    const file = await fs.readFile(DB_PATH);
    db = new SQL.Database(new Uint8Array(file));
  } catch {
    db = new SQL.Database();
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      senderUid INTEGER NOT NULL,
      targetUid INTEGER NOT NULL,
      targetType TEXT NOT NULL,
      data TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      createdAtMs INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_messages_private
      ON messages (targetType, senderUid, targetUid, createdAtMs);
    CREATE INDEX IF NOT EXISTS idx_messages_group
      ON messages (targetType, targetUid, createdAtMs);
  `);
  return db;
};

const flushDb = async () => {
  if (!db) {
    return;
  }
  if (flushInFlight) {
    pendingFlush = true;
    return;
  }
  flushInFlight = true;
  try {
    const data = db.export();
    await fs.writeFile(DB_TMP_PATH, Buffer.from(data));
    await fs.rename(DB_TMP_PATH, DB_PATH);
  } finally {
    flushInFlight = false;
    if (pendingFlush) {
      pendingFlush = false;
      await flushDb();
    }
  }
};

const scheduleFlush = () => {
  if (flushTimer) {
    return;
  }
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    await flushDb();
  }, FLUSH_INTERVAL_MS);
};

const setChatNotifier = (notifier) => {
  chatNotifier = typeof notifier === 'function' ? notifier : null;
};

const migrateChatJson = async () => {
  const database = await openDb();
  const countStmt = database.prepare('SELECT COUNT(1) as count FROM messages');
  countStmt.step();
  const existing = countStmt.getAsObject();
  countStmt.free();
  if (existing.count > 0) {
    return;
  }
  try {
    await fs.access(CHAT_JSON_PATH);
  } catch {
    return;
  }
  try {
    const raw = await fs.readFile(CHAT_JSON_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return;
    }
    const insert = database.prepare(`
      INSERT OR IGNORE INTO messages (
        id, type, senderUid, targetUid, targetType, data, createdAt, createdAtMs
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const rows = parsed
      .map((entry) => {
        const createdAt =
          typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString();
        const createdAtMs = Number.isFinite(Date.parse(createdAt))
          ? Date.parse(createdAt)
          : Date.now();
        const data =
          entry && entry.data && typeof entry.data === 'object'
            ? JSON.stringify(entry.data)
            : JSON.stringify({});
        return {
          id: entry.id || crypto.randomUUID(),
          type: entry.type,
          senderUid: Number(entry.senderUid),
          targetUid: Number(entry.targetUid),
          targetType: entry.targetType,
          data,
          createdAt,
          createdAtMs,
        };
      })
      .filter(
        (row) =>
          isValidType(row.type) &&
          isValidTargetType(row.targetType) &&
          Number.isInteger(row.senderUid) &&
          Number.isInteger(row.targetUid)
      );
    if (!rows.length) {
      insert.free();
      return;
    }
    database.run('BEGIN');
    for (const row of rows) {
      insert.run([
        row.id,
        row.type,
        row.senderUid,
        row.targetUid,
        row.targetType,
        row.data,
        row.createdAt,
        row.createdAtMs,
      ]);
    }
    database.run('COMMIT');
    insert.free();
    scheduleFlush();
  } catch (error) {
    console.warn('Chat migration skipped:', error);
  }
};

const ensureChatStorage = async () => {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await openDb();
  await migrateChatJson();
  await maybeCleanupUserFiles();
};

const extractToken = (req) => {
  const header = req.headers.authorization || '';
  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  return req.body?.token || req.query?.token || '';
};

const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ success: false, message: 'Missing token.' });
      return;
    }

    const users = await readUsers();
    const found = findUserByToken(users, token);
    if (found.touched) {
      await writeUsers(users);
    }
    if (!found.user) {
      res.status(401).json({ success: false, message: 'Invalid token.' });
      return;
    }

    req.auth = { user: found.user, userIndex: found.userIndex, users };
    next();
  } catch (error) {
    console.error('Chat authenticate error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const toMessage = (row) => {
  let data = {};
  try {
    data = JSON.parse(row.data);
  } catch {
    data = {};
  }
  return {
    id: row.id,
    type: row.type,
    senderUid: row.senderUid,
    targetUid: row.targetUid,
    targetType: row.targetType,
    data,
    createdAt: row.createdAt,
  };
};

router.post('/send', authenticate, async (req, res) => {
  try {
    await ensureChatStorage();
    const body = req.body || {};
    if (!isValidType(body.type)) {
      res.status(400).json({ success: false, message: 'Invalid message type.' });
      return;
    }
    if (!isValidTargetType(body.targetType)) {
      res.status(400).json({ success: false, message: 'Invalid target type.' });
      return;
    }

    const senderUid = Number(body.senderUid);
    const targetUid = Number(body.targetUid);
    if (!Number.isInteger(senderUid) || !Number.isInteger(targetUid)) {
      res.status(400).json({ success: false, message: 'Invalid sender/target uid.' });
      return;
    }

    const { user, users } = req.auth;
    if (user.uid !== senderUid) {
      res.status(403).json({ success: false, message: 'Sender mismatch.' });
      return;
    }

    const targetUser = users.find((item) => item.uid === targetUid);
    if (!targetUser) {
      res.status(404).json({ success: false, message: 'Target user not found.' });
      return;
    }

    const isMutualFriend =
      Array.isArray(user.friends) &&
      user.friends.includes(targetUid) &&
      Array.isArray(targetUser.friends) &&
      targetUser.friends.includes(user.uid);
    if (!isMutualFriend) {
      res.status(403).json({ success: false, message: 'Not mutual friends.' });
      return;
    }

    const { type, senderUid: _, targetUid: __, targetType, ...data } = body;
    const messageData = { ...data };
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    if (type === 'image') {
      const hashUrlMap = new Map();
      const hashData =
        messageData.hashData && typeof messageData.hashData === 'object'
          ? messageData.hashData
          : null;
      const normalizeImageValue = async (value) => {
        if (typeof value === 'string') {
          const parsed = parseImageDataUrl(value);
          if (!parsed) return value;
          const stored = await storeImageBuffer(parsed.buffer, parsed.ext);
          const url = `${baseUrl}/uploads/images/${stored.filename}`;
          if (stored.hash) {
            hashUrlMap.set(stored.hash, url);
          }
          return url;
        }
        if (!value || typeof value !== 'object') return '';
        const url = typeof value.url === 'string' ? value.url.trim() : '';
        if (url) return url;
        const dataUrl =
          typeof value.dataUrl === 'string' ? value.dataUrl.trim() : '';
        if (dataUrl) {
          const parsed = parseImageDataUrl(dataUrl);
          if (!parsed) return '';
          const stored = await storeImageBuffer(parsed.buffer, parsed.ext);
          const storedUrl = `${baseUrl}/uploads/images/${stored.filename}`;
          if (stored.hash) {
            hashUrlMap.set(stored.hash, storedUrl);
          }
          return storedUrl;
        }
        const hash = typeof value.hash === 'string' ? value.hash.trim() : '';
        if (hash && hashUrlMap.has(hash)) {
          return hashUrlMap.get(hash);
        }
        if (hash && hashData && typeof hashData[hash] === 'string') {
          const parsed = parseImageDataUrl(hashData[hash].trim());
          if (parsed) {
            const stored = await storeImageBuffer(parsed.buffer, parsed.ext);
            const storedUrl = `${baseUrl}/uploads/images/${stored.filename}`;
            if (stored.hash) {
              hashUrlMap.set(stored.hash, storedUrl);
            }
            return storedUrl;
          }
        }
        const foundUrl = await findImageUrlByHash(hash, baseUrl);
        if (hash && foundUrl) {
          hashUrlMap.set(hash, foundUrl);
        }
        return foundUrl;
      };
      if (Array.isArray(messageData.urls)) {
        const urls = [];
        for (const item of messageData.urls) {
          const normalized = await normalizeImageValue(item);
          if (typeof normalized === 'string' && normalized.trim()) {
            urls.push(normalized);
          }
        }
        messageData.urls = urls;
      } else {
        const rawUrl =
          typeof messageData.url === 'string' ? messageData.url.trim() : '';
        const fallbackUrl =
          !rawUrl && typeof messageData.content === 'string'
            ? messageData.content.trim()
            : '';
        const candidateUrl = rawUrl || fallbackUrl;
        if (candidateUrl) {
          const normalized = await normalizeImageValue(candidateUrl);
          messageData.url = normalized;
          if (!rawUrl && messageData.content === candidateUrl) {
            delete messageData.content;
          }
        }
      }
    }
    if (type === 'file') {
      const rawDataUrl =
        typeof messageData.dataUrl === 'string' ? messageData.dataUrl.trim() : '';
      const rawUrl =
        typeof messageData.url === 'string' ? messageData.url.trim() : '';
      const safeName = sanitizeFilename(messageData.name || 'file') || 'file';
      let mime =
        typeof messageData.mime === 'string' && messageData.mime.trim()
          ? messageData.mime.trim()
          : 'application/octet-stream';
      let filename = '';
      let size = 0;

      if (rawDataUrl) {
        const parsed = parseDataUrl(rawDataUrl);
        if (!parsed) {
          res.status(400).json({ success: false, message: 'Invalid file data.' });
          return;
        }
        if (parsed.buffer.length > MAX_FILE_BYTES) {
          res.status(400).json({ success: false, message: 'File too large.' });
          return;
        }
        mime = parsed.mime || mime;
        const stored = await storeUserFileBuffer(
          parsed.buffer,
          senderUid,
          safeName,
          mime
        );
        filename = stored.filename;
        size = parsed.buffer.length;
      } else if (rawUrl) {
        let parsedUrl = null;
        try {
          parsedUrl = new URL(rawUrl, baseUrl);
        } catch {
          parsedUrl = null;
        }
        if (!parsedUrl || !parsedUrl.pathname.startsWith('/uploads/userfile/')) {
          res.status(400).json({ success: false, message: 'Invalid file url.' });
          return;
        }
        const relativePath = decodeURIComponent(
          parsedUrl.pathname.replace('/uploads/userfile/', '')
        );
        const sourcePath = path.join(USERFILE_DIR, relativePath);
        if (!(await fileExists(sourcePath))) {
          res.status(404).json({ success: false, message: 'Source file missing.' });
          return;
        }
        const stat = await fs.stat(sourcePath);
        size = stat.size;
        if (size > MAX_FILE_BYTES) {
          res.status(400).json({ success: false, message: 'File too large.' });
          return;
        }
        const stored = await storeUserFileFromPath(
          sourcePath,
          senderUid,
          safeName,
          mime
        );
        filename = stored.filename;
      } else {
        res.status(400).json({ success: false, message: 'Missing file data.' });
        return;
      }

      const meta = buildFileMeta(safeName, size, mime);
      messageData.name = meta.name;
      messageData.size = meta.size;
      messageData.mime = meta.mime;
      messageData.uploadedAt = meta.uploadedAt;
      messageData.expiresAt = meta.expiresAt;
      messageData.url = `${baseUrl}/uploads/userfile/${senderUid}/${filename}`;
      delete messageData.dataUrl;
    }
    const createdAt = new Date().toISOString();
    const createdAtMs = Date.now();
    const entry = {
      id: crypto.randomUUID(),
      type,
      senderUid,
      targetUid,
      targetType,
      data: messageData,
      createdAt,
    };

    const database = await openDb();
    const stmt = database.prepare(`
      INSERT INTO messages (
        id, type, senderUid, targetUid, targetType, data, createdAt, createdAtMs
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run([
      entry.id,
      entry.type,
      entry.senderUid,
      entry.targetUid,
      entry.targetType,
      JSON.stringify(entry.data || {}),
      entry.createdAt,
      createdAtMs,
    ]);
    stmt.free();
    scheduleFlush();
    if (chatNotifier) {
      chatNotifier(entry);
    }
    res.json({ success: true, data: entry });
  } catch (error) {
    console.error('Chat send error:', error);
    res.status(500).json({ success: false, message: 'Chat send failed.' });
  }
});

router.post('/upload/image', authenticate, async (req, res) => {
  try {
    await fs.mkdir(IMAGE_DIR, { recursive: true });
    const headerExt = String(req.headers['x-file-ext'] || '').toLowerCase();
    const mime = String(req.headers['content-type'] || '').toLowerCase();
    let ext = headerExt || getImageExtFromMime(mime);
    if (!IMAGE_EXTS.includes(ext)) {
      ext = 'png';
    }
    const tempPath = path.join(
      IMAGE_DIR,
      `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`
    );
    const { size, hash } = await readStreamToFile(req, tempPath, MAX_FILE_BYTES);
    const filename = `${hash}.${ext}`;
    const finalPath = path.join(IMAGE_DIR, filename);
    if (await fileExists(finalPath)) {
      await fs.unlink(tempPath).catch(() => {});
    } else {
      try {
        await fs.rename(tempPath, finalPath);
      } catch (error) {
        if (error?.code === 'EEXIST') {
          await fs.unlink(tempPath).catch(() => {});
        } else {
          throw error;
        }
      }
    }
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({
      success: true,
      data: { url: `${baseUrl}/uploads/images/${filename}`, hash, size },
    });
  } catch (error) {
    console.error('Image upload error:', error);
    const message = error?.message === 'File too large.' ? 'File too large.' : 'Upload failed.';
    res.status(400).json({ success: false, message });
  }
});

router.post('/upload/file', authenticate, async (req, res) => {
  try {
    await fs.mkdir(USERFILE_DIR, { recursive: true });
    const rawName = String(req.headers['x-file-name'] || '').trim();
    const rawType = String(req.headers['x-file-type'] || '').trim();
    const safeName = sanitizeFilename(rawName || 'file') || 'file';
    const mime = rawType || 'application/octet-stream';
    const ext = guessExtension(safeName, mime);
    const tempPath = path.join(
      USERFILE_DIR,
      `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`
    );
    const { size, hash } = await readStreamToFile(req, tempPath, MAX_FILE_BYTES);
    const indexRaw = await readUserfileIndex();
    const index = await pruneUserfileIndex(indexRaw);
    const existingPath = index[hash]?.path && (await fileExists(index[hash].path))
      ? index[hash].path
      : null;
    const userDir = path.join(USERFILE_DIR, String(req.auth.user.uid));
    await fs.mkdir(userDir, { recursive: true });
    const filename = `${hash}.${ext}`;
    const finalPath = path.join(userDir, filename);
    if (await fileExists(finalPath)) {
      await fs.unlink(tempPath).catch(() => {});
    } else if (existingPath) {
      await fs.copyFile(existingPath, finalPath);
      await fs.unlink(tempPath).catch(() => {});
    } else {
      try {
        await fs.rename(tempPath, finalPath);
      } catch (error) {
        if (error?.code === 'EEXIST') {
          await fs.unlink(tempPath).catch(() => {});
        } else {
          throw error;
        }
      }
    }
    index[hash] = {
      path: finalPath,
      ext,
      size,
      updatedAt: new Date().toISOString(),
    };
    await writeUserfileIndex(index);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({
      success: true,
      data: {
        url: `${baseUrl}/uploads/userfile/${req.auth.user.uid}/${filename}`,
        hash,
        size,
        name: safeName,
        mime,
      },
    });
  } catch (error) {
    console.error('File upload error:', error);
    const message = error?.message === 'File too large.' ? 'File too large.' : 'Upload failed.';
    res.status(400).json({ success: false, message });
  }
});

router.get('/get', authenticate, async (req, res) => {
  try {
    await ensureChatStorage();
    const payload = {
      ...req.query,
      ...(req.body || {}),
    };
    const type = payload.type;
    const targetType = payload.targetType;
    const targetUid = Number(payload.targetUid);
    const sinceId = typeof payload.sinceId === 'string' ? payload.sinceId.trim() : '';
    const limitRaw = Number(payload.limit);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 0), MAX_LIMIT) : 0;
    const beforeId = typeof payload.beforeId === 'string' ? payload.beforeId.trim() : '';
    const beforeTs = payload.beforeTs;
    let sinceMs = 0;
    let beforeMs = 0;

    if (!isValidTargetType(targetType)) {
      res.status(400).json({ success: false, message: 'Invalid target type.' });
      return;
    }
    if (!Number.isInteger(targetUid)) {
      res.status(400).json({ success: false, message: 'Invalid target uid.' });
      return;
    }
    if (type && !isValidType(type)) {
      res.status(400).json({ success: false, message: 'Invalid message type.' });
      return;
    }

    if (payload.sinceTs) {
      const parsed = Number(payload.sinceTs);
      if (Number.isFinite(parsed)) {
        sinceMs = parsed;
      } else if (typeof payload.sinceTs === 'string') {
        const parsedDate = Date.parse(payload.sinceTs);
        if (Number.isFinite(parsedDate)) {
          sinceMs = parsedDate;
        }
      }
    }
    if (beforeTs) {
      const parsed = Number(beforeTs);
      if (Number.isFinite(parsed)) {
        beforeMs = parsed;
      } else if (typeof beforeTs === 'string') {
        const parsedDate = Date.parse(beforeTs);
        if (Number.isFinite(parsedDate)) {
          beforeMs = parsedDate;
        }
      }
    }

    const { user, users } = req.auth;
    const targetUser = users.find((item) => item.uid === targetUid);
    if (!targetUser) {
      res.status(404).json({ success: false, message: 'Target user not found.' });
      return;
    }
    const isMutualFriend =
      Array.isArray(user.friends) &&
      user.friends.includes(targetUid) &&
      Array.isArray(targetUser.friends) &&
      targetUser.friends.includes(user.uid);
    if (!isMutualFriend) {
      res.status(403).json({ success: false, message: 'Not mutual friends.' });
      return;
    }

    const database = await openDb();
    if (sinceId) {
      const sinceStmt = database.prepare('SELECT createdAtMs FROM messages WHERE id = ?');
      sinceStmt.bind([sinceId]);
      if (sinceStmt.step()) {
        const row = sinceStmt.getAsObject();
        if (row && Number.isFinite(row.createdAtMs)) {
          sinceMs = Math.max(sinceMs, row.createdAtMs);
        }
      }
      sinceStmt.free();
    }
    if (beforeId) {
      const beforeStmt = database.prepare('SELECT createdAtMs FROM messages WHERE id = ?');
      beforeStmt.bind([beforeId]);
      if (beforeStmt.step()) {
        const row = beforeStmt.getAsObject();
        if (row && Number.isFinite(row.createdAtMs)) {
          beforeMs = row.createdAtMs;
        }
      }
      beforeStmt.free();
    }

    const params = [targetType];
    let sql =
      'SELECT id, type, senderUid, targetUid, targetType, data, createdAt, createdAtMs FROM messages WHERE targetType = ?';

    if (targetType === 'private') {
      sql += ' AND ((senderUid = ? AND targetUid = ?) OR (senderUid = ? AND targetUid = ?))';
      params.push(user.uid, targetUid, targetUid, user.uid);
    } else {
      sql += ' AND targetUid = ?';
      params.push(targetUid);
    }

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    if (sinceMs > 0) {
      sql += ' AND createdAtMs > ?';
      params.push(sinceMs);
    }
    if (beforeMs > 0) {
      sql += ' AND createdAtMs < ?';
      params.push(beforeMs);
    }
    const effectiveLimit = limit > 0 ? limit : DEFAULT_LIMIT;
    const order = sinceMs > 0 ? 'ASC' : 'DESC';
    sql += ` ORDER BY createdAtMs ${order}`;
    if (effectiveLimit > 0) {
      sql += ' LIMIT ?';
      params.push(effectiveLimit);
    }

    const stmt = database.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    if (order === 'DESC') {
      rows.reverse();
    }
    const data = rows.map(toMessage);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Chat get error:', error);
    res.status(500).json({ success: false, message: 'Chat fetch failed.' });
  }
});

router.delete('/del', async (req, res) => {
  try {
    await ensureChatStorage();
    const { id } = req.body || {};
    if (typeof id !== 'string' || id.trim() === '') {
      res.status(400).json({ success: false, message: 'Missing message id.' });
      return;
    }

    const database = await openDb();
    const selectStmt = database.prepare(
      'SELECT id, type, senderUid, targetUid, targetType, data, createdAt, createdAtMs FROM messages WHERE id = ?'
    );
    selectStmt.bind([id]);
    if (!selectStmt.step()) {
      selectStmt.free();
      res.status(404).json({ success: false, message: 'Message not found.' });
      return;
    }
    const existing = selectStmt.getAsObject();
    selectStmt.free();

    const delStmt = database.prepare('DELETE FROM messages WHERE id = ?');
    delStmt.run([id]);
    delStmt.free();
    scheduleFlush();
    res.json({ success: true, data: toMessage(existing) });
  } catch (error) {
    console.error('Chat delete error:', error);
    res.status(500).json({ success: false, message: 'Chat delete failed.' });
  }
});

export { ensureChatStorage, setChatNotifier };
export default router;
