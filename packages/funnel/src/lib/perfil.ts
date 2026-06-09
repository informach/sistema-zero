// Perfis do diagnóstico (motor de pontuação). O perfil vence o quiz e viaja pela
// URL até o hero da /oferta (`?perfil=`). Client-safe (sem dependência de servidor).

export const PERFIS = [
  'ideia_parada',
  'criando_no_escuro',
  'refem_ajustes',
  'sem_criterio',
] as const

export type Perfil = (typeof PERFIS)[number]

/** Valida o `?perfil=` da URL (acesso direto / valor inesperado → não é perfil). */
export function isPerfil(value: unknown): value is Perfil {
  return typeof value === 'string' && (PERFIS as readonly string[]).includes(value)
}

/** Rótulos curtos para exibição (aba PERFIS do admin). */
export const PERFIL_LABELS: Record<Perfil, string> = {
  ideia_parada: 'Ideia Parada',
  criando_no_escuro: 'Criando no Escuro',
  refem_ajustes: 'Refém dos Ajustes',
  sem_criterio: 'Sem Critério',
}
