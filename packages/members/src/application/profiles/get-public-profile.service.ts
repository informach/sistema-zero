import { canonicalizeAvatarConfig } from '../../domain/avatar/avatar-config'
import type { CourseAudience } from '../../domain/course/course'
import { computeStudentLevel } from '../../domain/gamification/levels'
import type { AvatarRepository } from '../../domain/ports/avatar-repository.port'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { HubGateway } from '../../domain/ports/hub-gateway.port'
import type { RoomRepository } from '../../domain/ports/room-repository.port'
import { canonicalizeRoomState } from '../../domain/room/room-catalog'
import type { PublicProfileView } from '../mappers/views'

/**
 * Teto de jogos mostrados no perfil público (mais recentes primeiro). FIXO por
 * decisão (não é env nem query param): o perfil é vitrine, não listagem paginada —
 * 24 cobre a grade do front com folga e limita o payload do hub. Se a UX pedir
 * outro tamanho, mude AQUI (o gateway aceita qualquer `limit`).
 */
const MAX_PUBLIC_GAMES = 24

/**
 * Perfil PÚBLICO de uma criança (dado de jogo agregado), consumido pelo BFF do
 * `/crianca/[profileId]`. Compõe XP + colocação no ranking + conquistas QUE TEM
 * (não o catálogo) + avatar equipado; quarto vem na Fase 3 (`null`). A coorte do
 * ranking precisa da CONTA do perfil — vem do próprio registro de gamificação
 * (`accountId`). NÃO há dado sensível: nome é juntado pelo BFF (auth); e-mail/
 * telefone/nascimento/conta nunca passam por aqui.
 */
export class GetPublicProfileService {
  constructor(
    private readonly gamification: GamificationRepository,
    private readonly avatar: AvatarRepository,
    private readonly room: RoomRepository,
    private readonly hub: HubGateway,
    private readonly clock: () => Date,
  ) {}

  async execute(profileId: string, audience: CourseAudience): Promise<PublicProfileView> {
    const [
      profile,
      badges,
      qualifying,
      avatarConfig,
      avatarPhotoUrl,
      roomRaw,
      roomInventory,
      hubGames,
    ] = await Promise.all([
      this.gamification.getProfile(profileId, audience),
      this.gamification.listBadges(profileId, audience),
      this.gamification.listQualifyingCareerSlots(profileId, audience),
      this.avatar.getConfig(profileId, audience),
      this.avatar.getPhotoUrl(profileId, audience),
      this.room.getState(profileId, audience),
      this.room.listInventory(profileId, audience),
      // Jogos publicados no Mural (best-effort; `null` → seção vazia). O Mural é kids;
      // p/ audiência adult ainda não há vitrine, mas o hub simplesmente devolve vazio.
      this.hub.listShowcaseByAuthor(profileId, MAX_PUBLIC_GAMES),
    ])
    // Ranking só faz sentido com perfil (XP); a coorte usa a conta dona do perfil.
    const ranking = profile
      ? await this.gamification.getRanking(profileId, profile.accountId, audience, this.clock())
      : null
    const equipped = canonicalizeAvatarConfig(avatarConfig)
    // Quarto: `null` se nunca montou; senão canonicalizado (modo visualização).
    const room = roomRaw ? canonicalizeRoomState(roomRaw, new Set(roomInventory)) : null
    return {
      profileId,
      xp: profile?.xp ?? 0,
      ranking,
      // Nível do aluno (rank) — mesma derivação do /gamification/me.
      level: computeStudentLevel(qualifying),
      // listBadges já devolve SÓ as conquistadas (≠ do /gamification/me, que traz o catálogo).
      badges: badges.map((b) => ({ slug: b.badgeSlug, unlockedAt: b.unlockedAt.toISOString() })),
      avatar: { style: equipped.style, slots: equipped.slots },
      avatarPhotoUrl,
      room,
      games: (hubGames ?? []).map((g) => ({
        title: g.title,
        playId: g.playId,
        coverUrl: g.coverUrl,
        publishedAt: g.publishedAt,
      })),
    }
  }
}
