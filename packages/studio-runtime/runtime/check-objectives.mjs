// Objetivos que RODAM o jogo (etapa 3, 18/10/2026). O Worker já conferiu o pedido; aqui o jogo é
// aberto num Chromium sem internet, UMA página nova por objetivo, os passos acontecem (esperar,
// apertar tecla, clicar) e o que importa é OBSERVADO. Quem decide se passou é o Worker, com a régua
// do core (`compareExecutionValue`): este script só relata o que viu.
import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { approachSprite } from './check-approach.mjs'
import { approachObject3d, NavigationBlocked } from './check-approach-3d.mjs'
import {
  CLICK_TARGET_LIMITS,
  chooseTargetPoint,
  createClickTargetHandle,
  createClickTargetReaderInPage,
  observeSpriteMotion,
  readStageGeometryInPage,
  stagePointToViewport,
} from './check-click-target.mjs'
import { createImageThreeModuleResolver } from './check-javascript-modules.mjs'
import { createExecutionObservationCodec } from './execution-observation.generated.mjs'

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
let officialModules, officialModuleFailure
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
const has3dNavigation = objectives.some(({ rule }) =>
  rule.steps?.some((step) => step.action === 'approachObject3d'),
)

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
  // O Chromium da imagem usa renderização 3D por software. Três mundos simultâneos
  // atrasam tanto os quadros e as entradas que a navegação oscila e vence o prazo.
  // Estes projetos compartilham uma vaga de renderização, mantendo o orçamento existente.
  const concurrency = has3dNavigation ? 1 : CONCURRENCY
  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      for (;;) {
        const next = queue.shift()
        if (!next) return
        results[next.index] = await runObjective(next.objective, next.index).catch((error) => ({
          id: next.objective.id,
          type: next.objective.rule.type,
          ...(error instanceof NavigationBlocked
            ? { actionFailure: 'navigation-blocked' }
            : { error: String(error?.message ?? error).slice(0, 500) }),
        }))
      }
    }),
  )
  if (officialModuleFailure) throw officialModuleFailure
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
    // Keep CSS geometry, camera and keyboard behavior; rasterize fewer pixels
    // for software WebGL. No learner state or game timing is modified.
    deviceScaleFactor: has3dNavigation ? 0.5 : 1,
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
      if (
        !file &&
        mode === 'classic' &&
        url.origin === 'https://esm.sh' &&
        url.pathname.startsWith('/three@')
      ) {
        try {
          officialModules ??= createImageThreeModuleResolver()
          const module = await (await officialModules)(url)
          if (module?.bytes) {
            await route.fulfill({
              status: 200,
              body: module.bytes,
              headers: { 'Content-Type': module.type, 'Cache-Control': 'no-store' },
            })
            return
          }
        } catch {
          officialModuleFailure = new Error(
            'Os módulos oficiais 3D não puderam ser carregados no executor.',
          )
        }
      }
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
    const lines = { values: [], incomplete: false }
    const errors = []
    page.on('console', (message) => {
      const text = message.text()
      if (lines.values.length >= MAX_CONSOLE_LINES || text.length > MAX_LINE_CHARS) {
        lines.incomplete = true
        return
      }
      lines.values.push(text)
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
    if (rule.type === 'behavior' && rule.observation?.type === 'idleBeforeAction') {
      if (mode !== 'classic') throw new Error('Movimento observado exige o Jogo 2D clássico.')
      const outcome = await observeSpriteMotion(
        probe,
        { scope, target: rule.expect.target, idleMs: rule.observation.idleMs },
        (ms) => page.waitForTimeout(ms),
        () => runSteps(page, rule.steps, probe),
      )
      const screenshot = await shoot(page, index)
      return { id: objective.id, type: rule.type, ...outcome, screenshot, errors }
    }
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
      await runSteps(page, rule.steps, probe)
      const outcome = await runScriptRule(probe, rule.code, lines)
      const screenshot = await shoot(page, index)
      return { id: objective.id, type: rule.type, ...outcome, screenshot, errors }
    }
    const initial = await readTarget(probe, rule.expect.target, lines)
    const checkpoints = await Promise.all(
      (rule.checkpoints ?? []).map(async (point) => ({
        initial: await readTarget(probe, point.expect.target, lines),
      })),
    )
    const capture = async (afterStep) => {
      for (const [i, point] of (rule.checkpoints ?? []).entries())
        if (point.afterStep === afterStep)
          checkpoints[i].final = await readTarget(probe, point.expect.target, lines)
    }
    await capture(0)
    await runSteps(page, rule.steps, probe, capture)
    const final = await readTarget(probe, rule.expect.target, lines)
    const screenshot = await shoot(page, index)
    return {
      id: objective.id,
      type: rule.type,
      initial,
      final,
      ...(rule.checkpoints ? { checkpoints } : {}),
      screenshot,
      errors,
    }
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
    /** Per-objective private references. Released even when an input/protocol call fails. */
    handle: (factory, arg) => createClickTargetHandle(cdp, factory, arg),
    /** No mundo da página (onde estão as variáveis e o kit), sem `eval` nem `then` dela. */
    main: (fn, arg) =>
      run(
        `(${fn.toString()})(${JSON.stringify(arg)}, (${createExecutionObservationCodec.toString()})())`,
        false,
      ),
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
  if (lines.incomplete) throw new Error('O console excedeu os limites de observação.')
  const snapshot = await probe.main(snapshotForScript, { scope, maxChars: MAX_VALUE_CHARS })
  // Console callbacks may arrive while the page snapshot is being read.
  if (lines.incomplete) throw new Error('O console excedeu os limites de observação.')
  const expression = `(async () => {
    let jogo
    try { jogo = (${createExecutionObservationCodec.toString()})().decode(${JSON.stringify(snapshot)}, true) }
    catch { return { observationError: 'O estado do jogo não pôde ser lido inteiro.' } }
    const corpo = document.body ? document.body.innerText : ''
    if (corpo.length > 50000) return { observationError: 'O texto excedeu os limites de observação.' }
    const texto = corpo
    const console = ${JSON.stringify(lines.values)}
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
  if (outcome && typeof outcome.observationError === 'string')
    throw new Error(outcome.observationError)
  if (outcome && typeof outcome.scriptError === 'string')
    return { verdict: false, scriptError: outcome.scriptError }
  const returned = outcome && typeof outcome.returned === 'string' ? outcome.returned : 'nada'
  return { verdict: returned === 'true', returned }
}

async function runSteps(page, steps, probe, afterStep) {
  let targets
  let index = 0
  try {
    for (const step of steps) {
      if (step.action === 'wait') await page.waitForTimeout(step.ms)
      else if (step.action === 'click') await page.mouse.click(step.x, step.y)
      else if (step.action === 'press') {
        // Jogo que lê a tecla a cada quadro perde um toque de zero milissegundos.
        await page.keyboard.down(step.key)
        try {
          await page.waitForTimeout(step.holdMs ?? 80)
        } finally {
          await page.keyboard.up(step.key)
        }
      } else if (step.action === 'approachObject3d') {
        if (mode !== 'classic') throw Error('Navegação 3D exige um projeto clássico.')
        await approachObject3d(
          page,
          step,
          async (paths) =>
            (
              await probe.main(readTargetInPage, {
                scope,
                targets: paths.map((path) => ({ kind: 'value', path })),
                maxChars: MAX_VALUE_CHARS,
              })
            ).values,
        )
      } else if (step.action === 'approachSprite') {
        if (mode !== 'classic') throw Error('Navegação adaptativa exige o Jogo 2D clássico.')
        await approachSprite(probe, page, { scope, ...step })
      } else if (step.action === 'clickTarget') {
        if (mode !== 'classic')
          throw new Error('Este executor não oferece o alvo adaptativo neste ambiente.')
        // Observe the existing stage BEFORE calling stageWidth/Height (which can create one).
        const geometry = await probe.isolated(`(${readStageGeometryInPage.toString()})(null)`)
        targets ??= await probe.handle(createClickTargetReaderInPage, {
          scope,
          ...CLICK_TARGET_LIMITS,
        })
        await waitForPaint(probe)
        const scene = await targets.read(step.target)
        const point = chooseTargetPoint(scene)
        const viewport = stagePointToViewport(point, scene, geometry)
        const currentGeometry = await probe.isolated(
          `(${readStageGeometryInPage.toString()})(${JSON.stringify(viewport)})`,
        )
        if (Object.keys(geometry).some((key) => currentGeometry[key] !== geometry[key]))
          throw new Error('O palco mudou durante a observação do gesto.')
        await page.mouse.click(viewport.x, viewport.y)
        await targets.call('admit', point)
        await waitForPaint(probe)
      } else throw new Error('O executor não oferece esta ação de teste.')
      await afterStep?.(++index)
    }
    await page.waitForTimeout(SETTLE_MS)
  } finally {
    if (targets) await targets.dispose().catch(() => undefined)
  }
}

async function waitForPaint(probe) {
  await probe.isolated(`new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Não foi possível observar quadros do jogo.')), 1000);
    requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(timer); resolve(true) }));
  })`)
}

async function readTarget(probe, target, lines) {
  if (target.kind === 'console') {
    if (lines.incomplete) throw new Error('O console excedeu os limites de observação.')
    return { found: true, value: lines.values.join('\n') }
  }
  // O texto é lido no mundo isolado: o jogo não troca o `innerText` de lá.
  if (target.kind === 'text')
    return probe.isolated(
      `(() => { const selector = ${JSON.stringify(target.selector ?? null)}; const nodes = selector ? [...document.querySelectorAll(selector)] : []; if (nodes.length > 100) throw new Error('O texto excedeu os limites de observação.'); const t = selector ? nodes.map(node => node.textContent ?? '').join('\u0020') : (document.body ? document.body.innerText : ''); if (t.length > 50000) throw new Error('O texto excedeu os limites de observação.'); return { found: true, value: t } })()`,
    )
  return probe.main(readTargetInPage, { scope, target, maxChars: MAX_VALUE_CHARS })
}

// ---- Rodam DENTRO da página (sem acesso a nada daqui de fora). ----

function readTargetInPage({ scope, target, targets, maxChars }, codec) {
  if (targets) {
    if (!Array.isArray(targets) || targets.length > 6)
      throw Error('Observação 3D fora dos limites.')
    return { values: targets.map((target) => readTargetInPage({ scope, target, maxChars }, codec)) }
  }
  if (target.kind === 'game') {
    const game = window.__studioGame
    if (!game || typeof game.inspect !== 'function') return { found: false }
    return { found: true, value: codec.encode(game.inspect()[target.field], maxChars) }
  }
  const [first, ...rest] = target.path.split('.')
  const reader = globalThis[scope]
  const entry =
    target.kind === 'moduleValue'
      ? reader?.modules?.[target.module] && Object.hasOwn(reader.modules[target.module], first)
        ? { v: reader.modules[target.module][first] }
        : null
      : reader && typeof reader.get === 'function'
        ? reader.get(first)
        : null
  if (!entry) return { found: false }
  let current = entry.v
  for (const key of rest) {
    if (current === null || (typeof current !== 'object' && typeof current !== 'function'))
      return { found: false }
    current = current[key]
  }
  return { found: true, value: codec.encode(current, maxChars) }
}

function snapshotForScript({ scope, maxChars }, codec) {
  const reader = globalThis[scope]
  if (reader && typeof reader.names === 'function') {
    const out = {}
    const names = reader.names()
    if (!Array.isArray(names) || names.length > 10_000)
      throw new Error('O estado excedeu os limites de observação.')
    for (const name of names) {
      const entry = reader.get(name)
      if (entry) Object.defineProperty(out, name, { value: entry.v, enumerable: true })
    }
    return codec.encode(out, maxChars)
  }
  const game = window.__studioGame
  return codec.encode(game && typeof game.inspect === 'function' ? game.inspect() : {}, maxChars)
}

async function callFunctionCases({ scope, name, module, cases, timeoutMs, maxChars }, codec) {
  const reader = globalThis[scope]
  const fn = module
    ? reader?.modules?.[module]?.[name]
    : reader && typeof reader.get === 'function'
      ? reader.get(name)?.v
      : undefined
  if (typeof fn !== 'function') return { missing: true }
  const outcomes = []
  for (const item of cases) {
    let value, timer
    try {
      const args = JSON.parse(JSON.stringify(item))
      value = await Promise.race([
        Promise.resolve().then(() => fn(...args)),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('demorou demais')), timeoutMs)
        }),
      ])
    } catch (error) {
      outcomes.push({ ok: false, error: String(error?.message ?? error).slice(0, 200) })
      continue
    } finally {
      clearTimeout(timer)
    }
    // A function exception is a student result. An incomplete observation is an
    // executor error for the whole objective, never a failed test case.
    outcomes.push({ ok: true, value: codec.encode(value, maxChars) })
  }
  return { cases: outcomes }
}
