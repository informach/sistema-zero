/**
 * Visitante do Mural adulto (20/10/2026): quem recebeu o presente fica, depois dos 7 dias, com a
 * chave de visitante, e o hub devolve `canInteract: false` (vê e joga, sem publicar, comentar nem
 * reagir). Só vale quando o hub respondeu e disse isso com todas as letras: com o hub fora, a
 * página segue como sempre e quem decide no clique é o próprio hub (403).
 */
export function muralVisitor(
  space: { status: number; body?: { canInteract?: boolean } | null } | null | undefined,
): boolean {
  return space?.status === 200 && space.body?.canInteract === false
}
