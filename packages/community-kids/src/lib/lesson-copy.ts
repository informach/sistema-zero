/**
 * O vocabulário das telas de aula do Kids (fase, parte, equipe, Mapa da Aventura) mora no
 * member-shell desde 06/10/2026, em `lib/lesson-copy-kids.ts`: o Admin também precisa dele, para a
 * prévia e o ensaio de uma aula de curso kids mostrarem o que a criança lê. Este arquivo só o
 * reexporta, para o código do app continuar importando de `@/lib/lesson-copy`.
 */
export {
  conclusaoRecusada,
  KIDS_LESSON_COPY,
  PALAVRAS_DA_ESCOLA,
} from '@sistemazero/member-shell/lib/lesson-copy-kids'
