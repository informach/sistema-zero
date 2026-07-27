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
import { VALE_ENSOLARADO_SOURCE as SOURCE } from '../__gen_valeEnsolarado'
import { gameKitBlocks } from '../blocks'
import { valeEnsolaradoExample } from '../examples'
import { gameKitManifest } from '../manifest'

/**
 * Drift do exemplo "Vale Ensolarado Profissional" — o sunnyland-platformer sobre
 * o 🏃 Kit Plataforma do motor avançado. A IR embutida em examples/ foi GERADA
 * pelo parser real a partir do SOURCE (que mora no __gen_valeEnsolarado.ts,
 * importado aqui para que fonte e teste NUNCA possam divergir — duas cópias do
 * fonte é como um drift passa despercebido).
 *
 * O jogo NÃO tem "A cada N segundos", então não passa pelo
 * withIndependentPeriodicLoops (a fase é montada inteira no "Ao iniciar").
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

/** O mesmo contrato de ciclo de vida dos exemplos: boot fora, áreas ordenadas. */
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

describe('Exemplo Vale Ensolarado Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d-advanced', () => {
    expect(gameKitManifest.examples).toContain(valeEnsolaradoExample)
    expect(valeEnsolaradoExample.ir.extensions).toEqual([{ extensionId: 'game-2d-advanced' }])
    expect(valeEnsolaradoExample.name).toBe('Vale Ensolarado Profissional')
    expect(valeEnsolaradoExample.experience).toBe('game')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(stripIds(behaviorStatements(valeEnsolaradoExample.ir)) as JSStatement[])
  })

  it('usa a arquitetura do Kit Plataforma: pulo gostoso, chão sólido e tábua one-way', () => {
    const types = collectTypes(behaviorStatements(valeEnsolaradoExample.ir))
    for (const t of [
      'gk:platformerHero', // o pulo gostoso (coyote/buffer/pulo variável)
      'gk:setJumpFeel',
      'gk:collideGroup', // o chão sólido (collisionBlocks do original)
      'gk:oneWayPlatform', // a tábua que se atravessa por baixo (platform one-way)
      'gk:dropThrough',
      'gk:platformerAnim',
      'gk:defineMold', // chão, tábua, gema e bichos são DADOS, não personagens à mão
      'gk:defineLook', // visual 100% desenhado por código, sem assets
      'gk:spawnFromMold', // o vale inteiro é montado com moldes
    ]) {
      expect(types.has(t)).toBe(true)
    }
    expect(valeEnsolaradoExample.assets ?? []).toHaveLength(0)
  })

  it('coleta + bichos + câmera larga: gemas por toque, pisar nos bichos e renascer', () => {
    const types = collectTypes(behaviorStatements(valeEnsolaradoExample.ir))
    for (const t of [
      'gk:forEachActive', // varre gemas e bichos vivos
      'gk:charactersTouch', // a gema some ao encostar
      'gk:recycle',
      'gk:stompKill', // derrota o bicho PISANDO em cima
      'gk:patrolTurnAtWall', // o gambá anda e vira na beirada
      'gk:patrolAround', // o gavião voa patrulhando no ar
      'gk:cameraFollow', // a câmera acompanha o herói pelo vale
      'gk:setCheckpoint', // o lugar de renascer
      'gk:respawn', // cair no buraco reposiciona
      'gk:drawHearts', // os corações na tela
    ]) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(behaviorStatements(valeEnsolaradoExample.ir))
    // A câmera segue num vale mais LARGO que a tela (1632 > 960).
    expect(raw).toContain('"type":"gk:cameraFollow"')
    expect(raw).toContain('"w":{"type":"num","value":1632}')
  })

  it('placar da coleta: as gemas contam e a vitória fecha em 6', () => {
    const statements = behaviorStatements(valeEnsolaradoExample.ir)
    const raw = JSON.stringify(statements)
    expect(raw).toContain('"gemas"') // a contagem de gemas é variável
    expect(raw).toContain('"vidas"') // os corações também
    const types = collectTypes(statements)
    expect(types.has('gk:setState')).toBe(true) // pegar todas -> vitória
    expect(types.has('gk:endGame')).toBe(true) // perder os corações -> fim
  })

  it('não mistura kits: zero RPG/monstrinhos/luta e zero blocos do Jogo 2D básico', () => {
    const types = collectTypes(behaviorStatements(valeEnsolaradoExample.ir))
    for (const type of types) {
      expect(type.startsWith('gk:rpg')).toBe(false)
      expect(type.startsWith('gk:pkm')).toBe(false)
      expect(type.startsWith('gk:luta')).toBe(false)
      expect(type.startsWith('gk:td')).toBe(false)
      expect(type.startsWith('g2d:')).toBe(false)
    }
  })

  it('textos visíveis sem travessão', () => {
    expect(JSON.stringify(valeEnsolaradoExample.ir)).not.toContain('—')
    expect(valeEnsolaradoExample.description ?? '').not.toContain('—')
    expect((valeEnsolaradoExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(valeEnsolaradoExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      valeEnsolaradoExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(valeEnsolaradoExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})
