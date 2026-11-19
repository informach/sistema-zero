import { expect, it } from 'bun:test'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { createPixelSpriteAsset, createTilemapAsset } from '../../../core/project'
import { createEditorStore } from '../../../state/editorStore'
import { addObjectLayer } from '../../../tiles/tilemapOps'
import { useLibraryPlacement } from './useLibraryPlacement'

it('uma cópia recuperada durante a prévia sobrevive à soltura e ao cancelamento tardios', async () => {
  const original = addObjectLayer(
    createTilemapAsset({ name: 'vila', tilesetId: 'tiles', cols: 8, rows: 6 }),
    'Objetos',
  )
  const recovered = { ...original, id: 'recovered', name: 'vila-recuperada' }
  const source = createPixelSpriteAsset({ name: 'arvore', frameSize: 16 })
  const editor = createEditorStore({
    asset: original,
    autosaveDelayMs: 100_000,
    persist: async () => {
      throw new Error('Conflito de revisão')
    },
    recoverPersisted: () => ({ asset: recovered, linked: [] }),
  })
  editor.getState().commit({ ...original, name: 'vila-em-edicao' })
  function Host() {
    const paperRef = useRef<HTMLDivElement>(null),
      stageRef = useRef<HTMLDivElement>(null)
    const map = editor.getState().asset
    if (map.kind !== 'tilemap') throw new Error('Mapa esperado')
    const placement = useLibraryPlacement({
      editor,
      map,
      layerId: map.layers.at(-1)!.id,
      assets: [source],
      tileSize: 16,
      cellPx: 32,
      pad: 0,
      snap: true,
      paperRef,
      stageRef,
      position: () => ({ x: 30, y: 30 }),
      showToast: () => {},
      onSelect: () => {},
    })
    return (
      <div ref={stageRef}>
        <div ref={paperRef} />
        <button
          type="button"
          onPointerDown={(e) => placement.down(source, e)}
          onClick={(e) => placement.click(source, e)}
        >
          Arrastar árvore
        </button>
        <output>{placement.preview ? 'Prévia presente' : 'Sem prévia'}</output>
      </div>
    )
  }
  const { container } = render(<Host />)
  for (const div of container.querySelectorAll('div'))
    Object.defineProperty(div, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 256, height: 192, right: 256, bottom: 192 }),
    })
  const card = screen.getByRole('button', { name: 'Arrastar árvore' })
  fireEvent.pointerDown(card, {
    button: 0,
    isPrimary: true,
    pointerId: 1,
    clientX: 300,
    clientY: 30,
  })
  fireEvent.pointerMove(document, { pointerId: 1, clientX: 60, clientY: 60 })
  expect(screen.getByText('Prévia presente')).toBeTruthy()
  await act(async () => {
    expect(await editor.getState().flush()).toEqual({ ok: true })
  })
  expect(editor.getState().asset).toBe(recovered)
  expect(screen.getByText('Sem prévia')).toBeTruthy()
  fireEvent.pointerUp(document, { pointerId: 1, clientX: 60, clientY: 60 })
  fireEvent.pointerCancel(document, { pointerId: 1 })
  fireEvent.click(card, { detail: 1 })
  expect(editor.getState().asset).toBe(recovered)
  expect(editor.getState().canUndo).toBe(false)
  expect(editor.getState().canRedo).toBe(false)
})
