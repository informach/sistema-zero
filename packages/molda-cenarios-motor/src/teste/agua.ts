import {
  type AguaDeCenario,
  type ConsultaDeAgua,
  type FonteDeAlturas,
  type NivelDeAgua,
  prepararConsultaDaAgua,
} from '@sistemazero/molda-cenarios-core/v2'
import { Box3, Vector3 } from 'three'
import { IndiceDeCaixas } from '../indice-de-caixas'

export type NivelDoTeste = NivelDeAgua
export type FonteDeAguaDoTeste = (x: number, z: number) => NivelDoTeste | null

/** Cobertura física declarada, sem um plano sólido ou dependência do material da água. */
export class AguasDoTeste {
  private readonly locais: ConsultaDeAgua[] = []
  private readonly mares: ConsultaDeAgua[] = []
  private readonly indice = new IndiceDeCaixas()
  private readonly ponto = new Box3()
  constructor(
    aguas: readonly AguaDeCenario[],
    private readonly terreno?: FonteDeAlturas,
  ) {
    const caixas: Box3[] = []
    for (const agua of aguas) {
      if (agua.oculto || agua.nado === false || agua.tipo === 'cachoeira') continue
      const consulta = prepararConsultaDaAgua(agua)
      if (agua.tipo === 'mar') {
        this.mares.push(consulta)
        continue
      }
      const r = consulta.limites!
      const caixa = new Box3(new Vector3(r.x0, -100000, r.z0), new Vector3(r.x1, 100000, r.z1))
      caixas.push(caixa)
      this.locais.push(consulta)
    }
    this.indice.definir(caixas)
  }
  readonly nivel: FonteDeAguaDoTeste = (x, z) => {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null
    let agua: NivelDoTeste | null = null
    for (const mar of this.mares) {
      const a = mar.em(x, z, this.terreno)
      if (a && (!agua || a.nivel > agua.nivel)) agua = a
    }
    this.ponto.min.set(x, 0, z)
    this.ponto.max.copy(this.ponto.min)
    for (const i of this.indice.sobrepor(this.ponto)) {
      const a = this.locais[i]!.em(x, z, this.terreno)
      if (a && (!agua || a.nivel > agua.nivel)) agua = a
    }
    return agua
  }
}
