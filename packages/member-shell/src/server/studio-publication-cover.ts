import 'server-only'
import { type R2PutObjectInput, r2CreateObject, r2FenceObject } from './r2'

function assertCoverKey(key: string) {
  if (!/^studio\/cover\/[A-Za-z0-9_./-]+$/.test(key) || key.includes('..'))
    throw new Error('Capa de publicação inválida.')
}

/** A terminal marker wins even when the original upload resumes after reconciliation. */
export async function createStudioPublicationCover(
  input: R2PutObjectInput,
): Promise<{ key: string; url: string }> {
  assertCoverKey(input.key)
  const created = await r2CreateObject({ ...input, cacheControl: 'no-store' })
  if (!created) throw new Error('Esta capa já foi gravada ou retirada.')
  return created
}

/** Keep a zero-byte marker at this unique upload key; never delete it afterwards. */
export async function retireStudioPublicationCover(coverKey: string): Promise<void> {
  assertCoverKey(coverKey)
  await r2FenceObject(coverKey)
}
