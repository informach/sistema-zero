import { expect, type FrameLocator, type Page, test } from '@playwright/test'
import {
  EXAMPLE_QA_CONTRACTS,
  type ExampleQAContract,
  type ExampleQAInteraction,
} from '../src/examples/qaContracts'

const EXPERIENCE_LABEL = {
  game: 'Jogo',
  demo: 'Demonstração',
  exploration: 'Exploração',
} as const

function kitCard(page: Page, contract: ExampleQAContract) {
  return page
    .locator('button')
    .filter({ has: page.getByText(contract.name, { exact: true }) })
    .first()
}

async function expectFirstFrame(page: Page): Promise<FrameLocator> {
  const iframe = page.locator('iframe').first()
  await expect(iframe).toHaveAttribute('srcdoc', /\S/, { timeout: 15_000 })
  const preview = page.frameLocator('iframe').first()
  const body = preview.locator('body')
  await expect(body).toBeAttached({ timeout: 15_000 })
  await expect
    .poll(
      async () => {
        try {
          const canvas = preview.locator('canvas').first()
          if ((await canvas.count()) > 0) {
            const size = await canvas.evaluate((element) => {
              const target = element as HTMLCanvasElement
              return { width: target.width, height: target.height }
            })
            if (size.width > 0 && size.height > 0) return 'ok'
          }
          const visibleContent = preview.locator('body > :not(script):not(style)')
          if ((await visibleContent.count()) > 0) return 'ok'
          return (await body.innerText()).trim().length > 0 ? 'ok' : 'vazio'
        } catch (error) {
          // O editor pode estabilizar os arquivos e trocar o srcDoc entre duas
          // leituras. FrameLocator se resolve de novo; o polling só precisa
          // sobreviver à destruição transitória do contexto antigo.
          if (
            error instanceof Error &&
            /Execution context was destroyed|Frame was detached/.test(error.message)
          ) {
            return 'recarregando'
          }
          throw error
        }
      },
      { timeout: 15_000 },
    )
    .toBe('ok')
  return preview
}

async function focusPreview(page: Page, preview: FrameLocator): Promise<void> {
  // Telas de início/splash têm prioridade e são parte do caminho real.
  const button = preview.locator('button:visible').first()
  if ((await button.count()) > 0) {
    await button.click({ force: true })
  } else {
    const splash = preview.locator('.szw3d-splash:visible').first()
    if ((await splash.count()) > 0) await splash.click({ force: true })
  }

  // O iframe é sandboxed (origem opaca) e pode estar parcialmente coberto no
  // layout estreito. Foco programático entrega teclado sem mascarar hit-testing.
  await page.locator('iframe').first().focus()
  await preview.locator('body').evaluate((body) => {
    window.focus()
    body.tabIndex = -1
    body.focus()
  })
}

async function applyInteraction(
  page: Page,
  preview: FrameLocator,
  interaction: ExampleQAInteraction,
): Promise<void> {
  if (interaction === 'auto') {
    await page.waitForTimeout(250)
    return
  }
  if (interaction === 'click') {
    const button = preview.locator('button:visible').first()
    if ((await button.count()) > 0) {
      await button.click({ force: true })
      return
    }
    const target = preview.locator('canvas').first()
    const fallback = preview.locator('body')
    await ((await target.count()) > 0 ? target : fallback).dispatchEvent('click', {
      clientX: 120,
      clientY: 100,
    })
    return
  }
  if (interaction === 'drag') {
    const canvas = preview.locator('canvas').first()
    const target = (await canvas.count()) > 0 ? canvas : preview.locator('body')
    await target.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      const from = { x: rect.left + rect.width * 0.35, y: rect.top + rect.height * 0.55 }
      const to = { x: rect.left + rect.width * 0.65, y: rect.top + rect.height * 0.3 }
      element.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          buttons: 1,
          clientX: from.x,
          clientY: from.y,
        }),
      )
      element.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          buttons: 1,
          clientX: to.x,
          clientY: to.y,
        }),
      )
      element.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          clientX: to.x,
          clientY: to.y,
        }),
      )
    })
    return
  }

  const keys: Record<Exclude<ExampleQAInteraction, 'auto' | 'click' | 'drag'>, string[]> = {
    start: ['Enter'],
    arrows: ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'],
    wasd: ['d', 'w', 'a', 's'],
    space: ['Space'],
    escape: ['Escape'],
    'action-j': ['j'],
    'action-fight': ['a', 'd', 'w', 's', 'f', 'g', 'h', 'j'],
    'interact-e': ['e'],
    'horn-h': ['h'],
    'digit-1': ['1'],
    'choice-2': ['2'],
  }
  for (const key of keys[interaction]) await page.keyboard.press(key)
}

async function openAndExercise(page: Page, contract: ExampleQAContract): Promise<void> {
  const diagnostics: string[] = []
  page.on('pageerror', (error) => diagnostics.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error') {
      const text = message.text()
      // Diagnóstico emitido pelo driver ANGLE ao Playwright fazer screenshots/
      // readback. Não vem do projeto nem do runtime do Estúdio.
      if (text.includes('GL Driver Message') && text.includes('ReadPixels')) return
      diagnostics.push(`${message.type()}: ${text}`)
    }
  })

  await page.goto('/')
  const card = kitCard(page, contract)
  await expect(card).toBeVisible()
  await expect(card.getByText(EXPERIENCE_LABEL[contract.experience], { exact: true })).toBeVisible()
  await card.click()
  await expect(page).toHaveURL(/\/editor\//, { timeout: 15_000 })

  const preview = await expectFirstFrame(page)
  await focusPreview(page, preview)
  for (const interaction of contract.interactions) {
    await applyInteraction(page, preview, interaction)
  }
  await page.waitForTimeout(300)
  await expectFirstFrame(page)
  expect(diagnostics, diagnostics.join('\n')).toEqual([])
}

test.describe('KitGallery — os 63 cartões no Chromium', () => {
  for (const contract of EXAMPLE_QA_CONTRACTS) {
    test(`${contract.key}: cria, mostra primeiro frame e aceita controles`, async ({ page }) => {
      await openAndExercise(page, contract)
    })
  }
})

const NARROW_FAMILY_SAMPLES = [
  'game-2d:Herói que anda',
  'game-2d-advanced:Reino Aberto',
  'game-3d:Torre maluca',
  'game-3d-advanced:Tiro ao Alvo',
  'world-3d:Fazendinha',
  'core:Passeio 3D (na mão)',
]

test.describe('KitGallery — layout estreito por família', () => {
  for (const key of NARROW_FAMILY_SAMPLES) {
    const contract = EXAMPLE_QA_CONTRACTS.find((item) => item.key === key)
    if (!contract) throw new Error(`amostra estreita sem contrato: ${key}`)

    test(`${contract.key}: primeiro frame em 390×844`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await openAndExercise(page, contract)
    })
  }
})
