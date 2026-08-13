import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, type JSStatement, SZIRSchema } from '#ir'
import { collectTypes, stripIds } from './exampleContractHarness'
import 'blockly/blocks'
import { attachBlockInContractContext } from '../../../blockly/__tests__/blockContractTestUtils'
import { inferBlockContract } from '../../../blockly/blockContracts'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { gameKitBlocks, gameKitToolboxCategory } from '../blocks'
import { gameKitRuntime } from '../runtime'

/**
 * Auditoria GENÉRICA de todos os blocos do Jogo 2D Avançado (clone do
 * blockAudit do Jogo 2D) — um caso por def, com os valores DEFAULT dos campos:
 *
 *   1. def → IR: o bloco na área indicada pelo contrato vira um nó gk: (não é
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

/** Instancia o bloco com defaults na área indicada pelo contrato e coleta a IR. */
function buildIrFor(type: string, kind: 'statement' | 'expr'): JSStatement[] {
  const ws = new Blockly.Workspace()
  try {
    attachBlockInContractContext({
      workspace: ws,
      type,
      kind,
      expressionHost: EXPR_HOST,
      expressionInput: 'X',
      loopHost: 'sz_gk_on_update',
    })
    return stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
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
    return stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
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
    expect(gameKitBlocks.length).toBe(364)
    for (const def of statementDefs) expect(def.previousStatement).toBe('JSStmt')
    for (const def of exprDefs) expect(def.output).toBe('JSValue')
  })

  // A toolbox é montada a partir do array SUBCATS, que é uma lista de STRINGS
  // paralela aos defs — nada garantia que as duas casam. Um typo em SUBCATS
  // enviaria um item de toolbox apontando p/ um bloco inexistente, e um bloco
  // esquecido cairia no grupo genérico "Mais" sem ninguém perceber.
  it('a toolbox cobre todos os blocos visíveis, exatamente 1× (sem fantasma, sem "Mais")', () => {
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
    const visibleDefTypes = gameKitBlocks
      .filter((definition) => !definition.hidden)
      .map((d) => d.type)
    const counts = new Map<string, number>()
    for (const t of inToolbox) counts.set(t, (counts.get(t) ?? 0) + 1)

    // Nenhum bloco da toolbox que não exista como def (typo em SUBCATS).
    expect([...counts.keys()].filter((t) => !defTypes.includes(t))).toEqual([])
    // Nenhum def visível fora da toolbox (cairia no "Mais"). Blocos antigos
    // de migração continuam registrados para abrir projetos existentes.
    expect(visibleDefTypes.filter((t) => !counts.has(t))).toEqual([])
    // Nenhum bloco em DUAS categorias.
    expect([...counts.entries()].filter(([, n]) => n > 1).map(([t]) => t)).toEqual([])

    // ⭐ A asserção que FALTAVA — e é a que dá nome ao teste. As de cima só olham
    // "está em ALGUM lugar da toolbox", e o "Mais" É um lugar da toolbox: 4 blocos
    // de peça ficaram nele por 2 versões, com a doc jurando que estavam em 🗺️
    // Mundo & profundidade. Todo bloco tem que estar numa categoria de VERDADE.
    // (R23: desce RECURSIVO — os kits viraram chips-pai e os blocos ficam 2
    // níveis abaixo; a versão de 1 nível falharia em falso p/ os 5 kits.)
    const named = new Set<string>()
    const walkNamed = (node: unknown): void => {
      if (Array.isArray(node)) {
        for (const n of node) walkNamed(n)
        return
      }
      if (!node || typeof node !== 'object') return
      const c = node as { kind?: string; name?: string; type?: string; contents?: unknown }
      if (c.kind === 'category' && c.name === 'Mais') return
      if (c.kind === 'block' && typeof c.type === 'string') named.add(c.type)
      if (c.contents) walkNamed(c.contents)
    }
    walkNamed(gameKitToolboxCategory.contents)
    expect(visibleDefTypes.filter((t) => !named.has(t))).toEqual([])
  })

  it('explica que a animação marcada toca uma vez, sem prometer uma trava que pertence ao estado', () => {
    const def = gameKitBlocks.find((block) => block.type === 'sz_gk_state_anim')
    expect(def?.message0).toContain('uma vez?')
    expect(def?.tooltip).toContain('último quadro')
    expect(def?.tooltip).not.toContain('NÃO poder ser interrompida')
  })
})

describe('Auditoria Jogo 2D Avançado — pipeline completo por bloco', () => {
  const cases: { type: string; kind: 'statement' | 'expr' }[] = [
    ...statementDefs
      .filter((definition) => inferBlockContract(definition).migration === 'keep')
      .map((d) => ({ type: d.type, kind: 'statement' as const })),
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
