import electron from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';
import { fileURLToPath } from 'url';

const { app, BrowserWindow, ipcMain, Menu, shell } = electron.default || electron;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '../..');

const DATA_PATH = path.join(app.getPath('userData'), 'note.txt');
let authToken = null;
let authTokenExpiresAt = null;
let authUid = null;
let authUsername = null;
let authSignature = null;
let authNickname = null;
let authGender = null;
let authBirthday = null;
let authCountry = null;
let authProvince = null;
let authRegion = null;
let loginWin = null;
let mainWin = null;
let foundFriendWin = null;
let voiceCallWin = null;
let voiceCallReady = false;
let pendingVoiceSignals = [];
const imagePreviewWins = new Set();
const chatWins = new Set();
const flashTimers = new WeakMap();
const isDev = process.env.VITE_DEV_SERVER_URL ? true : false;

const getRendererPath = (page) => {
    if (isDev) {
        const viteDevServer = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
        return `${viteDevServer}/${page}`;
    }
    return path.join(appRoot, 'dist', page);
};

const loadRendererPageFor = (targetWindow, page) => {
    if (!targetWindow) return;
    if (isDev) {
        const viteDevServer = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
        console.log('Loading from Vite dev server:', `${viteDevServer}/${page}`);
        targetWindow.loadURL(getRendererPath(page));
    } else {
        console.log('Loading from dist:', page);
        targetWindow.loadFile(getRendererPath(page));
    }
};

const applyAppMenuFor = (targetWindow) => {
    const menu = Menu.buildFromTemplate([
        {
            label: '文件',
            submenu: [
                {
                    label: '保存',
                    accelerator: 'Ctrl+S',
                    click: () => {
                        targetWindow?.webContents.send('menu-save');
                    }
                },
                { role: 'quit' }
            ]
        }
    ]);

    Menu.setApplicationMenu(menu);
};

function createLoginWindow() {
    loginWin = new BrowserWindow({
        width: 320,
        height: 448,
        frame: false,
        titleBarStyle: 'hidden',
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    Menu.setApplicationMenu(null);
    loadRendererPageFor(loginWin, 'login.html');
    loginWin.webContents.once('did-finish-load', () => {
        loginWin.webContents.openDevTools({ mode: 'detach' });
    });
}

function createFoundFriendWindow() {
    if (foundFriendWin && !foundFriendWin.isDestroyed()) {
        foundFriendWin.focus();
        return;
    }
    foundFriendWin = new BrowserWindow({
        width: 900,
        height: 720,
        frame: false,
        titleBarStyle: 'hidden',
        resizable: true,
        backgroundColor: '#f1f7ff',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    loadRendererPageFor(foundFriendWin, 'found_friend.html');
    if (isDev) {
        foundFriendWin.webContents.openDevTools({ mode: 'detach' });
    }
    foundFriendWin.on('closed', () => {
        foundFriendWin = null;
    });
}

function createChatWindow(payload = {}) {
    const chatWin = new BrowserWindow({
        width: 900,
        height: 600,
        frame: false,
        titleBarStyle: 'hidden',
        resizable: true,
        backgroundColor: '#eef5ff',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    applyAppMenuFor(chatWin);
    loadRendererPageFor(chatWin, 'index.html');
    chatWin.once('ready-to-show', () => {
        chatWin.show();
    });
    chatWin.webContents.once('did-finish-load', () => {
        chatWin.webContents.send('open-chat', payload);
    });
    if (isDev) {
        chatWin.webContents.openDevTools({ mode: 'detach' });
    }
    chatWins.add(chatWin);
    chatWin.on('closed', () => {
        chatWins.delete(chatWin);
    });
}

function createVoiceCallWindow(payload = {}) {
    if (voiceCallWin && !voiceCallWin.isDestroyed()) {
        voiceCallWin.focus();
        voiceCallWin.webContents.send('voice-call-init', payload);
        return;
    }
    voiceCallReady = false;
    pendingVoiceSignals = [];
    voiceCallWin = new BrowserWindow({
        width: 360,
        height: 520,
        frame: false,
        titleBarStyle: 'hidden',
        resizable: false,
        backgroundColor: '#101318',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    loadRendererPageFor(voiceCallWin, 'voice_call.html');
    voiceCallWin.once('ready-to-show', () => {
        voiceCallWin.show();
    });
    voiceCallWin.webContents.once('did-finish-load', () => {
        voiceCallWin.webContents.send('voice-call-init', payload);
        voiceCallReady = true;
        pendingVoiceSignals.forEach((signal) => {
            voiceCallWin?.webContents.send('voice-signal-in', signal);
        });
        pendingVoiceSignals = [];
    });
    if (isDev) {
        voiceCallWin.webContents.openDevTools({ mode: 'detach' });
    }
    voiceCallWin.on('closed', () => {
        voiceCallWin = null;
        voiceCallReady = false;
        pendingVoiceSignals = [];
    });
}

const fadeWindow = (targetWindow, targetOpacity, durationMs = 160) => {
    if (!targetWindow || typeof targetWindow.setOpacity !== 'function') return;
    const startOpacity = targetWindow.getOpacity();
    const steps = 12;
    const stepMs = Math.max(10, Math.round(durationMs / steps));
    let step = 0;
    const timer = setInterval(() => {
        if (!targetWindow || targetWindow.isDestroyed()) {
            clearInterval(timer);
            return;
        }
        step += 1;
        const t = step / steps;
        const ease = 1 - Math.pow(1 - t, 2);
        const opacity = startOpacity + (targetOpacity - startOpacity) * ease;
        targetWindow.setOpacity(opacity);
        if (step >= steps) {
            clearInterval(timer);
            targetWindow.setOpacity(targetOpacity);
        }
    }, stepMs);
};

const enterMainApp = () => {
    if (mainWin && !mainWin.isDestroyed()) {
        mainWin.focus();
        return;
    }

    mainWin = new BrowserWindow({
        width: 900,
        height: 600,
        frame: false,
        titleBarStyle: 'hidden',
        resizable: true,
        show: false,
        backgroundColor: '#eef5ff',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    applyAppMenuFor(mainWin);
    loadRendererPageFor(mainWin, 'index.html');

    mainWin.once('ready-to-show', () => {
        mainWin.setOpacity(0);
        mainWin.show();
        fadeWindow(mainWin, 1, 220);
        mainWin.webContents.openDevTools({ mode: 'detach' });
    });

    if (loginWin && !loginWin.isDestroyed()) {
        fadeWindow(loginWin, 0, 140);
        setTimeout(() => {
            if (loginWin && !loginWin.isDestroyed()) {
                loginWin.close();
            }
            loginWin = null;
        }, 180);
    }

    mainWin.on('closed', () => {
        mainWin = null;
    });
};

const clearAuth = () => {
    authToken = null;
    authTokenExpiresAt = null;
    authUid = null;
    authUsername = null;
    authSignature = null;
    authNickname = null;
    authGender = null;
    authBirthday = null;
    authCountry = null;
    authProvince = null;
    authRegion = null;
};

const logoutToLogin = () => {
    if (loginWin && !loginWin.isDestroyed()) {
        loginWin.focus();
    } else {
        createLoginWindow();
    }

    if (mainWin && !mainWin.isDestroyed()) {
        mainWin.close();
        mainWin = null;
    }
};

const sanitizeFilename = (value) => {
    const base = path.basename(String(value || '').trim());
    if (!base) return 'file';
    return base.replace(/[\\/:*?"<>|]+/g, '_');
};

const ensureUniquePath = (dir, name) => {
    const parsed = path.parse(name);
    let candidate = path.join(dir, name);
    let counter = 1;
    while (fs.existsSync(candidate)) {
        candidate = path.join(dir, `${parsed.name} (${counter})${parsed.ext}`);
        counter += 1;
    }
    return candidate;
};

const downloadToPath = (url, targetPath, redirectCount = 0) =>
    new Promise((resolve, reject) => {
        if (redirectCount > 5) {
            reject(new Error('Too many redirects'));
            return;
        }
        const client = url.startsWith('https:') ? https : http;
        const request = client.get(url, (res) => {
            const status = res.statusCode || 0;
            if (status >= 300 && status < 400 && res.headers.location) {
                const nextUrl = res.headers.location.startsWith('http')
                    ? res.headers.location
                    : new URL(res.headers.location, url).toString();
                res.resume();
                downloadToPath(nextUrl, targetPath, redirectCount + 1)
                    .then(resolve)
                    .catch(reject);
                return;
            }
            if (status !== 200) {
                res.resume();
                reject(new Error(`Download failed (${status})`));
                return;
            }
            const fileStream = fs.createWriteStream(targetPath);
            res.pipe(fileStream);
            fileStream.on('finish', () => fileStream.close(resolve));
            fileStream.on('error', reject);
        });
        request.on('error', reject);
    });

ipcMain.handle('save-file', async (event, content) => {
    fs.writeFileSync(DATA_PATH, content, 'utf-8');
    return true;
});

ipcMain.handle('load-file', async () => {
    if (!fs.existsSync(DATA_PATH)) return '';
    return fs.readFileSync(DATA_PATH, 'utf-8');
});

const getTabPath = (tabId) => {
    return path.join(app.getPath('userData'), `${tabId}.txt`);
};

ipcMain.handle('save-tab-file', async (_, { tabId, content }) => {
    fs.writeFileSync(getTabPath(tabId), content, 'utf-8');
    return true;
});

ipcMain.handle('load-tab-file', async (_, tabId) => {
    const file = getTabPath(tabId);
    if (!fs.existsSync(file)) return '';
    return fs.readFileSync(file, 'utf-8');
});

ipcMain.handle('set-auth-token', async (_, payload = {}) => {
    authToken = payload.token || null;
    authTokenExpiresAt = payload.tokenExpiresAt || null;
    authUid = payload.uid || null;
    authUsername = payload.username || null;
    authSignature = payload.signature || null;
    authNickname = payload.nickname || null;
    authGender = payload.gender || null;
    authBirthday = payload.birthday || null;
    authCountry = payload.country || null;
    authProvince = payload.province || null;
    authRegion = payload.region || null;
    return true;
});

ipcMain.handle('get-auth-token', async () => {
    return {
        token: authToken,
        tokenExpiresAt: authTokenExpiresAt,
        uid: authUid,
        username: authUsername,
        signature: authSignature,
        nickname: authNickname,
        gender: authGender,
        birthday: authBirthday,
        country: authCountry,
        province: authProvince,
        region: authRegion
    };
});

ipcMain.handle('download-file', async (_, payload = {}) => {
    const url = typeof payload.url === 'string' ? payload.url.trim() : '';
    if (!url || !/^https?:\/\//i.test(url)) {
        throw new Error('Invalid download url');
    }
    const name = sanitizeFilename(payload.name || 'file');
    const downloadDir = app.getPath('downloads');
    const targetPath = ensureUniquePath(downloadDir, name);
    await downloadToPath(url, targetPath);
    return { path: targetPath };
});

ipcMain.handle('open-path', async (_, targetPath = '') => {
    const cleaned = typeof targetPath === 'string' ? targetPath.trim() : '';
    if (!cleaned) {
        throw new Error('Invalid path');
    }
    const result = await shell.openPath(cleaned);
    if (result) {
        throw new Error(result);
    }
    return true;
});

ipcMain.handle('check-downloaded-file', async (_, payload = {}) => {
    const name = sanitizeFilename(payload.name || 'file');
    const hintedPath = typeof payload.path === 'string' ? payload.path.trim() : '';
    if (hintedPath && fs.existsSync(hintedPath)) {
        return { path: hintedPath };
    }
    const downloadDir = app.getPath('downloads');
    const directPath = path.join(downloadDir, name);
    if (fs.existsSync(directPath)) {
        return { path: directPath };
    }
    return { path: '' };
});

ipcMain.on('login-success', () => {
    enterMainApp();
});

ipcMain.on('logout', () => {
    clearAuth();
    logoutToLogin();
});

ipcMain.on('open-found-friend', () => {
    createFoundFriendWindow();
});

ipcMain.on('open-chat-window', (_, payload) => {
    createChatWindow(payload);
});

ipcMain.on('open-voice-call', (_, payload) => {
    createVoiceCallWindow(payload);
});

ipcMain.on('close-voice-call', () => {
    if (voiceCallWin && !voiceCallWin.isDestroyed()) {
        voiceCallWin.close();
    }
});

ipcMain.on('voice-signal-in', (_, payload) => {
    if (voiceCallWin && !voiceCallWin.isDestroyed()) {
        if (voiceCallReady) {
            voiceCallWin.webContents.send('voice-signal-in', payload);
        } else {
            pendingVoiceSignals.push(payload);
        }
    }
});

ipcMain.on('voice-signal-out', (_, payload) => {
    if (mainWin && !mainWin.isDestroyed()) {
        mainWin.webContents.send('voice-signal-out', payload);
    }
    chatWins.forEach((win) => {
        if (!win.isDestroyed()) {
            win.webContents.send('voice-signal-out', payload);
        }
    });
});

ipcMain.on('open-image-preview', (_, url) => {
    if (typeof url !== 'string' || !url.trim()) return;
    const targetUrl = url.trim();
    const isDataImage = targetUrl.startsWith('data:image/');
    const isRemoteImage = /^https?:\/\//i.test(targetUrl);
    if (!isDataImage && !isRemoteImage) {
        return;
    }
    const previewWin = new BrowserWindow({
        width: 900,
        height: 700,
        resizable: true,
        backgroundColor: '#111111',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    previewWin.setMenu(null);
    loadRendererPageFor(previewWin, 'image_preview.html');
    previewWin.webContents.once('did-finish-load', () => {
        previewWin.webContents.send('image-preview', targetUrl);
    });
    imagePreviewWins.add(previewWin);
    previewWin.on('closed', () => {
        imagePreviewWins.delete(previewWin);
    });
});

const getSenderWindow = (event) => {
    return BrowserWindow.fromWebContents(event.sender);
};

const triggerWindowFlash = (targetWindow) => {
    if (!targetWindow || targetWindow.isDestroyed()) return;
    targetWindow.flashFrame(true);
    const existing = flashTimers.get(targetWindow);
    if (existing) {
        clearTimeout(existing);
    }
    const timer = setTimeout(() => {
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.flashFrame(false);
        }
        flashTimers.delete(targetWindow);
    }, 10000);
    flashTimers.set(targetWindow, timer);
    targetWindow.once('focus', () => {
        const pending = flashTimers.get(targetWindow);
        if (pending) {
            clearTimeout(pending);
            flashTimers.delete(targetWindow);
        }
        if (!targetWindow.isDestroyed()) {
            targetWindow.flashFrame(false);
        }
    });
};

ipcMain.on('window-close', (event) => {
    const target = getSenderWindow(event);
    if (target && !target.isDestroyed()) {
        target.close();
    }
});

ipcMain.on('window-min', (event) => {
    const target = getSenderWindow(event);
    if (target) target.minimize();
});

ipcMain.on('window-max', (event) => {
    const target = getSenderWindow(event);
    if (!target) return;
    if (target.isMaximized()) {
        target.unmaximize();
    } else {
        target.maximize();
    }
});

ipcMain.on('window-flash', (event) => {
    const target = getSenderWindow(event);
    triggerWindowFlash(target);
});

app.whenReady().then(createLoginWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
