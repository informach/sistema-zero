import { expect, test } from '@playwright/test'
import { COPY } from '../src/core/copy'
import { addScenePrimitive } from '../src/scene/commands'
import { createSceneProject } from '../src/scene/createProject'
import { sceneToJson } from '../src/scene/documentJson'

test('paleta usa uma borda e mostra o nome da peça acima das ações', async ({ page }) => {
  const source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'paleta-layout' }),
    'cylinder',
    'Cilindro',
  )
  await page.goto('/?nivel=god')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'paleta-layout.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
  })
  await page.getByRole('button', { name: 'Modelo paleta-layout', exact: true }).click()
  await page.getByRole('button', { name: COPY.scene.select('Cilindro'), exact: true }).click()
  const panel = page.getByRole('region', { name: 'Ajustes do contexto' })
  await panel.getByText('Paletas: Arcade', { exact: true }).click()
  const layout = await panel.evaluate((element) => {
    const palette = element.querySelector<HTMLElement>('details.mld-disclosure')!
    const title = element.querySelector<HTMLElement>('.mld-piece-heading .mld-display')!
    const actions = element.querySelector<HTMLElement>('.mld-piece-heading .mld-chip-btn')!
    return {
      paletteTop: getComputedStyle(palette).borderTopWidth,
      paletteBottom: getComputedStyle(palette).borderBottomWidth,
      pieceTop: getComputedStyle(title.closest('.mld-piece-heading')!.parentElement!)
        .borderTopWidth,
      titleFits: title.scrollWidth <= title.clientWidth + 1,
      actionsBelowTitle:
        actions.getBoundingClientRect().top >= title.getBoundingClientRect().bottom,
    }
  })
  expect(layout).toEqual({
    paletteTop: '0px',
    paletteBottom: '0px',
    pieceTop: '0px',
    titleFits: true,
    actionsBelowTitle: true,
  })
  await page.screenshot({ path: '.cache/palette-panel-layout.png' })
})
