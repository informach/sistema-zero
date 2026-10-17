import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { Vector3 } from 'three'
import { sceneBounds } from '../src/scene/bounds'
import { indexSceneDocument } from '../src/scene/documentIndex'
import { sceneToJson } from '../src/scene/documentJson'
import { transformPoint } from '../src/scene/matrix'
import { sceneLocalBounds } from '../src/scene/pivot'
import { ViewportCamera } from '../src/viewport/viewportCamera'
import { fidelityFixture } from './fidelity-fixture'

test.use({ hasTouch: false, viewport: { width: 1440, height: 900 } })

for (const theme of ['default', 'pink', 'dark'] as const) {
  test(`five reference compositions preserve real geometry and platform identity: ${theme}`, async ({
    page,
  }, info) => {
    test.setTimeout(90_000)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    const source = fidelityFixture()
    await page.goto(`/?nivel=explorer${theme === 'dark' ? '&tema=escuro' : ''}`)
    if (theme === 'pink')
      await page.evaluate(() => document.documentElement.setAttribute('data-sz-palette', 'pink'))
    await page.locator('input[name="molda-backup"]').setInputFiles({
      name: 'car2.molda.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
    })
    await page.getByRole('button', { name: 'Modelo car2', exact: true }).click()
    await page.getByRole('button', { name: 'Escolher corpo', exact: true }).click()
    await page.getByRole('button', { name: 'Mover', exact: true }).click()
    // A reproducible camera framing, retaining the real proportions of the source geometry.
    for (let i = 0; i < 3; i++)
      await page.getByRole('button', { name: 'Afastar', exact: true }).click()
    await expect(page.getByLabel('Tamanho X', { exact: true })).toHaveValue('6')
    await expect(page.getByLabel('Tamanho Y', { exact: true })).toHaveValue('2')
    await expect(page.getByLabel('Tamanho Z', { exact: true })).toHaveValue('8')
    await expect(page.getByLabel('Posição X', { exact: true })).toHaveValue('-5')
    await expect(page.getByText('Trouxe 1 criação de volta!', { exact: true })).toHaveCount(0, {
      timeout: 15000,
    })
    await page.evaluate(() => document.fonts.ready)
    const captures = path.resolve(
      '../../docs/plans/references/2026-10-15-molda-fidelidade/implemented',
      theme,
    )
    fs.mkdirSync(captures, { recursive: true })
    async function shot(name: string) {
      await expect(page.locator('.mld-save-status')).toContainText('Salvo', { timeout: 15000 })
      await page.screenshot({ path: info.outputPath(`${name}.png`), animations: 'disabled' })
      await expect(page).toHaveScreenshot([theme, `${name}.png`])
    }
    await page.mouse.move(1100, 65)
    await shot('01-modelar-mover')
    await page.getByRole('button', { name: 'Pivô', exact: true }).click()
    await page.getByRole('button', { name: 'Canto', exact: true }).click()
    await expect(page.getByText('Colocar no:', { exact: true })).toBeVisible()
    if (theme === 'dark')
      await expect(page.locator('[data-pivot-active="true"] legend')).toHaveCSS(
        'color',
        'rgb(201, 154, 247)',
      )
    await expect(page.getByRole('button', { name: 'Canto', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByLabel('Pivô · o ponto onde a peça gira X', { exact: true })).toHaveValue(
      '3',
    )
    await expect(page.getByLabel('Pivô · o ponto onde a peça gira Z', { exact: true })).toHaveValue(
      '4',
    )
    await page.mouse.move(1100, 65)
    await shot('02-modelar-pivo')
    await page.getByRole('button', { name: 'Embaixo', exact: true }).click()
    await page.locator('summary').filter({ hasText: 'Seleção e organização' }).click()
    await page.getByRole('button', { name: 'Separar peça', exact: true }).click()
    await page.getByRole('button', { name: 'Enquadrar', exact: true }).click()
    for (let i = 0; i < 3; i++)
      await page.getByRole('button', { name: 'Afastar', exact: true }).click()
    const canvas = page.locator('canvas').first(),
      box = (await canvas.boundingBox())!
    const index = indexSceneDocument(source),
      body = source.nodes.find((node) => node.name === 'corpo')!
    const bounds = sceneBounds(index, { nodeIds: new Set([body.id]) })!,
      local = sceneLocalBounds(source, body.id)!
    const rig = new ViewportCamera('orthographic')
    rig.aspect = box.width / box.height
    rig.frame(bounds)
    rig.camera.zoom = 1 / 1.2 ** 3
    rig.camera.updateProjectionMatrix()
    const project = (point: [number, number, number]) => {
      const p = new Vector3(
        ...transformPoint(index.scene.worldMatrices.get(body.id)!, point),
      ).project(rig.camera)
      return { x: box.x + ((p.x + 1) * box.width) / 2, y: box.y + ((1 - p.y) * box.height) / 2 }
    }
    const points = [
      project([local.min[0], local.max[1], local.center[2]]),
      project([local.max[0], local.max[1], local.center[2]]),
      project([local.max[0], local.min[1], local.center[2]]),
    ]
    for (const point of points.slice(0, 2)) await page.mouse.click(point.x, point.y)
    await expect(page.locator('.mld-cut-point-count')).toHaveText('2 pontos marcados')
    await expect(page.locator('.mld-cut-bar')).toHaveAttribute('data-molda-theme', 'dark')
    await expect(page.locator('.mld-cut-point-count')).toHaveCSS(
      'color',
      theme === 'dark' ? 'rgb(255, 133, 173)' : 'rgb(195, 25, 82)',
    )
    await page.mouse.move(points[2]!.x, points[2]!.y)
    await shot('03-modelar-cortar')
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Pintar', exact: true }).click()
    await page.getByLabel('Cor hexadecimal', { exact: true }).fill('#f0352b')
    await page.getByLabel('Cor hexadecimal', { exact: true }).press('Enter')
    await page.getByRole('button', { name: 'Quadradinhos', exact: true }).click()
    await page.getByRole('button', { name: 'Espelho de pintura', exact: true }).click()
    const center = project([0, local.max[1], 0])
    await page.mouse.move(center.x - 24, center.y)
    await page.mouse.down()
    await page.mouse.move(center.x + 24, center.y, { steps: 8 })
    await page.mouse.up()
    await expect(
      page.getByRole('button', { name: 'Usadas agora: #f0352b', exact: true }),
    ).toBeVisible()
    const legend = page.locator('.mld-axis-legend')
    await expect(legend).toBeVisible()
    await expect(legend.locator('.mld-axis')).toHaveText(['X', 'Y', 'Z'])
    await shot('04-pintar')
    await page.getByRole('button', { name: 'Fechar dica do palco', exact: true }).click()
    await expect(
      page.getByRole('button', { name: 'Fechar dica do palco', exact: true }),
    ).toHaveCount(0)
    await page.getByRole('button', { name: 'Animar', exact: true }).click()
    const previous = page.getByRole('checkbox', { name: 'Ver pose anterior', exact: true })
    await expect(previous).toBeChecked()
    await page.getByText('Ver pose anterior', { exact: true }).click()
    await expect(previous).not.toBeChecked()
    await previous.press('Space')
    await expect(previous).toBeChecked()
    await previous.blur()
    const resize = page.getByRole('separator', { name: 'Altura da linha do tempo' })
    await resize.hover()
    const handle = await resize.evaluate((element) => {
      const style = getComputedStyle(element, '::after')
      return { width: style.width, height: style.height, color: style.backgroundColor }
    })
    expect(handle.width).toBe('36px')
    expect(handle.height).toBe('4px')
    expect(handle.color).not.toBe('rgba(0, 0, 0, 0)')
    await page.getByRole('button', { name: 'Escolher corpo', exact: true }).click()
    await page.getByRole('button', { name: 'Mover', exact: true }).click()
    const channels = page.getByRole('button', { name: 'Canais de corpo', exact: true })
    if ((await channels.getAttribute('aria-expanded')) !== 'true') await channels.click()
    await page.getByRole('button', { name: /^Mover: 3 poses/ }).press('ArrowRight')
    await page.getByRole('button', { name: /^Mover: 3 poses/ }).blur()
    await expect(page.locator('[data-channel="translation"] .mld-key-strip')).toHaveCSS(
      'color',
      theme === 'dark' ? 'rgb(110, 155, 255)' : 'rgb(27, 92, 243)',
    )
    await expect(page.getByText('Pose em 0,5 s', { exact: true })).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Experimentar um movimento pronto', exact: true }),
    ).toBeInViewport()
    await page.mouse.move(1100, 65)
    await shot('05-animar')
    const tokens = await page
      .locator('[data-molda-theme]')
      .first()
      .evaluate((root) => {
        const style = getComputedStyle(root)
        return Object.fromEntries(
          [
            '--color-mld-bg',
            '--color-mld-surface',
            '--color-mld-accent',
            '--mld-pivot',
            '--mld-pivot-text',
            '--mld-pivot-bg',
            '--mld-cut-ink',
            '--mld-cut-text',
            '--mld-cut-bg',
            '--mld-axis-x',
            '--mld-axis-y',
            '--mld-axis-z',
            '--mld-channel-move',
            '--mld-channel-rotate',
            '--mld-channel-size',
          ].map((name) => [name, style.getPropertyValue(name).trim()]),
        )
      })
    fs.writeFileSync(path.join(captures, 'tokens.json'), `${JSON.stringify(tokens, null, 2)}\n`)
    expect(errors).toEqual([])
  })
}
