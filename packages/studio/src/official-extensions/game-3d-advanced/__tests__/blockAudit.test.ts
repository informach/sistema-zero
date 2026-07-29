import { beforeAll, describe, expect, it } from 'bun:test'
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
import { G3K_SOCKET_SHADOWS, gameKit3DBlocks, gameKit3DToolboxCategory } from '../blocks'
import { gameKit3DRuntime } from '../runtime'
import { collectTypes, stripIds } from './testUtils'

/**
 * Auditoria GENÉRICA de todos os blocos do Jogo 3D Avançado (clone do
 * blockAudit do Jogo 2D Avançado) — um caso por def, com os valores DEFAULT:
 *
 *   1. def → IR: o bloco na área indicada pelo contrato vira um nó g3k: (não é
 *      rascunho nem rawJS) e a IR valida no SZIRSchema (drift do zod).
 *   2. IR → blocos → IR: reconstruir e recoletar devolve a MESMA IR.
 *   3. IR → JS: todo helper `SZGameKit3D.x(...)` emitido EXISTE no runtime.
 *   4. JS → IR (Ponte): o código gerado parseia de volta para a MESMA IR
 *      (round-trip 100%, zero rawJS — a extensão não tem forward-only).
 *
 * Reporters (output) são plugados no soquete X do host `sz_g3k_place`.
 */

const EXPR_HOST = 'sz_g3k_place'

const statementDefs = gameKit3DBlocks.filter((def) => !def.output)
const exprDefs = gameKit3DBlocks.filter((def) => Boolean(def.output))

function loadRuntimeKeys(): Set<string> {
  // O runtime é um SCRIPT MODULE (1ª linha = import de three). Para avaliar no
  // bun:test, tiramos a linha do import e injetamos um stub de THREE — o
  // top-level da IIFE não toca em THREE nem em document (contrato do arquivo).
  const body = gameKit3DRuntime.replace(/^import \* as THREE from 'three';\n/, '')
  const win = {
    addEventListener() {},
    SZGameKit3D: undefined,
    performance: { now: () => 0 },
    devicePixelRatio: 1,
  } as unknown as Record<string, unknown>
  new Function('THREE', 'window', body)({}, win)
  const api = win.SZGameKit3D as Record<string, unknown> | undefined
  if (!api) throw new Error('runtime não montou window.SZGameKit3D')
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
      loopHost: 'sz_g3k_on_update',
    })
    return stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
  } finally {
    ws.dispose()
  }
}

/** IR → blocos (workspaceState) → IR (buildIR), sem os __id. */
function irThroughBlocks(js: JSStatement[]): JSStatement[] {
  const ir = { html: [], css: [], js, extensions: [{ extensionId: 'game-3d-advanced' }] }
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
  registerExtensionBlocks(gameKit3DBlocks)
  runtimeKeys = loadRuntimeKeys()
})

describe('Auditoria Jogo 3D Avançado — inventário', () => {
  it('todo def é statement (previousStatement) ou reporter (output)', () => {
    expect(statementDefs.length + exprDefs.length).toBe(gameKit3DBlocks.length)
    expect(gameKit3DBlocks.length).toBe(133)
    for (const def of statementDefs) expect(def.previousStatement).toBe('JSStmt')
    for (const def of exprDefs) expect(def.output).toBe('JSValue')
  })

  it('todo soquete de valor da paleta abre com uma sombra intuitiva', () => {
    const missing: string[] = []
    for (const definition of gameKit3DBlocks) {
      for (const [key, value] of Object.entries(definition)) {
        if (!key.startsWith('args') || !Array.isArray(value)) continue
        for (const arg of value as Array<{ type?: string; name?: string }>) {
          if (arg.type !== 'input_value' || !arg.name) continue
          if (!G3K_SOCKET_SHADOWS[definition.type]?.[arg.name]) {
            missing.push(`${definition.type}.${arg.name}`)
          }
        }
      }
    }
    expect(missing).toEqual([])
  })

  it('modelo GLB e céu HDR usam seletores filtrados aos assets corretos', () => {
    const argument = (type: string, name: string) => {
      const definition = gameKit3DBlocks.find((block) => block.type === type)
      for (const [key, value] of Object.entries(definition ?? {})) {
        if (!key.startsWith('args') || !Array.isArray(value)) continue
        const found = (value as Array<{ name?: string }>).find((arg) => arg.name === name)
        if (found) return found
      }
      return undefined
    }
    expect(argument('sz_g3k_part', 'MODEL')).toMatchObject({
      type: 'field_asset_picker',
      kind: '3d',
      filter: 'model3d',
    })
    expect(argument('sz_g3k_set_sky_photo', 'PHOTO')).toMatchObject({
      type: 'field_asset_picker',
      kind: '3d',
      filter: 'environment3d',
    })
  })

  it('molde aceita somente Peça diretamente no corpo e Peça não existe na raiz', () => {
    const mold = gameKit3DBlocks.find((block) => block.type === 'sz_g3k_define_mold')
    const part = gameKit3DBlocks.find((block) => block.type === 'sz_g3k_part')
    if (!mold || !part) throw new Error('blocos de molde incompletos')

    expect(inferBlockContract(mold)).toMatchObject({
      bodyContext: 'g3k-mold-parts',
    })
    expect(inferBlockContract(part).placement).toEqual({
      root: [],
      nested: ['g3k-mold-parts'],
      directNested: true,
      role: 'command',
    })
  })

  it('animação por estado usa o mesmo seletor de estados da FSM', () => {
    const definition = gameKit3DBlocks.find((block) => block.type === 'sz_g3k_state_anim')
    if (!definition) throw new Error('bloco de animação por estado ausente')
    const args = Object.entries(definition)
      .filter(([key, value]) => key.startsWith('args') && Array.isArray(value))
      .flatMap(([, value]) => value)

    expect(args.find((arg) => arg.name === 'STATE')).toMatchObject({
      type: 'field_name_picker',
      kind: 'entitystate',
    })
  })

  it('o bloco de boot legado fica registrado, mas não aparece na paleta', () => {
    expect(gameKit3DBlocks.find((block) => block.type === 'sz_g3k_start')).toMatchObject({
      hidden: true,
    })
    const toolboxTypes = collectTypes(gameKit3DToolboxCategory)
    expect(toolboxTypes.has('sz_g3k_start')).toBe(false)
  })
})

describe('Auditoria Jogo 3D Avançado — pipeline completo por bloco', () => {
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
        expect(String(ir[0]?.type).startsWith('g3k:')).toBe(true)
      } else {
        const host = ir[0] as { type?: string; x?: { type?: string } }
        expect(host.type).toBe('g3k:place')
        expect(String(host.x?.type).startsWith('g3k:')).toBe(true)
      }

      // 1b. schema zod aceita a IR
      const parsedSchema = SZIRSchema.safeParse({
        html: [],
        css: [],
        js: ir,
        extensions: [{ extensionId: 'game-3d-advanced' }],
      })
      expect(parsedSchema.success).toBe(true)

      // 3. IR → JS: helpers emitidos existem no runtime
      const code = compileStatements(ir, 0)
      expect(code.trim().length).toBeGreaterThan(0)
      const helpers = [...code.matchAll(/SZGameKit3D\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1])
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

describe('Auditoria Jogo 3D Avançado — round-trip por OPÇÃO de dropdown', () => {
  // O pipeline acima só exercita os valores DEFAULT (1ª opção do dropdown). Foi
  // esse furo que deixou `part({ shape: 'modelo' })` cair em rawJS na Ponte — o
  // parser não tinha 'modelo' no G3K_PART_SHAPES, mas o default 'box' passava.
  // Aqui varremos CADA opção de CADA field_dropdown e provamos que sobrevive à
  // Ponte: qualquer opção que exista no bloco/runtime mas falte no Set do parser
  // (ou destoe de material/where/axis/curve/…) vira rawJS e o teste pega.
  interface DropdownArg {
    type?: string
    name?: string
    options?: Array<[string, string]>
  }
  const cases: { type: string; kind: 'statement' | 'expr'; field: string; value: string }[] = []
  for (const def of gameKit3DBlocks) {
    const keep = def.output || inferBlockContract(def).migration === 'keep'
    if (!keep) continue
    const kind: 'statement' | 'expr' = def.output ? 'expr' : 'statement'
    for (const [key, value] of Object.entries(def)) {
      if (!key.startsWith('args') || !Array.isArray(value)) continue
      for (const arg of value as DropdownArg[]) {
        if (arg.type !== 'field_dropdown' || !arg.name || !Array.isArray(arg.options)) continue
        for (const [, optValue] of arg.options) {
          cases.push({ type: def.type, kind, field: arg.name, value: optValue })
        }
      }
    }
  }

  it('há dropdowns cobertos (a varredura não ficou vazia)', () => {
    expect(cases.length).toBeGreaterThan(0)
  })

  it('toda opção de todo dropdown sobrevive à Ponte (0 rawJS, round-trip estável)', () => {
    const broken: string[] = []
    for (const c of cases) {
      const ws = new Blockly.Workspace()
      try {
        const block = attachBlockInContractContext({
          workspace: ws,
          type: c.type,
          kind: c.kind,
          expressionHost: EXPR_HOST,
          expressionInput: 'X',
          loopHost: 'sz_g3k_on_update',
        })
        block.setFieldValue(c.value, c.field)
        const ir = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
        const code = compileStatements(ir, 0)
        const reparsed = stripIds(parseJS(code))
        if (collectTypes(ir).has('rawJS')) broken.push(`${c.type}.${c.field}=${c.value} (IR rawJS)`)
        else if (collectTypes(reparsed).has('rawJS'))
          broken.push(`${c.type}.${c.field}=${c.value} (Ponte→rawJS)`)
        else if (JSON.stringify(reparsed) !== JSON.stringify(ir))
          broken.push(`${c.type}.${c.field}=${c.value} (round-trip instável)`)
      } catch (err) {
        broken.push(`${c.type}.${c.field}=${c.value} (erro: ${err})`)
      } finally {
        ws.dispose()
      }
    }
    expect(broken).toEqual([])
  })

  it('playEffect com efeito FORA do dropdown vira rawJS (não coage p/ "coin")', () => {
    // Direção reversa (Ponte código→blocos): um fx desconhecido (IA/edição/cola)
    // NÃO pode ser aceito, senão o FieldDropdown o coage p/ a 1ª opção no sync.
    const known = collectTypes(stripIds(parseJS(`SZGameKit3D.playEffect('coin');`)))
    expect(known.has('g3k:playEffect')).toBe(true)
    const unknown = collectTypes(stripIds(parseJS(`SZGameKit3D.playEffect('desconhecido');`)))
    // NÃO vira g3k:playEffect (o bloco de dropdown que coagiria p/ "coin"); cai
    // num memberCall genérico (chamada de método estruturada, sem coerção).
    expect(unknown.has('g3k:playEffect')).toBe(false)
    expect(unknown.has('memberCall')).toBe(true)
  })
})
