import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, type JSStatement, normalizeSZIR } from '#ir'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { BATALHA_PROFISSIONAL_SOURCE as SOURCE } from '../__gen_batalhaProfissional'
import { gameKitBlocks } from '../blocks'
import { batalhaProfissionalExample } from '../examples'
import { withIndependentPeriodicLoops } from '../examples/withIndependentPeriodicLoops'
import { gameKitManifest } from '../manifest'

/**
 * Drift do exemplo "Batalha de Monstrinhos Profissional" — o nível 2 da
 * família de batalha de monstrinhos sobre o 👾 Kit Monstrinhos COMPLETO, SEM
 * nenhum bloco do Kit RPG. A IR embutida em examples/ foi GERADA pelo parser
 * real a partir do SOURCE (que mora no __gen_batalhaProfissional.ts, importado
 * aqui para que fonte e teste NUNCA possam divergir).
 */

function stripIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripIds) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key !== '__id') out[key] = stripIds(child)
    }
    return out as T
  }
  return value
}

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectTypes(item, out)
  } else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.type === 'string') out.add(record.type)
    for (const child of Object.values(record)) collectTypes(child, out)
  }
  return out
}

function collectStatements(value: unknown, type: string, out: unknown[] = []): unknown[] {
  if (Array.isArray(value)) {
    for (const item of value) collectStatements(item, type, out)
  } else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (record.type === type) out.push(record)
    for (const child of Object.values(record)) collectStatements(child, type, out)
  }
  return out
}

/**
 * O mesmo contrato de ciclo de vida dos exemplos: boot fora, áreas ordenadas e
 * — como o exemplo embutido — os "A cada N segundos" ELEVADOS a raízes de loop
 * próprias (o schema exige a raiz direto na Área do projeto).
 */
function parseExampleLifecycleSource(source: string): JSStatement[] {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(source),
    extensions: [{ extensionId: 'game-2d-advanced' }],
  })
  const lifted = withIndependentPeriodicLoops({
    name: batalhaProfissionalExample.name,
    experience: 'game',
    ir: normalized,
  })
  // O parser representa alguns campos opcionais ausentes como `undefined`.
  // Uma IR persistida é JSON e, portanto, não guarda essas chaves.
  return JSON.parse(JSON.stringify(behaviorStatements(lifted.ir))) as JSStatement[]
}

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKitBlocks)
})

describe('Exemplo Batalha de Monstrinhos Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d-advanced', () => {
    expect(gameKitManifest.examples).toContain(batalhaProfissionalExample)
    expect(batalhaProfissionalExample.ir.extensions).toEqual([{ extensionId: 'game-2d-advanced' }])
    expect(batalhaProfissionalExample.name).toBe('Batalha de Monstrinhos Profissional')
    expect(batalhaProfissionalExample.experience).toBe('game')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE))
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
    // caminho) — sem rpgOnBattleEnd, que é do Kit RPG.
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

  it('⭐ não mistura kits: ZERO blocos rpg_*, zero luta/nave/td e zero Jogo 2D básico', () => {
    const types = collectTypes(behaviorStatements(batalhaProfissionalExample.ir))
    for (const type of types) {
      expect(type.startsWith('gk:rpg')).toBe(false)
      expect(type.startsWith('gk:luta')).toBe(false)
      expect(type.startsWith('gk:nave')).toBe(false)
      expect(type.startsWith('gk:td')).toBe(false)
      expect(type.startsWith('g2d:')).toBe(false)
    }
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
