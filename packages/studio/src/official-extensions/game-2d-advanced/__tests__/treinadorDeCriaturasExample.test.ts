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
import { TREINADOR_DE_CRIATURAS_SOURCE as SOURCE } from '../__gen_treinadorDeCriaturas'
import { gameKitBlocks } from '../blocks'
import { treinadorDeCriaturasExample } from '../examples'
import { gameKitManifest } from '../manifest'

/**
 * Drift do exemplo "Treinador de Criaturas Profissional" — o pokemon-style-game
 * (Pellet Town do Chris Courses) recriado com o 👾 Kit Monstrinhos + o 🧙 Kit RPG
 * (mundo maior que a tela + câmera + grade com paredes + NPCs; só a BATALHA é do
 * Kit Monstrinhos). A IR embutida em examples/ foi GERADA pelo parser real a
 * partir do SOURCE (que mora no __gen_treinadorDeCriaturas.ts, importado aqui
 * para que fonte e teste NUNCA possam divergir).
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

/** O mesmo contrato de ciclo de vida dos exemplos (sem cadências a elevar: o
 *  encontro selvagem é por PASSO do rpgMoveGrid, não um everySeconds no loop). */
function parseExampleLifecycleSource(source: string): JSStatement[] {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(source),
    extensions: [{ extensionId: 'game-2d-advanced' }],
  })
  // O parser representa alguns campos opcionais ausentes como `undefined`.
  // Uma IR persistida é JSON e, portanto, não guarda essas chaves.
  return JSON.parse(JSON.stringify(behaviorStatements(normalized))) as JSStatement[]
}

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKitBlocks)
})

describe('Exemplo Treinador de Criaturas Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d-advanced', () => {
    expect(gameKitManifest.examples).toContain(treinadorDeCriaturasExample)
    expect(treinadorDeCriaturasExample.ir.extensions).toEqual([{ extensionId: 'game-2d-advanced' }])
    expect(treinadorDeCriaturasExample.name).toBe('Treinador de Criaturas Profissional')
    expect(treinadorDeCriaturasExample.experience).toBe('game')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(treinadorDeCriaturasExample.ir)) as JSStatement[],
    )
  })

  it('⭐ mundo do Kit RPG maior que a tela: mapa autoral + câmera que segue + grade', () => {
    const types = collectTypes(behaviorStatements(treinadorDeCriaturasExample.ir))
    for (const t of [
      'gk:rpgSetStartMap',
      'gk:rpgCreateMap',
      'gk:rpgOnEnterMap',
      'gk:rpgMoveGrid', // andar por células com paredes (os boundaries do original)
      'gk:rpgBlockCell',
      'gk:cameraFollow', // a câmera segue o treinador no mundo grande (Pellet Town)
      'gk:rpgDrawNpcs',
      'gk:drawByDepth',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // O mapa é maior que a tela (20x16 células × 64 = 1280x1024).
    const maps = collectStatements(
      behaviorStatements(treinadorDeCriaturasExample.ir),
      'gk:rpgCreateMap',
    ) as Array<{ cols: { value: number }; rows: { value: number } }>
    expect(maps.length).toBe(1)
    const map = maps[0]
    if (!map) throw new Error('mapa da cidade ausente')
    expect(map.cols.value * 64).toBeGreaterThan(960)
    expect(map.rows.value * 64).toBeGreaterThan(540)
    expect(treinadorDeCriaturasExample.assets ?? []).toHaveLength(0)
  })

  it('⭐ NPCs conversam (villager/oldMan do original): Professor DÁ o inicial, Enfermeira CURA', () => {
    const statements = behaviorStatements(treinadorDeCriaturasExample.ir)
    const types = collectTypes(statements)
    for (const t of ['gk:rpgCreateNpc', 'gk:rpgOnTalk', 'gk:rpgSay']) {
      expect(types.has(t)).toBe(true)
    }
    // O Professor é condicionado por flag (dá 1 vez) e a Enfermeira cura o time.
    expect(types.has('gk:rpgAddFlag')).toBe(true)
    expect(types.has('gk:rpgHasFlag')).toBe(true)
    expect(types.has('gk:pkmGive')).toBe(true)
    expect(types.has('gk:pkmGiveBall')).toBe(true)
    expect(types.has('gk:pkmHealTeam')).toBe(true)
    // 4 aldeões conversáveis (Professor/Idoso/Aldea/Enfermeira).
    const npcs = collectStatements(statements, 'gk:rpgCreateNpc') as Array<{ name: string }>
    expect(npcs.map((n) => n.name).sort()).toEqual(['Aldea', 'Enfermeira', 'Idoso', 'Professor'])
  })

  it('⭐ as zonas de batalha do original viram grama + criaturas selvagens', () => {
    const statements = behaviorStatements(treinadorDeCriaturasExample.ir)
    const types = collectTypes(statements)
    expect(types.has('gk:pkmGrassCells')).toBe(true)
    // Um pkmWild por espécie = a tabela de encontro do mapa.
    const wilds = collectStatements(statements, 'gk:pkmWild') as Array<{ creature: string }>
    expect(wilds.length).toBeGreaterThanOrEqual(3)
  })

  it('⭐ a tabela de vantagem é REAL: o triângulo fogo>planta>água>fogo em 3 blocos', () => {
    const statements = behaviorStatements(treinadorDeCriaturasExample.ir)
    const chart = collectStatements(statements, 'gk:pkmTypeChart') as Array<{
      atk: string
      def: string
      mult: { value: number }
    }>
    const rules = chart.map((row) => `${row.atk}>${row.def}=${row.mult.value}`)
    for (const rule of ['fogo>planta=2', 'planta>água=2', 'água>fogo=2']) {
      expect(rules).toContain(rule)
    }
    // Toda criatura tem pelo menos um golpe ensinado (o esquecimento nº 1 do kit).
    const creatures = collectStatements(statements, 'gk:pkmCreature') as Array<{ name: string }>
    const moves = collectStatements(statements, 'gk:pkmMove') as Array<{ creature: string }>
    for (const creature of creatures) {
      expect(moves.some((move) => move.creature === creature.name)).toBe(true)
    }
    expect(collectTypes(statements).has('gk:pkmCatchDifficulty')).toBe(true)
  })

  it('⭐ a vitória é pegar 3 criaturas: rpgOnBattleEnd + pkmCaught + pkmTeamSize >= 4', () => {
    const statements = behaviorStatements(treinadorDeCriaturasExample.ir)
    const hooks = collectStatements(statements, 'gk:rpgOnBattleEnd')
    expect(hooks.length).toBe(1)
    const rawHook = JSON.stringify(hooks[0])
    // O time inicial já conta 1 → 4 significa "capturou 3".
    expect(rawHook).toContain('"type":"gk:pkmCaught"')
    expect(rawHook).toContain('"type":"gk:pkmTeamSize"')
    expect(rawHook).toContain('"op":">="')
    expect(rawHook).toContain('"type":"num","value":4')
    expect(rawHook).toContain('"type":"gk:setState","name":"vitoria"')
  })

  it('⭐ o fundo é desenhado no mapa, nunca por cima no onDraw global', () => {
    const statements = behaviorStatements(treinadorDeCriaturasExample.ir)
    const maps = collectStatements(statements, 'gk:rpgCreateMap') as Array<{ body: unknown }>
    for (const map of maps) expect(collectTypes(map.body).has('gk:drawBackground')).toBe(true)
    const draws = statements.filter((s) => s.type === 'gk:onDraw')
    for (const draw of draws) expect(collectTypes(draw.body).has('gk:drawBackground')).toBe(false)
  })

  it('textos visíveis sem travessão', () => {
    expect(JSON.stringify(treinadorDeCriaturasExample.ir)).not.toContain('—')
    expect(treinadorDeCriaturasExample.description ?? '').not.toContain('—')
    expect((treinadorDeCriaturasExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(treinadorDeCriaturasExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      treinadorDeCriaturasExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(treinadorDeCriaturasExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})
