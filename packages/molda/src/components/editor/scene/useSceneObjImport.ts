import { OBJ_IMPORT_COPY as copy } from '../../../core/objImportCopy'
import { ObjInputError } from '../../../import/objInput'
import { readObjLocalBundle } from '../../../import/objLocalBundle'
import { type ObjNativeOptions, readObjNativeOptions } from '../../../import/objNativeOptions'
import type { MoldaSceneDocument } from '../../../scene/document'
import type { EditorStore } from '../../../state/editorStore'
import { prepareObjImportInWorker } from '../../../workers/objImport'
import type { ObjImportResult } from '../../../workers/objImportProtocol'
import {
  type SceneFileImportAdapter,
  type SceneFileImportHost,
  useSceneFileImport,
} from './useSceneFileImport'

/** Explicit suggested choices, shown in the panel and reviewed; never inferred from a file's name. */
export const initialObjImportOptions = () =>
  readObjNativeOptions({
    appearance: {
      base: { rgbSpace: 'linear' },
      textures: { colorSpace: 'srgb', scalarSpace: 'linear' },
    },
    images: { colorAlpha: 'multiply', normalY: 'positive', doubleSided: true },
  })
type Options = ReturnType<typeof readObjNativeOptions>
type Ready = Extract<ObjImportResult, { status: 'ready' }>
const adapter: SceneFileImportAdapter<ObjNativeOptions, Options, Ready> = {
  initial: () => ({
    bundle: null,
    entryPath: null,
    options: initialObjImportOptions(),
    stage: { kind: 'choose' },
  }),
  cancelled: (view, message) => ({ ...view, stage: { kind: 'choose', message } }),
  readOptions: readObjNativeOptions,
  readBundle: readObjLocalBundle,
  prepare: prepareObjImportInWorker,
  describeError: (error) => (error instanceof ObjInputError ? error : null),
  messages: copy,
}
/** Local selection, preparation and consent are separate. No worker runs before Prepare. */
export function useSceneObjImport(
  editor: EditorStore<MoldaSceneDocument>,
  options: SceneFileImportHost = {},
) {
  return useSceneFileImport(editor, adapter, options)
}
