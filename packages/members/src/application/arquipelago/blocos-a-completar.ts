import { createHash } from 'node:crypto'
import { STUDIO_PROJECT_JSON_LIMITS } from '@sistemazero/core/studio/project-json'
import {
  isDocumentRecord,
  ProjectDocumentError,
  projectBlockTypes,
} from '@sistemazero/studio/project-document'

type Registro = Record<string, unknown>
/** Só apresentação do editor. IDs em campos ou estado extra continuam sendo conteúdo. */
const VISUAL = new Set([
  'id',
  'x',
  'y',
  'collapsed',
  'inline',
  'deletable',
  'movable',
  'editable',
  'icons',
])
const registro = (v: unknown): Registro | undefined => (isDocumentRecord(v) ? v : undefined)

function inventariar(state: unknown) {
  projectBlockTypes(state) // Mesmos tetos, ciclos e IDs duplicados do leitor do Estúdio.
  const topo = registro(registro(state)?.blocks)?.blocks
  const raizes = Array.isArray(topo) ? topo.filter(isDocumentRecord) : []
  const blocos = new Set<Registro>()
  const pendentes = [...raizes]
  while (pendentes.length) {
    const b = pendentes.pop()!
    blocos.add(b)
    const proximo = registro(registro(b.next)?.block)
    if (proximo) pendentes.push(proximo)
    for (const entrada of Object.values(registro(b.inputs) ?? {})) {
      for (const chave of ['block', 'shadow']) {
        const filho = registro(registro(entrada)?.[chave])
        if (filho) pendentes.push(filho)
      }
    }
  }

  // Dois resumos por bloco: próprio (sem o próximo) e completo (usado pelo corpo do pai).
  // Assim, acrescentar uma ação ao fim não exige todo o apoio que veio antes dela.
  const completos = new Map<object, string>()
  const proprios = new Map<Registro, string>()
  const abertos = new Set<object>()
  let vistos = 0
  const pilha: { valor: object; sair: boolean }[] = raizes.map((valor) => ({ valor, sair: false }))
  const chaves = (valor: object) =>
    Object.keys(valor)
      .filter((k) => !(blocos.has(valor as Registro) && VISUAL.has(k)))
      .sort()
  const primitivo = (valor: unknown) => JSON.stringify(valor) ?? 'undefined'
  const resumo = (valor: object, semProximo = false) => {
    const hash = createHash('sha256')
    const lista = Array.isArray(valor)
    hash.update(lista ? '[' : '{')
    const keys = lista ? Array.from({ length: valor.length }, (_, i) => String(i)) : chaves(valor)
    for (const chave of keys) {
      if (semProximo && chave === 'next') continue
      const filho = (valor as Registro)[chave]
      hash.update(JSON.stringify(chave)).update(':')
      hash.update(filho && typeof filho === 'object' ? completos.get(filho)! : primitivo(filho))
      hash.update(';')
    }
    return hash.update(lista ? ']' : '}').digest('hex')
  }
  while (pilha.length) {
    const { valor, sair } = pilha.pop()!
    if (completos.has(valor)) continue
    if (sair) {
      completos.set(valor, resumo(valor))
      if (blocos.has(valor as Registro)) proprios.set(valor as Registro, resumo(valor, true))
      abertos.delete(valor)
      continue
    }
    if (abertos.has(valor) || ++vistos > STUDIO_PROJECT_JSON_LIMITS.nodes)
      throw new ProjectDocumentError(
        'invalid-document',
        'O conteúdo dos blocos contém ciclo ou excede o limite de complexidade.',
      )
    abertos.add(valor)
    pilha.push({ valor, sair: true })
    for (const chave of chaves(valor)) {
      const filho = (valor as Registro)[chave]
      if (filho && typeof filho === 'object') pilha.push({ valor: filho, sair: false })
    }
  }
  const ocorrencias = new Map<string, { tipo: string; quantidade: number }>()
  for (const b of blocos) {
    if (typeof b.type !== 'string') continue
    const chave = proprios.get(b)!
    const anterior = ocorrencias.get(chave)
    ocorrencias.set(chave, { tipo: b.type, quantidade: (anterior?.quantidade ?? 0) + 1 })
  }
  const areas = new Map<string, { chave: string; tipo: string }[]>()
  for (const raiz of raizes) {
    if (typeof raiz.type !== 'string' || !raiz.type.startsWith('sz_frame_')) continue
    const fila = areas.get(raiz.type) ?? []
    let b = registro(registro(registro(raiz.inputs)?.CHILDREN)?.block)
    while (b) {
      if (typeof b.type === 'string') fila.push({ chave: proprios.get(b)!, tipo: b.type })
      b = registro(registro(b.next)?.block)
    }
    areas.set(raiz.type, fila)
  }
  return { ocorrencias, areas }
}

/** Ferramentas acrescentadas, retiradas, alteradas ou reordenadas; não é prova de aprendizagem. */
export function blocosACompletar(inicial: unknown, gabarito: unknown): string[] {
  const antes = inventariar(inicial)
  const depois = inventariar(gabarito)
  const exigidos = new Set<string>()
  for (const [origem, destino] of [
    [antes, depois],
    [depois, antes],
  ] as const)
    for (const [chave, b] of origem.ocorrencias)
      if (b.quantidade !== (destino.ocorrencias.get(chave)?.quantidade ?? 0)) exigidos.add(b.tipo)

  // Dentro de um contêiner, a ordem está no seu resumo. As molduras são gratuitas, por isso
  // conferimos também a ordem relativa dos blocos mantidos em cada área, sem contar inserções.
  for (const [area, fila] of depois.areas) {
    const posicoes = new Map<string, { indices: number[]; usados: number }>()
    for (const [i, b] of (antes.areas.get(area) ?? []).entries()) {
      const p = posicoes.get(b.chave) ?? { indices: [], usados: 0 }
      p.indices.push(i)
      posicoes.set(b.chave, p)
    }
    const mantidos: { posicao: number; tipo: string }[] = []
    for (const b of fila) {
      const p = posicoes.get(b.chave)
      const posicao = p ? p.indices[p.usados++] : undefined
      if (posicao !== undefined) mantidos.push({ posicao, tipo: b.tipo })
    }
    let maior = -1
    for (const b of mantidos) {
      if (b.posicao < maior) exigidos.add(b.tipo)
      maior = Math.max(maior, b.posicao)
    }
    let menor = Infinity
    for (let i = mantidos.length - 1; i >= 0; i--) {
      const b = mantidos[i]!
      if (b.posicao > menor) exigidos.add(b.tipo)
      menor = Math.min(menor, b.posicao)
    }
  }
  // Mover uma regra do Começo para o Laço muda quando ela acontece, mesmo sem editar campos.
  for (const [origem, destino] of [
    [antes, depois],
    [depois, antes],
  ] as const)
    for (const [area, fila] of origem.areas) {
      const disponiveis = new Map<string, number>()
      for (const b of destino.areas.get(area) ?? [])
        disponiveis.set(b.chave, (disponiveis.get(b.chave) ?? 0) + 1)
      for (const b of fila) {
        const faltam = disponiveis.get(b.chave) ?? 0
        if (faltam === 0) exigidos.add(b.tipo)
        else disponiveis.set(b.chave, faltam - 1)
      }
    }
  return [...exigidos].sort()
}
