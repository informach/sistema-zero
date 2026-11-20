import { type BufferGeometry, type Matrix4, Vector3 } from 'three'

/**
 * Juntar as peças do relevo de uma região numa malha só. Cada peça compilada cobre um quadrado
 * do chão (64 m) com a própria textura assada, e a junção comum não as une porque cada uma tem
 * outro material. Aqui as texturas viram um mapa único (atlas) com os ladrilhos na MESMA posição
 * que as peças têm no chão: a borda entre dois ladrilhos é a borda entre duas peças vizinhas,
 * então o filtro da textura continua emendando o chão como antes. Tudo puro: pixels RGBA e UVs.
 */

/** Lado máximo do atlas; acima disso os ladrilhos são reduzidos por metades. */
export const LADO_MAXIMO_DO_ATLAS = 2048
const TOLERANCIA = 1e-3

export interface PecaDoAtlas {
  /** Canto e medidas da peça no plano do chão, nas coordenadas da região. */
  minX: number
  minZ: number
  largura: number
  profundidade: number
  /** Lado da textura (quadrada) da peça, em pixels. */
  lado: number
}

export interface PlanoDoAtlas {
  colunas: number
  linhas: number
  /** Lado de cada ladrilho no atlas (o da textura, ou reduzido). */
  ladrilho: number
  /** Quantas vezes a textura original foi reduzida pela metade. */
  reducoes: number
  largura: number
  altura: number
  celulas: { coluna: number; linha: number }[]
}

/**
 * As peças precisam formar uma grade de quadrados iguais e vizinhos (sem sobreposição), com
 * texturas do mesmo tamanho. Fora disso não há atlas (`null`): a junção segue como antes.
 */
export function planejarAtlasDoRelevo(
  pecas: readonly PecaDoAtlas[],
  ladoMaximo = LADO_MAXIMO_DO_ATLAS,
): PlanoDoAtlas | null {
  if (pecas.length < 2) return null
  const [primeira] = pecas
  if (!primeira) return null
  const passo = primeira.largura,
    lado = primeira.lado
  if (!(passo > 0) || !Number.isInteger(lado) || lado < 1) return null
  for (const p of pecas)
    if (
      Math.abs(p.largura - passo) > TOLERANCIA * passo ||
      Math.abs(p.profundidade - passo) > TOLERANCIA * passo ||
      p.lado !== lado
    )
      return null
  const minX = Math.min(...pecas.map((p) => p.minX)),
    minZ = Math.min(...pecas.map((p) => p.minZ)),
    celulas: { coluna: number; linha: number }[] = [],
    ocupadas = new Set<string>()
  for (const p of pecas) {
    const c = (p.minX - minX) / passo,
      l = (p.minZ - minZ) / passo,
      coluna = Math.round(c),
      linha = Math.round(l)
    if (Math.abs(c - coluna) > TOLERANCIA || Math.abs(l - linha) > TOLERANCIA) return null
    const chave = `${coluna}/${linha}`
    if (ocupadas.has(chave)) return null
    ocupadas.add(chave)
    celulas.push({ coluna, linha })
  }
  const colunas = Math.max(...celulas.map((c) => c.coluna)) + 1,
    linhas = Math.max(...celulas.map((c) => c.linha)) + 1
  let ladrilho = lado,
    reducoes = 0
  while (Math.max(colunas, linhas) * ladrilho > ladoMaximo) {
    if (ladrilho % 2 || ladrilho <= 1) return null
    ladrilho /= 2
    reducoes++
  }
  return {
    colunas,
    linhas,
    ladrilho,
    reducoes,
    largura: colunas * ladrilho,
    altura: linhas * ladrilho,
    celulas,
  }
}

/** Reduz um quadrado RGBA pela metade (média de 2x2), mantendo a ordem das linhas. */
type Pixels = Uint8Array | Uint8ClampedArray

function metade(pixels: Pixels, lado: number): Uint8Array {
  const novo = lado / 2,
    saida = new Uint8Array(novo * novo * 4)
  for (let y = 0; y < novo; y++)
    for (let x = 0; x < novo; x++)
      for (let c = 0; c < 4; c++) {
        const a = (2 * y * lado + 2 * x) * 4 + c,
          b = a + lado * 4
        saida[(y * novo + x) * 4 + c] =
          (pixels[a]! + pixels[a + 4]! + pixels[b]! + pixels[b + 4]! + 2) >> 2
      }
  return saida
}

/**
 * Monta o atlas a partir dos pixels de cada peça (RGBA, linha 0 = v 0, como a textura glTF sem
 * inverter). A linha do atlas acompanha o `v`: o ladrilho da linha `l` começa na linha `l * lado`.
 */
export function comporAtlasDoRelevo(
  plano: PlanoDoAtlas,
  pixels: readonly Pixels[],
  ladoOriginal: number,
): Uint8Array {
  if (pixels.length !== plano.celulas.length) throw Error('Falta a textura de uma peça do relevo.')
  const atlas = new Uint8Array(plano.largura * plano.altura * 4)
  for (const [i, celula] of plano.celulas.entries()) {
    let fonte: Pixels = pixels[i]!
    if (fonte.length !== ladoOriginal * ladoOriginal * 4)
      throw Error('A textura de uma peça do relevo não tem o tamanho esperado.')
    let lado = ladoOriginal
    for (let r = 0; r < plano.reducoes; r++) {
      fonte = metade(fonte, lado)
      lado /= 2
    }
    const x0 = celula.coluna * plano.ladrilho,
      y0 = celula.linha * plano.ladrilho
    for (let y = 0; y < lado; y++) {
      const de = y * lado * 4
      atlas.set(fonte.subarray(de, de + lado * 4), ((y0 + y) * plano.largura + x0) * 4)
    }
  }
  return atlas
}

/**
 * Confere que o UV da peça é o quadrado do chão: `u` cresce com x e `v` com z, de 0 a 1 de uma
 * borda à outra. É o que permite pôr o ladrilho na posição da peça. Devolve o retângulo no chão.
 */
export function uvSegueOChao(
  geometria: BufferGeometry,
  /** Leva a posição guardada para as coordenadas da região (a peça não é alterada). */
  matriz?: Matrix4,
): { minX: number; minZ: number; largura: number; profundidade: number } | null {
  const pos = geometria.getAttribute('position'),
    uv = geometria.getAttribute('uv')
  if (!pos || !uv || uv.itemSize !== 2 || uv.count !== pos.count || !pos.count) return null
  const xs = new Float64Array(pos.count),
    zs = new Float64Array(pos.count),
    p = new Vector3()
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i)
    if (matriz) p.applyMatrix4(matriz)
    xs[i] = p.x
    zs[i] = p.z
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.z < minZ) minZ = p.z
    if (p.z > maxZ) maxZ = p.z
  }
  const largura = maxX - minX,
    profundidade = maxZ - minZ
  if (!(largura > 0) || !(profundidade > 0)) return null
  for (let i = 0; i < pos.count; i++) {
    if (
      Math.abs(uv.getX(i) - (xs[i]! - minX) / largura) > TOLERANCIA ||
      Math.abs(uv.getY(i) - (zs[i]! - minZ) / profundidade) > TOLERANCIA
    )
      return null
  }
  return { minX, minZ, largura, profundidade }
}

/** Leva o UV da peça para o ladrilho dela no atlas (sem mexer em posição ou normal). */
export function levarUvAoAtlas(
  geometria: BufferGeometry,
  celula: { coluna: number; linha: number },
  plano: Pick<PlanoDoAtlas, 'colunas' | 'linhas'>,
) {
  const uv = geometria.getAttribute('uv')
  for (let i = 0; i < uv.count; i++)
    uv.setXY(
      i,
      (celula.coluna + uv.getX(i)) / plano.colunas,
      (celula.linha + uv.getY(i)) / plano.linhas,
    )
  uv.needsUpdate = true
}
