import { describe, expect, it } from 'bun:test'
import { sanitizeImportedBlocksState } from './projectStore'

/**
 * `isSupportedBlocklyBlockExtraState` (projectStore.ts) é um switch por
 * `blockType`. Se um tipo de bloco que `src/blockly/workspaceState.ts`
 * grava `extraState` num formato conhecido não estiver listado, o `default`
 * devolve `false` e o sanitizer **descarta o blocksState inteiro** no load —
 * o sintoma visível é o aluno perder o layout (cai nos defaults). Este teste
 * trava qualquer tipo novo que escreva `extraState` sem registrar a forma aqui.
 */
function workspaceWith(block: Record<string, unknown>): Record<string, unknown> {
  return {
    blocks: {
      languageVersion: 0,
      blocks: [{ type: 'sz_html_div', ...block }],
    },
  }
}

describe('isSupportedBlocklyBlockExtraState — cobertura por tipo', () => {
  it.each([
    // Items (mutators variádicos): toda chamada/lista de tamanho dinâmico.
    ['sz_val_array', { items: 5 }],
    ['sz_val_join', { items: 3 }],
    ['sz_val_concat_arrays', { items: 2 }],
    ['sz_val_object', { items: 4 }],
    ['sz_val_call_function', { items: 1 }],
    ['sz_val_call_method', { items: 2 }],
    ['sz_val_method_on', { items: 1 }],
    ['sz_js_new_var', { items: 2 }],
    ['sz_js_call_function', { items: 1 }],
    ['sz_js_call_method', { items: 3 }],
    ['sz_js_method_on', { items: 1 }],
    // Canvas 3D: `new THREE.X(args)` (statement e valor) — mesmo mutator de itens.
    ['sz_t3d_new_var', { items: 4 }],
    ['sz_t3d_new', { items: 3 }],
    // Params (mutator de parâmetros nomeados): construtor, método, função.
    ['sz_js_constructor', { params: [{ name: 'a', id: 'p0' }] }],
    ['sz_js_class_method', { params: [{ name: 'a', id: 'p0' }] }],
    ['sz_js_function', { params: [{ name: 'x', id: 'p0' }] }],
    // Forma própria por bloco.
    ['sz_js_class', { extends: 'Animal' }],
    ['sz_canvas_anim_loop', { handle: 'rafId' }],
  ])('aceita extraState válido para %s', (type, extraState) => {
    const blockType = type as string
    const state = {
      blocks: {
        languageVersion: 0,
        blocks: [{ type: blockType, extraState }],
      },
    }
    expect(sanitizeImportedBlocksState(state, [])).not.toBeNull()
  })

  it('rejeita extraState com forma errada (sentinela: não confiar só em "any object")', () => {
    // params com chave inesperada → reject
    expect(
      sanitizeImportedBlocksState(
        workspaceWith({
          type: 'sz_js_function',
          extraState: { params: [{ name: 'x', id: 'p0', extra: 'bad' }] },
        }),
        [],
      ),
    ).toBeNull()
    // handle como número → reject
    expect(
      sanitizeImportedBlocksState(
        workspaceWith({ type: 'sz_canvas_anim_loop', extraState: { handle: 123 } }),
        [],
      ),
    ).toBeNull()
  })
})
