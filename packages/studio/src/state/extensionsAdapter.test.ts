import { afterAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { buildWorkspaceStateFromIR, unregisterBlocks } from '#blockly'
import { createEmptyProject } from '#core'
import type { SZIR } from '#ir'
import { findExtension } from '#official-extensions'
import {
  countExtensionBlocksInProject,
  installExtension,
  registerExtension,
  removeExtension,
  removeExtensionArtifacts,
} from './extensionsAdapter'
import type { ProjectStoreApi } from './projectStore'

/** Store falsa que só implementa o que o adapter chama (install/removeExtension). */
function fakeStore(): { api: ProjectStoreApi; removed: string[] } {
  const removed: string[] = []
  const api = {
    getState: () => ({
      installExtension: () => {},
      removeExtension: (id: string) => removed.push(id),
    }),
  } as unknown as ProjectStoreApi
  return { api, removed }
}

describe('extensionsAdapter', () => {
  it('impede instalar extensões que disputam o mesmo canvas', () => {
    const advanced = findExtension('game-2d-advanced')
    if (!advanced) throw new Error('extensão game-2d-advanced não encontrada')
    let installs = 0
    const api = {
      getState: () => ({
        project: {
          ...createEmptyProject('p1', 'Projeto'),
          installedExtensions: [{ id: 'game-2d', version: '0.1.0', installedAt: 1 }],
        },
        installExtension: () => {
          installs += 1
        },
      }),
    } as unknown as ProjectStoreApi

    expect(installExtension(advanced, api)).toEqual({ ok: false, conflictId: 'game-2d' })
    expect(installs).toBe(0)
  })

  it('remove blocos e nós IR da extensão game-2d', () => {
    const ir: SZIR = {
      html: [{ type: 'canvas', id: 'tela', width: 400, height: 300 }],
      css: [],
      js: [
        {
          type: 'g2d:createSprite',
          varName: 'jogador',
          x: 0,
          y: 0,
          w: 20,
          h: 20,
          color: '#22d3ee',
        },
        { type: 'consoleLog', value: { type: 'str', value: 'mantém' } },
      ],
      extensions: [{ extensionId: 'game-2d' }],
    }
    const project = {
      ...createEmptyProject('p1', 'Projeto'),
      ir,
      blocksState: buildWorkspaceStateFromIR(ir),
      installedExtensions: [{ id: 'game-2d', version: '0.1.0', installedAt: 1 }],
    }

    expect(countExtensionBlocksInProject(project, 'game-2d')).toBe(1)

    const cleaned = removeExtensionArtifacts(project, 'game-2d')
    expect(cleaned.ir?.extensions).toEqual([])
    expect(cleaned.ir?.js).toEqual([
      { type: 'consoleLog', value: { type: 'str', value: 'mantém' } },
    ])
    expect(
      countExtensionBlocksInProject({ ...project, blocksState: cleaned.blocksState }, 'game-2d'),
    ).toBe(0)
  })

  it('remove nós g2d ANINHADOS em laços/try/fetch, não só no topo (#18)', () => {
    const g2d = {
      type: 'g2d:createSprite',
      varName: 'inimigo',
      x: 0,
      y: 0,
      w: 10,
      h: 10,
      color: '#ff0000',
    } as const
    const keep = { type: 'consoleLog', value: { type: 'str', value: 'fica' } } as const
    const ir = {
      html: [],
      css: [],
      js: [
        {
          type: 'forRange',
          varName: 'i',
          from: { type: 'num', value: 0 },
          to: { type: 'num', value: 3 },
          step: { type: 'num', value: 1 },
          body: [g2d, keep],
        },
        { type: 'while', cond: { type: 'bool', value: true }, body: [g2d] },
        { type: 'tryCatch', body: [g2d], handler: [keep], finalizer: [g2d] },
        {
          type: 'fetchJson',
          url: { type: 'str', value: 'x' },
          okName: 'r',
          body: [g2d],
          catchBody: [keep],
        },
      ],
      extensions: [{ extensionId: 'game-2d' }],
    } as unknown as SZIR
    const project = {
      ...createEmptyProject('p1', 'Projeto'),
      ir,
      blocksState: null,
      installedExtensions: [{ id: 'game-2d', version: '0.1.0', installedAt: 1 }],
    }

    const cleaned = removeExtensionArtifacts(project, 'game-2d')
    // Nenhum nó g2d:* sobra em NENHUM corpo aninhado.
    const types = new Set<string>()
    const walk = (v: unknown): void => {
      if (Array.isArray(v)) for (const x of v) walk(x)
      else if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>
        if (typeof o.type === 'string') types.add(o.type)
        for (const x of Object.values(o)) walk(x)
      }
    }
    walk(cleaned.ir?.js)
    expect([...types].some((t) => t.startsWith('g2d:'))).toBe(false)
    // E os statements não-extensão (consoleLog) sobrevivem.
    expect(types.has('consoleLog')).toBe(true)
  })

  it('conta e limpa blocos de extensão dentro de slots de sombra', () => {
    // Bloco de extensão (`sz_g2d_set_velocity`) escondido num wrapper `shadow`
    // de um input — antes era ignorado (só seguia `.block`), miscontado e
    // deixado órfão na remoção, tropeçando depois na allowlist.
    const blocksState = {
      blocks: {
        blocks: [
          {
            type: 'sz_g2d_update_each_frame',
            inputs: {
              BODY: {
                shadow: { type: 'sz_g2d_set_velocity' },
              },
            },
          },
        ],
      },
    }
    const project = {
      ...createEmptyProject('p1', 'Projeto'),
      ir: null,
      blocksState,
      installedExtensions: [{ id: 'game-2d', version: '0.1.0', installedAt: 1 }],
    }

    // 2 blocos da extensão: o pai (update_each_frame) + o filho na sombra.
    expect(countExtensionBlocksInProject(project, 'game-2d')).toBe(2)

    const cleaned = removeExtensionArtifacts(project, 'game-2d')
    expect(
      countExtensionBlocksInProject({ ...project, blocksState: cleaned.blocksState }, 'game-2d'),
    ).toBe(0)
  })

  it('mantém uma sombra no slot `next` do pai sobrevivente como sombra (#22)', () => {
    // Pai sobrevivente (`sz_html_div`, core) com o slot `next` ocupado por uma
    // SOMBRA (não um bloco real). Ao remover uma extensão sem blocos presentes,
    // o pai segue intacto — e a sombra do `next` NÃO pode virar bloco real
    // (`shadow`→`block`), senão a próxima des-serialização perde a distinção.
    const blocksState = {
      blocks: {
        blocks: [
          {
            type: 'sz_html_div',
            id: 'pai',
            next: {
              shadow: { type: 'sz_html_p', id: 'sombra_next' },
            },
          },
        ],
      },
    }
    const project = {
      ...createEmptyProject('p1', 'Projeto'),
      ir: null,
      blocksState,
      installedExtensions: [{ id: 'game-2d', version: '0.1.0', installedAt: 1 }],
    }

    const cleaned = removeExtensionArtifacts(project, 'game-2d')
    const root = cleaned.blocksState as {
      blocks: { blocks: Array<{ next?: { block?: unknown; shadow?: unknown } }> }
    }
    const next = root.blocks.blocks[0]?.next
    // A sombra continua sob `shadow` — e nunca foi promovida a `block`.
    expect(next).toHaveProperty('shadow')
    expect(next).not.toHaveProperty('block')
    expect((next?.shadow as { type?: string })?.type).toBe('sz_html_p')
  })

  it('removeExtension NÃO desregistra blocos do Blockly global (invariante #5)', () => {
    // Outra instância na mesma página pode ainda usar essas definições; o
    // registro Blockly.Blocks é global de módulo. A remoção por-instância só
    // tira a extensão do projeto, sem tocar no registro compartilhado.
    const ext = findExtension('game-2d')
    if (!ext) throw new Error('extensão game-2d não encontrada')
    const types = ext.blockly.blocks.map((b) => b.type as string)

    registerExtension(ext)
    for (const t of types) expect(Blockly.Blocks[t]).toBeDefined()

    const { api, removed } = fakeStore()
    removeExtension('game-2d', api)

    expect(removed).toEqual(['game-2d'])
    // Definições permanecem registradas para as outras instâncias.
    for (const t of types) expect(Blockly.Blocks[t]).toBeDefined()
  })

  afterAll(() => {
    // Teardown: tira do registro global o que este arquivo registrou, para não
    // vazar definições para outros arquivos de teste (mock.module não isola).
    const ext = findExtension('game-2d')
    if (ext) unregisterBlocks(ext.blockly.blocks.map((b) => b.type as string))
  })
})
