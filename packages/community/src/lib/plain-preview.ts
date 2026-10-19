/**
 * A fala da equipe chega em markdown; na prévia de uma ou duas linhas (lista de Recados, cartão do
 * Início) só o texto importa. Puro: serve ao servidor e ao cliente.
 */
export function plainPreview(text: string): string {
  return text
    .replace(/^\s*(#{1,3}|>|[-*]|\d+\.)\s+/gm, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
