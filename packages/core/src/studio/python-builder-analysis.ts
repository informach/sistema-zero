import type { StudioProRevision } from './pro-revision'
import {
  applyPythonLanguagePatch,
  isPythonLanguageSourcePath,
  parsePythonLanguageCommand,
} from './python-language'

/** Shared admission at execution and receipt acceptance. Never analyze a partial workspace. */
export function prepareStudioPythonBuilderAnalysis(base: StudioProRevision) {
  if (
    base.version !== 2 ||
    base.configuration.programmingLanguage !== 'python' ||
    Object.keys(base.files).some(
      (path) => /\.pyi?$/.test(path) && !isPythonLanguageSourcePath(path),
    )
  )
    throw new Error('Este projeto não cabe no perfil de análise Python.')
  const entrypoint = base.configuration.python.entrypoint
  const command = parsePythonLanguageCommand({
    version: 1,
    id: 'builder_sync',
    kind: 'sync',
    entrypoint,
    baseRevision: 0,
    revision: 1,
    changes: Object.entries(base.files)
      .filter(([path]) => isPythonLanguageSourcePath(path))
      .map(([path, source]) => ({ path, version: 1, source })),
  })
  if (command.kind !== 'sync') throw new Error('Sincronização Python inválida.')
  const { snapshot } = applyPythonLanguagePatch({ revision: 0, files: {} }, new Map(), command)
  if (!Object.hasOwn(snapshot.files, entrypoint))
    throw new Error('A análise exige o arquivo inicial Python.')
  return { entrypoint, command, snapshot }
}
