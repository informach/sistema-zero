import type { Page } from '@playwright/test'
import type {} from './fixtures/bridge'
import { expect, test } from './fixtures/pythonLanguageSessions'

// O cabeçalho dos blocos do Python desde o redesenho de 11/2026: "Ir para" abre uma lista com a
// busca de função dentro (era um campo e um seletor), "Fechar as funções" (era "Recolher
// funções") e "Rascunhos N" com a frase na dica.
const jumpButton = (page: Page) => page.getByRole('button', { name: /^Ir para:/ })
const jumpList = (page: Page) => page.getByRole('dialog', { name: 'Ir para' })
async function goTo(page: Page, label: string) {
  if (!(await jumpList(page).isVisible())) await jumpButton(page).click()
  await jumpList(page).getByRole('button', { name: label, exact: true }).click()
}
async function entryId(page: Page, label: string) {
  await jumpButton(page).click()
  const id = await jumpList(page)
    .getByRole('button', { name: label, exact: true })
    .getAttribute('data-entry-id')
  await page.keyboard.press('Escape')
  return id
}
const drafts = (page: Page, count: number) =>
  page.getByRole('button', { name: new RegExp(`^Rascunhos ${count}\\.`) })
const closeFunctions = (page: Page) =>
  page.getByRole('button', { name: 'Fechar as funções', exact: true })

test('program scratch survives Monaco edits and source undo with its identity and fields intact', async ({
  page,
}) => {
  await page.goto('/')
  await page.waitForFunction(() => !!globalThis.pythonBridgeProbe)
  await page.evaluate(() => pythonBridgeProbe.create())
  const assignment = page.locator('.sz_py_assign').first()
  await expect(assignment).toBeVisible({ timeout: 20_000 })
  await assignment.click({ button: 'right', position: { x: 8, y: 12 } })
  await page.getByRole('menuitem', { name: 'Duplicar', exact: true }).click()
  const box = (await page.locator('section[aria-label="Editor de blocos Python"]').boundingBox())!
  await page.mouse.move(box.x + 200, box.y + box.height - 90)
  await page.mouse.click(box.x + 200, box.y + box.height - 90)
  await expect.poll(() => page.evaluate(() => pythonBridgeProbe.state().scratchIds.length)).toBe(1)
  const id = await page.evaluate(() => pythonBridgeProbe.state().scratchIds[0])
  const source = await page.evaluate(() => pythonBridgeProbe.state().source!)
  await page.evaluate(() => pythonBridgeProbe.replaceSource('# placar\nx = 4\nprint(x)\n'))
  await expect(page.locator('.blocklyTextInputField').filter({ hasText: /^4$/ })).toBeVisible()
  await expect(drafts(page, 1)).toBeEnabled()
  await expect(page.locator(`[data-id="${id}"]`)).toContainText('3')
  const point = await page.evaluate(() => pythonBridgeProbe.cursorPoint(2, 3))
  await page.mouse.click(point.x, point.y)
  await page.keyboard.press('Control+z')
  await expect.poll(() => page.evaluate(() => pythonBridgeProbe.state().source)).toBe(source)
  await expect(page.locator('.blocklyTextInputField').filter({ hasText: /^4$/ })).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => pythonBridgeProbe.state().scratchIds)).toEqual([id])
  await expect(page.locator(`[data-id="${id}"]`)).toContainText('3')
})

test('program index opens a secondary scratch class and nested functions without executing them', async ({
  page,
}) => {
  await page.goto('/')
  await page.waitForFunction(() => !!globalThis.pythonBridgeProbe)
  await page.evaluate(() => pythonBridgeProbe.create())
  await page.evaluate(() =>
    pythonBridgeProbe.replaceSavedSource(
      'x = 3\nclass Nave:\n    def mover(self):\n        def passo():\n            return 73\n        return passo()\n',
    ),
  )
  await expect(jumpButton(page)).toBeVisible({ timeout: 20_000 })
  const classId = await entryId(page, 'Classe Nave')
  await page
    .locator('.sz_py_assign')
    .first()
    .click({ button: 'right', position: { x: 8, y: 12 } })
  await page.getByRole('menuitem', { name: 'Mover este bloco para Rascunhos', exact: true }).click()
  await expect
    .poll(() => page.evaluate(() => pythonBridgeProbe.state().source))
    .not.toContain('x = 3')
  await page.locator(`[data-id="${classId}"]`).click({ button: 'right', position: { x: 8, y: 12 } })
  await page.getByRole('menuitem', { name: 'Mover este bloco para Rascunhos', exact: true }).click()
  await expect.poll(() => page.evaluate(() => pythonBridgeProbe.state().pending)).toBe(false)
  await expect.poll(() => page.evaluate(() => pythonBridgeProbe.state().source?.trim())).toBe('')
  await goTo(page, 'Programa inteiro')
  await drafts(page, 2).click()
  await expect(jumpButton(page)).toBeVisible()
  await jumpButton(page).click()
  await page.getByRole('searchbox', { name: 'Procurar uma função ou classe' }).fill('passo')
  await goTo(page, 'Rascunho · Função passo')
  const literal = page.locator('.blocklyTextInputField').filter({ hasText: /^73$/ })
  await expect(literal).toBeVisible()
  await literal.dblclick()
  await page.locator('.blocklyHtmlInput').fill('74')
  await page.locator('.blocklyHtmlInput').press('Enter')
  await goTo(page, 'Programa inteiro')
  await expect(page.locator('.blocklyTextInputField').filter({ hasText: /^74$/ })).toHaveCount(0)
  await goTo(page, 'Rascunho · Função passo')
  await expect(page.locator('.blocklyTextInputField').filter({ hasText: /^74$/ })).toBeVisible()
  await expect.poll(() => page.evaluate(() => pythonBridgeProbe.state().scratchIds.length)).toBe(2)
  expect(await page.evaluate(() => pythonBridgeProbe.state().source?.trim())).toBe('')
})

test('Pac-Man program areas reveal editable functions and persist non-executable scratch', async ({
  page,
  pythonLanguageSessions,
}, testInfo) => {
  test.setTimeout(120_000)
  pythonLanguageSessions.releaseWith(() => page.evaluate(() => studioFreeProbe.close()))
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto('/')
  await page.waitForFunction(() => !!globalThis.studioFreeProbe)
  await page.evaluate(() => studioFreeProbe.create(false, false, true))
  await page.locator('select[name="kit-language"]').selectOption('python')
  await page
    .getByRole('button')
    .filter({ has: page.getByText('Pac-Man (Blocos)', { exact: true }) })
    .click()
  await expect(jumpButton(page)).toBeVisible({ timeout: 45_000 })
  const state = () => page.evaluate(() => studioFreeProbe.workspace())
  await expect.poll(async () => (await state()).mounted).toBeLessThan(300)
  const overview = (await state()).mounted
  expect((await state()).count).toBe(2022)
  expect((await state()).opaque).toEqual([])
  const source = () =>
    page.evaluate(async () => {
      const project = await studioFreeProbe.saved()
      if (
        project?.kind !== 'classic' ||
        !('programmingLanguage' in project) ||
        project.programmingLanguage !== 'python'
      )
        throw new Error('Expected Python classic')
      return project.files['main.py']!
    })
  const original = await source()
  const savedProgram = () => page.evaluate(() => studioFreeProbe.savedProgramArea('main.py'))
  // Opening an example alone persists Programa; no layout or source edit is needed.
  await expect.poll(savedProgram).toMatchObject({
    pending: false,
    rootTypes: ['sz_py_program'],
  })
  const legacyRoot = await page.evaluate(() => studioFreeProbe.legacyWorkspaceSnapshot())
  await page.getByTitle('Voltar à lista de projetos', { exact: true }).click()
  await page.evaluate(() => studioFreeProbe.saveLegacyWorkspace())
  await page.getByRole('button', { name: 'Abrir projeto Pac-Man (Blocos)', exact: true }).click()
  // The old IDs prove restoration; a silent fallback to a new projection would replace them.
  await expect(page.locator(`[data-id="${legacyRoot}"]`)).toBeVisible({ timeout: 45_000 })
  await expect.poll(async () => (await state()).mounted).toBe(overview)
  await expect.poll(source).toBe(original)
  await jumpButton(page).click()
  await page.getByRole('searchbox', { name: 'Procurar uma função ou classe' }).fill('atualizar')
  // "Programa inteiro" fica sempre na lista; a busca deixa só a função que casa.
  await expect(jumpList(page).getByRole('button')).toHaveCount(2)
  await goTo(page, 'Função atualizar(tempo)')
  await expect.poll(async () => (await state()).mounted).toBeGreaterThan(overview)
  const target = await page.evaluate(() =>
    studioFreeProbe.focusAssignmentField('velocidade', 'NUMBER'),
  )
  await page.locator(`[data-id="${target.blockId}"] .blocklyTextInputField`).dblclick()
  await page.locator('.blocklyHtmlInput').fill('5')
  await page.locator('.blocklyHtmlInput').press('Enter')
  await expect.poll(source).toContain('velocidade = (5)')
  await closeFunctions(page).click()
  await expect.poll(async () => (await state()).mounted).toBe(overview)
  // Presentation navigation never consumes the semantic undo step.
  await page
    .locator('section[aria-label="Editor de blocos Python"] .blocklySvg')
    .click({ position: { x: 10, y: 200 } })
  await page.keyboard.press('Control+z')
  await expect
    .poll(async () => (await source()).replace('velocidade = (4)', 'velocidade = 4'))
    .toBe(original)
  const undone = await source()

  const interval = await page.evaluate(() =>
    studioFreeProbe.focusAssignmentField('INTERVALO', 'NUMBER'),
  )
  const literal = page.locator(`[data-id="${interval.blockId}"]`)
  const position = (await literal.boundingBox())!
  // Right click the assignment's left edge, not its nested numeric expression.
  const assignment = page.locator(`[data-id="${interval.assignmentId}"]`)
  const assignmentBox = (await assignment.boundingBox())!
  await page.mouse.click(assignmentBox.x + 8, position.y + 10, { button: 'right' })
  await page.getByRole('menuitem', { name: 'Duplicar', exact: true }).click()
  await page.mouse.move(position.x + 100, position.y + 70)
  await page.mouse.click(position.x + 100, position.y + 70)
  await expect(drafts(page, 1)).toBeEnabled()
  await page.getByRole('button', { name: 'Mais opções', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Salvar', exact: true }).click()
  await expect.poll(source).toBe(undone)
  const total = (await state()).count
  await page.getByTitle('Voltar à lista de projetos', { exact: true }).click()
  await page.getByRole('button', { name: 'Abrir projeto Pac-Man (Blocos)', exact: true }).click()
  await expect(drafts(page, 1)).toBeEnabled({
    timeout: 45_000,
  })
  expect((await state()).count).toBe(total)
  await expect.poll(source).toBe(undone)
  await drafts(page, 1).click()
  await expect(page.locator('.blocklySelected')).toContainText('INTERVALO')
  const scratchIds = (await savedProgram())!.scratchIds
  expect(scratchIds).toHaveLength(1)
  await page.getByRole('button', { name: 'Ponte', exact: true }).click()
  await expect(page.locator('.monaco-editor').first()).toBeVisible()
  const edited = undone.replace(/velocidade = \(?4\)?/, 'velocidade = 6')
  expect(edited).not.toBe(undone)
  await page.evaluate((source) => studioFreeProbe.source(source), edited)
  await expect
    .poll(savedProgram, { timeout: 20_000 })
    .toMatchObject({ baseSource: edited, scratchIds })
  await expect(drafts(page, 1)).toBeEnabled()
  await page.getByTitle('Voltar à lista de projetos', { exact: true }).click()
  await page.getByRole('button', { name: 'Abrir projeto Pac-Man (Blocos)', exact: true }).click()
  await expect(drafts(page, 1)).toBeEnabled({
    timeout: 45_000,
  })
  await expect.poll(source).toBe(edited)
  await expect.poll(savedProgram).toMatchObject({ baseSource: edited, scratchIds })
  expect((await state()).count).toBe(total)
  await page.screenshot({ path: testInfo.outputPath('program-and-scratch.png') })
})

test('program statements move to scratch and back with undo and redo', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => !!globalThis.pythonBridgeProbe)
  await page.evaluate(() => pythonBridgeProbe.create())
  await page.evaluate(() => pythonBridgeProbe.replaceSavedSource('x = 7\nprint(x)\n'))
  const source = () => page.evaluate(() => pythonBridgeProbe.state().source)
  const seven = page.locator('.blocklyTextInputField').filter({ hasText: /^7$/ })
  await expect(seven).toBeVisible({ timeout: 20_000 })
  const assignment = seven.locator('xpath=ancestor::*[@data-id][2]')
  await assignment.click({ button: 'right', position: { x: 8, y: 10 } })
  await page.getByRole('menuitem', { name: 'Mover este bloco para Rascunhos', exact: true }).click()
  await expect.poll(source).toBe('print(x)\n')
  await expect(drafts(page, 1)).toBeEnabled()
  await page.keyboard.press('Control+z')
  await expect.poll(source).toBe('x = 7\nprint(x)\n')
  await page.keyboard.press('Control+Shift+z')
  await expect.poll(source).toBe('print(x)\n')
  await drafts(page, 1).click()
  await assignment.click({ button: 'right', position: { x: 8, y: 10 } })
  await page
    .getByRole('menuitem', { name: 'Inserir pilha no final do Programa', exact: true })
    .click()
  await expect.poll(source).toBe('print(x)\nx = 7\n')
  await expect(drafts(page, 0)).toBeDisabled()
})

test('program navigation and Ponte reveal nested class and function bodies without changing source', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  await page.waitForFunction(() => !!globalThis.pythonBridgeProbe)
  await page.evaluate(() => pythonBridgeProbe.create())
  const source =
    'class Nave:\n    def mover(self):\n        def passo():\n            return 73\n        return passo()\n\nprint(Nave().mover())\n'
  await page.evaluate((source) => pythonBridgeProbe.replaceSavedSource(source), source)
  await expect(jumpButton(page)).toBeVisible({ timeout: 20_000 })
  await jumpButton(page).click()
  await expect(jumpList(page).getByRole('button')).toHaveCount(4)
  await page.keyboard.press('Escape')
  const literal = page.locator('.blocklyTextInputField').filter({ hasText: /^73$/ })
  await expect(literal).toHaveCount(0)
  await goTo(page, 'Função passo')
  await expect(literal).toBeVisible()
  await closeFunctions(page).click()
  await expect(literal).toHaveCount(0)
  const point = await page.evaluate(() => pythonBridgeProbe.cursorPoint(4, 20))
  await page.mouse.click(point.x, point.y)
  await expect(literal).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ir para: Função passo' })).toBeVisible()
  await expect(page.locator('.blocklyHighlighted')).toHaveCount(1)
  expect(await page.evaluate(() => pythonBridgeProbe.state().source)).toBe(source)
  await closeFunctions(page).click()
  const classId = await entryId(page, 'Classe Nave')
  await page
    .locator(`[data-id="${classId}"]`)
    .click({ button: 'right', position: { x: 16, y: 12 } })
  await page.getByRole('menuitem', { name: /^Deletar \d+ blocos$/ }).click()
  await expect(jumpButton(page)).toHaveCount(0)
  await page.keyboard.press('Control+z')
  await expect(jumpButton(page)).toBeVisible()
  await goTo(page, 'Função passo')
  // Undo recreates blocks with the old IDs and new SVG nodes.
  await expect(literal).toBeVisible()
  await expect.poll(() => page.evaluate(() => pythonBridgeProbe.state().source)).toBe(source)
  await page.setViewportSize({ width: 640, height: 850 })
  await page.evaluate(() => pythonBridgeProbe.layout(true))
  await page.getByRole('tab', { name: 'Blocos', exact: true }).click()
  await expect(jumpButton(page)).toBeVisible()
  const header = page.getByRole('group', { name: 'Arquivo e partes do programa' })
  expect(await header.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('nested-program-narrow.png') })
})
