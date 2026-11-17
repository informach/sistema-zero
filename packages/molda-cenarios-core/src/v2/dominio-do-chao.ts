import type { BaseDeCenario } from './documento'
import { CELULAS_DA_PECA } from './terreno'

type Ponto = { x: number; z: number }
/** Inclui a borda do recorte: a margem retirada não vira solo para o pincel ou a cápsula. */
function noPoligono(p: Ponto, vertices: readonly Ponto[]) {
  let dentro = false
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[j]!,
      b = vertices[i]!,
      dx = b.x - a.x,
      dz = b.z - a.z
    if (
      Math.abs((p.x - a.x) * dz - (p.z - a.z) * dx) < 1e-9 &&
      p.x >= Math.min(a.x, b.x) - 1e-9 &&
      p.x <= Math.max(a.x, b.x) + 1e-9 &&
      p.z >= Math.min(a.z, b.z) - 1e-9 &&
      p.z <= Math.max(a.z, b.z) + 1e-9
    )
      return true
    if (a.z > p.z !== b.z > p.z && p.x < a.x + ((p.z - a.z) * dx) / dz) dentro = !dentro
  }
  return dentro
}

/** Domínio de solo autoral. Ausência de peça e fundo visual não contam como chão disponível. */
export function dominioDoChao(base: BaseDeCenario): (p: Ponto) => boolean {
  if (base.tipo === 'perfil') return () => false // Converter o perfil antes de pintar sobre alturas reais.
  if (base.tipo === 'plano')
    return (p) =>
      Number.isFinite(p.x) &&
      Number.isFinite(p.z) &&
      Math.abs(p.x) <= base.largura / 2 &&
      Math.abs(p.z) <= base.comprimento / 2
  const pecas = new Set(base.pecas.map((p) => `${p.coluna}:${p.linha}`)),
    maxColuna = base.colunas / CELULAS_DA_PECA - 1,
    maxLinha = base.linhas / CELULAS_DA_PECA - 1
  return (p) => {
    const x = (p.x - base.origem.x) / base.passo,
      z = (p.z - base.origem.z) / base.passo
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(z) ||
      x < 0 ||
      z < 0 ||
      x > base.colunas ||
      z > base.linhas
    )
      return false
    const coluna = Math.min(maxColuna, Math.floor(x / CELULAS_DA_PECA)),
      linha = Math.min(maxLinha, Math.floor(z / CELULAS_DA_PECA))
    return (
      pecas.has(`${coluna}:${linha}`) &&
      !(base.recortes ?? []).some((poligono) => noPoligono(p, poligono))
    )
  }
}
