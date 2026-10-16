import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { WorkspaceAssetsService } from '../packages/marketing/src/application/workspace/workspace-assets.service'
import { R2MediaStore } from '../packages/marketing/src/infrastructure/gateways/r2/r2-media-store'
import { createDbConnection } from '../packages/marketing/src/infrastructure/persistence/drizzle/db'
import { DrizzleWorkspaceAssetsRepository } from '../packages/marketing/src/infrastructure/persistence/drizzle/workspace-assets.repository'
import { WorkspaceAssetVerifier } from '../packages/marketing/src/infrastructure/workers/workspace-asset-verifier'
import { uploadStartSchema } from '../packages/marketing-contracts/src/assets'
import { reviewStorage } from './marketing-review-storage'

async function main() {
  if (!process.argv.includes('--staging-storage'))
    throw new Error('Use somente o bucket de revisão')
  const root = path.resolve(import.meta.dir, '..')
  const directory = path.join(root, '.cache/multipart-expiry-proof')
  await mkdir(directory, { recursive: true })
  const fixture = z
    .object({ userId: z.string().uuid(), input: uploadStartSchema })
    .parse(
      JSON.parse(
        await readFile(
          path.join(root, 'packages/marketing-desktop/.cache/large-transfer-proof/state.json'),
          'utf8',
        ),
      ),
    )
  const config = z
    .object({
      R2_ACCOUNT_ID: z.string(),
      R2_ACCESS_KEY_ID: z.string(),
      R2_SECRET_ACCESS_KEY: z.string(),
      R2_MARKETING_BUCKET: z.literal('testes-marketing'),
    })
    .parse(await reviewStorage())
  const store = new R2MediaStore({
    accountId: config.R2_ACCOUNT_ID,
    accessKeyId: config.R2_ACCESS_KEY_ID,
    secretAccessKey: config.R2_SECRET_ACCESS_KEY,
    bucket: config.R2_MARKETING_BUCKET,
  })
  const password = (
    await readFile(path.join(root, '.cache/pg16-native-review/password'), 'utf8')
  ).trim()
  const connection = createDbConnection(
    `postgres://postgres:${encodeURIComponent(password)}@127.0.0.1:15440/marketing_review`,
  )
  try {
    const repo = new DrizzleWorkspaceAssetsRepository(connection.db)
    const service = new WorkspaceAssetsService(repo, store)
    const actor = {
      userId: fixture.userId,
      displayName: 'Revisão isolada',
      role: 'staff' as const,
      status: 'active' as const,
    }
    const bytes = Buffer.from(
      'Prova de expiração: original preservado, identidade única e hash conferido.',
    )
    const input = uploadStartSchema.parse({
      operationId: randomUUID(),
      manifest: {
        ...fixture.input.manifest,
        id: randomUUID(),
        name: 'expiry-proof.txt',
        size: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      },
    })
    const project = input.manifest.projectId,
      id = input.manifest.id
    const put = async () => {
      const part = await service.part(actor, project, id, {
        number: 1,
        md5: createHash('md5').update(bytes).digest('base64'),
      })
      const response = await fetch(part.url, {
        method: 'PUT',
        body: bytes,
        headers: part.headers,
        signal: AbortSignal.timeout(30_000),
      })
      await response.body?.cancel()
      assert.equal(response.ok, true)
    }
    await service.start(actor, input)
    await put()
    const previous = await repo.get(actor.userId, project, id, true)
    assert(previous.uploadId)
    // Abort only this proof's newly allocated incomplete upload; no existing object is deleted.
    await store.abortMultipart(previous.storageKey, previous.uploadId)
    const expired = await service.get(actor, project, id)
    assert.equal(expired.bytesReceived, false)
    assert.match(expired.error ?? '', /Retome/)
    const renewed = await Promise.all([service.start(actor, input), service.start(actor, input)])
    assert(renewed.every((view) => view.manifest.id === id && !view.error && !view.bytesReceived))
    const current = await repo.get(actor.userId, project, id, true)
    assert.notEqual(current.uploadId, previous.uploadId)
    assert.equal(
      (await repo.resetExpiredUpload(actor.userId, project, id, previous.uploadId)).uploadId,
      current.uploadId,
    )
    await put()
    assert.equal((await service.complete(actor, project, id)).state, 'verifying')
    const verifier = new WorkspaceAssetVerifier(repo, store, {
      debug() {},
      info() {},
      warn() {},
      error() {
        throw new Error('A verificação real falhou')
      },
    })
    await verifier.tick()
    assert.equal((await service.get(actor, project, id)).state, 'confirmed')
    const evidence = {
      projectId: project,
      assetId: id,
      storage: 'R2 testes-marketing',
      sessionRemoval: 'explicit abort of this proof upload',
      elapsedExpirationNotWaited: true,
      missingSessionRecognized: true,
      concurrentRecovery: true,
      staleResetFenced: true,
      unchangedManifest: true,
      sha256Verified: input.manifest.sha256,
    }
    await writeFile(path.join(directory, 'evidence.json'), JSON.stringify(evidence, null, 2))
    console.log(JSON.stringify(evidence))
  } finally {
    await connection.close()
  }
}
await main()
