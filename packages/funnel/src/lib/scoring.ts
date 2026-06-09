// Motor de pontuação do quiz (puro/testável). Roda ao concluir a P10: soma o peso
// de cada pergunta que pontua ao perfil da opção escolhida e devolve o vencedor.
// Pesos e mapa de opção→perfil são VERBATIM do briefing (P2, P7 e P10 não pontuam).

import { PERFIS, type Perfil } from './perfil'

/** Respostas (valor da opção: 'A'..'E') das perguntas que entram no diagnóstico. */
export interface ScoringAnswers {
  segmento?: string | null // P1 (peso 1)
  relacao_ia?: string | null // P3 (peso 1)
  ja_quebrou?: string | null // P4 (peso 1)
  trava_principal?: string | null // P5 (peso 2)
  custo_principal?: string | null // P6 (peso 1)
  mudanca_desejada?: string | null // P8 (peso 2)
  proximo_passo?: string | null // P9 (peso 1)
}

type OpcaoPerfilMap = Record<string, Perfil | undefined>

const MAP_P1: OpcaoPerfilMap = {
  A: 'ideia_parada',
  B: 'criando_no_escuro',
  C: 'refem_ajustes',
  D: 'sem_criterio',
}
const MAP_P3: OpcaoPerfilMap = {
  A: 'ideia_parada',
  B: 'criando_no_escuro',
  C: 'sem_criterio',
  D: 'refem_ajustes',
}
const MAP_P4: OpcaoPerfilMap = {
  A: 'criando_no_escuro',
  B: 'ideia_parada',
  C: 'sem_criterio',
  D: 'refem_ajustes',
}
const MAP_P5: OpcaoPerfilMap = {
  A: 'ideia_parada',
  B: 'criando_no_escuro',
  C: 'refem_ajustes',
  D: 'sem_criterio',
}
const MAP_P6: OpcaoPerfilMap = {
  A: 'ideia_parada',
  B: 'criando_no_escuro',
  C: 'refem_ajustes',
  D: 'sem_criterio',
  E: 'ideia_parada',
}
const MAP_P8: OpcaoPerfilMap = {
  A: 'ideia_parada',
  B: 'criando_no_escuro',
  C: 'refem_ajustes',
  D: 'sem_criterio',
}
const MAP_P9: OpcaoPerfilMap = {
  A: 'ideia_parada',
  B: 'criando_no_escuro',
  C: 'refem_ajustes',
  D: 'sem_criterio',
}

const SCORING: { answer: keyof ScoringAnswers; weight: number; map: OpcaoPerfilMap }[] = [
  { answer: 'segmento', weight: 1, map: MAP_P1 },
  { answer: 'relacao_ia', weight: 1, map: MAP_P3 },
  { answer: 'ja_quebrou', weight: 1, map: MAP_P4 },
  { answer: 'trava_principal', weight: 2, map: MAP_P5 },
  { answer: 'custo_principal', weight: 1, map: MAP_P6 },
  { answer: 'mudanca_desejada', weight: 2, map: MAP_P8 },
  { answer: 'proximo_passo', weight: 1, map: MAP_P9 },
]

/** Perfil de uma resposta (null se a opção não mapeia ou está ausente). */
function perfilDe(map: OpcaoPerfilMap, value?: string | null): Perfil | undefined {
  return value ? map[value] : undefined
}

/**
 * Perfil vencedor (maior soma). Empate no topo: 1) perfil da P5 (`trava_principal`),
 * 2) perfil da P1 (`segmento`), entre os empatados; 3) ordem canônica de `PERFIS`.
 */
export function computePerfil(answers: ScoringAnswers): Perfil {
  const scores: Record<Perfil, number> = {
    ideia_parada: 0,
    criando_no_escuro: 0,
    refem_ajustes: 0,
    sem_criterio: 0,
  }
  for (const q of SCORING) {
    const perfil = perfilDe(q.map, answers[q.answer])
    if (perfil) scores[perfil] += q.weight
  }

  const max = Math.max(...PERFIS.map((p) => scores[p]))
  const tied = PERFIS.filter((p) => scores[p] === max)
  if (tied.length === 1) return tied[0] as Perfil

  // Desempate 1: P5. Desempate 2: P1 (só vale se o perfil estiver entre os empatados).
  const p5 = perfilDe(MAP_P5, answers.trava_principal)
  if (p5 && tied.includes(p5)) return p5
  const p1 = perfilDe(MAP_P1, answers.segmento)
  if (p1 && tied.includes(p1)) return p1
  return tied[0] as Perfil
}
