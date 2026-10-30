import { type ContextoDaColheita, fraseDaColheitaEspecial } from './colheita'
import { cabeColheita, colher, estagio, regar } from './horta'
import { cargaDoLumi, PERFIS_DOS_LUMIS } from './lumis-trabalho'
import { adicionarAoInventario, guardarAlimentoNaGeladeira } from './rotina-mundo'
import { limparRotina, TEXTOS_DA_ROTINA, validarRotina } from './rotina-validacao'
import {
  type CartaoDaRotina,
  type CasoDaEscolha,
  type CondicaoDaRotina,
  LIMITES_DA_ROTINA,
  type LugarDaRotina,
} from './rotinas'
import type { Canteiro, LumiId, ProjetoAzul } from './salvamento'

/** Só os dados que uma rotina lê e transforma. Nunca inclui conta, posição ou outras obras. */
export interface MundoDaRotina {
  horta: Canteiro[]
  inventario: Record<string, number>
  geladeira: ProjetoAzul | null
  geladeiraPosta: boolean
  /** Ausente no molde histórico V1, que conserva a colheita básica. */
  colheita?: ContextoDaColheita
}

export const RITMO_DA_ROTINA = {
  /** Acima da terra do canteiro (metros). */
  alturaNaHorta: 0.9,
  /** Acima do topo da geladeira (metros). */
  alturaNaGeladeira: 0.1,
  /** Segundos de "feliz" no fim, antes de sumir. */
  festa: 1.6,
} as const

/** Quantos cartões uma execução olha no máximo (um Enquanto que nunca termina para aqui). */
export const CARTOES_POR_EXECUCAO = 200

export type TipoDoPasso = 'voar' | 'regar' | 'colher' | 'guardar' | 'esperar'

/** Um passo que leva tempo no mundo (o resto, como "Se" e "Guardar na memória", é na hora). */
export interface Passo {
  tipo: TipoDoPasso
  lugar: LugarDaRotina
  /** O canteiro (o índice em `salvamento.horta`) quando o lugar é a horta. */
  canteiro: number
  /** Os segundos do "Esperar". */
  segundos: number
}

type Modo = 'lista' | 'repetir' | 'para-cada' | 'enquanto'

interface Quadro {
  origem: CartaoDaRotina | null
  lista: readonly CartaoDaRotina[]
  i: number
  modo: Modo
  /** Quantas voltas ainda faltam no "Repetir". */
  restante: number
  /** O canteiro da vez no "Para cada". */
  k: number
  /** A condição do "Enquanto". */
  se: CondicaoDaRotina
  n: number
}

export interface Execucao {
  lumi: LumiId
  situacao: 'andando' | 'terminou' | 'erro'
  motivo: string | null
  /** Onde o Lumi está (`null` antes do primeiro "Voar até"). */
  lugar: LugarDaRotina | null
  canteiro: number
  /** O número que o Lumi lembra (`null` antes do "Guardar na memória"). */
  memoria: number | null
  /**
   * O que ele colheu e ainda não guardou. O colhido já está na mochila (como na mão da criança):
   * se a página fecha no meio, nada se perde; o "Guardar tudo" leva isto da mochila à geladeira.
   */
  carga: Record<string, number>
  /** Cartões olhados até agora (o teto é `CARTOES_POR_EXECUCAO`). */
  olhados: number
  /** O passo da vez (o mesmo objeto, reaproveitado). */
  passo: Passo
  pilha: Quadro[]
  topo: number
  /** Referência ao cartão corrente, para o destaque da prévia. Não vai ao salvamento. */
  cartaoAtual: CartaoDaRotina | null
}

const quadroVazio = (): Quadro => ({
  origem: null,
  lista: [],
  i: 0,
  modo: 'lista',
  restante: 0,
  k: 0,
  se: 'maduro',
  n: 0,
})

/** Prepara a execução: tudo o que o laço usa é criado aqui, uma vez. */
export function comecarExecucao(lumi: LumiId, lista: readonly CartaoDaRotina[]): Execucao {
  const pilha = Array.from({ length: LIMITES_DA_ROTINA.profundidade + 2 }, quadroVazio)
  const base = pilha[0] as Quadro
  base.lista = lista
  return {
    lumi,
    situacao: 'andando',
    motivo: null,
    lugar: null,
    canteiro: 0,
    memoria: null,
    carga: {},
    olhados: 0,
    passo: { tipo: 'voar', lugar: 'horta', canteiro: 0, segundos: 0 },
    pilha,
    topo: 0,
    cartaoAtual: null,
  }
}

function falhar(e: Execucao, motivo: string): null {
  e.situacao = 'erro'
  e.motivo = motivo
  return null
}

function empurrar(
  e: Execucao,
  lista: readonly CartaoDaRotina[],
  modo: Modo,
  restante: number,
): Quadro | null {
  const q = e.pilha[e.topo + 1]
  if (!q) return null
  e.topo++
  q.lista = lista
  q.i = 0
  q.modo = modo
  q.restante = restante
  q.k = 0
  q.origem = e.cartaoAtual
  return q
}

function devolverPasso(
  e: Execucao,
  tipo: TipoDoPasso,
  lugar: LugarDaRotina,
  canteiro: number,
  segundos: number,
): Passo {
  e.passo.tipo = tipo
  e.passo.lugar = lugar
  e.passo.canteiro = canteiro
  e.passo.segundos = segundos
  return e.passo
}

const naHorta = (acao: string) =>
  `Para ${acao}, o Lumi precisa estar na horta. Ponha um Voar até a horta antes.`

function carregando(e: Execucao): boolean {
  for (const k in e.carga) if ((e.carga[k] ?? 0) > 0) return true
  return false
}

/** A condição vale agora? `null` quando não dá para saber (a execução para com o motivo). */
function condicao(
  e: Execucao,
  se: CondicaoDaRotina,
  n: number,
  s: MundoDaRotina,
  agoraMs: number,
): boolean | null {
  if (se === 'carregando') return carregando(e)
  if (se === 'lembra-menos-que') {
    if (e.memoria === null)
      return falhar(
        e,
        'Para comparar o número, o Lumi precisa lembrar de um número antes. Use Guardar na memória.',
      )
    return e.memoria < n
  }
  if (e.lugar !== 'horta') return falhar(e, naHorta('olhar o canteiro'))
  const c = s.horta[e.canteiro]
  if (!c) return false
  const fase = estagio(c, agoraMs)
  return se === 'maduro' ? fase === 'maduro' : fase === 'semente'
}

/** Como está o canteiro em que o Lumi está, nos casos do "Escolha". */
export function casoDoCanteiro(s: MundoDaRotina, canteiro: number, agoraMs: number): CasoDaEscolha {
  const c = s.horta[canteiro]
  const fase = c ? estagio(c, agoraMs) : 'vazio'
  if (fase === 'vazio') return 'vazio'
  if (fase === 'semente') return 'precisa-de-agua'
  if (fase === 'maduro') return 'maduro'
  return 'crescendo'
}

/**
 * O próximo passo que leva tempo no mundo, ou `null` quando a rotina terminou (ou parou com
 * erro: `situacao` e `motivo`). Os cartões de controle andam na hora. Não cria nada: o passo
 * devolvido é sempre `e.passo`, e a pilha foi criada em `comecarExecucao`.
 */
export function proximoPasso(e: Execucao, s: MundoDaRotina, agoraMs: number): Passo | null {
  while (e.situacao === 'andando') {
    if (++e.olhados > CARTOES_POR_EXECUCAO)
      return falhar(
        e,
        `A rotina passou de ${CARTOES_POR_EXECUCAO} cartões e parou. Confira se um Enquanto um dia termina e se os Repetir não estão grandes demais.`,
      )
    const q = e.pilha[e.topo] as Quadro
    if (q.i >= q.lista.length) {
      if (q.modo === 'repetir' && q.restante > 1) {
        q.restante--
        q.i = 0
        continue
      }
      if (q.modo === 'para-cada' && q.k + 1 < s.horta.length) {
        q.k++
        q.i = 0
        e.lugar = 'horta'
        e.canteiro = q.k
        e.cartaoAtual = q.origem
        return devolverPasso(e, 'voar', 'horta', q.k, 0)
      }
      if (q.modo === 'enquanto') {
        const vale = condicao(e, q.se, q.n, s, agoraMs)
        if (vale === null) return null
        if (vale) {
          q.i = 0
          continue
        }
      }
      if (e.topo === 0) {
        e.situacao = 'terminou'
        return null
      }
      e.topo--
      continue
    }
    const c = q.lista[q.i++] as CartaoDaRotina
    e.cartaoAtual = c
    switch (c.c) {
      case 'quando-amanhecer':
      case 'quando-anoitecer':
        continue
      case 'voar-ate':
        if (c.a === 'geladeira' && !s.geladeiraPosta)
          return falhar(e, TEXTOS_DA_ROTINA.semGeladeira)
        e.lugar = c.a
        e.canteiro = 0
        return devolverPasso(e, 'voar', c.a, 0, 0)
      case 'regar':
        if (e.lugar !== 'horta') return falhar(e, naHorta('regar'))
        return devolverPasso(e, 'regar', 'horta', e.canteiro, 0)
      case 'colher':
        if (e.lugar !== 'horta') return falhar(e, naHorta('colher'))
        return devolverPasso(e, 'colher', 'horta', e.canteiro, 0)
      case 'guardar':
        if (e.lugar !== 'geladeira')
          return falhar(
            e,
            'Para guardar tudo, o Lumi precisa estar na geladeira. Ponha um Voar até a geladeira antes.',
          )
        return devolverPasso(e, 'guardar', 'geladeira', 0, 0)
      case 'esperar':
        return devolverPasso(e, 'esperar', e.lugar ?? 'horta', e.canteiro, c.n)
      case 'guardar-na-memoria':
        e.memoria = c.n
        continue
      case 'contar':
        if (e.memoria === null)
          return falhar(
            e,
            'Para contar mais um, o Lumi precisa lembrar de um número antes. Use Guardar na memória.',
          )
        e.memoria = Math.min(e.memoria + 1, 999)
        continue
      case 'repetir':
        if (!empurrar(e, c.d, 'repetir', c.n)) return falhar(e, TEXTOS_DA_ROTINA.foraDaRegua)
        continue
      case 'para-cada': {
        if (s.horta.length === 0) continue
        if (!empurrar(e, c.d, 'para-cada', 0)) return falhar(e, TEXTOS_DA_ROTINA.foraDaRegua)
        // Já no primeiro canteiro (logo depois do "Voar até a horta"), não voa de novo.
        const jaEsta = e.lugar === 'horta' && e.canteiro === 0
        e.lugar = 'horta'
        e.canteiro = 0
        if (jaEsta) continue
        return devolverPasso(e, 'voar', 'horta', 0, 0)
      }
      case 'enquanto':
      case 'se': {
        const vale = condicao(e, c.se, c.n ?? 0, s, agoraMs)
        if (vale === null) return null
        if (!vale) continue
        const novo = empurrar(e, c.d, c.c === 'se' ? 'lista' : 'enquanto', 0)
        if (!novo) return falhar(e, TEXTOS_DA_ROTINA.foraDaRegua)
        novo.se = c.se
        novo.n = c.n ?? 0
        continue
      }
      case 'escolha': {
        if (e.lugar !== 'horta') return falhar(e, naHorta('olhar o canteiro'))
        const caso = c.casos[casoDoCanteiro(s, e.canteiro, agoraMs)]
        if (caso && !empurrar(e, caso, 'lista', 0)) return falhar(e, TEXTOS_DA_ROTINA.foraDaRegua)
        continue
      }
    }
  }
  return null
}

const nomeDoItem = (id: string, qtd: number) => `${qtd} ${id}`

/**
 * Faz o passo da vez no salvamento, com as regras que já existem: `regar` e `colher` da horta e
 * `guardarNaGeladeira`. O colhido e a semente que volta vão para a mochila, como na mão da
 * criança, e o Lumi lembra o que colheu (`carga`); "Guardar tudo" leva isso da mochila para a
 * geladeira, até onde couber, e o resto fica na mochila. Devolve o salvamento novo e a frase do
 * que aconteceu.
 */
export function aplicarPasso(
  e: Execucao,
  s: MundoDaRotina,
  agora: Date,
): { salvamento: MundoDaRotina; texto: string } {
  const p = e.passo
  const numero = p.canteiro + 1
  if (p.tipo === 'voar')
    return {
      salvamento: s,
      texto: p.lugar === 'geladeira' ? 'Voou até a geladeira.' : `Voou até o canteiro ${numero}.`,
    }
  if (p.tipo === 'esperar')
    return {
      salvamento: s,
      texto: `Esperou ${p.segundos} ${p.segundos === 1 ? 'segundo' : 'segundos'}.`,
    }
  if (p.tipo === 'regar') {
    const c = s.horta[p.canteiro]
    const novo = c && regar(c, agora)
    if (!c || !novo)
      return {
        salvamento: s,
        texto: c?.semente
          ? `O canteiro ${numero} não precisava de água.`
          : `O canteiro ${numero} está vazio.`,
      }
    const horta = s.horta.map((x, i) => (i === p.canteiro ? novo : x))
    return { salvamento: { ...s, horta }, texto: `Regou o canteiro ${numero}.` }
  }
  if (p.tipo === 'colher') {
    const c = s.horta[p.canteiro]
    const r = c && colher(c, agora.getTime(), s.colheita)
    if (!r) return { salvamento: s, texto: `No canteiro ${numero} não havia nada maduro.` }
    if (cargaDoLumi(e.carga) + r.qtd > PERFIS_DOS_LUMIS[e.lumi].carga)
      return {
        salvamento: s,
        texto: `A carga está cheia. Use Voar até a geladeira e Guardar tudo antes de colher o canteiro ${numero}. Ele continua maduro.`,
      }
    if (!cabeColheita(s.inventario, r.item, r.qtd))
      return {
        salvamento: s,
        texto: `A mochila está cheia. Use ou guarde os alimentos e sementes antes de colher o canteiro ${numero}. Ele continua maduro.`,
      }
    e.carga[r.item] = (e.carga[r.item] ?? 0) + r.qtd
    const horta = s.horta.map((x, i) => (i === p.canteiro ? r.canteiro : x))
    // Como quando a criança colhe: o colhido na mochila e uma semente junto (a horta nunca acaba).
    const inventario = adicionarAoInventario(
      adicionarAoInventario(s.inventario, r.item, r.qtd),
      `semente-${r.item}`,
      1,
    )
    return {
      salvamento: { ...s, horta, inventario },
      texto: `Colheu ${nomeDoItem(r.item, r.qtd)} no canteiro ${numero}.${fraseDaColheitaEspecial(r.bonus)}`,
    }
  }
  // Guardar tudo: o que o Lumi colheu sai da mochila para a geladeira, um por um, até onde couber.
  let projeto = s.geladeira
  let inventario = s.inventario
  let guardou = 0
  let sobrou = 0
  for (const item of Object.keys(e.carga)) {
    const qtd = e.carga[item] ?? 0
    for (let i = 0; i < qtd; i++) {
      const r = projeto ? guardarAlimentoNaGeladeira(projeto, inventario, item) : null
      if (!r) {
        sobrou += qtd - i
        break
      }
      projeto = r.projeto
      inventario = r.inventario
      guardou++
    }
    delete e.carga[item]
  }
  const salvamento =
    projeto && projeto !== s.geladeira
      ? { ...s, inventario, geladeira: projeto }
      : { ...s, inventario }
  if (guardou === 0 && sobrou === 0) return { salvamento: s, texto: 'Não havia nada para guardar.' }
  return {
    salvamento,
    texto:
      `Guardou ${guardou} na geladeira.` +
      (sobrou > 0
        ? ` ${sobrou} não ${sobrou === 1 ? 'coube' : 'couberam'} e ${sobrou === 1 ? 'ficou' : 'ficaram'} na sua mochila.`
        : ''),
  }
}

/**
 * No fim (ou no erro, ou no "Parar"): o que o Lumi colheu e não guardou já está na mochila; ele só
 * esquece. Devolve o mesmo salvamento e a frase, se havia algo.
 */
export function terminarExecucao(
  e: Execucao,
  s: MundoDaRotina,
): { salvamento: MundoDaRotina; texto: string | null } {
  let tinha = false
  for (const item of Object.keys(e.carga)) {
    if ((e.carga[item] ?? 0) > 0) tinha = true
    delete e.carga[item]
  }
  return { salvamento: s, texto: tinha ? 'O que o Lumi colheu ficou na sua mochila.' : null }
}

export interface ResultadoDaRotina {
  salvamento: MundoDaRotina
  /** O que aconteceu, passo a passo, para o painel. */
  registro: string[]
  /** Os passos que levaram tempo, na ordem (para os testes e a conferência). */
  passos: TipoDoPasso[]
  /** O motivo de a rotina ter parado no meio, ou `null` se foi até o fim. */
  erro: string | null
}

/**
 * Roda a rotina inteira de uma vez, no mesmo instante (os testes e a prévia do painel). No mundo,
 * `mundo/rotina-dos-lumis.tsx` anda passo a passo com as mesmas funções.
 */
export function rodarRotina(
  lumi: LumiId,
  lista: readonly CartaoDaRotina[],
  inicial: MundoDaRotina,
  agora: Date,
  naMao: ReadonlySet<string> | null,
): ResultadoDaRotina {
  const recusa = validarRotina(lista, naMao)
  if (recusa) return { salvamento: inicial, registro: [], passos: [], erro: recusa.motivo }
  const e = comecarExecucao(lumi, limparRotina(lista))
  let s = inicial
  const registro: string[] = []
  const passos: TipoDoPasso[] = []
  for (let p = proximoPasso(e, s, agora.getTime()); p; p = proximoPasso(e, s, agora.getTime())) {
    passos.push(p.tipo)
    const r = aplicarPasso(e, s, agora)
    s = r.salvamento
    registro.push(r.texto)
  }
  const fim = terminarExecucao(e, s)
  if (fim.texto) registro.push(fim.texto)
  return {
    salvamento: fim.salvamento,
    registro,
    passos,
    erro: e.situacao === 'erro' ? e.motivo : null,
  }
}

/** O que o Lumi faz neste passo, para o HUD ("regando o canteiro 2"). */
export function fazendoAgora(p: Passo): string {
  const numero = p.canteiro + 1
  switch (p.tipo) {
    case 'voar':
      return p.lugar === 'geladeira' ? 'voando até a geladeira' : `voando até o canteiro ${numero}`
    case 'regar':
      return `regando o canteiro ${numero}`
    case 'colher':
      return `colhendo no canteiro ${numero}`
    case 'guardar':
      return 'guardando na geladeira'
    case 'esperar':
      return `esperando ${p.segundos} ${p.segundos === 1 ? 'segundo' : 'segundos'}`
  }
}
