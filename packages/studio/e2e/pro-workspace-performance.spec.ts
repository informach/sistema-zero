import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, type Locator, type Page, test } from '@playwright/test'
import { build, type PreviewServer, preview } from 'vite'
import { applyCpuThrottle, cpuSuffix } from './helpers/cpuThrottle'
import { inspectWorkspaceBuffers } from './proWorkspaceInspection'

/**
 * Tecla até o segundo requestAnimationFrame, para cada tecla de caractere digitada no Monaco: o
 * proxy de apresentação das medidas de digitação (não é INP nem o pixel exato).
 */
async function installInputFrameProbe(page: Page) {
  await page.addInitScript(() => {
    const samples: number[] = []
    document.addEventListener(
      'keydown',
      (event) => {
        if (
          !(event.target instanceof HTMLTextAreaElement) ||
          event.key.length !== 1 ||
          event.ctrlKey ||
          event.metaKey
        )
          return
        const start = performance.now()
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            samples.push(performance.now() - start)
            document.documentElement.dataset.inputFrameSamples = JSON.stringify(samples)
          }),
        )
      },
      true,
    )
  })
}

function benchmarkStats(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b)
  return {
    samples,
    p50: sorted[Math.ceil(sorted.length * 0.5) - 1],
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
    max: sorted.at(-1),
  }
}

// Achado T5 da revisão de 20/11: sem SHA nem data, o artefato podia levar a medição antiga.
function benchmarkCommit(): string | null {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

let server: PreviewServer
test.beforeAll(async () => {
  test.setTimeout(180_000)
  const configFile = fileURLToPath(new URL('../playground/vite.config.ts', import.meta.url))
  const root = fileURLToPath(new URL('./fixtures/pro-workspace', import.meta.url))
  const outDir = fileURLToPath(new URL('../.cache/e2e-pro-performance', import.meta.url))
  await build({
    configFile,
    root,
    logLevel: 'warn',
    build: { outDir, emptyOutDir: true, target: 'esnext' },
  })
  server = await preview({
    configFile,
    root,
    build: { outDir },
    preview: { host: '127.0.0.1', port: 0, strictPort: false },
  })
})
test.afterAll(async () => {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server.httpServer.close((error) => (error ? reject(error) : resolve())),
    )
})

test('large source ZIP uses one disposable worker and retains canonical buffers on success and abort', async ({
  page,
}) => {
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Missing benchmark server')
  const workers = new Set<string>()
  let created = 0
  page.on('worker', (worker) => {
    if (!worker.url().includes('zip.worker')) return
    created++
    workers.add(worker.url())
    worker.on('close', () => workers.delete(worker.url()))
  })
  await page.goto(`http://127.0.0.1:${address.port}/?zip=1`)
  await page.getByRole('button', { name: 'Gerar ZIP de teste', exact: true }).click()
  await expect(page.getByLabel('Resultado ZIP')).toContainText('"valid":true')
  const result = JSON.parse((await page.getByLabel('Resultado ZIP').textContent()) ?? '{}')
  expect(result.files).toBe(81)
  expect(result.inputBytes).toBe(200_000)
  expect(created).toBe(1)
  await expect.poll(() => workers.size).toBe(0)
  await page.getByRole('button', { name: 'Cancelar ZIP de teste', exact: true }).click()
  await expect(page.getByLabel('Resultado ZIP')).toContainText('"cancelled":true')
  await expect.poll(() => workers.size).toBe(0)
})

test('records real editor input, openings and layout lifecycle with controlled services', async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000)
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Missing benchmark server')
  const url = `http://127.0.0.1:${address.port}/?performance=1`
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await installInputFrameProbe(page)
  const openings: number[] = []
  for (let index = 0; index < 30; index++) {
    const start = performance.now()
    await page.goto(url)
    await expect(page.locator('.monaco-editor textarea.inputarea').first()).toBeVisible({
      timeout: 30_000,
    })
    openings.push(performance.now() - start)
  }
  const input = page.locator('.monaco-editor textarea.inputarea').first()
  await input.focus()
  await input.press('Control+End')
  await page.keyboard.type(`\n// ${'x'.repeat(200)}`)
  await expect
    .poll(async () =>
      page.evaluate(
        () => JSON.parse(document.documentElement.dataset.inputFrameSamples ?? '[]').length,
      ),
    )
    .toBeGreaterThanOrEqual(203)
  const inputFrames: number[] = await page.evaluate(() =>
    JSON.parse(document.documentElement.dataset.inputFrameSamples ?? '[]'),
  )
  await inspectWorkspaceBuffers(page)
  await expect(page.getByLabel('Buffers da sessão')).toContainText('x'.repeat(200))
  const before = await page.getByLabel('Buffers da sessão').textContent()
  const layouts: number[] = []
  for (let index = 0; index < 30; index++) {
    const start = performance.now()
    // O segmentado do palco (redesenho de 11/2026): "Só o jogo" e de volta a "Lado a lado".
    await page.getByRole('button', { name: 'Só o jogo', exact: true }).click()
    await page.getByRole('button', { name: 'Lado a lado', exact: true }).click()
    layouts.push(performance.now() - start)
  }
  await inspectWorkspaceBuffers(page)
  expect(await page.getByLabel('Buffers da sessão').textContent()).toBe(before)
  expect(errors).toEqual([])
  const stats = (samples: number[]) => {
    const sorted = [...samples].sort((a, b) => a - b)
    return {
      samples,
      p50: sorted[Math.ceil(sorted.length * 0.5) - 1],
      p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
      max: sorted.at(-1),
    }
  }
  const openZappy = page.getByRole('button', { name: 'Abrir Zappy', exact: true })
  if (await openZappy.isVisible()) await openZappy.click()
  await page.getByRole('button', { name: 'Investigar', exact: true }).click()
  await page.getByLabel('Sua dúvida para o Zappy').fill('Confira o nome no arquivo.')
  await page.getByRole('button', { name: 'Perguntar', exact: true }).click()
  await expect(page.getByText('Confira o nome no arquivo.', { exact: true }).last()).toBeVisible()
  await input.focus()
  const sampleCount = await page.evaluate(
    () => JSON.parse(document.documentElement.dataset.inputFrameSamples ?? '[]').length,
  )
  await input.press('Control+End')
  await page.keyboard.type(`\n// ${'y'.repeat(200)}`)
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(document.documentElement.dataset.inputFrameSamples ?? '[]').length,
      ),
    )
    .toBeGreaterThanOrEqual(sampleCount + 203)
  const zappyFrames: number[] = await page.evaluate(
    (start) => JSON.parse(document.documentElement.dataset.inputFrameSamples ?? '[]').slice(start),
    sampleCount,
  )
  expect(errors).toEqual([])
  const report = {
    commit: benchmarkCommit(),
    measuredAt: new Date().toISOString(),
    browser: browser.version(),
    fixture: '78-source-files-controlled-remote-runtime',
    limitations: [
      'Production fixture, not authenticated Kids route or physical 8GB device.',
      'Input to second animation frame is a presentation proxy, not INP or exact pixel latency.',
      'Opening/layout duration includes Playwright transport and auto-wait; first opening cold, remaining cached.',
      'No paid AI, real WebContainer install or GPU-heavy game in this fixture.',
    ],
    opening: stats(openings),
    inputFrames: stats(inputFrames),
    layoutRoundTrip: stats(layouts),
    inputWithZappy: stats(zappyFrames),
    errors,
  }
  const output =
    process.env.STUDIO_BROWSER_BENCH_OUTPUT ??
    '../../.audits/studio-pro-evolution/browser-current.json'
  await mkdir(dirname(resolve(output)), { recursive: true })
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`)
  // Laboratory budgets fixed in batch 0. These are not physical-device acceptance.
  expect(openings[0]).toBeLessThan(10_000)
  expect(stats(openings.slice(1)).p95).toBeLessThan(2_000)
  expect(report.inputFrames.p95).toBeLessThan(60)
  expect(report.inputWithZappy.p95).toBeLessThan(60)
  expect(report.layoutRoundTrip.p95).toBeLessThan(300)
  console.log(
    JSON.stringify({
      openingP95: report.opening.p95,
      inputFrameP95: report.inputFrames.p95,
      layoutP95: report.layoutRoundTrip.p95,
    }),
  )
})

/** Clica e devolve o tempo, medido na página, até o alvo aparecer e o quadro seguinte sair. */
function timeUntilVisible(button: Locator, target: 'search' | 'files' | 'problems') {
  return button.evaluate(async (element, target) => {
    const frame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve))
    const find = (): Element | null => {
      if (target === 'files') return document.querySelector('[role="tree"]')
      if (target === 'problems')
        return document.querySelector(
          '.sz-pro-dock [role="tabpanel"][aria-labelledby$="-tab-problems"]',
        )
      const label = [...document.querySelectorAll('label')].find(
        (item) => item.textContent === 'Encontrar no código do projeto',
      )
      return label?.htmlFor ? document.getElementById(label.htmlFor) : null
    }
    const start = performance.now()
    ;(element as HTMLElement).click()
    for (;;) {
      const found = find()
      if (found instanceof HTMLElement && found.checkVisibility()) break
      if (performance.now() - start > 10_000) throw new Error(`O painel ${target} não apareceu.`)
      await frame()
    }
    await frame()
    return performance.now() - start
  }, target)
}

/** Escreve a busca como a criança (um evento de entrada) e mede até o primeiro resultado aparecer. */
function timeUntilFirstResult(field: Locator, query: string) {
  return field.evaluate(async (element, query) => {
    const input = element as HTMLInputElement
    const write = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    if (!write) throw new Error('Campo sem escrita de valor.')
    const frame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve))
    const results = () =>
      document.querySelectorAll('ul[aria-label="Resultados"] button[aria-label]').length
    write.call(input, '')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    while (results()) await frame()
    const start = performance.now()
    write.call(input, query)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    while (!results()) {
      if (performance.now() - start > 10_000) throw new Error(`Nada encontrado para ${query}.`)
      await frame()
    }
    await frame()
    return performance.now() - start
  }, query)
}

test('modular 60-file project: typing, panels, first search answer and analysis across files', async ({
  page,
  browser,
  browserName,
}) => {
  test.setTimeout(300_000)
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Missing benchmark server')
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await installInputFrameProbe(page)
  const cpu = await applyCpuThrottle(page, browserName)
  await page.goto(`http://127.0.0.1:${address.port}/?modular`)
  const input = page.locator('.monaco-editor textarea.inputarea').first()
  await expect(input).toBeVisible({ timeout: 30_000 })
  const problemsTab = page.getByRole('tab', { name: /^Problemas/ })
  // A análise passa pelos 60 arquivos e não acha nada: o projeto se importa sem erro.
  await expect(problemsTab).toHaveAccessibleName(/Nenhum problema/, { timeout: 120_000 })

  const rail = page.getByRole('navigation', { name: 'Explorar o projeto', exact: true })
  const searchButton = rail.getByRole('button', { name: 'Procurar', exact: true })
  const filesButton = rail.getByRole('button', { name: 'Arquivos', exact: true })
  const field = page.getByRole('searchbox', { name: 'Encontrar no código do projeto' })
  await searchButton.click()
  await page.getByRole('button', { name: 'Nome do arquivo', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Encontrar um arquivo', exact: true }).fill('.ts')
  // Os 60 arquivos estão no projeto (a busca por nome lista um botão por arquivo).
  await expect(page.getByText('60 resultados', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Dentro do código', exact: true }).click()
  await filesButton.click()

  const panels: number[] = []
  for (let index = 0; index < 20; index++) {
    panels.push(await timeUntilVisible(searchButton, 'search'))
    panels.push(await timeUntilVisible(filesButton, 'files'))
  }
  const closeDock = page.getByRole('button', { name: 'Fechar a gaveta', exact: true })
  if (await closeDock.isVisible()) await closeDock.click()
  await expect(page.locator('.sz-pro-dock__body')).toBeHidden()
  const dock: number[] = []
  for (let index = 0; index < 20; index++) {
    dock.push(await timeUntilVisible(problemsTab, 'problems'))
    await problemsTab.click()
    await expect(page.locator('.sz-pro-dock__body')).toBeHidden()
  }

  await searchButton.click()
  await expect(field).toBeVisible()
  const queries = [
    'Vector',
    'Helper7',
    'Behaviour3',
    'System',
    'Scene',
    'update(dt',
    'points()',
    'theme.colors',
    'configVersion',
    'seedScore',
    'new Enemy',
    'storageVersion',
    'drawHud',
    'abstract',
    'velocity',
    'fillText',
    'Math.min',
    'readonly',
    'alive',
    'ticks',
  ]
  const searches: number[] = []
  for (const query of queries) searches.push(await timeUntilFirstResult(field, query))

  // Digitar num arquivo do meio do grafo (importado por dois sistemas).
  await field.fill('class Enemy07')
  await page.getByRole('button', { name: /^src\/entities\/enemy07\.ts:\d+ / }).click()
  await input.focus()
  const typedFrom = await page.evaluate(
    () => JSON.parse(document.documentElement.dataset.inputFrameSamples ?? '[]').length,
  )
  await input.press('Control+End')
  await page.keyboard.type(`\n// ${'x'.repeat(200)}`)
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(document.documentElement.dataset.inputFrameSamples ?? '[]').length,
      ),
    )
    .toBeGreaterThanOrEqual(typedFrom + 203)
  const typing: number[] = await page.evaluate(
    (start) => JSON.parse(document.documentElement.dataset.inputFrameSamples ?? '[]').slice(start),
    typedFrom,
  )

  // A análise acompanha as dependências: mudar o tipo na classe base acusa os arquivos FECHADOS
  // que a herdam, e desfazer apaga o que valia para a versão anterior.
  await field.fill('abstract points')
  await page.getByRole('button', { name: /^src\/entities\/base\.ts:\d+ / }).click()
  await expect(page.locator('.monaco-editor .view-lines').first()).toContainText(
    'abstract class Entity',
  )
  // O Procurar do editor seleciona o trecho, e o Esc devolve o foco ao código com ele selecionado.
  await input.focus()
  await input.press('Control+f')
  await page.keyboard.type('abstract points(): number')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await expect(input).toBeFocused()
  await input.press('End')
  for (let index = 0; index < 'number'.length; index++) await input.press('Backspace')
  const brokenAt = Date.now()
  await page.keyboard.type('string')
  await input.press('Escape')
  await expect(problemsTab).toHaveAccessibleName(/^Problemas\s*\d+$/, { timeout: 60_000 })
  const brokenAfter = Date.now() - brokenAt
  await problemsTab.click()
  await expect(
    page.getByRole('button', { name: /^Ir para src\/entities\/enemy00\.ts:\d+$/ }).first(),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: /^Ir para src\/systems\/movement\.ts:\d+$/ }).first(),
  ).toBeVisible()
  await input.focus()
  await input.press('End')
  for (let index = 0; index < 'string'.length; index++) await input.press('Backspace')
  const fixedAt = Date.now()
  await page.keyboard.type('number')
  await input.press('Escape')
  await expect(problemsTab).toHaveAccessibleName(/Nenhum problema/, { timeout: 60_000 })
  const fixedAfter = Date.now() - fixedAt
  await expect(page.getByRole('button', { name: /^Ir para src\/entities\// })).toHaveCount(0)
  expect(errors).toEqual([])

  const report = {
    commit: benchmarkCommit(),
    measuredAt: new Date().toISOString(),
    browser: browser.version(),
    fixture: '60-modular-typescript-files-five-layers',
    limitations: [
      'Playground fixture with the real Monaco and language worker, not the authenticated Kids route.',
      'Input to second animation frame is a presentation proxy, not INP or exact pixel latency.',
      'Panel and search times are measured inside the page from the click or input event to the frame after the target appears.',
      'Analysis times include Playwright typing and polling; they are recorded, not budgeted.',
    ],
    typing: benchmarkStats(typing),
    panelOpen: benchmarkStats(panels),
    dockOpen: benchmarkStats(dock),
    firstSearchAnswer: benchmarkStats(searches),
    analysisAfterBreakingBaseMs: brokenAfter,
    analysisAfterFixingBaseMs: fixedAfter,
    cpu,
    errors,
  }
  const output = resolve(
    dirname(
      resolve(
        process.env.STUDIO_BROWSER_BENCH_OUTPUT ??
          '../../.audits/studio-pro-evolution/browser-current.json',
      ),
    ),
    `pro-modular-current${cpuSuffix(cpu)}.json`,
  )
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`)
  console.log(
    JSON.stringify({
      typingP95: report.typing.p95,
      panelP95: report.panelOpen.p95,
      dockP95: report.dockOpen.p95,
      searchP95: report.firstSearchAnswer.p95,
      brokenAfter,
      fixedAfter,
    }),
  )
  // Os critérios da etapa 3 do plano (Pro em escala), na máquina do teste.
  expect(report.typing.p95).toBeLessThan(50)
  expect(report.panelOpen.p95).toBeLessThan(150)
  expect(report.dockOpen.p95).toBeLessThan(150)
  expect(report.firstSearchAnswer.p95).toBeLessThan(200)
})

/** Os horários dos quadros que o jogo do ensaio guardou (`window.__ensaio`, no quadro do jogo). */
function gameFrames(page: Page): Promise<number[]> {
  return page
    .frameLocator('iframe[title="Pré-visualização do projeto Pro"]')
    .locator('body')
    .evaluate(
      () =>
        (window as unknown as { __ensaio?: { quadros: number[] } }).__ensaio?.quadros.slice() ?? [],
    )
}

/** Memória JS da página do editor depois de uma coleta (o jogo roda em outro processo). */
async function editorHeap(page: Page): Promise<number> {
  const session = await page.context().newCDPSession(page)
  try {
    await session.send('HeapProfiler.collectGarbage')
    await session.send('Performance.enable')
    const { metrics } = await session.send('Performance.getMetrics')
    return metrics.find((metric) => metric.name === 'JSHeapUsedSize')?.value ?? 0
  } finally {
    await session.detach()
  }
}

test('tudo ligado ao mesmo tempo: jogo rodando, análise, Zappy em voo e arquivos mudando', async ({
  page,
  browser,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'a memória da página vem do CDP, só no Chromium')
  test.setTimeout(300_000)
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Missing benchmark server')
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await installInputFrameProbe(page)
  const cpu = await applyCpuThrottle(page, browserName)
  await page.goto(`http://127.0.0.1:${address.port}/?ensaio`)
  const input = page.locator('.monaco-editor textarea.inputarea').first()
  await expect(input).toBeVisible({ timeout: 30_000 })
  const problemsTab = page.getByRole('tab', { name: /^Problemas/ })
  await expect(problemsTab).toHaveAccessibleName(/Nenhum problema/, { timeout: 120_000 })

  // O jogo roda pela execução leve (sem o compilador do servidor) e já desenha quadros.
  await expect
    .poll(async () => (await gameFrames(page)).length, { timeout: 60_000 })
    .toBeGreaterThan(60)
  expect(await page.evaluate(() => document.documentElement.dataset.hostedBuilds ?? '0')).toBe('0')
  const heapAtStart = await editorHeap(page)

  /** Digita 200 caracteres no fim do arquivo aberto e devolve os quadros de cada tecla. */
  const typeAndMeasure = async (letter: string): Promise<number[]> => {
    await input.focus()
    const from = await page.evaluate(
      () => JSON.parse(document.documentElement.dataset.inputFrameSamples ?? '[]').length,
    )
    await input.press('Control+End')
    await page.keyboard.type(`\n// ${letter.repeat(200)}`)
    await expect
      .poll(() =>
        page.evaluate(
          () => JSON.parse(document.documentElement.dataset.inputFrameSamples ?? '[]').length,
        ),
      )
      .toBeGreaterThanOrEqual(from + 203)
    return page.evaluate(
      (start) =>
        JSON.parse(document.documentElement.dataset.inputFrameSamples ?? '[]').slice(start),
      from,
    )
  }

  // Fase A: o Zappy pergunta e a resposta leva o tempo de um servidor; a criança digita enquanto
  // isso. Na largura do computador o painel do Zappy ocupa o lugar do palco: o jogo fica atrás
  // dele, e o navegador pausa os quadros de um quadro que não está à vista (não é travamento).
  const openZappy = page.getByRole('button', { name: 'Abrir Zappy', exact: true })
  if (await openZappy.isVisible()) await openZappy.click()
  await page.getByRole('button', { name: 'Investigar', exact: true }).click()
  await page.getByLabel('Sua dúvida para o Zappy').fill('Por que a cena não muda?')
  await page.getByRole('button', { name: 'Perguntar', exact: true }).click()
  const typing = await typeAndMeasure('x')
  await expect(page.getByText('Confira o nome no arquivo.', { exact: true }).last()).toBeVisible()

  // Fase B: com o Zappy fechado o palco volta, e a criança digita com o jogo rodando à vista.
  await page.getByRole('button', { name: 'Fechar Zappy', exact: true }).first().click()
  const framesBeforeTyping = (await gameFrames(page)).at(-1) ?? 0
  await expect
    .poll(async () => (await gameFrames(page)).filter((time) => time > framesBeforeTyping).length)
    .toBeGreaterThan(10)
  const typingWithGame = await typeAndMeasure('y')
  const framesWhileTyping = (await gameFrames(page)).filter((time) => time > framesBeforeTyping)

  // Painéis e busca com o jogo rodando.
  const rail = page.getByRole('navigation', { name: 'Explorar o projeto', exact: true })
  const searchButton = rail.getByRole('button', { name: 'Procurar', exact: true })
  const filesButton = rail.getByRole('button', { name: 'Arquivos', exact: true })
  const panels: number[] = []
  for (let index = 0; index < 10; index++) {
    panels.push(await timeUntilVisible(searchButton, 'search'))
    panels.push(await timeUntilVisible(filesButton, 'files'))
  }
  await searchButton.click()
  const field = page.getByRole('searchbox', { name: 'Encontrar no código do projeto' })
  await expect(field).toBeVisible()
  const searches: number[] = []
  for (const query of ['Vector', 'Scene', 'drawHud', 'velocity', 'fillText', 'readonly'])
    searches.push(await timeUntilFirstResult(field, query))

  // Arquivos mudando com o jogo rodando: criar um e mudar o nome dele.
  await filesButton.click()
  await page.getByRole('button', { name: 'Novo', exact: true }).first().click()
  // A janela já abre em "Código TypeScript" (o projeto tem .ts) e põe a terminação e o `src/`.
  await expect(page.getByRole('button', { name: /Código TypeScript/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByLabel('Nome do novo item').fill('nota')
  await page.getByRole('button', { name: 'Criar', exact: true }).click()
  await expect(page.getByRole('treeitem', { name: 'src/nota.ts', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Opções de src/nota.ts' }).click()
  await page.getByRole('menuitem', { name: 'Mudar o nome' }).click()
  await page.getByLabel('Renomear nota.ts').fill('src/notas.ts')
  await page.getByLabel('Renomear nota.ts').press('Enter')
  await page.getByRole('button', { name: 'Aplicar mudança', exact: true }).click()
  await expect(page.getByRole('treeitem', { name: 'src/notas.ts', exact: true })).toBeVisible()
  await expect(problemsTab).toHaveAccessibleName(/Nenhum problema/, { timeout: 60_000 })

  // Dez vezes Parar e Rodar: o jogo volta a desenhar e a memória do editor não cresce.
  const stop = page.locator('[data-live-target="studio-stop"]')
  const run = page.locator('[data-live-target="studio-run"]')
  // A medida de antes fica logo antes dos ciclos: o que veio até aqui (o arquivo novo, a conversa
  // com o Zappy, o texto digitado) é estado de verdade, não sobra dos ciclos.
  const heapBefore = await editorHeap(page)
  for (let cycle = 0; cycle < 10; cycle++) {
    await stop.click()
    await run.click()
    await expect
      .poll(async () => (await gameFrames(page)).length, { timeout: 60_000 })
      .toBeGreaterThan(30)
  }
  const heapAfter = await editorHeap(page)
  expect(await page.evaluate(() => document.documentElement.dataset.hostedBuilds ?? '0')).toBe('0')
  expect(errors).toEqual([])

  const intervals = framesWhileTyping
    .slice(1)
    .map((time, index) => time - (framesWhileTyping[index] ?? time))
  const report = {
    commit: benchmarkCommit(),
    measuredAt: new Date().toISOString(),
    browser: browser.version(),
    cpu,
    fixture: '60-modular-typescript-files-with-light-runtime-game',
    limitations: [
      'Zappy adapter answers once after 1.5 s (no streaming), like the product today.',
      'At desktop width the Zappy panel takes the stage slot: while it is open the game is not in view and the browser pauses its frames. Game frames are measured with the Zappy closed.',
      'Files: create and rename through the UI; delete is not exercised.',
      'Light runtime only; the hosted build with dependencies and the WebContainer are not covered.',
      'Editor heap from the CDP after garbage collection; the game runs in another process.',
    ],
    typingWhileZappyInFlight: benchmarkStats(typing),
    typingWhileGameRuns: benchmarkStats(typingWithGame),
    panelOpenWhileGame: benchmarkStats(panels),
    firstSearchAnswerWhileGame: benchmarkStats(searches),
    gameFrameIntervalWhileTyping: benchmarkStats(intervals),
    editorHeap: {
      atStart: heapAtStart,
      beforeCycles: heapBefore,
      afterCycles: heapAfter,
      growth: heapAfter / heapBefore,
    },
    errors,
  }
  const output = resolve(
    dirname(
      resolve(
        process.env.STUDIO_BROWSER_BENCH_OUTPUT ??
          '../../.audits/studio-pro-evolution/browser-current.json',
      ),
    ),
    `pro-ensaio-current${cpuSuffix(cpu)}.json`,
  )
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`)
  console.log(
    JSON.stringify({
      typingZappyP95: report.typingWhileZappyInFlight.p95,
      typingGameP95: report.typingWhileGameRuns.p95,
      panelP95: report.panelOpenWhileGame.p95,
      searchP95: report.firstSearchAnswerWhileGame.p95,
      gameFrameP95: report.gameFrameIntervalWhileTyping.p95,
      heapGrowth: report.editorHeap.growth,
    }),
  )
  // Os mesmos critérios da etapa 3, agora com tudo ligado ao mesmo tempo.
  expect(report.typingWhileZappyInFlight.p95).toBeLessThan(50)
  expect(report.typingWhileGameRuns.p95).toBeLessThan(50)
  expect(report.panelOpenWhileGame.p95).toBeLessThan(150)
  expect(report.firstSearchAnswerWhileGame.p95).toBeLessThan(200)
  expect(intervals.length).toBeGreaterThan(10)
  // Dez ciclos de Parar e Rodar não deixam a memória do editor crescer além de 20%.
  expect(report.editorHeap.growth).toBeLessThan(1.2)
})
