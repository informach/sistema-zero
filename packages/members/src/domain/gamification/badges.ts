/**
 * Catálogo de badges EM CÓDIGO (decisão 06/2026): o preDeploy de produção roda
 * só `db:migrate` (seed nunca chegaria a prod) e o catálogo muda JUNTO com o
 * código que o detecta — deploy atômico, sem drift catálogo×detecção. Persiste
 * só `user_badges` (quem destravou o quê); título/ícone/copy são apresentação
 * e vivem no app (community-kids).
 */
export const BADGE_SLUGS = [
  'first-lesson',
  // 1º jogo publicado no Mural (marco `course_showcased` — UNIVERSAL: todo comprador
  // de curso alcança pelo Compartilhar da última aula). 07/2026, lote troféus.
  'first-showcase',
  // Um jogo SEU foi jogado 10×/100× no /jogar público (marcos `play_milestone_10/100`
  // do hub — UNIVERSAIS: publicar pelo curso já gera playId; anti-farm natural, exige
  // volume real de outras pessoas). Retenção pós-cursos 07/2026; a de 100 dá troféu.
  'plays-10',
  'plays-100',
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
  // First accepted definition and first/third verified project. Slugs stay stable.
  'pensa-first-idea',
  'pensa-first-launch',
  'pensa-creator-3',
  // Participação no Desafio do mês (game jam — ledger `challenge_entry`): 1ª e 3ª. 07/2026.
  'challenge-first',
  'challenge-3',
  // 1ª conversa aprovada no Clube dos Criadores (ledger `clube_thread`). 07/2026.
  'clube-primeiro-post',
  'coins-saver-300',
  'coins-saver-1000',
  // Full review 24/07 — celebrar criação/personalização/apoio aos colegas:
  // 1º remix de um jogo do Mural (ledger `studio_remix` — bônus do Estúdio).
  'remix-first',
  // 5 itens do quarto conquistados (ledger `room_item_buy` — universal, sink de Zappy).
  'room-decorator-5',
  // 5 peças do avatar conquistadas (ledger `avatar_part_buy` — universal).
  'avatar-style-5',
  // 10 comentários APROVADOS no Mural (ledger `mural_comment` — bônus do Mural).
  'mural-commenter-10',
  // Cursos AO VIVO (14/10/2026): 1º encontro em que a criança foi recebida (ledger
  // `live_encounter`) e "Oficina completa" — todas as aulas publicadas de um curso ao vivo
  // concluídas (ledger `live_course_complete`, dá o troféu `trofeu-oficina-completa`).
  // Bônus de produto: só quem tem vaga numa turma alcança. Nenhuma das duas mexe na Jornada.
  'live-first-encounter',
  'live-course-complete',
] as const

export type BadgeSlug = (typeof BADGE_SLUGS)[number]

/**
 * Conquistas que só aparecem DEPOIS de ganhas: as das oficinas ao vivo (14/10/2026). As oficinas
 * não são divulgadas fora delas (decisão da dona), então a vitrine de conquistas e a bandeja de
 * troféus do quarto não mostram a versão travada para quem nunca teve vaga.
 */
export const HIDDEN_UNTIL_UNLOCKED_BADGES: ReadonlySet<BadgeSlug> = new Set<BadgeSlug>([
  'live-first-encounter',
  'live-course-complete',
])
