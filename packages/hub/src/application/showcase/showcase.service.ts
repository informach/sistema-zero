import { createHash } from 'node:crypto'
import {
  ChannelNotFoundError,
  PostingNotAllowedError,
  SpaceNotFoundError,
} from '../../domain/hub-errors'
import type { CommunityReadRepository } from '../../domain/ports/community-read-repository.port'
import type { MembersGateway } from '../../domain/ports/members-gateway.port'
import type { ThreadRepository } from '../../domain/ports/thread-repository.port'
import type { Actor } from '../access/access-resolution.service'
import { type ThreadView, toThreadView } from '../mappers/thread-views'
import { threadSlug } from '../slug'

const MAX_TITLE = 300
const MAX_BODY = 50_000
const MAX_DISPLAY_NAME = 120

export interface CreateShowcaseCommand {
  /** Slug do servidor do Mural (ex.: `mural-dos-criadores`). */
  spaceSlug: string
  /** Aula + bloco do projeto — o hub re-confere a elegibilidade no members por eles. */
  lessonId: string
  blockId: string
  /** Capa CAPTURADA (print do jogo) já no R2 público; `null` → cai na capa padrão do members. */
  coverImageUrl: string | null
}

/**
 * Auto-publicação de um post de PROJETO no Mural dos Criadores.
 *
 * ⚠️ A rota `POST /hub/internal/showcase-thread` é alcançável por QUALQUER conta ativa
 * na borda (o BFF publica em nome da criança, sem role), então o `x-internal-token`
 * injetado pelo gateway NÃO é uma fronteira de confiança real e o CORPO não é confiável.
 * Por isso o hub:
 *  1. RE-VALIDA a elegibilidade no members (S2S, fail-closed): só publica quem REALMENTE
 *     concluiu o projeto (entrega existe) — fecha o "projeto fake/não concluído".
 *  2. usa o conteúdo AUTORITATIVO do members (título/resumo/audiência/curso/cadeia) —
 *     o corpo não dita título/resumo.
 *  3. tira o `authorDisplayName` do HEADER confiável do gateway (perfil), não do corpo.
 *  4. DERIVA a idempotência no servidor (`autor:curso:cadeia`) — sem chave forjável.
 * Continua ignorando `postingPolicy: 'staff_only'` (a criança não posta livre, mas o
 * projeto concluído vira post) e exige que o destino seja um space KIDS com canal curado.
 */
export class ShowcaseService {
  constructor(
    private readonly read: CommunityReadRepository,
    private readonly threads: ThreadRepository,
    private readonly members: MembersGateway,
    private readonly clock: () => Date,
    private readonly newId: () => string,
  ) {}

  async create(
    actor: Actor,
    cmd: CreateShowcaseCommand,
  ): Promise<{ thread: ThreadView; deduped: boolean }> {
    // 1+2. Elegibilidade + conteúdo autoritativo (acesso pela CONTA, entrega pelo PERFIL).
    const elig = await this.members.getShowcaseEligibility({
      userId: actor.userId,
      accountId: actor.accountId,
      lessonId: cmd.lessonId,
      blockId: cmd.blockId,
    })
    if (!elig.eligible) throw new PostingNotAllowedError('Projeto não elegível para o Mural')
    if (elig.audience !== 'kids')
      throw new PostingNotAllowedError('A vitrine é só da plataforma kids')

    // Destino: o Mural é um space KIDS cuja parede é um canal `staff_only` (curado pelo
    // admin) — barra injeção cross-vitrine (servidores adultos) e em canal de postagem livre.
    const space = await this.read.findActiveSpaceBySlug(cmd.spaceSlug)
    if (!space) throw new SpaceNotFoundError()
    if (space.audience !== 'kids') {
      throw new PostingNotAllowedError('A vitrine só publica em servidores kids')
    }
    const channels = await this.read.listActiveChannels(space.id)
    const channel = channels[0]
    if (!channel) throw new ChannelNotFoundError()
    if (channel.postingPolicy !== 'staff_only') {
      throw new PostingNotAllowedError('A vitrine só publica na parede curada (staff_only)')
    }

    const title = elig.title.trim()
    const body = elig.summary.trim()
    const displayName = actor.displayName.trim()
    if (!title || title.length > MAX_TITLE) throw new PostingNotAllowedError('Título inválido')
    if (!body || body.length > MAX_BODY) throw new PostingNotAllowedError('Resumo inválido')
    if (!displayName || displayName.length > MAX_DISPLAY_NAME) {
      throw new PostingNotAllowedError('Nome do autor inválido')
    }

    // 3. Capa capturada (BFF→R2) OU a padrão do admin (members). 4. Idempotência derivada.
    const coverImageUrl = cmd.coverImageUrl ?? elig.defaultCoverUrl
    const idempotencyKey = createHash('sha256')
      .update(`${actor.userId}:${elig.courseId}:${elig.chain ?? ''}`)
      .digest('hex')

    const id = this.newId()
    const { thread, deduped } = await this.threads.createShowcaseThread({
      id,
      channelId: channel.id,
      authorId: actor.userId,
      authorDisplayName: displayName,
      title,
      slug: threadSlug(title, id),
      body,
      coverImageUrl,
      idempotencyKey,
      now: this.clock(),
    })
    return { thread: toThreadView(thread), deduped }
  }
}
