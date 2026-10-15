import { describe, expect, test } from 'bun:test'
import type { PensaCapabilitySnapshot } from '@sistemazero/core/pensa'
import { SERVER_EXAMPLES_INDEX } from '@sistemazero/studio/server-examples'
import {
  builtGameExtension,
  gameExtensionIssues,
  guideIssues,
  type ProposalDraft,
  playFirstIssues,
  questionIssues,
  validateJourneyProposal,
} from '../src/server/pensa-journey/contracts'
import { journeyRecipes } from '../src/server/pensa-journey/recipes'

const caps: PensaCapabilitySnapshot = {
  profileId: 'child',
  rank: 'hacker',
  studio: true,
  pinta: true,
  molda: false,
  dimensions: ['2d'],
  blockIds: ['create', 'move', 'touch'],
  extensionIds: ['game-2d'],
  moldaTools: [],
  tutor: false,
  fingerprint: 'v1',
}
const mission = (key: string, dependencies: string[] = []): ProposalDraft['missions'][number] => ({
  key,
  dependencies,
  destination: 'studio',
  title: 'Mover o explorador',
  result: 'Ele anda com as setas',
  blockIds: ['create', 'move'],
  extensionIds: ['game-2d'],
  mechanicIds: ['game-2d'],
  toolIds: [],
  asset: null,
})
const validate = (missions: ProposalDraft['missions'], dimension: '2d' | '3d' = '2d') =>
  validateJourneyProposal({ missions, dimension }, caps, ['game-2d'])
/** O motivo cita a missão e o id: a régua é "algum motivo diz isto". */
const says = (issues: string[], ...parts: string[]) =>
  issues.some((issue) => parts.every((part) => issue.includes(part)))
describe('Pensa: o plano só usa recursos executáveis do perfil', () => {
  test('ter acesso a 3D não torna blocos 3D compatíveis com um plano 2D', () => {
    const unlocked = {
      ...caps,
      dimensions: ['2d', '3d'] as ('2d' | '3d')[],
      blockIds: ['cube'],
      extensionIds: ['game-3d'],
    }
    const missions = [
      {
        ...mission('cube'),
        blockIds: ['cube'],
        extensionIds: ['game-3d'],
        mechanicIds: ['game-3d'],
      },
    ]
    expect(
      says(
        validateJourneyProposal(
          { dimension: '2d', missions },
          unlocked,
          ['game-3d'],
          [],
          [],
          [{ type: 'cube', extension: 'game-3d', category: 'Jogo 3D' }],
        ),
        'Missão "cube"',
        'recurso 3D num jogo 2D',
        'cube',
      ),
    ).toBe(true)
    expect(
      validateJourneyProposal(
        { dimension: '3d', missions },
        unlocked,
        ['game-3d'],
        [],
        [],
        [{ type: 'cube', extension: 'game-3d', category: 'Jogo 3D' }],
      ),
    ).toEqual([])
  })
  test('um jogo de exploração sem vitória e sem tutor pode ter um começo viável', () =>
    expect(validate([mission('walk')])).toEqual([]))
  test('não aceita bloco bloqueado nem 3D só porque a criança pediu', () => {
    expect(
      says(
        validate([{ ...mission('walk'), blockIds: ['premium-flight'] }]),
        'Missão "walk"',
        'premium-flight',
      ),
    ).toBe(true)
    expect(says(validate([mission('walk')], '3d'), 'O Estúdio não está disponível', '3D')).toBe(
      true,
    )
  })
  test('arte precisa de integração posterior e recursos granulares do Molda', () => {
    const art = {
      ...mission('draw'),
      destination: 'pinta' as const,
      blockIds: [],
      asset: {
        id: 'hero',
        kind: 'sprite' as const,
        source: 'new' as const,
        creationId: null,
        description: 'Um gato espacial',
      },
    }
    expect(says(validate([art, mission('walk')]), 'Missão "draw"', 'não entra no jogo')).toBe(true)
    expect(validate([art, mission('walk', ['draw'])])).toEqual([])
    expect(
      says(
        validate([
          { ...art, destination: 'molda', toolIds: ['paint.layers'] },
          mission('walk', ['draw']),
        ]),
        'Missão "draw"',
        'paint.layers',
      ),
    ).toBe(true)
  })
  test('não aceita criação existente inventada nem dependência futura/circular', () => {
    expect(
      says(
        validate([
          {
            ...mission('a'),
            asset: {
              id: 'a',
              kind: 'sprite',
              source: 'existing',
              creationId: 'another-child',
              description: 'gato',
            },
          },
        ]),
        'Missão "a"',
        'another-child',
        'não está no inventário',
      ),
    ).toBe(true)
    expect(
      says(validate([mission('a', ['b']), mission('b', ['a'])]), 'Missão "a"', 'depende de b'),
    ).toBe(true)
  })
  test('não confunde o tipo de uma arte existente nem omite a extensão do bloco', () => {
    const art = {
      id: 'a',
      kind: 'sprite' as const,
      source: 'existing' as const,
      creationId: 'mine',
      description: 'gato',
    }
    const issues = validateJourneyProposal(
      { dimension: '2d', missions: [{ ...mission('a'), extensionIds: [], asset: art }] },
      caps,
      ['game-2d'],
      ['mine'],
      [{ id: 'mine', kind: 'background' }],
      [{ type: 'move', extension: 'game-2d' }],
    )
    expect(says(issues, 'Missão "a"', 'mine é background, não sprite')).toBe(true)
    expect(says(issues, 'Missão "a"', 'move', 'game-2d', 'extensionIds')).toBe(true)
  })
  test('receitas internas só entram quando todos os blocos e extensões estão liberados', () => {
    const entry = SERVER_EXAMPLES_INDEX[0]!
    const allowed = { ...caps, blockIds: [...entry.blockTypes], extensionIds: [...entry.requires] }
    const recipes = journeyRecipes(entry.description, allowed)
    expect(recipes.length).toBeGreaterThan(0)
    expect(
      recipes.every((recipe) => recipe.blocos.every((id) => allowed.blockIds.includes(id))),
    ).toBe(true)
    expect(journeyRecipes('jogo', { ...allowed, blockIds: [] })).toEqual([])
  })
})

describe('a pergunta do Zappy e o jogo que começa jogando', () => {
  const ask = (about: 'action' | 'dimension', labels = ['Voa', 'Pega ovos']) => ({
    about,
    text: 'O que o seu dragão faz?',
    options: labels.map((label) => ({ label, description: 'Muda o jogo.' })),
    workingTitle: null,
  })

  test('pergunta boa passa; teto esgotado, 2D/3D sem escolha e respostas repetidas não', () => {
    expect(questionIssues(ask('action'), caps, 2)).toEqual([])
    expect(questionIssues(ask('action'), caps, 0)[0]).toContain('perguntas que cabiam')
    expect(questionIssues(ask('dimension'), caps, 2)[0]).toContain('2D ou 3D não é escolha')
    expect(questionIssues(ask('dimension'), { dimensions: ['2d', '3d'] }, 2)).toEqual([])
    expect(questionIssues(ask('action', ['Voa', ' voa ']), caps, 2)[0]).toContain('mesmo rótulo')
  })

  test('jogo novo começa no Estúdio; com jogo construído a arte pode vir antes', () => {
    const art = { ...mission('arte'), destination: 'pinta' as const }
    expect(playFirstIssues({ missions: [mission('anda')] }, false)).toEqual([])
    expect(playFirstIssues({ missions: [art, mission('anda', ['arte'])] }, false)[0]).toContain(
      'Missão "arte"',
    )
    expect(playFirstIssues({ missions: [art, mission('anda', ['arte'])] }, true)).toEqual([])
  })
})

describe('uma extensão de jogo por projeto (15/10/2026)', () => {
  const kit = { ...mission('kit'), extensionIds: ['game-2d-advanced'], mechanicIds: [] }
  test('duas extensões de jogo nas missões do Estúdio voltam com o motivo', () => {
    expect(gameExtensionIssues({ missions: [mission('anda')] }, null)).toEqual([])
    expect(gameExtensionIssues({ missions: [mission('anda'), kit] }, null)[0]).toContain(
      'game-2d e game-2d-advanced',
    )
    // O MANUAL de outra extensão de jogo também conta: o guia falaria dos blocos dela.
    const manual = { ...mission('anda'), mechanicIds: ['game-3d'] }
    expect(gameExtensionIssues({ missions: [manual] }, null)[0]).toContain('UMA extensão')
    // Missão de arte não instala nada no jogo.
    const art = { ...mission('arte'), destination: 'pinta' as const, extensionIds: ['game-3d'] }
    expect(gameExtensionIssues({ missions: [mission('anda'), art] }, null)).toEqual([])
  })

  test('jogo já construído: a versão nova fica na extensão dele', () => {
    expect(builtGameExtension({ missions: [mission('anda')] })).toBe('game-2d')
    // Plano antigo que misturava: o guia instalou só a primeira, e é ela que o jogo tem.
    expect(builtGameExtension({ missions: [mission('anda'), kit] })).toBe('game-2d')
    expect(builtGameExtension({ missions: [kit, mission('anda')] })).toBe('game-2d-advanced')
    expect(builtGameExtension(null)).toBeNull()
    expect(gameExtensionIssues({ missions: [mission('anda')] }, 'game-2d')).toEqual([])
    expect(gameExtensionIssues({ missions: [kit] }, 'game-2d')[0]).toContain(
      'O jogo já usa a extensão Jogo 2D',
    )
  })
})

describe('o passo do guia é um gesto, não "vá para a área" (15/10/2026)', () => {
  const guide = (...actions: string[]) => ({
    missions: [
      {
        key: 'palco',
        steps: actions.map((action) => ({ action, effect: 'Isso prepara o jogo.' })),
        testAction: 'Aperte ▶ Reproduzir',
        expected: 'O palco aparece',
      },
    ],
  })
  test('os vagos voltam com o conserto e citam missão e passo', () => {
    const issues = guideIssues(
      guide(
        'Abrir o Estúdio e ir para a área ⚙️ Ao iniciar.',
        'Vá na área ⚡ Quando acontecer.',
        'Implemente o pulo.',
      ),
    )
    expect(issues.some((i) => i.includes('passo 1') && i.includes('as áreas são blocos'))).toBe(
      true,
    )
    expect(issues.some((i) => i.includes('passo 1') && i.includes('tire o passo de abrir'))).toBe(
      true,
    )
    expect(issues.some((i) => i.includes('passo 2') && i.includes('as áreas são blocos'))).toBe(
      true,
    )
    expect(issues.some((i) => i.includes('passo 3') && i.includes('implementar'))).toBe(true)
  })
  test('"vá para o Estúdio" só conta nas missões do Estúdio', () => {
    const pinta = guide('Toque no foguete "Usar no Estúdio" e vá para o Estúdio.')
    expect(guideIssues(pinta, new Set())).toEqual([])
    expect(guideIssues(pinta, new Set(['palco']))[0]).toContain('tire o passo de abrir')
  })
  test('"entre a área X e a área Y" é lugar, não o passo vago; "entre na área" é', () => {
    expect(
      guideIssues(guide('Encaixe o bloco entre a área ⚙️ Ao iniciar e a área ⚡ Quando acontecer.')),
    ).toEqual([])
    expect(guideIssues(guide('Entre na área ⚙️ Ao iniciar.'))[0]).toContain('as áreas são blocos')
  })
  test('"volte para a área" só conta no Estúdio (no Pinta é o papel de desenho)', () => {
    const pinta = guide('Volte para a área de desenho e pinte as asas.')
    expect(guideIssues(pinta, new Set())).toEqual([])
    expect(guideIssues(pinta, new Set(['palco']))[0]).toContain('as áreas são blocos')
  })
  test('o gesto preciso passa, inclusive "arraste para o espaço de montar" e "Usar no Estúdio"', () => {
    expect(
      guideIssues(
        guide(
          'Clique em "🗂️ Áreas do projeto", pegue o bloco "⚙️ Ao iniciar" e arraste para o espaço de montar.',
          'Clique em "Jogo 2D" e em "Sprites", pegue o bloco "Criar sprite" e encaixe dentro do "⚙️ Ao iniciar".',
          'Aperte o foguete "Usar no Estúdio".',
          'Clique no botão ⋯ (Mais opções), no alto do Estúdio, e escolha "Imagens".',
        ),
      ),
    ).toEqual([])
  })
})
