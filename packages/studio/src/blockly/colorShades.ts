/**
 * Tons de uma cor base — para colorir as SUB-categorias como VARIAÇÕES da cor da
 * categoria-mãe (a cor diz a que categoria o bloco pertence, estilo MakeCode).
 * Módulo PURO (sem Blockly) de propósito: as extensões reusam sem puxar o motor.
 */

/** Mistura dois hex `#rrggbb` por t∈[0,1] (0 → a, 1 → b). */
function mixHex(a: string, b: string, t: number): string {
  const ca = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16))
  const cb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16))
  const out = ca.map((v, i) => Math.round(v + ((cb[i] ?? 0) - v) * t))
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/**
 * N TONS da MESMA cor base (mesma matiz), do mais claro ao mais escuro — para as
 * SUB-categorias. Mudar a cor base re-deriva todos os tons automaticamente.
 */
export function categoryShades(base: string, count: number): string[] {
  if (count <= 1) return [base]
  // VIÉS ESCURO: do POUCO mais claro (+6%) ao bem mais escuro (−34%). O texto dos
  // blocos é BRANCO (CSS .blocklyText) — então os tons NÃO podem clarear demais,
  // senão somem. Indo quase só p/ o escuro, todo tom contrasta com a letra branca.
  return Array.from({ length: count }, (_, i) => {
    const t = 0.06 - (i / (count - 1)) * 0.4
    return t >= 0 ? mixHex(base, '#ffffff', t) : mixHex(base, '#000000', -t)
  })
}
