import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const base = process.env.ARQUIPELAGO_QA_URL ?? 'http://127.0.0.1:4530',
  saida = resolve(import.meta.dirname, '../../../output/faisca-concepts/qa'),
  grupo = process.argv.find((a) => a.startsWith('--parte='))?.split('=')[1] ?? 'movimento',
  erros = [],
  evidencias = []
mkdirSync(resolve(saida, 'videos/brutos'), { recursive: true })
mkdirSync(resolve(saida, 'depois'), { recursive: true })
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: [
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
  ],
})
function ouvir(p) {
  p.on('pageerror', (e) => {
    erros.push(e.message)
    console.log('ERRO', e.message)
  })
  p.on('console', (e) => {
    if (e.type() === 'error' && e.text().includes('Shader Error')) erros.push(e.text())
  })
}
async function pronto(p) {
  await p.waitForFunction(
    () =>
      ['pronto', 'erro'].includes(document.querySelector('.macro-topo')?.getAttribute('data-arte')),
    {},
    { timeout: 60000 },
  )
  assert.equal(
    await p.locator('.macro-topo').getAttribute('data-arte'),
    'pronto',
    await p.locator('body').innerText(),
  )
  await p.waitForTimeout(700)
}
async function dados(p) {
  return p
    .locator('.macro-painel dl')
    .evaluate((el) =>
      Object.fromEntries(
        [...el.querySelectorAll('dt')].map((e) => [
          e.textContent,
          e.nextElementSibling.textContent,
        ]),
      ),
    )
}
async function posicao(p) {
  const m = await dados(p),
    [x, y, z] = m.Posição.replace(' m', '')
      .split(', ')
      .map((v) => Number(v.replace(',', '.')))
  return { x, y, z, giro: Number(m['Giro da câmera'].replace(' rad', '')) }
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
  let anterior = null,
    semAvanco = 0
  for (let i = 0; i < 200; i++) {
    const a = await posicao(p),
      dx = x - a.x,
      dz = z - a.z,
      d = Math.hypot(dx, dz)
    if (d < 0.3) {
      await p.waitForTimeout(200)
      return posicao(p)
    }
    if (anterior && Math.hypot(a.x - anterior.x, a.z - anterior.z) < 0.025) semAvanco++
    else semAvanco = 0
    if (semAvanco > 12) throw Error(`Percurso bloqueado em ${JSON.stringify(a)}, destino ${x},${z}`)
    anterior = a
    const lx = dx * Math.cos(a.giro) - dz * Math.sin(a.giro),
      lz = dx * Math.sin(a.giro) + dz * Math.cos(a.giro),
      dt = Math.min(340, Math.max(70, (d / 1.65) * 1000)),
      comum = Math.min(Math.abs(lx), Math.abs(lz)),
      tx = lx > 0 ? 'd' : 'a',
      tz = lz > 0 ? 's' : 'w'
    if ((comum / d) * dt > 20) await segurar(p, [tx, tz], (comum / d) * dt * Math.SQRT2)
    const resto = (Math.abs(Math.abs(lx) - Math.abs(lz)) / d) * dt
    if (resto > 20) await segurar(p, [Math.abs(lx) > Math.abs(lz) ? tx : tz], resto)
    await p.waitForTimeout(100)
  }
  throw Error(`Tempo de percurso excedido: ${x},${z}`)
}
async function caso(nome, x, z, acao) {
  const c = await browser.newContext({
    viewport: { width: 960, height: 600 },
    recordVideo: { dir: resolve(saida, 'videos/brutos'), size: { width: 960, height: 600 } },
  })
  await c.addInitScript(
    ({ x, z }) => {
      localStorage.setItem('arquipelago:faisca:ensaio', 'preservado')
      localStorage.setItem('arquipelago:faisca:ensaio:gate21:templo:l2', 'referencia preservada')
      if (!localStorage.getItem('arquipelago:faisca:ensaio:concepts:templo:l2'))
        localStorage.setItem(
          'arquipelago:faisca:ensaio:concepts:templo:l2',
          JSON.stringify({
            versao: 2,
            ponteInstalada: false,
            visitados: ['casa'],
            posicao: { ilha: 'sua-ilha', local: { x, y: 4, z } },
          }),
        )
    },
    { x, z },
  )
  const p = await c.newPage()
  ouvir(p)
  const t0 = Date.now()
  try {
    await p.goto(`${base}/macro`)
    await pronto(p)
    await p.addStyleTag({
      content: '.macro-topo,.macro-painel,.macro-conexao{visibility:hidden!important}',
    })
    await p.locator('canvas').hover()
    await p.mouse.wheel(0, -1000)
    await p.waitForTimeout(500)
    const inicio = (Date.now() - t0) / 1000,
      t = Date.now(),
      dados = await acao(p),
      duracao = (Date.now() - t) / 1000
    await p.screenshot({ path: resolve(saida, `${nome}.png`) })
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
      String(duracao),
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
    evidencias.push({ nome, duracao, dados })
    console.log('PASS', nome, JSON.stringify(dados))
  } catch (e) {
    await p.screenshot({ path: resolve(saida, `${nome}-falha.png`) })
    console.log('FALHA', nome, JSON.stringify(await dados(p)))
    await c.close()
    throw e
  }
}
try {
  if (grupo === 'fotos') {
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 } }),
      p = await c.newPage()
    ouvir(p)
    for (const vista of [
      'porta',
      'praca',
      'horta',
      'oficina',
      'farol',
      'subida',
      'costa',
      'concept-praca',
      'concept-lago',
      'concept-horta',
      'escadas-farol',
      'ponte-proxima',
      'placa-costa',
      'placa-horta',
      'placa-patio',
    ]) {
      await p.goto(`${base}/macro?vista=${vista}`)
      await pronto(p)
      await p.screenshot({ path: resolve(saida, `depois/${vista}.png`) })
      evidencias.push({
        nome: vista,
        arquivo: `depois/${vista}.png`,
        viewport: [1280, 800],
        noite: false,
      })
      console.log('FOTO', vista)
    }
    for (const vista of ['concept-praca', 'concept-lago', 'escadas-farol', 'placa-costa']) {
      await p.goto(`${base}/macro?vista=${vista}&noite=1`)
      await pronto(p)
      await p.screenshot({ path: resolve(saida, `depois/${vista}-noite.png`) })
      evidencias.push({
        nome: vista,
        arquivo: `depois/${vista}-noite.png`,
        viewport: [1280, 800],
        noite: true,
      })
      console.log('FOTO noite', vista)
    }
    await c.close()
  }
  if (grupo === 'ponte' || grupo === 'movimento')
    await caso('ponte-ida-volta', 39, 133, async (p) => {
      const sul = await posicao(p),
        meio = await andar(p, 39, 127)
      assert.ok(meio.y > 5.5 && meio.y < 6.4, JSON.stringify(meio))
      const norte = await andar(p, 39, 121),
        voltaMeio = await andar(p, 39, 127),
        volta = await andar(p, 39, 133)
      assert.ok(norte.y > 4.3 && volta.y > 4.3)
      return { sul, meio, norte, voltaMeio, volta }
    })
  if (grupo === 'escadas' || grupo === 'movimento')
    await caso('escadas-subida-descida', -3, 120, async (p) => {
      const pontos = []
      for (const z of [117, 114, 111, 108, 106, 109, 112, 115, 120])
        pontos.push(await andar(p, -3, z))
      assert.ok(pontos[4].y > 10 && pontos[4].y < 11, JSON.stringify(pontos[4]))
      assert.ok(pontos.at(-1).y < 5.1)
      return pontos
    })
  if (grupo === 'passeio' || grupo === 'movimento')
    await caso('porta-praca-horta', 0, 150, async (p) => {
      const pontos = []
      for (const [x, z] of [
        [0, 141],
        [0, 137],
        [10, 138],
        [20, 139],
        [20, 146],
        [27, 147],
        [32, 145],
        [39, 133],
      ])
        pontos.push(await andar(p, x, z))
      await segurar(p, ['Shift', 's'], 900)
      await segurar(p, [' '], 160)
      await p.waitForTimeout(600)
      return pontos
    })
  if (grupo === 'avatar' || grupo === 'movimento')
    await caso('avatar-caminhada-corrida-curva-pulo', 0, 147, async (p) => {
      const inicio = await posicao(p)
      await segurar(p, ['w'], 2200)
      const caminhada = await posicao(p)
      await segurar(p, ['Shift', 'd'], 1800)
      const corrida = await posicao(p)
      await segurar(p, ['Shift', 'w', 'd'], 1200)
      await segurar(p, ['a'], 1400)
      const antesDoPulo = await posicao(p)
      await segurar(p, [' '], 120)
      await p.waitForTimeout(200)
      const noAr = await posicao(p)
      await p.waitForTimeout(1000)
      const pouso = await posicao(p)
      assert.ok(Math.hypot(caminhada.x - inicio.x, caminhada.z - inicio.z) > 2.7)
      assert.ok(Math.hypot(corrida.x - caminhada.x, corrida.z - caminhada.z) > 4.7)
      assert.ok(noAr.y > antesDoPulo.y + 0.2, JSON.stringify({ antesDoPulo, noAr }))
      return { inicio, caminhada, corrida, antesDoPulo, noAr, pouso }
    })
  if (grupo === 'placa' || grupo === 'movimento')
    await caso('placa-costa-aproximacao', 0, 150, async (p) => {
      const inicio = await posicao(p),
        aproximacao = await andar(p, 4.8, 151.5)
      await p.waitForTimeout(1800)
      return { inicio, aproximacao }
    })
  if (grupo === 'clique')
    await caso('caminhada-por-clique', 0, 150, async (p) => {
      const inicio = await posicao(p)
      await p.mouse.click(640, 405)
      await p.waitForTimeout(2400)
      const fim = await posicao(p)
      assert.ok(
        Math.hypot(fim.x - inicio.x, fim.z - inicio.z) > 0.5,
        JSON.stringify({ inicio, fim }),
      )
      return { inicio, fim }
    })
  if (grupo === 'nado' || grupo === 'movimento')
    await caso('lago-nado-retomada', 31, 127, async (p) => {
      const pontos = []
      for (const [x, z] of [
        [34.5, 127],
        [36.2, 129.5],
      ])
        pontos.push(await andar(p, x, z))
      await p.waitForTimeout(1200)
      assert.equal((await dados(p)).Nadando, 'sim')
      const nado = await posicao(p)
      assert.ok(nado.y > 3.4 && nado.y < 4.3)
      for (const [x, z] of [
        [33, 129.5],
        [31, 129],
      ])
        pontos.push(await andar(p, x, z))
      await p.waitForTimeout(6000)
      const saida = await posicao(p)
      assert.equal(
        await p.evaluate(() => localStorage.getItem('arquipelago:faisca:ensaio')),
        'preservado',
      )
      assert.equal(
        await p.evaluate(() => localStorage.getItem('arquipelago:faisca:ensaio:gate21:templo:l2')),
        'referencia preservada',
      )
      await p.reload()
      await pronto(p)
      const retomada = await posicao(p)
      assert.ok(
        Math.hypot(retomada.x - saida.x, retomada.z - saida.z) < 1,
        JSON.stringify({ saida, retomada }),
      )
      return { pontos, nado, saida, retomada }
    })
  if (grupo === 'perfil') {
    const c = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      }),
      p = await c.newPage()
    ouvir(p)
    for (const noite of [false, true]) {
      await p.goto(`${base}/macro${noite ? '?noite=1' : ''}`)
      await pronto(p)
      await p.getByText('Medidas e pontos de teste', { exact: true }).click()
      for (const lugar of ['Vila dos Criadores', 'Campos da Íris', 'Colina do Farol']) {
        await p.getByRole('button', { name: lugar, exact: true }).click()
        await p.waitForTimeout(1500)
        const amostras = []
        for (let i = 0; i < 8; i++) {
          await p.waitForTimeout(750)
          amostras.push(await dados(p))
        }
        const fps = amostras.map((a) => parseInt(a.Quadros, 10))
        assert.ok(fps.every(Number.isFinite))
        evidencias.push({
          nome: lugar,
          noite,
          amostras,
          fpsMin: Math.min(...fps),
          fpsMax: Math.max(...fps),
        })
        console.log('PERFIL', lugar, noite ? 'noite' : 'dia', Math.min(...fps), Math.max(...fps))
      }
    }
    const ambiente = await p.evaluate(() => {
      const canvas = document.querySelector('canvas'),
        gl = canvas.getContext('webgl2'),
        ext = gl?.getExtension('WEBGL_debug_renderer_info')
      return {
        userAgent: navigator.userAgent,
        pixelRatio: devicePixelRatio,
        pixels: [canvas.width, canvas.height],
        gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null,
      }
    })
    evidencias.push({ nome: 'ambiente da medição', ambiente })
    await c.close()
  }
  if (grupo === 'recursos') {
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 } }),
      p = await c.newPage()
    ouvir(p)
    await p.goto(`${base}/macro`)
    await pronto(p)
    await p.getByText('Medidas e pontos de teste', { exact: true }).click()
    const inicio = await dados(p),
      ciclos = []
    for (let i = 0; i < 3; i++) {
      await p.getByRole('button', { name: 'Bosque das Lanternas', exact: true }).click()
      await p.waitForFunction(
        () => document.querySelector('.macro-topo')?.getAttribute('data-arte') === 'longe',
      )
      await p.waitForTimeout(500)
      const longe = await dados(p)
      await p.getByRole('button', { name: 'Vila dos Criadores', exact: true }).click()
      await pronto(p)
      await p.waitForTimeout(1500)
      const perto = await dados(p)
      ciclos.push({ longe, perto })
      assert.ok(Number(perto.Texturas) > Number(longe.Texturas))
      console.log('RECURSOS', i + 1, JSON.stringify({ longe, perto }))
    }
    assert.ok(Number(ciclos[2].perto.Geometrias) - Number(ciclos[1].perto.Geometrias) <= 2)
    assert.ok(Number(ciclos[2].perto.Texturas) - Number(ciclos[1].perto.Texturas) <= 2)
    evidencias.push({ nome: 'renderer e descarregamento', inicio, ciclos })
    await c.close()
  }
  assert.equal(erros.length, 0, erros.join('\n'))
  writeFileSync(resolve(saida, `${grupo}.json`), JSON.stringify({ evidencias, erros }, null, 2))
} finally {
  await browser.close()
}
