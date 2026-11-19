import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const projetoImportado = process.env.CENARIOS_QA_PROJECT_FILE
    ? JSON.parse(readFileSync(process.env.CENARIOS_QA_PROJECT_FILE, 'utf8'))
    : null,
  mapaDeAssets = process.env.CENARIOS_QA_RESOURCE_MAP === '1',
  raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote8-raylib'),
  pasta = resolve(saida, 'pacote/extraido'),
  cena = projetoImportado
    ? JSON.parse(
        Buffer.from(
          projetoImportado.assets.find((a) => a.kind === 'scene3d').dataUrl.split(',')[1],
          'base64',
        ).toString('utf8'),
      ).cena
    : JSON.parse(readFileSync(resolve(pasta, 'cenario.json'), 'utf8')),
  bytes = (nome) => readFileSync(resolve(pasta, nome)),
  mapa = Object.fromEntries(
    cena.arquivos.map((a) => [
      a.caminho,
      `assets/${a.digest}${a.mime === 'application/octet-stream' ? `-${a.papel}` : ''}.${a.caminho.split('.').at(-1)}`,
    ]),
  ),
  binarios = (projetoImportado || mapaDeAssets ? [] : cena.arquivos)
    .filter((a) => a.mime === 'application/octet-stream')
    .map((a) => [a.caminho, bytes(a.caminho).toString('base64')]),
  assets = projetoImportado
    ? []
    : [
        ...new Map(
          cena.arquivos
            .filter((a) => mapaDeAssets || a.mime !== 'application/octet-stream')
            .map((a, i) => ({
              id: `recurso-${i}`,
              name: `recurso-${i}`,
              kind:
                a.mime === 'model/gltf-binary'
                  ? 'model3d'
                  : a.mime === 'application/octet-stream'
                    ? 'scene3d-data'
                    : 'image',
              source: 'upload',
              proPath: mapaDeAssets ? mapa[a.caminho] : a.caminho,
              ...(a.mime === 'application/octet-stream' ? { dado3d: { papel: a.papel } } : {}),
              ...(a.mime === 'model/gltf-binary' || a.mime === 'application/octet-stream'
                ? { originalFileName: a.caminho.split('/').at(-1) }
                : {}),
              dataUrl: `data:${a.mime};base64,${bytes(a.caminho).toString('base64')}`,
            }))
            .map((a) => [a.proPath, a]),
        ).values(),
      ],
  script = `import json, base64
from pathlib import Path
import pyray as p
import cenario
assert not Path(cenario.__file__).resolve().is_relative_to(Path.cwd())
print('mcn-oficial', cenario.__file__)
for nome, conteudo in ${JSON.stringify(binarios)}:
    caminho = Path(nome)
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_bytes(base64.b64decode(conteudo))
p.init_window(640, 420, 'Cenário compilado no Estúdio')
dados = json.loads(Path('cenario.json').read_text())
mapa = json.loads(${JSON.stringify(JSON.stringify(mapa))})
if ${mapaDeAssets ? 'True' : 'False'}:
    assert all(not Path(a['caminho']).exists() for a in dados['arquivos'])
    lugar = cenario.Cenario(Path.cwd(), dados, arquivos=mapa)
    print('mcn-mapa-assets', len(mapa))
else:
    lugar = cenario.carregar('cenario.json')
camera = p.Camera3D(p.Vector3(34, 29, 42), p.Vector3(2, 1, 0), p.Vector3(0, 1, 0), 50, p.CAMERA_PERSPECTIVE)
print('mcn-carregado', lugar.dados['fonte']['digest'], len(lugar.dados['nos']), lugar.tem_chao(8, 8))
for no in lugar.dados['nos']:
    if no.get('preservarHierarquia') and lugar.animacoes(no['id']):
        print('mcn-clipes', len(lugar.animacoes(no['id'])))
        lugar.animar(no['id'], 0, 1.5)
for quadro in range(8):
    p.begin_drawing()
    p.clear_background(p.Color(163, 205, 233, 255))
    p.begin_mode_3d(camera)
    lugar.desenhar()
    p.end_mode_3d()
    p.end_drawing()
input('mcn-pronto-captura: ')
lugar.descartar()
lugar.descartar()
print('mcn-descartado')
p.close_window()
`,
  browser = await chromium.launch({ channel: 'chrome', headless: true }),
  contexto = await browser.newContext({ viewport: { width: 1000, height: 760 } }),
  pagina = await contexto.newPage(),
  erros = [],
  resultados = []
pagina.on('pageerror', (e) => erros.push(e.message))
const base = process.env.CENARIOS_QA_PYTHON_BASE ?? 'http://127.0.0.1:5317',
  sufixo = projetoImportado
    ? `-importado-${projetoImportado.kind}`
    : mapaDeAssets
      ? '-mapa-assets'
      : ''
try {
  for (const autoral of [false, true]) {
    await pagina.route('**/project/cenario-molda-qa', async (route) => {
      const resposta = await route.fetch({ url: `${base}/project/raylibSceneModels3d` }),
        baseProjeto = await resposta.json(),
        projeto = !autoral && projetoImportado ? structuredClone(projetoImportado) : baseProjeto
      assert.equal(baseProjeto.kind, 'pro')
      if (!autoral && projetoImportado) {
        projeto.runtime = baseProjeto.runtime
        projeto.python.dependencyLock.runtimeManifestSha256 = baseProjeto.runtime.manifestSha256
      }
      projeto.name = 'Cenário compilado · prova local'
      delete projeto.coverAssetName
      if (autoral || !projetoImportado) projeto.assets = autoral ? [] : assets
      projeto.ir = null
      projeto.blocksState = null
      if (autoral || !projetoImportado)
        projeto.tree = {
          src: { kind: 'dir' },
          'src/main.py': {
            kind: 'file',
            content: autoral
              ? "import cenario\nassert cenario.IDENTIDADE == 'autoral'\nprint('mcn-autoral-preservado')\n"
              : script,
          },
          ...(!autoral
            ? { 'cenario.json': { kind: 'file', content: JSON.stringify(cena) } }
            : { 'src/cenario.py': { kind: 'file', content: "IDENTIDADE = 'autoral'\n" } }),
        }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(projeto),
      })
    })
    await pagina.goto(`${base}/provider`)
    await pagina.waitForFunction(() => globalThis.providerProbe)
    await pagina.evaluate(() => globalThis.providerProbe.prepare('game', 'cenario-molda-qa'))
    const pronto = await pagina.evaluate(() => globalThis.providerProbe.read('game'))
    assert.equal(pronto.status, 'ready', JSON.stringify(pronto))
    await pagina.locator('iframe').evaluate((f) => {
      f.style.cssText = 'width:800px;height:600px;border:0'
    })
    await pagina.evaluate(() => globalThis.providerProbe.run('game'))
    if (!autoral) {
      await pagina.waitForFunction(
        () => {
          const r = globalThis.providerProbe.read('game')
          return (
            (r.status === 'waiting-input' && r.events.some((e) => e.type === 'input-request')) ||
            r.status === 'failed' ||
            r.status === 'completed'
          )
        },
        null,
        { timeout: 60000 },
      )
      const r = await pagina.evaluate(() => globalThis.providerProbe.read('game'))
      assert.equal(r.status, 'waiting-input', JSON.stringify(r))
      const pedido = r.events.findLast((e) => e.type === 'input-request')
      assert.ok(pedido)
      assert.ok(r.events.some((e) => e.type === 'console' && e.text.includes('mcn-pronto-captura')))
      const frame = pagina.frames().find((f) => f.url().includes('/frame.html'))
      assert.ok(frame)
      const path = resolve(saida, `pyodide-cenario${sufixo}.png`)
      await frame.locator('canvas').screenshot({ path })
      const png = readFileSync(path)
      assert.equal(png.readUInt32BE(16), 640)
      assert.equal(png.readUInt32BE(20), 420)
      await pagina.evaluate(
        (requestId) =>
          globalThis.providerProbe.input('game', requestId, { kind: 'line', text: 'continuar' }),
        pedido.requestId,
      )
    }
    const fim = autoral ? 'mcn-autoral-preservado' : 'mcn-descartado'
    await pagina.waitForFunction(
      (s) => {
        const r = globalThis.providerProbe.read('game'),
          texto = r.events
            .filter((e) => e.type === 'console')
            .map((e) => e.text)
            .join('')
        return (texto.includes(s) && r.status === 'completed') || r.status === 'failed'
      },
      fim,
      { timeout: 60000 },
    )
    const r = await pagina.evaluate(() => globalThis.providerProbe.read('game')),
      stdout = r.events
        .filter((e) => e.type === 'console')
        .map((e) => e.text)
        .join('')
    assert.equal(r.status, 'completed', JSON.stringify(r))
    assert.ok(stdout.includes(fim), stdout)
    if (!autoral) {
      assert.ok(stdout.includes(cena.fonte.digest), stdout)
      assert.ok(stdout.includes('mcn-clipes 4'), stdout)
      if (mapaDeAssets && !projetoImportado) assert.ok(stdout.includes('mcn-mapa-assets'), stdout)
    }
    resultados.push({ autoral, status: r.status, stdout })
    await pagina.evaluate(() => globalThis.providerProbe.dispose('game'))
    await pagina.unroute('**/project/cenario-molda-qa')
  }
  assert.deepEqual(erros, [])
  writeFileSync(
    resolve(saida, `pyodide${sufixo}.json`),
    JSON.stringify(
      {
        resultados,
        erros,
        mapaDeAssets,
        projetoImportado: projetoImportado?.kind ?? null,
        nota: projetoImportado
          ? 'Projeto importado, reaberto e exportado. Executa o módulo Python gerado com os assets do projeto; a origem da importação consta no recibo produtor. A fonte esperada vem do manifesto do próprio projeto.'
          : mapaDeAssets
            ? 'Bytes reais materializados pelo pipeline de assets Python, sem escrever binários pelo programa. Manifesto lógico preservado e resolução física pelo auxiliar oficial. Não substitui o fluxo Trazer do Molda, ainda pendente.'
            : 'Fixture com os bytes do pacote real e fonte oficial do runtime. Escrita de dois binários pequenos pela fixture prepara o filesystem; não substitui o fluxo Trazer do Molda, ainda pendente no recorte de importação.',
      },
      null,
      2,
    ),
  )
  console.log('Raylib/Pyodide: cena real, quatro clipes, descarte e módulo autoral conferidos.')
} catch (e) {
  await pagina.screenshot({ path: resolve(saida, 'pyodide-falha.png') }).catch(() => {})
  writeFileSync(
    resolve(saida, 'pyodide-falha.json'),
    JSON.stringify(
      {
        erro: String(e),
        erros,
        corpo: await pagina.locator('body').innerText(),
        probe: await pagina
          .evaluate(() => globalThis.providerProbe?.read('game'))
          .catch(() => null),
      },
      null,
      2,
    ),
  )
  throw e
} finally {
  await browser.close()
}
