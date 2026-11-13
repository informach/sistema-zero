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
import { KIDS_ENGINES } from '../../src/funnels/kids-vida/engine'
import type { KidsMode } from '../../src/funnels/kids-vida/types'
import samples from '../fixtures/kids-vida-approved.json'
import { kidsJourney } from '../helpers/kids-vida'

const database = new URL(process.env.DATABASE_URL!)
assert.ok(['localhost', '127.0.0.1'].includes(database.hostname))
assert.ok(database.pathname.startsWith('/sz_quiz_vida_'), 'Use an isolated quiz QA database')
const output = resolve('../../.cache/quizzes-vida-browser')
const run = `QA ${crypto.randomUUID()}`
const source = `qa-vida-${crypto.randomUUID()}`
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
const path = (mode: KidsMode) =>
  `/kids/${mode === 'desafio' ? 'desafio-primeiro-jogo' : 'comunidade-dos-criadores'}`
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
async function loadResultImage(page: Page) {
  const img = page.locator('.rc-tela-vida img')
  await img.scrollIntoViewIfNeeded()
  await img.evaluate(async (image) => {
    await (image as HTMLImageElement).decode()
  })
  assert.ok(await img.evaluate((image) => (image as HTMLImageElement).naturalWidth > 0))
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
      ready = (await fetch(`${base}/kids/desafio-primeiro-jogo/quiz`)).ok
    } catch {}
    if (ready) break
    await new Promise((r) => setTimeout(r, 100))
  }
  assert.ok(ready, 'Local app did not start')
  let walks = 0
  for (const mode of ['desafio', 'comunidade'] as KidsMode[])
    for (const age of ['m9', '9a12', '13a17']) {
      await context.setExtraHTTPHeaders({ 'x-forwarded-for': `198.19.0.${walks + 1}` })
      await context.clearCookies()
      await page.goto(
        `${base}${path(mode)}/quiz?utm_source=${source}&event_code=QA_VIDA&cupom=QA50`,
      )
      const journey = kidsJourney(mode, {
        idade: age,
        genero: 'filha',
        cena: 'erro',
        prioridade: 'expressar',
      })
      let state = {}
      for (const [i, response] of journey.responses.entries()) {
        const step = KIDS_ENGINES[mode].activeSteps(state).find((s) => s.key === response.key)!
        await page.locator(`[data-analytics-question="${step.key}"]`).waitFor()
        const shown = KIDS_ENGINES[mode].stepOnScreen(step, state)
        const button =
          i === 0
            ? page.getByRole('button', {
                name: shown.opcoes.find((o) => o.value === response.value)!.label,
                exact: true,
              })
            : page
                .locator('.qz-opcoes button')
                .nth(shown.opcoes.findIndex((o) => o.value === response.value))
        if (i > 0)
          assert.equal(
            (await page.locator('.qz-progresso-linha > span').first().textContent())?.trim(),
            `${i} de 10`,
          )
        assert.doesNotMatch(
          await page.locator('main').innerText(),
          /Chave do Farol|Desafio do Primeiro Jogo|Comunidade dos Criadores|treinamento|aulas gravadas|R\$/i,
        )
        await layout(page, 320)
        await layout(page, 390)
        if (i === 0)
          await page.waitForFunction(
            (el) => el && !(el as HTMLButtonElement).disabled,
            await button.elementHandle(),
          )
        const [responseBody] = await Promise.all([
          page.waitForResponse(
            (r) => r.url().endsWith('/api/leads') && r.request().method() === 'PATCH',
          ),
          i === 0 ? button.press('Enter') : button.click(),
        ])
        assert.equal(responseBody.status(), 200)
        if (i < 10) state = (await responseBody.json()).answers
      }
      await page.waitForURL('**/resultado?**')
      assert.equal(await page.locator('.rc-leitura h2').count(), 3)
      const offer = new URL(
        (await page.locator('[data-quiz-offer]').getAttribute('href')) ?? '',
        base,
      )
      assert.equal(
        offer.pathname,
        path(mode) + '/oferta' + (age === 'm9' && mode === 'comunidade' ? '/criar-junto' : ''),
      )
      assert.equal(offer.searchParams.get('utm_source'), source)
      assert.equal(offer.searchParams.get('event_code'), 'QA_VIDA')
      assert.equal(offer.searchParams.get('cupom'), 'QA50')
      await loadResultImage(page)
      await page.screenshot({ path: `${output}/${mode}-${age}.png`, fullPage: true })
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%'
      })
      await layout(page, 390)
      await page.evaluate(() => {
        document.documentElement.style.fontSize = ''
      })
      // Same result revision can be reviewed and resumed through the production state machine.
      await page.getByRole('link', { name: 'Rever as respostas', exact: true }).click()
      await page.getByRole('heading', { name: 'Suas respostas' }).waitFor()
      assert.equal(await page.locator('.qz-revisao li').count(), 11)
      await page.getByRole('link', { name: 'Voltar ao resultado' }).click()
      await page.locator('.rc-leitura').waitFor()
      await page.locator('[data-offer-zoom]').click()
      const dialog = page.locator('[data-offer-image-dialog]')
      await dialog.waitFor({ state: 'visible' })
      const box = await dialog.boundingBox()
      assert.ok(box)
      assert.ok(Math.abs(box.x + box.width / 2 - 195) < 3)
      await page.keyboard.press('Escape')
      assert.equal(await dialog.isVisible(), false)
      walks++
    }
  // Each approved result is rendered by SSR from answers saved by the actual API.
  await context.addCookies([{ name: 'sz_metrics', value: 'rejected', url: base }])
  for (const [sampleIndex, sample] of samples.entries()) {
    await context.setExtraHTTPHeaders({ 'x-forwarded-for': `198.18.0.${sampleIndex + 1}` })
    const mode = sample.mode as KidsMode,
      journey = kidsJourney(mode, sample.answers)
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
    await repo.updateLead(session.id, { nome: `${run} ${mode} ${sample.key}` })
    await page.goto(`${base}${path(mode)}/resultado`)
    await loadResultImage(page)
    assert.equal(await page.locator('.rc-leitura h2').count(), 3)
    assert.equal(await page.locator('.rc-lista-exemplos > li').count(), 2)
    assert.equal(await page.locator('.rc-lista-requisitos > li').count(), 3)
    assert.doesNotMatch(
      await page.locator('main').innerText(),
      /undefined|NaN|você (escolheu|contou|reconheceu)/i,
    )
    for (const width of [320, 390, 768, 1440]) {
      await layout(page, width)
      layouts.push({ mode, sample: sample.key, width })
    }
    if (sample.key === 'professor' || sample.key === '9a12-planejar') {
      await layout(page, 390)
      await page.screenshot({ path: `${output}/${mode}-${sample.key}.png`, fullPage: true })
    }
  }
  for (const product of ['desafio-primeiro-jogo', 'comunidade-dos-criadores']) {
    await page.goto(`${base}/pro/${product}/quiz`)
    await page.locator('astro-island:not([ssr])').first().waitFor()
    assert.ok((await page.locator('main button').count()) > 0)
    assert.equal(await page.locator('.rc--vida').count(), 0)
    await layout(page, 390)
  }
  // Historical synthetic leads exercise the actual admin labels beside the current records.
  for (const mode of ['desafio', 'comunidade'] as KidsMode[]) {
    const old = await repo.createLead(path(mode).slice(1))
    await repo.updateLead(old.id, {
      nome: `${run} HISTORICO ${mode}`,
      perfilResultado: 'm9-ideias',
      quizAnswers: {
        _quiz_version: mode === 'desafio' ? 'desafio-farol-v5' : 'comunidade-orientacao-v6',
        genero: 'filha',
        idade: 'menos_9',
        m9_cena: 'B',
      },
    })
  }
  await context.addCookies([{ name: 'admin_access', value: token, url: base, httpOnly: true }])
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(`${base}/admin`)
  await page.locator('astro-island[component-url*="AdminDashboard"]:not([ssr])').waitFor()
  for (const mode of ['desafio', 'comunidade'] as KidsMode[]) {
    await page.getByLabel('Filtrar por funil').selectOption(path(mode).slice(1))
    await page.getByRole('button', { name: 'Performance', exact: true }).click()
    await page.getByLabel(/Só quem abriu o quiz atual/).waitFor()
    assert.equal(await page.getByLabel(/Só quem abriu o quiz atual/).isChecked(), true)
    await page.getByText('Pergunta 10 · O que precisa conferir', { exact: true }).first().waitFor()
    assert.equal(
      await page.getByText('Pergunta 10 · O que precisa conferir', { exact: true }).count(),
      3,
    )
    await page.screenshot({ path: `${output}/admin-${mode}-performance.png`, fullPage: true })
    await page.getByRole('button', { name: 'Perfis', exact: true }).click()
    await page.getByText('Comunicação · De 13 a 17 anos', { exact: true }).waitFor()
    assert.equal(await page.getByText(/\(quiz anterior\)/).count(), 0)
    await page.getByLabel(/Só quem abriu o quiz atual/).uncheck()
    await page
      .getByText(/\(quiz anterior\)/)
      .first()
      .waitFor()
    await page.screenshot({ path: `${output}/admin-${mode}-perfis.png`, fullPage: true })
    await page.getByRole('button', { name: 'Respostas', exact: true }).click()
    await page.getByPlaceholder(/Buscar/).fill(`${run} ${mode} 13a17`)
    await page.getByRole('cell', { name: `${run} ${mode} 13a17-expressar`, exact: true }).click()
    await page.getByRole('dialog').waitFor()
    assert.match(await page.getByRole('dialog').innerText(), /Comunicação/)
    assert.match(await page.getByRole('dialog').innerText(), /Como essas habilidades aparecem/)
    const questions = await page.getByRole('dialog').locator('dt').allTextContents()
    assert.ok(
      questions.findIndex((t) => t.includes('Qual é a idade')) <
        questions.findIndex((t) => t.includes('Quando tem um tempo livre')),
    )
    assert.ok(
      questions.findIndex((t) => t.includes('Quando tem um tempo livre')) <
        questions.findIndex((t) => t.includes('Como essas habilidades aparecem')),
    )
    await page.screenshot({ path: `${output}/admin-${mode}-respostas.png`, fullPage: true })
    await page.keyboard.press('Escape')
    await page.getByPlaceholder(/Buscar/).fill(`${run} HISTORICO`)
    await page.getByRole('cell', { name: `${run} HISTORICO ${mode}`, exact: true }).click()
    await page.getByRole('dialog').waitFor()
    assert.match(await page.getByRole('dialog').innerText(), /quiz anterior/)
    assert.doesNotMatch(await page.getByRole('dialog').innerText(), /m9_cena/)
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
    const measuredQuiz = report.quizzes.find(
      (q) => q.definition.version === KIDS_ENGINES[mode].version,
    )
    assert.ok(measuredQuiz, 'Actual browser views must be present in the admin report')
    for (const age of ['m9', '9a12', '13a17']) {
      const journey = kidsJourney(mode, {
        idade: age,
        genero: 'filha',
        cena: 'erro',
        prioridade: 'expressar',
      })
      for (const { key } of journey.responses) {
        const counts = measuredQuiz.questions.find((q) => q.id === key)
        assert.ok(
          counts && counts.viewed >= 1 && counts.answered >= 1,
          `${mode}/${key}: measured view and server answer`,
        )
      }
    }
    assert.equal(
      measuredQuiz.definition.questions.find((q) => q.id === 'genero')?.displayPosition,
      0,
    )
    assert.equal(
      measuredQuiz.definition.questions.find((q) => q.id === 'vida_13a17_condicao')
        ?.displayPosition,
      10,
    )
    await page
      .getByRole('heading', { name: 'Quizzes por produto e versão' })
      .scrollIntoViewIfNeeded()
    await page.screenshot({ path: `${output}/admin-${mode}-metricas.png`, fullPage: true })
  }
  assert.deepEqual(errors, [])
  const report = {
    walks,
    approvedResults: 58,
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
    String(error) + '\n' + (await page.locator('body').innerText()),
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
