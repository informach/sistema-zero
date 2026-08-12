import { expect, type FrameLocator, type Page, test } from '@playwright/test'
import { reinoZeroProStages } from '../src/official-extensions/game-2d-advanced/examples/reinoZeroProExample'
import {
  GAME_KIT_ACTIONS,
  type GameKitCampaignEventPayload,
  type GameKitKnownApi,
} from '../src/official-extensions/game-2d-advanced/runtimeContract'

test.use({
  deviceScaleFactor: 3,
  hasTouch: true,
  viewport: { width: 390, height: 844 },
})

interface RecordedCampaignEvent {
  name: string
  payload: GameKitCampaignEventPayload
}

interface ReinoZeroHost extends Window {
  SZGameKit?: GameKitKnownApi
  __reinoZeroDocumentToken?: string
  __reinoZeroStableSince?: number
  __reinoZeroEvents?: RecordedCampaignEvent[]
}

function reinoZeroProCard(page: Page) {
  return page
    .locator('button')
    .filter({ has: page.getByText('Reino Zero Pro', { exact: true }) })
    .first()
}

function runtimeBody(preview: FrameLocator) {
  return preview.locator('body')
}

async function openReinoZeroPro(page: Page): Promise<FrameLocator> {
  await page.goto('/')
  const card = reinoZeroProCard(page)
  await expect(card).toBeVisible()
  await card.click()
  await expect(page).toHaveURL(/\/editor\//, { timeout: 15_000 })
  await expect(page.getByText('Definir fase', { exact: true })).toHaveCount(32, {
    timeout: 30_000,
  })
  await expect(page.getByRole('status', { name: 'Salvo' })).toBeVisible()

  const previewTab = page.getByRole('tab', { name: 'Pré-visualização' })
  await expect(previewTab).toBeVisible()
  await previewTab.click()
  await expect(previewTab).toHaveAttribute('aria-selected', 'true')

  const iframe = page.locator('iframe[title="Pré-visualização"]')
  await expect(iframe).toHaveAttribute('srcdoc', /SZGameKit/, { timeout: 20_000 })
  const preview = page.frameLocator('iframe[title="Pré-visualização"]')
  await expect(preview.locator('#szgk-canvas')).toBeVisible({ timeout: 20_000 })
  await expect
    .poll(
      () =>
        runtimeBody(preview).evaluate(() => {
          const host = window as ReinoZeroHost
          const marker = 'reino-zero-stable-document'
          if (host.__reinoZeroDocumentToken !== marker) {
            host.__reinoZeroDocumentToken = marker
            host.__reinoZeroStableSince = performance.now()
            return 0
          }
          return performance.now() - (host.__reinoZeroStableSince ?? performance.now())
        }),
      { timeout: 60_000 },
    )
    .toBeGreaterThanOrEqual(2_000)

  await preview.getByRole('button', { name: 'Jogar', exact: true }).click()
  await expect
    .poll(() =>
      runtimeBody(preview).evaluate(
        () => (window as ReinoZeroHost).SZGameKit?.state() ?? 'indisponível',
      ),
    )
    .toBe('jogando')
  return preview
}

async function recordCampaignEvents(preview: FrameLocator): Promise<void> {
  await runtimeBody(preview).evaluate(() => {
    const host = window as ReinoZeroHost
    const api = host.SZGameKit
    if (!api) throw new Error('SZGameKit indisponível')
    host.__reinoZeroEvents = []
    for (const name of ['dica', 'coleta', 'fim']) {
      api.onCampaignEvent(name, (payload) => host.__reinoZeroEvents?.push({ name, payload }))
    }
  })
}

async function campaignEvents(preview: FrameLocator): Promise<RecordedCampaignEvent[]> {
  return runtimeBody(preview).evaluate(
    () => (window as ReinoZeroHost).__reinoZeroEvents?.map((event) => ({ ...event })) ?? [],
  )
}

async function touchAction(
  preview: FrameLocator,
  action: string,
  event: 'pointerdown' | 'pointerup',
  pointerId: number,
): Promise<void> {
  await preview.locator(`[data-sz-gk-action="${action}"]`).dispatchEvent(event, {
    bubbles: true,
    isPrimary: pointerId === 1,
    pointerId,
    pointerType: 'touch',
  })
}

async function waitFixedTicks(preview: FrameLocator, ticks: number): Promise<void> {
  const initialTick = await runtimeBody(preview).evaluate(
    () => (window as ReinoZeroHost).SZGameKit?.fixedTick() ?? 0,
  )
  await expect
    .poll(() =>
      runtimeBody(preview).evaluate(() => (window as ReinoZeroHost).SZGameKit?.fixedTick() ?? 0),
    )
    .toBeGreaterThanOrEqual(initialTick + ticks)
}

async function goToStage(preview: FrameLocator, stageId: string): Promise<void> {
  await expect
    .poll(
      () =>
        runtimeBody(preview).evaluate((_, targetStage) => {
          const api = (window as ReinoZeroHost).SZGameKit
          return api?.goToStage(targetStage) ?? false
        }, stageId),
      { message: `transição para ${stageId} deve ser aceita` },
    )
    .toBe(true)
  await expect
    .poll(() =>
      runtimeBody(preview).evaluate(
        () => (window as ReinoZeroHost).SZGameKit?.currentStage() ?? '',
      ),
    )
    .toBe(stageId)
  await waitFixedTicks(preview, 16)
}

async function collectStageGem(preview: FrameLocator, world: number): Promise<void> {
  const stageId = `${world}-4`
  const stage = reinoZeroProStages.find((candidate) => candidate.id === stageId)
  const gem = stage?.entities.find((entity) => entity.kind === 'gem')
  if (!stage || !gem) throw new Error(`gema da fase ${stageId} ausente no exemplo`)

  if (
    (await runtimeBody(preview).evaluate(
      () => (window as ReinoZeroHost).SZGameKit?.currentStage() ?? '',
    )) !== stageId
  ) {
    await goToStage(preview, stageId)
  }
  await runtimeBody(preview).evaluate(
    (_, { x, y }) => {
      const api = (window as ReinoZeroHost).SZGameKit
      const hero = api?.campaignHero()
      if (!api || !hero) throw new Error('herói da campanha indisponível')
      api.placeCharacter(hero, x * 16, y * 16)
    },
    { x: gem.x, y: gem.y },
  )
  await expect
    .poll(async () => {
      const snapshot = await runtimeBody(preview).evaluate(() => {
        const api = (window as ReinoZeroHost).SZGameKit
        return {
          gems: api?.campaignProgress().gems.length ?? 0,
          stage: api?.currentStage() ?? '',
        }
      })
      const gemEvents = (await campaignEvents(preview)).filter(
        (event) => event.name === 'coleta' && event.payload.id === gem.id,
      ).length
      return { ...snapshot, gemEvents }
    })
    .toEqual({ gems: world, stage: stageId, gemEvents: 1 })
}

test('Reino Zero Pro completa a campanha com eventos, save e controles móveis', async ({
  page,
}) => {
  test.setTimeout(90_000)
  const diagnostics: string[] = []
  page.on('pageerror', (error) => diagnostics.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error') {
      diagnostics.push(`${message.type()}: ${message.text()}`)
    }
  })

  const preview = await openReinoZeroPro(page)
  await recordCampaignEvents(preview)
  expect(diagnostics, diagnostics.join('\n')).toEqual([])

  const controls = preview.locator('#szgk-touch-controls [data-sz-gk-action]')
  await expect(controls).toHaveCount(GAME_KIT_ACTIONS.length)
  const controlLayout = await controls.evaluateAll((buttons) => {
    const overlay = document.getElementById('szgk-touch-controls')
    if (!overlay) throw new Error('controles de toque ausentes')
    const boundary = overlay.getBoundingClientRect()
    return buttons.map((button) => {
      const rect = button.getBoundingClientRect()
      return {
        action: button.getAttribute('data-sz-gk-action') ?? '',
        visible: rect.width > 0 && rect.height > 0,
        inside:
          rect.left >= boundary.left &&
          rect.top >= boundary.top &&
          rect.right <= boundary.right &&
          rect.bottom <= boundary.bottom,
      }
    })
  })
  expect(controlLayout.map(({ action }) => action).sort()).toEqual([...GAME_KIT_ACTIONS].sort())
  expect(controlLayout.every(({ visible, inside }) => visible && inside)).toBe(true)

  await touchAction(preview, 'direita', 'pointerdown', 21)
  await touchAction(preview, 'pular', 'pointerdown', 22)
  await expect
    .poll(() =>
      runtimeBody(preview).evaluate(() => {
        const api = (window as ReinoZeroHost).SZGameKit
        return { direita: api?.actionDown('direita'), pular: api?.actionDown('pular') }
      }),
    )
    .toEqual({ direita: true, pular: true })
  await touchAction(preview, 'pular', 'pointerup', 22)
  await expect
    .poll(() =>
      runtimeBody(preview).evaluate(() => {
        const api = (window as ReinoZeroHost).SZGameKit
        return { direita: api?.actionDown('direita'), pular: api?.actionDown('pular') }
      }),
    )
    .toEqual({ direita: true, pular: false })
  await touchAction(preview, 'direita', 'pointerup', 21)
  await expect
    .poll(() =>
      runtimeBody(preview).evaluate(() => {
        const api = (window as ReinoZeroHost).SZGameKit
        return { direita: api?.actionDown('direita'), pular: api?.actionDown('pular') }
      }),
    )
    .toEqual({ direita: false, pular: false })

  const firstStage = reinoZeroProStages.find((stage) => stage.id === '1-1')
  const hintTrigger = firstStage?.triggers.find((trigger) => trigger.kind === 'dica')
  if (!firstStage || !hintTrigger) throw new Error('região de dica da fase 1-1 ausente')
  await runtimeBody(preview).evaluate(
    (_, { x, y }) => {
      const api = (window as ReinoZeroHost).SZGameKit
      const hero = api?.campaignHero()
      if (!api || !hero) throw new Error('herói da campanha indisponível')
      api.placeCharacter(hero, x * 16, y * 16)
    },
    { x: hintTrigger.x, y: hintTrigger.y },
  )
  await expect
    .poll(async () => (await campaignEvents(preview)).find((event) => event.name === 'dica'))
    .toMatchObject({
      name: 'dica',
      payload: { target: '1-1', value: hintTrigger.value },
    })

  await collectStageGem(preview, 1)
  await expect
    .poll(
      async () =>
        (await campaignEvents(preview)).filter(
          (event) => event.name === 'coleta' && event.payload.id === 'gema-1',
        ).length,
    )
    .toBe(1)
  const saved = await runtimeBody(preview).evaluate(
    () => (window as ReinoZeroHost).SZGameKit?.saveCampaign(1) ?? false,
  )
  expect(saved).toBe(true)

  const movedWithoutAutosave = await runtimeBody(preview).evaluate(
    (_, stageId) => (window as ReinoZeroHost).SZGameKit?.startCampaign(stageId) ?? false,
    '1-3',
  )
  expect(movedWithoutAutosave).toBe(true)
  expect(
    await runtimeBody(preview).evaluate(() => (window as ReinoZeroHost).SZGameKit?.currentStage()),
  ).toBe('1-3')
  const loaded = await runtimeBody(preview).evaluate(
    () => (window as ReinoZeroHost).SZGameKit?.loadCampaign(1) ?? false,
  )
  expect(loaded).toBe(true)
  await expect
    .poll(() =>
      runtimeBody(preview).evaluate(() => {
        const api = (window as ReinoZeroHost).SZGameKit
        const progress = api?.campaignProgress()
        return { stage: api?.currentStage(), gems: progress?.gems.length }
      }),
    )
    .toEqual({ stage: '1-4', gems: 1 })

  const firstGem = firstStage
    ? reinoZeroProStages
        .find((stage) => stage.id === '1-4')
        ?.entities.find((entity) => entity.kind === 'gem')
    : undefined
  if (!firstGem) throw new Error('gema da fase 1-4 ausente')
  const firstGemEvents = (await campaignEvents(preview)).filter(
    (event) => event.name === 'coleta' && event.payload.id === 'gema-1',
  ).length
  await runtimeBody(preview).evaluate(
    (_, { x, y }) => {
      const api = (window as ReinoZeroHost).SZGameKit
      const hero = api?.campaignHero()
      if (!api || !hero) throw new Error('herói da campanha indisponível')
      api.placeCharacter(hero, x * 16, y * 16)
    },
    { x: firstGem.x, y: firstGem.y },
  )
  await waitFixedTicks(preview, 8)
  expect(
    (await campaignEvents(preview)).filter(
      (event) => event.name === 'coleta' && event.payload.id === 'gema-1',
    ),
  ).toHaveLength(firstGemEvents)
  expect(
    await runtimeBody(preview).evaluate(
      () => (window as ReinoZeroHost).SZGameKit?.campaignProgress().gems.length,
    ),
  ).toBe(1)

  for (let world = 2; world <= 8; world += 1) await collectStageGem(preview, world)
  const completed = await runtimeBody(preview).evaluate(
    () => (window as ReinoZeroHost).SZGameKit?.nextStage() ?? false,
  )
  expect(completed).toBe(true)
  await expect
    .poll(() =>
      runtimeBody(preview).evaluate(() => {
        const api = (window as ReinoZeroHost).SZGameKit
        const progress = api?.campaignProgress()
        return { state: api?.state(), gems: progress?.gems.length, journey: progress?.journey }
      }),
    )
    .toEqual({ state: 'vitoria', gems: 8, journey: 2 })
  await expect
    .poll(async () => (await campaignEvents(preview)).find((event) => event.name === 'fim'))
    .toMatchObject({ name: 'fim', payload: { complete: true, journey: 2 } })

  expect(diagnostics, diagnostics.join('\n')).toEqual([])
})
