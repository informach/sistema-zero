import { Elysia } from 'elysia'
import type {
  CommitCreationUploadService,
  DeleteCreationService,
  GetCreationDownloadService,
  ListCreationsService,
  ReserveCreationUploadService,
} from '../../../application/creations/creations.service'
import { assertInternalCaller, isPrivilegedActor, resolveAccountId, resolveUserId } from '../auth'
import {
  CreationCommitBody,
  CreationItemParams,
  CreationToolParams,
  CreationUploadBody,
} from '../dtos'

export interface CreationsRoutesDeps {
  list: ListCreationsService
  reserveUpload: ReserveCreationUploadService
  commitUpload: CommitCreationUploadService
  getDownload: GetCreationDownloadService
  remove: DeleteCreationService
  /** Token interno do gateway (defesa em profundidade). Vazio em dev → checagem desligada. */
  internalToken?: string
}

/**
 * Rotas do "Guardado na sua conta" (18/08/2026): o ÍNDICE das criações que os
 * editores livres (Estúdio Completo, Pinta) sobem sozinhos. Todas exigem o
 * `x-internal-token` (gateway) + `x-auth-user-id`. O dono é o `user_id` (perfil
 * kids; a conta no adulto) — a linha de outro dono é 404, nunca 403.
 *
 * O blob NÃO passa por aqui (teto de 2 MB da borda): estas rotas devolvem a
 * revisão/chave, e o BFF (member-shell) assina PUT/GET direto no R2 UGC.
 *
 * GATE DE PRODUTO só na RESERVA (escrita): posse do `estudio-completo`/`pinta`
 * pela CONTA. Listar, baixar e apagar o que é seu não exige assinatura ativa — a
 * criança sempre consegue trazer de volta o que já guardou.
 */
export function creationsRoutes(deps: CreationsRoutesDeps) {
  return (
    new Elysia({ prefix: '/members/creations' })
      .onTransform(({ headers }) =>
        assertInternalCaller(headers['x-internal-token'], deps.internalToken),
      )
      // Índice do perfil numa ferramenta (só itens vivos e já confirmados).
      .get(
        '/:tool',
        async ({ headers, params }) => ({
          items: await deps.list.execute(resolveUserId(headers), params.tool),
        }),
        { params: CreationToolParams },
      )
      // Reserva a próxima revisão (quota + posse) → `{revision, storageKey, bytes}`.
      .post(
        '/:tool/:itemId/upload',
        async ({ headers, params, body }) =>
          deps.reserveUpload.execute({
            userId: resolveUserId(headers),
            accountId: resolveAccountId(headers),
            privileged: isPrivilegedActor(headers),
            tool: params.tool,
            itemId: params.itemId,
            name: body.name,
            kind: body.kind,
            itemUpdatedAt: new Date(body.itemUpdatedAt),
            bytes: body.bytes,
            thumb: body.thumb ?? null,
            ...(body.baseRevision !== undefined ? { baseRevision: body.baseRevision } : {}),
            ...(body.parts ? { parts: body.parts } : {}),
          }),
        { params: CreationItemParams, body: CreationUploadBody },
      )
      // Confirma a revisão reservada depois do PUT no R2 → `{item, previousStorageKey}`
      // (o BFF apaga a revisão anterior no R2, best-effort).
      .post(
        '/:tool/:itemId/commit',
        async ({ headers, params, body }) =>
          deps.commitUpload.execute({
            userId: resolveUserId(headers),
            tool: params.tool,
            itemId: params.itemId,
            revision: body.revision,
            ...(body.uploadedParts ? { uploadedParts: body.uploadedParts } : {}),
          }),
        { params: CreationItemParams, body: CreationCommitBody },
      )
      // Onde está o blob da revisão corrente (o BFF assina o GET).
      .get(
        '/:tool/:itemId/download',
        async ({ headers, params }) =>
          deps.getDownload.execute(resolveUserId(headers), params.tool, params.itemId),
        { params: CreationItemParams },
      )
      // Lixeira lógica (idempotente).
      .delete(
        '/:tool/:itemId',
        async ({ headers, params }) =>
          deps.remove.execute(resolveUserId(headers), params.tool, params.itemId),
        { params: CreationItemParams },
      )
  )
}
