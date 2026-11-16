import { z } from 'zod'
import type { CatalogoDeCenario } from './catalogo'
import {
  AguaSchema,
  CaminhoSchema,
  type DocumentoDeCenario,
  GrupoSchema,
  InstanciaSchema,
  LIMITES_CENARIO,
  MarcoSchema,
  RelevoSchema,
} from './documento'
import { CenarioInvalido, validarDocumento } from './validacao'

const id = z.string().min(1).max(240)
export const ComandoDeCenarioSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('instancia.criar'), instancia: InstanciaSchema }).strict(),
  z
    .object({
      tipo: z.literal('instancia.atualizar'),
      id,
      alteracoes: InstanciaSchema.omit({ id: true }).partial(),
    })
    .strict(),
  z.object({ tipo: z.literal('instancia.remover'), id }).strict(),
  z.object({ tipo: z.literal('grupo.definir'), grupo: GrupoSchema }).strict(),
  z.object({ tipo: z.literal('grupo.remover'), id }).strict(),
  z.object({ tipo: z.literal('caminho.definir'), caminho: CaminhoSchema }).strict(),
  z.object({ tipo: z.literal('caminho.remover'), id }).strict(),
  z.object({ tipo: z.literal('agua.definir'), agua: AguaSchema }).strict(),
  z.object({ tipo: z.literal('agua.remover'), id }).strict(),
  z.object({ tipo: z.literal('relevo.definir'), relevo: RelevoSchema }).strict(),
  z.object({ tipo: z.literal('relevo.remover'), id }).strict(),
  z.object({ tipo: z.literal('marco.definir'), marco: MarcoSchema }).strict(),
  z.object({ tipo: z.literal('marco.remover'), id }).strict(),
  z.object({ tipo: z.literal('iluminacao.definir'), noite: z.boolean() }).strict(),
  z.object({ tipo: z.literal('projeto.renomear'), nome: z.string().min(1).max(120) }).strict(),
])
export const LoteDeCenarioSchema = z
  .object({
    revisaoEsperada: z.number().int().nonnegative(),
    comandos: z.array(ComandoDeCenarioSchema).min(1).max(LIMITES_CENARIO.comandos),
  })
  .strict()
export type ComandoDeCenario = z.infer<typeof ComandoDeCenarioSchema>
export type LoteDeCenario = z.infer<typeof LoteDeCenarioSchema>
export interface EstadoDeCenario {
  documento: DocumentoDeCenario
  revisao: number
}
export class ConflitoDeCenario extends Error {
  constructor(public readonly revisaoAtual: number) {
    super(`O cenário mudou. Revisão atual: ${revisaoAtual}`)
    this.name = 'ConflitoDeCenario'
  }
}
function exigeLivre(
  d: DocumentoDeCenario,
  e: { id: string; bloqueado: boolean; grupo: string | null },
  desbloqueando = false,
) {
  if (e.bloqueado && !desbloqueando) throw new CenarioInvalido([`Elemento bloqueado: ${e.id}`])
  let pai = e.grupo
  const visitados = new Set<string>()
  while (pai) {
    if (visitados.has(pai)) throw new CenarioInvalido([`Ciclo de grupos: ${pai}`])
    visitados.add(pai)
    const g = d.grupos.find((g) => g.id === pai)
    if (!g) break
    if (g.bloqueado) throw new CenarioInvalido([`Grupo bloqueado: ${pai}`])
    pai = g.grupo
  }
}
function existente<T extends { id: string }>(lista: readonly T[], id: string): T {
  const e = lista.find((o) => o.id === id)
  if (!e) throw new CenarioInvalido([`Elemento ausente: ${id}`])
  return e
}
function definir<T extends { id: string }>(lista: T[], valor: T) {
  const i = lista.findIndex((o) => o.id === valor.id)
  if (i < 0) lista.push(valor)
  else lista[i] = valor
}
/** O lote trabalha numa cópia validada. Só retorna um novo estado quando TODOS os comandos e vínculos são válidos. */
export function executarLote(
  estado: EstadoDeCenario,
  entrada: unknown,
  catalogo?: CatalogoDeCenario,
): EstadoDeCenario {
  const lote = LoteDeCenarioSchema.parse(entrada)
  if (lote.revisaoEsperada !== estado.revisao) throw new ConflitoDeCenario(estado.revisao)
  const d = validarDocumento(estado.documento, catalogo)
  for (const c of lote.comandos) {
    switch (c.tipo) {
      case 'instancia.criar':
        if (d.instancias.some((o) => o.id === c.instancia.id))
          throw new CenarioInvalido([`Identificador duplicado: ${c.instancia.id}`])
        exigeLivre(d, { ...c.instancia, bloqueado: false })
        d.instancias.push(c.instancia)
        break
      case 'instancia.atualizar': {
        const o = existente(d.instancias, c.id),
          chaves = Object.keys(c.alteracoes)
        exigeLivre(d, o, chaves.length === 1 && c.alteracoes.bloqueado === false)
        if (c.alteracoes.grupo !== undefined)
          exigeLivre(d, { ...o, grupo: c.alteracoes.grupo, bloqueado: false })
        Object.assign(o, c.alteracoes)
        break
      }
      case 'instancia.remover':
        exigeLivre(d, existente(d.instancias, c.id))
        d.instancias = d.instancias.filter((o) => o.id !== c.id)
        break
      case 'grupo.definir': {
        exigeLivre(d, { ...c.grupo, bloqueado: false })
        const g = d.grupos.find((g) => g.id === c.grupo.id)
        if (g)
          exigeLivre(
            d,
            g,
            !c.grupo.bloqueado &&
              g.nome === c.grupo.nome &&
              g.grupo === c.grupo.grupo &&
              g.oculto === c.grupo.oculto,
          )
        definir(d.grupos, c.grupo)
        break
      }
      case 'grupo.remover':
        exigeLivre(d, existente(d.grupos, c.id))
        d.grupos = d.grupos.filter((g) => g.id !== c.id)
        break
      case 'caminho.definir': {
        exigeLivre(d, { ...c.caminho, bloqueado: false })
        const e = d.caminhos.find((e) => e.id === c.caminho.id)
        if (e) exigeLivre(d, e)
        definir(d.caminhos, c.caminho)
        break
      }
      case 'caminho.remover':
        exigeLivre(d, existente(d.caminhos, c.id))
        d.caminhos = d.caminhos.filter((e) => e.id !== c.id)
        break
      case 'agua.definir': {
        exigeLivre(d, { ...c.agua, bloqueado: false })
        const e = d.aguas.find((e) => e.id === c.agua.id)
        if (e) exigeLivre(d, e)
        definir(d.aguas, c.agua)
        break
      }
      case 'agua.remover':
        exigeLivre(d, existente(d.aguas, c.id))
        d.aguas = d.aguas.filter((e) => e.id !== c.id)
        break
      case 'relevo.definir':
        definir(d.relevo, c.relevo)
        break
      case 'relevo.remover':
        existente(d.relevo, c.id)
        d.relevo = d.relevo.filter((e) => e.id !== c.id)
        break
      case 'marco.definir':
        definir(d.marcos, c.marco)
        break
      case 'marco.remover':
        existente(d.marcos, c.id)
        d.marcos = d.marcos.filter((e) => e.id !== c.id)
        break
      case 'iluminacao.definir':
        d.iluminacao.noite = c.noite
        break
      case 'projeto.renomear':
        d.nome = c.nome
        break
    }
  }
  return { documento: validarDocumento(d, catalogo), revisao: estado.revisao + 1 }
}
