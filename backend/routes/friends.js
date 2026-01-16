import express from 'express';
import { readUsers, writeUsers } from './auth.js';

const router = express.Router();

const normalizeUsername = (value) => value.trim().toLowerCase();
const REQUEST_STATUS_PENDING = 'pending';
const REQUEST_STATUS_REJECTED = 'rejected';
let friendsNotifier = null;

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

const isUserOnline = (user) => {
  if (!user?.online) return false;
  if (!user?.token) return false;
  const expiresAt = user.tokenExpiresAt ? Date.parse(user.tokenExpiresAt) : 0;
  if (!expiresAt || Number.isNaN(expiresAt)) return false;
  return Date.now() <= expiresAt;
};

const ensureFriendRequests = (user) => {
  if (!user.friendRequests || typeof user.friendRequests !== 'object') {
    user.friendRequests = { incoming: [], outgoing: [] };
  }
  if (!Array.isArray(user.friendRequests.incoming)) {
    user.friendRequests.incoming = [];
  }
  if (!Array.isArray(user.friendRequests.outgoing)) {
    user.friendRequests.outgoing = [];
  }
};

const nowIso = () => new Date().toISOString();

const findRequest = (list, uid) =>
  list.find((item) => item && Number.isInteger(item.uid) && item.uid === uid);

const removeRequest = (list, uid) =>
  list.filter((item) => !(item && Number.isInteger(item.uid) && item.uid === uid));

const normalizeOutgoingEntry = (entry) => ({
  uid: entry.uid,
  status: entry.status || REQUEST_STATUS_PENDING,
  createdAt: entry.createdAt || nowIso(),
  resolvedAt: entry.resolvedAt || null,
});

const setFriendsNotifier = (notifier) => {
  friendsNotifier = typeof notifier === 'function' ? notifier : null;
};

const notifyUsers = (uids, payload) => {
  if (!friendsNotifier) return;
  const list = Array.from(new Set(uids.filter(Number.isInteger)));
  if (!list.length) return;
  friendsNotifier(list, payload);
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
  const friendIndex = users.findIndex((item) => item.uid === friend.uid);
  const friendUser = friendIndex >= 0 ? users[friendIndex] : null;
  if (!friendUser) {
    res.status(404).json({ success: false, message: 'Friend not found.' });
    return;
  }

  if (
    Array.isArray(updatedUser.friends) &&
    updatedUser.friends.includes(friend.uid) &&
    Array.isArray(friendUser.friends) &&
    friendUser.friends.includes(updatedUser.uid)
  ) {
    res.json({ success: true, status: 'already_friends' });
    return;
  }

  ensureFriendRequests(updatedUser);
  ensureFriendRequests(friendUser);

  const incomingEntry = findRequest(updatedUser.friendRequests.incoming, friend.uid);
  if (incomingEntry) {
    updatedUser.friendRequests.incoming = removeRequest(
      updatedUser.friendRequests.incoming,
      friend.uid
    );
    friendUser.friendRequests.outgoing = removeRequest(
      friendUser.friendRequests.outgoing,
      updatedUser.uid
    );

    if (!updatedUser.friends.includes(friend.uid)) {
      updatedUser.friends.push(friend.uid);
    }
    if (!friendUser.friends.includes(updatedUser.uid)) {
      friendUser.friends.push(updatedUser.uid);
    }

    await writeUsers(users);
    notifyUsers([updatedUser.uid, friendUser.uid], { type: 'friends' });
    notifyUsers([updatedUser.uid, friendUser.uid], { type: 'requests' });
    res.json({ success: true, status: 'accepted' });
    return;
  }

  const outgoingEntry = findRequest(updatedUser.friendRequests.outgoing, friend.uid);
  if (outgoingEntry && outgoingEntry.status === REQUEST_STATUS_PENDING) {
    res.json({ success: true, status: 'pending' });
    return;
  }

  const nextOutgoing =
    outgoingEntry && outgoingEntry.status === REQUEST_STATUS_REJECTED
      ? {
          ...outgoingEntry,
          status: REQUEST_STATUS_PENDING,
          createdAt: nowIso(),
          resolvedAt: null,
        }
      : {
          uid: friend.uid,
          status: REQUEST_STATUS_PENDING,
          createdAt: nowIso(),
          resolvedAt: null,
        };

  updatedUser.friendRequests.outgoing = removeRequest(
    updatedUser.friendRequests.outgoing,
    friend.uid
  );
  updatedUser.friendRequests.outgoing.push(normalizeOutgoingEntry(nextOutgoing));

  friendUser.friendRequests.incoming = removeRequest(
    friendUser.friendRequests.incoming,
    updatedUser.uid
  );
  friendUser.friendRequests.incoming.push({
    uid: updatedUser.uid,
    status: REQUEST_STATUS_PENDING,
    createdAt: nowIso(),
  });

  await writeUsers(users);
  notifyUsers([updatedUser.uid, friendUser.uid], { type: 'requests' });
  res.json({ success: true, status: 'pending' });
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
    ensureFriendRequests(users[friendIndex]);
    users[friendIndex].friendRequests.incoming = removeRequest(
      users[friendIndex].friendRequests.incoming,
      user.uid
    );
    users[friendIndex].friendRequests.outgoing = removeRequest(
      users[friendIndex].friendRequests.outgoing,
      user.uid
    );
  }

  ensureFriendRequests(updatedUser);
  updatedUser.friendRequests.incoming = removeRequest(
    updatedUser.friendRequests.incoming,
    friend.uid
  );
  updatedUser.friendRequests.outgoing = removeRequest(
    updatedUser.friendRequests.outgoing,
    friend.uid
  );

  await writeUsers(users);
  notifyUsers([updatedUser.uid, friend.uid], { type: 'friends' });
  notifyUsers([updatedUser.uid, friend.uid], { type: 'requests' });
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
      online: isUserOnline(item),
    }));
  res.json({ success: true, friends });
});

router.get('/requests', authenticate, async (req, res) => {
  const { users, user, userIndex } = req.auth;
  const updatedUser = users[userIndex];
  ensureFriendRequests(updatedUser);

  let touched = false;
  const mapUser = (uid) =>
    users.find((item) => item.uid === uid) || null;

  const incoming = updatedUser.friendRequests.incoming
    .map((entry) => {
      const target = mapUser(entry.uid);
      if (!target) {
        touched = true;
        return null;
      }
      return {
        uid: target.uid,
        username: target.username,
        avatar: target.avatar || '',
        status: entry.status || REQUEST_STATUS_PENDING,
        createdAt: entry.createdAt || null,
      };
    })
    .filter(Boolean);

  const outgoing = updatedUser.friendRequests.outgoing
    .map((entry) => {
      const target = mapUser(entry.uid);
      if (!target) {
        touched = true;
        return null;
      }
      return {
        uid: target.uid,
        username: target.username,
        avatar: target.avatar || '',
        status: entry.status || REQUEST_STATUS_PENDING,
        createdAt: entry.createdAt || null,
        resolvedAt: entry.resolvedAt || null,
      };
    })
    .filter(Boolean);

  if (touched) {
    updatedUser.friendRequests.incoming = updatedUser.friendRequests.incoming.filter(
      (entry) => mapUser(entry.uid)
    );
    updatedUser.friendRequests.outgoing = updatedUser.friendRequests.outgoing.filter(
      (entry) => mapUser(entry.uid)
    );
    await writeUsers(users);
  }

  res.json({ success: true, incoming, outgoing });
});

router.post('/respond', authenticate, async (req, res) => {
  const { users, user, userIndex } = req.auth;
  const { requesterUid, action } = req.body || {};
  const requesterId = Number(requesterUid);
  if (!Number.isInteger(requesterId)) {
    res.status(400).json({ success: false, message: 'Invalid requester uid.' });
    return;
  }
  if (action !== 'accept' && action !== 'reject') {
    res.status(400).json({ success: false, message: 'Invalid action.' });
    return;
  }

  const updatedUser = users[userIndex];
  ensureFriendRequests(updatedUser);
  const incomingEntry = findRequest(updatedUser.friendRequests.incoming, requesterId);
  if (!incomingEntry) {
    res.status(404).json({ success: false, message: 'Request not found.' });
    return;
  }

  const requesterIndex = users.findIndex((item) => item.uid === requesterId);
  const requester = requesterIndex >= 0 ? users[requesterIndex] : null;
  if (requester) {
    ensureFriendRequests(requester);
  }

  updatedUser.friendRequests.incoming = removeRequest(
    updatedUser.friendRequests.incoming,
    requesterId
  );

  if (action === 'accept') {
    if (!updatedUser.friends.includes(requesterId)) {
      updatedUser.friends.push(requesterId);
    }
    if (requester && !requester.friends.includes(updatedUser.uid)) {
      requester.friends.push(updatedUser.uid);
    }
    if (requester) {
      requester.friendRequests.outgoing = removeRequest(
        requester.friendRequests.outgoing,
        updatedUser.uid
      );
    }
    await writeUsers(users);
    notifyUsers([updatedUser.uid, requesterId], { type: 'friends' });
    notifyUsers([updatedUser.uid, requesterId], { type: 'requests' });
    res.json({ success: true, status: 'accepted' });
    return;
  }

  if (requester) {
    const outgoingEntry = findRequest(requester.friendRequests.outgoing, updatedUser.uid);
    if (outgoingEntry) {
      requester.friendRequests.outgoing = removeRequest(
        requester.friendRequests.outgoing,
        updatedUser.uid
      );
      requester.friendRequests.outgoing.push(
        normalizeOutgoingEntry({
          ...outgoingEntry,
          status: REQUEST_STATUS_REJECTED,
          resolvedAt: nowIso(),
        })
      );
    }
  }

  await writeUsers(users);
  notifyUsers([updatedUser.uid, requesterId], { type: 'requests' });
  res.json({ success: true, status: 'rejected' });
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
      online: isUserOnline(target),
    },
  });
});

export { setFriendsNotifier };
export default router;
