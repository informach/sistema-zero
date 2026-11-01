import {
  AcaoComRevisaoSchema,
  AplicarManifestoSchema,
  ConferirManifestoSchema,
  CriarDesafioSchema,
  ESTADOS_DA_REVISAO_HUMANA,
  FiltroDaMedicaoSchema,
  GravarDesafioSchema,
  ILHA_IDS,
  PUBLICOS_DO_DESAFIO,
  ResponderRevisaoSchema,
  SITUACOES_DO_CADASTRO,
  TIPOS_DE_DESAFIO,
} from '@sistemazero/arquipelago-contracts'
import { z } from 'zod'

const filters = z.strictObject({
  publico: z.enum(PUBLICOS_DO_DESAFIO),
  ilha: z.enum(ILHA_IDS).optional(),
  tipo: z.enum(TIPOS_DE_DESAFIO).optional(),
  situacao: z.enum(SITUACOES_DO_CADASTRO).optional(),
})
/** Exportar: o público pode faltar (o jogo inteiro, os dois públicos). */
const exportFilters = z.strictObject({
  publico: z.enum(PUBLICOS_DO_DESAFIO).optional(),
  ilha: z.enum(ILHA_IDS).optional(),
  tipo: z.enum(TIPOS_DE_DESAFIO).optional(),
  situacao: z.enum(SITUACOES_DO_CADASTRO).optional(),
})

/** An allowlist, not a generic proxy to privileged game routes. */
export function gameAdminRequest(
  method: string,
  path: string[],
  search: URLSearchParams,
  body: unknown,
) {
  const [resource, id, action] = path
  if (method === 'GET') {
    if (resource === 'medicao' && path.length === 1) {
      return {
        path: '/arquipelago/equipe/medicao',
        query: FiltroDaMedicaoSchema.parse(Object.fromEntries(search)),
        body: undefined,
      }
    }
    if (resource === 'cobertura' && path.length === 1) {
      return {
        path: '/arquipelago/admin/cobertura',
        query: z
          .strictObject({ publico: z.enum(PUBLICOS_DO_DESAFIO) })
          .parse(Object.fromEntries(search)),
        body: undefined,
      }
    }
    if (resource === 'desafios' && path.length === 1)
      return {
        path: '/arquipelago/admin/desafios',
        query: filters.parse(Object.fromEntries(search)),
        body: undefined,
      }
    if (resource === 'desafios' && path.length === 2 && !search.size)
      return { path: `/arquipelago/admin/desafios/${z.uuid().parse(id)}`, body: undefined }
    if (resource === 'desafios' && path.length === 3 && action === 'manifesto' && !search.size)
      return {
        path: `/arquipelago/admin/desafios/${z.uuid().parse(id)}/manifesto`,
        body: undefined,
      }
    // A fila da revisão humana da Lenda (lacunas, 01/11/2026) e um item dela.
    if (resource === 'revisoes' && path.length === 1)
      return {
        path: '/arquipelago/admin/revisoes',
        query: z
          .strictObject({ estado: z.enum(ESTADOS_DA_REVISAO_HUMANA).optional() })
          .parse(Object.fromEntries(search)),
        body: undefined,
      }
    if (resource === 'revisoes' && path.length === 3 && !search.size)
      return {
        path: `/arquipelago/admin/revisoes/${z.uuid().parse(id)}/${z.uuid().parse(action)}`,
        body: undefined,
      }
    if (resource === 'manifestos' && id === 'exportar' && path.length === 2)
      return {
        path: '/arquipelago/admin/manifestos/exportar',
        query: exportFilters.parse(Object.fromEntries(search)),
        body: undefined,
      }
  }
  if (method === 'POST' && resource === 'manifestos' && path.length === 2 && !search.size) {
    if (id === 'conferir')
      return {
        path: '/arquipelago/admin/manifestos/conferir',
        body: ConferirManifestoSchema.parse(body),
      }
    if (id === 'aplicar')
      return {
        path: '/arquipelago/admin/manifestos/aplicar',
        body: AplicarManifestoSchema.parse(body),
      }
  }
  if (method === 'POST' && resource === 'revisoes' && path.length === 3 && !search.size)
    return {
      path: `/arquipelago/admin/revisoes/${z.uuid().parse(id)}/${z.uuid().parse(action)}`,
      body: ResponderRevisaoSchema.parse(body),
    }
  if (search.size || resource !== 'desafios') throw new Error('Rota inválida.')
  if (method === 'POST' && path.length === 1)
    return { path: '/arquipelago/admin/desafios', body: CriarDesafioSchema.parse(body) }
  if (method === 'PUT' && path.length === 2)
    return {
      path: `/arquipelago/admin/desafios/${z.uuid().parse(id)}`,
      body: GravarDesafioSchema.parse(body),
    }
  if (
    method === 'POST' &&
    path.length === 3 &&
    ['analisar', 'publicar', 'arquivar', 'reativar'].includes(action ?? '')
  )
    return {
      path: `/arquipelago/admin/desafios/${z.uuid().parse(id)}/${action}`,
      body: AcaoComRevisaoSchema.parse(body),
    }
  throw new Error('Rota inválida.')
}
