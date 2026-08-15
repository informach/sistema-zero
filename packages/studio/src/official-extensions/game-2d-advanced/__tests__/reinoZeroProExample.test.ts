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

  it('entrega 8 mundos × 4 fases validadas e encadeadas', () => {
    const expectedIds = Array.from({ length: 8 }, (_, world) =>
      Array.from({ length: 4 }, (_, order) => `${world + 1}-${order + 1}`),
    ).flat()

    expect(reinoZeroProStages).toHaveLength(32)
    expect(reinoZeroProStages.map((stage) => stage.id)).toEqual(expectedIds)
    expect(new Set(reinoZeroProStages.map((stage) => stage.id)).size).toBe(32)
    for (const stage of reinoZeroProStages) expect(validateCampaignStage(stage)).toEqual(stage)
    for (let index = 0; index < reinoZeroProStages.length - 1; index += 1) {
      expect(reinoZeroProStages[index]?.nextStage).toBe(reinoZeroProStages[index + 1]?.id)
    }
    expect(reinoZeroProStages.at(-1)?.nextStage).toBeUndefined()
  })

  it('⭐⭐ o TEMA sai do tipo da fase, e a tabela é conferida fase a fase', () => {
    // ⚠️ O teste que existia aqui era `new Set(themes).size === 8`, e ele passa
    // IGUAL nos dois esquemas: com o tema saindo do MUNDO também dá oito. Ele
    // trancava o defeito em vez de pegá-lo. As asserções abaixo falham no
    // esquema antigo, e falham nas DUAS direções.
    const tema = (id: string): string =>
      reinoZeroProStages.find((stage) => stage.id === id)?.theme ?? '?'

    // 1) Dentro do MESMO mundo as etapas mudam de céu. No esquema antigo, 1-1,
    //    1-2, 1-3 e 1-4 dividiam o mesmo azul.
    expect(tema('1-1')).toBe('campo')
    expect(tema('1-2')).toBe('caverna')
    expect(tema('1-3')).toBe('campo')
    expect(tema('1-4')).toBe('castelo')
    expect(new Set(['1-1', '1-2', '1-4'].map(tema)).size).toBe(3)

    // 2) Mundos DIFERENTES com o mesmo tipo dividem o tema. No esquema antigo
    //    isso era impossível: a chave era o mundo.
    expect(tema('2-1')).toBe(tema('1-1'))
    expect(tema('3-4')).toBe(tema('1-4'))

    // 3) A segunda metade da jornada troca a paleta dos mesmos tipos.
    expect(tema('5-1')).toBe('deserto')
    expect(tema('5-2')).toBe('vulcao')
    expect(tema('8-3')).toBe('neve')
    expect(tema('8-4')).toBe('ceu')
  })

  it('⭐ o elenco é medido por QUANTIDADE e distribuição, não por presença', () => {
    // ⚠️ Presença é satisfeita por UM inimigo no-op: era exatamente assim que o
    // espinho, que não fazia nada, contava como coberto.
    const entities = reinoZeroProStages.flatMap((stage) => stage.entities)
    const quantos = (kind: string): number => entities.filter((e) => e.kind === kind).length
    const fasesCom = (kind: string): number =>
      reinoZeroProStages.filter((stage) => stage.entities.some((e) => e.kind === kind)).length

    expect(quantos('boss')).toBe(8)
    expect(quantos('gem')).toBe(8)
    expect(new Set(entities.filter((e) => e.kind === 'gem').map((e) => e.id)).size).toBe(8)

    for (const kind of ['walker', 'flyer', 'spiky', 'shell'] as const) {
      expect({ kind, emOitoFases: fasesCom(kind) >= 8 }).toEqual({ kind, emOitoFases: true })
    }
    expect(quantos('spiky')).toBeGreaterThanOrEqual(20)
    expect(quantos('movingPlatform')).toBeGreaterThanOrEqual(6)
    expect(fasesCom('powerup')).toBeGreaterThanOrEqual(8)
    expect(fasesCom('checkpoint')).toBe(32)
    expect(fasesCom('secretExit')).toBe(8)

    // Toda fase tem elenco de verdade, e nenhuma tem elenco demais.
    for (const stage of reinoZeroProStages) {
      const bichos = stage.entities.filter((e) =>
        ['walker', 'flyer', 'spiky', 'shell'].includes(e.kind),
      ).length
      expect({ id: stage.id, ok: bichos >= 3 && bichos <= 8 }).toEqual({ id: stage.id, ok: true })
      expect({ id: stage.id, cabe: stage.entities.length <= 128 }).toEqual({
        id: stage.id,
        cabe: true,
      })
    }

    const tiles = new Set(
      reinoZeroProStages.flatMap((stage) => stage.tiles.flatMap((row) => [...row])),
    )
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
