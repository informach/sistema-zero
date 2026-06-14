import { Elysia } from 'elysia'
import type { AttachmentService } from '../../../application/attachments/attachment.service'
import { assertInternalCaller, resolveActor } from '../auth'
import { IdParams, RegisterAttachmentBody } from '../dtos'

export interface AttachmentsRoutesDeps {
  attachments: AttachmentService
  internalToken?: string
}

/**
 * Anexos do aluno. O arquivo NÃO passa por aqui (upload/download direto
 * browser↔R2, mintado pelo BFF): `POST /hub/attachments` registra o metadado
 * (`pending_upload`) e `GET /hub/attachments/:id/resolve` autoriza e devolve o
 * `storageRef` ao BFF para o presigned GET. JWT + conta ativa vêm do gateway.
 */
export function attachmentsRoutes(deps: AttachmentsRoutesDeps) {
  return new Elysia()
    .onBeforeHandle(({ headers }) =>
      assertInternalCaller(headers['x-internal-token'], deps.internalToken),
    )
    .post(
      '/hub/attachments',
      ({ headers, body, set }) => {
        set.status = 201
        return deps.attachments.register(resolveActor(headers), body)
      },
      { body: RegisterAttachmentBody },
    )
    .get(
      '/hub/attachments/:id/resolve',
      ({ headers, params }) => deps.attachments.resolve(resolveActor(headers), params.id),
      { params: IdParams },
    )
}
