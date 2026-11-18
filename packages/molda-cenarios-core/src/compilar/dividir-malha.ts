import { conferirMalhaParaRecorte, type MalhaParaRecorte } from '../geometria'
import { LIMITES_DA_EXPORTACAO } from './limites'

export const MAX_VERTICES_POR_MALHA = LIMITES_DA_EXPORTACAO.malha.verticesPorParte
export const MAX_INDICES_POR_MALHA = LIMITES_DA_EXPORTACAO.malha.indicesPorParte
const MAX_BYTES_DA_FONTE = LIMITES_DA_EXPORTACAO.malha.bytesDaFonte,
  MAX_VERTICES_DA_FONTE = LIMITES_DA_EXPORTACAO.malha.verticesDaFonte,
  MAX_FLOAT32 = 3.4028234663852886e38
export interface MalhaParaExportacao {
  atributos: Record<string, { itemSize: number; valores: Float32Array<ArrayBuffer> }>
  indices: Uint16Array<ArrayBuffer>
  regiao?: number
}

/** Atributos numéricos já decodificados; o adaptador resolve normalização e pose antes daqui.
 * Cada parte remapeia vértices por índice, nunca por proximidade: costuras e normais são preservadas. */
export function dividirMalhaParaExportacao(
  malha: MalhaParaRecorte,
  limite: number = MAX_VERTICES_POR_MALHA,
  orcamentoBytes: number = MAX_BYTES_DA_FONTE,
  /** Triângulos consecutivos da mesma região compartilham partes; não há reordenação implícita. */
  regioes?: ArrayLike<number>,
): MalhaParaExportacao[] {
  if (!Number.isInteger(limite) || limite < 3 || limite > MAX_VERTICES_POR_MALHA)
    throw Error('O limite da malha precisa ficar entre 3 e 65.000 vértices.')
  if (
    !Number.isSafeInteger(orcamentoBytes) ||
    orcamentoBytes < 1 ||
    orcamentoBytes > MAX_BYTES_DA_FONTE
  )
    throw Error('O orçamento de saída da malha é inválido.')
  const nomes = Object.keys(malha.atributos),
    pos = malha.atributos.position
  if (
    !pos ||
    !Number.isSafeInteger(pos.valores.length) ||
    pos.valores.length < 0 ||
    pos.valores.length > MAX_VERTICES_DA_FONTE * 3 ||
    nomes.length > LIMITES_DA_EXPORTACAO.malha.atributos
  )
    throw Error('A fonte da malha é inválida ou excede o limite de exportação.')
  let bytes = 0
  for (const nome of nomes) {
    const a = malha.atributos[nome]!
    if (
      !/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(nome) ||
      !Number.isSafeInteger(a.valores.length) ||
      a.valores.length < 0
    )
      throw Error('Um atributo da malha é inválido.')
    bytes += a.valores.length * 4
  }
  const totalIndices = malha.indices?.length ?? pos.valores.length / 3
  if (
    !Number.isSafeInteger(totalIndices) ||
    totalIndices < 0 ||
    bytes + totalIndices * 4 > MAX_BYTES_DA_FONTE
  )
    throw Error('A fonte da malha é grande demais para o orçamento de exportação.')
  const validada = conferirMalhaParaRecorte(malha)
  if (regioes) {
    if (regioes.length !== totalIndices / 3)
      throw Error('As regiões precisam corresponder aos triângulos da malha.')
    for (let i = 0; i < regioes.length; i++)
      if (!Number.isSafeInteger(regioes[i]) || regioes[i]! < 0 || regioes[i]! > 0xffffffff)
        throw Error('Um identificador de região da malha é inválido.')
  }
  for (const nome of nomes) {
    const a = malha.atributos[nome]!
    for (let i = 0; i < a.valores.length; i++)
      if (Math.abs(a.valores[i]!) > MAX_FLOAT32)
        throw Error('Um atributo excede a precisão numérica suportada pelo arquivo 3D.')
  }
  const partes: MalhaParaExportacao[] = [],
    mapa = new Map<number, number>()
  const componentes = nomes.reduce((s, nome) => s + malha.atributos[nome]!.itemSize, 0)
  let originais: number[] = [],
    indices: number[] = [],
    bytesGerados = 0,
    regiao = regioes?.[0]
  const terminar = () => {
    if (!indices.length) return
    if (partes.length >= LIMITES_DA_EXPORTACAO.malha.partes)
      throw Error('A divisão produz partes demais. Aumente o limite ou divida o modelo de origem.')
    bytesGerados += originais.length * componentes * 4 + indices.length * 2
    if (bytesGerados > orcamentoBytes)
      throw Error('A divisão da malha excede o orçamento de memória de saída.')
    const atributos = Object.fromEntries(
      nomes.map((nome) => {
        const a = malha.atributos[nome]!,
          valores = new Float32Array(originais.length * a.itemSize)
        for (let i = 0; i < originais.length; i++)
          for (let c = 0; c < a.itemSize; c++)
            valores[i * a.itemSize + c] = a.valores[originais[i]! * a.itemSize + c]!
        return [nome, { itemSize: a.itemSize, valores }]
      }),
    )
    partes.push({
      atributos,
      indices: Uint16Array.from(indices),
      ...(regiao !== undefined ? { regiao } : {}),
    })
    mapa.clear()
    originais = []
    indices = []
  }
  for (let i = 0; i < totalIndices; i += 3) {
    if (regioes && regioes[i / 3] !== regiao) {
      terminar()
      regiao = regioes[i / 3]
    }
    const triangulo = [0, 1, 2].map((c) => (validada.indices ? validada.indices[i + c]! : i + c)),
      novos = new Set(triangulo.filter((v) => !mapa.has(v))).size
    if (mapa.size + novos > limite || indices.length + 3 > MAX_INDICES_POR_MALHA) terminar()
    for (const original of triangulo) {
      let local = mapa.get(original)
      if (local === undefined) {
        local = originais.length
        mapa.set(original, local)
        originais.push(original)
      }
      indices.push(local)
    }
  }
  terminar()
  return partes
}
