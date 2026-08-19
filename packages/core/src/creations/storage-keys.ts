/**
 * Chaves dos objetos do "Guardado na sua conta" no R2 UGC — a ÚNICA definição, usada pelo
 * `members` (que deriva e devolve as chaves) e pelo `member-shell` (que confere no R2, no
 * commit, as partes que o cliente diz ter enviado). Uma mudança de layout aqui vale para os
 * dois ao mesmo tempo; nenhum manifesto carrega chave, então o layout pode mudar sem migrar
 * dados (só com deploy dos dois lados).
 */
export type CreationStorageTool = 'studio' | 'pinta'

/**
 * O blob principal (o item inteiro, ou o MANIFESTO quando há partes): imutável por revisão —
 * a revisão vem de um contador que nunca volta, então duas reservas nunca dividem chave.
 */
export function creationStorageKey(
  userId: string,
  tool: CreationStorageTool,
  itemId: string,
  revision: number,
): string {
  return `creations/${userId}/${tool}/${itemId}/${revision}.json.gz`
}

/**
 * Uma PARTE (asset do Estúdio endereçado por conteúdo), por item, por conteúdo (SHA-256 hex do
 * JSON canônico) e pela revisão da reserva em que ESSA cópia subiu: uma chave nunca é
 * reutilizada, então o apagar best-effort de uma parte solta jamais alcança uma cópia nova da
 * mesma parte que voltou ao item.
 */
export function creationPartStorageKey(
  userId: string,
  tool: CreationStorageTool,
  itemId: string,
  hash: string,
  rev: number,
): string {
  return `creations/${userId}/${tool}/${itemId}/parts/${hash}.${rev}.gz`
}
