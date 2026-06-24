import { Elysia } from 'elysia'
import type { AccessCheckService } from '../../../application/access-check/access-check.service'
import type { GetShowcasePayloadService } from '../../../application/get-showcase-payload/get-showcase-payload.service'
import type { GetProfileAllowanceService } from '../../../application/profile-allowance/get-profile-allowance.service'
import type { ValidateCertificateService } from '../../../application/validate-certificate/validate-certificate.service'
import { assertInternalCaller } from '../auth'
import { AccessCheckBody, IdParams, ProfileAllowanceQuery, ShowcaseEligibilityQuery } from '../dtos'

export interface InternalRoutesDeps {
  accessCheck: AccessCheckService
  /** Teto de perfis (kids) da conta — consumido pelo `auth` ao criar perfil. */
  profileAllowance: GetProfileAllowanceService
  /** Elegibilidade + conteúdo autoritativo do Mural — consumido pelo `hub` ao publicar. */
  showcasePayload: GetShowcasePayloadService
  /** Validação PÚBLICA de certificado (consumida pelo BFF da página `/validar/:id`). */
  validateCertificate: ValidateCertificateService
  /** Token interno (= INTERNAL_API_TOKEN). Exigido SEMPRE que setado (S2S, não passa pelo gateway). */
  internalToken?: string
}

/**
 * Rotas S2S internas (NÃO expostas no gateway). Consumidas direto na rede interna
 * com o `x-internal-token` (= `INTERNAL_API_TOKEN` do members): o `access-check` e o
 * `showcase-eligibility` pela comunidade (`@sistemazero/hub`) e o `profile-allowance`
 * pelo `auth` (limite de perfis kids). Prefixo `/members/internal`.
 */
export function internalRoutes(deps: InternalRoutesDeps) {
  return (
    new Elysia({ prefix: '/members/internal' })
      .onTransform(({ headers }) =>
        assertInternalCaller(headers['x-internal-token'], deps.internalToken),
      )
      .post('/access-check', ({ body }) => deps.accessCheck.execute(body.userId, body.courseRefs), {
        body: AccessCheckBody,
      })
      .get('/profile-allowance', ({ query }) => deps.profileAllowance.execute(query.accountId), {
        query: ProfileAllowanceQuery,
      })
      // O hub re-valida a elegibilidade aqui (não confia no corpo da publicação): acesso
      // pela CONTA (`accountId`), entrega pelo PERFIL (`userId`). `privileged:false` — só
      // quem realmente concluiu o projeto publica (equipe testando não vai ao Mural real).
      .get(
        '/showcase-eligibility',
        ({ query }) =>
          deps.showcasePayload.execute(
            query.userId,
            query.lessonId,
            query.blockId,
            false,
            query.accountId,
          ),
        { query: ShowcaseEligibilityQuery },
      )
      // Validação PÚBLICA do certificado pelo id (lido do QR). Exposta no gateway como
      // rota `public` (o gateway injeta o `x-internal-token`); só dados não-sensíveis.
      .get(
        '/certificates/:id/validate',
        ({ params }) => deps.validateCertificate.execute(params.id),
        {
          params: IdParams,
        },
      )
  )
}
