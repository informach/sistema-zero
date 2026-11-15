import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const base = process.env.ARQUIPELAGO_QA_URL ?? 'http://127.0.0.1:4530',
  saida = resolve(import.meta.dirname, '../../../output/faisca-gate21'),
  erros = [],
  evidencias = []
mkdirSync(resolve(saida, 'comparativos'), { recursive: true })
mkdirSync(resolve(saida, 'videos/brutos'), { recursive: true })
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: [
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
  ],
})
async function pronto(p) {
  await p.waitForFunction(
    () => document.querySelector('.macro-topo')?.getAttribute('data-arte') === 'pronto',
    {},
    { timeout: 60000 },
  )
  await p.waitForTimeout(1800)
}
function ouvir(p) {
  p.on('pageerror', (e) => erros.push(e.message))
  p.on('console', (e) => {
    if (e.type() === 'error' && e.text().includes('Shader Error')) erros.push(e.text())
  })
}
async function posicao(p) {
  return p.locator('.macro-painel dl').evaluate((el) => {
    const ds = Object.fromEntries(
      [...el.querySelectorAll('dt')].map((e) => [e.textContent, e.nextElementSibling.textContent]),
    )
    const [x, y, z] = ds.Posição.replace(' m', '')
      .split(', ')
      .map((v) => Number(v.replace(',', '.')))
    return { x, y, z, giro: Number(ds['Giro da câmera'].replace(' rad', '')) }
  })
}
async function segurar(p, ks, ms) {
  for (const k of ks) await p.keyboard.down(k)
  try {
    await p.waitForTimeout(ms)
  } finally {
    for (const k of ks) await p.keyboard.up(k)
  }
}
async function andar(p, x, z) {
  for (let i = 0; i < 180; i++) {
    const a = await posicao(p),
      dx = x - a.x,
      dz = z - a.z,
      d = Math.hypot(dx, dz)
    if (d < 0.28) {
      await p.waitForTimeout(450)
      return posicao(p)
    }
    const lx = dx * Math.cos(a.giro) - dz * Math.sin(a.giro),
      lz = dx * Math.sin(a.giro) + dz * Math.cos(a.giro),
      dt = Math.min(340, Math.max(80, (d / 1.65) * 1000)),
      comum = Math.min(Math.abs(lx), Math.abs(lz)),
      tx = lx > 0 ? 'd' : 'a',
      tz = lz > 0 ? 's' : 'w'
    if ((comum / d) * dt > 20) await segurar(p, [tx, tz], (comum / d) * dt * Math.SQRT2)
    const resto = (Math.abs(Math.abs(lx) - Math.abs(lz)) / d) * dt
    if (resto > 20) await segurar(p, [Math.abs(lx) > Math.abs(lz) ? tx : tz], resto)
    await p.waitForTimeout(160)
  }
  throw Error(`Percurso bloqueado ${x},${z}: ${JSON.stringify(await posicao(p))}`)
}
async function gravar(nome, x, z, query, acao, segundos) {
  const parte = process.argv.find((a) => a.startsWith('--parte='))?.split('=')[1],
    grupo = nome.startsWith('piso-')
      ? 'pisos'
      : nome.startsWith('lago-')
        ? 'nado'
        : nome.startsWith('placa-')
          ? 'placa'
          : 'passeio'
  if (parte && parte !== grupo) return
  const c = await browser.newContext({
    viewport: { width: 960, height: 600 },
    recordVideo: { dir: resolve(saida, 'videos/brutos'), size: { width: 960, height: 600 } },
  })
  await c.addInitScript(
    ({ x, z, query }) => {
      const q = new URLSearchParams(query),
        piso = q.get('refino') ?? 'base',
        lago = q.get('lago') === 'l2' ? 'l2' : 'l1'
      const chave =
        q.has('refino') || q.has('lago')
          ? `arquipelago:faisca:ensaio:gate21:${piso}:${lago}`
          : 'arquipelago:faisca:ensaio'
      if (
        chave !== 'arquipelago:faisca:ensaio' &&
        !localStorage.getItem('arquipelago:faisca:ensaio')
      )
        localStorage.setItem('arquipelago:faisca:ensaio', 'ensaio principal preservado')
      if (!localStorage.getItem(chave))
        localStorage.setItem(
          chave,
          JSON.stringify({
            versao: 2,
            ponteInstalada: false,
            visitados: ['casa'],
            posicao: { ilha: 'sua-ilha', local: { x, y: 4, z } },
          }),
        )
    },
    { x, z, query },
  )
  const p = await c.newPage()
  ouvir(p)
  const t0 = Date.now()
  await p.goto(`${base}/macro?${query}`)
  await pronto(p)
  await p.addStyleTag({
    content: '.macro-topo,.macro-painel,.macro-conexao{visibility:hidden!important}',
  })
  await p.locator('canvas').hover()
  await p.mouse.wheel(0, -1000)
  await p.waitForTimeout(600)
  const inicio = (Date.now() - t0) / 1000,
    tempo = Date.now(),
    dados = await acao(p)
  await p.waitForTimeout(Math.max(0, segundos * 1000 - (Date.now() - tempo)) + 400)
  await p.screenshot({ path: resolve(saida, `videos/${nome}.png`) })
  const video = p.video()
  await c.close()
  const bruto = await video.path()
  execFileSync('ffmpeg', [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-ss',
    String(inicio),
    '-i',
    bruto,
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
    resolve(saida, `videos/${nome}.mp4`),
  ])
  evidencias.push({ nome, segundos, dados })
  console.log(`PASS ${nome}`)
}
try {
  if (!process.argv.includes('--movimento')) {
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 } }),
      p = await c.newPage()
    ouvir(p)
    for (const piso of ['base', 'reino', 'faroeste', 'templo'])
      for (const vista of ['piso', 'piso-baixo', 'piso-noite', 'horta']) {
        await p.goto(
          `${base}/macro?refino=${piso}&lago=l2&vista=${vista.replace('-noite', '')}${vista.endsWith('-noite') ? '&noite=1' : ''}`,
        )
        await pronto(p)
        await p.screenshot({ path: resolve(saida, `comparativos/${piso}-${vista}.png`) })
      }
    for (const agua of ['l1', 'l2'])
      for (const vista of ['ponte-sul', 'lago-lateral', 'ponte-norte']) {
        await p.goto(`${base}/macro?lago=${agua}&vista=${vista}`)
        await pronto(p)
        await p.screenshot({ path: resolve(saida, `comparativos/agua-${agua}-${vista}.png`) })
      }
    await c.close()
  }
  if (!process.argv.includes('--fotos')) {
    for (const piso of ['reino', 'faroeste', 'templo'])
      await gravar(
        `piso-${piso}`,
        0,
        137,
        `refino=${piso}&lago=l2`,
        async (p) => {
          const pontos = []
          for (const [x, z] of [
            [6, 137.6],
            [13, 138.3],
            [20, 139],
          ]) {
            const a = await andar(p, x, z)
            assert.ok(a.y > 4.45 && a.y < 4.8, JSON.stringify(a))
            pontos.push(a)
          }
          await segurar(p, ['Shift', 'a'], 2000)
          await segurar(p, [' '], 200)
          return pontos
        },
        24,
      )
    for (const lago of ['l1', 'l2'])
      await gravar(
        `lago-nado-${lago}`,
        49,
        127,
        `refino=faroeste&lago=${lago}`,
        async (p) => {
          const entrada = await andar(p, 54.5, 127),
            nado = await andar(p, 55.2, lago === 'l2' ? 129.5 : 127)
          await p.waitForTimeout(1400)
          const parado = await posicao(p)
          const nadando = await p
            .locator('.macro-painel dl')
            .evaluate(
              (el) =>
                [...el.querySelectorAll('dt')].find((e) => e.textContent === 'Nadando')
                  .nextElementSibling.textContent,
            )
          assert.equal(
            nadando,
            'sim',
            'O controlador real precisa estar nadando, não apenas pisando no raso',
          )
          assert.ok(parado.y < 4.3 && parado.y > 3.4, `Nado: ${JSON.stringify(parado)}`)
          await andar(p, 49, 127)
          const saida = await andar(p, 48, 129)
          assert.ok(saida.y > 4.45, JSON.stringify(saida))
          await p.waitForTimeout(5500)
          assert.equal(
            await p.evaluate(() => localStorage.getItem('arquipelago:faisca:ensaio')),
            'ensaio principal preservado',
            'Estado principal deve permanecer intacto',
          )
          await p.reload()
          await pronto(p)
          const retomada = await posicao(p)
          assert.ok(
            Math.hypot(retomada.x - saida.x, retomada.z - saida.z) < 1,
            'Retomada deve ficar na praia, fora da bacia',
          )
          return { entrada, nado, parado, saida, retomada }
        },
        40,
      )
    await gravar(
      'porta-praca-horta',
      0,
      150,
      'refino=templo&lago=l2',
      async (p) => {
        const pontos = []
        for (const [x, z] of [
          [0, 137],
          [6, 137.6],
          [13, 138.3],
          [20, 139],
        ])
          pontos.push(await andar(p, x, z))
        return pontos
      },
      45,
    )
    await gravar(
      'placa-costa',
      1,
      146,
      'refino=templo&lago=l2',
      async (p) => {
        const p1 = await andar(p, 3.2, 142.2)
        await p.waitForTimeout(2000)
        return p1
      },
      20,
    )
  }
  assert.equal(erros.length, 0, erros.join('\n'))
  writeFileSync(
    resolve(
      saida,
      process.argv.includes('--fotos')
        ? 'gate21-fotos.json'
        : `gate21-${process.argv.find((a) => a.startsWith('--parte='))?.split('=')[1] ?? 'movimento'}.json`,
    ),
    JSON.stringify({ evidencias, erros }, null, 2),
  )
} finally {
  await browser.close()
}
