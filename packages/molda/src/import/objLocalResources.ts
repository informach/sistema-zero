import { OBJ_INPUT_LIMITS as limits, ObjInputError, objBudget, requireObj } from './objInput'
import { objLocalFilePath, objResourcePath } from './objResourcePath'

export interface ObjLocalFile {
  path: string
  bytes: Uint8Array
}
function checkBytes(bytes: Uint8Array, path: string) {
  requireObj(bytes instanceof Uint8Array, path, 'O arquivo precisa conter bytes.')
  if (!(bytes.buffer instanceof ArrayBuffer))
    throw new ObjInputError('unsupported', path, 'Escolha bytes sem memória compartilhada.')
  objBudget(bytes.byteLength, limits.fileBytes, path)
}
/** Synchronous, import-owned metadata plan. Buffers remain read-only until the final owned copy. */
export class ObjLocalResources {
  readonly entryPath: string
  private readonly selected = new Map<string, Uint8Array>()
  private readonly needed = new Map<string, Uint8Array | null>()
  private resourceBytes = 0

  constructor(entry: Uint8Array, entryPath: string, files: readonly ObjLocalFile[]) {
    this.entryPath = objLocalFilePath(entryPath, 'entryPath')
    objBudget(files.length, limits.resources, 'files')
    checkBytes(entry, 'file')
    let chosenBytes = entry.byteLength
    for (const file of files) {
      const path = objLocalFilePath(file.path)
      requireObj(
        path !== this.entryPath && !this.selected.has(path),
        'files',
        'Dois arquivos têm o mesmo caminho. Escolha um conjunto sem duplicatas.',
      )
      checkBytes(file.bytes, path)
      chosenBytes += file.bytes.byteLength
      objBudget(chosenBytes, limits.selectedFileBytes, 'files')
      this.selected.set(path, file.bytes)
    }
  }
  reference(
    filename: string,
    fromPath: string,
    path: string,
  ): { path: string; bytes: Uint8Array | null } {
    const resolved = objResourcePath(filename, fromPath, path)
    // OBJ text cannot simultaneously be a companion MTL/raster/curve in this bundle contract.
    requireObj(resolved !== this.entryPath, path, 'O recurso aponta para o próprio arquivo OBJ.')
    if (!this.needed.has(resolved)) {
      objBudget(this.needed.size + 1, limits.resources, 'resources')
      const bytes = this.selected.get(resolved) ?? null
      this.resourceBytes += bytes?.byteLength ?? 0
      objBudget(this.resourceBytes, limits.fileBytes, 'resources')
      this.needed.set(resolved, bytes)
    }
    const bytes = this.needed.get(resolved)
    if (bytes === undefined) throw new Error('Resource was not planned')
    return { path: resolved, bytes }
  }
  finish():
    | { status: 'missing'; paths: string[] }
    | { status: 'ready'; resources: Map<string, Uint8Array>; resourceBytes: number } {
    const paths: string[] = []
    for (const [path, bytes] of this.needed) if (bytes === null) paths.push(path)
    if (paths.length) return { status: 'missing', paths }
    const resources = new Map<string, Uint8Array>()
    for (const [path, bytes] of this.needed) {
      if (bytes === null) throw new Error('Missing resource escaped preflight')
      resources.set(path, new Uint8Array(bytes))
    }
    return { status: 'ready', resources, resourceBytes: this.resourceBytes }
  }
}
