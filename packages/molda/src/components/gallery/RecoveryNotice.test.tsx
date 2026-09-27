import { expect, spyOn, test } from 'bun:test'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { createMoldaPersistence, moldaDbNameFor } from '../../state/persistence'
import { makeModel, makeSky } from '../../testing/fixtures'
import { idbMockStore } from '../../testing/idbMock'
import { MoldaApp } from '../MoldaApp'

test('a gallery containing only newer documents is not reported as empty or deleted', async () => {
  const persistence = createMoldaPersistence({ namespace: 'only-recovery-ui' })
  const disk = idbMockStore(moldaDbNameFor('only-recovery-ui'))
  disk.set('molda:asset:model-1', { ...makeModel(), formatVersion: 2 })
  try {
    render(<MoldaApp persistence={persistence} adapter={{ initialAssetId: 'model-1' }} />)
    await screen.findByRole('region', { name: COPY.gallery.recoveryTitle })
    expect(screen.queryByText(COPY.gallery.empty)).toBeNull()
    expect(screen.queryByText(COPY.gallery.creationGone)).toBeNull()
    expect(screen.queryByRole('heading', { level: 1 })?.textContent).toBe(COPY.gallery.title)
  } finally {
    persistence.dispose?.()
  }
})

test('unreadable creations remain visible and download without opening or altering the original', async () => {
  const persistence = createMoldaPersistence({ namespace: 'recovery-ui' })
  const original = { ...makeModel(), formatVersion: 2, animations: [{ name: 'andar' }] }
  const disk = idbMockStore(moldaDbNameFor('recovery-ui'))
  disk.set('molda:asset:model-1', original)
  await persistence.save(makeSky())
  const blobs: Blob[] = []
  const previousCreate = URL.createObjectURL
  URL.createObjectURL = (blob) => {
    blobs.push(blob as Blob)
    return 'blob:recovery-test'
  }
  const click = spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  try {
    render(<MoldaApp persistence={persistence} />)
    const notice = await screen.findByRole('region', { name: COPY.gallery.recoveryTitle })
    expect(within(notice).getByText('nave')).toBeDefined()
    expect(within(notice).getByText(COPY.gallery.recoveryNewer)).toBeDefined()
    expect(screen.getByRole('list', { name: COPY.a11y.galleryGrid })).toBeDefined()
    const button = within(notice).getByRole('button', {
      name: COPY.gallery.recoveryDownloadAria('nave'),
    })
    button.focus()
    expect(document.activeElement).toBe(button)
    fireEvent.click(button)
    await waitFor(() => expect(blobs).toHaveLength(1))
    const json = JSON.parse(await blobs[0]!.text())
    expect(json).toMatchObject({ id: 'model-1', formatVersion: 2, animations: [{ name: 'andar' }] })
    expect(disk.get('molda:asset:model-1')).toEqual(original)
    expect(click).toHaveBeenCalledTimes(1)
  } finally {
    click.mockRestore()
    URL.createObjectURL = previousCreate
    persistence.dispose?.()
  }
})
