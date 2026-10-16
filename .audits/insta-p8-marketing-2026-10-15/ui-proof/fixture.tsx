import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { conversationPlanSchema, conversationResponses, createPieceBatch, itemSchema, projectSchema, deliverySchema } from '../../../packages/marketing-contracts/src'
import { ConversationPanel } from '../../../packages/marketing-workbench/src/conversation-panel'
import { EngagementInbox } from '../../../packages/marketing-workbench/src/engagement-inbox'
import type { WorkbenchPort } from '../../../packages/marketing-workbench/src/port'
import '../../../packages/marketing-desktop/src/renderer/console.css'

const uuid = () => crypto.randomUUID(), now = new Date().toISOString()
const userId = uuid(), accountId = uuid(), conversationId = uuid(), projectId = uuid(), revisionId = uuid(), publicationId = uuid()
const plan = conversationPlanSchema.parse({ schemaVersion: 1, keyword: 'FERIAS', opening: 'Resposta automática da Helena e do Júlio. Vamos conhecer o projeto?', offer: 'Conheça o Desafio e crie A Chave do Farol.', destination: 'https://sistemazero.com.br/kids/desafio/oferta', campaign: 'instagram_manychat_desafio_14_2026', contentKey: 'mc07_ferias', offerReference: 'Oferta de teste conferida pela equipe', validUntil: new Date(Date.now() + 86400000).toISOString(), responses: conversationResponses })
const batch = createPieceBatch({ projectId, title: 'Férias', brief: 'Conversa solicitada', format: 'feed', medium: 'image' })
const piece = batch.changes.find((c) => c.document?.kind === 'piece'), representation = batch.changes.find((c) => c.document?.kind === 'representation')
if (piece?.document?.kind !== 'piece' || !representation) throw new Error('Fixture inválida')
piece.document.conversation = plan
const item = itemSchema.parse({ id: piece.entityId, projectId, kind: 'piece', revisionId, document: piece.document, archived: false, updatedAt: now })
const project = projectSchema.parse({ id: projectId, name: 'Projeto de revisão', product: 'Sistema Zero', createdBy: userId, createdAt: now, sequence: 1, permissions: ['read', 'edit', 'approve', 'publish'] })
const channel = { id: accountId, name: 'Conta isolada de revisão', version: 1, enabled: true, canConfigure: true, permissions: ['read', 'reply', 'activate', 'admin'], proof: { evidence: 'Somente teste local; não comprova Meta real', validUntil: plan.validUntil, publicAudience: true, privateReply: true, internalButton: true, continuation: true, manualReply: true, signedWebhook: true, externalReplies: 'pause-first', privateReplyHours: 24, messageWindowHours: 24 }, available: true, reason: null, retentionDays: 90, maxSendsPerHour: 30 }
let conversation = { id: conversationId, accountId, version: 1, state: 'waiting-human', ownerId: null as string | null, suppression: null, lastInboundAt: now, updatedAt: now, recipient: 'Contato de revisão', topic: null, outcome: null }
const delivery = deliverySchema.parse({ schemaVersion: 1, id: publicationId, projectId, editionId: uuid(), editionHash: 'a'.repeat(64), representationId: representation.entityId, sourcePublicationId: null, version: 1, format: 'ig_feed', caption: 'Comente FERIAS', title: 'Férias', status: 'published', publishMode: 'auto', socialAccountId: accountId, scheduledAt: null, publishedAt: now, externalUrl: 'https://instagram.com/p/test', externalPostId: '123', lastError: null, started: true, createdAt: now })
let approved = false, lost = false
const commands: Array<{ path: string; body: unknown }> = [], replies = new Set<string>(), drafts: unknown[] = []
Object.assign(window, { proof: { commands, replies, drafts, accountId, publicationId } })
const unavailable = async () => { throw new Error('Operação fora desta prova local') }
const port: WorkbenchPort = {
  location: 'web', identity: 'local-review', userId,
  projects: async () => [project], createProject: unavailable, view: unavailable, assetUrl: unavailable,
  save: async (value) => { drafts.push(value) }, saveBatch: unavailable, resolveDrafts: unavailable, synchronize: async () => {}, subscribe: () => () => {}, openDesktop: unavailable,
  async request(path, method = 'GET', body) {
    if (method === 'POST') {
      commands.push({ path, body })
      const command = body as { action?: string; operationId: string; text?: string }
      if (path.endsWith('/approvals')) approved = true
      if (command.action === 'take') conversation = { ...conversation, version: 2, state: 'owned', ownerId: userId }
      if (command.action === 'reply') {
        replies.add(command.operationId)
        if (!lost) { lost = true; throw new Error('Resposta HTTP perdida após persistência simulada') }
      }
      return { version: conversation.version }
    }
    if (path.endsWith('/engagement/accounts')) return [channel]
    if (path.includes('/approval?')) return { revisionId, approved }
    if (path.endsWith('/engagement')) return []
    if (path.endsWith('/deliveries')) return { items: [delivery], nextCursor: null }
    if (path.endsWith('/members')) return [{ id: userId, name: 'Operadora de revisão', active: true, permissions: channel.permissions }]
    if (path.endsWith('/health')) return { asOf: now, pendingInbound: 0, pendingOutbound: replies.size, sending: 0, uncertain: 0, failed24h: 0, waitingHuman: 1, oldestPendingAt: null }
    if (path.endsWith('/conversations')) return { items: [conversation], nextCursor: null }
    if (path.endsWith(`/conversations/${conversationId}`)) return { conversation, messages: [{ id: uuid(), direction: 'in', text: 'Quero saber como começa o projeto.', kind: 'message', state: 'processed', at: now, externalId: null }], journey: { id: uuid(), state: 'human', campaign: plan.campaign, contentKey: plan.contentKey, plan, createdAt: now } }
    throw new Error(`Rota não preparada na prova: ${path}`)
  },
}
const root = document.getElementById('root')
if (!root) throw new Error('Root ausente')
createRoot(root).render(<main className="mx-auto max-w-6xl space-y-6 p-4"><h1 className="text-xl font-semibold">Revisão local · dados simulados</h1><ConversationPanel port={port} project={project} piece={{ id: item.id, confirmed: item, document: item.document, archived: false, pending: [], conflict: false, error: null }} representationId={representation.entityId} onChanged={async () => {}} /><EngagementInbox port={port} team={[]} onClose={() => {}} /></main>)
