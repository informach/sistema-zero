import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const origin = process.env.ANALYTICS_CAPTURE_URL || 'http://localhost:4321'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Run smoke tests locally')
const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: 'reduce',
})
const page = await context.newPage()
const batches: Array<{ events: Array<Record<string, unknown>> }> = []
const failures: string[] = []
page.on('response', (response) => {
  if (response.url().includes('/api/analytics/') && !response.ok())
    failures.push(`${response.status()} ${new URL(response.url()).pathname}`)
})
page.on('request', (request) => {
  if (request.url().endsWith('/api/analytics/events')) batches.push(request.postDataJSON())
})
try {
  await page.goto(`${origin}/?utm_source=qa_analytics`)
  await page.waitForFunction(() => typeof window.__szAnalyticsSnapshot === 'function')
  assert.equal(batches.length, 0, 'No events before consent')
  assert.equal(
    await page.locator('.bio-avatar').evaluate((img: HTMLImageElement) => img.naturalWidth > 0),
    true,
  )
  await page.getByRole('button', { name: 'Continuar sem métricas' }).click()
  await page.locator('#sz-metrics-notice').waitFor({ state: 'hidden' })
  assert.equal(batches.length, 0, 'Refusal sends no events')
  await mkdir('output/analytics', { recursive: true })
  await page.screenshot({ path: 'output/analytics/bio-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Privacidade', exact: true }).click()
  await page.getByRole('button', { name: 'Permitir métricas' }).click()
  await page.waitForResponse((r) => r.url().endsWith('/api/analytics/events') && r.status() === 200)
  await page.getByRole('link', { name: /Ver como meu filho aprende/ }).click()
  await page.waitForURL('**/como-funciona/**')
  assert.equal(new URL(page.url()).searchParams.get('utm_source'), 'qa_analytics')
  await page.locator('.home-faq summary').first().click()
  await page.locator('.home-faq details[open]').waitFor()
  const spacing = await page.locator('.home-faq details[open]').evaluate((details) => {
    const question = getComputedStyle(details.querySelector('summary')!)
    const answer = getComputedStyle(details.querySelector('.resposta')!)
    return [question.paddingLeft, question.paddingRight, answer.paddingLeft, answer.paddingRight]
  })
  assert.deepEqual(spacing, ['24px', '24px', '24px', '24px'])
  await page.locator('a[data-zoom]').first().click()
  await page.locator('dialog[data-zoom-dialog][open]').waitFor()
  await page.getByRole('button', { name: 'Fechar a imagem ampliada' }).click()
  const before = await page.evaluate(() => window.__szAnalyticsSnapshot!())
  await page.evaluate(() => {
    const section = document.createElement('section')
    section.id = 'qa-dynamic'
    section.innerHTML =
      '<h2>Seção criada durante a visita</h2><button type="button" id="qa-new-button">Abrir novo recurso</button><form><input value="nao-coletar@example.test"><button type="button">Dados privados</button></form>'
    document.querySelector('main')!.append(section)
  })
  await page.locator('#qa-new-button').scrollIntoViewIfNeeded()
  await page.waitForTimeout(1500)
  await page.locator('#qa-new-button').click()
  await page.waitForTimeout(5500)
  const after = await page.evaluate(() => window.__szAnalyticsSnapshot!())
  assert.notEqual(before.revision, after.revision, 'Dynamic content changes the revision')
  assert.ok(
    batches
      .flatMap((b) => b.events)
      .some((e) => e.elementId === 'qa-new-button' && e.name === 'click'),
  )
  assert.ok(batches.flatMap((b) => b.events).some((e) => e.name === 'details_open'))
  assert.ok(!JSON.stringify(batches).includes('nao-coletar@example.test'))
  await page.goto(`${origin}/kids/comunidade-dos-criadores/quiz`)
  const start = page.locator('.cq-intro button.kof-btn')
  await start.waitFor()
  await start.click()
  await page.locator('[data-analytics-question]').waitFor()
  await page.waitForTimeout(5500)
  assert.ok(
    batches
      .flatMap((b) => b.events)
      .some((e) => e.name === 'quiz_question_view' && e.quizDefinitionId && e.quizAttemptId),
  )
  await page.goto(`${origin}/kids/desafio-primeiro-jogo/quiz`)
  const desafioStart = page.locator('.cq-intro button.kof-btn')
  if (await desafioStart.isVisible()) await desafioStart.click()
  await page.locator('[data-analytics-question]').waitFor()
  await page.waitForTimeout(5500)
  const questions = batches.flatMap((b) => b.events).filter((e) => e.name === 'quiz_question_view')
  assert.ok(
    new Set(questions.map((e) => e.quizDefinitionId)).size >= 2,
    'Products have independent quiz definitions',
  )
  assert.ok(
    questions.every((e) => e.label === undefined),
    'No labels from quiz answers',
  )
  await page.getByRole('button', { name: 'Privacidade', exact: true }).click()
  await page.getByRole('button', { name: 'Continuar sem métricas' }).click()
  await page.locator('#sz-metrics-notice').waitFor({ state: 'hidden' })
  assert.ok(
    !(await context.cookies()).some((c) => c.name === 'sz_visitor'),
    'Revocation removes analytical identity',
  )
  assert.equal(
    (
      await context.request.get(`${origin}/api/admin/analytics?from=2026-10-01&to=2026-10-03`)
    ).status(),
    401,
  )
  assert.deepEqual(failures, [])
  console.log(
    JSON.stringify({
      result: 'passed',
      batches: batches.length,
      questions: questions.length,
      coverage: [
        'no-consent',
        'refusal',
        'attribution',
        'FAQ',
        'dynamic-section',
        'version',
        'privacy',
        'both-quizzes',
        'revocation',
        'admin-auth',
      ],
    }),
  )
} finally {
  await context.close()
  await browser.close()
}
