import { describe, expect, test } from 'bun:test'
import {
  type DrawerSnapshot,
  diffDrawerSnapshots,
  isDrawerSnapshotList,
  parseToolsSnapshot,
  type ToolsGain,
  toolsGainFamily,
  toolsGainHeadline,
  toolsGainInline,
  toolsGainSubline,
  toolsSnapshot,
} from '../src/lib/tools-gain'

/** Atalho: uma gaveta com a identidade completa (caminho, família, rótulo). */
function gaveta(family: string, label: string, blockIds: string[]): DrawerSnapshot {
  return { key: `${family} › ${label}`, family, label, blockIds }
}

/** Atalho para montar um `ToolsGain` sem repetir a identidade em todo teste. */
function ref(label: string, family = 'Jogo 2D') {
  return { key: `${family} › ${label}`, family, label }
}

const sprites = [gaveta('Jogo 2D', '🎮 Sprites', ['sprite:draw', 'sprite:move'])]

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

describe('isDrawerSnapshotList', () => {
  test('aceita a resposta com a identidade completa', () => {
    expect(isDrawerSnapshotList(sprites)).toBe(true)
  })

  test('recusa o formato ANTIGO (só `name`) e campos faltando', () => {
    // Aba velha × servidor novo: a validação falha e o watcher simplesmente não comemora.
    expect(isDrawerSnapshotList([{ name: '🎮 Sprites', blockIds: ['a'] }])).toBe(false)
    expect(isDrawerSnapshotList([{ key: 'k', family: 'f', blockIds: ['a'] }])).toBe(false)
    expect(isDrawerSnapshotList('nada disso')).toBe(false)
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
          gaveta('Jogo 2D', '🎮 Sprites', ['sprite:draw']),
          gaveta('Jogo 2D', '💥 Colisões', ['collision:touch', 'collision:bounce']),
        ],
      ),
    ).toEqual({ novas: [ref('💥 Colisões')], cresceram: [] })
  })

  test('gaveta que cresceu conta somente ids realmente novos', () => {
    expect(
      diffDrawerSnapshots(
        ['sprite:draw'],
        [gaveta('Jogo 2D', '🎮 Sprites', ['sprite:draw', 'sprite:move', 'sprite:hide'])],
      ),
    ).toEqual({ novas: [], cresceram: [{ ...ref('🎮 Sprites'), added: 2 }] })
  })

  test('gaveta nova e crescimento podem chegar juntos', () => {
    expect(
      diffDrawerSnapshots(
        ['sprite:draw'],
        [
          gaveta('Jogo 2D', '🎮 Sprites', ['sprite:draw', 'sprite:move']),
          gaveta('Jogo 2D', '🗺️ Mapas', ['map:create']),
        ],
      ),
    ).toEqual({
      novas: [ref('🗺️ Mapas')],
      cresceram: [{ ...ref('🎮 Sprites'), added: 1 }],
    })
  })

  test('renomear uma gaveta sem mudar seus blocos NÃO é uma conquista', () => {
    expect(
      diffDrawerSnapshots(
        ['sprite:draw', 'sprite:move'],
        [gaveta('Jogo 2D', '🎮 Personagens', ['sprite:draw', 'sprite:move'])],
      ),
    ).toBeNull()
  })

  /**
   * 🚨 A regressão do dia em que a gaveta passou a ser chaveada pelo caminho INTEIRO.
   *
   * Uma gaveta homônima que se PARTE em duas (o `📋 Listas` do HTML separado do da
   * Programação) leva ids que já estão no snapshot anterior — então as duas saem com
   * `added === 0` e ninguém ganha festa por uma mudança de agrupamento. É o que dispensou
   * migração do `localStorage`.
   */
  test('gaveta que se PARTE em duas não gera festa falsa', () => {
    expect(
      diffDrawerSnapshots(
        ['lista:html', 'lista:js'],
        [
          gaveta('HTML', '📋 Listas', ['lista:html']),
          gaveta('Programação', '📋 Listas', ['lista:js']),
        ],
      ),
    ).toBeNull()
  })

  test('remoção ou lista vazia não vira conquista', () => {
    expect(diffDrawerSnapshots(['sprite:draw', 'sprite:move'], [sprites[0]!])).toBeNull()
    expect(diffDrawerSnapshots(['sprite:draw'], [])).toBeNull()
  })
})

describe('toolsGainHeadline', () => {
  test('UMA gaveta nova é nomeada', () => {
    expect(toolsGainHeadline({ novas: [ref('💥 Colisões')], cresceram: [] })).toBe(
      'Você ganhou 💥 Colisões!',
    )
  })

  test('a partir de duas, CONTA em vez de enumerar', () => {
    expect(toolsGainHeadline({ novas: [ref('🗺️ Mapas'), ref('❤️ Vida')], cresceram: [] })).toBe(
      'Você ganhou 2 ferramentas novas!',
    )
  })

  test('só crescimento, singular e plural', () => {
    expect(toolsGainHeadline({ novas: [], cresceram: [{ ...ref('❤️ Vida'), added: 1 }] })).toBe(
      '❤️ Vida ficou maior!',
    )
    expect(
      toolsGainHeadline({
        novas: [],
        cresceram: [
          { ...ref('A'), added: 2 },
          { ...ref('B'), added: 3 },
        ],
      }),
    ).toBe('2 ferramentas ficaram maiores!')
  })

  test('com nova + crescimento o título fala das NOVAS e o resto vira sublinha', () => {
    const gain: ToolsGain = {
      novas: [ref('🗺️ Mapas')],
      cresceram: [{ ...ref('❤️ Vida'), added: 2 }],
    }
    expect(toolsGainHeadline(gain)).toBe('Você ganhou 🗺️ Mapas!')
    expect(toolsGainSubline(gain)).toBe('E outra ficou maior.')
  })

  /**
   * 🚨 O DEFEITO que a usuária relatou: o título enumerava todas as gavetas e, em `text-2xl`,
   * empurrava o cartão para fora da tela. Ele não pode crescer com o tamanho do ganho.
   */
  test('🚨 o título NÃO cresce com o ganho', () => {
    const muitas = Array.from({ length: 12 }, (_, i) => ref(`Gaveta número ${i}`))
    const headline = toolsGainHeadline({ novas: muitas, cresceram: [] })
    expect(headline).toBe('Você ganhou 12 ferramentas novas!')
    expect(headline).not.toContain('Gaveta número')
    expect(headline.length).toBeLessThan(60)
  })
})

describe('toolsGainSubline', () => {
  test('só existe quando há novas E crescimento', () => {
    expect(toolsGainSubline({ novas: [ref('A')], cresceram: [] })).toBeNull()
    expect(toolsGainSubline({ novas: [], cresceram: [{ ...ref('A'), added: 1 }] })).toBeNull()
    expect(
      toolsGainSubline({
        novas: [ref('A')],
        cresceram: [
          { ...ref('B'), added: 1 },
          { ...ref('C'), added: 1 },
        ],
      }),
    ).toBe('E outras 2 ficaram maiores.')
  })
})

describe('toolsGainFamily', () => {
  test('devolve a família quando TODAS as gavetas vieram dela', () => {
    expect(toolsGainFamily({ novas: [ref('A'), ref('B')], cresceram: [] })).toBe('Jogo 2D')
  })

  test('com mistura devolve null (a linha some em vez de mentir)', () => {
    expect(toolsGainFamily({ novas: [ref('A'), ref('B', 'Jogo 3D')], cresceram: [] })).toBeNull()
  })

  test('olha também as que cresceram', () => {
    expect(
      toolsGainFamily({
        novas: [ref('A')],
        cresceram: [{ ...ref('B', 'Programação'), added: 1 }],
      }),
    ).toBeNull()
  })
})

describe('toolsGainInline', () => {
  test('encaixa numa frase maior sem enumerar', () => {
    expect(toolsGainInline({ novas: [ref('💥 Colisões')], cresceram: [] })).toBe('💥 Colisões')
    expect(toolsGainInline({ novas: [ref('A'), ref('B'), ref('C')], cresceram: [] })).toBe(
      '3 ferramentas novas',
    )
    expect(toolsGainInline({ novas: [], cresceram: [{ ...ref('❤️ Vida'), added: 3 }] })).toBe(
      '❤️ Vida',
    )
  })
})
