import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const saida = resolve(process.argv[2] ?? 'output/cenarios-reforma/lote3-transferencia')
const raiz = resolve(import.meta.dirname, '../../../..')
const modelo = JSON.parse(
  readFileSync(resolve(raiz, 'output/molda-cenarios/acervo/catalogo.json'), 'utf8'),
).modelos.find((m) => m.arquivo === 'poco_manivela_baixa.209f7e2a54ed.glb')
assert.ok(modelo, 'Poço real ausente do acervo local')
const modulo = `/@fs/${resolve(raiz, 'packages/molda-cenarios-core/src/v2/index.ts').replaceAll('\\', '/')}`
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const resultados = []
let pagina
try {
  for (const [tema, largura] of [
    ['light', 1440],
    ['dark', 1440],
    ['light', 1024],
    ['dark', 390],
  ]) {
    const contexto = await browser.newContext({
      viewport: { width: largura, height: 900 },
      hasTouch: largura === 390,
      permissions: ['clipboard-read', 'clipboard-write'],
      recordVideo:
        largura === 1440 && tema === 'light'
          ? { dir: resolve(saida, 'movimento'), size: { width: 1440, height: 900 } }
          : undefined,
    })
    const p = await contexto.newPage()
    pagina = p
    const erros = []
    p.on('pageerror', (e) => erros.push(e.message))
    p.on('console', (m) => {
      if (m.type() === 'error') erros.push(m.text())
    })
    await p.goto(`http://127.0.0.1:4541/?vazio=1&tema=${tema}`)
    await p.waitForFunction(() => window.__cenarios)
    const ids = await p.evaluate(
      async ({ modelo, modulo }) => {
        const core = await import(modulo)
        const h = window.__cenarios.host,
          mundo = await h.criarMundo('conta', 'Transferência'),
          outro = await h.criarMundo('equipe', 'Outro espaço')
        const biblioteca = await h.criarBiblioteca('conta', {
          nome: 'Acervo de ensaio',
          licenca: 'propria',
        })
        const tela = document.createElement('canvas')
        tela.width = tela.height = 64
        const ctx = tela.getContext('2d')
        ctx.fillStyle = '#f7e6b6'
        ctx.fillRect(0, 0, 64, 64)
        ctx.fillStyle = '#739c76'
        ctx.fillRect(0, 0, 32, 32)
        ctx.fillRect(32, 32, 32, 32)
        const imagem = await new Promise((r) => tela.toBlob(r, 'image/png'))
        const resposta = await fetch(`/acervo/${modelo.arquivo}`)
        if (!resposta.ok) throw new Error('GLB real indisponível')
        const [m] = await h.importarModelos(biblioteca.id, [
          {
            nome: modelo.nome,
            pasta: '',
            etiquetas: [],
            conteudo: new Uint8Array(await resposta.arrayBuffer()),
            digest: modelo.digest,
            miniatura: imagem,
            min: modelo.min,
            max: modelo.max,
            triangulos: modelo.triangulos,
          },
        ])
        const digest = await core.digestDosBytes(new Uint8Array(await imagem.arrayBuffer()))
        const [t] = await h.importarTexturas(biblioteca.id, [
          {
            nome: 'Xadrez',
            pasta: '',
            etiquetas: [],
            largura: 64,
            altura: 64,
            repeticaoMetros: 1,
            digest,
            conteudo: imagem,
          },
        ])
        await h.editarMundo(mundo.id, { bibliotecas: [biblioteca.id] })
        const origem = await h.criarCenario(mundo.id, 'Origem'),
          destino = await h.criarCenario(mundo.id, 'Destino'),
          estrangeiro = await h.criarCenario(outro.id, 'Estrangeiro')
        const doc = (await h.abrirCenario(origem.id)).documento
        doc.modelos = [
          {
            id: 'poco',
            biblioteca: biblioteca.id,
            modelo: m.id,
            digest: m.digest,
            volume: {
              min: { x: m.min[0], y: m.min[1], z: m.min[2] },
              max: { x: m.max[0], y: m.max[1], z: m.max[2] },
            },
          },
        ]
        doc.texturas = [{ id: 't', biblioteca: biblioteca.id, textura: t.id, digest }]
        doc.formas = [
          { id: 'caixa', nome: 'Caixa', tipo: 'caixa', largura: 2, altura: 1, comprimento: 2 },
        ]
        doc.grupos = [
          {
            id: 'jardim',
            nome: 'Jardim',
            grupo: null,
            bloqueado: false,
            oculto: false,
            camada: 'natureza',
          },
          { id: 'vazia', nome: 'Vazia', grupo: null, bloqueado: false, oculto: false },
        ]
        doc.camadas = [{ id: 'natureza', nome: 'Natureza', bloqueado: false, oculto: false }]
        doc.instancias = [0, 1].map((i) => ({
          id: `o${i}`,
          nome: i ? 'Em cima' : 'Base',
          modelo: i ? 'caixa' : 'poco',
          grupo: 'jardim',
          bloqueado: false,
          oculto: false,
          colisao: 'caixa',
          apoio: i
            ? {
                tipo: 'objeto',
                objeto: 'o0',
                contato: {
                  x: (m.min[0] + m.max[0]) / 2,
                  y: m.max[1],
                  z: (m.min[2] + m.max[2]) / 2,
                },
                deslocamento: 0,
              }
            : { tipo: 'absoluto' },
          transformacao: {
            posicao: { x: 0, y: i ? 0 : -m.min[1], z: 0 },
            rotacao: { x: 0, y: i ? 0.25 : 0, z: 0 },
            escala: { x: 1, y: 1, z: i ? 0.5 : 1 },
          },
          espelho: { x: Boolean(i), y: false, z: false },
          aparencia: { cor: i ? '#db9e58' : '#589edb', textura: { id: 't', repeticaoMetros: 1.5 } },
        }))
        await h.editarCenario(
          origem.id,
          0,
          [{ tipo: 'cenario.restaurar', documento: doc }],
          crypto.randomUUID(),
        )
        const d = (await h.abrirCenario(destino.id)).documento
        d.formas = [{ ...doc.formas[0], largura: 3, nome: 'Outro formato' }]
        await h.editarCenario(
          destino.id,
          0,
          [{ tipo: 'cenario.restaurar', documento: d }],
          crypto.randomUUID(),
        )
        return {
          origem: origem.id,
          destino: destino.id,
          estrangeiro: estrangeiro.id,
          biblioteca: biblioteca.id,
        }
      },
      { modelo, modulo },
    )
    const espaco = p.getByRole('combobox', { name: 'De quem são', exact: true })
    await espaco.selectOption('equipe')
    await espaco.selectOption('conta')
    await p.getByRole('button', { name: 'Abrir Transferência', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Origem', exact: true }).click()
    const salvo = () => p.getByText('Guardado', { exact: true }).waitFor()
    const ler = (id = ids.origem) =>
      p.evaluate(async (id) => window.__cenarios.host.abrirCenario(id), id)
    const quantidade = async (id, n) => {
      // waitForFunction desta versão trata Promise como truthy; confere o host assíncrono até a condição real.
      await p.evaluate(
        async ({ id, n }) => {
          const limite = performance.now() + 15000
          while (
            (await window.__cenarios.host.abrirCenario(id)).documento.instancias.length !== n
          ) {
            if (performance.now() > limite) throw new Error(`O cenário não chegou a ${n} objetos`)
            await new Promise(requestAnimationFrame)
          }
        },
        { id, n },
      )
      await salvo()
    }
    const atalhar = async (tecla) => {
      await p.locator('canvas').focus()
      await p.keyboard.press(tecla)
    }
    const menu = async (acao) => {
      await p.getByRole('button', { name: 'Copiar e colar', exact: true }).click()
      await p
        .getByRole('dialog', { name: 'Copiar e colar', exact: true })
        .getByRole('button', { name: acao, exact: true })
        .click()
    }
    await salvo()
    await p.getByRole('button', { name: 'Objetos e camadas', exact: true }).click()
    await p.getByRole('button', { name: 'Escolher pasta Jardim', exact: true }).click()
    const antes = await ler()
    await atalhar('Control+c')
    await p.getByRole('status').filter({ hasText: 'Escolha copiada' }).waitFor()
    const texto = await p.evaluate(() => navigator.clipboard.readText())
    assert.equal(JSON.parse(texto).instancias.length, 2)
    assert.deepEqual(await ler(), antes)
    await atalhar('Control+v')
    await salvo()
    assert.equal((await ler()).documento.instancias.length, 4)
    assert.equal((await ler()).revisao, antes.revisao + 1)
    await p.getByRole('button', { name: 'Desfazer', exact: true }).click()
    await salvo()
    assert.deepEqual((await ler()).documento, antes.documento)
    await p.getByRole('button', { name: 'Refazer', exact: true }).click()
    await salvo()
    assert.equal((await ler()).documento.instancias.length, 4)
    await p.getByRole('button', { name: 'Escolher pasta Jardim', exact: true }).nth(1).click()
    await atalhar('Control+x')
    await salvo()
    assert.equal((await ler()).documento.instancias.length, 2)
    await p.getByRole('button', { name: 'Desfazer', exact: true }).click()
    await salvo()
    assert.equal((await ler()).documento.instancias.length, 4)
    await p.getByRole('button', { name: 'Trancar Jardim', exact: true }).first().click()
    await salvo()
    await p.getByRole('button', { name: 'Escolher pasta Jardim', exact: true }).first().click()
    const trancado = await ler(),
      clipboardAntes = await p.evaluate(() => navigator.clipboard.readText())
    await atalhar('Control+x')
    await p
      .getByRole('alert')
      .filter({ hasText: /bloquead/ })
      .first()
      .waitFor()
    assert.deepEqual(await ler(), trancado)
    assert.equal(await p.evaluate(() => navigator.clipboard.readText()), clipboardAntes)
    await p.getByRole('button', { name: 'Trancar Jardim', exact: true }).first().click()
    await salvo()
    await p.getByRole('button', { name: 'Fechar aviso', exact: true }).click()
    await menu('Copiar escolha')
    const origemAntes = await ler()
    await p.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Destino', exact: true }).click()
    await salvo()
    await menu('Colar escolha')
    await quantidade(ids.destino, 2)
    const colado = await ler(ids.destino)
    assert.equal(colado.documento.instancias.length, 2)
    assert.equal(colado.documento.formas.length, 2)
    assert.equal(colado.documento.formas[0].largura, 3)
    assert.equal(colado.documento.instancias[1].apoio.objeto, colado.documento.instancias[0].id)
    assert.equal(colado.documento.modelos.length, 1)
    assert.equal(colado.documento.texturas.length, 1)
    if (largura >= 900)
      await p.getByText('Textura: Textura aplicada', { exact: true }).waitFor({ timeout: 2000 })
    assert.deepEqual((await ler()).documento, origemAntes.documento)
    assert.equal((await ler()).revisao, origemAntes.revisao)
    await p.waitForFunction(() => {
      const texto = document.querySelector('.mcn-orcamento')?.textContent
      return texto && !texto.includes('chegando')
    })
    await p.getByText(/^Carregando \d+ texturas?…$/).waitFor({ state: 'hidden' })
    assert.equal(
      await p.getByRole('button', { name: 'Tentar texturas novamente', exact: true }).count(),
      0,
    )
    await atalhar('f')
    await p.screenshot({ path: resolve(saida, `colagem-${tema}-${largura}.png`) })
    // Uma caixa de texto conserva o clipboard nativo, sem executar autoria.
    await p.getByRole('button', { name: 'Objetos e camadas', exact: true }).click()
    const busca = p.getByRole('searchbox', { name: 'Buscar objetos e pastas', exact: true })
    await busca.fill('texto do campo')
    await busca.selectText()
    await p.keyboard.press('Control+c')
    assert.equal(await p.evaluate(() => navigator.clipboard.readText()), 'texto do campo')
    assert.deepEqual(await ler(ids.destino), colado)
    await busca.fill('')
    // Falha de permissão usa o buffer interno já preenchido, mesmo com outro texto no sistema.
    await p.evaluate(() =>
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error('Negado')
          },
          readText: async () => {
            throw new Error('Negado')
          },
        },
      }),
    )
    await p.getByRole('button', { name: 'Escolher pasta Jardim', exact: true }).click()
    await menu('Copiar escolha')
    await p.getByRole('status').filter({ hasText: 'guardada na ferramenta' }).waitFor()
    await menu('Colar escolha')
    await quantidade(ids.destino, 4)
    assert.equal((await ler(ids.destino)).documento.instancias.length, 4)
    await p.evaluate(async (id) => window.__cenarios.host.apagarBiblioteca(id), ids.biblioteca)
    // Duplicar pasta vazia funciona sem selecionar instâncias.
    await p.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Origem', exact: true }).click()
    await salvo()
    await p.getByText(/^Carregando \d+ texturas?…$/).waitFor({ state: 'hidden' })
    await p.getByText(/Não consegui carregar/).waitFor({ state: 'hidden' })
    await p.getByRole('button', { name: 'Objetos e camadas', exact: true }).click()
    await p.getByRole('button', { name: 'Escolher pasta Vazia', exact: true }).click()
    await atalhar('Control+d')
    await salvo()
    assert.equal((await ler()).documento.grupos.filter((g) => g.nome === 'Vazia').length, 2)
    await atalhar('Control+c')
    await p.evaluate(() => {
      navigator.clipboard.readText = () =>
        new Promise((r) => {
          window.__resolverClipboard = r
        })
    })
    const antesSair = await ler()
    await menu('Colar escolha')
    await p.waitForFunction(() => typeof window.__resolverClipboard === 'function')
    await p.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Origem', exact: true }).waitFor()
    await p.evaluate(async (texto) => {
      window.__resolverClipboard(texto)
      await new Promise(requestAnimationFrame)
      await new Promise(requestAnimationFrame)
      navigator.clipboard.readText = async () => {
        throw new Error('Negado')
      }
    }, texto)
    assert.deepEqual((await ler()).documento, antesSair.documento)
    assert.equal((await ler()).revisao, antesSair.revisao)
    // O buffer persiste ao trocar de mundo, mas não concede colagem em outro espaço.
    await p.getByRole('button', { name: 'Voltar aos mundos', exact: true }).click()
    await espaco.selectOption('equipe')
    await p.getByRole('button', { name: 'Abrir Outro espaço', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Estrangeiro', exact: true }).click()
    await salvo()
    const estrangeiroAntes = await ler(ids.estrangeiro)
    await menu('Colar escolha')
    await p.getByRole('alert').filter({ hasText: 'outro espaço' }).waitFor()
    assert.deepEqual(await ler(ids.estrangeiro), estrangeiroAntes)
    assert.deepEqual(erros, [])
    resultados.push({
      tema,
      largura,
      copiarNativo: true,
      recortar: true,
      undoRedo: true,
      pastaVazia: true,
      destinoComReferenciaColidente: true,
      outroCenario: true,
      origemPreservada: true,
      campoNativo: true,
      permissaoNegada: true,
      outroEspacoRecusado: true,
      respostaAtrasadaCancelada: true,
      modeloReal: true,
      textura: true,
      bibliotecaApagada: true,
      erros,
    })
    await contexto.close()
  }
  writeFileSync(resolve(saida, 'resultado.json'), `${JSON.stringify(resultados, null, 2)}\n`)
  console.log(JSON.stringify(resultados))
} catch (e) {
  if (pagina && !pagina.isClosed()) {
    await pagina.screenshot({ path: resolve(saida, 'falha.png') })
    writeFileSync(
      resolve(saida, 'falha.json'),
      JSON.stringify({ erro: String(e), texto: await pagina.locator('body').innerText() }, null, 2),
    )
  }
  throw e
} finally {
  await browser.close()
}
