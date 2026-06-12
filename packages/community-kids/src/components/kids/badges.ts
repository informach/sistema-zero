import { Crown, Flame, GraduationCap, type LucideIcon, Medal, Sparkles, Target } from 'lucide-react'
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
}

/** Slug desconhecido (badge nova do backend antes do deploy daqui) → `null` = a UI ignora. */
export function badgeInfo(slug: string): BadgeInfo | null {
  return (BADGE_INFO as Record<string, BadgeInfo | undefined>)[slug] ?? null
}
