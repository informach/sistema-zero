/**
 * Os prints da aula real para o Passo a passo de "Meu primeiro desenho no Pinta" (23/11/2026).
 *
 * A aula roda no ensaio de ponta a ponta da vaga de arte, com os componentes reais do player, do
 * Pinta e do Estúdio e o manifesto do extra publicado num members em memória. Suba o servidor e
 * rode este script do repositório:
 *
 *   cd packages/community-kids && ART_SLOTS_PORT=5221 bun e2e-art-slots/fixtures/serve.ts
 *   node docs/aulas-interativas-tecnico/recursos/meu-primeiro-desenho/capturar-telas.mjs 5221
 *
 * O roteiro é o da aula: joga a versão pronta, desenha a chave rosa no Pinta (Círculo e três
 * Retângulos, preenchimento rosa claro), envia o desenho, abre as Imagens do Estúdio, esconde o
 * jogo e troca chave-dourada por minha-chave. Use o servidor recém-aberto: ele guarda o envio.
 *
 * Saem em `telas/` os recortes (o dobro da resolução da tela de 1280 × 800) e `telas/marcas.json`,
 * com a caixa de cada controle marcado em porcentagem do recorte. O gerador desenha as marcas
 * numeradas a partir dessas caixas; o texto das legendas fica em `caderno-conteudo.json`.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../../../', import.meta.url))
const out = fileURLToPath(new URL('./telas/', import.meta.url))
const porta = process.argv[2] ?? '5221'
mkdirSync(out, { recursive: true })
const { chromium } = createRequire(resolve(root, 'packages/studio/package.json'))(
  '@playwright/test',
)
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.SZ_CHECK_CHROMIUM ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
})

/** Cada recorte: a área (px da tela) e as caixas dos controles marcados nele. */
const marcas = {}
async function recorte(page, arquivo, area, alvos = {}) {
  const tipo = arquivo.endsWith('.jpg') ? 'jpeg' : 'png'
  await page.screenshot({
    path: resolve(out, arquivo),
    clip: area,
    type: tipo,
    ...(tipo === 'jpeg' ? { quality: 90 } : {}),
  })
  const caixas = {}
  for (const [nome, loc] of Object.entries(alvos)) {
    const b = typeof loc.boundingBox === 'function' ? await loc.boundingBox() : loc
    if (!b) throw new Error(`Sem caixa: ${arquivo}/${nome}`)
    const pct = (v, total) => Math.round((v / total) * 1000) / 10
    caixas[nome] = {
      x: pct(b.x - area.x + b.width / 2, area.width),
      y: pct(b.y - area.y + b.height / 2, area.height),
      w: pct(b.width, area.width),
      h: pct(b.height, area.height),
    }
  }
  marcas[arquivo] = { largura: area.width, altura: area.height, caixas }
}
/** A área de um controle, com folga. */
async function emVolta(loc, folga = 3) {
  const b = await loc.boundingBox()
  if (!b) throw new Error('Controle sem caixa')
  return {
    x: b.x - folga,
    y: b.y - folga,
    width: b.width + 2 * folga,
    height: b.height + 2 * folga,
  }
}
const uniao = (...caixas) => {
  const x = Math.min(...caixas.map((c) => c.x))
  const y = Math.min(...caixas.map((c) => c.y))
  return {
    x,
    y,
    width: Math.max(...caixas.map((c) => c.x + c.width)) - x,
    height: Math.max(...caixas.map((c) => c.y + c.height)) - y,
  }
}

try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  })
  const erros = []
  page.on('pageerror', (e) => erros.push(e.message))
  await page.goto(`http://127.0.0.1:${porta}/`)
  const proxima = page.getByRole('button', { name: 'Próxima parte' })

  // Parte 1: uma entrada de verdade no jogo pronto libera a Próxima parte.
  await page
    .frameLocator('iframe[title="A Chave do Farol"]')
    .locator('canvas')
    .first()
    .click({ timeout: 60_000 })
  await page.keyboard.press('ArrowRight')
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('button')].some(
        (b) => b.textContent?.includes('Próxima parte') && !b.disabled,
      ),
    null,
    { timeout: 30_000 },
  )
  await proxima.click()

  // ── Parte 3: o Pinta ──
  const enviar = page.getByRole('button', { name: 'Enviar meu desenho' })
  await enviar.waitFor({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Entendi!' }).click()
  await page.waitForTimeout(400)
  const expandir = page.getByRole('button', { name: 'Expandir' })
  await recorte(page, 'botao-expandir.png', await emVolta(expandir))
  await recorte(page, 'botao-enviar-meu-desenho.png', await emVolta(enviar))
  await expandir.click()
  const palco = page.getByRole('img', { name: 'Área de desenho' })
  await palco.waitFor()
  await page.waitForTimeout(500)
  await page
    .getByRole('button', { name: /^Preenchimento:/ })
    .first()
    .click()
  await page.getByRole('button', { name: 'Preenchimento: rosa claro' }).first().click()
  const quadro = await palco.boundingBox()
  const arrastar = async (de, ate) => {
    const p = ([x, y]) => [quadro.x + quadro.width * x, quadro.y + quadro.height * y]
    await page.mouse.move(...p(de))
    await page.mouse.down()
    await page.mouse.move(...p(ate), { steps: 12 })
    await page.mouse.up()
  }
  await page.getByRole('button', { name: 'Círculo', exact: true }).click()
  await arrastar([0.04, 0.27], [0.47, 0.73])
  await page.getByRole('button', { name: 'Retângulo', exact: true }).click()
  await arrastar([0.38, 0.43], [0.96, 0.56])
  await arrastar([0.66, 0.55], [0.76, 0.77])
  await arrastar([0.82, 0.55], [0.92, 0.85])
  await page.getByRole('button', { name: 'Selecionar', exact: true }).click()
  await page.mouse.click(quadro.x + quadro.width * 0.5, quadro.y + quadro.height * 0.08)
  await page.waitForTimeout(1500)
  const ferramenta = (nome) => page.getByRole('button', { name: nome, exact: true })
  const preenchimento = page.locator('button[title="Preenchimento"]').first()
  const contorno = page.locator('button[title="Contorno"]').first()
  const cores = page.locator('section[aria-label="Cores"]').first()
  const reduzir = page.getByRole('button', { name: 'Reduzir' })
  const coresBox = await cores.boundingBox()
  // As cores que cabem no recorte: o nome da paleta e as duas primeiras fileiras.
  const coresVisiveis = { ...coresBox, height: 620 - coresBox.y }
  const ferramentas = uniao(
    ...(await Promise.all(
      ['Selecionar', 'Pincel', 'Retângulo', 'Círculo'].map((n) => ferramenta(n).boundingBox()),
    )),
  )
  const cor = uniao(await preenchimento.boundingBox(), await contorno.boundingBox())
  await recorte(
    page,
    'pinta.jpg',
    { x: 0, y: 0, width: 1280, height: 620 },
    {
      expandir: reduzir,
      ferramentas,
      cor,
      cores: coresVisiveis,
      enviar,
      desfazer: page.getByRole('button', { name: /^Desfazer/ }).first(),
    },
  )
  // A cena do cabeçalho das folhas do Pinta: o quadro com a chave.
  await recorte(page, 'pinta-quadro.jpg', { x: 395, y: 319, width: 382, height: 218 })
  for (const [arquivo, nome] of [
    ['botao-selecionar.png', 'Selecionar'],
    ['botao-pincel.png', 'Pincel'],
    ['botao-retangulo.png', 'Retângulo'],
    ['botao-circulo.png', 'Círculo'],
  ])
    await recorte(page, arquivo, await emVolta(ferramenta(nome), 2))
  await recorte(page, 'botao-preenchimento-contorno.png', {
    x: cor.x - 4,
    y: cor.y - 4,
    width: cor.width + 8,
    height: cor.height + 8,
  })
  // A primeira fileira de cores, sem o nome da paleta (a segunda some no esmaecido da coluna).
  await recorte(page, 'botao-cores.png', {
    x: coresBox.x + 8,
    y: coresBox.y + 54,
    width: coresBox.width - 16,
    height: 50,
  })
  await recorte(page, 'botao-reduzir.png', await emVolta(reduzir))
  await reduzir.click()
  await page.waitForTimeout(500)
  await enviar.click()
  await page.getByRole('dialog').getByRole('button', { name: 'Enviar', exact: true }).click()
  await page.getByText('Desenho enviado!').first().waitFor({ timeout: 30_000 })
  await proxima.click()

  // ── Parte 4: o Estúdio ──
  await page.locator('.blocklySvg').first().waitFor({ timeout: 90_000 })
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: 'Mais opções' }).click()
  await page.getByRole('menuitem', { name: 'Imagens' }).click()
  const materiais = page.getByRole('dialog')
  const nome = materiais.getByText('minha-chave', { exact: true })
  await materiais.getByText('Seu desenho da aula').waitFor()
  await nome.scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  const selo = materiais.getByText('Seu desenho da aula')
  const nomeBox = await nome.boundingBox()
  await recorte(
    page,
    'estudio-imagens.jpg',
    { x: nomeBox.x - 76, y: nomeBox.y - 22, width: 236, height: 100 },
    { selo: uniao(nomeBox, await selo.boundingBox()) },
  )
  await materiais.getByRole('button', { name: 'Fechar' }).click()
  await page.getByRole('button', { name: 'Expandir' }).click()
  await page.waitForTimeout(800)
  const mais = page.getByRole('button', { name: 'Mais opções' })
  await mais.click()
  await page.waitForTimeout(400)
  await recorte(
    page,
    'estudio-menu.jpg',
    { x: 830, y: 56, width: 440, height: 362 },
    {
      mais,
      imagens: page.getByRole('menuitem', { name: 'Imagens' }),
      mostrar: page.getByRole('menuitem', { name: 'Mostrar o jogo' }),
    },
  )
  await page.getByRole('menuitem', { name: 'Mostrar o jogo' }).click()
  await page.waitForTimeout(800)
  const campo = (valor) =>
    page
      .locator('.sz_g2d_create_image_sprite .blocklyEditableField')
      .filter({ hasText: new RegExp(`^${valor}$`) })
  const dourada = await campo('chave-dourada').boundingBox()
  await campo('chave-dourada').click()
  await page.waitForTimeout(500)
  const minha = page.getByRole('button', { name: 'minha-chave', exact: true })
  await minha.scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  await recorte(
    page,
    'estudio-lista.jpg',
    { x: 220, y: 140, width: 930, height: 476 },
    { campo: dourada, minha },
  )
  await minha.click()
  await page.waitForTimeout(500)
  if ((await campo('minha-chave').count()) !== 1) throw new Error('A troca da imagem não entrou.')
  writeFileSync(resolve(out, 'marcas.json'), `${JSON.stringify(marcas, null, 2)}\n`)
  if (erros.length) throw new Error(erros.join('\n'))
  console.log(`${Object.keys(marcas).length} recortes em ${out}`)
} finally {
  await browser.close()
}
