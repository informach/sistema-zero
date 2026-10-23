import type { Logger } from '@sistemazero/core/logging'
import { chunkKnowledge } from '../../domain/kb/chunking'
import type { KbRepository } from '../../domain/ports/kb-repository.port'

export class KnowledgeIndexWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private inFlight: Promise<void> | null = null
  constructor(
    private readonly kb: KbRepository,
    private readonly now: () => Date,
    private readonly idGen: () => string,
    private readonly logger: Logger,
  ) {}

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => {
      if (!this.inFlight)
        this.inFlight = this.tick().finally(() => {
          this.inFlight = null
        })
    }, 1000)
  }
  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    await this.inFlight
  }
  async tick(): Promise<void> {
    try {
      const revision = await this.kb.claimIndex(this.now(), 60_000)
      if (!revision?.indexLeaseToken) return
      try {
        const chunks = chunkKnowledge(revision.id, revision.content, this.idGen)
        if (!chunks.length) throw new Error('EMPTY_KNOWLEDGE')
        await this.kb.finishIndex(revision.id, revision.indexLeaseToken, chunks, this.now())
      } catch {
        await this.kb.failIndex(revision.id, revision.indexLeaseToken, this.now())
        this.logger.warn('knowledge.index_failed', { revisionId: revision.id })
      }
    } catch {
      this.logger.error('knowledge.worker_failed')
    }
  }
}
