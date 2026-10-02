import { describe, expect, test } from 'bun:test'
import { CORE_BLOCKS } from '../../blockly/blocks'
import { gameTwoDBlocks } from '../game-2d/blocks'
import { gameKitBlocks } from '../game-2d-advanced/blocks'
import { sceneDocumentation } from './docs'

// Bold words that name an area, a palette group or an example, not a block.
const NOT_BLOCKS = new Set(['Ao iniciar', 'Eventos', 'Animação'])
const isExample = (name: string) => name.startsWith('Descida da Neve (')

const FACES = [...CORE_BLOCKS, ...gameTwoDBlocks, ...gameKitBlocks]
  .map((block) => (block as { message0?: unknown }).message0)
  .filter((message): message is string => typeof message === 'string')
  .map((message) => message.replace(/%\d+/g, '…').replace(/\s+/g, ' ').trim())

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** "…" in a citation stands for a socket: the rest has to be the start of a real face. */
const isRealFace = (citation: string) => {
  const pattern = new RegExp(`^${citation.split('…').map(escapeRegex).join('.*')}`)
  return FACES.some((face) => pattern.test(face))
}
const citations = (text: string) =>
  [...text.matchAll(/\*\*([^*]+)\*\*/g)].map((match) => match[1]!.replace(/\s+/g, ' ').trim())

describe('o manual da cena cita blocos que existem', () => {
  for (const api of ['SZGame2D', 'SZGameKit'] as const) {
    test(`${api}: todo nome em negrito é a cara de um bloco real`, () => {
      const cited = citations(sceneDocumentation(api, true)).filter(
        (name) => !NOT_BLOCKS.has(name) && !isExample(name),
      )
      // Anti-vácuo: o manual cita dezenas de blocos; zero aqui seria uma regex quebrada.
      expect(cited.length).toBeGreaterThan(20)
      expect(cited.filter((name) => !isRealFace(name))).toEqual([])
    })
  }

  test('a régua morde um nome inventado', () => {
    expect(isRealFace('Definir vidas')).toBe(false)
    expect(isRealFace('Dar … vidas a …')).toBe(true)
  })
})
