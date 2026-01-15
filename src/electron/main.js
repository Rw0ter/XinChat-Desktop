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
let win = null;
let foundFriendWin = null;
const isDev = process.env.VITE_DEV_SERVER_URL ? true : false;

const getRendererPath = (page) => {
    if (isDev) {
        const viteDevServer = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
        return `${viteDevServer}/${page}`;
    }
    return path.join(appRoot, 'dist', page);
};

const loadRendererPage = (page) => {
    if (!win) return;
    loadRendererPageFor(win, page);
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

const applyAppMenu = () => {
    const menu = Menu.buildFromTemplate([
        {
            label: '文件',
            submenu: [
                {
                    label: '保存',
                    accelerator: 'Ctrl+S',
                    click: () => {
                        win?.webContents.send('menu-save');
                    }
                },
                { role: 'quit' }
            ]
        }
    ]);

    Menu.setApplicationMenu(menu);
};

function createLoginWindow() {
    win = new BrowserWindow({
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
    loadRendererPage('login.html');
    if (isDev) {
        win.webContents.openDevTools({ mode: 'detach' });
    }
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

const enterMainApp = () => {
    if (!win) return;
    win.setResizable(true);
    win.setSize(900, 600);
    win.center();
    applyAppMenu();
    loadRendererPage('index.html');
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
    return true;
});

ipcMain.handle('get-auth-token', async () => {
    return {
        token: authToken,
        tokenExpiresAt: authTokenExpiresAt,
        uid: authUid,
        username: authUsername
    };
});

ipcMain.on('login-success', () => {
    enterMainApp();
});

ipcMain.on('open-found-friend', () => {
    createFoundFriendWindow();
});

const getSenderWindow = (event) => {
    return BrowserWindow.fromWebContents(event.sender);
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

app.whenReady().then(createLoginWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
