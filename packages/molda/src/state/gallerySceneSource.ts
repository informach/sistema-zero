import type { UseStore } from 'idb-keyval'
import type { MoldaAssetSummary } from '../core/assetSummary'
import { newId } from '../core/id'
import { sceneToJson } from '../scene/documentJson'
import { sceneCloudSummary } from './sceneGenerationSummary'
import { createScenePersistence } from './scenePersistence'

/**
 * O que a galeria precisa da geração seguinte, e nada além disso. Existe para o
 * `galleryStore` continuar sem saber o que é um documento de cena: ele lida com
 * resumos e ids, e cada mutação vai para a persistência dona daquela criação.
 */
export interface GallerySceneSource {
  listSummaries(): Promise<{ summaries: MoldaAssetSummary[]; issues: readonly string[] }>
  /** O arquivo nativo da criação, o MESMO do "Baixar projeto" da oficina. */
  readProject(id: string): Promise<string | null>
  rename(id: string, name: string): Promise<boolean>
  remove(id: string): Promise<boolean>
  duplicate(id: string, name: string): Promise<MoldaAssetSummary | null>
  subscribe(listener: () => void): () => void
}

export function createGallerySceneSource(
  store: UseStore,
  now: () => number = () => Date.now(),
): GallerySceneSource {
  const persistence = createScenePersistence(store)
  /** Toda mutação relê a revisão corrente: escrever por cima de uma revisão velha é conflito. */
  async function current(id: string) {
    const read = await persistence.read(id)
    return read.status === 'active' ? read : null
  }
  return {
    async listSummaries() {
      const { summaries, issues } = await persistence.listSummaries()
      return {
        summaries: summaries.map(sceneCloudSummary),
        issues: issues.map((issue) => issue.id),
      }
    },
    async readProject(id) {
      const found = await current(id)
      return found ? JSON.stringify(sceneToJson(found.document)) : null
    },
    async rename(id, name) {
      const active = await current(id)
      if (!active) return false
      const result = await persistence.save(
        { ...active.document, name, updatedAt: now() },
        active.summary.revision,
      )
      return result.status === 'saved'
    },
    async remove(id) {
      const active = await current(id)
      if (!active) return false
      const result = await persistence.remove(id, active.summary.revision)
      return result.status === 'deleted'
    },
    async duplicate(id, name) {
      const active = await current(id)
      if (!active) return null
      const stamp = now()
      // Cópia nasce sem revisão: id novo, nenhum registro anterior para comparar.
      const copy = { ...active.document, id: newId(), name, createdAt: stamp, updatedAt: stamp }
      const result = await persistence.save(copy, null)
      if (result.status !== 'saved') return null
      return {
        id: copy.id,
        name: copy.name,
        kind: 'model',
        createdAt: copy.createdAt,
        updatedAt: copy.updatedAt,
        bytes: active.summary.bytes,
        thumbDataUrl: copy.thumb ?? null,
        formatVersion: 2 as const,
      }
    },
    subscribe(listener) {
      const controller = new AbortController()
      // A inscrição é assíncrona (abre uma transação antes do canal). Desmontar antes
      // de ela assentar ABORTA a promessa, e cancelar não é erro: sem este `catch` o
      // StrictMode do React derruba uma rejeição não tratada no console a cada montagem.
      // Falha de armazenamento também cai aqui e apenas desliga o aviso ao vivo, que é
      // o mesmo desfecho de um navegador sem BroadcastChannel.
      void persistence.subscribe(() => listener(), controller.signal).catch(() => undefined)
      return () => controller.abort()
    },
  }
}
