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
/** Descrição kid-driven no card da parede (plain text, ≤1 parágrafo). */
const MAX_STUDIO_DESCRIPTION = 280

export interface CreateShowcaseCommand {
  /** Slug do servidor do Mural (ex.: `mural-dos-criadores`). */
  spaceSlug: string
  /** Aula + bloco do projeto — o hub re-confere a elegibilidade no members por eles. */
  lessonId: string
  blockId: string
  /** Capa CAPTURADA (print do jogo) já no R2 público; `null` → cai na capa padrão do members. */
  coverImageUrl: string | null
}

export interface CreateShowcaseFromStudioCommand {
  spaceSlug: string
  lessonId: string
  blockId: string
  coverImageUrl: string | null
  /** Descrição escrita/editada pela criança (≤280 chars). Vira o `body` do post. */
  description: string
  /** Id público do artefato jogável (UUID) — vira o link /jogar/<playId>. */
  playId: string
  /** Chave de idempotência gerada no cliente (UUID) — dedup-a duplo-clique/retry. */
  clientIdempotencyKey: string
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
    /**
     * Slugs dos servidores que SÃO paredes de vitrine (ex.: `mural-dos-criadores`).
     * Restringe o destino a uma parede designada — não basta ser kids + `staff_only`
     * (um futuro space curado kids seria alvo de injeção). Vazio = sem allowlist
     * (fallback p/ a heurística antiga; em prod o composition-root sempre injeta).
     */
    private readonly showcaseWallSlugs: ReadonlySet<string> = new Set(),
    /** Slug do canal que recebe os posts de vitrine dentro do servidor designado. */
    private readonly showcaseChannelSlug = 'parede',
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
    // Destino DESIGNADO (allowlist) — não basta ser kids + staff_only: trava injeção
    // num futuro space curado kids que não seja a parede da vitrine.
    if (this.showcaseWallSlugs.size > 0 && !this.showcaseWallSlugs.has(space.slug)) {
      throw new PostingNotAllowedError('Destino não é uma parede de vitrine')
    }
    if (space.audience !== 'kids') {
      throw new PostingNotAllowedError('A vitrine só publica em servidores kids')
    }
    const channels = await this.read.listActiveChannels(space.id)
    const channel = channels.find((c) => c.slug === this.showcaseChannelSlug)
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

    // 3. Capa capturada (BFF→R2) OU a padrão do admin (members). A parede é infantil
    // e servida em HTTPS — só aceitamos capa https (o `defaultCoverUrl` do members
    // admite `http://`); capa não-https vira `null` (sem capa) em vez de mixed content.
    const resolvedCover = cmd.coverImageUrl ?? elig.defaultCoverUrl
    const coverImageUrl = resolvedCover?.startsWith('https://') ? resolvedCover : null
    // 4. Idempotência derivada no servidor (sem chave forjável). Em projeto de CADEIA
    // usamos o nome da cadeia (re-publicar a cadeia dedupe); em projeto AVULSO (sem
    // cadeia) o `blockId` desambigua — senão dois avulsos do MESMO curso colidiriam
    // na chave `autor:curso:` e o 2º some da parede (deduped silencioso).
    const idempotencyKey = createHash('sha256')
      .update(`${actor.userId}:${elig.courseId}:${elig.chain ?? cmd.blockId}`)
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
      playId: null,
      idempotencyKey,
      now: this.clock(),
    })
    return { thread: toThreadView(thread), deduped }
  }

  /**
   * Publicação KID-DRIVEN a partir do botão "Compartilhar" do Estúdio: a criança
   * escreve a DESCRIÇÃO (rascunho da IA, editado) e o projeto ganha um LINK PÚBLICO
   * de jogar (`playId`). Reusa TODAS as guardas de `create` (elegibilidade S2S
   * fail-closed, destino kids+parede curada, autor do header) — NÃO afrouxar. Duas
   * divergências DELIBERADAS: o `body` é a descrição da criança (não o resumo do
   * admin) e a idempotência inclui o `clientIdempotencyKey` (re-publicar depois =
   * post NOVO, imutável; duplo-clique/retry do MESMO ato dedup-a). O TÍTULO continua
   * AUTORITATIVO do members (defesa em profundidade — a parede é curada).
   */
  async createFromStudio(
    actor: Actor,
    cmd: CreateShowcaseFromStudioCommand,
  ): Promise<{ thread: ThreadView; deduped: boolean }> {
    const elig = await this.members.getShowcaseEligibility({
      userId: actor.userId,
      accountId: actor.accountId,
      lessonId: cmd.lessonId,
      blockId: cmd.blockId,
    })
    if (!elig.eligible) throw new PostingNotAllowedError('Projeto não elegível para o Mural')
    if (elig.audience !== 'kids')
      throw new PostingNotAllowedError('A vitrine é só da plataforma kids')

    const space = await this.read.findActiveSpaceBySlug(cmd.spaceSlug)
    if (!space) throw new SpaceNotFoundError()
    if (this.showcaseWallSlugs.size > 0 && !this.showcaseWallSlugs.has(space.slug)) {
      throw new PostingNotAllowedError('Destino não é uma parede de vitrine')
    }
    if (space.audience !== 'kids') {
      throw new PostingNotAllowedError('A vitrine só publica em servidores kids')
    }
    const channels = await this.read.listActiveChannels(space.id)
    const channel = channels.find((c) => c.slug === this.showcaseChannelSlug)
    if (!channel) throw new ChannelNotFoundError()
    if (channel.postingPolicy !== 'staff_only') {
      throw new PostingNotAllowedError('A vitrine só publica na parede curada (staff_only)')
    }

    // Título AUTORITATIVO do admin; corpo = descrição da criança (limitada).
    const title = elig.title.trim()
    const body = cmd.description.trim()
    const displayName = actor.displayName.trim()
    if (!title || title.length > MAX_TITLE) throw new PostingNotAllowedError('Título inválido')
    if (!body || body.length > MAX_STUDIO_DESCRIPTION) {
      throw new PostingNotAllowedError('Descrição inválida')
    }
    if (!displayName || displayName.length > MAX_DISPLAY_NAME) {
      throw new PostingNotAllowedError('Nome do autor inválido')
    }

    const resolvedCover = cmd.coverImageUrl ?? elig.defaultCoverUrl
    const coverImageUrl = resolvedCover?.startsWith('https://') ? resolvedCover : null

    // Idempotência inclui o clientKey: duplo-clique/retry do MESMO ato dedup-a;
    // republicar depois (clientKey novo) = post NOVO (imutabilidade = post novo).
    const idempotencyKey = createHash('sha256')
      .update(
        `${actor.userId}:${elig.courseId}:${elig.chain ?? cmd.blockId}:${cmd.clientIdempotencyKey}`,
      )
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
      playId: cmd.playId,
      idempotencyKey,
      now: this.clock(),
    })
    return { thread: toThreadView(thread), deduped }
  }
}
