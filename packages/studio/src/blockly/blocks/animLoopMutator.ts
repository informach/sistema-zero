import * as Blockly from 'blockly/core'
import { withMutation } from './mutatorEvents'

/**
 * Mutator OPCIONAL do bloco "A cada frame fazer" (`sz_canvas_anim_loop`). Estilo
 * MakeCode (+/−), com DOIS slots independentes:
 *
 *  - **Guardar id** (`+` logo após "fazer"): revela "guardar id em [variável]",
 *    fazendo o loop salvar o id do requestAnimationFrame numa variável do aluno
 *    para poder ser parado depois com o bloco "parar animação".
 *  - **Tempo do quadro** (`+` rotulado "tempo do quadro"): revela duas variáveis
 *    — o tempo do quadro (ms desde o carregamento, vindo do requestAnimationFrame)
 *    e o tempo desde o quadro anterior (delta, segundos) — para movimento independente
 *    de FPS (mova por velocidade × delta).
 *
 * Os nomes (`handle_`, `timeVar_`, `deltaVar_`) são serializados por
 * `saveExtraState`/`loadExtraState`. O `buildIR` lê os campos `HANDLE` / `TIME_VAR`
 * / `DELTA_VAR` (ausentes = slot fechado), então o round-trip é estável.
 */

const HEADER_INPUT = 'SZ_ANIM_HEADER'
const BODY_INPUT = 'BODY'
const DEFAULT_HANDLE = 'animId'
const DEFAULT_TIME = 'tempo'
const DEFAULT_DELTA = 'desdeUltimoQuadro'
const MAX_NAME_CHARS = 80

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
  timeVar_: string
  deltaVar_: string
  updateShape_(): void
  addHandle_(): void
  removeHandle_(): void
  addTiming_(): void
  removeTiming_(): void
}

/** Limpa um nome de variável (identificador JS); devolve '' se nada sobrar. */
function sanitizeName(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw
    .trim()
    .replace(/[^A-Za-z0-9_$]/g, '')
    .slice(0, MAX_NAME_CHARS)
}

const ANIM_LOOP_MUTATOR_MIXIN = {
  handle_: '',
  timeVar_: '',
  deltaVar_: '',

  saveExtraState(this: AnimLoopBlock): {
    handle?: string
    timeVar?: string
    deltaVar?: string
  } | null {
    const state: { handle?: string; timeVar?: string; deltaVar?: string } = {}
    if (this.handle_) state.handle = this.handle_
    if (this.timeVar_) state.timeVar = this.timeVar_
    if (this.deltaVar_) state.deltaVar = this.deltaVar_
    return Object.keys(state).length > 0 ? state : null
  },

  loadExtraState(
    this: AnimLoopBlock,
    state: { handle?: string; timeVar?: string; deltaVar?: string } | null,
  ): void {
    this.handle_ = sanitizeName(state?.handle)
    this.timeVar_ = sanitizeName(state?.timeVar)
    this.deltaVar_ = sanitizeName(state?.deltaVar)
    this.updateShape_()
  },

  /**
   * (Re)constrói a linha de cabeçalho: "A cada frame fazer [+ id] tempo do quadro
   * [+ tempo/delta]".
   */
  updateShape_(this: AnimLoopBlock): void {
    if (this.getInput(HEADER_INPUT)) this.removeInput(HEADER_INPUT, true)
    const input = this.appendDummyInput(HEADER_INPUT)
    input.appendField('A cada frame fazer')

    // Slot 1: guardar o id do requestAnimationFrame.
    if (this.handle_) {
      input.appendField(
        new Blockly.FieldImage(MINUS_ICON, 15, 15, '−', () => {
          this.removeHandle_()
        }),
      )
      input.appendField('guardar id em')
      input.appendField(
        new Blockly.FieldTextInput(this.handle_, (value: string) => {
          const clean = sanitizeName(value) || DEFAULT_HANDLE
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

    // Slot 2: tempo do quadro + tempo desde o quadro anterior (delta).
    input.appendField('  tempo do quadro')
    if (this.timeVar_ || this.deltaVar_) {
      input.appendField(
        new Blockly.FieldImage(MINUS_ICON, 15, 15, '−', () => {
          this.removeTiming_()
        }),
      )
      input.appendField('em')
      input.appendField(
        new Blockly.FieldTextInput(this.timeVar_ || DEFAULT_TIME, (value: string) => {
          const clean = sanitizeName(value) || DEFAULT_TIME
          this.timeVar_ = clean
          return clean
        }),
        'TIME_VAR',
      )
      input.appendField('· delta em segundos em')
      input.appendField(
        new Blockly.FieldTextInput(this.deltaVar_ || DEFAULT_DELTA, (value: string) => {
          const clean = sanitizeName(value) || DEFAULT_DELTA
          this.deltaVar_ = clean
          return clean
        }),
        'DELTA_VAR',
      )
    } else {
      input.appendField(
        new Blockly.FieldImage(PLUS_ICON, 15, 15, '+', () => {
          this.addTiming_()
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

  addTiming_(this: AnimLoopBlock): void {
    if (this.timeVar_ || this.deltaVar_) return
    withMutation(this, () => {
      this.timeVar_ = DEFAULT_TIME
      this.deltaVar_ = DEFAULT_DELTA
      this.updateShape_()
    })
  },

  removeTiming_(this: AnimLoopBlock): void {
    if (!this.timeVar_ && !this.deltaVar_) return
    withMutation(this, () => {
      this.timeVar_ = ''
      this.deltaVar_ = ''
      this.updateShape_()
    })
  },
}

function animLoopMutatorHelper(this: AnimLoopBlock): void {
  if (typeof this.handle_ !== 'string') this.handle_ = ''
  if (typeof this.timeVar_ !== 'string') this.timeVar_ = ''
  if (typeof this.deltaVar_ !== 'string') this.deltaVar_ = ''
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
