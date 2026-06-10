import * as Blockly from 'blockly/core'
import { withMutation } from './mutatorEvents'

/**
 * Mutator OPCIONAL do bloco "A cada frame fazer" (`sz_canvas_anim_loop`). Estilo
 * MakeCode (+/−):
 *
 *  - sem clicar, o bloco é só "A cada frame fazer" + corpo (como antes);
 *  - o botão `+` revela "guardar id em [variável]" (com um `−` para remover),
 *    fazendo o loop salvar o id do requestAnimationFrame numa variável do aluno
 *    para poder ser parado depois com o bloco "parar animação".
 *
 * O nome da variável (`handle_`) é serializado por `saveExtraState`/
 * `loadExtraState`. O `buildIR` lê o próprio campo `HANDLE` (ausente = sem id),
 * então o round-trip é estável.
 */

const HEADER_INPUT = 'SZ_ANIM_HEADER'
const BODY_INPUT = 'BODY'
const DEFAULT_HANDLE = 'animId'
const MAX_HANDLE_CHARS = 80

const icon = (inner: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15">${inner}</svg>`,
  )}`
const PLUS_ICON = icon(
  '<path d="M7.5 3v9M3 7.5h9" stroke="white" stroke-width="2" stroke-linecap="round"/>',
)
const MINUS_ICON = icon(
  '<path d="M3 7.5h9" stroke="white" stroke-width="2" stroke-linecap="round"/>',
)

interface AnimLoopBlock extends Blockly.Block {
  handle_: string
  updateShape_(): void
  addHandle_(): void
  removeHandle_(): void
}

/** Limpa um nome de variável (identificador JS); devolve '' se nada sobrar. */
function sanitizeHandle(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw
    .trim()
    .replace(/[^A-Za-z0-9_$]/g, '')
    .slice(0, MAX_HANDLE_CHARS)
}

const ANIM_LOOP_MUTATOR_MIXIN = {
  handle_: '',

  saveExtraState(this: AnimLoopBlock): { handle: string } | null {
    return this.handle_ ? { handle: this.handle_ } : null
  },

  loadExtraState(this: AnimLoopBlock, state: { handle?: string } | null): void {
    this.handle_ = sanitizeHandle(state?.handle)
    this.updateShape_()
  },

  /** (Re)constrói a linha de cabeçalho "A cada frame fazer [+ | guardar id em [var] −]". */
  updateShape_(this: AnimLoopBlock): void {
    if (this.getInput(HEADER_INPUT)) this.removeInput(HEADER_INPUT, true)
    const input = this.appendDummyInput(HEADER_INPUT)
    input.appendField('A cada frame fazer')
    if (this.handle_) {
      input.appendField(
        new Blockly.FieldImage(MINUS_ICON, 15, 15, '−', () => {
          this.removeHandle_()
        }),
      )
      input.appendField('guardar id em')
      input.appendField(
        new Blockly.FieldTextInput(this.handle_, (value: string) => {
          const clean = sanitizeHandle(value) || DEFAULT_HANDLE
          this.handle_ = clean
          return clean
        }),
        'HANDLE',
      )
    } else {
      input.appendField(
        new Blockly.FieldImage(PLUS_ICON, 15, 15, '+', () => {
          this.addHandle_()
        }),
      )
    }
    if (this.getInput(BODY_INPUT)) this.moveInputBefore(HEADER_INPUT, BODY_INPUT)
  },

  addHandle_(this: AnimLoopBlock): void {
    if (this.handle_) return
    withMutation(this, () => {
      this.handle_ = DEFAULT_HANDLE
      this.updateShape_()
    })
  },

  removeHandle_(this: AnimLoopBlock): void {
    if (!this.handle_) return
    withMutation(this, () => {
      this.handle_ = ''
      this.updateShape_()
    })
  },
}

function animLoopMutatorHelper(this: AnimLoopBlock): void {
  if (typeof this.handle_ !== 'string') this.handle_ = ''
  this.updateShape_()
}

let registered = false

/** Registra o mutator `sz_anim_loop_mutator`. Idempotente. */
export function registerAnimLoopMutator(): void {
  if (registered) return
  Blockly.Extensions.registerMutator(
    'sz_anim_loop_mutator',
    ANIM_LOOP_MUTATOR_MIXIN,
    animLoopMutatorHelper as unknown as () => void,
  )
  registered = true
}
