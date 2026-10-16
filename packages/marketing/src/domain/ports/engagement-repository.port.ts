import type {
  activateConversationSchema,
  activationActionSchema,
  activationViewSchema,
  approveConversationSchema,
  ChannelPermission,
  ConversationAction,
  channelMemberSchema,
  channelViewSchema,
  configureChannelSchema,
  conversationDetailSchema,
  conversationPageSchema,
  engagementHealthSchema,
  engagementSummarySchema,
} from '@sistemazero/marketing-contracts'
import type { z } from 'zod'
export interface EngagementRepository {
  approval(
    actorId: string,
    projectId: string,
    pieceId: string,
    revisionId: string,
  ): Promise<{ revisionId: string; approved: boolean }>
  channelMembers(
    actorId: string,
    admin: boolean,
    accountId: string,
  ): Promise<Array<{ userId: string; permissions: ChannelPermission[] }>>
  health(actorId: string, accountId: string): Promise<z.infer<typeof engagementHealthSchema>>
  commercialOrigins(
    actorId: string,
    projectId: string,
    pieceId: string,
  ): Promise<Array<{ campaign: string; content: string }>>
  channels(actorId: string, admin: boolean): Promise<z.infer<typeof channelViewSchema>[]>
  configure(
    actorId: string,
    admin: boolean,
    accountId: string,
    input: z.infer<typeof configureChannelSchema>,
  ): Promise<unknown>
  setMember(
    actorId: string,
    admin: boolean,
    accountId: string,
    input: z.infer<typeof channelMemberSchema>,
  ): Promise<unknown>
  approve(
    actorId: string,
    projectId: string,
    input: z.infer<typeof approveConversationSchema>,
  ): Promise<unknown>
  listActivations(
    actorId: string,
    projectId: string,
    pieceId: string,
  ): Promise<z.infer<typeof activationViewSchema>[]>
  activate(
    actorId: string,
    projectId: string,
    input: z.infer<typeof activateConversationSchema>,
  ): Promise<unknown>
  activationAction(
    actorId: string,
    projectId: string,
    id: string,
    input: z.infer<typeof activationActionSchema>,
  ): Promise<unknown>
  listConversations(
    actorId: string,
    accountId: string,
    before?: string,
  ): Promise<z.infer<typeof conversationPageSchema>>
  detail(
    actorId: string,
    accountId: string,
    id: string,
  ): Promise<z.infer<typeof conversationDetailSchema>>
  summary(
    actorId: string,
    projectId: string,
    pieceId: string,
    from: Date,
    to: Date,
  ): Promise<z.infer<typeof engagementSummarySchema>>
}
export interface ConversationRepository {
  action(
    actorId: string,
    accountId: string,
    id: string,
    input: ConversationAction,
  ): Promise<unknown>
}
