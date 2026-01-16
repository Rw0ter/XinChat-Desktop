import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_PATH = path.join(DATA_DIR, 'users.json');
const UID_START = 100000000;
const TOKEN_TTL_DAYS = 181;

const router = express.Router();

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const loginAttempts = new Map();
const DEFAULT_SIGNATURE = '这个人很神秘，暂未填写签名';
const MAX_NICKNAME_LEN = 36;
const MAX_SIGNATURE_LEN = 80;

const normalizeUsername = (value) => value.trim().toLowerCase();

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

const clearUserSession = async (users, userIndex) => {
  users[userIndex] = {
    ...users[userIndex],
    online: false,
  };
  await writeUsers(users);
};

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
  const users = JSON.parse(raw);
  await ensureUserUids(users);
  await ensureUserDefaults(users);
  return users;
};

const writeUsers = async (users) => {
  await ensureStorage();
  await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2), 'utf-8');
};

const ensureUserUids = async (users) => {
  let maxUid = UID_START - 1;
  users.forEach((user) => {
    if (Number.isInteger(user.uid)) {
      maxUid = Math.max(maxUid, user.uid);
    }
  });

  let nextUid = Math.max(maxUid + 1, UID_START);
  let updated = false;
  users.forEach((user) => {
    if (!Number.isInteger(user.uid)) {
      user.uid = nextUid++;
      updated = true;
    }
  });

  if (updated) {
    await writeUsers(users);
  }
};

const ensureUserDefaults = async (users) => {
  let updated = false;
  users.forEach((user) => {
    if (!Array.isArray(user.friends)) {
      user.friends = [];
      updated = true;
    }
    if (typeof user.signature !== 'string') {
      user.signature = DEFAULT_SIGNATURE;
      updated = true;
    }
    if (typeof user.online !== 'boolean') {
      user.online = false;
      updated = true;
    }
    if (typeof user.nickname !== 'string') {
      user.nickname = user.username || '';
      updated = true;
    }
    if (typeof user.gender !== 'string') {
      user.gender = '';
      updated = true;
    }
    if (typeof user.birthday !== 'string') {
      user.birthday = '';
      updated = true;
    }
    if (typeof user.country !== 'string') {
      user.country = '';
      updated = true;
    }
    if (typeof user.province !== 'string') {
      user.province = '';
      updated = true;
    }
    if (typeof user.region !== 'string') {
      user.region = '';
    if (!user.friendRequests || typeof user.friendRequests !== 'object') {
      user.friendRequests = { incoming: [], outgoing: [] };
      updated = true;
      return;
    }
    if (!Array.isArray(user.friendRequests.incoming)) {
      user.friendRequests.incoming = [];
      updated = true;
    }
    if (!Array.isArray(user.friendRequests.outgoing)) {
      user.friendRequests.outgoing = [];
      updated = true;
    }
  });

  if (updated) {
    await writeUsers(users);
  }
};

const getNextUid = (users) => {
  let maxUid = UID_START - 1;
  users.forEach((user) => {
    if (Number.isInteger(user.uid)) {
      maxUid = Math.max(maxUid, user.uid);
    }
  });
  return Math.max(maxUid + 1, UID_START);
};

const issueToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(
    Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  return { token, expiresAt };
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
    const uid = getNextUid(users);
    users.push({
      uid,
      username: normalized,
      ...hashed,
      createdAt: new Date().toISOString(),
      friends: [],
      signature: DEFAULT_SIGNATURE,
      nickname: trimmedUsername,
      gender: '',
      birthday: '',
      country: '',
      province: '',
      region: '',
    });
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
        uid: user.uid,
        username: normalized,
        ...hashed,
        createdAt: user.createdAt || new Date().toISOString(),
        friends: Array.isArray(user.friends) ? user.friends : [],
        signature: typeof user.signature === 'string' ? user.signature : '',
        nickname: typeof user.nickname === 'string' ? user.nickname : normalized,
        gender: typeof user.gender === 'string' ? user.gender : '',
        birthday: typeof user.birthday === 'string' ? user.birthday : '',
        country: typeof user.country === 'string' ? user.country : '',
        province: typeof user.province === 'string' ? user.province : '',
        region: typeof user.region === 'string' ? user.region : '',
        migratedAt: new Date().toISOString(),
      };
      await writeUsers(users);
    }

  const { token, expiresAt } = issueToken();
  users[userIndex] = {
    ...users[userIndex],
    token,
    tokenExpiresAt: expiresAt,
    lastLoginAt: new Date().toISOString(),
    online: true,
  };
  await writeUsers(users);

    res.json({
      success: true,
      message: 'Login success.',
      token,
      tokenExpiresAt: expiresAt,
      uid: users[userIndex].uid,
      username: users[userIndex].username,
      nickname: users[userIndex].nickname || users[userIndex].username,
      signature: users[userIndex].signature || '',
      gender: users[userIndex].gender || '',
      birthday: users[userIndex].birthday || '',
      country: users[userIndex].country || '',
      province: users[userIndex].province || '',
      region: users[userIndex].region || '',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: '登录失败，请稍后重试。' });
  }
});

router.post('/logout', authenticate, async (req, res) => {
  const { users, userIndex } = req.auth;
  await clearUserSession(users, userIndex);
  res.json({ success: true });
});

router.get('/profile', authenticate, async (req, res) => {
  const { user } = req.auth;
  res.json({
    success: true,
    user: {
      uid: user.uid,
      username: user.username,
      nickname: user.nickname || user.username,
      signature: user.signature || DEFAULT_SIGNATURE,
      gender: user.gender || '',
      birthday: user.birthday || '',
      country: user.country || '',
      province: user.province || '',
      region: user.region || '',
    },
  });
});

router.post('/profile', authenticate, async (req, res) => {
  const { users, userIndex } = req.auth;
  const payload = req.body || {};
  const nickname = typeof payload.nickname === 'string' ? payload.nickname.trim() : '';
  const signature = typeof payload.signature === 'string' ? payload.signature.trim() : '';
  const gender = typeof payload.gender === 'string' ? payload.gender.trim() : '';
  const birthday = typeof payload.birthday === 'string' ? payload.birthday.trim() : '';
  const country = typeof payload.country === 'string' ? payload.country.trim() : '';
  const province = typeof payload.province === 'string' ? payload.province.trim() : '';
  const region = typeof payload.region === 'string' ? payload.region.trim() : '';

  if (nickname.length > MAX_NICKNAME_LEN) {
    res.status(400).json({ success: false, message: '昵称长度过长。' });
    return;
  }
  if (signature.length > MAX_SIGNATURE_LEN) {
    res.status(400).json({ success: false, message: '个签长度过长。' });
    return;
  }

  users[userIndex] = {
    ...users[userIndex],
    nickname: nickname || users[userIndex].nickname || users[userIndex].username,
    signature: signature || DEFAULT_SIGNATURE,
    gender,
    birthday,
    country,
    province,
    region,
  };
  await writeUsers(users);

  res.json({
    success: true,
    user: {
      uid: users[userIndex].uid,
      username: users[userIndex].username,
      nickname: users[userIndex].nickname || users[userIndex].username,
      signature: users[userIndex].signature || DEFAULT_SIGNATURE,
      gender: users[userIndex].gender || '',
      birthday: users[userIndex].birthday || '',
      country: users[userIndex].country || '',
      province: users[userIndex].province || '',
      region: users[userIndex].region || '',
    },
  });
});

export { ensureStorage, readUsers, writeUsers };
export default router;
