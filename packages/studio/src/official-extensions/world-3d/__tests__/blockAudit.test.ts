import { beforeAll, describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, type JSStatement, SZIRSchema } from '#ir'
import 'blockly/blocks'
import { attachBlockInContractContext } from '../../../blockly/__tests__/blockContractTestUtils'
import { inferBlockContract } from '../../../blockly/blockContracts'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { world3DBlocks } from '../blocks'
import { world3DRuntime } from '../runtime'

/**
 * Auditoria GENÉRICA de todos os blocos do Mundo 3D (clone do blockAudit do
 * Jogo 3D Avançado) — um caso por def, com os valores DEFAULT:
 *
 *   1. def → IR: o bloco na área indicada pelo contrato vira um nó w3d: (não é
 *      rascunho nem rawJS) e a IR valida no SZIRSchema (drift do zod).
 *   2. IR → blocos → IR: reconstruir e recoletar devolve a MESMA IR.
 *   3. IR → JS: todo helper `SZWorld3D.x(...)` emitido EXISTE no runtime.
 *   4. JS → IR (Ponte): o código gerado parseia de volta para a MESMA IR
 *      (round-trip 100%, zero rawJS — a extensão não tem forward-only).
 *
 * Reporters (output) são plugados no soquete X do host `sz_w3d_car_place`.
 */

const EXPR_HOST = 'sz_w3d_car_place'

const statementDefs = world3DBlocks.filter((def) => !def.output)
const exprDefs = world3DBlocks.filter((def) => Boolean(def.output))

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
  // O runtime é um SCRIPT MODULE (1ª linha = import de three). Para avaliar no
  // bun:test, tiramos a linha do import e injetamos um stub de THREE — o
  // top-level da IIFE não toca em THREE nem em document (contrato do arquivo).
  const body = world3DRuntime.replace(/^import \* as THREE from 'three';\n/, '')
  const win = {
    addEventListener() {},
    SZWorld3D: undefined,
    performance: { now: () => 0 },
    devicePixelRatio: 1,
  } as unknown as Record<string, unknown>
  new Function('THREE', 'window', body)({}, win)
  const api = win.SZWorld3D as Record<string, unknown> | undefined
  if (!api) throw new Error('runtime não montou window.SZWorld3D')
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
      loopHost: 'sz_w3d_on_update',
      eventHost: 'sz_w3d_npc_talk',
      eventInput: 'BODY',
    })
    return stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
  } finally {
    ws.dispose()
  }
}

/** IR → blocos (workspaceState) → IR (buildIR), sem os __id. */
function irThroughBlocks(js: JSStatement[]): JSStatement[] {
  const ir = { html: [], css: [], js, extensions: [{ extensionId: 'world-3d' }] }
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
  registerExtensionBlocks(world3DBlocks)
  runtimeKeys = loadRuntimeKeys()
})

describe('Auditoria Mundo 3D — inventário', () => {
  it('coleta identificadores para todos os comandos Mundo 3D que o compilador emite', () => {
    const generator = readFileSync(join(import.meta.dir, '../../../generators/js.ts'), 'utf8')
    const collectorAt = generator.indexOf('function collectStatementIdentifiers')
    const compiled = generator.slice(generator.indexOf("case 'w3d:setup':"), collectorAt)
    const collectionStart = generator.indexOf('// ---- Mundo 3D (world-3d) ----', collectorAt)
    const collected = generator.slice(
      collectionStart,
      generator.indexOf("case 'classDecl':", collectionStart),
    )
    const commandTypes = (source: string) =>
      new Set(
        [...source.matchAll(/case '([^']+)'/g)]
          .map((match) => match[1] ?? '')
          .filter((type) => type.startsWith('w3d:')),
      )

    expect([...commandTypes(compiled)].sort()).toEqual([...commandTypes(collected)].sort())
  })

  it('todo def é statement (previousStatement) ou reporter (output)', () => {
    expect(statementDefs.length + exprDefs.length).toBe(world3DBlocks.length)
    expect(world3DBlocks.length).toBe(137)
    for (const def of statementDefs) expect(def.previousStatement).toBe('JSStmt')
    for (const def of exprDefs) expect(def.output).toBe('JSValue')
  })

  it('mantém construções pesadas só no início e ações leves disponíveis em corpos', () => {
    for (const type of [
      'sz_w3d_setup',
      'sz_w3d_terrain',
      'sz_w3d_car',
      'sz_w3d_scatter_model',
      'sz_w3d_city',
      'sz_w3d_road_grid',
    ]) {
      const definition = world3DBlocks.find((block) => block.type === type)
      if (!definition) throw new Error(`bloco ${type} ausente`)
      expect(inferBlockContract(definition).placement).toEqual({
        root: ['start'],
        nested: [],
        role: 'command',
      })
    }

    for (const type of ['sz_w3d_confetti', 'sz_w3d_say', 'sz_w3d_car_place']) {
      const definition = world3DBlocks.find((block) => block.type === type)
      if (!definition) throw new Error(`bloco ${type} ausente`)
      const nested = inferBlockContract(definition).placement?.nested ?? []
      expect(nested).toContain('event-body')
      expect(nested).toContain('loop-body')
    }
  })

  it('usa seletores filtrados para modelos e nomes declarados de som/item', () => {
    const arg = (type: string, name: string) => {
      const definition = world3DBlocks.find((block) => block.type === type)
      if (!definition) throw new Error(`bloco ${type} ausente`)
      const fields = [...(definition.args0 ?? []), ...(definition.args1 ?? [])] as Array<
        Record<string, unknown>
      >
      return fields.find((field) => field.name === name)
    }

    for (const type of ['sz_w3d_scatter_model', 'sz_w3d_place_model']) {
      expect(arg(type, 'MODEL')).toEqual({
        type: 'field_asset_picker',
        name: 'MODEL',
        text: '',
        kind: '3d',
        filter: 'model3d',
      })
    }
    expect(arg('sz_w3d_sky_photo', 'ASSET')).toEqual({
      type: 'field_asset_picker',
      name: 'ASSET',
      text: '',
      kind: '3d',
      filter: 'environment3d',
    })
    expect(arg('sz_w3d_play_sound', 'NAME')?.kind).toBe('sound')
    expect(arg('sz_w3d_play_music', 'NAME')?.kind).toBe('sound')
    expect(arg('sz_w3d_inventory_remove', 'ITEM')?.kind).toBe('item')
    expect(arg('sz_w3d_inventory_count', 'ITEM')?.kind).toBe('item')
    expect(arg('sz_w3d_inventory_has', 'ITEM')?.kind).toBe('item')
  })
})

describe('Auditoria Mundo 3D — pipeline completo por bloco', () => {
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
        expect(String(ir[0]?.type).startsWith('w3d:')).toBe(true)
      } else {
        const host = ir[0] as { type?: string; x?: { type?: string } }
        expect(host.type).toBe('w3d:carPlace')
        expect(String(host.x?.type).startsWith('w3d:')).toBe(true)
      }

      // 1b. schema zod aceita a IR
      const parsedSchema = SZIRSchema.safeParse({
        html: [],
        css: [],
        js: ir,
        extensions: [{ extensionId: 'world-3d' }],
      })
      expect(parsedSchema.success).toBe(true)

      // 3. IR → JS: helpers emitidos existem no runtime
      const code = compileStatements(ir, 0)
      expect(code.trim().length).toBeGreaterThan(0)
      const helpers = [...code.matchAll(/SZWorld3D\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1])
      expect(helpers.length).toBeGreaterThan(0)
      const missing = helpers.filter((h) => !runtimeKeys.has(h ?? ''))
      expect(missing).toEqual([])

      // 2. IR → blocos → IR estável
      expect(irThroughBlocks(ir)).toEqual(ir)

      // 4. JS → IR (Ponte): round-trip 100%, sem degradação
      const reparsed = stripIds(parseJS(code))
      expect(reparsed).toEqual(ir)
    })
  }
})
