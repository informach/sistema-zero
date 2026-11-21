import { beforeAll, describe, expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import { ensureBlocklyInitialized } from '../setup'
import {
  blockOwnText,
  blocksInProgramOrder,
  normalizeSearchText,
  searchWorkspaceBlocks,
} from '../workspaceSearch'

beforeAll(() => {
  ensureBlocklyInitialized()
})

const raw = (id: string, code: string) => ({ type: 'sz_adv_raw_js', id, fields: { CODE: code } })

function chained(blocks: Record<string, unknown>[]) {
  const [first, ...rest] = blocks.map((block) => ({ ...block }))
  let cursor = first as Record<string, unknown>
  for (const block of rest) {
    cursor.next = { block }
    cursor = block
  }
  return first as Record<string, unknown>
}

function workspaceWith(blocks: Record<string, unknown>[]) {
  const workspace = new Blockly.Workspace()
  Blockly.serialization.workspaces.load({ blocks: { languageVersion: 0, blocks } }, workspace)
  return workspace
}

describe('normalizeSearchText', () => {
  test('sem acento, minúsculas e espaços simples', () => {
    expect(normalizeSearchText('  Ação   RÁPIDA ')).toBe('acao rapida')
  })
})

describe('procurar no programa', () => {
  test('acha pelo texto do bloco, com todas as palavras, na ordem do programa', () => {
    const workspace = workspaceWith([
      {
        ...chained([
          raw('a', 'pontos = 0'),
          raw('b', 'vidas = 3'),
          raw('c', 'pontos = pontos + 1'),
        ]),
        x: 0,
        y: 0,
      },
      { ...raw('d', 'pontos extra'), x: 0, y: 500 },
    ])
    try {
      expect(blocksInProgramOrder(workspace).map((block) => block.id)).toEqual(['a', 'b', 'c', 'd'])
      const result = searchWorkspaceBlocks(workspace, 'PONTOS')
      expect(result.total).toBe(3)
      expect(result.hits.map((hit) => hit.id)).toEqual(['a', 'c', 'd'])
      expect(searchWorkspaceBlocks(workspace, 'pontos + 1').hits.map((hit) => hit.id)).toEqual([
        'c',
      ])
      expect(searchWorkspaceBlocks(workspace, 'nada disso').total).toBe(0)
      expect(searchWorkspaceBlocks(workspace, '   ').total).toBe(0)
      expect(blockOwnText(workspace.getBlockById('b') as Blockly.Block)).toContain('vidas = 3')
    } finally {
      workspace.dispose()
    }
  })

  // Proposta aprovada em 21/11/2026: o resultado mostra a LINHA do próprio bloco. Antes, um "Se"
  // com "senão se" e "senão" aparecia como "Se então senão se então senão ... remover o último",
  // e "mover" o achava pelo rótulo do botão de menos ("remover o último").
  test('o resultado é a linha do próprio bloco, com o que está encaixado nela', () => {
    const workspace = workspaceWith([
      {
        type: 'sz_js_if_else',
        id: 'se',
        x: 0,
        y: 0,
        extraState: { elseIf: 1, hasElse: true },
        inputs: {
          COND: { block: { type: 'sz_val_variable', id: 'cond', fields: { NAME: 'temChave' } } },
          THEN: { block: raw('dentro', 'abrir a porta') },
          ELSE: { block: raw('senao', 'mover o barco') },
        },
      },
    ])
    try {
      const se = workspace.getBlockById('se') as Blockly.Block
      expect(blockOwnText(se)).toBe('Se valor da variável temChave então')
      // "mover" acha só o bloco que move, não o "Se" pelo botão "remover o último".
      expect(searchWorkspaceBlocks(workspace, 'mover').hits.map((hit) => hit.id)).toEqual(['senao'])
      expect(searchWorkspaceBlocks(workspace, 'senão').total).toBe(0)
      expect(searchWorkspaceBlocks(workspace, 'temChave').hits.map((hit) => hit.id)).toEqual([
        'se',
        'cond',
      ])
    } finally {
      workspace.dispose()
    }
  })

  // Full review final (21/11/2026): o botão + da classe ("herdar de outra classe") fica na linha
  // de cima, antes do corpo. Num bloco travado o isClickable() do Blockly é falso, e o rótulo do
  // botão voltava à linha e à busca.
  test('o rótulo de um botão de imagem fica de fora também num bloco travado', () => {
    const workspace = workspaceWith([
      { type: 'sz_js_class', id: 'classe', x: 0, y: 0, fields: { NAME: 'Heroi' } },
    ])
    try {
      const classe = workspace.getBlockById('classe') as Blockly.Block
      expect(blockOwnText(classe)).toBe('Classe Heroi')
      classe.setEditable(false)
      expect(blockOwnText(classe)).toBe('Classe Heroi')
      expect(searchWorkspaceBlocks(workspace, 'herdar').total).toBe(0)
    } finally {
      workspace.dispose()
    }
  })

  test('o limite corta a lista mas conta todos', () => {
    const workspace = workspaceWith([
      chained(Array.from({ length: 50 }, (_, index) => raw(`r${index}`, `repete ${index}`))),
    ])
    try {
      const result = searchWorkspaceBlocks(workspace, 'repete', 10)
      expect(result.hits).toHaveLength(10)
      expect(result.total).toBe(50)
    } finally {
      workspace.dispose()
    }
  })

  test('percorre uma sequência longa sem recursão e na ordem', () => {
    const blocks = Array.from({ length: 1500 }, (_, index) => raw(`s${index}`, `passo ${index}`))
    const workspace = workspaceWith([chained(blocks)])
    try {
      const ordered = blocksInProgramOrder(workspace)
      expect(ordered).toHaveLength(1500)
      expect(ordered.at(-1)?.id).toBe('s1499')
      expect(searchWorkspaceBlocks(workspace, 'passo 1499').hits.map((hit) => hit.id)).toEqual([
        's1499',
      ])
    } finally {
      workspace.dispose()
    }
    // Carregar e descartar uma cadeia longa no Blockly sem tela é lento; a busca não é.
  }, 60_000)
})
