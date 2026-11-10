const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('reederWallpaper', {
  list: () => ipcRenderer.invoke('wallpaper:list'),
  chooseInstall: () => ipcRenderer.invoke('wallpaper:choose-install'),
  startScene: id => ipcRenderer.invoke('wallpaper:start-scene', id),
  stopScene: id => ipcRenderer.invoke('wallpaper:stop-scene', id),
});
