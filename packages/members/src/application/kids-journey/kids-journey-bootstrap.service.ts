import { IdentityUuidSchema } from '@sistemazero/core/identity'
import { ValidationError } from '@sistemazero/core/errors'
import { z } from 'zod'
import { KidsJourneyConflictError } from '../../domain/kids-journey/kids-journey.errors'
import type { KidsJourneyRepository } from '../../domain/ports/kids-journey-repository.port'
import type { KidsSeedCaptureService } from './kids-seed-capture.service'

type Port = Pick<KidsJourneyRepository, 'initializeSeed' | 'createSeedPreparation' | 'getPreparation' | 'advanceCapture' | 'advancePreparation' | 'publishPrepared'>

/** Operator-only controlled rollout. Never called by startup or a normal child read. */
export class KidsJourneyBootstrapService {
  constructor(private readonly repository: Port, private readonly authCapture: Pick<KidsSeedCaptureService, 'advance'>) {}

  async initialize() {
    const policy = await this.repository.initializeSeed()
    if (policy.phase === 'published') return { status: 'already-published' as const, policy }
    const preparation = await this.repository.createSeedPreparation()
    if (!preparation) throw new KidsJourneyConflictError()
    return { status: 'initializing' as const, policy, preparation }
  }

  private async preparation(inputId: string) {
    const parsed = IdentityUuidSchema.safeParse(inputId)
    if (!parsed.success) throw new ValidationError('Identificador de preparação inválido.')
    const current = await this.repository.getPreparation(parsed.data)
    if (!current || current.origin !== 'seed') throw new ValidationError('A preparação inicial não está disponível.')
    return current
  }

  /** One bounded stage operation; Auth stage fetches at most one page of20 owners. */
  async advance(inputId: string) {
    const current = await this.preparation(inputId)
    if (current.status === 'capturing') {
      const next = current.captureStage === 'auth'
        ? await this.authCapture.advance(current.id)
        : await this.repository.advanceCapture(current.id, current.captureStage, current.captureCursor)
      if (!next) throw new KidsJourneyConflictError()
      return { status: 'advanced' as const, preparation: next }
    }
    if (current.status === 'preparing') {
      const result = await this.repository.advancePreparation(current.id, current.cursor)
      if (result.status !== 'advanced') return { status: result.status, preparation: await this.preparation(current.id) }
      return { status: 'advanced' as const, preparation: result.preparation }
    }
    return { status: current.status, preparation: current }
  }

  async publish(inputId: string) {
    const current = await this.preparation(inputId)
    if (current.status === 'published') return { status: 'already-published' as const }
    if (current.status !== 'ready' || current.expectedVersion !== 0 || !current.cohortHash)
      throw new ValidationError('Conclua a captura e a preservação antes de publicar a jornada inicial.')
    const policy = await this.repository.publishPrepared({
      preparationId: current.id, expectedVersion: 0, draftHash: current.draftHash,
      catalogHash: current.catalogHash, cohortHash: current.cohortHash, actor: { kind: 'system' },
    })
    if (!policy) throw new KidsJourneyConflictError()
    return { status: 'published' as const, policy }
  }
}
