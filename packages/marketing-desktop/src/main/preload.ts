import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopBridge, Progress } from '../shared/contracts'

const bridge: DesktopBridge = {
  updateStatus: () => ipcRenderer.invoke('marketing:update-status'),
  checkUpdate: () => ipcRenderer.invoke('marketing:update-check'),
  downloadUpdate: () => ipcRenderer.invoke('marketing:update-download'),
  cancelUpdate: () => ipcRenderer.invoke('marketing:update-cancel'),
  installUpdate: () => ipcRenderer.invoke('marketing:update-install'),
  onUpdate: (listener) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      value: import('../shared/updates').DesktopUpdate,
    ) => listener(value)
    ipcRenderer.on('marketing:update', handler)
    return () => ipcRenderer.removeListener('marketing:update', handler)
  },
  rescanInventory: (scope, projectId, id) =>
    ipcRenderer.invoke('marketing:rescan-inventory', scope, projectId, id),
  linkInventoryProduction: (scope, projectId, reportId, planHash) =>
    ipcRenderer.invoke('marketing:link-inventory-production', scope, projectId, reportId, planHash),
  exportAssetFile: (scope, input) =>
    ipcRenderer.invoke('marketing:export-asset-file', scope, input),
  inventoryProductionFolders: (scope, projectId, id) =>
    ipcRenderer.invoke('marketing:inventory-production-folders', scope, projectId, id),
  reviewInventoryProduction: (scope, projectId, id, folderPath) =>
    ipcRenderer.invoke('marketing:review-inventory-production', scope, projectId, id, folderPath),
  shareInventoryProduction: (scope, projectId, id, folderPath) =>
    ipcRenderer.invoke('marketing:share-inventory-production', scope, projectId, id, folderPath),
  loadInventorySelection: (scope, projectId, id, selection) =>
    ipcRenderer.invoke('marketing:load-inventory-selection', scope, projectId, id, selection),
  loadInventoryFile: (scope, projectId, id, ordinal) =>
    ipcRenderer.invoke('marketing:load-inventory-file', scope, projectId, id, ordinal),
  cancelInventory: (scope, projectId) =>
    ipcRenderer.invoke('marketing:cancel-inventory', scope, projectId),
  loadInventoryText: (scope, projectId, id, ordinal) =>
    ipcRenderer.invoke('marketing:load-inventory-text', scope, projectId, id, ordinal),
  chooseInventory: (scope, projectId, origin) =>
    ipcRenderer.invoke('marketing:choose-inventory', scope, projectId, origin),
  localInventories: (scope, projectId, before) =>
    ipcRenderer.invoke('marketing:local-inventories', scope, projectId, before),
  localInventoryPage: (scope, projectId, id, cursor) =>
    ipcRenderer.invoke('marketing:local-inventory-page', scope, projectId, id, cursor),
  syncInventory: (scope, projectId, id) =>
    ipcRenderer.invoke('marketing:sync-inventory', scope, projectId, id),
  exportEditionFile: (scope, input) =>
    ipcRenderer.invoke('marketing:export-edition-file', scope, input),
  speechStatus: () => ipcRenderer.invoke('marketing:speech-status'),
  installSpeech: () => ipcRenderer.invoke('marketing:install-speech'),
  resolveDrafts: (scope, input) => ipcRenderer.invoke('marketing:resolve-drafts', scope, input),
  storageUsage: () => ipcRenderer.invoke('marketing:storage-usage'),
  clearConfirmedCache: (scope, projectId) =>
    ipcRenderer.invoke('marketing:clear-confirmed-cache', scope, projectId),
  saveBatch: (scope, input) => ipcRenderer.invoke('marketing:save-batch', scope, input),
  execute: (selection) => ipcRenderer.invoke('marketing:execute', selection),
  importProjectMedia: (scope, projectId) =>
    ipcRenderer.invoke('marketing:import-project-media', scope, projectId),
  uploadProjectMedia: (scope, projectId, assetId) =>
    ipcRenderer.invoke('marketing:upload-project-media', scope, projectId, assetId),
  localAsset: (scope, projectId, assetId) =>
    ipcRenderer.invoke('marketing:local-asset', scope, projectId, assetId),
  synchronize: () => ipcRenderer.invoke('marketing:synchronize'),
  projects: () => ipcRenderer.invoke('marketing:projects'),
  projectView: (projectId, version) =>
    ipcRenderer.invoke('marketing:project-view', projectId, version),
  saveDraft: (scope, input) => ipcRenderer.invoke('marketing:save-draft', scope, input),
  onSync: (listener) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      report: import('../../../marketing-contracts/src/sync').SyncReport,
    ) => listener(report)
    ipcRenderer.on('marketing:sync', handler)
    return () => ipcRenderer.removeListener('marketing:sync', handler)
  },
  handoff: () => ipcRenderer.invoke('marketing:handoff'),
  onHandoff: (listener) => {
    const handler = () => listener()
    ipcRenderer.on('marketing:handoff-available', handler)
    return () => ipcRenderer.removeListener('marketing:handoff-available', handler)
  },
  connection: () => ipcRenderer.invoke('marketing:connection'),
  connectionState: () => ipcRenderer.invoke('marketing:connection-state'),
  connect: (input) => ipcRenderer.invoke('marketing:connect', input),
  openApproval: () => ipcRenderer.invoke('marketing:open-approval'),
  pollConnection: () => ipcRenderer.invoke('marketing:poll-connection'),
  cancelPairing: () => ipcRenderer.invoke('marketing:cancel-pairing'),
  disconnect: () => ipcRenderer.invoke('marketing:disconnect'),
  online: (visible) => ipcRenderer.invoke('marketing:online', visible),
  workspace: (request) => ipcRenderer.invoke('marketing:workspace', request),
  status: () => ipcRenderer.invoke('marketing:status'),
  login: (provider) => ipcRenderer.invoke('marketing:login', provider),
  installClient: (provider) => ipcRenderer.invoke('marketing:install-client', provider),
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
