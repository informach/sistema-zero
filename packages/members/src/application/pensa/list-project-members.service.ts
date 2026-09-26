import type { CourseAudience } from '../../domain/course/course'
import { MAX_PROJECT_MEMBERS } from '../../domain/pensa/pensa'
import { PensaNotFoundError } from '../../domain/pensa/pensa.errors'
import type { AuthGateway, ProfileIdentity } from '../../domain/ports/auth-gateway.port'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'
import type { GetAvatarsByProfilesService } from '../avatar/get-avatars-by-profiles.service'
import type { PensaProjectMembersView, PensaTeamPersonView } from '../mappers/pensa-views'

/**
 * A equipe do plano (dono e membros veem): o dono primeiro, com 1º nome e foto do avatar 3D,
 * best-effort nos dois (sem nome → a tela diz "Colega"; sem foto → a inicial). O CÓDIGO só
 * vai para o dono. Mesma régua de privacidade do Clube: 1º nome e rosto entre colegas, nunca
 * e-mail nem sobrenome.
 */
export class ListPensaProjectMembersService {
  constructor(
    private readonly repo: PensaRepository,
    private readonly authGateway: AuthGateway | null,
    private readonly avatars: GetAvatarsByProfilesService,
  ) {}

  async execute(
    userId: string,
    audience: CourseAudience,
    projectId: string,
  ): Promise<PensaProjectMembersView> {
    const access = await this.repo.findProject(projectId, userId, audience)
    if (!access) throw new PensaNotFoundError('Esse plano não está mais aqui.')
    const members = await this.repo.listMembers(projectId)
    const ids = [access.userId, ...members.map((member) => member.profileId)]
    const identities: Map<string, ProfileIdentity> = this.authGateway
      ? await this.authGateway.getProfileIdentities(ids).catch((error: unknown) => {
          console.warn('[pensa] identidades da equipe indisponíveis (segue como "Colega")', error)
          return new Map()
        })
      : new Map()
    const avatars: Record<string, { photoUrl: string | null }> = await this.avatars
      .execute(ids, audience)
      .catch((error: unknown) => {
        console.warn('[pensa] rostos da equipe indisponíveis (segue sem foto)', error)
        return {}
      })
    const person = (profileId: string, joinedAt: string | null): PensaTeamPersonView => ({
      profileId,
      firstName: identities.get(profileId)?.firstName ?? null,
      photoUrl: avatars[profileId]?.photoUrl ?? null,
      joinedAt,
    })
    return {
      role: access.role,
      viewerProfileId: userId,
      shareCode: access.role === 'owner' ? access.shareCode : null,
      maxMembers: MAX_PROJECT_MEMBERS,
      owner: person(access.userId, null),
      members: members.map((member) => person(member.profileId, member.joinedAt.toISOString())),
    }
  }
}
