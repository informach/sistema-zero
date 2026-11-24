import { LIMITES_DA_EXPORTACAO } from '@sistemazero/molda-cenarios-core/compilar'
import { MAX_BYTES_DO_MANIFESTO, PERFIS_DE_ILHA } from '@sistemazero/molda-cenarios-core/publicacao'
import { Elysia, t } from 'elysia'
import {
  LIMITE_DE_ARQUIVOS_POR_LEITURA,
  publicacaoParaOJogo,
} from '../../../application/cenarios/publicacoes.service'
import { TIPOS_DE_CONTEUDO } from '../../../domain/cenarios/cenarios'
import { assertInternalCaller, assertMemberShellConsumer } from '../auth'
import type { CenariosRoutesDeps } from './cenarios.routes'
import { atorDosCenarios } from './cenarios-ator'

const UUID = t.String({ format: 'uuid' })
const DIGEST = t.String({ pattern: '^[a-f0-9]{64}$' })
const ILHA = t.Union(PERFIS_DE_ILHA.map((i) => t.Literal(i)))
const PERFIL = t.Object(
  { tipo: t.Literal('arquipelago-v2'), ilha: ILHA },
  { additionalProperties: false },
)
const PEDIDO = t.Object(
  {
    operacaoId: UUID,
    perfil: PERFIL,
    versaoEsperada: t.Integer({ minimum: 0, maximum: 2147483646 }),
    fonte: t.Object(
      { cenario: UUID, revisao: t.Integer({ minimum: 0, maximum: 2147483647 }), digest: DIGEST },
      { additionalProperties: false },
    ),
    manifesto: t.Object(
      { digest: DIGEST, bytes: t.Integer({ minimum: 1, maximum: MAX_BYTES_DO_MANIFESTO }) },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
)
/** Voltar a ilha para uma versão anterior: o conteúdo vem da versão guardada, não do corpo. */
const PEDIDO_DE_VOLTA = t.Object(
  {
    operacaoId: UUID,
    perfil: PERFIL,
    versaoEsperada: t.Integer({ minimum: 1, maximum: 2147483646 }),
    publicacaoId: UUID,
  },
  { additionalProperties: false },
)
const ATOR = t.Object(
  {
    usuarioId: UUID,
    contaId: UUID,
    equipe: t.Boolean(),
    suporte: t.Boolean(),
    perfil: t.Optional(t.Boolean()),
  },
  { additionalProperties: false },
)
const RECURSO = t.Object(
  {
    digest: DIGEST,
    bytes: t.Integer({ minimum: 1, maximum: LIMITES_DA_EXPORTACAO.bytesDoPacote }),
    mime: t.Union(TIPOS_DE_CONTEUDO.map((m) => t.Literal(m))),
    papel: t.Union([t.Literal('recurso'), t.Literal('manifesto')]),
  },
  { additionalProperties: false },
)
const CONFERIDO = t.Object(
  {
    digest: DIGEST,
    bytes: t.Integer({ minimum: 1, maximum: LIMITES_DA_EXPORTACAO.bytesDoPacote }),
    tipoDoConteudo: t.Union(TIPOS_DE_CONTEUDO.map((m) => t.Literal(m))),
  },
  { additionalProperties: false },
)

export function cenariosPublicacoesRoutes(
  deps: Pick<CenariosRoutesDeps, 'publicacoes' | 'internalToken'>,
) {
  const s = deps.publicacoes
  return new Elysia()
    .onTransform(({ headers }) =>
      assertInternalCaller(headers['x-internal-token'], deps.internalToken),
    )
    .group('/members/cenarios/publicacoes', (app) =>
      app
        .get(
          '/perfis/:ilha',
          async ({ headers, params }) =>
            Response.json(
              await s.lerPerfilDaOficina(atorDosCenarios(headers), {
                tipo: 'arquipelago-v2',
                ilha: params.ilha,
              }),
            ),
          { params: t.Object({ ilha: ILHA }) },
        )
        .get(
          '/perfis/:ilha/versoes',
          async ({ headers, params }) =>
            s.listarVersoes(atorDosCenarios(headers), {
              tipo: 'arquipelago-v2',
              ilha: params.ilha,
            }),
          { params: t.Object({ ilha: ILHA }) },
        )
        .post('/preparar', ({ headers, body }) => s.preparar(atorDosCenarios(headers), body), {
          body: PEDIDO,
        })
        .post(
          '/manifesto/reservar',
          ({ headers, body }) => s.reservarManifesto(atorDosCenarios(headers), body),
          { body: PEDIDO },
        ),
    )
    .group('/members/internal/cenarios/publicacoes', (app) =>
      app
        .onBeforeHandle(({ headers }) => assertMemberShellConsumer(headers['x-consumer-id']))
        .post(
          '/recursos',
          ({ body }) => s.reservarRecursosDoManifesto(body.ator, body.pedido, body.recursos),
          {
            body: t.Object(
              {
                ator: ATOR,
                pedido: PEDIDO,
                recursos: t.Array(RECURSO, { minItems: 1, maxItems: 50 }),
              },
              { additionalProperties: false },
            ),
          },
        )
        .post(
          '/confirmar',
          async ({ body }) => {
            const resultado = await s.publicarConferido(
              body.ator,
              body.pedido,
              body.resumo,
              body.conferidos,
            )
            return {
              publicacao: publicacaoParaOJogo(resultado.publicacao),
              repetido: resultado.repetido,
            }
          },
          {
            body: t.Object(
              {
                ator: ATOR,
                pedido: PEDIDO,
                // Inventário e procedência: o formato fino é conferido no serviço (Zod do core).
                resumo: t.Object(
                  {
                    recursos: t.Array(RECURSO, {
                      minItems: 1,
                      maxItems: LIMITES_DA_EXPORTACAO.arquivos + 1,
                    }),
                    fontes: t.Unknown(),
                    licencas: t.Array(t.Unknown(), { maxItems: 8192 }),
                  },
                  { additionalProperties: false },
                ),
                conferidos: t.Array(CONFERIDO, {
                  minItems: 1,
                  maxItems: LIMITES_DA_EXPORTACAO.arquivos + 1,
                }),
              },
              { additionalProperties: false },
            ),
          },
        )
        // Troca o apontador como a confirmação: só pelo BFF, com o ator da sessão verificada.
        .post(
          '/voltar',
          async ({ body }) => {
            const resultado = await s.voltarParaVersao(body.ator, body.pedido)
            return {
              publicacao: publicacaoParaOJogo(resultado.publicacao),
              repetido: resultado.repetido,
            }
          },
          {
            body: t.Object(
              { ator: ATOR, pedido: PEDIDO_DE_VOLTA },
              { additionalProperties: false },
            ),
          },
        )
        .post(
          '/jogo/perfil',
          async ({ body }) => Response.json(await s.perfilDoJogo(body.perfil)),
          { body: t.Object({ ator: ATOR, perfil: PERFIL }, { additionalProperties: false }) },
        )
        .post('/jogo/arquivo', ({ body }) => s.arquivoDoJogo(body.publicacaoId, body.digest), {
          body: t.Object(
            { ator: ATOR, publicacaoId: UUID, digest: DIGEST },
            { additionalProperties: false },
          ),
        })
        .post('/jogo/arquivos', ({ body }) => s.arquivosDoJogo(body.publicacaoId, body.digests), {
          body: t.Object(
            {
              ator: ATOR,
              publicacaoId: UUID,
              digests: t.Array(DIGEST, { minItems: 1, maxItems: LIMITE_DE_ARQUIVOS_POR_LEITURA }),
            },
            { additionalProperties: false },
          ),
        }),
    )
}
