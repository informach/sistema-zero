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
import { gameKitBlocks, gameKitToolboxCategory } from '../blocks'
import { gameKitRuntime } from '../runtime'

/**
 * Auditoria GENÉRICA de todos os blocos do Jogo 2D Avançado (clone do
 * blockAudit do Jogo 2D) — um caso por def, com os valores DEFAULT dos campos:
 *
 *   1. def → IR: o bloco no frame de Comportamento vira um nó gk: (não é
 *      rascunho nem rawJS) e a IR valida no SZIRSchema (drift do zod).
 *   2. IR → blocos → IR: reconstruir e recoletar devolve a MESMA IR.
 *   3. IR → JS: todo helper `SZGameKit.x(...)` emitido EXISTE no runtime.
 *   4. JS → IR (Ponte): o código gerado parseia de volta para a MESMA IR
 *      (round-trip 100%, zero rawJS — a extensão não tem forward-only).
 *
 * Reporters (output) são plugados no soquete X do host `sz_gk_place_character`.
 */

const EXPR_HOST = 'sz_gk_place_character'

const statementDefs = gameKitBlocks.filter((def) => !def.output)
const exprDefs = gameKitBlocks.filter((def) => Boolean(def.output))

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
    SZGameKit: undefined,
    performance: { now: () => 0 },
    devicePixelRatio: 1,
  } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', gameKitRuntime)(win, () => 0)
  const api = win.SZGameKit as Record<string, unknown> | undefined
  if (!api) throw new Error('runtime não montou window.SZGameKit')
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
      const socket = host.getInput('X')?.connection
      const block = ws.newBlock(type)
      if (!socket || !block.outputConnection) {
        throw new Error(`${type}: reporter sem outputConnection (ou host sem X)`)
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
  const ir = { html: [], css: [], js, extensions: [{ extensionId: 'game-2d-advanced' }] }
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
  registerExtensionBlocks(gameKitBlocks)
  runtimeKeys = loadRuntimeKeys()
})

describe('Auditoria Jogo 2D Avançado — inventário', () => {
  it('todo def é statement (previousStatement) ou reporter (output)', () => {
    expect(statementDefs.length + exprDefs.length).toBe(gameKitBlocks.length)
    expect(gameKitBlocks.length).toBe(242)
    for (const def of statementDefs) expect(def.previousStatement).toBe('JSStmt')
    for (const def of exprDefs) expect(def.output).toBe('JSValue')
  })

  // A toolbox é montada a partir do array SUBCATS, que é uma lista de STRINGS
  // paralela aos defs — nada garantia que as duas casam. Um typo em SUBCATS
  // enviaria um item de toolbox apontando p/ um bloco inexistente, e um bloco
  // esquecido cairia no grupo genérico "Mais" sem ninguém perceber.
  it('a toolbox cobre TODOS os blocos, exatamente 1× (sem fantasma, sem "Mais")', () => {
    const inToolbox: string[] = []
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) {
        for (const n of node) walk(n)
        return
      }
      if (!node || typeof node !== 'object') return
      const o = node as { kind?: string; type?: string; contents?: unknown }
      if (o.kind === 'block' && typeof o.type === 'string') inToolbox.push(o.type)
      if (o.contents) walk(o.contents)
    }
    walk(gameKitToolboxCategory.contents)

    const defTypes = gameKitBlocks.map((d) => d.type)
    const counts = new Map<string, number>()
    for (const t of inToolbox) counts.set(t, (counts.get(t) ?? 0) + 1)

    // Nenhum bloco da toolbox que não exista como def (typo em SUBCATS).
    expect([...counts.keys()].filter((t) => !defTypes.includes(t))).toEqual([])
    // Nenhum def fora da toolbox (cairia no "Mais").
    expect(defTypes.filter((t) => !counts.has(t))).toEqual([])
    // Nenhum bloco em DUAS categorias.
    expect([...counts.entries()].filter(([, n]) => n > 1).map(([t]) => t)).toEqual([])

    // ⭐ A asserção que FALTAVA — e é a que dá nome ao teste. As de cima só olham
    // "está em ALGUM lugar da toolbox", e o "Mais" É um lugar da toolbox: 4 blocos
    // de peça ficaram nele por 2 versões, com a doc jurando que estavam em 🗺️
    // Mundo & profundidade. Todo bloco tem que estar numa categoria de VERDADE.
    const named = new Set<string>()
    for (const cat of gameKitToolboxCategory.contents) {
      const c = cat as { kind?: string; name?: string; contents?: { type?: string }[] }
      if (c.kind !== 'category' || c.name === 'Mais') continue
      for (const b of c.contents ?? []) if (b.type) named.add(b.type)
    }
    expect(defTypes.filter((t) => !named.has(t))).toEqual([])
  })
})

describe('Auditoria Jogo 2D Avançado — pipeline completo por bloco', () => {
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
        expect(String(ir[0]?.type).startsWith('gk:')).toBe(true)
      } else {
        const host = ir[0] as { type?: string; x?: { type?: string } }
        expect(host.type).toBe('gk:placeCharacter')
        expect(String(host.x?.type).startsWith('gk:')).toBe(true)
      }

      // 1b. schema zod aceita a IR
      const parsedSchema = SZIRSchema.safeParse({
        html: [],
        css: [],
        js: ir,
        extensions: [{ extensionId: 'game-2d-advanced' }],
      })
      expect(parsedSchema.success).toBe(true)

      // 2. IR → blocos → IR estável
      expect(irThroughBlocks(ir)).toEqual(ir)

      // 3. IR → JS: helpers emitidos existem no runtime
      const code = compileStatements(ir, 0)
      expect(code.trim().length).toBeGreaterThan(0)
      const helpers = [...code.matchAll(/SZGameKit\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1])
      expect(helpers.length).toBeGreaterThan(0)
      const missing = helpers.filter((h) => !runtimeKeys.has(h ?? ''))
      expect(missing).toEqual([])

      // 4. JS → IR (Ponte): round-trip 100%, sem degradação
      const reparsed = stripIds(parseJS(code))
      expect(reparsed).toEqual(ir)
    })
  }
})
