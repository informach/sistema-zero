/**
 * Preços (Zappy) renderizados na UI kids que NÃO chegam pela view do servidor.
 * Espelham as constantes autoritativas do members (`domain/gamification/coins.ts`).
 * A conformidade é TRAVADA por teste — `packages/members/tests/unit/catalog-conformance.test.ts`
 * afirma a igualdade com o members, então um drift quebra o CI (≠ de um literal solto
 * no JSX, que mentiria em silêncio se o preço do members mudasse).
 */

/** Protetor de sequência COMPRÁVEL (espelha `STREAK_FREEZE_PRICE` do members). */
export const STREAK_FREEZE_PRICE = 80
