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

// URI identifies a buffer for its lifetime; a document rename changes only its logical path.
const logicalPaths = new WeakMap<DisposableMonacoModel, string>()
const reservedPaths = new Map<string, string>()
const synchronizing = new WeakSet<DisposableMonacoModel>()
export function setMonacoModelPath(model: DisposableMonacoModel, path: string): void {
  logicalPaths.set(model, path)
  reservedPaths.set(model.uri.path.replace(/^\/+/, ''), path)
}
/** Reserve a URI without creating a visual model. Reusing a renamed file's old name gets a new URI. */
export function reserveMonacoModelUri(
  registry: MonacoModelRegistry,
  prefix: string,
  fileName: string,
): string {
  const logical = buildMonacoModelPath(prefix, fileName)
  const existing = findMonacoModel(registry.getModels(), logical)
  if (existing) return existing.uri.toString()
  for (const [uri, path] of reservedPaths) if (path === logical) return uri
  const occupied = new Set(registry.getModels().map((model) => model.uri.path.replace(/^\/+/, '')))
  const uri =
    occupied.has(logical) || reservedPaths.has(logical)
      ? `${prefix}/.buffers/${crypto.randomUUID()}/${fileName.split('/').at(-1)}`
      : logical
  reservedPaths.set(uri, logical)
  return uri
}
export function releaseMonacoModelUri(model: DisposableMonacoModel): void {
  reservedPaths.delete(model.uri.path.replace(/^\/+/, ''))
}
export function isMonacoModelSynchronizing(model: DisposableMonacoModel): boolean {
  return synchronizing.has(model)
}
export function synchronizeMonacoModel(model: DisposableMonacoModel, update: () => void): void {
  synchronizing.add(model)
  try {
    update()
  } finally {
    synchronizing.delete(model)
  }
}
export function findMonacoModel<T extends DisposableMonacoModel>(
  models: readonly T[],
  path: string,
): T | undefined {
  return models.find((model) => getMonacoModelPath(model) === path)
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

/**
 * ⚠️ Contrato: `prefix` deve ser um prefixo JÁ SANEADO por
 * `resolveModelPathPrefix` (o MonacoTabs faz isso). Esta função NÃO sanitiza de
 * propósito — sanitizar aqui e não nas COMPARAÇÕES (`isModelInPathPrefix`/
 * `disposeModelsForPathPrefix`, que recebem o mesmo prefixo cru) divergiria as
 * chaves. Um call site novo que passe prefixo cru com `:` reabre o bug do
 * esquema de URI (`monaco.Uri.parse` engole tudo antes do 1º `:`).
 */
export function buildMonacoModelPath(prefix: string | undefined, fileName: string): string {
  const safePrefix = (prefix ?? '').trim()
  return safePrefix ? `${safePrefix}/${fileName}` : fileName
}

export function getMonacoModelPath(model: DisposableMonacoModel): string {
  const logical = logicalPaths.get(model)
  if (logical) return logical
  const uriPath = model.uri.path.replace(/^\/+/, '')
  const reserved = reservedPaths.get(uriPath)
  if (reserved) return reserved
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
    releaseMonacoModelUri(model)
    disposed += 1
  }
  for (const uri of reservedPaths.keys())
    if (uri.startsWith(`${prefix}/`)) reservedPaths.delete(uri)
  return disposed
}
