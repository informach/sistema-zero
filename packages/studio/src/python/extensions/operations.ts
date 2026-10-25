import { resolveStudioProjectCapabilities } from '@sistemazero/core/studio/project-capabilities'
import { selectStudioRuntimeRelease } from '@sistemazero/core/studio/runtime-catalog'
import type { PythonProjectDocument } from '../../core/editableProject'
import type { StudioRuntimeEnvironment } from '../../runtime/environment'
import { TURTLE_EXTENSION } from '../../runtime/python/turtle/contract'
import type { ProjectStoreApi } from '../../state/projectStore'
import type { PythonAnalysisController } from '../language/controller'
import { PYTHON_CANVAS_EXTENSION_IDS, PYTHON_EXTENSIONS } from './catalog'

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
  if (
    PYTHON_CANVAS_EXTENSION_IDS.includes(extension.id) &&
    project.installedExtensions.some(
      (item) => item.id !== extension.id && PYTHON_CANVAS_EXTENSION_IDS.includes(item.id),
    )
  )
    return 'Turtle e Pygame Zero usam a mesma tela: remova a outra extensão antes de instalar esta.'
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
  analysis?: Pick<PythonAnalysisController, 'run'>
  assertCurrent?(): void
}): Promise<void> {
  const { store, expected, extension, action } = options
  const initialPolicy = options.policy()
  const initialAuthority = initialPolicy.environment?.authority?.getSnapshot()
  const removalPolicy = action === 'remove' ? initialPolicy : null
  let retired = false
  const unsubscribe =
    action === 'remove'
      ? store.subscribe((state) => {
          if (state.project !== expected || state.editingAccess !== 'author') retired = true
        })
      : () => {}
  function current() {
    options.assertCurrent?.()
    const latestPolicy = options.policy()
    if (
      initialAuthority &&
      (latestPolicy.environment !== initialPolicy.environment ||
        latestPolicy.environment?.authority?.getSnapshot() !== initialAuthority)
    )
      throw new Error('A autorização mudou. Tente novamente; seu código foi preservado.')
    if (retired || store.getState().project !== expected)
      throw new Error('O projeto mudou. Tente novamente.')
    if (store.getState().editingAccess !== 'author')
      throw new Error('Este projeto está em observação.')
    if (removalPolicy) {
      const policy = options.policy()
      if (
        policy.environment !== removalPolicy.environment ||
        policy.allowedIds !== removalPolicy.allowedIds ||
        policy.environment?.signal?.aborted
      )
        throw new Error('O contexto da análise mudou. Tente novamente; seu código foi preservado.')
      if (policy.allowedIds && !policy.allowedIds.includes(extension.id))
        throw new Error('Esta ferramenta não pode ser removida nesta tarefa.')
      if (policy.environment?.access(expected).releaseStatus === 'revoked')
        throw new Error('O ambiente da análise foi desativado. Seu código foi preservado.')
    }
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
    // Host policy callbacks may synchronously replace the project or its writer.
    if (
      retired ||
      (initialAuthority &&
        initialPolicy.environment?.authority?.getSnapshot() !== initialAuthority) ||
      store.getState().project !== expected ||
      store.getState().editingAccess !== 'author'
    )
      throw new Error('O projeto mudou. Tente novamente.')
  }
  try {
    current()
    const existing = expected.installedExtensions.find((item) => item.id === extension.id)
    if (action === 'install') {
      if (existing?.version === extension.version) return
      if (existing) throw new Error('Remova a versão instalada antes de escolher outra.')
    } else if (!existing) return
    if (action === 'remove' && extension.id === TURTLE_EXTENSION.id) {
      if (!options.analysis || !removalPolicy?.environment)
        throw new Error(
          'A análise Python não está disponível para conferir a remoção. Seu código foi preservado.',
        )
      const { inspectPythonTurtleRemoval, PythonExtensionInUseError } = await import(
        './removalReferences'
      )
      current()
      let references: Awaited<ReturnType<typeof inspectPythonTurtleRemoval>>
      try {
        references = await inspectPythonTurtleRemoval(expected, options.analysis, current)
      } catch (cause) {
        current()
        throw new Error(
          `Não foi possível concluir a análise de remoção de Turtle: ${cause instanceof Error ? cause.message : 'análise indisponível'}. Seu código e seus materiais foram preservados.`,
        )
      }
      current()
      if (references.length) throw new PythonExtensionInUseError(references)
    }
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
  } finally {
    unsubscribe()
  }
}
