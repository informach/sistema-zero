import { ExtensionDocsSchema } from './manifest'
import type { ExtensionDefinition, ExtensionDocumentationProvider } from './types'

const loadedDocs = new WeakMap<ExtensionDefinition, Promise<string>>()

/** Declara um manual completo que vive em um chunk sob demanda. */
export function defineExtensionDocumentation(
  load: () => Promise<string>,
): ExtensionDocumentationProvider {
  return Object.freeze({ load })
}

/**
 * Carrega, valida e memoriza o manual completo. Falhas saem do cache para o
 * painel poder tentar novamente; extensões pequenas usam o resumo diretamente.
 */
export function loadExtensionDocs(extension: ExtensionDefinition): Promise<string> {
  const provider = extension.documentation
  if (!provider) return Promise.resolve(extension.manifest.docs)

  const cached = loadedDocs.get(extension)
  if (cached) return cached

  const pending = Promise.resolve()
    .then(() => provider.load())
    .then((docs) => ExtensionDocsSchema.parse(docs))
    .catch((error: unknown) => {
      loadedDocs.delete(extension)
      throw error
    })

  loadedDocs.set(extension, pending)
  return pending
}
