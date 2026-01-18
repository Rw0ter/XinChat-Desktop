import electron from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const { app, BrowserWindow, ipcMain, Menu } = electron.default || electron;

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
