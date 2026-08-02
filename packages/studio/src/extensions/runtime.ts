import type { ExtensionDefinition } from './types'

const loadedBootstrapScripts = new WeakMap<object, Promise<string>>()

/** Normaliza uma lista de ids na fronteira de execução, preservando a primeira ordem. */
export function uniqueExtensionIds(ids: readonly string[]): string[] {
  const seen = new Set<string>()
  const unique: string[] = []
  for (const id of ids) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    unique.push(id)
  }
  return unique
}

function uniqueExtensions(
  extensions: readonly ExtensionDefinition[],
): readonly ExtensionDefinition[] {
  const seen = new Set<string>()
  return extensions.filter((extension) => {
    const id = extension.manifest.id
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

/** Carrega e memoriza o bootstrap; falhas saem do cache para permitir retry real. */
export function loadExtensionBootstrapScript(extension: ExtensionDefinition): Promise<string> {
  const runtime = extension.runtime
  const cached = loadedBootstrapScripts.get(runtime)
  if (cached) return cached

  const pending = Promise.resolve()
    .then(() =>
      runtime.bootstrapScript !== undefined
        ? runtime.bootstrapScript
        : runtime.loadBootstrapScript(),
    )
    .then((source) => {
      if (typeof source !== 'string') {
        throw new TypeError(`O runtime da extensão ${extension.manifest.id} não devolveu texto.`)
      }
      return source
    })
    .catch((error: unknown) => {
      loadedBootstrapScripts.delete(runtime)
      throw error
    })

  loadedBootstrapScripts.set(runtime, pending)
  return pending
}

export async function loadExtensionBootstrapScripts(
  extensions: readonly ExtensionDefinition[],
): Promise<string[]> {
  return Promise.all(uniqueExtensions(extensions).map(loadExtensionBootstrapScript))
}
