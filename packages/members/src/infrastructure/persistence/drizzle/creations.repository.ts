import { randomUUID } from 'node:crypto'
import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm'
import type {
  CreationPartRef,
  CreationRecord,
  CreationSummary,
  CreationTool,
} from '../../../domain/creations/creation'
import {
  classifyPintaPaletteLibraryCreation,
  isPintaPaletteLibraryCreation,
  PALETTE_LIBRARY_ITEM_ID,
  PALETTE_LIBRARY_KIND,
  PALETTE_LIBRARY_TOOL,
} from '../../../domain/creations/palette-library'
import type {
  CreationCommitResult,
  CreationsRepository,
  CreationUploadInput,
  CreationUploadReservation,
  CreationUsage,
} from '../../../domain/ports/creations-repository.port'
import type { Database } from './db'
import { accountDeletionFences, creations } from './schema'

type Row = typeof creations.$inferSelect

const toSummary = (row: Row): CreationSummary => ({
  tool: row.tool,
  itemId: row.itemId,
  name: row.name,
  kind: row.kind,
  itemUpdatedAt: row.itemUpdatedAt,
  revision: row.revision,
  bytes: row.bytes,
  thumb: row.thumb,
  syncedAt: row.syncedAt,
})

const toRecord = (row: Row): CreationRecord => ({
  ...toSummary(row),
  id: row.id,
  userId: row.userId,
  accountId: row.accountId,
  pending:
    row.pendingRevision !== null &&
    row.pendingBytes !== null &&
    row.pendingName !== null &&
    row.pendingKind !== null &&
    row.pendingItemUpdatedAt !== null
      ? {
          revision: row.pendingRevision,
          bytes: row.pendingBytes,
          name: row.pendingName,
          kind: row.pendingKind,
          itemUpdatedAt: row.pendingItemUpdatedAt,
          thumb: row.pendingThumb,
          parts: sanitizeParts(row.pendingParts),
        }
      : null,
  lastReservedRevision: row.lastReservedRevision,
  storageRef: row.storageRef,
  parts: sanitizeParts(row.parts),
  deletedAt: row.deletedAt,
  createdAt: row.createdAt,
})

/**
 * O JSONB vem de nós mesmos, mas o tipo é defensivo: só `{hash, bytes, rev}` válidos passam.
 * Uma entrada sem `rev` (não deveria existir) é descartada: a parte vira "faltante" e o
 * cliente a sobe de novo — o lado seguro.
 */
function sanitizeParts(raw: unknown): CreationPartRef[] {
  if (!Array.isArray(raw)) return []
  const out: CreationPartRef[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const { hash, bytes, rev } = entry as { hash?: unknown; bytes?: unknown; rev?: unknown }
    if (typeof hash !== 'string' || typeof bytes !== 'number') continue
    if (typeof rev !== 'number' || !Number.isInteger(rev) || rev < 1) continue
    out.push({ hash, bytes, rev })
  }
  return out
}

/** As mesmas três condições em toda query: o dono é sempre parte da chave. */
const whereItem = (userId: string, tool: CreationTool, itemId: string) =>
  and(eq(creations.userId, userId), eq(creations.tool, tool), eq(creations.itemId, itemId))

/** Só o que já COMMITOU alguma vez e está vivo: reserva sem upload não é uma criação guardada. */
const whereAliveCommitted = () => and(isNull(creations.deletedAt), isNotNull(creations.storageRef))

/**
 * Índice das criações "guardadas na conta". Toda operação é keyada por
 * (user_id, tool, item_id) — a unique — então o dono é sempre parte da chave e um
 * perfil nunca alcança a linha de outro.
 */
export class DrizzleCreationsRepository implements CreationsRepository {
  constructor(private readonly db: Database) {}

  async list(userId: string, tool: CreationTool): Promise<CreationSummary[]> {
    // Só as colunas do resumo público: nada de `pending_*`/`storage_ref`/ids internos — e o
    // `thumb` pendente (TOAST) não atravessa o banco à toa a cada carga de galeria.
    const rows = await this.db
      .select({
        tool: creations.tool,
        itemId: creations.itemId,
        name: creations.name,
        kind: creations.kind,
        itemUpdatedAt: creations.itemUpdatedAt,
        revision: creations.revision,
        bytes: creations.bytes,
        thumb: creations.thumb,
        syncedAt: creations.syncedAt,
      })
      .from(creations)
      .where(and(eq(creations.userId, userId), eq(creations.tool, tool), whereAliveCommitted()))
      .orderBy(desc(creations.itemUpdatedAt))
    return rows.map((row) => ({ ...row }))
  }

  async get(userId: string, tool: CreationTool, itemId: string): Promise<CreationRecord | null> {
    const [row] = await this.db
      .select()
      .from(creations)
      .where(whereItem(userId, tool, itemId))
      .limit(1)
    return row ? toRecord(row) : null
  }

  async usage(userId: string): Promise<CreationUsage> {
    return usageWith(this.db, userId)
  }

  async reserveUpload(input: CreationUploadInput): Promise<CreationUploadReservation> {
    return this.db.transaction(async (tx) => {
      // A quota é por PERFIL. Serializa a fotografia preliminar da reserva com os
      // commits do mesmo perfil; o commit volta a conferir porque o PUT acontece
      // fora desta transação.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`creation-quota:${input.userId}`}, 0))`,
      )
      const [deletionFence] = await tx
        .select({ accountId: accountDeletionFences.accountId })
        .from(accountDeletionFences)
        .where(eq(accountDeletionFences.accountId, input.accountId))
        .limit(1)
      if (deletionFence) return { ok: false, reason: 'account-deleting' as const }
      // Lock por CHAVE (não por linha): a primeira reserva de um item novo não tem linha
      // para o `FOR UPDATE` segurar, e duas abas reconciliando o mesmo item só-local
      // batiam na unique com 500. Mesmo idioma do studio-submission.repository.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`creation:${input.userId}:${input.tool}:${input.itemId}`}, 0))`,
      )
      const [existing] = await tx
        .select({
          revision: creations.revision,
          lastReservedRevision: creations.lastReservedRevision,
          bytes: creations.bytes,
          storageRef: creations.storageRef,
          kind: creations.kind,
          parts: creations.parts,
          deletedAt: creations.deletedAt,
        })
        .from(creations)
        .where(whereItem(input.userId, input.tool, input.itemId))
        .limit(1)
        .for('update')

      const nextIdentity = classifyPintaPaletteLibraryCreation(input)
      if (nextIdentity === 'invalid-partial') {
        return { ok: false, reason: 'palette-library-identity' }
      }
      const currentIdentity = existing
        ? classifyPintaPaletteLibraryCreation({
            tool: input.tool,
            itemId: input.itemId,
            kind: existing.kind,
          })
        : null
      if (
        existing &&
        currentIdentity !== nextIdentity &&
        (currentIdentity === 'palette-library' || nextIdentity === 'palette-library')
      ) {
        return { ok: false, reason: 'palette-library-identity' }
      }

      const alive = existing !== undefined && existing.deletedAt === null
      // PARTES: quais o item já tem (revisão corrente, viva e confirmada) e quais faltam. As
      // conhecidas levam os bytes do servidor; as faltantes precisam vir com `bytes` (senão
      // o cliente volta com eles — nada reservado até lá).
      const committedParts = new Map<string, CreationPartRef>(
        alive && existing.storageRef
          ? sanitizeParts(existing.parts).map((part) => [part.hash, part] as const)
          : [],
      )
      // A revisão desta reserva (1 para linha nova; o contador NUNCA volta): é a chave no R2
      // do manifesto e das partes que subirem agora.
      const revision = existing ? existing.lastReservedRevision + 1 : 1
      const resolved = resolveParts(input.parts ?? [], committedParts, revision)
      if (resolved.unsized.length > 0) {
        return { ok: false, reason: 'parts-need-bytes', hashes: resolved.unsized }
      }
      const totalBytes = input.bytes + resolved.all.reduce((sum, part) => sum + part.bytes, 0)
      if (totalBytes > input.limits.maxItemBytes) return { ok: false, reason: 'item-bytes' }

      // Quota DENTRO da transação (atômica com o lock): o total do perfil TROCA os bytes
      // correntes deste item pelos novos (reenviar 20 MB por 20 MB não gasta 40).
      const usage = await usageWith(tx, input.userId)
      const currentBytes = alive && existing.storageRef ? existing.bytes : 0
      if (usage.totalBytes - currentBytes + totalBytes > input.limits.maxTotalBytes) {
        return { ok: false, reason: 'total-bytes' }
      }
      const committedAlive = alive && existing.storageRef !== null
      // Projeta a contribuição desta linha: atualização comum troca 1 por 1;
      // biblioteca troca 0 por 0; item novo soma conforme a identidade exata.
      const currentItemCount =
        committedAlive &&
        !isPintaPaletteLibraryCreation({
          tool: input.tool,
          itemId: input.itemId,
          kind: existing.kind,
        })
          ? 1
          : 0
      const nextItemCount = nextIdentity === 'palette-library' ? 0 : 1
      if (
        usage.countByTool[input.tool] - currentItemCount + nextItemCount >
        input.limits.maxItemsPerTool
      ) {
        return { ok: false, reason: 'items-per-tool' }
      }
      // Base vencida: o aparelho conhece a revisão N, mas a corrente é outra (alguém subiu
      // depois). Só para linhas VIVAS — uma linha apagada (ou inexistente) pode ser
      // ressuscitada por qualquer base: nada vivo é sobrescrito, a edição posterior vence
      // a lixeira e o outro aparelho baixa de volta.
      if (input.baseRevision !== undefined && alive && input.baseRevision !== existing.revision) {
        return { ok: false, reason: 'stale-base', currentRevision: existing.revision }
      }

      const pending = {
        pendingRevision: 0,
        pendingBytes: totalBytes,
        pendingName: input.name,
        pendingKind: input.kind,
        pendingItemUpdatedAt: input.itemUpdatedAt,
        pendingThumb: input.thumb,
        pendingParts: resolved.all,
      }
      if (!existing) {
        // Linha nova: as colunas "vivas" recebem os mesmos valores só porque são NOT NULL —
        // a lista não a mostra (sem `storage_ref`) até o primeiro commit.
        await tx.insert(creations).values({
          id: randomUUID(),
          userId: input.userId,
          accountId: input.accountId,
          tool: input.tool,
          itemId: input.itemId,
          name: input.name,
          kind: input.kind,
          itemUpdatedAt: input.itemUpdatedAt,
          revision: 0,
          lastReservedRevision: 1,
          ...pending,
          pendingRevision: 1,
          bytes: 0,
          storageRef: null,
          thumb: null,
          parts: [],
          deletedAt: null,
          createdAt: input.now,
          syncedAt: input.now,
        })
        return { ok: true, revision: 1, missingParts: resolved.missing }
      }
      // Contador que NUNCA volta: mesmo com uma reserva em voo (ou depois de apagar e
      // ressuscitar), a próxima ganha número — e chave no R2 — novos.
      await tx
        .update(creations)
        .set({ ...pending, pendingRevision: revision, lastReservedRevision: revision })
        .where(whereItem(input.userId, input.tool, input.itemId))
      return { ok: true, revision, missingParts: resolved.missing }
    })
  }

  async commit(input: {
    userId: string
    tool: CreationTool
    itemId: string
    revision: number
    storageRef: string
    uploadedParts?: readonly string[]
    now: Date
    limits: CreationUploadInput['limits']
  }): Promise<CreationCommitResult> {
    return this.db.transaction(async (tx) => {
      // Dois itens diferentes podem ter sido reservados antes de qualquer PUT. O
      // lock por PERFIL faz os commits entrarem um por vez e torna a quota final
      // atômica; confiar só na reserva permitiria confirmar todos os tickets.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`creation-quota:${input.userId}`}, 0))`,
      )
      const [row] = await tx
        .select()
        .from(creations)
        .where(whereItem(input.userId, input.tool, input.itemId))
        .limit(1)
        .for('update')
      if (!row) return { ok: false }
      // Retry de um 200 perdido: a revisão pedida JÁ é a corrente. Idempotente — MESMO com
      // outra reserva em voo (`pending_revision` de outra aba): dizer 409 aqui faria o BFF
      // tratar a revisão corrente como "recusada" e apagar o blob VIVO do R2.
      if (row.revision === input.revision && row.storageRef) {
        return { ok: true, alreadyCommitted: true, previousStorageRef: null, releasedPartRefs: [] }
      }
      // Só a revisão RESERVADA confirma: um upload velho (ou de outro navegador) não
      // pode virar corrente por cima de uma reserva mais nova.
      if (
        row.pendingRevision !== input.revision ||
        row.pendingBytes === null ||
        row.pendingName === null ||
        row.pendingKind === null ||
        row.pendingItemUpdatedAt === null
      ) {
        return { ok: false }
      }
      const usage = await usageWith(tx, input.userId)
      const committedAlive = row.deletedAt === null && row.storageRef !== null
      const currentBytes = committedAlive ? row.bytes : 0
      const overBytes =
        usage.totalBytes - currentBytes + row.pendingBytes > input.limits.maxTotalBytes
      const currentIdentity = classifyPintaPaletteLibraryCreation(row)
      const pendingIdentity = classifyPintaPaletteLibraryCreation({
        tool: row.tool,
        itemId: row.itemId,
        kind: row.pendingKind,
      })
      const invalidIdentity =
        pendingIdentity === 'invalid-partial' ||
        (currentIdentity !== pendingIdentity &&
          (currentIdentity === 'palette-library' || pendingIdentity === 'palette-library'))
      if (invalidIdentity) {
        await tx
          .update(creations)
          .set(clearPending())
          .where(whereItem(input.userId, input.tool, input.itemId))
        return { ok: false, reason: 'palette-library-identity' }
      }
      const currentItemCount = committedAlive && currentIdentity !== 'palette-library' ? 1 : 0
      const nextItemCount = pendingIdentity === 'palette-library' ? 0 : 1
      const overItems =
        usage.countByTool[input.tool] - currentItemCount + nextItemCount >
        input.limits.maxItemsPerTool
      if (overBytes || overItems) {
        // A reserva recusada por quota MORRE aqui: o BFF apaga o blob dela do R2, então
        // um `commit(N)` que chegasse depois de a criança abrir espaço promoveria uma chave
        // inexistente. Limpa o pendente — o cliente reserva de novo (revisão nova).
        await tx
          .update(creations)
          .set(clearPending())
          .where(whereItem(input.userId, input.tool, input.itemId))
        return { ok: false, reason: overBytes ? 'total-bytes' : 'items-per-tool' }
      }
      // PARTES: as que a reserva exigia e o item ainda não tinha precisam ter sido PUTadas
      // (o cliente confirma em `uploadedParts`; o BFF confere no R2 best-effort). A reserva
      // NÃO morre: um retry honesto pode passar.
      const committed = row.deletedAt === null && row.storageRef ? sanitizeParts(row.parts) : []
      const committedSet = new Set(committed.map((part) => part.hash))
      const pendingParts = sanitizeParts(row.pendingParts)
      const uploaded = new Set(input.uploadedParts ?? [])
      const missing = pendingParts
        .filter((part) => !committedSet.has(part.hash) && !uploaded.has(part.hash))
        .map((part) => part.hash)
      if (missing.length > 0) return { ok: false, reason: 'parts-missing', hashes: missing }
      await tx
        .update(creations)
        .set({
          revision: input.revision,
          storageRef: input.storageRef,
          bytes: row.pendingBytes,
          name: row.pendingName,
          kind: row.pendingKind,
          itemUpdatedAt: row.pendingItemUpdatedAt,
          thumb: row.pendingThumb,
          parts: pendingParts,
          ...clearPending(),
          // Item na lixeira que voltou a ser editado ressuscita — AGORA, com o blob no lugar.
          deletedAt: null,
          syncedAt: input.now,
        })
        .where(whereItem(input.userId, input.tool, input.itemId))
      const previous = row.storageRef && row.storageRef !== input.storageRef ? row.storageRef : null
      const nextSet = new Set(pendingParts.map((part) => part.hash))
      return {
        ok: true,
        alreadyCommitted: false,
        previousStorageRef: previous,
        releasedPartRefs: committed.filter((part) => !nextSet.has(part.hash)),
      }
    })
  }

  async softDelete(
    userId: string,
    tool: CreationTool,
    itemId: string,
    now: Date,
  ): Promise<{
    deleted: boolean
    storageRef: string | null
    partRefs: CreationPartRef[]
    revision: number
  }> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select({
          storageRef: creations.storageRef,
          parts: creations.parts,
          revision: creations.revision,
          deletedAt: creations.deletedAt,
        })
        .from(creations)
        .where(whereItem(userId, tool, itemId))
        .limit(1)
        .for('update')
      if (!row) return { deleted: false, storageRef: null, partRefs: [], revision: 0 }
      if (row.deletedAt !== null) {
        return { deleted: false, storageRef: null, partRefs: [], revision: row.revision }
      }
      await tx
        .update(creations)
        .set({
          deletedAt: now,
          // Cancela a reserva em voo (o commit dela cai em 409); o contador NÃO volta.
          ...clearPending(),
          // O blob (e as partes) saem da linha — e do R2, pelo BFF: apagado não ocupa espaço
          // fora da quota.
          storageRef: null,
          parts: [],
          bytes: 0,
          syncedAt: now,
        })
        .where(whereItem(userId, tool, itemId))
      return {
        deleted: true,
        storageRef: row.storageRef,
        partRefs: sanitizeParts(row.parts),
        revision: row.revision,
      }
    })
  }
}

/**
 * Resolve as partes pedidas contra as que o item já tem: as conhecidas levam os bytes do
 * servidor (o declarado é ignorado); as faltantes precisam de `bytes` declarados.
 * Hashes repetidos contam uma vez.
 */
export function resolveParts(
  requested: ReadonlyArray<{ hash: string; bytes?: number }>,
  committed: ReadonlyMap<string, CreationPartRef>,
  revision: number,
): { all: CreationPartRef[]; missing: CreationPartRef[]; unsized: string[] } {
  const all: CreationPartRef[] = []
  const missing: CreationPartRef[] = []
  const unsized: string[] = []
  const seen = new Set<string>()
  for (const part of requested) {
    if (seen.has(part.hash)) continue
    seen.add(part.hash)
    const known = committed.get(part.hash)
    if (known !== undefined) {
      // Conhecida: bytes e CHAVE (rev) são os do servidor — o declarado é ignorado.
      all.push({ hash: part.hash, bytes: known.bytes, rev: known.rev })
      continue
    }
    if (part.bytes === undefined) {
      unsized.push(part.hash)
      continue
    }
    // Faltante: sobe nesta reserva, com a chave desta revisão.
    all.push({ hash: part.hash, bytes: part.bytes, rev: revision })
    missing.push({ hash: part.hash, bytes: part.bytes, rev: revision })
  }
  return { all, missing, unsized }
}

/** Zera a reserva em voo (a lixeira e a recusa por quota no commit fazem isso). */
function clearPending() {
  return {
    pendingParts: null,
    pendingRevision: null,
    pendingBytes: null,
    pendingName: null,
    pendingKind: null,
    pendingItemUpdatedAt: null,
    pendingThumb: null,
  }
}

/**
 * Uso do perfil: só itens vivos e JÁ CONFIRMADOS (reserva sem upload não ocupa vaga nem byte).
 * A biblioteca de paletas do Pinta (kind `palette-library`, item especial do canal) fica FORA da
 * CONTAGEM de itens — não é desenho e não pode ocupar vaga do teto por ferramenta (alinha com o
 * cartão do admin em tool-usage.repository). Os BYTES dela CONTAM: `totalBytes` é o retrato do
 * que ocupa o R2, e a aritmética `totalBytes - currentBytes + novos` assume a própria linha
 * dentro do total.
 */
async function usageWith(db: Pick<Database, 'select'>, userId: string): Promise<CreationUsage> {
  const rows = await db
    .select({
      tool: creations.tool,
      count: sql<number>`count(*) filter (where not (
        ${creations.tool} = ${PALETTE_LIBRARY_TOOL}
        and ${creations.itemId} = ${PALETTE_LIBRARY_ITEM_ID}
        and ${creations.kind} = ${PALETTE_LIBRARY_KIND}
      ))::int`,
      bytes: sql<number>`coalesce(sum(${creations.bytes}), 0)::bigint`,
    })
    .from(creations)
    .where(and(eq(creations.userId, userId), whereAliveCommitted()))
    .groupBy(creations.tool)
  const countByTool: Record<CreationTool, number> = { studio: 0, pinta: 0 }
  let totalBytes = 0
  for (const row of rows) {
    countByTool[row.tool] = Number(row.count)
    totalBytes += Number(row.bytes)
  }
  return { totalBytes, countByTool }
}
