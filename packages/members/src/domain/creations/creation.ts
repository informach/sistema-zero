/**
 * "Guardado na sua conta" (18/08/2026): as CRIAÇÕES dos editores livres — os jogos
 * do Estúdio Completo e os desenhos do Pinta — que o navegador sobe sozinho depois
 * do autosave, para voltarem sozinhos em outro computador (ou se o navegador
 * apagar). O `members` guarda só o ÍNDICE (metadados + quota); o blob comprimido
 * vive no R2 UGC privado, assinado pelo BFF (member-shell). Espelho do desenho dos
 * anexos do hub: registra → assina → o navegador envia → confirma.
 *
 * ⚠️ Regra de ouro do índice: NADA do que a lista mostra (nome, kind, `item_updated_at`,
 * thumb, `deleted_at`) muda na RESERVA — só no COMMIT, quando o blob já está no R2. A
 * reserva guarda tudo em `pending_*` e o commit promove. Sem isso, um PUT que não termina
 * deixava o índice apontando metadados novos para o blob velho, e o reconciliador da criança
 * perdia a referência do último estado confirmado.
 */
export const CREATION_TOOLS = ['studio', 'pinta'] as const
export type CreationTool = (typeof CREATION_TOOLS)[number]

export function isCreationTool(value: unknown): value is CreationTool {
  return typeof value === 'string' && (CREATION_TOOLS as readonly string[]).includes(value)
}

/**
 * Posse exigida por ferramenta (as mesmas refs do catálogo que gateiam as páginas
 * `/estudio` e `/pinta` do kids e o gate de produto do Pensa).
 */
export const CREATION_ACCESS_REF: Readonly<Record<CreationTool, string>> = {
  studio: 'estudio-completo',
  pinta: 'pinta',
}

/**
 * Tetos. Por ITEM: um projeto do Estúdio chega a 33 M chars de assets (a maior
 * parte já é base64, que o gzip pouco encolhe) — 40 MB comprimidos cobre com folga
 * e barra o absurdo. Por PERFIL: 1 GB somando as duas ferramentas (decisão dela,
 * 18/08/2026: o R2 custa ~US$ 0,015 por GB-mês e o download é grátis, então o teto de
 * bytes é freio contra abuso e bug, não decisão de custo — 1 GB faz o aviso "sem
 * espaço" virar raridade). Itens vivos por ferramenta: 2000 — nem a galeria do Pinta
 * nem a lista do Estúdio têm teto de quantidade, então este número é só o freio de
 * abuso; o teto que governa é o de bytes.
 */
export const CREATION_LIMITS = {
  maxItemBytes: 40 * 1024 * 1024,
  maxTotalBytes: 1024 * 1024 * 1024,
  maxItemsPerTool: 2000,
  maxNameChars: 120,
  maxKindChars: 40,
  maxItemIdChars: 64,
  /** A miniatura é opcional e PEQUENA (PNG data URL); acima disso é descartada, não recusada. */
  maxThumbChars: 12_000,
  /** Partes por item (= `PROJECT_ASSET_LIMITS.maxAssetsCount` do Estúdio: uma parte por asset). */
  maxPartsPerItem: 128,
} as const

/**
 * PARTES (revisão de desempenho, 19/08/2026): um item pode ser um MANIFESTO (o blob
 * principal da revisão: o programa, KB) + 0..N partes endereçadas por CONTEÚDO (SHA-256 hex
 * do JSON canônico de cada asset do Estúdio), cada uma um objeto próprio no R2
 * (`creationPartStorageKey`). O autosave sobe só o manifesto; uma parte só sobe quando o
 * item ainda não a tem (a reserva responde quais FALTAM). O Pinta não usa partes (0).
 */
export interface CreationPartRef {
  hash: string
  /** Bytes COMPRIMIDOS da parte no R2 (contam na quota do item junto com o manifesto). */
  bytes: number
  /**
   * A revisão (da reserva) em que ESTA cópia da parte subiu: entra na chave do R2
   * (`…/parts/<hash>.<rev>.gz`). Uma parte conhecida mantém a sua; uma que volta depois de
   * solta sobe com chave NOVA — o apagar best-effort da antiga (que roda depois da resposta,
   * e pode atrasar) nunca alcança o objeto novo.
   */
  rev: number
}

export const CREATION_PART_HASH_PATTERN = /^[a-f0-9]{64}$/

export function isCreationPartHash(value: unknown): value is string {
  return typeof value === 'string' && CREATION_PART_HASH_PATTERN.test(value)
}

/** Uma criação do índice, do jeito que a lista devolve (sem o blob). */
export interface CreationSummary {
  tool: CreationTool
  itemId: string
  name: string
  kind: string
  /** `updatedAt` do item, no relógio do editor; comparado à marca confirmada deste aparelho. */
  itemUpdatedAt: Date
  revision: number
  bytes: number
  thumb: string | null
  syncedAt: Date
}

/** O que a reserva guarda até o commit (a lista NÃO vê nada disto). */
export interface CreationPendingUpload {
  revision: number
  /** TOTAL reservado: manifesto + Σ partes referenciadas. */
  bytes: number
  name: string
  kind: string
  itemUpdatedAt: Date
  thumb: string | null
  /** As partes que a revisão reservada referencia (todas, faltantes ou não). */
  parts: CreationPartRef[]
}

/** A linha completa (o repositório e os serviços). */
export interface CreationRecord extends CreationSummary {
  id: string
  userId: string
  accountId: string
  /** Reserva em voo (`null` = nada reservado). A chave já foi assinada. */
  pending: CreationPendingUpload | null
  /** Maior revisão JÁ RESERVADA (monotônica, nunca volta): cada reserva ganha chave nova no R2. */
  lastReservedRevision: number
  storageRef: string | null
  /** As partes da revisão CORRENTE (vazio = blob único, ou legado). */
  parts: CreationPartRef[]
  deletedAt: Date | null
  createdAt: Date
}

/**
 * Só os campos públicos — o que sai pelas rotas. `CreationRecord` estende o resumo,
 * então devolver o registro "como resumo" vazaria `userId`, `accountId`, `storageRef`…
 */
export function toCreationSummary(record: CreationSummary): CreationSummary {
  return {
    tool: record.tool,
    itemId: record.itemId,
    name: record.name,
    kind: record.kind,
    itemUpdatedAt: record.itemUpdatedAt,
    revision: record.revision,
    bytes: record.bytes,
    thumb: record.thumb,
    syncedAt: record.syncedAt,
  }
}

/**
 * As chaves dos objetos no R2 vivem em `@sistemazero/core/creations` — a MESMA definição que o
 * BFF (`member-shell`) usa para conferir as partes no commit; re-exportadas aqui para os
 * chamadores do domínio. Blob por revisão (contador que nunca volta: duas reservas nunca
 * dividem chave); parte por item + hash + revisão de subida (uma chave nunca é reutilizada —
 * ver `CreationPartRef.rev`).
 */
export { creationPartStorageKey, creationStorageKey } from '@sistemazero/core/creations'
