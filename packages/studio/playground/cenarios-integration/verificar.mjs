import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { montarCenaDeCompilacaoDoEnsaio } from '../../../molda-cenarios/playground/oficina/fixture-compilacao.mjs'

const raiz = resolve(import.meta.dirname, '../../../..'),
  { chromium } = createRequire(resolve(raiz, 'packages/molda-cenarios/package.json'))(
    'playwright-core',
  ),
  base = process.env.CENARIOS_STUDIO_QA_BASE ?? 'http://127.0.0.1:5413',
  saida = resolve(raiz, 'output/cenarios-reforma/lote8-studio-galeria'),
  fixture = JSON.parse(
    readFileSync(
      resolve(raiz, 'output/cenarios-reforma/lote8-integracao-terreno-juncao/resultado.json'),
      'utf8',
    ),
  ),
  bytes = new Map(
    fixture.recursosDeAutoria.map((r) => [
      r.digest,
      {
        bytes: Buffer.from(r.base64, 'base64'),
        mime:
          r.tipo === 'modelo'
            ? 'model/gltf-binary'
            : r.tipo === 'textura'
              ? 'image/png'
              : 'application/octet-stream',
      },
    ]),
  ),
  modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`,
  pessoa = '11111111-1111-4111-8111-111111111111',
  resultados = [],
  casos =
    process.env.CENARIOS_QA_LAYOUTS === 'todos'
      ? [
          [1440, 900],
          [1366, 768],
          [1024, 768],
          [390, 844],
        ].flatMap(([width, height], i) =>
          ['light', 'dark'].map((tema, j) => ({
            width,
            height,
            tema,
            python: i % 2 === 1,
            pro: j === 1,
          })),
        )
      : [
          {
            width: 1440,
            height: 900,
            tema: 'light',
            python: process.env.CENARIOS_QA_PYTHON === '1',
            pro: process.env.CENARIOS_QA_PRO === '1',
          },
        ],
  browser = await chromium.launch({ channel: 'chrome', headless: true })
mkdirSync(saida, { recursive: true })
try {
  for (const [indice, caso] of casos.entries()) {
    const nome = `${caso.python ? 'python' : 'js'}-${caso.pro ? 'pro' : 'classic'}-${caso.width}-${caso.height}-${caso.tema}`,
      context = await browser.newContext({
        viewport: { width: caso.width, height: caso.height },
        hasTouch: caso.width < 500,
        ...(indice === 0
          ? { recordVideo: { dir: resolve(saida, 'videos'), size: { width: 1280, height: 800 } } }
          : {}),
      }),
      pagina = await context.newPage(),
      erros = [],
      pedidos = []
    pagina.setDefaultTimeout(30000)
    pagina.on('pageerror', (e) => erros.push(e.message))
    pagina.on('console', (m) => {
      if (m.type() === 'error') console.error(`${nome}: ${m.text().slice(0, 600)}`)
    })
    await pagina.route('**/api/cenarios/**', async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        headers = req.headers(),
        valido =
          headers['x-sz-viewer'] === pessoa && headers['x-sz-session'] === 'cenarios-qa-local'
      pedidos.push({
        metodo: req.method(),
        caminho: url.pathname,
        pessoa: headers['x-sz-viewer'],
        sessaoCorreta: valido,
      })
      if (!valido)
        return route.fulfill({
          status: 401,
          json: { error: { message: 'Identidade de ensaio incorreta' } },
        })
      if (url.searchParams.get('como') === 'endereco') {
        const digest = url.pathname.split('/').at(-1)
        return route.fulfill(
          bytes.has(digest)
            ? { json: { url: `${base}/qa-cenario/${digest}?ensaio=local` } }
            : { status: 404, json: { error: { message: 'Recurso fora do ensaio' } } },
        )
      }
      try {
        const dados = await pagina.evaluate(
          async ({ caminho, metodo, corpo }) => {
            const h = window.__cenarios.host
            if (caminho.endsWith('/acesso')) return { aberto: true }
            if (caminho.endsWith('/espacos')) return h.espacos()
            const mundo = /\/espacos\/([^/]+)\/mundos$/.exec(caminho)
            if (mundo) return h.listarMundos(mundo[1])
            const cenas = /\/mundos\/([^/]+)\/cenarios$/.exec(caminho)
            if (cenas) return h.listarCenarios(cenas[1])
            const exportacao = /\/cenarios\/([^/]+)\/exportacao$/.exec(caminho)
            if (exportacao && metodo === 'POST')
              return h.prepararExportacao(exportacao[1], corpo.revisaoEsperada)
            throw Error(`Rota de ensaio não mapeada: ${caminho}`)
          },
          {
            caminho: url.pathname,
            metodo: req.method(),
            corpo: req.method() === 'POST' ? req.postDataJSON() : null,
          },
        )
        await route.fulfill({ json: dados })
      } catch (e) {
        await route.fulfill({ status: 409, json: { error: { message: String(e) } } })
      }
    })
    await pagina.route('**/qa-cenario/**', async (route) => {
      const url = new URL(route.request().url()),
        recurso = bytes.get(url.pathname.split('/').at(-1))
      if (!recurso || url.searchParams.get('ensaio') !== 'local')
        return route.fulfill({ status: 404 })
      await route.fulfill({ contentType: recurso.mime, body: recurso.bytes })
    })
    const abrir = async () => {
      if (caso.pro) {
        if (caso.width < 500)
          await pagina.getByRole('button', { name: 'Arquivos', exact: true }).click()
        await pagina.getByRole('button', { name: 'Materiais', exact: true }).click()
        await pagina.getByRole('tab', { name: /^3D/ }).click()
      } else {
        await pagina.getByRole('button', { name: 'Mais opções', exact: true }).click()
        await pagina.getByRole('menuitem', { name: 'Modelos 3D', exact: true }).click()
      }
      await pagina.getByRole('button', { name: /Trazer do Molda/ }).click()
      const dialogo = pagina.getByRole('dialog', { name: 'Trazer do Molda', exact: true })
      await dialogo.getByRole('button', { name: 'Cenários', exact: true }).click()
      return dialogo
    }
    try {
      console.log(`${nome}: abrindo o Estúdio`)
      await pagina.goto(
        `${base}/?tema=${caso.tema}${caso.python ? '&python=1' : ''}${caso.pro ? '&pro=1' : ''}`,
      )
      await pagina.waitForFunction(() => window.__qaStudio?.projeto() && window.__cenarios)
      console.log(`${nome}: preparando a fonte real no host de ensaio`)
      const ids = await pagina.evaluate(montarCenaDeCompilacaoDoEnsaio, {
          core: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
          motor: modulo('packages/molda-cenarios-motor/src/index.ts'),
          autoria: fixture.autoria,
          recursos: fixture.recursosDeAutoria,
        }),
        antes = await pagina.evaluate(() => {
          const p = window.__qaStudio.projeto()
          return { files: p.files, tree: p.tree, installedExtensions: p.installedExtensions }
        }),
        dialogo = await abrir()
      console.log(`${nome}: galeria aberta`)
      const card = dialogo.getByRole('listitem').filter({ hasText: ids.nome })
      await card.waitFor({ state: 'visible' })
      await pagina.screenshot({ path: resolve(saida, `${nome}-antes.png`) })
      const inicio = Date.now(),
        trazer = card.getByRole('button', { name: 'Adicionar ao projeto', exact: true })
      if (caso.width < 500) await trazer.tap()
      else await trazer.click()
      await dialogo
        .getByText(`Cenário “${ids.nome}” adicionado ao projeto.`, { exact: true })
        .waitFor({ timeout: 60000 })
      // The public host callback emits on autosave/flush, after the store commit.
      await pagina.waitForFunction(() =>
        window.__qaStudio.projeto()?.assets?.some((a) => a.kind === 'scene3d'),
      )
      const projeto = await pagina.evaluate(() => window.__qaStudio.projeto()),
        cena = projeto.assets.find((a) => a.kind === 'scene3d')
      assert.ok(cena)
      assert.deepEqual(projeto.installedExtensions, antes.installedExtensions)
      if (caso.pro) {
        for (const [path, node] of Object.entries(antes.tree))
          assert.deepEqual(projeto.tree[path], node)
      } else
        for (const [path, code] of Object.entries(antes.files))
          assert.equal(projeto.files[path], code)
      assert.ok(!projeto.assets.some((a) => a.libId?.startsWith('personal:')))
      if (caso.python) assert.ok(cena.cena3dPython?.modulo)
      assert.ok(pedidos.length > 0 && pedidos.every((p) => p.sessaoCorreta))
      const envelope = JSON.parse(
        Buffer.from(cena.dataUrl.split(',')[1], 'base64').toString('utf8'),
      )
      assert.equal(envelope.cena.aguas.length, 2)
      assert.equal(envelope.cena.caminhos.length, 3)
      assert.ok(envelope.cena.terreno)
      assert.ok(envelope.cena.nos.length > 0)
      const transbordou = await dialogo.evaluate((e) => e.scrollWidth > e.clientWidth + 2)
      assert.equal(transbordou, false)
      await pagina.screenshot({ path: resolve(saida, `${nome}-depois.png`) })
      writeFileSync(resolve(saida, `${nome}.project.json`), JSON.stringify(projeto))
      await pagina.evaluate(() => window.__qaStudio.guardar())
      await pagina.reload()
      await pagina.waitForFunction(() =>
        window.__qaStudio?.projeto()?.assets?.some((a) => a.kind === 'scene3d'),
      )
      const reaberto = await pagina.evaluate(() => window.__qaStudio.projeto())
      assert.deepEqual(reaberto.assets, projeto.assets)
      assert.deepEqual(
        reaberto.kind === 'pro' ? reaberto.tree : reaberto.files,
        projeto.kind === 'pro' ? projeto.tree : projeto.files,
      )
      assert.deepEqual(erros, [])
      resultados.push({
        ...caso,
        nome,
        assets: projeto.assets.length,
        nos: envelope.cena.nos.length,
        fonte: envelope.cena.fonte,
        bytesDoEnvelope: Buffer.byteLength(JSON.stringify(envelope)),
        tempoLocalMs: Date.now() - inicio,
        arquivosPreservados: true,
        reabertura: true,
        pedidos,
        erros,
        nota: 'Hook e cliente HTTP reais; servidor de dados em memória com identidade fixa de ensaio. Não é conta real ou validação de implantação. Tempo inclui gravação/reabertura, não é benchmark de dispositivo.',
      })
      console.log(
        `${nome}: cena, fonte preservada, licenças, identidade HTTP e reabertura conferidos.`,
      )
    } catch (e) {
      await pagina.screenshot({ path: resolve(saida, `${nome}-falha.png`) })
      writeFileSync(
        resolve(saida, `${nome}-falha.json`),
        JSON.stringify(
          { erro: String(e), erros, pedidos, texto: await pagina.locator('body').innerText() },
          null,
          2,
        ),
      )
      throw e
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
  writeFileSync(resolve(saida, 'resultados.json'), JSON.stringify(resultados, null, 2))
}
