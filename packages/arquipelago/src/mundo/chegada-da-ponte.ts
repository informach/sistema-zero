/**
 * A cena da subida de posto (N02, regras puras): "na próxima vez que entrar no jogo, o Zappy voa
 * até a ilha cinza, a cor escorre por ela, a ponte se monta tábua por tábua e a câmera mostra a
 * travessia". Três etapas: o voo do Zappy (a câmera no alto da sua ilha, olhando a ilha), a ponte
 * se montando com a cor escorrendo (a câmera de lado) e a travessia (a câmera anda pela ponte).
 * A cena espera a criança estar fora de casa, sem painel, menu, corrida ou visita.
 */
import { type Ilha, type IlhaId, ilhaAberta, ilhasDoAnel } from '@sistemazero/arquipelago-contracts'
import { centroNoAnel, type PontoDaPonte, trajetoDaPonte } from './medidas'

/** Segundos de cada etapa. A da ponte é a mesma montagem de antes (4,5 s). */
export const CHEGADA = { voo: 2.4, ponte: 4.5, travessia: 3.4 } as const
export const DURACAO_DA_CHEGADA = CHEGADA.voo + CHEGADA.ponte + CHEGADA.travessia
/** Com menos movimento, a câmera fica parada de lado e a cena é a montagem da ponte. */
export const DURACAO_COM_MENOS_MOVIMENTO = CHEGADA.ponte + 1

export type EtapaDaChegada = 'voo' | 'ponte' | 'travessia' | 'fim'

export function etapaDaChegada(t: number, menosMovimento = false): EtapaDaChegada {
  if (menosMovimento) return t >= DURACAO_COM_MENOS_MOVIMENTO ? 'fim' : 'ponte'
  if (t < CHEGADA.voo) return 'voo'
  if (t < CHEGADA.voo + CHEGADA.ponte) return 'ponte'
  if (t < DURACAO_DA_CHEGADA) return 'travessia'
  return 'fim'
}

/** Quanto da ponte já se montou e da cor já escorreu (0 a 1). */
export function progressoDaChegada(t: number, menosMovimento = false): number {
  const inicio = menosMovimento ? 0.5 : CHEGADA.voo
  return Math.min(1, Math.max(0, (t - inicio) / CHEGADA.ponte))
}

/** A próxima ilha aberta cuja ponte a pessoa ainda não viu chegar, na ordem dos postos. */
export function ilhaParaChegar(jornada: number, pontesVistas: readonly IlhaId[]): Ilha | null {
  const vistas = new Set(pontesVistas)
  return (
    [...ilhasDoAnel()]
      .sort((a, b) => a.posicao - b.posicao)
      .find((i) => ilhaAberta(i.id, jornada) && !vistas.has(i.id)) ?? null
  )
}

/** O que precisa valer para a cena começar (ou continuar): o mundo livre e a criança à vista. */
export interface SinaisDaChegada {
  dentroDeCasa: boolean
  menuAberto: boolean
  painelAberto: string | null
  ferramentaAberta: boolean
  visita: unknown
  correndo: boolean
}

export function podeComecarAChegada(s: SinaisDaChegada): boolean {
  return (
    !s.dentroDeCasa &&
    !s.menuAberto &&
    s.painelAberto === null &&
    !s.ferramentaAberta &&
    !s.visita &&
    !s.correndo
  )
}

type P = { x: number; y: number; z: number }

const suave = (k: number) => {
  const c = Math.min(1, Math.max(0, k))
  return c * c * (3 - 2 * c)
}
const misturar = (a: P, b: P, k: number): P => ({
  x: a.x + (b.x - a.x) * k,
  y: a.y + (b.y - a.y) * k,
  z: a.z + (b.z - a.z) * k,
})

/** Os pontos que a cena usa, de uma vez: o começo e o fim da ponte, o meio dela e a ilha. */
export interface PalcoDaChegada {
  inicio: PontoDaPonte
  fim: PontoDaPonte
  meio: PontoDaPonte
  ilha: P
  /** Para onde a ponte vai (da sua ilha para a do anel), no chão. */
  rumo: { x: number; z: number }
  /** O lado da ponte de onde a câmera olha a montagem. */
  lado: { x: number; z: number }
}

export function palcoDaChegada(ilha: Ilha): PalcoDaChegada {
  const trajeto = trajetoDaPonte(ilha, 24)
  const inicio = trajeto[0] as PontoDaPonte
  const fim = trajeto.at(-1) as PontoDaPonte
  const meio = trajeto[12] as PontoDaPonte
  const c = centroNoAnel(ilha)
  const d = Math.hypot(fim.x - inicio.x, fim.z - inicio.z) || 1
  const rumo = { x: (fim.x - inicio.x) / d, z: (fim.z - inicio.z) / d }
  return {
    inicio,
    fim,
    meio,
    ilha: { x: c.x, y: fim.y + 1.5, z: c.z },
    rumo,
    lado: { x: -rumo.z, z: rumo.x },
  }
}

/** Onde a câmera fica e para onde olha em cada instante da cena. */
export function vistaDaChegada(
  p: PalcoDaChegada,
  t: number,
  menosMovimento = false,
): { posicao: P; alvo: P } {
  // A vista de lado: a ponte inteira e a ilha à frente.
  const deLado = {
    posicao: {
      x: p.meio.x + p.lado.x * 22 - p.rumo.x * 6,
      y: p.meio.y + 9,
      z: p.meio.z + p.lado.z * 22 - p.rumo.z * 6,
    },
    alvo: { x: p.meio.x + p.rumo.x * 8, y: p.meio.y, z: p.meio.z + p.rumo.z * 8 },
  }
  if (menosMovimento) return deLado
  // No alto da sua ilha, atrás do começo da ponte, olhando a ilha cinza.
  const doAlto = {
    posicao: {
      x: p.inicio.x - p.rumo.x * 9,
      y: p.inicio.y + 7,
      z: p.inicio.z - p.rumo.z * 9,
    },
    alvo: p.ilha,
  }
  const e = etapaDaChegada(t)
  if (e === 'voo') return doAlto
  if (e === 'ponte') {
    const k = suave((t - CHEGADA.voo) / 1.8)
    return {
      posicao: misturar(doAlto.posicao, deLado.posicao, k),
      alvo: misturar(doAlto.alvo, deLado.alvo, k),
    }
  }
  // A travessia: a câmera anda pela ponte, um pouco atrás e acima, olhando para a ilha.
  const k = suave((t - CHEGADA.voo - CHEGADA.ponte) / CHEGADA.travessia)
  const naPonte = misturar(p.inicio, p.fim, k)
  const andando = {
    posicao: { x: naPonte.x - p.rumo.x * 5, y: naPonte.y + 3.2, z: naPonte.z - p.rumo.z * 5 },
    alvo: { x: p.ilha.x, y: p.ilha.y, z: p.ilha.z },
  }
  const entrada = suave((t - CHEGADA.voo - CHEGADA.ponte) / 1.2)
  return {
    posicao: misturar(deLado.posicao, andando.posicao, entrada),
    alvo: misturar(deLado.alvo, andando.alvo, entrada),
  }
}

/** Onde o Zappy voa durante a cena: da criança até a ilha cinza, e fica sobre ela. */
export function zappyNaChegada(p: PalcoDaChegada, t: number, origem: P): P {
  const sobreAIlha = { x: p.ilha.x, y: p.ilha.y + 2.5, z: p.ilha.z }
  const k = suave(t / CHEGADA.voo)
  // Sobe um pouco no meio do voo, como um arco.
  const voo = misturar(origem, sobreAIlha, k)
  return { ...voo, y: voo.y + Math.sin(Math.PI * k) * 4 }
}

/** A fala do fim da cena (a mesma de antes, quando a ponte só se montava). */
export function falaDaChegada(ilha: Ilha, artigo: 'a' | 'o'): string {
  return `A ponte para ${artigo} ${ilha.nome} ficou pronta. A cor começou a voltar para lá.`
}
