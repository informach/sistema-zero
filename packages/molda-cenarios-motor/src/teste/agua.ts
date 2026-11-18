import type { AguaDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import { Box3, Vector3 } from 'three'
import { IndiceDeCaixas } from '../indice-de-caixas'

export interface NivelDoTeste {
  nivel: number
  profundidade: number
}
export type FonteDeAguaDoTeste = (x: number, z: number) => NivelDoTeste | null

/** Cobertura física declarada, sem um plano sólido ou dependência do material da água. */
export class AguasDoTeste {
  private readonly lagos: Extract<AguaDeCenario, { tipo: 'lago' }>[] = []
  private readonly mares: Extract<AguaDeCenario, { tipo: 'mar' }>[] = []
  private readonly indice = new IndiceDeCaixas()
  private readonly ponto = new Box3()
  constructor(aguas: readonly AguaDeCenario[]) {
    const caixas: Box3[] = []
    for (const agua of aguas) {
      if (agua.oculto) continue
      if (agua.tipo === 'mar') {
        this.mares.push(agua)
        continue
      }
      const caixa = new Box3(),
        cos = Math.cos(agua.giro),
        sin = Math.sin(agua.giro)
      for (const p of agua.contorno)
        caixa.expandByPoint(
          new Vector3(
            agua.centro.x + (p.x * cos + p.z * sin) * agua.escala,
            0,
            agua.centro.z + (-p.x * sin + p.z * cos) * agua.escala,
          ),
        )
      caixa.min.y = -100000
      caixa.max.y = 100000
      caixas.push(caixa)
      this.lagos.push(agua)
    }
    this.indice.definir(caixas)
  }
  readonly nivel: FonteDeAguaDoTeste = (x, z) => {
    let agua: NivelDoTeste | null = null
    for (const mar of this.mares)
      if (!agua || mar.nivel > agua.nivel) agua = { nivel: mar.nivel, profundidade: 100000 }
    this.ponto.min.set(x, 0, z)
    this.ponto.max.copy(this.ponto.min)
    for (const i of this.indice.sobrepor(this.ponto)) {
      const lago = this.lagos[i]!,
        cos = Math.cos(lago.giro),
        sin = Math.sin(lago.giro),
        dx = x - lago.centro.x,
        dz = z - lago.centro.z
      const px = (dx * cos - dz * sin) / lago.escala,
        pz = (dx * sin + dz * cos) / lago.escala
      if ((!agua || lago.nivel > agua.nivel) && contem(lago.contorno, px, pz))
        agua = { nivel: lago.nivel, profundidade: lago.profundidade }
    }
    return agua
  }
}
function contem(poligono: readonly { x: number; z: number }[], x: number, z: number) {
  let dentro = false
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const a = poligono[j]!,
      b = poligono[i]!,
      cruz = (x - a.x) * (b.z - a.z) - (z - a.z) * (b.x - a.x)
    if (
      Math.abs(cruz) < 1e-8 &&
      x >= Math.min(a.x, b.x) &&
      x <= Math.max(a.x, b.x) &&
      z >= Math.min(a.z, b.z) &&
      z <= Math.max(a.z, b.z)
    )
      return true
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) dentro = !dentro
  }
  return dentro
}
