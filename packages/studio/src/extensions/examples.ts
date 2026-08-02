import { ExtensionExamplesSchema, MAX_EXTENSION_EXAMPLES } from './manifest'
import type { ExtensionDefinition, ExtensionExample, ExtensionExamplesProvider } from './types'

const loadedExamples = new WeakMap<ExtensionDefinition, Promise<readonly ExtensionExample[]>>()

/** Declara um catálogo lazy com contagem leve disponível no carregamento inicial. */
export function defineExtensionExamples(
  count: number,
  load: () => Promise<readonly ExtensionExample[]>,
): ExtensionExamplesProvider {
  if (!Number.isSafeInteger(count) || count < 0 || count > MAX_EXTENSION_EXAMPLES) {
    throw new RangeError(
      `A quantidade de exemplos deve ser um inteiro entre 0 e ${MAX_EXTENSION_EXAMPLES}.`,
    )
  }
  return Object.freeze({ count, load })
}

/**
 * Carrega, valida e memoriza o catálogo de uma extensão. Uma falha não fica
 * presa no cache: o botão de tentar novamente pode repetir o import.
 */
export function loadExtensionExamples(
  extension: ExtensionDefinition,
): Promise<readonly ExtensionExample[]> {
  const cached = loadedExamples.get(extension)
  if (cached) return cached

  const pending = Promise.resolve()
    .then(() => extension.examples.load())
    .then((input) => {
      ExtensionExamplesSchema.parse(input)
      if (input.length !== extension.examples.count) {
        throw new Error(
          `A extensão ${extension.manifest.id} declarou ${extension.examples.count} exemplos, mas carregou ${input.length}.`,
        )
      }
      return Object.freeze(input)
    })
    .catch((error: unknown) => {
      loadedExamples.delete(extension)
      throw error
    })

  loadedExamples.set(extension, pending)
  return pending
}
