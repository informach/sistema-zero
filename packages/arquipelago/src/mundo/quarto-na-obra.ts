import type { QuartoDoJogo } from '@sistemazero/arquipelago-contracts'
import { ROOM_ITEM_INFO, resolveRoomAppearance } from '@sistemazero/avatar-quarto/quarto/catalog'
import type { Material, Mesh, MeshStandardMaterial, Object3D } from 'three'
import type { ParedeDoMeuQuarto } from '../sistemas/construcao/lote'

/**
 * O que a casa construída lê do Meu quarto da plataforma (31/10/2026): a cor de dentro das paredes
 * da esquerda e do fundo e onde ficam os quadros e as prateleiras pendurados nelas. Fica no mundo
 * (e não no sistema puro) porque precisa do catálogo do `avatar-quarto`.
 */

/** A parede do Meu quarto de cada lado da plataforma: `left` corre em z (x -6), `right` em x (z -8). */
const PAREDE_DO_LADO: Readonly<Record<'left' | 'right', ParedeDoMeuQuarto>> = {
  left: 'esquerda',
  right: 'fundo',
}

/** Os itens pendurados (`mount: 'wall'`) do quarto: em que parede, de que célula e com que largura. */
export function penduradosDoQuarto(
  quarto: QuartoDoJogo,
): { parede: ParedeDoMeuQuarto; u: number; largura: number }[] {
  const lista: { parede: ParedeDoMeuQuarto; u: number; largura: number }[] = []
  for (const p of quarto.placedItems) {
    const info = ROOM_ITEM_INFO[p.itemId]
    if (!info || info.mount !== 'wall' || p.on) continue
    // Sem `wall`, o item fica na parede da direita (como em `FurniturePiece`).
    lista.push({ parede: PAREDE_DO_LADO[p.wall ?? 'right'], u: p.x, largura: info.w })
  }
  return lista
}

/** A cor de dentro de cada parede do Meu quarto. */
export type CoresDoMeuQuarto = Readonly<Record<ParedeDoMeuQuarto, string>>

/** A cor de dentro de cada parede do Meu quarto (a que a criança escolheu, ou a do tema). */
export function coresDoMeuQuarto(quarto: QuartoDoJogo): CoresDoMeuQuarto {
  const aparencia = resolveRoomAppearance(quarto)
  return { esquerda: aparencia.left, fundo: aparencia.right }
}

/** O material do lado de dentro das paredes do kit (o +Y local, README de `arte/casa`). */
export const MATERIAL_DE_DENTRO = 'paredeDentro'

/**
 * O material de dentro de cada parede do Meu quarto, com a cor que a criança escolheu lá: uma cópia
 * do `paredeDentro` do kit (o do arquivo, que as outras peças usam, não muda). Quem pede descarta.
 */
export function materiaisDoMeuQuarto(
  base: MeshStandardMaterial,
  cores: CoresDoMeuQuarto,
): Record<ParedeDoMeuQuarto, MeshStandardMaterial> {
  const feito = (cor: string) => {
    const m = base.clone()
    m.color.set(cor)
    return m
  }
  return { esquerda: feito(cores.esquerda), fundo: feito(cores.fundo) }
}

/**
 * Troca o lado de uma cópia de peça do kit que dá para o quarto (o material com o nome `lado`,
 * `paredeDentro` ou `paredeVerso`) pelo material dado; os outros ficam.
 */
export function pintarLado(copia: Object3D, lado: string, dentro: Material): void {
  copia.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    const trocar = (mat: Material) => (mat.name === lado ? dentro : mat)
    m.material = Array.isArray(m.material) ? m.material.map(trocar) : trocar(m.material)
  })
}
