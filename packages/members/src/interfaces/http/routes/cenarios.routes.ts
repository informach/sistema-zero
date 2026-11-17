import type { ComandoDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import { Elysia, type TSchema, t } from 'elysia'
import type { CenariosService } from '../../../application/cenarios/cenarios.service'
import { type Ator, LICENCAS, LIMITES_DOS_CENARIOS } from '../../../domain/cenarios/cenarios'
import {
  assertInternalCaller,
  assertMemberShellConsumer,
  isPrivilegedActor,
  resolveAccountId,
  resolveUserId,
} from '../auth'

export interface CenariosRoutesDeps {
  cenarios: CenariosService
  /** Token interno do gateway (defesa em profundidade). Vazio em dev → checagem desligada. */
  internalToken?: string
}

const UUID = t.String({
  pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
})
const DIGEST = t.String({ pattern: '^[a-f0-9]{64}$' })
const NOME = t.String({ minLength: 1, maxLength: 120 })
const LICENCA = t.Union(LICENCAS.map((l) => t.Literal(l)))
const TRES = t.Tuple([t.Number(), t.Number(), t.Number()])
const BYTES = t.Integer({ minimum: 1, maximum: LIMITES_DOS_CENARIOS.modeloBytes })
const MIME_IMAGEM = t.Union([t.Literal('image/png'), t.Literal('image/webp')])
const CONFERENCIA = t.Object({
  digest: DIGEST,
  bytes: BYTES,
  tipoDoConteudo: t.Union([
    t.Literal('model/gltf-binary'),
    t.Literal('image/png'),
    t.Literal('image/webp'),
  ]),
})

const Id = t.Object({ id: UUID })
const EspacoId = t.Object({ espacoId: UUID })
const NomeBody = t.Object({ nome: NOME })
const LoteBody = t.Object({
  revisaoEsperada: t.Integer({ minimum: 0 }),
  operacaoId: t.String({ minLength: 8, maxLength: 80, pattern: '^[A-Za-z0-9_-]+$' }),
  comandos: t.Array(t.Record(t.String(), t.Unknown()), { minItems: 1, maxItems: 500 }),
})
const Varios = <T extends TSchema>(item: T) =>
  t.Array(item, { minItems: 1, maxItems: LIMITES_DOS_CENARIOS.reservaPorChamada })

const ModeloParaReservar = t.Object({
  digest: DIGEST,
  bytes: BYTES,
  miniatura: t.Optional(
    t.Union([
      t.Object({
        digest: DIGEST,
        bytes: t.Integer({ minimum: 1, maximum: LIMITES_DOS_CENARIOS.miniaturaBytes }),
        tipoDoConteudo: t.Optional(MIME_IMAGEM),
      }),
      t.Null(),
    ]),
  ),
})
const ModeloParaRegistrar = t.Object({
  nome: NOME,
  pasta: t.String({ maxLength: 240 }),
  etiquetas: t.Array(t.String({ minLength: 1, maxLength: 40 }), { maxItems: 16 }),
  digest: DIGEST,
  triangulos: t.Integer({ minimum: 0, maximum: 50_000_000 }),
  min: TRES,
  max: TRES,
  miniatura: t.Optional(t.Union([DIGEST, t.Null()])),
})
const TexturaParaRegistrar = t.Object({
  nome: NOME,
  pasta: t.String({ maxLength: 240 }),
  etiquetas: t.Array(t.String({ minLength: 1, maxLength: 40 }), { maxItems: 16 }),
  digest: DIGEST,
  largura: t.Integer({ minimum: 1, maximum: 4096 }),
  altura: t.Integer({ minimum: 1, maximum: 4096 }),
  repeticaoMetros: t.Number({ minimum: 0.05, maximum: 1000 }),
})
/** Quem pede, afirmado pelo BFF nas rotas internas (ele leu a sessão). */
const AtorBody = t.Object({
  usuarioId: UUID,
  contaId: UUID,
  equipe: t.Boolean(),
  suporte: t.Boolean(),
})

function atorDe(headers: Record<string, string | undefined>): Ator {
  return {
    usuarioId: resolveUserId(headers),
    contaId: resolveAccountId(headers),
    equipe: isPrivilegedActor(headers),
    suporte: Boolean(headers['x-auth-impersonator-id']?.trim()),
  }
}

/**
 * Molda Cenários. As rotas do aluno e da equipe ficam em `/members/cenarios` (o gateway
 * verificou o JWT e injetou `x-auth-*`). As duas rotas que AFIRMAM que um arquivo chegou ao
 * bucket ficam em `/members/internal/cenarios` e só o BFF as chama, porque só ele conferiu.
 *
 * Os arquivos não passam por aqui: estas rotas devolvem a chave e o tamanho, e o BFF assina o
 * envio e a leitura direto no bucket.
 */
export function cenariosRoutes(deps: CenariosRoutesDeps) {
  const s = deps.cenarios
  return new Elysia()
    .onTransform(({ headers }) =>
      assertInternalCaller(headers['x-internal-token'], deps.internalToken),
    )
    .group('/members/cenarios', (app) =>
      app
        // Para o menu saber se mostra a ferramenta. Nunca recusa.
        .get('/acesso', ({ headers }) => ({ aberto: s.aberto(atorDe(headers)) }))
        .get('/espacos', ({ headers }) => s.espacos(atorDe(headers)))

        .get(
          '/espacos/:espacoId/bibliotecas',
          ({ headers, params }) => s.bibliotecas(atorDe(headers), params.espacoId),
          { params: EspacoId },
        )
        .post(
          '/espacos/:espacoId/biblioteca-molda',
          ({ headers, params }) => s.bibliotecaDoMolda(atorDe(headers), params.espacoId),
          { params: EspacoId },
        )
        .post(
          '/espacos/:espacoId/bibliotecas',
          ({ headers, params, body }) => s.criarBiblioteca(atorDe(headers), params.espacoId, body),
          {
            params: EspacoId,
            body: t.Object({
              nome: NOME,
              licenca: LICENCA,
              descricao: t.Optional(t.String({ maxLength: 1000 })),
            }),
          },
        )
        .patch(
          '/bibliotecas/:id',
          ({ headers, params, body }) => s.editarBiblioteca(atorDe(headers), params.id, body),
          {
            params: Id,
            body: t.Object({
              nome: t.Optional(NOME),
              licenca: t.Optional(LICENCA),
              descricao: t.Optional(t.String({ maxLength: 1000 })),
              capaModelo: t.Optional(t.Union([UUID, t.Null()])),
            }),
          },
        )
        .delete(
          '/bibliotecas/:id',
          ({ headers, params }) => s.apagarBiblioteca(atorDe(headers), params.id),
          { params: Id },
        )

        .get(
          '/bibliotecas/:id/organizacao',
          ({ headers, params }) => s.organizacao(atorDe(headers), params.id),
          { params: Id },
        )
        .get(
          '/bibliotecas/:id/modelos',
          ({ headers, params, query }) => s.modelos(atorDe(headers), params.id, query),
          {
            params: Id,
            query: t.Object({
              busca: t.Optional(t.String({ maxLength: 120 })),
              pasta: t.Optional(t.String({ maxLength: 240 })),
              digest: t.Optional(DIGEST),
              cursor: t.Optional(t.String({ pattern: '^[0-9]{1,7}$' })),
              limite: t.Optional(
                t.Numeric({ minimum: 1, maximum: LIMITES_DOS_CENARIOS.paginaDeModelos }),
              ),
            }),
          },
        )
        .get(
          '/bibliotecas/:id/texturas',
          ({ headers, params, query }) => s.texturas(atorDe(headers), params.id, query),
          {
            params: Id,
            query: t.Object({
              busca: t.Optional(t.String({ maxLength: 120 })),
              pasta: t.Optional(t.String({ maxLength: 240 })),
              digest: t.Optional(DIGEST),
              cursor: t.Optional(t.String({ pattern: '^[0-9]{1,7}$' })),
              limite: t.Optional(
                t.Numeric({ minimum: 1, maximum: LIMITES_DOS_CENARIOS.paginaDeModelos }),
              ),
            }),
          },
        )
        .post(
          '/bibliotecas/:id/texturas/reservar',
          ({ headers, params, body }) =>
            s.reservarTexturas(atorDe(headers), params.id, body.texturas),
          {
            params: Id,
            body: t.Object({
              texturas: Varios(
                t.Object({
                  digest: DIGEST,
                  bytes: t.Integer({ minimum: 1, maximum: LIMITES_DOS_CENARIOS.texturaBytes }),
                  tipoDoConteudo: MIME_IMAGEM,
                }),
              ),
            }),
          },
        )
        .post(
          '/bibliotecas/:id/texturas/apagar',
          ({ headers, params, body }) => s.apagarTexturas(atorDe(headers), params.id, body.ids),
          { params: Id, body: t.Object({ ids: t.Array(UUID, { minItems: 1, maxItems: 200 }) }) },
        )
        .patch(
          '/texturas/:id',
          ({ headers, params, body }) => s.editarTextura(atorDe(headers), params.id, body),
          {
            params: Id,
            body: t.Object({
              nome: t.Optional(NOME),
              pasta: t.Optional(t.String({ maxLength: 240 })),
              etiquetas: t.Optional(
                t.Array(t.String({ minLength: 1, maxLength: 40 }), { maxItems: 16 }),
              ),
              repeticaoMetros: t.Optional(t.Number({ minimum: 0.05, maximum: 1000 })),
            }),
          },
        )
        .post(
          '/bibliotecas/:id/modelos/reservar',
          ({ headers, params, body }) =>
            s.reservarModelos(atorDe(headers), params.id, body.modelos),
          { params: Id, body: t.Object({ modelos: Varios(ModeloParaReservar) }) },
        )
        .post(
          '/bibliotecas/:id/modelos/apagar',
          ({ headers, params, body }) => s.apagarModelos(atorDe(headers), params.id, body.ids),
          { params: Id, body: t.Object({ ids: t.Array(UUID, { minItems: 1, maxItems: 200 }) }) },
        )
        .patch(
          '/modelos/:id',
          ({ headers, params, body }) => s.editarModelo(atorDe(headers), params.id, body),
          {
            params: Id,
            body: t.Object({
              nome: t.Optional(NOME),
              pasta: t.Optional(t.String({ maxLength: 240 })),
              etiquetas: t.Optional(
                t.Array(t.String({ minLength: 1, maxLength: 40 }), { maxItems: 16 }),
              ),
            }),
          },
        )
        // Onde está um arquivo do espaço (o BFF assina a leitura).
        .get(
          '/espacos/:espacoId/arquivos/:digest',
          ({ headers, params }) => s.arquivo(atorDe(headers), params.espacoId, params.digest),
          { params: t.Object({ espacoId: UUID, digest: DIGEST }) },
        )

        .get(
          '/espacos/:espacoId/mundos',
          ({ headers, params }) => s.mundos(atorDe(headers), params.espacoId),
          { params: EspacoId },
        )
        .post(
          '/espacos/:espacoId/mundos',
          ({ headers, params, body }) => s.criarMundo(atorDe(headers), params.espacoId, body.nome),
          { params: EspacoId, body: NomeBody },
        )
        .patch(
          '/mundos/:id',
          ({ headers, params, body }) => s.editarMundo(atorDe(headers), params.id, body),
          {
            params: Id,
            body: t.Object({
              nome: t.Optional(NOME),
              bibliotecas: t.Optional(t.Array(UUID, { maxItems: 200 })),
            }),
          },
        )
        .delete('/mundos/:id', ({ headers, params }) => s.apagarMundo(atorDe(headers), params.id), {
          params: Id,
        })

        .get(
          '/mundos/:id/cenarios',
          ({ headers, params }) => s.cenarios(atorDe(headers), params.id),
          { params: Id },
        )
        .post(
          '/mundos/:id/cenarios',
          ({ headers, params, body }) => s.criarCenario(atorDe(headers), params.id, body.nome),
          { params: Id, body: NomeBody },
        )
        .get('/cenarios/:id', ({ headers, params }) => s.abrirCenario(atorDe(headers), params.id), {
          params: Id,
        })
        .get(
          '/cenarios/:id/historico',
          ({ headers, params }) => s.historico(atorDe(headers), params.id),
          { params: Id },
        )
        .get(
          '/cenarios/:id/revisoes',
          ({ headers, params, query }) => s.revisoes(atorDe(headers), params.id, query.antes),
          {
            params: Id,
            query: t.Object({
              antes: t.Optional(t.Numeric({ minimum: 1, maximum: 2147483647, multipleOf: 1 })),
            }),
          },
        )
        .post(
          '/cenarios/:id/historico',
          ({ headers, params, body }) => s.moverHistorico(atorDe(headers), params.id, body),
          {
            params: Id,
            body: t.Object({
              acao: t.Union([t.Literal('desfazer'), t.Literal('refazer')]),
              revisaoEsperada: t.Integer({ minimum: 0 }),
              operacaoId: t.String({ minLength: 8, maxLength: 80, pattern: '^[A-Za-z0-9_-]+$' }),
            }),
          },
        )
        .post(
          '/cenarios/:id/restaurar',
          ({ headers, params, body }) => s.restaurarRevisao(atorDe(headers), params.id, body),
          {
            params: Id,
            body: t.Object({
              revisao: t.Integer({ minimum: 0 }),
              revisaoEsperada: t.Integer({ minimum: 0 }),
              operacaoId: t.String({ minLength: 8, maxLength: 80, pattern: '^[A-Za-z0-9_-]+$' }),
            }),
          },
        )
        // A porta única de edição: a mão e os agentes mandam os mesmos lotes de comandos.
        // O formato de cada comando é conferido pelo núcleo dos cenários, no serviço.
        .post(
          '/cenarios/:id/lotes',
          ({ headers, params, body }) =>
            s.editarCenario(atorDe(headers), params.id, {
              revisaoEsperada: body.revisaoEsperada,
              operacaoId: body.operacaoId,
              comandos: body.comandos as ComandoDeCenario[],
            }),
          {
            params: Id,
            body: t.Object({
              revisaoEsperada: t.Integer({ minimum: 0 }),
              operacaoId: t.String({ minLength: 8, maxLength: 80, pattern: '^[A-Za-z0-9_-]+$' }),
              comandos: t.Array(t.Record(t.String(), t.Unknown()), { minItems: 1, maxItems: 500 }),
            }),
          },
        )
        .post(
          '/cenarios/:id/duplicar',
          ({ headers, params }) => s.duplicarCenario(atorDe(headers), params.id),
          { params: Id },
        )
        .post(
          '/cenarios/:id/recursos/reservar',
          ({ headers, params, body }) =>
            s.reservarRecursos(atorDe(headers), params.id, body.recursos),
          {
            params: Id,
            body: t.Object({
              recursos: Varios(t.Object({ digest: DIGEST, bytes: t.Literal(8474) })),
            }),
          },
        )
        .post(
          '/cenarios/:id/capa/reservar',
          ({ headers, params, body }) => s.reservarCapa(atorDe(headers), params.id, body),
          {
            params: Id,
            body: t.Object({
              digest: DIGEST,
              bytes: t.Integer({ minimum: 1, maximum: LIMITES_DOS_CENARIOS.capaBytes }),
              tipoDoConteudo: t.Optional(MIME_IMAGEM),
            }),
          },
        )
        .delete(
          '/cenarios/:id',
          ({ headers, params }) => s.apagarCenario(atorDe(headers), params.id),
          { params: Id },
        ),
    )
    .group('/members/internal/cenarios', (app) =>
      app
        .post(
          '/lotes',
          ({ headers, body }) => {
            assertMemberShellConsumer(headers['x-consumer-id'])
            return s.editarCenario(
              body.ator,
              body.cenarioId,
              { ...body.lote, comandos: body.lote.comandos as ComandoDeCenario[] },
              { espacoId: body.espacoId, conferidos: body.conferidos },
            )
          },
          {
            body: t.Object({
              ator: AtorBody,
              cenarioId: UUID,
              espacoId: UUID,
              lote: LoteBody,
              conferidos: t.Array(
                t.Object({
                  digest: DIGEST,
                  bytes: t.Literal(8474),
                  tipoDoConteudo: t.Literal('application/octet-stream'),
                  terreno: t.Object({
                    min: t.Number({ minimum: -10000, maximum: 10000 }),
                    max: t.Number({ minimum: -10000, maximum: 10000 }),
                  }),
                }),
                { maxItems: 4096 },
              ),
            }),
          },
        )
        .post(
          '/modelos',
          ({ headers, body }) => {
            assertMemberShellConsumer(headers['x-consumer-id'])
            return s.registrarModelos(
              body.ator,
              body.bibliotecaId,
              body.modelos,
              body.conferidos,
              body.espacoId,
            )
          },
          {
            body: t.Object({
              ator: AtorBody,
              bibliotecaId: UUID,
              // Onde o BFF procurou os arquivos: conferência em outro espaço não conta.
              espacoId: UUID,
              modelos: Varios(ModeloParaRegistrar),
              conferidos: t.Array(CONFERENCIA, {
                maxItems: LIMITES_DOS_CENARIOS.reservaPorChamada * 2,
              }),
            }),
          },
        )
        .post(
          '/texturas',
          ({ headers, body }) => {
            assertMemberShellConsumer(headers['x-consumer-id'])
            return s.registrarTexturas(
              body.ator,
              body.bibliotecaId,
              body.texturas,
              body.conferidos,
              body.espacoId,
            )
          },
          {
            body: t.Object({
              ator: AtorBody,
              bibliotecaId: UUID,
              espacoId: UUID,
              texturas: Varios(TexturaParaRegistrar),
              conferidos: t.Array(
                t.Intersect([
                  CONFERENCIA,
                  t.Object({
                    largura: t.Integer({ minimum: 1, maximum: 4096 }),
                    altura: t.Integer({ minimum: 1, maximum: 4096 }),
                  }),
                ]),
                { maxItems: 50 },
              ),
            }),
          },
        )
        .post(
          '/capa',
          async ({ headers, body }) => {
            assertMemberShellConsumer(headers['x-consumer-id'])
            await s.definirCapa(
              body.ator,
              body.cenarioId,
              body.digest,
              body.conferido,
              body.espacoId,
            )
            return { ok: true }
          },
          {
            body: t.Object({
              ator: AtorBody,
              cenarioId: UUID,
              espacoId: UUID,
              digest: DIGEST,
              conferido: t.Union([CONFERENCIA, t.Null()]),
            }),
          },
        ),
    )
}
