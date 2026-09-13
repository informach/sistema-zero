import { describe, expect, it } from 'bun:test'
import { buildWorkspaceStateFromIR } from '#blockly'
import type { SZIR } from '#ir'
import {
  BEHAVIOR_AREAS_STATE_KEY,
  BEHAVIOR_AREAS_STATE_VERSION,
} from '../blockly/blocksStateVersion'
import { invadersNaMaoExample } from '../examples/core'
import {
  MAX_BLOCKSTATE_BLOCKS,
  sanitizeImportedBlocksState,
  sanitizeProjectForHost,
} from './projectStore'
import { prepareProjectForHost } from './projectValidation'

/**
 * Regressão do bug "código no Monaco mas nenhum bloco": o sanitizador do projeto
 * (rodado ao reabrir) descartava o blocksState inteiro quando um bloco tinha
 * `extraState` (mutator) ou campos de parâmetro, ou sockets com sombra. Estes
 * testes garantem que um estado gerado pela Ponte sobrevive ao round-trip de
 * carga.
 */
describe('sanitizeImportedBlocksState — aceita estado gerado pela Ponte', () => {
  it('preserva a versão válida das áreas de comportamento e recusa versões desconhecidas', () => {
    const base = { blocks: { languageVersion: 0, blocks: [] } }
    const current = {
      ...base,
      [BEHAVIOR_AREAS_STATE_KEY]: BEHAVIOR_AREAS_STATE_VERSION,
    }
    const previous = {
      ...base,
      [BEHAVIOR_AREAS_STATE_KEY]: BEHAVIOR_AREAS_STATE_VERSION - 1,
    }
    const future = {
      ...base,
      [BEHAVIOR_AREAS_STATE_KEY]: BEHAVIOR_AREAS_STATE_VERSION + 1,
    }

    expect(sanitizeImportedBlocksState(current, [])).toEqual(current)
    expect(sanitizeImportedBlocksState(previous, [])).toBeNull()
    expect(sanitizeImportedBlocksState(future, [])).toBeNull()
  })

  it('converte a versão antiga antes do host, preservando layout e IDs', async () => {
    const previous = {
      [BEHAVIOR_AREAS_STATE_KEY]: 2,
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_frame_events',
            id: 'area-eventos',
            x: 452,
            y: 392,
            inputs: {
              CHILDREN: {
                block: { type: 'sz_js_on_click_anywhere', id: 'evento-clique' },
              },
            },
          },
        ],
      },
    }
    const project = await prepareProjectForHost({
      id: 'projeto-v2',
      name: 'Projeto versão 2',
      files: { 'index.html': '', 'style.css': '', 'script.js': '' },
      ir: { html: [], css: [], js: [], extensions: [] },
      blocksState: previous,
      installedExtensions: [],
    })

    expect(project?.blocksState).not.toEqual(previous)
    const migrated = project?.blocksState as {
      szBehaviorAreasVersion: number
      blocks: { blocks: Array<{ id?: string; x?: number; y?: number }> }
    }
    expect(migrated.szBehaviorAreasVersion).toBe(BEHAVIOR_AREAS_STATE_VERSION)
    expect(migrated.blocks.blocks[0]).toMatchObject({ id: 'area-eventos', x: 452, y: 392 })
    expect(JSON.stringify(migrated)).toContain('evento-clique')
  })

  it('preserva uma classe completa (extends, construtor com params, método, propriedades)', () => {
    const ir: SZIR = {
      html: [],
      css: [],
      extensions: [],
      js: [
        {
          type: 'classDecl',
          name: 'Cao',
          superClass: 'Animal',
          ctorParams: ['nome'],
          ctorBody: [{ type: 'setThisProp', name: 'nome', value: { type: 'var', name: 'nome' } }],
          methods: [
            {
              name: 'latir',
              params: [],
              body: [{ type: 'return', value: { type: 'thisProp', name: 'nome' } }],
            },
          ],
        },
        {
          type: 'newInstance',
          varName: 'c',
          className: 'Cao',
          args: [{ type: 'str', value: 'Rex' }],
        },
        { type: 'callMethod', objectVar: 'c', method: 'latir', args: [] },
      ],
    }
    const state = buildWorkspaceStateFromIR(ir)
    // O estado gerado tem extraState (mutators) e campos de parâmetro: não pode
    // ser descartado pelo sanitizador.
    expect(sanitizeImportedBlocksState(state, [])).not.toBeNull()
  })

  it('preserva "Se/senão" com extraState do mutator (elseIf + hasElse)', () => {
    // Regressão do "jogo reabre sem blocos": o mutator do sz_js_if_else grava
    // `{elseIf, hasElse}`, mas a allowlist de extraState não tinha o caso — o
    // default `false` derrubava a partição INTEIRA de qualquer projeto com um
    // "senão" a cada reabertura (o modo Blocos abria vazio até a Ponte
    // reconstruir do código).
    const ir: SZIR = {
      html: [],
      css: [],
      extensions: [],
      js: [
        {
          type: 'if',
          cond: { type: 'bool', value: true },
          then: [{ type: 'consoleLog', value: { type: 'str', value: 'a' } }],
          elseif: [
            {
              cond: { type: 'bool', value: false },
              then: [{ type: 'consoleLog', value: { type: 'str', value: 'b' } }],
            },
          ],
          else: [{ type: 'consoleLog', value: { type: 'str', value: 'c' } }],
        },
      ],
    }
    const state = buildWorkspaceStateFromIR(ir)
    expect(JSON.stringify(state)).toContain('"hasElse"')
    expect(sanitizeImportedBlocksState(state, [])).not.toBeNull()
  })

  it('o estado do exemplo "Invasores do Espaço" INTEIRO passa no sanitizador', () => {
    // O exemplo cobre o vocabulário novo de uma vez (sz_val_new, filter,
    // classes, if/else-if/else, eventos no construtor): se qualquer allowlist
    // regredir, este teste aponta antes de o kit abrir vazio.
    const state = buildWorkspaceStateFromIR(invadersNaMaoExample.ir)
    expect(sanitizeImportedBlocksState(state, [])).not.toBeNull()
  })

  it('preserva sockets de valor com sombra (wrapper {shadow}) e extraState', () => {
    // Estado como o Blockly serializa um bloco arrastado da paleta: tomada de
    // valor com sombra padrão e estado de mutator em extraState.
    const state = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_js_new_var',
            fields: { VARNAME: 'pessoa', CLASS: 'Pessoa' },
            extraState: { items: 1 },
            inputs: {
              ARG0: { shadow: { type: 'sz_val_number', fields: { NUM: 0 } } },
            },
          },
        ],
      },
    }
    expect(sanitizeImportedBlocksState(state, [])).not.toBeNull()
  })

  it('preserva tempo e delta opcionais do loop de animação', () => {
    const state = buildWorkspaceStateFromIR({
      version: 2,
      html: [],
      css: [],
      behavior: {
        start: [],
        events: [],
        loops: [
          {
            type: 'animationLoop',
            timeVar: 'tempo',
            deltaVar: 'dt',
            body: [],
          },
        ],
      },
      extensions: [],
    })
    expect(sanitizeImportedBlocksState(state, [])).not.toBeNull()
  })

  it('preserva pilhas longas serializadas por next.block', () => {
    const head = {
      type: 'sz_js_console_log_text',
      id: 'log_0',
      fields: { VALUE: 'oi' },
    }
    let current = head as typeof head & { next?: { block: typeof head } }
    for (let index = 1; index < 120; index += 1) {
      const next = {
        type: 'sz_js_console_log_text',
        id: `log_${index}`,
        fields: { VALUE: 'oi' },
      }
      current.next = { block: next }
      current = next
    }
    const state = { blocks: { languageVersion: 0, blocks: [head] } }

    expect(sanitizeImportedBlocksState(state, [])).toEqual(state)
  })

  it('descarta extraState de mutator que tentaria criar milhares de inputs', () => {
    const state = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_val_array',
            extraState: { items: 10_000 },
          },
        ],
      },
    }

    expect(sanitizeImportedBlocksState(state, [])).toBeNull()
  })

  it('descarta extraState inesperado em blocos sem mutator conhecido', () => {
    const state = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_js_console_log_text',
            fields: { VALUE: 'oi' },
            extraState: { items: 1 },
          },
        ],
      },
    }

    expect(sanitizeImportedBlocksState(state, [])).toBeNull()
  })

  it('recusa o documento quando a partição de blocos excede o limite', () => {
    const blocks = Array.from({ length: MAX_BLOCKSTATE_BLOCKS + 1 }, (_, index) => ({
      type: 'sz_js_console_log_text',
      id: `log_${index}`,
      fields: { VALUE: 'oi' },
    }))
    const blocksState = { blocks: { languageVersion: 0, blocks } }

    expect(() => sanitizeImportedBlocksState(blocksState, [])).toThrow(
      'blocksState excede o tamanho ou a complexidade máxima',
    )

    expect(() =>
      sanitizeProjectForHost({
        formatVersion: 2,
        id: 'local-big-blocks',
        name: 'Projeto grande',
        files: {
          'index.html': '<h1>ok</h1>',
          'style.css': '',
          'script.js': '',
        },
        ir: {
          version: 2,
          html: [],
          css: [],
          behavior: { start: [], events: [], loops: [] },
          extensions: [],
        },
        blocksState,
        installedExtensions: [],
      }),
    ).toThrow('blocksState excede')
  })
})

/**
 * O canvas VAZIO não é um estado corrompido — e por isso não pode gritar no Console.
 *
 * ⚠️ `Blockly.serialization.workspaces.save()` num workspace sem blocos devolve `{}`
 * (medido, ele OMITE a seção), e o carimbo de versão faz o que chega ao disco ser
 * `{szBehaviorAreasVersion: N}`. O sanitizer recusa — certo, não há layout a preservar —,
 * mas o aviso existe para dizer QUAL checagem da allowlist tropeçou, e aqui nenhuma
 * tropeçou. Ele disparava ao abrir todo projeto salvo com o canvas limpo.
 */
describe('canvas vazio e recusa de corrupção', () => {
  const projectWith = (blocksState: unknown) => ({
    formatVersion: 2,
    id: 'canvas-vazio',
    name: 'Projeto',
    files: { 'index.html': '', 'style.css': '', 'script.js': '' },
    ir: {
      version: 2,
      html: [],
      css: [],
      behavior: { start: [], events: [], loops: [] },
      extensions: [],
    },
    installedExtensions: [],
    blocksState,
  })
  it('aceita o workspace vazio sem fabricar blocos', () => {
    expect(sanitizeProjectForHost(projectWith({}))?.blocksState).toBeNull()
    expect(
      sanitizeProjectForHost(
        projectWith({ [BEHAVIOR_AREAS_STATE_KEY]: BEHAVIOR_AREAS_STATE_VERSION }),
      )?.blocksState,
    ).toBeNull()
  })
  it('recusa estrutura corrompida sem substituir o layout', () => {
    for (const blocksState of [
      { blocks: { languageVersion: 0, blocks: [] }, lixo: 1 },
      { blocks: 'inválido' },
      { variables: 'corrompido' },
      { variables: [{ id: 'score-id', name: 'pontuação', type: '' }] },
      { [BEHAVIOR_AREAS_STATE_KEY]: 999 },
    ])
      expect(() => sanitizeProjectForHost(projectWith(blocksState))).toThrow(
        'Nenhuma cópia foi gravada',
      )
  })
})
