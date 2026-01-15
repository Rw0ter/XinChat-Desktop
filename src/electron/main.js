import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '../..');

const DATA_PATH = path.join(app.getPath('userData'), 'note.txt');

let win = null;
const isDev = process.env.VITE_DEV_SERVER_URL ? true : false;

function createWindow() {
    win = new BrowserWindow({
        width: 900,
        height: 600,
        frame: false,
        titleBarStyle: 'hidden',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    const menu = Menu.buildFromTemplate([
        {
            label: '文件',
            submenu: [
                {
                    label: '保存',
                    accelerator: 'Ctrl+S',
                    click: () => {
                        win.webContents.send('menu-save');
                    }
                },
                { role: 'quit' }
            ]
        }
    ]);

    Menu.setApplicationMenu(menu);

    // 在开发模式下加载 Vite 开发服务器，生产模式下加载 dist 文件
    if (isDev) {
        const viteDevServer = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
        console.log('Loading from Vite dev server:', viteDevServer);
        win.loadURL(viteDevServer);
    } else {
        console.log('Loading from dist/index.html');
        win.loadFile(path.join(appRoot, 'dist', 'index.html'));
    }
}

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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
