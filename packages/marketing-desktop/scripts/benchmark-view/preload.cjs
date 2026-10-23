const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('viewBenchmark', {
  read: (mode, version) => ipcRenderer.invoke('benchmark:read-view', mode, version),
})
