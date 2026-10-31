import { fileURLToPath } from 'node:url'
import { expect, type Page, test } from '@playwright/test'
import { Vector3 } from 'three'
import { COPY } from '../src/core/copy'
import type { Vec3 } from '../src/core/model'
import { sceneBounds } from '../src/scene/bounds'
import { indexSceneDocument } from '../src/scene/documentIndex'
import { sceneToJson } from '../src/scene/documentJson'
import { makeCharacterFixture } from '../src/testing/characterFixture'
import { ViewportCamera } from '../src/viewport/viewportCamera'

test.use({ hasTouch: false, viewport: { width: 1440, height: 900 } })

/** Câmera de frente enquadrando o modelo inteiro: a mesma conta do palco depois de Enquadrar. */
async function front(page: Page, document: ReturnType<typeof makeCharacterFixture>['document']) {
  await page.getByRole('button', { name: 'Enquadrar', exact: true }).click()
  const box = (await page.locator('canvas').first().boundingBox())!
  const bounds = sceneBounds(indexSceneDocument(document))!
  const rig = new ViewportCamera('orthographic')
  rig.aspect = box.width / box.height
  rig.setView('front', bounds)
  rig.frame(bounds)
  return (point: Vec3) => {
    const p = new Vector3(...point).project(rig.camera)
    return { x: box.x + ((p.x + 1) * box.width) / 2, y: box.y + ((1 - p.y) * box.height) / 2 }
  }
}

test('marcar 5 pontos de frente monta o esqueleto, e os movimentos trocam na hora', async ({
  page,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const { document, marks } = makeCharacterFixture()
  await page.goto('/?nivel=god')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'boneco.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson(document))),
  })
  await page.getByRole('button', { name: 'Modelo Boneco', exact: true }).click()
  await page
    .getByRole('navigation', { name: 'Áreas da oficina' })
    .getByRole('button', { name: 'Ossos e pesos', exact: true })
    .click()
  const copy = COPY.scene.characterRig
  const section = page.getByRole('region', { name: copy.title })
  await section.getByRole('button', { name: copy.start, exact: true }).click()
  await expect(section.getByRole('status')).toHaveText(copy.marks.chin)
  const project = await front(page, document)
  for (const point of marks) {
    const { x, y } = project(point)
    await page.mouse.click(x, y)
  }
  await expect(section.getByRole('status')).toHaveText(copy.preview)
  await page.screenshot({ path: info.outputPath('esqueleto-previa.png') })
  await section.getByRole('button', { name: copy.confirm, exact: true }).click()
  await expect(section.getByText(copy.done(9), { exact: true })).toBeVisible()

  await section.getByRole('button', { name: copy.animate, exact: true }).click()
  const motions = COPY.scene.characterMotions
  // Como no Mixamo: um clique já põe o movimento no personagem, com as poses na linha do tempo.
  const presets = page.getByRole('region', { name: COPY.scene.animationPresetTitle })
  const chosen = (name: string) =>
    page.getByRole('button', { name: `Escolher movimento ${name}`, exact: true })
  await presets.getByRole('button', { name: 'Correndo', exact: true }).click()
  await expect(presets.getByText(motions.applied('Correndo'))).toBeVisible()
  await expect(chosen('Correndo')).toHaveAttribute('aria-pressed', 'true')
  await presets.getByRole('button', { name: 'Pulando', exact: true }).click()
  await expect(presets.getByText(motions.applied('Pulando'))).toBeVisible()
  await expect(chosen('Pulando')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.screenshot({ path: info.outputPath('pulando.png') })
  await presets.getByRole('button', { name: 'Andando', exact: true }).click()
  await expect(chosen('Andando')).toHaveAttribute('aria-pressed', 'true')
  await presets.getByRole('slider', { name: motions.strength }).fill('1.25')
  const pause = page.getByRole('button', { name: COPY.scene.animationPause, exact: true })
  if (await pause.isVisible()) await pause.click()
  for (const time of ['0', '0.25', '0.5']) {
    await page.getByRole('slider', { name: COPY.scene.animationTime }).fill(time)
    await page.screenshot({ path: info.outputPath(`andando-${time}.png`) })
  }
  await presets.getByRole('slider', { name: motions.speed }).fill('2')
  await expect(page.getByRole('button', { name: /^Escolher movimento/ })).toHaveCount(3)
  // Voltar para um guardado não o refaz: a velocidade ajustada continua lá.
  await presets.getByRole('button', { name: 'Correndo', exact: true }).click()
  await presets.getByRole('button', { name: 'Andando', exact: true }).click()
  await expect(presets.getByRole('slider', { name: motions.speed })).toHaveValue('2')
  expect(errors).toEqual([])
})

test('sem esqueleto, escolher um movimento põe os ossos sozinho, e dá para ajustar', async ({
  page,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const { document } = makeCharacterFixture()
  await page.goto('/?nivel=god')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'boneco.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson(document))),
  })
  await page.getByRole('button', { name: 'Modelo Boneco', exact: true }).click()
  await page.getByRole('button', { name: COPY.scene.animationMode, exact: true }).click()
  const motions = COPY.scene.characterMotions
  const presets = page.getByRole('region', { name: COPY.scene.animationPresetTitle })
  await presets.getByRole('button', { name: 'Andando', exact: true }).click()
  // Como no Mixamo: sem marcar nada, os ossos entram e o movimento já toca.
  await expect(presets.getByText(motions.applied('Andando'))).toBeVisible()
  await expect(presets.getByText(motions.autoRigged)).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.screenshot({ path: info.outputPath('auto-andando.png') })
  await presets.getByRole('button', { name: motions.adjust, exact: true }).click()
  const copy = COPY.scene.characterRig
  const steps = presets.getByRole('region', { name: copy.title })
  await expect(steps.getByRole('status')).toHaveText(copy.preview)
  await expect(steps.getByRole('button', { name: copy.cancel, exact: true })).toBeInViewport({
    ratio: 1,
  })
  await page.screenshot({ path: info.outputPath('auto-ajustar.png') })
  await steps.getByRole('button', { name: copy.confirm, exact: true }).click()
  await expect(presets.getByText(motions.applied('Andando'))).toBeVisible()
  await expect(page.getByRole('button', { name: /^Escolher movimento/ })).toHaveCount(1)
  expect(errors).toEqual([])
})

test('o aventureiro da ilha, de braços junto do corpo, também ganha ossos sozinho', async ({
  page,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/?nivel=god')
  await page
    .locator('input[name="molda-backup"]')
    .setInputFiles(
      fileURLToPath(
        new URL(
          '../../../docs/design/ilha-do-farol-molda/projetos/aventureiro.molda.json',
          import.meta.url,
        ),
      ),
    )
  await page.getByRole('button', { name: /^Modelo .*Aventureiro$/ }).click()
  await page.getByRole('button', { name: COPY.scene.animationMode, exact: true }).click()
  const motions = COPY.scene.characterMotions
  const presets = page.getByRole('region', { name: COPY.scene.animationPresetTitle })
  await presets.getByRole('button', { name: 'Correndo', exact: true }).click()
  await expect(presets.getByText(motions.applied('Correndo'))).toBeVisible()
  const pause = page.getByRole('button', { name: COPY.scene.animationPause, exact: true })
  if (await pause.isVisible()) await pause.click()
  for (const time of ['0', '0.2', '0.35']) {
    await page.getByRole('slider', { name: COPY.scene.animationTime }).fill(time)
    await page.screenshot({ path: info.outputPath(`aventureiro-${time}.png`) })
  }
  expect(errors).toEqual([])
})
