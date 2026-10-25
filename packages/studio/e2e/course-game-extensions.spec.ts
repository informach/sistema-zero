import { createRequire } from 'node:module'
import { expect, type Page, test } from '@playwright/test'
import { FAROL_LAYOUT } from '../src/arte/farol-assets'
import { JARDIM_PARES } from '../src/arte/jardim-assets'
import { createCheckScope, prepareClassicCheckDocument } from '../src/check/serverCheck'
import type { Project } from '../src/core/project'

// The authoring sources live outside the ESM Studio package and use the root's CommonJS scope.
const require = createRequire(import.meta.url)
const {
  montarProjetoCadeTodoMundoCompleto,
}: {
  montarProjetoCadeTodoMundoCompleto(): Project
} = require('../../../docs/aulas-interativas-tecnico/qa/cade-todo-mundo-projeto')
const {
  montarProjetoFarol,
}: {
  montarProjetoFarol(stage: 'concluido'): Project
} = require('../../../docs/aulas-interativas-tecnico/qa/desafio-farol-projeto')

/** Reads the same closure reader that checks lesson execution objectives; never mutates game state. */
async function value(page: Page, scope: string, name: string, path = ''): Promise<unknown> {
  return page.evaluate(
    ({ scope, name, path }) => {
      const reader: unknown = Reflect.get(globalThis, scope)
      if (reader === null || typeof reader !== 'object') return undefined
      const get: unknown = Reflect.get(reader, 'get')
      if (typeof get !== 'function') return undefined
      const result: unknown = get.call(reader, name)
      if (result === null || typeof result !== 'object') return undefined
      let current: unknown = Reflect.get(result, 'v')
      for (const key of path ? path.split('.') : []) {
        if (current === null || typeof current !== 'object') return undefined
        current = Reflect.get(current, key)
      }
      return current
    },
    { scope, name, path },
  )
}

async function openGame(page: Page, project: Project, slug: string) {
  const scope = createCheckScope()
  const html = await prepareClassicCheckDocument(project, scope)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const url = `http://course-games.test/${slug}.html`
  await page.route(url, (route) => route.fulfill({ contentType: 'text/html', body: html }))
  await page.goto(url)
  await expect(page.locator('canvas')).toBeVisible()
  return { scope, errors }
}

async function clickGamePoint(page: Page, x: number, y: number) {
  const canvas = page.locator('canvas')
  const bounds = await canvas.boundingBox()
  if (!bounds) throw new Error('O palco do jogo não está visível')
  const size = await canvas.evaluate((element) => {
    const api: unknown = Reflect.get(globalThis, 'SZGame2D')
    if (api === null || typeof api !== 'object') throw new Error('Motor Jogo 2D ausente')
    const stageWidth: unknown = Reflect.get(api, 'stageWidth')
    const stageHeight: unknown = Reflect.get(api, 'stageHeight')
    if (typeof stageWidth !== 'function' || typeof stageHeight !== 'function')
      throw new Error('Medidas do palco ausentes')
    const width: unknown = stageWidth.call(api)
    const height: unknown = stageHeight.call(api)
    if (typeof width !== 'number' || typeof height !== 'number')
      throw new Error('Medidas do palco inválidas')
    return {
      width,
      height,
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
      left: element.clientLeft,
      top: element.clientTop,
    }
  })
  await page.mouse.click(
    bounds.x + size.left + (size.clientWidth * x) / size.width,
    bounds.y + size.top + (size.clientHeight * y) / size.height,
  )
}

async function holdUntil(
  page: Page,
  key: string,
  scope: string,
  name: string,
  path: string,
  compare: 'atLeast' | 'atMost' | 'equals',
  target: number | string | boolean,
) {
  await page.keyboard.down(key)
  try {
    await page.waitForFunction(
      ({ scope, name, path, compare, target }) => {
        const reader: unknown = Reflect.get(globalThis, scope)
        if (reader === null || typeof reader !== 'object') return false
        const get: unknown = Reflect.get(reader, 'get')
        if (typeof get !== 'function') return false
        const boxed: unknown = get.call(reader, name)
        if (boxed === null || typeof boxed !== 'object') return false
        let current: unknown = Reflect.get(boxed, 'v')
        for (const part of path ? path.split('.') : []) {
          if (current === null || typeof current !== 'object') return false
          current = Reflect.get(current, part)
        }
        if (compare === 'equals') return current === target
        return (
          typeof current === 'number' &&
          typeof target === 'number' &&
          (compare === 'atLeast' ? current >= target : current <= target)
        )
      },
      { scope, name, path, compare, target },
      { timeout: 12_000, polling: 'raf' },
    )
  } finally {
    await page.keyboard.up(key)
  }
}

async function restart(page: Page) {
  // These two course games have no restart button. Exercise the public extension operation.
  await page.evaluate(() => {
    const api: unknown = Reflect.get(globalThis, 'SZGame2D')
    if (api === null || typeof api !== 'object') throw new Error('Motor Jogo 2D ausente')
    const restart: unknown = Reflect.get(api, 'restart')
    if (typeof restart !== 'function') throw new Error('Recomeçar ausente')
    restart.call(api)
  })
}

test.describe('jogos completos dos primeiros cursos, somente com Jogo 2D', () => {
  test('Cadê Todo Mundo: três cliques revelam os personagens; recomeçar restaura os esconderijos', async ({
    page,
  }, info) => {
    const { scope, errors } = await openGame(
      page,
      montarProjetoCadeTodoMundoCompleto(),
      'cade-todo-mundo',
    )
    await expect.poll(() => value(page, scope, 'esconderijo1', '_paintOrder')).toBeGreaterThan(0)
    await expect.poll(() => value(page, scope, 'achados')).toBe(0)
    for (const [index, pair] of JARDIM_PARES.entries()) {
      await clickGamePoint(page, pair.centroX, 210)
      await expect.poll(() => value(page, scope, 'achados')).toBe(index + 1)
      expect(await value(page, scope, `esconderijo${index + 1}`, 'opacity')).toBe(0)
    }
    await expect(page.getByRole('status').filter({ hasText: 'Achados' })).toContainText('3')
    await clickGamePoint(page, JARDIM_PARES[0].centroX, 210)
    expect(await value(page, scope, 'achados')).toBe(3)
    await page.screenshot({ path: info.outputPath('cade-todo-mundo-vitoria.png') })
    await restart(page)
    await expect.poll(() => value(page, scope, 'achados')).toBe(0)
    for (const index of [1, 2, 3]) {
      expect(await value(page, scope, `esconderijo${index}`, 'opacity')).not.toBe(0)
    }
    await clickGamePoint(page, JARDIM_PARES[0].centroX, 210)
    await expect.poll(() => value(page, scope, 'achados')).toBe(1)
    expect(errors).toEqual([])
  })

  test('A Chave do Farol: porta exige chave, farol acende, barco chega e recomeço limpa a partida', async ({
    page,
  }, info) => {
    const { scope, errors } = await openGame(
      page,
      montarProjetoFarol('concluido'),
      'chave-do-farol',
    )
    await expect.poll(() => value(page, scope, 'personagem', '_paintOrder')).toBeGreaterThan(0)
    const initialImage = await value(page, scope, 'farol', 'image.url')
    expect(typeof initialImage).toBe('string')
    expect(await value(page, scope, 'temChave')).toBe(false)
    expect(await value(page, scope, 'ganhou')).toBe(false)
    expect(await value(page, scope, 'barco', 'x')).toBe(FAROL_LAYOUT.barco.x)

    await holdUntil(
      page,
      'ArrowRight',
      scope,
      'aviso',
      '',
      'equals',
      'A porta não abriu. Falta a chave.',
    )
    expect(await value(page, scope, 'ganhou')).toBe(false)
    expect(await value(page, scope, 'barco', 'x')).toBe(FAROL_LAYOUT.barco.x)
    expect((await value(page, scope, 'farol', 'image.url')) === initialImage).toBe(true)

    await holdUntil(page, 'ArrowLeft', scope, 'personagem', 'x', 'atMost', 200)
    await holdUntil(page, 'ArrowUp', scope, 'temChave', '', 'equals', true)
    expect(await value(page, scope, 'chave', 'image')).toBe(null)
    expect(await value(page, scope, 'ganhou')).toBe(false)
    await holdUntil(
      page,
      'ArrowDown',
      scope,
      'personagem',
      'y',
      'atLeast',
      FAROL_LAYOUT.personagem.y,
    )
    await holdUntil(page, 'ArrowRight', scope, 'ganhou', '', 'equals', true)
    expect((await value(page, scope, 'farol', 'image.url')) === initialImage).toBe(false)
    await expect
      .poll(() => value(page, scope, 'barco', 'x'), { timeout: 8_000 })
      .toBeLessThanOrEqual(FAROL_LAYOUT.chegadaBarcoX)
    expect(await value(page, scope, 'aviso')).toBe('Você acendeu o farol! Olhe o barco chegando.')
    await page.screenshot({ path: info.outputPath('chave-do-farol-vitoria.png') })

    await restart(page)
    await expect.poll(() => value(page, scope, 'temChave')).toBe(false)
    expect(await value(page, scope, 'ganhou')).toBe(false)
    expect(await value(page, scope, 'personagem', 'x')).toBe(FAROL_LAYOUT.personagem.x)
    expect(await value(page, scope, 'personagem', 'y')).toBe(FAROL_LAYOUT.personagem.y)
    expect(await value(page, scope, 'barco', 'x')).toBe(FAROL_LAYOUT.barco.x)
    expect((await value(page, scope, 'farol', 'image.url')) === initialImage).toBe(true)
    expect(await value(page, scope, 'chave', 'image.loaded')).toBe(true)
    expect(errors).toEqual([])
  })
})
