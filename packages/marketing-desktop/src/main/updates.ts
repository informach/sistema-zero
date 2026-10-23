import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { app, dialog } from 'electron'
import { CancellationToken, NsisUpdater } from 'electron-updater'
import {
  type DesktopUpdate,
  type ReleaseConfiguration,
  releaseConfigurationSchema,
  validateUpdateManifest,
} from '../shared/updates'
import { verifyWindowsSignature } from './clients/windows-signature'
import { verifyUpdateFile } from './verify-update-file'

export class DesktopUpdates {
  private state: DesktopUpdate = {
    state: 'unavailable',
    currentVersion: app.getVersion(),
    message: 'Esta edição de revisão não recebe atualizações automáticas.',
  }
  private updater?: NsisUpdater
  private config?: ReleaseConfiguration
  private token?: CancellationToken
  private timer?: ReturnType<typeof setInterval>
  private verifiedFile?: string
  private expectedFile?: { size: number; sha512: string }
  private running = false

  constructor(private readonly changed: (value: DesktopUpdate) => void) {}
  status() {
    return { ...this.state }
  }
  private set(value: Omit<DesktopUpdate, 'currentVersion'>) {
    this.state = { ...value, currentVersion: app.getVersion() }
    this.changed(this.status())
  }
  async initialize() {
    if (!app.isPackaged || process.platform !== 'win32') return
    try {
      const config = releaseConfigurationSchema.parse(
        JSON.parse(await readFile(path.join(app.getAppPath(), 'dist/release-config.json'), 'utf8')),
      )
      const updater = new NsisUpdater({ provider: 'generic', url: config.feedUrl })
      updater.autoDownload = false
      updater.autoInstallOnAppQuit = false
      updater.allowDowngrade = false
      updater.allowPrerelease = false
      updater.verifyUpdateCodeSignature = verifyWindowsSignature
      updater.on('download-progress', ({ percent }) => {
        if (this.state.state === 'downloading')
          this.set({ ...this.state, progress: Math.min(100, Math.floor(percent)) })
      })
      updater.on('error', () => {
        // check/download surface their rejected promise; installation uses an event instead.
        if (this.state.state === 'installing') {
          dialog.showErrorBox(
            'Atualização não concluída',
            'Não foi possível iniciar a instalação. Abra o app novamente para tentar outra vez. Seus projetos foram preservados.',
          )
          app.exit(1)
        }
      })
      this.config = config
      this.updater = updater
      this.set({ state: 'idle' })
      this.timer = setInterval(
        () => {
          if (!this.running && ['idle', 'error'].includes(this.state.state)) void this.check()
        },
        6 * 60 * 60 * 1000,
      )
      this.timer.unref()
    } catch {
      this.set({
        state: 'unavailable',
        message:
          'Esta instalação não tem uma distribuição de atualização válida. Reinstale pela distribuição oficial.',
      })
    }
  }
  async check() {
    if (
      !this.updater ||
      !this.config ||
      this.running ||
      ['downloading', 'ready', 'installing'].includes(this.state.state)
    )
      return this.status()
    this.running = true
    this.expectedFile = undefined
    this.set({ state: 'checking' })
    try {
      const result = await this.updater.checkForUpdates()
      if (result?.isUpdateAvailable) {
        const manifest = validateUpdateManifest(result.updateInfo, this.config)
        this.expectedFile = manifest.files[0]
        this.set({ state: 'available', version: manifest.version })
      } else this.set({ state: 'idle', message: 'Você está usando a versão atual.' })
    } catch {
      this.set({
        state: 'error',
        message:
          'Não foi possível verificar uma atualização válida. Confira a conexão e tente novamente.',
      })
    } finally {
      this.running = false
    }
    return this.status()
  }
  async download() {
    if (
      !this.updater ||
      !this.config ||
      !this.expectedFile ||
      this.running ||
      this.state.state !== 'available'
    )
      throw new Error('Verifique se há uma atualização disponível.')
    const version = this.state.version
    this.running = true
    this.token = new CancellationToken()
    this.set({ state: 'downloading', version, progress: 0 })
    try {
      const files = await this.updater.downloadUpdate(this.token)
      const file = files[0]
      if (files.length !== 1 || !file || !file.endsWith('.exe'))
        throw new Error('Instalador inesperado.')
      // Always verify against the publishers embedded in the signed app, even if a
      // mutable app-update.yml is absent or has lost its publisherName property.
      await verifyUpdateFile(file, this.expectedFile, this.config.publisherNames)
      if (this.token.cancelled) throw new Error('Download cancelado.')
      this.verifiedFile = file
      this.set({ state: 'ready', version })
    } catch {
      this.verifiedFile = undefined
      this.set(
        this.token.cancelled
          ? {
              state: 'available',
              version,
              message: 'Download cancelado. Você pode tentar novamente.',
            }
          : {
              state: 'error',
              message:
                'A atualização não pôde ser baixada e verificada. A versão instalada foi preservada.',
            },
      )
    } finally {
      this.running = false
      this.token = undefined
    }
    return this.status()
  }
  cancel() {
    this.token?.cancel()
  }
  stop() {
    this.cancel()
    if (this.timer) clearInterval(this.timer)
  }
  async verifyReady() {
    if (
      !this.updater ||
      !this.config ||
      !this.expectedFile ||
      !this.verifiedFile ||
      this.state.state !== 'ready'
    )
      throw new Error('Baixe e verifique a atualização antes de reiniciar.')
    try {
      await verifyUpdateFile(this.verifiedFile, this.expectedFile, this.config.publisherNames)
    } catch {
      this.verifiedFile = undefined
      this.set({
        state: 'error',
        message: 'O instalador foi alterado. Verifique a atualização novamente.',
      })
      throw new Error('O instalador foi alterado. A atualização foi interrompida.')
    }
  }
  /** Called only after the app has drained IPC, stopped sync and closed local stores. */
  async installAfterShutdown() {
    await this.verifyReady()
    if (!this.updater || !this.verifiedFile || this.state.state !== 'ready')
      throw new Error('Atualização não verificada.')
    this.set({ state: 'installing', version: this.state.version })
    this.updater.quitAndInstall(true, true)
  }
}
