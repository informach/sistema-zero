import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(path.resolve('packages/studio/package.json'))
const { chromium } = require('@playwright/test')
const work = path.resolve('output/instagram/avaliacoes/2026-10-09')
const manifest = JSON.parse(fs.readFileSync(path.join(work, 'manifesto.json'), 'utf8'))
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 2000 },
    deviceScaleFactor: 1,
  })
  await page.goto(pathToFileURL(path.join(work, 'montagem.html')).href)
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map((i) => i.decode()))
  })
  const checks = await page.evaluate(
    (stories) =>
      stories.map((s) => {
        const e = document.getElementById(s.id),
          r = e.getBoundingClientRect(),
          norm = (t) => t.replace(/\s+/g, ' ').trim()
        const box = (el) => {
          const a = el.getBoundingClientRect()
          return {
            x: a.x - r.x,
            y: a.y - r.y,
            width: a.width,
            height: a.height,
            right: a.right - r.x,
            bottom: a.bottom - r.y,
          }
        }
        const checked = [...e.querySelectorAll('[data-check]')].map((el) => ({
          text: el.innerText,
          ...box(el),
        }))
        const quote = e.querySelector('blockquote'),
          card = e.querySelector('.quote-card'),
          intro = e.querySelector('.intro-card'),
          voices = e.querySelector('.voices')
        const open = e.querySelector('.quote-open'),
          close = e.querySelector('.quote-close')
        const tests = {
          dimensions: r.width === 1080 && r.height === 1920,
          inside: checked.every(
            (b) => b.x >= 50 && b.right <= 1030 && b.y >= 150 && b.bottom < 1790,
          ),
          images: [...e.querySelectorAll('img')].every((i) => i.complete && i.naturalWidth > 0),
          quote: !quote || norm(quote.innerText) === norm(s.quote),
          quoteFits:
            !quote ||
            (box(quote).bottom < box(card).bottom - 45 && box(quote).y > box(card).y + 160),
          author: !s.name || norm(e.querySelector('.author h1').textContent) === s.name,
          role: !s.role || e.querySelector('.role').textContent === s.role,
          faces: s.type !== 'intro' || e.querySelectorAll('.face').length === 8,
          introGap:
            !intro ||
            (box(voices).bottom + 30 <= box(intro).y &&
              box(intro).bottom + 35 < box(e.querySelector('.footer')).y),
          noTextOverflow: [...e.querySelectorAll('[data-check]')].every(
            (el) => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1,
          ),
        }
        if (quote) {
          tests.cleanQuote = !/[[\]…]|\.{3}/.test(quote.innerText)
          tests.styledQuotes =
            !!open &&
            !!close &&
            open.textContent === '“' &&
            close.textContent === '”' &&
            ['color', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight'].every(
              (key) => getComputedStyle(open)[key] === getComputedStyle(close)[key],
            )
          tests.noInlineClosingQuote = ['none', 'normal', ''].includes(
            getComputedStyle(quote, '::after').content,
          )
          tests.quoteDecorationSpace =
            !!open &&
            !!close &&
            box(open).bottom + 14 <= box(quote).y &&
            box(quote).bottom + 24 <= box(close).y &&
            box(close).bottom <= box(card).bottom - 18
        }
        return { id: s.id, passed: Object.values(tests).every(Boolean), tests, checked }
      }),
    manifest.stories,
  )
  for (const s of manifest.stories)
    await page
      .locator('#' + s.id)
      .screenshot({ path: path.join(work, 'finais-beneficios', s.file), scale: 'css' })
  const contact = `<!doctype html><meta charset="utf-8"><style>body{margin:20px;background:#dce4ee;display:grid;grid-template-columns:repeat(4,270px);gap:18px;font:17px Arial}figure{margin:0}img{display:block;width:270px;height:480px}figcaption{padding:8px 0}</style>${manifest.stories.map((s, i) => `<figure><img src="finais-beneficios/${s.file}"><figcaption>${i + 1} · ${s.name ?? s.id}</figcaption></figure>`).join('')}`
  fs.writeFileSync(path.join(work, 'conferencia-beneficios.html'), contact)
  const quotes = manifest.stories.filter((s) => s.type === 'quote')
  const sequence =
    quotes.length === 10 &&
    quotes.every((s, i) =>
      i % 2 === 0
        ? ['Aluno', 'Aluna'].includes(s.role)
        : ['Pai do Rafael', 'Pai do Jeffrey', 'Mãe do Fernando'].includes(s.role),
    )
  const report = {
    passed: checks.length === 12 && checks.every((s) => s.passed) && sequence,
    stories: checks.length,
    alternatingChildrenParents: sequence,
    format: '1080x1920',
    checks,
  }
  fs.writeFileSync(path.join(work, 'verificacao-layout.json'), JSON.stringify(report, null, 2))
  await page.setViewportSize({ width: 1200, height: 1560 })
  await page.goto(pathToFileURL(path.join(work, 'conferencia-beneficios.html')).href)
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((i) => i.decode()))
  })
  await page.screenshot({ path: path.join(work, 'conferencia-beneficios.png'), fullPage: true })
  console.log(
    JSON.stringify(
      { passed: report.passed, stories: checks.length, failed: checks.filter((s) => !s.passed) },
      null,
      2,
    ),
  )
  if (!report.passed) process.exitCode = 1
} finally {
  await browser.close()
}
