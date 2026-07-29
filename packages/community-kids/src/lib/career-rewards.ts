import type { StudentLevelSlug } from './types'

export interface CareerRewardInfo {
  title: string
  description: string
}

/** Textos de apresentação; a matriz técnica continua centralizada no core. */
export const CAREER_REWARD_INFO: Record<StudentLevelSlug, CareerRewardInfo> = {
  noob: {
    title: 'Estúdio dentro das aulas',
    description: 'Aprenda com ferramentas escolhidas para cada missão.',
  },
  coder: {
    title: 'Estúdio livre + Jogo 2D Essencial',
    description: 'Crie seus primeiros jogos por conta própria com um conjunto simples de peças.',
  },
  hacker: {
    title: 'Jogo 2D Iniciante completo',
    description: 'Use livremente todas as ferramentas aprendidas nos cursos Iniciante 2D.',
  },
  explorer: {
    title: 'Jogo 3D Iniciante',
    description: 'Leve suas criações para a terceira dimensão.',
  },
  elite: {
    title: 'Jogo 2D Intermediário + modo Ponte',
    description: 'Veja blocos e código trabalhando juntos e crie jogos 2D mais completos.',
  },
  architect: {
    title: 'Mundo 3D Intermediário',
    description: 'Construa cenários e experiências 3D com ferramentas intermediárias.',
  },
  champion: {
    title: 'Jogo 2D Avançado',
    description: 'Use sistemas avançados para ampliar seus jogos 2D.',
  },
  god: {
    title: 'Jogo 3D Avançado + Pro',
    description: 'Crie projetos Pro e promova um jogo de blocos para continuar pelo código.',
  },
}

export function careerRewardInfo(slug: string | undefined): CareerRewardInfo {
  return CAREER_REWARD_INFO[slug as StudentLevelSlug] ?? CAREER_REWARD_INFO.noob
}
