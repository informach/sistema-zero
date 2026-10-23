/** As subpáginas de `/pro/comunidade-dos-criadores/oferta/<id>` (a página principal é a `/oferta`). */
export const COMUNIDADE_ADULTO_SUBPAGINAS = ['continuar'] as const
export type ComunidadeAdultoSubpagina = (typeof COMUNIDADE_ADULTO_SUBPAGINAS)[number]

export function isComunidadeAdultoSubpagina(value: unknown): value is ComunidadeAdultoSubpagina {
  return (
    typeof value === 'string' && (COMUNIDADE_ADULTO_SUBPAGINAS as readonly string[]).includes(value)
  )
}
