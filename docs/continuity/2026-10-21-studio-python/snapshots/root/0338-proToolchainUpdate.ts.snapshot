import { resolveStudioProRemoteDependencies } from '@sistemazero/core/studio/pro-dependencies'
import { studioProDigest } from '@sistemazero/core/studio/pro-revision'
import { javaScriptProject } from '../core/editableProject'
import type { Project } from '../core/project'
import { updateLegacyProToolchainManifest } from '../core/proToolchain'
import { flushProjectOperations, projectPersistence } from './projectOperations'
import { captureProjectStorageScope } from './projectStorageRuntime'
import type { ProjectStoreApi } from './projectStore'
import { applyProEditorChange, captureProRevision } from './proRevision'

export type PrepareProDependencies = (input: {
  project: Project
  packageJson: string
  signal: AbortSignal
}) => Promise<string>

/** Prepare first, then publish the two dependency files in the existing reversible CAS transaction. */
export async function updateProToolchainBeforeExecution(
  store: ProjectStoreApi,
  prepare: PrepareProDependencies | undefined,
  signal: AbortSignal,
  beforeCommit?: () => void,
  onApplied?: () => void,
) {
  signal.throwIfAborted()
  const entry = store.getState().project
  if (!entry) return null
  const scope = captureProjectStorageScope(),
    adapter = projectPersistence(store)
  const ownedSignal = scope.signal ? AbortSignal.any([signal, scope.signal]) : signal
  const current = () => {
    ownedSignal.throwIfAborted()
    if (store.getState().editingAccess !== 'author')
      throw new Error('Este projeto está em observação.')
    if (
      store.getState().project !== entry ||
      projectPersistence(store) !== adapter ||
      captureProjectStorageScope() !== scope
    )
      throw new Error(
        'O projeto ou perfil mudou durante a atualização. Seus arquivos foram preservados.',
      )
    beforeCommit?.()
  }
  current()
  await flushProjectOperations(store, entry.id)
  current()
  const project = javaScriptProject(entry)
  if (project?.kind !== 'pro' || !project.tree) return null
  const manifest = project.tree['package.json']
  if (manifest?.kind !== 'file') return null
  const packageJson = updateLegacyProToolchainManifest(manifest.content)
  if (packageJson === null) return null
  if (!prepare)
    throw new Error(
      'Este ambiente precisa preparar a atualização do Vite antes de executar. Seu projeto continua disponível para abrir e exportar.',
    )
  const base = await captureProRevision(project)
  current()
  const packageLock = await prepare({ project, packageJson, signal: ownedSignal })
  current()
  resolveStudioProRemoteDependencies(packageJson, packageLock)
  const previousLock = project.tree['package-lock.json']
  if (previousLock && previousLock.kind !== 'file')
    throw new Error('O caminho package-lock.json já é uma pasta. Seus arquivos foram preservados.')
  const receipt = await applyProEditorChange(
    store,
    project.id,
    {
      operationId: `editor:toolchain:${crypto.randomUUID()}`,
      change: {
        baseHash: base.hash,
        summary: 'Atualizar a versão segura do Vite e seu lock',
        patches: [
          {
            path: 'package.json',
            before: await studioProDigest(manifest.content),
            content: packageJson,
          },
          {
            path: 'package-lock.json',
            before: previousLock ? await studioProDigest(previousLock.content) : null,
            content: packageLock,
          },
        ],
      },
    },
    onApplied,
    current,
  )
  return receipt
}
