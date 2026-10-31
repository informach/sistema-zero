import type { BichoDoBosque, Salvamento } from '@sistemazero/arquipelago-contracts'
import { BICHOS_DO_BOSQUE } from '@sistemazero/arquipelago-contracts'

/**
 * O esconde-esconde dos bichos do Bosque (regras puras). Cada bicho fica sempre no mesmo
 * esconderijo (uma criança pode contar para outra onde achou). Perto dele aparece uma pista; bem
 * perto, "E Achar". Depois de conhecer a Capi, o Zappy avisa quando a criança esquenta (chega mais
 * perto do escondido mais próximo) e quando a pista aparece.
 */

/** Os bichos do Bosque no salvamento: os achados, o adotado que vai junto e os outros (V23). */
export type Bichos = Salvamento['bichos']

/** O nó de cada esconderijo no `bosque.glb` e a pista que aparece perto dele. */
export const ESCONDERIJOS: Readonly<
  Record<BichoDoBosque, { ancora: string; pista: 'rabinho' | 'orelhas' | 'farfalhar' | 'focinho' }>
> = {
  cachorro: { ancora: 'esconderijo-1', pista: 'rabinho' },
  gato: { ancora: 'esconderijo-2', pista: 'orelhas' },
  coelho: { ancora: 'esconderijo-3', pista: 'farfalhar' },
  porquinho: { ancora: 'esconderijo-4', pista: 'focinho' },
}

/** A esta distância (no chão) a pista aparece; a esta, dá para achar. */
export const RAIO_DA_PISTA = 4
export const RAIO_DE_ACHAR = 1.4

export type Calor = 'pertinho' | 'quentinho' | 'morno' | 'frio'

/** O quanto está perto, como o Zappy diz. */
export function calor(distancia: number): Calor {
  if (distancia <= RAIO_DE_ACHAR * 1.5) return 'pertinho'
  if (distancia <= 7) return 'quentinho'
  if (distancia <= 15) return 'morno'
  return 'frio'
}

export const FALA_DO_CALOR: Readonly<Record<Calor, string>> = {
  pertinho: 'Pertinho. Olhe em volta com calma.',
  quentinho: 'Está quentinho. Tem um bicho por aqui.',
  morno: 'Está morno. Ande mais um pouco.',
  frio: 'Está frio. Tente outro lado do bosque.',
}

/** O que o Zappy diz quando a pista aparece (a criança chegou a `RAIO_DA_PISTA`). */
export const FALA_DA_PISTA: Readonly<
  Record<(typeof ESCONDERIJOS)[BichoDoBosque]['pista'], string>
> = {
  rabinho: 'Tem um rabinho balançando atrás daquela moita.',
  orelhas: 'Duas orelhinhas apareceram entre os cogumelos.',
  farfalhar: 'Alguma coisa se mexeu dentro da toca.',
  focinho: 'Um focinho espiou atrás da cabana.',
}

const ORDEM_DO_CALOR: readonly Calor[] = ['frio', 'morno', 'quentinho', 'pertinho']

/** Entre dois falares do calor, o Zappy espera isto (s): ele ajuda sem falar o tempo todo. */
export const INTERVALO_DO_CALOR = 12

/**
 * O Zappy fala do calor só quando esquenta (de frio para morno, de morno para quentinho...), e
 * não antes de `INTERVALO_DO_CALOR` desde a última vez. Esfriar não diz nada.
 */
export function deveFalarDoCalor(
  antes: Calor | null,
  agora: Calor,
  segundosDesdeAUltima: number,
): boolean {
  if (antes === null || segundosDesdeAUltima < INTERVALO_DO_CALOR) return false
  return ORDEM_DO_CALOR.indexOf(agora) > ORDEM_DO_CALOR.indexOf(antes)
}

export function escondidos(bichos: Bichos): BichoDoBosque[] {
  return BICHOS_DO_BOSQUE.filter((b) => !bichos.achados.includes(b))
}

/** O bicho escondido mais perto de `p` e a distância no chão, ou `null` se todos já foram achados. */
export function maisPertoEscondido(
  bichos: Bichos,
  p: { x: number; z: number },
  onde: Readonly<Partial<Record<BichoDoBosque, { x: number; z: number }>>>,
): { bicho: BichoDoBosque; distancia: number } | null {
  let melhor: { bicho: BichoDoBosque; distancia: number } | null = null
  for (const b of escondidos(bichos)) {
    const e = onde[b]
    if (!e) continue
    const d = Math.hypot(e.x - p.x, e.z - p.z)
    if (!melhor || d < melhor.distancia) melhor = { bicho: b, distancia: d }
  }
  return melhor
}

/** Achar: o bicho vai para o cercadinho da Capi. Achar de novo não muda nada. */
export function achar(bichos: Bichos, bicho: BichoDoBosque): Bichos {
  if (bichos.achados.includes(bicho)) return bichos
  return { ...bichos, achados: [...bichos.achados, bicho] }
}
