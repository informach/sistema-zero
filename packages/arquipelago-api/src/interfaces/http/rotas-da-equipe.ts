import {
  AcaoComRevisaoSchema,
  AplicarManifestoSchema,
  ConferirManifestoSchema,
  CriarDesafioSchema,
  GravarDesafioSchema,
  ILHA_IDS,
  PUBLICOS_DO_DESAFIO,
  SITUACOES_DO_CADASTRO,
  TIPOS_DE_DESAFIO,
} from '@sistemazero/arquipelago-contracts'
import { envelope } from '@sistemazero/core/http'
import { IdentityUuidSchema } from '@sistemazero/core/identity'
import { Elysia } from 'elysia'
import { z } from 'zod'
import type { ServicoDaEquipe } from '../../application/servico-da-equipe'
import { exigirGateway, lerEquipe } from './identidade'
import { CorpoInvalidoError } from './rotas-do-jogo'

const Filtro = z.object({
  publico: z.enum(PUBLICOS_DO_DESAFIO).optional(),
  ilha: z.enum(ILHA_IDS).optional(),
  tipo: z.enum(TIPOS_DE_DESAFIO).optional(),
  situacao: z.enum(SITUACOES_DO_CADASTRO).optional(),
})
const PublicoDaCobertura = z.object({ publico: z.enum(PUBLICOS_DO_DESAFIO) })

function validar<T>(
  schema: { safeParse(v: unknown): { success: true; data: T } | { success: false } },
  valor: unknown,
): T {
  const r = schema.safeParse(valor)
  if (!r.success) throw new CorpoInvalidoError()
  return r.data
}

function idDe(params: { id?: string }): string {
  return validar(IdentityUuidSchema, params.id)
}

/**
 * Seção Jogo do Admin. Três barreiras: os papéis no gateway, a política do Kids (que recusa
 * `/arquipelago/admin/*` ao aluno e ao responsável) e `lerEquipe` aqui. Escrever é só da
 * administração (superadmin, admin), fora de sessão de suporte.
 */
export function rotasDaEquipe(deps: { equipe: ServicoDaEquipe; tokenInterno?: string }) {
  const { equipe } = deps
  return (
    new Elysia({ prefix: '/arquipelago/admin' })
      .onBeforeHandle(({ headers }) =>
        exigirGateway(headers['x-internal-token'], deps.tokenInterno),
      )
      .get('/desafios', ({ headers, query }) =>
        equipe.listar(lerEquipe(headers), validar(Filtro, query)),
      )
      .post('/desafios', ({ headers, body, set }) => {
        set.status = 201
        return equipe.criar(lerEquipe(headers), validar(CriarDesafioSchema, body))
      })
      .get('/desafios/:id', ({ headers, params }) => equipe.ler(lerEquipe(headers), idDe(params)))
      .put('/desafios/:id', ({ headers, params, body }) =>
        equipe.gravar(lerEquipe(headers), idDe(params), validar(GravarDesafioSchema, body)),
      )
      .post('/desafios/:id/analisar', ({ headers, params, body }) =>
        equipe.analisar(
          lerEquipe(headers),
          idDe(params),
          validar(AcaoComRevisaoSchema, body).revisaoBase,
        ),
      )
      .post('/desafios/:id/publicar', ({ headers, params, body }) =>
        equipe.publicar(
          lerEquipe(headers),
          idDe(params),
          validar(AcaoComRevisaoSchema, body).revisaoBase,
        ),
      )
      .post('/desafios/:id/arquivar', ({ headers, params, body }) =>
        equipe.arquivar(
          lerEquipe(headers),
          idDe(params),
          validar(AcaoComRevisaoSchema, body).revisaoBase,
        ),
      )
      .post('/desafios/:id/reativar', ({ headers, params, body }) =>
        equipe.reativar(
          lerEquipe(headers),
          idDe(params),
          validar(AcaoComRevisaoSchema, body).revisaoBase,
        ),
      )
      .get('/desafios/:id/manifesto', ({ headers, params }) =>
        equipe.exportarDesafio(lerEquipe(headers), idDe(params)),
      )
      // Manifesto de desafios: a prévia, o aplicar e o exportar (um formato para um desafio, a
      // ilha ou o jogo inteiro; o Admin manda o pacote grande em lotes que cabem no corpo).
      .post('/manifestos/conferir', ({ headers, body }) =>
        equipe.conferirManifesto(
          lerEquipe(headers),
          validar(ConferirManifestoSchema, body).manifesto,
        ),
      )
      .post('/manifestos/aplicar', ({ headers, body }) =>
        equipe.aplicarManifesto(lerEquipe(headers), validar(AplicarManifestoSchema, body)),
      )
      .get('/manifestos/exportar', async ({ headers, query, set }) => {
        const manifesto = await equipe.exportarManifesto(lerEquipe(headers), validar(Filtro, query))
        if (!manifesto) {
          set.status = 404
          return envelope('NADA_PARA_EXPORTAR', 'Nenhum desafio com esse filtro.')
        }
        return manifesto
      })
      .get('/cobertura', ({ headers, query }) =>
        equipe.cobertura(lerEquipe(headers), validar(PublicoDaCobertura, query).publico),
      )
  )
}
