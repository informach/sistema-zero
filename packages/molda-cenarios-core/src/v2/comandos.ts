import { z } from 'zod'
import { ConflitoDeCenario } from '../comandos'
import { VetorSchema } from '../documento'
import { CenarioInvalido } from '../validacao'
import { resolverConjuntos } from './conjuntos'
import { DefinicaoDeConjuntoSchema, MontagemDeConjuntoSchema } from './conjuntos-schema'
import {
  AguaSchema,
  BaseSchema,
  CamadaSchema,
  CaminhoSchema,
  type DocumentoDeCenario,
  DocumentoDeCenarioSchema,
  GrupoSchema,
  IluminacaoSchema,
  InstanciaSchema,
  LIMITES_CENARIO_V2,
  MarcadorSchema,
  ModeloDoCenarioSchema,
  TexturaDoCenarioSchema,
} from './documento'
import { materializarEspalhamento } from './espalhar'
import { PinceladaDeObjetosSchema } from './espalhar-schema'
import { FormaDeCenarioSchema } from './formas'
import { colarFragmento } from './fragmento'
import { FragmentoDeCenarioSchema, PrefixoDeColagemSchema } from './fragmento-schema'
import { igual } from './igual'

import { entidadesDoCenario, referenciaDeModelo } from './organizacao'
import { type OpcoesDeValidacao, validarDocumento } from './validacao'

export { igual } from './igual'

const id = z.string().min(1).max(240)
const idsOrganizaveis = z
  .array(id)
  .min(1)
  .max(LIMITES_CENARIO_V2.objetos)
  .refine((ids) => new Set(ids).size === ids.length, 'Identificadores repetidos')

/** A mesma lista serve à edição pela mão e aos agentes. */
export const ComandoDeCenarioSchema = z.discriminatedUnion('tipo', [
  /** Restauração atômica de uma versão; conserva a identidade do cenário. */
  z.object({ tipo: z.literal('cenario.restaurar'), documento: DocumentoDeCenarioSchema }).strict(),
  z
    .object({
      tipo: z.literal('fragmento.colar'),
      fragmento: FragmentoDeCenarioSchema,
      prefixo: PrefixoDeColagemSchema,
      ponto: VetorSchema,
    })
    .strict(),
  z.object({ tipo: z.literal('modelo.definir'), modelo: ModeloDoCenarioSchema }).strict(),
  z.object({ tipo: z.literal('conjunto.definir'), definicao: DefinicaoDeConjuntoSchema }).strict(),
  z.object({ tipo: z.literal('conjunto.remover'), id }).strict(),
  z
    .object({ tipo: z.literal('conjunto.atualizar'), definicao: DefinicaoDeConjuntoSchema })
    .strict(),
  z.object({ tipo: z.literal('montagem.definir'), montagem: MontagemDeConjuntoSchema }).strict(),
  z
    .object({
      tipo: z.literal('montagem.atualizar'),
      id,
      alteracoes: MontagemDeConjuntoSchema.omit({ id: true }).partial(),
    })
    .strict(),
  z.object({ tipo: z.literal('montagem.remover'), id }).strict(),
  z.object({ tipo: z.literal('montagem.desvincular'), id }).strict(),
  z
    .object({
      tipo: z.literal('montagem.duplicar'),
      id,
      novoId: z.string().min(1).max(160),
      nome: z.string().min(1).max(120).optional(),
      deslocamento: VetorSchema,
    })
    .strict(),
  z.object({ tipo: z.literal('objetos.espalhar'), pincelada: PinceladaDeObjetosSchema }).strict(),
  z.object({ tipo: z.literal('modelo.remover'), id }).strict(),
  z.object({ tipo: z.literal('textura.definir'), textura: TexturaDoCenarioSchema }).strict(),
  z.object({ tipo: z.literal('textura.remover'), id }).strict(),
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
  z.object({ tipo: z.literal('grupo.remover'), id, desagrupar: z.boolean().optional() }).strict(),
  z.object({ tipo: z.literal('camada.definir'), camada: CamadaSchema }).strict(),
  z
    .object({ tipo: z.literal('camada.remover'), id, transferirPara: id.nullable().optional() })
    .strict(),
  z
    .object({
      tipo: z.literal('elementos.organizar'),
      ids: idsOrganizaveis,
      destino: z
        .object({ grupo: id.nullable().optional(), camada: id.nullable().optional() })
        .strict()
        .refine(
          (d) => d.grupo !== undefined || d.camada !== undefined,
          'Escolha uma pasta ou camada de destino',
        ),
    })
    .strict(),
  z.object({ tipo: z.literal('elementos.remover'), ids: idsOrganizaveis }).strict(),
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

type Travavel = { id: string; bloqueado: boolean; grupo: string | null; camada?: string | null }

function indiceDeTravas(d: DocumentoDeCenario) {
  return {
    grupos: new Map(d.grupos.map((g) => [g.id, g])),
    camadas: new Map(d.camadas?.map((c) => [c.id, c]) ?? []),
  }
}
type IndiceDeTravas = ReturnType<typeof indiceDeTravas>

function exigeCamadaLivre(d: IndiceDeTravas, id: string | null | undefined) {
  if (!id) return
  const camada = d.camadas.get(id)
  if (!camada) throw new CenarioInvalido([`Camada ausente: ${id}`])
  if (camada.bloqueado) throw new CenarioInvalido([`Camada bloqueada: ${id}`])
}

function exigeLivre(d: IndiceDeTravas, e: Travavel, desbloqueando = false) {
  if (e.bloqueado && !desbloqueando) throw new CenarioInvalido([`Elemento bloqueado: ${e.id}`])
  exigeCamadaLivre(d, e.camada)
  let pai = e.grupo
  const visitados = new Set<string>()
  while (pai) {
    if (visitados.has(pai)) throw new CenarioInvalido([`Ciclo de grupos: ${pai}`])
    visitados.add(pai)
    const g = d.grupos.get(pai)
    if (!g) break
    if (g.bloqueado) throw new CenarioInvalido([`Grupo bloqueado: ${pai}`])
    exigeCamadaLivre(d, g.camada)
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
/** Grava por cima respeitando o cadeado do que já existia e do grupo de destino. */
function definirTravavel<T extends Travavel>(d: IndiceDeTravas, lista: T[], valor: T) {
  exigeLivre(d, { ...valor, bloqueado: false })
  const atual = lista.find((e) => e.id === valor.id)
  // Tirar o cadeado, e nada mais, é a única mudança aceita num elemento trancado.
  if (atual) exigeLivre(d, atual, !valor.bloqueado && igual({ ...atual, bloqueado: false }, valor))
  definir(lista, valor)
}
function removerTravavel<T extends Travavel>(d: IndiceDeTravas, lista: T[], id: string): T[] {
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
  let travas = indiceDeTravas(d)
  for (const c of lote.comandos) {
    switch (c.tipo) {
      case 'conjunto.definir': {
        const atual = d.definicoesConjuntos?.find((e) => e.id === c.definicao.id)
        if (atual && !igual(atual, c.definicao))
          throw new CenarioInvalido(['A definição fixada é imutável; use uma nova revisão'])
        d.definicoesConjuntos ??= []
        definir(d.definicoesConjuntos, c.definicao)
        break
      }
      case 'conjunto.remover':
        if (d.montagens?.some((m) => m.definicao === c.id))
          throw new CenarioInvalido(['A definição do conjunto está em uso'])
        d.definicoesConjuntos = d.definicoesConjuntos?.filter((e) => e.id !== c.id)
        if (!d.definicoesConjuntos?.length) delete d.definicoesConjuntos
        break
      case 'conjunto.atualizar': {
        const definicao = c.definicao,
          antigas = new Set(
            (d.definicoesConjuntos ?? [])
              .filter(
                (e) => e.biblioteca === definicao.biblioteca && e.conjunto === definicao.conjunto,
              )
              .map((e) => e.id),
          )
        const alvos = (d.montagens ?? []).filter((m) => antigas.has(m.definicao))
        for (const m of alvos) {
          exigeLivre(travas, m)
          const anterior = d.definicoesConjuntos!.find((e) => e.id === m.definicao)!
          if (anterior.revisao > definicao.revisao)
            throw new CenarioInvalido(['A definição recebida é anterior à montagem atual'])
          if (
            anterior.revisao === definicao.revisao &&
            !igual({ ...anterior, id: definicao.id }, definicao)
          )
            throw new CenarioInvalido(['A revisão da definição é imutável'])
        }
        const atual = d.definicoesConjuntos?.find((e) => e.id === definicao.id)
        if (atual && !igual(atual, definicao))
          throw new CenarioInvalido(['A definição fixada é imutável; use uma nova revisão'])
        for (const m of alvos) m.definicao = definicao.id
        d.definicoesConjuntos = (d.definicoesConjuntos ?? []).filter(
          (e) => !antigas.has(e.id) || d.montagens?.some((m) => m.definicao === e.id),
        )
        definir(d.definicoesConjuntos, definicao)
        break
      }
      case 'montagem.definir':
        d.montagens ??= []
        definirTravavel(travas, d.montagens, c.montagem)
        break
      case 'montagem.atualizar': {
        const atual = existente(d.montagens ?? [], c.id)
        definirTravavel(travas, d.montagens!, { ...atual, ...c.alteracoes })
        break
      }
      case 'montagem.remover':
        d.montagens = removerTravavel(travas, d.montagens ?? [], c.id)
        if (!d.montagens.length) delete d.montagens
        break
      case 'montagem.desvincular': {
        const atual = existente(d.montagens ?? [], c.id)
        exigeLivre(travas, atual)
        const outras = d.montagens!.filter((m) => m.id !== c.id),
          definicoes = d.definicoesConjuntos
        d = resolverConjuntos({ ...d, montagens: [atual] }).documento
        if (outras.length) d.montagens = outras
        if (definicoes?.length) d.definicoesConjuntos = definicoes
        travas = indiceDeTravas(d)
        break
      }
      case 'montagem.duplicar': {
        const atual = existente(d.montagens ?? [], c.id)
        exigeLivre(travas, atual)
        if (entidadesDoCenario(d).some((e) => e.id === c.novoId))
          throw new CenarioInvalido(['O identificador da cópia já está em uso'])
        const p = atual.transformacao.posicao
        d.montagens!.push({
          ...atual,
          id: c.novoId,
          nome: c.nome ?? atual.nome,
          transformacao: {
            ...atual.transformacao,
            posicao: {
              x: p.x + c.deslocamento.x,
              y: p.y + c.deslocamento.y,
              z: p.z + c.deslocamento.z,
            },
          },
        })
        break
      }
      case 'objetos.espalhar': {
        const novas = materializarEspalhamento(d, c.pincelada)
        for (const o of novas) exigeLivre(travas, o)
        d.instancias.push(...novas)
        break
      }
      case 'fragmento.colar':
        d = colarFragmento(d, c.fragmento, c.prefixo, c.ponto)
        travas = indiceDeTravas(d)
        break
      case 'cenario.restaurar':
        if (c.documento.id !== d.id)
          throw new CenarioInvalido(['A restauração precisa ser deste cenário'])
        d = validarDocumento(c.documento, opcoes)
        travas = indiceDeTravas(d)
        break
      case 'modelo.definir':
        for (const o of entidadesDoCenario(d))
          if (referenciaDeModelo(o) === c.modelo.id) exigeLivre(travas, o)
        definir(d.modelos, c.modelo)
        break
      case 'modelo.remover':
        existente(d.modelos, c.id)
        if (modeloEmUso(d, c.id)) throw new CenarioInvalido([`Modelo em uso: ${c.id}`])
        d.modelos = d.modelos.filter((m) => m.id !== c.id)
        break
      case 'forma.definir':
        for (const o of d.instancias) if (o.modelo === c.forma.id) exigeLivre(travas, o)
        d.formas ??= []
        definir(d.formas, c.forma)
        break
      case 'textura.definir':
        for (const o of d.instancias)
          if (o.aparencia?.textura?.id === c.textura.id) exigeLivre(travas, o)
        d.texturas ??= []
        definir(d.texturas, c.textura)
        break
      case 'textura.remover':
        existente(d.texturas ?? [], c.id)
        if (d.instancias.some((o) => o.aparencia?.textura?.id === c.id))
          throw new CenarioInvalido([`Textura em uso: ${c.id}`])
        d.texturas = d.texturas?.filter((t) => t.id !== c.id)
        if (!d.texturas?.length) delete d.texturas
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
        exigeLivre(travas, { ...c.instancia, bloqueado: false })
        d.instancias.push(c.instancia)
        break
      case 'instancia.atualizar': {
        const o = existente(d.instancias, c.id),
          chaves = Object.keys(c.alteracoes)
        exigeLivre(travas, o, chaves.length === 1 && c.alteracoes.bloqueado === false)
        if (c.alteracoes.grupo !== undefined || c.alteracoes.camada !== undefined)
          exigeLivre(travas, { ...o, ...c.alteracoes, bloqueado: false })
        Object.assign(o, c.alteracoes)
        break
      }
      case 'instancia.remover':
        d.instancias = removerTravavel(travas, d.instancias, c.id)
        break
      case 'instancia.definir':
        definirTravavel(travas, d.instancias, c.instancia)
        break
      case 'grupo.definir':
        definirTravavel(travas, d.grupos, c.grupo)
        travas.grupos.set(c.grupo.id, c.grupo)
        break
      case 'grupo.remover': {
        const grupo = existente(d.grupos, c.id)
        exigeLivre(travas, grupo)
        if (c.desagrupar) {
          const filhos = entidadesDoCenario(d).filter((e) => e.grupo === c.id)
          for (const e of filhos) exigeLivre(travas, e)
          for (const e of filhos) e.grupo = grupo.grupo
        }
        d.grupos = removerTravavel(travas, d.grupos, c.id)
        travas.grupos.delete(c.id)
        break
      }
      case 'camada.definir': {
        const atual = d.camadas?.find((e) => e.id === c.camada.id)
        if (
          atual?.bloqueado &&
          !(!c.camada.bloqueado && igual({ ...atual, bloqueado: false }, c.camada))
        )
          throw new CenarioInvalido([`Camada bloqueada: ${atual.id}`])
        d.camadas ??= []
        definir(d.camadas, c.camada)
        travas.camadas.set(c.camada.id, c.camada)
        break
      }
      case 'camada.remover': {
        existente(d.camadas ?? [], c.id)
        exigeCamadaLivre(travas, c.id)
        if (c.transferirPara === c.id)
          throw new CenarioInvalido(['Escolha outra camada de destino'])
        exigeCamadaLivre(travas, c.transferirPara)
        const membros = entidadesDoCenario(d).filter((e) => e.camada === c.id)
        if (membros.length && c.transferirPara === undefined)
          throw new CenarioInvalido([`Camada em uso: ${c.id}`])
        for (const e of membros) exigeLivre(travas, e)
        for (const e of membros) e.camada = c.transferirPara ?? null
        d.camadas = d.camadas?.filter((e) => e.id !== c.id)
        if (!d.camadas?.length) delete d.camadas
        travas.camadas.delete(c.id)
        break
      }
      case 'elementos.organizar': {
        const tabela = new Map(entidadesDoCenario(d).map((e) => [e.id, e]))
        const escolhidos = c.ids.map((id) => {
          const e = tabela.get(id)
          if (!e) throw new CenarioInvalido([`Elemento ausente: ${id}`])
          exigeLivre(travas, e)
          exigeLivre(travas, { ...e, ...c.destino, bloqueado: false })
          return e
        })
        for (const e of escolhidos) Object.assign(e, c.destino)
        break
      }
      case 'elementos.remover': {
        const entidades = entidadesDoCenario(d),
          tabela = new Map(entidades.map((e) => [e.id, e]))
        const filhos = new Map<string, string[]>()
        for (const e of entidades)
          if (e.grupo) {
            const lista = filhos.get(e.grupo) ?? []
            lista.push(e.id)
            filhos.set(e.grupo, lista)
          }
        const fila = [...c.ids],
          apagar = new Set<string>()
        for (let i = 0; i < fila.length; i++) {
          const id = fila[i]!
          if (apagar.has(id)) continue
          const e = tabela.get(id)
          if (!e) throw new CenarioInvalido([`Elemento ausente: ${id}`])
          exigeLivre(travas, e)
          apagar.add(id)
          for (const filho of filhos.get(id) ?? []) fila.push(filho)
        }
        d.instancias = d.instancias.filter((e) => !apagar.has(e.id))
        d.caminhos = d.caminhos.filter((e) => !apagar.has(e.id))
        d.aguas = d.aguas.filter((e) => !apagar.has(e.id))
        d.marcadores = d.marcadores.filter((e) => !apagar.has(e.id))
        d.grupos = d.grupos.filter((e) => !apagar.has(e.id))
        if (d.montagens) {
          d.montagens = d.montagens.filter((e) => !apagar.has(e.id))
          if (!d.montagens.length) delete d.montagens
        }
        for (const id of apagar) travas.grupos.delete(id)
        break
      }
      case 'caminho.definir':
        definirTravavel(travas, d.caminhos, c.caminho)
        break
      case 'caminho.remover':
        d.caminhos = removerTravavel(travas, d.caminhos, c.id)
        break
      case 'agua.definir':
        definirTravavel(travas, d.aguas, c.agua)
        break
      case 'agua.remover':
        d.aguas = removerTravavel(travas, d.aguas, c.id)
        break
      case 'marcador.definir':
        definirTravavel(travas, d.marcadores, c.marcador)
        break
      case 'marcador.remover':
        d.marcadores = removerTravavel(travas, d.marcadores, c.id)
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
