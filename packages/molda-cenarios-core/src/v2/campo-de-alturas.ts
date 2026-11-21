import { interpolarAlturasDaCelula } from './interpolacao-de-alturas'
import {
  AMOSTRAS_DA_PECA,
  type BaseDeTerreno,
  BaseDeTerrenoSchema,
  CELULAS_DA_PECA,
  LADO_DAS_AMOSTRAS,
  type PecaDeAlturas,
  pecasConferidasDaBase,
  TerrenoInvalido,
} from './terreno'

/**
 * Campo de alturas de trabalho: o relevo inteiro em metros, numa grade só, para os pincéis e
 * as receitas esculpirem. Não é formato de arquivo. Depois de cada gesto, as peças tocadas
 * voltam ao binário canônico por `amostrasDaPeca` + `codificarPecaDeAlturas`.
 *
 * As ferramentas usam só soma, produto, divisão e raiz quadrada (operações exatas do IEEE 754),
 * nunca seno, exponencial ou `Math.random`. O mesmo gesto dá o mesmo relevo à mão, no agente
 * e no servidor.
 */
export interface CampoDeAlturas {
  origem: { x: number; z: number }
  passo: number
  colunas: number
  linhas: number
  /** Limites que o binário das peças consegue guardar; as ferramentas nunca saem deles. */
  min: number
  max: number
  /** `(colunas + 1) × (linhas + 1)` amostras, linha a linha (z cresce a cada linha). */
  alturas: Float64Array
}

/** Retângulo de amostras alteradas, com os dois cantos incluídos. */
export interface RegiaoDoCampo {
  x0: number
  z0: number
  x1: number
  z1: number
}

const invalidar = (frase: string): never => {
  throw new TerrenoInvalido(frase)
}

export function criarCampoDeAlturas(
  forma: Pick<BaseDeTerreno, 'origem' | 'passo' | 'colunas' | 'linhas' | 'min' | 'max'>,
  altura = 0,
): CampoDeAlturas {
  for (const n of [forma.colunas, forma.linhas])
    if (!Number.isInteger(n) || n < CELULAS_DA_PECA || n > 4096 || n % CELULAS_DA_PECA)
      invalidar('O tamanho do terreno precisa ser múltiplo de 64 células, até 4096')
  if (
    ![forma.passo, forma.min, forma.max, forma.origem.x, forma.origem.z, altura].every(
      Number.isFinite,
    ) ||
    forma.passo < 0.25 ||
    forma.passo > 32 ||
    forma.min < -10000 ||
    forma.max > 10000 ||
    Math.abs(forma.origem.x) > 100000 ||
    Math.abs(forma.origem.z) > 100000 ||
    forma.colunas * forma.passo > 8192 ||
    forma.linhas * forma.passo > 8192 ||
    !(forma.max > forma.min) ||
    altura < forma.min ||
    altura > forma.max
  )
    invalidar('A forma do campo de alturas é inválida')
  return {
    origem: { x: forma.origem.x, z: forma.origem.z },
    passo: forma.passo,
    colunas: forma.colunas,
    linhas: forma.linhas,
    min: forma.min,
    max: forma.max,
    // Precisão de trabalho conserva todos os Uint16 mesmo perto de ±10 km com faixa estreita.
    alturas: new Float64Array((forma.colunas + 1) * (forma.linhas + 1)).fill(altura),
  }
}

export const clonarCampo = (c: CampoDeAlturas): CampoDeAlturas => ({
  ...c,
  origem: { ...c.origem },
  alturas: c.alturas.slice(),
})

/**
 * Abre a base inteira num campo. Onde não há peça, vale a altura de fundo. Peça fora da grade
 * ou com borda diferente da vizinha é recusada, como no palco e na compilação: aqui ela
 * passaria calada, com a última peça vencendo na borda.
 */
export function campoDaBase(
  entrada: BaseDeTerreno,
  recursos: ReadonlyMap<string, PecaDeAlturas>,
): CampoDeAlturas {
  const base = BaseDeTerrenoSchema.parse(entrada)
  const campo = criarCampoDeAlturas(base, base.fundo)
  const largura = base.colunas + 1
  const larguraEmPecas = base.colunas / CELULAS_DA_PECA
  for (const [chave, dados] of pecasConferidasDaBase(base, recursos)) {
    const ox = (chave % larguraEmPecas) * CELULAS_DA_PECA,
      oz = Math.floor(chave / larguraEmPecas) * CELULAS_DA_PECA
    for (let z = 0; z < LADO_DAS_AMOSTRAS; z++)
      for (let x = 0; x < LADO_DAS_AMOSTRAS; x++)
        campo.alturas[(oz + z) * largura + ox + x] =
          dados.min + (dados.amostras[z * LADO_DAS_AMOSTRAS + x]! / 65535) * (dados.max - dados.min)
  }
  return campo
}

/** As 65 × 65 alturas de uma peça, prontas para `codificarPecaDeAlturas(amostras, min, max)`. */
export function amostrasDaPeca(campo: CampoDeAlturas, coluna: number, linha: number): Float64Array {
  if (
    !Number.isInteger(coluna) ||
    !Number.isInteger(linha) ||
    coluna < 0 ||
    linha < 0 ||
    coluna >= campo.colunas / CELULAS_DA_PECA ||
    linha >= campo.linhas / CELULAS_DA_PECA
  )
    invalidar('A peça está fora do terreno')
  const largura = campo.colunas + 1,
    r = new Float64Array(AMOSTRAS_DA_PECA)
  for (let z = 0; z < LADO_DAS_AMOSTRAS; z++)
    for (let x = 0; x < LADO_DAS_AMOSTRAS; x++)
      r[z * LADO_DAS_AMOSTRAS + x] = Math.min(
        campo.max,
        Math.max(
          campo.min,
          campo.alturas[(linha * CELULAS_DA_PECA + z) * largura + coluna * CELULAS_DA_PECA + x]!,
        ),
      )
  return r
}

/**
 * Peças que contêm alguma amostra da região. Uma amostra na divisa pertence às duas peças
 * vizinhas, e as duas entram na lista: é o que mantém as bordas coincidentes.
 */
export function pecasDaRegiao(
  campo: CampoDeAlturas,
  regiao: RegiaoDoCampo | null,
): { coluna: number; linha: number }[] {
  if (!regiao) return []
  const ate = (n: number, total: number) =>
    Math.min(total / CELULAS_DA_PECA - 1, Math.floor(n / CELULAS_DA_PECA))
  const de = (n: number) => Math.max(0, Math.ceil(n / CELULAS_DA_PECA) - 1)
  const r: { coluna: number; linha: number }[] = []
  for (let linha = de(regiao.z0); linha <= ate(regiao.z1, campo.linhas); linha++)
    for (let coluna = de(regiao.x0); coluna <= ate(regiao.x1, campo.colunas); coluna++)
      r.push({ coluna, linha })
  return r
}

export function unirRegioes(a: RegiaoDoCampo | null, b: RegiaoDoCampo | null) {
  if (!a || !b) return a ?? b
  return {
    x0: Math.min(a.x0, b.x0),
    z0: Math.min(a.z0, b.z0),
    x1: Math.max(a.x1, b.x1),
    z1: Math.max(a.z1, b.z1),
  }
}

/** Amostras dentro de um retângulo de mundo, já recortadas ao campo. Nulo se cair todo fora. */
export function regiaoDoRetangulo(
  campo: CampoDeAlturas,
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number,
): RegiaoDoCampo | null {
  if (![minX, minZ, maxX, maxZ].every(Number.isFinite)) return invalidar('A área é inválida')
  const x0 = Math.max(0, Math.ceil((minX - campo.origem.x) / campo.passo)),
    z0 = Math.max(0, Math.ceil((minZ - campo.origem.z) / campo.passo)),
    x1 = Math.min(campo.colunas, Math.floor((maxX - campo.origem.x) / campo.passo)),
    z1 = Math.min(campo.linhas, Math.floor((maxZ - campo.origem.z) / campo.passo))
  return x0 > x1 || z0 > z1 ? null : { x0, z0, x1, z1 }
}

/** Mesma interpolação triangular de `criarFonteDeAlturas` e da malha desenhada. */
export function alturaDoCampo(
  campo: Pick<CampoDeAlturas, 'origem' | 'passo' | 'colunas' | 'linhas'> & {
    alturas: ArrayLike<number>
  },
  x: number,
  z: number,
): number {
  const gx = Math.min(campo.colunas, Math.max(0, (x - campo.origem.x) / campo.passo)),
    gz = Math.min(campo.linhas, Math.max(0, (z - campo.origem.z) / campo.passo))
  if (!Number.isFinite(gx) || !Number.isFinite(gz)) return invalidar('O ponto é inválido')
  const ix = Math.min(campo.colunas - 1, Math.floor(gx)),
    iz = Math.min(campo.linhas - 1, Math.floor(gz)),
    u = gx - ix,
    v = gz - iz,
    largura = campo.colunas + 1,
    i = iz * largura + ix,
    a = campo.alturas[i]!,
    b = campo.alturas[i + 1]!,
    c = campo.alturas[i + largura]!,
    d = campo.alturas[i + largura + 1]!
  return interpolarAlturasDaCelula(a, b, c, d, u, v)
}

/** Declive numa amostra, em metros de subida por metro andado (1 = 45°). */
export function decliveDaAmostra(campo: CampoDeAlturas, ix: number, iz: number): number {
  const largura = campo.colunas + 1,
    xa = Math.max(0, ix - 1),
    xb = Math.min(campo.colunas, ix + 1),
    za = Math.max(0, iz - 1),
    zb = Math.min(campo.linhas, iz + 1),
    dx =
      (campo.alturas[iz * largura + xb]! - campo.alturas[iz * largura + xa]!) /
      ((xb - xa) * campo.passo),
    dz =
      (campo.alturas[zb * largura + ix]! - campo.alturas[za * largura + ix]!) /
      ((zb - za) * campo.passo)
  return Math.sqrt(dx * dx + dz * dz)
}

/** Menor e maior altura do campo, para o orçamento e para ajustar a câmera. */
export function extremosDoCampo(campo: CampoDeAlturas): { min: number; max: number } {
  let min = Infinity,
    max = -Infinity
  for (const h of campo.alturas) {
    if (h < min) min = h
    if (h > max) max = h
  }
  return { min, max }
}
