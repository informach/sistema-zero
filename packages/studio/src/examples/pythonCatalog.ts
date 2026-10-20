import type { ExampleExperience } from '../core/example'
import type { PythonProjectCreationEnvironment } from '../core/freeProjectOptions'
import type { ProjectAsset } from '../core/projectAssets'
import type { StudioProjectFactoryContext } from '../core/projectFactory'
import type { PythonProjectDocument } from '../core/pythonProject'
import type { ExtensionExampleDifficulty } from '../extensions/types'
import { mazeLightsExample } from './python/mazeLights'
import { turtleRaceExample } from './python/turtleRace'

/** Metadata is independent of interpreter, source and media payloads. */
export interface PythonExampleEntry {
  programmingLanguage: 'python'
  key: string
  name: string
  description: string
  emoji: string
  experience: ExampleExperience
  difficulty?: ExtensionExampleDifficulty
  concepts?: readonly string[]
  genre?: string
  kind: 'pro'
  extensions: readonly { id: string; version: string }[]
  /** Exact release compatibility only; the host still authorizes creation separately. */
  requiredProvidedModules?: readonly { importName: string; version: string }[]
  load(): Promise<{
    files: Readonly<Record<string, string>>
    entrypoint: string
    assets?: readonly ProjectAsset[]
  }>
}

export interface PythonExampleCreationPort {
  environments: readonly PythonProjectCreationEnvironment[]
  signal?: AbortSignal
  prepare(selection: {
    kind: 'classic' | 'pro'
    environmentKey: string
  }): Promise<StudioProjectFactoryContext>
  /** Fresh owner/revision-bound preflight; never a reusable execution grant. */
  authorizeExample(project: PythonProjectDocument, signal: AbortSignal): Promise<void>
}

/** Product games enter only after payload, provenance and native QA qualification. */
export const PYTHON_EXAMPLE_SUMMARIES: readonly PythonExampleEntry[] = Object.freeze([
  turtleRaceExample,
  mazeLightsExample,
])
