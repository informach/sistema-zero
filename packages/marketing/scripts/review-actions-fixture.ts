import { createHash, randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { type AssetManifest, createPieceBatch } from '@sistemazero/marketing-contracts'
import { z } from 'zod'
import { ApprovalService } from '../src/application/workspace/approval.service'
import { WorkspaceService } from '../src/application/workspace/workspace.service'
import { DrizzleApprovalRepository } from '../src/infrastructure/persistence/drizzle/approval.repository'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleWorkspaceRepository } from '../src/infrastructure/persistence/drizzle/workspace.repository'
import { editorialAssets } from '../src/infrastructure/persistence/drizzle/workspace-schema'
import { fixtureDirectory } from '../tests/helpers/staff-directory'

const root = path.resolve('packages/marketing-desktop/.cache/connected-proof'),
  user = z
    .object({ userId: z.string().uuid(), origin: z.literal('http://127.0.0.1:15312') })
    .parse(JSON.parse(await readFile(path.join(root, 'fixture.json'), 'utf8'))),
  connection = createDbConnection('postgres://postgres@127.0.0.1:15439/marketing_review')
try {
  const actor = {
      userId: user.userId,
      displayName: 'Revisão Marketing',
      role: 'staff',
      status: 'active',
    },
    projectId = randomUUID(),
    workspace = new WorkspaceService(
      new DrizzleWorkspaceRepository(connection.db),
      fixtureDirectory,
    ),
    approval = new ApprovalService(new DrizzleApprovalRepository(connection.db))
  await workspace.create(actor, {
    schemaVersion: 1,
    id: projectId,
    operationId: randomUUID(),
    name: 'Revisão de confirmação pendente',
    product: 'Revisão local',
  })
  const bytes = await readFile(
      'packages/marketing-desktop/.cache/hybrid-video-proof/source-art/art.png',
    ),
    manifest: AssetManifest = {
      schemaVersion: 1,
      id: randomUUID(),
      projectId,
      name: 'art.png',
      sha256: createHash('sha256').update(bytes).digest('hex'),
      size: bytes.length,
      mime: 'image/png',
      role: 'final',
      sourceAssetId: null,
      width: 1080,
      height: 1920,
      durationMs: null,
      codec: null,
      rotation: null,
    }
  // Local storage fixture. This proof exercises receipts/UI; it does not claim a remote R2 transfer.
  await connection.db.insert(editorialAssets).values({
    id: manifest.id,
    projectId,
    manifest,
    storageKey: `editorial/${projectId}/${manifest.id}/${manifest.sha256}`,
    confirmed: true,
    createdBy: actor.userId,
  })
  const batch = createPieceBatch({
      projectId,
      title: 'Story para conferência',
      brief: 'Prova de recuperação sem duplicação',
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
  component.document.alt = 'Uma criação'
  component.document.assetIds = [manifest.id]
  representation.document.caption = 'Conheça a atividade.'
  await workspace.applyBatch(actor, batch)
  const preview = await approval.preview(actor, projectId, representation.entityId)
  await writeFile(
    path.join(root, 'action-fixture.json'),
    JSON.stringify({
      ...user,
      origin: 'http://127.0.0.1:15314',
      projectId,
      representationId: representation.entityId,
      expectedHash: preview.hash,
    }),
  )
  console.log(JSON.stringify({ projectId, prepared: true }))
} finally {
  await connection.close()
}
