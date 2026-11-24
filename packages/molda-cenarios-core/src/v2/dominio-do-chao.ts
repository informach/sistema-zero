import { pontoNoPoligono } from '../poligonos'
import type { BaseDeCenario } from './documento'
import { type BaseDeTerreno, CELULAS_DA_PECA } from './terreno'

type Ponto = { x: number; z: number }
type TerrenoParaDominio = Pick<
  BaseDeTerreno,
  'origem' | 'passo' | 'colunas' | 'linhas' | 'recortes'
> & {
  cobertura?: 'grade' | 'pecas'
  pecas: readonly { coluna: number; linha: number }[]
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
  return dominioDoTerreno(base)
}

/** Domínio compartilhado com cenas compiladas, sem exigir hashes de autoria para consultar o chão. */
export function dominioDoTerreno(base: TerrenoParaDominio): (p: Ponto) => boolean {
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
      (base.cobertura === 'grade' || pecas.has(`${coluna}:${linha}`)) &&
      !(base.recortes ?? []).some((poligono) => pontoNoPoligono(p, poligono))
    )
  }
}
