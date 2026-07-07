import { describe, expect, test } from 'bun:test'
import {
  CONTENT_STAGES,
  CONTENT_TYPE_LABELS,
  CONTENT_TYPES,
  isProductionStage,
  isValidManualMove,
  PRODUCTION_STAGES,
  STAGE_COLORS,
  STAGE_LABELS,
} from '../src/lib/pipeline'

describe('PRODUCTION_STAGES', () => {
  test('as 7 etapas de produção, na ordem do pipeline', () => {
    expect(PRODUCTION_STAGES).toEqual([
      'idea',
      'script',
      'recording',
      'editing',
      'cover_caption',
      'review',
      'approved',
    ])
  })

  test('CONTENT_STAGES cobre produção + derivadas + terminal', () => {
    expect(CONTENT_STAGES).toEqual([...PRODUCTION_STAGES, 'scheduled', 'published', 'canceled'])
  })
})

describe('isProductionStage', () => {
  test('etapas de produção são movíveis', () => {
    for (const stage of PRODUCTION_STAGES) {
      expect(isProductionStage(stage)).toBe(true)
    }
  })

  test('derivadas e terminal não são de produção', () => {
    expect(isProductionStage('scheduled')).toBe(false)
    expect(isProductionStage('published')).toBe(false)
    expect(isProductionStage('canceled')).toBe(false)
  })
})

describe('isValidManualMove', () => {
  test('qualquer direção e distância DENTRO da produção', () => {
    expect(isValidManualMove('idea', 'approved')).toBe(true)
    expect(isValidManualMove('approved', 'idea')).toBe(true)
    expect(isValidManualMove('recording', 'editing')).toBe(true)
    expect(isValidManualMove('review', 'script')).toBe(true)
  })

  test('mover p/ a MESMA etapa é inválido (no-op vira aviso)', () => {
    expect(isValidManualMove('idea', 'idea')).toBe(false)
    expect(isValidManualMove('review', 'review')).toBe(false)
  })

  test('scheduled/published/canceled nunca se alcançam na mão', () => {
    expect(isValidManualMove('approved', 'scheduled')).toBe(false)
    expect(isValidManualMove('approved', 'published')).toBe(false)
    expect(isValidManualMove('review', 'canceled')).toBe(false)
  })

  test('nem se deixam na mão', () => {
    expect(isValidManualMove('scheduled', 'approved')).toBe(false)
    expect(isValidManualMove('published', 'idea')).toBe(false)
    expect(isValidManualMove('canceled', 'idea')).toBe(false)
  })
})

describe('labels e cores', () => {
  test('toda etapa tem rótulo PT e classes de cor', () => {
    for (const stage of CONTENT_STAGES) {
      expect(STAGE_LABELS[stage]).toBeTruthy()
      expect(STAGE_COLORS[stage]).toBeTruthy()
    }
  })

  test('rótulos canônicos', () => {
    expect(STAGE_LABELS.idea).toBe('Ideia')
    expect(STAGE_LABELS.script).toBe('Roteiro')
    expect(STAGE_LABELS.recording).toBe('Gravação')
    expect(STAGE_LABELS.editing).toBe('Edição')
    expect(STAGE_LABELS.cover_caption).toBe('Capa e legenda')
    expect(STAGE_LABELS.review).toBe('Revisão')
    expect(STAGE_LABELS.approved).toBe('Aprovado')
    expect(STAGE_LABELS.scheduled).toBe('Agendado')
    expect(STAGE_LABELS.published).toBe('Publicado')
    expect(STAGE_LABELS.canceled).toBe('Cancelado')
  })

  test('todo tipo de conteúdo tem rótulo PT', () => {
    for (const type of CONTENT_TYPES) {
      expect(CONTENT_TYPE_LABELS[type]).toBeTruthy()
    }
    expect(CONTENT_TYPE_LABELS.reels).toBe('Reels')
    expect(CONTENT_TYPE_LABELS.video_long).toBe('Vídeo longo')
    expect(CONTENT_TYPE_LABELS.carousel).toBe('Carrossel')
    expect(CONTENT_TYPE_LABELS.static_post).toBe('Post estático')
    expect(CONTENT_TYPE_LABELS.story).toBe('Story')
  })
})
