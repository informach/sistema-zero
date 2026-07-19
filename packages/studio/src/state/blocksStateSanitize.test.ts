import { describe, expect, it } from 'bun:test'
import { buildWorkspaceStateFromIR } from '#blockly'
import type { SZIR } from '#ir'
import { invadersNaMaoExample } from '../examples/core'
import {
  MAX_BLOCKSTATE_BLOCKS,
  sanitizeImportedBlocksState,
  sanitizeProjectForHost,
} from './projectStore'

/**
 * Regressão do bug "código no Monaco mas nenhum bloco": o sanitizador do projeto
 * (rodado ao reabrir) descartava o blocksState inteiro quando um bloco tinha
 * `extraState` (mutator) ou campos de parâmetro, ou sockets com sombra. Estes
 * testes garantem que um estado gerado pela Ponte sobrevive ao round-trip de
 * carga.
 */
describe('sanitizeImportedBlocksState — aceita estado gerado pela Ponte', () => {
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

  it('descarta blocksState grande ao rehidratar projeto salvo, mantendo import externo rígido', () => {
    const blocks = Array.from({ length: MAX_BLOCKSTATE_BLOCKS + 1 }, (_, index) => ({
      type: 'sz_js_console_log_text',
      id: `log_${index}`,
      fields: { VALUE: 'oi' },
    }))
    const blocksState = { blocks: { languageVersion: 0, blocks } }

    expect(() => sanitizeImportedBlocksState(blocksState, [])).toThrow(
      'blocksState excede o tamanho ou a complexidade máxima',
    )

    const project = sanitizeProjectForHost({
      id: 'local-big-blocks',
      name: 'Projeto grande',
      files: {
        'index.html': '<h1>ok</h1>',
        'style.css': '',
        'script.js': '',
      },
      ir: { html: [], css: [], js: [], extensions: [] },
      blocksState,
      installedExtensions: [],
    })

    expect(project?.blocksState).toBeNull()
  })
})
