import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopBridge, Progress } from '../shared/contracts'

const bridge: DesktopBridge = {
  status: () => ipcRenderer.invoke('marketing:status'),
  login: (provider) => ipcRenderer.invoke('marketing:login', provider),
  run: (request) => ipcRenderer.invoke('marketing:run', request),
  cancel: () => ipcRenderer.invoke('marketing:cancel'),
  chooseMedia: () => ipcRenderer.invoke('marketing:choose-media'),
  render: (props) => ipcRenderer.invoke('marketing:render', props),
  exportAsset: (id) => ipcRenderer.invoke('marketing:export', id),
  onProgress: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: Progress) => listener(progress)
    ipcRenderer.on('marketing:progress', handler)
    return () => {
      ipcRenderer.removeListener('marketing:progress', handler)
    }
  },
}
contextBridge.exposeInMainWorld('marketing', bridge)
