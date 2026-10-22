import type { StudioPythonRuntimeFeature } from '@sistemazero/core/studio/python-runtime-features'
import type { ExampleExperience } from '../core/example'
import type { PythonProjectCreationEnvironment } from '../core/freeProjectOptions'
import type { ProjectAsset } from '../core/projectAssets'
import type { StudioProjectFactoryContext } from '../core/projectFactory'
import type { PythonProjectDocument } from '../core/pythonProject'
import type { ExtensionExampleDifficulty } from '../extensions/types'
import { mazeLightsExample } from './python/mazeLights'
import { turtleRaceExample } from './python/turtleRace'
import { VISUAL_REFERENCE_GAME_EXAMPLES } from './python/visualReferenceGames'

/** Metadata is independent of interpreter, source and media payloads. */
interface PythonExampleMetadata {
  programmingLanguage: 'python'
  key: string
  name: string
  description: string
  emoji: string
  experience: ExampleExperience
  difficulty?: ExtensionExampleDifficulty
  concepts?: readonly string[]
  genre?: string
  extensions: readonly { id: string; version: string }[]
  /** Exact release compatibility only; the host still authorizes creation separately. */
  requiredProvidedModules?: readonly { importName: string; version: string }[]
  requiredPythonFeatures?: readonly StudioPythonRuntimeFeature[]
  /** Classic examples declare every required editable block; Pro source does not require a palette. */
  requiredBlockIds?: readonly string[]
  load(): Promise<{
    files: Readonly<Record<string, string>>
    entrypoint: string
    assets?: readonly ProjectAsset[]
  }>
}

export type PythonExampleEntry = PythonExampleMetadata &
  ({ kind: 'pro'; mode?: 'code' } | { kind: 'classic'; mode: 'blocks' | 'bridge' })

export interface PythonExampleCreationPort {
  environments: readonly PythonProjectCreationEnvironment[]
  signal?: AbortSignal
  prepare(selection: {
    kind: 'classic' | 'pro'
    environmentKey: string
  }): Promise<StudioProjectFactoryContext>
  /** Fresh owner/revision-bound preflight; never a reusable execution grant. */
  authorizeExample(
    project: PythonProjectDocument,
    signal: AbortSignal,
    requirements?: {
      requiredBlockIds: readonly string[]
      requiredModes: readonly ('blocks' | 'bridge' | 'code')[]
    },
  ): Promise<void>
}

/** Product games enter only after payload, provenance and native QA qualification. */
export const PYTHON_EXAMPLE_SUMMARIES: readonly PythonExampleEntry[] = Object.freeze([
  turtleRaceExample,
  mazeLightsExample,
  ...VISUAL_REFERENCE_GAME_EXAMPLES,
])
