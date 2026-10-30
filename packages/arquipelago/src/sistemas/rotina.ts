import {
  aplicarPasso as aplicarPassoNoMundo,
  type CartaoDaRotina,
  type CasoDaEscolha,
  type CondicaoDaRotina,
  casoDoCanteiro as casoNoMundo,
  contarCartoes,
  type Execucao,
  LIMITES_DA_ROTINA,
  type LugarDaRotina,
  type LumiId,
  limparRotina,
  type MundoDaRotina,
  type Passo,
  proximoPasso as proximoPassoNoMundo,
  type QuandoDaRotina,
  type Recusa,
  rodarRotina as rodarNoMundo,
  type Salvamento,
  TEXTOS_DA_ROTINA,
  type TipoDoPasso,
  terminarExecucao as terminarNoMundo,
  validarRotina,
} from '@sistemazero/arquipelago-contracts'

export {
  cartasNaMao,
  limparRotina,
  nomeDoCartao,
  type Recusa,
  TEXTOS_DA_ROTINA,
  validarRotina,
} from '@sistemazero/arquipelago-contracts'

import { ESPECIES_DE_LUMI } from './album'
import { contextoDaColheita } from './colheita'
import { areaComGiro } from './construcao/projeto-azul'

/**
 * Guardar a rotina do Lumi no salvamento: valida, confere o Lumi preso e o teto somando as
 * rotinas de todos os Lumis.
 */
export function guardarRotina(
  s: Salvamento,
  lumi: LumiId,
  lista: readonly CartaoDaRotina[],
  naMao: ReadonlySet<string> | null,
): { salvamento: Salvamento } | Recusa {
  if (!s.lumis[lumi]) return { motivo: TEXTOS_DA_ROTINA.semLumi }
  const recusa = validarRotina(lista, naMao)
  if (recusa) return recusa
  const limpa = limparRotina(lista)
  const outras = Object.entries(s.rotinas).reduce(
    (n, [id, r]) => n + (id !== lumi && r ? contarCartoes(r) : 0),
    0,
  )
  const L = LIMITES_DA_ROTINA
  if (outras + contarCartoes(limpa) > L.cartoesNasRotinas)
    return {
      motivo: `As rotinas de todos os Lumis juntas têm até ${L.cartoesNasRotinas} cartões. Tire cartões desta ou de outra rotina.`,
    }
  return { salvamento: { ...s, rotinas: { ...s.rotinas, [lumi]: limpa } } }
}

/** Esquecer a rotina do Lumi (o painel tem "Apagar a rotina"). */
export function apagarRotina(s: Salvamento, lumi: LumiId): Salvamento {
  if (!s.rotinas[lumi]) return s
  const rotinas = { ...s.rotinas }
  delete rotinas[lumi]
  return { ...s, rotinas }
}

// ── Os nomes no painel ──────────────────────────────────────────────────────────────────────────

export const NOME_DO_LUGAR: Readonly<Record<LugarDaRotina, string>> = {
  horta: 'a horta',
  geladeira: 'a geladeira',
}

/** A condição do "Se" e do "Enquanto", lida depois do nome do cartão ("Se o canteiro está maduro"). */
export const NOME_DA_CONDICAO: Readonly<Record<CondicaoDaRotina, string>> = {
  maduro: 'o canteiro está maduro',
  'precisa-de-agua': 'o canteiro precisa de água',
  carregando: 'o Lumi carrega alguma coisa',
  'lembra-menos-que': 'o número que o Lumi lembra é menor que',
}

/** Cada caso do "Escolha", pelo jeito do canteiro em que o Lumi está. */
export const NOME_DO_CASO: Readonly<Record<CasoDaEscolha, string>> = {
  vazio: 'Canteiro vazio',
  'precisa-de-agua': 'Precisa de água',
  crescendo: 'Crescendo',
  maduro: 'Maduro',
}

// ── Montar no painel (o rascunho) ───────────────────────────────────────────────────────────────

/**
 * Onde um cartão entra: a lista de cima (`[]`) ou a de dentro de um cartão de controle, passo a
 * passo (o índice do cartão e, no "Escolha", o caso).
 */
export type Alvo = readonly { i: number; caso?: CasoDaEscolha }[]

/** Um cartão novo com os números de começo (o painel deixa trocar). */
export function cartaoNovo(id: CartaoDaRotina['c']): CartaoDaRotina {
  switch (id) {
    case 'voar-ate':
      return { c: 'voar-ate', a: 'horta' }
    case 'repetir':
      return { c: 'repetir', n: LIMITES_DA_ROTINA.vezes.min, d: [] }
    case 'para-cada':
      return { c: 'para-cada', d: [] }
    case 'enquanto':
    case 'se':
      return { c: id, se: 'maduro', d: [] }
    case 'escolha':
      return { c: 'escolha', casos: { 'precisa-de-agua': [], maduro: [] } }
    case 'esperar':
      return { c: 'esperar', n: LIMITES_DA_ROTINA.segundos.min }
    case 'guardar-na-memoria':
      return { c: 'guardar-na-memoria', n: LIMITES_DA_ROTINA.memoria.min }
    default:
      return { c: id }
  }
}

/** A lista que fica no alvo (vazia se o alvo não existe mais). */
export function listaNoAlvo(
  lista: readonly CartaoDaRotina[],
  alvo: Alvo,
): readonly CartaoDaRotina[] {
  let atual = lista
  for (const passo of alvo) {
    const c = atual[passo.i]
    if (!c) return []
    if ('d' in c) atual = c.d
    else if (c.c === 'escolha' && passo.caso) atual = c.casos[passo.caso] ?? []
    else return []
  }
  return atual
}

/** O alvo ainda aponta para uma lista (um controle que saiu deixa o alvo sem lugar). */
export function alvoExiste(lista: readonly CartaoDaRotina[], alvo: Alvo): boolean {
  let atual = lista
  for (const passo of alvo) {
    const c = atual[passo.i]
    if (!c) return false
    if ('d' in c && !passo.caso) atual = c.d
    else if (c.c === 'escolha' && passo.caso) atual = c.casos[passo.caso] ?? []
    else return false
  }
  return true
}

/** Troca a lista do alvo, devolvendo a rotina nova (a de antes não muda). */
function trocarNoAlvo(
  lista: readonly CartaoDaRotina[],
  alvo: Alvo,
  trocar: (l: readonly CartaoDaRotina[]) => CartaoDaRotina[],
): CartaoDaRotina[] {
  const [passo, ...resto] = alvo
  if (!passo) return trocar(lista)
  return lista.map((c, i): CartaoDaRotina => {
    if (i !== passo.i) return c
    if ('d' in c) return { ...c, d: trocarNoAlvo(c.d, resto, trocar) }
    if (c.c === 'escolha' && passo.caso)
      return {
        ...c,
        casos: { ...c.casos, [passo.caso]: trocarNoAlvo(c.casos[passo.caso] ?? [], resto, trocar) },
      }
    return c
  })
}

export function porCartao(
  lista: readonly CartaoDaRotina[],
  alvo: Alvo,
  cartao: CartaoDaRotina,
): CartaoDaRotina[] {
  return trocarNoAlvo(lista, alvo, (l) => [...l, cartao])
}

export function tirarCartao(
  lista: readonly CartaoDaRotina[],
  alvo: Alvo,
  indice: number,
): CartaoDaRotina[] {
  return trocarNoAlvo(lista, alvo, (l) => l.filter((_, i) => i !== indice))
}

export function moverCartao(
  lista: readonly CartaoDaRotina[],
  alvo: Alvo,
  indice: number,
  para: -1 | 1,
): CartaoDaRotina[] {
  return trocarNoAlvo(lista, alvo, (l) => {
    const j = indice + para
    if (j < 0 || j >= l.length) return [...l]
    const nova = [...l]
    ;[nova[indice], nova[j]] = [nova[j] as CartaoDaRotina, nova[indice] as CartaoDaRotina]
    return nova
  })
}

export function mudarCartao(
  lista: readonly CartaoDaRotina[],
  alvo: Alvo,
  indice: number,
  novo: CartaoDaRotina,
): CartaoDaRotina[] {
  return trocarNoAlvo(lista, alvo, (l) => l.map((c, i) => (i === indice ? novo : c)))
}

/** A rotina de começo de um Lumi que ainda não tem rotina. */
export const ROTINA_VAZIA: readonly CartaoDaRotina[] = [{ c: 'quando-amanhecer' }]

// ── Quando a rotina começa ──────────────────────────────────────────────────────────────────────

/** A noite chegou ou foi embora (o mesmo `ambiente.noite` dos borrões): qual QUANDO aconteceu. */
export function quandoDaVirada(noiteAntes: boolean, noiteAgora: boolean): QuandoDaRotina | null {
  if (noiteAntes === noiteAgora) return null
  return noiteAgora ? 'quando-anoitecer' : 'quando-amanhecer'
}

/** Os Lumis com rotina que começa neste QUANDO, na ordem de `LUMIS`. */
export function rotinasDoQuando(s: Salvamento, quando: QuandoDaRotina): LumiId[] {
  return (Object.keys(ESPECIES_DE_LUMI) as LumiId[]).filter(
    (id) => s.lumis[id] && s.rotinas[id]?.[0]?.c === quando,
  )
}

// ── Os lugares ──────────────────────────────────────────────────────────────────────────────────

/** A geladeira está na casa (ganha e posta na obra)? */
export function temGeladeira(s: Salvamento): boolean {
  return Boolean(
    s.projetos.geladeira && s.construcao.casa?.objetos.some((o) => o.id === 'geladeira'),
  )
}

/** O meio da geladeira na casa, no chão do mundo (a base da obra é a origem), ou `null`. */
export function lugarDaGeladeira(s: Salvamento): { x: number; z: number } | null {
  const o = s.construcao.casa?.objetos.find((obj) => obj.id === 'geladeira')
  if (!o || !s.projetos.geladeira) return null
  const { largura, fundo } = areaComGiro(o.id, o.giro)
  return { x: o.x + largura / 2, z: o.z + fundo / 2 }
}

export {
  CARTOES_POR_EXECUCAO,
  comecarExecucao,
  type Execucao,
  fazendoAgora,
  type Passo,
  RITMO_DA_ROTINA,
  type TipoDoPasso,
} from '@sistemazero/arquipelago-contracts'

export function mundoDaRotina(
  s: Salvamento,
  jornada = 0,
): MundoDaRotina & { colheita: ReturnType<typeof contextoDaColheita> } {
  return {
    horta: s.horta,
    inventario: s.inventario,
    geladeira: s.projetos.geladeira ?? null,
    geladeiraPosta: temGeladeira(s),
    colheita: contextoDaColheita(s, jornada),
  }
}
function aplicarMundo(s: Salvamento, m: MundoDaRotina): Salvamento {
  if (
    s.horta === m.horta &&
    s.inventario === m.inventario &&
    (s.projetos.geladeira ?? null) === m.geladeira
  )
    return s
  return {
    ...s,
    horta: m.horta,
    inventario: m.inventario,
    projetos: m.geladeira ? { ...s.projetos, geladeira: m.geladeira } : s.projetos,
  }
}
export function proximoPasso(e: Execucao, s: Salvamento, agora: number): Passo | null {
  return proximoPassoNoMundo(e, mundoDaRotina(s), agora)
}
export function casoDoCanteiro(s: Salvamento, canteiro: number, agora: number): CasoDaEscolha {
  return casoNoMundo(mundoDaRotina(s), canteiro, agora)
}
export function aplicarPasso(
  e: Execucao,
  s: Salvamento,
  agora: Date,
  jornada = 0,
): { salvamento: Salvamento; texto: string } {
  const r = aplicarPassoNoMundo(e, mundoDaRotina(s, jornada), agora)
  return { ...r, salvamento: aplicarMundo(s, r.salvamento) }
}
export function terminarExecucao(
  e: Execucao,
  s: Salvamento,
): { salvamento: Salvamento; texto: string | null } {
  const r = terminarNoMundo(e, mundoDaRotina(s))
  return { ...r, salvamento: s }
}
export interface ResultadoDaRotina {
  salvamento: Salvamento
  registro: string[]
  passos: TipoDoPasso[]
  erro: string | null
}
export function rodarRotina(
  lumi: LumiId,
  lista: readonly CartaoDaRotina[],
  inicial: Salvamento,
  agora: Date,
  naMao: ReadonlySet<string> | null,
  jornada = 0,
): ResultadoDaRotina {
  const r = rodarNoMundo(lumi, lista, mundoDaRotina(inicial, jornada), agora, naMao)
  return { ...r, salvamento: aplicarMundo(inicial, r.salvamento) }
}

/** O nome do Lumi para os textos ("a rotina do Quindim", "da Pitanga"). */
export function daRotinaDo(lumi: LumiId): string {
  const e = ESPECIES_DE_LUMI[lumi]
  // As espécies de nome feminino (Pitanga, Ipê, Bolha, Pérola, Pluma, Estrelinha) levam "da".
  const da = ['pitanga', 'ipe', 'bolha', 'perola', 'pluma', 'estrelinha'].includes(lumi)
  return `${da ? 'da' : 'do'} ${e.nome}`
}
