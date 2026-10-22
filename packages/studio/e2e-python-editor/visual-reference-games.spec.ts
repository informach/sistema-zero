import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import type { Locator, Page } from '@playwright/test'
import type { EditableStudioProject } from '../src/core/editableProject'
import type { PythonProjectDocument } from '../src/core/pythonProject'
import {
  VISUAL_REFERENCE_GAMES,
  type VisualReferenceGameKey,
} from '../src/examples/python/visualReferenceGames.manifest'
import { preparePythonExecutionSnapshot } from '../src/runtime/python/snapshot'
import type {} from './fixtures/free'
import { expect, test } from './fixtures/pythonLanguageSessions'

/** Presented-pixel probe for one game: actor region/color and the gesture that moves it. */
interface Probe {
  /** Numeric constant edited in Blocks and Code, as `VARIABLE = original`. */
  variable: string
  original: string
  edited: string
  width: number
  height: number
  /** Logical canvas region [x0, y0, x1, y1] and exact RGB of the actor's pixels. */
  actor: {
    region: readonly [number, number, number, number]
    color: readonly [number, number, number]
  }
  setupKeys?: readonly string[]
  /**
   * `retry` presses again until accepted (opening countdowns ignore input); `hold` keeps the
   * key down. `sign` is the expected direction in canvas pixels on `axis`.
   */
  move: { key: string; mode: 'retry' | 'hold'; axis: 'x' | 'y'; sign: 1 | -1; minimum: number }
  /** Optional held key that must make a second, differently colored object appear. */
  fire?: { key: string; color: readonly [number, number, number] }
  pauseKey: string
}
const probes = {
  'pacman-visual': {
    variable: 'INTERVALO',
    original: '16',
    edited: '20',
    width: 1010,
    height: 860,
    actor: { region: [100, 680, 900, 780], color: [255, 225, 74] },
    move: { key: 'ArrowRight', mode: 'retry', axis: 'x', sign: 1, minimum: 20 },
    pauseKey: 'Space',
  },
  'space-arena-visual': {
    variable: 'GIRO',
    original: '4',
    edited: '5',
    width: 1020,
    height: 620,
    actor: { region: [35, 35, 765, 585], color: [103, 232, 249] },
    // Fixed arena view: moving the ship must move its presented centroid.
    setupKeys: ['s', 'c'],
    move: { key: 'ArrowUp', mode: 'hold', axis: 'y', sign: -1, minimum: 18 },
    fire: { key: 'Space', color: [254, 240, 138] },
    pauseKey: 'p',
  },
  'snake-visual': {
    variable: 'PASSO_COBRINHA',
    original: '120',
    edited: '90',
    width: 640,
    height: 700,
    // The head walks right by itself; only the arrow can move it up the board.
    actor: { region: [80, 140, 560, 620], color: [255, 225, 74] },
    move: { key: 'ArrowUp', mode: 'retry', axis: 'y', sign: -1, minimum: 20 },
    pauseKey: 'Space',
  },
  'pong-visual': {
    variable: 'VELOCIDADE_RAQUETE',
    original: '420',
    edited: '480',
    width: 900,
    height: 660,
    actor: {
      region: [30, 80, 72, 610],
      color: [255, 225, 74],
    },
    move: {
      key: 'w',
      mode: 'hold',
      axis: 'y',
      sign: -1,
      minimum: 20,
    },
    pauseKey: 'Space',
  },
  'tron-visual': {
    variable: 'PASSO',
    original: '90',
    edited: '110',
    width: 760,
    height: 620,
    actor: {
      region: [28, 90, 732, 570],
      color: [255, 180, 168],
    },
    move: {
      key: 'a',
      mode: 'hold',
      axis: 'y',
      sign: -1,
      minimum: 20,
    },
    pauseKey: 'Space',
  },
  'flappy-visual': {
    variable: 'GRAVIDADE',
    original: '1500',
    edited: '1300',
    width: 480,
    height: 720,
    actor: {
      region: [100, 60, 140, 660],
      color: [255, 210, 63],
    },
    move: {
      key: 'Space',
      mode: 'retry',
      axis: 'y',
      sign: -1,
      minimum: 20,
    },
    pauseKey: 'p',
  },
  'spinner-visual': {
    variable: 'ATRITO',
    original: '90',
    edited: '60',
    width: 700,
    height: 700,
    actor: {
      region: [170, 190, 530, 550],
      color: [255, 92, 122],
    },
    move: {
      key: 'Space',
      mode: 'retry',
      axis: 'x',
      sign: 1,
      minimum: 20,
    },
    pauseKey: 'p',
  },
  'tictactoe-visual': {
    variable: 'DEMORA_COMPUTADOR',
    original: '600',
    edited: '400',
    width: 600,
    height: 700,
    actor: {
      region: [60, 130, 540, 610],
      color: [56, 189, 248],
    },
    move: {
      key: 'ArrowRight',
      mode: 'retry',
      axis: 'x',
      sign: 1,
      minimum: 20,
    },
    pauseKey: 'p',
  },
  'connect-four-visual': {
    variable: 'QUEDA',
    original: '900',
    edited: '700',
    width: 700,
    height: 720,
    actor: {
      region: [80, 86, 620, 134],
      color: [56, 189, 248],
    },
    move: {
      key: 'ArrowRight',
      mode: 'retry',
      axis: 'x',
      sign: 1,
      minimum: 20,
    },
    pauseKey: 'p',
  },
  'tiles-visual': {
    variable: 'EMBARALHAR',
    original: '200',
    edited: '120',
    width: 600,
    height: 680,
    actor: {
      region: [90, 150, 510, 570],
      color: [56, 189, 248],
    },
    move: {
      key: 'ArrowDown',
      mode: 'retry',
      axis: 'y',
      sign: -1,
      minimum: 20,
    },
    pauseKey: 'p',
  },
  'memory-visual': {
    variable: 'TEMPO_DESVIRAR',
    original: '900',
    edited: '700',
    width: 620,
    height: 700,
    actor: {
      region: [80, 130, 540, 590],
      color: [56, 189, 248],
    },
    move: {
      key: 'ArrowRight',
      mode: 'retry',
      axis: 'x',
      sign: 1,
      minimum: 20,
    },
    pauseKey: 'p',
  },
  'simon-visual': {
    variable: 'ACESO',
    original: '450',
    edited: '350',
    width: 600,
    height: 680,
    actor: {
      region: [70, 120, 530, 580],
      color: [255, 255, 255],
    },
    move: {
      key: 'ArrowUp',
      mode: 'retry',
      axis: 'y',
      sign: -1,
      minimum: 20,
    },
    pauseKey: 'p',
  },
  'bubbles-visual': {
    variable: 'VELOCIDADE_SUB',
    original: '5',
    edited: '7',
    width: 800,
    height: 500,
    actor: {
      region: [0, 40, 800, 475],
      color: [255, 210, 63],
    },
    move: {
      key: 'ArrowUp',
      mode: 'hold',
      axis: 'y',
      sign: -1,
      minimum: 20,
    },
    pauseKey: 'Space',
  },
  'egg-catcher-visual': {
    variable: 'VELOCIDADE_CESTA',
    original: '8',
    edited: '10',
    width: 800,
    height: 600,
    actor: {
      region: [0, 495, 800, 560],
      color: [194, 106, 43],
    },
    move: {
      key: 'ArrowLeft',
      mode: 'hold',
      axis: 'x',
      sign: -1,
      minimum: 20,
    },
    pauseKey: 'Space',
  },
  'monkey-visual': {
    variable: 'VELOCIDADE_MACACO',
    original: '6',
    edited: '8',
    width: 800,
    height: 600,
    actor: {
      region: [0, 470, 800, 560],
      color: [139, 90, 43],
    },
    move: {
      key: 'ArrowRight',
      mode: 'hold',
      axis: 'x',
      sign: 1,
      minimum: 20,
    },
    pauseKey: 'p',
  },
  'cannon-visual': {
    variable: 'PASSO_ANGULO',
    original: '3',
    edited: '5',
    width: 800,
    height: 600,
    actor: {
      region: [20, 400, 220, 590],
      color: [225, 29, 72],
    },
    move: {
      key: 'ArrowUp',
      mode: 'retry',
      axis: 'y',
      sign: -1,
      minimum: 20,
    },
    pauseKey: 'p',
  },
  'life-visual': {
    variable: 'INTERVALO_GERACAO',
    original: '150',
    edited: '90',
    width: 900,
    height: 760,
    actor: {
      region: [50, 90, 850, 690],
      color: [255, 79, 216],
    },
    move: {
      key: 'ArrowRight',
      mode: 'retry',
      axis: 'x',
      sign: 1,
      minimum: 20,
    },
    pauseKey: 'Space',
  },
  'starry-visual': {
    variable: 'RITMO_ESTRELA',
    original: '350',
    edited: '250',
    width: 800,
    height: 650,
    actor: {
      region: [20, 65, 780, 585],
      color: [103, 232, 249],
    },
    move: {
      key: 'ArrowRight',
      mode: 'retry',
      axis: 'x',
      sign: 1,
      minimum: 20,
    },
    pauseKey: 'Space',
  },
  'fortune-visual': {
    variable: 'VELOCIDADE_MAXIMA',
    original: '1080',
    edited: '900',
    width: 800,
    height: 700,
    actor: {
      region: [240, 170, 560, 490],
      color: [255, 225, 74],
    },
    move: {
      key: 'ArrowRight',
      mode: 'retry',
      axis: 'x',
      sign: 1,
      minimum: 20,
    },
    pauseKey: 'p',
  },
  'turtle-bet-visual': {
    variable: 'PASSO_CORRIDA',
    original: '100',
    edited: '140',
    width: 900,
    height: 600,
    actor: {
      region: [80, 160, 830, 230],
      color: [255, 92, 122],
    },
    setupKeys: ['1'],
    move: {
      key: 'Space',
      mode: 'retry',
      axis: 'x',
      sign: 1,
      minimum: 20,
    },
    pauseKey: 'p',
  },
} as const satisfies Record<VisualReferenceGameKey, Probe>
const games = VISUAL_REFERENCE_GAMES.map((game) => ({
  directory: game.key,
  name: game.name,
  sounds: game.sounds.map(({ path }) => path),
  ...(probes[game.key] as Probe),
}))
type Game = (typeof games)[number]
const textPaths = ['main.py', 'README.md', 'NOTICE.md', 'LICENSE', 'requirements.txt']
const normalizeEol = (value: string) => value.replaceAll('\r\n', '\n')
const sha256 = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const frameSelector = 'iframe[title="Pré-visualização Python"]'

function python(project: EditableStudioProject | null): PythonProjectDocument {
  if (!project || !('programmingLanguage' in project) || project.programmingLanguage !== 'python')
    throw new Error('Expected the real persisted Python project')
  return project
}

function files(project: PythonProjectDocument) {
  if (project.kind === 'classic') return project.files
  return Object.fromEntries(
    Object.entries(project.tree).map(([path, node]) => {
      // These examples contain root files only. Never filter unexpected directories away:
      // every actual entry must participate in the exact comparison with authored material.
      if (node.kind !== 'file') throw new Error(`Unexpected project directory: ${path}`)
      return [path, node.content]
    }),
  )
}

async function expectedMaterials(game: Game) {
  const directory = new URL(`../src/examples/python/${game.directory}/`, import.meta.url)
  const source = Object.fromEntries(
    await Promise.all(
      textPaths.map(
        async (path) =>
          [path, normalizeEol(await readFile(new URL(path, directory), 'utf8'))] as const,
      ),
    ),
  )
  const audio = Object.fromEntries(
    await Promise.all(
      game.sounds.map(
        async (path) => [path, sha256(await readFile(new URL(path, directory)))] as const,
      ),
    ),
  )
  return { source, audio }
}

function assertMaterials(
  project: PythonProjectDocument,
  expected: Awaited<ReturnType<typeof expectedMaterials>>,
) {
  expect(files(project)).toEqual(expected.source)
  expect(project.python.entrypoint).toBe('main.py')
  expect(project.installedExtensions.map(({ id, version }) => ({ id, version }))).toEqual([
    { id: 'python-turtle', version: '1.0.0' },
  ])
  const audio = Object.fromEntries(
    (project.assets ?? []).map((asset) => {
      expect(asset.kind).toBe('audio')
      expect(asset.source).toBe('upload')
      expect(asset.license?.name).toBe('MIT')
      expect(asset.dataUrl).toMatch(/^data:audio\/wav;base64,/)
      return [
        asset.proPath,
        sha256(Buffer.from(asset.dataUrl.slice(asset.dataUrl.indexOf(',') + 1), 'base64')),
      ]
    }),
  )
  expect(project.assets).toHaveLength(Object.keys(expected.audio).length)
  expect(audio).toEqual(expected.audio)
}

async function savedSource(page: Page) {
  return page.evaluate(async () => {
    const project = await studioFreeProbe.saved()
    if (!project || !('programmingLanguage' in project) || project.programmingLanguage !== 'python')
      return null
    if (project.kind === 'classic') return project.files['main.py']
    const main = project.tree['main.py']
    if (main?.kind !== 'file') throw new Error('The saved Pro entrypoint is not a file')
    return main.content
  })
}

async function save(page: Page, source: string) {
  await page.getByRole('button', { name: 'Mais opções', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Salvar', exact: true }).click()
  await expect.poll(() => savedSource(page), { timeout: 30_000 }).toBe(source)
}

/** Reads only presented pixels. No FFI, model mutation or private game-state inspection. */
async function actor(canvas: Locator, game: Game, missile = false) {
  return canvas.evaluate(
    async (element, input) => {
      if (!(element instanceof HTMLCanvasElement)) throw new Error('Expected a real Turtle canvas')
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      )
      const context = element.getContext('2d')
      if (!context) throw new Error('Canvas pixels unavailable')
      // Canvas backing pixels may be scaled; all returned coordinates are logical Turtle pixels.
      const sx = element.width / input.width
      const sy = element.height / input.height
      const { region, color } = input
      const x0 = Math.floor(region[0]! * sx),
        y0 = Math.floor(region[1]! * sy)
      const width = Math.ceil((region[2]! - region[0]!) * sx)
      const height = Math.ceil((region[3]! - region[1]!) * sy)
      const data = context.getImageData(x0, y0, width, height).data
      let count = 0,
        x = 0,
        y = 0
      for (let row = 0; row < height; row++)
        for (let column = 0; column < width; column++) {
          const offset = (row * width + column) * 4
          if (
            data[offset] === color[0] &&
            data[offset + 1] === color[1] &&
            data[offset + 2] === color[2] &&
            data[offset + 3] === 255
          ) {
            count++
            x += (x0 + column) / sx
            y += (y0 + row) / sy
          }
        }
      return {
        count,
        x: count ? x / count : null,
        y: count ? y / count : null,
        backing: [element.width, element.height],
        logical: [input.width, input.height],
      }
    },
    {
      region: game.actor.region,
      color: missile && game.fire ? game.fire.color : game.actor.color,
      width: game.width,
      height: game.height,
    },
  )
}

async function play(page: Page, game: Game, release: string) {
  const saved = python(await page.evaluate(() => studioFreeProbe.saved()))
  const expectedRevision = (await preparePythonExecutionSnapshot(saved)).revision
  const runButton = page.getByRole('button', { name: /^(Executar|Reiniciar)$/ })
  await expect(runButton).toBeEnabled()
  const previousFrames = await page.locator(frameSelector).elementHandles()
  let observedRevision: unknown
  try {
    const [executionRequest] = await Promise.all([
      page.waitForRequest(
        (request) => {
          if (
            request.method() !== 'POST' ||
            new URL(request.url()).pathname !== '/api/studio/free-runtime'
          )
            return false
          const input: unknown = request.postDataJSON()
          return (
            input !== null &&
            typeof input === 'object' &&
            'operation' in input &&
            input.operation === 'execute' &&
            'subject' in input &&
            input.subject !== null &&
            typeof input.subject === 'object' &&
            'id' in input.subject &&
            input.subject.id === saved.id
          )
        },
        { timeout: 30_000 },
      ),
      runButton.click(),
    ])
    const requestBody = executionRequest.postDataJSON()
    expect(requestBody).toMatchObject({
      operation: 'execute',
      subject: { id: saved.id },
      revision: expectedRevision,
    })
    observedRevision = requestBody.revision
    for (const previous of previousFrames)
      await expect
        .poll(() => previous.evaluate((frame) => frame.isConnected).catch(() => false))
        .toBe(false)
  } finally {
    await Promise.all(previousFrames.map((previous) => previous.dispose()))
  }
  const frame = page.locator(frameSelector)
  await expect(frame).toHaveCount(1)
  await expect(frame).toHaveAttribute('src', new RegExp(release))
  const canvas = frame.contentFrame().locator('canvas')
  await expect(canvas).toBeVisible({ timeout: 35_000 })
  await canvas.click()
  for (const key of game.setupKeys ?? []) await canvas.press(key)
  let before = await actor(canvas, game)
  await expect
    .poll(
      async () => {
        before = await actor(canvas, game)
        return before.count
      },
      { timeout: 10_000 },
    )
    .toBeGreaterThan(5)
  expect(before.x).not.toBeNull()
  expect(before.y).not.toBeNull()
  // Tiles shuffles legally, so its empty square can start on any row. Its presented
  // centers are y=210/310/410/510: below 260 it is on the top row and cannot move up.
  // ArrowUp moves a tile up, so the empty square moves down.
  // Select only from the measured pixels; keep the signed-distance oracle unchanged.
  const move: Probe['move'] =
    game.directory === 'tiles-visual' && before.y! < 260
      ? { ...game.move, key: 'ArrowUp', sign: 1 }
      : game.move
  let after = before
  const moved = (point: typeof before) => {
    const axis = move.axis
    const start = before[axis]
    const end = point[axis]
    return point.count > 5 && start !== null && end !== null ? (end - start) * move.sign : 0
  }
  if (move.mode === 'retry') {
    // During opening countdowns direction requests are deliberately ignored. Each retry
    // is another real key gesture; the actor is stationary until one is accepted.
    await expect
      .poll(
        async () => {
          await canvas.press(move.key)
          after = await actor(canvas, game)
          return moved(after)
        },
        { timeout: 10_000, intervals: [100, 150, 200] },
      )
      .toBeGreaterThan(move.minimum)
  } else {
    await page.keyboard.down(move.key)
    try {
      await expect
        .poll(
          async () => {
            after = await actor(canvas, game)
            return moved(after)
          },
          { timeout: 5_000, intervals: [100, 150, 200] },
        )
        .toBeGreaterThan(move.minimum)
    } finally {
      await page.keyboard.up(move.key)
    }
  }
  if (game.fire) {
    await page.keyboard.down(game.fire.key)
    try {
      await expect
        .poll(async () => (await actor(canvas, game, true)).count, { timeout: 3_000 })
        .toBeGreaterThan(0)
    } finally {
      await page.keyboard.up(game.fire.key)
    }
  }
  await canvas.press(game.pauseKey)
  await page.getByRole('button', { name: 'Parar', exact: true }).click()
  await expect(frame).toHaveCount(0)
  return {
    before,
    after,
    gesture: move,
    execution: { projectId: saved.id, expectedRevision, observedRevision },
  }
}

test.beforeEach(async ({ page, pythonLanguageSessions }) => {
  pythonLanguageSessions.releaseWith(async () => {
    if (!page.isClosed()) await page.evaluate(() => globalThis.studioFreeProbe?.close())
  })
})

for (const game of games)
  for (const kind of ['classic', 'pro'] as const) {
    test(`${game.name} ${kind}: gallery, actual editing, save/reopen and causal keyboard pixels`, async ({
      page,
      request,
    }, testInfo) => {
      test.setTimeout(180_000)
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(`console.error: ${message.text()}`)
      })
      const runtimeResponse = await request.get('/distribution')
      expect(runtimeResponse.ok()).toBe(true)
      const runtime = await runtimeResponse.json()
      // This suite must never silently run Pac-Man against the frozen pre-compound audio-2 release.
      expect(runtime.manifest.features).toContain('turtle-compound-shapes')
      expect(runtime.release.manifestSha256).toMatch(/^[a-f0-9]{64}$/)
      expect(runtime.manifest.providedModules).toContainEqual(
        expect.objectContaining({
          descriptor: expect.objectContaining({ importName: 'sz_audio', version: '1.0.0' }),
        }),
      )
      const expected = await expectedMaterials(game)
      // The localized visual writer parenthesizes a replaced expression to preserve
      // precedence. Monaco's direct text edit leaves the literal unparenthesized.
      const editedExpression = kind === 'classic' ? `(${game.edited})` : game.edited
      const editedSource = expected.source['main.py']!.replace(
        `${game.variable} = ${game.original}\n`,
        `${game.variable} = ${editedExpression}\n`,
      )
      expect(editedSource).not.toBe(expected.source['main.py'])
      const editedMaterials = {
        ...expected,
        source: { ...expected.source, 'main.py': editedSource },
      }
      const name = `${game.name} (${kind === 'classic' ? 'Blocos' : 'Código'})`
      try {
        await page.setViewportSize({ width: 1600, height: 1000 })
        await page.goto('/')
        await page.waitForFunction(() => !!globalThis.studioFreeProbe)
        await page.evaluate(() => studioFreeProbe.create(false, false, true))
        const gallery = page.getByRole('region', { name: 'Que jogo você quer criar?', exact: true })
        await expect(gallery).toBeVisible({ timeout: 15_000 })
        await gallery
          .locator('select[name="kit-language"]')
          .selectOption('python', { timeout: 5_000 })
        const card = gallery
          .getByRole('button')
          .filter({ has: page.getByText(name, { exact: true }) })
        await expect(card).toBeEnabled({ timeout: 30_000 })
        await card.click()
        await expect
          .poll(() => page.evaluate(() => studioFreeProbe.saved()), { timeout: 30_000 })
          .toMatchObject({
            name,
            kind,
            programmingLanguage: 'python',
            mode: kind === 'classic' ? 'blocks' : 'code',
          })
        const initial = python(await page.evaluate(() => studioFreeProbe.saved()))
        assertMaterials(initial, expected)
        let initialWorkspace: Awaited<
          ReturnType<typeof globalThis.studioFreeProbe.workspace>
        > | null = null
        if (kind === 'classic') {
          await expect(
            page.getByRole('region', { name: 'Editor de blocos Python' }).locator('.blocklySvg'),
          ).toBeVisible({ timeout: 35_000 })
          await expect
            .poll(() => page.evaluate(() => studioFreeProbe.workspace().count), { timeout: 35_000 })
            .toBeGreaterThan(100)
          initialWorkspace = await page.evaluate(() => studioFreeProbe.workspace())
          expect(initialWorkspace.opaque).toEqual([])
          expect(initialWorkspace.types.every((type) => type.startsWith('sz_py_'))).toBe(true)
          const field = await page.evaluate(
            ({ variable }) => studioFreeProbe.focusAssignmentField(variable, 'NUMBER'),
            game,
          )
          expect(field.value).toBe(game.original)
          await page
            .locator(`[data-id="${field.blockId}"] .blocklyTextInputField`)
            .filter({ hasText: new RegExp(`^${game.original}$`) })
            .click()
          await page.locator('.blocklyHtmlInput').fill(game.edited)
          await page.locator('.blocklyHtmlInput').press('Enter')
          // Save from Blocks first: wait for the real asynchronous source transaction before
          // changing surfaces, then prove Ponte displays that exact committed program.
          await save(page, editedSource)
          await page.getByRole('button', { name: 'Ponte', exact: true }).click()
          await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 30_000 })
          await expect
            .poll(() => page.evaluate(() => studioFreeProbe.read()), { timeout: 30_000 })
            .toBe(editedSource)
        } else {
          const monaco = page.locator('.monaco-editor').first()
          await expect(monaco).toBeVisible({ timeout: 30_000 })
          const line = expected.source['main.py']!.split('\n').indexOf(
            `${game.variable} = ${game.original}`,
          )
          expect(line).toBeGreaterThan(0)
          await monaco.locator('textarea').focus()
          // ArrowDown counts wrapped screen rows. Go to Line targets the actual source line.
          await page.keyboard.press('Control+g')
          const goToLine = page.locator('.quick-input-widget input:visible')
          await expect(goToLine).toBeVisible()
          await goToLine.fill(`:${line + 1}:1`)
          await goToLine.press('Enter')
          await expect(goToLine).toBeHidden()
          await page.keyboard.press('Escape')
          await page.keyboard.press('Home')
          await page.keyboard.press('Shift+End')
          await page.keyboard.insertText(`${game.variable} = ${game.edited}`)
          await expect.poll(() => page.evaluate(() => studioFreeProbe.read())).toBe(editedSource)
        }
        await save(page, editedSource)
        assertMaterials(python(await page.evaluate(() => studioFreeProbe.saved())), editedMaterials)
        const firstRun = await play(page, game, runtime.release.manifestSha256)
        // Navigate out through the product UI, prove disposal, then reopen the actual persisted ID.
        await page.getByTitle('Voltar à lista de projetos', { exact: true }).click()
        await expect(page.locator('.monaco-editor')).toHaveCount(0)
        await expect(page.locator(frameSelector)).toHaveCount(0)
        const savedCard = page.locator('article').filter({
          has: page.getByRole('button', { name: `Abrir projeto ${name}`, exact: true }),
        })
        await expect(savedCard).toHaveCSS('display', 'flex')
        await savedCard
          .getByRole('button', { name: 'Abrir', exact: true })
          .click({ timeout: 15_000 })
        await expect
          .poll(() => page.evaluate(() => studioFreeProbe.saved()), { timeout: 30_000 })
          .toMatchObject({ id: initial.id, kind })
        await expect
          .poll(() => page.evaluate(() => studioFreeProbe.read()), { timeout: 35_000 })
          .toBe(editedSource)
        assertMaterials(python(await page.evaluate(() => studioFreeProbe.saved())), editedMaterials)
        if (initialWorkspace) {
          await expect
            .poll(() => page.evaluate(() => studioFreeProbe.workspace().count), { timeout: 35_000 })
            .toBe(initialWorkspace.count)
          const reopened = await page.evaluate(() => studioFreeProbe.workspace())
          expect(reopened.id).not.toBe(initialWorkspace.id)
          expect(reopened.opaque).toEqual([])
          const restoredField = await page.evaluate(
            ({ variable }) => studioFreeProbe.focusAssignmentField(variable, 'NUMBER'),
            game,
          )
          expect(restoredField.value).toBe(game.edited)
        }
        const reopenedRun = await play(page, game, runtime.release.manifestSha256)
        await testInfo.attach('visual-reference-game', {
          contentType: 'application/json',
          body: JSON.stringify({
            qualification:
              'functional controlled-host UI; not production authentication, audio audibility or performance acceptance',
            assertions:
              'editing → exact source/save/reopen; controls → actor pixels; does not quantify the gameplay effect of the edited constant',
            game: game.directory,
            kind,
            projectId: initial.id,
            distribution: runtime.hash,
            release: runtime.release.manifestSha256,
            originalSourceSha256: sha256(expected.source['main.py']!),
            editedSourceSha256: sha256(editedSource),
            audio: expected.audio,
            initialWorkspace,
            firstRun,
            reopenedRun,
          }),
        })
      } finally {
        if (!page.isClosed()) await page.evaluate(() => globalThis.studioFreeProbe?.close())
        await testInfo.attach('browser-errors', {
          body: JSON.stringify(errors),
          contentType: 'application/json',
        })
      }
      expect(errors).toEqual([])
    })
  }
