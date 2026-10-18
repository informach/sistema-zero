// Objetivos que RODAM o jogo (etapa 3, 18/10/2026). O Worker já conferiu o pedido; aqui o jogo é
// aberto num Chromium sem internet, UMA página nova por objetivo, os passos acontecem (esperar,
// apertar tecla, clicar) e o que importa é OBSERVADO. Quem decide se passou é o Worker, com a régua
// do core (`compareExecutionValue`): este script só relata o que viu.
import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'

const root = process.cwd()
const options = JSON.parse(await fs.readFile(path.join(root, 'check-options.json'), 'utf8'))
const { mode, scope, objectives } = options
const origin = 'https://studio-game.invalid'
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
  gif: 'image/gif',
  glb: 'model/gltf-binary',
  gltf: 'model/gltf+json',
  woff2: 'font/woff2',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  wasm: 'application/wasm',
}

const resources = new Map()
if (mode === 'classic') {
  resources.set('/index.html', {
    bytes: await fs.readFile(path.join(root, 'game.html')),
    type: 'text/html',
  })
} else {
  const dist = path.join(root, 'dist')
  let total = 0
  const walk = async (dir) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (entry.isFile()) {
        const bytes = await fs.readFile(full)
        total += bytes.length
        if (total > 40_000_000 || resources.size >= 400)
          throw new Error('O jogo compilado ficou grande demais para testar.')
        const rel = `/${path.relative(dist, full).split(path.sep).join('/')}`
        resources.set(rel, {
          bytes,
          type: types[rel.split('.').at(-1)] ?? 'application/octet-stream',
        })
      }
    }
  }
  await walk(dist)
}

const deadline = setTimeout(() => {
  console.error('STUDIO_CHECK_TIMEOUT')
  process.exit(1)
}, Number(options.deadlineMs) || 110_000)

const KIT_READY_MS = 10_000
const SETTLE_MS = 250
const CASE_TIMEOUT_MS = 2_000
const SCRIPT_TIMEOUT_MS = 3_000
const MAX_CONSOLE_LINES = 200
const MAX_LINE_CHARS = 300
const MAX_VALUE_CHARS = 20_000
const CONCURRENCY = 3

let browser
const observations = []
try {
  browser = await chromium.launch({
    headless: true,
    timeout: 15_000,
    ...(process.env.SZ_CHECK_CHROMIUM ? { executablePath: process.env.SZ_CHECK_CHROMIUM } : {}),
  })
  const queue = objectives.map((objective, index) => ({ objective, index }))
  const results = new Array(objectives.length)
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      for (;;) {
        const next = queue.shift()
        if (!next) return
        results[next.index] = await runObjective(next.objective, next.index).catch((error) => ({
          id: next.objective.id,
          type: next.objective.rule.type,
          error: String(error?.message ?? error).slice(0, 500),
        }))
      }
    }),
  )
  observations.push(...results)
  await fs.writeFile(path.join(root, 'check-result.json'), JSON.stringify({ observations }))
} catch (error) {
  console.error(`STUDIO_CHECK_FAILED: ${String(error?.message ?? error).slice(0, 4000)}`)
  process.exitCode = 1
} finally {
  if (browser) await browser.close().catch(() => undefined)
  clearTimeout(deadline)
}

async function runObjective(objective, index) {
  const context = await browser.newContext({
    viewport: { width: 1024, height: 640 },
    acceptDownloads: false,
    serviceWorkers: 'block',
  })
  try {
    await context.routeWebSocket('**/*', (socket) => socket.close())
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url())
      const file =
        url.origin === origin && ['GET', 'HEAD'].includes(route.request().method())
          ? resources.get(url.pathname === '/' ? '/index.html' : url.pathname)
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
          'Cache-Control': 'no-store',
          ...(mode === 'pro'
            ? {
                'Content-Security-Policy': `default-src 'none'; base-uri 'none'; object-src 'none'; form-action 'none'; script-src 'unsafe-inline' 'wasm-unsafe-eval' ${origin}; style-src 'unsafe-inline' ${origin}; img-src data: blob: ${origin}; font-src data: ${origin}; media-src data: blob: ${origin}; connect-src data: blob: ${origin}; worker-src blob: ${origin}`,
              }
            : {}),
        },
      })
    })
    const page = await context.newPage()
    const lines = []
    const errors = []
    page.on('console', (message) => {
      if (lines.length < MAX_CONSOLE_LINES) lines.push(message.text().slice(0, MAX_LINE_CHARS))
    })
    page.on('pageerror', (error) => {
      if (errors.length < 5) errors.push(String(error.message).slice(0, 300))
    })
    page.on('dialog', (dialog) => void dialog.dismiss())
    context.on('page', (popup) => {
      if (popup !== page) void popup.close()
    })
    await page.goto(`${origin}/index.html`, { waitUntil: 'load', timeout: 15_000 })
    const probe = await openProbe(page)
    await startGame(page, probe)
    const rule = objective.rule
    if (rule.type === 'functionReturns') {
      // Só os ARGUMENTOS entram na página: a resposta esperada fica aqui fora. A página é da
      // criança, e um jogo que mexesse nos protótipos leria o gabarito e o devolveria.
      const outcome = await probe.main(callFunctionCases, {
        scope,
        name: rule.name,
        module: rule.module ?? null,
        cases: rule.cases.map((item) => item.args),
        timeoutMs: CASE_TIMEOUT_MS,
        maxChars: MAX_VALUE_CHARS,
      })
      return { id: objective.id, type: rule.type, ...outcome, errors }
    }
    if (rule.type === 'script') {
      await runSteps(page, rule.steps)
      const outcome = await runScriptRule(probe, rule.code, lines)
      const screenshot = await shoot(page, index)
      return { id: objective.id, type: rule.type, ...outcome, screenshot, errors }
    }
    const initial = await readTarget(probe, rule.expect.target, lines)
    await runSteps(page, rule.steps)
    const final = await readTarget(probe, rule.expect.target, lines)
    const screenshot = await shoot(page, index)
    return { id: objective.id, type: rule.type, initial, final, screenshot, errors }
  } finally {
    await context.close().catch(() => undefined)
  }
}

async function startGame(page, probe) {
  // Os kits Pro abrem numa tela de início: o teste aperta "Começar" como a criança faria. Só os
  // kits (o Worker sabe pelo modelo do bloco) esperam: os outros jogos começam no carregamento.
  // A espera pergunta pela sonda (sem o `eval` da página, que o jogo pode ter trocado).
  let kit = false
  if (options.kit === true) {
    const until = Date.now() + KIT_READY_MS
    while (!kit && Date.now() < until) {
      kit = await probe
        .main(() => {
          const game = window.__studioGame
          return game?.version === 1 && game.inspect().readiness !== 'loading'
        })
        .catch(() => false)
      if (!kit) await page.waitForTimeout(100)
    }
  }
  if (kit) {
    const start = page.locator('#start')
    if (await start.isVisible().catch(() => false)) await start.click({ timeout: 3_000 })
  }
  await probe
    .main(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    )
    .catch(() => undefined)
  await page.waitForTimeout(SETTLE_MS)
}

async function shoot(page, index) {
  // A captura é da equipe (o "Testar agora"); a verificação da criança não paga por ela.
  if (options.screenshots !== true) return undefined
  const screenshot = `check-shot-${index}.jpg`
  await page
    .screenshot({ path: path.join(root, screenshot), type: 'jpeg', quality: 55, timeout: 5_000 })
    .catch(() => undefined)
  return screenshot
}

/**
 * Como o teste LÊ a página sem passar por código dela (review da etapa 4). `page.evaluate` do
 * Playwright roda a expressão pelo `eval` da página e espera o resultado pelo `then` dela: um jogo
 * que trocasse os dois aprovaria qualquer objetivo. Aqui a leitura vai direto pelo protocolo do
 * navegador (`Runtime.evaluate`, que espera a promessa por dentro do V8), e o que pode rodar longe
 * do jogo roda num MUNDO ISOLADO: o mesmo documento, mas sem nenhum global nem protótipo da página.
 * Falha do próprio protocolo (página caiu) LANÇA: é falha do executor, nunca "não passou".
 */
async function openProbe(page) {
  const cdp = await page.context().newCDPSession(page)
  const { frameTree } = await cdp.send('Page.getFrameTree')
  const { executionContextId } = await cdp.send('Page.createIsolatedWorld', {
    frameId: frameTree.frame.id,
    worldName: 'sz-check',
  })
  const run = async (expression, isolated, timeout) => {
    const reply = await cdp.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
      ...(isolated ? { contextId: executionContextId } : {}),
      ...(timeout ? { timeout } : {}),
    })
    if (reply.exceptionDetails) {
      const error = new Error(
        reply.exceptionDetails.exception?.description?.split('\n')[0] ??
          reply.exceptionDetails.text ??
          'erro',
      )
      error.pageException = true
      error.syntax = reply.exceptionDetails.exception?.className === 'SyntaxError'
      throw error
    }
    return reply.result.value
  }
  return {
    /** No mundo da página (onde estão as variáveis e o kit), sem `eval` nem `then` dela. */
    main: (fn, arg) => run(`(${fn.toString()})(${JSON.stringify(arg)})`, false),
    /** No mundo isolado: o documento, sem os globais do jogo. */
    isolated: (expression, timeout) => run(expression, true, timeout),
  }
}

// A Regra em JavaScript (etapa 4): a autora escreve o CORPO de uma função que recebe `jogo`,
// `texto` e `console` e devolve true para passar. ⚠️ A regra roda no MUNDO ISOLADO, sobre uma
// FOTO do jogo tirada depois dos passos (`jogo` são as variáveis no clássico e o estado do kit no
// Pro, em JSON): nada do que o jogo fizer com `eval`, `then` ou protótipos muda o veredito.
// `texto` é o texto da página (lido no mundo isolado; `null` quando passa de 50 mil letras, porque
// texto cortado não prova ausência) e `console` é a LISTA das linhas escritas. Só `true` passa.
async function runScriptRule(probe, code, lines) {
  const snapshot = await probe.main(snapshotForScript, { scope, maxChars: MAX_VALUE_CHARS })
  const expression = `(async () => {
    const revive = (value) => {
      if (Array.isArray(value)) return value.map(revive)
      if (value && typeof value === 'object') {
        const keys = Object.keys(value)
        if (keys.length === 1 && typeof value.$sz === 'string') {
          if (value.$sz === 'undefined') return undefined
          if (value.$sz === 'NaN' || value.$sz === 'Infinity' || value.$sz === '-Infinity') return Number(value.$sz)
          if (value.$sz === 'function') return '[função]'
          return value
        }
        const out = {}
        for (const key of keys) out[key] = revive(value[key])
        return out
      }
      return value
    }
    const jogo = revive(${JSON.stringify(snapshot ?? {})})
    const corpo = document.body ? document.body.innerText : ''
    const texto = corpo.length > 50000 ? null : corpo
    const console = ${JSON.stringify(lines.slice(0, MAX_CONSOLE_LINES))}
    try {
      const v = await (async () => {
${code}
      })()
      return { returned: v === true ? 'true' : v === false ? 'false' : v === undefined || v === null ? 'nada' : typeof v === 'number' || typeof v === 'string' ? JSON.stringify(v).slice(0, 80) : typeof v }
    } catch (e) {
      return { scriptError: String((e && e.message) || e).slice(0, 200) }
    }
  })()`
  let timer
  const outcome = await Promise.race([
    probe.isolated(expression, SCRIPT_TIMEOUT_MS).catch((error) => {
      // Erro de escrita da regra (ou o laço cortado pelo prazo) é da regra; o resto é do executor.
      if (error?.pageException)
        return {
          scriptError: error.syntax
            ? `erro de escrita: ${String(error.message).slice(0, 180)}`
            : /terminat/i.test(String(error.message))
              ? `a regra demorou mais de ${SCRIPT_TIMEOUT_MS / 1000} segundos`
              : String(error.message).slice(0, 200),
        }
      throw error
    }),
    new Promise((resolve) => {
      timer = setTimeout(
        () =>
          resolve({ scriptError: `a regra demorou mais de ${SCRIPT_TIMEOUT_MS / 1000} segundos` }),
        SCRIPT_TIMEOUT_MS,
      )
    }),
  ])
  clearTimeout(timer)
  if (outcome && typeof outcome.scriptError === 'string')
    return { verdict: false, scriptError: outcome.scriptError }
  const returned = outcome && typeof outcome.returned === 'string' ? outcome.returned : 'nada'
  return { verdict: returned === 'true', returned }
}

async function runSteps(page, steps) {
  for (const step of steps) {
    if (step.action === 'wait') await page.waitForTimeout(step.ms)
    else if (step.action === 'click') await page.mouse.click(step.x, step.y)
    else if (step.action === 'press') {
      // Jogo que lê a tecla a cada quadro perde um toque de zero milissegundos.
      await page.keyboard.down(step.key)
      await page.waitForTimeout(step.holdMs ?? 80)
      await page.keyboard.up(step.key)
    }
  }
  await page.waitForTimeout(SETTLE_MS)
}

async function readTarget(probe, target, lines) {
  if (target.kind === 'console') return { found: true, value: lines.join('\n') }
  // O texto é lido no mundo isolado: o jogo não troca o `innerText` de lá.
  if (target.kind === 'text')
    return probe.isolated(
      `(() => { const t = document.body ? document.body.innerText : ''; return { found: true, value: t.length > 50000 ? { $sz: 'large' } : t } })()`,
    )
  return probe.main(readTargetInPage, { scope, target, maxChars: MAX_VALUE_CHARS })
}

// ---- Rodam DENTRO da página (sem acesso a nada daqui de fora). ----

function readTargetInPage({ scope, target, maxChars }) {
  const toJson = (value, depth) => {
    if (value === undefined) return { $sz: 'undefined' }
    if (value === null || typeof value === 'boolean' || typeof value === 'string') return value
    if (typeof value === 'number') return Number.isFinite(value) ? value : { $sz: String(value) }
    if (typeof value === 'function') return { $sz: 'function' }
    if (depth > 6) return { $sz: 'deep' }
    if (Array.isArray(value)) return value.slice(0, 200).map((item) => toJson(item, depth + 1))
    if (typeof value === 'object') {
      const out = {}
      for (const key of Object.keys(value).slice(0, 200)) {
        try {
          out[key] = toJson(value[key], depth + 1)
        } catch {
          out[key] = { $sz: 'error' }
        }
      }
      return out
    }
    return { $sz: typeof value }
  }
  const fit = (value) => {
    const json = toJson(value, 0)
    return JSON.stringify(json).length > maxChars ? { $sz: 'large' } : json
  }
  try {
    if (target.kind === 'text') {
      // Texto cortado não prova que a palavra NÃO está lá: grande demais vira inconclusivo.
      const text = document.body?.innerText ?? ''
      return { found: true, value: text.length > 50_000 ? { $sz: 'large' } : text }
    }
    if (target.kind === 'game') {
      const game = window.__studioGame
      if (!game || typeof game.inspect !== 'function') return { found: false }
      return { found: true, value: fit(game.inspect()[target.field]) }
    }
    const [first, ...rest] = target.path.split('.')
    const reader = globalThis[scope]
    const entry = reader && typeof reader.get === 'function' ? reader.get(first) : null
    if (!entry) return { found: false }
    let current = entry.v
    for (const key of rest) {
      if (current === null || (typeof current !== 'object' && typeof current !== 'function'))
        return { found: false }
      current = current[key]
    }
    return { found: true, value: fit(current) }
  } catch (error) {
    return { found: false, error: String(error?.message ?? error).slice(0, 200) }
  }
}

function snapshotForScript({ scope, maxChars }) {
  const toJson = (value, depth) => {
    if (value === undefined) return { $sz: 'undefined' }
    if (value === null || typeof value === 'boolean' || typeof value === 'string') return value
    if (typeof value === 'number') return Number.isFinite(value) ? value : { $sz: String(value) }
    if (typeof value === 'function') return { $sz: 'function' }
    if (depth > 6) return { $sz: 'deep' }
    if (Array.isArray(value)) return value.slice(0, 200).map((item) => toJson(item, depth + 1))
    if (typeof value === 'object') {
      const out = {}
      for (const key of Object.keys(value).slice(0, 200)) {
        try {
          out[key] = toJson(value[key], depth + 1)
        } catch {
          out[key] = { $sz: 'error' }
        }
      }
      return out
    }
    return { $sz: typeof value }
  }
  const fit = (value) => {
    const json = toJson(value, 0)
    return JSON.stringify(json).length > maxChars ? { $sz: 'large' } : json
  }
  const reader = globalThis[scope]
  if (reader && typeof reader.names === 'function') {
    const out = {}
    for (const name of reader.names().slice(0, 300)) {
      try {
        const entry = reader.get(name)
        if (entry) out[name] = fit(entry.v)
      } catch {
        out[name] = { $sz: 'error' }
      }
    }
    return out
  }
  try {
    const game = window.__studioGame
    return game && typeof game.inspect === 'function' ? fit(game.inspect()) : {}
  } catch {
    return {}
  }
}

async function callFunctionCases({ scope, name, module, cases, timeoutMs, maxChars }) {
  const toJson = (value, depth) => {
    if (value === undefined) return { $sz: 'undefined' }
    if (value === null || typeof value === 'boolean' || typeof value === 'string') return value
    if (typeof value === 'number') return Number.isFinite(value) ? value : { $sz: String(value) }
    if (typeof value === 'function') return { $sz: 'function' }
    if (depth > 6) return { $sz: 'deep' }
    if (Array.isArray(value)) return value.slice(0, 200).map((item) => toJson(item, depth + 1))
    if (typeof value === 'object') {
      const out = {}
      for (const key of Object.keys(value).slice(0, 200)) out[key] = toJson(value[key], depth + 1)
      return out
    }
    return { $sz: typeof value }
  }
  const reader = globalThis[scope]
  let fn
  if (module) fn = reader?.modules?.[module]?.[name]
  else fn = reader && typeof reader.get === 'function' ? reader.get(name)?.v : undefined
  if (typeof fn !== 'function') return { missing: true }
  const outcomes = []
  for (const item of cases) {
    try {
      const args = JSON.parse(JSON.stringify(item))
      const value = await Promise.race([
        Promise.resolve().then(() => fn(...args)),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('demorou demais')), timeoutMs),
        ),
      ])
      const json = toJson(value, 0)
      outcomes.push(
        JSON.stringify(json).length > maxChars
          ? { ok: false, error: 'resposta grande demais' }
          : { ok: true, value: json },
      )
    } catch (error) {
      outcomes.push({ ok: false, error: String(error?.message ?? error).slice(0, 200) })
    }
  }
  return { cases: outcomes }
}
