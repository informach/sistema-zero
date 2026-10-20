import type * as Studio from '@sistemazero/studio'

export type StudioProModule = typeof Studio
export type StudioProModuleLoader = () => Promise<StudioProModule>
export type StudioProModuleLoadResult =
  | { module: StudioProModule }
  | { module: null; error: unknown }

/** Reconcile before reading; never load into a profile whose opening was cancelled. */
export async function loadPreparedStudioProProject(options: {
  module: Pick<StudioProModule, 'setStudioStorageNamespace' | 'createLocalPersistenceAdapter'>
  namespace: string
  projectId: string
  prepare?: () => Promise<void>
  active: () => boolean
  signal?: AbortSignal
  onOpening?: (opening: {
    release: () => void
    persistence: Studio.StudioPersistenceAdapter
  }) => void
}) {
  const current = () => options.active() && !options.signal?.aborted
  if (!current()) return null
  options.module.setStudioStorageNamespace(options.namespace)
  // The adapter captures its namespace before asynchronous reconciliation.
  const persistence = options.module.createLocalPersistenceAdapter({ namespace: options.namespace })
  const release =
    persistence.beginOpening?.(options.projectId, { signal: options.signal }) ?? (() => {})
  let transferred = false
  try {
    options.onOpening?.({ release, persistence })
    await options.prepare?.()
    if (!current()) return null
    const project = await persistence.load(options.projectId)
    transferred = current() && project !== null && options.onOpening !== undefined
    return current() ? project : null
  } finally {
    if (!transferred) release()
  }
}

/**
 * Carrega o chunk pesado do editor Pro sem deixar uma falha transitória de rede
 * como rejeição não tratada. A tela chama novamente esta função no retry.
 */
export async function loadStudioProModule(
  loader: StudioProModuleLoader = () => import('@sistemazero/studio'),
): Promise<StudioProModuleLoadResult> {
  try {
    return { module: await loader() }
  } catch (error) {
    return { module: null, error }
  }
}
