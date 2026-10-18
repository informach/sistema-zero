import { resolveStudioProjectCapabilities } from '@sistemazero/core/studio/project-capabilities'
import { selectStudioRuntimeRelease } from '@sistemazero/core/studio/runtime-catalog'
import type { PythonProjectDocument } from '../../core/editableProject'
import type { StudioRuntimeEnvironment } from '../../runtime/environment'
import type { ProjectStoreApi } from '../../state/projectStore'
import { PYTHON_EXTENSIONS } from './catalog'

export function pythonExtensionInstallIssue(
  project: PythonProjectDocument,
  environment: StudioRuntimeEnvironment | null,
  extension: { id: string; version: string },
  allowedIds?: readonly string[],
): string | null {
  if (
    !PYTHON_EXTENSIONS.some(
      (item) => item.id === extension.id && item.version === extension.version,
    )
  )
    return 'Esta extensão Python ainda não está disponível.'
  if (!environment) return 'O ambiente Python ainda não está disponível nesta página.'
  if (allowedIds && !allowedIds.includes(extension.id))
    return 'Esta ferramenta não está liberada nesta tarefa.'
  const release = selectStudioRuntimeRelease(environment.catalog, project.runtime)
  const profile = environment.catalog.profiles.find((item) => item.id === project.runtime.profileId)
  if (!release || !profile) return 'O ambiente deste projeto não está no catálogo aprovado.'
  const access = environment.access(project)
  if (access.releaseStatus !== 'active')
    return 'Esta versão do ambiente não aceita novas extensões.'
  const installedExtensions = project.installedExtensions
    .filter((item) => item.id !== extension.id)
    .map(({ id, version }) => ({ id, version }))
  const resolved = resolveStudioProjectCapabilities({
    ...access,
    project: {
      programmingLanguage: 'python',
      kind: project.kind,
      runtime: project.runtime,
      installedExtensions: [
        ...installedExtensions,
        { id: extension.id, version: extension.version },
      ],
    },
    profile,
    release,
  })
  return resolved.valid &&
    resolved.extensionIds.includes(extension.id) &&
    resolved.operations.some(
      (operation) => operation.capability === 'edit' && operation.state === 'available',
    )
    ? null
    : 'Esta extensão não está liberada para este projeto.'
}

/** Re-check authority at the action boundary; never delete or rewrite learner source. */
export async function changePythonExtension(options: {
  store: ProjectStoreApi
  expected: PythonProjectDocument
  policy(): { environment: StudioRuntimeEnvironment | null; allowedIds?: readonly string[] }
  extension: { id: string; version: string }
  action: 'install' | 'remove'
}): Promise<void> {
  const { store, expected, extension, action } = options
  function current() {
    if (store.getState().project !== expected) throw new Error('O projeto mudou. Tente novamente.')
    if (store.getState().editingAccess !== 'author')
      throw new Error('Este projeto está em observação.')
    if (action === 'install') {
      const policy = options.policy()
      const issue = pythonExtensionInstallIssue(
        expected,
        policy.environment,
        extension,
        policy.allowedIds,
      )
      if (issue) throw new Error(issue)
    }
  }
  current()
  const existing = expected.installedExtensions.find((item) => item.id === extension.id)
  if (action === 'install') {
    if (existing?.version === extension.version) return
    if (existing) throw new Error('Remova a versão instalada antes de escolher outra.')
  } else if (!existing) return
  const extensions =
    action === 'install'
      ? [
          ...expected.installedExtensions,
          { id: extension.id, version: extension.version, installedAt: Date.now() },
        ]
      : expected.installedExtensions.filter((item) => item.id !== extension.id)
  if (expected.kind === 'pro') {
    const { captureProRevision, applyProEditorChange } = await import('../../state/proRevision')
    const before = await captureProRevision(expected)
    current()
    if (before.version !== 2 || before.configuration.programmingLanguage !== 'python')
      throw new Error('Configuração Python inválida.')
    await applyProEditorChange(
      store,
      expected.id,
      {
        operationId: crypto.randomUUID(),
        change: {
          baseHash: before.hash,
          summary: `${action === 'install' ? 'Instalar' : 'Remover'} extensão ${extension.id}`,
          patches: [],
          configuration: {
            before: before.configuration,
            after: {
              ...before.configuration,
              extensions: extensions.map(({ id, version }) => ({ id, version })),
            },
          },
        },
      },
      undefined,
      current,
    )
  } else {
    const issue = await store.getState().applyPythonExtensions(expected, extensions, current)
    if (issue) throw new Error(issue)
  }
}
