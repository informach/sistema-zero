import { CARTAS_LUMI } from './cartas-lumi'
import {
  CASOS_DA_ESCOLHA,
  type CartaoDaRotina,
  type CasoDaEscolha,
  contarCartoes,
  LIMITES_DA_ROTINA,
  profundidadeDaRotina,
  QUANDOS_DA_ROTINA,
  type QuandoDaRotina,
  RotinaSchema,
} from './rotinas'

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
