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

export function buildMonacoModelPath(prefix: string | undefined, fileName: string): string {
  return prefix ? `${prefix}/${fileName}` : fileName
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
