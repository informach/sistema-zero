import { BBMODEL_IMPORT_COPY as copy } from '../../../core/bbmodelImportCopy'
import { BbmodelInputError } from '../../../import/bbmodelInput'
import { readBbmodelLocalBundle } from '../../../import/bbmodelLocalBundle'
import {
  type BbmodelNativeOptions,
  readBbmodelNativeOptions,
} from '../../../import/bbmodelNativeOptions'
import type { MoldaSceneDocument } from '../../../scene/document'
import type { EditorStore } from '../../../state/editorStore'
import { prepareBbmodelImportInWorker } from '../../../workers/bbmodelImport'
import type { BbmodelImportResult } from '../../../workers/bbmodelImportProtocol'
import {
  type SceneFileImportAdapter,
  type SceneFileImportHost,
  useSceneFileImport,
} from './useSceneFileImport'

/** Visible suggested appearance choices; no default omissions or guessed source metadata. */
export const initialBbmodelImportOptions = () =>
  readBbmodelNativeOptions({
    sourcePreference: 'prefer-embedded',
    surfaces: { normals: 'molda-flat' },
    textureMaterials: { lighting: 'molda-standard', autoSides: 'double' },
    nodeMaterials: { untextured: 'uniform', color: [1, 1, 1, 1], doubleSided: true },
    // Inactive until the user explicitly chooses “Trazer e adaptar”. No default omissions.
    clips: { adaptation: 'continuous-sampled' },
  })
type Options = ReturnType<typeof readBbmodelNativeOptions>
type Ready = Extract<BbmodelImportResult, { status: 'ready' }>
const adapter: SceneFileImportAdapter<BbmodelNativeOptions, Options, Ready> = {
  initial: () => ({
    bundle: null,
    entryPath: null,
    options: initialBbmodelImportOptions(),
    stage: { kind: 'choose' },
  }),
  cancelled: (view, message) => ({ ...view, stage: { kind: 'choose', message } }),
  readOptions: readBbmodelNativeOptions,
  readBundle: readBbmodelLocalBundle,
  prepare: prepareBbmodelImportInWorker,
  describeError: (error) => (error instanceof BbmodelInputError ? error : null),
  messages: copy,
}
export function useSceneBbmodelImport(
  editor: EditorStore<MoldaSceneDocument>,
  host: SceneFileImportHost = {},
) {
  return useSceneFileImport(editor, adapter, host)
}
