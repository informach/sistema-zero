import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'
import { montarCenaDeCompilacaoDoEnsaio } from './fixture-compilacao.mjs'

const raiz = resolve(import.meta.dirname, '../../../..')
const saida = resolve(raiz, 'output/cenarios-reforma/lote8-publicacao/interface')
const fixture = JSON.parse(
  readFileSync(
    resolve(raiz, 'output/cenarios-reforma/lote8-integracao-terreno-juncao/resultado.json'),
    'utf8',
  ),
)
const modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const resultados = []
try {
  for (const caso of [
    { width: 1440, height: 900, tema: 'light' },
    { width: 390, height: 844, tema: 'dark' },
  ]) {
    const nome = `${caso.width}-${caso.tema}`
    const context = await browser.newContext({
      viewport: caso,
      hasTouch: caso.width < 640,
      isMobile: caso.width < 640,
      recordVideo: { dir: resolve(saida, 'video'), size: { width: 1280, height: 800 } },
    })
    const pagina = await context.newPage(),
      erros = []
    pagina.setDefaultTimeout(30000)
    pagina.on('pageerror', (e) => erros.push(e.message))
    try {
      await pagina.goto(`http://127.0.0.1:4541/?vazio=1&tema=${caso.tema}`)
      await pagina.waitForFunction(() => window.__cenarios)
      const ids = await pagina.evaluate(montarCenaDeCompilacaoDoEnsaio, {
        core: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
        motor: modulo('packages/molda-cenarios-motor/src/index.ts'),
        autoria: fixture.autoria,
        recursos: fixture.recursosDeAutoria,
        espaco: 'equipe',
      })
      await pagina.evaluate(() => {
        const h = window.__cenarios.host,
          publicar = h.publicacoes.publicar.bind(h.publicacoes)
        window.__qaPublicacao = { modo: 'normal', operacoes: [], pacotes: [] }
        h.publicacoes.publicar = async (pacote, destino, sinal, progresso) => {
          const qa = window.__qaPublicacao
          qa.operacoes.push(structuredClone(destino))
          qa.pacotes.push(pacote.cena)
          if (qa.modo === 'esperar') {
            progresso?.({ etapa: 'recursos', feitos: 0, total: 1 })
            await new Promise((_, rejeitar) => {
              sinal.throwIfAborted()
              sinal.addEventListener('abort', () => rejeitar(sinal.reason), { once: true })
            })
          }
          if (qa.modo === 'concorrencia') {
            qa.modo = 'normal'
            await publicar(
              pacote,
              { ...destino, operacaoId: crypto.randomUUID() },
              sinal,
              progresso,
            )
          }
          const r = await publicar(pacote, destino, sinal, progresso)
          if (qa.modo === 'resposta-perdida') {
            qa.modo = 'normal'
            throw Error('Resposta interrompida depois da confirmação')
          }
          return r
        }
      })
      await pagina.getByRole('combobox', { name: 'De quem são' }).selectOption('equipe')
      await pagina.getByRole('button', { name: 'Abrir Mundo de exportação', exact: true }).click()
      const abrir = async () => {
        await pagina.getByRole('button', { name: `Exportar: ${ids.nome}`, exact: true }).click()
        await pagina.getByRole('button', { name: 'Publicar no Arquipélago', exact: true }).click()
        const d = pagina.getByRole('dialog', { name: 'Publicar no Arquipélago' })
        await d.getByLabel(/Confirmo a publicação/).waitFor()
        return d
      }
      let d = await abrir()
      assert.equal(await d.getByRole('button', { name: 'Publicar esta versão' }).isDisabled(), true)
      assert.equal(await d.getByLabel('Ilha do Arquipélago').locator('option').count(), 7)
      await d.getByLabel(/Confirmo a publicação/).check()
      await d.getByLabel('Ilha do Arquipélago').selectOption('bosque')
      assert.equal(await d.getByLabel(/Confirmo a publicação/).isChecked(), false)
      await d.getByLabel('Ilha do Arquipélago').selectOption('sua-ilha')
      await d.getByLabel(/Confirmo a publicação/).check()
      await pagina.screenshot({ path: resolve(saida, `${nome}-confirmacao.png`) })
      const medidas = await d.evaluate((e) => ({
        largura: e.getBoundingClientRect().width,
        janela: innerWidth,
        conteudo: e.scrollWidth,
        cliente: e.clientWidth,
      }))
      assert.ok(medidas.largura <= medidas.janela && medidas.conteudo <= medidas.cliente + 1)
      await pagina.evaluate(() => {
        window.__qaPublicacao.modo = 'esperar'
      })
      await d.getByRole('button', { name: 'Publicar esta versão' }).click()
      await d.getByText('Enviando os recursos do cenário', { exact: true }).waitFor()
      await d.getByRole('button', { name: 'Interromper publicação' }).click()
      assert.equal(
        await pagina.evaluate(() =>
          window.__cenarios.host.publicacoes.obter({
            tipo: 'arquipelago-v2',
            ilha: 'sua-ilha',
          }),
        ),
        null,
      )
      await pagina.evaluate(() => {
        window.__qaPublicacao.modo = 'resposta-perdida'
      })
      await d.getByRole('button', { name: 'Publicar esta versão' }).click()
      await d
        .getByRole('alert')
        .filter({ hasText: 'Resposta interrompida' })
        .waitFor({ timeout: 90000 })
      await d.getByRole('button', { name: 'Tentar publicação de novo' }).click()
      await d
        .getByRole('heading', { name: 'Versão 1 já publicada', exact: true })
        .waitFor({ timeout: 90000 })
      const ops = await pagina.evaluate(() => window.__qaPublicacao.operacoes)
      assert.equal(ops[1].operacaoId, ops[2].operacaoId)
      await pagina.screenshot({ path: resolve(saida, `${nome}-publicado.png`) })
      await d.getByRole('button', { name: 'Voltar à oficina' }).click()
      d = await abrir()
      assert.ok((await d.innerText()).includes('A versão 1 será substituída'))
      await d.getByLabel(/Confirmo a publicação/).check()
      await pagina.evaluate(() => {
        window.__qaPublicacao.modo = 'concorrencia'
      })
      await d.getByRole('button', { name: 'Publicar esta versão' }).click()
      await d.getByRole('button', { name: 'Conferir destino de novo' }).waitFor({ timeout: 90000 })
      await d.getByRole('button', { name: 'Conferir destino de novo' }).click()
      await d.getByText('A versão 2 será substituída por esta revisão.', { exact: true }).waitFor()
      assert.equal(await d.getByLabel(/Confirmo a publicação/).isChecked(), false)
      await d.getByLabel(/Confirmo a publicação/).check()
      await d.getByRole('button', { name: 'Publicar esta versão' }).click()
      await d
        .getByRole('heading', { name: 'Versão 3 publicada', exact: true })
        .waitFor({ timeout: 90000 })
      await d.getByRole('button', { name: 'Voltar à oficina' }).click()
      d = await abrir()
      await pagina.evaluate(async () => {
        const h = window.__cenarios.host,
          id = window.__qaCena.cenario
        const c = await h.abrirCenario(id)
        await h.editarCenario(
          id,
          c.revisao,
          [
            {
              tipo: 'cenario.restaurar',
              documento: { ...c.documento, nome: 'Revisão mais recente' },
            },
          ],
          'qa-fonte-alterada',
        )
      })
      await d.getByLabel(/Confirmo a publicação/).check()
      await d.getByRole('button', { name: 'Publicar esta versão' }).click()
      await d.getByRole('button', { name: 'Abrir revisão atual', exact: true }).waitFor()
      assert.equal(
        await pagina.evaluate(() =>
          window.__cenarios.host.publicacoes
            .obter({ tipo: 'arquipelago-v2', ilha: 'sua-ilha' })
            .then((p) => p.versao),
        ),
        3,
      )
      assert.deepEqual(erros, [])
      resultados.push({
        ...caso,
        medidas,
        versao: 3,
        cancelamento: true,
        repeticao: true,
        concorrencia: true,
        fonteAlterada: true,
        erros,
      })
    } catch (e) {
      await pagina.screenshot({ path: resolve(saida, `${nome}-falha.png`) }).catch(() => {})
      throw e
    } finally {
      await context.close()
    }
  }
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify(resultados, null, 2))
  console.log(JSON.stringify(resultados))
} finally {
  await browser.close()
}
