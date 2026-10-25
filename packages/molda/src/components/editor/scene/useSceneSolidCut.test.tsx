import { expect, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { type ReactNode, StrictMode } from 'react'
import { structuredBytes } from '../../../core/structuredBytes'
import type { MoldaSceneDocument } from '../../../scene/document'
import { splitSceneSolid } from '../../../scene/solidCut'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { animatedScene } from '../../../testing/sceneAnimation'
import { makeSceneKnifeLoop } from '../../../testing/sceneKnifeLoop'
import { packSceneMesh } from '../../../workers/sceneMeshPacket'
import { readSolidCutRequest, type SolidCutRequest } from '../../../workers/sceneSolidCutProtocol'
import type { TaskWorker } from '../../../workers/workerTask'
import { MoldaToolAccessProvider } from '../../toolAccess'
import { useSceneSolidCut } from './useSceneSolidCut'

test('a chosen line opens the solid cut preview and an invalid line explains the correction', () => {
  const { document, nodeId, seed, mesh } = makeSceneKnifeLoop()
  const editor = createDocumentEditorStore<MoldaSceneDocument>({
    asset: document,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60000,
  })
  const view = renderHook(() => useSceneSolidCut(editor, () => true), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MoldaToolAccessProvider access={{ allow: ['model.cut'] }}>
        {children}
      </MoldaToolAccessProvider>
    ),
  })
  try {
    act(() => view.result.current.start(nodeId, [seed]))
    expect(view.result.current.owner?.numericPlane).not.toBeNull()
    expect(view.result.current.canConfirm).toBe(true)
    expect(view.result.current.guide?.cut?.segments.length).toBeGreaterThan(0)
    expect(view.result.current.guide?.cut?.midpoints).toEqual([])
    const corner = [...view.result.current.owner!.topology.edges].find(([, incident]) => {
      const edge = incident[0]
      return edge && mesh.vertices[edge.a]?.[0] === -1 && mesh.vertices[edge.b]?.[0] === -1
    })![0]
    act(() => view.result.current.start(nodeId, [corner]))
    expect(view.result.current.error).toMatch(/dobra/)
    expect(view.result.current.canConfirm).toBe(false)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})

class DeferredCutWorker extends EventTarget implements TaskWorker {
  request: SolidCutRequest | null = null
  stopped = false
  postMessage(raw: unknown) {
    this.request = readSolidCutRequest(raw)
    this.dispatchEvent(new MessageEvent('message', { data: { type: 'loaded' } }))
  }
  terminate() {
    this.stopped = true
  }
  finish() {
    if (!this.request) throw new Error('Corte não foi solicitado')
    const { mesh, plane, capId, documentId, revision } = this.request
    this.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: 'result',
          documentId,
          revision,
          pieces: splitSceneSolid(mesh, plane, capId).map(packSceneMesh),
        },
      }),
    )
  }
}

test('confirming a selected loop commits two pieces as one undoable change', async () => {
  const { document, nodeId, loop } = makeSceneKnifeLoop()
  const editor = createDocumentEditorStore<MoldaSceneDocument>({
    asset: document,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60000,
  })
  const worker = new DeferredCutWorker()
  const view = renderHook(
    () =>
      useSceneSolidCut(
        editor,
        (next) => {
          editor.getState().commit(next)
          return true
        },
        () => worker,
      ),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <MoldaToolAccessProvider access={{ allow: ['model.cut'] }}>
          {children}
        </MoldaToolAccessProvider>
      ),
    },
  )
  try {
    act(() => view.result.current.start(nodeId, loop))
    expect(view.result.current.guide?.cut?.segments.length).toBeGreaterThan(0)
    expect(view.result.current.guide?.cut?.midpoints).toEqual([])
    let pending: Promise<boolean> | undefined
    act(() => {
      pending = view.result.current.confirm()
    })
    expect(worker.request?.plane).toEqual(view.result.current.plane!)
    await act(async () => {
      worker.finish()
      expect(await pending).toBe(true)
    })
    expect(editor.getState().content.nodes).toHaveLength(2)
    expect(editor.getState().canUndo).toBe(true)
    act(() => editor.getState().undo())
    expect(editor.getState().content.nodes).toEqual(document.nodes)
    expect(editor.getState().canUndo).toBe(false)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})

test('revocation aborts a pending cut worker and rejects late results and captured confirmations', async () => {
  const source = animatedScene()
  const editor = createDocumentEditorStore<MoldaSceneDocument>({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60000,
  })
  const worker = new DeferredCutWorker()
  let allowed = true
  let commits = 0
  const view = renderHook(
    () =>
      useSceneSolidCut(
        editor,
        (next) => {
          commits++
          editor.getState().commit(next)
          return true
        },
        () => worker,
      ),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <StrictMode>
          <MoldaToolAccessProvider access={{ allow: allowed ? ['model.cut'] : [] }}>
            {children}
          </MoldaToolAccessProvider>
        </StrictMode>
      ),
    },
  )
  try {
    act(() => view.result.current.start('body'))
    act(() => view.result.current.setNumericPlane({ origin: [0, 0, 0], normal: [1, 1, 0] }))
    expect(view.result.current.canConfirm).toBe(true)
    const confirm = view.result.current.confirm
    let pending: Promise<boolean> | undefined
    act(() => {
      pending = confirm()
    })
    expect(worker.request).not.toBeNull()
    allowed = false
    view.rerender()
    await act(async () => {
      expect(await pending).toBe(false)
    })
    expect(worker.stopped).toBe(true)
    expect(view.result.current.owner).toBeNull()
    expect(view.result.current.busy).toBe(false)
    await act(async () => {
      worker.finish()
      expect(await confirm()).toBe(false)
    })
    expect(commits).toBe(0)
    expect(editor.getState().content).toBe(source)
    allowed = true
    view.rerender()
    await act(async () => expect(await confirm()).toBe(false))
    expect(view.result.current.owner).toBeNull()
    act(() => view.result.current.start('body'))
    act(() => view.result.current.setNumericPlane({ origin: [0, 0, 0], normal: [1, 0, 0] }))
    await act(async () => expect(await confirm()).toBe(false))
    expect(commits).toBe(0)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})
