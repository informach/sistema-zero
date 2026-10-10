import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(path.resolve('packages/studio/package.json'))
const { chromium } = require('@playwright/test')
const work = path.resolve('output/instagram/alunos/2026-10-09')
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
    const data = JSON.parse(document.querySelector('#story-data').textContent),
      normalize = (t) => t.replace(/\s+/g, ' ').trim()
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
      const title = box(s.kind === 'student' ? '.author' : '.title'),
        copy = box('.copy'),
        footer = box('.footer'),
        visual = box('.visual'),
        link = box('.link-slot')
      const checks = {
        copyMatches: normalize(e.querySelector('.copy').innerText) === normalize(s.copy),
        dimensions: origin.width === 1080 && origin.height === 1920,
        titleClear: !visual || title.bottom + 25 < visual.y,
        visualBeforeCopy: !visual || visual.bottom + 20 < copy.y,
        copyBeforeFooter: copy.bottom + 35 < footer.y,
        stickerClear: !link || (copy.bottom + 25 < link.y && link.bottom + 35 < footer.y),
        insideBounds: copy.right <= 1002 && footer.bottom < 1830,
        imagesLoaded: [...e.querySelectorAll('img')].every((i) => i.complete && i.naturalWidth > 0),
        videoAreaClear:
          s.kind !== 'student' ||
          (title.bottom + 20 < data.videoWindow.y &&
            data.videoWindow.y + data.videoWindow.height + 30 < copy.y),
      }
      return {
        id: s.id,
        kind: s.kind,
        checks,
        title,
        copy,
        footer,
        visual,
        link,
        passed: Object.values(checks).every(Boolean),
      }
    })
  })
  for (const s of manifest.stories) {
    const dest = path.join(work, 'finais-ampliados', s.file)
    await p.locator('#' + s.id).screenshot({ path: dest, scale: 'css' })
    if (s.kind === 'student') {
      const overlay = path.join(work, 'molduras-ampliadas', s.overlayFile)
      await p.locator('#' + s.id + ' .visual').evaluate((e) => (e.style.visibility = 'hidden'))
      await p.locator('#' + s.id).screenshot({ path: overlay, scale: 'css', omitBackground: true })
      await p.locator('#' + s.id + ' .visual').evaluate((e) => (e.style.visibility = ''))
      const imageData = 'data:image/png;base64,' + fs.readFileSync(overlay).toString('base64')
      const alpha = await p.evaluate(async (url) => {
        const img = new Image()
        img.src = url
        await img.decode()
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const sample = (x, y) => ctx.getImageData(x, y, 1, 1).data[3]
        return { center: sample(540, 950), header: sample(40, 100), footer: sample(40, 1700) }
      }, imageData)
      const report = stories.find((v) => v.id === s.id)
      report.alpha = alpha
      report.passed &&= alpha.center === 0 && alpha.header === 255 && alpha.footer === 255
    }
  }
  const report = {
    passed: stories.length === 7 && stories.every((s) => s.passed),
    completeImages: 7,
    provisionalGeneratedScenes: 5,
    videoOverlays: 5,
    stories,
  }
  fs.writeFileSync(path.join(work, 'verificacao-layout.json'), JSON.stringify(report, null, 2))
  const contact = `<!doctype html><meta charset="utf-8"><style>body{margin:20px;background:#dce4ee;display:grid;grid-template-columns:repeat(3,324px);gap:20px;font:18px Arial}figure{margin:0}img{width:324px;display:block}figcaption{padding:7px 0}</style>${manifest.stories.map((s) => `<figure><img src="finais-ampliados/${s.file}"><figcaption>${s.id}${s.name ? ' · ' + s.name : ''}</figcaption></figure>`).join('')}`
  fs.writeFileSync(path.join(work, 'conferencia.html'), contact)
  await p.setViewportSize({ width: 1060, height: 1400 })
  await p.goto(pathToFileURL(path.join(work, 'conferencia.html')).href)
  await p.evaluate(async () => {
    await Promise.all([...document.images].map((i) => i.decode()))
  })
  await p.screenshot({
    path: path.join(work, 'conferencia-ampliada.png'),
    fullPage: true,
    scale: 'css',
  })
  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        stories: stories.map((s) => ({
          id: s.id,
          passed: s.passed,
          failed: Object.entries(s.checks)
            .filter(([k, v]) => !v)
            .map(([k]) => k),
          titleBottom: s.title.bottom,
          copyBottom: s.copy.bottom,
          visualBottom: s.visual?.bottom,
          stickerY: s.link?.y,
          alpha: s.alpha,
        })),
      },
      null,
      2,
    ),
  )
} finally {
  await browser.close()
}
