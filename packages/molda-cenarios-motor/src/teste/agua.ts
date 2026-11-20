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
export type FonteDeAguaDoTeste = (x: number, z: number, raio?: number) => NivelDoTeste | null
type Ponto = { x: number; z: number }
type Aresta = readonly [Ponto, Ponto]

/** Bordas da mesma cobertura canônica, para a sonda da câmera junto à margem. */
function arestasDaAgua(a: AguaDeCenario, consulta: ConsultaDeAgua): Aresta[] {
  const arestas: Aresta[] = []
  if (a.tipo === 'lago' || a.tipo === 'represa') {
    const c = Math.cos(a.giro),
      s = Math.sin(a.giro)
    for (const anel of [a.contorno, ...(a.ilhas ?? [])]) {
      const pontos = anel.map((p) => ({
        x: a.centro.x + (p.x * c + p.z * s) * a.escala,
        z: a.centro.z + (-p.x * s + p.z * c) * a.escala,
      }))
      for (let i = 0; i < pontos.length; i++)
        arestas.push([pontos[i]!, pontos[(i + 1) % pontos.length]!])
    }
  } else if (consulta.superficie) {
    const { posicoes, indices } = consulta.superficie,
      pontos = Array.from({ length: posicoes.length / 3 }, (_, i) => ({
        x: posicoes[i * 3]!,
        z: posicoes[i * 3 + 2]!,
      }))
    for (let i = 0; i < indices.length; i += 3)
      for (let j = 0; j < 3; j++)
        arestas.push([pontos[indices[i + j]!]!, pontos[indices[i + ((j + 1) % 3)]!]!])
  }
  return arestas
}

/** Cobertura física declarada, sem um plano sólido ou dependência do material da água. */
export class AguasDoTeste {
  private readonly locais: ConsultaDeAgua[] = []
  private readonly bordas: Aresta[][] = []
  private readonly mares: ConsultaDeAgua[] = []
  private readonly indice = new IndiceDeCaixas()
  private readonly ponto = new Box3()
  constructor(
    aguas: readonly AguaDeCenario[],
    private readonly terreno?: FonteDeAlturas,
    consultas?: ReadonlyMap<string, ConsultaDeAgua>,
  ) {
    const caixas: Box3[] = []
    for (const agua of aguas) {
      if (agua.oculto || agua.nado === false || agua.tipo === 'cachoeira') continue
      const consulta = consultas?.get(agua.id) ?? prepararConsultaDaAgua(agua)
      if (agua.tipo === 'mar') {
        this.mares.push(consulta)
        continue
      }
      const r = consulta.limites!
      const caixa = new Box3(new Vector3(r.x0, -100000, r.z0), new Vector3(r.x1, 100000, r.z1))
      caixas.push(caixa)
      this.locais.push(consulta)
      this.bordas.push(arestasDaAgua(agua, consulta))
    }
    this.indice.definir(caixas)
  }
  readonly nivel: FonteDeAguaDoTeste = (x, z, raio = 0) => {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null
    if (!Number.isFinite(raio) || raio < 0 || raio > 100)
      throw Error('O raio da sonda de água é inválido.')
    let agua: NivelDoTeste | null = null
    for (const mar of this.mares) {
      const a = mar.em(x, z, this.terreno)
      if (a && (!agua || a.nivel > agua.nivel)) agua = a
    }
    this.ponto.min.set(x - raio, 0, z - raio)
    this.ponto.max.set(x + raio, 0, z + raio)
    for (const i of this.indice.sobrepor(this.ponto)) {
      const consulta = this.locais[i]!
      let a = consulta.em(x, z, this.terreno)
      if (raio > 0)
        for (const [p, q] of this.bordas[i]!) {
          const dx = q.x - p.x,
            dz = q.z - p.z,
            l2 = dx * dx + dz * dz,
            t = l2 ? Math.max(0, Math.min(1, ((x - p.x) * dx + (z - p.z) * dz) / l2)) : 0,
            px = p.x + t * dx,
            pz = p.z + t * dz
          if (Math.hypot(px - x, pz - z) > raio + 1e-7) continue
          // A borda de uma ilha seca pertence à ilha; consultar ambos os lados evita
          // tratar seu interior como água. O nível continua vindo da consulta original.
          const n = Math.sqrt(l2),
            epsilon = n ? 1e-6 / n : 0
          for (const lado of [0, -1, 1]) {
            const sx = px + lado * dz * epsilon,
              sz = pz - lado * dx * epsilon
            if (Math.hypot(sx - x, sz - z) > raio + 1e-7) continue
            const nivel = consulta.em(sx, sz, this.terreno)
            if (nivel && (!a || nivel.nivel > a.nivel)) a = nivel
          }
        }
      if (a && (!agua || a.nivel > agua.nivel)) agua = a
    }
    return agua
  }
}
