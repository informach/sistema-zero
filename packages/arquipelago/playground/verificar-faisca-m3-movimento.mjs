/** Evidência do controlador real. Gravação não concede aceite perceptivo do IK. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const base = process.env.ARQUIPELAGO_QA_URL ?? 'http://127.0.0.1:4530'
const saida = resolve(
  import.meta.dirname,
  process.env.FAISCA_MOVIMENTO_DIR ?? '../../../output/faisca-gate2/movimento',
)
const extra = process.env.FAISCA_MOVIMENTO_QUERY ?? ''
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: [
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
  ],
})
const evidencias = [],
  erros = []
const caso = process.argv[2] ?? 'todos'
assert.ok(
  ['todos', 'ritmos', 'ponte', 'cobre', 'iris', 'descida', 'curadoria'].includes(caso),
  'Caso de movimento desconhecido',
)
async function iniciar(x, z, ritmo = 'explorar', curadoria = false) {
  const contexto = await browser.newContext({
    viewport: { width: 960, height: 600 },
    recordVideo: { dir: resolve(saida, 'brutos'), size: { width: 960, height: 600 } },
  })
  await contexto.addInitScript(
    ({ x, z, extra }) => {
      const q = new URLSearchParams(extra),
        chave =
          q.has('refino') || q.has('lago')
            ? `arquipelago:faisca:ensaio:gate21:${q.get('refino') ?? 'base'}:${q.get('lago') === 'l2' ? 'l2' : 'l1'}`
            : 'arquipelago:faisca:ensaio'
      if (!localStorage.getItem(chave))
        localStorage.setItem(
          chave,
          JSON.stringify({
            versao: 2,
            ponteInstalada: false,
            visitados: ['casa', 'praca', 'horta'],
            posicao: { ilha: 'sua-ilha', local: { x, y: 4, z } },
          }),
        )
    },
    { x, z, extra },
  )
  const page = await contexto.newPage(),
    t0 = Date.now()
  page.on('pageerror', (e) => erros.push(e.message))
  await page.goto(
    `${base}/macro?ritmo=${ritmo}${curadoria ? '&curadoria=b' : ''}${extra ? `&${extra}` : ''}`,
  )
  await pronto(page)
  await page.addStyleTag({
    content: '.macro-topo,.macro-painel,.macro-conexao{visibility:hidden!important} ',
  })
  await page.locator('canvas').hover()
  await page.mouse.wheel(0, -1000)
  await page.waitForTimeout(800)
  return { contexto, page, t0, inicio: (Date.now() - t0) / 1000 }
}
async function pronto(page) {
  await page.waitForFunction(
    () => document.querySelector('.macro-topo')?.getAttribute('data-arte') === 'pronto',
    {},
    { timeout: 60000 },
  )
  await page.waitForTimeout(1000)
}
async function posicao(page) {
  const txt = await page
    .locator('.macro-painel dl')
    .evaluate(
      (el) =>
        [...el.querySelectorAll('dt')].find((e) => e.textContent === 'Posição').nextElementSibling
          .textContent,
    )
  const [x, y, z] = txt
    .replace(' m', '')
    .split(', ')
    .map((v) => Number(v.replace(',', '.')))
  const giro = await page
    .locator('.macro-painel dl')
    .evaluate(
      (el) =>
        [...el.querySelectorAll('dt')].find((e) => e.textContent === 'Giro da câmera')
          .nextElementSibling.textContent,
    )
  return { x, y, z, giro: Number(giro.replace(' rad', '')) }
}
async function segurar(page, teclas, ms) {
  for (const k of teclas) await page.keyboard.down(k)
  try {
    await page.waitForTimeout(ms)
  } finally {
    for (const k of teclas) await page.keyboard.up(k)
  }
}
async function andar(page, x, z) {
  for (let i = 0; i < 180; i++) {
    const p = await posicao(page),
      dx = x - p.x,
      dz = z - p.z,
      d = Math.hypot(dx, dz)
    if (d < 0.4) {
      await page.waitForTimeout(500)
      return await posicao(page)
    }
    const lx = dx * Math.cos(p.giro) - dz * Math.sin(p.giro),
      lz = dx * Math.sin(p.giro) + dz * Math.cos(p.giro)
    const tx = lx > 0 ? 'd' : 'a',
      tz = lz > 0 ? 's' : 'w'
    const dt = Math.max(80, Math.min(380, (d / 1.65) * 1000))
    const comum = Math.min(Math.abs(lx), Math.abs(lz))
    if ((comum / d) * dt > 20) await segurar(page, [tx, tz], (comum / d) * dt * Math.SQRT2)
    const resto = (Math.abs(Math.abs(lx) - Math.abs(lz)) / d) * dt
    if (resto > 20) await segurar(page, [Math.abs(lx) > Math.abs(lz) ? tx : tz], resto)
    await page.waitForTimeout(210)
  }
  throw Error(`Percurso bloqueado até ${x},${z}: ${JSON.stringify(await posicao(page))}`)
}
async function terminar(s, nome, segundos, dados = {}) {
  const falta = segundos - ((Date.now() - s.t0) / 1000 - s.inicio)
  if (falta > 0) await s.page.waitForTimeout(falta * 1000)
  await s.page.screenshot({ path: resolve(saida, `${nome}.png`) })
  const video = s.page.video(),
    arquivo = await video.path()
  await s.contexto.close()
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-ss',
      String(s.inicio),
      '-i',
      arquivo,
      '-t',
      String(segundos),
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '25',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      resolve(saida, `${nome}.mp4`),
    ],
    { windowsHide: true },
  )
  evidencias.push({ nome, segundos, ...dados })
  writeFileSync(resolve(saida, `${nome}.json`), JSON.stringify(evidencias.at(-1), null, 2))
  console.log(`PASS: ${nome} · ${segundos}s`)
}
try {
  for (const ritmo of caso === 'todos' || caso === 'ritmos'
    ? ['referencia', 'explorar', 'agil']
    : []) {
    const s = await iniciar(0, 150, ritmo),
      p = s.page
    const inicio = await posicao(p)
    await segurar(p, ['w'], 4000)
    await segurar(p, ['d'], 2000)
    await segurar(p, ['Shift', 'w'], 3000)
    await segurar(p, ['d'], 2000)
    await segurar(p, ['w', 'Space'], 1000)
    await segurar(p, ['s'], 3000)
    await segurar(p, ['a'], 2000)
    await p.waitForTimeout(4000)
    const fim = await posicao(p)
    assert.ok(fim.y > 3.9, 'Plano e salto devem retornar ao chão')
    await terminar(s, `ritmo-${ritmo}`, 21, { inicio, fim })
  }
  if (caso === 'todos' || caso === 'ponte') {
    const s = await iniciar(58, 135),
      p = s.page
    await segurar(p, ['w'], 5000)
    const meio = await posicao(p)
    console.log('Ponte meio', JSON.stringify(meio))
    assert.ok(meio.y > 4, 'Piso da ponte deve sustentar o avatar')
    await segurar(p, ['w'], 6000)
    const norte = await posicao(p)
    console.log('Ponte norte', JSON.stringify(norte))
    assert.ok(norte.z < 120 && norte.y > 4)
    await segurar(p, ['s'], 11000)
    const sul = await posicao(p)
    console.log('Ponte retorno', JSON.stringify(sul))
    assert.ok(sul.z > 133 && sul.y > 4, JSON.stringify(sul))
    await segurar(p, ['Shift', 'w'], 5000)
    const fim = await posicao(p)
    assert.ok(fim.z < 120 && fim.y > 4)
    await terminar(s, 'ponte-ida-volta', 27, { meio, norte, sul, fim })
  }
  if (caso === 'todos' || caso === 'cobre') {
    const s = await iniciar(-40, 126),
      p = s.page,
      pontos = []
    for (const [x, z] of [
      [-35, 96],
      [-3, 109],
      [-3, 120],
      [0, 137],
      [-24, 132],
      [-40, 126],
    ]) {
      pontos.push(await andar(p, x, z))
      console.log('Circuito cobre', JSON.stringify(pontos.at(-1)))
    }
    // Esperar a gravação periódica, então conferir recarga pela chave pública do ensaio.
    await p.waitForTimeout(5500)
    const antes = await posicao(p)
    await p.reload()
    await pronto(p)
    const depois = await posicao(p)
    assert.ok(
      Math.hypot(antes.x - depois.x, antes.z - depois.z) < 0.6,
      'Retomada precisa manter posição segura',
    )
    await terminar(s, 'encosta-retorno', 30, { pontos, antes, depois, retomou: true })
  }
  if (caso === 'descida') {
    const s = await iniciar(-3, 109),
      pontos = []
    for (const [x, z] of [
      [-3, 120],
      [0, 137],
    ])
      pontos.push(await andar(s.page, x, z))
    await terminar(s, 'descida-farol', 30, { pontos })
  }
  if (caso === 'curadoria') {
    const s = await iniciar(36, 171, 'explorar', true),
      pontos = []
    for (const [x, z] of [
      [43, 171],
      [50, 171],
      [51.34, 171.27],
      [52.47, 172.03],
      [53.23, 173.16],
      [53.5, 174.5],
      [53.5, 181.5],
    ])
      pontos.push(await andar(s.page, x, z))
    assert.ok(
      pontos.some((p) => p.y > 4.6),
      'Precisa pisar na malha nativa do caminho',
    )
    await terminar(s, 'curadoria-caminho-real', 35, { pontos })
  }
  if (caso === 'todos' || caso === 'iris') {
    const s = await iniciar(18, 135.5),
      p = s.page
    await p.getByRole('button', { name: /Conversar com a Íris/ }).waitFor({ timeout: 25000 })
    s.inicio = (Date.now() - s.t0) / 1000
    await p.getByRole('button', { name: /Conversar com a Íris/ }).click()
    await p.getByRole('dialog', { name: 'Íris · estudo da personagem' }).waitFor()
    await p.waitForTimeout(10000)
    await p.getByRole('button', { name: 'Continuar explorando', exact: true }).click()
    await segurar(p, ['s'], 3000)
    await p.waitForTimeout(7000)
    await terminar(s, 'iris-conversa', 20, { estudo: true })
  }
  assert.equal(erros.length, 0, erros.join('\n'))
  writeFileSync(
    resolve(saida, `evidencias-${caso}.json`),
    JSON.stringify({ evidencias, erros }, null, 2),
  )
} finally {
  await browser.close()
}
