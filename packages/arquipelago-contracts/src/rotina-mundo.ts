import { GELADEIRA_GUARDA } from './objetos'
import type { ProjetoAzul } from './salvamento'
export function capacidadeDaGeladeira(p: ProjetoAzul): number {
  return p.aparencia ? GELADEIRA_GUARDA.completa : GELADEIRA_GUARDA.holograma
}
export function guardadosNaGeladeira(p: ProjetoAzul): number {
  return Object.values(p.guardado ?? {}).reduce((a, b) => a + b, 0)
}
export function adicionarAoInventario(
  inv: Record<string, number>,
  id: string,
  qtd = 1,
): Record<string, number> {
  return { ...inv, [id]: Math.min(999, (inv[id] ?? 0) + qtd) }
}
/** O chamador confirma que o item é alimento. A rotina só produz os alimentos da horta. */
export function guardarAlimentoNaGeladeira(
  p: ProjetoAzul,
  inventario: Record<string, number>,
  item: string,
): { projeto: ProjetoAzul; inventario: Record<string, number> } | null {
  if ((inventario[item] ?? 0) < 1 || guardadosNaGeladeira(p) >= capacidadeDaGeladeira(p))
    return null
  const guardado = { ...(p.guardado ?? {}), [item]: (p.guardado?.[item] ?? 0) + 1 }
  const resto = (inventario[item] ?? 0) - 1
  const inv = { ...inventario }
  if (resto > 0) inv[item] = resto
  else delete inv[item]
  return { projeto: { ...p, guardado }, inventario: inv }
}
