import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..')
const fonte = resolve(
  process.argv[2] ?? resolve(raiz, 'output/cenarios-reforma/conversao-faisca/original'),
)
const saida = resolve(process.argv[3] ?? resolve(raiz, 'output/cenarios-reforma/terreno-browser'))
const documento = JSON.parse(readFileSync(resolve(fonte, 'documento.json'), 'utf8'))
const catalogo = JSON.parse(
  readFileSync(resolve(raiz, 'output/molda-cenarios/acervo/catalogo.json'), 'utf8'),
).modelos
const refs = new Set(documento.modelos.map((m) => m.id))
const modelos = catalogo.filter((m) => refs.has(m.id))
assert.equal(modelos.length, refs.size)
const digests = [...new Set(documento.base.pecas.map((p) => p.digest))]
const recursos = digests.map((digest) => ({
  digest,
  base64: readFileSync(resolve(fonte, 'recursos', `${digest}.szht`)).toString('base64'),
}))
const modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
const resultados = []
let paginaAtual
const falhas = []
try {
  for (const { tema, largura } of [
    { tema: 'light', largura: 1440 },
    { tema: 'dark', largura: 1440 },
    { tema: 'dark', largura: 390 },
  ]) {
    const pagina = await navegador.newPage({
      viewport: { width: largura, height: 900 },
      hasTouch: largura === 390,
    })
    const vista = `${tema}${largura === 390 ? '-390' : ''}`
    paginaAtual = pagina
    const erros = []
    pagina.on('pageerror', (e) => {
      erros.push(e.message)
      falhas.push(e.stack)
      console.error(e.stack)
    })
    await pagina.goto(`http://127.0.0.1:4541/?vazio=1&tema=${tema}`)
    await pagina.waitForFunction(() => window.__cenarios)
    const dados = await pagina.evaluate(
      async ({ documento, modelos, recursos, modulo }) => {
        const core = await import(modulo)
        const host = window.__cenarios.host
        const bib = await host.criarBiblioteca('conta', {
          nome: 'Acervo da conversão',
          licenca: 'propria',
        })
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 2
        const miniatura = await new Promise((r) => canvas.toBlob(r, 'image/png'))
        const publicados = new Map()
        for (const m of modelos) {
          const r = await fetch(`/acervo/${encodeURIComponent(m.arquivo)}`)
          if (!r.ok) throw new Error('Falta o modelo local de ensaio')
          const conteudo = new Uint8Array(await r.arrayBuffer())
          if ((await core.digestDosBytes(conteudo)) !== m.digest)
            throw new Error('O acervo local mudou')
          const [modelo] = await host.importarModelos(bib.id, [
            {
              nome: m.nome,
              pasta: '',
              etiquetas: [],
              conteudo,
              digest: m.digest,
              miniatura,
              min: m.min,
              max: m.max,
              triangulos: m.triangulos,
            },
          ])
          publicados.set(m.id, modelo)
        }
        const mundo = await host.criarMundo('conta', 'Faísca convertida')
        await host.editarMundo(mundo.id, { bibliotecas: [bib.id] })
        const cenario = await host.criarCenario(mundo.id, 'Conversão com relevo')
        documento.id = cenario.id
        documento.nome = 'Conversão com relevo'
        for (const m of documento.modelos) {
          const p = publicados.get(m.id)
          m.biblioteca = bib.id
          m.modelo = p.id
        }
        const arquivos = recursos.map((p) => ({
          digest: p.digest,
          conteudo: Uint8Array.from(atob(p.base64), (s) => s.charCodeAt(0)),
        }))
        const reserva = await host.guardarRecursos(cenario.id, arquivos)
        await host.editarCenario(
          cenario.id,
          0,
          [{ tipo: 'cenario.restaurar', documento }],
          'importar-faisca-01',
          reserva,
        )
        const fonte = core.criarFonteDeAlturas(
          documento.base,
          new Map(arquivos.map((r) => [r.digest, core.lerPecaDeAlturas(r.conteudo)])),
        )
        window.__terrenoQA = { mundo, cenario, fonte }
        const poço =
          [...publicados.values()].find((m) => /poço/i.test(m.nome)) ?? [...publicados.values()][0]
        return {
          mundoId: mundo.id,
          cenarioId: cenario.id,
          instancias: documento.instancias.length,
          modelo: { nome: poço.nome, min: poço.min },
        }
      },
      {
        documento: structuredClone(documento),
        modelos,
        recursos,
        modulo: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      },
    )
    const espaco = pagina.getByRole('combobox', { name: 'De quem são', exact: true })
    await espaco.selectOption('equipe')
    await espaco.selectOption('conta')
    await pagina.getByRole('button', { name: 'Abrir Faísca convertida', exact: true }).click()
    await pagina.getByRole('button', { name: 'Abrir Conversão com relevo', exact: true }).click()
    await pagina.locator('canvas.mcn-palco-tela').waitFor()
    await pagina.waitForFunction(() => !document.body.innerText.includes('Carregando o relevo'))
    await pagina.waitForFunction(
      () => {
        const t = document.querySelector('.mcn-orcamento')?.textContent
        return t && !t.includes('chegando')
      },
      undefined,
      { timeout: 30000 },
    )
    await pagina.screenshot({ path: resolve(saida, `faisca-${vista}.png`) })
    // O nome da região vem da identidade atual da oficina; a busca é pelo rótulo acessível.
    const busca = pagina.locator('.mcn-gaveta input[type="search"]')
    await busca.fill(dados.modelo.nome)
    await pagina
      .getByRole('button', { name: `Pôr ${dados.modelo.nome} no cenário`, exact: true })
      .first()
      .click()
    if (largura === 390)
      await pagina.getByRole('button', { name: 'Abrir o painel', exact: true }).click()
    const painel = pagina.locator('aside.mcn-painel')
    const altura = painel.getByLabel(/^Altura/)
    await altura.waitFor()
    const prova = await pagina.evaluate(
      async ({ id, quantidade, min }) => {
        const c = await window.__cenarios.host.abrirCenario(id)
        if (c.documento.instancias.length !== quantidade + 1)
          throw new Error('O modelo não foi colocado')
        const o = c.documento.instancias.at(-1)
        return {
          id: o.id,
          y:
            window.__terrenoQA.fonte(o.transformacao.posicao.x, o.transformacao.posicao.z) - min[1],
          revisao: c.revisao,
        }
      },
      { id: dados.cenarioId, quantidade: dados.instancias, min: dados.modelo.min },
    )
    assert.ok(Math.abs(Number(await altura.inputValue()) - prova.y) <= 0.011)
    await altura.fill(String(Math.round((prova.y + 1) * 100) / 100))
    await altura.press('Tab')
    await pagina.getByText('Guardado', { exact: true }).waitFor()
    await pagina.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
    await pagina.getByRole('button', { name: 'Abrir Conversão com relevo', exact: true }).click()
    await pagina.waitForFunction(() => !document.body.innerText.includes('Carregando o relevo'))
    const reaberto = await pagina.evaluate(async (id) => {
      const c = await window.__cenarios.host.abrirCenario(id)
      const o = c.documento.instancias.at(-1)
      return { base: c.documento.base.tipo, deslocamento: o.apoio.deslocamento, revisao: c.revisao }
    }, dados.cenarioId)
    assert.equal(reaberto.base, 'terreno')
    assert.ok(Math.abs(reaberto.deslocamento - 1) <= 0.011)
    assert.deepEqual(erros, [])
    assert.ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await pagina.screenshot({ path: resolve(saida, `reaberto-${vista}.png`) })
    resultados.push({
      tema,
      largura,
      instanciasOriginais: dados.instancias,
      pecas: digests.length,
      relevo: true,
      alturaDoPainel: prova.y,
      reaberto,
      erros,
    })
    await pagina.close()
  }
  writeFileSync(resolve(saida, 'resultado.json'), `${JSON.stringify(resultados, null, 2)}\n`)
  console.log(JSON.stringify(resultados))
} catch (e) {
  if (paginaAtual && !paginaAtual.isClosed()) {
    await paginaAtual.screenshot({ path: resolve(saida, 'falha.png') })
    writeFileSync(
      resolve(saida, 'falha.json'),
      JSON.stringify(
        { erro: String(e), falhas, texto: await paginaAtual.locator('body').innerText() },
        null,
        2,
      ),
    )
  }
  throw e
} finally {
  await navegador.close()
}
