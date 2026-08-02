import { ExtensionExamplesSchema, MAX_EXTENSION_EXAMPLES } from './manifest'
import type { ExtensionDefinition, ExtensionExample, ExtensionExamplesProvider } from './types'

const loadedExamples = new WeakMap<ExtensionDefinition, Promise<readonly ExtensionExample[]>>()

export interface ExtensionExamplesFailure {
  extensionId: string
  error: unknown
}

export interface ExtensionExampleCatalogsResult {
  loaded: Array<readonly [extensionId: string, examples: readonly ExtensionExample[]]>
  failed: ExtensionExamplesFailure[]
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const key of Reflect.ownKeys(value)) deepFreeze(Reflect.get(value, key))
  return Object.freeze(value)
}

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
      const parsed = ExtensionExamplesSchema.parse(input)
      if (parsed.length !== extension.examples.count) {
        throw new Error(
          `A extensão ${extension.manifest.id} declarou ${extension.examples.count} exemplos, mas carregou ${parsed.length}.`,
        )
      }
      return deepFreeze(parsed)
    })
    .catch((error: unknown) => {
      loadedExamples.delete(extension)
      throw error
    })

  loadedExamples.set(extension, pending)
  return pending
}

/**
 * Carrega catálogos independentes sem transformar uma falha localizada em
 * indisponibilidade global. A ordem editorial é preservada nos dois resultados.
 */
export async function loadExtensionExampleCatalogs(
  extensions: readonly ExtensionDefinition[],
): Promise<ExtensionExampleCatalogsResult> {
  const settled = await Promise.allSettled(
    extensions.map(async (extension) => ({
      extensionId: extension.manifest.id,
      examples: await loadExtensionExamples(extension),
    })),
  )
  const loaded: ExtensionExampleCatalogsResult['loaded'] = []
  const failed: ExtensionExampleCatalogsResult['failed'] = []
  settled.forEach((result, index) => {
    const extensionId = extensions[index]?.manifest.id
    if (!extensionId) return
    if (result.status === 'fulfilled') loaded.push([extensionId, result.value.examples])
    else failed.push({ extensionId, error: result.reason })
  })
  return { loaded, failed }
}
