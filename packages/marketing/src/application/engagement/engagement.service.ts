import {
  activateConversationSchema,
  activationActionSchema,
  approveConversationSchema,
  type CommercialReport,
  channelMemberSchema,
  configureChannelSchema,
  conversationActionSchema,
  idSchema,
  pieceCommercialReportSchema,
} from '@sistemazero/marketing-contracts'
import { z } from 'zod'
import type { CommercialReportSource } from '../../domain/ports/commercial-report.port'
import type {
  ConversationRepository,
  EngagementRepository,
} from '../../domain/ports/engagement-repository.port'
import type { StaffDirectory } from '../../domain/ports/staff-directory.port'
import { WorkspaceError } from '../../domain/workspace/workspace-error'
import type { Actor } from '../actor'
import { parseWorkspace, workspaceActor } from '../workspace/workspace.service'

const id = (value: string) => parseWorkspace(idSchema, value)
export class EngagementService {
  approval(actor: Actor, projectId: string, pieceId: string, revisionId: unknown) {
    return this.repo.approval(
      workspaceActor(actor),
      id(projectId),
      id(pieceId),
      parseWorkspace(idSchema, revisionId),
    )
  }
  constructor(
    private readonly repo: EngagementRepository,
    private readonly conversations: ConversationRepository,
    private readonly directory: StaffDirectory,
    private readonly commercial?: CommercialReportSource,
  ) {}
  private admin(actor: Actor) {
    return actor.role === 'admin' || actor.role === 'superadmin'
  }
  channels(actor: Actor) {
    return this.repo.channels(workspaceActor(actor), this.admin(actor))
  }
  health(actor: Actor, accountId: string) {
    return this.repo.health(workspaceActor(actor), id(accountId))
  }
  async members(actor: Actor, accountId: string) {
    const rows = await this.repo.channelMembers(
      workspaceActor(actor),
      this.admin(actor),
      id(accountId),
    )
    const people = rows.length
      ? await this.directory.lookup({ ids: rows.map((row) => row.userId) })
      : []
    return rows.map((row) => ({
      id: row.userId,
      permissions: row.permissions,
      name: people.find((p) => p.id === row.userId)?.name ?? 'Pessoa não disponível',
      active: people.some((p) => p.id === row.userId && p.active),
    }))
  }
  async staff(actor: Actor, accountId: string, query: unknown) {
    await this.repo.channelMembers(workspaceActor(actor), this.admin(actor), id(accountId))
    return this.directory.lookup({
      query: parseWorkspace(z.string().trim().min(2).max(100), query),
    })
  }
  configure(actor: Actor, accountId: string, body: unknown) {
    return this.repo.configure(
      workspaceActor(actor),
      this.admin(actor),
      id(accountId),
      parseWorkspace(configureChannelSchema, body),
    )
  }
  async member(actor: Actor, accountId: string, body: unknown) {
    const actorId = workspaceActor(actor),
      input = parseWorkspace(channelMemberSchema, body)
    if (input.permissions.length) {
      const people = await this.directory.lookup({ ids: [input.userId] })
      if (!people.some((p) => p.id === input.userId && p.active))
        throw new WorkspaceError('VALIDATION_ERROR', 'Escolha uma pessoa ativa da equipe')
    }
    return this.repo.setMember(actorId, this.admin(actor), id(accountId), input)
  }
  approve(actor: Actor, projectId: string, body: unknown) {
    return this.repo.approve(
      workspaceActor(actor),
      id(projectId),
      parseWorkspace(approveConversationSchema, body),
    )
  }
  activate(actor: Actor, projectId: string, body: unknown) {
    return this.repo.activate(
      workspaceActor(actor),
      id(projectId),
      parseWorkspace(activateConversationSchema, body),
    )
  }
  activations(actor: Actor, projectId: string, pieceId: string) {
    return this.repo.listActivations(workspaceActor(actor), id(projectId), id(pieceId))
  }
  activationAction(actor: Actor, projectId: string, activationId: string, body: unknown) {
    return this.repo.activationAction(
      workspaceActor(actor),
      id(projectId),
      id(activationId),
      parseWorkspace(activationActionSchema, body),
    )
  }
  list(actor: Actor, accountId: string, before?: string) {
    return this.repo.listConversations(
      workspaceActor(actor),
      id(accountId),
      before ? id(before) : undefined,
    )
  }
  detail(actor: Actor, accountId: string, conversationId: string) {
    return this.repo.detail(workspaceActor(actor), id(accountId), id(conversationId))
  }
  action(actor: Actor, accountId: string, conversationId: string, body: unknown) {
    return this.conversations.action(
      workspaceActor(actor),
      id(accountId),
      id(conversationId),
      parseWorkspace(conversationActionSchema, body),
    )
  }
  summary(actor: Actor, projectId: string, pieceId: string, raw: unknown) {
    const input = parseWorkspace(
      z
        .object({ from: z.coerce.date(), to: z.coerce.date() })
        .refine(
          (v) => v.to > v.from && v.to.getTime() - v.from.getTime() <= 90 * 86400000,
          'Selecione até 90 dias',
        ),
      raw,
    )
    return this.repo.summary(
      workspaceActor(actor),
      id(projectId),
      id(pieceId),
      input.from,
      input.to,
    )
  }
  async commercialReport(actor: Actor, projectId: string, pieceId: string, raw: unknown) {
    const input = parseWorkspace(
      z
        .object({ from: z.coerce.date(), to: z.coerce.date() })
        .refine(
          (v) => v.to > v.from && v.to.getTime() - v.from.getTime() <= 90 * 86400000,
          'Selecione até 90 dias',
        ),
      raw,
    )
    const origins = await this.repo.commercialOrigins(
      workspaceActor(actor),
      id(projectId),
      id(pieceId),
    )
    const reports: CommercialReport[] = [],
      unavailable: Array<{ campaign: string; content: string; reason: string }> = []
    const results = await Promise.allSettled(
      origins.map(async (origin) => {
        if (!this.commercial) throw new Error('Fonte indisponível')
        return this.commercial.report({
          ...origin,
          source: 'instagram',
          from: input.from.toISOString(),
          to: input.to.toISOString(),
        })
      }),
    )
    for (const [index, result] of results.entries()) {
      if (result.status === 'fulfilled') reports.push(result.value)
      else {
        const origin = origins[index]
        if (origin)
          unavailable.push({
            ...origin,
            reason: 'Medição do funil indisponível; não interprete como zero',
          })
      }
    }
    return pieceCommercialReportSchema.parse({ reports, unavailable })
  }
}
