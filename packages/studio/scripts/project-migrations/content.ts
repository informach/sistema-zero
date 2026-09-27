import { gunzipSync, gzipSync } from 'node:zlib'
import { creationPartStorageKey } from '@sistemazero/core/creations'
import { isDocumentRecord } from '../../src/core/projectDocument'
import { migrateProjectDocument } from '../../src/project-migrations'
import { migrateGameTwoDToolTypes, SOUND_BLOCKS } from '../../src/project-migrations/gameTwoD'
import {
  sanitizeProjectForHost,
  validateStudioCreationSnapshot,
} from '../../src/state/projectValidation'
import { hash, type Row, type StoredObject } from './railway'

/** Mesma representação de timestamptz que to_jsonb em UTC, inclusive zeros fracionários. */
export function sqlTimestamp(value: string): string {
  return new Date(value)
    .toISOString()
    .replace(/\.000Z$/, 'Z')
    .replace(/(\.\d*?)0+Z$/, '$1Z')
    .replace(/Z$/, '+00:00')
}

export function canonical(value: unknown): string {
  function sorted(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(sorted)
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([key, v]) => [key, sorted(v)]),
      )
    return value
  }
  return JSON.stringify(sorted(value))
}
export const objectId = (object: Pick<StoredObject, 'bucket' | 'key'>): string =>
  `${object.bucket}:${object.key}`
export function decode(object: StoredObject): unknown {
  const bytes = Buffer.from(object.bytes, 'base64')
  if (bytes.length > 40 * 1024 * 1024) throw new Error('Objeto excede o limite comprimido')
  const json = object.key.endsWith('.gz')
    ? gunzipSync(bytes, { maxOutputLength: 128 * 1024 * 1024 })
    : bytes
  return JSON.parse(json.toString('utf8'))
}
export function encode(value: unknown, compressed: boolean): string {
  const json = Buffer.from(JSON.stringify(value))
  return (compressed ? gzipSync(json) : json).toString('base64')
}
export function creationPartRefs(
  row: Row,
): Array<{ hash: string; bytes: number; rev: number; bucket: 'ugc'; key: string }> {
  if (!Array.isArray(row.parts) || row.parts.length > 128)
    throw new Error('Índice de partes inválido')
  return row.parts.map((part: unknown) => {
    if (
      !isDocumentRecord(part) ||
      typeof part.hash !== 'string' ||
      !/^[a-f0-9]{64}$/.test(part.hash) ||
      !Number.isSafeInteger(part.rev) ||
      Number(part.rev) < 1 ||
      !Number.isSafeInteger(part.bytes) ||
      Number(part.bytes) < 1
    )
      throw new Error('Referência de parte inválida')
    return {
      hash: part.hash,
      bytes: Number(part.bytes),
      rev: Number(part.rev),
      bucket: 'ugc',
      key: creationPartStorageKey(
        String(row.user_id),
        'studio',
        String(row.item_id),
        part.hash,
        Number(part.rev),
      ),
    }
  })
}

export async function convertDocument(raw: unknown): Promise<Record<string, unknown>> {
  const result = await migrateProjectDocument(raw)
  const validated = sanitizeProjectForHost(result.document)
  if (!validated) throw new Error('Conversão não produziu um projeto válido')
  const again = await migrateProjectDocument(validated)
  if (canonical(again.document) !== canonical(validated))
    throw new Error('Conversão não é idempotente')
  return validated as unknown as Record<string, unknown>
}

/** Materializa e confere cada asset antes de converter; o programa sozinho não basta. */
export async function convertCreation(
  row: Row,
  objects: ReadonlyMap<string, StoredObject>,
): Promise<{ payload: unknown; resources: StoredObject[] }> {
  const main = objects.get(`ugc:${row.storage_ref}`)
  if (!main) throw new Error('Objeto principal não coletado')
  const refs = creationPartRefs(row)
  return convertStoredProject(String(row.item_id), main, refs, objects)
}

export async function convertStoredProject(
  itemId: string,
  main: StoredObject,
  refs: Array<{ hash: string; bytes: number; bucket: 'ugc'; key: string }>,
  objects: ReadonlyMap<string, StoredObject>,
): Promise<{ payload: unknown; resources: StoredObject[] }> {
  const raw = decode(main)
  if (new Set(refs.map((p) => p.hash)).size !== refs.length)
    throw new Error('Partes repetidas no índice')
  const resources: StoredObject[] = []
  let document: unknown = raw
  const manifest = isDocumentRecord(raw) && 'format' in raw
  if (manifest) {
    const assetHashes = raw.assets
    // O programa histórico ainda não é válido no leitor atual, mas o envelope precisa ser.
    if (
      raw.format !== 'sz-studio-parts' ||
      raw.version !== 1 ||
      !isDocumentRecord(raw.program) ||
      !Array.isArray(raw.program.assets) ||
      raw.program.assets.length ||
      !Array.isArray(assetHashes) ||
      assetHashes.length !== refs.length ||
      new Set(assetHashes).size !== refs.length ||
      refs.some((p) => !assetHashes.includes(p.hash))
    )
      throw new Error('Manifesto diverge do índice de partes')
    const assets = new Map<string, unknown>()
    for (const ref of refs) {
      const object = objects.get(objectId(ref))
      if (!object || Buffer.from(object.bytes, 'base64').length !== ref.bytes)
        throw new Error('Parte ausente ou tamanho divergente')
      const asset = decode(object)
      if (hash(canonical(asset)) !== ref.hash) throw new Error('Hash do asset diverge do manifesto')
      assets.set(ref.hash, asset)
      resources.push(object)
    }
    document = { ...raw.program, assets: assetHashes.map((h) => assets.get(String(h))) }
  } else if (refs.length) throw new Error('Projeto integral tem partes órfãs no índice')
  if (!isDocumentRecord(document) || document.id !== itemId)
    throw new Error('Identidade do projeto diverge do índice')
  const converted = await convertDocument(document)
  if (canonical(converted.assets) !== canonical(document.assets))
    throw new Error('A conversão alterou os recursos')
  const payload = manifest ? { ...raw, program: { ...converted, assets: [] } } : converted
  validateStudioCreationSnapshot(payload, itemId)
  return { payload, resources }
}

/** Só interpreta locais contratuais; texto do aluno e histórico de respostas não são código. */
export async function convertCourseContent(raw: unknown): Promise<unknown> {
  if (raw === null || raw === undefined) return raw
  // O corpus operacional entra por JSON; conteúdo editorial não é um Project.
  const wrapper: Record<string, unknown> = { value: structuredClone(raw) }
  const queue = [wrapper]
  while (queue.length) {
    const node = queue.pop()!
    if (typeof node.blockType === 'string') {
      const previous = node.blockType
      const current = migrateGameTwoDToolTypes([previous])
      if (canonical(current) !== canonical([previous])) {
        const fx = SOUND_BLOCKS[previous]
        if (!fx) throw new Error(`Critério de ${previous} exige revisão da composição atual`)
        if (node.fields !== undefined && !isDocumentRecord(node.fields))
          throw new Error('Campos do critério inválidos')
        node.blockType = 'sz_g2d_play_fx'
        node.fields = { ...(node.fields as Record<string, unknown> | undefined), FX: fx }
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (
        (key === 'beforeBlock' || key === 'withinBlock') &&
        typeof value === 'string' &&
        canonical(migrateGameTwoDToolTypes([value])) !== canonical([value])
      )
        throw new Error(`Relação ${key} com ${value} exige revisão do critério`)
      if (key === 'initialProject' && isDocumentRecord(value))
        node[key] = await convertDocument(value)
      else if ((key === 'allowBlocks' || key === 'studioUnlockBlocks') && Array.isArray(value)) {
        if (value.some((item) => typeof item !== 'string'))
          throw new Error('Lista de blocos inválida')
        node[key] = migrateGameTwoDToolTypes(value as string[])
      } else if (isDocumentRecord(value)) queue.push(value)
      else if (Array.isArray(value))
        for (const item of value) if (isDocumentRecord(item)) queue.push(item)
    }
  }
  return wrapper.value
}
