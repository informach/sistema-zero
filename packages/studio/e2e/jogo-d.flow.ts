import { writeFile } from 'node:fs/promises'
import { expect, type Frame, type Page, test } from '@playwright/test'

/**
 * Prova do jogo D no navegador (lote 8 da conclusão do plano do Estúdio, 22/11/2026). Servidor:
 * `scripts/serve-jogo-d-proof.ts`; configuração: `playwright.jogo-d.config.ts`.
 *
 * - Recibo na prévia (quadro isolado, política `strict`) e no site exportado, sem rede e sem erro.
 * - Desempenho nas condições de referência (Chromium do Playwright, 1280 × 720, palco 640 × 480,
 *   DPR 1), andando pelas setas: p95 do trabalho por quadro ≤ 8 ms, p99 ≤ 16,7 ms e no máximo 1%
 *   dos intervalos acima de 20 ms.
 * - Sessão longa (JOGO_D_SESSAO_MS; 10 minutos no CI; pelo menos 3 voltas): o robô PÕE o herói
 *   no centro de cada região e em cada porta (não anda: o caminho e a colisão ficam com a prova de
 *   desempenho). A memória depois do coletor não sobe, as imagens criadas param depois da primeira
 *   volta, cada passagem cabe em 50 ms, o jogo nunca recomeça (o herói não morre) e não sai nenhum
 *   aviso.
 * - Volta com o estado (o que foi pego continua pego, chegada na boca da caverna) e a cama que
 *   guarda o jogo no site exportado, que volta depois de recarregar.
 * - Destino quebrado: o herói fica e o aviso sai uma vez.
 */

interface Ponto {
  x: number
  y: number
}
interface Esperado {
  example: string
  cenas: { id: string; largura: number; altura: number }[]
  regioes: (Ponto & { nome: string })[]
  portas: (Ponto & { id: string; cena: string; destino: string })[]
  camas: (Ponto & { cena: string })[]
}
interface Medida {
  trabalho: number[]
  intervalos: number[]
  imagens: number
}
type Janela = Window & {
  __medida: Medida
  __comecos?: number
  __jogoD?: {
    jogador: { x: number; y: number }
    lugar(): string
    regiao(): string
    pontos(): number
    pegos(): number
    vivas(): number
    moedas(): [number, number][]
  }
  SZGame2D: {
    setPosition(sprite: unknown, x: number, y: number): void
    mapSize(name: string, axis: string): number
  }
}

/** Mede o trabalho de cada quadro (a soma dos `requestAnimationFrame` dele) e conta as imagens. */
function medir() {
  const w = window as unknown as Janela
  const raf = window.requestAnimationFrame.bind(window)
  const m = { trabalho: [] as number[], intervalos: [] as number[], imagens: 0 }
  let atual: number | null = null,
    anterior: number | null = null,
    soma = 0
  w.__medida = m
  window.requestAnimationFrame = (passo) =>
    raf((ts) => {
      if (atual !== ts) {
        if (atual !== null) {
          m.trabalho.push(soma)
          if (anterior !== null) m.intervalos.push(atual - anterior)
          anterior = atual
        }
        atual = ts
        soma = 0
      }
      const t0 = performance.now()
      try {
        passo(ts)
      } finally {
        soma += performance.now() - t0
      }
    })
  const Original = window.Image
  function Contada(this: unknown, largura?: number, altura?: number) {
    m.imagens++
    return new Original(largura, altura)
  }
  Contada.prototype = Original.prototype
  ;(window as unknown as { Image: unknown }).Image = Contada
}

const quantil = (valores: number[], q: number) => {
  const ordem = [...valores].sort((a, b) => a - b)
  return ordem[Math.min(ordem.length - 1, Math.floor(q * ordem.length))] ?? 0
}

async function esperado(page: Page): Promise<Esperado> {
  return (await (await page.request.get('/expected.json')).json()) as Esperado
}
async function abrir(page: Page, caminho: string, problemas: string[]) {
  page.on('pageerror', (erro) => problemas.push(erro.message))
  page.on('console', (mensagem) => {
    // O site exportado é uma PWA; bloquear o service worker é a política desta prova, não do jogo.
    if (mensagem.text() === 'Service Worker registration blocked by Playwright') return
    if (['error', 'warning'].includes(mensagem.type())) problemas.push(mensagem.text())
  })
  await page.addInitScript(medir)
  await page.goto(caminho)
  await expect
    .poll(() => page.evaluate(() => (window as unknown as Janela).__jogoD?.vivas() ?? 0))
    .toBeGreaterThan(0)
}
const lugar = (page: Page) => page.evaluate(() => (window as unknown as Janela).__jogoD!.lugar())
/** Põe o centro do herói num ponto do lugar atual (é o que as áreas conferem). */
async function ir(page: Page, p: Ponto) {
  await page.evaluate(({ x, y }) => {
    const w = window as unknown as Janela
    w.SZGame2D.setPosition(w.__jogoD!.jogador, x - 11, y - 12)
  }, p)
}
const quadros = (page: Page) =>
  page.evaluate(() => (window as unknown as Janela).__medida.trabalho.length)
async function esperarQuadros(page: Page, n: number) {
  const inicio = await quadros(page)
  await expect.poll(() => quadros(page), { timeout: 10_000 }).toBeGreaterThanOrEqual(inicio + n)
}
/** Passa por uma porta e devolve o maior trabalho de quadro da passagem. */
async function passar(page: Page, porta: Esperado['portas'][number]) {
  const antes = await quadros(page)
  await ir(page, porta)
  await expect.poll(() => lugar(page), { timeout: 10_000 }).toBe(porta.destino)
  await esperarQuadros(page, 3)
  return page.evaluate(
    (de) => Math.max(...(window as unknown as Janela).__medida.trabalho.slice(de)),
    antes,
  )
}
async function anexar(info: ReturnType<typeof test.info>, nome: string, dados: unknown) {
  const caminho = info.outputPath(nome)
  await writeFile(caminho, JSON.stringify(dados, null, 2))
  await info.attach(nome, { path: caminho, contentType: 'application/json' })
}

for (const modo of ['preview', 'export'] as const)
  test.describe(modo, () => {
    test.use({ serviceWorkers: modo === 'export' ? 'block' : 'allow' })
    test(`${modo}: o mundo roda com as cenas do Pinta, sem rede e sem erro`, async ({
      page,
    }, info) => {
      const problemas: string[] = []
      const rede: string[] = []
      page.on('request', (r) => {
        if (['fetch', 'xhr'].includes(r.resourceType())) rede.push(r.url())
      })
      const e = await esperado(page)
      expect(e.example).toBe('Mundo das Portas')
      let jogo: Frame = page.mainFrame()
      if (modo === 'preview') {
        page.on('pageerror', (erro) => problemas.push(erro.message))
        page.on('console', (m) => {
          if (m.type() === 'error') problemas.push(m.text())
        })
        await page.goto('/')
        await page.evaluate(() => {
          const quadro = document.createElement('iframe')
          quadro.setAttribute('sandbox', 'allow-scripts')
          quadro.src = '/preview.html'
          quadro.width = '800'
          quadro.height = '600'
          document.body.append(quadro)
        })
        await expect
          .poll(() => page.frames().some((f) => f.url().endsWith('/preview.html')))
          .toBe(true)
        jogo = page.frames().find((f) => f.url().endsWith('/preview.html')) as Frame
      } else await abrir(page, '/export/public/index.html', problemas)
      const recibo = () =>
        jogo.evaluate(() => {
          const w = window as unknown as Janela
          if (!w.__jogoD) return null
          const telas = [...document.querySelectorAll('canvas')]
          const tela = telas.sort((a, b) => b.width * b.height - a.width * a.height)[0]
          const pixels = tela?.getContext('2d')?.getImageData(0, 0, tela.width, tela.height).data
          let pintados = 0
          if (pixels)
            for (let i = 3; i < pixels.length; i += 4) if ((pixels[i] ?? 0) > 0) pintados++
          return {
            largura: w.SZGame2D.mapSize('mapa', 'width'),
            altura: w.SZGame2D.mapSize('mapa', 'height'),
            regiao: w.__jogoD.regiao(),
            vivas: w.__jogoD.vivas(),
            pintados,
          }
        })
      await expect
        .poll(() => jogo.evaluate(() => (window as unknown as Janela).__jogoD?.regiao() ?? ''))
        .toBe('Vila')
      // Uma leitura de pixels só: ler a tela várias vezes faz o Chromium avisar
      // (willReadFrequently), e o aviso seria da prova, não do jogo.
      await page.waitForTimeout(500)
      const r = await recibo()
      expect(r!.pintados).toBeGreaterThan(10_000)
      await anexar(info, 'jogo-d-recibo.json', { modo, recibo: r })
      expect([r!.largura, r!.altura]).toEqual([3072, 2304])
      expect(r!.vivas).toBe(225)
      expect(problemas).toEqual([])
      expect(rede).toEqual([])
    })
  })

test.describe('site exportado', () => {
  test.use({ serviceWorkers: 'block' })

  test('desempenho andando pelas setas: p95 ≤ 8 ms, p99 ≤ 16,7 ms, ≤ 1% dos intervalos acima de 20 ms', async ({
    page,
  }, info) => {
    const problemas: string[] = []
    await abrir(page, '/export/public/index.html', problemas)
    await page.locator('canvas').first().click()
    await esperarQuadros(page, 60)
    const inicio = await quadros(page)
    const posicao = () =>
      page.evaluate(() => {
        const j = (window as unknown as Janela).__jogoD!.jogador
        return { x: j.x, y: j.y }
      })
    // O herói precisa ANDAR: sem isso, teclas que não chegam ao jogo mediriam o jogo parado.
    let andou = 0
    for (const tecla of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'ArrowRight']) {
      const antes = await posicao()
      await page.keyboard.down(tecla)
      await page.waitForTimeout(4000)
      await page.keyboard.up(tecla)
      const depois = await posicao()
      andou += Math.hypot(depois.x - antes.x, depois.y - antes.y)
    }
    const m = await page.evaluate((de) => {
      const medida = (window as unknown as Janela).__medida
      return { trabalho: medida.trabalho.slice(de), intervalos: medida.intervalos.slice(de) }
    }, inicio)
    const resultado = {
      andouPx: Math.round(andou),
      quadros: m.trabalho.length,
      p50: quantil(m.trabalho, 0.5),
      p95: quantil(m.trabalho, 0.95),
      p99: quantil(m.trabalho, 0.99),
      maximo: Math.max(...m.trabalho),
      acimaDe20ms: m.intervalos.filter((v) => v > 20).length / m.intervalos.length,
      intervaloP50: quantil(m.intervalos, 0.5),
    }
    await anexar(info, 'jogo-d-desempenho.json', resultado)
    console.log(`jogo D, desempenho: ${JSON.stringify(resultado)}`)
    expect(resultado.andouPx).toBeGreaterThan(600)
    expect(resultado.quadros).toBeGreaterThan(600)
    expect(resultado.p95).toBeLessThanOrEqual(8)
    expect(resultado.p99).toBeLessThanOrEqual(16.7)
    expect(resultado.acimaDe20ms).toBeLessThanOrEqual(0.01)
    expect(problemas).toEqual([])
  })

  test('sessão longa: todas as regiões e portas, memória e imagens estáveis, passagens ≤ 50 ms', async ({
    page,
  }, info) => {
    const duracao = Number(process.env.JOGO_D_SESSAO_MS ?? 120_000)
    const problemas: string[] = []
    const e = await esperado(page)
    await abrir(page, '/export/public/index.html', problemas)
    const cdp = await page.context().newCDPSession(page)
    const memoria = async () => {
      await cdp.send('HeapProfiler.collectGarbage')
      return ((await cdp.send('Runtime.getHeapUsage')) as { usedSize: number }).usedSize
    }
    const doMundo = e.portas.filter((p) => p.cena === 'jogo-d-mundo')
    const voltas: { memoria: number; imagens: number; pior: number }[] = []
    const comeco = Date.now()
    while (Date.now() - comeco < duracao || voltas.length < 3) {
      let pior = 0
      for (const r of e.regioes) {
        await ir(page, r)
        await expect
          .poll(() => page.evaluate(() => (window as unknown as Janela).__jogoD!.regiao()))
          .toBe(r.nome)
        await esperarQuadros(page, 10)
      }
      for (const entrada of doMundo) {
        pior = Math.max(pior, await passar(page, entrada))
        await esperarQuadros(page, 10)
        const saida = e.portas.find(
          (p) => p.cena === entrada.destino && p.destino === 'jogo-d-mundo',
        )!
        pior = Math.max(pior, await passar(page, saida))
        await esperarQuadros(page, 10)
      }
      // A sonda guarda o trabalho e o intervalo de CADA quadro (dois números de 8 bytes, numa
      // lista que cresce 1,5× de cada vez): em 10 minutos são 36 mil quadros, quase 1 MB, e era
      // ela que fazia a memória "subir" em degraus (CI 45075113828: +270 KB na volta 52, o que as
      // duas listas de ~34 mil números ganham ao crescer). Esvaziada a cada volta, a conta é só
      // do jogo. Nenhuma passagem está em curso aqui, então os índices de `passar` não mudam.
      await page.evaluate(() => {
        const m = (window as unknown as Janela).__medida
        m.trabalho = []
        m.intervalos = []
      })
      voltas.push({
        memoria: await memoria(),
        imagens: await page.evaluate(() => (window as unknown as Janela).__medida.imagens),
        pior,
      })
    }
    const resultado = {
      duracaoMs: Date.now() - comeco,
      voltas: voltas.length,
      passagens: voltas.length * doMundo.length * 2,
      piorPassagemMs: Math.max(...voltas.map((v) => v.pior)),
      memoria: voltas.map((v) => v.memoria),
      imagens: voltas.map((v) => v.imagens),
      comecos: await page.evaluate(() => (window as unknown as Janela).__comecos ?? 0),
    }
    await anexar(info, 'jogo-d-sessao.json', resultado)
    console.log(
      `jogo D, sessão: ${JSON.stringify({ ...resultado, memoria: undefined, imagens: undefined })}`,
    )
    // O jogo nunca recomeçou: o herói não morreu no caminho (revisão do lote 8: um inimigo perto
    // da chegada da caverna 3 o matava na 5ª volta, e o recomeço criava imagens de novo).
    expect(resultado.comecos).toBe(1)
    expect(resultado.piorPassagemMs).toBeLessThanOrEqual(50)
    // As imagens param de nascer depois da primeira volta (o cache das cenas e dos desenhos).
    expect(voltas.at(-1)!.imagens).toBe(voltas[0]!.imagens)
    // A memória depois do coletor não sobe: a última volta fica a até 10% da segunda.
    expect(voltas.at(-1)!.memoria).toBeLessThanOrEqual(voltas[1]!.memoria * 1.1)
    expect(problemas).toEqual([])
  })

  test('volta com o estado, e a cama guarda o jogo que volta depois de recarregar', async ({
    page,
  }) => {
    const problemas: string[] = []
    const e = await esperado(page)
    await abrir(page, '/export/public/index.html', problemas)
    const porta = (cena: string, destino: string) =>
      e.portas.find((p) => p.cena === cena && p.destino === destino)!
    // Leituras da sonda (sem `new Function`: a política do site exportado não deixa).
    const vivas = () => page.evaluate(() => (window as unknown as Janela).__jogoD!.vivas())
    const pontos = () => page.evaluate(() => (window as unknown as Janela).__jogoD!.pontos())
    // Na caverna 1: pega três moedas.
    await passar(page, porta('jogo-d-mundo', 'jogo-d-caverna-1'))
    const antes = await vivas()
    const moedas = await page.evaluate(() => (window as unknown as Janela).__jogoD!.moedas())
    for (const [x, y] of moedas.slice(0, 3)) {
      await ir(page, { x, y })
      await esperarQuadros(page, 3)
    }
    expect(await pontos()).toBe(3)
    // Sai e chega na boca da caverna (perto da porta dela no mundo).
    await passar(page, porta('jogo-d-caverna-1', 'jogo-d-mundo'))
    const boca = porta('jogo-d-mundo', 'jogo-d-caverna-1')
    const heroi = await page.evaluate(() => {
      const j = (window as unknown as Janela).__jogoD!.jogador
      return { x: j.x + 11, y: j.y + 12 }
    })
    expect(Math.hypot(heroi.x - boca.x, heroi.y - boca.y)).toBeLessThan(64)
    // Volta: as três moedas continuam pegas.
    await passar(page, boca)
    expect(await vivas()).toBe(antes - 3)
    await passar(page, porta('jogo-d-caverna-1', 'jogo-d-mundo'))
    // Dorme na cama da casa 1 e recarrega a página.
    await passar(page, porta('jogo-d-mundo', 'jogo-d-casa-1'))
    await ir(page, e.camas.find((c) => c.cena === 'jogo-d-casa-1')!)
    await expect.poll(() => page.evaluate(() => localStorage.getItem('jogo-d-salvo'))).toBe('sim')
    await page.reload()
    await expect.poll(pontos).toBe(3)
    await passar(page, boca)
    expect(await vivas()).toBe(antes - 3)
    expect(problemas).toEqual([])
  })

  test('destino quebrado: o herói fica onde está e o aviso sai uma vez', async ({ page }) => {
    const problemas: string[] = []
    const e = await esperado(page)
    await abrir(page, '/quebrado/public/index.html', problemas)
    const porta = e.portas.find((p) => p.id === 'porta-casa-4')!
    for (let vez = 0; vez < 3; vez++) {
      await ir(page, porta)
      await esperarQuadros(page, 6)
      expect(await lugar(page)).toBe('jogo-d-mundo')
      const heroi = await page.evaluate(() => {
        const j = (window as unknown as Janela).__jogoD!.jogador
        return { x: j.x + 11, y: j.y + 12 }
      })
      expect(Math.hypot(heroi.x - porta.x, heroi.y - porta.y)).toBeLessThan(8)
      await ir(page, { x: porta.x, y: porta.y + 64 })
      await esperarQuadros(page, 4)
    }
    expect(problemas.filter((p) => p.includes('jogo-d-sumida'))).toHaveLength(1)
    expect(problemas).toHaveLength(1)
  })
})

test('editor: o jogo D abre nos blocos do Estúdio e roda na prévia', async ({ page }) => {
  test.setTimeout(240_000)
  const projeto = await (await page.request.get('/jogo-d.szproject.json')).body()
  const erros: string[] = []
  page.on('pageerror', (erro) => erros.push(erro.message))
  await page.goto(`http://127.0.0.1:${process.env.JOGO_D_EDITOR_PORT ?? 5196}/`)
  await page.getByLabel('Importar projeto').setInputFiles({
    name: 'jogo-d.szproject.json',
    mimeType: 'application/json',
    buffer: projeto,
  })
  await expect(page).toHaveURL(/\/editor\//, { timeout: 60_000 })
  await page
    .locator('svg.blocklySvg .blocklyBlockCanvas .blocklyDraggable')
    .first()
    .waitFor({ timeout: 120_000 })
  await page.locator('[data-live-target="studio-run"]').first().click()
  const previa = page.frameLocator('iframe[title="Pré-visualização"]')
  await expect(previa.locator('canvas').first()).toBeVisible({ timeout: 60_000 })
  const largura = async () => {
    for (const f of page.frames())
      try {
        const v = await f.evaluate(() => {
          const api = (
            window as unknown as { SZGame2D?: { mapSize(n: string, e: string): number } }
          ).SZGame2D
          return api ? api.mapSize('mapa', 'width') : 0
        })
        if (v) return v
      } catch {}
    return 0
  }
  await expect.poll(largura, { timeout: 60_000 }).toBe(3072)
  expect(erros).toEqual([])
})
