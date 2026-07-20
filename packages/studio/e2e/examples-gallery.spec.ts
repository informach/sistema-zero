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
            const canvasState = await canvas.evaluate(async (element) => {
              const target = element as HTMLCanvasElement
              if (target.width <= 0 || target.height <= 0) return 'sem-tamanho'
              // WebGL sem preserveDrawingBuffer pode devolver um dataURL vazio
              // depois da composição. A leitura roda no próximo frame, após o
              // callback contínuo do motor, para provar que pixels foram de fato
              // desenhados sem confundir um canvas apenas dimensionado com jogo.
              const gl = target.getContext('webgl2') ?? target.getContext('webgl')
              if (
                gl &&
                !gl.isContextLost() &&
                gl.drawingBufferWidth > 0 &&
                gl.drawingBufferHeight > 0
              ) {
                await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
                const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4)
                gl.readPixels(
                  0,
                  0,
                  gl.drawingBufferWidth,
                  gl.drawingBufferHeight,
                  gl.RGBA,
                  gl.UNSIGNED_BYTE,
                  pixels,
                )
                return pixels.some((channel) => channel !== 0)
                  ? 'webgl-renderizado'
                  : 'transparente'
              }
              try {
                const blank = document.createElement('canvas')
                blank.width = target.width
                blank.height = target.height
                // Funciona para Canvas 2D e WebGL e, ao contrário de
                // getImageData/readPixels, não emite warning por leituras repetidas.
                return target.toDataURL() !== blank.toDataURL() ? 'renderizado' : 'transparente'
              } catch {
                return 'ilegível'
              }
            })
            if (canvasState === 'renderizado' || canvasState === 'webgl-renderizado') return 'ok'
          }
          const visibleContent = preview.locator(
            'body > :not(script):not(style):not(canvas):visible',
          )
          if ((await visibleContent.count()) > 0) {
            const hasVisibleArea = await visibleContent.evaluateAll((elements) =>
              elements.some((element) => {
                const rect = element.getBoundingClientRect()
                return rect.width > 1 && rect.height > 1
              }),
            )
            if (hasVisibleArea) return 'ok'
          }
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
  // A Ponte ainda pode substituir o srcDoc uma última vez depois do primeiro
  // frame; nesse intervalo o contexto antigo é destruído. Resolva o FrameLocator
  // novamente, em vez de transformar uma estabilização normal em falha do jogo.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await page.locator('iframe').first().focus()
      await preview.locator('body').evaluate((body) => {
        window.focus()
        body.tabIndex = -1
        body.focus()
      })
      return
    } catch (error) {
      if (
        error instanceof Error &&
        /Execution context was destroyed|Frame was detached/.test(error.message)
      ) {
        await page.waitForTimeout(100)
        continue
      }
      throw error
    }
  }
  throw new Error('O preview continuou recarregando e não pôde receber foco')
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

  let preview: FrameLocator
  try {
    preview = await expectFirstFrame(page)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    const frameDebug = await page
      .frameLocator('iframe')
      .first()
      .locator('html')
      .evaluate(() => {
        const moduleScript = Array.from(document.scripts).find(
          (script) => script.type === 'module' && script.src.startsWith('data:'),
        )
        let moduleCode = { chars: 0, hasRenderer: false, hasPhysics: false, tail: '' }
        if (moduleScript) {
          const payload = moduleScript.src.slice(moduleScript.src.indexOf(',') + 1)
          const decoded = moduleScript.src.includes(';base64,')
            ? atob(payload)
            : decodeURIComponent(payload)
          moduleCode = {
            chars: decoded.length,
            hasRenderer: decoded.includes('new THREE.WebGLRenderer'),
            hasPhysics: decoded.includes('createSZPhysicsLite'),
            tail: decoded.slice(-240),
          }
        }
        return {
          bodyChildren: document.body.children.length,
          bodyTags: Array.from(document.body.children, (child) => child.tagName),
          canvases: Array.from(document.querySelectorAll('canvas'), (canvas) => ({
            width: canvas.width,
            height: canvas.height,
            clientWidth: canvas.clientWidth,
            clientHeight: canvas.clientHeight,
          })),
          moduleCode,
          scripts: Array.from(document.scripts, (script) => ({
            src: script.src.slice(0, 80),
            type: script.type,
            chars: script.textContent?.length ?? 0,
          })),
          resources: performance
            .getEntriesByType('resource')
            .map((entry) => entry.name.slice(0, 120)),
        }
      })
      .catch(() => null)
    throw new Error(
      [detail, ...diagnostics, frameDebug ? JSON.stringify(frameDebug) : 'iframe indisponível']
        .filter(Boolean)
        .join('\n'),
    )
  }
  if (contract.key.startsWith('game-2d:')) {
    const canvas = preview.locator('canvas').first()
    await expect(canvas).toHaveAttribute('aria-label', /\S/)
    await expect(canvas).toHaveAttribute('aria-describedby', /\S/)
    await expect(canvas).toHaveAttribute('tabindex', '0')
    const descriptionId = await canvas.getAttribute('aria-describedby')
    if (!descriptionId) throw new Error(`canvas sem descrição acessível: ${contract.key}`)
    await expect(preview.locator(`#${descriptionId}`)).toContainText(
      /setas|espaço|enter|arraste|segurando|mouse|dedo|toque|↑|←/i,
    )
  }
  await focusPreview(page, preview)
  for (const interaction of contract.interactions) {
    await applyInteraction(page, preview, interaction)
  }
  await page.waitForTimeout(300)
  await expectFirstFrame(page)
  expect(diagnostics, diagnostics.join('\n')).toEqual([])
}

async function expectLogicalCanvasAtDpr(page: Page, expectedDpr: number): Promise<void> {
  const canvas = page.frameLocator('iframe').first().locator('canvas').first()
  await expect(canvas).toBeVisible()
  const dimensions = await canvas.evaluate((element) => {
    const target = element as HTMLCanvasElement
    const rect = target.getBoundingClientRect()
    return {
      dpr: window.devicePixelRatio,
      backingWidth: target.width,
      backingHeight: target.height,
      displayWidth: rect.width,
      displayHeight: rect.height,
    }
  })
  expect(dimensions.dpr).toBe(expectedDpr)
  expect(dimensions.displayWidth).toBeGreaterThan(0)
  expect(dimensions.displayHeight).toBeGreaterThan(0)
  expect(dimensions.backingWidth).toBe(Math.round(dimensions.displayWidth * expectedDpr))
  expect(dimensions.backingHeight).toBe(Math.round(dimensions.displayHeight * expectedDpr))
}

test.describe('KitGallery — os 67 cartões no Chromium', () => {
  for (const contract of EXAMPLE_QA_CONTRACTS) {
    test(`${contract.key}: cria, mostra primeiro frame e aceita controles`, async ({ page }) => {
      await openAndExercise(page, contract)
    })
  }
})

const GAME_TWO_D_DPR_SAMPLES = ['game-2d:Sala com paredes', 'game-2d:Equilibrista', 'game-2d:Balão']

for (const dpr of [1, 2, 3]) {
  test.describe(`KitGallery — geometria lógica do Jogo 2D em DPR ${dpr}`, () => {
    test.use({ deviceScaleFactor: dpr })

    for (const key of GAME_TWO_D_DPR_SAMPLES) {
      const contract = EXAMPLE_QA_CONTRACTS.find((item) => item.key === key)
      if (!contract) throw new Error(`amostra DPR sem contrato: ${key}`)

      test(`${contract.key}: primeiro frame e controles preservam o tamanho lógico`, async ({
        page,
      }) => {
        await openAndExercise(page, contract)
        await expectLogicalCanvasAtDpr(page, dpr)
      })
    }
  })
}

test('Defesa do Reino cobra uma compra e cria uma torre após o boot automático', async ({
  page,
}) => {
  const contract = EXAMPLE_QA_CONTRACTS.find(
    (item) => item.key === 'game-2d-advanced:Defesa do Reino',
  )
  if (!contract) throw new Error('contrato do exemplo Defesa do Reino ausente')

  await openAndExercise(page, contract)
  const preview = page.frameLocator('iframe').first()
  const snapshot = () =>
    preview.locator('body').evaluate(() => {
      const api = (
        window as unknown as {
          SZGameKit: { countActive: (mold: string) => number; tdCoins: () => number }
        }
      ).SZGameKit
      return { coins: api.tdCoins(), towers: api.countActive('torre') }
    })

  expect(await snapshot()).toEqual({ coins: 100, towers: 0 })
  await preview.locator('canvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement
    const rect = canvas.getBoundingClientRect()
    canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: rect.left + (300 / canvas.width) * rect.width,
        clientY: rect.top + (220 / canvas.height) * rect.height,
      }),
    )
  })

  await expect.poll(snapshot).toEqual({ coins: 50, towers: 1 })
})

interface RpgBrowserSnapshot {
  apiPresent: boolean
  state: string
  map: string
  hasKey: boolean
  hasIntro: boolean
  missionReady: boolean
  menuOpen: boolean
  menuLabels: string[]
  energy: number
  heroCellX: number | null
  heroCellY: number | null
  destinationCellX: number | null
  destinationCellY: number | null
  facingDirection: string | null
  dialogOpen: boolean
  sceneOpen: boolean
  doorCells: string[]
}

async function rpgSnapshot(preview: FrameLocator): Promise<RpgBrowserSnapshot> {
  return preview.locator('body').evaluate(() => {
    const host = window as unknown as {
      __SZSTUDIO_RUNTIME_INSPECTORS?: Record<string, () => unknown>
      SZGameKit?: {
        state: () => string
        rpgCurrentMap: () => string
        rpgHasItem: (name: string) => boolean
        rpgHasFlag: (name: string) => boolean
      }
    }
    const api = host.SZGameKit
    const battle =
      (host.__SZSTUDIO_RUNTIME_INSPECTORS?.['game-2d-advanced:battle']?.() as
        | {
            menuOpen: boolean
            menuLabels: string[]
            allies: Array<{ energy: number }>
          }
        | null
        | undefined) ?? null
    const rpg =
      (host.__SZSTUDIO_RUNTIME_INSPECTORS?.['game-2d-advanced:rpg']?.() as
        | {
            heroCellX: number | null
            heroCellY: number | null
            destinationCellX: number | null
            destinationCellY: number | null
            facingDirection: string | null
            dialogOpen: boolean
            sceneOpen: boolean
            doorCells: string[]
          }
        | null
        | undefined) ?? null
    return {
      apiPresent: api != null,
      state: api?.state() ?? '',
      map: api?.rpgCurrentMap() ?? '',
      hasKey: api?.rpgHasItem('chave') ?? false,
      hasIntro: api?.rpgHasFlag('intro') ?? false,
      missionReady: api?.rpgHasFlag('missao-pronta') ?? false,
      menuOpen: battle?.menuOpen ?? false,
      menuLabels: battle?.menuLabels ?? [],
      energy: battle?.allies[0]?.energy ?? 0,
      heroCellX: rpg?.heroCellX ?? null,
      heroCellY: rpg?.heroCellY ?? null,
      destinationCellX: rpg?.destinationCellX ?? null,
      destinationCellY: rpg?.destinationCellY ?? null,
      facingDirection: rpg?.facingDirection ?? null,
      dialogOpen: rpg?.dialogOpen ?? false,
      sceneOpen: rpg?.sceneOpen ?? false,
      doorCells: rpg?.doorCells ?? [],
    }
  })
}

test('Vila do Dragão — fluxo visual completo no Chromium', async ({ page }) => {
  test.setTimeout(60_000)
  const diagnostics: string[] = []
  page.on('pageerror', (error) => diagnostics.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error') {
      const text = message.text()
      if (text.includes('GL Driver Message') && text.includes('ReadPixels')) return
      diagnostics.push(`${message.type()}: ${text}`)
    }
  })

  const contract = EXAMPLE_QA_CONTRACTS.find(
    (item) => item.key === 'game-2d-advanced:Vila do Dragão',
  )
  if (!contract) throw new Error('contrato da Vila do Dragão não encontrado')

  await page.addInitScript(() => {
    ;(
      window as unknown as { __SZSTUDIO_RUNTIME_INSPECTORS?: Record<string, () => unknown> }
    ).__SZSTUDIO_RUNTIME_INSPECTORS = {}
  })
  await page.goto('/')
  await kitCard(page, contract).click()
  const preview = await expectFirstFrame(page)
  const gameBody = preview.locator('body')
  // A Ponte pode substituir o srcDoc uma última vez ao estabilizar os blocos.
  // Se isso acontecer depois do clique, a nova instância volta ao menu; iniciar
  // de novo é parte da sincronização com o preview final, não um atalho de jogo.
  let started = false
  for (let attempt = 0; attempt < 4 && !started; attempt++) {
    await focusPreview(page, preview)
    await page.waitForTimeout(700)
    const snapshot = await rpgSnapshot(preview)
    started = snapshot.state === 'jogando' && snapshot.map === 'vila'
  }
  expect(started).toBe(true)
  const canvas = preview.locator('canvas').first()
  const villageFrame = await canvas.evaluate((element) =>
    (element as HTMLCanvasElement).toDataURL(),
  )

  // A apresentação visível entrega a missão; não há uma segunda conversa secreta.
  for (let i = 0; i < 50 && !(await rpgSnapshot(preview)).hasKey; i++) {
    await gameBody.press('Space')
    await page.waitForTimeout(150)
  }
  const afterIntro = await rpgSnapshot(preview)
  if (!afterIntro.hasKey)
    throw new Error(`apresentação não terminou: ${JSON.stringify(afterIntro)}`)

  const moveCell = async (key: string) => {
    const before = await rpgSnapshot(preview)
    if (before.heroCellX == null || before.heroCellY == null) {
      throw new Error(`herói indisponível antes de mover: ${JSON.stringify(before)}`)
    }
    const dx = key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : 0
    const dy = key === 'ArrowUp' ? -1 : key === 'ArrowDown' ? 1 : 0
    const targetX = before.heroCellX + dx
    const targetY = before.heroCellY + dy
    await gameBody.focus()
    await page.keyboard.down(key)
    try {
      await expect
        .poll(
          async () => {
            const snapshot = await rpgSnapshot(preview)
            return (
              snapshot.map !== before.map ||
              snapshot.destinationCellX != null ||
              snapshot.heroCellX !== before.heroCellX ||
              snapshot.heroCellY !== before.heroCellY
            )
          },
          { intervals: [16, 32, 64], timeout: 2_000 },
        )
        .toBe(true)
    } finally {
      await page.keyboard.up(key)
    }
    await expect
      .poll(
        async () => {
          const snapshot = await rpgSnapshot(preview)
          if (snapshot.map !== before.map) return true
          return (
            snapshot.destinationCellX == null &&
            snapshot.destinationCellY == null &&
            snapshot.heroCellX === targetX &&
            snapshot.heroCellY === targetY
          )
        },
        { intervals: [16, 32, 64], timeout: 2_000 },
      )
      .toBe(true)
  }
  const faceDirection = async (key: string, direction: string) => {
    await gameBody.focus()
    await page.keyboard.down(key)
    try {
      await expect
        .poll(async () => (await rpgSnapshot(preview)).facingDirection, {
          intervals: [16, 32, 64],
          timeout: 2_000,
        })
        .toBe(direction)
    } finally {
      await page.keyboard.up(key)
    }
  }
  for (let i = 0; i < 4; i++) await moveCell('ArrowDown')
  for (let i = 0; i < 7; i++) await moveCell('ArrowRight')
  try {
    await expect
      .poll(async () => rpgSnapshot(preview))
      .toMatchObject({ apiPresent: true, state: 'jogando', map: 'caverna' })
  } catch (error) {
    const snapshot = await rpgSnapshot(preview)
    throw new Error(`a porta não levou à caverna: ${JSON.stringify(snapshot)}\n${String(error)}`)
  }
  await page.waitForTimeout(1_100)
  const caveFrame = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL())
  expect(caveFrame).not.toBe(villageFrame)

  for (let i = 0; i < 3; i++) await moveCell('ArrowUp')
  for (let i = 0; i < 6; i++) await moveCell('ArrowRight')
  await faceDirection('ArrowRight', 'right')
  await gameBody.press('Space')
  await expect.poll(async () => (await rpgSnapshot(preview)).state).toBe('batalha')

  const choose = async (label: string) => {
    await expect
      .poll(async () => {
        const snapshot = await rpgSnapshot(preview)
        return snapshot.state === 'vitoria' || snapshot.menuOpen
      })
      .toBe(true)
    const snapshot = await rpgSnapshot(preview)
    if (snapshot.state === 'vitoria') return
    const index = snapshot.menuLabels.findIndex((item) => item.includes(label))
    if (index < 0) throw new Error(`ação ${label} ausente: ${snapshot.menuLabels.join(', ')}`)
    for (let i = 0; i < index; i++) await gameBody.press('ArrowDown')
    await gameBody.press('Space')
    await page.waitForTimeout(650)
  }

  await choose('Defender')
  await choose('Espada flamejante')
  await choose('Item')
  for (let turn = 0; turn < 10 && (await rpgSnapshot(preview)).state === 'batalha'; turn++) {
    const snapshot = await rpgSnapshot(preview)
    await choose(snapshot.energy >= 4 ? 'Espada flamejante' : 'Atacar')
  }
  await expect.poll(async () => (await rpgSnapshot(preview)).state).toBe('vitoria')

  await preview.getByRole('button', { name: 'Jogar de novo' }).click()
  await expect.poll(async () => (await rpgSnapshot(preview)).map).toBe('vila')
  expect((await rpgSnapshot(preview)).hasKey).toBe(false)
  expect(diagnostics, diagnostics.join('\n')).toEqual([])
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
