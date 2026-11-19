import { expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import { CANVAS3D_BLOCKS } from '../../blockly/blocks/canvas3d'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { generateJS, generateJSWithMap } from '../../generators/js'
import { behaviorStatements } from '../../ir/behavior'
import { isLifecycleRootAllowed } from '../../ir/lifecycle'
import { JSStatementSchema, SZIRSchema } from '../../ir/schema'
import { parseJS } from '../js'

const n = (value: number) => ({ type: 'num', value })
const carregar = () => ({
  type: 'threeSceneLoad',
  scene: 'cena',
  renderer: 'renderizador',
  asset: 'asset-cena',
  param: 'cenario',
  body: [{ type: 'consoleLog', value: { type: 'var', name: 'cenario' } }],
  errorParam: 'erro',
  errorBody: [],
})
const base = () => [
  { type: 'importStar', name: 'THREE', module: 'three' },
  { type: 'threeSceneSetup', scene: 'cena' },
  { type: 'threeRendererSetup', renderer: 'renderizador', canvas: 'tela' },
]
const programa = (js: unknown[]) => ({
  html: [{ type: 'canvas', id: 'tela', width: 800, height: 600 }],
  css: [],
  js,
  extensions: [],
})

test('o bloco do cenário usa o seletor por ID e os mesmos papéis de cena/renderer do Canvas', () => {
  const bloco = CANVAS3D_BLOCKS.find((b) => b.type === 'sz_t3d_load_scene')
  expect(bloco).toBeDefined()
  expect(JSON.stringify(bloco)).toContain('"kind":"scene3d"')
  expect(bloco?.bodyExecution).toBe('deferred-callback')
})

test('o cenário preserva ID e corpos assíncronos no ciclo completo de código e Blockly', () => {
  const parsed = SZIRSchema.safeParse(programa([...base(), carregar()]))
  expect(parsed.success).toBe(true)
  if (!parsed.success) return
  const codigo = generateJS({ statements: behaviorStatements(parsed.data) })
  expect(codigo).toContain('window.SZScene3D.instalar("asset-cena", cena,')
  expect(codigo).not.toContain('GLTFLoader')
  const deVolta = parseJS(codigo)
  expect(JSON.stringify(deVolta)).not.toContain('"rawJS"')
  expect(generateJS({ statements: deVolta })).toBe(codigo)
  const reaberto = SZIRSchema.parse(programa(deVolta)),
    estado = buildWorkspaceStateFromIR(reaberto)
  expect(JSON.stringify(estado)).toContain('"sz_t3d_load_scene"')
  expect(JSON.stringify(estado)).toContain('asset-cena')
  ensureBlocklyInitialized()
  const ws = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load({ ...estado }, ws)
    expect(generateJS({ statements: behaviorStatements(buildIRFromWorkspace(ws)) })).toBe(codigo)
  } finally {
    ws.dispose()
  }
})

test('o handle só existe no sucesso; cena não pode ocupar o papel de renderer', () => {
  expect(
    SZIRSchema.safeParse(programa([...base(), { ...carregar(), renderer: 'cena' }])).success,
  ).toBe(false)
  expect(
    SZIRSchema.safeParse(
      programa([
        ...base(),
        carregar(),
        { type: 'consoleLog', value: { type: 'var', name: 'cenario' } },
      ]),
    ).success,
  ).toBe(false)
})

test('edição do JavaScript expandido invalida a receita sem restaurar a seleção antiga', () => {
  const parsed = SZIRSchema.safeParse(programa([...base(), carregar()]))
  expect(parsed.success).toBe(true)
  if (!parsed.success) return
  const codigo = generateJS({ statements: behaviorStatements(parsed.data) }),
    editado = codigo.replace(
      'window.SZScene3D.instalar("asset-cena"',
      'window.SZScene3D.instalar("outra-cena"',
    )
  expect(editado).not.toBe(codigo)
  expect(parseJS(editado).some((s) => s.type === 'threeSceneLoad')).toBe(false)
})

test('a atualização do cenário é contínua e o carregamento não pode se repetir por quadro', () => {
  const atualizar = JSStatementSchema.safeParse({
    type: 'threeSceneUpdate',
    scene: 'cena',
    camera: 'camera',
    focus: 'foco',
    dt: n(1 / 60),
  })
  expect(atualizar.success).toBe(true)
  if (!atualizar.success) return
  expect(isLifecycleRootAllowed(atualizar.data, 'start')).toBe(false)
  const pronto = JSStatementSchema.safeParse(carregar())
  expect(pronto.success).toBe(true)
  if (pronto.success) expect(isLifecycleRootAllowed(pronto.data, 'loops')).toBe(false)
})

test('os corpos de sucesso e erro mantêm suas linhas no source map', () => {
  const s = JSStatementSchema.parse({
      ...carregar(),
      __id: 'carregar-cena',
      body: [
        { type: 'consoleLog', __id: 'sucesso-cena', value: { type: 'str', value: 'Cena pronta' } },
      ],
      errorBody: [
        { type: 'consoleLog', __id: 'erro-cena', value: { type: 'str', value: 'Cena recusada' } },
      ],
    }),
    { code, map } = generateJSWithMap({ statements: [s] }),
    entradas = map.build(),
    linhas = code.split('\n')
  expect(entradas['sucesso-cena']?.startLine).toBe(
    linhas.findIndex((l) => l.includes('console.log("Cena pronta")')) + 1,
  )
  expect(entradas['erro-cena']?.startLine).toBe(
    linhas.findIndex((l) => l.includes('console.log("Cena recusada")')) + 1,
  )
})

test('a receita usa o sinal e a fronteira terminal da execução gerenciada existente', () => {
  const s = JSStatementSchema.parse(carregar()),
    codigo = generateJS({ behavior: { start: [s], events: [], loops: [] }, lifecycle: 'game-3d' })
  expect(codigo).toContain('window.__SZProjectLifecycle.begin(')
  expect(codigo).toMatch(/instalar\("asset-cena", cena, [\w$]+\.signal,/)
  expect(codigo).toMatch(/\(cenario\) => [\w$]+\.run\(/)
  expect(codigo).not.toContain('new AbortController()')
})

test('a física sem função de piso liga o cenário pelo seletor de cena e preserva a receita no ciclo Blockly/código', () => {
  const ir = SZIRSchema.parse(
      programa([
        ...base(),
        { type: 'physicsLiteSetup', world: 'fisica', gravity: n(-22), maxSubSteps: n(3) },
        {
          ...carregar(),
          body: [{ type: 'physicsLiteScene', world: 'fisica', id: 'base', scene: 'cena' }],
        },
      ]),
    ),
    codigo = generateJS({ statements: behaviorStatements(ir) })
  expect(codigo).toContain('createSZPhysicsLite({ gravity: -22, maxSubSteps: 3 })')
  expect(codigo).toContain('window.SZScene3D?.instalado(cena)')
  expect(codigo).toMatch(/fisica\.setScene\("base", [\w$]+\.fisica\)/)
  expect(generateJS({ statements: parseJS(codigo) })).toBe(codigo)
  ensureBlocklyInitialized()
  const ws = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load({ ...buildWorkspaceStateFromIR(ir) }, ws)
    expect(generateJS({ statements: behaviorStatements(buildIRFromWorkspace(ws)) })).toBe(codigo)
  } finally {
    ws.dispose()
  }
})

test('o valor de tempo do loop é conservado no soquete ao reabrir a atualização em Blockly', () => {
  const ir = SZIRSchema.parse(
      programa([
        ...base(),
        {
          type: 'threeCameraSetup',
          camera: 'camera',
          canvas: 'tela',
          fov: n(55),
          near: n(0.1),
          far: n(500),
        },
        {
          type: 'funcDecl',
          name: 'quadro',
          params: ['delta'],
          body: [
            {
              type: 'threeSceneUpdate',
              scene: 'cena',
              camera: 'camera',
              focus: 'camera',
              dt: { type: 'var', name: 'delta' },
            },
          ],
        },
      ]),
    ),
    codigo = generateJS({ statements: behaviorStatements(ir) })
  ensureBlocklyInitialized()
  const ws = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load({ ...buildWorkspaceStateFromIR(ir) }, ws)
    expect(
      ws
        .getBlocksByType('sz_t3d_update_scene')[0]
        ?.getInputTargetBlock('DT')
        ?.getFieldValue('NAME'),
    ).toBe('delta')
    expect(generateJS({ statements: behaviorStatements(buildIRFromWorkspace(ws)) })).toBe(codigo)
  } finally {
    ws.dispose()
  }
})
