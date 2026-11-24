import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'
import { aplicarCorPelaOficina } from './ensaiar-cores.mjs'

const raiz = resolve(import.meta.dirname, '../../../..')
const saida = resolve(process.argv[2] ?? 'output/cenarios-reforma/lote3-texturas')
const catalogo = JSON.parse(
  readFileSync(resolve(raiz, 'output/molda-cenarios/acervo/catalogo.json'), 'utf8'),
).modelos
const modelos = ['poco_manivela_baixa.209f7e2a54ed.glb', 'morada_banco.a3bf1765ed72.glb'].map(
  (a) => {
    const m = catalogo.find((m) => m.arquivo === a)
    assert.ok(m, `Modelo local ausente: ${a}`)
    return m
  },
)
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
const resultados = []
let paginaAtual
const modulo = `/@fs/${resolve(raiz, 'packages/molda-cenarios-core/src/v2/index.ts').replaceAll('\\', '/')}`
try {
  for (const [tema, largura] of [
    ['light', 1440],
    ['dark', 1440],
    ['dark', 390],
  ]) {
    const contexto = await navegador.newContext({
      viewport: { width: largura, height: 900 },
      hasTouch: largura === 390,
      ...(largura === 1440 && tema === 'light'
        ? { recordVideo: { dir: resolve(saida, 'movimento'), size: { width: 1280, height: 800 } } }
        : {}),
    })
    const pagina = await contexto.newPage()
    paginaAtual = pagina
    const erros = []
    pagina.on('pageerror', (e) => erros.push(e.message))
    pagina.on('console', (m) => {
      if (m.type() === 'error') erros.push(m.text())
    })
    await pagina.goto(`http://127.0.0.1:4541/?vazio=1&tema=${tema}`)
    await pagina.waitForFunction(() => window.__cenarios)
    const c = await pagina.evaluate(
      async ({ modelos, modulo }) => {
        const core = await import(modulo),
          host = window.__cenarios.host
        const bib = await host.criarBiblioteca('conta', { nome: 'Acabamentos', licenca: 'propria' })
        const tela = document.createElement('canvas')
        tela.width = tela.height = 64
        const ctx = tela.getContext('2d')
        const miniatura = await new Promise((r) => tela.toBlob(r, 'image/png'))
        for (const m of modelos) {
          const resposta = await fetch(`/acervo/${encodeURIComponent(m.arquivo)}`)
          if (!resposta.ok) throw Error('GLB real ausente no acervo local')
          await host.importarModelos(bib.id, [
            {
              nome: m.nome,
              pasta: '',
              etiquetas: [],
              conteudo: new Uint8Array(await resposta.arrayBuffer()),
              digest: m.digest,
              miniatura,
              min: m.min,
              max: m.max,
              triangulos: m.triangulos,
            },
          ])
        }
        for (let i = 1; i <= 27; i++) {
          ctx.fillStyle = '#fff3cd'
          ctx.fillRect(0, 0, 64, 64)
          ctx.fillStyle = '#5380b5'
          ctx.fillRect(0, 0, 32, 32)
          ctx.fillRect(32, 32, 32, 32)
          // Conteúdos distintos para testar paginação e seleção sem deduplicação acidental.
          ctx.fillStyle = `rgb(${i},0,0)`
          ctx.fillRect(0, 0, 1, 1)
          const conteudo = await new Promise((r) => tela.toBlob(r, 'image/png'))
          await host.importarTexturas(bib.id, [
            {
              nome: `Acabamento ${String(i).padStart(2, '0')}`,
              pasta: '',
              etiquetas: [],
              largura: 64,
              altura: 64,
              repeticaoMetros: 2,
              digest: await core.digestDosBytes(new Uint8Array(await conteudo.arrayBuffer())),
              conteudo,
            },
          ])
        }
        const mundo = await host.criarMundo('conta', 'Ensaio de texturas')
        await host.editarMundo(mundo.id, { bibliotecas: [bib.id] })
        const resumo = await host.criarCenario(mundo.id, 'Materiais físicos')
        const aberto = await host.abrirCenario(resumo.id)
        const formas = [
          {
            id: 'rampa',
            nome: 'Rampa inclinada',
            tipo: 'rampa',
            largura: 4,
            altura: 2,
            comprimento: 5,
          },
          {
            id: 'caixa',
            nome: 'Caixa de referência',
            tipo: 'caixa',
            largura: 3,
            altura: 2,
            comprimento: 3,
          },
        ]
        const comandos = formas.flatMap((forma, i) => [
          { tipo: 'forma.definir', forma },
          {
            tipo: 'instancia.criar',
            instancia: {
              id: `o-${i}`,
              nome: forma.nome,
              modelo: forma.id,
              grupo: null,
              oculto: false,
              bloqueado: false,
              colisao: 'malha',
              apoio: { tipo: 'terreno', referencia: 'volume', deslocamento: 0, inclinar: false },
              transformacao: {
                posicao: { x: i ? 4 : -4, y: 0, z: 0 },
                rotacao: { x: 0, y: 0, z: 0 },
                escala: { x: 1, y: 1, z: 1 },
              },
            },
          },
        ])
        await host.editarCenario(resumo.id, aberto.revisao, comandos, crypto.randomUUID())
        return { id: resumo.id, biblioteca: bib.id }
      },
      { modelos, modulo },
    )
    const ler = () =>
      pagina.evaluate(async (id) => (await window.__cenarios.host.abrirCenario(id)).documento, c.id)
    const guardado = () => pagina.getByText('Guardado', { exact: true }).waitFor()
    const painel = async (abrir) => {
      const botao = pagina.getByRole('button', {
        name: abrir ? 'Abrir o painel' : 'Recolher o painel',
        exact: true,
      })
      if (await botao.count()) await botao.click()
    }
    const pronta = async () => {
      await pagina.getByText(/^Carregando \d+ texturas?…$/).waitFor({ state: 'hidden' })
      await pagina.waitForFunction(() => {
        const t = document.querySelector('.mcn-orcamento')?.textContent
        return t && !t.includes('chegando')
      })
      assert.equal(
        await pagina
          .getByRole('button', { name: 'Tentar texturas novamente', exact: true })
          .count(),
        0,
      )
    }
    const espaco = pagina.getByRole('combobox', { name: 'De quem são', exact: true })
    await espaco.selectOption('equipe')
    await espaco.selectOption('conta')
    await pagina.getByRole('button', { name: 'Abrir Ensaio de texturas', exact: true }).click()
    await pagina.getByRole('button', { name: 'Abrir Materiais físicos', exact: true }).click()
    await pagina
      .getByRole('button', { name: `Pôr ${modelos[0].nome} no cenário`, exact: true })
      .click()
    await guardado()
    await painel(true)
    const x = pagina
      .locator('aside.mcn-painel')
      .getByRole('spinbutton', { name: 'X', exact: true })
      .first()
    await x.fill('0')
    await x.press('Tab')
    const z = pagina
      .locator('aside.mcn-painel')
      .getByRole('spinbutton', { name: 'Z', exact: true })
      .first()
    await z.fill('4')
    await z.press('Tab')
    await guardado()
    await pagina.getByRole('button', { name: 'Espelhar X', exact: true }).click()
    const antes = await ler()
    await pagina.getByRole('button', { name: 'Escolher textura', exact: true }).click()
    await pagina.getByRole('button', { name: 'Cancelar escolha de textura', exact: true }).click()
    assert.deepEqual(await ler(), antes)
    await pagina.evaluate(() => {
      const host = window.__cenarios.host,
        listar = host.listarTexturas
      host.listarTexturas = async () => {
        host.listarTexturas = listar
        throw Error('Falha de rede no ensaio')
      }
    })
    await pagina.getByRole('button', { name: 'Escolher textura', exact: true }).click()
    await pagina.getByRole('button', { name: 'Tentar carregar texturas', exact: true }).click()
    const lista = pagina.getByRole('list', { name: 'Texturas disponíveis', exact: true })
    await lista.waitFor()
    assert.equal(await lista.getByRole('button').count(), 24)
    await pagina.getByRole('button', { name: 'Mais texturas', exact: true }).click()
    await pagina
      .getByRole('button', { name: 'Escolher textura Acabamento 27', exact: true })
      .waitFor()
    assert.equal(await lista.getByRole('button').count(), 27)
    await pagina.getByLabel('Buscar texturas', { exact: true }).fill('Acabamento 27')
    await pagina.waitForFunction(
      () => document.querySelector('[aria-label="Texturas disponíveis"]')?.children.length === 1,
    )
    await pagina.screenshot({ path: resolve(saida, `escolha-${tema}-${largura}.png`) })
    await pagina
      .getByRole('button', { name: 'Escolher textura Acabamento 27', exact: true })
      .click()
    assert.deepEqual(await ler(), antes)
    const aplicar = pagina.getByRole('button', { name: 'Aplicar textura', exact: true })
    await aplicar.click()
    await guardado()
    await pronta()
    const texturizado = await ler()
    assert.ok(texturizado.instancias[2].aparencia.textura)
    await pagina.getByRole('button', { name: 'Desfazer', exact: true }).click()
    await guardado()
    assert.deepEqual(await ler(), antes)
    await pagina.getByRole('button', { name: 'Refazer', exact: true }).click()
    await guardado()
    await pronta()
    assert.deepEqual(await ler(), texturizado)
    await pagina.getByRole('checkbox', { name: 'Manter a proporção', exact: true }).uncheck()
    for (const [eixo, valor] of [
      ['X', 1.5],
      ['Z', 0.8],
    ]) {
      const escala = pagina
        .locator('aside.mcn-painel')
        .getByRole('spinbutton', { name: eixo, exact: true })
        .nth(1)
      await escala.fill(String(valor))
      await escala.press('Tab')
    }
    const giro = pagina.getByRole('spinbutton', { name: 'Giro', exact: true })
    await giro.fill('30')
    await giro.press('Tab')
    await guardado()
    await pronta()
    assert.equal((await ler()).instancias[2].transformacao.escala.x, 1.5)
    assert.equal((await ler()).instancias[2].transformacao.escala.z, 0.8)
    // Tonalidade e espelho permanecem independentes do acabamento.
    await aplicarCorPelaOficina(pagina, ler, '#aaddff')
    const colorido = await ler()
    assert.deepEqual(
      colorido.instancias[2].aparencia.textura,
      texturizado.instancias[2].aparencia.textura,
    )
    assert.equal(colorido.instancias[2].espelho.x, true)
    const medida = pagina.getByRole('spinbutton', { name: 'Repetição da textura (m)', exact: true })
    await medida.fill('0')
    assert.equal(await aplicar.isDisabled(), true)
    await medida.fill('1')
    await aplicar.click()
    await guardado()
    await pronta()
    assert.equal((await ler()).instancias[2].aparencia.textura.repeticaoMetros, 1)
    await pagina.getByRole('button', { name: 'Trocar modelo', exact: true }).click()
    await pagina
      .getByRole('button', { name: `Pôr ${modelos[1].nome} no cenário`, exact: true })
      .click()
    await guardado()
    await pronta()
    await painel(true)
    assert.equal((await ler()).instancias[2].aparencia.textura.repeticaoMetros, 1)
    await pagina.getByRole('button', { name: 'Restaurar textura original', exact: true }).click()
    await guardado()
    assert.deepEqual((await ler()).instancias[2].aparencia, { cor: '#aaddff' })
    await pagina.getByRole('button', { name: 'Desfazer', exact: true }).click()
    await guardado()
    await pronta()
    await painel(false)
    await pagina.getByRole('button', { name: 'Livre', exact: true }).click()
    await pagina.keyboard.press('Control+a')
    await pagina.keyboard.press('f')
    await pagina.screenshot({ path: resolve(saida, `antes-conjunto-${tema}-${largura}.png`) })
    await painel(true)
    await pagina.getByRole('button', { name: 'Escolher textura', exact: true }).click()
    await pagina
      .getByRole('button', { name: 'Escolher textura Acabamento 01', exact: true })
      .click()
    await aplicar.click()
    await guardado()
    await pronta()
    const conjunto = await ler()
    assert.ok(conjunto.instancias.every((o) => o.aparencia?.textura))
    assert.equal(new Set(conjunto.instancias.map((o) => o.aparencia.textura.id)).size, 1)
    const recursos = []
    for (let ciclo = 0; ciclo < 3; ciclo++) {
      await pagina.getByRole('button', { name: 'Restaurar textura original', exact: true }).click()
      await guardado()
      await pronta()
      await pagina.getByRole('button', { name: 'Desfazer', exact: true }).click()
      await guardado()
      await pronta()
      await pagina.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      )
      const medicao = await pagina.locator('.mcn-orcamento').getAttribute('title')
      recursos.push(medicao)
      assert.deepEqual(await ler(), conjunto)
    }
    assert.equal(
      new Set(recursos).size,
      1,
      'Recursos GPU estabilizam após restaurar/reaplicar acabamento',
    )
    await pagina
      .getByRole('button', { name: 'Aplicar textura', exact: true })
      .scrollIntoViewIfNeeded()
    await pagina.screenshot({ path: resolve(saida, `painel-${tema}-${largura}.png`) })
    await painel(false)
    await pagina.screenshot({ path: resolve(saida, `aplicado-conjunto-${tema}-${largura}.png`) })
    // Órbita em movimento expõe o shader em diferentes enquadramentos, além das capturas.
    const tela = await pagina.locator('canvas.mcn-palco-tela').boundingBox()
    await pagina.mouse.move(tela.x + tela.width * 0.5, tela.y + tela.height * 0.55)
    await pagina.mouse.down({ button: 'right' })
    await pagina.mouse.move(tela.x + tela.width * 0.6, tela.y + tela.height * 0.5, { steps: 20 })
    await pagina.mouse.up({ button: 'right' })
    await pagina.screenshot({ path: resolve(saida, `depois-conjunto-${tema}-${largura}.png`) })
    const salvo = await ler()
    await pagina.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
    // O catálogo pode ser removido sem apagar recursos ainda fixados no cenário/histórico.
    await pagina.evaluate(async (bib) => window.__cenarios.host.apagarBiblioteca(bib), c.biblioteca)
    await pagina.evaluate(() => {
      const host = window.__cenarios.host,
        leitura = host.conteudoDaTextura
      host.conteudoDaTextura = async () => {
        host.conteudoDaTextura = leitura
        return new Uint8Array([1, 2, 3]).buffer
      }
    })
    await pagina.getByRole('button', { name: 'Abrir Materiais físicos', exact: true }).click()
    await pagina.getByRole('button', { name: 'Tentar texturas novamente', exact: true }).click()
    await pronta()
    assert.deepEqual(await ler(), salvo)
    await pagina.screenshot({ path: resolve(saida, `reentrada-${tema}-${largura}.png`) })
    assert.deepEqual(erros, [])
    assert.ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    resultados.push({
      tema,
      largura,
      objetos: salvo.instancias.length,
      cancelamento: true,
      paginacao: 27,
      busca: true,
      glbReal: true,
      formas: true,
      espelho: true,
      tonalidade: true,
      repeticao: true,
      escalaNaoUniforme: true,
      recursos,
      troca: true,
      restaurar: true,
      desfazer: true,
      refazer: true,
      reentradaSemBiblioteca: true,
      erroVisivelERetentativa: true,
      retentativaDaLista: true,
      erros,
    })
    await contexto.close()
  }
  writeFileSync(resolve(saida, 'resultado.json'), `${JSON.stringify(resultados, null, 2)}\n`)
  console.log(JSON.stringify(resultados))
} catch (e) {
  if (paginaAtual && !paginaAtual.isClosed()) {
    await paginaAtual.screenshot({ path: resolve(saida, 'falha.png') })
    writeFileSync(
      resolve(saida, 'falha.json'),
      JSON.stringify(
        { erro: String(e), texto: await paginaAtual.locator('body').innerText() },
        null,
        2,
      ),
    )
  }
  throw e
} finally {
  await navegador.close()
}
