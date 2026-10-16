import { createHash } from 'node:crypto'
import { type ChannelPermission, canonicalJson } from '@sistemazero/marketing-contracts'
import { and, eq } from 'drizzle-orm'
import { capabilityAvailable, ENGAGEMENT_SCOPES } from '../../../domain/engagement/policy'
import type { SocialAccount } from '../../../domain/social-account/social-account'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import {
  engagementChannels as channels,
  engagementMembers as members,
  engagementReceipts as receipts,
} from './engagement-schema'
import type { WorkspaceTransaction } from './workspace.repository'

export const unavailable = () =>
  new WorkspaceError('OBJECT_INACCESSIBLE', 'Conta ou conversa não disponível para esta pessoa')
export function connectionIdentity(account: SocialAccount) {
  return typeof account.metadata.engagementConnectionId === 'string'
    ? account.metadata.engagementConnectionId
    : `legacy:${account.createdAt.toISOString()}`
}
export function channelUnavailable(
  channel: typeof channels.$inferSelect,
  account: SocialAccount,
  graphVersion: string,
  now: Date,
) {
  if (!channel.enabled) return 'Recepção configurada; envio da conta pausado'
  if (account.status !== 'connected' || !account.accessTokenEnc) return 'Reconecte a conta'
  if (channel.connectionId !== connectionIdentity(account))
    return 'A conexão mudou; refaça a prova de capacidade'
  if (channel.graphVersion !== graphVersion) return 'A versão da API mudou; refaça a prova'
  if (!ENGAGEMENT_SCOPES.every((scope) => account.scopes.includes(scope)))
    return 'Permissões de conversas não concedidas'
  if (!capabilityAvailable(channel.proof, now)) return 'Prova de capacidade ausente ou vencida'
  return null
}
export async function channelAccess(
  tx: WorkspaceTransaction,
  accountId: string,
  actorId: string,
  permission: ChannelPermission,
  globalAdmin = false,
) {
  const [channel] = await tx
    .select()
    .from(channels)
    .where(eq(channels.accountId, accountId))
    .for('update')
  if (!channel) throw unavailable()
  const [member] = await tx
    .select()
    .from(members)
    .where(and(eq(members.accountId, accountId), eq(members.userId, actorId)))
  if (
    !(globalAdmin && permission === 'admin') &&
    !member?.permissions.some((p) => p === permission || p === 'admin')
  )
    throw unavailable()
  return channel
}
export const commandHash = (action: string, value: unknown) =>
  createHash('sha256').update(canonicalJson({ action, value })).digest('hex')
export async function previousCommand(
  tx: WorkspaceTransaction,
  accountId: string,
  actorId: string,
  operationId: string,
  hash: string,
) {
  const [row] = await tx
    .select()
    .from(receipts)
    .where(
      and(
        eq(receipts.accountId, accountId),
        eq(receipts.actorId, actorId),
        eq(receipts.operationId, operationId),
      ),
    )
  if (row && row.hash !== hash)
    throw new WorkspaceError('OPERATION_REUSED', 'Identificador reutilizado com outro pedido')
  return row
}
export function checkVersion(actual: number, expected: number) {
  if (actual !== expected)
    throw new WorkspaceError(
      'CONCURRENCY_CONFLICT',
      'O estado mudou. Atualize antes de repetir a ação.',
    )
}
export async function recordCommand(
  tx: WorkspaceTransaction,
  accountId: string,
  actorId: string,
  operationId: string,
  hash: string,
  result: unknown,
) {
  await tx.insert(receipts).values({ accountId, actorId, operationId, hash, result })
  return result
}
