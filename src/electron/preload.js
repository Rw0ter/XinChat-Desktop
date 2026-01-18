const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveFile: (content) => ipcRenderer.invoke('save-file', content),
    loadFile: () => ipcRenderer.invoke('load-file'),
    saveTabFile: (tabId, content) =>
        ipcRenderer.invoke('save-tab-file', { tabId, content }),
    loadTabFile: (tabId) =>
        ipcRenderer.invoke('load-tab-file', tabId),
    loginSuccess: () => ipcRenderer.send('login-success'),
    setAuthToken: (payload) => ipcRenderer.invoke('set-auth-token', payload),
    getAuthToken: () => ipcRenderer.invoke('get-auth-token'),
    logout: () => ipcRenderer.send('logout'),
    openFoundFriend: () => ipcRenderer.send('open-found-friend'),
    windowClose: () => ipcRenderer.send('window-close'),
    windowMin: () => ipcRenderer.send('window-min'),
    windowMax: () => ipcRenderer.send('window-max'),
    windowFlash: () => ipcRenderer.send('window-flash')
});
