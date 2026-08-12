import { describe, expect, it } from 'bun:test'
import {
  CAMPAIGN_ENTITY_KINDS,
  campaignEntityDefinition,
  campaignEntityPropsIssue,
} from '../campaignEntityCatalog'
import { createCampaignStage, validateCampaignStage } from '../campaignSchema'

describe('catálogo de entidades da campanha', () => {
  it('expõe rótulos e propriedades editáveis para cada tipo do runtime', () => {
    expect(CAMPAIGN_ENTITY_KINDS).toHaveLength(15)
    expect(campaignEntityDefinition('walker')).toMatchObject({ label: 'Inimigo terrestre' })
    expect(campaignEntityDefinition('walker').properties.map(({ key }) => key)).toEqual([
      'speed',
      'direction',
    ])
    expect(campaignEntityDefinition('boss').properties.map(({ key }) => key)).toEqual([
      'health',
      'speed',
      'range',
    ])
    expect(campaignEntityDefinition('exit').properties.map(({ key }) => key)).toEqual([
      'requiresBoss',
    ])
  })

  it('valida propriedades conhecidas sem apagar extensões legadas', () => {
    expect(campaignEntityPropsIssue('boss', { health: 2 })?.key).toBe('health')
    expect(campaignEntityPropsIssue('walker', { direction: 0 })?.key).toBe('direction')
    expect(campaignEntityPropsIssue('exit', { requiresBoss: 'sim' })?.key).toBe('requiresBoss')
    expect(campaignEntityPropsIssue('boss', { health: 8, speed: 22, range: 48 })).toBeNull()
    expect(campaignEntityPropsIssue('boss', { extensaoLegada: 'preservada' })).toBeNull()
  })

  it('faz o schema rejeitar valores que o runtime não conseguiria interpretar', () => {
    const invalid = createCampaignStage()
    invalid.entities.push({ kind: 'boss', id: 'chefe', x: 8, y: 8, props: { health: 1 } })

    expect(validateCampaignStage(invalid)).toBeNull()
  })
})
