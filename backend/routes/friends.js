import express from 'express';
import { readUsers, writeUsers } from './auth.js';

const router = express.Router();

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

const resolveFriend = (users, payload = {}) => {
  const uidValue = Number(payload.friendUid);
  if (Number.isInteger(uidValue)) {
    return users.find((item) => item.uid === uidValue) || null;
  }
  if (typeof payload.friendUsername === 'string') {
    const normalized = normalizeUsername(payload.friendUsername);
    return users.find((item) => item.username === normalized) || null;
  }
  return null;
};

router.post('/add', authenticate, async (req, res) => {
  const { users, user, userIndex } = req.auth;
  const friend = resolveFriend(users, req.body);

  if (!friend) {
    res.status(404).json({ success: false, message: 'Friend not found.' });
    return;
  }

  if (friend.uid === user.uid) {
    res.status(400).json({ success: false, message: 'Cannot add yourself.' });
    return;
  }

  const updatedUser = users[userIndex];
  if (!updatedUser.friends.includes(friend.uid)) {
    updatedUser.friends.push(friend.uid);
  }
  const friendIndex = users.findIndex((item) => item.uid === friend.uid);
  if (friendIndex >= 0 && !users[friendIndex].friends.includes(user.uid)) {
    users[friendIndex].friends.push(user.uid);
  }

  await writeUsers(users);
  res.json({ success: true, friends: updatedUser.friends });
});

router.delete('/remove', authenticate, async (req, res) => {
  const { users, user, userIndex } = req.auth;
  const friend = resolveFriend(users, req.body);

  if (!friend) {
    res.status(404).json({ success: false, message: 'Friend not found.' });
    return;
  }

  const updatedUser = users[userIndex];
  updatedUser.friends = updatedUser.friends.filter((uid) => uid !== friend.uid);
  const friendIndex = users.findIndex((item) => item.uid === friend.uid);
  if (friendIndex >= 0) {
    users[friendIndex].friends = users[friendIndex].friends.filter(
      (uid) => uid !== user.uid
    );
  }

  await writeUsers(users);
  res.json({ success: true, friends: updatedUser.friends });
});

router.get('/list', authenticate, async (req, res) => {
  const { users, user } = req.auth;
  const friendSet = new Set(user.friends || []);
  const friends = users
    .filter((item) => friendSet.has(item.uid))
    .map((item) => ({
      uid: item.uid,
      username: item.username,
      avatar: item.avatar || '',
    }));
  res.json({ success: true, friends });
});

router.get('/search', authenticate, async (req, res) => {
  const { users } = req.auth;
  const payload = { ...(req.query || {}), ...(req.body || {}) };
  const uid = Number(payload.uid);
  if (!Number.isInteger(uid)) {
    res.status(400).json({ success: false, message: 'Invalid uid.' });
    return;
  }

  const target = users.find((item) => item.uid === uid);
  if (!target) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }

  res.json({
    success: true,
    user: {
      uid: target.uid,
      username: target.username,
      avatar: target.avatar || '',
    },
  });
});

export default router;
