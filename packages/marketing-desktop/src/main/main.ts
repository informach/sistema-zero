import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  assetExportRequestSchema,
  editionExportRequestSchema,
  hashSchema,
  idSchema,
  importOriginSchema,
  importSelectionSchema,
  relativeSourcePathSchema,
} from '@sistemazero/marketing-contracts'
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  shell,
  Tray,
  type UtilityProcess,
  utilityProcess,
  WebContentsView,
} from 'electron'
import { z } from 'zod'
import { handoffSchema } from '../../../marketing-contracts/src/editorial'
import { defaultStory, storySchema } from '../../../marketing-production/src/story'
import { workspaceRequestSchema } from '../shared/connection'
import { type Progress, providerSchema, runRequestSchema } from '../shared/contracts'
import { parseDeepLink } from '../shared/deep-link'
import { proveActionJournal } from './action-journal-proof'
import { LocalAssets } from './assets'
import { proveStudioCapture } from './capture-proof'
import { proveGeneratedComposition } from './composition-proof'
import { proveCompositionProviders } from './composition-providers-proof'
import { executeNative } from './execution/native-executor'
import { ExecutionSupervisor } from './execution/supervisor'
import { proveHybridVideo } from './hybrid-video-proof'
import { proveFileImport } from './imports/file-proof'
import { proveInventory } from './imports/inventory-proof'
import { InventoryStore } from './imports/inventory-store'
import { linkProduction } from './imports/link-production'
import { proveNativeImport } from './imports/native-import-proof'
import { delayReviewConnectionProbe, proveProductionReview } from './imports/production-proof'
import { proveSourceImport } from './imports/source-proof'
import { proveStructuredImport } from './imports/structure-proof'
import { installSpeechEngine, speechDirectory, speechEngine } from './media/speech-engine'
import { getProviderStatus, loginProvider, runProvider } from './providers'
import { proveRenderChunks } from './render-chunks-proof'
import { DesktopServerSession, ServerRequestError } from './server-session'
import { proveServerSession } from './session-proof'
import { DesktopWorkspaceManager } from './sync/workspace-manager'
import { proveElectronTimeline } from './timeline-proof'
import { proveUiLatency } from './ui-latency-proof'

const directory = path.join(app.getAppPath(), 'dist')
const smoke = [
  '--smoke',
  '--smoke-render',
  '--smoke-text',
  '--smoke-session',
  '--smoke-resume',
  '--smoke-native-import',
  '--smoke-ui-latency',
  '--smoke-capture',
  '--smoke-timeline',
  '--smoke-hybrid',
  '--smoke-render-chunks',
  '--smoke-composition',
  '--smoke-composition-providers',
].some((flag) => process.argv.includes(flag))
const sessionProof =
  process.argv.includes('--smoke-session') ||
  process.argv.includes('--smoke-resume') ||
  process.argv.includes('--smoke-native-import') ||
  process.argv.includes('--smoke-ui-latency')
if (sessionProof) {
  if (app.isPackaged) throw new Error('Prova disponível somente em desenvolvimento')
  app.setPath(
    'userData',
    path.join(
      app.getAppPath(),
      process.argv.includes('--smoke-ui-latency')
        ? '.cache/ui-latency-proof/profile'
        : process.argv.includes('--smoke-native-import')
          ? '.cache/native-connected-proof/profile'
          : process.argv.includes('--smoke-actions')
            ? '.cache/connected-proof/actions-profile'
            : '.cache/connected-proof/profile',
    ),
  )
}
let window: BrowserWindow | undefined
let assets: LocalAssets | undefined
let controller: AbortController | undefined
let inventoryJob: { key: string; controller: AbortController } | undefined
let renderWorker: UtilityProcess | undefined
let busy = false
let quitting = false
let paused = false
let tray: Tray | undefined
let workspaceManager: DesktopWorkspaceManager | undefined
let supervisor: ExecutionSupervisor | undefined
let shutdownReady = false
let exitCode = 0
const ipcAbort = new AbortController()
const pendingIpc = new Set<Promise<unknown>>()
let pendingLink: ReturnType<typeof parseDeepLink> | undefined
function receiveLink(value: string) {
  try {
    pendingLink = parseDeepLink(value, !app.isPackaged)
    if (!smoke) window?.show()
    window?.webContents.send('marketing:handoff-available')
  } catch (error) {
    progress({ stage: error instanceof Error ? error.message : 'Link de peça inválido' })
  }
}
const rendererUrl =
  pathToFileURL(path.join(directory, 'renderer/index.html')).href +
  (smoke && !sessionProof ? '?proof=1' : '')
if (!app.requestSingleInstanceLock() && !smoke) app.exit(0)
app.on('second-instance', (_event, argv) => {
  for (const value of argv) if (value.startsWith('sistema-zero-marketing:')) receiveLink(value)
  if (window?.isMinimized()) window.restore()
  window?.show()
  window?.focus()
})
app.on('open-url', (event, url) => {
  event.preventDefault()
  receiveLink(url)
})
for (const value of process.argv)
  if (value.startsWith('sistema-zero-marketing:')) receiveLink(value)

function progress(value: Progress) {
  if (window && !window.isDestroyed()) window.webContents.send('marketing:progress', value)
}
async function exclusive<T>(work: () => Promise<T>): Promise<T> {
  if (paused) throw new Error('A produção está pausada. Retome pelo ícone do app na bandeja.')
  if (busy) throw new Error('Aguarde ou cancele o trabalho em andamento.')
  busy = true
  try {
    return await work()
  } finally {
    busy = false
    controller = undefined
    inventoryJob = undefined
    renderWorker = undefined
  }
}
function handle(channel: string, operation: (...args: unknown[]) => Promise<unknown>) {
  ipcMain.handle(channel, async (event, ...args: unknown[]) => {
    // A message already queued by the destroyed renderer cannot start new work while draining.
    if (quitting) return
    if (
      ['marketing:run', 'marketing:choose-media', 'marketing:render', 'marketing:export'].includes(
        channel,
      ) &&
      !smoke
    )
      throw new Error('Esta rota pertence à prova isolada. Use uma peça do projeto para produzir.')
    if (
      !window ||
      window.isDestroyed() ||
      event.sender.isDestroyed() ||
      event.sender !== window.webContents ||
      event.senderFrame !== window.webContents.mainFrame ||
      event.senderFrame.url !== rendererUrl
    )
      throw new Error('Origem não autorizada.')
    const flight = operation(...args)
    pendingIpc.add(flight)
    try {
      return await flight
    } catch (error) {
      // Shutdown destroys the consumer before aborting/draining its requests.
      // There is no live renderer to receive an error; do not misreport the
      // intentional cancellation as a network outage. Durable receipts remain pending.
      if (quitting && ipcAbort.signal.aborted) return
      throw error
    } finally {
      pendingIpc.delete(flight)
    }
  })
}

app
  .whenReady()
  .then(async () => {
    if (process.argv.includes('--smoke-composition-providers')) {
      await proveCompositionProviders()
      app.quit()
      return
    }
    if (process.argv.includes('--smoke-composition')) {
      await proveGeneratedComposition()
      app.exit(0)
      return
    }
    if (process.argv.includes('--smoke-render-chunks')) {
      await proveRenderChunks()
      app.exit(0)
      return
    }
    if (process.argv.includes('--smoke-hybrid')) {
      await proveHybridVideo()
      app.exit(0)
      return
    }
    if (process.argv.includes('--smoke-timeline')) {
      await proveElectronTimeline()
      app.exit(0)
      return
    }
    if (process.argv.includes('--smoke-capture')) {
      await proveStudioCapture()
      app.exit(0)
      return
    }
    const serverSession = new DesktopServerSession(
      path.join(app.getPath('userData'), 'connection'),
      ipcAbort.signal,
    )
    await serverSession.initialize()
    if (sessionProof && process.argv.includes('--smoke-delayed-connection'))
      delayReviewConnectionProbe(serverSession)
    workspaceManager = new DesktopWorkspaceManager(
      path.join(app.getPath('userData'), 'workspaces'),
      serverSession,
      (report) => {
        if (window && !window.isDestroyed()) window.webContents.send('marketing:sync', report)
      },
    )
    const manager = workspaceManager
    supervisor = new ExecutionSupervisor(manager, executeNative, (stage) => progress({ stage }))
    const executor = supervisor
    const scopeSchema = workspaceRequestSchema.shape.scope
    const inventoryKey = (scope: unknown, projectId: unknown) =>
      JSON.stringify({ scope: scopeSchema.parse(scope), projectId: idSchema.parse(projectId) })
    const startInventoryWork = (scope: unknown, projectId: unknown) => {
      controller = new AbortController()
      inventoryJob = { key: inventoryKey(scope, projectId), controller }
      return controller.signal
    }
    handle('marketing:cancel-inventory', async (scope, projectId) => {
      if (inventoryJob?.key === inventoryKey(scope, projectId))
        inventoryJob.controller.abort(
          new Error(
            'Importação interrompida. Os registros confirmados foram preservados; você pode retomar a carga.',
          ),
        )
    })
    const inventoryResources = async (rawScope: unknown, rawProject: unknown) => {
      const scope = scopeSchema.parse(rawScope),
        projectId = idSchema.parse(rawProject)
      const resources = await manager.resources(scope, projectId)
      return {
        projectId,
        resources,
        store: new InventoryStore(path.join(resources.directory, 'imports')),
      }
    }
    handle('marketing:choose-inventory', (rawScope, rawProject, rawOrigin) =>
      exclusive(async () => {
        const origin = importOriginSchema.parse(rawOrigin),
          { store } = await inventoryResources(rawScope, rawProject)
        if (!window) throw new Error('Janela indisponível')
        const chosen = await dialog.showOpenDialog(window, {
          properties: ['openDirectory'],
          title:
            origin === 'sistema-zero'
              ? 'Selecione a pasta do Sistema Zero'
              : 'Selecione a pasta do Fluxo Criativo',
        })
        if (chosen.canceled || !chosen.filePaths[0]) return null
        const signal = startInventoryWork(rawScope, rawProject)
        return store.prepare(chosen.filePaths[0], origin, signal, (files, bytes) =>
          progress({
            activity: 'inventory',
            stage: `Lendo acervo: ${files} itens · ${Math.round(bytes / 1024 ** 2)} MB conferidos`,
          }),
        )
      }),
    )
    handle('marketing:local-inventories', async (rawScope, rawProject, before) => {
      const { store } = await inventoryResources(rawScope, rawProject)
      return store.list(before === undefined ? undefined : idSchema.parse(before))
    })
    handle('marketing:rescan-inventory', (rawScope, rawProject, id) =>
      exclusive(async () => {
        const { store } = await inventoryResources(rawScope, rawProject)
        const signal = startInventoryWork(rawScope, rawProject)
        return store.rescan(idSchema.parse(id), signal, (files, bytes) =>
          progress({
            activity: 'inventory',
            stage: `Conferindo novamente a pasta: ${files} itens · ${Math.round(bytes / 1024 ** 2)} MB`,
          }),
        )
      }),
    )
    handle('marketing:inventory-production-folders', async (rawScope, rawProject, id) => {
      const { store } = await inventoryResources(rawScope, rawProject)
      return store.productionFolders(idSchema.parse(id))
    })
    handle('marketing:review-inventory-production', (rawScope, rawProject, id, folderPath) =>
      exclusive(async () => {
        const { store } = await inventoryResources(rawScope, rawProject)
        const signal = startInventoryWork(rawScope, rawProject)
        progress({
          activity: 'inventory',
          stage: 'Conferindo copy, ordem, legenda e integridade das artes locais',
        })
        return store.reviewProduction(
          idSchema.parse(id),
          z.string().min(1).max(1000).parse(folderPath),
          signal,
        )
      }),
    )
    handle('marketing:load-inventory-text', (rawScope, rawProject, id, ordinal) =>
      exclusive(async () => {
        const { store, projectId, resources } = await inventoryResources(rawScope, rawProject)
        const signal = startInventoryWork(rawScope, rawProject)
        progress({ activity: 'inventory', stage: 'Conferindo e carregando a referência' })
        const result = await store.loadText(
          idSchema.parse(id),
          projectId,
          z.number().int().min(0).max(99999).parse(ordinal),
          resources.transport,
          signal,
        )
        await manager.synchronize()
        return result
      }),
    )
    handle('marketing:load-inventory-file', (rawScope, rawProject, id, ordinal) =>
      exclusive(async () => {
        const scope = scopeSchema.parse(rawScope),
          { store, projectId, resources } = await inventoryResources(rawScope, rawProject)
        const signal = startInventoryWork(rawScope, rawProject)
        progress({ activity: 'inventory', stage: 'Conferindo o arquivo de origem' })
        const result = await store.loadFile(
          idSchema.parse(id),
          projectId,
          z.number().int().min(0).max(99999).parse(ordinal),
          resources.transport,
          signal,
          async (file, expected) => {
            const asset = await manager.importMedia(scope, projectId, file, { expected, signal })
            return manager.upload(
              scope,
              projectId,
              asset.id,
              (fraction) =>
                progress({
                  activity: 'inventory',
                  stage: `Enviando o original · ${Math.round(fraction * 100)}%`,
                  progress: fraction,
                }),
              signal,
            )
          },
        )
        await manager.synchronize()
        return result
      }),
    )
    handle('marketing:share-inventory-production', (rawScope, rawProject, id, folderPath) =>
      exclusive(async () => {
        const scope = scopeSchema.parse(rawScope),
          { store, projectId, resources } = await inventoryResources(rawScope, rawProject)
        const signal = startInventoryWork(rawScope, rawProject)
        const result = await store.shareProduction(
          idSchema.parse(id),
          projectId,
          relativeSourcePathSchema.parse(folderPath),
          resources.transport,
          signal,
          async (file, expected) => {
            const asset = await manager.importMedia(scope, projectId, file, { expected, signal })
            return manager.upload(scope, projectId, asset.id, () => {}, signal)
          },
          (stage) => progress({ activity: 'inventory', stage }),
        )
        await manager.synchronize()
        return result
      }),
    )
    handle('marketing:link-inventory-production', (rawScope, rawProject, rawReport, rawHash) =>
      exclusive(async () => {
        const scope = scopeSchema.parse(rawScope),
          projectId = idSchema.parse(rawProject)
        const signal = startInventoryWork(rawScope, rawProject)
        return linkProduction(
          manager,
          scope,
          projectId,
          idSchema.parse(rawReport),
          hashSchema.parse(rawHash),
          signal,
          (stage) => progress({ activity: 'inventory', stage }),
        )
      }),
    )
    handle('marketing:load-inventory-selection', (rawScope, rawProject, id, rawSelection) =>
      exclusive(async () => {
        const scope = scopeSchema.parse(rawScope),
          { store, projectId, resources } = await inventoryResources(rawScope, rawProject)
        const signal = startInventoryWork(rawScope, rawProject)
        progress({ activity: 'inventory', stage: 'Preparando a carga selecionada' })
        const result = await store.loadSelection(
          idSchema.parse(id),
          projectId,
          importSelectionSchema.parse(rawSelection),
          resources.transport,
          signal,
          async (file, expected) => {
            const asset = await manager.importMedia(scope, projectId, file, { expected, signal })
            return manager.upload(scope, projectId, asset.id, () => {}, signal)
          },
          (result, source) =>
            progress({
              activity: 'inventory',
              stage: `${result.loaded + result.reused + result.verifying + result.skipped} de ${result.selected} origens · ${result.verifying} aguardando conferência · ${result.skipped} com decisão de carga${source ? ` · ${source}` : ''}`,
              progress: result.selected
                ? (result.loaded + result.reused + result.verifying + result.skipped) /
                  result.selected
                : 1,
            }),
        )
        await manager.synchronize()
        return result
      }),
    )
    handle('marketing:local-inventory-page', async (rawScope, rawProject, id, cursor) => {
      const { store } = await inventoryResources(rawScope, rawProject)
      return store.page(idSchema.parse(id), z.number().int().min(0).max(100000).parse(cursor))
    })
    handle('marketing:sync-inventory', (rawScope, rawProject, id) =>
      exclusive(async () => {
        const { store, resources, projectId } = await inventoryResources(rawScope, rawProject)
        const signal = startInventoryWork(rawScope, rawProject)
        return store.synchronize(
          idSchema.parse(id),
          projectId,
          resources.transport,
          signal,
          (received, total) =>
            progress({
              activity: 'inventory',
              stage: `Registrando inventário: ${received} de ${total}`,
              progress: received / total,
            }),
        )
      }),
    )
    handle('marketing:speech-status', async () => {
      try {
        await speechEngine(await speechDirectory())
        return { available: true }
      } catch (error) {
        return {
          available: false,
          reason:
            error instanceof Error && 'code' in error && error.code === 'ENOENT'
              ? 'Ainda não instalada'
              : error instanceof Error
                ? error.message
                : 'Instalação indisponível',
        }
      }
    })
    handle('marketing:install-speech', () =>
      exclusive(async () => {
        if (executor.busy)
          throw new Error('Aguarde o trabalho atual antes de instalar a transcrição')
        controller = new AbortController()
        await installSpeechEngine(
          await speechDirectory(),
          AbortSignal.any([controller.signal, AbortSignal.timeout(1800000)]),
          (stage) => progress({ stage }),
        )
      }),
    )
    handle('marketing:resolve-drafts', (scope, input) =>
      manager.resolveDrafts(scopeSchema.parse(scope), input),
    )
    handle('marketing:storage-usage', () => manager.storageUsage())
    handle('marketing:clear-confirmed-cache', (scope, projectId) =>
      exclusive(() =>
        manager.clearConfirmedCache(scopeSchema.parse(scope), z.string().uuid().parse(projectId)),
      ),
    )
    handle('marketing:save-batch', (scope, input) =>
      manager.enqueueBatch(scopeSchema.parse(scope), input),
    )
    handle('marketing:execute', (input) =>
      exclusive(() =>
        executor.run(
          z
            .object({
              scope: scopeSchema,
              projectId: z.string().uuid(),
              runId: z.string().uuid(),
              strategy: z.enum(['start', 'resume', 'regenerate']),
            })
            .strict()
            .parse(input),
        ),
      ),
    )
    handle('marketing:import-project-media', async (rawScope, rawProject) => {
      const scope = scopeSchema.parse(rawScope),
        projectId = z.string().uuid().parse(rawProject)
      await manager.resources(scope, projectId)
      if (!window) throw new Error('Janela indisponível')
      const chosen = await dialog.showOpenDialog(window, {
        properties: ['openFile'],
        filters: [
          {
            name: 'Acervo de marketing',
            extensions: [
              'png',
              'jpg',
              'jpeg',
              'webp',
              'mp4',
              'mov',
              'webm',
              'wav',
              'mp3',
              'm4a',
              'md',
              'txt',
              'srt',
              'html',
              'htm',
              'json',
              'jsonl',
              'pdf',
              'woff2',
              'ttf',
              'otf',
              'zip',
              'docx',
              'xlsx',
              'yaml',
              'yml',
            ],
          },
        ],
      })
      return chosen.canceled || !chosen.filePaths[0]
        ? null
        : manager.importMedia(scope, projectId, chosen.filePaths[0])
    })
    handle('marketing:upload-project-media', async (rawScope, rawProject, rawAsset) => {
      const scope = scopeSchema.parse(rawScope),
        projectId = z.string().uuid().parse(rawProject),
        assetId = z.string().uuid().parse(rawAsset)
      return manager.upload(scope, projectId, assetId, (fraction) =>
        progress({ stage: 'Enviando arquivo ao acervo', progress: fraction }),
      )
    })
    handle('marketing:local-asset', async (rawScope, rawProject, rawAsset) => {
      const scope = scopeSchema.parse(rawScope),
        projectId = z.string().uuid().parse(rawProject),
        assetId = z.string().uuid().parse(rawAsset)
      return manager.download(scope, projectId, assetId)
    })
    handle('marketing:export-edition-file', async (rawScope, rawInput) => {
      const scope = scopeSchema.parse(rawScope),
        input = editionExportRequestSchema.parse(rawInput)
      return manager.exportEditionFile(scope, input, async (filename) => {
        const selected = await dialog.showSaveDialog(window!, { defaultPath: filename })
        return selected.canceled ? null : (selected.filePath ?? null)
      })
    })
    handle('marketing:export-asset-file', async (rawScope, rawInput) => {
      const scope = scopeSchema.parse(rawScope),
        input = assetExportRequestSchema.parse(rawInput)
      return manager.exportAssetFile(scope, input, async (filename) => {
        if (!window || window.isDestroyed()) throw new Error('Janela indisponível')
        const selected = await dialog.showSaveDialog(window, { defaultPath: filename })
        return selected.canceled ? null : (selected.filePath ?? null)
      })
    })
    handle('marketing:synchronize', () => manager.synchronize())
    handle('marketing:projects', () => manager.projects())
    handle('marketing:project-view', (projectId, version) =>
      manager.projection(
        z.string().uuid().parse(projectId),
        z.number().int().nonnegative().safe().nullable().parse(version),
      ),
    )
    handle('marketing:save-draft', (scope, input) =>
      manager.enqueue(
        z.object({ origin: z.string().url(), userId: z.string().uuid() }).strict().parse(scope),
        input,
      ),
    )
    if (app.isPackaged) app.setAsDefaultProtocolClient('sistema-zero-marketing')
    handle('marketing:handoff', async () => {
      if (!pendingLink) return null
      const link = pendingLink
      const state = await serverSession.status()
      if (state.origin !== link.origin)
        throw new Error(
          'Esta peça pertence a outro servidor. Conecte-se ao servidor de origem para abri-la.',
        )
      if (state.status !== 'connected' || !state.userId)
        throw new Error('Conecte sua conta para abrir esta peça.')
      const result = handoffSchema.parse(
        await serverSession.workspace({
          scope: { origin: link.origin, userId: state.userId },
          method: 'GET',
          path: `/handoffs/${link.id}`,
        }),
      )
      if (pendingLink === link) pendingLink = undefined
      return result
    })
    const workspace = path.join(app.getPath('userData'), 'local-proof')
    await mkdir(workspace, { recursive: true })
    assets = new LocalAssets(path.join(workspace, 'assets'))
    await assets.start()
    window = new BrowserWindow({
      title: 'Marketing · Sistema Zero',
      width: 1280,
      height: 880,
      minWidth: 920,
      minHeight: 680,
      show: !smoke,
      webPreferences: {
        preload: path.join(directory, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        offscreen: smoke,
      },
    })
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    if (!smoke) {
      tray = new Tray(path.join(app.getAppPath(), 'resources/tray.png'))
      tray.setToolTip('Sistema Zero Marketing')
      const show = () => {
        window?.show()
        window?.focus()
      }
      const rebuildMenu = () =>
        tray?.setContextMenu(
          Menu.buildFromTemplate([
            { label: 'Abrir marketing', click: show },
            {
              label: paused ? 'Retomar produção' : 'Pausar novos trabalhos',
              click: () => {
                paused = !paused
                executor.setPaused(paused)
                rebuildMenu()
                progress({
                  stage: paused
                    ? 'Novos trabalhos pausados; o trabalho atual continua'
                    : 'Produção retomada',
                })
              },
            },
            { type: 'separator' },
            { label: 'Encerrar app', click: () => app.quit() },
          ]),
        )
      rebuildMenu()
      tray.on('double-click', show)
      window.on('close', (event) => {
        if (!quitting) {
          event.preventDefault()
          window?.hide()
        }
      })
    }
    window.webContents.on('will-navigate', (event) => event.preventDefault())
    window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) =>
      callback(false),
    )
    let onlineView: WebContentsView | undefined
    let onlineOrigin: string | undefined
    const resizeOnline = () => {
      if (!onlineView || !window) return
      const { width, height } = window.getContentBounds()
      onlineView.setBounds({ x: 0, y: 64, width, height: Math.max(0, height - 64) })
    }
    window.on('resize', resizeOnline)
    window.on('closed', () => onlineView?.webContents.close())
    handle('marketing:connection', () => serverSession.status())
    handle('marketing:connection-state', async () => serverSession.cachedState)
    handle('marketing:connect', (input) => {
      if (busy || manager.transferring)
        throw new Error('Aguarde a produção e o envio de arquivos antes de trocar de conta')
      return serverSession.start(input)
    })
    handle('marketing:open-approval', () => shell.openExternal(serverSession.approvalUrl))
    handle('marketing:poll-connection', () => serverSession.poll())
    handle('marketing:cancel-pairing', () => serverSession.cancelPairing())
    handle('marketing:disconnect', () => {
      if (busy || manager.transferring)
        throw new Error('Aguarde a produção e o envio de arquivos antes de desconectar')
      return serverSession.disconnect()
    })
    handle('marketing:workspace', async (request) => {
      try {
        return {
          ok: true,
          value: await serverSession.workspace(
            workspaceRequestSchema.parse(request),
            ipcAbort.signal,
          ),
        }
      } catch (error) {
        if (error instanceof ServerRequestError)
          return {
            ok: false,
            error: { status: error.status, code: error.code, message: error.message },
          }
        throw error
      }
    })
    handle('marketing:online', async (value) => {
      const visible = z.boolean().parse(value)
      if (!visible) {
        onlineView?.setVisible(false)
        return
      }
      const status = await serverSession.status()
      if (status.status !== 'connected' || !status.origin)
        throw new Error('Conecte o app ao servidor para abrir o marketing online')
      if (onlineView && onlineOrigin !== status.origin) {
        window?.contentView.removeChildView(onlineView)
        onlineView.webContents.close()
        onlineView = undefined
      }
      if (!onlineView) {
        onlineOrigin = status.origin
        onlineView = new WebContentsView({
          webPreferences: {
            session: serverSession.electronSession,
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false,
          },
        })
        onlineView.webContents.setWindowOpenHandler(({ url }) => {
          if (new URL(url).protocol === 'https:')
            void shell.openExternal(url).catch((error) =>
              progress({
                stage: error instanceof Error ? error.message : 'Não foi possível abrir o endereço',
              }),
            )
          return { action: 'deny' }
        })
        onlineView.webContents.on('will-navigate', (event, url) => {
          if (new URL(url).origin !== onlineOrigin) event.preventDefault()
        })
        window?.contentView.addChildView(onlineView)
        resizeOnline()
        await onlineView.webContents.loadURL(status.origin)
      }
      onlineView.setVisible(true)
    })
    handle('marketing:status', async () =>
      Promise.all(
        ['codex', 'claude'].map((name) => getProviderStatus(providerSchema.parse(name), workspace)),
      ),
    )
    handle('marketing:login', async (provider) =>
      exclusive(() => {
        controller = new AbortController()
        return loginProvider(
          providerSchema.parse(provider),
          workspace,
          shell.openExternal,
          controller.signal,
        )
      }),
    )
    handle('marketing:run', async (input) =>
      exclusive(async () => {
        const request = runRequestSchema.parse(input)
        const source = request.sourceAssetId ? assets!.get(request.sourceAssetId) : undefined
        if (source && !source.asset.mime.startsWith('image/'))
          throw new Error('Escolha uma imagem para editar.')
        controller = new AbortController()
        const started = Date.now()
        const result = await runProvider(
          request,
          workspace,
          controller.signal,
          (stage) => progress({ stage }),
          source?.path,
        )
        const produced = []
        for (const image of result.images) produced.push(await assets!.addImage(image))
        const output = {
          text: result.text,
          assets: produced,
          provider: request.provider,
          mode: result.mode,
          durationMs: Date.now() - started,
        }
        await writeFile(
          path.join(workspace, `result-${Date.now()}.json`),
          JSON.stringify(
            {
              ...output,
              assets: produced.map(({ url: _url, ...asset }) => asset),
            },
            null,
            2,
          ),
        )
        progress({ stage: 'Resultado pronto para conferir' })
        return output
      }),
    )
    handle('marketing:cancel', async () => {
      await executor.cancel()
      controller?.abort()
      renderWorker?.postMessage('cancel')
    })
    handle('marketing:choose-media', async () => {
      const chosen = await dialog.showOpenDialog(window!, {
        properties: ['openFile'],
        filters: [
          { name: 'Imagens e vídeos', extensions: ['png', 'jpg', 'jpeg', 'mp4', 'mov', 'webm'] },
        ],
      })
      return chosen.canceled || !chosen.filePaths[0]
        ? null
        : assets!.importFile(chosen.filePaths[0])
    })
    handle('marketing:export', async (value) => {
      const source = assets!.get(z.string().uuid().parse(value))
      const chosen = await dialog.showSaveDialog(window!, { defaultPath: source.asset.name })
      if (chosen.canceled || !chosen.filePath) return false
      await copyFile(source.path, chosen.filePath)
      return true
    })
    handle('marketing:render', async (input) =>
      exclusive(async () => {
        const props = storySchema.parse(input)
        if (props.clip && !assets!.ownsUrl(props.clip.src))
          throw new Error('Gravação não pertence a esta sessão.')
        const stamp = Date.now()
        const propsFile = path.join(workspace, `render-${stamp}.json`)
        const output = path.join(workspace, `story-${stamp}.mp4`)
        await writeFile(propsFile, JSON.stringify(props))
        progress({ stage: 'Exportando vídeo no computador', progress: 0 })
        await new Promise<void>((resolve, reject) => {
          const child = utilityProcess.fork(
            path.join(directory, 'render-worker.cjs'),
            [propsFile, output, path.join(directory, 'remotion')],
            { stdio: 'pipe', serviceName: 'Marketing video' },
          )
          renderWorker = child
          let buffer = ''
          let complete = false
          const timeout = setTimeout(() => {
            child.kill()
            reject(new Error('O render atingiu o limite de dez minutos.'))
          }, 600000)
          child.stdout?.on('data', (chunk: Buffer) => {
            buffer += chunk.toString()
            let newline = buffer.indexOf('\n')
            while (newline >= 0) {
              const line = buffer.slice(0, newline)
              buffer = buffer.slice(newline + 1)
              try {
                const message = JSON.parse(line) as { progress?: number; complete?: boolean }
                if (typeof message.progress === 'number')
                  progress({ stage: 'Exportando vídeo no computador', progress: message.progress })
                if (message.complete) complete = true
              } catch {
                /* Native renderer diagnostics are not forwarded as product events. */
              }
              newline = buffer.indexOf('\n')
            }
          })
          child.stderr?.resume()
          child.on('exit', (code) => {
            clearTimeout(timeout)
            if (code === 0 && complete) resolve()
            else
              reject(new Error('Render interrompido. O original e a composição foram preservados.'))
          })
        })
        const result = await assets!.importFile(output)
        progress({ stage: 'Vídeo pronto para conferir', progress: 1 })
        return result
      }),
    )
    if (process.argv.includes('--smoke-actions')) console.log('action-journal: loading renderer')
    await window.loadURL(rendererUrl)
    if (sessionProof) {
      if (process.argv.includes('--smoke-ui-latency'))
        await proveUiLatency(window, manager, serverSession)
      else if (process.argv.includes('--smoke-native-import'))
        await proveNativeImport(window, manager)
      else if (process.argv.includes('--smoke-production-review'))
        await proveProductionReview(window)
      else if (process.argv.includes('--smoke-import-structure'))
        await proveStructuredImport(window, manager)
      else if (process.argv.includes('--smoke-import-files')) await proveFileImport(window, manager)
      else if (process.argv.includes('--smoke-import-sources'))
        await proveSourceImport(window, manager)
      else if (process.argv.includes('--smoke-inventory')) await proveInventory(window, manager)
      else if (process.argv.includes('--smoke-actions')) await proveActionJournal(window)
      else await proveServerSession(window, serverSession, () => onlineView, receiveLink)
      if (process.argv.includes('--smoke-shutdown'))
        await window.webContents.executeJavaScript(`{
        for(let index=0;index<20;index++)void window.marketing.projects().catch(()=>{});
        true;
      }`)
      app.quit()
      return
    }
    if (smoke) {
      if (process.argv.includes('--smoke-text')) {
        for (const provider of ['codex', 'claude']) {
          const request = {
            provider,
            kind: 'copy',
            prompt:
              'Escreva uma legenda curta em português sobre criar um jogo como forma de aprender. Máximo de 25 palavras.',
          }
          const result = await window.webContents.executeJavaScript(
            `window.marketing.run(${JSON.stringify(request)})`,
          )
          if (!result.text?.trim() || !result.mode)
            throw new Error(`Prova textual de ${provider} não produziu resultado.`)
          console.log(
            JSON.stringify({
              textProof: {
                provider,
                mode: result.mode,
                durationMs: result.durationMs,
                received: true,
              },
            }),
          )
        }
      }
      if (process.argv.includes('--smoke-render')) {
        const clip = await assets.importFile(path.join(app.getAppPath(), '.cache/proof/source.mp4'))
        const props = {
          ...defaultStory,
          width: 360,
          height: 640,
          durationInFrames: 60,
          clip: { src: clip.url, trimBefore: 30, muted: false },
        }
        const result = await window.webContents.executeJavaScript(
          `window.marketing.render(${JSON.stringify(props)})`,
        )
        console.log(
          JSON.stringify({
            render: {
              id: result.id,
              size: result.size,
              sha256: result.sha256,
              path: assets.get(result.id).path,
            },
          }),
        )
      }
      const state = await window.webContents.executeJavaScript(
        '(async () => { await window.marketing.status(); const composition = document.querySelector("[data-marketing-story]"); return { title: document.title, bridge: typeof window.marketing?.run, node: typeof window.require, player: !!document.querySelector("[data-player]"), frame: composition?.getAttribute("data-frame"), width: composition?.getAttribute("data-width") }; })()',
      )
      if (
        state.bridge !== 'function' ||
        state.node !== 'undefined' ||
        !state.player ||
        state.frame !== '30' ||
        state.width !== '720'
      )
        throw new Error('A ponte isolada ou a prévia não passou na verificação.')
      await writeFile(path.join(workspace, 'smoke.json'), JSON.stringify(state, null, 2))
      const screenshot = await window.webContents.capturePage()
      await writeFile(path.join(workspace, 'smoke.png'), screenshot.toPNG())
      console.log(JSON.stringify({ smoke: state, directory: workspace }))
      app.quit()
    }
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Falha ao iniciar.')
    exitCode = 1
    app.quit()
  })

app.on('window-all-closed', () => {
  if (!process.argv.includes('--smoke-capture')) app.quit()
})
app.on('before-quit', (event) => {
  if (shutdownReady) return
  event.preventDefault()
  if (quitting) return
  quitting = true
  ipcAbort.abort()
  tray?.destroy()
  // End renderer producers first, then drain requests before closing their stores.
  // Destroy bypasses the normal close-to-tray handler during an explicit quit.
  if (window && !window.isDestroyed()) window.destroy()
  controller?.abort()
  renderWorker?.kill()
  void (async () => {
    await supervisor?.stop()
    await Promise.allSettled([...pendingIpc])
    await workspaceManager?.stop()
    assets?.close()
  })()
    .then(() => {
      shutdownReady = true
      if (exitCode) app.exit(exitCode)
      else app.quit()
    })
    .catch((error) => {
      console.error(
        'Falha ao encerrar sincronização:',
        error instanceof Error ? error.message : 'erro',
      )
      app.exit(1)
    })
})
