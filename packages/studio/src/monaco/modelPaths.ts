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
 * Compõe o prefixo SALGADO do `path` dos models a partir do prefixo do projeto
 * (ex.: id do projeto) e de um id ESTÁVEL por instância do <Studio> (gerado uma
 * vez via `useId()` no MonacoTabs). Sem o sal por instância, dois <Studio> no
 * MESMO `projectId` (rota /dual) compartilham os mesmos models num registro
 * GLOBAL — e o desmonte de um descarta os models VIVOS do outro.
 *
 * Nunca devolve string vazia: um `projectId` em branco cai no `instanceId`, que
 * é sempre não-vazio, garantindo um discriminador por instância no `path`.
 */
export function resolveModelPathPrefix(prefix: string | undefined, instanceId: string): string {
  const project = (prefix ?? '').trim()
  return project ? `${project}::${instanceId}` : instanceId
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
