import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { type AssetManifest, createPieceBatch } from '@sistemazero/marketing-contracts'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { ApprovalService } from '../src/application/workspace/approval.service'
import { WorkspaceService } from '../src/application/workspace/workspace.service'
import type { MediaStore } from '../src/domain/ports/media-store.port'
import {
  createEditorialArchive,
  restoreEditorialAssets,
  verifyEditorialArchive,
} from '../src/infrastructure/backup/editorial-archive'
import {
  assertEmptyRestoreTarget,
  quarantineRestoredWork,
} from '../src/infrastructure/backup/postgres-archive'
import { DrizzleApprovalRepository } from '../src/infrastructure/persistence/drizzle/approval.repository'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import {
  contents,
  publications,
  socialAccounts,
} from '../src/infrastructure/persistence/drizzle/schema'
import { DrizzleWorkspaceRepository } from '../src/infrastructure/persistence/drizzle/workspace.repository'
import { editorialAssets } from '../src/infrastructure/persistence/drizzle/workspace-schema'
import { fixtureDirectory } from '../tests/helpers/staff-directory'

// Fixed, owned review cluster. Never reads DATABASE_URL or invokes a production service.
const root = path.resolve('.cache/backup-proof'),
  suffix = randomUUID().replaceAll('-', ''),
  sourceName = `marketing_backup_source_${suffix}`,
  targetName = `marketing_backup_target_${suffix}`,
  container = 'marketing-review-pg-20261015',
  signal = AbortSignal.timeout(120000),
  admin = createDbConnection('postgres://postgres@127.0.0.1:15439/marketing_review')
await mkdir(root, { recursive: true })
await admin.sql`create database ${admin.sql(sourceName)}`
await admin.sql`create database ${admin.sql(targetName)}`
const source = createDbConnection(`postgres://postgres@127.0.0.1:15439/${sourceName}`),
  target = createDbConnection(`postgres://postgres@127.0.0.1:15439/${targetName}`),
  directory = path.join(root, suffix)
class ReviewStore implements Pick<MediaStore, 'head' | 'getStream' | 'put'> {
  objects = new Map<string, Uint8Array>()
  writes = 0
  async head(key: string) {
    const object = this.objects.get(key)
    return { exists: !!object, sizeBytes: object?.byteLength ?? null, contentType: null }
  }
  async getStream(key: string) {
    const object = this.objects.get(key)
    if (!object) throw new Error('Arquivo ausente')
    return new Blob([object]).stream()
  }
  async put(input: Parameters<MediaStore['put']>[0]) {
    this.writes++
    this.objects.set(input.key, new Uint8Array(await new Response(input.body).arrayBuffer()))
  }
}
async function pg(args: string[], output?: string, input?: string) {
  const child = Bun.spawn(['docker', 'exec', ...(input ? ['-i'] : []), container, ...args], {
    stdin: input ? Bun.file(input) : 'ignore',
    stdout: output ? Bun.file(output) : 'ignore',
    stderr: 'pipe',
    signal,
  })
  const error = await new Response(child.stderr).text()
  if ((await child.exited) !== 0)
    throw new Error(`Ferramenta PostgreSQL da revisão: ${error.slice(-2000)}`)
}
try {
  await migrate(source.db, {
    migrationsFolder: 'packages/marketing/src/infrastructure/persistence/drizzle/migrations',
    migrationsTable: 'marketing_migrations',
  })
  const actor = {
      userId: randomUUID(),
      displayName: 'Revisão backup',
      role: 'staff',
      status: 'active',
    },
    workspace = new WorkspaceService(new DrizzleWorkspaceRepository(source.db), fixtureDirectory),
    approvals = new ApprovalService(new DrizzleApprovalRepository(source.db)),
    projectId = randomUUID()
  await workspace.create(actor, {
    schemaVersion: 1,
    id: projectId,
    operationId: randomUUID(),
    name: 'Acervo anterior ao snapshot',
    product: 'Revisão',
  })
  const bytes = await readFile(
      'packages/marketing-desktop/.cache/hybrid-video-proof/source-art/art.png',
    ),
    hash = createHash('sha256').update(bytes).digest('hex'),
    asset: AssetManifest = {
      schemaVersion: 1,
      id: randomUUID(),
      projectId,
      name: 'art.png',
      sha256: hash,
      size: bytes.length,
      mime: 'image/png',
      role: 'final',
      sourceAssetId: null,
      width: 1080,
      height: 1920,
      durationMs: null,
      codec: null,
      rotation: null,
    },
    key = `editorial/${projectId}/${asset.id}/${hash}`,
    store = new ReviewStore()
  store.objects.set(key, bytes)
  await source.db.insert(editorialAssets).values({
    id: asset.id,
    projectId,
    manifest: asset,
    storageKey: key,
    confirmed: true,
    createdBy: actor.userId,
  })
  const batch = createPieceBatch({
      projectId,
      title: 'Peça preservada',
      brief: 'Restauração',
      format: 'story',
      medium: 'image',
    }),
    component = batch.changes.find((change) => change.document?.kind === 'component'),
    representation = batch.changes.find((change) => change.document?.kind === 'representation')
  if (
    component?.document?.kind !== 'component' ||
    representation?.document?.kind !== 'representation'
  )
    throw new Error('Fixture inválida')
  component.document.body = 'Uma criação de cada vez.'
  component.document.alt = 'Criação'
  component.document.assetIds = [asset.id]
  representation.document.caption = 'Conheça a atividade.'
  await workspace.applyBatch(actor, batch)
  const preview = await approvals.preview(actor, projectId, representation.entityId),
    edition = await approvals.approve(actor, projectId, {
      schemaVersion: 1,
      operationId: randomUUID(),
      representationId: representation.entityId,
      expectedHash: preview.hash,
      checks: { copy: true, visual: true, destination: true },
    }),
    now = new Date(),
    contentId = randomUUID(),
    publicationId = randomUUID(),
    accountId = randomUUID()
  await source.db.insert(contents).values({
    id: contentId,
    title: 'Entrega em trânsito',
    contentType: 'story',
    createdBy: actor.userId,
    createdAt: now,
    updatedAt: now,
  })
  await source.db.insert(socialAccounts).values({
    id: accountId,
    network: 'instagram',
    externalId: 'review-only',
    connectedBy: actor.userId,
    displayName: 'Revisão',
    status: 'connected',
    createdAt: now,
    updatedAt: now,
  })
  await source.db.insert(publications).values({
    id: publicationId,
    contentId,
    socialAccountId: accountId,
    network: 'instagram',
    format: 'ig_story',
    status: 'scheduled',
    scheduledAt: now,
    providerSession: { creationId: 'checkpoint-preservado' },
    createdAt: now,
    updatedAt: now,
  })
  const manifest = await createEditorialArchive({
    connection: source,
    store,
    directory,
    signal,
    dump: async (snapshot, selection, destination) => {
      if (selection === 'marketing')
        await source.sql`update marketing.editorial_projects set name = 'Alterado depois do snapshot' where id = ${projectId}`
      await pg(
        [
          'pg_dump',
          '-U',
          'postgres',
          '-d',
          sourceName,
          '--format=custom',
          '--no-owner',
          '--no-privileges',
          `--snapshot=${snapshot}`,
          ...(selection === 'marketing'
            ? ['--schema=marketing']
            : ['--table=drizzle.marketing_migrations']),
        ],
        destination,
      )
    },
  })
  assert.equal(manifest.assets, 1)
  await verifyEditorialArchive(directory, signal)
  await assertEmptyRestoreTarget(target)
  for (const name of ['marketing.dump', 'journal.dump'])
    await pg(
      [
        'pg_restore',
        '-U',
        'postgres',
        '-d',
        targetName,
        '--exit-on-error',
        '--single-transaction',
        '--no-owner',
        '--no-privileges',
      ],
      undefined,
      path.join(directory, name),
    )
  await quarantineRestoredWork(target)
  const restored = await new ApprovalService(new DrizzleApprovalRepository(target.db)).get(
    actor,
    projectId,
    edition.id,
  )
  assert.deepEqual(restored, edition)
  assert.equal(
    (await target.sql`select name from marketing.editorial_projects where id = ${projectId}`)[0]
      ?.name,
    'Acervo anterior ao snapshot',
  )
  const publication = (
    await target.sql`select * from marketing.publications where id = ${publicationId}`
  )[0]
  assert.equal(publication?.status, 'failed')
  assert.equal(publication?.provider_session.creationId, 'checkpoint-preservado')
  assert.equal(publication?.provider_session.restoredFromBackup, true)
  assert.equal(
    (await target.sql`select status from marketing.social_accounts where id = ${accountId}`)[0]
      ?.status,
    'disabled',
  )
  await assert.rejects(() => assertEmptyRestoreTarget(target), /sem schema/)
  const destination = new ReviewStore(),
    first = await restoreEditorialAssets(directory, destination, signal),
    replay = await restoreEditorialAssets(directory, destination, signal)
  assert.equal(first.restored, 1)
  assert.equal(replay.preserved, 1)
  assert.equal(destination.writes, 1)
  assert.deepEqual(Buffer.from(destination.objects.get(key) ?? []), bytes)
  destination.objects.set(key, new Uint8Array([1, 2, 3]))
  await assert.rejects(() => restoreEditorialAssets(directory, destination, signal), /diverge/)
  assert.equal(destination.writes, 1)
  const original = path.join(directory, 'assets', `${asset.id}.bin`)
  await writeFile(original, 'corrompido')
  const emptyDestination = new ReviewStore()
  await assert.rejects(
    () => restoreEditorialAssets(directory, emptyDestination, signal),
    /Integridade/,
  )
  assert.equal(emptyDestination.writes, 0)
  await writeFile(original, bytes)
  await verifyEditorialArchive(directory, signal)
  const evidence = {
    passed: true,
    sourceName,
    targetName,
    archive: directory,
    assets: 1,
    sha256: hash,
    exactEdition: true,
    concurrentSnapshot: true,
    externalActionsHeld: true,
    checkpointPreserved: true,
    overwriteRefused: true,
    corruptionBeforeWrites: true,
    repeatedRestoreIdempotent: true,
    storageAdapter: 'local in-memory review fixture; not R2',
  }
  await writeFile(path.join(root, 'evidence.json'), JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify(evidence))
} finally {
  await source.close()
  await target.close()
  await admin.close()
}
