import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(path.resolve('packages/studio/package.json'))
const { chromium } = require('@playwright/test')
const work = path.resolve('output/instagram/projetos/2026-10-09')
const manifest = JSON.parse(fs.readFileSync(path.join(work, 'manifesto.json'), 'utf8'))
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const p = await browser.newPage({ viewport: { width: 1200, height: 2100 }, deviceScaleFactor: 1 })
  await p.goto(pathToFileURL(path.join(work, 'montagem.html')).href)
  await p.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map((i) => i.decode()))
  })
  const stories = await p.evaluate(() => {
    const data = JSON.parse(document.querySelector('#story-data').textContent)
    const normalize = (t) => t.replace(/\s+/g, ' ').trim()
    return data.stories.map((s) => {
      const e = document.getElementById(s.id),
        origin = e.getBoundingClientRect()
      const box = (selector) => {
        const r = e.querySelector(selector)?.getBoundingClientRect()
        return r
          ? {
              x: r.x - origin.x,
              y: r.y - origin.y,
              width: r.width,
              height: r.height,
              bottom: r.bottom - origin.y,
              right: r.right - origin.x,
            }
          : null
      }
      const heading = box('.heading'),
        visual = box('.visual'),
        copy = box('.copy'),
        footer = box('.footer'),
        link = box('.link-slot')
      const images = [...e.querySelectorAll('img')]
      const checks = {
        copyMatches: normalize(e.querySelector('.copy').innerText) === normalize(s.copy),
        titleMatches:
          normalize(e.querySelector('h1').innerText) === normalize(s.project) &&
          normalize(e.querySelector('h2').innerText) === normalize(s.subtitle),
        dimensions: origin.width === 1080 && origin.height === 1920,
        imagesLoaded: images.every((i) => i.complete && i.naturalWidth > 0),
        naturalProportions: images.every(
          (i) => Math.abs(i.width / i.height - i.naturalWidth / i.naturalHeight) < 0.012,
        ),
        headingBeforeVisual: heading.bottom + 12 < visual.y,
        visualBeforeCopy: visual.bottom + 15 < copy.y,
        copyBeforeFooter: copy.bottom + 25 < footer.y,
        stickerClear: !link || (copy.bottom + 20 < link.y && link.bottom + 25 < footer.y),
        insideSafeBounds: heading.y >= 230 && footer.bottom <= 1850 && copy.right < 1010,
        gameFramesEqual: s.kind !== 'game' || Math.abs(images[0].height - images[1].height) < 0.1,
      }
      return {
        id: s.id,
        checks,
        heading,
        visual,
        copy,
        footer,
        link,
        passed: Object.values(checks).every(Boolean),
      }
    })
  })
  for (const s of manifest.stories)
    await p
      .locator('#' + s.id)
      .screenshot({ path: path.join(work, 'finais', s.file), scale: 'css' })
  const report = { passed: stories.length === 8 && stories.every((s) => s.passed), stories }
  fs.writeFileSync(path.join(work, 'verificacao-layout.json'), JSON.stringify(report, null, 2))
  const contact = `<!doctype html><meta charset="utf-8"><style>body{margin:20px;background:#dce4ee;display:grid;grid-template-columns:repeat(4,270px);gap:20px;font:18px Arial}figure{margin:0}img{width:270px;display:block}figcaption{padding:7px 0}</style>${manifest.stories.map((s) => `<figure><img src="finais/${s.file}"><figcaption>${s.id}</figcaption></figure>`).join('')}`
  fs.writeFileSync(path.join(work, 'conferencia.html'), contact)
  await p.setViewportSize({ width: 1180, height: 1100 })
  await p.goto(pathToFileURL(path.join(work, 'conferencia.html')).href)
  await p.evaluate(async () => {
    await Promise.all([...document.images].map((i) => i.decode()))
  })
  await p.screenshot({ path: path.join(work, 'conferencia.png'), fullPage: true, scale: 'css' })
  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        stories: stories.map((s) => ({
          id: s.id,
          passed: s.passed,
          failures: Object.entries(s.checks)
            .filter(([k, v]) => !v)
            .map(([k]) => k),
          headingBottom: s.heading.bottom,
          visual: s.visual,
          copy: s.copy,
          link: s.link,
        })),
      },
      null,
      2,
    ),
  )
} finally {
  await browser.close()
}
