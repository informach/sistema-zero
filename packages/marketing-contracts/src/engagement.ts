import { z } from 'zod'
import { idSchema, timestampSchema } from './common'

const token = z
  .string()
  .trim()
  .regex(/^[a-z0-9_-]{1,100}$/)
const message = (words: number, chars = 1000) =>
  z
    .string()
    .trim()
    .min(1)
    .max(chars)
    .refine((value) => value.split(/\s+/u).length <= words, `Use até ${words} palavras`)
export const conversationResponses = {
  help: 'Pode escrever sua dúvida por aqui. A equipe continua a conversa quando estiver disponível.',
  student:
    'Para uma dúvida da atividade, usem Preciso de ajuda na aula e acompanhem a resposta em Recados. Se for sobre acesso, podem escrever por aqui para a equipe ajudar quando estiver disponível.',
  stop: 'Tudo bem. Esta sequência foi encerrada. Você pode voltar a escrever quando quiser conversar.',
  child:
    'Que bom que você gostou das ideias do post. Esta conversa é com pais e responsáveis, então mostre o post a um adulto responsável por você. Até a próxima.',
  typed:
    'Recebemos sua mensagem, e esta resposta é automática. A Helena ou o Júlio respondem por aqui quando estiverem disponíveis. Para ver o projeto, toque em Ver o projeto na mensagem acima.',
  platform:
    'A criação acontece nas ferramentas do Sistema Zero. Seu filho pode se inspirar nesses jogos para inventar personagens, cenários e regras próprias. O Desafio ensina A Chave do Farol no nosso Estúdio.',
  community:
    'A Comunidade dos Criadores reúne os cursos e as ferramentas das próximas etapas. O uso livre das ferramentas é liberado conforme seu filho avança nas etapas da Comunidade. A assinatura já inclui o Desafio enquanto estiver ativa, e vocês podem conhecer essa opção diretamente.\n\nAqui estão os cursos, os planos e como funciona o acesso: https://sistemazero.com.br/kids/comunidade-dos-criadores/oferta?utm_source=instagram&utm_medium=dm&utm_campaign=instagram_manychat_desafio_14_2026&utm_content=d02_comunidade#planos',
} as const
export const responseKeySchema = z.enum([
  'help',
  'student',
  'stop',
  'child',
  'typed',
  'platform',
  'community',
])
export const conversationPlanSchema = z
  .object({
    schemaVersion: z.literal(1),
    keyword: z
      .string()
      .trim()
      .min(2)
      .max(30)
      .regex(/^[\p{L}\p{N}]+$/u),
    opening: message(25, 640).refine(
      (v) => /autom[aá]tic[ao]/iu.test(v),
      'Identifique a resposta automática',
    ),
    offer: message(70, 640),
    destination: z
      .string()
      .url()
      .max(2000)
      .refine((value) => {
        const url = new URL(value)
        return (
          url.protocol === 'https:' &&
          url.hostname === 'sistemazero.com.br' &&
          !url.username &&
          !url.password &&
          !url.port &&
          !url.search
        )
      }, 'Use uma página HTTPS do Sistema Zero sem parâmetros; a origem será acrescentada'),
    campaign: token,
    contentKey: token,
    offerReference: z.string().trim().min(5).max(1000),
    validUntil: timestampSchema,
    responses: z
      .object({
        help: message(100),
        student: message(100),
        stop: message(100),
        child: message(100),
        typed: message(100),
        platform: message(100),
        community: message(150),
      })
      .strict(),
  })
  .strict()
export type ConversationPlan = z.infer<typeof conversationPlanSchema>
export function conversationUrl(plan: ConversationPlan) {
  const url = new URL(plan.destination)
  url.searchParams.set('utm_source', 'instagram')
  url.searchParams.set('utm_medium', 'dm')
  url.searchParams.set('utm_campaign', plan.campaign)
  url.searchParams.set('utm_content', plan.contentKey)
  return url.toString()
}
export const channelPermissionSchema = z.enum(['read', 'reply', 'activate', 'admin'])
export type ChannelPermission = z.infer<typeof channelPermissionSchema>
export const capabilityProofSchema = z
  .object({
    evidence: z.string().trim().min(20).max(2000),
    validUntil: timestampSchema,
    publicAudience: z.literal(true),
    privateReply: z.literal(true),
    internalButton: z.literal(true),
    continuation: z.literal(true),
    manualReply: z.literal(true),
    signedWebhook: z.literal(true),
    externalReplies: z.enum(['observed', 'pause-first']),
    privateReplyHours: z.number().int().min(1).max(168),
    messageWindowHours: z.number().int().min(1).max(24),
  })
  .strict()
export type CapabilityProof = z.infer<typeof capabilityProofSchema>
const command = { operationId: idSchema, expectedVersion: z.number().int().nonnegative() }
export const configureChannelSchema = z
  .object({
    ...command,
    enabled: z.boolean(),
    proof: capabilityProofSchema.nullable(),
    retentionDays: z.number().int().min(1).max(90),
    maxSendsPerHour: z.number().int().min(1).max(200),
  })
  .strict()
export const channelMemberSchema = z
  .object({
    ...command,
    userId: idSchema,
    permissions: z.array(channelPermissionSchema).max(4),
  })
  .strict()
export const approveConversationSchema = z
  .object({
    operationId: idSchema,
    revisionId: idSchema,
    checkedOffer: z.literal(true),
    checkedExits: z.literal(true),
  })
  .strict()
export const activateConversationSchema = z
  .object({
    operationId: idSchema,
    publicationId: idSchema,
    revisionId: idSchema,
    accountId: idSchema,
    checkedPublication: z.literal(true),
  })
  .strict()
export const activationActionSchema = z
  .object({
    ...command,
    action: z.enum(['pause', 'resume', 'retire']),
    reason: z.string().trim().min(3).max(500),
  })
  .strict()
export const conversationTopicSchema = z.enum([
  'access',
  'project',
  'tools',
  'price',
  'continuity',
  'other',
])
export const conversationOutcomeSchema = z.enum([
  'needs-reply',
  'helped',
  'interested',
  'not-now',
  'closed',
])
export const conversationActionSchema = z.discriminatedUnion('action', [
  z
    .object({
      ...command,
      action: z.literal('classify'),
      topic: conversationTopicSchema,
      outcome: conversationOutcomeSchema,
    })
    .strict(),
  z.object({ ...command, action: z.enum(['take', 'close', 'erase']) }).strict(),
  z.object({ ...command, action: z.literal('resume'), requestEventId: idSchema }).strict(),
  z
    .object({
      ...command,
      action: z.literal('suppress'),
      reason: z.enum(['stop', 'student', 'child']),
    })
    .strict(),
  z
    .object({ ...command, action: z.literal('reply'), text: z.string().trim().min(1).max(1000) })
    .strict(),
  z.object({ ...command, action: z.literal('saved-reply'), key: responseKeySchema }).strict(),
  z
    .object({
      ...command,
      action: z.literal('resolve'),
      intentId: idSchema,
      result: z.enum(['accepted', 'not-sent']),
      externalId: z.string().max(200).nullable(),
      evidence: z.string().trim().min(10).max(1000),
    })
    .strict(),
])
export type ConversationAction = z.infer<typeof conversationActionSchema>
export const conversationApprovalSchema = z
  .object({ revisionId: idSchema, approved: z.boolean() })
  .strict()
export const activationStateSchema = z.enum([
  'awaiting-link',
  'active',
  'paused',
  'blocked',
  'retired',
])
export const journeyStateSchema = z.enum([
  'opening-pending',
  'waiting',
  'offer-pending',
  'presented',
  'human',
  'closed',
])
export type JourneyState = z.infer<typeof journeyStateSchema>
export const intentStateSchema = z.enum([
  'pending',
  'sending',
  'accepted',
  'failed',
  'cancelled',
  'uncertain',
])
export type IntentState = z.infer<typeof intentStateSchema>
export const channelViewSchema = z
  .object({
    id: idSchema,
    name: z.string(),
    version: z.number().int(),
    enabled: z.boolean(),
    canConfigure: z.boolean(),
    permissions: z.array(channelPermissionSchema),
    proof: capabilityProofSchema.nullable(),
    available: z.boolean(),
    reason: z.string().nullable(),
    retentionDays: z.number(),
    maxSendsPerHour: z.number(),
  })
  .strict()
export const activationViewSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    pieceId: idSchema,
    revisionId: idSchema,
    publicationId: idSchema,
    accountId: idSchema,
    version: z.number().int(),
    state: activationStateSchema,
    reason: z.string().nullable(),
    externalPostId: z.string().nullable(),
    createdAt: timestampSchema,
  })
  .strict()
export const conversationViewSchema = z
  .object({
    id: idSchema,
    accountId: idSchema,
    version: z.number().int(),
    state: z.enum(['automatic', 'waiting-human', 'owned', 'closed']),
    ownerId: idSchema.nullable(),
    suppression: z.enum(['stop', 'student', 'child', 'erased']).nullable(),
    lastInboundAt: timestampSchema.nullable(),
    updatedAt: timestampSchema,
    recipient: z.string(),
    topic: conversationTopicSchema.nullable(),
    outcome: conversationOutcomeSchema.nullable(),
  })
  .strict()
export const messageViewSchema = z
  .object({
    id: idSchema,
    direction: z.enum(['in', 'out']),
    text: z.string().nullable(),
    kind: z.string(),
    state: z.string(),
    at: timestampSchema,
    externalId: z.string().nullable(),
  })
  .strict()
export const conversationDetailSchema = z
  .object({
    conversation: conversationViewSchema,
    messages: z.array(messageViewSchema),
    journey: z
      .object({
        id: idSchema,
        state: journeyStateSchema,
        campaign: z.string(),
        contentKey: z.string(),
        plan: conversationPlanSchema,
        createdAt: timestampSchema,
      })
      .nullable(),
  })
  .strict()
export const conversationPageSchema = z
  .object({ items: z.array(conversationViewSchema), nextCursor: idSchema.nullable() })
  .strict()
export const channelMemberViewSchema = z
  .object({
    id: idSchema,
    name: z.string(),
    active: z.boolean(),
    permissions: z.array(channelPermissionSchema),
  })
  .strict()
export const engagementHealthSchema = z
  .object({
    asOf: timestampSchema,
    pendingInbound: z.number().int(),
    pendingOutbound: z.number().int(),
    sending: z.number().int(),
    uncertain: z.number().int(),
    failed24h: z.number().int(),
    waitingHuman: z.number().int(),
    oldestPendingAt: timestampSchema.nullable(),
  })
  .strict()
export const engagementSummarySchema = z
  .object({
    from: timestampSchema,
    to: timestampSchema,
    journeys: z.number(),
    openingAccepted: z.number(),
    interacted: z.number(),
    offerAccepted: z.number(),
    human: z.number(),
    suppressed: z.number(),
    uncertain: z.number(),
    failed: z.number(),
    pending: z.number(),
    topics: z.array(
      z.object({ topic: conversationTopicSchema, count: z.number().int().nonnegative() }),
    ),
    outcomes: z.array(
      z.object({ outcome: conversationOutcomeSchema, count: z.number().int().nonnegative() }),
    ),
  })
  .strict()
