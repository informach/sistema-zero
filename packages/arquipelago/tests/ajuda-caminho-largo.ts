/**
 * O caminho a pé com as folgas do pedido dos portos (31/10/2026): uma faixa de 1,5 m de largura onde o
 * corpo passa e degraus de até 0,30 m. Usa a grade de `gradeDeAndar` (células de 25 cm, já com o corpo
 * cabendo em cada uma): uma célula é da faixa quando o corpo cabe em todas as células até
 * `largura / 2 − CORPO.raio` dela (a faixa livre tem `largura` de beira a beira), e de uma célula da
 * faixa para a vizinha o chão sobe ou desce no máximo `degrau`.
 */
import { CORPO } from '../src/sistemas/corpo'
import type { gradeDeAndar } from './ajuda-colisores'

type Grade = ReturnType<typeof gradeDeAndar>

export const FAIXA_DO_CAMINHO = 1.5
export const DEGRAU_DO_CAMINHO = 0.3

export function caminhoLargo(
  grade: Grade,
  largura = FAIXA_DO_CAMINHO,
  degrau = DEGRAU_DO_CAMINHO,
  passo = 0.25,
) {
  const { celulas, centro } = grade
  const lado = Math.round(Math.sqrt(celulas.length))
  const raio = Math.max(0, largura / 2 - CORPO.raio)
  const k = Math.ceil(raio / passo - 1e-9)
  const vizinhasDaFaixa: [number, number][] = []
  for (let dz = -k; dz <= k; dz++)
    for (let dx = -k; dx <= k; dx++)
      if (Math.hypot(dx, dz) * passo <= raio + 1e-9) vizinhasDaFaixa.push([dz, dx])
  const largas = new Uint8Array(celulas.length)
  for (let i = 0; i < celulas.length; i++) {
    const c = celulas[i]
    if (!c?.livre) continue
    const col = i % lado
    let ok = true
    for (const [dz, dx] of vizinhasDaFaixa) {
      if (col + dx < 0 || col + dx >= lado) {
        ok = false
        break
      }
      const v = celulas[i + dz * lado + dx]
      if (!v?.livre || Math.abs(v.y - c.y) > degrau) {
        ok = false
        break
      }
    }
    if (ok) largas[i] = 1
  }
  /**
   * As células da faixa que se alcançam de (x, z), subindo ou descendo até `degrau` por passo. A
   * partida é a célula da faixa mais perto de (x, z), a até `partida` dela (a âncora `chegada` fica na
   * beira da ilha, onde a faixa continua pela ponte).
   */
  const alcance = (x: number, z: number, partida = 1.5): Set<number> => {
    let inicio = -1
    let melhor = Infinity
    for (let i = 0; i < celulas.length; i++) {
      if (!largas[i]) continue
      const c = centro(i)
      const d = Math.hypot(c.x - x, c.z - z)
      if (d <= partida && d < melhor) {
        melhor = d
        inicio = i
      }
    }
    const visto = new Set<number>()
    if (inicio < 0) return visto
    visto.add(inicio)
    const fila = [inicio]
    while (fila.length) {
      const i = fila.pop() as number
      const c = celulas[i]
      if (!c) continue
      const col = i % lado
      for (const [di, dc] of [
        [-lado, 0],
        [lado, 0],
        [-1, -1],
        [1, 1],
      ] as const) {
        if ((dc === -1 && col === 0) || (dc === 1 && col === lado - 1)) continue
        const j = i + di
        const v = celulas[j]
        if (!largas[j] || !v || visto.has(j) || Math.abs(v.y - c.y) > degrau) continue
        visto.add(j)
        fila.push(j)
      }
    }
    return visto
  }
  /** Alguma célula alcançada fica a menos de `perto` de (x, z)? */
  const chegaPerto = (andou: Set<number>, x: number, z: number, perto = 1) =>
    [...andou].some((i) => {
      const c = centro(i)
      return Math.hypot(c.x - x, c.z - z) < perto
    })
  return { largas, alcance, chegaPerto }
}
