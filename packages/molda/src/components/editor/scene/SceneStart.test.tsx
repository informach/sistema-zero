import { expect, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { UseStore } from 'idb-keyval'
import { StrictMode } from 'react'
import { COPY } from '../../../core/copy'
import { MOLDA_LIMITS } from '../../../core/limits'
import { createSceneProject, type SceneProjectStart } from '../../../scene/createProject'
import { sceneSummary } from '../../../state/sceneMetadata'
import { createScenePersistence } from '../../../state/scenePersistence'
import { SCENE_SUMMARY_KEY_PREFIX } from '../../../state/storageKeys'
import { nativeDatabase } from '../../../testing/nativeDatabase'
import { SceneStart } from './SceneStart'
import type { SceneProjectLibrary } from './useSceneProjectList'

const copy = COPY.scene.start

test('namespace change clears a pending name and resets pagination without revealing another profile', async () => {
  function library(prefix: string): SceneProjectLibrary {
    return {
      subscribe: async () => ({ available: false, unsubscribe: () => {} }),
      listSummaries: async () => ({
        summaries: Array.from({ length: 12 }, (_, i) =>
          sceneSummary(
            { ...createSceneProject({ kind: 'empty', name: `${prefix} ${i}` }), updatedAt: i },
            1,
            0,
          ),
        ),
        issues: [],
      }),
    }
  }
  const first = library('Primeira'),
    second = library('Segunda')
  const props = { onCreate: async () => {}, onOpen: () => {} }
  const view = render(<SceneStart {...props} persistence={first} />)
  try {
    await screen.findByText(copy.page(1, 2))
    fireEvent.click(screen.getByRole('button', { name: copy.next }))
    expect(screen.getByText(copy.page(2, 2))).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: copy.empty }))
    fireEvent.change(screen.getByLabelText(copy.name), { target: { value: 'Rascunho particular' } })
    view.rerender(<SceneStart {...props} persistence={second} />)
    expect(screen.queryByLabelText(copy.name) === null).toBe(true)
    expect(screen.queryByRole('button', { name: /^Continuar Primeira/ }) === null).toBe(true)
    await screen.findByText(copy.page(1, 2))
    expect(screen.getAllByRole('button', { name: /^Continuar Segunda/ })).toHaveLength(9)
    fireEvent.click(screen.getByRole('button', { name: copy.empty }))
    expect(screen.getByLabelText<HTMLInputElement>(copy.name).value).toBe('')
  } finally {
    view.unmount()
  }
})

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

test('start chooses real templates or empty, restores chooser focus, validates names and guards duplicate submissions', async () => {
  const db = await nativeDatabase({ name: 'start-form' })
  const p = createScenePersistence(db.store)
  const requests: Array<{
    input: SceneProjectStart
    signal: AbortSignal
    done: ReturnType<typeof deferred>
  }> = []
  let fail = true
  const view = render(
    <StrictMode>
      <SceneStart
        persistence={p}
        onOpen={() => {}}
        onCreate={async (input, signal) => {
          const done = deferred()
          requests.push({ input, signal, done })
          await done.promise
          if (fail) throw new Error('Storage unavailable')
        }}
      />
    </StrictMode>,
  )
  try {
    expect(screen.getAllByRole('img')).toHaveLength(6)
    expect(view.container.querySelector('canvas')).toBeNull()
    const templateLabel = COPY.a11y.templateCard(COPY.templates.items.carro.title)
    fireEvent.click(screen.getByRole('button', { name: templateLabel }))
    expect(screen.getByLabelText<HTMLInputElement>(copy.name).value).toBe('Carro')
    expect(document.activeElement).toBe(screen.getByLabelText(copy.name))
    fireEvent.click(screen.getByRole('button', { name: copy.chooseAgain }))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: templateLabel }))
    fireEvent.click(screen.getByRole('button', { name: copy.empty }))
    const field = screen.getByLabelText<HTMLInputElement>(copy.name)
    expect(field.value).toBe('')
    expect(field.maxLength).toBe(MOLDA_LIMITS.maxNameChars)
    expect(field.name).toBe('sceneProjectName')
    fireEvent.change(field, { target: { value: '   ' } })
    fireEvent.submit(field.closest('form')!)
    expect(screen.getByRole('alert').textContent).toBe(copy.nameError(MOLDA_LIMITS.maxNameChars))
    expect(field.getAttribute('aria-invalid')).toBe('true')
    expect(requests).toHaveLength(0)
    fireEvent.change(field, { target: { value: '  Minha invenção  ' } })
    fireEvent.submit(field.closest('form')!)
    fireEvent.submit(field.closest('form')!)
    expect(requests).toHaveLength(1)
    expect(requests[0]!.input).toEqual({ kind: 'empty', name: 'Minha invenção' })
    expect(screen.getByRole('button', { name: copy.creating }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: copy.chooseAgain }).hasAttribute('disabled')).toBe(
      true,
    )
    await act(async () => {
      requests[0]!.done.resolve()
    })
    expect(screen.getByRole('alert').textContent).toBe(copy.createError)
    expect(field.getAttribute('aria-invalid')).toBeNull()
    expect(field.value).toBe('  Minha invenção  ')
    fail = false
    fireEvent.submit(field.closest('form')!)
    expect(requests).toHaveLength(2)
    view.unmount()
    expect(requests[1]!.signal.aborted).toBe(true)
    await act(async () => {
      requests[1]!.done.resolve()
    })
  } finally {
    view.unmount()
    db.close()
  }
})

test('all indexed projects are reachable by pages, dates/names stay safe, invalid records are reported and listing never loads document pixels', async () => {
  const db = await nativeDatabase({ name: 'start-library' })
  const p = createScenePersistence(db.store)
  for (let i = 0; i < 11; i++) {
    const document = createSceneProject({ kind: 'empty', name: `Projeto ${i}` })
    await p.save({ ...document, id: `project-${i}`, updatedAt: 1000 + i }, null)
  }
  await db.seed(`${SCENE_SUMMARY_KEY_PREFIX}invalid`, { invalid: true })
  const example = (await p.listSummaries()).summaries[0]!
  await db.seed(`${SCENE_SUMMARY_KEY_PREFIX}project-10`, {
    ...example,
    id: 'project-10',
    name: '<script>não executar</script>',
    updatedAt: Number.MAX_VALUE,
  })
  const reads: string[] = []
  const observed: UseStore = (mode, callback) =>
    db.store(mode, (store) =>
      callback(
        new Proxy(store, {
          get(target, key) {
            if (key === 'openCursor')
              return (query: string) => {
                if (!query.startsWith(SCENE_SUMMARY_KEY_PREFIX))
                  throw new Error('Full document read')
                reads.push(query)
                return target.openCursor(query)
              }
            if (key === 'getAll' || key === 'get') throw new Error('Unbounded full document read')
            const value = Reflect.get(target, key, target)
            return typeof value === 'function' ? value.bind(target) : value
          },
        }),
      ),
    )
  const opened: string[] = []
  const view = render(
    <SceneStart
      persistence={createScenePersistence(observed)}
      onCreate={async () => {}}
      onOpen={(id) => opened.push(id)}
    />,
  )
  try {
    await screen.findByText(copy.listIssues(1))
    expect(screen.getByText('<script>não executar</script>')).toBeDefined()
    expect(view.container.querySelector('script')).toBeNull()
    expect(screen.getByText(copy.unknownDate)).toBeDefined()
    expect(screen.getAllByRole('button', { name: /^Continuar / })).toHaveLength(9)
    expect(screen.getByText(copy.page(1, 2))).toBeDefined()
    fireEvent.click(
      screen.getByRole('button', { name: copy.open('<script>não executar</script>') }),
    )
    expect(opened).toEqual(['project-10'])
    fireEvent.click(screen.getByRole('button', { name: copy.next }))
    expect(screen.getAllByRole('button', { name: /^Continuar / })).toHaveLength(2)
    expect(screen.getByRole('button', { name: copy.open('Projeto 0') })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: copy.open('Projeto 0') }))
    expect(opened).toEqual(['project-10', 'project-0'])
    const count = reads.length
    expect(count).toBe(12)
    // Successful deletion in the same namespace invalidates summaries, without a full read.
    await act(async () => {
      await p.remove('project-0', 1)
    })
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: copy.open('Projeto 0') }) === null).toBe(true),
    )
    expect(reads.length).toBeGreaterThan(count)
  } finally {
    view.unmount()
    db.close()
  }
})
