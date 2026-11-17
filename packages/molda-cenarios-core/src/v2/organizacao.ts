import { CenarioInvalido } from '../validacao'
import type { ComandoDeCenario } from './comandos'
import type { MontagemDeConjunto } from './conjuntos-schema'
import { type DocumentoDeCenario, GrupoSchema } from './documento'

export type EntidadeOrganizavel =
  | MontagemDeConjunto
  | DocumentoDeCenario['grupos'][number]
  | DocumentoDeCenario['instancias'][number]
  | DocumentoDeCenario['caminhos'][number]
  | DocumentoDeCenario['aguas'][number]
  | DocumentoDeCenario['marcadores'][number]
export interface FlagsDeOrganizacao {
  bloqueado: boolean
  oculto: boolean
  bloqueioHerdado: boolean
  ocultacaoHerdada: boolean
}
export type EntidadeTransformavel = DocumentoDeCenario['instancias'][number] | MontagemDeConjunto
/** Unidades editáveis; peças internas de uma montagem pertencem à sua definição. */
export function entidadesTransformaveis(doc: DocumentoDeCenario): EntidadeTransformavel[] {
  return [...doc.instancias, ...(doc.montagens ?? [])]
}

export function referenciaDeModelo(e: EntidadeOrganizavel): string | null {
  if ('modelo' in e) return e.modelo
  return 'acabamento' in e ? e.acabamento : null
}

export function entidadesDoCenario(doc: DocumentoDeCenario): EntidadeOrganizavel[] {
  return [
    ...doc.grupos,
    ...doc.instancias,
    ...doc.caminhos,
    ...doc.aguas,
    ...doc.marcadores,
    ...(doc.montagens ?? []),
  ]
}

/** Um índice por documento. Não depende da ordem da lista, da câmera nem de um host. */
export function indiceDaOrganizacao(doc: DocumentoDeCenario) {
  const entidades = new Map(entidadesDoCenario(doc).map((e) => [e.id, e])),
    grupos = new Map(doc.grupos.map((g) => [g.id, g])),
    camadas = new Map(doc.camadas?.map((c) => [c.id, c]) ?? []),
    flags = new Map<string, FlagsDeOrganizacao>(),
    filhos = new Map<string | null, EntidadeOrganizavel[]>(),
    resolvendo = new Set<string>()
  const resolver = (e: EntidadeOrganizavel, nivel = 0): FlagsDeOrganizacao => {
    const pronta = flags.get(e.id)
    if (pronta) return pronta
    if (resolvendo.has(e.id) || nivel >= 64)
      throw new CenarioInvalido(['Hierarquia de grupos inválida'])
    resolvendo.add(e.id)
    const grupo = e.grupo ? grupos.get(e.grupo) : undefined
    if (e.grupo && !grupo) throw new CenarioInvalido([`Grupo ausente: ${e.grupo}`])
    const pai = grupo ? resolver(grupo, nivel + 1) : undefined
    const camada = e.camada ? camadas.get(e.camada) : undefined
    if (e.camada && !camada) throw new CenarioInvalido([`Camada ausente: ${e.camada}`])
    const bloqueioHerdado = Boolean(pai?.bloqueado || camada?.bloqueado),
      ocultacaoHerdada = Boolean(pai?.oculto || camada?.oculto)
    const estado = {
      bloqueado: e.bloqueado || bloqueioHerdado,
      oculto: e.oculto || ocultacaoHerdada,
      bloqueioHerdado,
      ocultacaoHerdada,
    }
    resolvendo.delete(e.id)
    flags.set(e.id, estado)
    return estado
  }
  for (const e of entidades.values()) {
    resolver(e)
    const lista = filhos.get(e.grupo) ?? []
    lista.push(e)
    filhos.set(e.grupo, lista)
  }
  const objetos = new Set(entidadesTransformaveis(doc).map((o) => o.id))
  return {
    entidades,
    grupos,
    camadas,
    flags,
    filhos,
    descendentes(id: string): string[] {
      const resultado: string[] = [],
        fila = [id],
        vistos = new Set<string>()
      for (let i = 0; i < fila.length; i++) {
        const atual = fila[i]!
        if (vistos.has(atual)) continue
        vistos.add(atual)
        if (objetos.has(atual)) resultado.push(atual)
        if (grupos.has(atual)) for (const e of filhos.get(atual) ?? []) fila.push(e.id)
      }
      return resultado
    },
  }
}

/** Raízes da escolha: mover uma pasta não tira seus filhos escolhidos de dentro dela. */
export function raizesDaSelecao(doc: DocumentoDeCenario, ids: readonly string[]): string[] {
  const indice = indiceDaOrganizacao(doc),
    escolhidos = new Set(ids)
  for (const id of escolhidos)
    if (!indice.entidades.has(id)) throw new CenarioInvalido([`Elemento ausente: ${id}`])
  return [...escolhidos].filter((id) => {
    let grupo = indice.entidades.get(id)!.grupo
    for (let nivel = 0; grupo && nivel < 64; nivel++) {
      if (escolhidos.has(grupo)) return false
      grupo = indice.grupos.get(grupo)?.grupo ?? null
    }
    return true
  })
}

/** Só organização: os pivôs e as transformações mundiais das peças são preservados. */
export function agruparElementos(
  doc: DocumentoDeCenario,
  ids: readonly string[],
  id: string,
  nome: string,
): ComandoDeCenario[] {
  const indice = indiceDaOrganizacao(doc),
    raizes = raizesDaSelecao(doc, ids)
  if (!raizes.length) throw new CenarioInvalido(['Escolha os objetos para criar uma pasta'])
  if (indice.entidades.has(id)) throw new CenarioInvalido([`Identificador duplicado: ${id}`])
  const pais = new Set(raizes.map((id) => indice.entidades.get(id)!.grupo))
  const grupo = GrupoSchema.parse({
    id,
    nome: nome.trim(),
    grupo: pais.size === 1 ? [...pais][0] : null,
    bloqueado: false,
    oculto: false,
  })
  return [
    { tipo: 'grupo.definir', grupo },
    { tipo: 'elementos.organizar', ids: raizes, destino: { grupo: id } },
  ]
}

export function alterarElemento(
  doc: DocumentoDeCenario,
  id: string,
  alteracoes: { nome?: string; bloqueado?: boolean; oculto?: boolean },
): ComandoDeCenario[] {
  const grupo = doc.grupos.find((e) => e.id === id)
  if (grupo) return [{ tipo: 'grupo.definir', grupo: { ...grupo, ...alteracoes } }]
  if (doc.instancias.some((e) => e.id === id))
    return [{ tipo: 'instancia.atualizar', id, alteracoes }]
  if (doc.montagens?.some((e) => e.id === id))
    return [{ tipo: 'montagem.atualizar', id, alteracoes }]
  const caminho = doc.caminhos.find((e) => e.id === id)
  if (caminho) return [{ tipo: 'caminho.definir', caminho: { ...caminho, ...alteracoes } }]
  const agua = doc.aguas.find((e) => e.id === id)
  if (agua) return [{ tipo: 'agua.definir', agua: { ...agua, ...alteracoes } }]
  const marcador = doc.marcadores.find((e) => e.id === id)
  if (marcador) return [{ tipo: 'marcador.definir', marcador: { ...marcador, ...alteracoes } }]
  throw new CenarioInvalido([`Elemento ausente: ${id}`])
}
