/**
 * Conferência no navegador do descanso (fase2-13): na praça da Vila Doce, perto de um banco aparece
 * "Sentar no banco"; o E senta (o desenho vai para o assento, o corpo fica de pé na frente) e a
 * energia sobe devagar; andar levanta. Em casa, "Deitar na cama" deita o avatar no colchão, a tela
 * escurece com a barrinha da energia, que sobe mais rápido que no banco.
 *
 * `bun playground/verificar-descanso-browser.ts` (navegador: `ARQUIPELAGO_CHROMIUM` com o caminho
 * do executável, ou o canal `ARQUIPELAGO_BROWSER_CHANNEL`, padrão `chrome`). Os prints vão para
 * `ARQUIPELAGO_PRINTS` (padrão: a pasta temporária). As esperas leem o estado, nunca um tempo fixo.
 */
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { ALTURA_DA_TERRA, CENTRO_DA_CASA, giroDaIlha, ilhasEmVolta } from '../src/mundo/medidas'
import { CORPO } from '../src/sistemas/corpo'
import { lugarNaCama, lugarNoBanco } from '../src/sistemas/descanso'

const port = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4598)
const baseURL = `http://127.0.0.1:${port}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? tmpdir()
const vila = ilhasEmVolta().find((i) => i.ilha.id === 'vila-doce')
if (!vila) throw new Error('Sem a Vila Doce no anel.')
const giroIlha = giroDaIlha(vila.ilha)
const glb = readFileSync(
  path.join(import.meta.dir, '..', 'src', 'assets', 'ilhas', 'vila-doce.glb'),
)
const modelo = (
  await new GLTFLoader().parseAsync(
    glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength),
    '',
  )
).scene
type P = { x: number; y: number; z: number }
const ancora = (nome: string): P => {
  const o = modelo.getObjectByName(nome)
  if (!o) throw new Error(`sem a âncora ${nome}`)
  const { x, y, z } = o.position
  return {
    x: vila.centro.x + x * Math.cos(giroIlha) + z * Math.sin(giroIlha),
    y,
    z: vila.centro.z - x * Math.sin(giroIlha) + z * Math.cos(giroIlha),
  }
}
type Desenho = {
  posicao: P
  ilhasCompletas: number
  descanso: 'sentar' | 'deitar' | null
  energia: number
  avatar: { x: number; y: number; z: number; deitado: number } | null
}

/** O banco 1 da praça (`col-banco-1`) no mundo, com a frente (o −Z dele girado com a ilha). */
const banco = (() => {
  const o = modelo.getObjectByName('col-banco-1')
  if (!o) throw new Error('sem o col-banco-1')
  const meio = ancora('col-banco-1')
  const yaw = 2 * Math.atan2(o.quaternion.y, o.quaternion.w)
  const fx = -Math.sin(yaw)
  const fz = -Math.cos(yaw)
  const c = Math.cos(giroIlha)
  const s = Math.sin(giroIlha)
  const frente = Math.atan2(fx * c + fz * s, -fx * s + fz * c)
  return lugarNoBanco('banco-1', { x: meio.x, y: meio.y - o.scale.y / 2, z: meio.z }, frente)
})()
// A cama da plataforma de mentira: célula (0, 1), 2 × 3, sem giro.
const cama = lugarNaCama(
  { x: CENTRO_DA_CASA.x - 5, y: ALTURA_DA_TERRA + 0.02, z: CENTRO_DA_CASA.z - 1.5 },
  0,
)

const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
})
server.stdout.on('data', () => {})
server.stderr.on('data', (d) => process.stderr.write(d))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const erros: string[] = []
try {
  const deadline = Date.now() + 30_000
  while (true) {
    if (server.exitCode !== null) throw new Error('Playground encerrou antes de iniciar.')
    try {
      if ((await fetch(baseURL)).ok) break
    } catch {}
    if (Date.now() >= deadline) throw new Error('Playground não iniciou.')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({
    ...(process.env.ARQUIPELAGO_CHROMIUM
      ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
      : { channel: process.env.ARQUIPELAGO_BROWSER_CHANNEL ?? 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  context.setDefaultTimeout(120_000)
  await context.addInitScript((origem) => {
    if (location.origin === origem) localStorage.setItem('arquipelago:medir', '1')
  }, baseURL)
  const page = await context.newPage()
  page.on('pageerror', (e) => erros.push(e.message))

  const ler = async () =>
    (await page.evaluate(
      () => (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho ?? null,
    )) as Desenho | null
  const levar = (p: { x: number; z: number }, y: number, olhar: number) =>
    page.evaluate(
      ({ x, y, z, g }) =>
        (globalThis as { __arquipelagoLevar?: (...a: number[]) => void }).__arquipelagoLevar?.(
          x,
          y,
          z,
          g,
        ),
      { x: p.x, y: y + 1.2, z: p.z, g: olhar + Math.PI },
    )
  const esperar = async (o: string, pronto: (d: Desenho) => boolean, ms = 120_000) => {
    const ate = Date.now() + ms
    while (Date.now() < ate) {
      const d = await ler()
      if (d && pronto(d)) return d
      await page.waitForTimeout(400)
    }
    throw new Error(`Não aconteceu a tempo: ${o}`)
  }
  const plano = (a: { x: number; z: number }, b: { x: number; z: number }) =>
    Math.hypot(a.x - b.x, a.z - b.z)

  // ── O banco da praça ──
  const chegada = ancora('chegada')
  const em = `${chegada.x.toFixed(2)},${chegada.z.toFixed(2)},${(chegada.y + 1.2).toFixed(2)}`
  await page.goto(`${baseURL}/?novo=1&persistir=0&posicao=8&energia=20&em=${em}`, {
    waitUntil: 'domcontentloaded',
  })
  await esperar('a Vila carregada', (d) => d.ilhasCompletas > 0, 180_000)
  await page.locator('canvas').click()
  // De pé na frente do banco, olhando para ele.
  await levar(banco.corpo, chegada.y, banco.giro + Math.PI)
  await page.getByText('Sentar no banco').first().waitFor({ timeout: 60_000 })
  const antes = (await ler())?.energia ?? 0
  await page.keyboard.press('KeyE')
  const sentada = await esperar('sentar', (d) => d.descanso === 'sentar')
  await page.getByText('Que bom sentar um pouco.').first().waitFor()
  // O desenho no assento: a origem (os pés) no lugar do banco.
  const noAssento = await esperar(
    'o desenho chegar ao banco',
    (d) => !!d.avatar && plano(d.avatar, banco.desenho) < 0.12,
    30_000,
  )
  console.log(
    `Sentada: desenho a ${plano(noAssento.avatar ?? banco.desenho, banco.desenho).toFixed(3)} m do lugar, corpo a ${plano(sentada.posicao, banco.corpo).toFixed(2)} m de onde fica de pé`,
  )
  await page.waitForTimeout(2500)
  await page.screenshot({ path: path.join(prints, 'descanso-banco.png') })
  const noBanco = await esperar('a energia subir no banco', (d) => d.energia >= antes + 2, 60_000)
  console.log(`Banco: energia de ${antes.toFixed(1)} para ${noBanco.energia.toFixed(1)}`)
  // Andar levanta.
  await page.keyboard.down('KeyS')
  await esperar('levantar andando', (d) => d.descanso === null, 30_000)
  await page.keyboard.up('KeyS')

  // ── A cama ──
  await levar(cama.corpo, ALTURA_DA_TERRA, cama.giro + Math.PI / 2)
  await page.getByText('Deitar na cama').first().waitFor({ timeout: 60_000 })
  await page.keyboard.press('KeyE')
  await esperar('deitar', (d) => d.descanso === 'deitar')
  await page.getByRole('progressbar', { name: 'Energia' }).waitFor()
  const deitada = await esperar(
    'o desenho deitar no colchão',
    (d) => !!d.avatar && plano(d.avatar, cama.desenho) < 0.12,
    30_000,
  )
  console.log(
    `Deitada: desenho a ${plano(deitada.avatar ?? cama.desenho, cama.desenho).toFixed(3)} m do lugar, altura ${(deitada.avatar?.y ?? 0).toFixed(2)} (colchão ${cama.desenho.y.toFixed(2)})`,
  )
  const e0 = deitada.energia
  const t0 = Date.now()
  const subiu = await esperar('a energia subir na cama', (d) => d.energia >= e0 + 6, 60_000)
  console.log(
    `Cama: energia de ${e0.toFixed(1)} para ${subiu.energia.toFixed(1)} em ${((Date.now() - t0) / 1000).toFixed(0)} s`,
  )
  await page.screenshot({ path: path.join(prints, 'descanso-cama.png') })
  await page.keyboard.press('Space')
  await esperar('levantar pulando', (d) => d.descanso === null, 30_000)
  await page.getByRole('progressbar', { name: 'Energia' }).waitFor({ state: 'detached' })

  if (erros.length > 0) throw new Error(`Erros na página: ${erros.join(' | ')}`)
  console.log(`Descanso conferido. Prints em ${prints}`)
} finally {
  await browser?.close()
  server.kill()
}
