/**
 * O álbum de coleções e o modo foto no navegador (fase2-09). Só usa a plataforma falsa, sem banco.
 *
 * Abre o álbum pelo menu, confere as cinco seções, entra no modo foto (F no computador, o botão do
 * menu no toque), confere que o HUD sumiu, que o personagem fica parado e a câmera gira, tira a
 * foto e confere o PNG baixado (maior que zero e com a assinatura de PNG), e sai (Esc ou "Voltar").
 *
 * No Windows: `bun build playground/verificar-album-browser.ts --target=node --external
 * playwright-core --outfile .cache/verificar-album-browser.mjs && node .cache/verificar-album-browser.mjs`.
 * Aceita `ARQUIPELAGO_CHROMIUM`, `ARQUIPELAGO_TEST_PORT` e `ARQUIPELAGO_PRINTS`.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { chromium } from 'playwright-core'
import { LUNETA } from '../src/mundo/luneta-medidas'

const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4597)
const base = `http://127.0.0.1:${porta}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/album')
mkdirSync(prints, { recursive: true })
const chromiumLinux = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const executavel =
  process.env.ARQUIPELAGO_CHROMIUM ?? (existsSync(chromiumLinux) ? chromiumLinux : undefined)
const servidor = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(porta) },
  stdio: ['ignore', 'pipe', 'pipe'],
})
servidor.stdout.on('data', () => {})
servidor.stderr.on('data', (d) => process.stderr.write(d))

type Medida = {
  posicao: { x: number; y: number; z: number }
  camera: { x: number; y: number; z: number }
}
type Janela = typeof globalThis & { __arquipelagoDesenho?: Medida }

/** Um jogo com um pouco de cada coleção, fora de casa, perto da luneta (para a foto ter paisagem). */
function salvamentoComColecoes() {
  const s = criarSalvamentoInicial(new Date())
  const ganhoEm = new Date().toISOString()
  return {
    revisao: 1,
    atualizadoEm: ganhoEm,
    salvamento: {
      ...s,
      posicao: { x: LUNETA.x, y: 1.6, z: 28 },
      casa: { portaNova: true },
      bichos: { ...s.bichos, achados: ['cachorro', 'gato'] },
      moradores: { ...s.moradores, bento: { ...s.moradores.bento, amizade: 290 } },
      percursos: {
        'bosque-copas': {
          estrelas: { chegada: true, tempo: false, vagalumes: true },
          melhorTempoMs: 74_500,
        },
      },
      projetos: {
        geladeira: {
          ganhoEm,
          aparencia: { origem: 'pinta', id: 'geladeira-do-album' },
          aparencias: [{ origem: 'pinta', id: 'geladeira-do-album' }],
        },
        casinha: { ganhoEm, aparencia: null, aparencias: [] },
      },
      lumis: { estrelinha: 2, pitanga: 3, brigadeiro: 1 },
    },
  }
}

const CASOS = [
  {
    nome: 'computador',
    largura: 1280,
    altura: 800,
    toque: false,
    reduzido: false,
    url: '/?posicao=2',
    semeado: true,
    titulos: [
      'Bichos do Bosque: 2 de 4',
      'Estrelas dos percursos: 2 de 6',
      'Aparências guardadas: 1 de 9',
      'Lumis presos: 3 de 14',
    ],
    naoEncontrados: 11,
  },
  {
    nome: 'celular',
    largura: 390,
    altura: 844,
    toque: true,
    reduzido: true,
    url: '/?novo=1&persistir=0&posicao=2',
    semeado: false,
    titulos: [
      'Bichos do Bosque: 0 de 4',
      'Estrelas dos percursos: 0 de 6',
      'Aparências guardadas: 0 de 9',
      'Lumis presos: 0 de 14',
    ],
    naoEncontrados: 14,
  },
] as const

let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  const limite = Date.now() + 30_000
  while (true) {
    if (servidor.exitCode !== null) throw new Error('O playground encerrou antes de iniciar')
    try {
      if ((await fetch(base)).ok) break
    } catch {}
    if (Date.now() > limite) throw new Error('O playground não iniciou')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({
    ...(executavel ? { executablePath: executavel } : { channel: 'chrome' }),
    headless: true,
  })
  for (const caso of CASOS) {
    const contexto = await browser.newContext({
      viewport: { width: caso.largura, height: caso.altura },
      reducedMotion: caso.reduzido ? 'reduce' : 'no-preference',
      hasTouch: caso.toque,
      isMobile: caso.toque,
      acceptDownloads: true,
    })
    const salvo = caso.semeado ? JSON.stringify(salvamentoComColecoes()) : null
    await contexto.addInitScript((salvo) => {
      localStorage.setItem('arquipelago:medir', '1')
      if (salvo) localStorage.setItem('arquipelago-playground', salvo)
    }, salvo)
    const pagina = await contexto.newPage()
    pagina.setDefaultTimeout(60_000)
    const erros: string[] = []
    pagina.on('pageerror', (e) => erros.push(e.message))
    await pagina.goto(`${base}${caso.url}`, { waitUntil: 'networkidle' })
    await pagina.waitForFunction(() => (globalThis as Janela).__arquipelagoDesenho?.posicao)
    await pagina.waitForTimeout(1500)

    // ── O álbum ──────────────────────────────────────────────────────────────────────────────
    await pagina.getByRole('button', { name: 'Abrir o menu' }).click()
    await pagina
      .getByRole('dialog', { name: 'Menu do jogo' })
      .getByRole('button', { name: 'Álbum de coleções' })
      .click()
    const album = pagina.getByRole('dialog', { name: 'Álbum de coleções' })
    await album.waitFor()
    const titulos = await album.locator('h3').allTextContents()
    assert.equal(titulos.length, 5, `seções: ${titulos.join(' | ')}`)
    for (const t of caso.titulos)
      assert(titulos.includes(t), `falta "${t}" em ${titulos.join(' | ')}`)
    assert(titulos.some((t) => t.startsWith('Receitas: ')))
    assert.equal(await album.getByText('Ainda não encontrado').count(), caso.naoEncontrados)
    assert.equal(await album.locator('.arq-album-lumi').count(), 14)
    assert.equal(await album.locator('.arq-album-lumi.silhueta').count(), caso.naoEncontrados)
    // Nenhuma rolagem para o lado no painel.
    const larguras = await album.evaluate((el) => ({ rola: el.scrollWidth, cabe: el.clientWidth }))
    assert(
      larguras.rola <= larguras.cabe + 1,
      `o álbum rola para o lado: ${JSON.stringify(larguras)}`,
    )
    await pagina.screenshot({ path: path.join(prints, `${caso.nome}-1-album.png`) })
    await album.locator('#arq-album-aparencias').scrollIntoViewIfNeeded()
    await pagina.screenshot({ path: path.join(prints, `${caso.nome}-2-album-aparencias.png`) })
    await album.locator('#arq-album-lumis').scrollIntoViewIfNeeded()
    await album.getByRole('button', { name: 'Voltar ao jogo' }).scrollIntoViewIfNeeded()
    await pagina.screenshot({ path: path.join(prints, `${caso.nome}-3-album-lumis.png`) })
    await album.getByRole('button', { name: 'Voltar ao jogo' }).click()
    await album.waitFor({ state: 'hidden' })

    // ── O modo foto ──────────────────────────────────────────────────────────────────────────
    assert.equal(await pagina.locator('.arq-necessidades').count(), 1)
    if (caso.toque) {
      await pagina.getByRole('button', { name: 'Abrir o menu' }).click()
      await pagina
        .getByRole('dialog', { name: 'Menu do jogo' })
        .getByRole('button', { name: 'Modo foto' })
        .click()
    } else {
      await pagina.locator('canvas').click({ position: { x: 640, y: 300 } })
      await pagina.keyboard.press('f')
    }
    const foto = pagina.getByRole('region', { name: 'Modo foto' })
    await foto.waitFor()
    // O HUD, a fala do Zappy, as dicas e o toque somem.
    for (const seletor of [
      '.arq-necessidades',
      '.arq-topo-dir',
      '.arq-dica',
      '.arq-acao',
      '.arq-inventario',
      '.arq-toque',
      '.arq-zona-joystick',
    ])
      assert.equal(await pagina.locator(seletor).count(), 0, `${seletor} continua na tela`)
    const animacao = await foto.evaluate((el) => getComputedStyle(el).animationName)
    assert.equal(animacao, caso.reduzido ? 'none' : 'arq-entra')
    // Os botões não cobrem o direcional (a metade esquerda de baixo, `arq-zona-joystick`).
    for (const nome of ['Tirar foto', 'Voltar']) {
      const r = await pagina.getByRole('button', { name: nome, exact: true }).boundingBox()
      assert(r)
      const naZona = r.x < caso.largura / 2 && r.y + r.height > caso.altura * 0.45
      assert(!naZona, `"${nome}" cobre o direcional: ${JSON.stringify(r)}`)
    }
    // O personagem fica parado e a câmera gira com o arrasto.
    await pagina.waitForTimeout(600)
    const antes = await pagina.evaluate(() => (globalThis as Janela).__arquipelagoDesenho)
    assert(antes)
    await pagina.keyboard.down('w')
    await pagina.waitForTimeout(600)
    await pagina.keyboard.up('w')
    const meio = { x: caso.largura / 2, y: caso.altura / 2 }
    await pagina.mouse.move(meio.x, meio.y)
    await pagina.mouse.down()
    await pagina.mouse.move(meio.x + 160, meio.y + 20, { steps: 8 })
    await pagina.mouse.up()
    await pagina.waitForTimeout(1200)
    const depois = await pagina.evaluate(() => (globalThis as Janela).__arquipelagoDesenho)
    assert(depois)
    const andou = Math.hypot(depois.posicao.x - antes.posicao.x, depois.posicao.z - antes.posicao.z)
    assert(andou < 0.05, `o personagem andou ${andou} m no modo foto`)
    const girou = Math.hypot(
      depois.camera.x - antes.camera.x,
      depois.camera.y - antes.camera.y,
      depois.camera.z - antes.camera.z,
    )
    assert(girou > 0.3, `a câmera não girou (${girou} m)`)
    await pagina.screenshot({ path: path.join(prints, `${caso.nome}-4-modo-foto.png`) })

    const baixando = pagina.waitForEvent('download')
    await pagina.getByRole('button', { name: 'Tirar foto', exact: true }).click()
    const download = await baixando
    const arquivo = path.join(prints, `${caso.nome}-5-foto-baixada.png`)
    await download.saveAs(arquivo)
    const png = readFileSync(arquivo)
    assert(png.length > 0, 'o PNG veio vazio')
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
    assert.match(download.suggestedFilename(), /^arquipelago-\d{4}-\d{2}-\d{2}-\d{2}h\d{2}\.png$/)
    await foto.getByText('Foto pronta. Ela ficou só neste aparelho.').waitFor()
    await pagina.screenshot({ path: path.join(prints, `${caso.nome}-6-foto-pronta.png`) })

    // Sair restaura o HUD.
    if (caso.toque) await pagina.getByRole('button', { name: 'Voltar', exact: true }).click()
    else await pagina.keyboard.press('Escape')
    await foto.waitFor({ state: 'hidden' })
    await pagina.locator('.arq-necessidades').waitFor()
    assert.equal(await pagina.locator('.arq-topo-dir').count(), 1)
    if (caso.toque) assert.equal(await pagina.locator('.arq-zona-joystick').count(), 1)
    assert.deepEqual(erros, [])
    console.log(
      `PASS ${caso.nome}: álbum com as cinco seções, modo foto sem HUD, PNG de ${png.length} bytes, volta do HUD`,
    )
    await contexto.close()
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (servidor.exitCode === null) servidor.kill()
}
