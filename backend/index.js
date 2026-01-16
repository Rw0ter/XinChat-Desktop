import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import authRouter, { ensureStorage, readUsers, writeUsers } from './routes/auth.js';
import chatRouter, { ensureChatStorage, setChatNotifier } from './routes/chat.js';
import friendsRouter, { setFriendsNotifier } from './routes/friends.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3001;

export const app = express();

app.use(express.json());
app.use((_, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'index.html', 'index.html'));
});

const routeMeta = [
  {
    method: 'GET',
    path: '/',
    label: '首页',
    note: '服务根路径，返回后端管理页首页内容。',
    templates: [{ name: '访问首页', body: null, hint: '无 body' }],
  },
  {
    method: 'GET',
    path: '/admin',
    label: '管理页',
    note: '后端管理入口页。',
    templates: [{ name: '打开管理页', body: null, hint: '无 body' }],
  },
  {
    method: 'GET',
    path: '/resource/*',
    label: '静态资源',
    note: '访问后端静态资源目录中的文件。',
    templates: [
      {
        name: '示例文件',
        body: null,
        path: '/resource/example.png',
        hint: '按实际文件名替换',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/register',
    label: '注册',
    note: '注册新账号，系统会分配 uid。',
    templates: [
      {
        name: '快速注册',
        body: { username: 'demo_user', password: 'demo_pass_123' },
        hint: '密码 8-64 位',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/login',
    label: '登录',
    note: '登录已有账号。',
    templates: [
      {
        name: '普通登录',
        body: { username: 'demo_user', password: 'demo_pass_123' },
        hint: '账号名会被转小写',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/chat/send',
    label: '发送消息',
    note: '需要 token，发送 chat 消息，支持私聊/群聊。',
    templates: [
      {
        name: '文本消息',
        body: {
          senderUid: 100000000,
          targetUid: 100000001,
          targetType: 'private',
          type: 'text',
          content: 'Hello',
        },
        hint: '需带 Authorization: Bearer <token>',
      },
      {
        name: '图片消息',
        body: {
          senderUid: 100000000,
          targetUid: 100000001,
          targetType: 'private',
          type: 'image',
          url: 'https://example.com/image.png',
        },
        hint: '需带 Authorization: Bearer <token>',
      },
      {
        name: '语音消息',
        body: {
          senderUid: 100000000,
          targetUid: 100000001,
          targetType: 'private',
          type: 'voice',
          url: 'https://example.com/audio.mp3',
          duration: 2.4,
        },
        hint: '需带 Authorization: Bearer <token>',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/chat/get',
    label: '拉取消息',
    note: '需要 token，需指定 targetType 与 targetUid。',
    templates: [
      {
        name: '私聊记录',
        body: { targetType: 'private', targetUid: 100000001 },
        hint: '需带 Authorization: Bearer <token>',
      },
      {
        name: '私聊文本',
        body: { targetType: 'private', targetUid: 100000001, type: 'text' },
        hint: '也可用 ?targetType=private&targetUid=100000001&type=text',
      },
    ],
  },
  {
    method: 'DELETE',
    path: '/api/chat/del',
    label: '删除消息',
    note: '根据 id 删除指定消息。',
    templates: [
      {
        name: '删除指定消息',
        body: { id: 'message-id' },
        hint: '替换为实际消息 id',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/friends/add',
    label: '添加好友',
    note: '需要 token，支持 friendUid 或 friendUsername。',
    templates: [
      {
        name: '按 uid 添加',
        body: { friendUid: 100000001 },
        hint: '需带 Authorization: Bearer <token>',
      },
      {
        name: '按用户名添加',
        body: { friendUsername: 'demo_user' },
        hint: '需带 Authorization: Bearer <token>',
      },
    ],
  },
  {
    method: 'DELETE',
    path: '/api/friends/remove',
    label: '删除好友',
    note: '需要 token，支持 friendUid 或 friendUsername。',
    templates: [
      {
        name: '按 uid 删除',
        body: { friendUid: 100000001 },
        hint: '需带 Authorization: Bearer <token>',
      },
      {
        name: '按用户名删除',
        body: { friendUsername: 'demo_user' },
        hint: '需带 Authorization: Bearer <token>',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/friends/list',
    label: '好友列表',
    note: '需要 token，返回当前用户好友列表。',
    templates: [
      {
        name: '查看好友',
        body: null,
        hint: '需带 Authorization: Bearer <token>',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/friends/search',
    label: '搜索用户',
    note: '需要 token，按 uid 搜索用户资料。',
    templates: [
      {
        name: '按 uid 搜索',
        body: { uid: 100000001 },
        hint: '需带 Authorization: Bearer <token>',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/routes',
    label: '接口列表',
    note: '返回后端可用路径与模板。',
    templates: [{ name: '查看接口列表', body: null, hint: '无 body' }],
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
      label: '未命名接口',
      note: '未配置模板，请自行填写请求参数。',
      templates: [{ name: '空模板', body: null, hint: '无 body' }],
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
app.use('/admin', express.static(path.join(__dirname, 'index.html')));

app.use('/api', authRouter);
app.use('/api/chat', chatRouter);
app.use('/api/friends', friendsRouter);

export function startServer(port = PORT) {
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  const connections = new Map();

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
    const userIndex = users.findIndex((user) => user.token === token);
    if (userIndex === -1) {
      return null;
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
      return null;
    }
    return user;
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
      socket._uid = user.uid;
      addConnection(user.uid, socket);
      socket.send(JSON.stringify({ type: 'ready', uid: user.uid }));
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
    console.log(`Backend listening on http://localhost:${port}`);
  });
}

const entryHref = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;

if (entryHref && import.meta.url === entryHref) {
  startServer();
}
