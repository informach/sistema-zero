import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import * as Blockly from 'blockly/core'
import { registerExtensionBlocks } from '../../src/blockly/blocks'
import { buildIRFromWorkspace } from '../../src/blockly/buildIR'
import { ensureBlocklyInitialized } from '../../src/blockly/setup'
import { buildWorkspaceStateFromIR } from '../../src/blockly/workspaceState'
import { createEmptyProject, type Project } from '../../src/core/project'
import { generateJS } from '../../src/generators/js'
import { behaviorStatements, splitLegacyBehavior } from '../../src/ir/behavior'
import { SZIRSchema } from '../../src/ir/schema'
import { gameThreeDBlocks } from '../../src/official-extensions/game-3d/blocks'
import { parseProjectFilesFromParts } from '../../src/parsers/project'
import { criarTransporteDeEnsaio } from '../../src/testing/scene3dTransportFixture'
import { gravarDocumentosDoMotor } from './documentos-do-motor'
import { prepararVendors } from './preparar-vendors'

GlobalRegistrator.register({ settings: { disableIframePageLoading: true } })
ensureBlocklyInitialized()
registerExtensionBlocks(gameThreeDBlocks)
const raiz = resolve(import.meta.dirname, '../../../..'),
  pasta = resolve(raiz, 'output/cenarios-reforma/lote8-studio-motores/jogo3d'),
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
  autor = await readFile(resolve(import.meta.dirname, 'programa-jogo3d.js'), 'utf8')
await mkdir(pasta, { recursive: true })
for (const [nome, assets] of [
  ['completo', projeto.assets!],
  ['buraco', sintetico.assets],
] as const) {
  const primario = assets.find((a) => a.kind === 'scene3d')!,
    envelope = JSON.parse(Buffer.from(primario.dataUrl.split(',')[1]!, 'base64').toString()),
    caminhoAvatar = envelope.cena.nos.find(
      (n: { entidade: string }) => n.entidade === 'ator',
    )?.arquivo,
    idAvatar = envelope.recursos.find(
      (r: { caminho: string }) => r.caminho === caminhoAvatar,
    )?.asset,
    avatar = assets.find((a) => a.id === idAvatar),
    ir = SZIRSchema.parse({
      html: [{ type: 'canvas', id: 'tela', width: 960, height: 600 }],
      css: [],
      extensions: [],
      js: [
        { type: 'g3d:createScene', varName: 'cena', canvasId: 'tela' },
        { type: 'g3d:loadScene', worldVar: 'cena', asset: primario.id },
        ...(avatar
          ? [
              {
                type: 'g3d:createModelFile',
                varName: 'personagem',
                worldVar: 'cena',
                asset: avatar.name,
                size: 1.16,
              },
            ]
          : [
              {
                type: 'g3d:createBlock',
                varName: 'personagem',
                worldVar: 'cena',
                width: 0.5,
                height: 1.16,
                depth: 0.5,
                color: '#3355cc',
              },
            ]),
        { type: 'g3d:sceneStart', objVar: 'personagem' },
        { type: 'rawJS', advanced: true, code: 'window.__qaIniciarJogo3D(cena, personagem);' },
      ],
    }),
    ws = new Blockly.Workspace()
  let codigo: string
  try {
    Blockly.serialization.workspaces.load({ ...buildWorkspaceStateFromIR(ir) }, ws)
    const reconstruido = buildIRFromWorkspace(ws)
    codigo = generateJS({
      behavior: splitLegacyBehavior(behaviorStatements(reconstruido)),
      lifecycle: 'game-3d',
    })
    assert.equal(
      codigo,
      generateJS({ behavior: splitLegacyBehavior(behaviorStatements(ir)), lifecycle: 'game-3d' }),
    )
    assert.ok(codigo.includes('SZGame3D.runProject('))
    const deVolta = parseProjectFilesFromParts({
      html: ir.html,
      cssSource: '',
      jsSource: codigo,
    }).ir
    assert.ok(JSON.stringify(deVolta).includes('g3d:loadScene'))
    assert.ok(JSON.stringify(deVolta).includes('g3d:sceneStart'))
  } finally {
    ws.dispose()
  }
  const entrada = {
      id: primario.id,
      avatar: !!avatar,
      x: nome === 'buraco' ? 10 : 8,
      z: nome === 'buraco' ? 0 : 8,
    },
    execucao: Project = {
      ...createEmptyProject('prova-jogo3d', 'Jogo 3D: cenário do Molda'),
      mode: 'bridge',
      assets,
      installedExtensions: [{ id: 'game-3d', version: '0.33.0', installedAt: 0 }],
      files: {
        'index.html':
          '<!doctype html><html><head></head><body><canvas id="tela" width="960" height="600"></canvas></body></html>',
        'style.css':
          'html,body{margin:0;overflow:hidden}canvas{display:block;width:100vw;height:100vh}',
        'script.js': `${autor.replace('__ENTRADA_DE_ENSAIO__', JSON.stringify(entrada))}\n${codigo}`,
      },
    }
  await gravarDocumentosDoMotor(pasta, nome, execucao)
}
await prepararVendors(pasta)
console.log(
  'Jogo 3D: blocos/IR, partida gerenciada, cena e avatar reais, reabertura canônica e exportação.',
)
