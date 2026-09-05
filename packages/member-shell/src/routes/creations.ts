import 'server-only'
import { creationPartStorageKey, creationStorageKey } from '@sistemazero/core/creations'
import { after, NextResponse } from 'next/server'
import { z } from 'zod'
import { isReadonlyImpersonation } from '../lib/act'
import type { MembersClient } from '../server/clients'
import { mediaErrorResponse } from '../server/media'
import {
  r2DeleteObjectsUgc,
  r2DeleteObjectUgc,
  r2HeadObjectUgc,
  r2PresignGetUgc,
  r2PresignPutUgc,
} from '../server/r2'
import type { SessionModule } from '../server/session'

export type CreationsRoutes = ReturnType<typeof createCreationsRoutes>

interface CreationsStorage {
  presignPut: typeof r2PresignPutUgc
  presignGet: typeof r2PresignGetUgc
  deleteObject: typeof r2DeleteObjectUgc
  /** Opcionais (PARTES): apagar em lote e conferir existência antes do commit. */
  deleteObjects?: typeof r2DeleteObjectsUgc
  headObject?: typeof r2HeadObjectUgc
}

/** O blob comprimido (gzip do JSON). O `Content-Type` é ASSINADO no PUT: o navegador manda igual. */
export const CREATION_BLOB_CONTENT_TYPE = 'application/gzip'
/** TTL curto das URLs (o upload de 40 MB numa conexão ruim cabe em 10 min; o GET em 5). */
const PUT_TTL_SECONDS = 600
const GET_TTL_SECONDS = 300
/** As partes de um projeto grande (até 33 MB) numa conexão lenta: 10 min. */
const PARTS_GET_TTL_SECONDS = 600
/**
 * Tetos do members (`CREATION_LIMITS`). Nome e kind são CORTADOS aqui, não recusados: o
 * Estúdio aceita nomes de até 200 caracteres, e recusar com 400 deixava o jogo sem
 * subir para sempre (o 4xx sai da fila do cliente). A miniatura grande é descartada.
 */
const MAX_NAME_CHARS = 120
const MAX_KIND_CHARS = 40
const MAX_THUMB_CHARS = 12_000
const MAX_ITEM_BYTES = 40 * 1024 * 1024
/** Partes por item (= assets por projeto do Estúdio). */
const MAX_PARTS = 128
/** HEADs em paralelo no commit (conferência best-effort das partes enviadas). */
const HEAD_CONCURRENCY = 8
const PartHash = z.string().regex(/^[a-f0-9]{64}$/)

/** Espelho de `CREATION_TOOLS` do members (`molda` = a oficina 3D, 04/09/2026). */
const Tool = z.enum(['studio', 'pinta', 'molda'])
type ToolName = z.infer<typeof Tool>
/** Charset seguro: vira segmento da chave no R2 (nunca `/`, `:`, `..`). */
const ItemId = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/)
const UploadBody = z.strictObject({
  // Corte por CARACTERE (não por UTF-16): um emoji na borda não vira meio par substituto.
  name: z
    .string()
    .trim()
    .min(1)
    .transform((s) => Array.from(s).slice(0, MAX_NAME_CHARS).join('')),
  kind: z
    .string()
    .trim()
    .min(1)
    .transform((s) => Array.from(s).slice(0, MAX_KIND_CHARS).join('')),
  itemUpdatedAt: z.iso.datetime(),
  bytes: z.number().int().min(1),
  thumb: z
    .string()
    .nullable()
    .optional()
    .transform((t) =>
      typeof t === 'string' && t.length > 0 && t.length <= MAX_THUMB_CHARS ? t : null,
    ),
  /** A revisão que o aparelho conhece (0 = nova); o members recusa base vencida com 409. */
  baseRevision: z.number().int().min(0).optional(),
  /**
   * PARTES (assets do Estúdio por conteúdo): `bytes` só para as que o item ainda não tem; o
   * members responde quais faltam (o BFF assina um PUT para cada uma).
   */
  parts: z
    .array(
      z.strictObject({
        hash: PartHash,
        bytes: z.number().int().min(1).max(MAX_ITEM_BYTES).optional(),
      }),
    )
    .max(MAX_PARTS)
    .optional(),
})
/**
 * Só a revisão: bytes e metadados são os da RESERVA (o que foi conferido e assinado).
 * `uploadedParts` = hashes das partes que o cliente PUTou (as faltantes da reserva).
 */
const CommitBody = z.strictObject({
  revision: z.number().int().min(1),
  uploadedParts: z.array(PartHash).max(MAX_PARTS).optional(),
})
const DeleteBody = z.strictObject({
  baseRevision: z.number().int().min(0),
})
const ListQuery = z.strictObject({
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

const invalid = () =>
  NextResponse.json(
    { error: { code: 'VALIDATION_ERROR', message: 'Entrada inválida' } },
    { status: 400 },
  )
/**
 * Repassa a resposta do members. Um 200 SEM corpo (não deveria acontecer) vira 502 em vez
 * de `{ok:true}`: o cliente lê campos desse corpo, e um `{ok:true}` no lugar de um ticket
 * virava `fetch(undefined)` → "sem internet" eterno no selo.
 */
const response = (status: number, body: unknown) =>
  body === undefined || body === null
    ? NextResponse.json(
        { error: { code: 'UPSTREAM_EMPTY', message: 'Resposta vazia do serviço' } },
        { status: status === 200 ? 502 : status },
      )
    : NextResponse.json(body, { status })

function responseErrorCode(body: unknown): string | null {
  if (!body || typeof body !== 'object' || !('error' in body)) return null
  const error = body.error
  if (!error || typeof error !== 'object' || !('code' in error)) return null
  return typeof error.code === 'string' ? error.code : null
}

type ItemCtx = { params: Promise<{ tool: string; itemId: string }> }
type ToolCtx = { params: Promise<{ tool: string }> }

/**
 * BFF do "Guardado na sua conta" (18/08/2026): as criações do Estúdio Completo e do
 * Pinta que o navegador sobe sozinho. O members guarda o ÍNDICE; aqui só se assina o
 * R2 UGC (privado) para o blob ir/vir DIRETO navegador↔R2 — o mesmo desenho dos
 * anexos do hub, e o que deixa um jogo de 40 MB fora do teto de 2 MB da borda.
 *
 * `reserve` → members (posse + quota + revisão) → `r2PresignPutUgc` na chave da
 * revisão, com Content-Length e Content-Type ASSINADOS (o navegador não sobe mais
 * bytes nem outro tipo do que foi autorizado) → o cliente PUTa → `commit` (o members
 * promove a reserva e devolve a chave da revisão ANTERIOR, que este BFF apaga do R2
 * best-effort — o bucket não cresce a cada autosave).
 */
/**
 * Limpeza de blob FORA do caminho crítico da resposta (revisão de desempenho, 19/08/2026):
 * o `DELETE` no R2 da revisão anterior somava 30–100 ms a CADA salvamento da criança, só
 * para liberar espaço. Com `after()` do Next a resposta sai primeiro e a ida ao R2 roda
 * depois, na mesma instância; fora de um request do Next (testes, outro host) vira
 * fire-and-forget. Best-effort como sempre: falha vira `console.warn`, nunca erro.
 */
/**
 * DEPOIS da resposta: dentro de uma request do Next, `after()`; fora dele (testes, scripts) o
 * `after` lança e o fallback roda em seguida sem segurar a resposta. Injetável (`deps.defer`)
 * para os testes provarem a ordem "responde, depois apaga".
 */
function deferWithNextAfter(task: () => Promise<void>): void {
  const run = () => task().catch(() => undefined)
  try {
    after(run)
  } catch {
    void run()
  }
}

export function createCreationsRoutes(deps: {
  members: MembersClient
  session: SessionModule
  storage?: CreationsStorage
  /** Só testes: onde o apagar no R2 é agendado (default: `after()` do Next, com fallback). */
  defer?: (task: () => Promise<void>) => void
}) {
  const deferCleanup = deps.defer ?? deferWithNextAfter
  const storage: CreationsStorage = deps.storage ?? {
    presignPut: r2PresignPutUgc,
    presignGet: r2PresignGetUgc,
    deleteObject: r2DeleteObjectUgc,
    deleteObjects: r2DeleteObjectsUgc,
    headObject: r2HeadObjectUgc,
  }
  const { members, session } = deps
  const deleteQuietly = (key: string, what: string) =>
    deferCleanup(async () => {
      try {
        await storage.deleteObject(key)
      } catch (error) {
        console.warn(`[creations] não apagou ${what} no R2`, { key, error })
      }
    })
  /** Vários objetos soltos de uma vez (manifesto anterior + partes), best-effort e depois da resposta. */
  const deleteManyQuietly = (keys: readonly string[], what: string) => {
    if (keys.length === 0) return
    deferCleanup(async () => {
      try {
        if (storage.deleteObjects) await storage.deleteObjects(keys)
        else for (const key of keys) await storage.deleteObject(key)
      } catch (error) {
        console.warn(`[creations] não apagou ${what} no R2`, { keys, error })
      }
    })
  }

  /**
   * O cliente manda em `x-sz-viewer` o perfil que enfileirou a chamada. Se a sessão
   * já é de OUTRO perfil (irmão que entrou enquanto um upload/descida ainda estava
   * em voo), recusa: nem o jogo do irmão A entra no índice do B, nem a lista do B
   * desce para o IndexedDB do A. Sem o header (cliente antigo/outro), passa.
   */
  async function requireViewerMatch(req: Request): Promise<NextResponse | null> {
    const claimed = req.headers.get('x-sz-viewer')
    if (!claimed) return null
    const user = await session.getSession()
    // Sem sessão não é "trocou de perfil": deixa seguir e o gateway responde 401 (refresh).
    if (!user) return null
    if (user.id !== claimed) {
      return NextResponse.json(
        { error: { code: 'VIEWER_MISMATCH', message: 'A sessão trocou de perfil.' } },
        { status: 409 },
      )
    }
    return null
  }

  /** Sessão de suporte (impersonação) é só leitura: reservar/confirmar/apagar recusam. */
  async function requireWritableSession(req: Request): Promise<NextResponse | null> {
    const mismatch = await requireViewerMatch(req)
    if (mismatch) return mismatch
    const user = await session.getSession()
    if (isReadonlyImpersonation(user)) {
      return NextResponse.json(
        { error: { code: 'IMPERSONATION_READONLY', message: 'Sessão de suporte é só leitura.' } },
        { status: 403 },
      )
    }
    return null
  }

  async function parseItem(ctx: ItemCtx): Promise<{ tool: ToolName; itemId: string } | null> {
    const raw = await ctx.params
    const tool = Tool.safeParse(raw.tool)
    const itemId = ItemId.safeParse(raw.itemId)
    if (!tool.success || !itemId.success) return null
    return { tool: tool.data, itemId: itemId.data }
  }

  const creationsList = {
    GET: async (req: Request, ctx: ToolCtx) => {
      const mismatch = await requireViewerMatch(req)
      if (mismatch) return mismatch
      const tool = Tool.safeParse((await ctx.params).tool)
      if (!tool.success) return invalid()
      const parsed = ListQuery.safeParse(Object.fromEntries(new URL(req.url).searchParams))
      if (!parsed.success) return invalid()
      const { status, body } = await members.listCreations(tool.data, parsed.data)
      return response(status, body)
    },
  }

  const creationsUploadUrl = {
    POST: async (req: Request, ctx: ItemCtx) => {
      const readonly = await requireWritableSession(req)
      if (readonly) return readonly
      const item = await parseItem(ctx)
      if (!item) return invalid()
      const parsed = UploadBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return invalid()
      // Acima do teto por item (manifesto + partes declaradas): a MESMA resposta que o members
      // daria (409 de quota, com o "grande demais"), para o selo dizer a verdade — um 400
      // genérico virava "vou tentar de novo" para uma condição permanente, repetida a cada
      // autosave. (As partes JÁ conhecidas pelo servidor são conferidas lá, com os bytes dele.)
      const declaredParts = (parsed.data.parts ?? []).reduce((sum, p) => sum + (p.bytes ?? 0), 0)
      if (parsed.data.bytes + declaredParts > MAX_ITEM_BYTES) {
        return NextResponse.json(
          {
            error: {
              code: 'CREATION_QUOTA_EXCEEDED',
              message: 'Esse jogo ou desenho é grande demais para ser guardado na conta',
            },
          },
          { status: 409 },
        )
      }
      const reserved = await members.reserveCreationUpload(item.tool, item.itemId, parsed.data)
      if (reserved.status !== 200 || !reserved.body) return response(reserved.status, reserved.body)
      // Partes declaradas mas o members não devolveu a lista das faltantes (members ANTERIOR ao
      // protocolo, numa janela de deploy/rollback — o DTO dele descarta campos desconhecidos em
      // silêncio): sem essa lista o cliente subiria só o manifesto e o índice apontaria para
      // partes inexistentes. Resposta RETENTÁVEL (5xx), nunca um ticket mentiroso.
      if ((parsed.data.parts?.length ?? 0) > 0 && !Array.isArray(reserved.body.parts)) {
        return NextResponse.json(
          {
            error: {
              code: 'UPSTREAM_INCOMPATIBLE',
              message: 'O serviço de criações ainda não aceita partes',
            },
          },
          { status: 503 },
        )
      }
      try {
        const uploadUrl = await storage.presignPut({
          key: reserved.body.storageKey,
          contentType: CREATION_BLOB_CONTENT_TYPE,
          contentLength: reserved.body.bytes,
          expiresInSeconds: PUT_TTL_SECONDS,
        })
        // Um PUT assinado por PARTE faltante (Content-Length da parte): N+1 HMACs locais.
        const parts = await Promise.all(
          (reserved.body.parts ?? []).map(async (part) => ({
            hash: part.hash,
            bytes: part.bytes,
            uploadUrl: await storage.presignPut({
              key: part.storageKey,
              contentType: CREATION_BLOB_CONTENT_TYPE,
              contentLength: part.bytes,
              expiresInSeconds: PUT_TTL_SECONDS,
            }),
          })),
        )
        return NextResponse.json({
          revision: reserved.body.revision,
          bytes: reserved.body.bytes,
          uploadUrl,
          method: 'PUT',
          headers: { 'content-type': CREATION_BLOB_CONTENT_TYPE },
          parts,
        })
      } catch (error) {
        return mediaErrorResponse(error)
      }
    },
  }

  const creationsCommit = {
    POST: async (req: Request, ctx: ItemCtx) => {
      const readonly = await requireWritableSession(req)
      if (readonly) return readonly
      const item = await parseItem(ctx)
      if (!item) return invalid()
      const parsed = CommitBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return invalid()
      // PARTES que o cliente diz ter enviado: HEAD best-effort no R2 ANTES do members — um 404
      // definitivo é bug de cliente (ou a corrida residual do GC) e vira 409 retriável, sem
      // promover uma revisão que aponta para partes inexistentes. Erro de HEAD ≠ 404 segue.
      const uploaded = parsed.data.uploadedParts ?? []
      if (uploaded.length > 0 && storage.headObject) {
        const user = await session.getSession()
        if (user) {
          const missing: string[] = []
          for (let i = 0; i < uploaded.length; i += HEAD_CONCURRENCY) {
            const slice = uploaded.slice(i, i + HEAD_CONCURRENCY)
            // A MESMA função do members (`@sistemazero/core/creations`): por item, por
            // conteúdo e pela revisão em que a parte subiu — as `uploadedParts` são as que
            // subiram NESTA reserva, logo com esta revisão.
            const results = await Promise.all(
              slice.map((hash) =>
                storage
                  .headObject?.(
                    creationPartStorageKey(
                      user.id,
                      item.tool,
                      item.itemId,
                      hash,
                      parsed.data.revision,
                    ),
                  )
                  .catch(() => null),
              ),
            )
            results.forEach((found, index) => {
              if (found === false) missing.push(slice[index] as string)
            })
          }
          if (missing.length > 0) {
            console.warn('[creations] commit com partes que não estão no R2', {
              itemId: item.itemId,
              missing,
            })
            return NextResponse.json(
              {
                error: {
                  code: 'CREATION_PART_MISSING',
                  message: 'Partes da revisão não foram enviadas; envie de novo',
                },
                details: { hashes: missing },
              },
              { status: 409 },
            )
          }
        }
      }
      const { status, body } = await members.commitCreationUpload(
        item.tool,
        item.itemId,
        parsed.data,
      )
      if (status === 200 && body) {
        // Best-effort e DEPOIS da resposta: o manifesto anterior e as partes que a revisão
        // nova não referencia mais já não são de ninguém. Se falhar, fica um objeto órfão no
        // bucket (custo), nunca um erro para a criança — e a criança não espera a ida ao R2.
        const released =
          body.releasedStorageKeys ?? (body.previousStorageKey ? [body.previousStorageKey] : [])
        deleteManyQuietly(released, 'a revisão anterior')
      } else if (
        status === 409 &&
        ['CREATION_QUOTA_EXCEEDED', 'CREATION_REVISION_MISMATCH'].includes(
          responseErrorCode(body) ?? '',
        )
      ) {
        // O PUT já aconteceu, mas o members confirmou que esta revisão não entrou
        // no índice. A chave é determinística e, portanto, pode ser removida sem
        // alcançar uma revisão corrente (retry de commit já devolve 200).
        const user = await session.getSession()
        if (user) {
          // Só o manifesto determinístico: as partes PUTadas nesta reserva podem estar
          // referenciadas por outra reserva em voo (o GC delas é do commit seguinte/purge).
          const rejectedStorageKey = creationStorageKey(
            user.id,
            item.tool,
            item.itemId,
            parsed.data.revision,
          )
          deleteQuietly(rejectedStorageKey, 'a revisão recusada')
        }
      }
      // O navegador só precisa do resumo; a chave anterior é assunto do BFF.
      return response(status, status === 200 && body ? { item: body.item } : body)
    },
  }

  const creationsDownloadUrl = {
    GET: async (req: Request, ctx: ItemCtx) => {
      const mismatch = await requireViewerMatch(req)
      if (mismatch) return mismatch
      const item = await parseItem(ctx)
      if (!item) return invalid()
      const ticket = await members.getCreationDownload(item.tool, item.itemId)
      if (ticket.status !== 200 || !ticket.body) return response(ticket.status, ticket.body)
      try {
        const downloadUrl = await storage.presignGet(ticket.body.storageKey, {
          expiresInSeconds: GET_TTL_SECONDS,
          responseContentType: CREATION_BLOB_CONTENT_TYPE,
        })
        // Um GET assinado por PARTE (o cliente baixa só as que não tem localmente). TTL maior:
        // 33 MB de partes numa conexão de 1 Mbps levam minutos.
        const parts = await Promise.all(
          (ticket.body.parts ?? []).map(async (part) => ({
            hash: part.hash,
            bytes: part.bytes,
            url: await storage.presignGet(part.storageKey, {
              expiresInSeconds: PARTS_GET_TTL_SECONDS,
              responseContentType: CREATION_BLOB_CONTENT_TYPE,
            }),
          })),
        )
        return NextResponse.json({
          downloadUrl,
          revision: ticket.body.revision,
          bytes: ticket.body.bytes,
          item: ticket.body.summary,
          parts,
        })
      } catch (error) {
        return mediaErrorResponse(error)
      }
    },
  }

  const creationsDelete = {
    DELETE: async (req: Request, ctx: ItemCtx) => {
      const readonly = await requireWritableSession(req)
      if (readonly) return readonly
      const item = await parseItem(ctx)
      if (!item) return invalid()
      const parsed = DeleteBody.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return invalid()
      const { status, body } = await members.deleteCreation(item.tool, item.itemId, parsed.data)
      if (status === 200 && body) {
        // A lixeira soltou o blob (e as partes): apaga do R2 (best-effort, depois da resposta).
        // Apagado não pode ficar fora da quota para sempre; a linha do índice fica para um
        // restauro futuro.
        const released = body.storageKeys ?? (body.storageKey ? [body.storageKey] : [])
        deleteManyQuietly(released, 'o blob da lixeira')
      }
      return response(
        status,
        status === 200 && body ? { deleted: body.deleted, revision: body.revision } : body,
      )
    },
  }

  return {
    creationsList,
    creationsUploadUrl,
    creationsCommit,
    creationsDownloadUrl,
    creationsDelete,
  }
}
