import type { CatalogoDeCenario } from './catalogo'
import {
  type DocumentoDeCenario,
  DocumentoDeCenarioSchema,
  LIMITES_CENARIO,
  type Ponto,
} from './documento'
import { algumParSeCruza, segmentosSeCruzam as cruza } from './poligonos'

export class CenarioInvalido extends Error {
  constructor(public readonly problemas: readonly string[]) {
    super(problemas.join('\n'))
    this.name = 'CenarioInvalido'
  }
}
function area(p: readonly Ponto[]) {
  return (
    p.reduce((s, a, i) => {
      const b = p[(i + 1) % p.length]!
      return s + a.x * b.z - b.x * a.z
    }, 0) / 2
  )
}
export function poligonoSimples(p: readonly Ponto[]): boolean {
  if (p.length < 3 || Math.abs(area(p)) < 1e-6) return false
  for (let i = 0; i < p.length; i++) {
    const a = p[i]!,
      b = p[(i + 1) % p.length]!
    if (Math.hypot(a.x - b.x, a.z - b.z) < 1e-6) return false
  }
  const n = p.length,
    vizinhos = (i: number, j: number) =>
      Math.abs(i - j) === 1 || (Math.min(i, j) === 0 && Math.max(i, j) === n - 1)
  if (n > 64)
    return !algumParSeCruza(
      p.map((a, i) => [a, p[(i + 1) % n]!] as const),
      vizinhos,
    )
  for (let i = 0; i < n; i++) {
    const a = p[i]!,
      b = p[(i + 1) % n]!
    for (let j = i + 1; j < n; j++) {
      if (vizinhos(i, j)) continue
      if (cruza(a, b, p[j]!, p[(j + 1) % n]!)) return false
    }
  }
  return true
}
export function validarDocumento(valor: unknown, catalogo?: CatalogoDeCenario): DocumentoDeCenario {
  const r = DocumentoDeCenarioSchema.safeParse(valor)
  if (!r.success)
    throw new CenarioInvalido(r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`))
  const d = r.data,
    erros: string[] = [],
    ids = new Set<string>(),
    grupos = new Map(d.grupos.map((g) => [g.id, g])),
    objetos = new Map(d.instancias.map((o) => [o.id, o]))
  if (new TextEncoder().encode(JSON.stringify(d)).length > LIMITES_CENARIO.bytes)
    erros.push('Documento excede o orçamento de bytes')
  if (d.relevo.reduce((s, c) => s + Math.ceil((c.raio * 2) / 4 + 2) ** 2, 0) > 2_000_000)
    erros.push('Relevo excede o orçamento de amostragem; divida a edição em regiões menores')
  for (const e of [
    ...d.grupos,
    ...d.instancias,
    ...d.caminhos,
    ...d.aguas,
    ...d.relevo,
    ...d.marcos,
  ]) {
    if (ids.has(e.id)) erros.push(`Identificador duplicado: ${e.id}`)
    ids.add(e.id)
  }
  for (const e of [...d.grupos, ...d.instancias, ...d.caminhos, ...d.aguas]) {
    if (e.grupo && !grupos.has(e.grupo)) erros.push(`Grupo ausente: ${e.id}`)
    let pai = e.grupo
    const vistos = new Set([e.id])
    while (pai) {
      if (vistos.has(pai)) {
        erros.push(`Ciclo de grupos: ${e.id}`)
        break
      }
      vistos.add(pai)
      if (vistos.size > 64) {
        erros.push(`Hierarquia de grupos excede 64 níveis: ${e.id}`)
        break
      }
      pai = grupos.get(pai)?.grupo ?? null
    }
  }
  const atores = new Set<string>()
  for (const o of d.instancias) {
    if (
      o.apoio.tipo === 'agua' &&
      !d.aguas.some((a) => a.id === (o.apoio.tipo === 'agua' ? o.apoio.agua : null))
    )
      erros.push(`Água de apoio ausente: ${o.id}`)
    if (o.ator) {
      if (atores.has(o.ator)) erros.push(`Ator duplicado: ${o.ator}`)
      atores.add(o.ator)
    }
    if (catalogo && !catalogo.has(o.modelo)) erros.push(`Modelo ausente: ${o.modelo}`)
    const vistos = new Set([o.id])
    let apoio = o.apoio
    while (apoio.tipo === 'objeto') {
      if (vistos.has(apoio.objeto)) {
        erros.push(`Ciclo de apoios: ${o.id}`)
        break
      }
      vistos.add(apoio.objeto)
      if (vistos.size > 64) {
        erros.push(`Hierarquia de apoios excede 64 níveis: ${o.id}`)
        break
      }
      const base = objetos.get(apoio.objeto)
      if (!base) {
        erros.push(`Apoio ausente: ${o.id}`)
        break
      }
      apoio = base.apoio
    }
    if (o.sinal && !d.marcos.some((m) => m.id === o.sinal?.destino))
      erros.push(`Destino ausente: ${o.id}`)
  }
  for (const c of d.caminhos) {
    if (catalogo && !catalogo.has(c.acabamento)) erros.push(`Acabamento ausente: ${c.id}`)
    if (c.tipo === 'praca' && !poligonoSimples(c.pontos))
      erros.push(`Contorno de praça inválido: ${c.id}`)
    if (
      c.pontos.some(
        (p, i) => i > 0 && Math.hypot(p.x - c.pontos[i - 1]!.x, p.z - c.pontos[i - 1]!.z) < 1e-6,
      )
    )
      erros.push(`Pontos repetidos: ${c.id}`)
  }
  for (const a of d.aguas) {
    if (!poligonoSimples(a.contorno) || !poligonoSimples(a.recorte))
      erros.push(`Contorno de água inválido: ${a.id}`)
    if (a.modelo && catalogo && !catalogo.has(a.modelo))
      erros.push(`Modelo de água ausente: ${a.id}`)
  }
  for (const m of d.marcos)
    if (m.objeto && !objetos.has(m.objeto)) erros.push(`Objeto do marco ausente: ${m.id}`)
  if (erros.length) throw new CenarioInvalido(erros)
  return d
}
