/**
 * O jogo E no Estúdio (lote 7 da conclusão do plano do Estúdio, 22/11/2026), a segunda metade do
 * gerador: lê os dois pacotes que `packages/molda-cenarios/playground/jogo-e/preparar-cenario.ts`
 * gravou (com e sem regiões), importa pelo Estúdio (que confere o orçamento por janela), escreve o
 * programa só com blocos que existem (o cenário, o herói do Molda, as moedas logo acima do relevo,
 * o placar e o "Quando o heroi entrar na região" no canto da tela), confere que cada linha vira um
 * bloco de verdade e a ida e volta código e blocos, e grava os documentos do motor para a prova.
 *
 * ⚠️ As moedas não têm corpo físico (conferência no staging, 22/11/2026): nascidas a 12 m, as que
 * ficavam abaixo do relevo caíam sem apoio e, em poucos quadros, o motor lançava "Corpo pequeno ou
 * rápido demais" a cada quadro; e o "Dar corpo físico" dentro do "para cada" não é lugar de
 * bloco (só vale direto no Ao iniciar). A altura de cada moeda sai do terreno compilado.
 *
 * `bun playground/cenarios-integration/preparar-jogo-e.ts` (em `packages/studio`), depois do
 * cenário.
 */
import assert from 'node:assert/strict'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import {
  type CenaCompilada,
  criarFonteDeAlturasCompilada,
  type PacoteCompilado,
} from '@sistemazero/molda-cenarios-core/compilar'
import * as Blockly from 'blockly/core'
import { registerExtensionBlocks } from '../../src/blockly/blocks'
import { buildIRFromWorkspace } from '../../src/blockly/buildIR'
import { HTMLConnectionChecker } from '../../src/blockly/htmlConnectionChecker'
import { ensureBlocklyInitialized } from '../../src/blockly/setup'
import { buildWorkspaceStateFromIR } from '../../src/blockly/workspaceState'
import { createEmptyProject, type Project } from '../../src/core/project'
import { prepararImportacaoDeCena3D } from '../../src/core/scene3d/importar'
import { generateJS } from '../../src/generators/js'
import { behaviorStatements, splitLegacyBehavior } from '../../src/ir/behavior'
import { gameThreeDBlocks } from '../../src/official-extensions/game-3d/blocks'
import { HEROI_DO_MOLDA_GLB } from '../../src/official-extensions/game-3d/exampleAssets'
import { parseProjectFilesFromParts } from '../../src/parsers/project'
import { gravarDocumentosDoMotor } from './documentos-do-motor'
import { prepararVendors } from './preparar-vendors'

GlobalRegistrator.register({ settings: { disableIframePageLoading: true } })
ensureBlocklyInitialized()
registerExtensionBlocks(gameThreeDBlocks)

const raiz = resolve(import.meta.dirname, '../../../..'),
  pasta = resolve(raiz, 'output/cenarios-reforma/jogo-e')

// A mesma grade de regiões do cenário (as moedas e o placar usam os nomes e os centros).
const X = [-192, -64, 64, 192],
  Z = [-192, 0, 192]
const REGIOES = [
  ['Vila', 0, 0],
  ['Floresta', 1, 0],
  ['Caverna', 2, 0],
  ['Lago', 0, 1],
  ['Praia', 1, 1],
  ['Montanha', 2, 1],
] as const
const centro = (coluna: number, linha: number) => ({
  x: (X[coluna]! + X[coluna + 1]!) / 2,
  z: (Z[linha]! + Z[linha + 1]!) / 2,
})

async function lerPacote(nome: string): Promise<PacoteCompilado> {
  const destino = resolve(pasta, `pacote-${nome}`),
    cena = JSON.parse(await readFile(resolve(destino, 'cena.json'), 'utf8')) as CenaCompilada,
    arquivos = new Map<string, Uint8Array>(),
    base = resolve(destino, 'arquivos')
  for (const entrada of await readdir(base, { recursive: true, withFileTypes: true })) {
    if (!entrada.isFile()) continue
    const caminho = resolve(entrada.parentPath, entrada.name)
    arquivos.set(
      relative(base, caminho).split('\\').join('/'),
      new Uint8Array(await readFile(caminho)),
    )
  }
  return { cena, arquivos }
}

const HEROI = {
  id: 'example-heroi-do-molda',
  name: 'heroi-do-molda',
  kind: 'model3d' as const,
  dataUrl: HEROI_DO_MOLDA_GLB,
  originalFileName: 'heroi-do-molda.glb',
  source: 'library' as const,
  libId: 'example-heroi-do-molda',
}

const MOEDAS = REGIOES.flatMap(([, coluna, linha]) => {
  const c = centro(coluna, linha)
  return [-40, -20, 0, 20, 40].map((d, i) => ({ x: c.x + d, z: c.z + (i % 2 ? 25 : -25) }))
})

/** A altura do chão do cenário em (x, z), pela mesma consulta do terreno compilado. */
function alturaDoChao(pacote: PacoteCompilado): (x: number, z: number) => number {
  const terreno = pacote.cena.terreno
  assert.ok(terreno, 'o cenário do jogo E não tem terreno')
  const bruto = pacote.arquivos.get(terreno.alturas)
  assert.ok(bruto, 'o pacote do jogo E não tem o arquivo de alturas do terreno')
  // Cópia alinhada: o Float32Array não aceita um deslocamento que não seja múltiplo de 4.
  const alturas = new Float32Array(bruto.slice().buffer)
  return criarFonteDeAlturasCompilada(terreno, alturas)
}

function programa(cenaId: string, chao: (x: number, z: number) => number): string {
  const linhas = [
    'const cena = SZGame3D.createFullscreenScene("#9bd7f5");',
    `SZGame3D.loadScene(cena, ${JSON.stringify(cenaId)});`,
    'const heroi = SZGame3D.createModelFile(cena, "heroi-do-molda", 2);',
    'SZGame3D.sceneStart(heroi);',
    'SZGame3D.body(heroi, 36);',
    'SZGame3D.cameraMode(cena, "tras", heroi);',
    'SZGame3D.hudText("top-left", "Ande pelas seis regiões e pegue as moedas.");',
    'const moedas = SZGame3D.createGroup();',
    'const moldeMoeda = SZGame3D.createCylinder(cena, { radius: 0.6, height: 0.2, color: "#facc15" });',
    'SZGame3D.setRotation(moldeMoeda, 90, 0, 0);',
    'SZGame3D.setVisible(moldeMoeda, "hide");',
  ]
  // Cada moeda fica de pé logo acima do relevo (o centro a 1,2 m do chão; o raio é 0,6).
  for (const m of MOEDAS) {
    const y = Math.round((chao(m.x, m.z) + 1.2) * 100) / 100
    linhas.push(`SZGame3D.spawnCopy(moedas, moldeMoeda, ${m.x}, ${y}, ${m.z});`)
  }
  for (const [nome] of REGIOES)
    linhas.push(
      `SZGame3D.onEnterRegion(heroi, ${JSON.stringify(nome)}, () => {`,
      `  SZGame3D.hudText("top-right", ${JSON.stringify(nome)});`,
      '});',
    )
  linhas.push(
    'SZGame3D.onTouchGroup(heroi, moedas, (moeda) => {',
    '  SZGame3D.addScore(1);',
    '  SZGame3D.playEffect("coin");',
    '  SZGame3D.removeFromGroup(moedas, moeda);',
    '  SZGame3D.remove(moeda);',
    '});',
    'SZGame3D.animate(cena, () => {',
    '  SZGame3D.controlWithKeys(heroi, 8);',
    '  SZGame3D.stepBody(heroi, cena);',
    '  if (SZGame3D.isMoving(heroi)) {',
    '    SZGame3D.playAnimation(heroi, "Esticar", "repetir");',
    '  } else {',
    '    SZGame3D.playAnimation(heroi, "Acenar", "repetir");',
    '  }',
    '});',
  )
  return linhas.join('\n')
}

for (const nome of ['regioes', 'inteiro'] as const) {
  const pacote = await lerPacote(nome)
  const plano = await prepararImportacaoDeCena3D(createEmptyProject('jogo-e', 'Jogo E'), pacote)
  const fonte = programa(plano.assetId, alturaDoChao(pacote))
  const ir = parseProjectFilesFromParts({
    html: [{ type: 'canvas', id: 'tela', width: 960, height: 600 }] as never,
    cssSource: '',
    jsSource: fonte,
  }).ir
  assert.ok(!JSON.stringify(ir).includes('"rawJS"'), 'o programa do jogo E saiu como código cru')
  const estado = buildWorkspaceStateFromIR(ir)
  // Cada linha vira um bloco de verdade: um bloco fora do lugar dele vira código cru aqui (as
  // regras do Jogo 3D estão registradas) e, na galeria, quebrava a carga do editor.
  assert.ok(
    !JSON.stringify(estado).includes('"sz_adv_raw_js"'),
    'uma linha do jogo E não vira bloco (bloco fora do lugar?)',
  )
  const ws = new Blockly.Workspace(
    new Blockly.Options({ plugins: { connectionChecker: HTMLConnectionChecker } }),
  )
  let codigo: string
  try {
    Blockly.serialization.workspaces.load({ ...estado }, ws)
    const reconstruido = buildIRFromWorkspace(ws)
    codigo = generateJS({
      behavior: splitLegacyBehavior(behaviorStatements(reconstruido)),
      lifecycle: 'game-3d',
    })
    assert.equal(
      codigo,
      generateJS({ behavior: splitLegacyBehavior(behaviorStatements(ir)), lifecycle: 'game-3d' }),
    )
  } finally {
    ws.dispose()
  }
  // A prova (e2e) lê a cena e o herói pela ponte de ensaio, que precisa morar DENTRO do programa
  // (o código roda no `runProject`); a versão da galeria não leva isso.
  const irDoEnsaio = parseProjectFilesFromParts({
    html: [{ type: 'canvas', id: 'tela', width: 960, height: 600 }] as never,
    cssSource: '',
    jsSource: `${fonte}\nwindow.__qaJogoE = { cena, heroi };`,
  }).ir
  const ensaio = generateJS({
    behavior: splitLegacyBehavior(behaviorStatements(irDoEnsaio)),
    lifecycle: 'game-3d',
  })
  assert.ok(ensaio.includes('window.__qaJogoE'), 'a ponte de ensaio ficou de fora')
  const execucao: Project = {
    ...createEmptyProject('jogo-e', 'Jogo E: seis regiões'),
    mode: 'bridge',
    assets: [...plano.assets, HEROI],
    installedExtensions: [{ id: 'game-3d', version: '0.33.0', installedAt: 0 }],
    files: {
      'index.html':
        '<!doctype html><html><head></head><body><canvas id="tela" width="960" height="600"></canvas></body></html>',
      'style.css':
        'html,body{margin:0;overflow:hidden}canvas{display:block;width:100vw;height:100vh}',
      'script.js': ensaio,
    },
  }
  await gravarDocumentosDoMotor(pasta, nome, execucao)
  await writeFile(resolve(pasta, `${nome}.programa.js`), codigo)
  console.log(
    `Jogo E (${nome}): ${pacote.cena.nos.length} nós, ${pacote.cena.regioes?.length ?? 0} regiões, ${plano.assets.length} materiais.`,
  )
}
await prepararVendors(pasta)
console.log(`Jogo E: seis regiões, gravado em ${pasta}.`)
