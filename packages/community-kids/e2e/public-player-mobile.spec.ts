import { devices, expect, type Page, test } from '@playwright/test'

test.use({ ...devices['Pixel 7'] })

const ID = '11111111-1111-4111-8111-111111111111'

/**
 * Um projeto jogável mínimo. O `canvas` importa: é dele que o iframe tira a
 * PROPORÇÃO que informa ao host (`sz:stage`), e é ela que dimensiona a moldura.
 */
function fakeProject(canvas: { w: number; h: number } | null, opts: { atrasoMs?: number } = {}) {
  const now = Date.now()
  const atrasado = canvas && opts.atrasoMs
  const tela =
    canvas && !atrasado
      ? `<canvas width="${canvas.w}" height="${canvas.h}" style="width:100%"></canvas>`
      : '<p style="font:16px sans-serif">tela de titulo</p>'
  // Tela de título que só vira canvas quando a criança "começa" — é o que o
  // Jogo 2D Avançado faz de verdade.
  const script = atrasado
    ? `setTimeout(function () { var c = document.createElement('canvas'); c.width = ${canvas.w}; c.height = ${canvas.h}; c.style.width = '100%'; document.body.appendChild(c); }, ${opts.atrasoMs});`
    : ''
  return {
    id: ID,
    name: 'Meu primeiro jogo',
    createdAt: now,
    updatedAt: now,
    mode: 'blocks',
    files: {
      'index.html': `<!doctype html><html><body style="margin:0"><h1>Meu primeiro jogo</h1>${tela}</body></html>`,
      'style.css': '',
      'script.js': script,
    },
    extraFiles: [],
    assets: [],
    ir: {
      version: 2,
      html: [],
      css: [],
      behavior: { start: [], events: [], loops: [] },
      extensions: [],
    },
    blocksState: { blocks: { languageVersion: 0, blocks: [] } },
    installedExtensions: [],
  }
}

async function abrirJogo(
  page: Page,
  canvas: { w: number; h: number } | null,
  opts: { atrasoMs?: number } = {},
) {
  await page.route(`**/api/studio/play/${ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'X-Author-Name': encodeURIComponent('Sofia') },
      body: JSON.stringify(fakeProject(canvas, opts)),
    })
  })
  await page.goto(`/jogar/${ID}`)
  await expect(page.getByText('Meu primeiro jogo').first()).toBeVisible()
}

/** Área na TELA da caixa do jogo (o boundingBox já considera o giro). */
async function areaDoJogo(page: Page) {
  const box = await page.locator('iframe').boundingBox()
  if (!box) throw new Error('o palco do jogo não foi montado')
  return { area: box.width * box.height, aspect: box.width / box.height }
}

interface Modos {
  __modos?: string[]
  __teclas?: string[]
  __codigos?: string[]
}

/**
 * Abre um jogo que ANOTA o que recebe: as teclas, os `code` e os pedidos de
 * ligar/desligar o pad que o próprio runtime desenha.
 */
async function abrirComRegistro(
  page: Page,
  ir: unknown[] = [],
  comPadProprio = false,
  pedeTelaCheia = false,
) {
  const now = Date.now()
  const projeto = {
    id: ID,
    name: 'Meu primeiro jogo',
    createdAt: now,
    updatedAt: now,
    mode: 'blocks',
    files: {
      'index.html':
        '<!doctype html><html><body style="margin:0"><h1>Meu primeiro jogo</h1><canvas width="800" height="480" style="width:100%"></canvas></body></html>',
      'style.css': '',
      'script.js': `window.__teclas = []; window.__codigos = []; window.__modos = [];
window.addEventListener('keydown', function (e) { window.__teclas.push(e.key); window.__codigos.push(e.code); });
${comPadProprio ? 'window.SZGame2D = { enableClassicControls: function (m) { window.__modos.push(m); } };' : ''}
${pedeTelaCheia ? "document.querySelector('canvas').addEventListener('pointerdown', function () { try { document.documentElement.requestFullscreen(); } catch (e) {} });" : ''}
`,
    },
    extraFiles: [],
    assets: [],
    ir: {
      version: 2,
      html: [],
      css: [],
      behavior: { start: ir, events: [], loops: [] },
      extensions: [],
    },
    blocksState: { blocks: { languageVersion: 0, blocks: [] } },
    installedExtensions: [],
  }
  await page.route(`**/api/studio/play/${ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'X-Author-Name': encodeURIComponent('Sofia') },
      body: JSON.stringify(projeto),
    })
  })
  await page.goto(`/jogar/${ID}`)
  await expect(page.getByText('Meu primeiro jogo').first()).toBeVisible()
  await page.waitForTimeout(1200)
}

function frameDoJogo(page: Page) {
  return page.frames().find((f) => f !== page.mainFrame())
}
async function teclasDoJogo(page: Page): Promise<string[]> {
  return (await frameDoJogo(page)?.evaluate(() => (window as never as Modos).__teclas ?? [])) ?? []
}
async function codigosDoJogo(page: Page): Promise<string[]> {
  return (await frameDoJogo(page)?.evaluate(() => (window as never as Modos).__codigos ?? [])) ?? []
}

test('controles automáticos do player móvel podem ser ocultados e reexibidos', async ({ page }) => {
  await abrirJogo(page, { w: 800, h: 480 })

  const hideControls = page.getByRole('button', { name: 'Ocultar controles' })
  await expect(hideControls).toBeVisible()
  await hideControls.click()
  await expect(page.getByRole('button', { name: 'Mostrar controles' })).toBeVisible()

  await page.getByRole('button', { name: 'Mostrar controles' }).click()
  await expect(page.getByRole('button', { name: 'Ocultar controles' })).toBeVisible()
})

test('sem os controles, o palco gira e o jogo fica MUITO maior', async ({ page }) => {
  await abrirJogo(page, { w: 800, h: 480 })

  const comControles = await areaDoJogo(page)
  await page.getByRole('button', { name: 'Ocultar controles' }).click()
  await expect(page.getByRole('button', { name: 'Mostrar controles' })).toBeVisible()

  // A moldura só cresce depois que o giro entra; espera o layout assentar.
  await expect
    .poll(async () => (await areaDoJogo(page)).area / comControles.area, { timeout: 5_000 })
    .toBeGreaterThan(2)

  const viewport = page.viewportSize() ?? { width: 0, height: 0 }
  const box = await page.locator('iframe').boundingBox()
  if (!box) throw new Error('o palco do jogo não foi montado')
  // Girado, a caixa na TELA fica em pé: é o jogo deitado usando o lado comprido
  // do celular. Quem endireita é a criança, virando o aparelho.
  expect(box.height).toBeGreaterThan(box.width)
  // E ocupa a maior parte da tela, que é o motivo de o giro existir.
  expect((box.width * box.height) / (viewport.width * viewport.height)).toBeGreaterThan(0.6)

  // ⚠️ INTEIRA na tela. Área grande não basta: com a caixa maior que a área de
  // alinhamento, o Chromium recuava para `start` e metade do jogo ficava FORA
  // da tela — grande e inalcançável, que é pior do que pequeno.
  expect(box.x).toBeGreaterThanOrEqual(-1)
  expect(box.y).toBeGreaterThanOrEqual(-1)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1)
})

test('trocar de modo NÃO recria o iframe: a partida continua', async ({ page }) => {
  await abrirJogo(page, { w: 800, h: 480 })

  // Carimba o ELEMENTO. Um iframe novo nasce sem a marca — e recarrega o jogo.
  await page.locator('iframe').evaluate((el) => {
    el.setAttribute('data-marca-da-partida', 'viva')
  })

  await page.getByRole('button', { name: 'Ocultar controles' }).click()
  await expect(page.getByRole('button', { name: 'Mostrar controles' })).toBeVisible()
  await expect(page.locator('iframe')).toHaveAttribute('data-marca-da-partida', 'viva')

  await page.getByRole('button', { name: 'Mostrar controles' }).click()
  await expect(page.getByRole('button', { name: 'Ocultar controles' })).toBeVisible()
  await expect(page.locator('iframe')).toHaveAttribute('data-marca-da-partida', 'viva')
})

test('um jogo EM PÉ ganha a moldura dele e não gira', async ({ page }) => {
  await abrirJogo(page, { w: 320, h: 480 })
  await page.getByRole('button', { name: 'Ocultar controles' }).click()

  // A moldura segue o formato do jogo em vez de encaixotá-lo em 5:3 — era o
  // pior caso de "pouca área de jogo" que existia aqui.
  await expect.poll(async () => (await areaDoJogo(page)).aspect, { timeout: 5_000 }).toBeLessThan(1)

  // E girar encolheria: por isso a régua é geométrica, não "é celular".
  const { width } = page.viewportSize() ?? { width: 0 }
  const box = await page.locator('iframe').boundingBox()
  expect(box?.width ?? 0).toBeGreaterThan(width * 0.8)
})

test('a tela de título que só vira canvas depois ainda ajusta a moldura', async ({ page }) => {
  test.setTimeout(40_000)
  // O Jogo 2D Avançado só cria o canvas quando a criança aperta "Começar", e ela
  // pode ficar na tela de título muito mais do que a rajada inicial de perguntas.
  await abrirJogo(page, { w: 320, h: 480 }, { atrasoMs: 7_000 })
  await page.getByRole('button', { name: 'Ocultar controles' }).click()

  // ⚠️ A metade que precisa FALHAR: sem canvas o palco preenche a caixa, que num
  // celular em pé já é mais alta que larga. Cobrar só "mais alta que larga"
  // passava na hora, sem esperar canvas nenhum.
  expect((await areaDoJogo(page)).aspect).not.toBeCloseTo(320 / 480, 1)

  await expect
    .poll(async () => (await areaDoJogo(page)).aspect, { timeout: 20_000 })
    .toBeCloseTo(320 / 480, 1)
})

test('um projeto SEM canvas nenhum continua com uma moldura sã', async ({ page }) => {
  await abrirJogo(page, null)

  const box = await page.locator('iframe').boundingBox()
  if (!box) throw new Error('o palco do jogo não foi montado')
  // Sem palco a página PREENCHE a caixa que sobrou, em vez de ser encaixotada
  // numa proporção de jogo que ela não tem.
  // ⚠️ O que este teste guarda é o PISO, não a proporção: neste celular a caixa
  // disponível é quase 5:3, então preencher e encaixotar dão quase o mesmo
  // número e medir não os distingue. O caminho ruim aqui é o `<iframe>` cair na
  // altura intrínseca dele (150px) e a página virar uma tira.
  expect(box.height).toBeGreaterThan(180)
  expect(box.width).toBeGreaterThan(300)
})

test.describe('celular deitado', () => {
  test.use({ viewport: { width: 915, height: 412 } })

  test('no console deitado o direcional fica na altura do jogo', async ({ page }) => {
    await abrirJogo(page, { w: 800, h: 480 })

    const dpad = await page.getByRole('button', { name: 'Para cima' }).boundingBox()
    const jogo = await page.locator('iframe').boundingBox()
    if (!dpad || !jogo) throw new Error('console deitado não montou')

    // O "Up" é o topo do direcional (128px de altura), então o centro dele fica
    // 64px abaixo. Com `align-items: stretch` na linha inteira o direcional
    // grudava no ALTO e ficava ~60px acima do centro do jogo.
    const centroDpad = dpad.y + 64
    const centroJogo = jogo.y + jogo.height / 2
    expect(Math.abs(centroDpad - centroJogo)).toBeLessThan(24)
  })

  test('deitado e sem controles, o palco usa a altura toda', async ({ page }) => {
    await abrirJogo(page, { w: 800, h: 480 })
    await page.getByRole('button', { name: 'Ocultar controles' }).click()
    await page.waitForTimeout(600)

    const box = await page.locator('iframe').boundingBox()
    if (!box) throw new Error('o palco do jogo não foi montado')
    // A fórmula antiga reservava 8rem de cabeçalho onde ele mede ~68px, e o
    // palco ficava menor do que cabia. Agora a caixa é MEDIDA.
    expect(box.height / 412).toBeGreaterThan(0.68)
  })
})

test('o teclado chega ao jogo SEM a criança clicar nele', async ({ page }) => {
  await abrirComRegistro(page)

  // ⚠️ O foco nasce na página de FORA. Antes deste lote a criança abria o link no
  // computador, apertava a seta e não acontecia nada até clicar no jogo.
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => teclasDoJogo(page)).toContain('ArrowRight')
})

test('a cruz faz DIAGONAL: um dedo no canto pede as duas direções', async ({ page }) => {
  await abrirComRegistro(page)
  const cruz = await page.getByRole('group', { name: 'Direcional' }).boundingBox()
  if (!cruz) throw new Error('direcional não montou')

  // Canto superior direito da cruz. Com um botão por braço isto era impossível.
  await page.mouse.move(cruz.x + cruz.width * 0.86, cruz.y + cruz.height * 0.14)
  await page.mouse.down()
  await expect.poll(() => teclasDoJogo(page)).toContain('ArrowUp')
  expect(await teclasDoJogo(page)).toContain('ArrowRight')
  await page.mouse.up()
})

test('o botão de fogo manda a tecla com o code que o 3D exige', async ({ page }) => {
  await abrirComRegistro(page, [{ type: 'g2d:keyDown', key: 'f' }])

  const fogo = page.getByRole('button', { name: 'Soltar fogo (Y)' })
  await expect(fogo).toBeVisible()
  await fogo.click()

  // ⚠️ `KeyF`, e não `f`: o 3D lê event.code CRU. Um botão com o code errado é um
  // botão morto com cara de certo.
  await expect.poll(() => codigosDoJogo(page)).toContain('KeyF')
})

test('jogo com pad próprio não fica com DOIS direcionais na tela', async ({ page }) => {
  await abrirComRegistro(page, [{ type: 'g2d:enableClassicControls', mode: 'auto' }], true)

  // O console de fora está desenhado, então o de dentro tem de sair.
  await expect
    .poll(
      async () =>
        (await frameDoJogo(page)?.evaluate(() => (window as never as Modos).__modos ?? [])) ?? [],
    )
    .toContain('off')
})

test('quando o JOGO toma a tela cheia, a criança não fica sem controles', async ({ page }) => {
  await abrirComRegistro(page, [{ type: 'g2d:enableClassicControls', mode: 'auto' }], true, true)

  const jogo = await page.locator('iframe').boundingBox()
  if (!jogo) throw new Error('sem palco')
  await page.mouse.click(jogo.x + jogo.width / 2, jogo.y + jogo.height / 2)

  // ⚠️ Aqui quem vai para a tela cheia é o `<iframe>`, e o console fica FORA
  // dele. Promover o pedido para o console é IMPOSSÍVEL: o gesto foi dentro do
  // iframe, então a página de fora não tem ativação e o navegador recusa com
  // "Permissions check failed" (medido). O que dá é pedir ao jogo que desenhe o
  // pad DELE enquanto estiver com a tela.
  // ⚠️ O que vale é o ESTADO em que o jogo fica, não quantas vezes foi avisado: o
  // pedido é idempotente e sai também na resposta do palco, para fechar a corrida
  // com o "Ao iniciar" do jogo. Cravar o array exato quebrava por um `off` a mais.
  await expect
    .poll(
      async () =>
        (await frameDoJogo(page)?.evaluate(() => (window as never as Modos).__modos ?? [])) ?? [],
    )
    .toEqual(expect.arrayContaining(['off', 'auto']))

  const modos =
    (await frameDoJogo(page)?.evaluate(() => (window as never as Modos).__modos ?? [])) ?? []
  // Com o jogo segurando a tela, o pad DELE é o que fica de pé.
  expect(modos.at(-1)).toBe('auto')
})

test('o botão de tela cheia leva e TRAZ de volta', async ({ page }) => {
  await abrirJogo(page, { w: 800, h: 480 })

  const emTelaCheia = () => page.evaluate(() => document.fullscreenElement !== null)
  expect(await emTelaCheia()).toBe(false)

  await page.getByRole('button', { name: 'Tela cheia' }).click()
  await expect.poll(emTelaCheia).toBe(true)
  // O MESMO botãozinho agora oferece a volta.
  const voltar = page.getByRole('button', { name: 'Sair da tela cheia' })
  await expect(voltar).toBeVisible()

  await voltar.click()
  await expect.poll(emTelaCheia).toBe(false)
  await expect(page.getByRole('button', { name: 'Tela cheia' })).toBeVisible()
})

test('o botão do CABEÇALHO também leva e traz, com o palco girado', async ({ page }) => {
  await abrirJogo(page, { w: 800, h: 480 })
  await page.getByRole('button', { name: 'Ocultar controles' }).click()
  await expect(page.getByRole('button', { name: 'Mostrar controles' })).toBeVisible()

  // Caminho DIFERENTE do botão do console: outro alvo (a raiz do palco) e outro
  // componente. Sem esta guarda, só a barra do console estava coberta.
  await page.getByRole('button', { name: 'Tela cheia' }).click()
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement?.tagName ?? null))
    .toBe('DIV')
  // ⚠️ O alvo é a RAIZ, e não o iframe: é ela que carrega o giro. Indo pelo
  // iframe, o jogo voltaria pequeno e em pé dentro da tela cheia.
  expect(await page.locator('[style*="rotate(90deg)"]').count()).toBeGreaterThan(0)

  await page.getByRole('button', { name: 'Sair da tela cheia' }).click()
  await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(false)
  await expect(page.getByRole('button', { name: 'Tela cheia' })).toBeVisible()
})
