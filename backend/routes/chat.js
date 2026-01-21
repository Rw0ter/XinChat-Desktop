import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';
import { findUserByToken, readUsers, writeUsers } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const IMAGE_DIR = path.join(DATA_DIR, 'images');
const CHAT_JSON_PATH = path.join(DATA_DIR, 'chat.json');
const DB_PATH = path.join(DATA_DIR, 'chat.sqlite');
const DB_TMP_PATH = path.join(DATA_DIR, 'chat.sqlite.tmp');

const router = express.Router();
const ALLOWED_TYPES = new Set(['image', 'video', 'voice', 'text', 'gif']);
const ALLOWED_TARGET_TYPES = new Set(['private', 'group']);
const MAX_LIMIT = 500;
const FLUSH_INTERVAL_MS = 250;
let chatNotifier = null;

const isValidType = (value) => typeof value === 'string' && ALLOWED_TYPES.has(value);
const isValidTargetType = (value) =>
  typeof value === 'string' && ALLOWED_TARGET_TYPES.has(value);
const DATA_IMAGE_RE = /^data:(image\/(png|jpe?g|gif|webp));base64,/i;

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
    if (type === 'image') {
      const rawUrl =
        typeof messageData.url === 'string' ? messageData.url.trim() : '';
      const fallbackUrl =
        !rawUrl && typeof messageData.content === 'string'
          ? messageData.content.trim()
          : '';
      const candidateUrl = rawUrl || fallbackUrl;
      const parsed = parseImageDataUrl(candidateUrl);
      if (parsed) {
        const { filename } = await storeImageBuffer(parsed.buffer, parsed.ext);
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        messageData.url = `${baseUrl}/uploads/images/${filename}`;
        if (!rawUrl && messageData.content === candidateUrl) {
          delete messageData.content;
        }
      }
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
    let sinceMs = 0;

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
    sql += ' ORDER BY createdAtMs ASC';
    if (limit > 0) {
      sql += ' LIMIT ?';
      params.push(limit);
    }

    const stmt = database.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
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
