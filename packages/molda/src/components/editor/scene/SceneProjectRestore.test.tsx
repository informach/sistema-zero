import { expect, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { COPY } from '../../../core/copy'
import { SCENE_PROJECT_FILE_LIMITS } from '../../../import/sceneProjectFile'
import type { MoldaSceneDocument } from '../../../scene/document'
import { sceneToJson } from '../../../scene/documentJson'
import { deferred } from '../../../testing/deferred'
import { makeSceneGlbFixture } from '../../../testing/sceneGlbFixture'
import { sceneViewportProbe } from '../../../testing/sceneViewportProbe'
import type { prepareSceneProjectFileInWorker } from '../../../workers/sceneProjectFile'
import { type RestoreSceneProject, SceneProjectRestore } from './SceneProjectRestore'

const copy = COPY.scene.restore
function file(name = 'minha-cópia.molda.json') {
  return new File([JSON.stringify(sceneToJson(makeSceneGlbFixture(1, 1, 3, 2, 2)))], name, {
    type: 'application/json',
  })
}
function choose(source: File) {
  fireEvent.change(screen.getByLabelText(copy.file), { target: { files: [source] } })
}

test('native copy UI validates off-thread, requires confirmation, preserves review on save failure and cancels a pending save on unmount', async () => {
  const probe = sceneViewportProbe(),
    requests: Array<{
      document: MoldaSceneDocument
      name: string
      signal: AbortSignal
      done: ReturnType<typeof deferred<void>>
    }> = []
  const onRestore: RestoreSceneProject = (document, name, signal) => {
    const done = deferred()
    requests.push({ document, name, signal, done })
    return done.promise
  }
  const view = render(
    <StrictMode>
      <SceneProjectRestore
        onRestore={onRestore}
        onClose={() => {}}
        viewportFactory={probe.factory}
      />
    </StrictMode>,
  )
  try {
    const source = file('<script>copiar</script>.molda.json'),
      before = await source.text()
    choose(source)
    const name = await screen.findByLabelText<HTMLInputElement>(COPY.scene.start.name)
    await waitFor(() => expect(probe.ports.at(-1)?.document?.name).toBe('nave'))
    expect(requests).toHaveLength(0)
    expect(screen.getByText(copy.source(source.name)).textContent).toContain('<script>')
    expect(view.container.querySelector('script') === null).toBe(true)
    fireEvent.change(name, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: copy.confirm }))
    expect(name.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement === name).toBe(true)
    expect(requests).toHaveLength(0)
    fireEvent.change(name, { target: { value: '  Para meu jogo  ' } })
    const form = name.closest('form')
    if (!form) throw new Error('Missing restore form')
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(requests).toHaveLength(1)
    expect(requests[0]?.name).toBe('Para meu jogo')
    expect(requests[0]?.document).toEqual(makeSceneGlbFixture(1, 1, 3, 2, 2))
    expect(screen.getByLabelText(copy.file).hasAttribute('disabled')).toBe(true)
    await act(async () => {
      requests[0]?.done.reject(new Error('Storage unavailable'))
    })
    expect(screen.getByRole('alert').textContent).toBe(copy.saveError)
    expect(name.getAttribute('aria-invalid')).toBeNull()
    expect(name.value).toBe('  Para meu jogo  ')
    expect(probe.ports.at(-1)?.document?.name).toBe('nave')
    fireEvent.submit(form)
    expect(requests).toHaveLength(2)
    view.unmount()
    expect(requests[1]?.signal.aborted).toBe(true)
    await act(async () => {
      requests[1]?.done.resolve()
    })
    expect(await source.text()).toBe(before)
    expect(probe.ports.every((port) => port.disposed === 1)).toBe(true)
  } finally {
    view.unmount()
  }
})

test('choosing another native file and changing owner withdraw stale previews without allowing late reads or writes', async () => {
  const probe = sceneViewportProbe(),
    jobs: Array<{ signal: AbortSignal; done: ReturnType<typeof deferred<MoldaSceneDocument>> }> = []
  const prepare: typeof prepareSceneProjectFileInWorker = (_request, options) => {
    if (!options?.signal) throw new Error('Missing task cancellation')
    const done = deferred<MoldaSceneDocument>()
    jobs.push({ signal: options.signal, done })
    return done.promise
  }
  const pending = deferred(),
    writes: AbortSignal[] = []
  const onRestore: RestoreSceneProject = async (_document, _name, signal) => {
    writes.push(signal)
    await pending.promise
  }
  const props = { onClose: () => {}, viewportFactory: probe.factory, prepare }
  const view = render(<SceneProjectRestore {...props} onRestore={onRestore} />)
  try {
    choose(file('first.molda.json'))
    await waitFor(() => expect(jobs).toHaveLength(1))
    choose(file('second.molda.json'))
    await waitFor(() => expect(jobs).toHaveLength(2))
    expect(jobs[0]?.signal.aborted).toBe(true)
    await act(async () => {
      jobs[1]?.done.resolve({ ...makeSceneGlbFixture(1, 1, 3, 2), name: 'Segunda cópia' })
    })
    expect(screen.getByLabelText<HTMLInputElement>(COPY.scene.start.name).value).toBe(
      'Segunda cópia',
    )
    await act(async () => {
      jobs[0]?.done.resolve({ ...makeSceneGlbFixture(1, 1, 3, 2), name: 'Primeira cópia' })
    })
    expect(screen.getByLabelText<HTMLInputElement>(COPY.scene.start.name).value).toBe(
      'Segunda cópia',
    )
    fireEvent.click(screen.getByRole('button', { name: copy.confirm }))
    expect(writes).toHaveLength(1)
    view.rerender(
      <SceneProjectRestore
        {...props}
        onRestore={async () => {
          throw new Error('New owner must not write')
        }}
      />,
    )
    expect(writes[0]?.aborted).toBe(true)
    expect(screen.queryByLabelText(COPY.scene.start.name) === null).toBe(true)
    await act(async () => {
      pending.resolve()
    })
    expect(screen.queryByLabelText(COPY.scene.start.name) === null).toBe(true)
    expect(screen.queryByRole('alert') === null).toBe(true)
    choose(file('third.molda.json'))
    await waitFor(() => expect(jobs).toHaveLength(3))
    view.unmount()
    expect(jobs[2]?.signal.aborted).toBe(true)
    await act(async () => {
      jobs[2]?.done.resolve(makeSceneGlbFixture(1, 1, 3, 2))
    })
  } finally {
    view.unmount()
    pending.resolve()
  }
})

test('oversized native file is rejected before reading bytes or creating a worker; invalid content never offers confirmation', async () => {
  let reads = 0,
    tasks = 0,
    writes = 0
  class OversizedFile extends File {
    override readonly size = SCENE_PROJECT_FILE_LIMITS.bytes + 1
    override async arrayBuffer() {
      reads++
      return new ArrayBuffer(0)
    }
  }
  const prepare: typeof prepareSceneProjectFileInWorker = () => {
    tasks++
    throw new Error('Must not start')
  }
  const onRestore: RestoreSceneProject = async () => {
    writes++
  }
  const view = render(
    <SceneProjectRestore onRestore={onRestore} onClose={() => {}} prepare={prepare} />,
  )
  try {
    choose(new OversizedFile([], 'large.molda.json'))
    await screen.findByRole('alert')
    expect(reads).toBe(0)
    expect(tasks).toBe(0)
    expect(writes).toBe(0)
    expect(screen.queryByRole('button', { name: copy.confirm }) === null).toBe(true)
    view.rerender(<SceneProjectRestore onRestore={onRestore} onClose={() => {}} />)
    choose(new File(['{"formatVersion":999}'], 'future.molda.json'))
    await screen.findByRole('alert')
    expect(screen.getByRole('alert').textContent).toContain('outra versão')
    expect(screen.queryByRole('button', { name: copy.confirm }) === null).toBe(true)
    expect(writes).toBe(0)
    choose(new File(['{"broken":'], 'broken.molda.json'))
    await screen.findByRole('alert')
    expect(screen.getByRole('alert').textContent).toContain('Não consegui conferir')
    expect(screen.queryByRole('button', { name: copy.confirm }) === null).toBe(true)
  } finally {
    view.unmount()
  }
})
