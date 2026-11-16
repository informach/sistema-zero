/** Ponte de leitura: Cenários consome um snapshot da conta sem trocar o namespace global
 * ou escrever na galeria do Molda. Os dois destinos reutilizam os mesmos codificadores. */
import { readMoldaDocumentForId } from '../core/documentReader'
import { readSceneDocument } from '../scene/readDocument'
import {
  type ExportForStudioResult,
  exportLoadedAssetForStudio,
  exportLoadedSceneForStudio,
  type MoldaStudioExportContext,
} from './studioLibrary'

export async function exportMoldaJsonForCenarios(
  json: string,
  id: string,
  context: Omit<MoldaStudioExportContext, 'destino'> & {
    namespace: string
    storageRevision: number
  },
): Promise<ExportForStudioResult> {
  context.signal?.throwIfAborted()
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return { ok: false, reason: 'encode-failed' }
  }
  const scene = readSceneDocument(raw)
  if (scene.status === 'valid') {
    if (scene.document.id !== id) return { ok: false, reason: 'not-found' }
    return exportLoadedSceneForStudio(scene.document, { ...context, destino: 'cenarios' })
  }
  const legacy = readMoldaDocumentForId(raw, id)
  if (legacy.status !== 'valid') return { ok: false, reason: 'encode-failed' }
  return exportLoadedAssetForStudio(legacy.asset, { ...context, destino: 'cenarios' })
}
