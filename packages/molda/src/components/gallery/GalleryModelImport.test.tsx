import { expect, spyOn, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { COPY } from '../../core/copy'
import { GLTF_IMPORT_COPY as copy } from '../../core/gltfImportCopy'
import { encodeSceneGlb } from '../../export/sceneGlb'
import { createSceneProject } from '../../scene/createProject'
import { createGallerySceneSource } from '../../state/gallerySceneSource'
import { createGalleryStore } from '../../state/galleryStore'
import { createMemoryPersistence } from '../../state/memoryPersistence'
import { createScenePersistence } from '../../state/scenePersistence'
import { nativeDatabase } from '../../testing/nativeDatabase'
import { makeSceneGlbFixture } from '../../testing/sceneGlbFixture'
import { sceneImportFile, sceneImportRenderer } from '../../testing/sceneImportFixtures'
import { MoldaAppProvider } from '../appContext'
import { MoldaToolAccessProvider } from '../toolAccess'
import { ToastProvider } from '../ui/Toast'
import { GalleryModelImport } from './GalleryModelImport'
import { GalleryScreen } from './GalleryScreen'

async function setup(failFirstSave = false, asGallery = false) {
  const db = await nativeDatabase()
  const persistence = createMemoryPersistence()
  const native = createScenePersistence(db.store)
  const existing = createSceneProject({ kind: 'empty', name: COPY.gallery.importedModelName })
  await native.save(existing, null)
  const scene = createGallerySceneSource(db.store)
  if (failFirstSave)
    spyOn(scene, 'importProject').mockRejectedValueOnce(new Error('disk unavailable'))
  const gallery = createGalleryStore(persistence, { scene })
  await gallery.getState().load()
  const opened: string[] = []
  const busy: boolean[] = []
  const { factory, ports } = sceneImportRenderer()
  const tree = (allowed = true) => (
    <StrictMode>
      <MoldaAppProvider value={{ adapter: {}, gallery, persistence, scene }}>
        <MoldaToolAccessProvider
          access={{ allow: allowed ? ['files.import', 'files.interop'] : [] }}
        >
          <ToastProvider>
            {asGallery ? (
              <GalleryScreen onOpen={(id) => opened.push(id)} />
            ) : (
              <GalleryModelImport
                onClose={() => {}}
                onOpen={(id) => opened.push(id)}
                onBusyChange={(value) => busy.push(value)}
                viewportFactory={factory}
              />
            )}
          </ToastProvider>
        </MoldaToolAccessProvider>
      </MoldaAppProvider>
    </StrictMode>
  )
  const view = render(tree())
  return {
    db,
    native,
    existing,
    scene,
    gallery,
    opened,
    busy,
    view,
    ports,
    access: (allowed: boolean) => view.rerender(tree(allowed)),
  }
}

async function review() {
  const bytes = encodeSceneGlb(makeSceneGlbFixture(2, 1, 3, 2), { allowLosses: true }).bytes
  fireEvent.change(await screen.findByLabelText(copy.choose), {
    target: { files: [sceneImportFile('carro.glb', bytes)] },
  })
  const select = await screen.findByLabelText(copy.scene)
  fireEvent.change(select, { target: { value: '0' } })
  fireEvent.click(screen.getByRole('button', { name: copy.prepare }))
  await screen.findByText(copy.ready)
  expect(screen.queryByText(copy.replace)).toBe(null)
  expect(screen.getByText(COPY.gallery.importModelHint)).toBeTruthy()
  expect(
    (screen.getByRole('button', { name: COPY.gallery.importModelConfirm }) as HTMLButtonElement)
      .disabled,
  ).toBe(true)
}

test('gallery import previews without writing, then saves a separate native model with a unique name', async () => {
  const task = await setup()
  try {
    await review()
    expect(task.gallery.getState().assets.length).toBe(1)
    expect((await task.native.listSummaries()).summaries.length).toBe(1)
    fireEvent.click(screen.getByLabelText(copy.accept))
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.importModelConfirm }))
    await waitFor(() => expect(task.opened.length).toBe(1))
    const imported = await task.native.read(task.opened[0]!)
    expect(imported.status).toBe('active')
    if (imported.status !== 'active') throw new Error('missing import')
    expect(imported.document.id).not.toBe(task.existing.id)
    expect(imported.document.name).toBe(`${COPY.gallery.importedModelName}-2`)
    expect(imported.document.images.length).toBe(1)
    expect(task.gallery.getState().getById(imported.document.id)?.formatVersion).toBe(2)
    const original = await task.native.read(task.existing.id)
    expect(original.status === 'active' && original.document).toEqual(task.existing)
    expect(task.busy).toEqual([true, false])
  } finally {
    task.view.unmount()
    task.db.close()
  }
})

test('a failed save keeps the reviewed model available for retry and opens only after persistence succeeds', async () => {
  const task = await setup(true)
  try {
    await review()
    fireEvent.click(screen.getByLabelText(copy.accept))
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.importModelConfirm }))
    await screen.findByRole('alert')
    expect(task.opened).toEqual([])
    expect(task.gallery.getState().assets.length).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.retry }))
    await waitFor(() => expect(task.opened.length).toBe(1))
    expect((await task.native.listSummaries()).summaries.length).toBe(2)
    expect(task.gallery.getState().assets.length).toBe(2)
  } finally {
    task.view.unmount()
    task.db.close()
  }
})

test('discarding a prepared import leaves no empty creation in storage', async () => {
  const task = await setup()
  try {
    await review()
    task.view.unmount()
    expect(task.opened).toEqual([])
    expect((await task.native.listSummaries()).summaries.length).toBe(1)
    expect(task.ports.every((port) => port.disposed === 1)).toBe(true)
  } finally {
    task.view.unmount()
    task.db.close()
  }
})

test('unmount cancels a confirmed import still waiting in the gallery mutation queue', async () => {
  const task = await setup()
  let release = () => {}
  const barrier = new Promise<void>((resolve) => {
    release = resolve
  })
  const list = task.scene.listSummaries.bind(task.scene)
  const blockedList = spyOn(task.scene, 'listSummaries').mockImplementationOnce(async () => {
    await barrier
    return list()
  })
  try {
    await review()
    const reload = task.gallery.getState().reload()
    await waitFor(() => expect(blockedList).toHaveBeenCalled())
    fireEvent.click(screen.getByLabelText(copy.accept))
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.importModelConfirm }))
    expect(task.busy).toEqual([true])
    task.view.unmount()
    release()
    await reload
    await task.gallery.getState().reload()
    expect(task.opened).toEqual([])
    expect((await task.native.listSummaries()).summaries.length).toBe(1)
  } finally {
    release()
    task.view.unmount()
    task.db.close()
  }
})

test('a stale import completion cannot unlock the close control of a new saving session', async () => {
  const task = await setup(false, true)
  let releaseQueue = () => {}
  let releaseSave = () => {}
  const queueBarrier = new Promise<void>((resolve) => {
    releaseQueue = resolve
  })
  const saveBarrier = new Promise<void>((resolve) => {
    releaseSave = resolve
  })
  const list = task.scene.listSummaries.bind(task.scene)
  const importProject = task.scene.importProject!.bind(task.scene)
  try {
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.importModel }))
    await review()
    const blockedList = spyOn(task.scene, 'listSummaries').mockImplementationOnce(async () => {
      await queueBarrier
      return list()
    })
    const reload = task.gallery.getState().reload()
    await waitFor(() => expect(blockedList).toHaveBeenCalled())
    fireEvent.click(screen.getByLabelText(copy.accept))
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.importModelConfirm }))
    task.access(false)
    expect(screen.queryByRole('dialog')).toBe(null)
    task.access(true)
    await review()
    const save = spyOn(task.scene, 'importProject').mockImplementationOnce(async (json, name) => {
      await saveBarrier
      return importProject(json, name)
    })
    fireEvent.click(screen.getByLabelText(copy.accept))
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.importModelConfirm }))
    await act(async () => {
      releaseQueue()
      await reload
    })
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.closeDialog }))
    expect(screen.queryByRole('dialog', { name: COPY.gallery.importModel })).not.toBe(null)
    await act(async () => {
      releaseSave()
      await task.gallery.getState().reload()
    })
    expect(task.opened.length).toBe(1)
    expect((await task.native.listSummaries()).summaries.length).toBe(2)
  } finally {
    releaseQueue()
    releaseSave()
    await act(async () => {
      await task.gallery.getState().reload()
      task.view.unmount()
    })
    task.db.close()
  }
})
