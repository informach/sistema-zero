import type { Logger } from '@sistemazero/core/logging'
import { FeedError, type FeedSource } from '../../domain/intelligence/feed'
import type {
  MonitoringJob,
  MonitoringRepository,
} from '../../domain/ports/monitoring-repository.port'
import type { StaffDirectory } from '../../domain/ports/staff-directory.port'

/** Durable claims are shared by server replicas. No personal AI credential or
 * local inference is used here; local research becomes an explicit waiting state. */
export class MonitoringWorker {
  private timer: ReturnType<typeof setInterval> | undefined
  private flight: Promise<void> | undefined
  private abort: AbortController | undefined
  private stopping = false
  constructor(
    private readonly repo: Pick<MonitoringRepository, 'claim' | 'finish'>,
    private readonly source: FeedSource,
    private readonly directory: StaffDirectory,
    private readonly logger: Logger,
    private readonly intervalMs = 15000,
  ) {}
  start() {
    if (this.stopping && this.flight) throw new Error('Aguarde o encerramento do acompanhamento')
    this.stopping = false
    this.timer ??= setInterval(() => {
      void this.tick()
    }, this.intervalMs)
  }
  async stop() {
    this.stopping = true
    clearInterval(this.timer)
    this.timer = undefined
    this.abort?.abort()
    await this.flight
  }
  tick() {
    if (this.stopping) return Promise.resolve()
    this.flight ??= this.cycle()
      .catch(() =>
        this.logger.error('monitoring.cycle.failed', {
          message: 'Falha ao coordenar a coleta; tarefas preservadas no servidor',
        }),
      )
      .finally(() => {
        this.flight = undefined
      })
    return this.flight
  }
  private async active(job: MonitoringJob) {
    const people = await this.directory.lookup({ ids: [job.ownerId] })
    return people.some((person) => person.id === job.ownerId && person.active)
  }
  private async cycle() {
    for (let index = 0; index < 5 && !this.stopping; index++) {
      const job = await this.repo.claim()
      if (!job) return
      const abort = new AbortController()
      this.abort = abort
      try {
        if (this.stopping) abort.abort()
        if (!(await this.active(job)))
          throw new FeedError(
            'O responsável não está ativo. Outra pessoa da equipe precisa assumir o acompanhamento.',
            false,
          )
        abort.signal.throwIfAborted()
        if (!job.config.feedUrl || job.config.mode !== 'feed')
          throw new FeedError('Fonte sem coleta suportada no servidor', false)
        const result = await this.source.collect(
          { url: job.config.feedUrl, etag: job.etag },
          abort.signal,
        )
        abort.signal.throwIfAborted()
        if (!(await this.active(job)))
          throw new FeedError(
            'O responsável perdeu acesso durante a coleta. O resultado não foi aplicado.',
            false,
          )
        await this.repo.finish(job, { result })
      } catch (error) {
        await this.repo.finish(job, {
          error:
            error instanceof FeedError
              ? error.message
              : 'A coleta foi interrompida. A última observação válida foi preservada.',
          retryable: error instanceof FeedError ? error.retryable : true,
          retryAfterMs: error instanceof FeedError ? error.retryAfterMs : 0,
        })
      } finally {
        this.abort = undefined
      }
    }
  }
}
