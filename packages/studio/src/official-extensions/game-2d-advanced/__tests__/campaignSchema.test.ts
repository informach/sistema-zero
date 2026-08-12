import { describe, expect, it } from 'bun:test'
import {
  CAMPAIGN_MAX_HEIGHT,
  CAMPAIGN_MAX_WIDTH,
  createCampaignStage,
  isCampaignStageExtraState,
  normalizeCampaignStage,
  validateCampaignStage,
} from '../campaignSchema'

describe('Esquema canônico de fase da campanha', () => {
  it('aceita uma fase criada pelo editor e devolve uma cópia normalizada', () => {
    const source = createCampaignStage('mundo-1')
    const validated = validateCampaignStage(source)

    expect(validated).toEqual(source)
    expect(validated).not.toBe(source)
    expect(isCampaignStageExtraState({ stage: source })).toBe(true)
  })

  it('rejeita chaves inesperadas, identificadores inseguros e valores não finitos', () => {
    expect(validateCampaignStage({ ...createCampaignStage(), script: 'alert(1)' })).toBeNull()
    expect(validateCampaignStage({ ...createCampaignStage(), id: '../fase' })).toBeNull()
    expect(
      validateCampaignStage({
        ...createCampaignStage(),
        entities: [{ kind: 'coin', x: Number.POSITIVE_INFINITY, y: 1 }],
      }),
    ).toBeNull()
    expect(
      validateCampaignStage({
        ...createCampaignStage(),
        triggers: [{ kind: 'aviso', x: 1, y: 1, w: 1, h: 1, target: '<script>' }],
      }),
    ).toBeNull()
  })

  it('exige identificadores únicos nas fases novas', () => {
    const source = createCampaignStage()
    expect(
      validateCampaignStage({
        ...source,
        entities: [
          { kind: 'hero', id: 'repetido', x: 1, y: 1 },
          { kind: 'gem', id: 'repetido', x: 2, y: 1 },
        ],
      }),
    ).toBeNull()
    expect(
      validateCampaignStage({
        ...source,
        entities: [{ kind: 'gem', x: 2, y: 1 }],
      }),
    ).toBeNull()
  })

  it('migra IDs legados de forma determinística, única e idempotente', () => {
    const source = createCampaignStage('legada')
    const legacy = {
      ...source,
      entities: [
        { kind: 'hero', id: 'inicio', x: 1, y: 1 },
        { kind: 'gem', id: 'gema', x: 2, y: 1 },
        { kind: 'gem', id: 'gema', x: 3, y: 1 },
        { kind: 'coin', x: 4, y: 1 },
      ],
    }

    const normalized = normalizeCampaignStage(legacy)
    expect(normalized?.entities.map((entity) => entity.id)).toEqual([
      'inicio',
      'gema',
      'gema-2',
      'coin-4',
    ])
    expect(normalizeCampaignStage(normalized)).toEqual(normalized)
    expect(validateCampaignStage(normalized)).toEqual(normalized)
  })

  it('aplica os limites profissionais do mapa sem aceitar conteúdo parcial', () => {
    const source = createCampaignStage()
    const firstRow = source.tiles[0]
    if (!firstRow) throw new Error('a fase padrão precisa de ao menos uma linha')
    expect(
      validateCampaignStage({
        ...source,
        width: CAMPAIGN_MAX_WIDTH + 1,
        tiles: source.tiles.map((row) => row.padEnd(CAMPAIGN_MAX_WIDTH + 1, '.')),
      }),
    ).toBeNull()
    expect(
      validateCampaignStage({
        ...source,
        height: CAMPAIGN_MAX_HEIGHT + 1,
        tiles: Array.from({ length: CAMPAIGN_MAX_HEIGHT + 1 }, () => firstRow),
      }),
    ).toBeNull()
    expect(validateCampaignStage({ ...source, tiles: [...source.tiles.slice(0, -1)] })).toBeNull()
  })
})
