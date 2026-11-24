import { readdirSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { expect, type Page, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'
import { RAYLIB_GAMES } from '../src/examples/python/raylibGames.manifest'

const scenes = new URL('../scripts/raylib/scenes/', import.meta.url)
/** The same list the probe fixtures build (experiments/studio-python-runtime/raylibFixtures.ts). */
const RAYLIB_SCENES = readdirSync(scenes)
  .filter((file) => file.endsWith('.py') && file !== 'make_references.py')
  .map((file) => file.slice(0, -3))
  .sort()

function stdout(page: Page) {
  return page.evaluate(() =>
    globalThis.providerProbe
      .read('game')
      .events.flatMap((event) => (event.type === 'console' ? [event.text] : []))
      .join(''),
  )
}

test('Raylib 2D: own loop, shapes, textures, text, camera, keyboard, mouse and sound', async ({
  page,
}, testInfo) => {
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  await page.evaluate(() => globalThis.providerProbe.prepare('game', 'raylibGame'))
  const ready = await page.evaluate(() => globalThis.providerProbe.read('game'))
  expect(ready.status, JSON.stringify(ready)).toBe('ready')
  await page.locator('iframe').evaluate((frame) => {
    frame.style.cssText = 'width:640px;height:480px;border:0'
  })
  await page.evaluate(() => globalThis.providerProbe.run('game'))
  await expect.poll(() => stdout(page), { timeout: 40_000 }).toContain('quadros-30 True True')
  expect(await stdout(page)).toContain('pronto 32 32 70')
  const frame = page.frames().find((candidate) => candidate.url().includes('/frame.html'))!
  const canvas = frame.locator('canvas')
  await expect(canvas).toHaveCount(1)
  expect(await canvas.evaluate((node: HTMLCanvasElement) => [node.width, node.height])).toEqual([
    320, 240,
  ])
  const pixels = await canvas.evaluate((node: HTMLCanvasElement) => {
    const copy = document.createElement('canvas')
    copy.width = node.width
    copy.height = node.height
    const context = copy.getContext('2d')!
    context.drawImage(node, 0, 0)
    const at = (x: number, y: number) => [...context.getImageData(x, y, 1, 1).data]
    return {
      fill: at(300, 200),
      rect: at(50, 195),
      circle: at(280, 40),
      hero: at(160, 120),
      purple: at(205, 204),
    }
  })
  await testInfo.attach('pixels', { body: JSON.stringify(pixels), contentType: 'application/json' })
  expect(pixels.fill.slice(0, 3)).toEqual([30, 60, 120])
  expect(pixels.rect.slice(0, 3)).toEqual([253, 249, 0])
  expect(pixels.circle.slice(0, 3)).toEqual([255, 255, 255])
  expect(pixels.hero[0]).toBeGreaterThan(200)
  expect(pixels.purple.slice(0, 3)).toEqual([255, 0, 255])
  await canvas.click({ position: { x: 160, y: 120 } })
  await canvas.press('Space')
  await expect.poll(() => stdout(page)).toContain('espaco 1')
  await expect.poll(() => stdout(page)).toContain('clique')
  await testInfo.attach('stdout', { body: await stdout(page), contentType: 'text/plain' })
  await testInfo.attach('screen', {
    body: await canvas.screenshot({ path: testInfo.outputPath('screen.png') }),
    contentType: 'image/png',
  })
  const state = await page.evaluate(() => globalThis.providerProbe.read('game'))
  expect(state.status, JSON.stringify(state)).toBe('running')
  await page.evaluate(() => globalThis.providerProbe.dispose('game'))
})

/**
 * Cenas-gabarito: the same scene ran on the desktop raylib 6.0.1.0 (scripts/raylib/scenes/
 * make_references.py) and its screenshot lives in scenes/reference. Here it runs in the Studio
 * and the canvas is compared pixel by pixel: a pixel differs when any channel is off by more
 * than 48 (the same rule as scripts/raylib/tests/compare_images.py).
 */
for (const scene of RAYLIB_SCENES) {
  test(`Raylib: cena-gabarito ${scene}`, async ({ page }, testInfo) => {
    const fixture = `raylibScene${scene[0]!.toUpperCase()}${scene.slice(1)}`
    await page.goto('/provider')
    await page.waitForFunction(() => !!globalThis.providerProbe)
    await page.evaluate((name) => globalThis.providerProbe.prepare('game', name), fixture)
    await page.evaluate(() => globalThis.providerProbe.run('game'))
    await expect
      .poll(async () => (await page.evaluate(() => globalThis.providerProbe.read('game'))).status, {
        timeout: 40_000,
      })
      .not.toBe('running')
    const state = await page.evaluate(() => globalThis.providerProbe.read('game'))
    expect(state.status, JSON.stringify(state)).not.toBe('failed')
    const frame = page.frames().find((candidate) => candidate.url().includes('/frame.html'))!
    const ours = await frame
      .locator('canvas')
      .evaluate((node: HTMLCanvasElement) => node.toDataURL('image/png'))
    const path = testInfo.outputPath(`${scene}.png`)
    await writeFile(path, Buffer.from(ours.split(',')[1]!, 'base64'))
    await testInfo.attach(scene, { path, contentType: 'image/png' })
    const reference = `data:image/png;base64,${(
      await readFile(new URL(`reference/${scene}.png`, scenes))
    ).toString('base64')}`
    const diff = await page.evaluate(
      async ([a, b]) => {
        const pixels = async (url: string) => {
          const bitmap = await createImageBitmap(await (await fetch(url)).blob())
          const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
          const context = canvas.getContext('2d')!
          context.drawImage(bitmap, 0, 0)
          return context.getImageData(0, 0, bitmap.width, bitmap.height)
        }
        const [real, mine] = await Promise.all([pixels(a!), pixels(b!)])
        if (real.width !== mine.width || real.height !== mine.height)
          return { size: `${real.width}x${real.height} × ${mine.width}x${mine.height}`, count: -1 }
        let count = 0
        for (let index = 0; index < real.data.length; index += 4) {
          for (let channel = 0; channel < 4; channel++) {
            if (Math.abs(real.data[index + channel]! - mine.data[index + channel]!) > 48) {
              count++
              break
            }
          }
        }
        return { size: `${real.width}x${real.height}`, count }
      },
      [reference, ours],
    )
    testInfo.annotations.push({
      type: 'pixels-diferentes',
      description: `${diff.count} (${diff.size})`,
    })
    expect(diff.count, `pixels diferentes do raylib real (${diff.size})`).toBe(0)
    await page.evaluate(() => globalThis.providerProbe.dispose('game'))
  })
}

/** Every gallery game: it opens from the gallery payload, draws and takes input without errors. */
for (const { key } of RAYLIB_GAMES)
  test(`Raylib: exemplo da galeria ${key} roda, desenha e recebe teclado e mouse`, async ({
    page,
  }, testInfo) => {
    await page.goto('/provider')
    await page.waitForFunction(() => !!globalThis.providerProbe)
    await page.evaluate(
      (name) => globalThis.providerProbe.prepare('game', name),
      `raylib-example-${key}`,
    )
    const ready = await page.evaluate(() => globalThis.providerProbe.read('game'))
    expect(ready.status, JSON.stringify(ready)).toBe('ready')
    await page.evaluate(() => globalThis.providerProbe.run('game'))
    const frame = page.frames().find((candidate) => candidate.url().includes('/frame.html'))!
    const canvas = frame.locator('canvas')
    await expect(canvas).toHaveCount(1, { timeout: 30_000 })
    await page.waitForTimeout(1500)
    const box = await canvas.boundingBox()
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    for (const pressed of ['ArrowRight', 'ArrowUp', 'Space']) await canvas.press(pressed)
    await page.waitForTimeout(1000)
    const state = await page.evaluate(() => globalThis.providerProbe.read('game'))
    const output = state.events
      .flatMap((event) => (event.type === 'console' ? [event.text] : []))
      .join('')
    await testInfo.attach('stdout', { body: output, contentType: 'text/plain' })
    expect(state.status, `${JSON.stringify(state.events.at(-1))}\n${output}`).toBe('running')
    const png = await canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL('image/png'))
    const path = testInfo.outputPath(`${key}.png`)
    await writeFile(path, Buffer.from(png.split(',')[1]!, 'base64'))
    await testInfo.attach(key, { path, contentType: 'image/png' })
    const colours = await page.evaluate(async (url) => {
      const bitmap = await createImageBitmap(await (await fetch(url)).blob())
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      const context = canvas.getContext('2d')!
      context.drawImage(bitmap, 0, 0)
      const data = context.getImageData(0, 0, bitmap.width, bitmap.height).data
      const seen = new Set<number>()
      for (let at = 0; at < data.length; at += 4 * 97)
        seen.add((data[at]! << 16) | (data[at + 1]! << 8) | data[at + 2]!)
      return seen.size
    }, png)
    expect(colours).toBeGreaterThan(3)
    await page.evaluate(() => globalThis.providerProbe.dispose('game'))
  })

/** Conta os objetos de GPU vivos de cada contexto WebGL2 (`window.__szGpuVivos()` no frame). */
function vigiarGpu(page: Page) {
  return page.addInitScript(() => {
    const kinds: Array<[string, string, string]> = [
      ['createBuffer', 'deleteBuffer', 'buffers'],
      ['createTexture', 'deleteTexture', 'textures'],
      ['createVertexArray', 'deleteVertexArray', 'vertexArrays'],
    ]
    const live = new Map<object, Record<string, Set<unknown>>>()
    const prototype = (window as unknown as { WebGL2RenderingContext?: { prototype: object } })
      .WebGL2RenderingContext?.prototype as Record<string, unknown> | undefined
    if (!prototype) return
    for (const [create, remove, name] of kinds) {
      const original = prototype[create] as (...args: unknown[]) => unknown
      const originalRemove = prototype[remove] as (item: unknown) => unknown
      prototype[create] = function (this: object, ...args: unknown[]) {
        const made = original.apply(this, args)
        let own = live.get(this)
        if (!own) {
          own = { buffers: new Set(), textures: new Set(), vertexArrays: new Set() }
          live.set(this, own)
        }
        if (made) own[name]?.add(made)
        return made
      }
      prototype[remove] = function (this: object, item: unknown) {
        live.get(this)?.[name]?.delete(item)
        return originalRemove.call(this, item)
      }
    }
    Object.defineProperty(window, '__szGpuVivos', {
      value: () => {
        const total: Record<string, number> = {}
        for (const own of live.values())
          for (const [name, items] of Object.entries(own))
            total[name] = (total[name] ?? 0) + items.size
        return total
      },
    })
  })
}

/**
 * Regiões no Raylib 3D (lote 7b da conclusão, 22/11/2026): o cenário de três regiões em fila
 * (`experiments/studio-python-runtime/raylibRegionFixtures.ts`), a rota Vila → Floresta →
 * Caverna → Floresta → Vila dez vezes. Na Caverna e no fim de cada volta o programa escreve o que
 * contou e espera o N; a prova lê ali os objetos de GPU vivos do quadro. Reprova se uma entrada não
 * contar exatamente uma vez, se alguma região falhar, se uma parada não tiver exatamente os dois
 * modelos e as duas texturas da janela (a liberação de verdade), se os objetos de GPU não forem
 * medidos ou se mudarem nas paradas das últimas quatro voltas.
 */
test('Raylib 3D: o cenário com regiões carrega e solta pela rota, dez voltas', async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000)
  await vigiarGpu(page)
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  await page.evaluate(() => globalThis.providerProbe.prepare('game', 'raylib-regioes-3d'))
  const ready = await page.evaluate(() => globalThis.providerProbe.read('game'))
  expect(ready.status, JSON.stringify(ready)).toBe('ready')
  await page.evaluate(() => globalThis.providerProbe.run('game'))
  const frame = page.frames().find((candidate) => candidate.url().includes('/frame.html'))!
  const canvas = frame.locator('canvas')
  await expect(canvas).toHaveCount(1, { timeout: 30_000 })
  // Duas paradas por volta: na Caverna (a Vila, que não é vizinha, já saiu) e no fim da volta, de
  // volta à Vila (a Caverna já saiu). Em cada uma o programa espera o N desenhando o mesmo estado.
  const paradas: { marca: string; linha: string; gpu: Record<string, number> }[] = []
  for (let volta = 1; volta <= 10; volta++)
    for (const nome of ['caverna', 'volta']) {
      const marca = `${nome} ${volta} `
      await expect.poll(() => stdout(page), { timeout: 60_000 }).toContain(marca)
      const saida = await stdout(page)
      const linha = saida.slice(saida.lastIndexOf(marca)).split('fim')[0]!
      const gpu = await frame.evaluate(() =>
        (window as unknown as { __szGpuVivos(): Record<string, number> }).__szGpuVivos(),
      )
      paradas.push({ marca, linha, gpu })
      await canvas.press('n')
    }
  await testInfo.attach('paradas', {
    body: JSON.stringify(paradas, null, 2),
    contentType: 'application/json',
  })
  const state = await page.evaluate(() => globalThis.providerProbe.read('game'))
  expect(state.status, JSON.stringify(state.events.at(-1))).not.toBe('failed')
  // Cada entrada uma vez: a Vila começa dentro (1) e volta uma vez por volta; a Floresta, duas.
  expect(paradas.at(-1)!.linha).toContain('entradas 11 20 10')
  for (const { marca, linha } of paradas) {
    expect(linha, marca).toContain('falhas 0')
    // A liberação de verdade (revisão do lote 7b): em cada parada só ficam os dois modelos da
    // janela, cada um com a sua textura. Um descarte que não solta o modelo daria 3.
    expect(linha, marca).toContain('modelos 2 texturas 2')
    expect(linha, marca).toContain(
      marca.startsWith('caverna') ? 'carregadas Floresta+Caverna ' : 'carregadas Vila+Floresta ',
    )
  }
  // Os objetos de GPU: medidos de verdade (anti-vácuo) e iguais nas paradas das últimas quatro
  // voltas (nada cresce a cada ida e volta).
  const ultimas = paradas.slice(-8)
  for (const nome of ['buffers', 'textures', 'vertexArrays']) {
    for (const { marca, gpu } of paradas)
      expect(gpu[nome] ?? 0, `${nome} ${marca}`).toBeGreaterThan(0)
    expect(
      new Set(ultimas.map((v) => v.gpu[nome])).size,
      `${nome}: ${ultimas.map((v) => v.gpu[nome]).join(', ')}`,
    ).toBe(1)
  }
  await page.evaluate(() => globalThis.providerProbe.dispose('game'))
})

/**
 * O relevo de mundo grande no Raylib 3D (plano "Mundos de 2 km", lote 6, 23/11/2026): um mundo de
 * 2 km com colinas, compilado em campo e trazido pelo importador do Estúdio
 * (`experiments/studio-python-runtime/raylibRelevoFixtures.ts`), quatro voltas num quadrado de
 * 1,6 km. Reprova se o relevo não completar em volta de um canto, se o personagem ficar sem chão,
 * se os pedaços guardados passarem do teto, se os objetos de GPU não forem medidos ou se mudarem
 * entre as duas últimas voltas (o cache dos pedaços não cresce a cada volta).
 */
test('Raylib 3D: o relevo de mundo grande anda 2 km, quatro voltas', async ({ page }, testInfo) => {
  test.setTimeout(420_000)
  await vigiarGpu(page)
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  await page.evaluate(() => globalThis.providerProbe.prepare('game', 'raylib-relevo-2km'))
  const ready = await page.evaluate(() => globalThis.providerProbe.read('game'))
  expect(ready.status, JSON.stringify(ready)).toBe('ready')
  await page.evaluate(() => globalThis.providerProbe.run('game'))
  const frame = page.frames().find((candidate) => candidate.url().includes('/frame.html'))!
  const canvas = frame.locator('canvas')
  await expect(canvas).toHaveCount(1, { timeout: 60_000 })
  const paradas: { marca: string; linha: string; gpu: Record<string, number> }[] = []
  for (let volta = 1; volta <= 4; volta++)
    for (let canto = 0; canto < 4; canto++) {
      const marca = `parada ${volta} ${canto} `
      await expect.poll(() => stdout(page), { timeout: 120_000 }).toContain(marca)
      const saida = await stdout(page)
      const linha = saida.slice(saida.lastIndexOf(marca)).split('fim')[0]!
      const gpu = await frame.evaluate(() =>
        (window as unknown as { __szGpuVivos(): Record<string, number> }).__szGpuVivos(),
      )
      paradas.push({ marca, linha, gpu })
      if (volta === 1 && canto === 0)
        await testInfo.attach('relevo-no-canto.png', {
          body: await canvas.screenshot(),
          contentType: 'image/png',
        })
      await canvas.press('n')
    }
  await testInfo.attach('paradas', {
    body: JSON.stringify(paradas, null, 2),
    contentType: 'application/json',
  })
  const state = await page.evaluate(() => globalThis.providerProbe.read('game'))
  expect(state.status, JSON.stringify(state.events.at(-1))).not.toBe('failed')
  for (const { marca, linha } of paradas) {
    expect(linha, marca).toContain('faltam 0 ')
    expect(linha, marca).toContain('altura ok')
    const numero = (nome: string) => Number(new RegExp(`${nome} (\\d+)`).exec(linha)?.[1])
    expect(numero('completos'), marca).toBeGreaterThan(0)
    expect(numero('grossos'), marca).toBeGreaterThan(0)
    expect(numero('guardados'), marca).toBeLessThanOrEqual(24 + 160)
  }
  // Os objetos de GPU: medidos (anti-vácuo) e iguais, canto a canto, nas duas últimas voltas.
  for (const nome of ['buffers', 'vertexArrays']) {
    for (const { marca, gpu } of paradas)
      expect(gpu[nome] ?? 0, `${nome} ${marca}`).toBeGreaterThan(0)
    expect(
      paradas.slice(8, 12).map((p) => p.gpu[nome]),
      `${nome} nas voltas 3 e 4`,
    ).toEqual(paradas.slice(12, 16).map((p) => p.gpu[nome]))
  }
  await page.evaluate(() => globalThis.providerProbe.dispose('game'))
})
