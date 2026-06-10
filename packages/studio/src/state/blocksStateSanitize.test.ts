import { describe, expect, it } from 'bun:test'
import { buildWorkspaceStateFromIR } from '#blockly'
import type { SZIR } from '#ir'
import { sanitizeImportedBlocksState } from './projectStore'

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
})
