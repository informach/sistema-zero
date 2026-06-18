import {
  ChannelNotFoundError,
  PostingNotAllowedError,
  SpaceNotFoundError,
} from '../../domain/hub-errors'
import type { CommunityReadRepository } from '../../domain/ports/community-read-repository.port'
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
  /** Primeiro nome da criança (resolvido pelo BFF a partir da sessão). */
  authorDisplayName: string
  /** Título do projeto (autorado pelo admin na vitrine). */
  title: string
  /** Resumo do projeto (Markdown, autorado pelo admin). */
  summary: string
  /** Capa do projeto (URL pública) — print do jogo ou capa padrão; `null` → placeholder. */
  coverImageUrl: string | null
  /** Idempotência da auto-publicação (hash perfil:curso:cadeia). */
  idempotencyKey: string
}

/**
 * Auto-publicação de um post de PROJETO no Mural dos Criadores. É uma criação de
 * SISTEMA (chamada interna pelo BFF em nome da criança): NÃO checa o acesso da
 * criança ao Mural (publicar exige só ter CONCLUÍDO o projeto — a elegibilidade é
 * validada no members, upstream; o `x-internal-token` é a fronteira de confiança) e
 * IGNORA o `postingPolicy: 'staff_only'` do canal (a criança não posta livremente,
 * mas o projeto concluído vira post). O `authorId` é o PERFIL da criança (header
 * confiável do gateway); `authorDisplayName` é o snapshot exibido na vitrine.
 */
export class ShowcaseService {
  constructor(
    private readonly read: CommunityReadRepository,
    private readonly threads: ThreadRepository,
    private readonly clock: () => Date,
    private readonly newId: () => string,
  ) {}

  async create(
    actor: Actor,
    cmd: CreateShowcaseCommand,
  ): Promise<{ thread: ThreadView; deduped: boolean }> {
    const space = await this.read.findActiveSpaceBySlug(cmd.spaceSlug)
    if (!space) throw new SpaceNotFoundError()
    // ⚠️ Defesa em profundidade: a rota /hub/internal/showcase-thread é alcançável por
    // QUALQUER conta ativa na borda (o BFF publica em nome da criança, sem role), então
    // o `x-internal-token` injetado pelo gateway NÃO é uma fronteira de confiança real
    // aqui — o `spaceSlug` vem do corpo. O hub se defende SOZINHO: a auto-publicação só
    // vale para o MURAL — um space KIDS cuja parede é um canal `staff_only` (curado pelo
    // admin). Isso barra injeção cross-vitrine (servidores ADULTOS) e em canais de
    // postagem livre, onde o bypass de pré-moderação/staff_only seria abuso de moderação.
    if (space.audience !== 'kids') {
      throw new PostingNotAllowedError('A vitrine só publica em servidores kids')
    }
    // O Mural tem UM canal (a parede). Pega o primeiro ativo (menor sortOrder).
    const channels = await this.read.listActiveChannels(space.id)
    const channel = channels[0]
    if (!channel) throw new ChannelNotFoundError()
    if (channel.postingPolicy !== 'staff_only') {
      throw new PostingNotAllowedError('A vitrine só publica na parede curada (staff_only)')
    }

    const title = cmd.title.trim()
    const body = cmd.summary.trim()
    const displayName = cmd.authorDisplayName.trim()
    if (!title || title.length > MAX_TITLE) throw new PostingNotAllowedError('Título inválido')
    if (!body || body.length > MAX_BODY) throw new PostingNotAllowedError('Resumo inválido')
    if (!displayName || displayName.length > MAX_DISPLAY_NAME) {
      throw new PostingNotAllowedError('Nome do autor inválido')
    }

    const id = this.newId()
    const { thread, deduped } = await this.threads.createShowcaseThread({
      id,
      channelId: channel.id,
      authorId: actor.userId,
      authorDisplayName: displayName,
      title,
      slug: threadSlug(title, id),
      body,
      coverImageUrl: cmd.coverImageUrl,
      idempotencyKey: cmd.idempotencyKey,
      now: this.clock(),
    })
    return { thread: toThreadView(thread), deduped }
  }
}
