import {
  dividirMalhaParaExportacao,
  LIMITES_DA_EXPORTACAO,
} from '@sistemazero/molda-cenarios-core/compilar'
import {
  type BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
  type InterleavedBufferAttribute,
  Uint16BufferAttribute,
} from 'three'

type Atributo = BufferAttribute | InterleavedBufferAttribute
const MAX_FLOAT32 = 3.4028234663852886e38

/** Remapeia todos os canais pelo índice original, sem assar pose ou deformações.
 * A referência temporária não é gravada no GLB. A mesma divisão numérica do núcleo
 * decide as partes, inclusive para modelos com muitos canais de morph. */
export function dividirGeometriaComDeformacoes(
  original: BufferGeometry,
  faixa?: { inicio: number; quantidade: number },
  orcamentoBytes: number = LIMITES_DA_EXPORTACAO.malha.bytesDaSaida,
): BufferGeometry[] {
  const pos = original.getAttribute('position'),
    n = pos?.count ?? 0,
    quantidade = original.index?.count ?? n,
    inicio = faixa?.inicio ?? original.drawRange.start,
    numero = faixa?.quantidade ?? Math.min(quantidade - inicio, original.drawRange.count),
    fim = inicio + numero,
    atributos = Object.entries(original.attributes),
    morphs = Object.entries(original.morphAttributes).filter(([, a]) => a?.length),
    canais = [...atributos.map(([, a]) => a), ...morphs.flatMap(([, a]) => a!)]
  if (
    pos?.itemSize !== 3 ||
    !Number.isSafeInteger(n) ||
    n < 1 ||
    n > LIMITES_DA_EXPORTACAO.malha.verticesDaFonte ||
    !Number.isSafeInteger(inicio) ||
    !Number.isSafeInteger(fim) ||
    inicio < 0 ||
    fim > quantidade ||
    fim < inicio ||
    inicio % 3 ||
    numero % 3
  )
    throw Error('O intervalo da geometria precisa conter triângulos completos.')
  if (
    !Number.isSafeInteger(orcamentoBytes) ||
    orcamentoBytes < 1 ||
    orcamentoBytes > LIMITES_DA_EXPORTACAO.malha.bytesDaSaida
  )
    throw Error('O orçamento da geometria animável é inválido.')
  if (
    atributos.length > 64 ||
    morphs.some(([, a]) => a!.length > 64) ||
    new Set(morphs.map(([, a]) => a!.length)).size > 1 ||
    canais.some(
      (a) => a.count !== n || !Number.isInteger(a.itemSize) || a.itemSize < 1 || a.itemSize > 16,
    )
  )
    throw Error('O layout dos atributos ou morphs da geometria é inválido.')
  const componentes = canais.reduce((s, a) => s + a.itemSize, 0),
    bytesDeFonte = n * componentes * 4 + quantidade * 4,
    bytesDoRemapeamento = n * 16 + numero * 8
  if (
    bytesDeFonte > LIMITES_DA_EXPORTACAO.malha.bytesDaFonte ||
    bytesDoRemapeamento > LIMITES_DA_EXPORTACAO.malha.bytesDaFonte
  )
    throw Error('A geometria animável excede o orçamento de memória da fonte.')
  const ler = (a: Atributo, i: number, c: number) => {
    const valor = a.getComponent(i, c)
    if (!Number.isFinite(valor) || Math.abs(valor) > MAX_FLOAT32)
      throw Error('Um atributo da geometria animável não é finito ou não cabe em Float32.')
    return valor
  }
  const posicoes = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) posicoes[i * 3 + c] = ler(pos, i, c)
  const referencias = Float32Array.from({ length: n }, (_, i) => i),
    indices = Float64Array.from({ length: numero }, (_, i) =>
      original.index ? original.index.getX(inicio + i) : inicio + i,
    ),
    divididas = dividirMalhaParaExportacao({
      atributos: {
        position: { itemSize: 3, valores: posicoes },
        referencia: { itemSize: 1, valores: referencias },
      },
      indices,
    }),
    saida: BufferGeometry[] = []
  let bytesGerados = 0
  try {
    for (const parte of divididas) {
      const ids = parte.atributos.referencia!.valores
      bytesGerados += ids.length * componentes * 4 + parte.indices.byteLength
      if (bytesGerados > orcamentoBytes)
        throw Error('A divisão animável excede o orçamento de memória de saída.')
      const g = new BufferGeometry()
      saida.push(g)
      const copiar = (a: Atributo, nome: string) => {
        const valores = new Float32Array(ids.length * a.itemSize)
        for (let i = 0; i < ids.length; i++)
          for (let c = 0; c < a.itemSize; c++) {
            const valor = ler(a, ids[i]!, c)
            if (nome === 'skinIndex' && (!Number.isInteger(valor) || valor < 0 || valor > 65535))
              throw Error('O índice de uma junta precisa ser inteiro entre 0 e 65.535.')
            valores[i * a.itemSize + c] = valor
          }
        let atributo: BufferAttribute
        if (nome === 'skinIndex') {
          atributo = new Uint16BufferAttribute(Uint16Array.from(valores), a.itemSize)
        } else atributo = new Float32BufferAttribute(valores, a.itemSize)
        atributo.name = a.name
        return atributo
      }
      for (const [nome, a] of atributos) g.setAttribute(nome, copiar(a, nome))
      for (const [nome, lista] of morphs)
        g.morphAttributes[nome as keyof typeof g.morphAttributes] = lista!.map((a) =>
          copiar(a, nome),
        )
      g.morphTargetsRelative = original.morphTargetsRelative
      g.setIndex(new Uint16BufferAttribute(parte.indices, 1))
      g.computeBoundingBox()
      g.computeBoundingSphere()
    }
    return saida
  } catch (erro) {
    for (const g of saida) g.dispose()
    throw erro
  }
}
