import { expect, type Page, test } from '@playwright/test'
import { buildWorkspaceStateFromIR } from '../src/blockly/workspaceState'
import { createCheckScope, prepareClassicCheckDocument } from '../src/check/serverCheck'
import { createEmptyProject } from '../src/core/project'
import { generateProjectFiles } from '../src/generators/project'
import { advancedRecipeExamples } from '../src/official-extensions/game-2d-advanced/examples/recipes/generated'

async function apiValue(page: Page, method: string, args: unknown[] = []): Promise<unknown> {
  return page.evaluate(
    ({ method, args }) => {
      const api: unknown = Reflect.get(globalThis, 'SZGameKit')
      if (api === null || typeof api !== 'object') throw new Error('Motor ausente')
      const fn: unknown = Reflect.get(api, method)
      if (typeof fn !== 'function') throw new Error(`Operação ausente: ${method}`)
      return Reflect.apply(fn, api, args)
    },
    { method, args },
  )
}

async function projectValue(page: Page, scope: string, name: string): Promise<unknown> {
  return page.evaluate(
    ({ scope, name }) => {
      const reader: unknown = Reflect.get(globalThis, scope)
      if (reader === null || typeof reader !== 'object') return undefined
      const get: unknown = Reflect.get(reader, 'get')
      if (typeof get !== 'function') return undefined
      const box: unknown = Reflect.apply(get, reader, [name])
      return box !== null && typeof box === 'object' ? Reflect.get(box, 'v') : undefined
    },
    { scope, name },
  )
}

async function openRecipe(page: Page, name: string) {
  const example = advancedRecipeExamples.find((entry) => entry.name === name)
  if (!example) throw new Error(`Receita ausente: ${name}`)
  const scope = createCheckScope()
  const project = {
    ...createEmptyProject('receita-e2e', example.name),
    ir: example.ir,
    assets: example.assets,
    blocksState: buildWorkspaceStateFromIR(example.ir),
    installedExtensions: [{ id: 'game-2d-advanced', version: '0.63.0', installedAt: 0 }],
    files: generateProjectFiles({ ir: example.ir, projectName: example.name }),
  }
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'warning' && message.text().startsWith('SZGameKit:')) {
      errors.push(message.text())
    }
  })
  const html = await prepareClassicCheckDocument(project, scope)
  const url = 'http://advanced-recipes.test/receita.html'
  await page.route(url, (route) => route.fulfill({ contentType: 'text/html', body: html }))
  await page.goto(url)
  await expect(page.locator('canvas')).toBeVisible()
  await page.getByRole('button', { name: /Experimentar|Correr/ }).click()
  await expect.poll(() => apiValue(page, 'state')).toBe('jogando')
  await page.locator('canvas').focus()
  return { scope, errors }
}

test('receita de campanha grava ações, reproduz e continua a fase guardada', async ({
  page,
}, info) => {
  const { scope, errors } = await openRecipe(page, 'Grave e repita a aventura')
  await expect.poll(() => apiValue(page, 'currentStage')).toBe('oficina-1')
  await page.keyboard.press('1')
  await expect.poll(() => projectValue(page, scope, 'gravacao')).toBe('Gravando')
  await page.keyboard.down('ArrowRight')
  try {
    await expect
      .poll(async () => {
        const hero = await apiValue(page, 'campaignHero')
        return hero !== null && typeof hero === 'object' ? Reflect.get(hero, 'x') : undefined
      })
      .toBeGreaterThan(200)
  } finally {
    await page.keyboard.up('ArrowRight')
  }
  await page.keyboard.press('2')
  await expect.poll(() => projectValue(page, scope, 'gravacao')).toBe('Gravação pronta')
  await page.keyboard.press('3')
  await expect.poll(() => projectValue(page, scope, 'gravacao')).toBe('Repetição iniciada')
  expect(errors).toEqual([])
  await expect.poll(() => apiValue(page, 'replayActive')).toBe(true)
  await expect.poll(() => apiValue(page, 'replayActive'), { timeout: 10_000 }).toBe(false)
  await page.keyboard.press('4')
  await expect
    .poll(() => apiValue(page, 'campaignSaveInfo', [1]))
    .toMatchObject({
      available: true,
      compatible: true,
      stageId: 'oficina-1',
    })
  await page.keyboard.down('ArrowRight')
  try {
    await expect
      .poll(async () => {
        const hero = await apiValue(page, 'campaignHero')
        return hero !== null && typeof hero === 'object' ? Reflect.get(hero, 'x') : undefined
      })
      .toBeGreaterThan(245)
  } finally {
    await page.keyboard.up('ArrowRight')
  }
  await page.keyboard.press('5')
  await expect
    .poll(async () => {
      const hero = await apiValue(page, 'campaignHero')
      return hero !== null && typeof hero === 'object' ? Reflect.get(hero, 'x') : undefined
    })
    .toBeLessThan(50)
  await page.keyboard.press('n')
  await expect.poll(() => apiValue(page, 'currentStage')).toBe('oficina-2')
  // The active slot follows stage transitions; continuing keeps that newer progress.
  await expect
    .poll(() => apiValue(page, 'campaignSaveInfo', [1]))
    .toMatchObject({
      available: true,
      stageId: 'oficina-2',
    })
  await page.keyboard.press('6')
  await expect
    .poll(() => apiValue(page, 'campaignSaveInfo', [1]))
    .toMatchObject({ available: false })
  await page.screenshot({ path: info.outputPath('receita-campanha-progresso.png') })
  expect(errors).toEqual([])
})

test('receita de pista movimenta as cópias e coleta somente o objeto encontrado', async ({
  page,
}, info) => {
  const { scope, errors } = await openRecipe(page, 'Uma pista de cópias em movimento')
  await expect.poll(() => projectValue(page, scope, 'pontos')).toBe(0)
  await page.keyboard.down('ArrowLeft')
  try {
    await expect
      .poll(() => apiValue(page, 'trackPosition', ['pista', 'lateral']), { intervals: [16] })
      .toBeLessThan(-45)
  } finally {
    await page.keyboard.up('ArrowLeft')
  }
  await expect
    .poll(() => projectValue(page, scope, 'pontos'), { timeout: 12_000 })
    .toBeGreaterThan(0)
  await expect
    .poll(() => apiValue(page, 'trackPosition', ['pista', 'distance']))
    .toBeGreaterThan(300)
  await page.screenshot({ path: info.outputPath('receita-pista-coleta.png') })
  expect(errors).toEqual([])
})
