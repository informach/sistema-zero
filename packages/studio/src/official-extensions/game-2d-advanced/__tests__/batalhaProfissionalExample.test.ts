import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, type JSStatement } from '#ir'
import {
  collectStatements,
  collectTypes,
  parseExampleLifecycleSource,
  stripIds,
} from './exampleContractHarness'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { BATALHA_PROFISSIONAL_SOURCE as SOURCE } from '../__gen_batalhaProfissional'
import { gameKitBlocks } from '../blocks'
import { batalhaProfissionalExample } from '../examples'

/**
 * Drift do exemplo "Batalha de Monstrinhos Profissional" — o nível 2 da
 * família de batalha de monstrinhos sobre o 👾 Kit Monstrinhos COMPLETO, SEM
 * nenhum bloco do Kit RPG. A IR embutida em examples/ foi GERADA pelo parser
 * real a partir do SOURCE (que mora no __gen_batalhaProfissional.ts, importado
 * aqui para que fonte e teste NUNCA possam divergir).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKitBlocks)
})

describe('Exemplo Batalha de Monstrinhos Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d-advanced', () => {
    expect(gameKitExamples).toContain(batalhaProfissionalExample)
    expect(batalhaProfissionalExample.ir.extensions).toEqual([{ extensionId: 'game-2d-advanced' }])
    expect(batalhaProfissionalExample.name).toBe('Batalha de Monstrinhos Profissional')
    expect(batalhaProfissionalExample.experience).toBe('game')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE, true))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(batalhaProfissionalExample.ir)) as JSStatement[],
    )
  })

  it('⭐ a tabela de vantagem é REAL: a criança escreve o triângulo com 2x e 0.5x', () => {
    const statements = behaviorStatements(batalhaProfissionalExample.ir)
    const chart = collectStatements(statements, 'gk:pkmTypeChart') as Array<{
      atk: string
      def: string
      mult: { type: string; value: number }
    }>
    expect(chart.length).toBe(6)
    const rules = chart.map((row) => `${row.atk}>${row.def}=${row.mult.value}`)
    // O triângulo completo, nos DOIS sentidos (super efetivo E não muito eficaz).
    for (const rule of [
      'fogo>planta=2',
      'planta>fogo=0.5',
      'água>fogo=2',
      'fogo>água=0.5',
      'planta>água=2',
      'água>planta=0.5',
    ]) {
      expect(rules).toContain(rule)
    }
  })

  it('fichas em tabela: criaturas minhas E da rival, golpes com tipo e força', () => {
    const statements = behaviorStatements(batalhaProfissionalExample.ir)
    const creatures = collectStatements(statements, 'gk:pkmCreature') as Array<{ name: string }>
    // 3 minhas + 3 da rival + o lendário: tudo é DADO, nenhum código duplicado.
    expect(creatures.length).toBeGreaterThanOrEqual(7)
    const moves = collectStatements(statements, 'gk:pkmMove') as Array<{ creature: string }>
    expect(moves.length).toBeGreaterThanOrEqual(8)
    // Toda criatura tem pelo menos um golpe ensinado (o esquecimento nº 1 do kit).
    for (const creature of creatures) {
      expect(moves.some((move) => move.creature === creature.name)).toBe(true)
    }
    const types = collectTypes(statements)
    expect(types.has('gk:pkmCatchDifficulty')).toBe(true)
  })

  it('⭐ time com memória: pkmGive monta o time e o kit lembra a vida entre trocas', () => {
    const statements = behaviorStatements(batalhaProfissionalExample.ir)
    // O time nasce com 3 monstrinhos (a memória de vida entre trocas e batalhas
    // é do MOTOR: quem sai de campo volta com a vida que tinha).
    expect(collectStatements(statements, 'gk:pkmGive').length).toBe(3)
    const types = collectTypes(statements)
    expect(types.has('gk:pkmGiveBall')).toBe(true)
    expect(types.has('gk:pkmDrawTeam')).toBe(true) // o HUD mostra o time inteiro
    expect(types.has('gk:pkmHealTeam')).toBe(true) // o Centro de Cura num bloco
  })

  it('batalha de treinador com menus do kit + encontro selvagem com captura', () => {
    const statements = behaviorStatements(batalhaProfissionalExample.ir)
    const types = collectTypes(statements)
    expect(types.has('gk:pkmBattleTrainer')).toBe(true)
    expect(types.has('gk:pkmTrainerCreature')).toBe(true)
    expect(types.has('gk:pkmBattleWild')).toBe(true)
    // A vitória é a CAPTURA: pkmCaught() no TOPO do onUpdate (fechar batalha é
    // RETOMADA e o motor de propósito NÃO roda onEnterState("jogando") nesse
    // caminho).
    expect(types.has('gk:pkmCaught')).toBe(true)
    // O pátio é movimento livre + regiões (fonte e mato fundo).
    for (const t of [
      'gk:moveWithKeys',
      'gk:defineRegion',
      'gk:overlapPercent',
      'gk:chance',
      'gk:everySeconds',
      'gk:setScreenText',
      'gk:playEffect',
      'gk:defineLook',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    expect(batalhaProfissionalExample.assets ?? []).toHaveLength(0)
  })

  it('⭐ não mistura kits: zero rpg_* (fora o fim de batalha), luta/nave/td e Jogo 2D básico', () => {
    // rpgOnBattleEnd/rpgBattleWon são o conceito COMPARTILHADO de fim de
    // batalha dos dois kits (não existe pkmOnBattleEnd — ver ai.ts): não
    // contam como mistura. O resto do Kit RPG continua proibido aqui.
    const sharedBattleEnd = new Set(['gk:rpgOnBattleEnd', 'gk:rpgBattleWon'])
    const types = collectTypes(behaviorStatements(batalhaProfissionalExample.ir))
    for (const type of types) {
      expect(type.startsWith('gk:rpg') && !sharedBattleEnd.has(type)).toBe(false)
      expect(type.startsWith('gk:luta')).toBe(false)
      expect(type.startsWith('gk:nave')).toBe(false)
      expect(type.startsWith('gk:td')).toBe(false)
      expect(type.startsWith('g2d:')).toBe(false)
    }
  })

  it('⭐ a fonte repõe as bolas zeradas: a captura (única vitória) nunca fica impossível', () => {
    const statements = behaviorStatements(batalhaProfissionalExample.ir)
    const raw = JSON.stringify(statements)
    // Dentro do root da fonte: se pkmBallCount() == 0 → pkmGiveBall(3, 65).
    expect(raw).toContain('"type":"gk:pkmBallCount"')
    const refills = collectStatements(statements, 'gk:pkmGiveBall') as Array<{
      count: { value: number }
    }>
    // Uma carga inicial (5) + a reposição da fonte (3).
    expect(refills.map((s) => s.count.value).sort()).toEqual([3, 5])
    expect(raw).toContain('Bolas novas!')
  })

  it('⭐ o mato só sorteia encontro com o time em pé (gate timeCaido)', () => {
    const statements = behaviorStatements(batalhaProfissionalExample.ir)
    const raw = JSON.stringify(statements)
    // O hook compartilhado marca a queda: sem vitória e sem captura → timeCaido = 1.
    const hooks = collectStatements(statements, 'gk:rpgOnBattleEnd')
    expect(hooks.length).toBe(1)
    const rawHook = JSON.stringify(hooks[0])
    expect(rawHook).toContain('"type":"gk:rpgBattleWon"')
    expect(rawHook).toContain('"type":"gk:pkmCaught"')
    expect(rawHook).toContain('"name":"timeCaido","value":{"type":"num","value":1}')
    // O root do mato exige timeCaido == 0 antes do chance + pkmBattleWild —
    // sem o gate, o time desmaiado virava spam de fala a cada 1-3s.
    const wildCalls = collectStatements(statements, 'gk:pkmBattleWild')
    expect(wildCalls.length).toBe(1)
    expect(raw).toContain(
      '"op":"==","left":{"type":"var","name":"timeCaido"},"right":{"type":"num","value":0}',
    )
    // A fonte reabre o mato junto com a cura.
    expect(raw).toContain('"name":"timeCaido","value":{"type":"num","value":0}')
  })

  it('textos visíveis sem travessão', () => {
    expect(JSON.stringify(batalhaProfissionalExample.ir)).not.toContain('—')
    expect(batalhaProfissionalExample.description ?? '').not.toContain('—')
    expect((batalhaProfissionalExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(batalhaProfissionalExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      batalhaProfissionalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(batalhaProfissionalExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})

import { gameKitExamples } from '../exampleCatalog'
