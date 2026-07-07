import { createHash } from 'node:crypto'
import {
  ChannelNotFoundError,
  PostingNotAllowedError,
  SpaceNotFoundError,
} from '../../domain/hub-errors'
import type { CommunityReadRepository } from '../../domain/ports/community-read-repository.port'
import type { MembersGateway } from '../../domain/ports/members-gateway.port'
import type { ThreadRepository } from '../../domain/ports/thread-repository.port'
import type { Channel } from '../../domain/space/space'
import type { Actor } from '../access/access-resolution.service'
import { type ThreadView, toThreadView } from '../mappers/thread-views'
import { threadSlug } from '../slug'

const MAX_TITLE = 300
const MAX_BODY = 50_000
const MAX_DISPLAY_NAME = 120
/** Descrição kid-driven no card da parede (plain text, ≤1 parágrafo). */
const MAX_STUDIO_DESCRIPTION = 280
/**
 * Ref do produto vendável "Estúdio Completo" (= slug do produto/curso no catálogo;
 * `entitlement.courseRef`). Quem possui acessa o editor E pode publicar do estúdio
 * standalone. Fixo como `MURAL_SPACE_SLUG`/`showcaseChannelSlug` — muda junto com o catálogo.
 */
const STUDIO_STANDALONE_ACCESS_REF = 'estudio-completo'
/**
 * Ref do produto "Clube dos Criadores" — junto do Estúdio, é a POSSE exigida p/
 * participar do DESAFIO do mês (decisão da usuária: game jam MENSAL só p/ quem
 * tem os dois). Fixa como o slug do produto no catálogo/hub.
 */
const CHALLENGE_CLUB_REF = 'clube-dos-criadores'

const CHALLENGE_KEY_RE = /^m:\d{4}-\d{2}$/
// `m:YYYY-MM` do mês civil de São Paulo — MESMA régua do members (challenges.ts).
const SP_MONTH_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
})
function currentChallengeKey(now: Date): string {
  return `m:${SP_MONTH_FORMAT.format(now)}`
}

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

export interface CreateStandaloneShowcaseCommand {
  spaceSlug: string
  /** Título escrito pela criança (= nome do projeto). NÃO há título autoritativo (sem aula). */
  title: string
  /** Descrição escrita/editada pela criança (≤280 chars). Vira o `body` do post. */
  description: string
  coverImageUrl: string | null
  /** Id público do artefato jogável (UUID) — vira o link /jogar/<playId>. */
  playId: string
  /** Chave de idempotência gerada no cliente (UUID) — dedup-a duplo-clique/retry. */
  clientIdempotencyKey: string
  /**
   * Tag do DESAFIO do mês (`m:YYYY-MM`) — o hub VALIDA (posse Clube+Estúdio + mês
   * corrente em SP) e, reprovada, grava o post SEM a tag (drop silencioso: a
   * publicação da criança NUNCA falha por causa do desafio).
   */
  challengeKey?: string | null
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

  /**
   * Destino da vitrine (FONTE ÚNICA das 3 publicações): o Mural é um space KIDS
   * cuja parede é um canal `staff_only` (curado pelo admin) E está na allowlist de
   * slugs. Barra injeção cross-vitrine (servidores adultos), num futuro space
   * curado kids que NÃO seja a parede, e em canal de postagem livre.
   * ⚠️ Esta é a invariante de segurança do destino — NÃO afrouxar.
   */
  private async resolveShowcaseDestination(spaceSlug: string): Promise<Channel> {
    const space = await this.read.findActiveSpaceBySlug(spaceSlug)
    if (!space) throw new SpaceNotFoundError()
    // allowlist: não basta ser kids + staff_only.
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
    return channel
  }

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
      // Equipe (chave-mestra virtual) publica no Mural p/ TESTAR o fluxo — o members
      // honra o `privileged` (como já faz na rota de aluno). Aluno comum = false.
      privileged: actor.privileged,
    })
    if (!elig.eligible) throw new PostingNotAllowedError('Projeto não elegível para o Mural')
    if (elig.audience !== 'kids')
      throw new PostingNotAllowedError('A vitrine é só da plataforma kids')

    // Destino: parede curada do Mural (kids + staff_only + allowlist) — ver helper.
    const channel = await this.resolveShowcaseDestination(cmd.spaceSlug)

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
      authorPublic: actor.profilePublic,
      title,
      slug: threadSlug(title, id),
      body,
      coverImageUrl,
      playId: null,
      idempotencyKey,
      now: this.clock(),
    })
    // Nível do aluno: avisa o members que este curso foi publicado no Mural (best-effort,
    // idempotente por user+curso; nunca derruba a publicação). Notifica mesmo no deduped —
    // recupera uma notificação que falhou na 1ª publicação (a 1ª talvez não tenha gravado).
    // FIRE-AND-FORGET (não `await`): a thread já está salva; bloquear a resposta aqui
    // penduraria o "Publicar no Mural" por segundos se o members estivesse lento/fora (o
    // método tem retries internos). O nível do aluno é consistência eventual — o marco
    // grava em background (idempotente) e a UI o reflete na próxima leitura. NUNCA lança.
    void this.members.notifyShowcasePublished({
      userId: actor.userId,
      accountId: actor.accountId,
      courseId: elig.courseId,
      audience: elig.audience,
    })
    return { thread: toThreadView(thread), deduped }
  }

  /**
   * Link público `/jogar/:playId` só vale enquanto o post do Mural segue visível.
   * `countHit` funde o incremento de `playsCount` na MESMA ida (o BFF já deduplicou
   * por ip:playId — o hub não conhece o IP real de quem joga).
   *
   * Marco de PLAYS (retenção pós-cursos, 07/2026): quando o hit faz o contador cruzar
   * EXATAMENTE 10 ou 100 (o UPDATE é atômico — cada hit vê um valor distinto, o
   * crossing dispara 1 vez), avisa o members em fire-and-forget best-effort → badge
   * plays-10/plays-100 (+ troféu) para o AUTOR do jogo. Falha do webhook = perda
   * aceitável de vaidade (o retry interno de 3 tentativas mitiga).
   */
  async isPlayable(
    playId: string,
    countHit = false,
  ): Promise<{ visible: boolean; authorDisplayName: string | null; authorId: string | null }> {
    const res = await this.threads.hasVisibleShowcasePlayId(playId, countHit)
    if (
      countHit &&
      res.visible &&
      res.authorId &&
      (res.playsCount === 10 || res.playsCount === 100)
    ) {
      void this.members.notifyPlaysMilestone({
        userId: res.authorId,
        // Vitrines legadas não têm o snapshot da conta → cai no próprio perfil
        // (inócuo: o marco é amount 0 e nunca toca o perfil de gamificação).
        accountId: res.authorAccountId ?? res.authorId,
        audience: 'kids',
        playId,
        milestone: res.playsCount,
      })
    }
    // `authorId` alimenta SÓ o play-check S2S (validação do remix) — a rota pública
    // do /jogar segue expondo apenas visible + 1º nome.
    return {
      visible: res.visible,
      authorDisplayName: res.authorDisplayName,
      authorId: res.authorId,
    }
  }

  /** Carreira do aluno: quantos jogos publicados (visíveis) + soma das jogadas. */
  async myShowcaseStats(actor: Actor): Promise<{ published: number; plays: number }> {
    // `authorId` das threads de vitrine é o PERFIL (actor.userId) — mesma identidade
    // usada na criação; a agregação nunca vaza dados de outros autores.
    return this.threads.showcaseStatsByAuthor(actor.userId)
  }

  /**
   * Report dos pais (members→hub S2S, rota HMAC — NUNCA exposta no gateway):
   * posts de vitrine visíveis dos PERFIS dados na janela. O members é quem
   * garante que os authorIds são os filhos da conta.
   */
  async showcaseByAuthors(
    authorIds: string[],
    from: Date,
    to: Date,
  ): Promise<Array<{ authorId: string; title: string; playId: string | null; createdAt: Date }>> {
    return this.threads.listShowcaseByAuthors(authorIds, from, to)
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
      // Equipe (chave-mestra virtual) publica no Mural p/ TESTAR o fluxo — o members
      // honra o `privileged` (como já faz na rota de aluno). Aluno comum = false.
      privileged: actor.privileged,
    })
    if (!elig.eligible) throw new PostingNotAllowedError('Projeto não elegível para o Mural')
    if (elig.audience !== 'kids')
      throw new PostingNotAllowedError('A vitrine é só da plataforma kids')

    // Destino: parede curada do Mural (mesmas guardas de `create`) — ver helper.
    const channel = await this.resolveShowcaseDestination(cmd.spaceSlug)

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
      authorPublic: actor.profilePublic,
      title,
      slug: threadSlug(title, id),
      body,
      coverImageUrl,
      playId: cmd.playId,
      idempotencyKey,
      now: this.clock(),
    })
    // Nível do aluno: mesma notificação best-effort do `create` (idempotente por user+curso).
    // FIRE-AND-FORGET (não `await`): a thread já está salva; bloquear a resposta aqui
    // penduraria o "Publicar no Mural" por segundos se o members estivesse lento/fora (o
    // método tem retries internos). O nível do aluno é consistência eventual — o marco
    // grava em background (idempotente) e a UI o reflete na próxima leitura. NUNCA lança.
    void this.members.notifyShowcasePublished({
      userId: actor.userId,
      accountId: actor.accountId,
      courseId: elig.courseId,
      audience: elig.audience,
    })
    return { thread: toThreadView(thread), deduped }
  }

  /**
   * Publicação do ESTÚDIO COMPLETO (produto vendável, SEM aula): a criança cria um
   * projeto livre e o compartilha no Mural. NÃO há `lessonId`/`blockId` nem payload
   * autoritativo do members, então:
   *  - A ELEGIBILIDADE vira "a CONTA possui o produto do Estúdio"
   *    (`members.checkAccess([estudio-completo])`, fail-closed) — espelha o gate do
   *    próprio editor; barra quem alcança a rota na borda sem ter o produto.
   *  - `title` e `description` vêm da criança (sanitizados/limitados) — não há admin.
   *  - Autor do header confiável; destino kids + parede curada (mesmas guardas).
   *  - Idempotência = `autor:standalone:clientKey` (duplo-clique dedup-a; republicar = post novo).
   */
  async createStandaloneShowcase(
    actor: Actor,
    cmd: CreateStandaloneShowcaseCommand,
  ): Promise<{ thread: ThreadView; deduped: boolean }> {
    // Elegibilidade = posse do produto do Estúdio (acesso pela CONTA). Fail-closed:
    // um erro transitório no members NÃO libera a publicação (o gateway re-entrega).
    // Com tag de DESAFIO, a MESMA chamada também resolve a posse do Clube (1 ida).
    const wantsChallenge = Boolean(cmd.challengeKey)
    const refs = wantsChallenge
      ? [STUDIO_STANDALONE_ACCESS_REF, CHALLENGE_CLUB_REF]
      : [STUDIO_STANDALONE_ACCESS_REF]
    let owns = false
    let ownsClub = false
    if (actor.privileged) {
      // Equipe (chave-mestra virtual): passe livre p/ TESTAR a publicação (e o desafio)
      // sem comprar o produto — espelha o bypass da rota `/members/access` e da
      // elegibilidade por aula. O papel vem do gateway; aluno comum nunca é privileged.
      owns = true
      ownsClub = true
    } else {
      try {
        const access = await this.members.checkAccess(actor.accountId, refs, refs)
        const has = (ref: string) =>
          access.granted.includes(ref) || access.communities.includes(ref) || access.hasMasterKids
        owns = has(STUDIO_STANDALONE_ACCESS_REF)
        ownsClub = has(CHALLENGE_CLUB_REF)
      } catch {
        // Fail-closed EM AMBOS: erro transitório não libera publicar nem entrar no desafio.
        owns = false
        ownsClub = false
      }
    }
    if (!owns) throw new PostingNotAllowedError('Sem acesso ao Estúdio para publicar')

    // Tag do desafio: formato + mês CORRENTE (SP, recomputado aqui — o corpo não
    // dita o mês) + posse do Clube. Reprovada → post SEM a tag (drop SILENCIOSO:
    // a publicação da criança nunca falha por causa do desafio).
    const challengeKey =
      wantsChallenge &&
      cmd.challengeKey &&
      CHALLENGE_KEY_RE.test(cmd.challengeKey) &&
      cmd.challengeKey === currentChallengeKey(this.clock()) &&
      ownsClub
        ? cmd.challengeKey
        : null

    // Destino: parede curada do Mural (mesmas guardas das outras publicações) — ver helper.
    const channel = await this.resolveShowcaseDestination(cmd.spaceSlug)

    // Sem aula → título E corpo são da criança (limitados). O nome do autor vem do header.
    const title = cmd.title.trim()
    const body = cmd.description.trim()
    const displayName = actor.displayName.trim()
    if (!title || title.length > MAX_TITLE) throw new PostingNotAllowedError('Título inválido')
    if (!body || body.length > MAX_STUDIO_DESCRIPTION) {
      throw new PostingNotAllowedError('Descrição inválida')
    }
    if (!displayName || displayName.length > MAX_DISPLAY_NAME) {
      throw new PostingNotAllowedError('Nome do autor inválido')
    }

    const coverImageUrl = cmd.coverImageUrl?.startsWith('https://') ? cmd.coverImageUrl : null

    // Sem curso/cadeia: a idempotência é só `autor:standalone:clientKey` (duplo-clique
    // dedup-a; republicar com clientKey novo = post NOVO, snapshot imutável).
    const idempotencyKey = createHash('sha256')
      .update(`${actor.userId}:studio-standalone:${cmd.clientIdempotencyKey}`)
      .digest('hex')

    const id = this.newId()
    const { thread, deduped } = await this.threads.createShowcaseThread({
      id,
      channelId: channel.id,
      authorId: actor.userId,
      authorDisplayName: displayName,
      authorPublic: actor.profilePublic,
      title,
      slug: threadSlug(title, id),
      body,
      coverImageUrl,
      playId: cmd.playId,
      challengeKey,
      idempotencyKey,
      now: this.clock(),
    })
    // Desafio do mês: avisa o members (XP + badge) SÓ quando a thread nasceu/existe
    // com a tag — fire-and-forget best-effort como o notifyShowcasePublished; o
    // members deduplica por mês (mesmo no `deduped` a notificação recupera uma 1ª falha).
    if (thread.challengeKey) {
      void this.members.notifyChallengeEntry({
        userId: actor.userId,
        accountId: actor.accountId,
        audience: 'kids',
        challengeKey: thread.challengeKey,
      })
    }
    // Retenção pós-cursos: publicar standalone gera gamificação — marco `studio_published`
    // (missões gated por estudio-completo) + XP diário de publicar (streak/liga de quem
    // só cria). FIRE-AND-FORGET best-effort (espelha o notifyShowcasePublished); notifica
    // mesmo no `deduped` (recupera falha anterior; o members é idempotente por playId/dia).
    if (thread.playId) {
      void this.members.notifyStandaloneShowcase({
        userId: actor.userId,
        accountId: actor.accountId,
        audience: 'kids',
        playId: thread.playId,
      })
    }
    return { thread: toThreadView(thread), deduped }
  }
}
