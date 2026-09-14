import { describe, expect, it } from 'bun:test'
import { BLOCK_LEVELS } from '../../core/levels'
import { gameTwoDToolboxCategory } from '../../official-extensions/game-2d/blocks'
import { gameKitToolboxCategory } from '../../official-extensions/game-2d-advanced/blocks'
import { gameThreeDToolboxCategory } from '../../official-extensions/game-3d/blocks'
import { gameKit3DToolboxCategory } from '../../official-extensions/game-3d-advanced/blocks'
import { world3DToolboxCategory } from '../../official-extensions/world-3d/blocks'
import { resolveBlockLevel } from '../blockLevels'

/**
 * ⭐⭐ Uma sombra de fábrica nunca pode ser de um degrau ACIMA do bloco que a
 * contém.
 *
 * A sombra é o que vem pré-encaixado quando a criança arrasta o bloco da paleta.
 * Se ela for de um degrau que aquela criança ainda não tem, o conceito aparece na
 * tela dela sem estar na paleta: ela não acha a peça, não consegue recriá-la e o
 * orçamento pedagógico daquele degrau passa a mentir sobre quantas peças ele
 * mostra de verdade.
 *
 * Esta rede nasceu de uma violação REAL (14/09/2026): o fundo do "Caixa de texto
 * do sprite" (Kit essencial) ganhou como sombra o "cor + opacidade", que era do
 * segundo degrau. Era a única em toda a base — e ninguém teria percebido, porque
 * a sombra RENDERIZA normalmente estando ou não na paleta.
 */

const ORDEM = new Map<string, number>(BLOCK_LEVELS.map((nivel, i) => [nivel, i]))
const degrau = (tipo: string) => ORDEM.get(resolveBlockLevel(tipo)) ?? Number.MAX_SAFE_INTEGER

interface NoDaToolbox {
  type?: string
  contents?: NoDaToolbox[]
  inputs?: Record<string, { shadow?: { type?: string } }>
}

/** Todo par (bloco, sombra) que a paleta oferece. */
function paresDeSombra(raiz: NoDaToolbox): Array<[string, string, string]> {
  const pares: Array<[string, string, string]> = []
  const anda = (no: NoDaToolbox) => {
    if (no.type && no.inputs) {
      for (const [slot, valor] of Object.entries(no.inputs)) {
        const sombra = valor?.shadow?.type
        if (sombra) pares.push([no.type, slot, sombra])
      }
    }
    for (const filho of no.contents ?? []) anda(filho)
  }
  anda(raiz)
  return pares
}

const CATALOGOS: Array<[string, NoDaToolbox]> = [
  ['Jogo 2D', gameTwoDToolboxCategory as NoDaToolbox],
  ['Jogo 2D Avançado', gameKitToolboxCategory as NoDaToolbox],
  ['Jogo 3D', gameThreeDToolboxCategory as NoDaToolbox],
  ['Jogo 3D Avançado', gameKit3DToolboxCategory as NoDaToolbox],
  ['Mundo 3D', world3DToolboxCategory as NoDaToolbox],
]

describe('drift: sombra de fábrica nunca é de um degrau acima do bloco', () => {
  for (const [nome, catalogo] of CATALOGOS) {
    it(`${nome}: toda sombra cabe no degrau de quem a mostra`, () => {
      const pares = paresDeSombra(catalogo)
      // Anti-vácuo: uma varredura que não encontra sombra nenhuma passaria sempre.
      expect(pares.length).toBeGreaterThan(10)
      const acima = pares
        .filter(([bloco, , sombra]) => degrau(sombra) > degrau(bloco))
        .map(
          ([bloco, slot, sombra]) =>
            `${bloco}.${slot} → ${sombra} (${resolveBlockLevel(bloco)} × ${resolveBlockLevel(sombra)})`,
        )
      expect(acima).toEqual([])
    })
  }

  it('a regra MORDE: um degrau acima é reprovado', () => {
    // Reproduz a violação real de 14/09 sem depender de ela existir no catálogo.
    const falso: NoDaToolbox = {
      contents: [
        {
          type: 'sz_g2d_set_text_box', // iniciante-2d
          inputs: { BACKGROUND: { shadow: { type: 'sz_t3d_set_color' } } }, // avancado-3d
        },
      ],
    }
    const acima = paresDeSombra(falso).filter(([bloco, , sombra]) => degrau(sombra) > degrau(bloco))
    expect(acima).toHaveLength(1)
  })
})
