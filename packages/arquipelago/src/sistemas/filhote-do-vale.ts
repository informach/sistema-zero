import {
  DIAS_CUIDADOS_MAXIMO,
  DIAS_PARA_CHOCAR,
  type FilhoteDoVale,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { remover } from './itens'

/**
 * O filhote de dino do Vale (fase4-03, salvamento V15 `vale.filhote`). Depois de cuidar dos três
 * ninhos, a Jade entrega um ovo; a criança o aquece no chão quente do pé do vulcão, um dia por vez,
 * e com `DIAS_PARA_CHOCAR` dias ele nasce: um tricerátopo filhote, que ganha um nome e mora no
 * Vale. Cada dia em que ele come e ganha carinho conta para crescer. Sem prazo: um dia sem cuidar
 * não tira nada, e nada se perde.
 */

/** Com quantos dias cuidados o filhote chega ao tamanho de crescido. */
export const DIAS_PARA_CRESCER = 5

/**
 * A escala do desenho (`triceratops-filhote.glb`: 0,48 m de altura e 0,77 de comprimento na
 * escala 1), do recém-nascido ao crescido. Crescido ele chega a uns 0,86 m.
 */
export const TAMANHO_DO_FILHOTE = { nascido: 1, crescido: 1.8 } as const

/** O que ele come: o que a horta dá (tricerátopo come plantas). */
export const COMIDA_DO_FILHOTE = ['alface', 'tomate', 'milho'] as const

export const FILHOTE_NO_VALE = {
  /** O alcance do chão quente e do filhote (como os ninhos e a Jade). */
  alcance: 2.2,
  /** O ovo do `vale-dos-dinos-props.glb` mede 0,78 m: no chão quente, com 0,47 m. */
  escalaDoOvo: 0.6,
  /** Passo calmo, em m/s, e o tempo parado em cada ponto do passeio (s). */
  velocidade: 0.5,
  parada: 4,
} as const

/**
 * O passeio do filhote em volta do chão quente (`pe-do-vulcao`), no referencial do GLB do Vale:
 * chão plano e livre para o corpo crescido, entre o vulcão e o lampião, longe da Jade. O teste
 * (`tests/filhote-do-vale.test.ts`) confere cada ponto e a reta entre pontos vizinhos. Ele não
 * colide (como o bicho adotado, que passa pela criança): é bicho miúdo que anda em volta.
 */
export const PASSEIO_DO_FILHOTE = [
  { x: 0.9, z: 0.9 },
  { x: 2.1, z: 1.4 },
  { x: 2.5, z: 0.2 },
  { x: 1.6, z: -0.9 },
  { x: 0.6, z: -1 },
] as const

export const FALA_DO_OVO = [
  'Um dos ovos dos ninhos precisa de calor para chocar.',
  'Leve este ovo ao chão quente, no pé do vulcão, e aqueça um pouco a cada dia.',
] as const
export const FALA_DA_JADE_COM_O_OVO =
  'O ovo precisa de calor. Aqueça no chão quente do pé do vulcão, um dia de cada vez.'
export const FALA_DA_JADE_COM_O_FILHOTE =
  'O filhote cresce com comida e carinho, um dia de cada vez.'

/** Estado de um filhote novo: o ovo recém-entregue. */
export const OVO_NOVO: FilhoteDoVale = {
  ovo: 0,
  aquecidoEm: null,
  nome: null,
  comeuEm: null,
  carinhoEm: null,
  dias: 0,
}

export function nasceu(f: FilhoteDoVale | null): boolean {
  return f !== null && f.ovo >= DIAS_PARA_CHOCAR
}

export function tamanhoDoFilhote(f: FilhoteDoVale): number {
  const t = Math.min(1, f.dias / DIAS_PARA_CRESCER)
  return TAMANHO_DO_FILHOTE.nascido + (TAMANHO_DO_FILHOTE.crescido - TAMANHO_DO_FILHOTE.nascido) * t
}

export function cresceu(f: FilhoteDoVale | null): boolean {
  return nasceu(f) && f!.dias >= DIAS_PARA_CRESCER
}

export interface ResultadoDoFilhote {
  salvamento: Salvamento
  fala: string
}

function comFilhote(s: Salvamento, f: FilhoteDoVale): Salvamento {
  return { ...s, vale: { ...s.vale, filhote: f } }
}

/** Aquecer o ovo no chão quente: um dia por vez, e no último ele nasce. */
export function aquecerOOvo(s: Salvamento, hoje: string): ResultadoDoFilhote | null {
  const f = s.vale.filhote
  if (!f || nasceu(f)) return null
  if (f.aquecidoEm === hoje)
    return {
      salvamento: s,
      fala: 'O ovo já ficou quentinho hoje. Volte amanhã para aquecer de novo.',
    }
  const ovo = f.ovo + 1
  const novo = { ...f, ovo, aquecidoEm: hoje }
  if (ovo >= DIAS_PARA_CHOCAR)
    return {
      salvamento: comFilhote(s, novo),
      fala: 'O ovo rachou e um tricerátopo filhote nasceu. Ele está esperando um nome.',
    }
  const faltam = DIAS_PARA_CHOCAR - ovo
  return {
    salvamento: comFilhote(s, novo),
    fala: `O ovo ficou quentinho. ${faltam === 1 ? 'Falta 1 dia' : `Faltam ${faltam} dias`} para ele chocar.`,
  }
}

/** O nome do filhote (de 1 a 16 letras); nome vazio não muda nada. */
export function nomearOFilhote(s: Salvamento, nome: string): Salvamento {
  const f = s.vale.filhote
  const limpo = nome.trim().slice(0, 16)
  if (!f || !nasceu(f) || limpo === '' || limpo === f.nome) return s
  return comFilhote(s, { ...f, nome: limpo })
}

/** O dia conta quando ele comeu e ganhou carinho nesse mesmo dia, uma vez só. */
function contarODia(antes: FilhoteDoVale, depois: FilhoteDoVale, hoje: string): FilhoteDoVale {
  const jaContou = antes.comeuEm === hoje && antes.carinhoEm === hoje
  const conta = !jaContou && depois.comeuEm === hoje && depois.carinhoEm === hoje
  return conta ? { ...depois, dias: Math.min(DIAS_CUIDADOS_MAXIMO, depois.dias + 1) } : depois
}

function falaDoDia(f: FilhoteDoVale, hoje: string): string {
  if (f.comeuEm !== hoje) return 'Agora ele está com fome.'
  if (f.carinhoEm !== hoje) return 'Agora ele quer carinho.'
  if (cresceu(f))
    return `${f.nome ?? 'O filhote'} cresceu e ficou forte. Ele continua gostando de carinho.`
  const faltam = DIAS_PARA_CRESCER - f.dias
  return `Hoje ele foi bem cuidado. ${faltam === 1 ? 'Falta 1 dia' : `Faltam ${faltam} dias`} para ele crescer.`
}

/** Dar comida: uma alface, um tomate ou um milho da mochila, uma vez por dia. */
export function alimentarOFilhote(s: Salvamento, hoje: string): ResultadoDoFilhote | null {
  const f = s.vale.filhote
  if (!f || !nasceu(f)) return null
  if (f.comeuEm === hoje) return { salvamento: s, fala: 'Ele já comeu hoje.' }
  for (const id of COMIDA_DO_FILHOTE) {
    const inventario = remover(s.inventario, id)
    if (!inventario) continue
    const depois = contarODia(f, { ...f, comeuEm: hoje }, hoje)
    return { salvamento: { ...comFilhote(s, depois), inventario }, fala: falaDoDia(depois, hoje) }
  }
  return { salvamento: s, fala: 'Ele come alface, tomate ou milho. Colha na horta e traga.' }
}

/** Dar carinho, uma vez por dia. */
export function carinhoNoFilhote(s: Salvamento, hoje: string): ResultadoDoFilhote | null {
  const f = s.vale.filhote
  if (!f || !nasceu(f)) return null
  if (f.carinhoEm === hoje)
    return { salvamento: s, fala: 'Ele já ganhou carinho hoje e está feliz.' }
  const depois = contarODia(f, { ...f, carinhoEm: hoje }, hoje)
  return { salvamento: comFilhote(s, depois), fala: falaDoDia(depois, hoje) }
}

const maisTarde = (a: string | null, b: string | null) =>
  a === null ? b : b === null ? a : a > b ? a : b

/**
 * Duas sessões ao mesmo tempo: o filhote mais adiantado de cada parte (nada se gasta cuidando, a
 * não ser a comida da mochila, que a conciliação já trata pelo inventário). O nome da sessão local
 * vence quando as duas deram nome.
 */
export function juntarFilhotes(
  local: FilhoteDoVale | null,
  remoto: FilhoteDoVale | null,
): FilhoteDoVale | null {
  if (!local) return remoto
  if (!remoto) return local
  return {
    ovo: Math.max(local.ovo, remoto.ovo),
    aquecidoEm: maisTarde(local.aquecidoEm, remoto.aquecidoEm),
    nome: local.nome ?? remoto.nome,
    comeuEm: maisTarde(local.comeuEm, remoto.comeuEm),
    carinhoEm: maisTarde(local.carinhoEm, remoto.carinhoEm),
    dias: Math.max(local.dias, remoto.dias),
  }
}

/** Onde o filhote está no passeio: a posição, o ponto para onde vai e quanto falta parado. */
export interface PasseioDoFilhote {
  x: number
  z: number
  alvo: number
  espera: number
}

export function comecarPasseio(pontos: readonly { x: number; z: number }[]): PasseioDoFilhote {
  const p = pontos[0] ?? { x: 0, z: 0 }
  return { x: p.x, z: p.z, alvo: 0, espera: FILHOTE_NO_VALE.parada }
}

/**
 * Um passo do passeio (muda `p`, sem alocar): parado um tempo em cada ponto e depois para um
 * vizinho na roda (o anterior ou o seguinte, pelo `sorte` de 0 a 1), sempre por retas conferidas.
 * Devolve se está andando, para o clipe.
 */
export function passoDoPasseio(
  p: PasseioDoFilhote,
  pontos: readonly { x: number; z: number }[],
  dt: number,
  sorte: number,
): boolean {
  if (pontos.length < 2) return false
  if (p.espera > 0) {
    p.espera = Math.max(0, p.espera - dt)
    if (p.espera === 0) p.alvo = (p.alvo + (sorte < 0.5 ? pontos.length - 1 : 1)) % pontos.length
    return false
  }
  const alvo = pontos[p.alvo]!
  const dx = alvo.x - p.x
  const dz = alvo.z - p.z
  const falta = Math.hypot(dx, dz)
  const anda = FILHOTE_NO_VALE.velocidade * dt
  if (falta <= anda) {
    p.x = alvo.x
    p.z = alvo.z
    p.espera = FILHOTE_NO_VALE.parada
    return false
  }
  p.x += (dx / falta) * anda
  p.z += (dz / falta) * anda
  return true
}
