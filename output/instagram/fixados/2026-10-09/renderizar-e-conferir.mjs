import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(path.resolve('packages/studio/package.json'))
const { chromium } = require('@playwright/test')
const work = path.resolve('output/instagram/fixados/2026-10-09')
const manifest = JSON.parse(fs.readFileSync(path.join(work, 'manifesto.json'), 'utf8'))
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 1500 },
    deviceScaleFactor: 1,
  })
  await page.goto(pathToFileURL(path.join(work, 'montagem.html')).href)
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map((i) => i.decode()))
  })
  const checks = await page.evaluate(() => {
    const data = JSON.parse(document.querySelector('#data').textContent),
      norm = (t) => t.replace(/\s+/g, ' ').trim()
    return data.carousels.flatMap((c) =>
      c.slides.map((s, i) => {
        const id = c.id + '-' + String(i + 1).padStart(2, '0'),
          e = document.getElementById(id),
          rect = e.getBoundingClientRect(),
          content = e.querySelector('.content')
        const box = (el) => {
          const r = el.getBoundingClientRect()
          return {
            x: r.x - rect.x,
            y: r.y - rect.y,
            width: r.width,
            height: r.height,
            right: r.right - rect.x,
            bottom: r.bottom - rect.y,
          }
        }
        const parts = [...content.children].map((el) => ({ class: el.className, ...box(el) })),
          footer = box(e.querySelector('.footer'))
        const visual = parts.find((p) => p.class.includes('visual'))
        const tests = {
          noDemoLabel: !e.querySelector('.demo') && !e.innerText.includes('Demonstração da equipe'),
          dimensions: rect.width === 1080 && rect.height === 1350,
          title: norm(e.querySelector('.title').innerText) === norm(s.title),
          copy: norm(e.querySelector('.copy').innerText) === norm(s.body.join(' ')),
          role: !s.role || e.querySelector('.role').textContent === s.role,
          images: [...e.querySelectorAll('img')].every((i) => i.complete && i.naturalWidth > 0),
          inside: parts.every((p) => p.x >= 60 && p.right <= 1020 && p.bottom <= 1230),
          separation: parts.every((p, i) => i === 0 || p.y >= parts[i - 1].bottom + 7),
          footerClear: parts.at(-1).bottom + 25 < footer.y,
          legibleMedia: !visual || visual.height >= (s.type === 'student' ? 600 : 240),
          noTextOverflow: [
            ...e.querySelectorAll('.title,.copy,.feature-main,.feature-label,.cta'),
          ].every(
            (el) => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1,
          ),
        }
        const overflow = [...e.querySelectorAll('.title,.copy,.feature-main,.feature-label,.cta')]
          .filter(
            (el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1,
          )
          .map((el) => ({
            class: el.className,
            width: el.clientWidth,
            scrollWidth: el.scrollWidth,
            height: el.clientHeight,
            scrollHeight: el.scrollHeight,
          }))
        return {
          id,
          type: s.type,
          passed: Object.values(tests).every(Boolean),
          tests,
          parts,
          footer,
          overflow,
        }
      }),
    )
  })
  for (const c of manifest.carousels) {
    const folder = path.join(work, 'finais', c.slug)
    fs.mkdirSync(folder, { recursive: true })
    for (const [i, s] of c.slides.entries())
      await page
        .locator('#' + c.id + '-' + String(i + 1).padStart(2, '0'))
        .screenshot({ path: path.join(folder, s.file), scale: 'css' })
    const contact = `<!doctype html><meta charset="utf-8"><style>body{margin:20px;background:#dce4ee;display:grid;grid-template-columns:repeat(3,324px);gap:18px;font:17px Arial}figure{margin:0}img{display:block;width:324px;height:405px}figcaption{padding:8px 0}</style>${c.slides.map((s, i) => `<figure><img src="finais/${c.slug}/${s.file}"><figcaption>${c.id} · ${i + 1}/${c.slides.length}</figcaption></figure>`).join('')}`
    fs.writeFileSync(path.join(work, `conferencia-${c.id}.html`), contact)
  }
  const report = {
    passed: checks.length === 24 && checks.every((s) => s.passed),
    slides: checks.length,
    format: '1080x1350',
    checks,
  }
  fs.writeFileSync(path.join(work, 'verificacao-layout.json'), JSON.stringify(report, null, 2))
  await page.setViewportSize({ width: 1050, height: 1450 })
  for (const c of manifest.carousels) {
    await page.goto(pathToFileURL(path.join(work, `conferencia-${c.id}.html`)).href)
    await page.evaluate(async () => {
      await Promise.all([...document.images].map((i) => i.decode()))
    })
    await page.screenshot({ path: path.join(work, `conferencia-${c.id}.png`), fullPage: true })
  }
  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        slides: checks.length,
        failed: checks
          .filter((s) => !s.passed)
          .map((s) => ({
            id: s.id,
            tests: Object.entries(s.tests)
              .filter(([, v]) => !v)
              .map(([k]) => k),
            overflow: s.overflow,
          })),
      },
      null,
      2,
    ),
  )
  if (!report.passed) process.exitCode = 1
} finally {
  await browser.close()
}
