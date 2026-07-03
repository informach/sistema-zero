import {
  BrainCircuit,
  Coins,
  Crown,
  Flame,
  Gamepad2,
  GraduationCap,
  Lightbulb,
  type LucideIcon,
  Medal,
  PiggyBank,
  Rocket,
  Sparkles,
  Target,
} from 'lucide-react'
import type { BadgeSlug } from '@/lib/types'

/**
 * Apresentação das badges (copy kids + ícone) — o CATÁLOGO (slugs/detecção)
 * vive no members (`domain/gamification/badges.ts`); aqui é só como exibir.
 */
export interface BadgeInfo {
  title: string
  description: string
  icon: LucideIcon
}

export const BADGE_INFO: Record<BadgeSlug, BadgeInfo> = {
  'first-lesson': {
    title: 'Primeiro passo',
    description: 'Você concluiu a sua primeira aula!',
    icon: Sparkles,
  },
  'first-showcase': {
    title: 'Meu primeiro jogo',
    description: 'Você publicou o seu primeiro jogo no Mural! Tem até troféu no seu quarto.',
    icon: Gamepad2,
  },
  'streak-7': {
    title: 'Semana em chamas',
    description: '7 dias seguidos aprendendo!',
    icon: Flame,
  },
  'streak-30': {
    title: 'Mês lendário',
    description: '30 dias seguidos aprendendo!',
    icon: Flame,
  },
  'streak-60': {
    title: '60 dias de fogo',
    description: '60 dias seguidos aprendendo!',
    icon: Flame,
  },
  'streak-180': {
    title: 'Meio ano em chamas',
    description: '6 meses seguidos aprendendo!',
    icon: Flame,
  },
  'streak-365': {
    title: 'Um ano lendário',
    description: '365 dias seguidos aprendendo!',
    icon: Flame,
  },
  'course-complete': {
    title: 'Curso completo',
    description: 'Você terminou um curso inteirinho!',
    icon: GraduationCap,
  },
  'course-complete-2': {
    title: 'Dupla de cursos',
    description: 'Dois cursos completos!',
    icon: Medal,
  },
  'course-complete-3': {
    title: 'Trio de cursos',
    description: 'Três cursos completos. Imparável!',
    icon: Crown,
  },
  'quiz-perfect': {
    title: 'Nota mil',
    description: 'Tirou 100% em um quiz!',
    icon: Target,
  },
  'quiz-perfect-10': {
    title: '10 notas mil',
    description: 'Tirou 100% em 10 quizzes!',
    icon: Medal,
  },
  'quiz-perfect-30': {
    title: '30 notas mil',
    description: 'Tirou 100% em 30 quizzes. Mestre!',
    icon: Crown,
  },
  'studio-first': {
    title: 'Criador de jogos',
    description: 'Você criou o seu primeiro projeto no Estúdio!',
    icon: Gamepad2,
  },
  'studio-master-3': {
    title: 'Oficina de jogos',
    description: 'Três projetos criados no Estúdio!',
    icon: Gamepad2,
  },
  'studio-master-10': {
    title: 'Mestre do Estúdio',
    description: 'Dez projetos criados. Você é um game designer!',
    icon: Crown,
  },
  'coins-saver-300': {
    title: 'Cofrinho cheio',
    description: 'Você já juntou 300 moedas Zappy!',
    icon: Coins,
  },
  'coins-saver-1000': {
    title: 'Magnata Zappy',
    description: 'Mil moedas Zappy conquistadas. Uau!',
    icon: PiggyBank,
  },
  'pensa-first-idea': {
    title: 'Ideia brilhante',
    description: 'Você clareou a sua primeira ideia no Pensa!',
    icon: Lightbulb,
  },
  'pensa-first-launch': {
    title: 'Grande lançamento',
    description: 'Você planejou, construiu e lançou a Versão 1 de um jogo!',
    icon: Rocket,
  },
  'pensa-creator-3': {
    title: 'Cabeça de criador',
    description: 'Três versões lançadas com o Pensa. Você pensa como gente grande!',
    icon: BrainCircuit,
  },
}

/** Slug desconhecido (badge nova do backend antes do deploy daqui) → `null` = a UI ignora. */
export function badgeInfo(slug: string): BadgeInfo | null {
  return (BADGE_INFO as Record<string, BadgeInfo | undefined>)[slug] ?? null
}
