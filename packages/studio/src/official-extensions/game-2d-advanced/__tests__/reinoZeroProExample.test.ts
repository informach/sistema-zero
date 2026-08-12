import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, type JSStatement, SZIRV2Schema } from '#ir'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { gameKitBlocks } from '../blocks'
import { validateCampaignStage } from '../campaignSchema'
import { gameKitExamples } from '../exampleCatalog'
import { reinoZeroProExample, reinoZeroProStages } from '../examples/reinoZeroProExample'
import { collectTypes, stripIds } from './exampleContractHarness'

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKitBlocks)
})

describe('Reino Zero Pro — campanha profissional vetorial', () => {
  it('está na galeria do Jogo 2D Avançado e não depende de assets externos', () => {
    expect(gameKitExamples).toContain(reinoZeroProExample)
    expect(reinoZeroProExample).toMatchObject({
      name: 'Reino Zero Pro',
      experience: 'game',
    })
    expect(reinoZeroProExample.assets ?? []).toEqual([])
    expect(reinoZeroProExample.description?.length).toBeLessThanOrEqual(200)
    expect(reinoZeroProExample.ir.extensions).toEqual([{ extensionId: 'game-2d-advanced' }])
  })

  it('entrega 8 mundos × 4 fases validadas, encadeadas e tematicamente distintas', () => {
    const expectedIds = Array.from({ length: 8 }, (_, world) =>
      Array.from({ length: 4 }, (_, order) => `${world + 1}-${order + 1}`),
    ).flat()

    expect(reinoZeroProStages).toHaveLength(32)
    expect(reinoZeroProStages.map((stage) => stage.id)).toEqual(expectedIds)
    expect(new Set(reinoZeroProStages.map((stage) => stage.id)).size).toBe(32)
    expect(new Set(reinoZeroProStages.map((stage) => stage.theme)).size).toBe(8)
    for (const stage of reinoZeroProStages) expect(validateCampaignStage(stage)).toEqual(stage)
    for (let index = 0; index < reinoZeroProStages.length - 1; index += 1) {
      expect(reinoZeroProStages[index]?.nextStage).toBe(reinoZeroProStages[index + 1]?.id)
    }
    expect(reinoZeroProStages.at(-1)?.nextStage).toBeUndefined()
  })

  it('cobre chefes, gemas, segredos, poderes, plataformas e todos os materiais', () => {
    const entities = reinoZeroProStages.flatMap((stage) => stage.entities)
    const entityKinds = new Set(entities.map((entity) => entity.kind))
    const tiles = new Set(
      reinoZeroProStages.flatMap((stage) => stage.tiles.flatMap((row) => [...row])),
    )

    expect(entities.filter((entity) => entity.kind === 'boss')).toHaveLength(8)
    expect(entities.filter((entity) => entity.kind === 'gem')).toHaveLength(8)
    expect(
      new Set(entities.filter((entity) => entity.kind === 'gem').map((entity) => entity.id)).size,
    ).toBe(8)
    for (const kind of [
      'walker',
      'flyer',
      'spiky',
      'shell',
      'movingPlatform',
      'checkpoint',
      'secretExit',
      'powerup',
    ] as const) {
      expect(entityKinds.has(kind)).toBe(true)
    }
    for (const tile of ['.', '#', '=', 'B', '?', '^', '~', 'H']) expect(tiles.has(tile)).toBe(true)
  })

  it('mantém cada gema fora de células sólidas', () => {
    for (const stage of reinoZeroProStages) {
      for (const gem of stage.entities.filter((entity) => entity.kind === 'gem')) {
        const tile = stage.tiles[gem.y]?.[gem.x]
        expect(tile === '#' || tile === 'B' || tile === '?').toBe(false)
      }
    }
  })

  it('declara oito gemas obrigatórias e demonstra regiões pelo pipeline de eventos', () => {
    const statements = behaviorStatements(reinoZeroProExample.ir)
    const campaign = statements.find((statement) => statement.type === 'gk:defineCampaign')
    const eventNames = statements.flatMap((statement) =>
      statement.type === 'gk:onCampaignEvent' ? [statement.event] : [],
    )

    expect(campaign).toMatchObject({ requiredGems: { type: 'num', value: 8 } })
    expect(eventNames).toEqual(['dica', 'fim'])
    expect(collectTypes(statements).has('gk:campaignEventValue')).toBe(true)
  })

  it('valida e mantém fixpoint textual sem rawJS nem memberCall', () => {
    const parsedSchema = SZIRV2Schema.safeParse(reinoZeroProExample.ir)
    expect(
      parsedSchema.success,
      parsedSchema.success ? '' : JSON.stringify(parsedSchema.error.issues),
    ).toBe(true)
    const embedded = stripIds(behaviorStatements(reinoZeroProExample.ir)) as JSStatement[]
    const code = compileStatements(embedded, 0)
    const reparsed = stripIds(parseJS(code)) as JSStatement[]

    expect(collectTypes(reparsed).has('rawJS')).toBe(false)
    expect(collectTypes(reparsed).has('memberCall')).toBe(false)
    expect(reparsed).toEqual(embedded)
    expect(compileStatements(reparsed, 0)).toBe(code)
  })

  it('preserva as 32 fases no round-trip IR → blocos → IR', () => {
    const state = buildWorkspaceStateFromIR(reinoZeroProExample.ir)
    const workspace = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state, workspace)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(workspace))) as JSStatement[]
      const embedded = stripIds(behaviorStatements(reinoZeroProExample.ir)) as JSStatement[]

      expect(rebuilt).toEqual(embedded)
      expect(
        rebuilt.filter((statement) => statement.type === 'gk:defineCampaignStage'),
      ).toHaveLength(32)
    } finally {
      workspace.dispose()
    }
  })
})
