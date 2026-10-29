import {
  PerfisDaFamiliaSchema,
  PermissoesDaFamiliaSchema,
} from '@sistemazero/arquipelago-contracts'
import { Elysia } from 'elysia'
import type { ServicoDaFamilia } from '../../application/servico-da-familia'
import { exigirGateway, lerResponsavel } from './identidade'
import { CorpoInvalidoError } from './rotas-do-jogo'

function validar<T>(
  schema: { safeParse(v: unknown): { success: true; data: T } | { success: false } },
  corpo: unknown,
): T {
  const r = schema.safeParse(corpo)
  if (!r.success) throw new CorpoInvalidoError()
  return r.data
}

/**
 * A área dos pais do Kids (28/10/2026, fase1-18): a semana das crianças e as permissões de visita.
 * Só o responsável, na sessão da conta (`lerResponsavel`, o mesmo do limite da família).
 */
export function rotasDaFamilia(deps: { familia: ServicoDaFamilia; tokenInterno?: string }) {
  const { familia } = deps
  return new Elysia({ prefix: '/arquipelago' })
    .onBeforeHandle(({ headers }) => exigirGateway(headers['x-internal-token'], deps.tokenInterno))
    .get('/familia/semana', ({ headers, query }) =>
      familia.semana(lerResponsavel(headers), validar(PerfisDaFamiliaSchema, query.perfis)),
    )
    .get('/familia/permissoes', ({ headers }) => familia.lerPermissoes(lerResponsavel(headers)))
    .put('/familia/permissoes', ({ headers, body }) =>
      familia.gravarPermissoes(lerResponsavel(headers), validar(PermissoesDaFamiliaSchema, body)),
    )
}
