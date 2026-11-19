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
import { gameKit3DBlocks } from '../../src/official-extensions/game-3d-advanced/blocks'
import { parseJS } from '../../src/parsers/js'
import { parseProjectFilesFromParts } from '../../src/parsers/project'
import { criarTransporteDeEnsaio } from '../../src/testing/scene3dTransportFixture'
import { gravarDocumentosDoMotor } from './documentos-do-motor'
import { prepararVendors } from './preparar-vendors'

GlobalRegistrator.register({ settings: { disableIframePageLoading: true } })
ensureBlocklyInitialized()
registerExtensionBlocks(gameKit3DBlocks)
const raiz = resolve(import.meta.dirname, '../../../..'),
  pasta = resolve(raiz, 'output/cenarios-reforma/lote8-studio-motores/avancado'),
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
  autor = await readFile(resolve(import.meta.dirname, 'programa-avancado.js'), 'utf8')
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
    fonte = `SZGameKit3D.setup({width:960,height:600,world:80});
SZGameKit3D.loadScene(${JSON.stringify(primario.id)});
SZGameKit3D.defineMold("heroi",{health:100,speed:3.4},function(){
SZGameKit3D.part(${JSON.stringify(avatar ? { shape: 'modelo', model: avatar.name, w: 1.16, h: 1.16, d: 1.16, x: 0, y: 0.58, z: 0 } : { shape: 'box', w: 0.5, h: 1.16, d: 0.5, x: 0, y: 0.58, z: 0, color: '#3355cc' })});
});
SZGameKit3D.setPhysics("heroi","personagem");
${
  avatar
    ? [
        ['parado', 'parado_relaxado'],
        ['andando', 'andar_frente'],
        ['correndo', 'correr_frente'],
        ['pulando', 'pulo_no_ar'],
      ]
        .map(
          ([estado, clip]) =>
            `SZGameKit3D.setStateAnim("heroi",${JSON.stringify(estado)},${JSON.stringify(clip)});`,
        )
        .join('\n')
    : ''
}
window.__qaPrepararAvancado();
SZGameKit3D.onEnterState("jogando",function(){
const heroi=SZGameKit3D.spawn("heroi",0,0,0);
SZGameKit3D.sceneStart(heroi);
SZGameKit3D.cameraFollow(heroi,4,4.5);
window.__qaEntrarAvancado(heroi);
});`,
    ir = SZIRSchema.parse({ html: [], css: [], extensions: [], js: parseJS(fonte) }),
    ws = new Blockly.Workspace()
  let codigo: string
  try {
    Blockly.serialization.workspaces.load({ ...buildWorkspaceStateFromIR(ir) }, ws)
    const reconstruido = buildIRFromWorkspace(ws)
    codigo = generateJS({
      behavior: splitLegacyBehavior(behaviorStatements(reconstruido)),
      lifecycle: 'game-3d-advanced',
    })
    assert.equal(
      codigo,
      generateJS({
        behavior: splitLegacyBehavior(behaviorStatements(ir)),
        lifecycle: 'game-3d-advanced',
      }),
    )
    assert.ok(codigo.includes('SZGameKit3D.runProject('))
    const deVolta = parseProjectFilesFromParts({ html: [], cssSource: '', jsSource: codigo }).ir
    for (const tipo of ['g3k:loadScene', 'g3k:sceneStart', 'g3k:defineMold', 'g3k:spawnNamed'])
      assert.ok(JSON.stringify(deVolta).includes(tipo))
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
      ...createEmptyProject('prova-avancado', 'Avançado: cenário do Molda'),
      mode: 'bridge',
      assets,
      installedExtensions: [{ id: 'game-3d-advanced', version: '0.24.0', installedAt: 0 }],
      files: {
        'index.html': '<!doctype html><html><head></head><body></body></html>',
        'style.css': 'html,body{margin:0;overflow:hidden}',
        'script.js': `${autor.replace('__ENTRADA_DE_ENSAIO__', JSON.stringify(entrada))}\n${codigo}`,
      },
    }
  await gravarDocumentosDoMotor(pasta, nome, execucao)
}
await prepararVendors(pasta, true)
console.log(
  'Avançado: blocos/IR, fábrica, molde/controlador/clipes reais, reabertura, preview e export.',
)
