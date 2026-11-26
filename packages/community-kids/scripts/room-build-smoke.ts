/**
 * Conferência do modo construção do quarto no navegador (26/11/2026), sobre a prévia local
 * `qa/room-serve.ts` (peças reais de `output/morada-assets`, casa em memória):
 *
 *   bun packages/member-shell/qa/room-serve.ts          # em outro terminal (porta 5284)
 *   bun packages/community-kids/scripts/room-build-smoke.ts   # Chromium do Playwright
 *
 * Abre a aba Construir, escolhe uma janela, passa o fantasma pela parede do fundo, coloca com
 * Enter e confere na casa gravada (o salvar sozinho) a parede com o vão; depois desfaz e refaz.
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
type House = { instances: { pieceId: string }[] }
const house = async (): Promise<House> =>
  page.evaluate(async () => (await (await fetch('/api/members/house')).json()).house)
const has = (h: House, id: string) => h.instances.some((i) => i.pieceId === id)
const waitSaved = () =>
  page.getByText('Salvo', { exact: true }).first().waitFor({ timeout: 15_000 })

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
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await waitSaved()
    await page.waitForTimeout(1500)
    const undone = await house()
    if (has(undone, WINDOW) || has(undone, 'construcao/janela_2m'))
      fail('desfazer não tirou a janela e o vão')
    await page.getByRole('button', { name: 'Refazer' }).click()
    await page.waitForTimeout(2000)
    if (!has(await house(), WINDOW)) fail('refazer não devolveu a janela')
  }
  await page.screenshot({ path: process.env.ROOM_QA_SHOT ?? 'room-build-smoke.png' })
  if (!process.exitCode) console.log('OK: janela no vão, uma só, desfazer e refazer gravados')
} finally {
  await browser.close()
}
