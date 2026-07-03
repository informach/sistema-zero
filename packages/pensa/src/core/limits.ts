/**
 * Limites compartilhados do NOME do projeto/jogo. O create (NewProjectDialog) e o
 * funil de identidade (IdentityPanel) usam o MESMO teto: a identidade RENOMEIA o
 * projeto (PATCH `/projects/:id {name}`), então nunca pode truncar para menos do
 * que o create permite — senão o nome canônico encolhe em silêncio. Espelha o
 * `name varchar(120)` + validação 2..120 do members.
 */
export const PENSA_NAME_MIN = 2
export const PENSA_NAME_MAX = 120
