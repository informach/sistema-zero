/**
 * Conferência do modo construção do quarto no navegador (26/11/2026), sobre a prévia local
 * `qa/room-serve.ts` (peças reais de `output/morada-assets`, casa em memória):
 *
 *   bun packages/member-shell/qa/room-serve.ts          # em outro terminal (porta 5284)
 *   bun packages/community-kids/scripts/room-build-smoke.ts   # Chromium do Playwright
 *
 * Abre a aba Construir, escolhe uma janela, passa o fantasma pela parede do fundo, coloca com
 * Enter e confere na casa gravada (o salvar sozinho) a parede com o vão; move a janela duas vezes
 * (um vão só no fim) e depois desfaz e refaz.
 * Sai com código 1 se algo não bater. Não roda no CI: as peças da Morada não estão no git.
 */
import { chromium } from '@playwright/test'

const BASE = process.env.ROOM_QA_URL ?? 'http://127.0.0.1:5284'
const WINDOW = 'construcao/janela_quadrada_inteira_branca'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const fail = (msg: string) => {
  console.error(`FALHOU: ${msg}`)
  process.exitCode = 1
}
type House = { instances: { id: string; pieceId: string; position: number[] }[] }
const house = async (): Promise<House> =>
  page.evaluate(async () => (await (await fetch('/api/members/house')).json()).house)
const has = (h: House, id: string) => h.instances.some((i) => i.pieceId === id)
const waitSaved = () =>
  page.getByText('Salvo', { exact: true }).first().waitFor({ timeout: 15_000 })
const count = (h: House, id: string) => h.instances.filter((i) => i.pieceId === id).length
const windowAt = (h: House) => h.instances.find((i) => i.pieceId === WINDOW)?.position.join(',')

try {
  await page.goto(`${BASE}/?avatar=0`)
  const canvas = page.locator('canvas').first()
  await canvas.waitFor({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Construir' }).first().click()
  await page
    .getByRole('group', { name: 'Tipos de construção' })
    .getByRole('button', { name: 'Janelas' })
    .click()
  await page.getByLabel('Buscar na construção').fill('quadrada inteira')
  const MARCA = 'Janela quadrada inteira (branca)'
  await page.locator('button[aria-pressed]').filter({ hasText: MARCA }).first().click()
  const escolhida = await page
    .locator('button[aria-pressed="true"] span[title]')
    .first()
    .getAttribute('title')
  console.log('janela escolhida:', escolhida)
  // O fantasma segue o ponteiro: varre a parte de cima do quarto (o fundo) até a janela servir.
  const box = await canvas.boundingBox()
  if (!box) throw new Error('quarto sem caixa')
  let placed = false
  for (let fy = 0.25; fy <= 0.55 && !placed; fy += 0.05)
    for (let fx = 0.25; fx <= 0.6 && !placed; fx += 0.05) {
      await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy)
      await page.keyboard.press('Enter')
      await page.waitForTimeout(80)
      if (has(await house(), WINDOW)) placed = true
      else {
        // Ainda não gravou (1 s): espera um pouco antes de decidir.
        await page.waitForTimeout(1300)
        placed = has(await house(), WINDOW)
      }
    }
  if (!placed) fail('a janela não entrou na casa gravada')
  else {
    const h = await house()
    if (!has(h, 'construcao/janela_2m')) fail('a parede não ganhou o vão (janela_2m)')
    if (h.instances.filter((i) => i.pieceId === WINDOW).length !== 1)
      fail('entrou mais de uma janela')
    await page.keyboard.press('Escape')
    // Mover a MESMA janela duas vezes (o segundo Mover não fazia nada; revisão de 26/11/2026), e
    // o vão de onde ela saiu fecha (fica um vão só).
    let moves = 0
    for (const reverse of [true, false]) {
      const before = windowAt(await house())
      await page.getByRole('button', { name: 'Mover' }).click()
      const xs = [0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6]
      if (reverse) xs.reverse()
      let moved = false
      for (let fy = 0.25; fy <= 0.55 && !moved; fy += 0.05)
        for (const fx of xs) {
          if (moved) break
          await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy)
          await page.waitForTimeout(120)
          // Só confirma onde o fantasma serve (a dica diz "Clique para pôr").
          if (
            !(await page
              .getByText(/^Clique para pôr/)
              .first()
              .isVisible())
          )
            continue
          await page.keyboard.press('Enter')
          await page.waitForTimeout(1300)
          const now = windowAt(await house())
          if (now && now !== before) moved = true
          // Caiu no mesmo lugar (servia ali também): o Mover acabou; abre outro e segue.
          else await page.getByRole('button', { name: 'Mover' }).click()
        }
      if (!moved) {
        fail(`o ${moves + 1}º Mover não levou a janela`)
        break
      }
      moves += 1
      await waitSaved()
      await page.waitForTimeout(1300)
      const h2 = await house()
      if (count(h2, WINDOW) !== 1) fail('mover deixou mais de uma janela')
      if (count(h2, 'construcao/janela_2m') !== 1)
        fail('mover deixou o vão antigo aberto (mais de um vão)')
    }
    // Desfaz tudo (pôr e mover; um Mover que caiu no mesmo lugar também é um passo).
    const undoButton = page.getByRole('button', { name: 'Desfazer' })
    for (let i = 0; i < 20 && (await undoButton.isEnabled()); i += 1) {
      await undoButton.click()
      await page.waitForTimeout(300)
    }
    await waitSaved()
    await page.waitForTimeout(1500)
    const undone = await house()
    if (has(undone, WINDOW) || has(undone, 'construcao/janela_2m'))
      fail('desfazer não tirou a janela e o vão')
    // Refaz só o primeiro passo: a janela volta.
    await page.getByRole('button', { name: 'Refazer' }).click()
    await page.waitForTimeout(2000)
    if (!has(await house(), WINDOW)) fail('refazer não devolveu a janela')
  }
  await page.screenshot({ path: process.env.ROOM_QA_SHOT ?? 'room-build-smoke.png' })
  if (!process.exitCode)
    console.log(
      'OK: janela no vão, uma só, movida duas vezes sem vão sobrando, desfazer e refazer gravados',
    )
} finally {
  await browser.close()
}
