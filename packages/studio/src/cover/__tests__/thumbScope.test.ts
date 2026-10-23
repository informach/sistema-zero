import 'fake-indexeddb/auto'
import { afterEach, expect, test } from 'bun:test'
import { createStudioRuntimeCapture } from '../../runtime/capture'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { loadProjectThumb, persistProject } from '../../state/persistence'
import {
  captureProjectStorageScope,
  getProjectStorageScope,
  setProjectStorageNamespace,
} from '../../state/projectStorageRuntime'
import { captureAndStoreProjectThumb, storeChosenCoverThumb } from '../thumbCapture'

const createElement = document.createElement.bind(document)
const originalImage = globalThis.Image
const originalScope = captureProjectStorageScope()
const png =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aUioAAAAASUVORK5CYII='
const jpeg = 'data:image/jpeg;base64,AAAA'
afterEach(() => {
  document.createElement = createElement
  globalThis.Image = originalImage
  setProjectStorageNamespace(originalScope.namespace)
})

for (const mode of ['runtime', 'chosen'] as const)
  test(`${mode}: changing profile during capture never writes the cover into another profile`, async () => {
    const { project } = await pythonEnvironmentFixture('classic')
    const source =
      mode === 'chosen'
        ? {
            ...project,
            assets: [
              {
                id: 'cover',
                name: 'capa',
                kind: 'image' as const,
                source: 'upload' as const,
                dataUrl: png,
              },
            ],
            coverAssetName: 'capa',
          }
        : project
    const a = getProjectStorageScope(`thumb-a-${crypto.randomUUID()}`)
    const b = getProjectStorageScope(`thumb-b-${crypto.randomUUID()}`)
    await persistProject(source, {}, a)
    await persistProject(structuredClone(source), {}, b)
    let release!: () => void
    let entered!: () => void
    const enteredCapture = new Promise<void>((resolve) => {
      entered = resolve
    })
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    document.createElement = ((tag: string) =>
      tag === 'canvas'
        ? {
            width: 0,
            height: 0,
            getContext: () => ({ fillStyle: '', fillRect() {}, drawImage() {} }),
            toDataURL: () => jpeg,
          }
        : createElement(tag)) as typeof document.createElement
    globalThis.Image = class {
      width = 1
      height = 1
      onload?: () => void
      set src(_value: string) {
        if (mode === 'chosen') {
          entered()
          void gate.then(() => this.onload?.())
        } else queueMicrotask(() => this.onload?.())
      }
    } as unknown as typeof Image
    const cache = createStudioRuntimeCapture()
    const runtimeCapture = {
      ...cache,
      capture: async () => {
        entered()
        await gate
        return png
      },
    }
    setProjectStorageNamespace(a.namespace)
    const pending =
      mode === 'runtime'
        ? captureAndStoreProjectThumb(source, runtimeCapture)
        : storeChosenCoverThumb(source)
    await enteredCapture
    setProjectStorageNamespace(b.namespace)
    release()
    expect(await pending).toBe(true)
    expect(await loadProjectThumb(source.id, a)).toBe(jpeg)
    expect(await loadProjectThumb(source.id, b)).toBeNull()
  })
