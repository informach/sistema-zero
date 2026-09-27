import {
  Armchair,
  BrainCircuit,
  Coins,
  Crown,
  Flame,
  Gamepad2,
  GraduationCap,
  Lightbulb,
  type LucideIcon,
  Medal,
  MessageCircle,
  MessagesSquare,
  PiggyBank,
  Play,
  Rocket,
  Shirt,
  Shuffle,
  Sparkles,
  Star,
  Swords,
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
  'plays-10': {
    title: 'Sucesso do Mural',
    description: 'Um jogo seu foi jogado 10 vezes!',
    icon: Play,
  },
  'plays-100': {
    title: 'Estrela do Mural',
    description: 'Um jogo seu foi jogado 100 vezes! Tem até troféu no seu quarto.',
    icon: Star,
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
    description: 'Você mandou bem na sua primeira atividade do Estúdio!',
    icon: Gamepad2,
  },
  'studio-master-3': {
    title: 'Oficina de jogos',
    description: 'Três atividades do Estúdio feitas com nota!',
    icon: Gamepad2,
  },
  'studio-master-10': {
    title: 'Mestre do Estúdio',
    description: 'Dez atividades do Estúdio com nota. Você é um game designer!',
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
    title: 'Plano aprovado',
    description: 'Você organizou e aprovou a Versão 1 do plano de um jogo!',
    icon: Rocket,
  },
  'pensa-creator-3': {
    title: 'Cabeça de criador',
    description: 'Três versões planejadas com o Pensa. Você pensa como gente grande!',
    icon: BrainCircuit,
  },
  'challenge-first': {
    title: 'Desafiante do mês',
    description: 'Você topou o Desafio do mês e mostrou o seu jogo!',
    icon: Swords,
  },
  'clube-primeiro-post': {
    title: 'Voz da turma',
    description: 'Você começou a sua primeira conversa no Clube dos Criadores!',
    icon: MessagesSquare,
  },
  'challenge-3': {
    title: 'Desafiante',
    description: 'Você participou de 3 Desafios do mês. Que garra!',
    icon: Swords,
  },
  'remix-first': {
    title: 'Remixador(a)',
    description: 'Você fez a sua versão de um jogo do Mural!',
    icon: Shuffle,
  },
  'room-decorator-5': {
    title: 'Decorador(a)',
    description: 'Cinco itens novos no seu quarto. Tá ficando lindo!',
    icon: Armchair,
  },
  'avatar-style-5': {
    title: 'Cheio de Estilo',
    description: 'Cinco peças novas no seu avatar. Que visual!',
    icon: Shirt,
  },
  'mural-commenter-10': {
    title: 'Bom de Papo',
    description: 'Dez comentários seus aprovados no Mural. Os colegas adoram!',
    icon: MessageCircle,
  },
}

/** Slug desconhecido (badge nova do backend antes do deploy daqui) → `null` = a UI ignora. */
export function badgeInfo(slug: string): BadgeInfo | null {
  return (BADGE_INFO as Record<string, BadgeInfo | undefined>)[slug] ?? null
}

/** Fundo e tinta do ladrilho de uma conquista. */
export interface BadgeTone {
  fundo: string
  tinta: string
}

const TOM_AZUL: BadgeTone = { fundo: 'var(--tool-estudio)', tinta: 'var(--tool-estudio-fg)' }
const TOM_AMBAR: BadgeTone = { fundo: 'var(--tool-pensa)', tinta: 'var(--tool-pensa-fg)' }
const TOM_ROXO: BadgeTone = { fundo: 'var(--tool-molda)', tinta: 'var(--tool-molda-fg)' }
const TOM_CORAL: BadgeTone = { fundo: 'var(--tool-pinta)', tinta: 'var(--tool-pinta-fg)' }
const TOM_VERDE: BadgeTone = {
  fundo: 'var(--sz-kids-verde-profundo)',
  tinta: 'var(--sz-tool-on-sig)',
}

const TOM_DO_MURAL = new Set(['first-showcase', 'remix-first', 'mural-commenter-10'])

/**
 * A cor do LADRILHO de uma conquista nos "Feitos da jornada" do Meu perfil (telas-modelo
 * de 11/09/2026: cada feito com o seu quadrado colorido). Os pares são os das oficinas,
 * que já passam AA (tinta escura no âmbar), e o verde é o profundo da paleta, fundo que
 * não segue o tema. A cor sai da FAMÍLIA do slug, para uma conquista nova já nascer
 * colorida sem ninguém lembrar de pintá-la: fogo em coral, nota e ideia em âmbar, Mural e
 * enfeites em roxo, Clube em verde, aula, curso e Estúdio em azul.
 */
export function badgeTone(slug: string): BadgeTone {
  if (slug.startsWith('streak-')) return TOM_CORAL
  if (slug.startsWith('quiz-') || slug.startsWith('pensa-') || slug.startsWith('coins-')) {
    return TOM_AMBAR
  }
  if (slug.startsWith('clube-')) return TOM_VERDE
  if (
    TOM_DO_MURAL.has(slug) ||
    slug.startsWith('plays-') ||
    slug.startsWith('challenge-') ||
    slug.startsWith('room-') ||
    slug.startsWith('avatar-')
  ) {
    return TOM_ROXO
  }
  return TOM_AZUL
}
