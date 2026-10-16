import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, open, readFile, rename, stat } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import type { RunRequest } from '../shared/contracts'

const hash = z.string().regex(/^[a-f0-9]{64}$/)
const tokenCount = z.number().int().nonnegative().nullable()
const maxCheckpointBytes = 16_000_000
export const providerOutputSchema = z.discriminatedUnion('provider', [
  z
    .object({
      provider: z.literal('claude'),
      raw: z.string().max(2_000_000),
      streaming: z.boolean(),
      code: z.number().int().nullable(),
    })
    .strict(),
  z
    .object({
      provider: z.literal('codex'),
      text: z.string().max(2_000_000),
      inputTokens: tokenCount,
      outputTokens: tokenCount,
      observedUrls: z.array(z.string().max(8000)).max(1000),
      researchCalls: z.number().int().min(0).max(13),
      imageFailed: z.boolean(),
    })
    .strict(),
])
export type ProviderOutput = z.infer<typeof providerOutputSchema>
const checkpointSchema = z
  .object({
    version: z.literal(1),
    requestHash: hash,
    mode: z.string().min(1).max(200),
    complete: z.boolean(),
    output: providerOutputSchema,
    images: z
      .array(z.object({ sha256: hash, size: z.number().int().min(1).max(24_000_000) }).strict())
      .max(4),
  })
  .strict()

export type ProviderRecovery = 'checkpoint' | 'only'
export function providerRequestHash(request: RunRequest, references: string[] = []) {
  // Prompts include the frozen editorial context and immutable source identities.
  // Filesystem paths and URLs are not an identity and do not belong in the key.
  return createHash('sha256').update(JSON.stringify({ request, references })).digest('hex')
}
export async function providerReferenceHashes(files: string[], signal: AbortSignal) {
  if (files.length > 18) throw new Error('Referências demais para este pedido')
  const hashes: string[] = []
  let size = 0
  for (const file of files) {
    const digest = createHash('sha256')
    for await (const chunk of createReadStream(file, { signal })) {
      size += chunk.length
      if (size > 24_000_000) throw new Error('As referências excedem 24 MB')
      digest.update(chunk)
    }
    hashes.push(digest.digest('hex'))
  }
  return hashes
}
async function writeDurable(file: string, data: string | Buffer, exclusive = false) {
  const target = exclusive ? file : `${file}.${randomUUID()}.pending`
  const handle = await open(target, 'wx', 0o600)
  try {
    await handle.writeFile(data)
    await handle.sync()
  } finally {
    await handle.close()
  }
  if (!exclusive) await rename(target, file)
}

/** A separate start receipt prevents replaying an uncertain invocation after a crash. */
export async function beginProviderCheckpoint(
  directory: string,
  request: RunRequest,
  references: string[] = [],
) {
  await mkdir(directory, { recursive: true })
  try {
    await writeDurable(
      path.join(directory, 'provider-start.json'),
      JSON.stringify({
        version: 1,
        requestHash: providerRequestHash(request, references),
      }),
      true,
    )
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST')
      throw new Error(
        'Esta tentativa já iniciou uma geração. Retome o resultado ou solicite uma nova tentativa.',
      )
    throw error
  }
}

/** Store the raw response before interpreting it or adding it to the asset library. */
export async function saveProviderCheckpoint(
  directory: string,
  request: RunRequest,
  mode: string,
  output: ProviderOutput,
  images: Buffer[],
  complete: boolean,
  references: string[] = [],
) {
  const identities = images.map((data) => ({
    sha256: createHash('sha256').update(data).digest('hex'),
    size: data.length,
  }))
  const record = checkpointSchema.parse({
    version: 1,
    requestHash: providerRequestHash(request, references),
    mode,
    complete,
    output,
    images: identities,
  })
  const serialized = JSON.stringify(record)
  if (Buffer.byteLength(serialized, 'utf8') > maxCheckpointBytes)
    throw new Error('Resposta preservada acima do limite')
  for (const [index, data] of images.entries()) {
    const identity = identities[index]
    if (!identity) throw new Error('Identidade da imagem ausente')
    await writeDurable(path.join(directory, `provider-image-${identity.sha256}.bin`), data)
  }
  await writeDurable(path.join(directory, 'provider-checkpoint.json'), serialized)
}

export async function readProviderCheckpoint(
  directory: string,
  request: RunRequest,
  references: string[] = [],
) {
  const file = path.join(directory, 'provider-checkpoint.json')
  let data: string
  try {
    if ((await stat(file)).size > maxCheckpointBytes)
      throw new Error('Resposta preservada acima do limite')
    data = await readFile(file, 'utf8')
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      throw new Error(
        'Não há resposta completa preservada. Uma nova geração precisa ser solicitada explicitamente.',
      )
    throw error
  }
  const record = checkpointSchema.parse(JSON.parse(data))
  if (
    record.requestHash !== providerRequestHash(request, references) ||
    record.output.provider !== request.provider
  )
    throw new Error('A resposta preservada pertence a outro pedido')
  if (!record.complete)
    throw new Error('A resposta preservada ficou incompleta. Nenhuma nova geração foi iniciada.')
  const images: Buffer[] = []
  for (const expected of record.images) {
    const file = path.join(directory, `provider-image-${expected.sha256}.bin`)
    if ((await stat(file)).size !== expected.size) throw new Error('Imagem preservada divergente')
    const data = await readFile(file)
    if (createHash('sha256').update(data).digest('hex') !== expected.sha256)
      throw new Error('Imagem preservada divergente')
    images.push(data)
  }
  return { ...record, images }
}
