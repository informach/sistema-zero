import { MORADA_CATALOG } from './catalog.generated'
import type { MoradaCatalog } from './types'

export function moradaFileUrl(file: string): string {
  return `/api/morada3d/${file}`
}
export function moradaBucketKey(file: string): string {
  return `morada/${file}`
}
export function isMoradaFile(file: string, catalog: MoradaCatalog = MORADA_CATALOG): boolean {
  return !file.includes('..') && catalog.files.includes(file)
}
export function moradaPiece(id: string, catalog: MoradaCatalog = MORADA_CATALOG) {
  return catalog.pieces[id]
}
