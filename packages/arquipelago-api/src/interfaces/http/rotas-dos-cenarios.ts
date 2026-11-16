import { envelope, ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'
import { CenarioInvalido, ConflitoDeCenario } from '@sistemazero/molda-cenarios-core'
import { Elysia } from 'elysia'
import { z } from 'zod'
import type { CatalogosDeCenarios } from '../../application/catalogo-de-cenarios'
import {
  CatalogoDeCenarioDiferente,
  CenarioNaoEncontrado,
  OperacaoDeCenarioReutilizada,
  type ServicoDeCenarios,
} from '../../application/servico-de-cenarios'
import type { SessoesDeCenarios } from '../../application/sessoes-de-cenarios'
import { exigirGateway, lerEquipe } from './identidade'

const aplicacao = z.object({ revisao: z.number().int().nonnegative() }).strict()
const historico = z.object({ antesDe: z.coerce.number().int().nonnegative().optional() }).strict()
const leitura = z.object({ revisao: z.coerce.number().int().nonnegative().optional() }).strict()
export function rotasDosCenarios(deps: {
  cenarios: ServicoDeCenarios
  catalogos?: CatalogosDeCenarios
  sessoes?: SessoesDeCenarios
  tokenInterno?: string
}) {
  const s = deps.cenarios
  return new Elysia({ prefix: '/arquipelago/admin/cenarios' })
    .onBeforeHandle(({ headers }) => exigirGateway(headers['x-internal-token'], deps.tokenInterno))
    .onError(({ error, set }) => {
      if (error instanceof UnauthorizedError) {
        set.status = 401
        return envelope('UNAUTHORIZED', error.message)
      }
      if (error instanceof ForbiddenError) {
        set.status = 403
        return envelope('FORBIDDEN', error.message)
      }
      if (error instanceof ConflitoDeCenario) {
        set.status = 409
        return { ...envelope('REVISAO_DIFERENTE', error.message), revisaoAtual: error.revisaoAtual }
      }
      if (error instanceof CenarioNaoEncontrado) {
        set.status = 404
        return envelope(error.code, error.message)
      }
      if (
        error instanceof OperacaoDeCenarioReutilizada ||
        error instanceof CatalogoDeCenarioDiferente
      ) {
        set.status = 409
        return envelope(error.code, error.message)
      }
      if (error instanceof CenarioInvalido) {
        set.status = 422
        return { ...envelope('CENARIO_INVALIDO', error.message), problemas: error.problemas }
      }
      if (error instanceof z.ZodError) {
        set.status = 400
        return envelope('CORPO_INVALIDO', 'Dados de edição inválidos')
      }
    })
    .get('/catalogos', ({ headers, set }) => {
      const equipe = lerEquipe(headers)
      if (!equipe.podeEscrever)
        throw new ForbiddenError('Somente administradores podem acessar o acervo')
      if (!deps.catalogos) {
        set.status = 503
        return envelope('CATALOGO_INDISPONIVEL', 'Catálogo indisponível')
      }
      return deps.catalogos.listar(equipe)
    })
    .get('/catalogos/:id/:digest', ({ headers, params, set }) => {
      const equipe = lerEquipe(headers)
      if (!equipe.podeEscrever)
        throw new ForbiddenError('Somente administradores podem acessar o acervo')
      if (!deps.catalogos) {
        set.status = 503
        return envelope('CATALOGO_INDISPONIVEL', 'Catálogo indisponível')
      }
      return deps.catalogos.ler(equipe, params)
    })
    .post('/catalogos', ({ headers, body, set }) => {
      const equipe = lerEquipe(headers)
      if (!equipe.podeEscrever)
        throw new ForbiddenError('Somente administradores podem acessar o acervo')
      if (!deps.catalogos) {
        set.status = 503
        return envelope('CATALOGO_INDISPONIVEL', 'Catálogo indisponível')
      }
      return deps.catalogos.registrar(equipe, body)
    })
    .get('/projetos', ({ headers }) => s.listar(lerEquipe(headers)))
    .get('/aplicado/:base', ({ headers, params }) =>
      s.aplicado(
        lerEquipe(headers),
        z
          .string()
          .regex(/^[a-z0-9-]{1,120}$/)
          .parse(params.base),
      ),
    )
    .get('/sessoes', ({ headers }) => {
      if (!deps.sessoes) throw new CenarioNaoEncontrado('Sessões indisponíveis')
      return deps.sessoes.listar(lerEquipe(headers))
    })
    .post('/sessoes', ({ headers, body }) => {
      if (!deps.sessoes) throw new CenarioNaoEncontrado('Sessões indisponíveis')
      return deps.sessoes.criar(lerEquipe(headers), body)
    })
    .post('/sessoes/:id/pulso', ({ headers, params, body }) => {
      if (!deps.sessoes) throw new CenarioNaoEncontrado('Sessões indisponíveis')
      return deps.sessoes.pulso(lerEquipe(headers), z.uuid().parse(params.id), body)
    })
    .post('/sessoes/:id/fechar', ({ headers, params }) => {
      if (!deps.sessoes) throw new CenarioNaoEncontrado('Sessões indisponíveis')
      return deps.sessoes.fechar(lerEquipe(headers), z.uuid().parse(params.id))
    })
    .post('/sessoes/:id/pedidos', ({ headers, params, body }) => {
      if (!deps.sessoes) throw new CenarioNaoEncontrado('Sessões indisponíveis')
      return deps.sessoes.pedir(lerEquipe(headers), z.uuid().parse(params.id), body)
    })
    .get('/sessoes/:id/proxima', async ({ headers, params }) => {
      if (!deps.sessoes) throw new CenarioNaoEncontrado('Sessões indisponíveis')
      return { tarefa: await deps.sessoes.proxima(lerEquipe(headers), z.uuid().parse(params.id)) }
    })
    .get('/sessoes/:id/pedidos/:pedidoId', ({ headers, params }) => {
      if (!deps.sessoes) throw new CenarioNaoEncontrado('Sessões indisponíveis')
      return deps.sessoes.tarefa(
        lerEquipe(headers),
        z.uuid().parse(params.id),
        z.uuid().parse(params.pedidoId),
      )
    })
    .post('/sessoes/:id/pedidos/:pedidoId/resultado', ({ headers, params, body }) => {
      if (!deps.sessoes) throw new CenarioNaoEncontrado('Sessões indisponíveis')
      return deps.sessoes.concluir(
        lerEquipe(headers),
        z.uuid().parse(params.id),
        z.uuid().parse(params.pedidoId),
        body,
      )
    })
    .post('/projetos', async ({ headers, body, set }) => {
      const r = await s.criar(lerEquipe(headers), body)
      set.status = 201
      return r
    })
    .get('/projetos/:id', ({ headers, params, query }) =>
      s.ler(lerEquipe(headers), z.uuid().parse(params.id), leitura.parse(query).revisao),
    )
    .get('/projetos/:id/historico', ({ headers, params, query }) =>
      s.historico(lerEquipe(headers), z.uuid().parse(params.id), historico.parse(query).antesDe),
    )
    .post('/projetos/:id/comandos', ({ headers, params, body }) =>
      s.editar(lerEquipe(headers), z.uuid().parse(params.id), body),
    )
    .post('/projetos/:id/restaurar', ({ headers, params, body }) =>
      s.restaurar(lerEquipe(headers), z.uuid().parse(params.id), body),
    )
    .post('/projetos/:id/aplicar', ({ headers, params, body }) =>
      s.aplicar(lerEquipe(headers), z.uuid().parse(params.id), aplicacao.parse(body).revisao),
    )
}
