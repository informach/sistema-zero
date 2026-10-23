import { expect, test } from '@playwright/test'
import { Vector3 } from 'three'
import { COPY } from '../src/core/copy'
import { sceneBounds } from '../src/scene/bounds'
import { addSceneShape } from '../src/scene/commands'
import { createSceneProject } from '../src/scene/createProject'
import { indexSceneDocument } from '../src/scene/documentIndex'
import { sceneToJson } from '../src/scene/documentJson'
import { transformPoint } from '../src/scene/matrix'
import { sceneLocalBounds } from '../src/scene/pivot'
import { sceneAnimationClip } from '../src/testing/sceneAnimation'
import { ViewportCamera } from '../src/viewport/viewportCamera'
import { savedProject } from './paint-project'

test.use({ hasTouch: false, viewport: { width: 1440, height: 900 } })

for (const mode of ['Modelar', 'Animar'] as const) {
  test(`visual pivot in ${mode} picks a real point, preserves geometry and poses and undoes once`, async ({
    page,
  }, info) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const base = addSceneShape(
      createSceneProject({ kind: 'empty', name: 'Giro fácil' }),
      'box',
      'caixa',
    )
    const node = base.nodes.find((entry) => entry.kind === 'mesh')!
    const source = { ...base, animations: [sceneAnimationClip(node.id)] }
    await page.goto('/?nivel=explorer')
    await page.locator('input[name="molda-backup"]').setInputFiles({
      name: 'giro.molda.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
    })
    await page.getByRole('button', { name: 'Modelo Giro fácil', exact: true }).click()
    await page.getByRole('button', { name: 'Escolher caixa', exact: true }).click()
    if (mode === 'Animar') await page.getByRole('button', { name: mode, exact: true }).click()
    await page.getByRole('button', { name: 'Pivô', exact: true }).click()
    const panel = page.getByRole('region', { name: 'Onde a peça gira', exact: true })
    await expect(panel.getByRole('button', { name: 'No meio', exact: true })).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Na base', exact: true })).toBeVisible()
    await expect(panel.getByRole('spinbutton')).toHaveCount(0)
    await expect(panel.locator('details')).not.toHaveAttribute('open')
    await expect(page.getByText('Mais posições do pivô', { exact: true })).toHaveCount(0)

    await page.getByRole('button', { name: 'Enquadrar', exact: true }).click()
    const pick = panel.getByRole('button', { name: 'Escolher na peça', exact: true })
    await pick.focus()
    await page.keyboard.press('Space')
    await expect(pick).toHaveAttribute('aria-pressed', 'true')
    await expect(
      page.getByRole('button', { name: 'Pivô no eixo X', exact: true }),
    ).not.toBeVisible()
    await page.keyboard.press('Escape')
    await expect(pick).toHaveAttribute('aria-pressed', 'false')
    await pick.click()
    await page.screenshot({ path: info.outputPath(`pivot-${mode}-choose.png`) })

    const canvas = page.locator(`canvas[aria-label="${COPY.scene.viewport}"]`)
    const rect = (await canvas.boundingBox())!
    const index = indexSceneDocument(source)
    const rig = new ViewportCamera('orthographic')
    rig.aspect = rect.width / rect.height
    rig.frame(sceneBounds(index)!)
    const point = sceneLocalBounds(source, node.id)!.max
    const screen = new Vector3(
      ...transformPoint(index.scene.worldMatrices.get(node.id)!, point),
    ).project(rig.camera)
    await page.mouse.click(
      rect.x + ((screen.x + 1) * rect.width) / 2,
      rect.y + ((1 - screen.y) * rect.height) / 2,
    )
    await expect(pick).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByRole('button', { name: 'Pivô no eixo X', exact: true })).toBeVisible()
    const changed = await savedProject(page)
    expect(changed.nodes.find((entry) => entry.id === node.id)!.pivot).toEqual(point)
    expect(changed.nodes.map((entry) => entry.transform)).toEqual(
      source.nodes.map((entry) => entry.transform),
    )
    expect(changed.geometries).toEqual(source.geometries)
    expect(changed.animations).toEqual(source.animations)
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    expect((await savedProject(page)).nodes).toEqual(source.nodes)
    await page.getByRole('button', { name: COPY.editor.redo, exact: true }).click()
    expect((await savedProject(page)).nodes.find((entry) => entry.id === node.id)!.pivot).toEqual(
      point,
    )

    await panel.getByRole('button', { name: 'Na base', exact: true }).click()
    await expect(panel.getByRole('button', { name: 'Na base', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    const bounds = await panel.evaluate((element) => ({
      width: element.clientWidth,
      scroll: element.scrollWidth,
    }))
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.width)
    await page.screenshot({ path: info.outputPath(`pivot-${mode}-simple.png`) })
    await pick.click()
    await page.locator('summary').filter({ hasText: 'Vista: Livre' }).click()
    await page.getByRole('button', { name: 'Trás', exact: true }).click()
    await page.locator('summary').filter({ hasText: 'Vista: Trás' }).click()
    rig.setView('back', sceneBounds(index)!)
    const local = sceneLocalBounds(source, node.id)!
    const back = [local.min[0], local.max[1], local.min[2]] as const
    const projected = new Vector3(
      ...transformPoint(index.scene.worldMatrices.get(node.id)!, [...back]),
    ).project(rig.camera)
    await page.mouse.click(
      rect.x + ((projected.x + 1) * rect.width) / 2,
      rect.y + ((1 - projected.y) * rect.height) / 2,
    )
    await expect(pick).toHaveAttribute('aria-pressed', 'false')
    expect((await savedProject(page)).nodes.find((entry) => entry.id === node.id)!.pivot).toEqual([
      ...back,
    ])
    await panel.getByText('Ajuste fino', { exact: true }).click()
    await expect(panel.getByRole('spinbutton')).toHaveCount(3)
    await panel.getByRole('checkbox', { name: 'Mover para cima e para baixo' }).check()
    await expect(page.getByRole('button', { name: 'Pivô no eixo Y', exact: true })).toBeVisible()
    await page.screenshot({ path: info.outputPath(`pivot-${mode}-fine.png`) })
    expect(errors).toEqual([])
  })
}
