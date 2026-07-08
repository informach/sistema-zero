import { ValidationError } from '@sistemazero/core/errors'
import { canCreatePublications } from '../../domain/content/stage'
import {
  AutoPublishUnavailableError,
  ConcurrencyConflictError,
  ContentNotApprovedError,
  InvalidPublicationStateError,
  PublicationNotFoundError,
} from '../../domain/marketing-errors'
import type { MediaAssetRepository } from '../../domain/ports/media-asset-repository.port'
import type { PublicationAssetRepository } from '../../domain/ports/publication-asset-repository.port'
import type {
  PublicationRepository,
  PublicationsWindowFilter,
} from '../../domain/ports/publication-repository.port'
import type { SocialAccountRepository } from '../../domain/ports/social-account-repository.port'
import type { Network } from '../../domain/publication/publication'
import {
  canCancelPublication,
  canMarkPublished,
  canSchedule,
  FORMAT_NETWORK,
  forcesManualMode,
  isActivePublication,
  isEditable,
  isPendingPublication,
  type PublicationFormat,
  type PublishMode,
} from '../../domain/publication/publication'
import type { Publication } from '../../domain/publication/publication-record'
import { canAutoPublish } from '../../domain/social-account/social-account'
import type { Actor } from '../actor'
import type { ContentService } from '../contents/content.service'
import {
  type PublicationListItemView,
  type PublicationView,
  toPublicationListItemView,
  toPublicationView,
} from '../mappers/views'

/** Janela máxima da listagem por data (3 meses de calendário + folga). */
const MAX_WINDOW_MS = 92 * 86_400_000

export interface CreatePublicationsInput {
  formats: PublicationFormat[]
  /** Legenda-base herdada pelo composer de cada rede (editável depois). */
  caption?: string
}

export interface UpdatePublicationInput {
  caption?: string
  title?: string | null
  tags?: string[]
  coverAssetId?: string | null
  scheduledAt?: Date | null
  publishMode?: PublishMode
  /** Conta da publicação automática (obrigatória quando há mais de uma apta). */
  socialAccountId?: string | null
  version: number
}

/** Ator de sistema (workers) p/ os stage events derivados. */
const SYSTEM_ACTOR: Actor = {
  userId: '00000000-0000-0000-0000-000000000000',
  displayName: 'Sistema',
  role: 'system',
  status: 'active',
}

/** O vídeo já subiu ao provedor (checkpoint com id salvo)? Metadados congelam. */
function hasRemoteVideo(pub: Publication): boolean {
  return typeof pub.providerSession.videoId === 'string'
}

export class PublicationService {
  constructor(
    private readonly publications: PublicationRepository,
    private readonly contentService: ContentService,
    private readonly now: () => Date,
    private readonly idGen: () => string,
    /** Ordem dos assets do carrossel + catálogo de mídia p/ validar a lista. */
    private readonly carousel: {
      links: PublicationAssetRepository
      media: MediaAssetRepository
    },
    /** Redes com publisher automático MONTADO (F2: youtube) + contas p/ o binding. */
    private readonly auto: {
      accounts: SocialAccountRepository
      capableNetworks: ReadonlySet<Network>
    } | null = null,
  ) {}

  /** View de UMA publicação sempre carrega a ordem dos assets (composer). */
  private async viewOf(pub: Publication): Promise<PublicationView> {
    const assetIds = await this.carousel.links.listByPublication(pub.id)
    return toPublicationView(pub, assetIds)
  }

  /** Cria N publicações (cross-post) a partir de um conteúdo APROVADO. */
  async createForContent(
    _actor: Actor,
    contentId: string,
    input: CreatePublicationsInput,
  ): Promise<PublicationView[]> {
    const content = await this.contentService.byId(contentId)
    if (!canCreatePublications(content.stage)) throw new ContentNotApprovedError()
    // Um formato = uma publicação ativa por conteúdo: dedupe da entrada e 409
    // se já existe (duplo clique/reenvio). Canceladas não contam — recriar vale.
    const formats = [...new Set(input.formats)]
    const existing = await this.publications.listByContent(contentId)
    const activeFormats = new Set(
      existing.filter((p) => isActivePublication(p.status)).map((p) => p.format),
    )
    const duplicated = formats.find((format) => activeFormats.has(format))
    if (duplicated) {
      throw new InvalidPublicationStateError(
        `O formato ${duplicated} já tem publicação ativa neste conteúdo — cancele-a antes de recriar`,
      )
    }
    const at = this.now()
    const created: Publication[] = formats.map((format) => ({
      id: this.idGen(),
      version: 0,
      contentId,
      socialAccountId: null,
      network: FORMAT_NETWORK[format],
      format,
      caption: input.caption ?? '',
      title: null,
      tags: [],
      coverAssetId: null,
      scheduledAt: null,
      // Fase atual: tudo nasce `manual` (lembrete). `auto` entra quando a rede
      // estiver conectada (publisher-worker das próximas fases).
      publishMode: 'manual',
      status: 'draft',
      attempts: 0,
      nextAttemptAt: null,
      lastError: null,
      providerSession: {},
      externalPostId: null,
      externalUrl: null,
      publishedAt: null,
      reminderSentAt: null,
      metricsLastCollectedAt: null,
      metricsNextCollectAt: null,
      createdAt: at,
      updatedAt: at,
    }))
    // Insert único (atômico): falha não deixa cross-post pela metade.
    await this.publications.createMany(created)
    return created.map((p) => toPublicationView(p))
  }

  async get(id: string): Promise<PublicationView> {
    const pub = await this.publications.byId(id)
    if (!pub) throw new PublicationNotFoundError()
    return this.viewOf(pub)
  }

  /**
   * Substitui a lista ordenada de assets do carrossel (PUT semântico: a lista
   * enviada É o estado final). Cada asset precisa estar `ready` e pertencer ao
   * MESMO conteúdo da publicação — mídia de outro conteúdo no post é troca de
   * arquivo silenciosa, não reordenação.
   */
  async setAssets(id: string, assetIds: string[]): Promise<PublicationView> {
    const pub = await this.publications.byId(id)
    if (!pub) throw new PublicationNotFoundError()
    if (!isEditable(pub.status)) {
      throw new InvalidPublicationStateError('Publicação não pode mais ser editada')
    }
    if (assetIds.length === 0 || assetIds.length > 10) {
      throw new ValidationError('O carrossel aceita de 1 a 10 imagens')
    }
    if (new Set(assetIds).size !== assetIds.length) {
      throw new ValidationError('Há imagens repetidas na lista do carrossel')
    }
    const found = await this.carousel.media.byIds(assetIds)
    for (const assetId of assetIds) {
      const asset = found.get(assetId)
      if (!asset || asset.contentId !== pub.contentId) {
        throw new ValidationError('Todas as imagens precisam ser mídias deste conteúdo')
      }
      if (asset.status !== 'ready') {
        throw new ValidationError(`A mídia "${asset.filename}" ainda não terminou de subir`)
      }
    }
    await this.carousel.links.replaceForPublication(pub.id, assetIds)
    return toPublicationView(pub, assetIds)
  }

  /**
   * Listagem por janela de `scheduled_at` + filtros (Calendário/Painel). Janela
   * é OPCIONAL (falhas = só status; atrasadas = só `to`); com from E to, valida
   * ordem e teto de 92 dias (grade mensal cabe com folga).
   */
  async listByWindow(
    filter: PublicationsWindowFilter,
  ): Promise<{ items: PublicationListItemView[]; total: number }> {
    if (filter.from && filter.to) {
      if (filter.from.getTime() > filter.to.getTime()) {
        throw new ValidationError('`from` deve ser anterior a `to`')
      }
      if (filter.to.getTime() - filter.from.getTime() > MAX_WINDOW_MS) {
        throw new ValidationError('Janela de datas grande demais (máximo 92 dias)')
      }
    }
    const { items, total } = await this.publications.listByWindow(filter)
    return { items: items.map(toPublicationListItemView), total }
  }

  async update(id: string, input: UpdatePublicationInput): Promise<PublicationView> {
    const pub = await this.publications.byId(id)
    if (!pub) throw new PublicationNotFoundError()
    if (!isEditable(pub.status)) {
      throw new InvalidPublicationStateError('Publicação não pode mais ser editada')
    }
    // PÓS-upload (vídeo já no YouTube): metadados congelam — editar aqui não
    // mudaria o vídeo remoto e criaria divergência silenciosa.
    if (
      hasRemoteVideo(pub) &&
      (input.caption !== undefined ||
        input.title !== undefined ||
        input.tags !== undefined ||
        input.coverAssetId !== undefined)
    ) {
      throw new InvalidPublicationStateError(
        'O vídeo já subiu ao YouTube. Edite os dados no YouTube Studio, ou cancele e recrie a publicação',
      )
    }
    const expectedVersion = input.version
    if (input.caption !== undefined) pub.caption = input.caption
    if (input.title !== undefined) pub.title = input.title
    if (input.tags !== undefined) pub.tags = input.tags
    if (input.coverAssetId !== undefined) pub.coverAssetId = input.coverAssetId
    if (input.scheduledAt !== undefined) {
      // Agendada não perde o horário por edição (ficaria `scheduled` sem data,
      // invisível p/ o lembrete): o caminho é cancelar ou reagendar (/schedule).
      if (input.scheduledAt === null && pub.status === 'scheduled') {
        throw new InvalidPublicationStateError(
          'Publicação agendada não pode ficar sem horário — cancele ou reagende',
        )
      }
      if (input.scheduledAt !== null) this.assertScheduleWindow(input.scheduledAt)
      pub.scheduledAt = input.scheduledAt
    }
    if (input.publishMode !== undefined) {
      if (input.publishMode === 'auto') {
        await this.enableAutoMode(pub, input.socialAccountId ?? undefined)
      } else {
        pub.publishMode = input.publishMode
      }
    }
    pub.version = expectedVersion + 1
    pub.updatedAt = this.now()
    const ok = await this.publications.update(pub, expectedVersion)
    if (!ok) throw new ConcurrencyConflictError()
    return this.viewOf(pub)
  }

  /**
   * Liga o modo AUTOMÁTICO: exige publisher montado p/ a rede (F2: youtube) e
   * conta conectada COM os escopos de publicação; resolve/valida o binding da
   * conta (única apta = default; várias → o composer precisa indicar).
   */
  private async enableAutoMode(pub: Publication, socialAccountId?: string): Promise<void> {
    if (forcesManualMode(pub.format)) {
      throw new AutoPublishUnavailableError('Stories não têm publicação automática (limite da API)')
    }
    if (!this.auto?.capableNetworks.has(pub.network)) {
      throw new AutoPublishUnavailableError()
    }
    const accounts = await this.auto.accounts.listByNetwork(pub.network)
    const capable = accounts.filter(canAutoPublish)
    if (capable.length === 0) {
      throw new AutoPublishUnavailableError(
        'Nenhuma conta conectada com os escopos de publicação. Conecte (ou reconecte) em Conexões',
      )
    }
    let account = socialAccountId ? capable.find((a) => a.id === socialAccountId) : undefined
    if (!account && !socialAccountId && capable.length === 1) account = capable[0]
    if (!account) {
      throw socialAccountId
        ? new AutoPublishUnavailableError('A conta indicada não está apta a publicar')
        : new ValidationError('Mais de uma conta conectada. Indique a conta da publicação')
    }
    pub.publishMode = 'auto'
    pub.socialAccountId = account.id
  }

  /**
   * Janela de agendamento válida: nada no passado (5min de folga p/ clock skew
   * e "agora mesmo") e nada além de 2 anos (typo de ano vira erro, não silêncio).
   */
  private assertScheduleWindow(scheduledAt: Date): void {
    const now = this.now().getTime()
    if (scheduledAt.getTime() < now - 5 * 60_000) {
      throw new ValidationError('O horário de agendamento não pode estar no passado')
    }
    if (scheduledAt.getTime() > now + 2 * 365 * 86_400_000) {
      throw new ValidationError('O horário de agendamento está longe demais (máximo 2 anos)')
    }
  }

  /** Agenda (ou reagenda). No modo manual vira o compromisso do lembrete. */
  async schedule(actor: Actor, id: string, scheduledAt: Date): Promise<PublicationView> {
    const pub = await this.publications.byId(id)
    if (!pub) throw new PublicationNotFoundError()
    if (!canSchedule(pub.status)) {
      throw new InvalidPublicationStateError('Publicação não pode ser agendada neste estado')
    }
    this.assertScheduleWindow(scheduledAt)
    const expectedVersion = pub.version
    pub.scheduledAt = scheduledAt
    pub.status = 'scheduled'
    pub.lastError = null
    // Reagendamento PÓS-upload: o vídeo já está no YouTube com publishAt — o
    // worker sincroniza o horário nativo via videos.update (fase resync).
    if (hasRemoteVideo(pub)) {
      pub.providerSession = { ...pub.providerSession, phase: 'resync_publish_at' }
      pub.nextAttemptAt = this.now()
    }
    pub.version = expectedVersion + 1
    pub.updatedAt = this.now()
    const ok = await this.publications.update(pub, expectedVersion)
    if (!ok) throw new ConcurrencyConflictError()
    await this.syncContentStage(actor, pub.contentId)
    return this.viewOf(pub)
  }

  async cancel(actor: Actor, id: string): Promise<PublicationView> {
    const pub = await this.publications.byId(id)
    if (!pub) throw new PublicationNotFoundError()
    if (!canCancelPublication(pub.status)) {
      throw new InvalidPublicationStateError('Publicação não pode ser cancelada neste estado')
    }
    const expectedVersion = pub.version
    pub.status = 'canceled'
    // Vídeo já enviado (privado, aguardando o publishAt): o cancelamento local
    // NÃO apaga no provedor — deixa o aviso p/ a limpeza manual no Studio.
    if (hasRemoteVideo(pub)) {
      pub.lastError =
        'O vídeo já está no YouTube (privado). Apague no YouTube Studio se não quiser publicá-lo'
    }
    pub.version = expectedVersion + 1
    pub.updatedAt = this.now()
    const ok = await this.publications.update(pub, expectedVersion)
    if (!ok) throw new ConcurrencyConflictError()
    await this.syncContentStage(actor, pub.contentId)
    return this.viewOf(pub)
  }

  /** Modo lembrete: a pessoa postou na mão e cola o link do post real. */
  async markPublished(
    actor: Actor,
    id: string,
    input: { externalUrl?: string | null; externalPostId?: string | null },
  ): Promise<PublicationView> {
    const pub = await this.publications.byId(id)
    if (!pub) throw new PublicationNotFoundError()
    if (!canMarkPublished(pub.status)) {
      throw new InvalidPublicationStateError('Publicação não pode ser marcada como publicada')
    }
    const expectedVersion = pub.version
    pub.status = 'published'
    pub.publishedAt = this.now()
    pub.externalUrl = input.externalUrl ?? pub.externalUrl
    pub.externalPostId = input.externalPostId ?? pub.externalPostId
    // Com o post real identificado, a coleta de métricas entra no radar já.
    if (pub.externalPostId) pub.metricsNextCollectAt = pub.publishedAt
    pub.lastError = null
    pub.version = expectedVersion + 1
    pub.updatedAt = pub.publishedAt
    const ok = await this.publications.update(pub, expectedVersion)
    if (!ok) throw new ConcurrencyConflictError()
    await this.syncContentStage(actor, pub.contentId)
    return this.viewOf(pub)
  }

  /** Sincronização da etapa derivada disparada pelos WORKERS (ator de sistema). */
  async syncStageFromWorker(contentId: string): Promise<void> {
    await this.syncContentStage(SYSTEM_ACTOR, contentId)
  }

  /**
   * Sincroniza a etapa MATERIALIZADA do conteúdo a partir das publicações:
   * todas publicadas (≥1 ativa) → `published`; alguma pendente → `scheduled`;
   * nenhuma pendente → volta a `approved`. Só mexe quando o conteúdo já está
   * em approved/scheduled/published (publicações exigem aprovação p/ existir).
   */
  private async syncContentStage(actor: Actor, contentId: string): Promise<void> {
    const content = await this.contentService.byId(contentId)
    if (!canCreatePublications(content.stage)) return
    const pubs = await this.publications.listByContent(contentId)
    const active = pubs.filter((p) => isActivePublication(p.status))
    let target = content.stage
    if (active.length > 0 && active.every((p) => p.status === 'published')) {
      target = 'published'
    } else if (active.some((p) => isPendingPublication(p.status))) {
      target = 'scheduled'
    } else {
      target = 'approved'
    }
    if (target !== content.stage) {
      await this.contentService.applyStageChange(actor, content, target)
    }
  }
}
