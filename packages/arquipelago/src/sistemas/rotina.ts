import {
  CARTAS_LUMI,
  CASOS_DA_ESCOLHA,
  type CartaoDaRotina,
  type CasoDaEscolha,
  type CondicaoDaRotina,
  contarCartoes,
  LIMITES_DA_ROTINA,
  type LugarDaRotina,
  type LumiId,
  profundidadeDaRotina,
  QUANDOS_DA_ROTINA,
  type QuandoDaRotina,
  RotinaSchema,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { ESPECIES_DE_LUMI } from './album'
import { areaComGiro, guardarNaGeladeira } from './construcao/projeto-azul'
import { colher, estagio, regar } from './horta'
import { adicionar, ITENS } from './itens'

/**
 * A rotina dos Lumis (fase2-07, regras puras): "você ensina a rotina deles com cartões, que são
 * blocos com outra roupa". A criança monta a sequência no painel "Rotina"; quando o QUANDO
 * acontece (a noite chega ou vai embora) ou no "Testar", o Lumi aparece na horta da ilha central e
 * faz os passos. Regar, colher e guardar usam as regras que já existem (`horta.ts` e a geladeira
 * de `projeto-azul.ts`); nada aqui é regra nova de horta. Regras e textos:
 * `docs/arquipelago-regras.md` §8.2.
 */

const CARTA = Object.fromEntries(CARTAS_LUMI.map((c) => [c.id, c]))

/** O nome do cartão para a criança ("Repetir", "Voar até"). */
export function nomeDoCartao(id: string): string {
  return CARTA[id]?.nome ?? id
}

const ehQuando = (id: string): id is QuandoDaRotina =>
  QUANDOS_DA_ROTINA.includes(id as QuandoDaRotina)

/** Os cartões de dentro, na ordem (os casos do "Escolha" na ordem de `CASOS_DA_ESCOLHA`). */
function dentro(c: CartaoDaRotina): readonly (readonly CartaoDaRotina[])[] {
  if ('d' in c) return [c.d]
  if (c.c === 'escolha')
    return CASOS_DA_ESCOLHA.flatMap((k) => (c.casos[k] ? [c.casos[k] as CartaoDaRotina[]] : []))
  return []
}

// ── Os cartões na mão ───────────────────────────────────────────────────────────────────────────

/**
 * Os ids dos cartões que ela tem, pela leitura do serviço (`GET /cartas`, como no caderno);
 * `null` quando ainda não deu para ler.
 */
export function cartasNaMao(
  dados: { cartas: readonly { id: string; conquistada: boolean }[] } | null,
): ReadonlySet<string> | null {
  return dados ? new Set(dados.cartas.filter((c) => c.conquistada).map((c) => c.id)) : null
}

// ── Validar ─────────────────────────────────────────────────────────────────────────────────────

export const TEXTOS_DA_ROTINA = {
  comecaComQuando: 'Comece com um cartão Quando: Quando amanhecer ou Quando anoitecer.',
  soUmQuando: 'Só o primeiro cartão é um Quando. Tire o outro Quando.',
  depoisDoQuando: 'Ponha pelo menos um cartão depois do Quando.',
  cartasForaDoAr: 'Não deu para conferir os seus cartões agora. Tente de novo daqui a pouco.',
  semLumi: 'Esta rotina é de um Lumi que você ainda não tem.',
  foraDaRegua: 'Um cartão desta rotina está fora da régua. Confira os números dos cartões.',
  semGeladeira:
    'A geladeira ainda não está na casa. Ponha a geladeira no Construir antes de voar até ela.',
} as const

const dentroDe = (nome: string) => `Ponha pelo menos um cartão dentro do ${nome}.`
const umCaso = 'No Escolha, ponha um cartão em pelo menos um caso.'
const naoTem = (nome: string) =>
  `O cartão ${nome} ainda não está com você. Ele chega quando você aprende o bloco num curso.`

/** Uma recusa da rotina, com o motivo para a criança (nunca castigo: nada muda no jogo). */
export interface Recusa {
  motivo: string
}

function conferirLista(
  lista: readonly CartaoDaRotina[],
  topo: boolean,
  naMao: ReadonlySet<string> | null,
): Recusa | null {
  for (let i = 0; i < lista.length; i++) {
    const c = lista[i] as CartaoDaRotina
    if (ehQuando(c.c) && (!topo || i > 0)) return { motivo: TEXTOS_DA_ROTINA.soUmQuando }
    if (CARTA[c.c]?.tipo === 'controle') {
      if (naMao === null) return { motivo: TEXTOS_DA_ROTINA.cartasForaDoAr }
      if (!naMao.has(c.c)) return { motivo: naoTem(nomeDoCartao(c.c)) }
    }
    if ('d' in c && c.d.length === 0) return { motivo: dentroDe(nomeDoCartao(c.c)) }
    if (c.c === 'escolha' && !CASOS_DA_ESCOLHA.some((k) => (c.casos[k]?.length ?? 0) > 0))
      return { motivo: umCaso }
    for (const d of dentro(c)) {
      const r = conferirLista(d, false, naMao)
      if (r) return r
    }
  }
  return null
}

/** Tira os casos vazios do "Escolha" (o painel mostra os quatro; só os com cartão ficam). */
export function limparRotina(lista: readonly CartaoDaRotina[]): CartaoDaRotina[] {
  return lista.map((c): CartaoDaRotina => {
    if ('d' in c) return { ...c, d: limparRotina(c.d) }
    if (c.c !== 'escolha') return c
    const casos: Partial<Record<CasoDaEscolha, CartaoDaRotina[]>> = {}
    for (const k of CASOS_DA_ESCOLHA) {
      const caso = c.casos[k]
      if (caso && caso.length > 0) casos[k] = limparRotina(caso)
    }
    return { c: 'escolha', casos }
  })
}

/**
 * A rotina vale? Começa com um QUANDO (e só ele é QUANDO), tem cartão depois, cada cartão de
 * controle está na mão dela (pela leitura do serviço, `naMao`), nenhum controle vazio e cabe nos
 * tetos. Devolve o motivo da primeira coisa que falta, ou `null` quando vale.
 */
export function validarRotina(
  lista: readonly CartaoDaRotina[],
  naMao: ReadonlySet<string> | null,
): Recusa | null {
  const primeiro = lista[0]
  if (!primeiro || !ehQuando(primeiro.c)) return { motivo: TEXTOS_DA_ROTINA.comecaComQuando }
  if (lista.length < 2) return { motivo: TEXTOS_DA_ROTINA.depoisDoQuando }
  const r = conferirLista(lista, true, naMao)
  if (r) return r
  const L = LIMITES_DA_ROTINA
  if (contarCartoes(lista) > L.cartoesPorRotina)
    return {
      motivo: `Uma rotina tem até ${L.cartoesPorRotina} cartões, contando os de dentro. Tire alguns.`,
    }
  if (profundidadeDaRotina(lista) > L.profundidade)
    return {
      motivo: `Dá para pôr cartão dentro de cartão até ${L.profundidade} vezes. Tire um nível.`,
    }
  if (!RotinaSchema.safeParse(limparRotina(lista)).success)
    return { motivo: TEXTOS_DA_ROTINA.foraDaRegua }
  return null
}

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

// ── O intérprete ────────────────────────────────────────────────────────────────────────────────

/**
 * O ritmo do Lumi no mundo (proposta de 29/10/2026, §8.2): a rapidez do voo, a altura em que ele
 * trabalha em cima do canteiro e da geladeira, quanto dura cada trabalho e a comemoração do fim.
 */
export const RITMO_DA_ROTINA = {
  /** Metros por segundo voando de um lugar para outro. */
  voo: 2,
  /** Acima da terra do canteiro (metros). */
  alturaNaHorta: 0.9,
  /** Acima do topo da geladeira (metros). */
  alturaNaGeladeira: 0.1,
  /** Segundos de "trabalhar" em cada Regar, Colher e Guardar tudo. */
  trabalho: 1.2,
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
}

const quadroVazio = (): Quadro => ({
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
  s: Salvamento,
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
export function casoDoCanteiro(s: Salvamento, canteiro: number, agoraMs: number): CasoDaEscolha {
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
export function proximoPasso(e: Execucao, s: Salvamento, agoraMs: number): Passo | null {
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
    switch (c.c) {
      case 'quando-amanhecer':
      case 'quando-anoitecer':
        continue
      case 'voar-ate':
        if (c.a === 'geladeira' && !temGeladeira(s)) return falhar(e, TEXTOS_DA_ROTINA.semGeladeira)
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

const nomeDoItem = (id: string, qtd: number) => `${qtd} ${(ITENS[id]?.nome ?? id).toLowerCase()}`

/**
 * Faz o passo da vez no salvamento, com as regras que já existem: `regar` e `colher` da horta e
 * `guardarNaGeladeira`. O colhido e a semente que volta vão para a mochila, como na mão da
 * criança, e o Lumi lembra o que colheu (`carga`); "Guardar tudo" leva isso da mochila para a
 * geladeira, até onde couber, e o resto fica na mochila. Devolve o salvamento novo e a frase do
 * que aconteceu.
 */
export function aplicarPasso(
  e: Execucao,
  s: Salvamento,
  agora: Date,
): { salvamento: Salvamento; texto: string } {
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
    const r = c && colher(c, agora.getTime())
    if (!r) return { salvamento: s, texto: `No canteiro ${numero} não havia nada maduro.` }
    e.carga[r.item] = (e.carga[r.item] ?? 0) + r.qtd
    const horta = s.horta.map((x, i) => (i === p.canteiro ? r.canteiro : x))
    // Como quando a criança colhe: o colhido na mochila e uma semente junto (a horta nunca acaba).
    const inventario = adicionar(adicionar(s.inventario, r.item, r.qtd), `semente-${r.item}`, 1)
    return {
      salvamento: { ...s, horta, inventario },
      texto: `Colheu ${nomeDoItem(r.item, r.qtd)} no canteiro ${numero}.`,
    }
  }
  // Guardar tudo: o que o Lumi colheu sai da mochila para a geladeira, um por um, até onde couber.
  let projeto = s.projetos.geladeira
  let inventario = s.inventario
  let guardou = 0
  let sobrou = 0
  for (const item of Object.keys(e.carga)) {
    const qtd = e.carga[item] ?? 0
    for (let i = 0; i < qtd; i++) {
      const r = projeto ? guardarNaGeladeira(projeto, inventario, item) : null
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
    projeto && projeto !== s.projetos.geladeira
      ? { ...s, inventario, projetos: { ...s.projetos, geladeira: projeto } }
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
  s: Salvamento,
): { salvamento: Salvamento; texto: string | null } {
  let tinha = false
  for (const item of Object.keys(e.carga)) {
    if ((e.carga[item] ?? 0) > 0) tinha = true
    delete e.carga[item]
  }
  return { salvamento: s, texto: tinha ? 'O que o Lumi colheu ficou na sua mochila.' : null }
}

export interface ResultadoDaRotina {
  salvamento: Salvamento
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
  inicial: Salvamento,
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

/** O nome do Lumi para os textos ("a rotina do Quindim", "da Pitanga"). */
export function daRotinaDo(lumi: LumiId): string {
  const e = ESPECIES_DE_LUMI[lumi]
  // As espécies de nome feminino (Pitanga, Ipê, Bolha, Pérola, Pluma, Estrelinha) levam "da".
  const da = ['pitanga', 'ipe', 'bolha', 'perola', 'pluma', 'estrelinha'].includes(lumi)
  return `${da ? 'da' : 'do'} ${e.nome}`
}
