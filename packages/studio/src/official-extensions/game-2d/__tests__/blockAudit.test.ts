import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, type JSStatement, JSStatementSchema } from '#ir'
import 'blockly/blocks'
import { attachBlockInContractContext } from '../../../blockly/__tests__/blockContractTestUtils'
import { inferBlockContract } from '../../../blockly/blockContracts'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { gameTwoDBlocks } from '../blocks'
import { gameTwoDRuntime } from '../runtime'
import { GAME_TWO_D_API_KEYS } from '../runtimeContract'

/**
 * Auditoria GENÉRICA de todos os blocos da extensão Jogo 2D — um caso por def,
 * sem fixtures à mão. Para cada bloco, com os valores DEFAULT dos campos:
 *
 *   1. def → IR: o bloco instanciado dentro do frame de Comportamento vira um
 *      nó g2d (não é ignorado como rascunho nem degrada para rawJS) e a IR
 *      valida no schema estrutural do statement (drift do zod). A validação
 *      semântica de referências exige as declarações vizinhas e tem suíte própria.
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
  sz_g2d_play_boom: 'o bloco temático usa a implementação canônica playExplosion',
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
    attachBlockInContractContext({
      workspace: ws,
      type,
      kind,
      expressionHost: EXPR_HOST,
      expressionInput: 'VALUE',
      loopHost: 'sz_g2d_update_each_frame',
    })
    return stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
  } finally {
    ws.dispose()
  }
}

/** Instancia o bloco setando campos ANTES de coletar (para opções de dropdown). */
function buildIrForWithFields(
  type: string,
  kind: 'statement' | 'expr',
  fields: Record<string, string>,
): JSStatement[] {
  const ws = new Blockly.Workspace()
  try {
    const target = attachBlockInContractContext({
      workspace: ws,
      type,
      kind,
      expressionHost: EXPR_HOST,
      expressionInput: 'VALUE',
      loopHost: 'sz_g2d_update_each_frame',
    })
    for (const [name, value] of Object.entries(fields)) target.setFieldValue(value, name)
    return stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
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
    return stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
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
  it('o contrato compilável descreve exatamente a API montada pelo runtime', () => {
    expect([...runtimeKeys].sort()).toEqual([...GAME_TWO_D_API_KEYS].sort())
  })

  it('todo def é statement (previousStatement) ou reporter (output)', () => {
    expect(statementDefs.length + exprDefs.length).toBe(gameTwoDBlocks.length)
    for (const def of statementDefs) expect(def.previousStatement).toBe('JSStmt')
    for (const def of exprDefs) expect(def.output).toBe('JSValue')
  })
})

describe('Auditoria Jogo 2D — pipeline completo por bloco', () => {
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
        expect(String(ir[0]?.type).startsWith('g2d:')).toBe(true)
      } else {
        const host = ir[0] as { type?: string; value?: { type?: string } }
        expect(host.type).toBe('g2d:setGravity')
        expect(String(host.value?.type).startsWith('g2d:')).toBe(true)
      }

      // 1b. schema zod estrutural aceita cada nó isolado. Referências como
      // "jogador" são deliberadamente resolvidas apenas no projeto completo.
      expect(ir.every((statement) => JSStatementSchema.safeParse(statement).success)).toBe(true)

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

/**
 * T6 — as OPÇÕES não-default de cada dropdown round-trippam. O pipeline acima usa
 * só o valor DEFAULT de cada campo; um valor de dropdown novo sem o par no
 * enum/parser viraria rawJS na Ponte (o parser valida estado/comportamento/param
 * contra o enum) e só uma varredura das opções pegaria. Aqui, para cada dropdown,
 * seta CADA opção e prova IR→blocos→IR estável e (fora forward-only) JS→IR fiel.
 */
interface DropdownArg {
  type?: string
  name?: string
  options?: [string, string][]
}
const dropdownCases: { type: string; kind: 'statement' | 'expr'; field: string; value: string }[] =
  []
for (const def of gameTwoDBlocks) {
  const kind: 'statement' | 'expr' = def.output ? 'expr' : 'statement'
  for (const arg of (def.args0 ?? []) as DropdownArg[]) {
    if (arg.type !== 'field_dropdown' || !arg.name || !Array.isArray(arg.options)) continue
    for (const [, value] of arg.options) {
      dropdownCases.push({ type: def.type, kind, field: arg.name, value })
    }
  }
}

describe('Auditoria Jogo 2D — opções de dropdown round-trippam (T6)', () => {
  it('há dropdowns para varrer (anti-vácuo)', () => {
    expect(dropdownCases.length).toBeGreaterThan(15)
  })

  for (const { type, kind, field, value } of dropdownCases) {
    it(`${type}.${field} = "${value}"`, () => {
      const ir = buildIrForWithFields(type, kind, { [field]: value })
      expect(collectTypes(ir).has('rawJS')).toBe(false)
      // IR → blocos → IR estável (a opção sobrevive à reconstrução por blocos).
      expect(irThroughBlocks(ir)).toEqual(ir)
      // JS → IR fiel (a opção sobrevive à Ponte), salvo os forward-only.
      const reparsed = stripIds(parseJS(compileStatements(ir, 0)))
      if (FORWARD_ONLY[type]) {
        expect(collectTypes(reparsed).has('rawJS')).toBe(false)
      } else {
        expect(reparsed).toEqual(ir)
      }
    })
  }
})
