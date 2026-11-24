import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import * as Blockly from 'blockly/core'
import { buildIRFromWorkspace } from '../../src/blockly/buildIR'
import { ensureBlocklyInitialized } from '../../src/blockly/setup'
import { buildWorkspaceStateFromIR } from '../../src/blockly/workspaceState'
import { createEmptyProject, type Project } from '../../src/core/project'
import { generateJS } from '../../src/generators/js'
import { behaviorStatements } from '../../src/ir/behavior'
import { type JSStatement, SZIRSchema } from '../../src/ir/schema'
import { parseJS } from '../../src/parsers/js'
import { criarTransporteDeEnsaio } from '../../src/testing/scene3dTransportFixture'
import { gravarDocumentosDoMotor } from './documentos-do-motor'
import { prepararVendors } from './preparar-vendors'

GlobalRegistrator.register({ settings: { disableIframePageLoading: true } })
ensureBlocklyInitialized()
const raiz = resolve(import.meta.dirname, '../../../..'),
  pasta = resolve(raiz, 'output/cenarios-reforma/lote8-studio-motores/canvas'),
  projeto: Project = JSON.parse(
    await readFile(
      resolve(
        raiz,
        'output/cenarios-reforma/lote8-studio-galeria/js-classic-1440-900-light.project.json',
      ),
      'utf8',
    ),
  ),
  sintetico = await criarTransporteDeEnsaio({ comBuraco: true }),
  autor = await readFile(resolve(import.meta.dirname, 'programa-canvas.js'), 'utf8'),
  n = (value: number) => ({ type: 'num' as const, value }),
  raw = (code: string): JSStatement => ({ type: 'rawJS', code, advanced: true })
await mkdir(pasta, { recursive: true })
for (const [nome, assets] of [
  ['completo', projeto.assets!],
  ['buraco', sintetico.assets],
] as const) {
  const primario = assets.find((a) => a.kind === 'scene3d')!
  const ir = SZIRSchema.parse({
    html: [{ type: 'canvas', id: 'tela', width: 960, height: 600 }],
    css: [],
    extensions: [],
    js: [
      { type: 'importStar', name: 'THREE', module: 'three' },
      { type: 'threeSceneSetup', scene: 'cena' },
      { type: 'threeRendererSetup', renderer: 'renderizador', canvas: 'tela' },
      {
        type: 'threeCameraSetup',
        camera: 'camera',
        canvas: 'tela',
        fov: n(55),
        near: n(0.1),
        far: n(500),
      },
      {
        type: 'primitiveSetup',
        mesh: 'personagem',
        scene: 'cena',
        shape: 'capsule',
        width: n(0.5),
        height: n(1.16),
        depth: n(0.5),
        color: { type: 'color', value: '#3344cc' },
      },
      { type: 'physicsLiteSetup', world: 'fisica', gravity: n(-22), maxSubSteps: n(3) },
      {
        type: 'physicsLiteBody',
        world: 'fisica',
        object: 'personagem',
        id: 'criador',
        kind: 'character',
        width: n(0.5),
        height: n(1.16),
        depth: n(0.5),
        friction: n(0.82),
        bounce: n(0),
      },
      {
        type: 'funcDecl',
        name: 'carregarBase',
        params: [],
        body: [
          {
            type: 'threeSceneLoad',
            asset: primario.id,
            scene: 'cena',
            renderer: 'renderizador',
            param: 'cenario',
            body: [
              { type: 'physicsLiteScene', world: 'fisica', id: 'base', scene: 'cena' },
              raw('window.__qaCanvas.receberCenario(cenario);'),
            ],
            errorParam: 'erro',
            errorBody: [raw('falha = String(erro); console.error(erro);')],
          },
        ],
      },
      {
        type: 'funcDecl',
        name: 'atualizarCenario',
        params: ['dt'],
        body: [
          {
            type: 'threeSceneUpdate',
            scene: 'cena',
            camera: 'camera',
            focus: 'personagem',
            dt: { type: 'var', name: 'dt' },
          },
          { type: 'physicsLiteStep', world: 'fisica', dt: { type: 'var', name: 'dt' } },
        ],
      },
    ],
  })
  const ws = new Blockly.Workspace()
  let codigo: string
  try {
    Blockly.serialization.workspaces.load({ ...buildWorkspaceStateFromIR(ir) }, ws)
    const reconstruido = buildIRFromWorkspace(ws)
    codigo = generateJS({ statements: behaviorStatements(reconstruido) })
    assert.equal(codigo, generateJS({ statements: behaviorStatements(ir) }))
    assert.equal(generateJS({ statements: parseJS(codigo) }), codigo)
    const tipos = JSON.stringify(reconstruido)
    for (const tipo of ['threeSceneLoad', 'threeSceneUpdate', 'physicsLiteScene'])
      assert.ok(tipos.includes(tipo))
  } finally {
    ws.dispose()
  }
  const execucao: Project = {
    ...createEmptyProject('prova-canvas', 'Canvas: cenário do Molda'),
    mode: 'bridge',
    assets,
    files: {
      'index.html':
        '<!doctype html><html><head></head><body><canvas id="tela" width="960" height="600"></canvas></body></html>',
      'style.css':
        'html,body{margin:0;overflow:hidden}canvas{display:block;width:100vw;height:100vh}',
      'script.js': `${codigo}\n${autor.replace('__ENTRADA_DE_ENSAIO__', JSON.stringify({ id: primario.id, x: nome === 'buraco' ? 10 : 8, z: nome === 'buraco' ? 0 : 5 }))}`,
    },
  }
  await gravarDocumentosDoMotor(pasta, nome, execucao)
}
await prepararVendors(pasta)
console.log(
  'Canvas: projeto criado por Blockly/IR, reaberto e exportado, sem substituir câmera, renderer ou loop autorais.',
)
