import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { readUsers, writeUsers } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const CHAT_PATH = path.join(DATA_DIR, 'chat.json');

const router = express.Router();
const ALLOWED_TYPES = new Set(['image', 'video', 'voice', 'text', 'gif']);
const ALLOWED_TARGET_TYPES = new Set(['private', 'group']);

const ensureChatStorage = async () => {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(CHAT_PATH);
  } catch {
    await fs.writeFile(CHAT_PATH, '[]', 'utf-8');
  }
};

const readMessages = async () => {
  await ensureChatStorage();
  const raw = await fs.readFile(CHAT_PATH, 'utf-8');
  return JSON.parse(raw);
};

const writeMessages = async (messages) => {
  await ensureChatStorage();
  await fs.writeFile(CHAT_PATH, JSON.stringify(messages, null, 2), 'utf-8');
};

const isValidType = (value) => typeof value === 'string' && ALLOWED_TYPES.has(value);
const isValidTargetType = (value) =>
  typeof value === 'string' && ALLOWED_TARGET_TYPES.has(value);

const extractToken = (req) => {
  const header = req.headers.authorization || '';
  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  return req.body?.token || req.query?.token || '';
};

const authenticate = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ success: false, message: 'Missing token.' });
    return;
  }

  const users = await readUsers();
  const userIndex = users.findIndex((user) => user.token === token);
  if (userIndex === -1) {
    res.status(401).json({ success: false, message: 'Invalid token.' });
    return;
  }

  const user = users[userIndex];
  const expiresAt = user.tokenExpiresAt ? Date.parse(user.tokenExpiresAt) : 0;
  if (!expiresAt || Number.isNaN(expiresAt) || Date.now() > expiresAt) {
    users[userIndex] = {
      ...user,
      token: null,
      tokenExpiresAt: null,
    };
    await writeUsers(users);
    res.status(401).json({ success: false, message: 'Token expired.' });
    return;
  }

  req.auth = { user, userIndex, users };
  next();
};

router.post('/send', authenticate, async (req, res) => {
  try {
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
    const messages = await readMessages();
    const entry = {
      id: crypto.randomUUID(),
      type,
      senderUid,
      targetUid,
      targetType,
      data,
      createdAt: new Date().toISOString(),
    };
    messages.push(entry);
    await writeMessages(messages);
    res.json({ success: true, data: entry });
  } catch (error) {
    console.error('Chat send error:', error);
    res.status(500).json({ success: false, message: 'Chat send failed.' });
  }
});

router.get('/get', authenticate, async (req, res) => {
  try {
    const payload = {
      ...req.query,
      ...(req.body || {}),
    };
    const type = payload.type;
    const targetType = payload.targetType;
    const targetUid = Number(payload.targetUid);

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

    const messages = await readMessages();
    let filtered = messages.filter((item) => item.targetType === targetType);
    if (targetType === 'private') {
      filtered = filtered.filter(
        (item) =>
          (item.senderUid === user.uid && item.targetUid === targetUid) ||
          (item.senderUid === targetUid && item.targetUid === user.uid)
      );
    } else {
      filtered = filtered.filter((item) => item.targetUid === targetUid);
    }
    if (type) {
      filtered = filtered.filter((item) => item.type === type);
    }
    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('Chat get error:', error);
    res.status(500).json({ success: false, message: 'Chat fetch failed.' });
  }
});

router.delete('/del', async (req, res) => {
  try {
    const { id } = req.body || {};
    if (typeof id !== 'string' || id.trim() === '') {
      res.status(400).json({ success: false, message: 'Missing message id.' });
      return;
    }

    const messages = await readMessages();
    const index = messages.findIndex((item) => item.id === id);
    if (index === -1) {
      res.status(404).json({ success: false, message: 'Message not found.' });
      return;
    }

    const [removed] = messages.splice(index, 1);
    await writeMessages(messages);
    res.json({ success: true, data: removed });
  } catch (error) {
    console.error('Chat delete error:', error);
    res.status(500).json({ success: false, message: 'Chat delete failed.' });
  }
});

export { ensureChatStorage };
export default router;
