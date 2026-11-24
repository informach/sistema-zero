import {
  type CenaCompilada,
  type EntidadeCompilada,
  lerCenaCompilada,
} from '@sistemazero/molda-cenarios-core/compilar'
import { PerfilDePublicacaoSchema } from '@sistemazero/molda-cenarios-core/publicacao'
import { ARQUIPELAGO } from './geografia-do-arquipelago'

type Matriz = NonNullable<EntidadeCompilada['matriz']>
type Ponto = { x: number; y: number; z: number }
type Propriedades = NonNullable<EntidadeCompilada['propriedades']>
const TIPOS_DE_FISICA = ['nenhuma', 'caixa', 'tronco', 'ponte', 'escada', 'malha', 'solo'] as const
export interface AtorDoCenario {
  entidade: string
  tipo: 'iris'
  matriz: Matriz
}
export interface PlacaDoCenario {
  entidade: string
  texto: string
  destino: string
  via: { x: number; z: number }
  matriz: Matriz
}
export interface FisicaDoCenario {
  entidade: string
  matriz: Matriz
  tipo?: (typeof TIPOS_DE_FISICA)[number]
  raioDoTronco?: number
  enterrada?: number
  fundacao?: { min: Ponto; max: Ponto }
}
const chave = (nome: string) => `arquipelago.${nome}`
function falhar(entidade: string, campo: string): never {
  throw Error(`O parâmetro ${campo} de ${entidade} é inválido para o Arquipélago.`)
}
function numero(p: Propriedades, nome: string, entidade: string): number {
  const v = p[chave(nome)]
  if (typeof v !== 'number' || !Number.isFinite(v)) return falhar(entidade, nome)
  return v
}
function texto(p: Propriedades, nome: string, entidade: string, max: number): string {
  const v = p[chave(nome)]
  if (typeof v !== 'string' || !v.trim() || v.length > max) return falhar(entidade, nome)
  return v
}
function matriz(e: EntidadeCompilada): Matriz {
  if (!e.matriz) return falhar(e.id, 'matriz')
  return e.matriz.slice()
}

/** Interpreta somente os metadados do jogo. A cena canônica conserva todas as outras propriedades.
 * As matrizes e os marcos já estão em metros do mundo: não somar outra vez o centro da ilha. */
export function lerPerfilDeCenario(entrada: unknown, destino: unknown) {
  const perfil = PerfilDePublicacaoSchema.parse(destino)
  const ilha = ARQUIPELAGO.find((i) => i.id === perfil.ilha)!
  const dados: CenaCompilada = lerCenaCompilada(entrada)
  const atores: AtorDoCenario[] = [],
    placas: PlacaDoCenario[] = [],
    fisicas: FisicaDoCenario[] = []
  for (const e of dados.entidades) {
    if (e.oculto || !e.propriedades) continue
    const p = e.propriedades
    if (p[chave('ator')] !== undefined) {
      if (p[chave('ator')] !== 'iris') falhar(e.id, 'ator')
      if (atores.length)
        throw Error('Uma ilha usa uma única Íris do sistema de personagens existente.')
      atores.push({ entidade: e.id, tipo: 'iris', matriz: matriz(e) })
    }
    const sinal = ['texto', 'destino', 'via.x', 'via.z'].some(
      (n) => p[chave(`sinal.${n}`)] !== undefined,
    )
    if (sinal)
      placas.push({
        entidade: e.id,
        texto: texto(p, 'sinal.texto', e.id, 24),
        destino: texto(p, 'sinal.destino', e.id, 240),
        via: { x: numero(p, 'sinal.via.x', e.id), z: numero(p, 'sinal.via.z', e.id) },
        matriz: matriz(e),
      })
    const fisica = p[chave('fisica')]
    const raio = p[chave('raioDoTronco')],
      enterrada = p[chave('enterrada')]
    const temFundacao = Object.keys(p).some((n) => n.startsWith(chave('fundacao.')))
    if (fisica === undefined && raio === undefined && enterrada === undefined && !temFundacao)
      continue
    const f: FisicaDoCenario = { entidade: e.id, matriz: matriz(e) }
    if (fisica !== undefined) {
      const tipo = TIPOS_DE_FISICA.find((t) => t === fisica)
      if (!tipo) falhar(e.id, 'fisica')
      f.tipo = tipo
    }
    if (raio !== undefined) {
      const r = numero(p, 'raioDoTronco', e.id)
      if (r <= 0 || r > 100) falhar(e.id, 'raioDoTronco')
      f.raioDoTronco = r
    }
    if (enterrada !== undefined) {
      const n = numero(p, 'enterrada', e.id)
      if (n < 0 || n > 1) falhar(e.id, 'enterrada')
      f.enterrada = n
    }
    if (temFundacao) {
      const canto = (nome: 'min' | 'max'): Ponto => ({
        x: numero(p, `fundacao.${nome}.x`, e.id),
        y: numero(p, `fundacao.${nome}.y`, e.id),
        z: numero(p, `fundacao.${nome}.z`, e.id),
      })
      const min = canto('min'),
        max = canto('max')
      if ((['x', 'y', 'z'] as const).some((eixo) => min[eixo] > max[eixo])) falhar(e.id, 'fundacao')
      f.fundacao = { min, max }
    }
    fisicas.push(f)
  }
  const inicio =
    dados.marcadores.find((m) => m.configuracao?.tipo === 'inicio' && m.configuracao.principal) ??
    dados.marcadores.find((m) => m.configuracao?.tipo === 'inicio') ??
    null
  return {
    perfil,
    ilha: structuredClone(ilha),
    dados,
    atores,
    placas,
    fisicas,
    marcos: dados.marcadores,
    inicio,
  }
}
export type PerfilDoCenario = ReturnType<typeof lerPerfilDeCenario>
