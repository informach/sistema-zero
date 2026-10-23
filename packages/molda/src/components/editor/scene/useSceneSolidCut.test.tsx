import { expect, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { type ReactNode, StrictMode } from 'react'
import { structuredBytes } from '../../../core/structuredBytes'
import type { MoldaSceneDocument } from '../../../scene/document'
import { splitSceneSolid } from '../../../scene/solidCut'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { animatedScene } from '../../../testing/sceneAnimation'
import { packSceneMesh } from '../../../workers/sceneMeshPacket'
import { readSolidCutRequest, type SolidCutRequest } from '../../../workers/sceneSolidCutProtocol'
import type { TaskWorker } from '../../../workers/workerTask'
import { MoldaToolAccessProvider } from '../../toolAccess'
import { useSceneSolidCut } from './useSceneSolidCut'

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
