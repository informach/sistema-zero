import { describe, expect, test } from 'bun:test'
import {
  diffDrawerSnapshots,
  joinDrawerNames,
  parseToolsSnapshot,
  toolsGainHeadline,
  toolsSnapshot,
} from '../src/lib/tools-gain'

const sprites = [{ name: '🎮 Sprites', blockIds: ['sprite:draw', 'sprite:move'] }]

describe('snapshot de ferramentas', () => {
  test('ausente, quebrado e versão antiga viram primeira visita', () => {
    expect(parseToolsSnapshot(null)).toBeNull()
    expect(parseToolsSnapshot('{quebrado')).toBeNull()
    expect(parseToolsSnapshot('{"🎮 Sprites":2}')).toBeNull()
    expect(parseToolsSnapshot('{"version":1,"revision":"r1","blockIds":[]}')).toBeNull()
  })

  test('valida, deduplica e ordena ids da versão atual', () => {
    expect(
      parseToolsSnapshot(JSON.stringify({ version: 2, revision: 'r1', blockIds: ['b', 'a', 'b'] })),
    ).toEqual({ version: 2, revision: 'r1', blockIds: ['a', 'b'] })
    expect(
      parseToolsSnapshot(JSON.stringify({ version: 2, revision: 'r1', blockIds: ['ok', 3] })),
    ).toBeNull()
  })

  test('monta snapshot atômico com revisão + ids', () => {
    expect(toolsSnapshot('r1', sprites)).toEqual({
      version: 2,
      revision: 'r1',
      blockIds: ['sprite:draw', 'sprite:move'],
    })
  })
})

describe('diffDrawerSnapshots', () => {
  test('nada mudou → null', () => {
    expect(diffDrawerSnapshots(['sprite:draw', 'sprite:move'], sprites)).toBeNull()
  })

  test('gaveta nova', () => {
    expect(
      diffDrawerSnapshots(
        ['sprite:draw'],
        [
          { name: '🎮 Sprites', blockIds: ['sprite:draw'] },
          { name: '💥 Colisões', blockIds: ['collision:touch', 'collision:bounce'] },
        ],
      ),
    ).toEqual({ novas: ['💥 Colisões'], cresceram: [] })
  })

  test('gaveta que cresceu conta somente ids realmente novos', () => {
    expect(
      diffDrawerSnapshots(
        ['sprite:draw'],
        [{ name: '🎮 Sprites', blockIds: ['sprite:draw', 'sprite:move', 'sprite:hide'] }],
      ),
    ).toEqual({ novas: [], cresceram: [{ name: '🎮 Sprites', added: 2 }] })
  })

  test('gaveta nova e crescimento podem chegar juntos', () => {
    expect(
      diffDrawerSnapshots(
        ['sprite:draw'],
        [
          { name: '🎮 Sprites', blockIds: ['sprite:draw', 'sprite:move'] },
          { name: '🗺️ Mapas', blockIds: ['map:create'] },
        ],
      ),
    ).toEqual({
      novas: ['🗺️ Mapas'],
      cresceram: [{ name: '🎮 Sprites', added: 1 }],
    })
  })

  test('renomear uma gaveta sem mudar seus blocos NÃO é uma conquista', () => {
    expect(
      diffDrawerSnapshots(
        ['sprite:draw', 'sprite:move'],
        [{ name: '🎮 Personagens', blockIds: ['sprite:draw', 'sprite:move'] }],
      ),
    ).toBeNull()
  })

  test('remoção ou lista vazia não vira conquista', () => {
    expect(diffDrawerSnapshots(['sprite:draw', 'sprite:move'], [sprites[0]!])).toBeNull()
    expect(diffDrawerSnapshots(['sprite:draw'], [])).toBeNull()
  })
})

describe('toolsGainHeadline', () => {
  test('uma gaveta nova', () => {
    expect(toolsGainHeadline({ novas: ['💥 Colisões'], cresceram: [] })).toBe(
      'Você ganhou a gaveta 💥 Colisões!',
    )
  })

  test('várias gavetas novas', () => {
    expect(toolsGainHeadline({ novas: ['🗺️ Mapas', '❤️ Vida'], cresceram: [] })).toBe(
      'Você ganhou as gavetas 🗺️ Mapas e ❤️ Vida!',
    )
  })

  test('crescimento usa singular e plural', () => {
    expect(toolsGainHeadline({ novas: [], cresceram: [{ name: 'A', added: 1 }] })).toBe(
      'A ganhou 1 bloco novo!',
    )
    expect(
      toolsGainHeadline({
        novas: [],
        cresceram: [
          { name: 'A', added: 2 },
          { name: 'B', added: 3 },
        ],
      }),
    ).toBe('A e B ganharam 5 blocos novos!')
  })

  test('nova + crescimento numa frase', () => {
    expect(
      toolsGainHeadline({
        novas: ['🗺️ Mapas'],
        cresceram: [{ name: '❤️ Vida', added: 2 }],
      }),
    ).toBe('Você ganhou 🗺️ Mapas, e ❤️ Vida ganhou 2 blocos novos!')
  })
})

describe('joinDrawerNames', () => {
  test('lista vazia, uma, duas e três', () => {
    expect(joinDrawerNames([])).toBe('')
    expect(joinDrawerNames(['A'])).toBe('A')
    expect(joinDrawerNames(['A', 'B'])).toBe('A e B')
    expect(joinDrawerNames(['A', 'B', 'C'])).toBe('A, B e C')
  })
})
