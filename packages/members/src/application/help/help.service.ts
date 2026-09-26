import { randomUUID } from 'node:crypto'
import {
  buildHelpSearchText,
  buildHelpZappyText,
  type HelpCollectionDocument,
  type HelpCollectionView,
  type HelpTutorialDocument,
  type HelpTutorialEntry,
  type HelpTutorialView,
  isHelpSlug,
  validateHelpCollection,
  validateHelpTutorial,
} from '@sistemazero/core/help'
import {
  HelpCollectionInUseError,
  HelpCollectionNotFoundError,
  HelpSlugLockedError,
  HelpTutorialArchivedError,
  HelpTutorialConflictError,
  HelpTutorialInvalidError,
  HelpTutorialNotFoundError,
} from '../../domain/help/help.errors'
import type {
  HelpCollectionRecord,
  HelpCollectionRepository,
  HelpImportItem,
  HelpTutorialListFilter,
  HelpTutorialRecord,
  HelpTutorialRepository,
} from '../../domain/ports/help-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import {
  type HelpTutorialAdminSummaryView,
  type HelpTutorialAdminView,
  toHelpCollectionView,
  toHelpTutorialAdminSummaryView,
  toHelpTutorialAdminView,
  toHelpTutorialEntry,
  toHelpTutorialView,
} from '../mappers/help-views'

export interface CreateHelpTutorialCommand {
  slug: string
  collectionId: string
  position?: number
  draft?: HelpTutorialDocument
}

export interface PatchHelpTutorialCommand {
  expectedRevision: number
  slug?: string
  collectionId?: string
  position?: number
  draft?: HelpTutorialDocument
}

export interface HelpImportCommand {
  collections?: Array<HelpCollectionDocument & { position?: number }>
  tutorials: Array<{
    slug: string
    /** Slug da coleção (o JSON viaja entre ambientes; ids não). */
    collection: string
    position?: number
    draft: HelpTutorialDocument
  }>
}

export interface HelpImportResult {
  collections: { created: number; updated: number }
  tutorials: { created: number; updated: number }
  /** Tutoriais recusados na forma (não os bloqueios editoriais: import é rascunho). */
  rejected: Array<{ slug: string; reason: string }>
}

/** Um tutorial publicado que casou com a pergunta do Zappy (vai para o prompt e para o chip). */
export interface HelpZappyHit {
  kind: 'help-tutorial'
  slug: string
  title: string
  collectionTitle: string
  content: string
}

/**
 * O "Como fazer": coleções e tutoriais da biblioteca de ajuda do Kids. Sem matrícula,
 * sem progresso: a criança lê o publicado; o admin edita o rascunho e publica.
 */
export class HelpService {
  constructor(
    private readonly collections: HelpCollectionRepository,
    private readonly tutorials: HelpTutorialRepository,
    private readonly clock: () => Date,
    private readonly newId: () => string = randomUUID,
  ) {}

  // ── Leitura da criança (só o publicado) ──────────────────────────────────

  async listCollectionsPublic(): Promise<{ collections: HelpCollectionView[] }> {
    const [records, counts] = await Promise.all([
      this.collections.list(),
      this.collections.publishedCounts(),
    ])
    return {
      collections: records
        .filter((record) => record.status === 'active')
        .map((record) => toHelpCollectionView(record, counts.get(record.id) ?? 0)),
    }
  }

  async listPublished(): Promise<{ tutorials: HelpTutorialEntry[] }> {
    const [records, collections] = await Promise.all([
      this.tutorials.listPublished(),
      this.collections.list(),
    ])
    const byId = new Map(collections.map((c) => [c.id, c]))
    return {
      tutorials: records.flatMap((record) => {
        const collection = byId.get(record.collectionId)
        if (collection?.status !== 'active') return []
        const entry = toHelpTutorialEntry(record, collection)
        return entry ? [entry] : []
      }),
    }
  }

  async getPublished(slug: string): Promise<HelpTutorialView> {
    const record = await this.tutorials.findPublishedBySlug(slug)
    if (!record) throw new HelpTutorialNotFoundError()
    const collection = await this.collections.findById(record.collectionId)
    if (collection?.status !== 'active') throw new HelpTutorialNotFoundError()
    const view = toHelpTutorialView(record, collection)
    if (!view) throw new HelpTutorialNotFoundError()
    return view
  }

  /** A busca do Zappy: tutoriais publicados que casam com a pergunta (sem gate de matrícula). */
  async searchForZappy(query: string, limit = 3): Promise<HelpZappyHit[]> {
    const [hits, collections] = await Promise.all([
      this.tutorials.searchPublished(query, limit),
      this.collections.list(),
    ])
    const byId = new Map(collections.map((c) => [c.id, c]))
    return hits.flatMap((hit) => {
      const collection = byId.get(hit.collectionId)
      if (collection?.status !== 'active') return []
      return [
        {
          kind: 'help-tutorial' as const,
          slug: hit.slug,
          title: hit.title,
          collectionTitle: collection.title,
          content: buildHelpZappyText(hit.published),
        },
      ]
    })
  }

  // ── Coleções (admin) ───────────────────────────────────────────────────────

  async listCollections(): Promise<{ collections: HelpCollectionView[] }> {
    const [records, counts] = await Promise.all([
      this.collections.list(),
      this.collections.publishedCounts(),
    ])
    return {
      collections: records.map((record) =>
        toHelpCollectionView(record, counts.get(record.id) ?? 0),
      ),
    }
  }

  async createCollection(doc: HelpCollectionDocument): Promise<HelpCollectionView> {
    const issues = validateHelpCollection(doc)
    if (issues.length) throw new ValidationError(issues.map((i) => i.message).join(' '))
    const existing = await this.collections.list()
    const record = await this.collections.create({
      ...doc,
      id: this.newId(),
      position: existing.length,
      now: this.clock(),
    })
    return toHelpCollectionView(record, 0)
  }

  async updateCollection(
    id: string,
    patch: Partial<HelpCollectionDocument>,
  ): Promise<HelpCollectionView> {
    const current = await this.collections.findById(id)
    if (!current) throw new HelpCollectionNotFoundError()
    const merged: HelpCollectionDocument = {
      slug: patch.slug ?? current.slug,
      title: patch.title ?? current.title,
      description: patch.description ?? current.description,
      icon: patch.icon ?? current.icon,
      tone: patch.tone ?? current.tone,
    }
    const issues = validateHelpCollection(merged)
    if (issues.length) throw new ValidationError(issues.map((i) => i.message).join(' '))
    const record = await this.collections.update(id, merged, this.clock())
    if (!record) throw new HelpCollectionNotFoundError()
    const counts = await this.collections.publishedCounts()
    return toHelpCollectionView(record, counts.get(id) ?? 0)
  }

  async archiveCollection(id: string): Promise<HelpCollectionView> {
    const current = await this.collections.findById(id)
    if (!current) throw new HelpCollectionNotFoundError()
    if ((await this.tutorials.countPublishedInCollection(id)) > 0) {
      throw new HelpCollectionInUseError()
    }
    const record = await this.collections.setStatus(id, 'archived', this.clock())
    if (!record) throw new HelpCollectionNotFoundError()
    return toHelpCollectionView(record, 0)
  }

  async restoreCollection(id: string): Promise<HelpCollectionView> {
    const record = await this.collections.setStatus(id, 'active', this.clock())
    if (!record) throw new HelpCollectionNotFoundError()
    const counts = await this.collections.publishedCounts()
    return toHelpCollectionView(record, counts.get(id) ?? 0)
  }

  async reorderCollections(ids: string[]): Promise<{ collections: HelpCollectionView[] }> {
    await this.collections.reorder(ids, this.clock())
    return this.listCollections()
  }

  // ── Tutoriais (admin) ──────────────────────────────────────────────────────

  async list(filter: HelpTutorialListFilter = {}): Promise<{
    tutorials: HelpTutorialAdminSummaryView[]
  }> {
    const records = await this.tutorials.listAll(filter)
    return { tutorials: records.map(toHelpTutorialAdminSummaryView) }
  }

  async get(id: string): Promise<HelpTutorialAdminView> {
    const record = await this.tutorials.findById(id)
    if (!record) throw new HelpTutorialNotFoundError()
    return toHelpTutorialAdminView(record)
  }

  async create(
    cmd: CreateHelpTutorialCommand,
    actorId: string | null,
  ): Promise<HelpTutorialAdminView> {
    await this.requireActiveCollection(cmd.collectionId)
    const draft: HelpTutorialDocument = cmd.draft ?? {
      title: '',
      summary: '',
      keywords: [],
      steps: [{ id: 'passo-1', title: '', body: '' }],
    }
    const record = await this.tutorials.create({
      id: this.newId(),
      slug: cmd.slug,
      collectionId: cmd.collectionId,
      draft,
      position: cmd.position ?? 0,
      actorId,
      now: this.clock(),
    })
    return toHelpTutorialAdminView(record)
  }

  async update(
    id: string,
    cmd: PatchHelpTutorialCommand,
    actorId: string | null,
  ): Promise<HelpTutorialAdminView> {
    const current = await this.requireTutorial(id)
    if (current.status === 'archived') throw new HelpTutorialArchivedError()
    if (cmd.collectionId && cmd.collectionId !== current.collectionId) {
      await this.requireActiveCollection(cmd.collectionId)
    }
    if (cmd.slug !== undefined && cmd.slug !== current.slug) {
      // A mesma régua do `create` (formato + reservados): sem ela, `colecao` entrava pelo PATCH
      // e o tutorial sumia atrás do segmento estático do kids até o próximo publish acusar.
      if (!isHelpSlug(cmd.slug)) {
        throw new HelpTutorialInvalidError([{ field: 'slug', message: 'Endereço inválido' }])
      }
      if (current.status === 'published') throw new HelpSlugLockedError()
    }
    const patch = {
      ...(cmd.slug !== undefined ? { slug: cmd.slug } : {}),
      ...(cmd.collectionId !== undefined ? { collectionId: cmd.collectionId } : {}),
      ...(cmd.position !== undefined ? { position: cmd.position } : {}),
      ...(cmd.draft !== undefined ? { draft: cmd.draft } : {}),
    }
    const result = await this.tutorials.update(
      id,
      cmd.expectedRevision,
      patch,
      actorId,
      this.clock(),
    )
    return toHelpTutorialAdminView(await this.resolveResult(result, id))
  }

  /**
   * Publicar = validar o rascunho, copiá-lo para `published` e gravar o texto de busca. É a
   * mesma linha que o Zappy pesquisa, então a base dele muda no mesmo instante.
   */
  async publish(
    id: string,
    expectedRevision: number,
    actorId: string | null,
  ): Promise<HelpTutorialAdminView> {
    const current = await this.requireTutorial(id)
    if (current.status === 'archived') throw new HelpTutorialArchivedError()
    await this.requireActiveCollection(current.collectionId)
    const issues = validateHelpTutorial(current.draft, { slug: current.slug })
    if (issues.length) throw new HelpTutorialInvalidError(issues)
    const published = structuredClone(current.draft)
    const result = await this.tutorials.setStatus(
      id,
      expectedRevision,
      {
        status: 'published',
        published,
        publishedSearchText: buildHelpSearchText(published),
        publishedAt: this.clock(),
      },
      actorId,
      this.clock(),
    )
    return toHelpTutorialAdminView(await this.resolveResult(result, id))
  }

  async unpublish(
    id: string,
    expectedRevision: number,
    actorId: string | null,
  ): Promise<HelpTutorialAdminView> {
    const current = await this.requireTutorial(id)
    if (current.status === 'archived') throw new HelpTutorialArchivedError()
    const result = await this.tutorials.setStatus(
      id,
      expectedRevision,
      { status: 'draft', published: null, publishedSearchText: null, publishedAt: null },
      actorId,
      this.clock(),
    )
    return toHelpTutorialAdminView(await this.resolveResult(result, id))
  }

  async archive(
    id: string,
    expectedRevision: number,
    actorId: string | null,
  ): Promise<HelpTutorialAdminView> {
    await this.requireTutorial(id)
    const result = await this.tutorials.setStatus(
      id,
      expectedRevision,
      { status: 'archived', published: null, publishedSearchText: null, publishedAt: null },
      actorId,
      this.clock(),
    )
    return toHelpTutorialAdminView(await this.resolveResult(result, id))
  }

  async export(): Promise<{
    collections: HelpCollectionView[]
    tutorials: HelpTutorialAdminView[]
  }> {
    const [{ collections }, records] = await Promise.all([
      this.listCollections(),
      this.tutorials.listAll(),
    ])
    // Arquivado NÃO viaja: o import do destino faria uma coleção arquivada nascer ativa e um
    // tutorial arquivado ganhar rascunho novo sem poder ser editado (o status não vai no arquivo).
    return {
      collections: collections.filter((c) => c.status === 'active'),
      tutorials: records.filter((r) => r.status !== 'archived').map(toHelpTutorialAdminView),
    }
  }

  /**
   * Import por slug: coleções primeiro (cria ou atualiza), depois tutoriais (só o `draft`;
   * o publicado fica intocado). É o caminho do lote inicial e da viagem staging → produção.
   */
  async import(cmd: HelpImportCommand, actorId: string | null): Promise<HelpImportResult> {
    const now = this.clock()
    const collectionsResult = { created: 0, updated: 0 }
    // Valida o lote INTEIRO antes de gravar qualquer coisa: com a validação dentro do laço, a
    // 3ª coleção inválida deixava as duas primeiras já gravadas e nenhum tutorial importado.
    for (const doc of cmd.collections ?? []) {
      const issues = validateHelpCollection(doc)
      if (issues.length) {
        throw new ValidationError(
          `Coleção "${doc.slug}": ${issues.map((i) => i.message).join(' ')}`,
        )
      }
    }
    const slugsDeColecao = (cmd.collections ?? []).map((c) => c.slug)
    if (new Set(slugsDeColecao).size !== slugsDeColecao.length) {
      throw new ValidationError('Há coleção repetida no lote (mesmo slug duas vezes).')
    }
    for (const [index, doc] of (cmd.collections ?? []).entries()) {
      const existing = await this.collections.findBySlug(doc.slug)
      if (existing) {
        await this.collections.update(
          existing.id,
          {
            title: doc.title,
            description: doc.description,
            icon: doc.icon,
            tone: doc.tone,
            ...(doc.position !== undefined ? { position: doc.position } : {}),
          },
          now,
        )
        collectionsResult.updated += 1
      } else {
        await this.collections.create({
          slug: doc.slug,
          title: doc.title,
          description: doc.description,
          icon: doc.icon,
          tone: doc.tone,
          id: this.newId(),
          position: doc.position ?? index,
          now,
        })
        collectionsResult.created += 1
      }
    }
    const all = await this.collections.list()
    // Só coleção ATIVA recebe tutorial: numa arquivada ele sumiria da criança (as leituras
    // filtram coleção ativa) e o `publishedCounts` continuaria contando.
    const bySlug = new Map(all.filter((c) => c.status === 'active').map((c) => [c.slug, c]))
    const rejected: HelpImportResult['rejected'] = []
    const vistos = new Set<string>()
    const items: HelpImportItem[] = []
    for (const [index, item] of cmd.tutorials.entries()) {
      if (vistos.has(item.slug)) {
        rejected.push({ slug: item.slug, reason: 'endereço repetido no lote' })
        continue
      }
      vistos.add(item.slug)
      const collection = bySlug.get(item.collection)
      if (!collection) {
        rejected.push({
          slug: item.slug,
          reason: `coleção "${item.collection}" não existe ou está arquivada`,
        })
        continue
      }
      // Tutorial arquivado não volta pelo import: o rascunho entraria numa linha que ninguém
      // consegue editar nem publicar, e o resultado diria "atualizado".
      const atual = await this.tutorials.findBySlug(item.slug)
      if (atual?.status === 'archived') {
        rejected.push({ slug: item.slug, reason: 'tutorial arquivado (o endereço fica reservado)' })
        continue
      }
      const issues = validateHelpTutorial(item.draft, { slug: item.slug }).filter(
        (issue) => issue.field === 'slug',
      )
      if (issues.length) {
        rejected.push({ slug: item.slug, reason: issues[0]?.message ?? 'endereço inválido' })
        continue
      }
      items.push({
        slug: item.slug,
        collectionId: collection.id,
        draft: item.draft,
        position: item.position ?? index,
      })
    }
    const tutorials = await this.tutorials.upsertDraftsBySlug(items, actorId, now)
    return { collections: collectionsResult, tutorials, rejected }
  }

  // ── Apoio ──────────────────────────────────────────────────────────────────

  private async requireTutorial(id: string): Promise<HelpTutorialRecord> {
    const record = await this.tutorials.findById(id)
    if (!record) throw new HelpTutorialNotFoundError()
    return record
  }

  private async requireActiveCollection(id: string): Promise<HelpCollectionRecord> {
    const collection = await this.collections.findById(id)
    if (!collection) throw new HelpCollectionNotFoundError()
    if (collection.status !== 'active') {
      throw new ValidationError('Esta coleção está arquivada. Escolha outra.')
    }
    return collection
  }

  /** Conflito devolve a revisão ATUAL (relida: a que o chamador tinha já ficou para trás). */
  private async resolveResult(
    result: HelpTutorialRecord | 'conflict' | null,
    id: string,
  ): Promise<HelpTutorialRecord> {
    if (result === 'conflict') {
      const now = await this.tutorials.findById(id)
      throw new HelpTutorialConflictError(now?.revision ?? 0)
    }
    if (!result) throw new HelpTutorialNotFoundError()
    return result
  }
}
