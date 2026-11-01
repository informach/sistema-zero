import {
  CoursePublicationMediaResultSchema,
  CoursePublicationMediaTaskSchema,
  CourseTransferPendingError,
} from '@sistemazero/core/course/publication'
import { hash } from '../../domain/course-publication/course-sync'
import { CoursePublicationLeaseError } from '../../domain/course-publication/jobs'
import type {
  CoursePublicationMediaPort,
  CoursePublicationWorkRepository,
} from '../../domain/ports/course-publication.port'
import type { CoursePromotionProcessor } from './course-promotion.processor'
import { preparePublicationMedia, publicationMediaProof } from './publication-media'

/** One worker per process, with a database lease for coordination across replicas/restarts. */
export class CoursePublicationWorker {
  private running: Promise<boolean> | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private controller: AbortController | null = null
  private stopped = true
  private shutdown = false
  constructor(
    private readonly repo: CoursePublicationWorkRepository,
    private readonly media: CoursePublicationMediaPort,
    private readonly report: (jobId: string, error: unknown) => void = () => {},
    private readonly promotion?: CoursePromotionProcessor,
  ) {}

  runOnce(): Promise<boolean> {
    if (this.shutdown) return Promise.resolve(false)
    if (this.running) return this.running
    this.running = this.process().finally(() => {
      this.running = null
    })
    return this.running
  }
  private async process() {
    const claim = await this.repo.claim()
    if (!claim) return false
    if (this.shutdown) {
      await this.repo.release(claim)
      return true
    }
    const controller = new AbortController()
    this.controller = controller
    let renewing = false
    const heartbeat = setInterval(() => {
      if (renewing || controller.signal.aborted) return
      renewing = true
      void this.repo
        .renew(claim)
        .catch((error) => controller.abort(error))
        .finally(() => {
          renewing = false
        })
    }, 20_000)
    try {
      const captured = await this.repo.capture(claim.id)
      if (!captured || hash(captured.snapshot) !== captured.snapshotHash)
        throw new Error('Captura da publicação inválida')
      if (captured.operation === 'promote-kids') {
        if (!this.promotion) throw new Error('Processador de promoção indisponível')
        await this.promotion.run(claim, captured.snapshot, controller.signal)
        return true
      }
      if (captured.operation !== 'copy-adult') throw new Error('Operação de publicação inválida')
      await this.repo.initializeTasks(claim, [{ id: 'plan', kind: 'media-plan', input: {} }])
      const savedPlan = await this.repo.planTask(claim)
      let profileHash =
        typeof savedPlan.result?.profileHash === 'string' ? savedPlan.result.profileHash : undefined
      for (;;) {
        controller.signal.throwIfAborted()
        const task = await this.repo.nextTask(claim)
        if (!task) break
        if (task.kind === 'media-plan') {
          const plan = await preparePublicationMedia(
            this.media,
            captured.snapshot.source,
            controller.signal,
          )
          await this.repo.initializeTasks(
            claim,
            plan.tasks.map((entry) => ({
              id: entry.id,
              kind: entry.input.kind,
              input: entry.input,
            })),
          )
          await this.repo.finishTask(claim, task.id, {
            taskKeys: plan.tasks.map((entry) => entry.id),
            voices: plan.voices,
            profileHash: plan.profileHash,
          })
          profileHash = plan.profileHash
        } else {
          const input = CoursePublicationMediaTaskSchema.parse(task.input)
          if (!profileHash) throw new Error('Perfil de mídia da preparação ausente')
          const result = await this.media.execute(input, controller.signal, profileHash)
          controller.signal.throwIfAborted()
          await this.repo.finishTask(
            claim,
            task.id,
            CoursePublicationMediaResultSchema.parse(result),
          )
        }
      }
      controller.signal.throwIfAborted()
      const currentProfile = await this.media.plan([], controller.signal)
      if (currentProfile.profileHash !== profileHash)
        throw new Error('A configuração das mídias mudou antes da publicação')
      await this.repo.publishMirror(
        claim,
        publicationMediaProof(captured.snapshot, await this.repo.completedTasks(claim), new Date()),
      )
      return true
    } catch (error) {
      if (controller.signal.aborted && this.stopped) {
        await this.repo.release(claim).catch(() => {})
      } else if (error instanceof CourseTransferPendingError) {
        await this.repo.release(claim, 30)
      } else if (!(error instanceof CoursePublicationLeaseError)) {
        this.report(claim.id, error)
        // Provider responses may contain private URLs or credentials. Only a fixed message is public.
        await this.repo
          .fail(
            claim,
            'Não foi possível concluir a preparação. Confira as mídias e tente retomar o trabalho.',
          )
          .catch((failure) => {
            if (!(failure instanceof CoursePublicationLeaseError)) this.report(claim.id, failure)
          })
      }
      return true
    } finally {
      clearInterval(heartbeat)
      if (this.controller === controller) this.controller = null
    }
  }
  start() {
    if (!this.stopped) return
    this.stopped = false
    this.shutdown = false
    const tick = async () => {
      try {
        await this.runOnce()
      } catch (error) {
        this.report('queue', error)
      }
      if (!this.stopped)
        this.timer = setTimeout(() => {
          void tick()
        }, 2000)
    }
    void tick()
  }
  async stop() {
    this.stopped = true
    this.shutdown = true
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.controller?.abort(new Error('O serviço está encerrando'))
    await this.running
  }
}
