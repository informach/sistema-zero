import type {
  Canteiro,
  CartaoDaRotina,
  LumiId,
  QuandoDaRotina,
  Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { chuvaNaHorta, climaEfetivo } from './clima'
import { geladeiraEm } from './horta'
import { rodarRotina, rotinasDoQuando } from './rotina'
import { DURACAO_DO_DIA_MS, PARTE_CLARA } from './tempo-do-dia'

/**
 * Enquanto você estava fora (§6.28, A12 e A14). A proposta promete que o mundo continua com o jogo
 * fechado: "colhe a horta, os Lumis guardaram tudo" e "chuva rega sozinha". Ao abrir, o que
 * aconteceu desde o último salvamento é rodado de uma vez, pelas mesmas regras puras do jogo
 * aberto: a chuva dos dias do jogo que passaram rega a horta, e cada Lumi faz a rotina do QUANDO
 * que passou, no momento daquela virada. Nada disto vai para o salvamento além do resultado.
 */
export const JOGO_FECHADO = {
  /** Quantos dias do jogo (16 min cada) a chuva confere ao abrir: os últimos 3 dias de verdade. */
  diasDeChuva: 270,
} as const

export interface ViradaComOJogoFechado {
  quando: QuandoDaRotina
  /** O momento da virada (ms), o mesmo relógio do céu (`momentoDoDia`). */
  em: number
}

/**
 * As viradas que passaram com o jogo fechado, de `fechadoMs` (exclusive) a `agoraMs`: de cada
 * QUANDO, só a mais recente (o teto, uma rotina por QUANDO a cada abertura), na ordem em que
 * aconteceram. O dia do jogo começa ao amanhecer (6h) e anoitece em `PARTE_CLARA` dele.
 */
export function viradasComOJogoFechado(
  fechadoMs: number,
  agoraMs: number,
  comecoMs: number,
): ViradaComOJogoFechado[] {
  if (!(agoraMs > fechadoMs)) return []
  const D = DURACAO_DO_DIA_MS
  const viradas: ViradaComOJogoFechado[] = []
  const amanhecer = comecoMs + Math.floor((agoraMs - comecoMs) / D) * D
  if (amanhecer > fechadoMs && amanhecer > comecoMs)
    viradas.push({ quando: 'quando-amanhecer', em: amanhecer })
  const anoitecer = comecoMs + Math.floor((agoraMs - comecoMs - PARTE_CLARA * D) / D) * D
  const noite = anoitecer + PARTE_CLARA * D
  if (noite > fechadoMs && noite >= comecoMs + PARTE_CLARA * D)
    viradas.push({ quando: 'quando-anoitecer', em: noite })
  return viradas.sort((a, b) => a.em - b.em)
}

/**
 * A chuva com o jogo fechado: no começo de cada dia do jogo que passou (até o teto) em que choveu
 * na sua ilha, a chuva confere a horta como no jogo aberto (rega o que espera água e dá o bônus a
 * quem está na janela do sol). Devolve a horta nova, ou `null` se nada mudou.
 */
export function chuvaComOJogoFechado(
  s: Salvamento,
  jornada: number,
  fechadoMs: number,
  agoraMs: number,
): Canteiro[] | null {
  const D = DURACAO_DO_DIA_MS
  const comeco = Date.parse(s.criadoEm)
  const ultimo = comeco + Math.floor((agoraMs - comeco) / D) * D
  const primeiro = Math.max(
    comeco + (Math.floor((fechadoMs - comeco) / D) + 1) * D,
    ultimo - (JOGO_FECHADO.diasDeChuva - 1) * D,
  )
  let horta: readonly Canteiro[] = s.horta
  let mudou = false
  for (let t = primeiro; t <= ultimo; t += D) {
    if (climaEfetivo({ jornada, visita: null, salvamento: s }, t) !== 'chuva') continue
    const nova = chuvaNaHorta(horta, new Date(t), geladeiraEm(s))
    if (nova) {
      horta = nova
      mudou = true
    }
  }
  return mudou ? [...horta] : null
}

export interface VezComOJogoFechado {
  lumi: LumiId
  registro: string[]
  erro: string | null
}

/**
 * As rotinas das viradas que passaram, cada uma no momento da virada e sobre o mundo que a
 * anterior deixou (a mesma `rodarRotina` da prévia do painel, com os cartões na mão conferidos).
 */
export function rotinasComOJogoFechado(
  inicial: Salvamento,
  viradas: readonly ViradaComOJogoFechado[],
  naMao: ReadonlySet<string> | null,
  jornada: number,
): { salvamento: Salvamento; vezes: VezComOJogoFechado[] } {
  let s = inicial
  const vezes: VezComOJogoFechado[] = []
  for (const v of viradas)
    for (const lumi of rotinasDoQuando(s, v.quando)) {
      const cartoes = s.rotinas[lumi] as readonly CartaoDaRotina[]
      const r = rodarRotina(lumi, cartoes, s, new Date(v.em), naMao, jornada)
      s = r.salvamento
      vezes.push({ lumi, registro: r.registro, erro: r.erro })
    }
  return { salvamento: s, vezes }
}

/** O recado ao abrir, só com o que aconteceu (`null` se nada). */
export function falaDoJogoFechado(choveu: boolean, rotinas: number): string | null {
  const partes: string[] = []
  if (choveu) partes.push('Choveu enquanto você estava fora, e a chuva regou a horta.')
  // Depois da chuva, o "enquanto você estava fora" não se repete.
  const tambem = choveu ? ' também' : ''
  const fora = choveu ? '' : ' enquanto você estava fora'
  if (rotinas > 0)
    partes.push(
      rotinas === 1
        ? `Um Lumi${tambem} fez a rotina${fora}. O que ele fez está no painel Rotina.`
        : `Os Lumis${tambem} fizeram as rotinas${fora}. O que cada um fez está no painel Rotina.`,
    )
  return partes.length > 0 ? partes.join(' ') : null
}
