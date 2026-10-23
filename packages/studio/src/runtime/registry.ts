import {
  resolveStudioProjectCapabilities,
  type StudioCapabilityResolutionInput,
} from '@sistemazero/core/studio/project-capabilities'
import type { StudioProjectDocument } from '@sistemazero/core/studio/project-document'
import {
  StudioCatalogIdSchema,
  type StudioProjectKind,
  StudioProjectKindSchema,
  type StudioProjectLanguage,
  StudioProjectLanguageSchema,
} from '@sistemazero/core/studio/project-environment'
import {
  type StudioProjectCapability,
  type StudioRuntimeCatalog,
  selectStudioRuntimeRelease,
} from '@sistemazero/core/studio/runtime-catalog'
import { type StudioRuntimeProvider, StudioRuntimeUnavailableError } from './types'

export interface StudioRuntimeRegistration {
  id: string
  profileId: string
  programmingLanguage: StudioProjectLanguage
  kinds: readonly StudioProjectKind[]
  load(): Promise<StudioRuntimeProvider>
}

export interface StudioRuntimeLoadInput {
  project: StudioProjectDocument
  catalog: StudioRuntimeCatalog
  access: Omit<StudioCapabilityResolutionInput, 'project' | 'profile' | 'release'>
  signal: AbortSignal
}

/** Synchronous authority check, also used immediately before a runtime command is dispatched. */
export function assertStudioRuntimeOperationAccess(
  { project, catalog, access }: Omit<StudioRuntimeLoadInput, 'signal'>,
  capability: StudioProjectCapability,
): void {
  const release = selectStudioRuntimeRelease(catalog, project.runtime)
  const profile = catalog.profiles.find((item) => item.id === project.runtime.profileId)
  if (!release || !profile)
    throw new StudioRuntimeUnavailableError(
      'runtime-not-approved',
      'O ambiente deste projeto não pertence ao catálogo aprovado.',
    )
  const resolved = resolveStudioProjectCapabilities({
    ...access,
    profile,
    release,
    project: {
      programmingLanguage: project.programmingLanguage,
      kind: project.kind,
      runtime: project.runtime,
      installedExtensions: project.installedExtensions.map(({ id, version }) => ({ id, version })),
    },
  })
  const execution = resolved.operations.find((operation) => operation.capability === capability)
  if (!resolved.valid || !resolved.modes.includes(project.mode) || execution?.state !== 'available')
    throw new StudioRuntimeUnavailableError(
      execution?.reasonCode ?? 'execution-unavailable',
      capability === 'python-repl'
        ? 'O console Python não está disponível neste ambiente.'
        : 'A execução não está disponível neste ambiente.',
    )
}

export function assertStudioRuntimeExecutionAccess(
  input: Omit<StudioRuntimeLoadInput, 'signal'>,
): void {
  assertStudioRuntimeOperationAccess(input, 'execute')
}

/** Abort only this caller's wait; another editor may still need the same module. */
function waitForProvider(
  promise: Promise<StudioRuntimeProvider>,
  signal: AbortSignal,
): Promise<StudioRuntimeProvider> {
  if (signal.aborted)
    return Promise.reject(signal.reason ?? new DOMException('Execução cancelada.', 'AbortError'))
  return new Promise((resolve, reject) => {
    const aborted = () =>
      reject(signal.reason ?? new DOMException('Execução cancelada.', 'AbortError'))
    signal.addEventListener('abort', aborted, { once: true })
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', aborted))
  })
}

/** Pure routing plus lazy module loading. No runtime, editor or renderer is imported here. */
export function createStudioRuntimeRegistry(registrations: readonly StudioRuntimeRegistration[]) {
  const entries = registrations.map((registration) => ({
    id: StudioCatalogIdSchema.parse(registration.id),
    profileId: StudioCatalogIdSchema.parse(registration.profileId),
    programmingLanguage: StudioProjectLanguageSchema.parse(registration.programmingLanguage),
    kinds: registration.kinds.map((kind) => StudioProjectKindSchema.parse(kind)),
    load: registration.load,
  }))
  const routes = new Set<string>()
  const ids = new Set<string>()
  for (const entry of entries) {
    if (ids.has(entry.id) || !entry.kinds.length || typeof entry.load !== 'function')
      throw new Error('Registro de ambiente inválido ou repetido.')
    ids.add(entry.id)
    for (const kind of entry.kinds) {
      const route = `${entry.profileId}/${entry.programmingLanguage}/${kind}`
      if (routes.has(route))
        throw new Error('Há dois provedores para o mesmo ambiente e tipo de projeto.')
      routes.add(route)
    }
  }
  const pending = new Map<string, Promise<StudioRuntimeProvider>>()
  return {
    async load({
      project,
      catalog,
      access,
      signal,
    }: StudioRuntimeLoadInput): Promise<StudioRuntimeProvider> {
      if (signal.aborted)
        throw signal.reason ?? new DOMException('Execução cancelada.', 'AbortError')
      assertStudioRuntimeExecutionAccess({ project, catalog, access })
      const entry = entries.find(
        (item) =>
          item.profileId === project.runtime.profileId &&
          item.programmingLanguage === project.programmingLanguage &&
          item.kinds.includes(project.kind),
      )
      if (!entry)
        throw new StudioRuntimeUnavailableError(
          'runtime-provider-missing',
          'Este ambiente ainda não tem um executor disponível.',
        )
      let loading = pending.get(entry.id)
      if (!loading) {
        loading = Promise.resolve()
          .then(entry.load)
          .then((provider) => {
            if (provider?.id !== entry.id || typeof provider.prepare !== 'function')
              throw new Error('O módulo não corresponde ao provedor registrado.')
            return provider
          })
          .catch((cause: unknown) => {
            pending.delete(entry.id)
            throw new StudioRuntimeUnavailableError(
              'runtime-module-failed',
              'Não foi possível carregar o ambiente. Tente novamente.',
              { cause },
            )
          })
        pending.set(entry.id, loading)
      }
      return waitForProvider(loading, signal)
    },
  }
}

export type StudioRuntimeRegistry = ReturnType<typeof createStudioRuntimeRegistry>
