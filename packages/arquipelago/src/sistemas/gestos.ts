import { AVATAR_CATALOG } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import type { Movimento } from '../estado/contexto'
import type { ObjetoDeMao } from '../personagem/objeto-na-mao'
import { CORPO } from './corpo'
import { duracaoDoEstado, duracaoDoGesto, type Gesto } from './locomocao'

/**
 * Os gestos do corpo (regra pura): o mundo pede (`pedirGesto`: colher, plantar, regar, comemorar,
 * dançar) e o personagem também (levantar do banco e da cama, descer da sela). O gesto fica o tempo
 * dele (`duracaoDoGesto`), parada; andar corta na hora, e fora do chão (nadando, num modo especial)
 * ele não começa. A máquina de locomoção põe o clipe no lugar do "Parado".
 */
/** Os objetos de mão que um gesto traz (o regador ao regar, o balde cheio). */
export type ObjetoDoGesto = Extract<ObjetoDeMao, 'mao_regador' | 'mao_balde'>

/** O mundo pede um gesto (o personagem atende no passo seguinte). */
export function pedirGesto(
  movimento: Pick<Movimento, 'gesto' | 'gestos'>,
  qual: Gesto,
  objeto: ObjetoDoGesto | null = null,
): void {
  movimento.gesto = { qual, objeto }
  movimento.gestos += 1
}

/** Achou uma peça no chão: pega; se ela fechou a coleção, comemora. */
export function gestoDoAchado(completou: boolean): Gesto {
  return completou ? 'Comemorar' : 'PegarDoChao'
}

const lugarDe = (id: string) =>
  AVATAR_CATALOG.base.skeleton.game.clips.find((c) => c.id === id)?.place
const faixa = (id: string, padrao: [number, number]): [number, number] => {
  const f = lugarDe(id)?.faixa_da_terra_m
  return Array.isArray(f) && f.length === 2 ? [Number(f[0]), Number(f[1])] : padrao
}
/**
 * Plantar na terra baixa (o canteiro no chão, até 0,3 m) ou na alta (o canteiro elevado, 0,45 a
 * 0,65 m): pelas faixas que a arte mediu em cada clipe, partindo no meio do vão entre elas. A altura
 * é a da terra, nas medidas da arte (as peças da Morada e o avatar saem da mesma biblioteca).
 */
export function gestoDePlantar(alturaDaTerra: number): 'Plantar' | 'PlantarAlto' {
  const baixo = faixa('plantar', [0, 0.3])[1]
  const alto = faixa('plantar_alto', [0.45, 0.65])[0]
  return alturaDaTerra > (baixo + alto) / 2 ? 'PlantarAlto' : 'Plantar'
}

export interface GestoEmAndamento {
  qual: Gesto | null
  objeto: ObjetoDoGesto | null
  /** Quanto falta (s) e quanto ele dura. */
  falta: number
  duracao: number
  /** Os pedidos do mundo já vistos. */
  vistos: number
  /** Quantos gestos já começaram (a locomoção recomeça o clipe a cada vez, mesmo repetido). */
  vez: number
}

export function criarGestoEmAndamento(vistos = 0): GestoEmAndamento {
  return { qual: null, objeto: null, falta: 0, duracao: 0, vistos, vez: 0 }
}

export function comecarGesto(
  g: GestoEmAndamento,
  qual: Gesto,
  objeto: ObjetoDoGesto | null = null,
): void {
  g.qual = qual
  g.objeto = objeto
  g.duracao = duracaoDoGesto(qual)
  g.falta = g.duracao
  g.vez += 1
}

/** De 0 (começando) a 1 (acabou); 0 sem gesto. */
export function progressoDoGesto(g: GestoEmAndamento): number {
  return g.qual && g.duracao > 0 ? 1 - g.falta / g.duracao : 0
}

/**
 * Um passo: atende o pedido novo do mundo (se ela está livre: no chão, fora da água), corta o gesto
 * se ela andou e desconta o tempo. Muda `g`.
 */
export function passoDoGesto(
  g: GestoEmAndamento,
  pedido: Pick<Movimento, 'gesto' | 'gestos'>,
  e: { dt: number; andou: boolean; livre: boolean },
): GestoEmAndamento {
  if (pedido.gestos !== g.vistos) {
    g.vistos = pedido.gestos
    if (pedido.gesto && e.livre && !e.andou) comecarGesto(g, pedido.gesto.qual, pedido.gesto.objeto)
  }
  if (!g.qual) return g
  g.falta = e.andou || !e.livre ? 0 : g.falta - e.dt
  if (g.falta <= 0) {
    g.qual = null
    g.objeto = null
    g.falta = 0
  }
  return g
}

const montar = AVATAR_CATALOG.base.skeleton.game.clips.find((c) => c.id === 'montar')
/**
 * A altura do assento no `montar` e no `desmontar` da arte (0,3 m nativos), no mundo: os dois clipes
 * foram feitos para uma sela baixa.
 */
export const ASSENTO_DO_MONTAR =
  ((montar?.place?.assento_m as number | undefined) ?? 0.3) * CORPO.medidas.scale

const suave = (t: number) => {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

/**
 * A sela é baixa o bastante para o `montar` e o `desmontar` da arte (feitos para um assento a 0,3 m
 * nativos, com folga de um quarto). Na sela alta (o dino do Vale, 0,70 m nativos), a arte pediu o
 * mesmo corte do vagonete: ela aparece direto montada e direto no chão.
 */
export function selaBaixa(sela: number): boolean {
  return sela <= ASSENTO_DO_MONTAR * 1.25
}

/**
 * Quanto o desenho sobe (m) por causa da sela (`sela`): montada, até a sela (a origem do `montado` é
 * ela). Na sela baixa, subindo, o desenho vai do chão até onde o assento do `montar` cai na sela, ao
 * longo do clipe; descendo, o mesmo ao contrário, junto do `desmontar`. Na alta, o corte.
 */
export function alturaNaSela(
  sela: number,
  o: { montada: boolean; noModo: number; desmontando: number | null },
): number {
  if (!selaBaixa(sela)) return o.montada ? sela : 0
  const ateOAssento = Math.max(0, sela - ASSENTO_DO_MONTAR)
  if (o.montada) {
    // A mesma duração com que a locomoção toca o subir na sela.
    const d = duracaoDoEstado('Montando')
    const t = d > 0 ? o.noModo / d : 1
    return t < 1 ? ateOAssento * suave(t) : sela
  }
  if (o.desmontando !== null) return ateOAssento * (1 - suave(o.desmontando))
  return 0
}
