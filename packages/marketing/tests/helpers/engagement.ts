import { randomUUID } from 'node:crypto'
import {
  type AssetManifest,
  conversationPlanSchema,
  conversationResponses,
  createPieceBatch,
} from '@sistemazero/marketing-contracts'
import type { Actor } from '../../src/application/actor'
import { ApprovalService } from '../../src/application/workspace/approval.service'
import { WorkspaceService } from '../../src/application/workspace/workspace.service'
import { ENGAGEMENT_SCOPES } from '../../src/domain/engagement/policy'
import { DrizzleApprovalRepository } from '../../src/infrastructure/persistence/drizzle/approval.repository'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleEngagementRepository } from '../../src/infrastructure/persistence/drizzle/engagement.repository'
import {
  contents,
  publications,
  socialAccounts,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleWorkspaceRepository } from '../../src/infrastructure/persistence/drizzle/workspace.repository'
import {
  editorialAssets,
  editorialDeliveries,
} from '../../src/infrastructure/persistence/drizzle/workspace-schema'
import { createSecretBox } from '../../src/infrastructure/security/secret-box'
import { fixtureDirectory } from './staff-directory'
export const reviewKey = Buffer.alloc(32, 9).toString('base64')
export const reviewBox = createSecretBox(reviewKey)
export function reviewPlan() {
  return conversationPlanSchema.parse({
    schemaVersion: 1,
    keyword: 'FERIAS',
    opening: 'Resposta automática da Helena e do Júlio. Conheça o projeto.',
    offer: 'Conheça o Desafio.',
    destination: 'https://sistemazero.com.br/kids/desafio/oferta',
    campaign: 'instagram_manychat_desafio_14_2026',
    contentKey: 'mc07_ferias',
    offerReference: 'Oferta conferida na página publicada',
    validUntil: new Date(Date.now() + 86400000).toISOString(),
    responses: conversationResponses,
  })
}
export async function engagementFixture(connection: DbConnection) {
  const owner: Actor = {
    userId: randomUUID(),
    displayName: 'Equipe de teste',
    role: 'admin',
    status: 'active',
  }
  const workspace = new WorkspaceService(
    new DrizzleWorkspaceRepository(connection.db),
    fixtureDirectory,
  )
  const repo = new DrizzleEngagementRepository(connection.db, 'v25.0', true)
  const projectId = randomUUID(),
    accountId = randomUUID(),
    externalId = String(BigInt(`0x${randomUUID().replaceAll('-', '').slice(0, 12)}`)),
    now = new Date()
  await connection.db.insert(socialAccounts).values({
    id: accountId,
    network: 'instagram',
    externalId,
    displayName: 'Conta isolada',
    accessTokenEnc: reviewBox.seal('test-token'),
    scopes: [...ENGAGEMENT_SCOPES],
    metadata: { pageId: '123', engagementConnectionId: randomUUID() },
    connectedBy: owner.userId,
    createdAt: now,
    updatedAt: now,
  })
  const proof = {
    evidence: 'Servidor controlado de testes; NÃO é prova da conta Meta real',
    validUntil: new Date(Date.now() + 3600000).toISOString(),
    publicAudience: true,
    privateReply: true,
    internalButton: true,
    continuation: true,
    manualReply: true,
    signedWebhook: true,
    externalReplies: 'pause-first',
    privateReplyHours: 24,
    messageWindowHours: 24,
  }
  // Runtime parsing is exercised by the service tests; this fixture uses the same contract.
  const { configureChannelSchema } = await import('@sistemazero/marketing-contracts')
  await repo.configure(
    owner.userId,
    true,
    accountId,
    configureChannelSchema.parse({
      operationId: randomUUID(),
      expectedVersion: 0,
      enabled: true,
      proof,
      retentionDays: 90,
      maxSendsPerHour: 30,
    }),
  )
  await workspace.create(owner, {
    schemaVersion: 1,
    operationId: randomUUID(),
    id: projectId,
    name: 'Engajamento',
    product: 'Sistema Zero',
  })
  const batch = createPieceBatch({
    projectId,
    title: 'Férias',
    brief: 'Conversa solicitada',
    format: 'feed',
    medium: 'image',
  })
  const piece = batch.changes.find((c) => c.document?.kind === 'piece')
  const representation = batch.changes.find((c) => c.document?.kind === 'representation')
  const component = batch.changes.find((c) => c.document?.kind === 'component')
  if (
    piece?.document?.kind !== 'piece' ||
    representation?.document?.kind !== 'representation' ||
    component?.document?.kind !== 'component'
  )
    throw new Error('Fixture incompleta')
  const plan = reviewPlan()
  piece.document.conversation = plan
  const manifest: AssetManifest = {
    schemaVersion: 1,
    id: randomUUID(),
    projectId,
    name: 'final.png',
    sha256: 'a'.repeat(64),
    size: 1024,
    mime: 'image/png',
    role: 'final',
    sourceAssetId: null,
    width: 1080,
    height: 1080,
    durationMs: null,
    codec: null,
    rotation: null,
  }
  await connection.db.insert(editorialAssets).values({
    id: manifest.id,
    projectId,
    manifest,
    storageKey: `review/${manifest.id}`,
    confirmed: true,
    createdBy: owner.userId,
  })
  component.document.assetIds = [manifest.id]
  component.document.alt = 'Demonstração do projeto'
  const saved = await workspace.applyBatch(owner, batch)
  if (saved.status !== 'applied') throw new Error('Revisões não persistidas')
  const revisionId = saved.items.find((i) => i.id === piece.entityId)?.revisionId
  if (!revisionId) throw new Error('Revisão não disponível')
  const approval = new ApprovalService(new DrizzleApprovalRepository(connection.db))
  const preview = await approval.preview(owner, projectId, representation.entityId)
  const edition = await approval.approve(owner, projectId, {
    schemaVersion: 1,
    operationId: randomUUID(),
    representationId: representation.entityId,
    expectedHash: preview.hash,
    checks: { copy: true, visual: true, destination: true },
  })
  const contentId = randomUUID(),
    publicationId = randomUUID()
  await connection.db.insert(contents).values({
    id: contentId,
    title: 'Férias',
    contentType: 'static_post',
    createdBy: owner.userId,
    createdAt: now,
    updatedAt: now,
  })
  await connection.db.insert(publications).values({
    id: publicationId,
    contentId,
    network: 'instagram',
    format: 'ig_feed',
    socialAccountId: accountId,
    status: 'published',
    externalPostId: `media-${externalId}`,
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  })
  await connection.db.insert(editorialDeliveries).values({
    publicationId,
    contentId,
    projectId,
    editionId: edition.id,
    representationId: representation.entityId,
  })
  return {
    owner,
    workspace,
    repo,
    projectId,
    accountId,
    externalId,
    pieceId: piece.entityId,
    revisionId,
    publicationId,
    plan,
  }
}
