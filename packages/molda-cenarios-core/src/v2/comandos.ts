import { z } from 'zod'
import { ConflitoDeCenario } from '../comandos'
import { CenarioInvalido } from '../validacao'
import {
  AguaSchema,
  BaseSchema,
  CaminhoSchema,
  type DocumentoDeCenario,
  DocumentoDeCenarioSchema,
  GrupoSchema,
  IluminacaoSchema,
  InstanciaSchema,
  LIMITES_CENARIO_V2,
  MarcadorSchema,
  ModeloDoCenarioSchema,
} from './documento'
import { FormaDeCenarioSchema } from './formas'
import { type OpcoesDeValidacao, validarDocumento } from './validacao'

const id = z.string().min(1).max(240)

/** A mesma lista serve à edição pela mão e aos agentes. */
export const ComandoDeCenarioSchema = z.discriminatedUnion('tipo', [
  /** Restauração atômica de uma versão; conserva a identidade do cenário. */
  z.object({ tipo: z.literal('cenario.restaurar'), documento: DocumentoDeCenarioSchema }).strict(),
  z.object({ tipo: z.literal('modelo.definir'), modelo: ModeloDoCenarioSchema }).strict(),
  z.object({ tipo: z.literal('modelo.remover'), id }).strict(),
  z.object({ tipo: z.literal('forma.definir'), forma: FormaDeCenarioSchema }).strict(),
  z.object({ tipo: z.literal('forma.remover'), id }).strict(),
  z.object({ tipo: z.literal('instancia.criar'), instancia: InstanciaSchema }).strict(),
  z
    .object({
      tipo: z.literal('instancia.atualizar'),
      id,
      alteracoes: InstanciaSchema.omit({ id: true }).partial(),
    })
    .strict(),
  z.object({ tipo: z.literal('instancia.remover'), id }).strict(),
  /** Grava o objeto inteiro por cima (ou cria). É o que o desfazer usa para devolver um estado. */
  z.object({ tipo: z.literal('instancia.definir'), instancia: InstanciaSchema }).strict(),
  z.object({ tipo: z.literal('grupo.definir'), grupo: GrupoSchema }).strict(),
  z.object({ tipo: z.literal('grupo.remover'), id }).strict(),
  z.object({ tipo: z.literal('caminho.definir'), caminho: CaminhoSchema }).strict(),
  z.object({ tipo: z.literal('caminho.remover'), id }).strict(),
  z.object({ tipo: z.literal('agua.definir'), agua: AguaSchema }).strict(),
  z.object({ tipo: z.literal('agua.remover'), id }).strict(),
  z.object({ tipo: z.literal('marcador.definir'), marcador: MarcadorSchema }).strict(),
  z.object({ tipo: z.literal('marcador.remover'), id }).strict(),
  z.object({ tipo: z.literal('base.definir'), base: BaseSchema }).strict(),
  z.object({ tipo: z.literal('iluminacao.definir'), iluminacao: IluminacaoSchema }).strict(),
  z.object({ tipo: z.literal('cenario.renomear'), nome: z.string().min(1).max(120) }).strict(),
])
export const LoteDeCenarioSchema = z
  .object({
    revisaoEsperada: z.number().int().nonnegative(),
    comandos: z.array(ComandoDeCenarioSchema).min(1).max(LIMITES_CENARIO_V2.comandos),
  })
  .strict()
export type ComandoDeCenario = z.infer<typeof ComandoDeCenarioSchema>
export type LoteDeCenario = z.infer<typeof LoteDeCenarioSchema>
export interface EstadoDeCenario {
  documento: DocumentoDeCenario
  revisao: number
}

type Travavel = { id: string; bloqueado: boolean; grupo: string | null }

function exigeLivre(d: DocumentoDeCenario, e: Travavel, desbloqueando = false) {
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
/** Comparação estrutural que não depende da ordem das chaves. */
export function igual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const ka = Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] !== undefined),
    kb = Object.keys(b).filter((k) => (b as Record<string, unknown>)[k] !== undefined)
  return (
    ka.length === kb.length &&
    ka.every((k) => igual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
  )
}
/** Grava por cima respeitando o cadeado do que já existia e do grupo de destino. */
function definirTravavel<T extends Travavel>(d: DocumentoDeCenario, lista: T[], valor: T) {
  exigeLivre(d, { ...valor, bloqueado: false })
  const atual = lista.find((e) => e.id === valor.id)
  // Tirar o cadeado, e nada mais, é a única mudança aceita num elemento trancado.
  if (atual) exigeLivre(d, atual, !valor.bloqueado && igual({ ...atual, bloqueado: false }, valor))
  definir(lista, valor)
}
function removerTravavel<T extends Travavel>(d: DocumentoDeCenario, lista: T[], id: string): T[] {
  exigeLivre(d, existente(lista, id))
  return lista.filter((e) => e.id !== id)
}
function modeloEmUso(d: DocumentoDeCenario, id: string) {
  return (
    d.instancias.some((o) => o.modelo === id) ||
    d.caminhos.some((c) => c.acabamento === id) ||
    d.aguas.some((a) => a.tipo === 'lago' && a.modelo === id)
  )
}

/** O lote trabalha numa cópia validada. Só devolve estado novo quando TODOS os comandos e vínculos valem. */
export function executarLote(
  estado: EstadoDeCenario,
  entrada: unknown,
  opcoes: OpcoesDeValidacao = {},
): EstadoDeCenario {
  const lote = LoteDeCenarioSchema.parse(entrada)
  if (lote.revisaoEsperada !== estado.revisao) throw new ConflitoDeCenario(estado.revisao)
  let d = validarDocumento(estado.documento, opcoes)
  for (const c of lote.comandos) {
    switch (c.tipo) {
      case 'cenario.restaurar':
        if (c.documento.id !== d.id)
          throw new CenarioInvalido(['A restauração precisa ser deste cenário'])
        d = validarDocumento(c.documento, opcoes)
        break
      case 'modelo.definir':
        definir(d.modelos, c.modelo)
        break
      case 'modelo.remover':
        existente(d.modelos, c.id)
        if (modeloEmUso(d, c.id)) throw new CenarioInvalido([`Modelo em uso: ${c.id}`])
        d.modelos = d.modelos.filter((m) => m.id !== c.id)
        break
      case 'forma.definir':
        for (const o of d.instancias) if (o.modelo === c.forma.id) exigeLivre(d, o)
        d.formas ??= []
        definir(d.formas, c.forma)
        break
      case 'forma.remover':
        existente(d.formas ?? [], c.id)
        if (modeloEmUso(d, c.id)) throw new CenarioInvalido([`Forma em uso: ${c.id}`])
        d.formas = d.formas?.filter((f) => f.id !== c.id)
        if (!d.formas?.length) delete d.formas
        break
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
        d.instancias = removerTravavel(d, d.instancias, c.id)
        break
      case 'instancia.definir':
        definirTravavel(d, d.instancias, c.instancia)
        break
      case 'grupo.definir':
        definirTravavel(d, d.grupos, c.grupo)
        break
      case 'grupo.remover':
        d.grupos = removerTravavel(d, d.grupos, c.id)
        break
      case 'caminho.definir':
        definirTravavel(d, d.caminhos, c.caminho)
        break
      case 'caminho.remover':
        d.caminhos = removerTravavel(d, d.caminhos, c.id)
        break
      case 'agua.definir':
        definirTravavel(d, d.aguas, c.agua)
        break
      case 'agua.remover':
        d.aguas = removerTravavel(d, d.aguas, c.id)
        break
      case 'marcador.definir':
        definirTravavel(d, d.marcadores, c.marcador)
        break
      case 'marcador.remover':
        d.marcadores = removerTravavel(d, d.marcadores, c.id)
        break
      case 'base.definir':
        d.base = c.base
        break
      case 'iluminacao.definir':
        d.iluminacao = c.iluminacao
        break
      case 'cenario.renomear':
        d.nome = c.nome
        break
    }
  }
  return { documento: validarDocumento(d, opcoes), revisao: estado.revisao + 1 }
}
