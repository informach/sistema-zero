/**
 * Same documents, browser and gestures for two production builds. Frame intervals
 * include the headless browser/automation; CPU confirmation excludes React and GPU.
 * bun scripts/profile-workshop.ts <baseline-package> <baseline-url> <current-url>
 */
import { deepStrictEqual } from 'node:assert'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { COPY } from '../src/core/copy'
import type { ModelSceneNode, MoldaSceneDocument } from '../src/scene/document'
import { sceneToJson } from '../src/scene/documentJson'
import { identityMatrix } from '../src/scene/matrix'
import { animatedScene } from '../src/testing/sceneAnimation'

const [baselineRoot, baselineURL, currentURL] = process.argv.slice(2)
if (!baselineRoot || !baselineURL || !currentURL) throw new Error('Expected root and two URLs')
const variants = [
  { label: 'baseline', root: resolve(baselineRoot), url: baselineURL },
  { label: 'current', root: resolve(import.meta.dir, '..'), url: currentURL },
]
const stats = (values: number[]) => {
  values.sort((a, b) => a - b)
  return {
    samples: values.length,
    p50: +values[Math.ceil(values.length * 0.5) - 1]!.toFixed(3),
    p95: +values[Math.ceil(values.length * 0.95) - 1]!.toFixed(3),
  }
}
function fixture(count: number): MoldaSceneDocument {
  const source = animatedScene()
  const body = source.nodes.find((node) => node.kind === 'mesh')!
  return {
    ...source,
    name: `Perfil ${count}`,
    animations: [],
    mirrors: [],
    nodes: Array.from(
      { length: count },
      (_, i): ModelSceneNode => ({
        ...body,
        id: `part-${i}`,
        name: `Peça ${i}`,
        parentId: null,
        transform: {
          kind: 'trs',
          translation: [(i % 16) * 8, 0, Math.floor(i / 16) * 8],
          rotation: [0, 0, 0, 1],
          scale: [1, 1, 1],
        },
      }),
    ),
  }
}
const requests = []
for (const count of [4, 128]) {
  const source = fixture(count)
  const native = JSON.stringify(sceneToJson(source))
  const hash = new Bun.CryptoHasher('sha256').update(native).digest('hex')
  for (const variant of variants) {
    console.error(`${variant.label}, ${count} parts: CPU gesture`)
    const moduleAt = (file: string) => import(pathToFileURL(resolve(variant.root, file)).href)
    const { structuredBytes } = await moduleAt('src/core/structuredBytes.ts')
    const { createDocumentEditorStore } = await moduleAt('src/state/editorStore.ts')
    const { createSceneTransformGesture } = await moduleAt('src/state/sceneTransformGesture.ts')
    const confirmed: number[] = [],
      cancelled: number[] = [],
      previews: number[] = []
    for (let i = 0; i < 80; i++) {
      const editor = createDocumentEditorStore({
        asset: source,
        sizeOf: structuredBytes,
        persistence: { save: async () => {} },
        autosaveMs: 60_000,
      })
      try {
        const gesture = createSceneTransformGesture(editor, (error: unknown) => {
          throw error
        })
        if (!gesture.begin(source.nodes.map((node) => node.id))) throw new Error('Begin rejected')
        const delta = identityMatrix()
        delta[12] = 2
        const start = performance.now()
        if (!gesture.preview(delta)) throw new Error('Preview rejected')
        const end = performance.now()
        const commit = i % 2 === 0
        gesture.end(commit)
        const elapsed = performance.now() - end
        if (i >= 20) {
          previews.push(end - start)
          ;(commit ? confirmed : cancelled).push(elapsed)
        }
        if (commit) {
          if (!editor.getState().canUndo) throw new Error('Missing history')
          editor.getState().undo()
        }
        deepStrictEqual({ ...editor.getState().asset, updatedAt: source.updatedAt }, source)
        if (editor.getState().canUndo) throw new Error('Gesture left an extra undo step')
      } finally {
        editor.getState().dispose()
      }
    }
    requests.push({
      url: variant.url,
      name: source.name,
      native,
      viewportLabel: COPY.scene.viewport,
      result: {
        variant: variant.label,
        parts: count,
        documentSha256: hash,
        cpuPreviewMs: stats(previews),
        cpuConfirmMs: stats(confirmed),
        cpuCancelMs: stats(cancelled),
      },
    })
  }
}
// Playwright's browser driver runs on Node, as it does in the test CLI; Bun owns
// the source-module CPU comparison. Pass structured input without a shell.
const child = spawnSync('node', [resolve(import.meta.dir, 'profile-workshop-browser.mjs')], {
  input: JSON.stringify(requests),
  stdio: ['pipe', 'inherit', 'inherit'],
})
if (child.error) throw child.error
if (child.status !== 0) throw new Error(`Browser profiling failed: ${child.status}`)
