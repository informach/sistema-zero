import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { driveGame } from './gameplay.mjs'

const root = process.cwd(),
  dist = path.join(root, 'dist')
const { templateId } = JSON.parse(
  await fs.readFile(path.join(root, 'validation-options.json'), 'utf8'),
)
const manifest = JSON.parse(await fs.readFile(path.join(root, 'artifact-manifest.json'), 'utf8'))
const origin = 'https://studio-game.invalid',
  parent = 'https://studio-check.invalid'
const types = {
  html: 'text/html',
  js: 'text/javascript',
  mjs: 'text/javascript',
  css: 'text/css',
  json: 'application/json',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  glb: 'model/gltf-binary',
  gltf: 'model/gltf+json',
  woff2: 'font/woff2',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
}
const resources = new Map()
let total = 0
for (const item of manifest.files) {
  if (
    typeof item.path !== 'string' ||
    !item.path.split('/').every((part) => /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(part))
  )
    throw new Error('Arquivo compilado inválido.')
  const bytes = await fs.readFile(path.join(dist, item.path))
  total += bytes.length
  if (
    total > 2_500_000 ||
    resources.size >= 338 ||
    bytes.length !== item.bytes ||
    createHash('sha256').update(bytes).digest('hex') !== item.sha256
  )
    throw new Error('O artefato de teste mudou.')
  resources.set(`/${item.path}`, {
    bytes,
    type: item.contentType ?? types[item.path.split('.').at(-1)] ?? 'application/octet-stream',
  })
}
const errors = [],
  evidence = []
let browser
const deadline = setTimeout(() => {
  console.error('STUDIO_PLAYTEST_TIMEOUT')
  process.exit(1)
}, 115_000)
try {
  browser = await chromium.launch({ headless: true, timeout: 15_000 })
  // The opaque sandbox already forbids service workers. Playwright's 'block' option
  // injects a navigator.serviceWorker getter that itself throws in an opaque frame.
  const context = await browser.newContext({
    viewport: { width: 1060, height: 720 },
    acceptDownloads: false,
  })
  await context.routeWebSocket('**/*', (socket) => socket.close())
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.origin === parent && url.pathname === '/') {
      await route.fulfill({
        contentType: 'text/html',
        headers: {
          'Content-Security-Policy': `default-src 'none'; frame-src ${origin}; style-src 'unsafe-inline'; worker-src 'none'`,
        },
        body: `<html><body style="margin:0"><iframe id="game" sandbox="allow-scripts" style="width:1024px;height:640px;border:0" src="${origin}/index.html"></iframe></body></html>`,
      })
      return
    }
    const file =
      url.origin === origin && ['GET', 'HEAD'].includes(route.request().method())
        ? resources.get(url.pathname)
        : undefined
    if (!file) {
      await route.abort('blockedbyclient')
      return
    }
    await route.fulfill({
      status: 200,
      body: file.bytes,
      headers: {
        'Content-Type': file.type,
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Content-Security-Policy': `default-src 'none'; sandbox allow-scripts; base-uri 'none'; object-src 'none'; form-action 'none'; script-src 'unsafe-inline' 'wasm-unsafe-eval' ${origin}; style-src 'unsafe-inline' ${origin}; img-src data: blob: ${origin}; font-src data: ${origin}; media-src data: blob: ${origin}; connect-src data: blob: ${origin}; worker-src blob: ${origin}; frame-ancestors ${parent}`,
      },
    })
  })
  const page = await context.newPage()
  const record = (text) => {
    if (errors.length < 12) errors.push(text.slice(0, 1000))
  }
  page.on('pageerror', (error) => record(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') record(message.text())
  })
  context.on('page', (popup) => {
    if (popup !== page) {
      record('O jogo tentou abrir outra janela.')
      void popup.close()
    }
  })
  page.on('dialog', (dialog) => {
    record('O jogo abriu um diálogo bloqueante.')
    void dialog.dismiss()
  })
  await page.goto(parent, { waitUntil: 'load', timeout: 15_000 })
  const frame = page.frames().find((candidate) => candidate.url().startsWith(origin))
  if (!frame) throw new Error('O jogo não abriu no isolamento esperado.')
  const isolated = await frame.evaluate(() => {
    let parentBlocked = false,
      workersBlocked = false
    try {
      void parent.document.body
    } catch (error) {
      parentBlocked = error.name === 'SecurityError'
    }
    try {
      void navigator.serviceWorker
    } catch (error) {
      workersBlocked = error.name === 'SecurityError'
    }
    return parentBlocked && workersBlocked && globalThis.origin === 'null'
  })
  if (!isolated)
    throw new Error('O navegador não preservou a origem opaca e o bloqueio de service workers.')
  const kit = [
    'canvas-puzzle',
    'canvas-survival',
    'canvas-grid-arena',
    'phaser-tactics',
    'three-tactics',
    'phaser-arcade',
    'phaser-platformer',
    'three-exploration',
    'three-action',
  ].includes(templateId)
  if (kit) {
    await frame.waitForFunction(
      () =>
        window.__studioGame?.version === 1 &&
        !['loading', 'error'].includes(window.__studioGame.inspect().readiness),
      undefined,
      { timeout: 10_000 },
    )
    await frame.locator('#start').click({ timeout: 10_000 })
    await page
      .locator('#game')
      .screenshot({ path: path.join(dist, '__studio-proof.png'), timeout: 10_000 })
    await frame.locator('#pause').click()
    if ((await frame.evaluate(() => window.__studioGame.inspect())).phase !== 'paused')
      throw new Error('A pausa não interrompeu a partida.')
    await frame.locator('#start').click()
    if (!templateId.startsWith('three-') || templateId === 'three-tactics') {
      const lost = await frame.evaluate(driveGame, {
        id: templateId,
        lose: true,
        timeoutMs: 35_000,
      })
      if (lost.phase !== 'lost')
        throw new Error('Não foi possível verificar a derrota prevista pelo kit.')
      await frame.locator('#restart').click()
    }
    const won = await frame.evaluate(driveGame, { id: templateId, lose: false, timeoutMs: 60_000 })
    if (won.phase !== 'won')
      throw new Error('O objetivo não foi atingido pelo teste de entrada do kit.')
    await frame.locator('#restart').click()
    const reset = await frame.evaluate(() => window.__studioGame.inspect())
    if (reset.phase !== 'playing' || reset.score !== 0)
      throw new Error('O reinício não recuperou o estado inicial.')
    evidence.push({
      kind: 'playtest',
      status: 'passed',
      detail:
        'Boot, pausa, entrada, objetivo e reinício; derrota quando prevista pelo kit. Driver de regras do kit original.',
    })
  } else {
    await frame.locator('body').waitFor({ state: 'visible', timeout: 10_000 })
    await frame.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    )
    await page
      .locator('#game')
      .screenshot({ path: path.join(dist, '__studio-proof.png'), timeout: 10_000 })
    evidence.push({
      kind: 'playtest',
      status: 'passed',
      detail:
        'Inicialização da página sem exceção. Este projeto não tem um driver de objetivo de jogo; a jogabilidade exige revisão manual.',
    })
  }
  if (errors.length) throw new Error(errors.join('\n'))
  evidence.push({
    kind: 'capture',
    status: 'passed',
    detail:
      'Frame real capturado em 1024 × 640. Revise enquadramento, contraste e HUD antes de aplicar.',
  })
  await fs.writeFile(
    path.join(root, 'playtest-result.json'),
    JSON.stringify({ evidence, screenshot: '__studio-proof.png' }),
  )
} catch (error) {
  console.error(`STUDIO_PLAYTEST_FAILED: ${String(error.message ?? error).slice(0, 16000)}`)
  process.exitCode = 1
} finally {
  if (browser) await browser.close().catch(() => undefined)
  clearTimeout(deadline)
}
