/**
 * Onde cada desenho do jardim mora na folha `jardim-spritesheet.svg` (quadros de 64 × 64).
 *
 * A linha 0 é a folha original do Pinta e NÃO muda de lugar: o teste do projeto do curso lê
 * os seis quadros dela pela posição. Os desenhos novos (05/10/2026) moram nas linhas de baixo.
 * O gerador (`scripts/gerar-jardim-sprites.ts`) e o teste de deriva leem esta tabela.
 */
export const JARDIM_QUADROS = {
  coruja: { x: 0, y: 0 },
  pedras: { x: 64, y: 0 },
  arbusto: { x: 128, y: 0 },
  flores: { x: 192, y: 0 },
  raposa: { x: 256, y: 0 },
  coelho: { x: 320, y: 0 },
  gato: { x: 0, y: 64 },
  sapo: { x: 64, y: 64 },
  tartaruga: { x: 128, y: 64 },
  esquilo: { x: 192, y: 64 },
  toco: { x: 0, y: 128 },
  cogumelo: { x: 64, y: 128 },
  folhas: { x: 128, y: 128 },
} as const

export type JardimQuadroName = keyof typeof JARDIM_QUADROS

/** O tamanho da folha inteira: seis quadros de largura, três linhas. */
export const JARDIM_FOLHA_VIEWBOX = '0 0 384 192'

/** Lê os quadros da folha pelo `x` e `y` de cada `<svg>` aninhado. */
export function lerQuadrosDaFolha(folha: string): Map<string, string> {
  const quadros = new Map<string, string>()
  for (const m of folha.matchAll(
    /<svg x="(\d+)" y="(\d+)" width="64" height="64" viewBox="0 0 64 64">([\s\S]*?)<\/svg>/g,
  )) {
    quadros.set(`${m[1]},${m[2]}`, (m[3] ?? '').trim())
  }
  return quadros
}
