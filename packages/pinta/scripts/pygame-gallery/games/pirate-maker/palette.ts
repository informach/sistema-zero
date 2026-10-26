/**
 * Pirate Maker: one palette for the whole island, so any drawing that mixes things (the menu
 * icons, the editor previews) stays under Pinta's 63 colours. Light comes from the top-left.
 */
import type { Px } from '../../pixel'

export const P = {
  ink: '#2b1b24',
  // terrain: dark rock inside, sandstone border, tropical grass on top
  rock0: '#33212a',
  rock1: '#452d35',
  rock2: '#62403f',
  rock3: '#8a5e50',
  stone0: '#8c5a44',
  stone1: '#b57a52',
  stone2: '#dca770',
  grass0: '#245c3b',
  grass1: '#3b8a45',
  grass2: '#5fb84e',
  grass3: '#a6e36c',
  // water
  water0: '#3a76a0',
  water1: '#5aa3c4',
  water2: '#90d4de',
  foam: '#eefaf5',
  // shared light colours
  white: '#fbf3e4',
  // the pirate
  skin: '#f6c08f',
  skinDark: '#d98b62',
  red: '#d9443c',
  redDark: '#962c34',
  blue: '#3b6fb5',
  navy: '#27365e',
  brown: '#6e4026',
  boot: '#3f2722',
  hair: '#8a4b2a',
  // gold, silver, steel and the gem
  gold: '#f6c445',
  goldLight: '#fff0a0',
  goldDark: '#c4842a',
  steel: '#dfe7ef',
  steelDark: '#8f9cad',
  steelDeep: '#5b6475',
  gem0: '#2a78c8',
  gem1: '#5cc3f2',
  gem2: '#c5f2ff',
  // the chomper (Tooth)
  teal0: '#1d5560',
  teal1: '#2c8183',
  teal2: '#54b5a6',
  belly: '#aee3c4',
  mouth: '#6a1f33',
  // the clam (Shell) and its pearl
  coral0: '#a8443a',
  coral1: '#e0704f',
  coral2: '#f7a272',
  coral3: '#ffd3a8',
  pearl: '#e8dcf3',
  pearlDark: '#ab97c6',
  // palm trees
  trunk0: '#7a4428',
  trunk1: '#a8653a',
  trunk2: '#d08d55',
  // palm trees far away (faded towards the sky)
  far0: '#6e957c',
  far1: '#92b893',
  far2: '#bcd6aa',
  farTrunk0: '#ad8d77',
  farTrunk1: '#ccae90',
  farInk: '#7f6e72',
  // clouds
  cloud: '#fff8ea',
  cloudShade: '#ecdcc0',
  cloudEdge: '#d6bf9b',
} as const

/** Light from the top-left: pixels of `color` near the lit side become `light`, far ones `dark`. */
export function shade(
  px: Px,
  color: string,
  light: string | null,
  dark: string | null,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  lightAt = -0.55,
  darkAt = 0.4,
) {
  for (let y = 0; y < px.height; y++)
    for (let x = 0; x < px.width; x++) {
      if (px.get(x, y) !== color) continue
      const t = ((x + 0.5 - cx) / rx + (y + 0.5 - cy) / ry) / 2
      if (light && t < lightAt) px.set(x, y, light)
      else if (dark && t > darkAt) px.set(x, y, dark)
    }
  return px
}
