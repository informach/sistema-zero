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
  return {
    cancel,
    /**
     * Uma operação, ou várias em sequência na MESMA imagem (o balde com o espelho enche os dois
     * lados): todas no worker, um commit só, um passo de desfazer.
     */
    async run(
      source: MoldaSceneDocument,
      imageId: string,
      operation: SceneImageOperation | readonly SceneImageOperation[],
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
        const usage = sceneAppearanceUsage(source)
        const image = usage.index.images.get(imageId)
        requireScene(image, 'image', 'Essa imagem não existe mais.')
        requireEditableAppearance(usage, usage.images.get(imageId) ?? [])
        const palette = scenePalette(source)
        const operations = (
          Array.isArray(operation) ? operation : [operation]
        ) as readonly SceneImageOperation[]
        requireScene(operations.length > 0, 'operation', 'Nada para fazer na imagem.')
        const chosen = operations.map((entry) =>
          readSceneImageOperation(entry, image, palette.length),
        )
        if (chosen.some((entry) => entry.kind === 'rgba')) {
          requireScene(chosen.length === 1, 'operation', 'Converter a imagem vai sozinho.')
          if (image.encoding === 'rgba') return true
          requireScenePaintCapacity(source, image.width * image.height * image.layers.length * 3)
        }
        const controller = new AbortController()
        current = {
          controller,
          unsubscribe: editor.subscribe((state) => {
            if (state.contentRevision !== revision) cancel()
          }),
        }
        pending = current
        onState(true)
        let result = image
        for (const entry of chosen) {
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
        pending = null
        current.unsubscribe()
        if (result !== image)
          editor.getState().commit(
            finishSceneCommand({
              ...source,
              images: source.images.map((entry) => (entry === image ? result : entry)),
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
    },
  }
}
