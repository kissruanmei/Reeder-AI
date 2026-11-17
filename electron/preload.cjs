const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('reederApp', {
  openExternal: url => ipcRenderer.invoke('app:open-external', url),
});

contextBridge.exposeInMainWorld('reederMusic', {
  account: () => ipcRenderer.invoke('music:account'),
  createQr: () => ipcRenderer.invoke('music:create-qr'),
  pollQr: attempt => ipcRenderer.invoke('music:poll-qr', attempt),
  cancelQr: () => ipcRenderer.invoke('music:cancel-qr'),
  logout: () => ipcRenderer.invoke('music:logout'),
  playlists: () => ipcRenderer.invoke('music:playlists'),
  tracks: id => ipcRenderer.invoke('music:tracks', id),
  stream: id => ipcRenderer.invoke('music:stream', id),
});
