import { MATERIAIS, type MaterialFisico, type NomeDoMaterial } from './materiais-fisicos'
import type { Vento } from './vento'

export type EstadoDoMaterial = 'seco' | 'molhado' | 'queimando' | 'queimado' | 'apagado'
export interface ObjetoMaterial {
  material: NomeDoMaterial
  estado: EstadoDoMaterial
  x: number
  z: number
  /** O calor nunca sai deste recinto. Casa e vegetação não são cadastradas na fogueira. */
  recinto: number
  umidade: number
  calor: number
  combustivel: number
}
export function criarObjetoMaterial(
  material: NomeDoMaterial,
  x: number,
  z: number,
  recinto: number,
): ObjetoMaterial {
  return { material, x, z, recinto, estado: 'seco', umidade: 0, calor: 0, combustivel: 1 }
}
function combustao(o: ObjetoMaterial) {
  return (MATERIAIS[o.material] as MaterialFisico).fogo
}
export function acender(o: ObjetoMaterial): boolean {
  if (!combustao(o) || o.umidade > 0 || o.combustivel <= 0 || o.estado === 'queimando') return false
  o.estado = 'queimando'
  return true
}
export function molhar(o: ObjetoMaterial): void {
  o.umidade = 1
  o.calor = 0
  o.estado = o.combustivel <= 0 ? 'queimado' : o.estado === 'queimando' ? 'apagado' : 'molhado'
}
/** Grade esparsa: posições fixas, um acumulador preparado antes, sem criar células no passo. */
export function passoDosMateriais(
  objetos: readonly ObjetoMaterial[],
  calor: Float64Array,
  vento: Vento,
  dt: number,
): void {
  if (calor.length !== objetos.length)
    throw new Error('A grade precisa de um acumulador por objeto')
  const h = Math.min(Math.max(dt, 0), 1 / 60)
  // Lê todos os estados antigos antes de escrever. A ordem das células não muda o resultado.
  calor.fill(0)
  for (let i = 0; i < objetos.length; i++) {
    const a = objetos[i]!
    const f = combustao(a)
    if (a.estado !== 'queimando' || !f) continue
    for (let j = 0; j < objetos.length; j++) {
      const b = objetos[j]!
      if (i === j || a.recinto !== b.recinto || b.umidade > 0 || b.combustivel <= 0) continue
      const dx = b.x - a.x,
        dz = b.z - a.z,
        d = Math.hypot(dx, dz)
      if (d > 1.1) continue
      const aFavor = Math.max(
        -0.8,
        Math.min(0.8, (dx * vento.x + dz * vento.z) / Math.max(d, 0.01)),
      )
      calor[j]! += (f.calor * (1 + aFavor)) / (1 + d * d)
    }
  }
  for (let i = 0; i < objetos.length; i++) {
    const o = objetos[i]!,
      f = combustao(o)
    if (o.umidade > 0) {
      o.umidade = Math.max(0, o.umidade - h / (f?.secagem ?? 15))
      o.calor = 0
      if (o.umidade === 0 && o.combustivel > 0) o.estado = 'seco'
      continue
    }
    if (o.estado === 'queimando' && f) {
      o.combustivel = Math.max(0, o.combustivel - h / f.duracao)
      if (o.combustivel === 0) {
        o.estado = 'queimado'
        o.calor = 0
      }
    } else if (f && o.combustivel > 0) {
      o.calor = Math.max(0, o.calor + (calor[i]! - 0.5) * h)
      if (o.calor >= f.ignicao) acender(o)
    }
  }
}
