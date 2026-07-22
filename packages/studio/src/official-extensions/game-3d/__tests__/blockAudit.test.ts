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
import { GAME3D_START_ONLY_STATEMENT_TYPES } from '../../../three/game3dContract'
import { gameThreeDBlocks } from '../blocks'
import { gameThreeDRuntime } from '../runtime'

/**
 * Prova automaticamente o pipeline inteiro de cada bloco da categoria:
 * definição → IR → blocos → IR → JavaScript → Ponte. Também garante que
 * todo helper emitido existe de verdade no runtime. Assim um bloco novo não pode
 * ficar apenas visual ou quebrar silenciosamente em uma das direções.
 */

const EXPR_HOST = 'sz_g3d_set_scale'
const statementDefs = gameThreeDBlocks.filter((definition) => !definition.output)
const exprDefs = gameThreeDBlocks.filter((definition) => Boolean(definition.output))

function stripIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripIds) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (key !== '__id') out[key] = stripIds(item)
    }
    return out as T
  }
  return value
}

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const item of value) collectTypes(item, out)
  else if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>
    if (typeof object.type === 'string') out.add(object.type)
    for (const item of Object.values(object)) collectTypes(item, out)
  }
  return out
}

function loadRuntimeKeys(): Set<string> {
  const source = gameThreeDRuntime.replace(/^import \* as THREE from 'three';\s*/, '')
  const win = {
    addEventListener() {},
    SZGame3D: undefined,
    performance: { now: () => 0 },
    devicePixelRatio: 1,
  } as unknown as Record<string, unknown>
  const doc = { addEventListener() {} }
  new Function('THREE', 'window', 'document', source)({}, win, doc)
  const api = win.SZGame3D as Record<string, unknown> | undefined
  if (!api) throw new Error('runtime não montou window.SZGame3D')
  return new Set(Object.keys(api))
}

function buildIrFor(type: string, kind: 'statement' | 'expr'): JSStatement[] {
  const workspace = new Blockly.Workspace()
  try {
    attachBlockInContractContext({
      workspace,
      type,
      kind,
      expressionHost: EXPR_HOST,
      expressionInput: 'FACTOR',
      loopHost: 'sz_g3d_animate',
    })
    return stripIds(behaviorStatements(buildIRFromWorkspace(workspace)))
  } finally {
    workspace.dispose()
  }
}

function buildIrForWithFields(
  type: string,
  kind: 'statement' | 'expr',
  fields: Record<string, string>,
): JSStatement[] {
  const workspace = new Blockly.Workspace()
  try {
    const target = attachBlockInContractContext({
      workspace,
      type,
      kind,
      expressionHost: EXPR_HOST,
      expressionInput: 'FACTOR',
      loopHost: 'sz_g3d_animate',
    })
    for (const [name, value] of Object.entries(fields)) target.setFieldValue(value, name)
    return stripIds(behaviorStatements(buildIRFromWorkspace(workspace)))
  } finally {
    workspace.dispose()
  }
}

function irThroughBlocks(js: JSStatement[]): JSStatement[] {
  const ir = { html: [], css: [], js, extensions: [{ extensionId: 'game-3d' }] }
  const state = buildWorkspaceStateFromIR(ir as Parameters<typeof buildWorkspaceStateFromIR>[0])
  const workspace = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, workspace)
    return stripIds(behaviorStatements(buildIRFromWorkspace(workspace)))
  } finally {
    workspace.dispose()
  }
}

let runtimeKeys: Set<string>

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameThreeDBlocks)
  runtimeKeys = loadRuntimeKeys()
})

describe('Auditoria Jogo 3D — inventário', () => {
  it('todo bloco é statement ou reporter com conexão compatível', () => {
    expect(statementDefs.length + exprDefs.length).toBe(gameThreeDBlocks.length)
    for (const definition of statementDefs) expect(definition.previousStatement).toBe('JSStmt')
    for (const definition of exprDefs) expect(definition.output).toBe('JSValue')
  })

  it('mantém o placement de início alinhado ao contrato da IR', () => {
    for (const definition of statementDefs) {
      const placement = inferBlockContract(definition).placement
      if (placement?.root[0] !== 'start') continue
      const ir = buildIrFor(definition.type, 'statement')
      const statement = ir[0]
      expect(statement).toBeDefined()
      const startOnly = placement.root.length === 1 && placement.nested.length === 0
      expect(GAME3D_START_ONLY_STATEMENT_TYPES.has(statement?.type ?? '')).toBe(startOnly)
    }
  })
})

describe('Auditoria Jogo 3D — pipeline completo por bloco', () => {
  const cases: { type: string; kind: 'statement' | 'expr' }[] = [
    ...statementDefs
      .filter((definition) => inferBlockContract(definition).migration === 'keep')
      .map((definition) => ({ type: definition.type, kind: 'statement' as const })),
    ...exprDefs.map((definition) => ({ type: definition.type, kind: 'expr' as const })),
  ]

  for (const { type, kind } of cases) {
    it(`${type} (${kind})`, () => {
      const ir = buildIrFor(type, kind)
      expect(ir.length).toBeGreaterThan(0)
      expect(collectTypes(ir).has('rawJS')).toBe(false)

      if (kind === 'statement') {
        expect(String(ir[0]?.type).startsWith('g3d:')).toBe(true)
      } else {
        const host = ir[0] as { type?: string; factor?: { type?: string } }
        expect(host.type).toBe('g3d:setScale')
        expect(String(host.factor?.type).startsWith('g3d:')).toBe(true)
      }

      expect(ir.every((statement) => JSStatementSchema.safeParse(statement).success)).toBe(true)
      expect(irThroughBlocks(ir)).toEqual(ir)

      const code = compileStatements(ir, 0)
      const helpers = [...code.matchAll(/SZGame3D\.([A-Za-z_][A-Za-z0-9_]*)/g)].map(
        (match) => match[1],
      )
      expect(helpers.length).toBeGreaterThan(0)
      expect(helpers.filter((helper) => !runtimeKeys.has(helper ?? ''))).toEqual([])
      expect(stripIds(parseJS(code))).toEqual(ir)
    })
  }
})

interface DropdownArg {
  type?: string
  name?: string
  options?: [string, string][]
}

const dropdownCases: { type: string; kind: 'statement' | 'expr'; field: string; value: string }[] =
  []
for (const definition of gameThreeDBlocks) {
  const kind: 'statement' | 'expr' = definition.output ? 'expr' : 'statement'
  for (const arg of (definition.args0 ?? []) as DropdownArg[]) {
    if (arg.type !== 'field_dropdown' || !arg.name || !Array.isArray(arg.options)) continue
    for (const [, value] of arg.options) {
      dropdownCases.push({ type: definition.type, kind, field: arg.name, value })
    }
  }
}

describe('Auditoria Jogo 3D — opções de dropdown', () => {
  it('varre uma quantidade não trivial de opções', () => {
    expect(dropdownCases.length).toBeGreaterThan(20)
  })

  for (const { type, kind, field, value } of dropdownCases) {
    it(`${type}.${field} = "${value}"`, () => {
      const ir = buildIrForWithFields(type, kind, { [field]: value })
      expect(collectTypes(ir).has('rawJS')).toBe(false)
      expect(irThroughBlocks(ir)).toEqual(ir)
      expect(stripIds(parseJS(compileStatements(ir, 0)))).toEqual(ir)
    })
  }
})
