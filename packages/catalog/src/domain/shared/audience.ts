import { ValidationError } from './errors'

export const CATALOG_AUDIENCES = ['kids', 'adult'] as const
export type CatalogAudience = (typeof CATALOG_AUDIENCES)[number]

/** Sem inferência por título, SKU ou fallback para registros não classificados. */
export function catalogAudience(value: unknown): CatalogAudience {
  if (value === 'kids' || value === 'adult') return value
  throw new ValidationError('A comunidade do catálogo deve ser Kids ou Adultos.')
}
