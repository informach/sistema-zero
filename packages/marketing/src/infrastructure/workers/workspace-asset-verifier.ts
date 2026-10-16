import { createHash } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import type { MultipartStore } from '../../domain/ports/multipart-store.port'
import type {
  VerificationJob,
  WorkspaceAssetsRepository,
} from '../../domain/ports/workspace-assets-repository.port'
/** Bounded streaming verification. A completed HTTP upload alone never confirms an asset. */
export class WorkspaceAssetVerifier {
  private timer: ReturnType<typeof setInterval> | undefined
  private flight: Promise<void> | undefined
  private abort: AbortController | undefined
  private stopping = false
  constructor(
    private readonly repo: Pick<
      WorkspaceAssetsRepository,
      'claimVerification' | 'renewVerification' | 'finishVerification'
    >,
    private readonly store: Pick<MultipartStore, 'head' | 'getStream'>,
    private readonly logger: Logger,
  ) {}
  start() {
    if (this.stopping && this.flight)
      throw new Error('Aguarde o encerramento do verificador antes de reiniciá-lo')
    this.stopping = false
    this.timer ??= setInterval(() => {
      void this.tick()
    }, 5000)
  }
  async stop() {
    this.stopping = true
    clearInterval(this.timer)
    this.timer = undefined
    this.abort?.abort(new Error('Servidor reiniciando'))
    await this.flight
  }
  tick() {
    if (this.stopping) return Promise.resolve()
    this.flight ??= this.cycle()
      .catch((error) => {
        this.logger.error('workspace.asset.verification_failed', {
          error: error instanceof Error ? error.message : 'Erro de verificação',
        })
      })
      .finally(() => {
        this.flight = undefined
      })
    return this.flight
  }
  private async cycle() {
    // Drain a bounded batch per poll. Keep a single stream active so even large
    // imports retain the same memory/network bound and claim ordering.
    for (let count = 0; count < 20 && !this.stopping; count++) {
      const job = await this.repo.claimVerification()
      if (!job) return
      await this.runJob(job)
    }
  }
  private async runJob(job: VerificationJob) {
    if (this.stopping) {
      await this.repo.finishVerification(job, {
        valid: false,
        error: 'Servidor reiniciando',
        retryable: true,
      })
      return
    }
    if (job.attempt > 3) {
      await this.repo.finishVerification(job, {
        valid: false,
        error: 'A verificação foi interrompida três vezes; solicite uma nova conferência',
        retryable: false,
      })
      return
    }
    const abort = new AbortController()
    this.abort = abort
    const timeout = setTimeout(
      () => abort.abort(new Error('A conferência excedeu 30 minutos')),
      30 * 60 * 1000,
    )
    let heartbeat: Promise<void> | undefined
    const renewal = setInterval(() => {
      heartbeat ??= this.repo
        .renewVerification(job)
        .then((active) => {
          if (!active) abort.abort(new Error('A concessão da conferência expirou'))
        })
        .catch((error) => abort.abort(error))
        .finally(() => {
          heartbeat = undefined
        })
    }, 30000)
    try {
      const result = await this.verify(job, abort.signal)
      abort.signal.throwIfAborted()
      await this.repo.finishVerification(job, result)
    } catch (error) {
      await this.repo.finishVerification(job, {
        valid: false,
        error:
          error instanceof Error
            ? error.message.slice(0, 500)
            : 'Falha de rede ao conferir arquivo',
        retryable: true,
      })
    } finally {
      clearTimeout(timeout)
      clearInterval(renewal)
      await heartbeat
      this.abort = undefined
    }
  }
  private async verify(job: VerificationJob, signal: AbortSignal) {
    const head = await this.store.head(job.storageKey)
    signal.throwIfAborted()
    if (!head.exists || head.sizeBytes !== job.manifest.size)
      return {
        valid: false,
        error: 'O tamanho recebido difere do manifesto; envie novamente o arquivo original',
        retryable: false,
      }
    const body = await this.store.getStream(job.storageKey, signal),
      reader = body.getReader(),
      hash = createHash('sha256')
    let size = 0
    const cancel = () => {
      void reader.cancel(signal.reason).catch(() => undefined)
    }
    signal.addEventListener('abort', cancel, { once: true })
    try {
      while (true) {
        signal.throwIfAborted()
        const { value, done } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > job.manifest.size) {
          await reader.cancel('Arquivo excede manifesto')
          return {
            valid: false,
            error: 'O arquivo recebido excede o tamanho declarado',
            retryable: false,
          }
        }
        hash.update(value)
      }
      signal.throwIfAborted()
      const valid = size === job.manifest.size && hash.digest('hex') === job.manifest.sha256
      return {
        valid,
        error: valid ? null : 'O hash recebido difere do original; envie novamente o arquivo',
        retryable: false,
      }
    } finally {
      signal.removeEventListener('abort', cancel)
      reader.releaseLock()
    }
  }
}
