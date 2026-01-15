import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '../..');

const DATA_PATH = path.join(app.getPath('userData'), 'note.txt');
const USERS_PATH = path.join(app.getPath('userData'), 'users.json');

let win = null;
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
    if (isDev) {
        const viteDevServer = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
        console.log('Loading from Vite dev server:', `${viteDevServer}/${page}`);
        win.loadURL(getRendererPath(page));
    } else {
        console.log('Loading from dist:', page);
        win.loadFile(getRendererPath(page));
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
}

const enterMainApp = () => {
    if (!win) return;
    win.setResizable(true);
    win.setSize(900, 600);
    win.center();
    applyAppMenu();
    loadRendererPage('index.html');
};

const readUsers = () => {
    if (!fs.existsSync(USERS_PATH)) return [];
    try {
        return JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
    } catch {
        return [];
    }
};

const writeUsers = (users) => {
    fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), 'utf-8');
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

ipcMain.handle('auth-register', async (_, { username, password }) => {
    if (!username || !password) {
        return { success: false, message: '请输入用户名和密码。' };
    }

    const users = readUsers();
    if (users.find((user) => user.username === username)) {
        return { success: false, message: '用户名已存在。' };
    }

    users.push({ username, password });
    writeUsers(users);

    return { success: true, message: '注册成功，请登录。' };
});

ipcMain.handle('auth-login', async (_, { username, password }) => {
    const users = readUsers();
    const match = users.find((user) => user.username === username && user.password === password);

    if (!match) {
        return { success: false, message: '用户名或密码错误。' };
    }

    return { success: true };
});

ipcMain.on('login-success', () => {
    enterMainApp();
});

ipcMain.on('window-close', () => {
    if (win && !win.isDestroyed()) {
        win.close();
    }
});

ipcMain.on('window-min', () => {
    if (win) win.minimize();
});

ipcMain.on('window-max', () => {
    if (!win) return;
    if (win.isMaximized()) {
        win.unmaximize();
    } else {
        win.maximize();
    }
});

app.whenReady().then(createLoginWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
