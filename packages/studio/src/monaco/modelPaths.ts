export interface DisposableMonacoModel {
  uri: {
    path: string
    toString(): string
  }
  dispose(): void
}

export interface MonacoModelRegistry {
  getModels(): readonly DisposableMonacoModel[]
}

/**
 * Sanitiza um segmento do `path` do model: o Monaco cria o model via
 * `monaco.Uri.parse(path)`, e o parser do vscode-uri trata TUDO antes do
 * primeiro `:` como ESQUEMA de URI. Um `projectId` (ULID) ou um `instanceId` do
 * `useId()` com `:` viravam esquema — o prefixo sumia de `model.uri.path` e o
 * `getMonacoModelPath` nunca casava com o `buildMonacoModelPath` (realce/seleção
 * bloco↔código quebrados). Trocamos qualquer caractere fora de `[A-Za-z0-9._-]`
 * (incl. `:` e `/`) por `_`, garantindo que o `path` fique inteiro no componente
 * de PATH da URI e faça round-trip.
 */
function sanitizePathSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '_')
}

/**
 * Compõe o prefixo SALGADO do `path` dos models a partir do prefixo do projeto
 * (ex.: id do projeto) e de um id ESTÁVEL por instância do <Studio> (gerado uma
 * vez via `useId()` no MonacoTabs). Sem o sal por instância, dois <Studio> no
 * MESMO `projectId` (rota /dual) compartilham os mesmos models num registro
 * GLOBAL — e o desmonte de um descarta os models VIVOS do outro.
 *
 * Nunca devolve string vazia: um `projectId` em branco cai no `instanceId`, que
 * é sempre não-vazio, garantindo um discriminador por instância no `path`. O
 * separador é `__` (não `:`) e os segmentos são sanitizados — ver
 * {@link sanitizePathSegment} — para o `path` não ganhar um esquema de URI.
 */
export function resolveModelPathPrefix(prefix: string | undefined, instanceId: string): string {
  const project = sanitizePathSegment((prefix ?? '').trim())
  const instance = sanitizePathSegment(instanceId)
  return project ? `${project}__${instance}` : instance
}

export function buildMonacoModelPath(prefix: string | undefined, fileName: string): string {
  const safePrefix = (prefix ?? '').trim()
  return safePrefix ? `${safePrefix}/${fileName}` : fileName
}

export function getMonacoModelPath(model: DisposableMonacoModel): string {
  const uriPath = model.uri.path.replace(/^\/+/, '')
  if (uriPath) return uriPath
  return model.uri
    .toString()
    .replace(/^[^:]+:\/\/(?:model\/)?/, '')
    .replace(/^\/+/, '')
}

export function isModelInPathPrefix(model: DisposableMonacoModel, prefix: string): boolean {
  const path = getMonacoModelPath(model)
  return path === prefix || path.startsWith(`${prefix}/`)
}

export function disposeModelsForPathPrefix(
  prefix: string | undefined,
  registry: MonacoModelRegistry,
): number {
  if (!prefix) return 0
  let disposed = 0
  for (const model of registry.getModels()) {
    if (!isModelInPathPrefix(model, prefix)) continue
    model.dispose()
    disposed += 1
  }
  return disposed
}
