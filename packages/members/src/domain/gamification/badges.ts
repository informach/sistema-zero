/**
 * Catálogo de badges EM CÓDIGO (decisão 06/2026): o preDeploy de produção roda
 * só `db:migrate` (seed nunca chegaria a prod) e o catálogo muda JUNTO com o
 * código que o detecta — deploy atômico, sem drift catálogo×detecção. Persiste
 * só `user_badges` (quem destravou o quê); título/ícone/copy são apresentação
 * e vivem no app (community-kids).
 */
export const BADGE_SLUGS = [
  'first-lesson',
  'streak-7',
  'streak-30',
  'streak-60',
  'streak-180',
  'streak-365',
  'course-complete',
  'course-complete-2',
  'course-complete-3',
  'quiz-perfect',
  'quiz-perfect-10',
  'quiz-perfect-30',
  // Maestria (06/2026): projetos do Estúdio aprovados + poupador de moedas Zappy.
  'studio-first',
  'studio-master-3',
  'studio-master-10',
  'coins-saver-300',
  'coins-saver-1000',
] as const

export type BadgeSlug = (typeof BADGE_SLUGS)[number]
