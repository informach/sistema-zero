import { Elysia, t } from 'elysia'
import type { GalleryDeliveryService } from '../../../application/learning/gallery-delivery.service'
import { MAX_SUBMISSION_MESSAGE_CHARS } from '../../../domain/course/lesson-block'
import {
  assertInternalCaller,
  assertMemberShellConsumer,
  isPrivilegedActor,
  resolveAccountId,
  resolveUserId,
} from '../auth'

const Id = t.String({ format: 'uuid' })
const Params = t.Object({ lessonId: Id, blockId: Id })
const Input = t.Object({
  requestId: Id,
  revision: t.String({ minLength: 1, maxLength: 32 }),
  items: t.Array(
    t.Object({
      itemId: t.String({ pattern: '^[A-Za-z0-9_-]{1,64}$' }),
      revision: t.Integer({ minimum: 1 }),
    }),
    { minItems: 1, maxItems: 12 },
  ),
  /**
   * Recado OPCIONAL ao professor, o mesmo teto do Estúdio e do Pinta (a coluna é
   * `varchar(1000)`). Vale no preparo E no commit assinado: o preparo recusa ANTES de o BFF
   * copiar os trabalhos no armazenamento.
   */
  message: t.Optional(t.String({ maxLength: MAX_SUBMISSION_MESSAGE_CHARS })),
  /** O recado foi falado e transcrito (voz para texto). Ausente = digitado. */
  messageSpoken: t.Optional(t.Boolean()),
})
export function galleryDeliveryRoutes(deps: {
  gallery: GalleryDeliveryService
  internalToken?: string
}) {
  return new Elysia({ name: 'gallery-delivery' })
    .onTransform(({ headers }) =>
      assertInternalCaller(headers['x-internal-token'], deps.internalToken),
    )
    .post(
      '/lessons/:lessonId/blocks/:blockId/gallery-prepare',
      ({ headers, params, body }) =>
        deps.gallery.prepare(
          {
            userId: resolveUserId(headers),
            accountId: resolveAccountId(headers),
            privileged: isPrivilegedActor(headers),
          },
          params.lessonId,
          params.blockId,
          body,
        ),
      { params: Params, body: Input },
    )
    .post(
      '/internal/lessons/:lessonId/blocks/:blockId/gallery-commit',
      ({ headers, params, body }) => {
        assertMemberShellConsumer(headers['x-consumer-id'])
        return deps.gallery.commit(
          body.actor,
          params.lessonId,
          params.blockId,
          body.input,
          body.projectForChecks,
        )
      },
      {
        params: Params,
        body: t.Object({
          actor: t.Object({ userId: Id, accountId: Id, privileged: t.Boolean() }),
          input: Input,
          projectForChecks: t.Unknown(),
        }),
      },
    )
}
