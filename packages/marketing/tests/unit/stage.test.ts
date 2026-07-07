import { describe, expect, it } from 'bun:test'
import {
  canCancel,
  canCreatePublications,
  isProductionStage,
  isValidManualMove,
  PRODUCTION_STAGES,
} from '../../src/domain/content/stage'

describe('stage machine', () => {
  it('permite mover entre etapas de produção em qualquer direção e distância', () => {
    expect(isValidManualMove('idea', 'script')).toBe(true)
    expect(isValidManualMove('idea', 'review')).toBe(true)
    expect(isValidManualMove('review', 'idea')).toBe(true)
    expect(isValidManualMove('editing', 'recording')).toBe(true)
    expect(isValidManualMove('review', 'approved')).toBe(true)
  })

  it('rejeita mover para a mesma etapa (no-op explícito)', () => {
    for (const stage of PRODUCTION_STAGES) {
      expect(isValidManualMove(stage, stage)).toBe(false)
    }
  })

  it('rejeita movimentos manuais de/para etapas derivadas ou terminais', () => {
    expect(isValidManualMove('approved', 'scheduled')).toBe(false)
    expect(isValidManualMove('scheduled', 'approved')).toBe(false)
    expect(isValidManualMove('published', 'idea')).toBe(false)
    expect(isValidManualMove('idea', 'published')).toBe(false)
    expect(isValidManualMove('canceled', 'idea')).toBe(false)
    expect(isValidManualMove('idea', 'canceled')).toBe(false)
  })

  it('published é imutável; o resto pode ser cancelado', () => {
    expect(canCancel('published')).toBe(false)
    expect(canCancel('canceled')).toBe(false)
    expect(canCancel('idea')).toBe(true)
    expect(canCancel('scheduled')).toBe(true)
  })

  it('publicações só nascem de conteúdo aprovado (ou além)', () => {
    expect(canCreatePublications('review')).toBe(false)
    expect(canCreatePublications('approved')).toBe(true)
    expect(canCreatePublications('scheduled')).toBe(true)
    expect(canCreatePublications('published')).toBe(true)
    expect(canCreatePublications('canceled')).toBe(false)
  })

  it('classifica etapas de produção', () => {
    expect(isProductionStage('cover_caption')).toBe(true)
    expect(isProductionStage('scheduled')).toBe(false)
  })
})
