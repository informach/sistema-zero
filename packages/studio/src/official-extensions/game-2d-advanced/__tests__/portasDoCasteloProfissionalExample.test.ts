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
import { PORTAS_DO_CASTELO_PROFISSIONAL_SOURCE as SOURCE } from '../__gen_portasDoCasteloProfissional'
import { gameKitBlocks } from '../blocks'
import { portasDoCasteloProfissionalExample } from '../examples'
import { gameKitManifest } from '../manifest'

/**
 * Drift do exemplo "Portas do Castelo Profissional" — o kings-and-pigs do Chris
 * Courses sobre o 🏃 Kit Plataforma do motor avançado. A IR embutida em examples/
 * foi GERADA pelo parser real a partir do SOURCE (que mora no
 * __gen_portasDoCasteloProfissional.ts, importado aqui para que fonte e teste
 * NUNCA possam divergir — duas cópias do fonte é como um drift passa
 * despercebido).
 *
 * O jogo NÃO tem "A cada N segundos", então não passa pelo
 * withIndependentPeriodicLoops (o mundo inteiro é montado no "Ao iniciar" e as
 * fases trocam por regiões).
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

describe('Exemplo Portas do Castelo Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d-advanced', () => {
    expect(gameKitManifest.examples).toContain(portasDoCasteloProfissionalExample)
    expect(portasDoCasteloProfissionalExample.ir.extensions).toEqual([
      { extensionId: 'game-2d-advanced' },
    ])
    expect(portasDoCasteloProfissionalExample.name).toBe('Portas do Castelo Profissional')
    expect(portasDoCasteloProfissionalExample.experience).toBe('game')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(portasDoCasteloProfissionalExample.ir)) as JSStatement[],
    )
  })

  it('usa a arquitetura do Kit Plataforma: pulo gostoso e chão sólido', () => {
    const types = collectTypes(behaviorStatements(portasDoCasteloProfissionalExample.ir))
    for (const t of [
      'gk:platformerHero', // o pulo gostoso (o velocity.y = -25 do original)
      'gk:setJumpFeel',
      'gk:collideGroup', // o chão sólido (os collisionBlocks do original)
      'gk:platformerAnim',
      'gk:defineMold', // o chão de pedra é DADO, não personagem à mão
      'gk:defineLook', // visual 100% desenhado por código, sem assets
      'gk:spawnFromMold', // o castelo inteiro é montado com moldes
    ]) {
      expect(types.has(t)).toBe(true)
    }
    expect(portasDoCasteloProfissionalExample.assets ?? []).toHaveLength(0)
  })

  it('três salas em regiões + porta que troca de fase (isInside → respawn)', () => {
    const types = collectTypes(behaviorStatements(portasDoCasteloProfissionalExample.ir))
    for (const t of [
      'gk:defineRegion', // as portas de cada sala (o levels[1..3] do original)
      'gk:isInside', // encostar na porta
      'gk:setCheckpoint', // o começo da próxima sala
      'gk:respawn', // teleporta para a sala seguinte (o levels[level].init())
      'gk:setState', // a saída da 3ª sala é a vitória
      'gk:cameraFollow', // a câmera acompanha o rei pelo mundo largo
    ]) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(behaviorStatements(portasDoCasteloProfissionalExample.ir))
    // São TRÊS portas nomeadas: duas de passagem + a saída.
    expect(raw).toContain('"region":"porta1"')
    expect(raw).toContain('"region":"porta2"')
    expect(raw).toContain('"region":"saida"')
    // A variável de fase existe e avança de 1 até 3.
    expect(raw).toContain('"name":"fase"')
    // O mundo é mais LARGO que a tela (2900 > 960): a câmera segue.
    expect(raw).toContain('"w":{"type":"num","value":2900}')
  })

  it('cair para fora do mundo reposiciona no começo da sala (não é fim)', () => {
    const raw = JSON.stringify(behaviorStatements(portasDoCasteloProfissionalExample.ir))
    // O gate de queda usa charY do rei comparado com o piso do mundo.
    expect(raw).toContain('"type":"gk:charY"')
    // Cair chama respawn, não endGame: recomeça a sala.
    const types = collectTypes(behaviorStatements(portasDoCasteloProfissionalExample.ir))
    expect(types.has('gk:respawn')).toBe(true)
    expect(types.has('gk:endGame')).toBe(false)
  })

  it('não mistura kits: zero RPG/monstrinhos/luta/defesa e zero blocos do Jogo 2D básico', () => {
    const types = collectTypes(behaviorStatements(portasDoCasteloProfissionalExample.ir))
    for (const type of types) {
      expect(type.startsWith('gk:rpg')).toBe(false)
      expect(type.startsWith('gk:pkm')).toBe(false)
      expect(type.startsWith('gk:luta')).toBe(false)
      expect(type.startsWith('gk:td')).toBe(false)
      expect(type.startsWith('gk:nave')).toBe(false)
      expect(type.startsWith('g2d:')).toBe(false)
    }
  })

  it('textos visíveis sem travessão', () => {
    expect(JSON.stringify(portasDoCasteloProfissionalExample.ir)).not.toContain('—')
    expect(portasDoCasteloProfissionalExample.description ?? '').not.toContain('—')
    expect((portasDoCasteloProfissionalExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(portasDoCasteloProfissionalExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      portasDoCasteloProfissionalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(portasDoCasteloProfissionalExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})
