import { creativeToolAccessRef } from '@sistemazero/core/creations'
import * as P from '@sistemazero/core/pensa'
import { and, eq } from 'drizzle-orm'
import type { AccessCheckService } from '../../../application/access-check/access-check.service'
import type { GetAvatarsByProfilesService } from '../../../application/avatar/get-avatars-by-profiles.service'
import type { GetCreationDownloadService } from '../../../application/creations/creations.service'
import type { GetGamificationService } from '../../../application/gamification/get-gamification.service'
import type { GetStudioUnlocksService } from '../../../application/studio-unlocks/get-studio-unlocks.service'
import { toCreationSummary } from '../../../domain/creations/creation'
import { pensaError } from '../../../domain/pensa/project.errors'
import { generateShareCode, normalizeShareCode } from '../../../domain/pensa/share-code'
import type { AdultProfileRepository } from '../../../domain/ports/adult-profile-repository.port'
import type { AuthGateway } from '../../../domain/ports/auth-gateway.port'
import type { CreationsRepository } from '../../../domain/ports/creations-repository.port'
import type { PensaProjectBase } from '../../../domain/ports/pensa-project-repository.port'
import type {
  PensaTeamFacts,
  PensaTeamRepository,
} from '../../../domain/ports/pensa-team-repository.port'
import type { DrizzlePensaProjectCommands } from './pensa-project.commands'
import { pensaGameId, pensaRequestHash } from './pensa-project.repository'
import { lockPensaAccount } from './pensa-reservations'
import {
  accountDeletionFences,
  pensaExecutionEvents,
  pensaProjectMembers,
  pensaProjectRoles,
  pensaProjects,
} from './schema'

export interface DrizzlePensaTeamRepositoryDeps {
  projects: DrizzlePensaProjectCommands
  authGateway: AuthGateway | null
  avatars: GetAvatarsByProfilesService
  accessCheck: AccessCheckService
  gamification: GetGamificationService
  studioUnlocks: GetStudioUnlocksService
  creations: CreationsRepository
  creationDownload: GetCreationDownloadService
  adultCreations?: CreationsRepository
  adultCreationDownload?: GetCreationDownloadService
  adultProfiles?: AdultProfileRepository
}

export class DrizzlePensaTeamRepository implements PensaTeamRepository {
  constructor(readonly deps: DrizzlePensaTeamRepositoryDeps) {}
  get store() {
    return this.deps.projects.repo
  }

  async team(actor: P.PensaActor, id: string) {
    const state = await this.store.get(actor, id)
    const ids = state.team.people.map((p) => p.profileId)
    const [names, avatars] = await Promise.all([
      state.project.audience === 'adult'
        ? (this.deps.adultProfiles
            ?.listPublic(ids)
            .then(
              (rows) =>
                new Map(
                  rows.map((row) => [row.userId, { firstName: row.displayName, public: true }]),
                ),
            )
            .catch(() => new Map()) ?? new Map())
        : (this.deps.authGateway?.getProfileIdentities(ids).catch(() => new Map()) ?? new Map()),
      this.deps.avatars
        .execute(ids, state.project.audience)
        .catch((): Record<string, { photoUrl: string | null }> => ({})),
    ])
    return {
      ...state.team,
      people: state.team.people.map((p) => ({
        ...p,
        firstName: names.get(p.profileId)?.firstName ?? null,
        photoUrl: avatars[p.profileId]?.photoUrl ?? null,
      })),
    }
  }

  async context(inputActor: P.PensaActor, id: string): Promise<PensaTeamFacts> {
    const actor = { ...inputActor }
    const state = await this.store.get(actor, id)
    const creations =
      state.project.audience === 'adult' ? this.deps.adultCreations : this.deps.creations
    const download =
      state.project.audience === 'adult'
        ? this.deps.adultCreationDownload
        : this.deps.creationDownload
    if (!creations || !download)
      pensaError('RESOURCES_UNAVAILABLE', 'A biblioteca adulta está indisponível.')
    const accountOf = (profileId: string) =>
      profileId === state.project.userId
        ? state.project.accountId
        : state.members.find((m) => m.profileId === profileId)?.accountId
    const info = async (profileId: string) => {
      const accountId = accountOf(profileId)
      if (!accountId) pensaError('RESOURCES_CHANGED', 'Esta pessoa saiu da equipe.')
      const ownPreview = state.project.audience === 'kids' && actor.privileged &&
        actor.profileId === actor.accountId && profileId === actor.profileId && accountId === actor.accountId
      const [level, access] = await Promise.all([
        this.deps.gamification.execute(profileId, accountId, { audience: state.project.audience, privileged: ownPreview }),
        this.deps.accessCheck.execute(
          accountId,
          ['estudio-completo', 'pinta', 'molda'].map((ref) =>
            creativeToolAccessRef(ref, state.project.audience),
          ),
        ),
      ])
      if (state.project.audience === 'adult' ? !level.level :
        (!level.kidsJourney && !level.kidsPreview) ||
        (level.kidsPreview && !ownPreview) || (!level.kidsPreview && !level.level))
        pensaError('RESOURCES_UNAVAILABLE', 'A jornada deste participante ainda não está disponível.')
      const preview = Boolean(level.kidsPreview)
      const owns = (ref: string) =>
        access.grants.includes(creativeToolAccessRef(ref, state.project.audience)) ||
        access.communities.includes(creativeToolAccessRef(ref, state.project.audience))
      return {
        profileId,
        level: level.level?.slug ?? null,
        ...(state.project.audience === 'adult' ? { journey: level.journey } : { kidsJourney: level.kidsJourney, kidsPreview: level.kidsPreview }),
        access: { studio: preview || owns('estudio-completo'), pinta: preview || owns('pinta'), molda: preview || owns('molda') },
      }
    }
    const programmer = state.team.programmerProfileId
    const [code, blocks, pinta, molda, art] = await Promise.all([
      info(programmer),
      this.deps.studioUnlocks.execute(programmer, state.project.audience),
      creations.list(programmer, 'pinta'),
      creations.list(programmer, 'molda'),
      Promise.all(state.team.artistProfileIds.map(info)),
    ])
    const game = await creations.get(programmer, 'studio', pensaGameId(id))
    const gameTicket =
      game && !game.deletedAt && game.storageRef && !game.pending
        ? await download.execute(programmer, 'studio', pensaGameId(id))
        : null
    const base: PensaProjectBase = {
      ...this.deps.projects.base(state),
      studioAuthoring: game?.kind === 'pro' ? 'code' : 'blocks',
    }
    return {
      base,
      code: {
        ...code,
        blocks: blocks.blocks,
        creations: {
          pinta: pinta
            .filter((p) => !p.deletedAt)
            .slice(0, 200)
            .map(toCreationSummary),
          molda: molda
            .filter((p) => !p.deletedAt)
            .slice(0, 200)
            .map(toCreationSummary),
        },
      },
      art,
      gameTicket,
    }
  }

  async share(actor: P.PensaActor, id: string, requestId: string, enabled: boolean) {
    await this.store.change(actor, id, 'share', { requestId, enabled }, async (tx, state) => {
      if (state.project.userId !== actor.profileId)
        pensaError('NOT_YOUR_MISSION', 'Só quem criou o projeto pode administrar o convite.')
      await tx
        .update(pensaProjects)
        .set({
          shareCode: enabled ? generateShareCode() : null,
          teamRevision: state.project.teamRevision + 1,
        })
        .where(eq(pensaProjects.id, id))
    })
    return this.team(actor, id)
  }

  async join(actor: P.PensaActor, requestId: string, code: string) {
    const normalized = normalizeShareCode(code)
    if (!normalized) pensaError('PROJECT_GONE', 'Este código não abriu um projeto.')
    const [project] = await this.store.db
      .select()
      .from(pensaProjects)
      .where(
        and(
          eq(pensaProjects.shareCode, normalized),
          eq(pensaProjects.audience, actor.audience ?? 'kids'),
          eq(pensaProjects.status, 'active'),
        ),
      )
    if (!project) pensaError('PROJECT_GONE', 'Este código não abriu um projeto.')
    await this.store.db.transaction(async (tx) => {
      await lockPensaAccount(tx, actor.accountId)
      const [fence] = await tx
        .select()
        .from(accountDeletionFences)
        .where(eq(accountDeletionFences.accountId, actor.accountId))
      if (fence) pensaError('PROJECT_GONE', 'Esta conta não está disponível.')
      const hash = pensaRequestHash(actor, 'join', { requestId, code })
      const [prior] = await tx
        .select()
        .from(pensaExecutionEvents)
        .where(eq(pensaExecutionEvents.requestId, requestId))
      if (prior) {
        if (prior.requestHash !== hash || prior.projectKey !== project.id)
          pensaError('REVISION_CONFLICT', 'Este pedido já foi usado com outro convite.')
        return
      }
      const [locked] = await tx
        .select()
        .from(pensaProjects)
        .where(eq(pensaProjects.id, project.id))
        .for('update')
      if (
        locked?.status !== 'active' ||
        locked.shareCode !== normalized ||
        locked.audience !== (actor.audience ?? 'kids')
      )
        pensaError('PROJECT_GONE', 'Este código não abriu um projeto.')
      if (locked.userId === actor.profileId) {
        await this.store.event(tx, actor, project.id, requestId, hash, 'join')
        return
      }
      const members = await tx
        .select()
        .from(pensaProjectMembers)
        .where(eq(pensaProjectMembers.projectId, project.id))
      if (members.some((m) => m.profileId === actor.profileId)) {
        await this.store.event(tx, actor, project.id, requestId, hash, 'join')
        return
      }
      if (members.length >= P.PENSA_LIMITS.teamPeople - 1)
        pensaError('QUOTA_EXCEEDED', 'Esta equipe já está cheia.')
      const joined = await tx
        .select()
        .from(pensaProjectMembers)
        .innerJoin(pensaProjects, eq(pensaProjects.id, pensaProjectMembers.projectId))
        .where(
          and(
            eq(pensaProjectMembers.profileId, actor.profileId),
            eq(pensaProjects.status, 'active'),
            eq(pensaProjects.audience, actor.audience ?? 'kids'),
          ),
        )
      if (joined.length >= P.PENSA_LIMITS.joinedProjects)
        pensaError('QUOTA_EXCEEDED', 'Saia de uma equipe antes de entrar em outra.')
      const now = this.store.clock()
      await tx.insert(pensaProjectMembers).values({
        projectId: project.id,
        profileId: actor.profileId,
        accountId: actor.accountId,
        invitedBy: locked.userId,
        joinedAt: now,
      })
      await tx
        .update(pensaProjects)
        .set({ teamRevision: locked.teamRevision + 1, updatedAt: now })
        .where(eq(pensaProjects.id, project.id))
      await this.store.event(tx, actor, project.id, requestId, hash, 'join')
    })
    return { projectId: project.id }
  }

  async setRoles(actor: P.PensaActor, id: string, input: P.PensaRolesRequest) {
    await this.store.change(actor, id, 'roles', input, async (tx, state) => {
      if (state.project.userId !== actor.profileId)
        pensaError('NOT_YOUR_MISSION', 'Só quem criou o projeto pode definir as funções.')
      if (state.project.teamRevision !== input.expectedTeamRevision)
        pensaError('REVISION_CONFLICT', 'A equipe mudou. Confira antes de continuar.')
      if (state.team.codeLocked && input.programmerProfileId !== state.team.programmerProfileId)
        pensaError('REVISION_CONFLICT', 'O jogo já está com quem começou a programação.')
      const allowed = new Set(state.team.people.map((p) => p.profileId))
      if (
        !allowed.has(input.programmerProfileId) ||
        input.artistProfileIds.some((id) => !allowed.has(id))
      )
        pensaError('RESOURCES_CHANGED', 'Escolha somente pessoas desta equipe.')
      await tx.delete(pensaProjectRoles).where(eq(pensaProjectRoles.projectId, id))
      await tx.insert(pensaProjectRoles).values([
        {
          projectId: id,
          profileId: input.programmerProfileId,
          role: 'code',
          assignedBy: actor.profileId,
        },
        ...[...new Set(input.artistProfileIds)].map((profileId) => ({
          projectId: id,
          profileId,
          role: 'art' as const,
          assignedBy: actor.profileId,
        })),
      ])
      await tx
        .update(pensaProjects)
        .set({
          teamRevision: state.project.teamRevision + 1,
          ...(!state.team.codeLocked
            ? {
                gameProfileId: input.programmerProfileId,
                gameAccountId:
                  input.programmerProfileId === state.project.userId
                    ? state.project.accountId
                    : state.members.find((m) => m.profileId === input.programmerProfileId)
                        ?.accountId,
              }
            : {}),
        })
        .where(eq(pensaProjects.id, id))
      const artists = input.artistProfileIds.length
        ? input.artistProfileIds
        : [input.programmerProfileId]
      for (const progress of state.progress) {
        const mission = state.revision?.plan.missions.find((m) => m.id === progress.missionId)
        const eligible = mission?.destination === 'studio' ? [input.programmerProfileId] : artists
        if (
          progress.status !== 'completed' &&
          progress.assigneeProfileId &&
          !eligible.includes(progress.assigneeProfileId)
        )
          await this.store.saveProgress(
            tx,
            id,
            {
              ...progress,
              progressRevision: progress.progressRevision + 1,
              assigneeProfileId: null,
            },
            this.store.clock(),
          )
      }
    })
    return this.team(actor, id)
  }

  async remove(actor: P.PensaActor, id: string, profileId: string, requestId: string) {
    await this.store.change(
      actor,
      id,
      'member_remove',
      { requestId, profileId },
      async (tx, state) => {
        const target = profileId === 'me' ? actor.profileId : profileId
        if (state.project.userId !== actor.profileId && target !== actor.profileId)
          pensaError('NOT_YOUR_MISSION', 'Só quem criou a equipe pode retirar outra pessoa.')
        if (target === state.project.userId)
          pensaError('REVISION_CONFLICT', 'Quem criou o projeto continua responsável por ele.')
        if (target === state.team.programmerProfileId && state.team.codeLocked)
          pensaError(
            'REVISION_CONFLICT',
            'O jogo continua na conta de quem programa. Resolva essa responsabilidade antes de sair.',
          )
        await tx
          .delete(pensaProjectRoles)
          .where(and(eq(pensaProjectRoles.projectId, id), eq(pensaProjectRoles.profileId, target)))
        await tx
          .delete(pensaProjectMembers)
          .where(
            and(eq(pensaProjectMembers.projectId, id), eq(pensaProjectMembers.profileId, target)),
          )
        await tx
          .update(pensaProjects)
          .set({ teamRevision: state.project.teamRevision + 1 })
          .where(eq(pensaProjects.id, id))
        const affected = P.pensaAssetDependentsForProfiles(state.revision, state.progress, [target])
        for (const p of P.invalidatePensaProgress(state.progress, [...affected]))
          if (affected.has(p.missionId))
            await this.store.saveProgress(
              tx,
              id,
              {
                ...p,
                assigneeProfileId: p.assigneeProfileId === target ? null : p.assigneeProfileId,
              },
              this.store.clock(),
            )
        for (const p of state.progress)
          if (
            !affected.has(p.missionId) &&
            p.status !== 'completed' &&
            p.assigneeProfileId === target
          )
            await this.store.saveProgress(
              tx,
              id,
              { ...p, assigneeProfileId: null, progressRevision: p.progressRevision + 1 },
              this.store.clock(),
            )
      },
    )
  }

  async art(actor: P.PensaActor, id: string): Promise<{ items: P.PensaTeamArtItem[] }> {
    const state = await this.store.get(actor, id)
    const items: P.PensaTeamArtItem[] = []
    for (const progress of state.progress) {
      const mission = state.revision?.plan.missions.find((m) => m.id === progress.missionId)
      if (
        mission?.kind !== 'asset' ||
        progress.status !== 'completed' ||
        progress.validity !== 'current' ||
        !progress.completedByProfileId
      )
        continue
      for (const delivery of progress.deliveries) {
        const slot = state.revision?.definition.assetSlots.find(
          (s) => s.id === delivery.assetSlotId,
        )
        if (slot && state.team.people.some((p) => p.profileId === delivery.creation.profileId))
          items.push({
            missionId: mission.id,
            slot,
            creation: delivery.creation,
            completedByProfileId: progress.completedByProfileId,
          })
      }
    }
    return { items }
  }

  async artDownload(actor: P.PensaActor, id: string, missionId: string, slotId: string) {
    const item = (await this.art(actor, id)).items.find(
      (i) => i.missionId === missionId && i.slot.id === slotId,
    )
    if (!item) pensaError('PROJECT_GONE', 'Esta arte não está disponível na equipe.')
    const download =
      actor.audience === 'adult' ? this.deps.adultCreationDownload : this.deps.creationDownload
    if (!download) pensaError('RESOURCES_UNAVAILABLE', 'A biblioteca adulta está indisponível.')
    const current = await download.execute(
      item.creation.profileId,
      item.creation.tool,
      item.creation.creationId,
    )
    if (String(current.revision) !== item.creation.saveRevision)
      pensaError('CREATION_CHANGED', 'A arte mudou. Peça para a colega conferir a nova versão.')
    return current
  }
}
