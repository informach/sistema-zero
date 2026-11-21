import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import { chromium } from 'playwright-core'

// Same machine, browser, viewport and fixture for every arm. Never production URLs. An arm is a
// local server (one build per arm) or the same server with playground switches in its query
// (`adiado=http://127.0.0.1:5195,inteiro=http://127.0.0.1:5195/?montagem=inteira`).
const arms = (process.env.SZ_CLASSIC_OPEN_URLS ?? 'current=http://127.0.0.1:5301')
  .split(',')
  .map((entry) => {
    const separator = entry.indexOf('=')
    const name = entry.slice(0, separator)
    const url = new URL(entry.slice(separator + 1))
    if (
      !/^[a-z0-9_-]+$/i.test(name) ||
      !['http:', 'https:'].includes(url.protocol) ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
    )
      throw new Error('Opening measurements require named local QA servers')
    return { name, url }
  })
const sizes = (process.env.SZ_CLASSIC_OPEN_SIZES ?? '2000,5000,10000').split(',').map(Number)
const repeats = Number(process.env.SZ_CLASSIC_OPEN_REPEATS ?? 3)
const openTimeoutMs = Number(process.env.SZ_CLASSIC_OPEN_TIMEOUT_MS ?? 120_000)
// `SZ_CLASSIC_OPEN_EDIT=1`: after opening, edit the stage width (480 → 500) and read the project
// again once the edit reaches the generated code. Both readings must match across arms.
const editAfterOpening = process.env.SZ_CLASSIC_OPEN_EDIT === '1'
// `SZ_CLASSIC_OPEN_ASSERT=1` (CI): exit 1 unless every arm saved the same state and generated the
// same code at each size, with no page errors, and the arms really took different paths.
const assertEquivalence = process.env.SZ_CLASSIC_OPEN_ASSERT === '1'
const output =
  process.env.SZ_CLASSIC_OPEN_OUTPUT ?? '.cache/mission/classic-opening-comparison.json'
if (
  !Number.isSafeInteger(repeats) ||
  repeats < 1 ||
  repeats > 20 ||
  !Number.isSafeInteger(openTimeoutMs) ||
  openTimeoutMs < 1000 ||
  openTimeoutMs > 900_000 ||
  sizes.some((size) => !Number.isSafeInteger(size) || size < 1 || size > 10000)
)
  throw new Error('Invalid bounded measurement parameters')

/**
 * Reads the project the lesson harness holds, as canonical TEXT, inside the page. The lesson
 * project carries no block ids: Blockly draws a new id per block at every opening, so each id
 * becomes the order in which it appears in the state (Blockly serializes blocks always in the same
 * order). Serialized with an explicit stack: V8's `JSON.stringify` recurses, and the 10 thousand
 * block state is a chain of ~1,660 events nested through `next`. The ids go back to Node to be
 * replaced in the generated files too.
 */
function readCanonicalProject() {
  const projeto = window.__aula.projeto()
  const ids = []
  const canonicalIds = new Map()
  const out = []
  const pending = [{ value: projeto.blocksState, key: '' }]
  while (pending.length > 0) {
    const frame = pending.pop()
    if ('text' in frame) {
      out.push(frame.text)
      continue
    }
    const { value, key } = frame
    if (value === null || typeof value !== 'object') {
      if (key === 'id' && typeof value === 'string') {
        if (!canonicalIds.has(value)) {
          canonicalIds.set(value, `#${canonicalIds.size}`)
          ids.push(value)
        }
        out.push(JSON.stringify(canonicalIds.get(value)))
      } else out.push(JSON.stringify(value ?? null))
      continue
    }
    if (Array.isArray(value)) {
      pending.push({ text: ']' })
      for (let index = value.length - 1; index >= 0; index--) {
        pending.push({ value: value[index], key: String(index) })
        if (index > 0) pending.push({ text: ',' })
      }
      pending.push({ text: '[' })
      continue
    }
    const keys = Object.keys(value).filter(
      (name) => value[name] !== undefined && typeof value[name] !== 'function',
    )
    pending.push({ text: '}' })
    for (let index = keys.length - 1; index >= 0; index--) {
      pending.push({ value: value[keys[index]], key: keys[index] })
      pending.push({ text: `${index > 0 ? ',' : ''}${JSON.stringify(keys[index])}:` })
    }
    pending.push({ text: '{' })
  }
  return {
    state: out.join(''),
    ids,
    files: JSON.stringify(projeto.files),
    script: String(projeto.files?.['script.js'] ?? ''),
    deferredBlocks: Number(
      document.querySelector('[data-sz-deferred-blocks]')?.dataset.szDeferredBlocks ?? 0,
    ),
    offscreenBodies: Number(
      document.querySelector('[data-sz-offscreen-bodies]')?.dataset.szOffscreenBodies ?? 0,
    ),
  }
}

// O relatório vai ao disco depois de cada amostra (o job do CI pode ser morto pelo prazo).
async function writeReport() {
  const folder = output.slice(0, Math.max(output.lastIndexOf('/'), output.lastIndexOf('\\')))
  if (folder) await mkdir(folder, { recursive: true })
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`)
}

const digest = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16)
function digestsOf(project) {
  // Uma passada só, com os ids do mais longo para o mais curto: trocar um por um, na ordem de
  // aparição, corrompia um id que contém outro (`escala1` dentro de `escala10`).
  const canonical = new Map(project.ids.map((id, index) => [id, `#${index}`]))
  const pattern = [...canonical.keys()]
    .sort((a, b) => b.length - a.length)
    .map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')
  const files = pattern
    ? project.files.replace(new RegExp(pattern, 'g'), (id) => canonical.get(id))
    : project.files
  return { blocksStateDigest: digest(project.state), filesDigest: digest(files) }
}

const browser = await chromium.launch({
  headless: true,
  ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
})
const report = {
  environment: {
    platform: process.platform,
    node: process.version,
    browser: browser.version(),
    cpu: os.cpus()[0]?.model,
    logicalCpus: os.cpus().length,
    memoryBytes: os.totalmem(),
    viewport: { width: 1440, height: 900 },
  },
  arms: arms.map((arm) => ({ name: arm.name, url: arm.url.href })),
  method:
    'Fresh context per sample; alternating arm order; same Farol stress fixture. Timer intervals are scheduling observations, not input latency or FPS. No game profiler. Digests: block ids canonicalized by order of appearance, state serialized with an explicit stack.',
  editAfterOpening,
  samples: [],
}
try {
  for (const size of sizes) {
    for (let repeat = 0; repeat < repeats; repeat++) {
      const order = repeat % 2 ? [...arms].reverse() : arms
      for (const arm of order) {
        const context = await browser.newContext({ viewport: report.environment.viewport })
        const page = await context.newPage()
        const pageErrors = []
        page.on('pageerror', (error) => pageErrors.push(String(error)))
        const profiler =
          process.env.SZ_CLASSIC_OPEN_CPU_PROFILE === '1' ? await context.newCDPSession(page) : null
        if (profiler) {
          await profiler.send('Profiler.enable')
          await profiler.send('Profiler.start')
        }
        await page.addInitScript(() => {
          const gaps = [],
            longTasks = []
          let last = performance.now()
          const timer = setInterval(() => {
            const now = performance.now()
            gaps.push(now - last)
            last = now
          }, 20)
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) longTasks.push(entry.duration)
          })
          observer.observe({ type: 'longtask' })
          window.__openingMeasurement = () => {
            gaps.push(performance.now() - last)
            for (const entry of observer.takeRecords()) longTasks.push(entry.duration)
            clearInterval(timer)
            observer.disconnect()
            const summary = (values) => {
              const sorted = values.sort((a, b) => a - b)
              return {
                count: sorted.length,
                p50: sorted[Math.floor(sorted.length * 0.5)] ?? 0,
                p95: sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ?? 0,
                max: sorted.at(-1) ?? 0,
                total: sorted.reduce((sum, value) => sum + value, 0),
              }
            }
            return {
              readyMs: performance.now(),
              timerGapsMs: summary(gaps),
              longTasksMs: summary(longTasks),
            }
          }
        })
        try {
          const url = new URL('/aula', arm.url)
          for (const [name, value] of arm.url.searchParams) url.searchParams.set(name, value)
          url.searchParams.set('aula', 'desafio-primeiro-jogo/desafio-dia-3')
          url.searchParams.set('escala', String(size))
          // Um bloco "marca do fim" no último evento, lá na cauda que nasce sem desenho: a edição
          // de dentro da cauda passa por ele (revisão do lote 3, achado 3).
          if (editAfterOpening) url.searchParams.set('marca', '1')
          await page.goto(url.href)
          const stageWidth = page
            .locator('.blocklyBlockCanvas .blocklyEditableField')
            .filter({ hasText: /^480$/ })
            .first()
          await stageWidth.waitFor({ state: 'visible', timeout: openTimeoutMs })
          await page.waitForFunction(() => !document.querySelector('[data-aula-bloco] [inert]'), {
            timeout: openTimeoutMs,
          })
          const measured = await page.evaluate(() => window.__openingMeasurement())
          // "Aberto" de verdade (19/11/2026): o campo pronto pode aparecer antes de o resto
          // ser desenhado. `settledMs` espera a contagem de blocos desenhados ficar parada por
          // 1 s, a mesma régua do `e2e/classic-scale.spec.ts`; os dois números vão juntos.
          const settled = await page.evaluate(async () => {
            const count = () => document.querySelectorAll('.blocklyDraggable').length
            let last = count()
            let stableSince = performance.now()
            while (performance.now() - stableSince < 1000) {
              await new Promise((resolve) => setTimeout(resolve, 100))
              const now = count()
              if (now !== last) {
                last = now
                stableSince = performance.now()
              }
            }
            return { settledMs: stableSince, drawnBlocks: last }
          })
          // A prova de equivalência (etapa 3, 20/11/2026): o projeto gravado e o código gerado
          // depois de abrir, comparáveis entre os braços.
          const opened = await page.evaluate(readCanonicalProject)
          const sample = {
            arm: arm.name,
            size,
            repeat,
            cpuProfileEnabled: Boolean(profiler),
            ...measured,
            ...settled,
            deferredBlocks: opened.deferredBlocks,
            offscreenBodies: opened.offscreenBodies,
            ...digestsOf(opened),
          }
          if (editAfterOpening) {
            // Lote 3 (21/11/2026): a edição chega ao código como ELA nos dois caminhos.
            if (!opened.script.includes('SZGame2D.setupStage(480, 360,'))
              throw new Error('The opened project does not set up a 480 × 360 stage')
            // O custo do gesto (lote 3, "salvar sem serializar tudo a cada gesto"): as tarefas
            // longas da página entre o clique e o código novo: salvar o workspace, a IR, os avisos,
            // gerar o código e a store. A aula do playground não grava no IndexedDB
            // (`persistence="none"`): a gravação do Estúdio livre sai no autosave, não no gesto.
            await page.evaluate(() => {
              const entries = []
              const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) entries.push(entry.duration)
              })
              observer.observe({ type: 'longtask' })
              window.__editLongTasks = () => {
                for (const entry of observer.takeRecords()) entries.push(entry.duration)
                observer.disconnect()
                return {
                  count: entries.length,
                  max: Math.max(0, ...entries),
                  total: entries.reduce((sum, value) => sum + value, 0),
                }
              }
            })
            // `SZ_CLASSIC_OPEN_EDIT_PROFILE=1`: perfil de CPU só da janela do gesto (do clique ao
            // código novo), para saber de que é feito o custo de cada edição.
            const editProfiler =
              process.env.SZ_CLASSIC_OPEN_EDIT_PROFILE === '1'
                ? await context.newCDPSession(page)
                : null
            if (editProfiler) {
              await editProfiler.send('Profiler.enable')
              await editProfiler.send('Profiler.setSamplingInterval', { interval: 100 })
              await editProfiler.send('Profiler.start')
            }
            const editStartedAt = Date.now()
            await stageWidth.click()
            await page.locator('input.blocklyHtmlInput').fill('500')
            await page.keyboard.press('Enter')
            await page.waitForFunction(
              () =>
                String(window.__aula.projeto().files?.['script.js'] ?? '').includes(
                  'SZGame2D.setupStage(500, 360,',
                ),
              undefined,
              { timeout: openTimeoutMs, polling: 250 },
            )
            sample.editReachedCodeMs = Date.now() - editStartedAt
            if (editProfiler) {
              const { profile } = await editProfiler.send('Profiler.stop')
              await mkdir('.cache/mission', { recursive: true })
              await writeFile(
                `.cache/mission/edit-${arm.name}-${size}-${repeat}.cpuprofile`,
                JSON.stringify(profile),
              )
              await editProfiler.detach()
            }
            // Antes de ler o projeto: a leitura canônica é uma tarefa longa da própria medição.
            sample.editLongTasksMs = await page.evaluate(() => window.__editLongTasks())
            // Dentro da cauda (revisão do lote 3, achado 3): "Procurar no programa" leva ao bloco do
            // fim, o que desenha a cauda adiada até ele e liga a montagem sob demanda no braço
            // adiado; a edição de um campo desse bloco tem de chegar ao código nos dois braços.
            await page
              .locator('svg.blocklySvg')
              .first()
              .click({ position: { x: 40, y: 40 }, force: true, timeout: openTimeoutMs })
            await page.keyboard.press('Control+f')
            const search = page.getByRole('searchbox', { name: 'Procurar nos blocos do programa' })
            // No braço inteiro, com os 10 mil blocos desenhados, cada gesto espera a página: os
            // prazos são os da abertura, não os 30 s padrão de uma ação.
            await search.fill('marca do fim', { timeout: openTimeoutMs })
            await page
              .locator('[data-sz-workspace-search]')
              .getByRole('button', { name: /marca do fim/ })
              .click({ timeout: openTimeoutMs })
            const tailMark = page.locator('.blocklyBlockCanvas [data-id="marca-do-fim"]')
            await tailMark.waitFor({ state: 'visible', timeout: openTimeoutMs })
            await search.press('Escape', { timeout: openTimeoutMs })
            await tailMark
              .locator('.blocklyEditableField')
              .first()
              .click({ force: true, timeout: openTimeoutMs })
            await page
              .locator('input.blocklyHtmlInput')
              .fill('// marca editada', { timeout: openTimeoutMs })
            await page.keyboard.press('Enter')
            await page.waitForFunction(
              () =>
                String(window.__aula.projeto().files?.['script.js'] ?? '').includes(
                  'marca editada',
                ),
              undefined,
              { timeout: openTimeoutMs, polling: 250 },
            )
            const afterTail = await page.evaluate(() => ({
              deferredBlocks: Number(
                document.querySelector('[data-sz-deferred-blocks]')?.dataset.szDeferredBlocks ?? 0,
              ),
              offscreenBodies: Number(
                document.querySelector('[data-sz-offscreen-bodies]')?.dataset.szOffscreenBodies ??
                  0,
              ),
              drawnBlocks: document.querySelectorAll('.blocklyDraggable').length,
            }))
            sample.afterTailEdit = afterTail
            const edited = await page.evaluate(readCanonicalProject)
            if (edited.script.includes('SZGame2D.setupStage(480, 360,'))
              throw new Error('The edited project still sets up a 480 × 360 stage')
            if (edited.script.includes('marca do fim'))
              throw new Error('The edited project still has the old tail mark')
            const editedDigests = digestsOf(edited)
            sample.editedBlocksStateDigest = editedDigests.blocksStateDigest
            sample.editedFilesDigest = editedDigests.filesDigest
          }
          sample.pageErrors = pageErrors
          report.samples.push(sample)
          console.log(JSON.stringify(sample))
        } catch (error) {
          report.samples.push({ arm: arm.name, size, repeat, error: String(error), pageErrors })
          console.log(JSON.stringify({ arm: arm.name, size, repeat, error: String(error) }))
          process.exitCode = 1
        } finally {
          if (profiler) {
            const { profile } = await profiler.send('Profiler.stop')
            await mkdir('.cache/mission', { recursive: true })
            await writeFile(
              `.cache/mission/opening-${arm.name}-${size}-${repeat}.cpuprofile`,
              JSON.stringify(profile),
            )
            await profiler.detach()
          }
          await context.close()
          await writeReport()
        }
      }
    }
  }
} finally {
  await browser.close()
  if (assertEquivalence) report.equivalence = equivalenceOf(report.samples)
  await writeReport()
}
if (report.equivalence) {
  console.log(JSON.stringify(report.equivalence))
  if (!report.equivalence.ok) process.exitCode = 1
}

/**
 * Per size: one state digest and one code digest across every sample (after opening and, with the
 * edit, after editing), no errors, and the arms took different paths (at least one opened with
 * deferred blocks and at least one without): with two identical arms the comparison proves nothing.
 */
function equivalenceOf(samples) {
  const failures = []
  for (const size of sizes) {
    const ofSize = samples.filter((sample) => sample.size === size)
    if (ofSize.length < arms.length * repeats)
      failures.push(`${size}: ${ofSize.length} of ${arms.length * repeats} samples`)
    for (const sample of ofSize) {
      if (sample.error) failures.push(`${size}/${sample.arm}: ${sample.error}`)
      if (sample.pageErrors?.length)
        failures.push(`${size}/${sample.arm}: page errors ${sample.pageErrors.join(' | ')}`)
    }
    const fields = ['blocksStateDigest', 'filesDigest']
    if (editAfterOpening) fields.push('editedBlocksStateDigest', 'editedFilesDigest')
    for (const field of fields) {
      const values = new Set(
        ofSize.filter((sample) => !sample.error).map((sample) => sample[field]),
      )
      if (values.size !== 1) failures.push(`${size}: ${field} differs (${[...values].join(', ')})`)
    }
    if (arms.length > 1) {
      const measured = ofSize.filter((sample) => !sample.error)
      if (!measured.some((sample) => sample.deferredBlocks > 0))
        failures.push(`${size}: no arm opened with deferred blocks`)
      if (!measured.some((sample) => sample.deferredBlocks === 0 && sample.offscreenBodies === 0))
        failures.push(`${size}: no arm opened through the regular path`)
      if (
        editAfterOpening &&
        size >= 1500 &&
        !measured.some((sample) => (sample.afterTailEdit?.offscreenBodies ?? 0) > 0)
      )
        failures.push(`${size}: no arm mounted bodies on demand after revealing the tail`)
    }
  }
  return { ok: failures.length === 0, failures }
}
