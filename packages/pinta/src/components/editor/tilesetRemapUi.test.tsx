import { expect, test } from 'bun:test'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { isObjectLayer } from '../../core/project'
import '../../testing/idbMock'

const { createTilesetRemapHost } = await import('../../../scripts/homologacao/tilesetRemapHost')

test('two tile edits before autosave never revive deleted object artwork; undo keeps both assets together', async () => {
  const host = await createTilesetRemapHost('normal', `tile-remap-${crypto.randomUUID()}`)
  render(<host.Host />)
  fireEvent.click(screen.getByRole('button', { name: COPY.tiles.removeTile }))
  const afterDelete = host.editor.getState().linkedAssets?.find((a) => a.name === 'qa-objeto')
  if (afterDelete?.kind !== 'tilemap') throw Error('Mapa ausente')
  expect(afterDelete.layers.find(isObjectLayer)!.objects[0]!.art).toBeUndefined()
  const confirmed = host.gallery.getState().assets.find((a) => a.id === afterDelete.id)
  if (confirmed?.kind !== 'tilemap') throw Error('Mapa ausente')
  expect(confirmed.layers.find(isObjectLayer)!.objects[0]!.art?.tile).toBe(1)
  fireEvent.click(screen.getByRole('button', { name: COPY.tiles.addTile }))
  const afterInsert = host.editor.getState().linkedAssets?.find((a) => a.id === afterDelete.id)
  expect(afterInsert).toBe(afterDelete)
  act(() => host.editor.getState().undo())
  expect(host.editor.getState().linkedAssets?.find((a) => a.id === afterDelete.id)).toBe(
    afterDelete,
  )
  act(() => host.editor.getState().undo())
  const restored = host.editor.getState().linkedAssets?.find((a) => a.id === afterDelete.id)
  if (restored?.kind !== 'tilemap') throw Error('Mapa ausente')
  expect(restored.layers.find(isObjectLayer)!.objects[0]!.art?.tile).toBe(1)
  await host.flush()
})

test('a refused dependent leaves the collection, selection and undo untouched and explains the refusal', async () => {
  const host = await createTilesetRemapHost('overflow', `tile-remap-${crypto.randomUUID()}`)
  render(<host.Host />)
  const before = host.editor.getState().asset
  fireEvent.click(screen.getByRole('button', { name: COPY.tiles.addTile }))
  expect(host.editor.getState().asset).toBe(before)
  expect(host.session.getState().frameIndex).toBe(1)
  expect(host.editor.getState().canUndo).toBe(false)
  expect(screen.getByText(COPY.tiles.remapRefused('qa-limite'))).toBeTruthy()
  await host.flush()
  expect(host.snapshot().writes).toBe(0)
})

test('a host adoption during admission does not apply the old command selection', async () => {
  const host = await createTilesetRemapHost('supersede', `tile-remap-${crypto.randomUUID()}`)
  render(<host.Host />)
  fireEvent.click(screen.getByRole('button', { name: COPY.tiles.removeTile }))
  expect(host.editor.getState().asset.name).toBe('qa-adotado')
  expect(host.session.getState().frameIndex).toBe(1)
  expect(host.editor.getState().canUndo).toBe(false)
  await host.flush()
})

test('one accepted tile edit keeps the collection and all linked maps in the same undo', async () => {
  const host = await createTilesetRemapHost('normal', `tile-remap-${crypto.randomUUID()}`)
  render(<host.Host />)
  const original = host.editor.getState().asset
  fireEvent.click(screen.getByRole('button', { name: COPY.tiles.removeTile }))
  expect(host.session.getState().frameIndex).toBe(0)
  expect(host.editor.getState().canUndo).toBe(true)
  act(() => host.editor.getState().undo())
  expect(host.editor.getState().asset).toBe(original)
  const linked = host.editor.getState().linkedAssets?.find((a) => a.name === 'qa-objeto')
  if (linked?.kind !== 'tilemap') throw Error('Mapa ausente')
  expect(linked.layers.find(isObjectLayer)!.objects[0]!.art?.tile).toBe(1)
  expect(host.editor.getState().canUndo).toBe(false)
  await host.flush()
})
