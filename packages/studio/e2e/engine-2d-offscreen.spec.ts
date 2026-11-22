import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { gameTwoDRuntime } from '../src/official-extensions/game-2d/runtime'

/**
 * Lote 4 da missão (seção 8.1, "culling de objetos fora da tela"; 21/11/2026). Medida antes de
 * mexer: o Jogo 2D desenha todos os sprites de um grupo, inclusive os fora da tela (o inventário
 * de `docs/estudio-evolucao/motores-inventario.md`). Quanto isso custa? O runtime de verdade numa
 * página em branco do Chromium, 400 sprites (o teto de um grupo; metade com imagem), com o tempo
 * do `drawGroup` por quadro medido com todos dentro do palco e com todos fora dele. Desde o lote 8
 * da conclusão (22/11/2026), com o recorte, fora custa no máximo 20% de dentro.
 */

const OUTPUT = resolve(
  process.env.STUDIO_OFFSCREEN_OUTPUT ?? '.cache/mission/engine-2d-offscreen.json',
)

test('quanto custa desenhar 400 sprites fora do palco no Jogo 2D', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Medida de bancada no Chromium.')
  test.setTimeout(120_000)
  await page.setContent('<!doctype html><html><body style="margin:0"></body></html>')
  await page.addScriptTag({ content: gameTwoDRuntime })
  const result = await page.evaluate(async () => {
    type Group = { items: Array<{ x: number; y: number }> }
    interface Api {
      setupStage(width: number, height: number, color: string): void
      createGroup(): Group
      spawn(group: Group, options: Record<string, unknown>): unknown
      drawGroup(ctx: CanvasRenderingContext2D, group: Group): void
    }
    const g = (window as unknown as { SZGame2D: Api }).SZGame2D
    g.setupStage(800, 480, '#87ceeb')
    // O `ctx` do Jogo 2D é um global preguiçoso (o mesmo que o jogo da criança usa).
    const ctx = (window as unknown as { ctx: CanvasRenderingContext2D }).ctx
    const art = document.createElement('canvas')
    art.width = 32
    art.height = 32
    const paint = art.getContext('2d') as CanvasRenderingContext2D
    paint.fillStyle = '#e63946'
    paint.fillRect(4, 4, 24, 24)
    // O runtime carrega a imagem pelo ENDEREÇO: um elemento caía no retângulo de cor (revisão do
    // lote 4). O desenho com imagem é conferido pela contagem de `drawImage` abaixo.
    const image = art.toDataURL()
    const group = g.createGroup()
    for (let index = 0; index < 400; index++)
      g.spawn(
        group,
        index % 2
          ? { x: 0, y: 0, w: 24, h: 24, color: '#2a9d8f' }
          : { x: 0, y: 0, w: 24, h: 24, image },
      )
    const place = (outside: boolean) => {
      group.items.forEach((sprite, index) => {
        sprite.x = outside ? 2000 + (index % 40) * 300 : (index % 40) * 19
        sprite.y = Math.floor(index / 40) * 46
      })
    }
    // O relógio da página sem isolamento tem resolução de ~0,1 ms: mede lotes de 100 quadros.
    const measure = (outside: boolean) => {
      place(outside)
      for (let warm = 0; warm < 60; warm++) g.drawGroup(ctx, group)
      const perFrame: number[] = []
      for (let batch = 0; batch < 9; batch++) {
        const start = performance.now()
        for (let frame = 0; frame < 100; frame++) g.drawGroup(ctx, group)
        perFrame.push((performance.now() - start) / 100)
      }
      perFrame.sort((a, b) => a - b)
      return { p50: perFrame[4] ?? 0, max: perFrame[8] ?? 0, batches: perFrame }
    }
    // Espera as imagens chegarem: dentro do palco, metade dos 400 desenha com `drawImage`.
    place(false)
    const original = ctx.drawImage.bind(ctx)
    let drawn = 0
    ctx.drawImage = ((...args: Parameters<CanvasRenderingContext2D['drawImage']>) => {
      drawn++
      return Reflect.apply(original, ctx, args)
    }) as CanvasRenderingContext2D['drawImage']
    for (let attempt = 0; attempt < 100; attempt++) {
      drawn = 0
      g.drawGroup(ctx, group)
      if (drawn >= 200) break
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    const imagesDrawnPerFrame = drawn
    ctx.drawImage = original
    const inside = measure(false)
    const outside = measure(true)
    const insideAgain = measure(false)
    return { imagesDrawnPerFrame, inside, outside, insideAgain }
  })
  const report = {
    measuredAt: new Date().toISOString(),
    browser: page.context().browser()?.version(),
    sprites: 400,
    ...result,
  }
  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report))
  // Anti-vácuo: a medida mediu alguma coisa.
  expect(result.inside.p50).toBeGreaterThan(0.01)
  // Anti-vácuo da imagem: metade dos sprites desenhou a imagem de verdade.
  expect(result.imagesDrawnPerFrame).toBeGreaterThanOrEqual(200)
  // O recorte (lote 8 da conclusão, 22/11/2026): quem está fora do palco só atualiza o estado do
  // quadro, então desenhar os 400 fora custa no máximo 20% de desenhar os 400 dentro.
  expect(result.outside.p50).toBeLessThanOrEqual(result.inside.p50 * 0.2)
})
