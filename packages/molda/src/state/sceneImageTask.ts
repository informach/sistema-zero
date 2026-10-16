import { requireScenePaintCapacity } from '../scene/appearanceCommands'
import { requireEditableAppearance, sceneAppearanceUsage } from '../scene/appearanceUsage'
import { finishSceneCommand } from '../scene/commandContext'
import { scenePalette } from '../scene/composite'
import type { MoldaSceneDocument } from '../scene/document'
import { sameSceneContent } from '../scene/documentContent'
import { readSceneImageOperation, type SceneImageOperation } from '../scene/imageOperations'
import { requireScene } from '../scene/validation'
import { operateImageInWorker } from '../workers/sceneImage'
import type { EditorStore } from './editorStore'

/** A command owns one source revision and worker. Nothing is previewed or saved until it succeeds. */
export function createSceneImageTask(
  editor: EditorStore<MoldaSceneDocument>,
  onState: (busy: boolean, error?: unknown) => void,
) {
  let pending: { controller: AbortController; unsubscribe(): void } | null = null
  function cancel(notify = true) {
    const current = pending
    pending = null
    current?.unsubscribe()
    current?.controller.abort()
    if (notify) onState(false)
  }
  async function runBatch(
    source: MoldaSceneDocument,
    requests: readonly { imageId: string; operations: readonly SceneImageOperation[] }[],
    prepared: MoldaSceneDocument = source,
  ) {
    cancel()
    let current: NonNullable<typeof pending> | null = null
    try {
      const state = editor.getState()
      requireScene(
        sameSceneContent(state.asset, source),
        'revision',
        'A criação mudou. Confira a imagem novamente.',
      )
      const revision = state.contentRevision
      const usage = sceneAppearanceUsage(prepared)
      const palette = scenePalette(prepared)
      requireScene(requests.length > 0, 'operation', 'Nada para fazer na imagem.')
      let extraBytes = 0
      const chosen = requests.map(({ imageId, operations }) => {
        const image = usage.index.images.get(imageId)
        requireScene(image, 'image', 'Essa imagem não existe mais.')
        requireEditableAppearance(usage, usage.images.get(imageId) ?? [])
        requireScene(operations.length > 0, 'operation', 'Nada para fazer na imagem.')
        const steps = operations.map((entry) =>
          readSceneImageOperation(entry, image, palette.length),
        )
        if (steps.some((entry) => entry.kind === 'rgba')) {
          requireScene(steps.length === 1, 'operation', 'Converter a imagem vai sozinho.')
          if (image.encoding !== 'rgba')
            extraBytes += image.width * image.height * image.layers.length * 3
        }
        return { image, steps }
      })
      requireScenePaintCapacity(prepared, extraBytes)
      const controller = new AbortController()
      current = {
        controller,
        unsubscribe: editor.subscribe((state) => {
          if (state.contentRevision !== revision) cancel()
        }),
      }
      pending = current
      onState(true)
      const results = new Map<string, (typeof prepared.images)[number]>()
      for (const { image, steps } of chosen) {
        let result = results.get(image.id) ?? image
        for (const entry of steps) {
          if (entry.kind === 'rgba' && result.encoding === 'rgba') continue
          result = await operateImageInWorker(
            { documentId: source.id, revision, image: result, palette, operation: entry },
            controller.signal,
          )
          if (
            pending !== current ||
            controller.signal.aborted ||
            editor.getState().contentRevision !== revision
          )
            return false
        }
        results.set(image.id, result)
      }
      pending = null
      current.unsubscribe()
      if (chosen.some(({ image }) => results.get(image.id) !== image) || prepared !== source)
        editor.getState().commit(
          finishSceneCommand({
            ...prepared,
            images: prepared.images.map((entry) => results.get(entry.id) ?? entry),
          }),
        )
      onState(false)
      return true
    } catch (error) {
      if (current?.controller.signal.aborted) return false
      cancel(false)
      onState(false, error)
      return false
    }
  }
  return {
    cancel,
    runBatch,
    run(
      source: MoldaSceneDocument,
      imageId: string,
      operation: SceneImageOperation | readonly SceneImageOperation[],
      prepared = source,
    ) {
      const operations = 'kind' in operation ? [operation] : operation
      return runBatch(source, [{ imageId, operations }], prepared)
    },
  }
}
