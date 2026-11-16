import {
  AplicarCenarioSchema,
  CriarCenarioSchema,
  CriarSessaoSchema,
  EditarCenarioSchema,
  EstadoDeSessaoSchema,
  PedidoDeViewportSchema,
  ReferenciaDeCatalogoSchema,
  RegistrarCatalogoSchema,
  RestaurarCenarioSchema,
  ResultadoDeViewportSchema,
} from '@sistemazero/molda-cenarios-core'
import { z } from 'zod'

export class OperacaoDeCenarioNaoPermitida extends Error {}

/** Lista fechada de operações; o navegador não escolhe um caminho privilegiado arbitrário. */
export function cenarioAdminRequest(
  method: string,
  path: string[],
  search: URLSearchParams,
  body: unknown,
) {
  const prefix = '/arquipelago/admin/cenarios',
    resource = path[0]
  if (resource === 'aplicado' && path.length === 2 && method === 'GET' && !search.size) {
    const base = z
      .string()
      .regex(/^[a-z0-9-]{1,120}$/)
      .parse(path[1])
    return { path: `${prefix}/aplicado/${base}`, method: 'GET' as const }
  }
  if (new Set(search.keys()).size !== [...search.keys()].length)
    throw new OperacaoDeCenarioNaoPermitida('Parâmetros duplicados')
  if (resource === 'sessoes' && !search.size) {
    if (path.length === 1 && method === 'GET')
      return { path: `${prefix}/sessoes`, method: 'GET' as const }
    if (path.length === 1 && method === 'POST')
      return {
        path: `${prefix}/sessoes`,
        method: 'POST' as const,
        body: CriarSessaoSchema.parse(body),
      }
    const id = z.uuid().parse(path[1])
    if (path.length === 3 && path[2] === 'fechar' && method === 'POST')
      return { path: `${prefix}/sessoes/${id}/fechar`, method: 'POST' as const, body: {} }
    if (path.length === 3 && path[2] === 'pulso' && method === 'POST')
      return {
        path: `${prefix}/sessoes/${id}/pulso`,
        method: 'POST' as const,
        body: EstadoDeSessaoSchema.parse(body),
      }
    if (path.length === 3 && path[2] === 'pedidos' && method === 'POST')
      return {
        path: `${prefix}/sessoes/${id}/pedidos`,
        method: 'POST' as const,
        body: PedidoDeViewportSchema.parse(body),
      }
    if (path.length === 3 && path[2] === 'proxima' && method === 'GET')
      return { path: `${prefix}/sessoes/${id}/proxima`, method: 'GET' as const }
    if (path.length >= 4 && path[2] === 'pedidos') {
      const pedido = z.uuid().parse(path[3])
      if (path.length === 4 && method === 'GET')
        return { path: `${prefix}/sessoes/${id}/pedidos/${pedido}`, method: 'GET' as const }
      if (path.length === 5 && path[4] === 'resultado' && method === 'POST')
        return {
          path: `${prefix}/sessoes/${id}/pedidos/${pedido}/resultado`,
          method: 'POST' as const,
          body: ResultadoDeViewportSchema.parse(body),
        }
    }
  }
  if (resource === 'catalogos') {
    if (path.length === 1 && !search.size && method === 'GET')
      return { path: `${prefix}/catalogos`, method: 'GET' as const }
    if (path.length === 1 && !search.size && method === 'POST')
      return {
        path: `${prefix}/catalogos`,
        method: 'POST' as const,
        body: RegistrarCatalogoSchema.parse(body),
      }
    if (path.length === 3 && !search.size && method === 'GET') {
      const ref = ReferenciaDeCatalogoSchema.parse({ id: path[1], digest: path[2] })
      return { path: `${prefix}/catalogos/${ref.id}/${ref.digest}`, method: 'GET' as const }
    }
  }
  if (resource === 'projetos') {
    if (path.length === 1 && !search.size && method === 'GET')
      return { path: `${prefix}/projetos`, method: 'GET' as const }
    if (path.length === 1 && !search.size && method === 'POST')
      return {
        path: `${prefix}/projetos`,
        method: 'POST' as const,
        body: CriarCenarioSchema.parse(body),
      }
    const id = z.uuid().parse(path[1])
    if (path.length === 2 && method === 'GET') {
      const query = z
        .object({ revisao: z.coerce.number().int().nonnegative().optional() })
        .strict()
        .parse(Object.fromEntries(search))
      return { path: `${prefix}/projetos/${id}`, method: 'GET' as const, query }
    }
    if (path.length === 3 && path[2] === 'historico' && method === 'GET') {
      const query = z
        .object({ antesDe: z.coerce.number().int().nonnegative().optional() })
        .strict()
        .parse(Object.fromEntries(search))
      return { path: `${prefix}/projetos/${id}/historico`, method: 'GET' as const, query }
    }
    if (path.length === 3 && !search.size && path[2] === 'comandos' && method === 'POST')
      return {
        path: `${prefix}/projetos/${id}/comandos`,
        method: 'POST' as const,
        body: EditarCenarioSchema.parse(body),
      }
    if (path.length === 3 && !search.size && path[2] === 'restaurar' && method === 'POST')
      return {
        path: `${prefix}/projetos/${id}/restaurar`,
        method: 'POST' as const,
        body: RestaurarCenarioSchema.parse(body),
      }
    if (path.length === 3 && !search.size && path[2] === 'aplicar' && method === 'POST')
      return {
        path: `${prefix}/projetos/${id}/aplicar`,
        method: 'POST' as const,
        body: AplicarCenarioSchema.parse(body),
      }
  }
  throw new OperacaoDeCenarioNaoPermitida('Operação de cenário não permitida')
}
