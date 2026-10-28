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
    const compiled = generator.slice(
      generator.indexOf('function worldThreeDStatementToCode'),
      generator.indexOf('function childMapContext'),
    )
    const collected = generator.slice(
      generator.indexOf('function worldThreeDStatementIdentifiers'),
      generator.indexOf('function collectExprIdentifiers'),
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
    // 137 → 136 no review 3D (10/2026): "onde o carrinho está" + "onde o personagem está"
    // viraram um bloco só, "onde o jogador está" (sz_w3d_player_pos).
    // 136 → 161 no lote 10: −2 fundidos nas regras de jogo (o "Escrever no canto" e o
    // "Tremer a câmera" passaram a ser os da fábrica `game3dRules`), +19 regras de jogo
    // (pontos, vida do jogador, telas, recomeçar, cronômetro, sorteio, tremer) e +8 novos
    // (coletáveis, "Quando pegar", tirar do mundo, esvaziar a mochila e quatro do Molda).
    expect(world3DBlocks.length).toBe(161)
    const types = new Set(world3DBlocks.map((block) => block.type))
    expect(types.has('sz_w3d_hud')).toBe(false)
    expect(types.has('sz_w3d_hud_text')).toBe(true)
    expect(types.has('sz_w3d_player_pos')).toBe(true)
    expect(types.has('sz_w3d_car_pos')).toBe(false)
    expect(types.has('sz_w3d_person_pos')).toBe(false)
    // O id citado fora do Studio (e2e/behavior-lifecycle.spec.ts) continua igual.
    expect(types.has('sz_w3d_setup')).toBe(true)
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
      // Lote 10: o modelo do Molda no personagem/amigo/carro e o clipe de cada momento.
      'sz_w3d_person_model',
      'sz_w3d_npc_model',
      'sz_w3d_car_model',
      'sz_w3d_model_anim',
      'sz_w3d_set_screen_text',
    ]) {
      const definition = world3DBlocks.find((block) => block.type === type)
      if (!definition) throw new Error(`bloco ${type} ausente`)
      expect(inferBlockContract(definition).placement).toEqual({
        root: ['start'],
        nested: [],
        role: 'command',
      })
    }

    // Lote 9 do review 3D: o que pode NASCER durante o jogo (num "Quando…" ou no laço)
    // saiu do "só no início"; o runtime constrói na hora, com teto.
    for (const type of [
      'sz_w3d_confetti',
      'sz_w3d_say',
      'sz_w3d_car_place',
      'sz_w3d_coins_scatter',
      'sz_w3d_coins_ring',
      'sz_w3d_coins_line',
      'sz_w3d_marker',
      'sz_w3d_quest',
      'sz_w3d_place_thing',
      'sz_w3d_place_model',
      'sz_w3d_push_place',
      'sz_w3d_explosive',
      'sz_w3d_npc',
      // Lote 10: coletáveis nascem no jogo; tirar, esvaziar e as regras valem em qualquer corpo.
      'sz_w3d_collectible',
      'sz_w3d_remove_named',
      'sz_w3d_inventory_clear',
      'sz_w3d_add_score',
      'sz_w3d_hurt',
      'sz_w3d_hud_text',
    ]) {
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

describe('Auditoria Mundo 3D — dropdowns comuns (cantos e teclas) e "onde o jogador está"', () => {
  /** IR de um statement → JS → IR (Ponte) e → blocos → IR. */
  function roundTrip(statement: JSStatement) {
    const code = compileStatements([statement], 0)
    expect(stripIds(parseJS(code))).toEqual([statement])
    expect(irThroughBlocks([statement])).toEqual([statement])
    return code
  }

  it('"Escrever na tela" é o das regras de jogo 3D (mesma lista de cantos, incluindo o meio)', () => {
    const corner = world3DBlocks
      .find((block) => block.type === 'sz_w3d_hud_text')
      ?.args0?.find((arg) => (arg as { name?: string }).name === 'CORNER') as
      | { options?: [string, string][] }
      | undefined
    const values = (corner?.options ?? []).map(([, value]) => value)
    expect(values).toEqual([
      'top-left',
      'top-center',
      'top-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
      'center',
    ])
    for (const value of values) {
      const code = roundTrip({
        type: 'w3d:cornerText',
        corner: value,
        text: { type: 'str', value: 'Oi' },
      } as unknown as JSStatement)
      expect(code).toContain(`SZWorld3D.hudText("${value}", "Oi")`)
    }
    // Canto fora da lista não vira bloco (a criança veria um campo vazio).
    expect(
      collectTypes(parseJS('SZWorld3D.hudText("meio-da-tela", "Oi");')).has('w3d:cornerText'),
    ).toBe(false)
    expect(runtimeKeys.has('hud')).toBe(false)
  })

  it('a vida é do jogador: os blocos de vida não pedem objeto (a cara do resto é a do Jogo 3D)', () => {
    const args = (type: string) =>
      (
        (world3DBlocks.find((block) => block.type === type)?.args0 ?? []) as Array<{
          name?: string
        }>
      )
        .map((arg) => arg.name)
        .filter(Boolean)
    expect(args('sz_w3d_set_life')).toEqual(['VALUE'])
    expect(args('sz_w3d_hurt')).toEqual(['VALUE'])
    expect(args('sz_w3d_heal')).toEqual(['VALUE'])
    expect(args('sz_w3d_life_of')).toEqual([])
    expect(args('sz_w3d_on_life_over')).toEqual([])
    const types = new Set(world3DBlocks.map((block) => block.type))
    // Piscar, tecla, clique e encostar são do Jogo 3D (o mundo tem os "Quando…" dele).
    for (const off of ['blink', 'on_key', 'on_click_object', 'on_touch_group'])
      expect(types.has(`sz_w3d_${off}`)).toBe(false)
  })

  it('as teclas vêm do dropdown comum (códigos) e voltam iguais pela Ponte', () => {
    for (const key of ['KeyE', 'Space', 'ShiftLeft', 'ArrowUp', 'Enter']) {
      const host = (expr: { type: 'w3d:keyDown' | 'w3d:keyPressed'; key: string }) =>
        ({
          type: 'w3d:carPlace',
          x: expr,
          z: { type: 'num', value: 0 },
          deg: { type: 'num', value: 0 },
        }) as unknown as JSStatement
      roundTrip(host({ type: 'w3d:keyDown', key }))
      roundTrip(host({ type: 'w3d:keyPressed', key }))
    }
    expect(collectTypes(parseJS('var a = SZWorld3D.keyDown("e");')).has('w3d:keyDown')).toBe(false)
  })

  it('"onde o jogador está" faz o round-trip nos três eixos e chama playerPos', () => {
    for (const axis of ['x', 'y', 'z'] as const) {
      const code = roundTrip({
        type: 'w3d:carPlace',
        x: { type: 'w3d:playerPos', axis },
        z: { type: 'num', value: 0 },
        deg: { type: 'num', value: 0 },
      } as unknown as JSStatement)
      expect(code).toContain(`SZWorld3D.playerPos("${axis}")`)
    }
    expect(runtimeKeys.has('playerPos')).toBe(true)
    expect(runtimeKeys.has('carPos')).toBe(false)
    expect(runtimeKeys.has('personPos')).toBe(false)
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

describe('Auditoria Mundo 3D — a Ponte não muda o código em silêncio (achados de 24/10/2026)', () => {
  it('coletável com nome vazio continua com nome vazio (não vira "estrela")', () => {
    const code = 'SZWorld3D.collectible(5, "estrela", "", 0, 0, 20);'
    const ir = stripIds(parseJS(code))
    expect(collectTypes(ir).has('w3d:collectible')).toBe(true)
    const back = irThroughBlocks(ir)
    expect(back).toEqual(ir)
    expect(compileStatements(back, 0).trim()).toBe(code)
  })

  it('"Pôr o modelo" só vira bloco com 5 ou 6 argumentos (um a mais perdia o clipe)', () => {
    const isBlock = (code: string) => collectTypes(parseJS(code)).has('w3d:placeModel')
    expect(isBlock('SZWorld3D.placeModel("m", 1, 2, 3, 4);')).toBe(true)
    expect(isBlock('SZWorld3D.placeModel("m", 1, 2, 3, 4, "anda");')).toBe(true)
    expect(isBlock('SZWorld3D.placeModel("m", 1, 2, 3, 4, "anda", 99);')).toBe(false)
    expect(isBlock('SZWorld3D.placeModel("m", 1, 2, 3);')).toBe(false)
    // Fora do bloco, o código avançado fica como a criança escreveu.
    const kept = 'SZWorld3D.placeModel("m", 1, 2, 3, 4, "anda", 99);'
    expect(compileStatements(stripIds(parseJS(kept)), 0).trim()).toBe(kept)
  })

  it('"No personagem, quando estiver…" volta com o nome padrão do próprio bloco', () => {
    const def = world3DBlocks.find((block) => block.type === 'sz_w3d_model_anim')
    const nameArg = (def?.args0 ?? []).find((arg) => (arg as { name?: string }).name === 'NAME') as
      | { text?: string }
      | undefined
    const ir = stripIds(parseJS('SZWorld3D.modelAnim("personagem", "", "andando", "Walk");'))
    const state = buildWorkspaceStateFromIR({
      html: [],
      css: [],
      js: ir,
      extensions: [{ extensionId: 'world-3d' }],
    } as unknown as Parameters<typeof buildWorkspaceStateFromIR>[0])
    const found: Record<string, unknown>[] = []
    const walk = (node: unknown) => {
      if (!node || typeof node !== 'object') return
      const rec = node as Record<string, unknown>
      if (rec.type === 'sz_w3d_model_anim') found.push(rec)
      for (const value of Object.values(rec)) walk(value)
    }
    walk(state)
    expect(found.length).toBe(1)
    expect((found[0]?.fields as Record<string, unknown>).NAME).toBe(nameArg?.text)
    expect(nameArg?.text).toBe('Lia')
  })
})
