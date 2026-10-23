import { createHash, randomBytes } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { FuseState, FuseV1Options, getCurrentFuseWire } from '@electron/fuses'
import { HttpCooldown, retryAfterMilliseconds } from '@sistemazero/marketing-contracts'
import { app, type Session, safeStorage, session } from 'electron'
import { z } from 'zod'
import {
  type ConnectionState,
  connectSchema,
  type PairingView,
  serverOrigin,
  type WorkspaceRequest,
} from '../shared/connection'
import { readBoundedJson } from './bounded-json'
import { SerialQueue } from './serial-queue'

const configSchema = z
  .object({
    origin: z.string(),
    userId: z.string().uuid().nullable(),
    deviceId: z.string().uuid().nullable(),
  })
  .strict()
const pendingSchema = z
  .object({
    origin: z.string(),
    deviceCode: z.string(),
    verifier: z.string(),
    code: z.string(),
    expiresAt: z.string(),
    intervalSeconds: z.number().int().min(5),
  })
  .strict()
const sessionSchema = z.object({
  valid: z.literal(true),
  userId: z.string().uuid(),
  deviceId: z.string().uuid(),
})
const startSchema = z.object({
  deviceCode: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  userCode: z.string(),
  expiresAt: z.string().datetime(),
  intervalSeconds: z.number().int().min(5),
})
export class ServerRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryAfterMs?: number,
  ) {
    super(message)
  }
}
export class DesktopServerSession {
  private readonly workspaceCooldown = new HttpCooldown()
  private cooldownIdentity = ''
  private readonly queue = new SerialQueue()
  private polling: Promise<ConnectionState> | undefined
  private config: z.infer<typeof configSchema> | null = null
  private pending: z.infer<typeof pendingSchema> | null = null
  private lastPoll = 0
  private appSession: Session | undefined
  private state: ConnectionState = {
    origin: null,
    userId: null,
    deviceId: null,
    status: 'disconnected',
    storageProtected: false,
  }
  constructor(
    private readonly directory: string,
    private readonly lifetime?: AbortSignal,
  ) {}
  async initialize() {
    await mkdir(this.directory, { recursive: true })
    const fuses = await getCurrentFuseWire(process.execPath)
    this.state.storageProtected =
      fuses[FuseV1Options.EnableCookieEncryption] === FuseState.ENABLE &&
      safeStorage.isEncryptionAvailable() &&
      (process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text')
    if (!this.state.storageProtected)
      this.state.message =
        'Esta instalação precisa do armazenamento protegido de credenciais. Reinstale pela distribuição oficial.'
    let stored: string
    try {
      stored = await readFile(path.join(this.directory, 'connection.json'), 'utf8')
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return
      throw error
    }
    try {
      this.config = configSchema.parse(JSON.parse(stored))
      this.configure(this.config.origin)
    } catch {
      await rename(
        path.join(this.directory, 'connection.json'),
        path.join(this.directory, `connection.invalid-${Date.now()}.json`),
      )
      this.config = null
      this.state.message =
        'A configuração local está inválida e foi preservada para diagnóstico. Conecte sua conta novamente.'
      return
    }
    this.state = {
      ...this.state,
      ...this.config,
      status: this.config.userId ? 'offline' : 'disconnected',
    }
    if (!this.state.storageProtected) {
      this.state.message = 'Ative o armazenamento protegido do sistema para conectar.'
      return
    }
    let pairing: Buffer
    try {
      pairing = await readFile(path.join(this.directory, 'pairing.enc'))
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return
      throw error
    }
    try {
      this.pending = pendingSchema.parse(JSON.parse(safeStorage.decryptString(pairing)))
      if (this.pending.origin !== this.config.origin) throw new Error('Servidor diferente')
    } catch {
      this.pending = null
      await rename(
        path.join(this.directory, 'pairing.enc'),
        path.join(this.directory, `pairing.invalid-${Date.now()}.enc`),
      )
      this.state.message =
        'A autorização pendente não pôde ser restaurada. Inicie uma nova conexão.'
    }
  }
  private configure(raw: string) {
    const origin = serverOrigin(raw, !app.isPackaged)
    const partition = `persist:marketing-${createHash('sha256').update(origin).digest('hex').slice(0, 24)}`
    this.appSession = session.fromPartition(partition)
    this.appSession.setPermissionRequestHandler((_contents, _permission, callback) =>
      callback(false),
    )
    this.appSession.setPermissionCheckHandler(() => false)
    this.state.origin = origin
  }
  get electronSession() {
    if (!this.appSession) throw new Error('Conecte o servidor primeiro')
    return this.appSession
  }
  get origin() {
    return this.state.origin
  }
  private async persist() {
    if (!this.config) return
    const target = path.join(this.directory, 'connection.json')
    await writeFile(`${target}.tmp`, JSON.stringify(this.config), { mode: 0o600 })
    await rename(`${target}.tmp`, target)
  }
  private async request(
    relative: string,
    method = 'GET',
    body?: unknown,
    signal?: AbortSignal,
  ): Promise<unknown> {
    if (!this.state.storageProtected)
      throw new Error('Armazenamento protegido indisponível neste computador')
    const origin = this.state.origin
    if (!origin || !this.appSession) throw new Error('Conecte o servidor de marketing')
    const url = new URL(relative, origin)
    if (url.origin !== origin || !url.pathname.startsWith('/api/'))
      throw new Error('Rota fora do app de marketing')
    const workspaceRequest = relative.startsWith('/api/marketing/workspace')
    const requestIdentity = JSON.stringify([origin, this.state.userId, this.state.deviceId])
    if (workspaceRequest) {
      if (this.cooldownIdentity !== requestIdentity) {
        this.cooldownIdentity = requestIdentity
        this.workspaceCooldown.reset()
      }
      const remaining = this.workspaceCooldown.remainingMilliseconds()
      if (remaining)
        throw new ServerRequestError(
          429,
          'TOO_MANY_REQUESTS',
          `O servidor solicitou uma pausa. Nova tentativa disponível em ${Math.ceil(remaining / 1000)} s.`,
          remaining,
        )
    }
    const signals = [AbortSignal.timeout(60000)]
    if (this.lifetime) signals.push(this.lifetime)
    if (signal) signals.push(signal)
    const response = await this.appSession
      .fetch(url.href, {
        method,
        credentials: 'include',
        redirect: 'error',
        headers: {
          'content-type': 'application/json',
          origin,
          ...(relative.startsWith('/api/marketing/workspace')
            ? {
                'x-marketing-desktop-device': this.state.deviceId ?? '',
                'x-marketing-desktop-user': this.state.userId ?? '',
              }
            : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.any(signals),
      })
      .catch((error) => {
        throw new ServerRequestError(
          503,
          'NETWORK_UNAVAILABLE',
          error instanceof Error ? error.message : 'Não foi possível acessar o servidor',
        )
      })
    let json: unknown
    try {
      json = await readBoundedJson(response)
    } catch (error) {
      if (response.ok) throw error
    }
    if (!response.ok) {
      const retryAfterMs = retryAfterMilliseconds(response.headers.get('retry-after'))
      if (workspaceRequest && this.cooldownIdentity === requestIdentity)
        this.workspaceCooldown.observe(response.status, retryAfterMs)
      const error = z
        .object({ error: z.object({ code: z.string(), message: z.string() }) })
        .safeParse(json)
      if (response.status === 401) this.state.status = 'disconnected'
      throw new ServerRequestError(
        response.status,
        error.success ? error.data.error.code : 'SERVER_ERROR',
        error.success ? error.data.error.message : 'O servidor não concluiu a operação',
        retryAfterMs,
      )
    }
    return json
  }
  status(): Promise<ConnectionState> {
    return this.queue.run(() => this.checkStatus())
  }
  get cachedState() {
    return { ...this.state }
  }
  private async checkStatus(): Promise<ConnectionState> {
    const origin = this.state.origin
    if (!origin) return { ...this.state }
    try {
      const result = sessionSchema.parse(await this.request('/api/desktop/connect'))
      this.state = {
        ...this.state,
        userId: result.userId,
        deviceId: result.deviceId,
        status: 'connected',
        message: undefined,
      }
      // Store only public binding metadata. Credentials stay in Chromium's OS-protected HttpOnly cookie store.
      this.config = { origin, userId: result.userId, deviceId: result.deviceId }
      await this.persist()
    } catch (error) {
      if (error instanceof ServerRequestError && error.status < 500 && error.status !== 429) {
        this.state.status = 'disconnected'
        this.state.message = error.message
      } else {
        this.state.status = 'offline'
        this.state.message = error instanceof Error ? error.message : 'Servidor indisponível'
      }
    }
    return { ...this.state }
  }
  start(raw: unknown): Promise<PairingView> {
    return this.queue.run(() => this.startPairing(raw))
  }
  private async startPairing(raw: unknown): Promise<PairingView> {
    const input = connectSchema.parse(raw)
    if (!this.state.storageProtected) throw new Error('Armazenamento protegido indisponível')
    const origin = serverOrigin(input.origin, !app.isPackaged)
    this.configure(origin)
    this.state = {
      ...this.state,
      status: 'disconnected',
      userId: null,
      deviceId: null,
      message: undefined,
    }
    const verifier = randomBytes(32).toString('base64url')
    const challenge = createHash('sha256').update(verifier).digest('base64url')
    const started = startSchema.parse(
      await this.request('/api/desktop/connect', 'POST', {
        action: 'start',
        label: input.label,
        challenge,
      }),
    )
    this.pending = {
      origin,
      verifier,
      deviceCode: started.deviceCode,
      code: started.userCode,
      expiresAt: started.expiresAt,
      intervalSeconds: started.intervalSeconds,
    }
    const pairingFile = path.join(this.directory, 'pairing.enc')
    await writeFile(`${pairingFile}.tmp`, safeStorage.encryptString(JSON.stringify(this.pending)), {
      mode: 0o600,
    })
    await rename(`${pairingFile}.tmp`, pairingFile)
    this.config = { origin, userId: null, deviceId: null }
    await this.persist()
    return {
      code: started.userCode,
      expiresAt: started.expiresAt,
      intervalSeconds: started.intervalSeconds,
    }
  }
  get approvalUrl() {
    if (!this.pending) throw new Error('Inicie a conexão primeiro')
    const url = new URL('/conectar-desktop', this.pending.origin)
    url.searchParams.set('code', this.pending.code)
    return url.href
  }
  poll(): Promise<ConnectionState> {
    this.polling ??= this.queue
      .run(() => this.exchangePending())
      .finally(() => {
        this.polling = undefined
      })
    return this.polling
  }
  private async exchangePending(): Promise<ConnectionState> {
    if (!this.pending) return this.checkStatus()
    if (Date.parse(this.pending.expiresAt) <= Date.now()) {
      await this.clearPairing()
      throw new Error('Código expirado. Inicie uma nova conexão.')
    }
    if (Date.now() - this.lastPoll < this.pending.intervalSeconds * 1000) return { ...this.state }
    this.lastPoll = Date.now()
    const result = await this.request('/api/desktop/connect', 'POST', {
      action: 'exchange',
      deviceCode: this.pending.deviceCode,
      verifier: this.pending.verifier,
    })
    if (z.object({ status: z.literal('pending') }).safeParse(result).success)
      return { ...this.state }
    const connected = z
      .object({
        status: z.literal('connected'),
        userId: z.string().uuid(),
        deviceId: z.string().uuid(),
      })
      .parse(result)
    this.state = {
      ...this.state,
      userId: connected.userId,
      deviceId: connected.deviceId,
      status: 'connected',
    }
    this.config = {
      origin: this.pending.origin,
      userId: connected.userId,
      deviceId: connected.deviceId,
    }
    await this.electronSession.cookies.flushStore()
    await this.persist()
    await this.clearPairing()
    return { ...this.state }
  }
  private async clearPairing() {
    this.pending = null
    try {
      await unlink(path.join(this.directory, 'pairing.enc'))
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
        throw error
    }
  }
  cancelPairing() {
    return this.queue.run(() => this.clearPairing())
  }
  disconnect() {
    return this.queue.run(() => this.endSession())
  }
  private async endSession() {
    await this.request('/api/auth/logout', 'POST')
    await this.electronSession.clearStorageData({ storages: ['cookies'] })
    await this.electronSession.cookies.flushStore()
    await this.clearPairing()
    this.state = { ...this.state, status: 'disconnected', userId: null, deviceId: null }
    if (this.state.origin) this.config = { origin: this.state.origin, userId: null, deviceId: null }
    await this.persist()
    return { ...this.state }
  }
  async workspace(request: WorkspaceRequest, signal?: AbortSignal) {
    this.assertScope(request.scope)
    const response = await this.request(
      `/api/marketing/workspace${request.path}`,
      request.method,
      request.body,
      signal,
    )
    this.assertScope(request.scope)
    return response
  }
  private assertScope(scope: WorkspaceRequest['scope']) {
    if (
      this.state.origin !== scope.origin ||
      this.state.userId !== scope.userId ||
      this.state.status === 'disconnected'
    )
      throw new Error('A conta ou o servidor mudou. Reabra o projeto na conta correta.')
  }
}
