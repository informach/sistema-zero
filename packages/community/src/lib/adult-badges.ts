import { BADGE_INFO, type BadgeInfo } from '@sistemazero/member-shell/lib/badge-info'
import type { BadgeSlug } from '@sistemazero/member-shell/lib/types'

/**
 * As conquistas na voz da comunidade ADULTA (direção de arte de 18/10/2026): sem "fase",
 * "aventura" nem "quarto", e a frase sem sujeito ("Publicou…"), que serve tanto na página de
 * progresso de quem conquistou quanto no perfil público. As do Mural ficam com o nome, porque o
 * adulto também chama a vitrine de Mural. O ÍCONE é o do Kids (`BADGE_INFO` do member-shell); só o
 * texto é daqui. `Record` completo: slug novo no members sem entrada aqui é erro de tipo.
 */
const ADULT_BADGE_COPY: Record<BadgeSlug, { title: string; description: string }> = {
  'first-lesson': {
    title: 'Primeira aula',
    description: 'Concluiu a primeira aula.',
  },
  'first-showcase': {
    title: 'Meu primeiro jogo',
    description: 'Publicou o primeiro jogo no Mural.',
  },
  'plays-10': {
    title: 'Sucesso do Mural',
    description: 'Um jogo publicado foi jogado 10 vezes.',
  },
  'plays-100': {
    title: 'Estrela do Mural',
    description: 'Um jogo publicado foi jogado 100 vezes.',
  },
  'streak-7': {
    title: '7 dias seguidos',
    description: 'Estudou ou criou por uma semana sem parar.',
  },
  'streak-30': {
    title: '30 dias seguidos',
    description: 'Estudou ou criou por um mês sem parar.',
  },
  'streak-60': {
    title: '60 dias seguidos',
    description: 'Estudou ou criou por 60 dias sem parar.',
  },
  'streak-180': {
    title: '6 meses seguidos',
    description: 'Estudou ou criou por seis meses sem parar.',
  },
  'streak-365': {
    title: 'Um ano seguido',
    description: 'Estudou ou criou por um ano sem parar.',
  },
  'course-complete': {
    title: 'Curso concluído',
    description: 'Terminou todas as aulas de um curso.',
  },
  'course-complete-2': {
    title: 'Dois cursos concluídos',
    description: 'Terminou todas as aulas de dois cursos.',
  },
  'course-complete-3': {
    title: 'Três cursos concluídos',
    description: 'Terminou todas as aulas de três cursos.',
  },
  'quiz-perfect': {
    title: 'Na mosca',
    description: 'Acertou todas as perguntas de um quiz.',
  },
  'quiz-perfect-10': {
    title: '10 vezes na mosca',
    description: 'Acertou todas as perguntas em 10 quizzes.',
  },
  'quiz-perfect-30': {
    title: '30 vezes na mosca',
    description: 'Acertou todas as perguntas em 30 quizzes.',
  },
  'studio-first': {
    title: 'Criador de jogos',
    description: 'Cumpriu os objetivos do Estúdio em uma aula.',
  },
  'studio-master-3': {
    title: 'Oficina de jogos',
    description: 'Cumpriu os objetivos do Estúdio em três aulas.',
  },
  'studio-master-10': {
    title: 'Mestre do Estúdio',
    description: 'Cumpriu os objetivos do Estúdio em dez aulas.',
  },
  'coins-saver-300': {
    title: 'Reserva de moedas',
    description: 'Juntou 300 moedas.',
  },
  'coins-saver-1000': {
    title: 'Mil moedas',
    description: 'Juntou mil moedas.',
  },
  'pensa-first-idea': {
    title: 'Primeira ideia',
    description: 'Clareou a primeira ideia de jogo no Pensa.',
  },
  'pensa-first-launch': {
    title: 'Plano aprovado',
    description: 'Concluiu o primeiro projeto com o Pensa.',
  },
  'pensa-creator-3': {
    title: 'Três planos',
    description: 'Concluiu três projetos com o Pensa.',
  },
  'challenge-first': {
    title: 'Desafio do mês',
    description: 'Participou do Desafio do mês com um jogo.',
  },
  'clube-primeiro-post': {
    title: 'Primeira conversa',
    description: 'Começou a primeira conversa no Clube dos Criadores.',
  },
  'challenge-3': {
    title: 'Três desafios',
    description: 'Participou de 3 Desafios do mês.',
  },
  'remix-first': {
    title: 'Primeira versão',
    description: 'Fez a própria versão de um jogo do Mural.',
  },
  'room-decorator-5': {
    title: 'Espaço decorado',
    description: 'Colocou cinco itens novos no espaço 3D.',
  },
  'avatar-style-5': {
    title: 'Visual novo',
    description: 'Juntou cinco peças novas no avatar.',
  },
  'mural-commenter-10': {
    title: 'Bom de conversa',
    description: 'Teve dez comentários aprovados no Mural.',
  },
  'live-first-encounter': {
    title: 'Primeiro encontro ao vivo',
    description: 'Entrou no primeiro encontro ao vivo de uma oficina.',
  },
  'live-course-complete': {
    title: 'Oficina completa',
    description: 'Terminou todas as aulas de uma oficina ao vivo.',
  },
}

/** A conquista com o texto adulto e o ícone de sempre; slug desconhecido → `null` (a UI ignora). */
export function adultBadgeInfo(slug: string): BadgeInfo | null {
  const copy = (
    ADULT_BADGE_COPY as Record<string, { title: string; description: string } | undefined>
  )[slug]
  const base = (BADGE_INFO as Record<string, BadgeInfo | undefined>)[slug]
  if (!copy || !base) return null
  return { ...copy, icon: base.icon }
}
