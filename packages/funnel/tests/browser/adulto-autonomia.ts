/** Built app + local PostgreSQL. The gateway only supplies a synthetic local admin identity. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { chromium, type Page } from 'playwright'
import type { AnalyticsReport } from '../../src/analytics/reports'
import { closeDb, getDb } from '../../src/db/client'
import { createFunnelRepo } from '../../src/db/repo'
import { ADULT_ENGINES } from '../../src/funnels/adulto-autonomia/engine'
import { ENTRY } from '../../src/funnels/adulto-autonomia/entry'
import type { AdultMode } from '../../src/funnels/adulto-autonomia/types'
import type { QuizAnswers } from '../../src/lib/quiz-types'
import samples from '../fixtures/adulto-autonomia-approved.json'
import { adultJourney } from '../helpers/adulto-autonomia'

const database = new URL(process.env.DATABASE_URL!)
assert.ok(['localhost', '127.0.0.1'].includes(database.hostname))
assert.ok(database.pathname.startsWith('/sz_quiz_vida_'), 'Use an isolated quiz QA database')
const output = resolve('../../.cache/adult-quizzes-browser')
const run = `QA ${crypto.randomUUID()}`
const source = `qa-autonomia-${crypto.randomUUID()}`
await mkdir(output, { recursive: true })
const token = crypto.randomUUID(),
  repo = createFunnelRepo(getDb())
const gateway = createServer((req, res) => {
  res.setHeader('content-type', 'application/json')
  if (req.url === '/auth/me' && req.headers.authorization === `Bearer ${token}`)
    res.end(
      JSON.stringify({
        user: { id: 'qa-quiz-admin', email: 'quiz@example.test', role: 'admin', status: 'active' },
      }),
    )
  else res.writeHead(503).end('{}')
})
await new Promise<void>((done) => gateway.listen(0, '127.0.0.1', done))
const address = gateway.address()
assert.ok(address && typeof address !== 'string')
const server = createServer()
await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
const port = (server.address() as { port: number }).port
await new Promise<void>((done) => server.close(() => done()))
const base = `http://127.0.0.1:${port}`
const app = spawn('node', ['dist/server/entry.mjs'], {
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: String(port),
    GATEWAY_URL: `http://127.0.0.1:${address.port}`,
    NODE_ENV: 'development',
    SENTRY_DSN: '',
    TRUST_PROXY: 'true',
  },
})
let serverLog = ''
app.stdout.on('data', (d) => (serverLog += d))
app.stderr.on('data', (d) => (serverLog += d))
const browser = await chromium.launch({
  channel: process.env.QA_CHROME_CHANNEL ?? 'chrome',
  headless: true,
})
const errors: string[] = [],
  layouts: { mode: string; sample: string; width: number }[] = []
const path = (mode: AdultMode) =>
  `/pro/${mode === 'desafio' ? 'desafio-primeiro-jogo' : 'comunidade-dos-criadores'}`
async function layout(page: Page, width: number) {
  await page.setViewportSize({ width, height: 950 })
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
    false,
    `${page.url()}: overflow ${width}`,
  )
}
async function loadResultImages(page: Page) {
  for (const img of await page.locator('.ra-galeria img').all()) {
    await img.scrollIntoViewIfNeeded()
    await img.evaluate(async (image) => {
      await (image as HTMLImageElement).decode()
    })
    assert.ok(await img.evaluate((image) => (image as HTMLImageElement).naturalWidth > 0))
  }
  await page.evaluate(() => scrollTo(0, 0))
}
const context = await browser.newContext({
  viewport: { width: 390, height: 950 },
  reducedMotion: 'reduce',
})
await context.addCookies([{ name: 'sz_metrics', value: 'rejected', url: base }])
const page = await context.newPage()
const analyticsNetwork: unknown[] = []
page.on('response', async (response) => {
  if (!response.url().includes('/api/analytics/')) return
  const request = response.request().postDataJSON()
  const eventKeys = request?.events?.map(
    (e: { name: string; questionId?: string }) => e.questionId ?? e.name,
  )
  analyticsNetwork.push({
    path: new URL(response.url()).pathname,
    status: response.status(),
    events: eventKeys,
  })
})
page.on('pageerror', (e) => errors.push(e.message))

try {
  let ready = false
  for (let attempt = 0; attempt < 100; attempt++) {
    if (app.exitCode !== null) throw new Error(serverLog)
    try {
      ready = (await fetch(`${base}/pro/desafio-primeiro-jogo/quiz`)).ok
    } catch {}
    if (ready) break
    await new Promise((r) => setTimeout(r, 100))
  }
  assert.ok(ready, 'Local app did not start')
  let walks = 0,
    edits = 0,
    zooms = 0
  const journeys: { mode: AdultMode; keys: string[] }[] = []
  for (const mode of ['desafio', 'comunidade'] as AdultMode[])
    for (const novice of [false, true]) {
      await context.setExtraHTTPHeaders({ 'x-forwarded-for': `198.19.2.${walks + 1}` })
      await context.clearCookies()
      const sample = samples.find(
        (s) => s.mode === mode && (s.answers.experiencia === 'nunca') === novice,
      )!
      const journey = adultJourney(mode, sample.answers),
        engine = ADULT_ENGINES[mode]
      await page.goto(
        `${base}${path(mode)}/quiz?utm_source=${source}&event_code=QA_ADULTO&cupom=QA50`,
      )
      await page.locator('astro-island:not([ssr])').first().waitFor()
      await page.getByRole('button', { name: 'Tenho menos de 18 anos', exact: true }).click()
      assert.equal(
        new URL(
          (await page
            .getByRole('link', { name: 'Conhecer com meu responsável' })
            .getAttribute('href')) ?? '',
          base,
        ).pathname,
        `${path(mode).replace('/pro/', '/kids/')}/quiz`,
      )
      await page.getByRole('button', { name: 'Voltar', exact: true }).click()
      await page.getByRole('button', { name: ENTRY[mode].action, exact: true }).click()
      let state: QuizAnswers = {}
      for (const [i, { key, value }] of journey.responses.entries()) {
        await page.locator(`[data-analytics-question="${key}"]`).waitFor()
        assert.equal(
          await page.getByRole('progressbar').getAttribute('aria-label'),
          `Pergunta ${i + 1} de 10`,
        )
        for (const width of [320, 390]) await layout(page, width)
        if (i === 5)
          await page.screenshot({
            path: `${output}/${mode}-condicoes-${novice ? 'iniciante' : 'experiente'}.png`,
            fullPage: true,
          })
        if (key === 'autonomia_condicao') {
          await page.locator(`input[value="apoio"]`).check()
          await page.locator(`input[value="nenhuma"]`).check()
          assert.equal(await page.locator('input:checked').count(), 1)
          assert.equal(await page.locator('input[value="apoio"]').isChecked(), false)
          await page.locator('input[value="nenhuma"]').uncheck()
        }
        for (const option of Array.isArray(value) ? value : [String(value)])
          await page.locator(`input[name="${key}"][value="${option}"]`).check()
        assert.equal(
          await page.locator(`[data-analytics-question="${key}"]`).count(),
          1,
          'Selecting alone must not advance',
        )
        const [saved] = await Promise.all([
          page.waitForResponse(
            (r) => r.url().endsWith('/api/leads') && r.request().method() === 'PATCH',
          ),
          i === 0
            ? page.locator('button[type="submit"]').press('Enter')
            : page.locator('button[type="submit"]').click(),
        ])
        assert.equal(saved.status(), 200)
        state = i === 9 ? journey.answers : (await saved.json()).answers
        if (i === 2) {
          await page.reload()
          await page.getByRole('button', { name: 'Continuar de onde parei', exact: true }).click()
        }
      }
      await page.waitForURL('**/resultado?**')
      assert.equal(await page.locator('h1').innerText(), sample.expected.title)
      assert.equal(await page.locator('footer').count(), 1)
      const offer = new URL(
        (await page.locator('[data-quiz-offer]').getAttribute('href')) ?? '',
        base,
      )
      assert.equal(offer.pathname, `${path(mode)}/oferta`)
      for (const [key, value] of [
        ['utm_source', source],
        ['event_code', 'QA_ADULTO'],
        ['cupom', 'QA50'],
      ])
        assert.equal(offer.searchParams.get(key!), value)
      await loadResultImages(page)
      await page.screenshot({
        path: `${output}/${mode}-${novice ? 'iniciante' : 'experiente'}.png`,
        fullPage: true,
      })
      for (const width of [320, 390, 768, 1440]) await layout(page, width)
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%'
      })
      await layout(page, 390)
      await page.evaluate(() => {
        document.documentElement.style.fontSize = ''
      })
      await page.locator('[data-offer-zoom]').first().click()
      const dialog = page.locator('[data-offer-image-dialog]')
      await dialog.waitFor({ state: 'visible' })
      const box = await dialog.boundingBox()
      assert.ok(box)
      assert.ok(Math.abs(box.x + box.width / 2 - 195) < 3)
      await page.keyboard.press('Escape')
      assert.equal(await dialog.isVisible(), false)
      zooms++
      await page.getByRole('link', { name: 'Rever as respostas', exact: true }).click()
      await page.getByRole('heading', { name: 'Suas respostas', exact: true }).waitFor()
      assert.equal(await page.locator('.qz-revisao li').count(), 10)
      if (!novice) {
        await page.locator('.qz-revisao li').nth(1).getByRole('button', { name: /Mudar/ }).click()
        await page.locator('input[value="nunca"]').check()
        const [saved] = await Promise.all([
          page.waitForResponse(
            (r) => r.url().endsWith('/api/leads') && r.request().method() === 'PATCH',
          ),
          page.locator('button[type="submit"]').click(),
        ])
        assert.equal(saved.status(), 200)
        state = (await saved.json()).answers
        assert.equal(state.autonomia_conquista, journey.answers.autonomia_conquista)
        assert.deepEqual(state.autonomia_condicao, journey.answers.autonomia_condicao)
        let missing = 0
        while (!engine.isComplete(state)) {
          const step = engine.activeSteps(state).find((s) => !engine.validChoice(s, state[s.key]))!
          await page.locator(`[data-analytics-question="${step.key}"]`).waitFor()
          assert.match(await page.locator('main').innerText(), /precisa ser revista/)
          await page.locator(`input[value="${step.opcoes[0]!.value}"]`).check()
          const [next] = await Promise.all([
            page.waitForResponse(
              (r) => r.url().endsWith('/api/leads') && r.request().method() === 'PATCH',
            ),
            page.locator('button[type="submit"]').click(),
          ])
          assert.equal(next.status(), 200)
          state = engine.applyAnswer(state, step.key, step.opcoes[0]!.value)!
          missing++
          assert.ok(missing <= 4)
        }
        assert.equal(missing, 4)
        edits++
        await page.waitForURL('**/resultado?**')
      } else await page.getByRole('link', { name: 'Voltar ao resultado', exact: true }).click()
      journeys.push({ mode, keys: journey.responses.map((r) => r.key) })
      walks++
    }
  await context.addCookies([{ name: 'sz_metrics', value: 'rejected', url: base }])
  for (const [sampleIndex, sample] of samples.entries()) {
    await context.setExtraHTTPHeaders({ 'x-forwarded-for': `198.18.2.${sampleIndex + 1}` })
    const mode = sample.mode as AdultMode,
      journey = adultJourney(mode, sample.answers)
    const created = await context.request.post(`${base}/api/leads`, {
      headers: { origin: base },
      data: { funnel: path(mode).slice(1), restartQuiz: true },
    })
    assert.equal(created.status(), 201)
    const session = await created.json()
    for (const [revision, { key, value }] of journey.responses.entries()) {
      const response = await context.request.patch(`${base}/api/leads`, {
        headers: { origin: base },
        data: {
          funnel: path(mode).slice(1),
          key,
          value,
          revision,
          sessionToken: session.sessionToken,
        },
      })
      assert.equal(response.status(), 200, await response.text())
    }
    await repo.updateLead(session.id, { nome: `${run} ${sample.id}` })
    await page.goto(`${base}${path(mode)}/resultado`)
    assert.equal(await page.locator('h1').innerText(), sample.expected.title)
    assert.equal(await page.locator('.ra-pratica li').count(), 3)
    assert.deepEqual(await page.locator('.ra-condicoes li').allTextContents(), sample.expected.fit)
    await loadResultImages(page)
    assert.doesNotMatch(await page.locator('main').innerText(), /undefined|NaN/)
    for (const width of [320, 390, 768, 1440]) {
      await layout(page, width)
      layouts.push({ mode, sample: sample.id, width })
    }
  }
  for (const mode of ['desafio', 'comunidade'] as AdultMode[]) {
    const old = await repo.createLead(path(mode).slice(1))
    await repo.updateLead(old.id, {
      nome: `${run} HISTORICO ${mode}`,
      perfilResultado: mode === 'desafio' ? 'desafio-adulto-ideia' : 'adulto-ideia',
      quizAnswers: { _quiz_version: `${mode}-adulto-v1`, computador: 'meu', cena: 'B' },
    })
  }
  await context.addCookies([{ name: 'admin_access', value: token, url: base, httpOnly: true }])
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(`${base}/admin`)
  await page.locator('astro-island[component-url*="AdminDashboard"]:not([ssr])').waitFor()
  for (const mode of ['desafio', 'comunidade'] as AdultMode[]) {
    await page.getByLabel('Filtrar por funil').selectOption(path(mode).slice(1))
    await page.getByRole('button', { name: 'Performance', exact: true }).click()
    await page.getByLabel(/Só quem abriu o quiz atual/).waitFor()
    assert.equal(await page.getByLabel(/Só quem abriu o quiz atual/).isChecked(), true)
    await page.getByText('Pergunta 10 · Valor pessoal', { exact: true }).waitFor()
    assert.equal(await page.getByText('Pergunta 4 · Dificuldade', { exact: true }).count(), 1)
    assert.equal(await page.getByText(/^Pergunta \d+ · /).count(), 10)
    await page.screenshot({ path: `${output}/admin-${mode}-performance.png`, fullPage: true })
    await page.getByRole('button', { name: 'Perfis', exact: true }).click()
    await page.getByText('Ampliar a autoria', { exact: true }).waitFor()
    assert.equal(await page.getByText(/\(quiz anterior\)/).count(), 0)
    await page.getByLabel(/Só quem abriu o quiz atual/).uncheck()
    await page
      .getByText(/\(quiz anterior\)/)
      .first()
      .waitFor()
    await page.screenshot({ path: `${output}/admin-${mode}-perfis.png`, fullPage: true })
    await page.getByRole('button', { name: 'Respostas', exact: true }).click()
    const multiple = samples.find((s) => s.mode === mode && s.answers.condicao.length > 1)!
    await page.getByPlaceholder(/Buscar/).fill(`${run} ${multiple.id}`)
    await page.getByRole('cell', { name: `${run} ${multiple.id}`, exact: true }).click()
    const modal = page.getByRole('dialog')
    await modal.waitFor()
    const shown = await modal.innerText(),
      engine = ADULT_ENGINES[mode],
      journey = adultJourney(mode, multiple.answers)
    for (const step of engine.activeSteps(journey.answers))
      assert.ok(shown.includes(step.titulo), `Missing exact question ${step.key}`)
    for (const value of multiple.answers.condicao) {
      const label = engine.steps
        .find((s) => s.key === 'autonomia_condicao')!
        .opcoes.find((o) => o.value === value)!.label
      assert.ok(shown.includes(label), 'Full condition labels in admin')
    }
    assert.deepEqual(
      (await modal.locator('dt').allTextContents()).filter((t) =>
        engine.steps.some((s) => s.titulo === t),
      ),
      engine.activeSteps(journey.answers).map((s) => s.titulo),
    )
    await page.screenshot({ path: `${output}/admin-${mode}-respostas.png`, fullPage: true })
    await page.keyboard.press('Escape')
    await page.getByPlaceholder(/Buscar/).fill(`${run} HISTORICO`)
    await page.getByRole('cell', { name: `${run} HISTORICO ${mode}`, exact: true }).click()
    await modal.waitFor()
    assert.match(await modal.innerText(), /quiz anterior/)
    assert.doesNotMatch(await modal.innerText(), /cena: B/)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Métricas', exact: true }).click()
    await page.getByLabel('Ambiente').selectOption('development')
    await page.getByLabel('Origem (UTM)').fill(source)
    const measured = page.waitForResponse(
      (r) =>
        r.url().includes('/api/admin/analytics?') && r.url().includes(`source=${source}`) && r.ok(),
    )
    await page.getByLabel('Origem (UTM)').press('Tab')
    const report: AnalyticsReport = await (await measured).json()
    const quiz = report.quizzes.find((q) => q.definition.version === ADULT_ENGINES[mode].version)
    assert.ok(quiz, 'Actual views and answers must reach admin analytics')
    for (const key of new Set(journeys.filter((j) => j.mode === mode).flatMap((j) => j.keys))) {
      const counts = quiz.questions.find((q) => q.id === key)
      assert.ok(
        counts && counts.viewed >= 1 && counts.answered >= 1,
        `${mode}/${key}: viewed and answered`,
      )
    }
    for (const q of quiz.definition.questions) assert.equal(q.position, q.displayPosition)
    await page
      .getByRole('heading', { name: 'Quizzes por produto e versão' })
      .scrollIntoViewIfNeeded()
    await page.screenshot({ path: `${output}/admin-${mode}-metricas.png`, fullPage: true })
  }
  assert.deepEqual(errors, [])
  const report = {
    walks,
    edits,
    zooms,
    approvedResults: samples.length,
    layouts: layouts.length,
    admin: ['Respostas', 'Performance', 'Perfis', 'Métricas'],
    realLocalDatabase: true,
    errors,
  }
  await writeFile(`${output}/verification.json`, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true })
  await writeFile(
    `${output}/failure.txt`,
    `${String(error)}\n${await page.locator('body').innerText()}`,
  )
  throw error
} finally {
  await browser.close()
  app.kill()
  gateway.closeAllConnections()
  gateway.close()
  await closeDb()
  await writeFile(`${output}/server.log`, serverLog)
  await writeFile(`${output}/analytics-network.json`, JSON.stringify(analyticsNetwork, null, 2))
}
