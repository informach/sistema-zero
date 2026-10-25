/** Small 16×16 icons: one per ability (attack menu) and one per option of the main menu. */
import { type Color, Px } from '../../pixel'
import { Painter, type Ramp } from './kit'
import { flame, leafMask, starPoints } from './parts'

const ICON = 16
const WATER: Ramp = ['#173f86', '#2a78d0', '#4ab2f0', '#a2e2ff', '#ffffff']
const LEAF: Ramp = ['#14501e', '#2f9a3a', '#5ac84a', '#9ae66a', '#e2ffb0']

function icon(paint: (px: Px, P: Painter) => void, ink: Color): Px {
  const px = new Px(ICON, ICON)
  paint(px, new Painter(px, 0, 0, ICON / 100, false))
  return px.outline(ink)
}

const scratch = () =>
  icon((px) => {
    for (let i = 0; i < 3; i++) {
      px.line(7 + i * 3, 2, 2 + i * 3, 13, '#ffb238')
      px.line(8 + i * 3, 2, 3 + i * 3, 13, '#fff4b0')
    }
  }, '#7a3a08')

const spark = () => icon((_, P) => flame(P, 50, 80, 26, 4, 2.6), '#5a1408')

const nuke = () =>
  icon((px) => {
    px.polygon(starPoints(7.5, 7.5, 7.4, 8, 0.6), '#f27a24')
    px.polygon(starPoints(7.5, 7.5, 5, 8, 0.6, 0), '#ffd84a')
    px.circle(7.5, 7.5, 2, '#fff4b0')
  }, '#5a1408')

const splash = () =>
  icon((px, P) => {
    const m = P.mask().ellipse(50, 66, 28, 28)
    m.poly([
      [50, 6],
      [24, 58],
      [76, 58],
    ])
    P.fill(m, WATER, { seam: false, reach: 2 })
    px.set(6, 9, '#ffffff').set(6, 10, '#ffffff')
  }, '#0e2a5a')

const shards = () =>
  icon((px) => {
    px.polygon(
      [
        [9, 1],
        [14, 8],
        [9, 15],
        [4, 8],
      ],
      '#8ad8f8',
    )
    px.polygon(
      [
        [9, 1],
        [9, 15],
        [4, 8],
      ],
      '#d8f6ff',
    )
    px.polygon(
      [
        [4, 5],
        [6, 9],
        [3, 14],
        [1, 9],
      ],
      '#4a9ad8',
    )
    px.line(9, 3, 9, 13, '#ffffff')
  }, '#123060')

const spiral = () =>
  icon((_, P) => {
    P.fill(leafMask(P, 16, 86, 86, 14, 22, 4), LEAF, { seam: false, reach: 2 })
    P.stroke(
      [
        [20, 82],
        [50, 52],
        [78, 22],
      ],
      6,
      LEAF[1]!,
    )
  }, '#14401a')

const attack = () =>
  icon((px) => {
    px.line(4, 11, 13, 2, '#dfe6ee', 2)
    px.line(5, 11, 13, 3, '#ffffff')
    px.line(2, 9, 6, 13, '#a8743a', 2)
    px.line(1, 14, 3, 12, '#6a4422', 2)
  }, '#1d1428')

const heal = () =>
  icon((px) => {
    px.circle(5, 6, 3.6, '#f0587a').circle(10.5, 6, 3.6, '#f0587a')
    px.polygon(
      [
        [1.5, 7],
        [14, 7],
        [7.75, 14],
      ],
      '#f0587a',
    )
    px.rect(7, 4, 2, 6, '#ffffff').rect(5, 6, 6, 2, '#ffffff')
    px.set(3, 4, '#ffb0c4')
  }, '#4a1022')

const swap = () =>
  icon((px) => {
    px.rect(2, 4, 9, 2, '#4ab2f0').polygon(
      [
        [10, 1],
        [15, 5],
        [10, 9],
      ],
      '#4ab2f0',
    )
    px.rect(5, 10, 9, 2, '#f0a03a').polygon(
      [
        [6, 7],
        [1, 11],
        [6, 15],
      ],
      '#f0a03a',
    )
  }, '#1d1428')

const leave = () =>
  icon((px) => {
    px.rect(1, 1, 8, 14, '#a8743a').rect(3, 3, 4, 12, '#2a1c30')
    px.rect(6, 7, 6, 2, '#9ae66a').polygon(
      [
        [11, 4],
        [15, 8],
        [11, 12],
      ],
      '#9ae66a',
    )
  }, '#1d1428')

/** In the order of ABILITIES_DATA. */
export const ABILITY_ICONS = [scratch, spark, nuke, splash, shards, spiral]
/** In the order of the main menu: attack, heal, switch, escape. */
export const MENU_ICONS = [attack, heal, swap, leave]
export const ICON_PX = ICON
