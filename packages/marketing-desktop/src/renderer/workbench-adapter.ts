import { handoffSchema, projectSchema, projectViewSchema } from '@sistemazero/marketing-contracts'
import type { WorkbenchPort } from '@sistemazero/marketing-workbench'
import type { WorkspaceRequest } from '../shared/connection'
import type { DesktopBridge } from '../shared/contracts'

export function desktopWorkbench(
  bridge: DesktopBridge,
  scope: WorkspaceRequest['scope'],
): WorkbenchPort {
  const request: WorkbenchPort['request'] = (path, method = 'GET', body) =>
    bridge.workspace({ scope, path, method, body })
  return {
    location: 'desktop',
    identity: `${scope.origin}:${scope.userId}`,
    userId: scope.userId,
    exportAssetFile: (input) => bridge.exportAssetFile(scope, input),
    inventory: {
      loadSelection: (projectId, id, selection) =>
        bridge.loadInventorySelection(scope, projectId, id, selection),
      loadFile: (projectId, id, ordinal) => bridge.loadInventoryFile(scope, projectId, id, ordinal),
      cancel: (projectId) => bridge.cancelInventory(scope, projectId),
      onProgress: (listener) =>
        bridge.onProgress((value) => {
          if (value.activity === 'inventory') listener(value.stage)
        }),
      loadText: (projectId, id, ordinal) => bridge.loadInventoryText(scope, projectId, id, ordinal),
      choose: (projectId, origin) => bridge.chooseInventory(scope, projectId, origin),
      list: (projectId, before) => bridge.localInventories(scope, projectId, before),
      page: (projectId, id, cursor) => bridge.localInventoryPage(scope, projectId, id, cursor),
      synchronize: (projectId, id) => bridge.syncInventory(scope, projectId, id),
    },
    exportEditionFile: (input) => bridge.exportEditionFile(scope, input),
    chooseMedia: async (projectId) => {
      const asset = await bridge.importProjectMedia(scope, projectId)
      return asset ? bridge.uploadProjectMedia(scope, projectId, asset.id) : null
    },
    resumeMedia: (projectId, assetId) => bridge.uploadProjectMedia(scope, projectId, assetId),
    assetUrl: async (projectId, assetId) =>
      (await bridge.localAsset(scope, projectId, assetId)).url,
    request,
    projects: () => bridge.projects(),
    createProject: async (input) => {
      const project = projectSchema.parse(await request('/projects', 'POST', input))
      await bridge.synchronize()
      return project
    },
    view: async (id) => projectViewSchema.parse(await bridge.projectView(id)),
    save: async (operation, dependsOnOperationId) => {
      await bridge.saveDraft(scope, { operation, dependsOnOperationId })
      await bridge.synchronize()
    },
    saveBatch: async (input) => {
      await bridge.saveBatch(scope, input)
      await bridge.synchronize()
    },
    resolveDrafts: async (input) => {
      await bridge.resolveDrafts(scope, input)
      await bridge.synchronize()
    },
    synchronize: async () => {
      await bridge.synchronize()
    },
    subscribe: (listener) => bridge.onSync(listener),
    openDesktop: async () => {
      throw new Error('Você já está no desktop')
    },
    execute: (projectId, runId, strategy) => bridge.execute({ scope, projectId, runId, strategy }),
    onHandoff: (listener, onError) => {
      let live = true
      const receive = async () => {
        try {
          const value = await bridge.handoff()
          if (value && live) listener(handoffSchema.parse(value))
        } catch (error) {
          if (live) onError(error)
        }
      }
      const unsubscribe = bridge.onHandoff(() => void receive())
      void receive()
      return () => {
        live = false
        unsubscribe()
      }
    },
  }
}
