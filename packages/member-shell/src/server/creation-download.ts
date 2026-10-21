import 'server-only'
import type { CreationDownloadTicketView, CreationDownloadUrlView } from '../lib/types'
import type { r2PresignGetUgc } from './r2'

/** O blob comprimido (gzip do JSON). O `Content-Type` é ASSINADO no PUT: o navegador manda igual. */
export const CREATION_BLOB_CONTENT_TYPE = 'application/gzip'
/** TTL do GET do manifesto (5 min). */
export const CREATION_GET_TTL_SECONDS = 300
/** As partes de um projeto grande (até 33 MB) numa conexão lenta: 10 min. */
export const CREATION_PARTS_GET_TTL_SECONDS = 600

/**
 * Assina a descida de uma criação a partir do bilhete do members (`storageKey`, revisão, partes).
 * Uma régua só para o "Guardado na sua conta" (`creationsDownloadUrl`) e para o "Trazer da
 * equipe" do Pensa (`team-art/:missionId/:slotId/download`): mesma chave de conteúdo e TTLs. Só
 * se chama DEPOIS de o members autorizar (o bilhete é a autorização).
 */
export async function signCreationDownload(
  presignGet: typeof r2PresignGetUgc,
  ticket: CreationDownloadTicketView,
): Promise<CreationDownloadUrlView> {
  const downloadUrl = await presignGet(ticket.storageKey, {
    expiresInSeconds: CREATION_GET_TTL_SECONDS,
    responseContentType: CREATION_BLOB_CONTENT_TYPE,
  })
  // Um GET assinado por PARTE (o cliente baixa só as que não tem localmente). TTL maior:
  // 33 MB de partes numa conexão de 1 Mbps levam minutos.
  const parts = await Promise.all(
    (ticket.parts ?? []).map(async (part) => ({
      hash: part.hash,
      bytes: part.bytes,
      url: await presignGet(part.storageKey, {
        expiresInSeconds: CREATION_PARTS_GET_TTL_SECONDS,
        responseContentType: CREATION_BLOB_CONTENT_TYPE,
      }),
    })),
  )
  return {
    downloadUrl,
    revision: ticket.revision,
    bytes: ticket.bytes,
    item: ticket.summary,
    parts,
    // O relógio do servidor agora: corrige o do aparelho quando o rascunho da aula decide
    // qual versão é a mais nova (a da conta tem `syncedAt` do servidor).
    serverNow: new Date().toISOString(),
  }
}
