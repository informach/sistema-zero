import type { ExtensionBootstrapContext, ExtensionDefinition } from './types'

/** Memo por (runtime, variante): a chave `''` é a variante padrão (sem contexto). */
const loadedBootstrapScripts = new WeakMap<object, Map<string, Promise<string>>>()

/**
 * O contexto que TODO chamador passa ao carregar os runtimes: o código do aluno que vai para o
 * documento (index.html, script.js e os extras, nessa ordem). Fonte única de propósito: o
 * preview, a capa, o export e o player montam o MESMO texto para o mesmo projeto, então
 * injetam a mesma variante de cada runtime.
 */
export function extensionBootstrapContext(input: {
  html?: string
  js?: string
  extraFiles?: readonly { content: string }[]
}): ExtensionBootstrapContext {
  const parts = [input.html ?? '', input.js ?? '']
  for (const extra of input.extraFiles ?? []) {
    if (typeof extra?.content === 'string') parts.push(extra.content)
  }
  return { code: parts.join('\n') }
}

/** A variante que `loadExtensionBootstrapScript(extension, context)` vai injetar. */
export function extensionBootstrapVariant(
  extension: ExtensionDefinition,
  context?: ExtensionBootstrapContext,
): string {
  const runtime = extension.runtime
  if (!context || runtime.bootstrapScript !== undefined || !runtime.bootstrapVariant) return ''
  return runtime.bootstrapVariant(context)
}

/**
 * Chave estável do conjunto de variantes (`id=variante`): o preview a usa como dependência
 * para recarregar os runtimes só quando a VARIANTE muda, e não a cada tecla.
 */
export function extensionBootstrapVariantsKey(
  extensions: readonly ExtensionDefinition[],
  context?: ExtensionBootstrapContext,
): string {
  return uniqueExtensions(extensions)
    .map((extension) => `${extension.manifest.id}=${extensionBootstrapVariant(extension, context)}`)
    .join(',')
}

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

/**
 * Carrega e memoriza o bootstrap por (runtime, variante); falhas saem do cache para permitir
 * retry real. Sem contexto, a variante é a padrão (o runtime COMPLETO).
 */
export function loadExtensionBootstrapScript(
  extension: ExtensionDefinition,
  context?: ExtensionBootstrapContext,
): Promise<string> {
  const runtime = extension.runtime
  const variant = extensionBootstrapVariant(extension, context)
  let variants = loadedBootstrapScripts.get(runtime)
  if (!variants) {
    variants = new Map()
    loadedBootstrapScripts.set(runtime, variants)
  }
  const cached = variants.get(variant)
  if (cached) return cached

  const memo = variants
  const pending = Promise.resolve()
    .then(() =>
      runtime.bootstrapScript !== undefined
        ? runtime.bootstrapScript
        : runtime.loadBootstrapScript(variant === '' ? undefined : context),
    )
    .then((source) => {
      if (typeof source !== 'string') {
        throw new TypeError(`O runtime da extensão ${extension.manifest.id} não devolveu texto.`)
      }
      return source
    })
    .catch((error: unknown) => {
      memo.delete(variant)
      throw error
    })

  memo.set(variant, pending)
  return pending
}

export async function loadExtensionBootstrapScripts(
  extensions: readonly ExtensionDefinition[],
  context?: ExtensionBootstrapContext,
): Promise<string[]> {
  return Promise.all(
    uniqueExtensions(extensions).map((extension) =>
      loadExtensionBootstrapScript(extension, context),
    ),
  )
}
