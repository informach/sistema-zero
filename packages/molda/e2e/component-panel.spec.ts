import { expect, test } from '@playwright/test'
import { COPY } from '../src/core/copy'
import { addScenePrimitive, convertSceneNodesToMesh } from '../src/scene/commands'
import { createSceneProject } from '../src/scene/createProject'
import { sceneToJson } from '../src/scene/documentJson'

test.use({ hasTouch: false, viewport: { width: 1440, height: 900 } })

for (const theme of ['light', 'dark'] as const) {
  test(`compact component panel preserves platform tokens, previews and navigation: ${theme}`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    let source = addScenePrimitive(
      createSceneProject({ kind: 'empty', name: 'faces-interface' }),
      'box',
      'corpo',
    )
    source = convertSceneNodesToMesh(source, [source.nodes[0]!.id])
    await page.goto(`/?nivel=god${theme === 'dark' ? '&tema=escuro' : ''}`)
    await page.locator('input[name="molda-backup"]').setInputFiles({
      name: 'faces-interface.molda.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
    })
    await page.getByRole('button', { name: 'Modelo faces-interface', exact: true }).click()
    await page.getByRole('button', { name: COPY.scene.select('corpo'), exact: true }).click()
    await page.getByRole('button', { name: COPY.scene.editFaces, exact: true }).click()
    const panel = page.locator('.mld-component-root')
    await expect(panel.getByRole('heading', { name: 'Editar peça' })).toBeVisible()
    await expect(panel.getByText('Nenhuma face escolhida', { exact: true })).toBeVisible()
    await panel.getByRole('button', { name: COPY.scene.faceAll, exact: true }).click()
    await expect(panel.getByText('6 faces escolhidas', { exact: true })).toBeVisible()
    const geometry = await panel.evaluate((element) => {
      const inspector = element.closest('aside')!
      const button = element.querySelector('button')!
      const style = getComputedStyle(button)
      return {
        width: inspector.getBoundingClientRect().width,
        fits: element.scrollHeight <= element.clientHeight + 1,
        overflow: element.scrollWidth > element.clientWidth,
        font: style.fontFamily,
        accent: getComputedStyle(element).getPropertyValue('--color-mld-accent').trim(),
      }
    })
    expect(geometry.width).toBe(320)
    expect(geometry.fits).toBe(true)
    expect(geometry.overflow).toBe(false)
    expect(geometry.font).toContain('Nunito')
    expect(geometry.accent).not.toBe('')
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: `.cache/component-panel-${theme}.png` })

    await panel.getByRole('button', { name: COPY.scene.facePreview.inset, exact: true }).click()
    await expect(panel.getByRole('heading', { name: 'Criar borda', exact: true })).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Mais ferramentas', exact: true })).toHaveCount(
      0,
    )
    await panel.getByRole('spinbutton', { name: COPY.scene.insetAmount }).fill('20')
    await expect(panel.getByRole('button', { name: COPY.scene.previewConfirm })).toBeEnabled()
    await panel.getByRole('button', { name: COPY.scene.previewCancel }).click()
    await expect(panel.getByRole('button', { name: COPY.scene.facePreview.inset })).toBeFocused()
    await expect(panel.getByText('6 faces escolhidas', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: COPY.editor.undo, exact: true })).toBeDisabled()

    await panel.getByRole('button', { name: 'Mais ferramentas', exact: true }).click()
    await expect(
      panel.getByRole('button', { name: COPY.scene.faceActions.triangulate }),
    ).toBeVisible()
    await page.screenshot({ path: `.cache/component-panel-more-${theme}.png` })
    await panel.getByRole('button', { name: 'Faces', exact: true }).click()
    await panel.getByRole('button', { name: 'Espelhar', exact: true }).click()
    await expect(panel.getByRole('button', { name: 'Aplicar', exact: true })).toBeDisabled()
    await page.screenshot({ path: `.cache/component-panel-mirror-${theme}.png` })
    await panel.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await panel.getByRole('button', { name: 'Cortar', exact: true }).click()
    await panel.getByRole('button', { name: 'Em volta', exact: true }).click()
    await expect(panel.getByRole('button', { name: 'Em volta', exact: true })).toHaveCSS(
      'background-color',
      await page
        .getByRole('button', { name: 'Modelar', exact: true })
        .evaluate((element) => getComputedStyle(element).backgroundColor),
    )
    await expect(panel.getByRole('button', { name: 'Aplicar corte', exact: true })).toBeDisabled()
    await page.screenshot({ path: `.cache/component-panel-cut-${theme}.png` })
    await panel.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await expect(panel.getByText('6 faces escolhidas', { exact: true })).toBeVisible()

    await panel.getByRole('button', { name: 'Mais ferramentas', exact: true }).click()
    await panel.getByRole('button', { name: 'Faces', exact: true }).press('Escape')
    await expect(panel.getByRole('heading', { name: 'Editar peça' })).toBeVisible()

    await panel.getByRole('button', { name: 'Pontos', exact: true }).click()
    await expect(panel.getByText('Nenhum ponto escolhido', { exact: true })).toBeVisible()
    await expect(panel.getByRole('button', { name: COPY.scene.facePreview.extrude })).toHaveCount(0)
    await panel.getByRole('button', { name: 'Linhas', exact: true }).click()
    await expect(panel.getByText('Nenhuma linha escolhida', { exact: true })).toBeVisible()
    await page.setViewportSize({ width: 1024, height: 600 })
    await expect(panel.getByRole('button', { name: 'Concluir edição', exact: true })).toBeVisible()
    await page.setViewportSize({ width: 390, height: 844 })
    await panel
      .getByRole('button', { name: 'Concluir edição', exact: true })
      .scrollIntoViewIfNeeded()
    await expect(panel.getByRole('button', { name: 'Concluir edição', exact: true })).toBeVisible()
    await expect
      .poll(() => panel.evaluate((element) => element.scrollWidth <= element.clientWidth))
      .toBe(true)
    await page.setViewportSize({ width: 1024, height: 600 })
    await panel.getByRole('button', { name: 'Concluir edição', exact: true }).click()
    await expect(panel).toHaveCount(0)
    await page.getByRole('tab', { name: 'Peças', exact: true }).click()
    await expect(
      page.getByRole('button', { name: COPY.scene.select('corpo'), exact: true }),
    ).toBeVisible()
    expect(errors).toEqual([])
  })
}
