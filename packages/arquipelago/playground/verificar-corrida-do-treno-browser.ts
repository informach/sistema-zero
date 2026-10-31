/**
 * A descida de trenó do Pico como minijogo (lacunas, 01/11/2026) no navegador, com a plataforma
 * falsa num jogo novo no Mestre: perto do trenó parado no platô, "Descer de trenó" senta a criança;
 * a descida passa pelo primeiro portão (o cronômetro "Descida de trenó" aparece) e, no pé da pista,
 * o resultado mostra a chegada. No computador e no celular emulado.
 *
 *   bun build playground/verificar-corrida-do-treno-browser.ts --target=node --external \
 *     playwright-core --outdir .cache/treno-build && \
 *     node .cache/treno-build/verificar-corrida-do-treno-browser.js
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { chromium, type Page } from 'playwright-core'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { giroDaIlha, ilhasEmVolta } from '../src/mundo/medidas'
import { PERCURSO_DO_TRENO } from '../src/sistemas/percurso'

const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4531)
const base = `http://127.0.0.1:${porta}`
const prints = path.resolve(process.env.ARQUIPELAGO_PRINTS ?? '.cache/corrida-do-treno')
mkdirSync(prints, { recursive: true })

const pico = ilhasEmVolta().find((i) => i.ilha.id === 'pico')
if (!pico) throw new Error('Sem o Pico no anel.')
const giro = giroDaIlha(pico.ilha)
const bin = readFileSync(path.join(process.cwd(), 'src', 'assets', 'ilhas', 'pico.glb'))
const modelo = (
  await new GLTFLoader().parseAsync(
    bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength),
    '',
  )
).scene
const no = modelo.getObjectByName('treno-curva-1')
if (!no) throw new Error('O pico.glb não tem a pista do trenó.')
// O mesmo `paraOMundo` do jogo (`mundo/bosque.ts`).
const c = Math.cos(giro)
const s = Math.sin(giro)
const treno = {
  x: pico.centro.x + no.position.x * c + no.position.z * s,
  y: no.position.y,
  z: pico.centro.z - no.position.x * s + no.position.z * c,
}

async function pularChegadas(p: Page) {
  const pular = p.locator('.arq-chegada-pular')
  for (let i = 0; i < 12; i++) {
    try {
      await pular.waitFor({ state: 'visible', timeout: 4000 })
    } catch {
      return
    }
    await pular.click()
    await pular.waitFor({ state: 'detached', timeout: 15_000 }).catch(() => {})
  }
}

const servidor = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(porta) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
servidor.stdout.on('data', () => {})
servidor.stderr.on('data', (d) => process.stderr.write(d))

let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  const prazo = Date.now() + 45_000
  while (true) {
    if (servidor.exitCode !== null) throw new Error('O playground encerrou antes de iniciar')
    try {
      if ((await fetch(base)).ok) break
    } catch {}
    if (Date.now() > prazo) throw new Error('O playground não iniciou')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  for (const celular of [false, true]) {
    const tipo = celular ? 'celular' : 'computador'
    const ctx = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      isMobile: celular,
      hasTouch: celular,
    })
    const p = await ctx.newPage()
    p.setDefaultTimeout(120_000)
    const erros: string[] = []
    p.on('pageerror', (e) => erros.push(e.message))
    await p.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    await p.goto(`${base}/?novo=1&persistir=0&posicao=5&qualidade=leve`, {
      waitUntil: 'networkidle',
    })
    await p.waitForFunction(
      () =>
        typeof (globalThis as { __arquipelagoLevar?: unknown }).__arquipelagoLevar === 'function',
    )
    await pularChegadas(p)
    await p.locator('canvas').click()
    await p.evaluate(
      ({ x, y, z }) =>
        (globalThis as { __arquipelagoLevar?: (...a: number[]) => void }).__arquipelagoLevar?.(
          x,
          y + 1.2,
          z,
          0,
        ),
      treno,
    )
    await p.getByText('Descer de trenó').first().waitFor({ timeout: 180_000 })
    if (celular) await p.getByRole('button', { name: 'Usar', exact: true }).tap()
    else await p.keyboard.press('KeyE')
    await p.getByRole('timer', { name: PERCURSO_DO_TRENO.nome }).waitFor({ timeout: 60_000 })
    await p.screenshot({ path: path.join(prints, `${tipo}-descendo.png`) })
    const resultado = p.getByRole('dialog', { name: PERCURSO_DO_TRENO.nome })
    await resultado.waitFor({ timeout: 180_000 })
    assert((await resultado.locator('li.ganhou').count()) >= 1, 'sem a estrela da chegada')
    await p.screenshot({ path: path.join(prints, `${tipo}-resultado.png`) })
    assert.deepEqual(erros, [])
    console.log(`PASS ${tipo}: desceu de trenó pelos portões e chegou ao pé`)
    await ctx.close()
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (servidor.exitCode === null) servidor.kill()
}
