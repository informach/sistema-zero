import { expect, type Page, test } from '@playwright/test'

/**
 * A troca da Ponte para os Blocos logo depois de digitar (homologação 44954172658, shard 1 do
 * Chromium: `css-learning.spec.ts` não achou o bloco "Pintar o fundo de").
 *
 * O worker da Ponte morre com ela, então o modo Blocos refaz os blocos a partir do código (a
 * recuperação do `BlocksMode`). O `BlocklyPanel` que acabou de montar carrega primeiro os blocos
 * VELHOS. Se a recuperação grava os blocos novos depois dessa carga e antes de o Blockly entregar o
 * `FINISHED_LOADING` dela (o Blockly despacha num quadro + `setTimeout(0)`, e a carga nova ainda
 * espera a fonte), o ouvinte regenerava arquivos e blocos a partir do canvas VELHO: o CSS digitado
 * sumia e os blocos novos nunca chegavam à tela.
 *
 * Medido no playground (troca 0,4 s depois de digitar): carga velha em 4364 ms, o
 * `FINISHED_LOADING` dela em 4373 e a recuperação gravando em 4382. Cinco milissegundos separavam o
 * caso bom do ruim; no CI a ordem às vezes virava, e o canvas ficava vazio.
 *
 * Este teste força a ordem ruim, sem depender da sorte:
 * 1. os quadros congelam no clique em Blocos e os scripts pedidos dali em diante ficam presos (o
 *    pacote dos parsers, que só a recuperação pede na página);
 * 2. os quadros voltam UM por vez até a carga velha terminar (a sobreposição de carregamento some);
 * 3. os scripts são soltos: a recuperação grava os blocos novos e a carga nova aparece pendente;
 * 4. os quadros voltam um por vez: o despacho do `FINISHED_LOADING` da carga velha vem primeiro.
 */

declare global {
  interface Window {
    __szFrames?: {
      hold: boolean
      held: number[]
      releaseOne(): Promise<number>
      releaseAll(): void
    }
  }
}

async function installFrameGate(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const nativeRequest = window.requestAnimationFrame.bind(window)
    const nativeCancel = window.cancelAnimationFrame.bind(window)
    const entries = new Map<number, { callback: FrameRequestCallback; nativeId: number }>()
    const held: number[] = []
    let sequence = 0
    const gate = {
      hold: false,
      held,
      // Roda o próximo quadro segurado num quadro de verdade, sozinho.
      releaseOne(): Promise<number> {
        return new Promise<number>((resolve) => {
          nativeRequest((time) => {
            const id = held.shift()
            const entry = id === undefined ? undefined : entries.get(id)
            if (id !== undefined && entry) {
              entries.delete(id)
              entry.callback(time)
            }
            resolve(held.length)
          })
        })
      },
      releaseAll(): void {
        gate.hold = false
        const ids = held.splice(0)
        nativeRequest((time) => {
          for (const id of ids) {
            const entry = entries.get(id)
            if (!entry) continue
            entries.delete(id)
            entry.callback(time)
          }
        })
      },
    }
    window.__szFrames = gate
    window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
      sequence += 1
      const id = sequence
      const nativeId = nativeRequest((time) => {
        if (gate.hold) {
          held.push(id)
          return
        }
        entries.delete(id)
        callback(time)
      })
      entries.set(id, { callback, nativeId })
      return id
    }
    window.cancelAnimationFrame = (id: number): void => {
      const entry = entries.get(id)
      if (!entry) return
      nativeCancel(entry.nativeId)
      entries.delete(id)
      const index = held.indexOf(id)
      if (index >= 0) held.splice(index, 1)
    }
  })
}

async function replaceEditorContent(page: Page, code: string): Promise<void> {
  const editor = page.locator('.monaco-editor').first()
  await editor.waitFor({ state: 'visible', timeout: 15_000 })
  await page.locator('.monaco-editor .view-line').first().click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Backspace')
  await page.keyboard.insertText(code)
}

test('a carga velha que termina depois da recuperação não apaga o código digitado na Ponte', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await installFrameGate(page)
  let holdScripts = false
  let releaseScripts: () => void = () => undefined
  const scriptsReleased = new Promise<void>((resolve) => {
    releaseScripts = resolve
  })
  const held: string[] = []
  await page.route('**/*.js', async (route) => {
    if (holdScripts) {
      held.push(new URL(route.request().url()).pathname)
      await scriptsReleased
    }
    await route.continue()
  })
  const frames = () => page.evaluate(() => window.__szFrames?.held.length ?? 0)
  const releaseFrame = () =>
    page.evaluate(() => window.__szFrames?.releaseOne() ?? Promise.resolve(0))
  const loading = page.locator('[data-sz-blocks-loading]')

  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
  await page.getByRole('button', { name: 'Ponte' }).click()
  await page.getByRole('button', { name: 'index.html' }).first().click()
  await replaceEditorContent(
    page,
    '<!doctype html><html><head><link rel="stylesheet" href="style.css"></head><body><div id="caixa" class="cartao">Meu cartão</div></body></html>',
  )
  await page.getByRole('button', { name: 'style.css' }).first().click()
  // O HTML e o CSS entram e a troca vem logo em seguida, dentro da espera de 0,9 s da Ponte.
  await replaceEditorContent(page, '#caixa { background-color: #7c3aed; }')
  holdScripts = true
  await page.evaluate(() => {
    if (window.__szFrames) window.__szFrames.hold = true
  })
  await page.getByRole('button', { name: 'Blocos', exact: true }).click()

  // A carga velha foi pedida (sobreposição à vista) e espera um quadro.
  await expect(loading).toBeAttached({ timeout: 15_000 })
  for (let round = 0; round < 30 && (await loading.count()) > 0; round += 1) {
    if ((await frames()) > 0) await releaseFrame()
    await expect
      .poll(() => loading.count(), { timeout: 400 })
      .toBe(0)
      .catch(() => undefined)
  }
  await expect(loading, 'a carga velha terminou antes da recuperação').toHaveCount(0)
  expect(held.length, 'a recuperação ficou presa esperando o pacote dos parsers').toBeGreaterThan(0)

  // Solta a recuperação: ela grava os blocos novos e pede a carga nova (que espera um quadro).
  releaseScripts()
  await expect(loading).toBeAttached({ timeout: 15_000 })

  // Um quadro por vez: o despacho do FINISHED_LOADING da carga velha vem antes da carga nova.
  for (let round = 0; round < 60 && (await frames()) > 0; round += 1) await releaseFrame()
  await page.evaluate(() => window.__szFrames?.releaseAll())
  holdScripts = false

  const backgroundBlock = page
    .locator('text.blocklyText', { hasText: 'Pintar o fundo de' })
    .locator('xpath=ancestor::*[contains(@class, "blocklyDraggable")][1]')
  await expect(backgroundBlock).toBeVisible({ timeout: 15_000 })

  // O código digitado continua lá.
  await page.getByRole('button', { name: 'Ponte' }).click()
  await page.getByRole('button', { name: 'style.css' }).first().click()
  await expect(page.locator('.monaco-editor .view-lines').first()).toContainText(/7c3aed/i, {
    timeout: 15_000,
  })
  await page.getByRole('button', { name: 'index.html' }).first().click()
  await expect(page.locator('.monaco-editor .view-lines').first()).toContainText('Meu cartão', {
    timeout: 15_000,
  })
})
