import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { codigoDaMedida, gpuEmulada, type MedidaDoMundo } from '../src/medida/mundoGrande'
import { proveniencia, servirPasta } from './helpers/servirPasta'

/**
 * A medida de um mundo grande na placa de vídeo DESTA máquina (plano "Mundos de 2 km", lote 0,
 * 23/11/2026). Só local, com janela (`playwright.gpu.config.ts`): o CI não tem placa de vídeo, e
 * emulado é emulado (`docs/estudio-evolucao/guia-desempenho-e-depuracao.md`, regra 4). Com a placa
 * emulada a prova RECUSA medir (salvo `MUNDO_GPU_EMULADA=1`, só para conferir o roteiro).
 *
 * O herói percorre a rota pelas regiões (`src/medida/mundoGrande.ts`) por `MUNDO_GPU_DURACAO_MS`
 * (90 s), em dois perfis: `nativo` (1280×720) e `notebook` (1366×768, CPU 4× mais lenta, a guarda
 * contra regressão; o aparelho simples de verdade é a página do staging, lote 8). O resultado vai
 * para `output/medidas-gpu/<mundo>-<perfil>.json`, com a placa de vídeo, o SHA e se a árvore
 * estava suja. Sem a trava de 60 quadros (`MUNDO_GPU_VSYNC=1` a devolve): mede a folga.
 *
 * `bunx playwright test --config playwright.gpu.config.ts` (o jogo E gerado antes:
 * `preparar-cenario.mjs` no molda-cenarios e `preparar-jogo-e.ts` aqui). Outro mundo:
 * `MUNDO_GPU_PASTA`, `MUNDO_GPU_PAGINA` e `MUNDO_GPU_NOME`.
 */

const RAIZ = resolve(import.meta.dirname, '../../..')
const PASTA = resolve(RAIZ, process.env.MUNDO_GPU_PASTA ?? 'output/cenarios-reforma/jogo-e')
const PAGINA = process.env.MUNDO_GPU_PAGINA ?? 'regioes.html'
const NOME = process.env.MUNDO_GPU_NOME ?? 'jogo-e-384m'
const SAIDA = resolve(RAIZ, 'output/medidas-gpu')
const DURACAO = Number(process.env.MUNDO_GPU_DURACAO_MS ?? 90_000)
const VELOCIDADE = Number(process.env.MUNDO_GPU_VELOCIDADE ?? 8)
const AQUECIMENTO = 5000

const PERFIS = [
  { nome: 'nativo', largura: 1280, altura: 720, cpu: 1 },
  { nome: 'notebook', largura: 1366, altura: 768, cpu: 4 },
] as const

for (const perfil of PERFIS)
  test(`${NOME}, perfil ${perfil.nome}`, async ({ browser, browserName }) => {
    test.skip(browserName !== 'chromium', 'A medida usa a emulação de CPU do Chromium.')
    test.skip(
      !existsSync(resolve(PASTA, PAGINA)),
      `Gere o mundo antes: ${resolve(PASTA, PAGINA)} não existe.`,
    )
    test.setTimeout(DURACAO + AQUECIMENTO + 300_000)
    const servidor = await servirPasta(PASTA)
    const contexto = await browser.newContext({
      viewport: { width: perfil.largura, height: perfil.altura },
      deviceScaleFactor: 1,
    })
    try {
      const page = await contexto.newPage()
      const erros: string[] = []
      page.on('pageerror', (e) => erros.push(e.message))
      const gpu = await page.evaluate(() => {
        const gl = document.createElement('canvas').getContext('webgl2')
        if (!gl) return 'sem WebGL2'
        const info = gl.getExtension('WEBGL_debug_renderer_info')
        return String(
          info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        )
      })
      if (gpuEmulada(gpu) && process.env.MUNDO_GPU_EMULADA !== '1')
        throw Error(
          `A placa de vídeo é emulada (${gpu}): a medida só vale numa placa de verdade. Rode com janela, nesta máquina.`,
        )
      if (perfil.cpu > 1) {
        const cdp = await contexto.newCDPSession(page)
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: perfil.cpu })
      }
      await page.goto(`${servidor.base}/${PAGINA}`)
      await page.waitForFunction(
        () => (window as unknown as { __qaJogoE?: unknown }).__qaJogoE,
        undefined,
        { timeout: 180_000 },
      )
      const medida = (await page.evaluate(
        codigoDaMedida({ velocidade: VELOCIDADE, aquecimentoMs: AQUECIMENTO, duracaoMs: DURACAO }),
      )) as MedidaDoMundo
      const relatorio = {
        mundo: NOME,
        pagina: PAGINA,
        perfil,
        vsync: process.env.MUNDO_GPU_VSYNC === '1',
        medidoEm: new Date().toISOString(),
        ...proveniencia(),
        ...medida,
        erros,
      }
      mkdirSync(SAIDA, { recursive: true })
      writeFileSync(
        resolve(SAIDA, `${NOME}-${perfil.nome}.json`),
        `${JSON.stringify(relatorio, null, 2)}\n`,
      )
      const pior = Math.max(0, ...medida.entradas.map((e) => e.piorMs))
      console.log(
        `${NOME} (${perfil.nome}) em ${medida.gpu}: ${medida.fpsMediano} quadros/s na mediana, p95 ${medida.quadroMs.p95.toFixed(1)} ms, ` +
          `desenhos p95 ${medida.desenhos?.p95 ?? '?'}, triângulos p95 ${medida.triangulos?.p95 ?? '?'}, ` +
          `texturas ${(medida.memoria.bytesDeTexturas / 2 ** 20).toFixed(1)} MiB, pior quadro numa entrada ${pior.toFixed(0)} ms, ` +
          `${medida.entradas.length} entradas, regiões ${medida.regioesVisitadas.join(', ')}.`,
      )
      expect(erros).toEqual([])
      expect(medida.quadros).toBeGreaterThan(0)
    } finally {
      await contexto.close()
      await servidor.fechar()
    }
  })
