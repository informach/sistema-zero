import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { COPY } from '../../../core/copy'
import type { MoldaAsset, MoldaTextureAsset } from '../../../core/model'
import { getPalette } from '../../../core/palette'
import { createMemoryPersistence } from '../../../state/memoryPersistence'
import { resetMoldaPersistenceForTests } from '../../../state/persistence'
import { installFakeTexturePreview } from '../../../testing/fakeTexturePreview'
import { installFakeViewport } from '../../../testing/fakeViewport'
import { makeModel, makeTexture } from '../../../testing/fixtures'
import { MoldaApp } from '../../MoldaApp'

let fake: ReturnType<typeof installFakeTexturePreview>

beforeEach(() => {
  resetMoldaPersistenceForTests()
  fake = installFakeTexturePreview()
})

afterEach(() => {
  fake.uninstall()
})

function textureOf(asset: MoldaAsset | undefined): MoldaTextureAsset {
  if (asset?.kind !== 'texture') throw new Error('não é textura')
  return asset
}

async function openTexture(
  asset: MoldaTextureAsset = makeTexture(),
): Promise<ReturnType<typeof createMemoryPersistence>> {
  const persistence = createMemoryPersistence([asset])
  render(<MoldaApp persistence={persistence} adapter={{ initialAssetId: 'texture-1' }} />)
  await screen.findByRole('img', { name: COPY.editor.texture.stage })
  return persistence
}

describe('TextureEditor', () => {
  test('uma textura com paleta personalizada pode voltar para uma paleta de fábrica', async () => {
    const persistence = await openTexture(
      makeTexture({
        paletteId: 'custom',
        customPalette: { name: 'Minha paleta', colors: [...getPalette('arcade').colors] },
      }),
    )

    fireEvent.change(screen.getByRole('combobox', { name: COPY.a11y.paletteSelect }), {
      target: { value: 'pastel' },
    })
    await waitFor(() => expect(textureOf(persistence.snapshot()[0]).paletteId).toBe('pastel'), {
      timeout: 3000,
    })
    expect(textureOf(persistence.snapshot()[0]).customPalette).toBeUndefined()
  })

  test('a prévia 3D recebe a folha; lápis pinta num gesto só; borracha apaga', async () => {
    const persistence = await openTexture()
    await waitFor(() => expect(fake.instances[0]?.textures.length).toBeGreaterThan(0))
    expect(fake.instances[0]?.textures[0]?.size).toBe(16)
    const stage = screen.getByRole('img', { name: COPY.editor.texture.stage })
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.colorSwatch(2, '#ff2121') }))
    fireEvent.pointerDown(stage, { clientX: 0, clientY: 0, button: 0, pointerId: 1 })
    fireEvent.pointerMove(stage, { clientX: 3, clientY: 0, pointerId: 1 })
    fireEvent.pointerUp(stage, { pointerId: 1 })
    await waitFor(() => expect(textureOf(persistence.snapshot()[0]).bitmap.data[3]).toBe(2), {
      timeout: 3000,
    })
    expect(textureOf(persistence.snapshot()[0]).bitmap.data[1]).toBe(2)
    const undo = screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement
    expect(undo.disabled).toBe(false)
    fireEvent.click(undo)
    await waitFor(() => expect(undo.disabled).toBe(true))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.texture.tools.eraser }))
    fireEvent.pointerDown(stage, { clientX: 1, clientY: 0, button: 0, pointerId: 2 })
    fireEvent.pointerUp(stage, { pointerId: 2 })
    await waitFor(() => expect(textureOf(persistence.snapshot()[0]).bitmap.data[1]).toBe(0), {
      timeout: 3000,
    })
  })

  test('sem emenda faz o traço atravessar a borda; balde e conta-gotas', async () => {
    const persistence = await openTexture()
    const stage = screen.getByRole('img', { name: COPY.editor.texture.stage })
    expect(
      (
        screen.getByRole('button', { name: COPY.editor.texture.seamless }) as HTMLButtonElement
      ).getAttribute('aria-pressed'),
    ).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.colorSwatch(5, '#fff609') }))
    fireEvent.pointerDown(stage, { clientX: 15, clientY: 5, button: 0, pointerId: 1 })
    fireEvent.pointerMove(stage, { clientX: 0, clientY: 5, pointerId: 1 })
    fireEvent.pointerUp(stage, { pointerId: 1 })
    await waitFor(
      () => expect(textureOf(persistence.snapshot()[0]).bitmap.data[5 * 16 + 15]).toBe(5),
      { timeout: 3000 },
    )
    const row = textureOf(persistence.snapshot()[0]).bitmap.data.slice(5 * 16, 6 * 16)
    // Só as duas pontas (vizinhas pela borda), não a linha inteira.
    expect(row.filter((v) => v === 5)).toHaveLength(2)
    fireEvent.keyDown(document, { key: 'i' })
    fireEvent.pointerDown(stage, { clientX: 15, clientY: 5, button: 0, pointerId: 3 })
    fireEvent.pointerUp(stage, { pointerId: 3 })
    expect(
      screen
        .getByRole('button', { name: COPY.a11y.colorSwatch(5, '#fff609') })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    fireEvent.keyDown(document, { key: 'g' })
    fireEvent.pointerDown(stage, { clientX: 2, clientY: 2, button: 0, pointerId: 4 })
    fireEvent.pointerUp(stage, { pointerId: 4 })
    await waitFor(
      () => expect(textureOf(persistence.snapshot()[0]).bitmap.data[2 * 16 + 2]).toBe(5),
      { timeout: 3000 },
    )
    fireEvent.keyDown(document, { key: 's' })
    await waitFor(() => expect(textureOf(persistence.snapshot()[0]).seamless).toBe(false), {
      timeout: 3000,
    })
    // Sem emenda DESLIGADO: o ponteiro fora da folha vale a borda, o traço não dá a volta.
    fireEvent.keyDown(document, { key: 'p' })
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.colorSwatch(3, '#ff93c4') }))
    const before = Array.from(
      textureOf(persistence.snapshot()[0]).bitmap.data.slice(9 * 16, 10 * 16),
    )
    fireEvent.pointerDown(stage, { clientX: 13, clientY: 9, button: 0, pointerId: 5 })
    fireEvent.pointerMove(stage, { clientX: 20, clientY: 9, pointerId: 5 })
    fireEvent.pointerUp(stage, { pointerId: 5 })
    await waitFor(
      () => expect(textureOf(persistence.snapshot()[0]).bitmap.data[9 * 16 + 15]).toBe(3),
      { timeout: 3000 },
    )
    const edge = Array.from(textureOf(persistence.snapshot()[0]).bitmap.data.slice(9 * 16, 10 * 16))
    expect(edge.slice(13)).toEqual([3, 3, 3])
    expect(edge.slice(0, 13)).toEqual(before.slice(0, 13))
  })

  test('deslocar meio muda só a vista; baixar avisa; sair descarta a prévia', async () => {
    const persistence = await openTexture()
    const before = textureOf(persistence.snapshot()[0])
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.texture.shiftHalf }))
    expect(
      screen
        .getByRole('button', { name: COPY.editor.texture.shiftHalf })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    expect(textureOf(persistence.snapshot()[0])).toEqual(before)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.texture.download.png }))
    const ready = COPY.editor.texture.download.ready
    const failed = COPY.editor.texture.download.failed
    expect(await screen.findByText((text) => text === ready || text === failed)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.backToGallery }))
    await screen.findByRole('heading', { level: 1, name: COPY.gallery.title })
    expect(fake.instances[0]?.disposed).toBe(true)
  })
})

describe('vestir a peça (editor do modelo)', () => {
  test('o diálogo lista as texturas e veste a peça selecionada num commit', async () => {
    const viewport = installFakeViewport()
    try {
      const persistence = createMemoryPersistence([makeModel(), makeTexture()])
      render(<MoldaApp persistence={persistence} adapter={{ initialAssetId: 'model-1' }} />)
      await screen.findByRole('complementary', { name: COPY.editor.model.toolbox })
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.mode.paint }))
      fireEvent.click(
        await screen.findByRole('button', { name: COPY.editor.model.paint.apply.button }),
      )
      expect(await screen.findByText(COPY.editor.model.paint.apply.selectPart)).toBeDefined()
      fireEvent.click(screen.getByRole('button', { name: 'corpo, caixa' }))
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.paint.apply.button }))
      const dialog = await screen.findByRole('dialog')
      fireEvent.click(within(dialog).getByRole('button', { name: 'grama' }))
      fireEvent.click(
        within(dialog).getByRole('button', { name: COPY.editor.model.paint.apply.modeStretch }),
      )
      fireEvent.click(
        within(dialog).getByRole('button', { name: COPY.editor.model.paint.apply.apply }),
      )
      await waitFor(
        () => {
          const model = persistence.snapshot().find((asset) => asset.kind === 'model')
          if (model?.kind !== 'model') throw new Error('model')
          expect(Object.keys(model.parts[0]?.faces ?? {})).toHaveLength(6)
        },
        { timeout: 3000 },
      )
      expect(
        (screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement).disabled,
      ).toBe(false)
    } finally {
      viewport.uninstall()
    }
  })
})
