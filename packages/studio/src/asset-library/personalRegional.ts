import { PINTA_STUDIO_LEGACY_LIMITS } from '@sistemazero/core/studio/pinta-limits'
import { get } from 'idb-keyval'
import { z } from 'zod'
import { normalizeAssetName } from '#core'
import { isUnusablePintaRegionalAsset } from '../core/pintaAuthoredPngVersion'
import { admitPintaRegionalMaterial } from '../core/pintaRegionalMaterial'
import { UNSUPPORTED_PINTA_REGION } from '../core/pintaRegionalReference'
import {
  assetKey,
  getPersonalAssetsNamespace,
  getStoreHandle,
  markPersonalAssetsChanged,
  PERSONAL_ASSET_LIMITS,
  personalAssetChars,
  regionalKey,
  regionalQuota,
  withPersonalAssetUpdate,
} from './personalStorage'

// Private storage capability. Nothing in the public library, editor or runtime selects it.
export const PINTA_REGIONAL_PERSONAL_CAPTURE = 'pinta-png5-personal-v1'
const idSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[^:\p{Cc}]+$/u)
const captureSchema = z.strictObject({
  format: z.literal('pinta-regional-personal'),
  version: z.literal(1),
  dataVersion: z.literal(5),
  id: idSchema,
  name: z.string().min(1).max(PERSONAL_ASSET_LIMITS.maxNameChars),
  revision: z.uuid(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  dataUrl: z
    .string()
    .startsWith('data:image/png;base64,')
    .max(PINTA_STUDIO_LEGACY_LIMITS.imageChars),
})
type Capture = z.infer<typeof captureSchema>
type SaveCaptureResult = { ok: true; revision: string } | { ok: false; error: string }
type Scope = { namespace?: string; capability: typeof PINTA_REGIONAL_PERSONAL_CAPTURE }

/** Private read of the exact root bytes. Graphic decoding belongs to the consumer. */
export async function readPersonalRegionalMap(id: string, scope: Scope): Promise<Capture | null> {
  const namespace = scope.namespace ?? getPersonalAssetsNamespace()
  if (scope.capability !== PINTA_REGIONAL_PERSONAL_CAPTURE || !idSchema.safeParse(id).success)
    return null
  try {
    const parsed = captureSchema.safeParse(await get(regionalKey(id), getStoreHandle(namespace)))
    if (!parsed.success || parsed.data.id !== id) return null
    const { dataUrl, width, height, sha256 } = parsed.data
    await admitPintaRegionalMaterial({
      dataUrl,
      sourceId: id,
      width,
      height,
      regional: { dataVersion: 5, sourceId: id, sha256 },
    })
    return parsed.data
  } catch {
    return null
  }
}

export async function savePersonalRegionalMap(
  input: { id: string; name: string; dataUrl: string; width: number; height: number },
  options: Scope & { expectedRevision: string | null; signal?: AbortSignal },
): Promise<SaveCaptureResult> {
  const namespace = options.namespace ?? getPersonalAssetsNamespace()
  const { capability, expectedRevision, signal } = options
  const { id, name, dataUrl, width, height, ...unknownFields } = input
  if (
    capability !== PINTA_REGIONAL_PERSONAL_CAPTURE ||
    !idSchema.safeParse(id).success ||
    Object.keys(unknownFields).length > 0
  ) {
    return { ok: false, error: UNSUPPORTED_PINTA_REGION }
  }
  try {
    signal?.throwIfAborted()
    const baseName = normalizeAssetName(name)
    if (!baseName) return { ok: false, error: UNSUPPORTED_PINTA_REGION }
    const {
      regional: { sha256 },
    } = await admitPintaRegionalMaterial(
      {
        dataUrl,
        sourceId: id,
        width,
        height,
      },
      signal,
    )
    const result = await withPersonalAssetUpdate<SaveCaptureResult>(
      namespace,
      ({ legacy, regional }) => {
        signal?.throwIfAborted()
        const previous = captureSchema.safeParse(regional.get(id))
        const old = legacy.get(id)
        if (
          (regional.has(id) && (!previous.success || previous.data.id !== id)) ||
          isUnusablePintaRegionalAsset(old) ||
          (old &&
            typeof old === 'object' &&
            (('origin' in old && old.origin === 'molda') ||
              ('kind' in old && old.kind !== undefined && old.kind !== 'image')))
        ) {
          return { write: {}, result: { ok: false, error: UNSUPPORTED_PINTA_REGION } }
        }
        if ((previous.data?.revision ?? null) !== expectedRevision) {
          return {
            write: {},
            result: {
              ok: false,
              error: 'A imagem foi atualizada em outra aba. O original foi preservado.',
            },
          }
        }

        const quota = regionalQuota(regional, id)
        if (!quota) return { write: {}, result: { ok: false, error: UNSUPPORTED_PINTA_REGION } }
        for (const [legacyId, raw] of legacy) {
          if (
            legacyId === id ||
            !raw ||
            typeof raw !== 'object' ||
            !('dataUrl' in raw) ||
            typeof raw.dataUrl !== 'string'
          )
            continue
          quota.chars += personalAssetChars(raw as { dataUrl: string })
          if (!regional.has(legacyId)) {
            quota.count += 1
            if ('name' in raw && typeof raw.name === 'string') quota.names.push(raw.name)
          }
        }
        if (
          quota.count >= PERSONAL_ASSET_LIMITS.maxCount ||
          quota.chars + dataUrl.length > PERSONAL_ASSET_LIMITS.maxTotalChars
        ) {
          return {
            write: {},
            result: {
              ok: false,
              error: 'O cenário não cabe na biblioteca. O original foi preservado.',
            },
          }
        }
        const taken = new Set(quota.names)
        let storedName = baseName
        for (let n = 2; taken.has(storedName); n++) storedName = `${baseName}-${n}`
        if (storedName.length > PERSONAL_ASSET_LIMITS.maxNameChars) {
          return { write: {}, result: { ok: false, error: 'Esse nome ficou comprido demais.' } }
        }
        const revision = crypto.randomUUID()
        const record: Capture = {
          format: 'pinta-regional-personal',
          version: 1,
          dataVersion: 5,
          id,
          width,
          height,
          sha256,
          name: storedName,
          revision,
          dataUrl,
        }
        // The former cover is removed only after the complete original is placed
        // in the same transaction. Published writers target only the legacy key.
        return {
          write: { puts: [[regionalKey(id), record]], deletes: [assetKey(id)] },
          result: { ok: true, revision },
        }
      },
    )
    if (result.ok) markPersonalAssetsChanged(namespace)
    return result
  } catch {
    return { ok: false, error: 'Não consegui guardar este cenário. O original foi preservado.' }
  }
}
