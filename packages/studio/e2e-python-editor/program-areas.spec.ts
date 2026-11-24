import type { Locator, Page } from '@playwright/test'
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
/** Espera o arquivo parar de mudar (o organizar e o commit dele terminaram). */
async function settle(read: () => Promise<string | undefined>) {
  // O organizar grava em etapas (o commit da Ponte, depois o salvamento automático): o arquivo
  // está pronto quando passa SEIS segundos sem mudar. Ler no meio da gravação pode dar conflito,
  // e isso conta como "ainda mudando".
  const deadline = Date.now() + 45_000
  let last: string | undefined
  let quietSince = Date.now()
  while (Date.now() < deadline) {
    await new Promise((done) => setTimeout(done, 500))
    let now: string | undefined
    try {
      now = await read()
    } catch {
      quietSince = Date.now()
      continue
    }
    if (now !== last) {
      last = now
      quietSince = Date.now()
    } else if (now !== undefined && Date.now() - quietSince >= 6_000) return
  }
  throw new Error('O arquivo não parou de mudar depois de organizar.')
}
const AREA_MARKERS = [
  '# 📦 Bibliotecas',
  '# 🎛️ Configurações',
  '# 🧩 Meus moldes',
  '# ⚙️ Ao iniciar',
  '# ⚡ Quando acontecer',
  '# 🔁 Enquanto estiver rodando',
]
/**
 * O programa sem os comentários de área e sem linhas em branco: o desfazer de uma exclusão recria
 * os blocos, e o Python os escreve de novo do jeito dele (linha em branco antes de cada método).
 */
const sameProgram = (text: string | undefined) =>
  text
    ?.split('\n')
    .filter((line) => line.trim() !== '' && !AREA_MARKERS.includes(line))
    .join('\n')
const START = '# ⚙️ Ao iniciar'
const MOLDS = '# 🧩 Meus moldes'
/**
 * Um clique num ponto LIVRE do espaço dos blocos (o fundo do Blockly), longe da paleta, da barra
 * de rolagem, da lixeira e dos blocos: um ponto fixo cai na paleta, que fica em coluna à esquerda.
 */
const BLOCKS_SVG = 'section[aria-label="Editor de blocos Python"] .blocklySvg'

/** Um ponto do fundo dos blocos que nada cobre (paleta, área, painel do código). */
async function freeBlocksPoint(page: Page) {
  const point = await page.evaluate((selector) => {
    const svg = document.querySelector(selector)
    if (!svg) return undefined
    const box = svg.getBoundingClientRect()
    for (let y = box.bottom - 40; y > box.top + 40; y -= 16)
      for (let x = box.right - 40; x > box.left + 40; x -= 16)
        if (document.elementFromPoint(x, y)?.classList.contains('blocklyMainBackground'))
          return { x, y }
    return undefined
  }, BLOCKS_SVG)
  if (!point) throw new Error('Não há ponto livre no espaço dos blocos.')
  return point
}

async function clickBlocks(page: Page, button: 'left' | 'right' = 'left') {
  const point = await freeBlocksPoint(page)
  await page.mouse.click(point.x, point.y, { button })
}

/**
 * O botão direito num ponto do PRÓPRIO bloco que nada cobre. Um ponto fixo do bloco (8, 12) cai
 * embaixo do "Mais blocos" da paleta quando o bloco sobe para o canto (homologação 45092707228, no
 * Chrome e no Edge do Linux: o bloco da classe em `translate(16, 48)`).
 */
async function rightClickBlock(page: Page, id: string | null) {
  if (!id) throw new Error('Sem o id do bloco.')
  const point = await page.evaluate((blockId) => {
    const block = document.querySelector(`[data-id="${blockId}"]`)
    if (!block) return undefined
    const box = block.getBoundingClientRect()
    for (let y = box.top + 6; y < Math.min(box.bottom, box.top + 40); y += 6)
      for (let x = box.left + 6; x < box.right - 4; x += 8) {
        const hit = document.elementFromPoint(x, y)
        if (hit?.closest('[data-id]')?.getAttribute('data-id') === blockId) return { x, y }
      }
    return undefined
  }, id)
  if (!point) throw new Error(`Nenhum ponto livre do bloco ${id}.`)
  await page.mouse.click(point.x, point.y, { button: 'right' })
}

/**
 * Arrasta o fundo dos blocos até o alvo caber na parte visível. No modo Ponte com o jogo à vista
 * a área dos blocos é estreita, e com a fonte do Linux o fim de um bloco largo passa da borda e
 * fica embaixo do painel do código (o clique cai no Monaco).
 */
async function showInsideBlocks(page: Page, target: Locator) {
  const area = (await page.locator(BLOCKS_SVG).boundingBox())!
  const fits = async () => {
    const box = (await target.boundingBox())!
    return box.x + box.width <= area.x + area.width - 24
  }
  if (await fits()) return
  const box = (await target.boundingBox())!
  const overflow = box.x + box.width + 48 - (area.x + area.width)
  const from = await freeBlocksPoint(page)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x - overflow, from.y, { steps: 8 })
  await page.mouse.up()
  await expect.poll(fits).toBe(true)
}

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
  // Largo, com a paleta em coluna. Mesmo assim a área dos blocos é estreita no modo Ponte: o
  // "devolver resultado ⟨73⟩" pode passar da borda (fonte do Linux), e showInsideBlocks o traz.
  await page.setViewportSize({ width: 1600, height: 1000 })
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
  await rightClickBlock(page, classId)
  await page.getByRole('menuitem', { name: 'Mover este bloco para Rascunhos', exact: true }).click()
  await expect.poll(() => page.evaluate(() => pythonBridgeProbe.state().pending)).toBe(false)
  await expect.poll(() => page.evaluate(() => pythonBridgeProbe.state().source?.trim())).toBe('')
  await goTo(page, 'Programa inteiro')
  await drafts(page, 2).click()
  await expect(jumpButton(page)).toBeVisible()
  await jumpButton(page).click()
  await page.getByRole('searchbox', { name: 'Procurar uma área, função ou classe' }).fill('passo')
  await goTo(page, 'Rascunho · Função passo')
  const literal = page.locator('.blocklyTextInputField').filter({ hasText: /^73$/ })
  await expect(literal).toBeVisible()
  await showInsideBlocks(page, literal)
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
  // O Pac-Man convertido às áreas (22/11/2026): as seis áreas e o laço no bloco "repetir a
  // cada". É o mesmo número que o `program-area-examples.ts` mede.
  expect((await state()).count).toBe(1974)
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
  // O exemplo se organiza pelas áreas no primeiro clique nos blocos (22/11/2026): a régua é o
  // arquivo depois disso (com os exemplos já convertidos, o clique não muda nada).
  await clickBlocks(page)
  await settle(source)
  const original = await source()
  const savedProgram = () => page.evaluate(() => studioFreeProbe.savedProgramArea('main.py'))
  // Opening an example alone persists the areas (22/11/2026: the six `sz_py_area_<kind>` replaced
  // Programa); no layout or source edit is needed. Only the areas with lines are roots.
  await expect
    .poll(async () => {
      const saved = await savedProgram()
      const roots = saved?.rootTypes ?? []
      return {
        pending: saved?.pending,
        areas: roots.length > 0 && roots.every((type: string) => type.startsWith('sz_py_area_')),
      }
    })
    .toEqual({ pending: false, areas: true })
  const savedLine = await page.evaluate(() => studioFreeProbe.firstAreaLineId())
  await page.getByTitle('Voltar à lista de projetos', { exact: true }).click()
  await page.getByRole('button', { name: 'Abrir projeto Pac-Man (Blocos)', exact: true }).click()
  // The same IDs prove the saved workspace was restored; a new projection would replace them.
  await expect(page.locator(`[data-id="${savedLine}"]`)).toBeVisible({ timeout: 45_000 })
  await expect.poll(async () => (await state()).mounted).toBe(overview)
  await expect.poll(source).toBe(original)
  await jumpButton(page).click()
  await page
    .getByRole('searchbox', { name: 'Procurar uma área, função ou classe' })
    .fill('atualizar')
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
  await clickBlocks(page)
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
  // Todo gesto escreve o comentário da área que tem linhas (áreas do projeto, 22/11/2026).
  await expect.poll(source).toBe(`${START}\nprint(x)\n`)
  await expect(drafts(page, 1)).toBeEnabled()
  await page.keyboard.press('Control+z')
  await expect.poll(source).toBe(`${START}\nx = 7\nprint(x)\n`)
  await page.keyboard.press('Control+Shift+z')
  await expect.poll(source).toBe(`${START}\nprint(x)\n`)
  await drafts(page, 1).click()
  await assignment.click({ button: 'right', position: { x: 8, y: 10 } })
  await page
    .getByRole('menuitem', { name: 'Inserir no final de ⚙️ Ao iniciar', exact: true })
    .click()
  await expect.poll(source).toBe(`${START}\nprint(x)\nx = 7\n`)
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
  // Programa inteiro, 🧩 Meus moldes (Classe Nave, Função mover, Função passo) e ⚙️ Ao iniciar.
  await expect(jumpList(page).getByRole('button')).toHaveCount(6)
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
  // O "Ir para" continua (ele lista as áreas); a classe sai do código.
  await expect
    .poll(() => page.evaluate(() => pythonBridgeProbe.state().source))
    .not.toContain('class Nave')
  await page.keyboard.press('Control+z')
  await expect(jumpButton(page)).toBeVisible()
  await goTo(page, 'Função passo')
  // Undo recreates blocks with the old IDs and new SVG nodes.
  await expect(literal).toBeVisible()
  // O mesmo programa; os gestos escreveram os comentários de área.
  await expect
    .poll(async () => sameProgram(await page.evaluate(() => pythonBridgeProbe.state().source)))
    .toBe(sameProgram(source))
  await page.setViewportSize({ width: 640, height: 850 })
  await page.evaluate(() => pythonBridgeProbe.layout(true))
  await page.getByRole('tab', { name: 'Blocos', exact: true }).click()
  await expect(jumpButton(page)).toBeVisible()
  const header = page.getByRole('group', { name: 'Arquivo e partes do programa' })
  expect(await header.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('nested-program-narrow.png') })
})

test('o código que veio de fora se organiza no primeiro clique nos blocos, e o desfazer volta', async ({
  page,
}) => {
  await page.goto('/')
  await page.waitForFunction(() => !!globalThis.pythonBridgeProbe)
  await page.evaluate(() => pythonBridgeProbe.create())
  const typed = 'print(1)\ndef pular():\n    pass\n'
  await page.evaluate((value) => pythonBridgeProbe.replaceSavedSource(value), typed)
  const source = () => page.evaluate(() => pythonBridgeProbe.state().source)
  await expect(page.locator('.sz_py_area_start')).toBeVisible({ timeout: 20_000 })
  // Enquanto a criança não volta para os blocos, o arquivo fica como ela escreveu.
  expect(await source()).toBe(typed)
  await clickBlocks(page)
  await expect
    .poll(source)
    .toMatch(new RegExp(`^${MOLDS}\ndef pular\\(\\):\n {4}pass\n+${START}\nprint\\(1\\)\n$`))
  await page.keyboard.press('Control+z')
  await expect.poll(source).toBe(`${START}\n${typed}`)
  // "Organizar blocos" no menu do espaço dos blocos faz o mesmo, a qualquer hora.
  await clickBlocks(page, 'right')
  await page.getByRole('menuitem', { name: 'Organizar blocos', exact: true }).click()
  await expect.poll(source).toMatch(new RegExp(`^${MOLDS}\ndef pular`))
})

test('com um campo aberto o organizar espera: ele vem no gesto seguinte, com o campo fechado', async ({
  page,
}) => {
  // Janela larga: o número cabe nos blocos sem arrastar o fundo (o arraste já seria o gesto que
  // organiza, antes do clique no campo).
  await page.setViewportSize({ width: 1800, height: 1000 })
  await page.goto('/')
  await page.waitForFunction(() => !!globalThis.pythonBridgeProbe)
  await page.evaluate(() => pythonBridgeProbe.create())
  const typed = 'print(1)\ndef pular():\n    pass\n'
  await page.evaluate((value) => pythonBridgeProbe.replaceSavedSource(value), typed)
  const source = () => page.evaluate(() => pythonBridgeProbe.state().source)
  const number = page.locator('.blocklyTextInputField').filter({ hasText: /^1$/ }).first()
  await expect(number).toBeVisible({ timeout: 20_000 })
  const area = (await page.locator(BLOCKS_SVG).boundingBox())!
  const box = (await number.boundingBox())!
  expect(box.x + box.width).toBeLessThan(area.x + area.width - 24)
  // O primeiro gesto nos blocos abre o campo do número: organizar agora fecharia o campo.
  await number.click()
  await expect(page.locator('.blocklyWidgetDiv .blocklyHtmlInput')).toBeVisible()
  await page.waitForTimeout(1_000)
  expect(await source()).toBe(typed)
  await page.keyboard.press('Escape')
  await expect(page.locator('.blocklyWidgetDiv .blocklyHtmlInput')).toBeHidden()
  await clickBlocks(page)
  await expect
    .poll(source)
    .toMatch(new RegExp(`^${MOLDS}\ndef pular\\(\\):\n {4}pass\n+${START}\nprint\\(1\\)\n$`))
})

test('a linha que não pode ir para a área dela fica no Ao iniciar, com nota e "Levar para"', async ({
  page,
}) => {
  await page.goto('/')
  await page.waitForFunction(() => !!globalThis.pythonBridgeProbe)
  await page.evaluate(() => pythonBridgeProbe.create())
  // A classe usa `largura` logo que é criada: subir para Meus moldes mudaria o programa.
  const typed = 'largura = int(input())\nclass Nave:\n    x = largura\n'
  await page.evaluate((value) => pythonBridgeProbe.replaceSavedSource(value), typed)
  const source = () => page.evaluate(() => pythonBridgeProbe.state().source)
  const klass = page.locator('.sz_py_class').first()
  await expect(klass).toBeVisible({ timeout: 20_000 })
  await clickBlocks(page)
  // A nota (aviso do Blockly) explica por quê; o arquivo não muda.
  await expect(klass.locator('.blocklyIconGroup')).toHaveCount(1)
  expect(await source()).toBe(typed)
  await klass.click({ button: 'right', position: { x: 8, y: 10 } })
  await page.getByRole('menuitem', { name: 'Levar para 🧩 Meus moldes', exact: true }).click()
  await expect.poll(source).toMatch(new RegExp(`^${MOLDS}\nclass Nave:`))
})

test('a área que cresce ao abrir uma função empurra a vizinha, sem cobrir', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto('/')
  await page.waitForFunction(() => !!globalThis.pythonBridgeProbe)
  await page.evaluate(() => pythonBridgeProbe.create())
  const typed =
    'def placar():\n    print("um texto bem comprido para a função ficar larga quando abrir")\n\nprint(1)\n'
  await page.evaluate((value) => pythonBridgeProbe.replaceSavedSource(value), typed)
  await expect(jumpButton(page)).toBeVisible({ timeout: 20_000 })
  // Arrumadas com a função FECHADA: as duas áreas ficam juntinhas na mesma fileira.
  await clickBlocks(page, 'right')
  await page.getByRole('menuitem', { name: 'Organizar blocos', exact: true }).click()
  await goTo(page, 'Função placar')
  const box = async (selector: string) => (await page.locator(selector).first().boundingBox())!
  await expect
    .poll(async () => {
      const a = await box('.sz_py_area_molds')
      const b = await box('.sz_py_area_start')
      return (
        a.x + a.width <= b.x ||
        b.x + b.width <= a.x ||
        a.y + a.height <= b.y ||
        b.y + b.height <= a.y
      )
    })
    .toBe(true)
})
