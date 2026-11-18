import { alturaDoCampo } from '../v2/campo-de-alturas'
import { dominioDoTerreno } from '../v2/dominio-do-chao'
import { pontoNoBuraco } from '../v2/pintura-de-chao'
import { CELULAS_DA_PECA, type FonteDeAlturas, TerrenoInvalido } from '../v2/terreno'
import { type TerrenoCompilado, TerrenoCompiladoSchema } from './schema-metadados'

/** Consulta os dados físicos conferidos, sem reconstruir a autoria nem gerar outra malha.
 * Usa a mesma interpolação triangular e domínio do terreno original. */
export function criarFonteDeAlturasCompilada(
  entrada: TerrenoCompilado,
  alturas: Float32Array,
  mascara?: Uint8Array,
): FonteDeAlturas {
  const t = TerrenoCompiladoSchema.parse(entrada),
    n = (t.colunas + 1) * (t.linhas + 1)
  if (alturas.length !== n || (mascara && mascara.length !== t.colunas * t.linhas))
    throw new TerrenoInvalido('Os dados físicos compilados não correspondem à grade.')
  const min = Math.fround(t.min),
    max = Math.fround(t.max)
  if (
    alturas.some((h) => !Number.isFinite(h) || h < min || h > max) ||
    mascara?.some((v) => v !== 0 && v !== 1)
  )
    throw new TerrenoInvalido('Os dados físicos compilados possuem valores inválidos.')
  // Cópias pertencem à consulta; o consumidor não pode alterar a física pelo inventário.
  const campo = { ...t, alturas: alturas.slice() },
    buracos = mascara
      ? { colunas: t.colunas, linhas: t.linhas, celulas: mascara.slice() }
      : undefined,
    dominio = dominioDoTerreno(t),
    largura = t.colunas / CELULAS_DA_PECA,
    pecas = new Set(t.pecas.map((p) => p.linha * largura + p.coluna)),
    fonte: FonteDeAlturas = (x, z) => {
      const gx = (x - t.origem.x) / t.passo,
        gz = (z - t.origem.z) / t.passo
      if (!Number.isFinite(gx) || !Number.isFinite(gz))
        throw new TerrenoInvalido('O ponto de consulta do terreno é inválido')
      if (gx < 0 || gz < 0 || gx > t.colunas || gz > t.linhas) return t.fundo
      const coluna = Math.min(largura - 1, Math.floor(gx / CELULAS_DA_PECA)),
        linha = Math.min(t.linhas / CELULAS_DA_PECA - 1, Math.floor(gz / CELULAS_DA_PECA))
      if (!pecas.has(linha * largura + coluna)) return t.fundo
      return alturaDoCampo(campo, x, z)
    }
  fonte.temChao = (p) => dominio(p) && !(buracos && pontoNoBuraco(t, buracos, p.x, p.z))
  return fonte
}
