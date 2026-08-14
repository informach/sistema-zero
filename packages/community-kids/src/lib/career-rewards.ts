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
  // ⚠️ A Ponte saiu do Mestre e foi para o Gênio (core, 26/07) e o kit Jogo 3D Avançado
  // entrou já no Arquiteto. A copy ficou para trás e prometia o que o Estúdio não entrega.
  // `tests/career-rewards-conformance.test.ts` trava os dois contra o core.
  elite: {
    title: 'Jogo 2D Intermediário',
    description: 'Crie jogos 2D mais completos com as ferramentas intermediárias.',
  },
  architect: {
    title: 'Mundo 3D + Jogo 3D Avançado',
    description: 'Construa cenários e experiências 3D com ferramentas intermediárias.',
  },
  champion: {
    title: 'Jogo 2D Avançado + modo Ponte',
    description: 'Use sistemas avançados e veja blocos e código trabalhando juntos.',
  },
  god: {
    title: 'Jogo 3D Avançado + Pro',
    description: 'Crie projetos Pro e promova um jogo de blocos para continuar pelo código.',
  },
}

export function careerRewardInfo(slug: string | undefined): CareerRewardInfo {
  return CAREER_REWARD_INFO[slug as StudentLevelSlug] ?? CAREER_REWARD_INFO.noob
}
