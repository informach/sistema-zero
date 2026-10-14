import { createHash } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import {
  evaluateLearning,
  isLearningAnswers,
  type LearningAnswers,
  type LearningAttemptView,
  type LearningBlockProgress,
  type LessonLearningProgress,
  learningHints,
} from '@sistemazero/core/learning'
import {
  isExperimentCommand,
  readSceneSegment,
  SceneConflictError,
} from '@sistemazero/core/learning/scene'
import {
  LiveAccessError,
  LiveConflictError,
  LiveNotFoundError,
} from '../../domain/live/live.errors'
import type {
  LiveActor,
  LiveRepository,
  LiveTransactionReads,
} from '../../domain/ports/live-repository.port'
import {
  applySceneSegment,
  type LearningProgressInput,
  readSceneCheckpointOf,
  sceneStartOf,
} from '../learning/learning.service'
import type { LiveContext, LiveService } from './live.service'

/** Shared activity evaluators, with a live session identity and no course/unlock fiction. */
export class LiveLearningService {
  constructor(
    private readonly live: LiveService,
    private readonly repository: LiveRepository,
    private readonly clock: () => Date,
  ) {}
  private blocks(context: LiveContext) {
    return context.session.plan.steps?.flatMap((step) => step.blocks) ?? []
  }
  async preview(actor: LiveActor, sessionId: string) {
    const context = await this.live.requireContext(actor, sessionId)
    if (context.role !== 'teacher') throw new LiveAccessError()
    return { steps: structuredClone(context.session.plan.steps ?? []) }
  }
  private block(context: LiveContext, id: string, revision: string) {
    const block = this.blocks(context).find((item) => item.id === id)
    if (!block) throw new LiveNotFoundError()
    if (block.revision !== revision)
      throw new LiveConflictError('A atividade mudou. Abra o encontro de novo antes de continuar.')
    return block
  }
  async read(actor: LiveActor, sessionId: string): Promise<LessonLearningProgress> {
    const context = await this.live.requireContext(actor, sessionId)
    this.live.assertAvailable(context)
    if (context.role === 'teacher') return { sectionId: null, blocks: [] }
    const blocks = this.blocks(context)
    const saved = await this.repository.readLearningProgress(sessionId, actor.id, actor.accountId)
    return {
      sectionId: null,
      blocks: saved.filter((progress) =>
        blocks.some(
          (block) => block.id === progress.blockId && block.revision === progress.revision,
        ),
      ),
    }
  }
  private validate(
    context: LiveContext,
    blockId: string,
    input: Omit<LearningProgressInput, 'positionSeconds'>,
  ) {
    if (context.role !== 'learner')
      throw new LiveAccessError('A prévia da professora não grava respostas da turma.')
    const block = this.block(context, blockId, input.revision)
    if (
      !isLearningAnswers(input.answers) ||
      !Number.isInteger(input.hintsUsed) ||
      input.hintsUsed < 0 ||
      input.hintsUsed > learningHints(block.content).length
    )
      throw new ValidationError('Respostas ou pistas inválidas.')
    return block
  }
  /** Read through the transaction that holds the cohort lock (never a second connection). */
  private current(
    reads: LiveTransactionReads,
    actor: LiveActor,
    sessionId: string,
    blockId: string,
    revision: string,
  ) {
    return reads
      .learningProgress(sessionId, actor.id, actor.accountId)
      .then((rows) => rows.find((item) => item.blockId === blockId && item.revision === revision))
  }
  async save(actor: LiveActor, sessionId: string, blockId: string, input: LearningProgressInput) {
    return this.live.withAvailableSession(actor, sessionId, async (context, reads) => {
      const block = this.validate(context, blockId, input)
      if (
        input.positionSeconds !== null &&
        (!Number.isInteger(input.positionSeconds) ||
          input.positionSeconds < 0 ||
          input.positionSeconds > 86_400)
      )
        throw new ValidationError('Posição inválida.')
      const previous = await this.current(reads, actor, sessionId, blockId, input.revision)
      let answers = input.answers
      const scene = sceneStartOf(block.content)
      if (scene) {
        const segment = readSceneSegment(answers)
        if (
          !segment ||
          segment.commands.some((command) => !isExperimentCommand(command, scene.start))
        )
          throw new ValidationError('Comando inválido para esta experiência.')
        const checkpoint = previous ? readSceneCheckpointOf(scene, previous.answers) : null
        const hash = createHash('sha256').update(JSON.stringify(segment)).digest('hex')
        if (previous && checkpoint?.checkpoint.segmentId === segment.segmentId) {
          if (previous.answers.segmentHash !== hash)
            throw new LiveConflictError('Este segmento já foi enviado com outro conteúdo.')
          return previous
        }
        if (segment.baseSequence !== (checkpoint?.checkpoint.sequence ?? 0))
          throw new LiveConflictError(
            'A experiência tem uma versão mais recente. Reabra esta etapa.',
          )
        try {
          answers = { ...applySceneSegment(scene, checkpoint, segment), segmentHash: hash }
        } catch (error) {
          if (error instanceof SceneConflictError) throw new LiveConflictError()
          throw error
        }
      }
      if (!isLearningAnswers(answers))
        throw new ValidationError('O estado desta atividade passou do tamanho permitido.')
      const progress: LearningBlockProgress = {
        blockId,
        revision: input.revision,
        answers,
        hintsUsed: Math.max(previous?.hintsUsed ?? 0, input.hintsUsed),
        positionSeconds: input.positionSeconds,
        attemptsCount: previous?.attemptsCount ?? 0,
        result: previous?.result ?? null,
        updatedAt: this.clock().toISOString(),
      }
      context.aggregate.learningWrites = [
        { sessionId, learnerId: actor.id, accountId: actor.accountId, progress },
      ]
      return progress
    })
  }
  async attempt(
    actor: LiveActor,
    sessionId: string,
    blockId: string,
    input: Omit<LearningProgressInput, 'positionSeconds'> & { id: string },
  ) {
    return this.live.withAvailableSession(actor, sessionId, async (context, reads) => {
      const block = this.validate(context, blockId, input)
      const previous = await this.current(reads, actor, sessionId, blockId, input.revision)
      const existing = await reads.learningAttempt(sessionId, actor.id, actor.accountId, input.id)
      if (existing) {
        if (existing.blockId !== blockId || existing.revision !== input.revision || !previous)
          throw new LiveConflictError()
        return { attempt: existing, progress: previous }
      }
      let answers: LearningAnswers = input.answers
      const isScene = sceneStartOf(block.content) !== null
      if (isScene) {
        if (
          !previous ||
          ['sceneSequence', 'sceneSessionId', 'sceneSegmentId'].some(
            (key) => previous.answers[key] !== answers[key],
          )
        )
          throw new LiveConflictError('Guarde esta experiência antes de conferir a resposta.')
        const responded: LearningAnswers = {}
        for (const key of ['checkpoint', 'prediction'])
          if (input.answers[key] !== undefined) responded[key] = input.answers[key]!
        answers = { ...previous.answers, ...responded }
      }
      if (!isLearningAnswers(answers))
        throw new ValidationError('O estado desta atividade passou do tamanho permitido.')
      const attempt: LearningAttemptView = {
        id: input.id,
        blockId,
        revision: input.revision,
        answers,
        hintsUsed: input.hintsUsed,
        result: evaluateLearning(block.content, answers),
        createdAt: this.clock().toISOString(),
      }
      const progress: LearningBlockProgress = {
        blockId,
        revision: input.revision,
        positionSeconds: previous?.positionSeconds ?? null,
        // `answers` already contains the authoritative scene plus the learner's response.
        answers,
        hintsUsed: Math.max(previous?.hintsUsed ?? 0, input.hintsUsed),
        attemptsCount: (previous?.attemptsCount ?? 0) + 1,
        result: previous?.result?.passed ? previous.result : attempt.result,
        updatedAt: attempt.createdAt,
      }
      context.aggregate.learningWrites = [
        { sessionId, learnerId: actor.id, accountId: actor.accountId, progress, attempt },
      ]
      return { attempt, progress }
    })
  }
}
