import { expect, test } from './fixtures/pythonLanguageSessions'

test('Pac-Man layout drag, undo, redo and reopen preserve the exact Python source', async ({
  page,
  pythonLanguageSessions,
}) => {
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
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          try {
            return studioFreeProbe.workspace().count
          } catch {
            return 0
          }
        }),
      { timeout: 45_000 },
    )
    .toBeGreaterThan(1000)
  const source = () =>
    page.evaluate(async () => {
      const project = await studioFreeProbe.saved()
      if (
        project?.kind !== 'classic' ||
        !('programmingLanguage' in project) ||
        project.programmingLanguage !== 'python'
      )
        throw new Error('Expected Python Classic')
      return project.files['main.py']
    })
  // O exemplo se organiza pelas áreas no primeiro clique nos blocos (22/11/2026): a régua é o
  // arquivo depois disso (com os exemplos já convertidos, o clique não muda nada).
  // Um ponto LIVRE do espaço dos blocos (a paleta fica em coluna à esquerda).
  const free = await page.evaluate(() => {
    const svg = document.querySelector('section[aria-label="Editor de blocos Python"] .blocklySvg')
    if (!svg) return undefined
    const box = svg.getBoundingClientRect()
    for (let y = box.bottom - 40; y > box.top + 40; y -= 16)
      for (let x = box.right - 40; x > box.left + 40; x -= 16)
        if (document.elementFromPoint(x, y)?.classList.contains('blocklyMainBackground'))
          return { x, y }
    return undefined
  })
  if (!free) throw new Error('Não há ponto livre no espaço dos blocos.')
  await page.mouse.click(free.x, free.y)
  // Pronto quando passa SEIS segundos sem mudar (o commit e o salvamento automático vêm em
  // etapas); ler no meio da gravação pode dar conflito, e isso conta como "ainda mudando".
  const deadline = Date.now() + 45_000
  let last: string | undefined
  let quietSince = Date.now()
  for (;;) {
    if (Date.now() > deadline) throw new Error('O arquivo não parou de mudar depois de organizar.')
    await new Promise((done) => setTimeout(done, 500))
    let now: string | undefined
    try {
      now = await source()
    } catch {
      quietSince = Date.now()
      continue
    }
    if (now !== last) {
      last = now
      quietSince = Date.now()
    } else if (now !== undefined && Date.now() - quietSince >= 6_000) break
  }
  const original = await source()
  const id = await page.evaluate(() => studioFreeProbe.focusProgramRoot())
  const root = page.locator(`[data-id="${id}"]`)
  const before = await root.getAttribute('transform')
  const box = (await root.boundingBox())!
  await page.mouse.move(box.x + 20, box.y + 10)
  await page.mouse.down()
  await page.mouse.move(box.x + 150, box.y + 90, { steps: 15 })
  await page.mouse.up()
  await expect(root).not.toHaveAttribute('transform', before!)
  const moved = await root.getAttribute('transform')
  await page.keyboard.press('Control+z')
  await expect(root).toHaveAttribute('transform', before!)
  await page.keyboard.press('Control+Shift+z')
  await expect(root).toHaveAttribute('transform', moved!)
  await page.getByRole('button', { name: 'Mais opções', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Salvar', exact: true }).click()
  await expect.poll(source).toBe(original)
  await page.getByTitle('Voltar à lista de projetos', { exact: true }).click()
  await page.getByRole('button', { name: 'Abrir projeto Pac-Man (Blocos)', exact: true }).click()
  await expect(page.locator(`[data-id="${id}"]`)).toHaveAttribute('transform', moved!, {
    timeout: 45_000,
  })
  await expect.poll(source).toBe(original)
})
