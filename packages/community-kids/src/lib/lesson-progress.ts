import type { SectionProgressView } from '@sistemazero/core/learning'

/** Onde a criança está no percurso da aula (o player de seções avisa). */
export interface PosicaoNaAula {
  index: number
  total: number
}

/** Uma atividade obrigatória da aula (a forma do `lessonCompletionRequirements`). */
export interface AtividadeDaAula {
  complete: boolean
}

export interface VistaProgressoAula {
  percent: number
  /** O número em negrito ao lado da barra. `null` = sem número (nada a contar). */
  numero: string | null
  /** O que o leitor de tela lê (`aria-valuetext`) e a região viva anuncia. */
  texto: string
  /** `false` quando não há nada a medir: o player desenha só o espaçador. */
  medivel: boolean
}

const VAZIO: VistaProgressoAula = { percent: 0, numero: null, texto: '', medivel: false }

/**
 * A barra do topo da aula, em três degraus — o primeiro que se aplica vence.
 *
 * 1. `sectionProgress`: o progresso CONFERIDO no servidor. É a primeira escolha e
 *    continua sendo a única que fala de conclusão.
 * 2. Sem ele, com 2+ seções: a POSIÇÃO no percurso. O members não manda
 *    `sectionProgress` para conta de EQUIPE (`privileged`) nem para aula em que
 *    nenhuma seção tem critério de conclusão, e antes disso a barra sumia calada —
 *    com o esqueleto reservando o espaço dela, sobrava um vão no cartão do topo.
 * 3. Sem ele e com uma seção só (é o caso de TODA aula legada: a migration 0080
 *    agrupou os blocos antigos numa seção sem critérios): as atividades
 *    obrigatórias, que é o que sobra de verdadeiro para medir ali.
 *
 * Sem nenhuma atividade obrigatória no degrau 3 não há o que medir, e a barra não
 * inventa número: o caminho é organizar a aula em seções no "Percurso da aula".
 */
export function vistaProgressoAula(
  progress: SectionProgressView | undefined,
  posicao: PosicaoNaAula | null,
  atividades: readonly AtividadeDaAula[] = [],
): VistaProgressoAula {
  if (progress)
    return {
      percent: progress.percent,
      numero: `${Math.round(progress.percent)}%`,
      texto: `${progress.completed} de ${progress.total} seções concluídas`,
      medivel: true,
    }
  if (posicao && posicao.total > 1) {
    const rotulo = `Seção ${posicao.index + 1} de ${posicao.total}`
    return {
      percent: ((posicao.index + 1) / posicao.total) * 100,
      numero: rotulo,
      texto: rotulo,
      medivel: true,
    }
  }
  if (atividades.length === 0) return VAZIO
  const feitas = atividades.filter((a) => a.complete).length
  const uma = atividades.length === 1
  const rotulo = `${feitas} de ${atividades.length} ${uma ? 'atividade' : 'atividades'}`
  return {
    percent: (feitas / atividades.length) * 100,
    numero: rotulo,
    texto: `${rotulo} ${uma ? 'concluída' : 'concluídas'} nesta aula`,
    medivel: true,
  }
}
