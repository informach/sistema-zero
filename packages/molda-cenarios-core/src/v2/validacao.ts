import { CenarioInvalido, poligonoSimples } from '../validacao'
import {
  type DocumentoDeCenario,
  DocumentoDeCenarioSchema,
  LIMITES_CENARIO_V2,
  type ModeloDoCenario,
} from './documento'
import { volumeDaReferencia } from './fontes'

export interface OpcoesDeValidacao {
  /** Confere se o modelo fixado existe no acervo de quem valida (o servidor, em geral). */
  modeloExiste?: (modelo: ModeloDoCenario) => boolean
}

export function validarDocumento(
  valor: unknown,
  opcoes: OpcoesDeValidacao = {},
): DocumentoDeCenario {
  const r = DocumentoDeCenarioSchema.safeParse(valor)
  if (!r.success)
    throw new CenarioInvalido(r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`))
  const d = r.data,
    erros: string[] = [],
    ids = new Set<string>(),
    grupos = new Map(d.grupos.map((g) => [g.id, g])),
    objetos = new Map(d.instancias.map((o) => [o.id, o])),
    aguas = new Set(d.aguas.map((a) => a.id)),
    modelos = new Set<string>()
  if (new TextEncoder().encode(JSON.stringify(d)).length > LIMITES_CENARIO_V2.bytes)
    erros.push('Documento excede o orçamento de bytes')

  for (const m of d.modelos) {
    if (modelos.has(m.id)) erros.push(`Modelo duplicado: ${m.id}`)
    modelos.add(m.id)
    if (opcoes.modeloExiste && !opcoes.modeloExiste(m)) erros.push(`Modelo ausente: ${m.id}`)
  }
  const fontes = new Set(modelos)
  for (const f of d.formas ?? []) {
    if (fontes.has(f.id)) erros.push(`Definição de forma duplicada: ${f.id}`)
    fontes.add(f.id)
  }

  const entidades = [...d.grupos, ...d.instancias, ...d.caminhos, ...d.aguas, ...d.marcadores]
  for (const e of entidades) {
    if (ids.has(e.id)) erros.push(`Identificador duplicado: ${e.id}`)
    ids.add(e.id)
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

  for (const o of d.instancias) {
    if (!fontes.has(o.modelo)) erros.push(`Modelo fora da tabela do cenário: ${o.id}`)
    if (o.apoio.tipo === 'objeto' && o.apoio.contato && !volumeDaReferencia(d, o.modelo))
      erros.push(`O encaixe em superfície exige medidas do modelo: ${o.id}`)
    if (o.apoio.tipo === 'agua' && !aguas.has(o.apoio.agua))
      erros.push(`Água de apoio ausente: ${o.id}`)
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
  }

  for (const c of d.caminhos) {
    if (c.acabamento && !modelos.has(c.acabamento))
      erros.push(`Acabamento fora da tabela do cenário: ${c.id}`)
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
    if (a.tipo !== 'lago') continue
    if (!poligonoSimples(a.contorno) || !poligonoSimples(a.recorte))
      erros.push(`Contorno de água inválido: ${a.id}`)
    if (a.modelo && !modelos.has(a.modelo))
      erros.push(`Modelo de água fora da tabela do cenário: ${a.id}`)
  }
  if (d.aguas.filter((a) => a.tipo === 'mar').length > 1) erros.push('Só cabe um mar por cenário')

  for (const m of d.marcadores)
    if (m.objeto && !objetos.has(m.objeto)) erros.push(`Objeto do marcador ausente: ${m.id}`)

  if (d.base.tipo === 'perfil') {
    const carimbos = new Set<string>()
    for (const c of d.base.carimbos) {
      if (carimbos.has(c.id)) erros.push(`Carimbo duplicado: ${c.id}`)
      carimbos.add(c.id)
    }
    if (d.base.carimbos.reduce((s, c) => s + Math.ceil((c.raio * 2) / 4 + 2) ** 2, 0) > 2_000_000)
      erros.push('Relevo excede o orçamento de amostragem')
  }

  if (erros.length) throw new CenarioInvalido(erros)
  return d
}
