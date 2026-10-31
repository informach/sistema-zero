import {
  ALTURA_MAXIMA_DO_TERRENO,
  CELULAS_MOLDADAS_MAXIMO,
  type Obra,
  type Terreno,
} from '@sistemazero/arquipelago-contracts'
import { planta } from './comodos'
import { type Celula, chaveDaCelula, type Lote, naArea, noFixo, ocupante } from './lote'
import { celulasDoMovel, moveisDaObra } from './moveis'
import { celulasDoObjeto } from './projeto-azul'

/**
 * Moldar o terreno (E04, a proposta: "Nuvens: moldar o terreno"): a criança sobe e desce o chão do
 * lote da casa célula por célula, em meios metros (até 1,5 m). A casa, os cômodos, os caminhos, os
 * canteiros e o que está posto no quintal ficam no plano, e a borda do lote também: os cantos que
 * encostam nelas não sobem. O chão sobe pelos cantos da grade (o `chao-do-lote` do `terreno.glb` é
 * uma grade de 1 m), então do plano ao alto há sempre uma rampa que se sobe andando.
 */
export const MEIO_METRO = 0.5
/** A posição da jornada da Ilha das Nuvens: daí em diante dá para moldar o terreno. */
export const POSICAO_DO_TERRENO = 7

export function podeMoldarOTerreno(jornada: number): boolean {
  return jornada >= POSICAO_DO_TERRENO
}

export type RecusaDoTerreno = 'fora-do-lote' | 'com-obra' | 'no-alto' | 'no-chao' | 'limite'

export const FALA_DO_TERRENO: Readonly<Record<RecusaDoTerreno, string>> = {
  'fora-do-lote': 'O terreno se molda só dentro do lote da casa.',
  'com-obra': 'Aqui tem casa, caminho, canteiro ou objeto. Esse chão fica plano.',
  'no-alto': 'Este chão já está no mais alto que dá.',
  'no-chao': 'Este chão já está no plano.',
  limite: 'O lote já tem muito chão moldado. Desça um pouco antes de subir outro.',
}

/** A altura de uma célula, em meios metros. */
export function alturaDaCelula(t: Terreno | null, c: Celula): number {
  return t?.alturas.find(([x, z]) => x === c.x && z === c.z)?.[2] ?? 0
}

/** As células onde o chão fica plano: o quarto, os cômodos, os caminhos, canteiros e o que está posto. */
export function celulasPlanas(obra: Obra | null, lote: Lote): Set<string> {
  const planas = new Set<string>()
  if (!obra) return planas
  const p = planta(obra, lote)
  for (const k of p.comodoDe.keys()) planas.add(k)
  for (const c of obra.caminhos) planas.add(chaveDaCelula(c))
  for (const c of obra.canteiros) planas.add(chaveDaCelula(c))
  for (const o of obra.objetos) for (const c of celulasDoObjeto(o)) planas.add(chaveDaCelula(c))
  for (const m of moveisDaObra(obra))
    for (const c of celulasDoMovel(m)) planas.add(chaveDaCelula(c))
  // As paredes soltas e as cercas: as duas células de cada lado ficam no plano.
  for (const t of [...obra.paredes, ...obra.cercas])
    for (let i = 0; i < t.n; i++) {
      const x = t.eixo === 'x' ? t.x + i : t.x
      const z = t.eixo === 'z' ? t.z + i : t.z
      planas.add(chaveDaCelula({ x, z }))
      planas.add(chaveDaCelula(t.eixo === 'x' ? { x, z: z - 1 } : { x: x - 1, z }))
    }
  return planas
}

/** A célula pode ser moldada? (dentro do lote, sem nada que peça chão plano) */
export function podeMoldar(c: Celula, lote: Lote, planas: ReadonlySet<string>): boolean {
  return (
    naArea(lote.area, c) && !noFixo(lote, c) && !ocupante(lote, c) && !planas.has(chaveDaCelula(c))
  )
}

/**
 * Subir (`+1`) ou descer (`-1`) uma célula. Devolve o terreno novo, ou o motivo de não dar. A
 * lista só guarda as células acima do plano.
 */
export function moldar(
  t: Terreno | null,
  obra: Obra | null,
  lote: Lote,
  c: Celula,
  passo: 1 | -1,
): { ok: true; terreno: Terreno } | { ok: false; motivo: RecusaDoTerreno } {
  if (!naArea(lote.area, c)) return { ok: false, motivo: 'fora-do-lote' }
  if (!podeMoldar(c, lote, celulasPlanas(obra, lote))) return { ok: false, motivo: 'com-obra' }
  const antes = alturaDaCelula(t, c)
  const depois = antes + passo
  if (depois > ALTURA_MAXIMA_DO_TERRENO) return { ok: false, motivo: 'no-alto' }
  if (depois < 0) return { ok: false, motivo: 'no-chao' }
  const outras = (t?.alturas ?? []).filter(([x, z]) => x !== c.x || z !== c.z)
  if (depois > 0 && outras.length >= CELULAS_MOLDADAS_MAXIMO) return { ok: false, motivo: 'limite' }
  return {
    ok: true,
    terreno: { alturas: depois > 0 ? [...outras, [c.x, c.z, depois]] : outras },
  }
}

/**
 * Subir ou descer as células de um arrasto (ou de um toque), cada uma uma vez. As que não dão
 * ficam como estão; se nenhuma mudou, devolve o motivo da primeira.
 */
export function moldarCelulas(
  t: Terreno | null,
  obra: Obra | null,
  lote: Lote,
  celulas: readonly Celula[],
  passo: 1 | -1,
): { ok: true; terreno: Terreno } | { ok: false; motivo: RecusaDoTerreno } {
  let atual = t
  let motivo: RecusaDoTerreno | null = null
  let mudou = false
  for (const c of celulas) {
    const r = moldar(atual, obra, lote, c, passo)
    if (r.ok) {
      atual = r.terreno
      mudou = true
    } else motivo ??= r.motivo
  }
  if (mudou && atual) return { ok: true, terreno: atual }
  return { ok: false, motivo: motivo ?? 'fora-do-lote' }
}

/**
 * A altura (em metros, acima do chão de sempre) de um canto da grade (x, z inteiros): a maior das
 * quatro células em volta, e zero se alguma delas pede chão plano ou fica fora do lote. Assim o
 * que é plano continua plano até a borda, e o alto desce em rampa dentro da célula moldada.
 */
export function alturaDoCanto(
  t: Terreno | null,
  lote: Lote,
  planas: ReadonlySet<string>,
  x: number,
  z: number,
): number {
  let maior = 0
  for (const c of [
    { x: x - 1, z: z - 1 },
    { x, z: z - 1 },
    { x: x - 1, z },
    { x, z },
  ]) {
    if (!podeMoldar(c, lote, planas)) return 0
    maior = Math.max(maior, alturaDaCelula(t, c))
  }
  return maior * MEIO_METRO
}

/**
 * O terreno ainda vale com esta obra? As células que passaram a ter obra voltam ao plano (a casa
 * cresceu por cima de um morrinho: o chão debaixo dela fica plano).
 */
export function terrenoComAObra(t: Terreno | null, obra: Obra | null, lote: Lote): Terreno | null {
  if (!t) return null
  const planas = celulasPlanas(obra, lote)
  const alturas = t.alturas.filter(([x, z]) => podeMoldar({ x, z }, lote, planas))
  return alturas.length === t.alturas.length ? t : { alturas }
}
