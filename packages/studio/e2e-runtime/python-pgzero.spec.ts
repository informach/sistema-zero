import { expect, type Page, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'

function stdout(page: Page) {
  return page.evaluate(() =>
    globalThis.providerProbe
      .read('game')
      .events.flatMap((event) => (event.type === 'console' ? [event.text] : []))
      .join(''),
  )
}

test('Pygame Zero: actor, rotation, text, shapes, keyboard, mouse, clock and sound', async ({
  page,
}, testInfo) => {
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  await page.evaluate(() => globalThis.providerProbe.prepare('game', 'pgzeroGame'))
  const ready = await page.evaluate(() => globalThis.providerProbe.read('game'))
  expect(ready.status, JSON.stringify(ready)).toBe('ready')
  await page.locator('iframe').evaluate((frame) => {
    frame.style.cssText = 'width:640px;height:480px;border:0'
  })
  await page.evaluate(() => globalThis.providerProbe.run('game'))
  await expect.poll(() => stdout(page), { timeout: 40_000 }).toContain('quadros-30')
  // get_at on an SVG: the browser rasterizes it at 40x40; the centre is green, the corner empty.
  await expect
    .poll(() => stdout(page))
    .toContain('estrela 40 40 Color(34, 204, 68, 255) Color(0, 0, 0, 0)')
  const frame = page.frames().find((candidate) => candidate.url().includes('/frame.html'))!
  const canvas = frame.locator('canvas')
  await expect(canvas).toHaveCount(1)
  expect(await canvas.evaluate((node: HTMLCanvasElement) => [node.width, node.height])).toEqual([
    320, 240,
  ])
  // Pixels: blue fill, yellow rect and the orange actor at the centre.
  const pixels = await canvas.evaluate((node: HTMLCanvasElement) => {
    const context = node.getContext('2d')!
    const at = (x: number, y: number) => [...context.getImageData(x, y, 1, 1).data]
    return { fill: at(300, 200), rect: at(50, 195), actor: at(160, 120), star: at(60, 120) }
  })
  await testInfo.attach('pixels', { body: JSON.stringify(pixels), contentType: 'application/json' })
  expect(pixels.fill.slice(0, 3)).toEqual([30, 60, 120])
  expect(pixels.rect.slice(0, 3)).toEqual([255, 255, 0])
  expect(pixels.actor[0]).toBeGreaterThan(200)
  // The SVG actor is drawn as a vector at the size the module read from its root element.
  expect(pixels.star.slice(0, 3)).toEqual([34, 204, 68])
  await canvas.click({ position: { x: 160, y: 120 } })
  await canvas.press('Space')
  await expect.poll(() => stdout(page)).toContain('espaco 1')
  await expect.poll(() => stdout(page)).toContain('clique')
  await expect.poll(() => stdout(page)).toContain('relogio True')
  await testInfo.attach('stdout', { body: await stdout(page), contentType: 'text/plain' })
  await testInfo.attach('screen', {
    body: await canvas.screenshot({ path: testInfo.outputPath('screen.png') }),
    contentType: 'image/png',
  })
  const state = await page.evaluate(() => globalThis.providerProbe.read('game'))
  expect(state.status, JSON.stringify(state)).toBe('running')
  await page.evaluate(() => globalThis.providerProbe.dispose('game'))
})

const EXAMPLES = [
  'ola-pgzero',
  'acerte-a-maca',
  'raposa-moedas',
  'ligue-os-pontos',
  'estrela-vermelha',
  'quiz-relampago',
  'voo-de-balao',
  'desafio-da-danca',
  'jardim-feliz',
  'dragoes-dorminhocos',
  'barris-na-rampa',
  'salto-nas-plataformas',
  'piramide-de-cubos',
  'cipo-sobre-o-poco',
  'mina-que-desmorona',
  'escudos-contra-invasores',
  'mergulho-alienigena',
  'nave-mae',
  'rastro-de-ajudantes',
  'helicoptero-bombardeiro',
  'cauda-espacial',
  'mochila-a-jato',
  'propulsor-no-espaco',
  'encanamento-apressado',
  'troca-de-joias',
  'bichinhos-em-fila',
  'cavando-por-gemas',
  'editor-de-cavernas',
  'corrida-vista-de-cima',
  'sinuca',
  'fliperama',
  'minigolfe-maluco',
  'tiro-ao-prato',
  'rali-com-minimapa',
  'pouso-lunar',
  'quebra-tijolos',
  'sapo-atravessa',
  'patrulha-em-camadas',
  'motos-de-luz',
  'arena-de-dois-comandos',
  'bombas-no-labirinto',
  'corredor-do-kung-fu',
  'bolinha-rolante',
  'bolhas-que-se-dividem',
  'masmorra-para-quatro',
  'duelo-por-turnos',
  'passarinho-saltitante',
  'placar-dos-campeoes',
  'continuar',
  'bussola-maluca',
  'cores-e-bolinha',
  'piano-maluco',
  'duelo-de-tanques',
  'memoria-contra-o-computador',
  'batalha-naval',
  'atirador-espacial',
]

for (const key of EXAMPLES)
  test(`gallery example ${key} runs, draws and takes input without errors`, async ({
    page,
  }, testInfo) => {
    await page.goto('/provider')
    await page.waitForFunction(() => !!globalThis.providerProbe)
    await page.evaluate(
      (name) => globalThis.providerProbe.prepare('game', name),
      `pgzero-example-${key}`,
    )
    const ready = await page.evaluate(() => globalThis.providerProbe.read('game'))
    expect(ready.status, JSON.stringify(ready)).toBe('ready')
    await page.locator('iframe').evaluate((frame) => {
      frame.style.cssText = 'width:900px;height:700px;border:0'
    })
    await page.evaluate(() => globalThis.providerProbe.run('game'))
    const frame = page.frames().find((candidate) => candidate.url().includes('/frame.html'))!
    const canvas = frame.locator('canvas')
    await expect(canvas).toHaveCount(1, { timeout: 30_000 })
    await page.waitForTimeout(1500)
    // Some input of each kind the games use.
    const box = await canvas.boundingBox()
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    for (const key of ['ArrowRight', 'ArrowUp', 'Space']) await canvas.press(key)
    await page.waitForTimeout(1000)
    const state = await page.evaluate(() => globalThis.providerProbe.read('game'))
    const output = state.events
      .flatMap((event) => (event.type === 'console' ? [event.text] : []))
      .join('')
    await testInfo.attach('stdout', { body: output, contentType: 'text/plain' })
    expect(state.status, `${JSON.stringify(state.events.at(-1))}\n${output}`).toBe('running')
    const colours = await canvas.evaluate((node: HTMLCanvasElement) => {
      const data = node.getContext('2d')!.getImageData(0, 0, node.width, node.height).data
      const seen = new Set<number>()
      for (let at = 0; at < data.length; at += 4 * 97)
        seen.add((data[at]! << 16) | (data[at + 1]! << 8) | data[at + 2]!)
      return seen.size
    })
    expect(colours).toBeGreaterThan(3)
    await canvas.screenshot({ path: testInfo.outputPath(`${key}.png`) })
    await page.evaluate(() => globalThis.providerProbe.dispose('game'))
  })

test('Pygame Zero: pygame.draw, get_at and tone, and the files a game saves come back next run', async ({
  page,
}) => {
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  for (const [vezes, antes] of [
    [1, '-'],
    [2, 'Ana 1'],
  ] as const) {
    await page.evaluate(() => globalThis.providerProbe.prepare('game', 'pgzeroSavesFiles'))
    const ready = await page.evaluate(() => globalThis.providerProbe.read('game'))
    expect(ready.status, JSON.stringify(ready)).toBe('ready')
    await page.evaluate(() => globalThis.providerProbe.run('game'))
    await expect
      .poll(() => stdout(page), { timeout: 40_000 })
      .toContain(`aberto ${vezes} antes ${antes}`)
    await expect
      .poll(() => stdout(page))
      .toContain('pixels [(255, 0, 0, 255), (0, 255, 0, 255), (0, 0, 0, 255)]')
    await expect
      .poll(() => page.evaluate(() => globalThis.providerProbe.savedKeys()))
      .toEqual(['py-file:contador.txt', 'py-file:dados/nome.txt'])
    const state = await page.evaluate(() => globalThis.providerProbe.read('game'))
    expect(state.status, JSON.stringify(state)).toBe('running')
    expect(await stdout(page)).not.toContain('Traceback')
    await page.evaluate(() => globalThis.providerProbe.dispose('game'))
  }
})

test('what a program saved just before an error is kept', async ({ page }) => {
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  await page.evaluate(() => globalThis.providerProbe.prepare('game', 'pgzeroSavesThenFails'))
  await page.evaluate(() => globalThis.providerProbe.run('game').catch(() => undefined))
  await expect
    .poll(() => page.evaluate(() => globalThis.providerProbe.read('game').status), {
      timeout: 40_000,
    })
    .toBe('failed')
  await expect
    .poll(() => page.evaluate(() => globalThis.providerProbe.savedKeys()))
    .toEqual(['py-file:primeiro.txt', 'py-file:segundo.txt'])
  await page.evaluate(() => globalThis.providerProbe.dispose('game'))
})
