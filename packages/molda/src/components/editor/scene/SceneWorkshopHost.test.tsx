import { expect, spyOn, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { UseStore } from 'idb-keyval'
import { StrictMode } from 'react'
import { COPY } from '../../../core/copy'
import { createSceneProject } from '../../../scene/createProject'
import { sceneToJson } from '../../../scene/documentJson'
import { createScenePersistence } from '../../../state/scenePersistence'
import { SCENE_DOCUMENT_KEY_PREFIX } from '../../../state/storageKeys'
import { deferred } from '../../../testing/deferred'
import { nativeDatabase } from '../../../testing/nativeDatabase'
import { makeSceneGlbFixture } from '../../../testing/sceneGlbFixture'
import { sceneViewportProbe } from '../../../testing/sceneViewportProbe'
import { SceneWorkshopHost } from './SceneWorkshopHost'

const start = COPY.scene.start,
  exit = COPY.scene.exit
function begin(name: string) {
  fireEvent.click(screen.getByRole('button', { name: start.empty }))
  fireEvent.change(screen.getByLabelText(start.name), { target: { value: name } })
  fireEvent.click(screen.getByRole('button', { name: start.create }))
}
function confirmExit() {
  fireEvent.click(screen.getByRole('button', { name: exit.open }))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: exit.save }))
}
function addBox() {
  fireEvent.click(screen.getByText(COPY.scene.add))
  fireEvent.click(screen.getByRole('button', { name: COPY.shapes.box }))
}

test('native backup roundtrip previews before any write and restores as an independent new creation without overwriting its source', async () => {
  const db = await nativeDatabase({ name: 'host-restore' }),
    probe = sceneViewportProbe()
  const source = makeSceneGlbFixture(1, 1, 3, 2, 2),
    p = createScenePersistence(db.store)
  await p.save(source, null)
  const original = await p.read(source.id),
    fileText = JSON.stringify(sceneToJson(source)),
    routes: Array<string | null> = []
  let writes = 0
  const store: UseStore = (mode, callback) => {
    if (mode === 'readwrite') writes++
    return db.store(mode, callback)
  }
  const view = render(
    <StrictMode>
      <SceneWorkshopHost
        store={store}
        viewportFactory={probe.factory}
        onRouteChange={(id) => routes.push(id)}
      />
    </StrictMode>,
  )
  try {
    await screen.findByRole('button', { name: start.open(source.name) })
    const trigger = screen.getByRole('button', { name: COPY.scene.restore.open })
    fireEvent.click(trigger)
    await screen.findByLabelText(COPY.scene.restore.file)
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.restore.cancel }))
    expect(document.activeElement === trigger).toBe(true)
    expect(writes).toBe(0)
    fireEvent.click(trigger)
    const picker = await screen.findByLabelText(COPY.scene.restore.file)
    fireEvent.change(picker, {
      target: {
        files: [new File([fileText], 'minha-cópia.molda.json', { type: 'application/json' })],
      },
    })
    const name = await screen.findByLabelText<HTMLInputElement>(start.name)
    await waitFor(() => expect(probe.ports.at(-1)?.document?.images.length).toBe(1))
    expect(writes).toBe(0)
    expect(routes).toEqual([])
    fireEvent.change(name, { target: { value: 'Minha cópia editável' } })
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.restore.confirm }))
    await screen.findByRole('heading', { level: 1, name: 'Minha cópia editável' })
    await waitFor(() => expect(probe.ports.at(-1)?.document?.name).toBe('Minha cópia editável'))
    const id = routes[0]
    if (typeof id !== 'string') throw new Error('Missing restored identity')
    expect(id === source.id).toBe(false)
    const restored = await p.read(id)
    if (restored.status !== 'active') throw new Error('Missing restored creation')
    expect(restored.document.images).toEqual(source.images)
    expect(restored.document.animations).toEqual(source.animations)
    expect(restored.document.nodes).toEqual(source.nodes)
    expect(await p.read(source.id)).toEqual(original)
    addBox()
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    confirmExit()
    await screen.findByRole('button', { name: start.open('Minha cópia editável') })
    expect((await p.listSummaries()).summaries).toHaveLength(2)
    expect(await p.read(source.id)).toEqual(original)
    expect(probe.ports.every((port) => port.disposed === 1)).toBe(true)
  } finally {
    view.unmount()
    db.close()
  }
})

test('a cancelled or replaced restore cannot navigate after its already authorized commit, and never writes into the replacement namespace', async () => {
  for (const action of ['close', 'namespace']) {
    const logged: unknown[][] = [],
      originalError = console.error.bind(console)
    const errors = spyOn(console, 'error').mockImplementation((...args) => {
      logged.push(args)
      originalError(...args)
    })
    const first = await nativeDatabase({ name: `restore-old-${action}` }),
      second = await nativeDatabase({ name: `restore-new-${action}` })
    const entered = deferred(),
      release = deferred(),
      committed = deferred(),
      probe = sceneViewportProbe()
    const store: UseStore = async (mode, callback) => {
      if (mode === 'readwrite') {
        entered.resolve()
        await release.promise
      }
      const result = await first.store(mode, callback)
      if (mode === 'readwrite') committed.resolve()
      return result
    }
    const routes: Array<string | null> = [],
      onRouteChange = (id: string | null) => routes.push(id)
    const view = render(
      <SceneWorkshopHost
        store={store}
        onRouteChange={onRouteChange}
        viewportFactory={probe.factory}
      />,
    )
    try {
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.restore.open }))
      const picker = await screen.findByLabelText(COPY.scene.restore.file)
      const source = createSceneProject({ kind: 'empty', name: 'Cópia confirmada' })
      fireEvent.change(picker, {
        target: { files: [new File([JSON.stringify(sceneToJson(source))], 'copy.molda.json')] },
      })
      await screen.findByLabelText(start.name)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.restore.confirm }))
      await entered.promise
      if (action === 'namespace')
        view.rerender(
          <SceneWorkshopHost
            store={second.store}
            onRouteChange={onRouteChange}
            viewportFactory={probe.factory}
          />,
        )
      else fireEvent.click(screen.getByRole('button', { name: COPY.scene.restore.cancel }))
      expect(screen.queryByRole('dialog') === null).toBe(true)
      if (action === 'namespace') await screen.findByText(start.noProjects)
      await act(async () => {
        release.resolve()
        await committed.promise
      })
      // Commit completion precedes BroadcastChannel delivery and the new metadata read.
      // Await the observable list update, not an unrelated IDB read while React is still updating.
      if (action === 'close') await screen.findByRole('button', { name: start.open(source.name) })
      expect(routes).toEqual([])
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(start.title)
      const saved = (await createScenePersistence(first.store).listSummaries()).summaries
      expect(saved).toHaveLength(1)
      expect(saved[0]?.name).toBe(source.name)
      expect(saved[0]?.id === source.id).toBe(false)
      expect((await createScenePersistence(second.store).listSummaries()).summaries).toEqual([])
      expect(logged).toEqual([])
    } finally {
      release.resolve()
      view.unmount()
      first.close()
      second.close()
      errors.mockRestore()
    }
  }
})

test('internal host creates only on demand, edits, saves, resumes the same project and releases each viewport under StrictMode', async () => {
  const db = await nativeDatabase({ name: 'host-journey' }),
    probe = sceneViewportProbe()
  const p = createScenePersistence(db.store),
    routes: Array<string | null> = []
  let writes = 0
  const store: UseStore = (mode, callback) => {
    if (mode === 'readwrite') writes++
    return db.store(mode, callback)
  }
  const view = render(
    <StrictMode>
      <SceneWorkshopHost
        store={store}
        theme="dark"
        viewportFactory={probe.factory}
        onRouteChange={(id) => routes.push(id)}
      />
    </StrictMode>,
  )
  try {
    await screen.findByText(start.noProjects)
    expect(document.activeElement?.textContent).toBe(start.title)
    expect(writes).toBe(0)
    expect(probe.ports).toHaveLength(0)
    expect(view.container.querySelector('canvas') === null).toBe(true)
    expect(view.container.firstElementChild?.getAttribute('data-molda-theme')).toBe('dark')
    begin('Robô explorador')
    await screen.findByRole('heading', { level: 1, name: 'Robô explorador' })
    await waitFor(() => expect(probe.ports.at(-1)?.document?.name).toBe('Robô explorador'))
    expect(document.activeElement?.textContent).toBe('Robô explorador')
    expect(probe.ports.at(-1)?.document?.nodes).toHaveLength(0)
    const id = routes[0]
    if (typeof id !== 'string') throw new Error('Creation did not choose its saved identity')
    addBox()
    expect(probe.ports.at(-1)?.document?.nodes).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: exit.open }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: exit.stay }))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Robô explorador')
    confirmExit()
    await screen.findByRole('button', { name: start.open('Robô explorador') })
    expect(document.activeElement?.textContent).toBe(start.title)
    expect(routes).toEqual([id, null])
    expect(probe.ports.every((port) => port.disposed === 1)).toBe(true)
    const saved = await p.read(id)
    if (saved.status !== 'active') throw new Error('Creation was not saved')
    expect(saved.document.nodes).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: start.open('Robô explorador') }))
    await screen.findByRole('heading', { level: 1, name: 'Robô explorador' })
    await waitFor(() => expect(probe.ports.at(-1)?.document?.nodes).toHaveLength(1))
    addBox()
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    expect(probe.ports.at(-1)?.document?.nodes).toEqual(saved.document.nodes)
    confirmExit()
    await screen.findByRole('button', { name: start.open('Robô explorador') })
    expect((await p.listSummaries()).summaries.map((row) => row.id)).toEqual([id])
    expect(probe.ports.every((port) => port.disposed === 1)).toBe(true)
  } finally {
    view.unmount()
    db.close()
  }
})

test('missing, future, corrupt and deleted links fail without creating a demo or rewriting any stored record', async () => {
  for (const kind of ['missing', 'future', 'corrupt', 'deleted']) {
    const db = await nativeDatabase({ name: `host-${kind}` }),
      probe = sceneViewportProbe()
    const source = { ...createSceneProject({ kind: 'empty', name: kind }), id: kind }
    const p = createScenePersistence(db.store)
    if (kind === 'deleted') {
      await p.save(source, null)
      await p.remove(kind, 1)
    }
    if (kind === 'future')
      await db.seed(`${SCENE_DOCUMENT_KEY_PREFIX}${kind}`, { ...source, formatVersion: 999 })
    if (kind === 'corrupt') await db.seed(`${SCENE_DOCUMENT_KEY_PREFIX}${kind}`, { broken: true })
    const before = await db.dump()
    let writes = 0
    const store: UseStore = (mode, callback) => {
      if (mode === 'readwrite') writes++
      return db.store(mode, callback)
    }
    const view = render(
      <StrictMode>
        <SceneWorkshopHost store={store} initialId={kind} viewportFactory={probe.factory} />
      </StrictMode>,
    )
    try {
      await screen.findByText(COPY.scene.openError)
      expect(document.activeElement?.textContent).toBe(COPY.scene.openError)
      expect(probe.ports).toHaveLength(0)
      expect(await db.dump()).toEqual(before)
      expect(writes).toBe(0)
      fireEvent.click(screen.getByRole('button', { name: exit.open }))
      await screen.findByRole('heading', { level: 1, name: start.title })
      expect(writes).toBe(0)
    } finally {
      view.unmount()
      db.close()
    }
  }
})

test('failed save stays editable; explicit discard never retries the failed write during host cleanup', async () => {
  const db = await nativeDatabase({ name: 'host-discard' }),
    probe = sceneViewportProbe()
  const p = createScenePersistence(db.store),
    source = createSceneProject({ kind: 'empty', name: 'Rascunho' })
  await p.save(source, null)
  let rejectWrite = true,
    writes = 0
  const store: UseStore = async (mode, callback) => {
    if (mode === 'readwrite') {
      writes++
      if (rejectWrite) throw new DOMException('Storage full', 'QuotaExceededError')
    }
    return db.store(mode, callback)
  }
  const view = render(
    <SceneWorkshopHost store={store} initialId={source.id} viewportFactory={probe.factory} />,
  )
  try {
    await screen.findByRole('heading', { level: 1, name: source.name })
    await waitFor(() => expect(probe.ports.at(-1)?.document?.name).toBe(source.name))
    addBox()
    confirmExit()
    const modal = within(screen.getByRole('dialog'))
    await modal.findByRole('alert')
    expect(probe.ports.at(-1)?.document?.nodes).toHaveLength(1)
    expect(probe.ports.at(-1)?.disposed).toBe(0)
    expect(screen.getByRole('button', { name: COPY.editor.undo }).hasAttribute('disabled')).toBe(
      false,
    )
    const attempted = writes
    expect(attempted).toBeGreaterThan(0)
    rejectWrite = false
    fireEvent.click(modal.getByRole('button', { name: exit.discard }))
    await screen.findByRole('button', { name: start.open(source.name) })
    expect(writes).toBe(attempted)
    expect(await p.read(source.id)).toMatchObject({
      status: 'active',
      document: source,
      summary: { revision: 1 },
    })
    expect(probe.ports.every((port) => port.disposed === 1)).toBe(true)
  } finally {
    view.unmount()
    db.close()
  }
})

test('namespace replacement owns late project reads and creation commits without cross-profile navigation', async () => {
  for (const kind of ['opening', 'creation']) {
    const first = await nativeDatabase({ name: `old-${kind}` }),
      second = await nativeDatabase({ name: `new-${kind}` })
    const p = createScenePersistence(first.store),
      probe = sceneViewportProbe()
    const entered = deferred(),
      release = deferred(),
      completed = deferred()
    const outcomes: Array<{ status: 'fulfilled' } | { status: 'rejected'; reason: unknown }> = []
    const source = createSceneProject({ kind: 'empty', name: 'Projeto antigo' })
    if (kind === 'opening') await p.save(source, null)
    const delayed: UseStore = async (mode, callback) => {
      const held =
        (kind === 'opening' && mode === 'readonly') || (kind === 'creation' && mode === 'readwrite')
      if (held) {
        entered.resolve()
        await release.promise
      }
      try {
        const result = await first.store(mode, callback)
        if (held) outcomes.push({ status: 'fulfilled' })
        return result
      } catch (error) {
        if (held) outcomes.push({ status: 'rejected', reason: error })
        throw error
      } finally {
        // Completion includes cancellation: awaiting only success would leave an async act open.
        if (held) completed.resolve()
      }
    }
    const routes: Array<string | null> = []
    const onRouteChange = (id: string | null) => routes.push(id)
    const initialId = kind === 'opening' ? source.id : null
    const view = render(
      <SceneWorkshopHost
        store={delayed}
        initialId={initialId}
        viewportFactory={probe.factory}
        onRouteChange={onRouteChange}
      />,
    )
    try {
      if (kind === 'creation') begin('Criação antiga em voo')
      await entered.promise
      view.rerender(
        <SceneWorkshopHost
          store={second.store}
          viewportFactory={probe.factory}
          onRouteChange={onRouteChange}
        />,
      )
      await screen.findByText(start.noProjects)
      await act(async () => {
        release.resolve()
        await completed.promise
      })
      expect(outcomes).toEqual(
        kind === 'opening'
          ? [{ status: 'rejected', reason: expect.objectContaining({ name: 'AbortError' }) }]
          : [{ status: 'fulfilled' }],
      )
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(start.title)
      expect(screen.queryByLabelText(start.name) === null).toBe(true)
      expect(routes).toEqual([])
      expect(probe.ports).toHaveLength(0)
      expect((await createScenePersistence(second.store).listSummaries()).summaries).toEqual([])
      if (kind === 'creation')
        expect((await p.listSummaries()).summaries.map((row) => row.name)).toEqual([
          'Criação antiga em voo',
        ])
    } finally {
      release.resolve()
      view.unmount()
      first.close()
      second.close()
    }
  }
})
