import type { MalhaParaRecorte } from '../geometria'
import { CenarioInvalido } from '../validacao'
import { alturaDoCampo } from './campo-de-alturas'
import { faixaDaCurva, triangularPoligono } from './curvas'
import type { BaseDeCenario, CaminhoDeCenario } from './documento'
import type { EstadoDoTerreno } from './edicao-de-terreno'
import { recortarMalhaNoChao } from './recorte-de-chao'
import { curvaDoCaminho } from './topologia-de-caminho'

export interface PisoDoCaminho {
  /** Origem separada dos buffers para manter a precisão mesmo longe do centro do mundo. */
  origem: { x: number; y: number; z: number }
  /** Triângulos sem índice, locais à origem. Mesma superfície para desenho e picking. */
  posicoes: Float32Array
  /** Metros ao longo e através da trilha; na praça, metros nos eixos do piso. */
  uvs: Float32Array
}
const falhar = (mensagem: string): never => {
  throw new CenarioInvalido([mensagem])
}
/** Planta comum para piso, encontros e conformação; nenhuma altura foi aplicada. */
export function malhaPlanaDoCaminho(caminho: CaminhoDeCenario) {
  if (!['trilha', 'praca', 'estrada'].includes(caminho.tipo))
    return falhar('Este caminho precisa de geometria estrutural.')
  const origem = { ...caminho.pontos[0]!, y: 0 },
    curva = curvaDoCaminho({
      ...caminho,
      pontos: caminho.pontos.map((p) => ({ x: p.x - origem.x, z: p.z - origem.z })),
    })
  let posicoes: Float32Array, uvs: Float32Array, indices: Uint32Array
  if (caminho.tipo === 'praca') {
    indices = triangularPoligono(curva.pontos)
    posicoes = Float32Array.from(curva.pontos.flatMap((p) => [p.x, 0, p.z]))
    uvs = Float32Array.from(curva.pontos.flatMap((p) => [p.x, p.z]))
  } else {
    const faixa = faixaDaCurva(curva, {
      largura: caminho.largura,
      alturaEm: () => 0,
      elevacao: 0,
      divisoes: 1,
    })
    posicoes = faixa.posicoes
    uvs = faixa.uvs
    indices = faixa.indices
    for (let i = 0; i < uvs.length; i++) uvs[i] = uvs[i]! * caminho.largura
  }
  const original: MalhaParaRecorte = {
    atributos: { position: { valores: posicoes, itemSize: 3 }, uv: { valores: uvs, itemSize: 2 } },
    indices,
  }
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i]! * 3,
      b = indices[i + 1]! * 3,
      c = indices[i + 2]! * 3,
      normalY =
        (posicoes[b + 2]! - posicoes[a + 2]!) * (posicoes[c]! - posicoes[a]!) -
        (posicoes[b]! - posicoes[a]!) * (posicoes[c + 2]! - posicoes[a + 2]!)
    if (normalY < -1e-10)
      falhar('Esta curva dobra o piso sobre si mesmo. Abra a curva ou reduza a largura.')
  }
  return { origem, malha: original }
}

/**
 * Piso nativo conformado aos triângulos reais da grade, sem folga artificial no eixo Y.
 * O material deve usar polygonOffset como uma superfície de acabamento do mesmo chão.
 * Cercas, muros e pontes usam sua geometria estrutural, nunca este decal como piso suspenso.
 */
export function geometriaDoPiso(
  caminho: CaminhoDeCenario,
  base: BaseDeCenario,
  estado: EstadoDoTerreno | null,
  limites: { visitas?: number; vertices?: number } = {},
): PisoDoCaminho {
  const { origem, malha: original } = malhaPlanaDoCaminho(caminho)
  const saidaP: number[] = [],
    saidaUv: number[] = []
  const anexar = (dados: ReturnType<typeof recortarMalhaNoChao>) => {
    const p = dados.position!.valores,
      uv = dados.uv!.valores
    for (let i = 0; i < p.length; i += 9) {
      const normalY =
        (p[i + 5]! - p[i + 2]!) * (p[i + 6]! - p[i]!) -
        (p[i + 3]! - p[i]!) * (p[i + 8]! - p[i + 2]!)
      // O recorte calcula em dupla precisão; a conversão para Float32 pode colapsar
      // fragmentos na divisa. Não conservar faces degeneradas na geometria de picking.
      if (normalY < 1e-10) continue
      for (let j = 0; j < 9; j += 3) {
        const x = p[i + j]!,
          z = p[i + j + 2]!,
          y =
            estado && base.tipo === 'terreno'
              ? alturaDoCampo(estado.campo, x + origem.x, z + origem.z)
              : 0
        if (!Number.isFinite(y)) falhar('O terreno contém uma altura inválida no piso do caminho.')
        saidaP.push(x, y, z)
        const k = ((i + j) / 3) * 2
        saidaUv.push(uv[k]!, uv[k + 1]!)
      }
    }
  }
  anexar(recortarMalhaNoChao(original, base, estado, origem, limites))
  return { origem, posicoes: Float32Array.from(saidaP), uvs: Float32Array.from(saidaUv) }
}
