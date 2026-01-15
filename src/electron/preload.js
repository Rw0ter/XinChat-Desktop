const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveFile: (content) => ipcRenderer.invoke('save-file', content),
    loadFile: () => ipcRenderer.invoke('load-file'),
    saveTabFile: (tabId, content) =>
        ipcRenderer.invoke('save-tab-file', { tabId, content }),
    loadTabFile: (tabId) =>
        ipcRenderer.invoke('load-tab-file', tabId),
    authRegister: (payload) => ipcRenderer.invoke('auth-register', payload),
    authLogin: (payload) => ipcRenderer.invoke('auth-login', payload),
    loginSuccess: () => ipcRenderer.send('login-success'),
    windowClose: () => ipcRenderer.send('window-close'),
    windowMin: () => ipcRenderer.send('window-min'),
    windowMax: () => ipcRenderer.send('window-max')
});
