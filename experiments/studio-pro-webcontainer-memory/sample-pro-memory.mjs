// Diagnóstico local de memória do Estúdio Completo Pro (WebContainer + Vite).
// Uso: node sample-pro-memory.mjs <studio|raw> <url> <label> <outDir> [maxMs]
// Amostra a cada 500ms: working set por PID (tasklist) x papel do processo (CDP SystemInfo).
import { execFile } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const require = createRequire(new URL('../../packages/studio/package.json', import.meta.url))
const { chromium } = require('@playwright/test')

const [mode, url, label, outDir, maxArg] = process.argv.slice(2)
const maxMs = Number(maxArg ?? 240_000)
mkdirSync(outDir, { recursive: true })

async function workingSets() {
  const { stdout } = await run('tasklist', ['/fo', 'csv', '/nh', '/fi', 'imagename eq chrome.exe'])
  const map = new Map()
  for (const line of stdout.trim().split(/\r?\n/)) {
    const cols = line.match(/"([^"]*)"/g)?.map((c) => c.slice(1, -1))
    if (!cols || cols.length < 5) continue
    map.set(Number(cols[1]), Number(cols[4].replace(/[^\d]/g, '')) / 1024) // MiB
  }
  return map
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const cdp = await browser.newBrowserCDPSession()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
const t0 = Date.now()
const events = []
const mark = (name, extra) => {
  events.push({ t: Date.now() - t0, name, ...extra })
  console.log(
    `[${((Date.now() - t0) / 1000).toFixed(1)}s] ${name}${extra ? ' ' + JSON.stringify(extra) : ''}`,
  )
}
// Registrado antes do goto: o harness emite "phase: booting" antes do DOMContentLoaded.
page.on('console', (m) => {
  const text = m.text()
  if (text.startsWith('[harness] phase:')) setPhase(text.slice(16).trim())
  else if (text.startsWith('[harness]')) mark(text.slice(10))
})
// Um renderer travado não pode segurar o amostrador nem a limpeza do navegador.
const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
page.on('requestfailed', (r) =>
  mark('requestfailed', { url: r.url().slice(0, 160), failure: r.failure()?.errorText }),
)
page.on('pageerror', (e) => mark('pageerror', { message: e.message.slice(0, 200) }))

let phase = 'load'
const samples = []
const peakByPid = new Map()
let stop = false
const sampler = (async () => {
  while (!stop) {
    try {
      const [{ processInfo }, ws] = await Promise.all([
        cdp.send('SystemInfo.getProcessInfo'),
        workingSets(),
      ])
      let total = 0
      const byType = {}
      const perPid = []
      for (const p of processInfo) {
        const mib = ws.get(p.id)
        if (mib === undefined) continue
        total += mib
        byType[p.type] = (byType[p.type] ?? 0) + mib
        perPid.push({ pid: p.id, type: p.type, mib: Math.round(mib) })
        const prev = peakByPid.get(p.id)
        if (!prev || prev.mib < mib)
          peakByPid.set(p.id, { pid: p.id, type: p.type, mib: Math.round(mib), phase })
      }
      let heap = null
      try {
        heap = await withTimeout(
          page.evaluate(() => performance.memory?.usedJSHeapSize ?? null),
          2_000,
        )
      } catch {}
      samples.push({
        t: Date.now() - t0,
        phase,
        total: Math.round(total),
        byType,
        heapMiB: heap && Math.round(heap / 1048576),
        perPid,
      })
    } catch (e) {
      samples.push({ t: Date.now() - t0, phase, error: String(e).slice(0, 120) })
    }
    await new Promise((r) => setTimeout(r, 500))
  }
})()

const setPhase = (p) => {
  if (p !== phase) {
    phase = p
    mark('phase', { phase: p })
  }
}

let outcome = 'timeout'
try {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  if (mode === 'studio') {
    setPhase('create')
    await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
    await page.getByText('Pro (código)', { exact: true }).click()
    await page.getByRole('button', { name: 'Criar e abrir' }).click()
    await page.waitForURL(/\/editor\//)
    setPhase('editor')
    const labels = [
      ['booting', 'Iniciando o ambiente (WebContainer)'],
      ['installing', 'Instalando dependências (npm install)'],
      ['starting', 'Subindo o servidor de desenvolvimento (Vite)'],
    ]
    const deadline = t0 + maxMs
    while (Date.now() < deadline) {
      const body = await withTimeout(
        page.evaluate(() => document.body.innerText),
        5_000,
      )
      for (const [p, text] of labels) if (body.includes(text)) setPhase(p)
      const frame = page
        .frames()
        .find(
          (f) => /webcontainer|local-credentialless|\.io\//.test(f.url()) && f !== page.mainFrame(),
        )
      if (frame) {
        try {
          const text = await frame.evaluate(() => document.body?.innerText ?? '')
          if (text.trim().length > 0) {
            setPhase('ready')
            outcome = 'ready'
            break
          }
        } catch {}
      }
      if (/npm install falhou|excedeu o tempo|Não foi possível/.test(body)) {
        outcome = 'error'
        mark('error-text', {
          text: body.match(
            /.{0,80}(npm install falhou|excedeu o tempo|Não foi possível).{0,120}/,
          )?.[0],
        })
        break
      }
      await new Promise((r) => setTimeout(r, 250))
    }
  } else {
    // Harness mínimo: as fases chegam pelo console (listener registrado acima).
    const deadline = t0 + maxMs
    while (Date.now() < deadline && !['ready', 'error'].includes(phase))
      await new Promise((r) => setTimeout(r, 250))
    outcome = phase === 'ready' ? 'ready' : phase === 'error' ? 'error' : 'timeout'
  }
  // Mantém 10s após ready para ver o platô.
  if (outcome === 'ready') await new Promise((r) => setTimeout(r, 10_000))
} catch (e) {
  outcome = 'exception'
  mark('exception', { message: String(e).slice(0, 300) })
} finally {
  stop = true
  await withTimeout(sampler, 10_000).catch(() => mark('sampler-timeout'))
  await context.close().catch(() => {})
  await browser.close().catch(() => {})
}

const valid = samples.filter((s) => s.total)
const peak = valid.reduce((a, s) => (s.total > (a?.total ?? 0) ? s : a), null)
const phasePeaks = {}
for (const s of valid) phasePeaks[s.phase] = Math.max(phasePeaks[s.phase] ?? 0, s.total)
const topPids = [...peakByPid.values()].sort((a, b) => b.mib - a.mib).slice(0, 6)
const summary = {
  label,
  mode,
  url,
  outcome,
  elapsedMs: Date.now() - t0,
  samples: valid.length,
  peakTotalMiB: peak?.total,
  peakAt: peak && { t: peak.t, phase: peak.phase, byType: peak.byType, heapMiB: peak.heapMiB },
  phasePeaks,
  topPids,
  events,
}
writeFileSync(join(outDir, `${label}.json`), JSON.stringify({ summary, samples }, null, 1))
console.log(JSON.stringify(summary, null, 1))
