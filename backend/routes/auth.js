import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_PATH = path.join(DATA_DIR, 'users.json');

const router = express.Router();

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const loginAttempts = new Map();

const normalizeUsername = (value) => value.trim().toLowerCase();

const ensureStorage = async () => {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(USERS_PATH);
  } catch {
    await fs.writeFile(USERS_PATH, '[]', 'utf-8');
  }
};

const readUsers = async () => {
  await ensureStorage();
  const raw = await fs.readFile(USERS_PATH, 'utf-8');
  return JSON.parse(raw);
};

const writeUsers = async (users) => {
  await ensureStorage();
  await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2), 'utf-8');
};

const hashPassword = (password, salt = crypto.randomBytes(16)) => {
  const iterations = 120000;
  const keylen = 64;
  const digest = 'sha512';
  const hash = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest);
  return {
    passwordHash: hash.toString('hex'),
    salt: salt.toString('hex'),
    iterations,
    keylen,
    digest,
  };
};

const verifyPassword = (password, user) => {
  if (!user.passwordHash || !user.salt) {
    return false;
  }
  const hash = crypto.pbkdf2Sync(
    password,
    Buffer.from(user.salt, 'hex'),
    user.iterations || 120000,
    user.keylen || 64,
    user.digest || 'sha512'
  );
  const stored = Buffer.from(user.passwordHash, 'hex');
  if (stored.length !== hash.length) {
    return false;
  }
  return crypto.timingSafeEqual(stored, hash);
};

const recordLoginAttempt = (key) => {
  const now = Date.now();
  const entry = loginAttempts.get(key) || { count: 0, firstAttempt: now };
  if (now - entry.firstAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAttempt: now });
    return;
  }
  loginAttempts.set(key, { ...entry, count: entry.count + 1 });
};

const clearLoginAttempts = (key) => {
  loginAttempts.delete(key);
};

const isLockedOut = (key) => {
  const entry = loginAttempts.get(key);
  if (!entry) {
    return false;
  }
  if (Date.now() - entry.firstAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
};

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({ success: false, message: '请输入用户名和密码。' });
      return;
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 32) {
      res.status(400).json({ success: false, message: '用户名长度需为 3-32 位。' });
      return;
    }

    if (password.length < 8 || password.length > 64) {
      res.status(400).json({ success: false, message: '密码长度需为 8-64 位。' });
      return;
    }

    const users = await readUsers();
    const normalized = normalizeUsername(trimmedUsername);
    if (users.some((user) => user.username === normalized)) {
      res.status(409).json({ success: false, message: '用户名已存在。' });
      return;
    }

    const hashed = hashPassword(password);
    users.push({ username: normalized, ...hashed, createdAt: new Date().toISOString() });
    await writeUsers(users);
    res.json({ success: true, message: '注册成功，请登录。' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: '注册失败，请稍后重试。' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({ success: false, message: '请输入用户名和密码。' });
      return;
    }

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      res.status(400).json({ success: false, message: '请输入用户名和密码。' });
      return;
    }

    const normalized = normalizeUsername(trimmedUsername);
    const lockKey = `${req.ip}-${normalized}`;
    if (isLockedOut(lockKey)) {
      res.status(429).json({
        success: false,
        message: '尝试次数过多，请稍后再试。',
      });
      return;
    }

    const users = await readUsers();
    const userIndex = users.findIndex((user) => user.username === normalized);
    const user = users[userIndex];
    const isLegacy = user && user.password;
    const isMatch = user
      ? isLegacy
        ? user.password === password
        : verifyPassword(password, user)
      : false;

    if (!isMatch) {
      recordLoginAttempt(lockKey);
      res.status(401).json({ success: false, message: '用户名或密码错误。' });
      return;
    }

    clearLoginAttempts(lockKey);

    if (isLegacy) {
      const hashed = hashPassword(password);
      users[userIndex] = {
        username: normalized,
        ...hashed,
        createdAt: user.createdAt || new Date().toISOString(),
        migratedAt: new Date().toISOString(),
      };
      await writeUsers(users);
    }

    res.json({ success: true, message: '登录成功。' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: '登录失败，请稍后重试。' });
  }
});

export { ensureStorage };
export default router;
