import { expect, type Locator, type Page, test } from '@playwright/test'
import { compileStatements, generateJS } from '../src/generators/js'
import { textQuizExample } from '../src/official-extensions/game-2d/examples/textGames'
import { gameTwoDRuntime } from '../src/official-extensions/game-2d/runtime'
import type { GameTwoDRuntimeApi } from '../src/official-extensions/game-2d/runtimeContract'
import { parseJS } from '../src/parsers/js'

type RuntimeWindow = { SZGame2D: GameTwoDRuntimeApi }

test('quiz anuncia alternativas e pode ser concluído e reiniciado só pelo teclado', async ({
  page,
}) => {
  await prepare(page)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addScriptTag({
    content: `SZGame2D.onStart(function () { ${generateJS(textQuizExample.ir)} }, 'quiz');`,
  })
  const hud = page.locator('#sz-game-hud-status')
  await expect(hud).toContainText('Quanto é 3 + 5?')
  await expect(hud).toContainText('1: 6')
  await expect(hud).toContainText('2: 8')
  await expect(hud).toContainText('3: 9')
  expect(await page.locator('body').ariaSnapshot()).toContain('2: 8')
  await page.keyboard.press('Tab')
  await expect(page.locator('canvas').first()).toBeFocused()
  for (let round = 0; round < 2; round++) {
    await page.keyboard.press('2')
    await expect(hud).toContainText('Acertou!')
    await expect(hud).toContainText('Próxima pergunta')
    await page.keyboard.press('2')
    await page.keyboard.press('3')
    await expect(hud).toContainText('Acertou!')
    await page.keyboard.press('Enter')
    await expect(hud).toContainText('Qual destes números é ímpar?')
    await expect(hud).toContainText('2: 7')
    await expect(hud).not.toContainText('2: 8')
    await page.keyboard.press('1')
    await expect(hud).toContainText('A resposta correta é 7')
    await page.keyboard.press('Enter')
    await expect(hud).toContainText('Acertos: 1')
    await expect(hud).not.toContainText('1: 12')
    await page.keyboard.press('Enter')
    await expect(hud).toContainText('Quanto é 3 + 5?')
  }
  expect(errors).toEqual([])
})

test('callback compartilhado conserva todos os alvos, deduplica cada inscrição e limpa no reinício', async ({
  page,
}) => {
  await prepare(page)
  await page.evaluate(() => {
    const api = (window as unknown as RuntimeWindow).SZGame2D
    api.onStart(() => {}, 'partida')
    const ctx = document.querySelector('canvas')?.getContext('2d')
    if (!ctx) throw new Error('Canvas ausente')
    const responder = () => {
      document.body.dataset.clicks = String(Number(document.body.dataset.clicks || 0) + 1)
    }
    for (const x of [10, 210]) {
      const sprite = api.createTextSprite('Sprite', x, 10)
      api.setTextBox(sprite, 150, 'left', 4, '#123456')
      api.onSpriteClick(sprite, responder)
      api.onSpriteClick(sprite, responder)
      if (x === 10) {
        api.onSpriteClick(
          sprite,
          () => {
            document.body.dataset.explicit = 'respondido'
          },
          'alvo-1',
        )
      }
      api.drawSprite(ctx, sprite)
      const grupo = api.createGroup()
      const membro = api.spawnTextInGroup(grupo, 'Grupo', x, 100)
      api.setTextBox(membro, 150, 'left', 4, '#123456')
      api.onGroupClick(grupo, responder)
      api.onGroupClick(grupo, responder)
      api.drawGroup(ctx, grupo)
    }
  })
  const canvas = page.locator('canvas').first()
  let clicks = 0
  for (const [x, y] of [
    [20, 20],
    [220, 20],
    [20, 110],
    [220, 110],
  ]) {
    await clickOnStage(canvas, x ?? 0, y ?? 0)
    await expect(page.locator('body')).toHaveAttribute('data-clicks', String(++clicks))
  }
  await page.evaluate(() => (window as unknown as RuntimeWindow).SZGame2D.restart())
  await clickOnStage(canvas, 20, 20)
  await expect(page.locator('body')).toHaveAttribute('data-clicks', '4')
  await expect(page.locator('body')).toHaveAttribute('data-explicit', 'respondido')
})

test('texto cede novamente à animação automática no mesmo estado', async ({ page }) => {
  await prepare(page)
  const result = await page.evaluate(() => {
    const api = (window as unknown as RuntimeWindow).SZGame2D
    const sprite = api.createSprite({ x: 10, y: 10 })
    const sheet = { image: null, frameW: 10, frameH: 10 }
    api.setStateAnimation(sprite, 'parado', sheet, 0, 1, 8)
    api.autoAnimate(sprite)
    const before = !!sprite.anim
    api.setSpriteText(sprite, '10')
    const text = api.spriteText(sprite)
    api.autoAnimate(sprite)
    return { before, text, after: !!sprite.anim, sheetRestored: sprite.anim?.sheet === sheet }
  })
  expect(result).toEqual({ before: true, text: '10', after: true, sheetRestored: true })
})

test('grupos conservam accessors protegidos e a substituição normal da lista', async ({ page }) => {
  await prepare(page)
  const result = await page.evaluate(() => {
    const api = (window as unknown as RuntimeWindow).SZGame2D
    const grupo = api.createGroup()
    const sprite = api.createTextSprite('1', 0, 0)
    grupo.items = [sprite]
    const revision = grupo._revision
    grupo.items = []
    const groups = [grupo, api.createAllEnemiesGroup()]
    return {
      replaced: grupo.items.length === 0 && grupo._revision !== revision,
      descriptors: groups.map((group) => ({
        configurable: Object.getOwnPropertyDescriptor(group, 'items')?.configurable,
        deleted: Reflect.deleteProperty(group, 'items'),
        redefined: Reflect.defineProperty(group, 'items', { value: [], writable: true }),
      })),
    }
  })
  expect(result).toEqual({
    replaced: true,
    descriptors: [
      { configurable: false, deleted: false, redefined: false },
      { configurable: false, deleted: false, redefined: false },
    ],
  })
})

for (const method of ['onSpriteClick', 'onGroupClick']) {
  test(`Ponte conserva substituição de eventos ${method} no runtime real`, async ({ page }) => {
    const param = method === 'onGroupClick' ? 'item' : ''
    const target = method === 'onGroupClick' ? 'grupo' : 'sprite'
    const source = `const grupo = SZGame2D.createGroup();
const sprite = SZGame2D.spawnTextInGroup(grupo, 'Resposta', 10, 10);
SZGame2D.setTextBox(sprite, 200, 'left', 4, '#123456');
SZGame2D.${method}(${target}, function (${param}) { document.body.dataset.resultado = document.body.dataset.resultado + 'A'; }, 'mesmo');
SZGame2D.${method}(${target}, function (${param}) { document.body.dataset.resultado = document.body.dataset.resultado + 'B'; }, 'mesmo');
SZGame2D.drawGroup(ctx, grupo);`
    for (const code of [source, compileStatements(parseJS(source), 0)]) {
      await prepare(page)
      await page.evaluate(() => {
        document.body.dataset.resultado = ''
      })
      await page.addScriptTag({ content: code })
      await clickOnStage(page.locator('canvas').first(), 20, 20)
      await expect(page.locator('body')).toHaveAttribute('data-resultado', 'B')
    }
  })
}

async function prepare(page: Page) {
  await page.goto('about:blank')
  await page.setContent(
    '<html><body style="margin:0"><canvas id="tela" width="600" height="400"></canvas></body></html>',
  )
  await page.addScriptTag({ content: gameTwoDRuntime })
  await page.evaluate(() =>
    (window as unknown as RuntimeWindow).SZGame2D.setupStage(600, 400, '#102030'),
  )
}

async function clickOnStage(canvas: Locator, x: number, y: number) {
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Palco sem posição')
  await canvas.click({ position: { x: (x / 600) * box.width, y: (y / 400) * box.height } })
}

test('quiz da galeria preserva blocos na Ponte e ao reabrir; respostas e reinício funcionam', async ({
  page,
}) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  const card = page
    .locator('button')
    .filter({ has: page.getByText('Quiz de números', { exact: true }) })
    .first()
  if (!(await card.isVisible()))
    await page.getByRole('button', { name: 'Ver todos os jogos 2D' }).click()
  await card.click()
  await expect(page).toHaveURL(/\/editor\//)
  const preview = page.frameLocator('iframe[title="Pré-visualização"]')
  const hud = preview.locator('#sz-game-hud-status')
  const canvas = preview.locator('canvas').first()
  await expect(hud).toContainText('Quanto é 3 + 5?', { timeout: 30_000 })
  await page.getByRole('button', { name: 'Ponte', exact: true }).click()
  await page.getByRole('button', { name: 'script.js', exact: true }).first().click()
  await expect(page.locator('.monaco-editor').first()).toBeVisible()
  await page.getByRole('button', { name: 'Blocos', exact: true }).click()
  await page.reload()
  await expect(hud).toContainText('Quanto é 3 + 5?', { timeout: 30_000 })
  await expect(page.locator('.blocklyText').filter({ hasText: 'No grupo' }).first()).toBeVisible()
  for (let round = 0; round < 2; round++) {
    await clickOnStage(canvas, 300, 185)
    await expect(hud).toContainText('Acertou!')
    await clickOnStage(canvas, 300, 185)
    await clickOnStage(canvas, 300, 340)
    await expect(hud).toContainText('Qual destes números é ímpar?')
    await clickOnStage(canvas, 300, 115)
    await expect(hud).toContainText('Quase! A resposta correta é 7.')
    if (round === 0) await canvas.screenshot({ path: '.cache/text-quiz-preview.png' })
    await clickOnStage(canvas, 300, 340)
    await expect(hud).toContainText('Acertos: 1')
    await clickOnStage(canvas, 300, 340)
    await expect(hud).toContainText('Quanto é 3 + 5?')
  }
  expect(errors).toEqual([])
})

test('100 números são sprites independentes, com dados, movimento, colisões e desenho real', async ({
  page,
}) => {
  await prepare(page)
  const result = await page.evaluate(() => {
    const api = (window as unknown as RuntimeWindow).SZGame2D
    const canvas = document.querySelector('canvas')
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) throw new Error('Palco ausente')
    const group = api.createGroup()
    for (let n = 1; n <= 100; n++) {
      const sprite = api.spawnTextInGroup(
        group,
        n,
        ((n - 1) % 10) * 58,
        Math.floor((n - 1) / 10) * 36,
      )
      api.setSpriteData(sprite, 'valor', n)
      api.setTextStyle(sprite, 20, '#ffffff')
      sprite.vy = 2
    }
    api.updateGroup(group)
    api.drawGroup(ctx, group)
    const first = group.items[0],
      last = group.items[99]
    if (!first || !last) throw new Error('Números ausentes')
    const width = first.w
    api.setSpriteText(first, '100 pontos')
    const player = api.createSprite({ x: first.x, y: first.y, w: 10, h: 10 })
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    return {
      count: group.items.length,
      distinct: new Set(group.items).size,
      first: api.spriteText(first),
      last: api.spriteText(last),
      value: api.spriteData(first, 'valor', -1),
      lastValue: api.spriteData(last, 'valor', -1),
      y: first.y,
      vy: first.vy,
      resized: first.w > width,
      collision: api.isColliding(player, first),
      whitePixels: pixels.filter((v, i) => i % 4 === 0 && v > 200).length,
    }
  })
  expect(result).toMatchObject({
    count: 100,
    distinct: 100,
    first: '100 pontos',
    last: '100',
    value: 1,
    lastValue: 100,
    y: 2,
    vy: 2,
    resized: true,
    collision: true,
  })
  expect(result.whitePixels).toBeGreaterThan(1000)
})

test('frases quebram em linhas e dados preservam zero, falso, Unicode e nomes especiais', async ({
  page,
}) => {
  await prepare(page)
  const result = await page.evaluate(() => {
    const api = (window as unknown as RuntimeWindow).SZGame2D
    const sprite = api.createTextSprite(
      'Qual é a resposta correta?\nAção, coração e números.',
      50,
      50,
    )
    api.setTextStyle(sprite, 24, '#ffffff')
    api.setTextBox(sprite, 180, 'center', 12, '#14532d')
    const ctx = document.querySelector('canvas')?.getContext('2d')
    if (!ctx) throw new Error('Canvas ausente')
    api.drawSprite(ctx, sprite)
    api.setSpriteData(sprite, 'zero', 0)
    api.setSpriteData(sprite, 'correta', false)
    api.setSpriteData(sprite, '__proto__', 42)
    const height = sprite.h
    api.setSpriteText(sprite, -3.5)
    return {
      width: sprite.w,
      height,
      shrank: sprite.h < height,
      text: api.spriteText(sprite),
      zero: api.spriteData(sprite, 'zero', 9),
      correct: api.spriteData(sprite, 'correta', true),
      special: api.spriteData(sprite, '__proto__', null),
      missing: api.spriteData(sprite, 'ausente', 'sem dado'),
      x: sprite.x,
      y: sprite.y,
      pixel: Array.from(
        ctx.getImageData(
          (52 * ctx.canvas.width) / api.stageWidth(),
          (52 * ctx.canvas.height) / api.stageHeight(),
          1,
          1,
        ).data,
      ),
    }
  })
  expect(result).toMatchObject({
    width: 180,
    shrank: true,
    text: '-3.5',
    zero: 0,
    correct: false,
    special: 42,
    missing: 'sem dado',
    x: 50,
    y: 50,
    pixel: [20, 83, 45, 255],
  })
  expect(result.height).toBeGreaterThan(100)
})

test('clique no grupo usa câmera, escala CSS e ordem de desenho; removidos deixam de responder', async ({
  page,
}) => {
  await prepare(page)
  await page.evaluate(() => {
    const api = (window as unknown as RuntimeWindow).SZGame2D
    const canvas = document.querySelector('canvas')
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) throw new Error('Canvas ausente')
    const group = api.createGroup()
    api.onGroupClick(
      group,
      (sprite) => {
        document.body.dataset.selected = String(api.spriteData(sprite, 'valor', ''))
        document.body.dataset.count = String(Number(document.body.dataset.count || 0) + 1)
        api.removeFromGroup(group, sprite)
      },
      'respostas',
    )
    for (const value of ['atrás', 'frente']) {
      const sprite = api.spawnTextInGroup(group, value, 140, 100)
      api.setTextBox(sprite, 180, 'center', 12, '#123456')
      api.setSpriteData(sprite, 'valor', value)
    }
    api.setCamera(100, 50)
    api.drawGroup(ctx, group)
    canvas.style.width = '300px'
    canvas.style.height = '200px'
  })
  const canvas = page.locator('canvas').first()
  await canvas.click({ position: { x: 25, y: 30 } })
  await expect(page.locator('body')).toHaveAttribute('data-selected', 'frente')
  await canvas.click({ position: { x: 25, y: 30 } })
  await expect(page.locator('body')).toHaveAttribute('data-selected', 'atrás')
  await canvas.click({ position: { x: 25, y: 30 } })
  await expect(page.locator('body')).toHaveAttribute('data-count', '2')
})

test('toque individual em caixa girada é único e reiniciar descarta os eventos antigos', async ({
  browser,
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 600, height: 500 },
  })
  const page = await context.newPage()
  try {
    await prepare(page)
    await page.evaluate(() => {
      const api = (window as unknown as RuntimeWindow).SZGame2D
      api.onStart(() => {}, 'partida')
      const sprite = api.createTextSprite('12', 50, 50)
      api.setTextBox(sprite, 160, 'center', 10, '#333333')
      sprite.angle = Math.PI / 2
      const ctx = document.querySelector('canvas')?.getContext('2d')
      if (!ctx) throw new Error('Canvas ausente')
      const selected = () => {
        document.body.dataset.count = String(Number(document.body.dataset.count || 0) + 1)
      }
      api.onSpriteClick(sprite, selected, 'um')
      api.onSpriteClick(sprite, selected, 'um')
      api.drawSprite(ctx, sprite)
      document.body.dataset.center = JSON.stringify([
        sprite.x + sprite.w / 2,
        sprite.y + sprite.h / 2,
      ])
    })
    const center = await page.locator('body').getAttribute('data-center')
    const [x, y] = JSON.parse(center ?? '[]')
    const box = await page.locator('canvas').first().boundingBox()
    if (!box) throw new Error('Canvas sem posição')
    await page.touchscreen.tap(box.x + x, box.y + y)
    await expect(page.locator('body')).toHaveAttribute('data-count', '1')
    await page.evaluate(() => (window as unknown as RuntimeWindow).SZGame2D.restart())
    await page.touchscreen.tap(box.x + x, box.y + y)
    await expect(page.locator('body')).toHaveAttribute('data-count', '1')
  } finally {
    await context.close()
  }
})
