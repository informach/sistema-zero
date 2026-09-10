import { expect, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../../core/copy'
import type { MoldaTextureAsset } from '../../../core/model'
import { createGalleryStore } from '../../../state/galleryStore'
import { createMemoryPersistence } from '../../../state/memoryPersistence'
import { makeTexture } from '../../../testing/fixtures'
import { MoldaAppProvider } from '../../appContext'

/** A galeria da geração seguinte não participa deste diálogo; um vazio basta. */
const fakeScene = {
  listSummaries: async () => ({ summaries: [], issues: [] }),
  readProject: async () => null,
  rename: async () => false,
  remove: async () => false,
  duplicate: async () => null,
  subscribe: () => () => {},
}

import { ApplyTextureDialog } from './ApplyTextureDialog'

test('applying a listed texture loads its pixels, never passes summary metadata to the painter', async () => {
  const texture = makeTexture()
  const persistence = createMemoryPersistence([texture])
  const gallery = createGalleryStore(persistence)
  await gallery.getState().load()
  let applied: MoldaTextureAsset | null = null
  render(
    <MoldaAppProvider value={{ adapter: {}, persistence, scene: fakeScene, gallery }}>
      <ApplyTextureDialog
        open
        onClose={() => {}}
        onApply={(value) => {
          applied = value
        }}
      />
    </MoldaAppProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: texture.name }))
  fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.paint.apply.apply }))
  await waitFor(() => expect(applied).toEqual(texture))
})

test('closing while the chosen texture loads prevents a late paint operation', async () => {
  const texture = makeTexture()
  const persistence = createMemoryPersistence([texture])
  const gallery = createGalleryStore(persistence)
  await gallery.getState().load()
  const pending: Array<(value: MoldaTextureAsset) => void> = []
  persistence.load = () =>
    new Promise((resolve) => {
      pending.push(resolve)
    })
  let applications = 0
  const view = (open: boolean) => (
    <MoldaAppProvider value={{ adapter: {}, persistence, scene: fakeScene, gallery }}>
      <ApplyTextureDialog
        open={open}
        onClose={() => {}}
        onApply={() => {
          applications += 1
        }}
      />
    </MoldaAppProvider>
  )
  const { rerender } = render(view(true))
  fireEvent.click(screen.getByRole('button', { name: texture.name }))
  fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.paint.apply.apply }))
  await waitFor(() => expect(pending.length).toBeGreaterThan(0))
  rerender(view(false))
  await act(async () => {
    for (const resolve of pending) resolve(texture)
  })
  expect(applications).toBe(0)
})
