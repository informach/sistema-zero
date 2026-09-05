import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../../core/copy'
import type { MoldaAsset, MoldaModelAsset } from '../../../core/model'
import { paintSegment } from '../../../paint/stroke'
import { createMemoryPersistence } from '../../../state/memoryPersistence'
import { resetMoldaPersistenceForTests } from '../../../state/persistence'
import { installFakeViewport } from '../../../testing/fakeViewport'
import { makeModel } from '../../../testing/fixtures'
import { MoldaApp } from '../../MoldaApp'

let fake: ReturnType<typeof installFakeViewport>

beforeEach(() => {
  resetMoldaPersistenceForTests()
  fake = installFakeViewport()
})

afterEach(() => {
  fake.uninstall()
})

function lastModel(): MoldaModelAsset {
  const model = fake.instances.at(-1)?.models.at(-1)
  if (!model) throw new Error('o palco não recebeu modelo')
  return model
}

function modelOf(asset: MoldaAsset | undefined): MoldaModelAsset {
  if (asset?.kind !== 'model') throw new Error('não é modelo')
  return asset
}

async function openPaint(): Promise<ReturnType<typeof createMemoryPersistence>> {
  const persistence = createMemoryPersistence([makeModel()])
  render(<MoldaApp persistence={persistence} adapter={{ initialAssetId: 'model-1' }} />)
  await screen.findByRole('complementary', { name: COPY.editor.model.toolbox })
  await waitFor(() => expect(lastModel().parts).toHaveLength(2))
  fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.mode.paint }))
  await waitFor(() => expect(fake.instances[0]?.mode).toBe('paint'))
  return persistence
}

describe('ModelEditor (Pintar)', () => {
  test('a aba Pintar troca a caixa de ferramentas, o palco recebe modo e ajustes', async () => {
    await openPaint()
    expect(screen.getByRole('button', { name: COPY.editor.model.paint.tools.pencil })).toBeDefined()
    expect(screen.queryByRole('button', { name: `${COPY.editor.model.addGroup} caixa` })).toBeNull()
    expect(fake.instances[0]?.paint).toEqual({ tool: 'pencil', color: 1, size: 1, mirror: false })
    fireEvent.keyDown(document, { key: 'e' })
    fireEvent.keyDown(document, { key: '3' })
    fireEvent.keyDown(document, { key: 'm' })
    await waitFor(() =>
      expect(fake.instances[0]?.paint).toEqual({ tool: 'eraser', color: 1, size: 3, mirror: true }),
    )
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.paint.tools.fillFace }))
    await waitFor(() => expect(fake.instances[0]?.paint?.tool).toBe('fillFace'))
    // No Pintar as cores escolhem o LÁPIS, não a peça.
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.colorSwatch(5, '#fff609') }))
    await waitFor(() => expect(fake.instances[0]?.paint?.color).toBe(5))
    expect(lastModel().parts[0]?.color).toBe(8)
  })

  test('um gesto de pintura vira UM commit e o conta-gotas troca a cor do lápis', async () => {
    const persistence = await openPaint()
    const callbacks = fake.instances[0]?.callbacks
    if (!callbacks) throw new Error('palco')
    act(() => callbacks.onPaintStart())
    let work = lastModel()
    work = paintSegment(work, null, { partId: 'body', face: 'px', x: 0, y: 0 }, 5, 1)
    work = paintSegment(
      work,
      { partId: 'body', face: 'px', x: 0, y: 0 },
      { partId: 'body', face: 'px', x: 4, y: 0 },
      5,
      1,
    )
    act(() => callbacks.onPaintEnd(work))
    await waitFor(() => expect(lastModel().parts[0]?.faces.px?.data[2]).toBe(5))
    expect(
      (screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement).disabled,
    ).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() => expect(lastModel().parts[0]?.faces.px).toBeUndefined())
    expect(
      (screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement).disabled,
    ).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.redo }))
    await waitFor(
      () => expect(modelOf(persistence.snapshot()[0]).parts[0]?.faces.px?.data[4]).toBe(5),
      { timeout: 3000 },
    )
    act(() => callbacks.onPickColor(7))
    await waitFor(() => expect(fake.instances[0]?.paint?.color).toBe(7))
  })

  test('texels por bloco re-amostram as peles; atlas cheio avisa uma vez; status mostra o atlas', async () => {
    await openPaint()
    fireEvent.click(
      screen.getByRole('button', { name: `${COPY.editor.model.paint.texelsLabel}: 8` }),
    )
    await waitFor(() => expect(lastModel().texelsPerUnit).toBe(8))
    expect(lastModel().parts[0]?.faces.py?.width).toBe(32)
    const callbacks = fake.instances[0]?.callbacks
    if (!callbacks) throw new Error('palco')
    act(() => callbacks.onAtlas({ size: 128, full: false }))
    expect(await screen.findByText(/atlas 128×128/)).toBeDefined()
    act(() => callbacks.onAtlas({ size: 512, full: true }))
    expect(await screen.findByText(COPY.editor.model.paint.atlasFull)).toBeDefined()
  })

  test('apagar uma cor extra remapeia e a lixeira não mexe nas 16 fixas', async () => {
    await openPaint()
    const input = screen.getByLabelText(COPY.editor.model.addColor, { selector: 'input' })
    fireEvent.change(input, { target: { value: '#123456' } })
    await waitFor(() => expect(lastModel().extraColors).toEqual(['#123456']))
    expect(fake.instances[0]?.paint?.color).toBe(16)
    const trash = screen.getByRole('button', {
      name: COPY.editor.model.paint.removeColor,
    }) as HTMLButtonElement
    expect(trash.disabled).toBe(false)
    fireEvent.click(trash)
    await waitFor(() => expect(lastModel().extraColors).toBeUndefined())
    expect(fake.instances[0]?.paint?.color).toBe(1)
    expect(
      (
        screen.getByRole('button', {
          name: COPY.editor.model.paint.removeColor,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)
  })

  test('Baixar .glb prepara o arquivo e avisa (o download em si depende do navegador)', async () => {
    await openPaint()
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.download.glb }))
    // Com `URL.createObjectURL` o download dispara ("Baixei"); sem ele, a tela avisa que falhou.
    const ready = COPY.editor.model.download.ready
    const failed = COPY.editor.model.download.failed
    expect(await screen.findByText((text) => text === ready || text === failed)).toBeDefined()
  })
})
