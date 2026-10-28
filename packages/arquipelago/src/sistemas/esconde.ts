import type { BichoDoBosque, SalvamentoV3 } from '@sistemazero/arquipelago-contracts'
import { BICHOS_DO_BOSQUE } from '@sistemazero/arquipelago-contracts'

/**
 * O esconde-esconde dos bichos do Bosque (regras puras). Cada bicho fica sempre no mesmo
 * esconderijo (uma criança pode contar para outra onde achou). Perto dele aparece uma pista; bem
 * perto, "E Achar". O Zappy, se pedirem ajuda, diz o quanto a criança está perto do mais próximo.
 */

export type Bichos = SalvamentoV3['bichos']

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
