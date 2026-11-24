import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, type Page, test } from '@playwright/test'
import { applyCpuThrottle, cpuSuffix } from './helpers/cpuThrottle'

/**
 * Perfil do Clássico em escala, no navegador (pacote C da evolução do Estúdio).
 *
 * `scripts/profile-js-classic.ts` mede o processamento sem tela. Aqui se mede o que só o
 * navegador mostra: quanto demora para o projeto aparecer com os blocos desenhados, e quanto a
 * página fica presa ao editar um campo e ao mover uma pilha. O projeto é o do dia 3 de A Chave do
 * Farol com os eventos repetidos (`/aula?…&escala=N`).
 *
 * É MEDIÇÃO: grava os números em `.cache/classic-scale/resultado.json` e só reprova se o Estúdio
 * não abrir ou se a edição não chegar ao código. Os números são desta máquina, sem interface;
 * não valem como orçamento de aparelho de criança.
 */

const aqui = dirname(fileURLToPath(import.meta.url))
const SAIDA = resolve(aqui, '../.cache/classic-scale')
const TAMANHOS = (process.env.CLASSIC_SCALE_SIZES ?? '0,500,2000,5000').split(',').map(Number)

/** Soma e maior das tarefas longas (mais de 50 ms) enquanto `acao` roda e a página assenta. */
async function tarefasLongas(
  page: Page,
  acao: () => Promise<void>,
  assentarMs = 1500,
): Promise<{ soma: number; maior: number; quantas: number }> {
  await page.evaluate(() => {
    const w = window as unknown as { __longas: number[]; __observador?: PerformanceObserver }
    w.__longas = []
    w.__observador?.disconnect()
    w.__observador = new PerformanceObserver((lista) => {
      for (const entrada of lista.getEntries()) w.__longas.push(entrada.duration)
    })
    w.__observador.observe({ type: 'longtask' })
  })
  await acao()
  await page.waitForTimeout(assentarMs)
  const longas = await page.evaluate(() => (window as unknown as { __longas: number[] }).__longas)
  return {
    soma: Math.round(longas.reduce((soma, valor) => soma + valor, 0)),
    maior: Math.round(Math.max(0, ...longas)),
    quantas: longas.length,
  }
}

const resultados: Record<string, unknown>[] = []

test.describe.configure({ mode: 'serial' })

for (const tamanho of TAMANHOS) {
  test(`abrir e editar com ${tamanho || 'os blocos do curso'}`, async ({ page, browserName }) => {
    test.setTimeout(5 * 60_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    const cpu = await applyCpuThrottle(page, browserName)
    const inicio = Date.now()
    await page.goto(
      `/aula?aula=desafio-primeiro-jogo/desafio-dia-3${tamanho ? `&escala=${tamanho}` : ''}`,
    )
    const blocos = page.locator('svg.blocklySvg .blocklyBlockCanvas .blocklyDraggable')
    await blocos.first().waitFor({ timeout: 120_000 })
    // Desenhado: a contagem de blocos na tela parou de crescer.
    let antes = -1
    let desenhados = 0
    for (let vez = 0; vez < 200; vez++) {
      desenhados = await blocos.count()
      if (desenhados === antes) break
      antes = desenhados
      await page.waitForTimeout(250)
    }
    const abrirMs = Date.now() - inicio
    await page.waitForTimeout(1500)

    // Como TEXTO: o Playwright não devolve um objeto com centenas de blocos encadeados (a
    // serialização dele estoura e acusa uma navegação que não houve).
    const lerDoProjeto = (o: 'script' | 'blocos') =>
      page.evaluate((qual) => {
        const projeto = (
          window as unknown as {
            __aula: { projeto(): { files: Record<string, string>; blocksState: unknown } }
          }
        ).__aula.projeto()
        if (qual === 'script') return projeto.files['script.js'] ?? ''
        // Sem JSON.stringify: o do Firefox recursa a partir de ~2 mil elos de uma cadeia.
        let blocos = 0
        const pendentes: unknown[] = [projeto.blocksState]
        while (pendentes.length > 0) {
          const atual = pendentes.pop()
          if (!atual || typeof atual !== 'object') continue
          const tipo = (atual as { type?: unknown }).type
          if (typeof tipo === 'string' && tipo.startsWith('sz_')) blocos++
          for (const valor of Object.values(atual)) pendentes.push(valor)
        }
        return String(blocos)
      }, o)
    const antesDaEdicao = await lerDoProjeto('script')
    const blocosNoProjeto = Number(await lerDoProjeto('blocos'))

    // Editar um campo de número de um bloco à vista ("Preparar o jogo … 480 × 360").
    const campo = page
      .locator('svg.blocklySvg .blocklyBlockCanvas .blocklyEditableField')
      .filter({ hasText: /^480$/ })
      .first()
    await campo.waitFor({ timeout: 30_000 })
    const edicao = await tarefasLongas(page, async () => {
      await campo.click()
      await page.locator('input.blocklyHtmlInput').fill('500')
      await page.keyboard.press('Enter')
    })
    // A edição chega ao código como ELA: o palco passa de 480 a 500 de largura. Conferir só que o
    // texto mudou deixava passar qualquer outra mudança (revisão do lote 1, 21/11/2026).
    expect(antesDaEdicao).toContain('SZGame2D.setupStage(480, 360,')
    await expect
      .poll(() => lerDoProjeto('script'), { timeout: 60_000 })
      .toContain('SZGame2D.setupStage(500, 360,')
    expect(await lerDoProjeto('script')).not.toContain('SZGame2D.setupStage(480, 360,')

    // Mover a área "Ao iniciar" (uma pilha inteira) alguns pixels.
    const area = page.locator('svg.blocklySvg .blocklyBlockCanvas .blocklyDraggable').first()
    const caixa = await area.boundingBox()
    if (!caixa) throw new Error('A primeira área não tem caixa na tela.')
    const arrasto = await tarefasLongas(page, async () => {
      await page.mouse.move(caixa.x + 12, caixa.y + 12)
      await page.mouse.down()
      await page.mouse.move(caixa.x + 60, caixa.y + 40, { steps: 12 })
      await page.mouse.up()
    })

    const linha = {
      pedido: tamanho,
      cpu,
      blocosNoProjeto,
      blocosDesenhados: desenhados,
      abrirMs,
      editarCampo: edicao,
      moverArea: arrasto,
    }
    resultados.push(linha)
    console.log(JSON.stringify(linha))
    mkdirSync(SAIDA, { recursive: true })
    writeFileSync(
      resolve(SAIDA, `resultado${cpuSuffix(cpu)}.json`),
      JSON.stringify(resultados, null, 1),
    )
    expect(desenhados).toBeGreaterThan(0)
  })
}
