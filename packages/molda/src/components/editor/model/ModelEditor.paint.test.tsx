import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
  test('Escape cancels the close-up stroke first; a second Escape closes the dialog', async () => {
    await openPaint()
    const before = lastModel()
    act(() => fake.instances[0]?.callbacks.onOpenFace({ partId: 'body', face: 'px', flipX: false }))
    const dialog = await screen.findByRole('dialog', {
      name: COPY.editor.model.paint.faceEditor.title,
    })
    const stage = within(dialog).getByRole('img', {
      name: COPY.editor.model.paint.faceEditor.stage,
    })
    fireEvent.pointerDown(stage, { clientX: 1, clientY: 1, button: 0, pointerId: 20 })
    expect(lastModel().parts[0]?.faces.px).toBeDefined()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBe(dialog)
    expect(lastModel().parts).toEqual(before.parts)
    fireEvent.pointerUp(stage, { pointerId: 20 })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(
      (screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })

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
    // "Girar a pele" é a 6ª ferramenta (R), um toque por face.
    fireEvent.keyDown(document, { key: 'r' })
    await waitFor(() => expect(fake.instances[0]?.paint?.tool).toBe('rotateSkin'))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.paint.tools.rotateSkin }))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.paint.tools.pencil }))
    await waitFor(() => expect(fake.instances[0]?.paint?.tool).toBe('pencil'))
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

  test('Pintar de perto abre a face, respeita atalhos do modal e fecha o traço em um desfazer', async () => {
    await openPaint()
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.paint.tools.faceEditor }))
    await waitFor(() => expect(fake.instances[0]?.paint?.tool).toBe('faceEditor'))
    act(() => fake.instances[0]?.callbacks.onOpenFace({ partId: 'body', face: 'px', flipX: false }))

    const dialog = await screen.findByRole('dialog', {
      name: COPY.editor.model.paint.faceEditor.title,
    })
    fireEvent.keyDown(document, { key: 'e' })
    expect(
      within(dialog)
        .getByRole('button', { name: COPY.editor.model.paint.tools.eraser })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    // O atalho é do diálogo: a ferramenta do palco continua sendo "Pintar de perto".
    expect(fake.instances[0]?.paint?.tool).toBe('faceEditor')
    fireEvent.keyDown(document, { key: 'p' })
    fireEvent.click(
      within(dialog).getByRole('button', { name: COPY.a11y.colorSwatch(5, '#fff609') }),
    )
    const stage = within(dialog).getByRole('img', {
      name: COPY.editor.model.paint.faceEditor.stage,
    })
    fireEvent.pointerDown(stage, { clientX: 1, clientY: 1, button: 0, pointerId: 20 })
    fireEvent.pointerMove(stage, { clientX: 3, clientY: 1, pointerId: 20 })
    fireEvent.pointerUp(stage, { pointerId: 20 })
    await waitFor(() => expect(lastModel().parts[0]?.faces.px?.data[27]).toBe(5))

    fireEvent.click(
      within(dialog).getByRole('button', { name: COPY.editor.model.paint.faceEditor.done }),
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() => expect(lastModel().parts[0]?.faces.px).toBeUndefined())
  })

  test('Pintar de perto fecha com aviso quando o alvo já não existe', async () => {
    await openPaint()
    act(() =>
      fake.instances[0]?.callbacks.onOpenFace({ partId: 'apagada', face: 'px', flipX: false }),
    )
    expect(await screen.findByText(COPY.editor.model.paint.faceEditor.stale)).toBeDefined()
    expect(screen.queryByRole('dialog')).toBeNull()
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
    const input = document.querySelector('input[type="color"]') as HTMLInputElement
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
