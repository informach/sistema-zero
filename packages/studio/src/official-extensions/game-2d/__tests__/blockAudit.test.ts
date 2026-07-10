import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { type JSStatement, SZIRSchema } from '#ir'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace, FRAME_BEHAVIOR } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { gameTwoDBlocks } from '../blocks'
import { gameTwoDRuntime } from '../runtime'

/**
 * Auditoria GENÉRICA de todos os blocos da extensão Jogo 2D — um caso por def,
 * sem fixtures à mão. Para cada bloco, com os valores DEFAULT dos campos:
 *
 *   1. def → IR: o bloco instanciado dentro do frame de Comportamento vira um
 *      nó g2d (não é ignorado como rascunho nem degrada para rawJS) e a IR
 *      valida no SZIRSchema (drift do zod).
 *   2. IR → blocos → IR: reconstruir os blocos e recoletar devolve a MESMA IR
 *      (drift do workspaceState/buildIR).
 *   3. IR → JS: todo helper `SZGame2D.x(...)` emitido pelo gerador EXISTE no
 *      runtime avaliado (drift gerador ↔ runtime — a classe de bug "bloco
 *      compila para função que não existe").
 *   4. JS → IR (Ponte): o código gerado parseia de volta para a MESMA IR
 *      (round-trip 100%, zero rawJS).
 *
 * Reporters (output) não vivem sozinhos numa pilha: cada um é plugado no host
 * `sz_g2d_set_gravity` (soquete VALUE, check JSValue) e auditado através dele.
 */

/** Host universal para auditar reporters: "Botar a gravidade do mundo em %1". */
const EXPR_HOST = 'sz_g2d_set_gravity'

/**
 * Blocos FORWARD-ONLY (mesmo padrão dos blocos dedicados de CSS do núcleo):
 * compilam para JS PURO, sem o marcador `SZGame2D.` — logo a Ponte não tem
 * como reconstruí-los e devolve os blocos GENÉRICOS equivalentes (memberSet/
 * memberCall/criar variável). Semântica idêntica, degradação intencional —
 * a criança vê a "programação real" por trás do facilitador. Qualquer OUTRO
 * bloco precisa round-trippar byte a byte.
 */
const FORWARD_ONLY: Record<string, string> = {
  sz_g2d_set_position: 'sprite.x = …; sprite.y = … → 2 blocos de propriedade',
  sz_g2d_set_velocity: 'sprite.vx = …; sprite.vy = … → 2 blocos de propriedade',
  sz_g2d_score: 'let pontos = … → bloco de criar variável (fusão seria ambígua)',
  sz_g2d_game_over: 'ctx.fillStyle/font/fillText → blocos de canvas/objeto',
}

const statementDefs = gameTwoDBlocks.filter((def) => !def.output)
const exprDefs = gameTwoDBlocks.filter((def) => Boolean(def.output))

function stripIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripIds) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === '__id') continue
      out[k] = stripIds(v)
    }
    return out as T
  }
  return value
}

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const item of value) collectTypes(item, out)
  else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.type === 'string') out.add(obj.type)
    for (const v of Object.values(obj)) collectTypes(v, out)
  }
  return out
}

function loadRuntimeKeys(): Set<string> {
  const win = {
    addEventListener() {},
    SZGame2D: undefined,
    performance: { now: () => 0 },
    devicePixelRatio: 1,
  } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
  const api = win.SZGame2D as Record<string, unknown> | undefined
  if (!api) throw new Error('runtime não montou window.SZGame2D')
  return new Set(Object.keys(api))
}

/** Instancia o bloco com defaults dentro do frame de Comportamento e coleta a IR. */
function buildIrFor(type: string, kind: 'statement' | 'expr'): JSStatement[] {
  const ws = new Blockly.Workspace()
  try {
    const frame = ws.newBlock(FRAME_BEHAVIOR)
    const slot = frame.getInput('CHILDREN')?.connection
    if (!slot) throw new Error('frame de Comportamento sem input CHILDREN')
    if (kind === 'statement') {
      const block = ws.newBlock(type)
      if (!block.previousConnection) throw new Error(`${type}: statement sem previousConnection`)
      slot.connect(block.previousConnection)
    } else {
      const host = ws.newBlock(EXPR_HOST)
      if (!host.previousConnection) throw new Error('host de expr sem previousConnection')
      slot.connect(host.previousConnection)
      const socket = host.getInput('VALUE')?.connection
      const block = ws.newBlock(type)
      if (!socket || !block.outputConnection) {
        throw new Error(`${type}: reporter sem outputConnection (ou host sem VALUE)`)
      }
      socket.connect(block.outputConnection)
    }
    return stripIds(buildIRFromWorkspace(ws).js)
  } finally {
    ws.dispose()
  }
}

/** IR → blocos (workspaceState) → IR (buildIR), sem os __id. */
function irThroughBlocks(js: JSStatement[]): JSStatement[] {
  const ir = { html: [], css: [], js, extensions: [{ extensionId: 'game-2d' }] }
  const state = buildWorkspaceStateFromIR(ir as Parameters<typeof buildWorkspaceStateFromIR>[0])
  const ws = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
    return stripIds(buildIRFromWorkspace(ws).js)
  } finally {
    ws.dispose()
  }
}

let runtimeKeys: Set<string>

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
  runtimeKeys = loadRuntimeKeys()
})

describe('Auditoria Jogo 2D — inventário', () => {
  it('todo def é statement (previousStatement) ou reporter (output)', () => {
    expect(statementDefs.length + exprDefs.length).toBe(gameTwoDBlocks.length)
    for (const def of statementDefs) expect(def.previousStatement).toBe('JSStmt')
    for (const def of exprDefs) expect(def.output).toBe('JSValue')
  })
})

describe('Auditoria Jogo 2D — pipeline completo por bloco', () => {
  const cases: { type: string; kind: 'statement' | 'expr' }[] = [
    ...statementDefs.map((d) => ({ type: d.type, kind: 'statement' as const })),
    ...exprDefs.map((d) => ({ type: d.type, kind: 'expr' as const })),
  ]

  for (const { type, kind } of cases) {
    it(`${type} (${kind})`, () => {
      // 1. def → IR: coletado no frame, sem rascunho e sem rawJS
      const ir = buildIrFor(type, kind)
      expect(ir.length).toBeGreaterThan(0)
      const irTypes = collectTypes(ir)
      expect(irTypes.has('rawJS')).toBe(false)
      if (kind === 'statement') {
        expect(String(ir[0]?.type).startsWith('g2d:')).toBe(true)
      } else {
        const host = ir[0] as { type?: string; value?: { type?: string } }
        expect(host.type).toBe('g2d:setGravity')
        expect(String(host.value?.type).startsWith('g2d:')).toBe(true)
      }

      // 1b. schema zod aceita a IR
      const parsedSchema = SZIRSchema.safeParse({
        html: [],
        css: [],
        js: ir,
        extensions: [{ extensionId: 'game-2d' }],
      })
      expect(parsedSchema.success).toBe(true)

      // 2. IR → blocos → IR estável
      expect(irThroughBlocks(ir)).toEqual(ir)

      // 3. IR → JS: helpers emitidos existem no runtime
      const code = compileStatements(ir, 0)
      expect(code.trim().length).toBeGreaterThan(0)
      const helpers = [...code.matchAll(/SZGame2D\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1])
      if (!FORWARD_ONLY[type]) expect(helpers.length).toBeGreaterThan(0)
      const missing = helpers.filter((h) => !runtimeKeys.has(h ?? ''))
      expect(missing).toEqual([])

      // 4. JS → IR (Ponte)
      const reparsed = stripIds(parseJS(code))
      if (FORWARD_ONLY[type]) {
        // Degrada para blocos genéricos: exige só que nada vire rawJS.
        expect(reparsed.length).toBeGreaterThan(0)
        expect(collectTypes(reparsed).has('rawJS')).toBe(false)
      } else {
        expect(reparsed).toEqual(ir)
      }
    })
  }
})
