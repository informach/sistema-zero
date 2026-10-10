import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(path.resolve('packages/studio/package.json'))
const { chromium } = require('@playwright/test')
const work = path.resolve('output/instagram/projetos/2026-10-09')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 768 } })
const report = fs.existsSync(path.join(work, 'partidas.json'))
  ? JSON.parse(fs.readFileSync(path.join(work, 'partidas.json'), 'utf8'))
  : {}
try {
  const p = await context.newPage()
  p.setDefaultTimeout(12000)
  await p.addInitScript(() => {
    window.captureFreeze = false
    window.capturePending = []
    const raf = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = (callback) =>
      raf((t) => {
        if (window.captureFreeze) window.capturePending.push(callback)
        else callback(t)
      })
    window.resumeCapture = () => {
      window.captureFreeze = false
      const pending = window.capturePending.splice(0)
      for (const callback of pending) window.requestAnimationFrame(callback)
    }
    let api
    Object.defineProperty(window, 'SZGame2D', {
      configurable: true,
      get: () => api,
      set(value) {
        api = value
        window.actors = []
        window.groups = []
        window.gameScore = 0
        for (const name of ['createShip', 'createDino']) {
          const fn = api[name]
          api[name] = (...args) => {
            const s = fn(...args)
            window.actors.push(s)
            return s
          }
        }
        const group = api.createGroup
        api.createGroup = (...args) => {
          const g = group(...args)
          window.groups.push(g)
          return g
        }
        const score = api.drawScore
        api.drawScore = (...args) => {
          window.gameScore = args[2]
          return score(...args)
        }
      },
    })
  })
  const wait = async (condition, ms = 12000) => {
    const end = Date.now() + ms
    while (Date.now() < end) {
      if (await p.evaluate(condition)) return
      await p.waitForTimeout(35)
    }
    throw Error(`Não alcançado: ${condition}`)
  }
  if (process.argv[2] !== 'dino') {
    await p.goto(pathToFileURL(path.join(work, 'jogos/nave.html')).href, {
      waitUntil: 'domcontentloaded',
    })
    await wait(() => window.actors?.length === 1 && SZGame2D.sceneIs('inicio'))
    console.log('Nave carregada; iniciando partida.')
    await p.keyboard.press('Enter')
    await p.evaluate(() => {
      window.autoEnabled = true
      let n = 0
      const key = (code, type) =>
        window.dispatchEvent(
          new KeyboardEvent(type, { key: code === 'Space' ? ' ' : code, code, bubbles: true }),
        )
      window.pilot = setInterval(() => {
        if (!window.autoEnabled || window.captureFreeze || !SZGame2D.sceneIs('jogando')) return
        const ship = window.actors[0],
          targets = window.groups[1].items
            .filter((s) => s.y > -10 && s.y < 400)
            .sort((a, b) => b.y - a.y)
        const target = targets[0]
        if (target) {
          const dx = target.x + target.w / 2 - (ship.x + ship.w / 2)
          key('ArrowLeft', dx < -5 ? 'keydown' : 'keyup')
          key('ArrowRight', dx > 5 ? 'keydown' : 'keyup')
        } else {
          key('ArrowLeft', 'keyup')
          key('ArrowRight', 'keyup')
        }
        if (++n % 4 === 0) {
          key('Space', 'keyup')
          key('Space', 'keydown')
        }
      }, 20)
    })
    await wait(
      () =>
        window.gameScore >= 3 &&
        window.groups[1].items.some((s) => s.y > 50 && s.y < 310) &&
        window.groups[0].items.some((s) => s.y > 60 && s.y < 350),
      45000,
    )
    await p.evaluate(() => {
      window.captureFreeze = true
    })
    await p.waitForTimeout(70)
    report.naveAction = await p.evaluate(() => ({
      score: gameScore,
      health: actors[0].health,
      asteroids: groups[1].items.length,
      shots: groups[0].items.length,
    }))
    await p
      .locator('canvas')
      .first()
      .screenshot({ path: path.join(work, 'capturas/nave-andamento.png'), scale: 'css' })
    console.log(JSON.stringify({ naveAction: report.naveAction }))
    await p.evaluate(() => window.resumeCapture())
    await wait(() => SZGame2D.sceneIs('vitoria') || SZGame2D.sceneIs('fim'), 85000)
    if (!(await p.evaluate(() => SZGame2D.sceneIs('vitoria'))))
      throw Error(`Partida da Nave terminou sem vitória: ${await p.evaluate(() => gameScore)}`)
    await p.evaluate(() => {
      window.autoEnabled = false
      clearInterval(window.pilot)
    })
    await p.waitForTimeout(150)
    await p
      .locator('canvas')
      .first()
      .screenshot({ path: path.join(work, 'capturas/nave-final.png'), scale: 'css' })
    report.naveFinal = await p.evaluate(() => ({
      score: gameScore,
      won: SZGame2D.sceneIs('vitoria'),
    }))
    console.log(JSON.stringify({ naveFinal: report.naveFinal }))
    fs.writeFileSync(path.join(work, 'partidas.json'), JSON.stringify(report, null, 2))
  }
  await p.setViewportSize({ width: 1280, height: 720 })
  await p.goto(pathToFileURL(path.join(work, 'jogos/dino.html')).href, {
    waitUntil: 'domcontentloaded',
  })
  await wait(() => window.actors?.length === 1 && SZGame2D.sceneIs('inicio'))
  await p.keyboard.press('Enter')
  await wait(() => groups[0].items.some((s) => s.x < 255 && s.x > 190))
  await p.keyboard.press('Space', { delay: 110 })
  await wait(() => actors[0].y < 120 && groups[0].items.some((s) => s.x < 170 && s.x > 95))
  await p.evaluate(() => {
    window.captureFreeze = true
  })
  await p.waitForTimeout(70)
  report.dinoAction = await p.evaluate(() => ({
    score: gameScore,
    dinoY: actors[0].y,
    cactus: groups[0].items.map((s) => ({ x: s.x, y: s.y })),
  }))
  await p
    .locator('canvas')
    .first()
    .screenshot({ path: path.join(work, 'capturas/dino-andamento.png'), scale: 'css' })
  await p.evaluate(() => window.resumeCapture())
  await wait(() => SZGame2D.sceneIs('fim'), 20000)
  await p.waitForTimeout(250)
  await p
    .locator('canvas')
    .first()
    .screenshot({ path: path.join(work, 'capturas/dino-final.png'), scale: 'css' })
  report.dinoFinal = await p.evaluate(() => ({
    score: gameScore,
    finished: SZGame2D.sceneIs('fim'),
  }))
  fs.writeFileSync(path.join(work, 'partidas.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
} finally {
  await browser.close()
}
