import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import authRouter, {
  ensureStorage,
  findUserByToken,
  readUsers,
  writeUsers,
} from './routes/auth.js';
import chatRouter, { ensureChatStorage, setChatNotifier } from './routes/chat.js';
import friendsRouter, { setFriendsNotifier } from './routes/friends.js';
import voiceRouter from './routes/voice.js';
import {
  markDisconnected,
  isUserOnline,
  setStatusChangeHandler,
  setTimeoutHandler,
  startHeartbeatMonitor,
  touchHeartbeat,
} from './online.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3001;

export const app = express();

app.use(express.json({ limit: '20mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'index.html', 'index.html'));
});

const routeMeta = [
  {
    method: 'GET',
    path: '/',
    label: 'Root',
    note: 'Service root path that returns the admin index page.',
    templates: [{ name: 'Open root', body: null, hint: 'No body' }],
  },
  {
    method: 'GET',
    path: '/admin',
    label: 'Admin',
    note: 'Backend admin page.',
    templates: [{ name: 'Open admin', body: null, hint: 'No body' }],
  },
  {
    method: 'GET',
    path: '/resource/*',
    label: 'Static resource',
    note: 'Read a file from backend static resource folder.',
    templates: [
      {
        name: 'Example file',
        body: null,
        path: '/resource/example.png',
        hint: 'Replace with actual filename',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/register',
    label: 'Register',
    note: 'Create a new account; server allocates uid.',
    templates: [
      {
        name: 'Quick register',
        body: { username: 'demo_user', password: 'demo_pass_123' },
        hint: 'Password length 8-64',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/login',
    label: 'Login',
    note: 'Login with existing account.',
    templates: [
      {
        name: 'Standard login',
        body: { username: 'demo_user', password: 'demo_pass_123' },
        hint: 'Username is lowercased',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/chat/send',
    label: 'Send chat',
    note: 'Send chat message with token.',
    templates: [
      {
        name: 'Text message',
        body: {
          senderUid: 100000000,
          targetUid: 100000001,
          targetType: 'private',
          type: 'text',
          content: 'Hello',
        },
        hint: 'Authorization: Bearer <token>',
      },
      {
        name: 'Image message',
        body: {
          senderUid: 100000000,
          targetUid: 100000001,
          targetType: 'private',
          type: 'image',
          url: 'https://example.com/image.png',
        },
        hint: 'Authorization: Bearer <token>',
      },
      {
        name: 'File message',
        body: {
          senderUid: 100000000,
          targetUid: 100000001,
          targetType: 'private',
          type: 'file',
          name: 'example.pdf',
          size: 2048,
          dataUrl: 'data:application/pdf;base64,',
        },
        hint: 'Authorization: Bearer <token>',
      },
      {
        name: 'Voice message',
        body: {
          senderUid: 100000000,
          targetUid: 100000001,
          targetType: 'private',
          type: 'voice',
          url: 'https://example.com/audio.mp3',
          duration: 2.4,
        },
        hint: 'Authorization: Bearer <token>',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/chat/get',
    label: 'Fetch chat',
    note: 'Fetch chat messages by target.',
    templates: [
      {
        name: 'Private chat',
        body: { targetType: 'private', targetUid: 100000001 },
        hint: 'Authorization: Bearer <token>',
      },
      {
        name: 'Private text messages',
        body: { targetType: 'private', targetUid: 100000001, type: 'text' },
        hint: 'Or use query params',
      },
    ],
  },
  {
    method: 'DELETE',
    path: '/api/chat/del',
    label: 'Delete chat',
    note: 'Delete a message by id.',
    templates: [
      {
        name: 'Delete message',
        body: { id: 'message-id' },
        hint: 'Replace with actual id',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/friends/add',
    label: 'Add friend',
    note: 'Add friend by uid or username.',
    templates: [
      {
        name: 'Add by uid',
        body: { friendUid: 100000001 },
        hint: 'Authorization: Bearer <token>',
      },
      {
        name: 'Add by username',
        body: { friendUsername: 'demo_user' },
        hint: 'Authorization: Bearer <token>',
      },
    ],
  },
  {
    method: 'DELETE',
    path: '/api/friends/remove',
    label: 'Remove friend',
    note: 'Remove friend by uid or username.',
    templates: [
      {
        name: 'Remove by uid',
        body: { friendUid: 100000001 },
        hint: 'Authorization: Bearer <token>',
      },
      {
        name: 'Remove by username',
        body: { friendUsername: 'demo_user' },
        hint: 'Authorization: Bearer <token>',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/friends/list',
    label: 'Friend list',
    note: 'Return current user friend list.',
    templates: [
      {
        name: 'List friends',
        body: null,
        hint: 'Authorization: Bearer <token>',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/friends/search',
    label: 'Search user',
    note: 'Search user by uid.',
    templates: [
      {
        name: 'Search by uid',
        body: { uid: 100000001 },
        hint: 'Authorization: Bearer <token>',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/voice/directory',
    label: 'Voice directory',
    note: 'Get voice contact directory.',
    templates: [
      {
        name: 'Voice directory',
        body: null,
        hint: 'Authorization: Bearer <token>',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/voice/contact',
    label: 'Voice contact',
    note: 'Get voice contact info by uid.',
    templates: [
      {
        name: 'Voice contact',
        body: { uid: 100000001 },
        hint: 'Authorization: Bearer <token>',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/voice/domain',
    label: 'Voice domain',
    note: 'Update current user domain for voice calls.',
    templates: [
      {
        name: 'Set domain',
        body: { domain: 'example.com' },
        hint: 'Authorization: Bearer <token>',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/routes',
    label: 'Routes',
    note: 'List backend routes and templates.',
    templates: [{ name: 'List routes', body: null, hint: 'No body' }],
  },
];

const normalizePath = (value) => {
  if (!value) return '';
  let result = value.replace(/\\/g, '/').replace(/\/+/g, '/');
  if (result !== '/' && result.endsWith('/')) {
    result = result.slice(0, -1);
  }
  return result;
};

const joinPath = (base, next) => {
  const left = normalizePath(base);
  const right = normalizePath(next);
  const combined = normalizePath(`${left}${right}`);
  return combined || '/';
};

const regexpToPath = (regexp) => {
  if (!regexp) return '';
  if (regexp.fast_slash) return '';
  let source = regexp.source;
  source = source
    .replace(/\\\/\?\(\?=\\\/\|\$\)/g, '')
    .replace(/\(\?:\\\/\|\$\)/g, '')
    .replace(/\(\?=\\\/\|\$\)/g, '')
    .replace(/\\\//g, '/')
    .replace(/^\^/, '')
    .replace(/\$$/, '');
  if (!source) return '';
  if (source === '\\/?') return '';
  return source.startsWith('/') ? source : `/${source}`;
};

const collectRoutes = (target) => {
  const routes = [];
  const walk = (stack, basePath = '') => {
    stack.forEach((layer) => {
      if (layer.route) {
        const routePath = joinPath(basePath, layer.route.path);
        const methods = Object.keys(layer.route.methods || {}).map((method) =>
          method.toUpperCase()
        );
        methods.forEach((method) => routes.push({ method, path: routePath }));
        return;
      }

      const layerPath = regexpToPath(layer.regexp);
      const nextBase = joinPath(basePath, layerPath);

      if (layer.name === 'router' && layer.handle?.stack) {
        walk(layer.handle.stack, nextBase);
        return;
      }

      if (layer.name === 'serveStatic') {
        const staticPath =
          nextBase === '/' ? '/resource/*' : `${normalizePath(nextBase)}/*`;
        routes.push({ method: 'GET', path: staticPath });
      }
    });
  };

  if (target?._router?.stack) {
    walk(target._router.stack);
  }
  return routes;
};

const buildRouteResponse = (target) => {
  const autoRoutes = collectRoutes(target);
  const used = new Set();

  const toKey = (method, path) => `${method} ${path}`;
  const matchMeta = (method, path) => {
    const direct = routeMeta.find(
      (meta) => meta.method === method && meta.path === path
    );
    if (direct) return direct;
    const wildcard = routeMeta.find(
      (meta) =>
        meta.method === method &&
        meta.path.endsWith('/*') &&
        path === meta.path.slice(0, -2)
    );
    return wildcard;
  };

  const enriched = autoRoutes.map((route) => {
    const meta = matchMeta(route.method, route.path);
    if (meta) {
      used.add(toKey(meta.method, meta.path));
      return { ...route, ...meta };
    }
    return {
      ...route,
      label: 'Unnamed',
      note: 'No template configured.',
      templates: [{ name: 'Empty template', body: null, hint: 'No body' }],
    };
  });

  routeMeta.forEach((meta) => {
    const key = toKey(meta.method, meta.path);
    if (!used.has(key)) {
      enriched.push(meta);
    }
  });

  const unique = new Map();
  enriched.forEach((item) => {
    const key = toKey(item.method, item.path);
    if (!unique.has(key)) {
      unique.set(key, { id: key, ...item });
    }
  });

  return Array.from(unique.values()).sort((a, b) => {
    if (a.path === b.path) return a.method.localeCompare(b.method);
    return a.path.localeCompare(b.path);
  });
};

app.get('/api/routes', (req, res) => {
  res.json({ success: true, data: buildRouteResponse(app) });
});

app.use('/resource', express.static(path.join(__dirname, 'resource')));
app.use('/uploads/images', express.static(path.join(__dirname, 'data', 'images')));
app.use('/uploads/userfile', express.static(path.join(__dirname, 'data', 'userfile')));
app.use('/admin', express.static(path.join(__dirname, 'index.html')));

app.use('/api', authRouter);
app.use('/api/chat', chatRouter);
app.use('/api/friends', friendsRouter);
app.use('/api/voice', voiceRouter);

export function startServer(port = PORT) {
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  const connections = new Map();
  const presencePayload = (uid, online) => ({
    type: 'presence',
    data: { uid, online },
  });

  const addConnection = (uid, socket) => {
    const set = connections.get(uid) || new Set();
    set.add(socket);
    connections.set(uid, set);
  };

  const removeConnection = (uid, socket) => {
    const set = connections.get(uid);
    if (!set) return;
    set.delete(socket);
    if (set.size === 0) {
      connections.delete(uid);
      markDisconnected(uid);
    }
  };

  const sendToUid = (uid, payload) => {
    const set = connections.get(uid);
    if (!set) return;
    const message = JSON.stringify(payload);
    set.forEach((socket) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    });
  };

  const verifyToken = async (token) => {
    if (!token) return null;
    const users = await readUsers();
    const found = findUserByToken(users, token);
    if (found.touched) {
      await writeUsers(users);
    }
    return found.user || null;
  };

  const updateUserOnlineState = async (uid, online) => {
    const users = await readUsers();
    const userIndex = users.findIndex((item) => item.uid === uid);
    if (userIndex === -1) return;
    const shouldWrite = users[userIndex].online !== online;
    if (shouldWrite) {
      users[userIndex] = {
        ...users[userIndex],
        online,
      };
      await writeUsers(users);
    }
    const notifyUids = users
      .filter((item) => Array.isArray(item.friends) && item.friends.includes(uid))
      .map((item) => item.uid);
    notifyUids.forEach((friendUid) =>
      sendToUid(friendUid, presencePayload(uid, online))
    );
  };

  const resetOnlineState = async () => {
    const users = await readUsers();
    let touched = false;
    users.forEach((user) => {
      if (user.online) {
        user.online = false;
        touched = true;
      }
    });
    if (touched) {
      await writeUsers(users);
    }
  };

  setStatusChangeHandler((uid, online) => {
    void updateUserOnlineState(uid, online);
  });
  setTimeoutHandler((uid) => {
    const set = connections.get(uid);
    if (set) {
      set.forEach((socket) => {
        try {
          socket.close(4000, 'Heartbeat timeout');
        } catch {}
      });
      connections.delete(uid);
    }
  });
  startHeartbeatMonitor();

  const sendPresenceSnapshot = async (socket, user) => {
    try {
      const users = await readUsers();
      const friendSet = new Set(user.friends || []);
      const snapshot = users
        .filter((item) => friendSet.has(item.uid))
        .map((item) => ({ uid: item.uid, online: isUserOnline(item) }));
      socket.send(JSON.stringify({ type: 'presence_snapshot', data: snapshot }));
    } catch (error) {
      console.error('Presence snapshot error:', error);
    }
  };

  wss.on('connection', async (socket, req) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token') || '';
      const user = await verifyToken(token);
      if (!user) {
        socket.close(1008, 'Unauthorized');
        return;
      }
      socket._user = user;
      socket._uid = user.uid;
      addConnection(user.uid, socket);
      const statusChanged = touchHeartbeat(user.uid);
      if (!statusChanged) {
        void updateUserOnlineState(user.uid, true);
      }
      socket.send(JSON.stringify({ type: 'ready', uid: user.uid }));
      await sendPresenceSnapshot(socket, user);
      socket.on('message', (raw) => {
        try {
          const text = raw?.toString?.() || '';
          const message = JSON.parse(text);
          if (message?.type === 'heartbeat') {
            touchHeartbeat(user.uid);
            return;
          }
          if (message?.type === 'presence_request') {
            void sendPresenceSnapshot(socket, user);
            return;
          }
          if (message?.type === 'voice_signal') {
            const targetUid = Number(message?.data?.targetUid);
            if (!Number.isInteger(targetUid)) return;
            if (!Array.isArray(user.friends) || !user.friends.includes(targetUid)) {
              return;
            }
            const signal = message?.data?.signal || null;
            if (!signal) return;
            sendToUid(targetUid, {
              type: 'voice_signal',
              data: { fromUid: user.uid, signal },
            });
            return;
          }
        } catch {}
      });
      socket.on('close', () => removeConnection(user.uid, socket));
      socket.on('error', () => removeConnection(user.uid, socket));
    } catch {
      socket.close(1011, 'Server error');
    }
  });

  setChatNotifier((entry) => {
    const payload = { type: 'chat', data: entry };
    sendToUid(entry.senderUid, payload);
    if (entry.targetType === 'private') {
      sendToUid(entry.targetUid, payload);
    }
  });
  setFriendsNotifier((uids, payload) => {
    uids.forEach((uid) => sendToUid(uid, payload));
  });

  return server.listen(port, async () => {
    await Promise.all([ensureStorage(), ensureChatStorage()]);
    await resetOnlineState();
    console.log(`Backend listening on http://localhost:${port}`);
  });
}

const entryHref = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;

if (entryHref && import.meta.url === entryHref) {
  startServer();
}
