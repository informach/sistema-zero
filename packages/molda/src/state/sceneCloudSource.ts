import type { UseStore } from 'idb-keyval'
import type { MoldaAssetSummary } from '../core/assetSummary'
import { readMoldaDocument } from '../core/documentReader'
import { MoldaUnsupportedVersionError } from '../core/documentVersion'
import { newId } from '../core/id'
import { sceneToJson } from '../scene/documentJson'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { readSceneDocument } from '../scene/readDocument'
import { SceneValidationError } from '../scene/validation'
import { getMoldaGenerationStore } from './persistence'
import { adoptCloudScene } from './promoteScene'
import { sceneCloudSummary } from './sceneGenerationSummary'
import { createScenePersistence } from './scenePersistence'
import type { SceneStorageChange } from './sceneStorageChannel'

export interface MoldaSceneCloudDocument {
  summary: MoldaAssetSummary
  /** Documento inteiro, com os pixels em base64: o que sobe para a nuvem. */
  json: string
}

/**
 * O que o espelho da nuvem do host precisa da geração seguinte, e nada além disso.
 * O host continua sem saber o que é um documento de cena: ele move JSON e resumos.
 *
 * ⚠️ Uma criação PROMOVIDA sai do inventário v1 e entra neste. O espelho precisa somar
 * os dois para não enxergar a promoção como uma exclusão e apagar o backup da criança.
 */
export interface MoldaSceneCloudSource {
  listSummaries(): Promise<MoldaAssetSummary[]>
  read(id: string): Promise<MoldaSceneCloudDocument | null>
  /** Includes tombstones: an older remote document must never revive the v1 generation. */
  owns(id: string): Promise<boolean>
  /**
   * Confere o que desceu SEM gravar: o host precisa do nome e do carimbo para decidir
   * nome único e comparação, e não pode tirá-los de um JSON não validado.
   */
  inspect(json: string): MoldaAssetSummary | null
  /**
   * Grava o que desceu da nuvem. A comparação é dupla: o carimbo autoral esperado (o
   * mesmo contrato do espelho v1) E a revisão de armazenamento, que é a trava real.
   */
  saveIfUnchanged(
    id: string,
    json: string,
    expectedUpdatedAt: number | null,
    name?: string,
  ): Promise<boolean>
  /**
   * A cópia de conflito: id novo, nome novo, carimbo novo. A cirurgia no documento fica
   * aqui, onde o formato é conhecido, e não no host, que só move JSON.
   */
  saveCopy(json: string, name: string, now?: () => number): Promise<MoldaAssetSummary | null>
  removeIfUnchanged(id: string, expectedUpdatedAt: number | null): Promise<boolean>
  /**
   * Todo commit da geração seguinte, com o id e se ele foi GRAVADO ou APAGADO.
   *
   * ⚠️⚠️ A galeria e a oficina falam direto com a persistência de cena: nem o autosave da
   * oficina, nem renomear, nem duplicar, nem APAGAR passam pelo espelho do host. Sem ouvir
   * aqui, a nuvem só saberia da criação numa visita à galeria, e a exclusão nunca viraria
   * lápide — a criação voltaria inteira no outro aparelho.
   */
  subscribe(listener: (change: SceneStorageChange) => void): () => void
}

export function createMoldaSceneCloudSource(
  store: UseStore = getMoldaGenerationStore(),
): MoldaSceneCloudSource {
  const persistence = createScenePersistence(store)
  /** Um só portão de leitura de JSON: nada entra sem passar pelo leitor estrito da cena. */
  const parse = (json: string, allowLegacy = false) => {
    let raw: unknown
    try {
      raw = JSON.parse(json)
    } catch {
      return null
    }
    const read = readSceneDocument(raw)
    if (read.status === 'valid') return read.document
    if (allowLegacy) {
      const legacy = readMoldaDocument(raw)
      if (legacy.status === 'valid' && legacy.asset.kind === 'model')
        return migrateLegacyModel(legacy.asset).document
    }
    return null
  }
  const currentRecord = async (id: string) => {
    const read = await persistence.read(id)
    if (read.status === 'unsupported') throw new MoldaUnsupportedVersionError(read.version)
    if (read.status === 'invalid') throw new SceneValidationError(id, read.message)
    return read
  }
  const active = async (id: string) => {
    const read = await currentRecord(id)
    return read.status === 'active' ? read : null
  }
  return {
    owns: async (id) => (await currentRecord(id)).status !== 'missing',
    async listSummaries() {
      const { summaries } = await persistence.listSummaries()
      return summaries.map(sceneCloudSummary)
    },
    inspect(json) {
      const read = parse(json)
      if (!read) return null
      return {
        id: read.id,
        name: read.name,
        kind: read.kind,
        createdAt: read.createdAt,
        updatedAt: read.updatedAt,
        bytes: json.length,
        thumbDataUrl: read.thumb ?? null,
        formatVersion: 2,
      }
    },
    async read(id) {
      const current = await active(id)
      if (!current) return null
      return {
        summary: sceneCloudSummary(current.summary),
        json: JSON.stringify(sceneToJson(current.document)),
      }
    },
    async saveIfUnchanged(id, json, expectedUpdatedAt, name) {
      const read = parse(json, true)
      // Formato futuro ou inválido não vira gravação: o espelho já o exclui da
      // reconciliação, e aqui a recusa é a segunda barreira.
      if (!read || read.id !== id) return false
      const current = await currentRecord(id)
      const document = name === undefined ? read : { ...read, name }
      if (current.status === 'active') {
        if (current.document.updatedAt !== expectedUpdatedAt) return false
        return (await persistence.save(document, current.summary.revision)).status === 'saved'
      }
      if (current.status === 'deleted') {
        if (expectedUpdatedAt !== null) return false
        return (await persistence.restore(document, current.tombstone.revision)).status === 'saved'
      }
      if (expectedUpdatedAt === null) {
        const result = await persistence.save(document, null)
        if (result.status === 'saved') return true
      }
      return (await adoptCloudScene(store, document, expectedUpdatedAt)).status === 'promoted'
    },
    async saveCopy(json, name, clock = () => Date.now()) {
      const read = parse(json)
      if (!read) return null
      const stamp = clock()
      const copy = { ...read, id: newId(), name, createdAt: stamp, updatedAt: stamp }
      const result = await persistence.save(copy, null)
      if (result.status !== 'saved') return null
      const summary = await active(copy.id)
      return summary ? sceneCloudSummary(summary.summary) : null
    },
    async removeIfUnchanged(id, expectedUpdatedAt) {
      const current = await active(id)
      if (!current || current.document.updatedAt !== expectedUpdatedAt) return false
      return (await persistence.remove(id, current.summary.revision)).status === 'deleted'
    },
    subscribe(listener) {
      const controller = new AbortController()
      // Desmontar antes de a inscrição assentar aborta a promessa; cancelar não é erro.
      void persistence.subscribe(listener, controller.signal).catch(() => undefined)
      return () => controller.abort()
    },
  }
}
