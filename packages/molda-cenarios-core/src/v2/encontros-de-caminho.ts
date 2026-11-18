import type { PontoNoChao } from './curvas'
import type { CaminhoDeCenario } from './documento'
import { malhaPlanaDoCaminho } from './geometria-de-piso'

type Caixa = { x0: number; x1: number; z0: number; z1: number }
const sobrepoe = (a: Caixa, b: Caixa) =>
  a.x0 < b.x1 - 1e-7 && b.x0 < a.x1 - 1e-7 && a.z0 < b.z1 - 1e-7 && b.z0 < a.z1 - 1e-7
function caixaDosPontos(pontos: readonly PontoNoChao[]): Caixa {
  const caixa = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity }
  for (const p of pontos) {
    caixa.x0 = Math.min(caixa.x0, p.x)
    caixa.x1 = Math.max(caixa.x1, p.x)
    caixa.z0 = Math.min(caixa.z0, p.z)
    caixa.z1 = Math.max(caixa.z1, p.z)
  }
  return caixa
}

/** Praça recebe as chegadas; entre pisos do mesmo tipo prevalece a ordem do documento.
 * Áreas secas são recortadas no acabamento de menor precedência, sem escavar o terreno.
 * Cada lance da faixa é uma região: circuitos fechados preservam seu interior vazio.
 */
export function prepararEncontrosDosCaminhos(
  caminhos: readonly CaminhoDeCenario[],
  escondidos: ReadonlySet<string> = new Set(),
) {
  const falhas = new Map<string, string>(),
    exclusoes = new Map<string, PontoNoChao[][]>(),
    plantas: {
      id: string
      prioridade: number
      ordem: number
      caixa: Caixa
      regioes: { pontos: PontoNoChao[]; caixa: Caixa }[]
    }[] = []
  let vertices = 0
  for (const [ordem, c] of caminhos.entries()) {
    if (escondidos.has(c.id) || !['trilha', 'estrada', 'praca'].includes(c.tipo)) continue
    if (vertices >= 200_000) {
      falhas.set(c.id, 'Os encontros têm controles demais. Simplifique ou divida os caminhos.')
      continue
    }
    try {
      const { origem, malha } = malhaPlanaDoCaminho(c),
        p = malha.atributos.position!.valores,
        pontos = Array.from({ length: p.length / 3 }, (_, i) => ({
          x: p[i * 3]! + origem.x,
          z: p[i * 3 + 2]! + origem.z,
        }))
      vertices += pontos.length
      if (vertices > 200_000)
        throw Error('Os encontros têm controles demais. Simplifique ou divida os caminhos.')
      const regioes: PontoNoChao[][] = []
      if (c.tipo === 'praca') regioes.push(pontos)
      else
        for (let i = 0; i < pontos.length - 2; i += 2)
          regioes.push([pontos[i]!, pontos[i + 1]!, pontos[i + 3]!, pontos[i + 2]!])
      plantas.push({
        id: c.id,
        prioridade: c.tipo === 'praca' ? 0 : 1,
        ordem,
        caixa: caixaDosPontos(pontos),
        regioes: regioes.map((pontos) => ({ pontos, caixa: caixaDosPontos(pontos) })),
      })
    } catch (erro) {
      falhas.set(
        c.id,
        erro instanceof Error ? erro.message : 'Não consegui preparar o encontro deste caminho.',
      )
    }
  }
  plantas.sort((a, b) => a.prioridade - b.prioridade || a.ordem - b.ordem)
  for (const [i, planta] of plantas.entries()) {
    const recortes: PontoNoChao[][] = []
    let pontos = 0
    anteriores: for (let j = 0; j < i; j++) {
      const outra = plantas[j]!
      if (!sobrepoe(planta.caixa, outra.caixa)) continue
      for (const r of outra.regioes)
        if (sobrepoe(planta.caixa, r.caixa)) {
          if (recortes.length >= 20_000 || pontos + r.pontos.length > 200_000) {
            falhas.set(
              planta.id,
              'O encontro exige recortes demais. Divida a área ou simplifique os caminhos.',
            )
            break anteriores
          }
          recortes.push(r.pontos)
          pontos += r.pontos.length
        }
    }
    exclusoes.set(planta.id, recortes)
  }
  return { exclusoes, falhas }
}
