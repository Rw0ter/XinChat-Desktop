import express from 'express';
import { findUserByToken, readUsers, writeUsers } from './auth.js';

const router = express.Router();

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
    console.error('Voice authenticate error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const toDirectoryEntry = (user) => ({
  uid: user.uid,
  username: user.username,
  domain: user.domain || '',
  online: user.online === true,
});

router.get('/directory', authenticate, async (req, res) => {
  try {
    const { users } = req.auth;
    const data = users.map(toDirectoryEntry);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Voice directory error:', error);
    res.status(500).json({ success: false, message: 'Voice directory failed.' });
  }
});

router.get('/contact', authenticate, async (req, res) => {
  try {
    const uid = Number(req.query.uid || req.body?.uid);
    if (!Number.isInteger(uid)) {
      res.status(400).json({ success: false, message: 'Invalid uid.' });
      return;
    }
    const { users } = req.auth;
    const target = users.find((item) => item.uid === uid);
    if (!target) {
      res.status(404).json({ success: false, message: 'Target not found.' });
      return;
    }
    res.json({ success: true, data: toDirectoryEntry(target) });
  } catch (error) {
    console.error('Voice contact error:', error);
    res.status(500).json({ success: false, message: 'Voice contact failed.' });
  }
});

router.post('/domain', authenticate, async (req, res) => {
  try {
    const domain = typeof req.body?.domain === 'string' ? req.body.domain.trim() : '';
    const { users, userIndex, user } = req.auth;
    if (userIndex == null || !users[userIndex]) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }
    users[userIndex] = {
      ...users[userIndex],
      domain,
    };
    await writeUsers(users);
    res.json({ success: true, data: { uid: user.uid, domain } });
  } catch (error) {
    console.error('Voice domain error:', error);
    res.status(500).json({ success: false, message: 'Voice domain update failed.' });
  }
});

export default router;
