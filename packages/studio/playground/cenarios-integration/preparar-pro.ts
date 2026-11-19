import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import {
  InvalidBuildRequestError,
  parseStudioBuildSubmission,
} from '@sistemazero/core/studio/build-contract'
import { STUDIO_PRO_BUILD_LIMITS } from '@sistemazero/core/studio/pro-limits'
import { buildProAssetBundle } from '../../src/core/proAssets'
import { proAssetExample } from '../../src/core/proExamples'
import type { Project } from '../../src/core/project'
import { buildProProject } from '../../src/core/proProject'
import { buildProFileMap } from '../../src/export/fileMap'
import { createProAssetSync } from '../../src/modes/pro/proAssetSync'
import { prepareEditableStudioProject } from '../../src/state/editableProjectValidation'
import { captureProRevisionPayload } from '../../src/state/proRevision'
import { criarTransporteDeEnsaio } from '../../src/testing/scene3dTransportFixture'
import { physicsLiteRuntimeSource } from '../../src/three/physicsLiteRuntime'

GlobalRegistrator.register({ settings: { disableIframePageLoading: true } })
const raiz = resolve(import.meta.dirname, '../../../..'),
  base = resolve(raiz, 'output/cenarios-reforma/lote8-studio-pro')
await mkdir(base, { recursive: true })
const pasta = await mkdtemp(resolve(base, 'ensaio-'))
const completo: Project = JSON.parse(
  await readFile(
    resolve(
      raiz,
      'output/cenarios-reforma/lote8-studio-galeria/js-classic-1440-900-light.project.json',
    ),
    'utf8',
  ),
)
const buraco = await criarTransporteDeEnsaio({ comBuraco: true })
const loop = await readFile(resolve(import.meta.dirname, 'programa-canvas.js'), 'utf8')
const packageAuthor = JSON.stringify({
  name: 'pro-cenario',
  version: '1.0.0',
  type: 'module',
  scripts: { dev: 'vite', build: 'vite build' },
  dependencies: { three: '0.184.0' },
  devDependencies: { vite: '8.1.6' },
})
await mkdir(pasta, { recursive: true })
const comprovantes = []
for (const [nome, assets] of [
  ['completo', completo.assets!],
  ['buraco', buraco.assets],
] as const) {
  const id = assets.find((a) => a.kind === 'scene3d')!.id
  const bundle = await buildProAssetBundle(assets),
    entry = bundle.manifest.assets.find((a) => a.id === id)!
  const recipe = proAssetExample(entry, 'src/main.js', {
    'package.json': { kind: 'file', content: packageAuthor },
  })!
  const setup = `import * as THREE from 'three'
import * as sdk from '../studio-generated/molda-cenarios.mjs'
${recipe.code}
${physicsLiteRuntimeSource}
const cena=new THREE.Scene(),camera=new THREE.PerspectiveCamera(55,960/600,.1,500)
const renderizador=new THREE.WebGLRenderer({antialias:true})
renderizador.setSize(960,600);document.body.append(renderizador.domElement)
const personagem=new THREE.Mesh(new THREE.CapsuleGeometry(.25,.66,4,8),new THREE.MeshStandardMaterial({color:0x3344cc}))
cena.add(personagem)
const fisica=createSZPhysicsLite({gravity:-22,maxSubSteps:3})
fisica.addBody('criador',personagem,{kind:'character',width:.5,height:1.16,depth:.5,friction:.82,bounce:0})
function carregarBase(){return carregarCenario(cena,new AbortController().signal).then(cenario=>{fisica.setScene('base',cenario.fisica);window.__qaCanvas.receberCenario(cenario)}).catch(error=>{falha=String(error);console.error(error)})}
function atualizarCenario(dt){const base=sdk.instalado(cena);base.atualizar(dt);base.quadro(camera,personagem.position);fisica.step(dt)}
`
  const source =
    setup +
    loop
      .replaceAll('window.SZScene3D', 'sdk')
      .replace(
        '__ENTRADA_DE_ENSAIO__',
        JSON.stringify({ id, x: nome === 'buraco' ? 10 : 8, z: nome === 'buraco' ? 0 : 5 }),
      ) +
    `
window.__qaPro={
  mesmaThree:()=>sdk.instalado(cena).raiz instanceof THREE.Group,
  async falhar(){const antes=sdk.instalado(cena);try{await sdk.instalar('id-ausente',cena,new AbortController().signal)}catch(error){return {erro:String(error),conservou:sdk.instalado(cena)===antes,ativa:antes.fisica.active()}}throw Error('Aceitou ID ausente')},
  async abortar(){const antes=sdk.instalado(cena),controle=new AbortController();controle.abort();try{await sdk.instalar(${JSON.stringify(id)},cena,controle.signal)}catch(error){return {erro:error.name,conservou:sdk.instalado(cena)===antes,ativa:antes.fisica.active()}}throw Error('Aceitou sinal cancelado')},
  encerrar:sdk.encerrar,
}
`
  const project = {
    ...buildProProject(
      `pro-cenario-${nome}`,
      'Pro autoral: cenário do Molda',
      {
        src: { kind: 'dir' as const },
        'index.html': {
          kind: 'file' as const,
          content:
            '<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;background:#111}canvas{display:block}</style></head><body><script type="module" src="/src/main.js"></script></body></html>',
        },
        'src/main.js': { kind: 'file' as const, content: source },
        'package.json': { kind: 'file' as const, content: packageAuthor },
      },
      'dev',
      'vanilla-vite',
    ),
    assets,
  }
  const reaberto = await prepareEditableStudioProject(JSON.parse(JSON.stringify(project)))
  assert.ok(reaberto && reaberto.programmingLanguage !== 'python')
  assert.deepEqual(reaberto.tree, project.tree)
  assert.deepEqual(reaberto.assets, assets)
  const root = resolve(pasta, nome, 'source')
  await mkdir(root, { recursive: true })
  for (const [path, node] of Object.entries(reaberto.tree!))
    if (node.kind === 'file') {
      const target = resolve(root, path)
      await mkdir(resolve(target, '..'), { recursive: true })
      await writeFile(target, node.content)
    }
  const fs = {
    readFile: (path: string) => readFile(resolve(root, path)),
    writeFile: (path: string, bytes: Uint8Array) => writeFile(resolve(root, path), bytes),
    mkdir: (path: string, options: { recursive: true }) => mkdir(resolve(root, path), options),
    rm: async () => {
      throw Error('O ensaio não remove arquivos do projeto.')
    },
  }
  const sync = createProAssetSync(fs, {
    active: () => true,
    get: () => ({ assets: reaberto.assets!, tree: reaberto.tree! }),
    apply: () => {
      throw Error('Materialização não deve alterar a biblioteca.')
    },
    report: (message) => {
      throw Error(message)
    },
  })
  await sync.sync()
  const exported = await buildProFileMap(reaberto, { purpose: 'source' })
  assert.deepEqual(exported.warnings, [])
  for (const [path, bytes] of Object.entries(exported.files)) {
    const target = resolve(pasta, nome, 'export', path)
    await mkdir(resolve(target, '..'), { recursive: true })
    await writeFile(target, bytes)
  }
  const { base, binaries } = await captureProRevisionPayload(reaberto)
  const request = {
    executionId: 'pro-cenario-123456789',
    templateId: 'vanilla-vite',
    parentOrigin: 'http://127.0.0.1:5414',
    files: Object.fromEntries(
      Object.entries(reaberto.tree!).flatMap(([path, node]) =>
        node.kind === 'file' ? [[path, node.content]] : [],
      ),
    ),
    binaries,
  }
  let remoto = 'aceito'
  try {
    parseStudioBuildSubmission(request)
  } catch (error) {
    const semGerados = Object.entries(binaries)
      .filter(([p]) => !p.startsWith('studio-generated/'))
      .reduce((n, [, entry]) => n + entry.base64.length, 0)
    if (
      nome !== 'completo' ||
      !(error instanceof InvalidBuildRequestError) ||
      semGerados <= STUDIO_PRO_BUILD_LIMITS.maxRequestBytes ||
      !/limite remoto/.test(error.message)
    )
      throw error
    remoto =
      'recusado: os materiais originais já excedem 2 MB; execução local e export continuam válidos'
  }
  for (const path of Object.keys(binaries))
    assert.deepEqual(
      await readFile(resolve(root, path)),
      Buffer.from(binaries[path]!.base64, 'base64'),
    )
  await writeFile(resolve(pasta, `${nome}.project.json`), JSON.stringify(reaberto))
  comprovantes.push({
    nome,
    revision: base.hash,
    arquivosDerivados: Object.keys(binaries).filter((p) => p.startsWith('studio-generated/')),
    fontesPreservadas: JSON.stringify(project.tree) === JSON.stringify(reaberto.tree),
    semConversao: !reaberto.proMeta?.origin,
    assets: assets.length,
    envelopeRemotoBytes: new TextEncoder().encode(JSON.stringify(request)).byteLength,
    remoto,
  })
}
await writeFile(resolve(pasta, 'materializacao.json'), JSON.stringify(comprovantes, null, 2))
await writeFile(resolve(base, 'execucao.json'), JSON.stringify({ pasta: basename(pasta) }))
console.log(
  'Pro autoral: reabertura, coordenador, revisão e export de fontes com bytes idênticos; sem conversão do clássico.',
)
