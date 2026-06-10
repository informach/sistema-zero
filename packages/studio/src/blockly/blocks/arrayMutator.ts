import * as Blockly from 'blockly/core'
import { withMutation } from './mutatorEvents'

/**
 * Mutator do bloco de array (`sz_val_array`). É sempre MANUAL: começa vazio e os
 * botões +/− adicionam/removem espaços. Cada espaço é um `input_value`
 * (`ITEM0..ITEM{n-1}`) com sombra de número por padrão.
 *
 * A contagem vai no `extraState` (Blockly 11). A geração de código e o IR usam
 * só os valores posicionais, então o round-trip é estável.
 */

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

const CONTROLS_INPUT = 'SZ_ARRAY_CONTROLS'
const DEFAULT_ITEMS = 0
const MAX_ITEMS = 32

interface ArrayMutatorBlock extends Blockly.Block {
  itemCount_: number
  rebuild_(opts?: { shadows?: boolean }): void
  syncShape_(opts?: { shadows?: boolean }): void
  plus(): void
  minus(): void
}

/** Cria a sombra padrão (número editável) e conecta no input de valor. */
function attachNumberShadow(block: Blockly.Block, input: Blockly.Input): void {
  const ws = block.workspace
  if (!ws || !input.connection) return
  const shadow = ws.newBlock('sz_val_number')
  shadow.setShadow(true)
  shadow.setFieldValue(0, 'NUM')
  const svg = shadow as unknown as Partial<Blockly.BlockSvg>
  svg.initSvg?.()
  svg.render?.()
  if (shadow.outputConnection) input.connection.connect(shadow.outputConnection)
}

const ARRAY_MUTATOR_MIXIN = {
  itemCount_: DEFAULT_ITEMS,

  saveExtraState(this: ArrayMutatorBlock): { items: number } {
    let count = 0
    while (this.getInput(`ITEM${count}`)) count += 1
    return { items: count }
  },

  loadExtraState(this: ArrayMutatorBlock, state: { items?: number } | null): void {
    this.itemCount_ = clampItemCount(state?.items ?? DEFAULT_ITEMS)
    // Constrói espaços "crus" a partir da contagem salva (sem sombras: os filhos
    // reais reconectam pela desserialização dos inputs).
    this.rebuild_({ shadows: false })
  },

  /** Reconstrói os espaços ITEM conforme `itemCount_`, preservando filhos reais. */
  rebuild_(this: ArrayMutatorBlock, opts?: { shadows?: boolean }): void {
    const withShadows = opts?.shadows !== false
    const count = this.itemCount_

    // Captura os filhos reais (não-sombra) por índice, para preservá-los.
    const saved: Array<Blockly.Block | null> = []
    for (let i = 0; this.getInput(`ITEM${i}`); i += 1) {
      const target = this.getInput(`ITEM${i}`)?.connection?.targetBlock() ?? null
      saved.push(target && !target.isShadow() ? target : null)
    }

    if (this.getInput(CONTROLS_INPUT)) this.removeInput(CONTROLS_INPUT)
    for (let i = 0; this.getInput(`ITEM${i}`); i += 1) {
      const conn = this.getInput(`ITEM${i}`)?.connection
      const child = conn?.targetBlock()
      if (child && !child.isShadow()) conn?.disconnect()
      this.removeInput(`ITEM${i}`)
    }

    for (let k = 0; k < count; k += 1) {
      const input = this.appendValueInput(`ITEM${k}`).setCheck('JSValue')
      const child = saved[k]
      if (child && !child.disposed && child.outputConnection) {
        input.connection?.connect(child.outputConnection)
      } else if (withShadows) {
        attachNumberShadow(this, input)
      }
    }

    const controls = this.appendDummyInput(CONTROLS_INPUT)
    controls.appendField(
      new Blockly.FieldImage(PLUS_ICON, 15, 15, '+', () => {
        this.plus()
      }),
    )
    if (this.itemCount_ > 0) {
      controls.appendField(
        new Blockly.FieldImage(MINUS_ICON, 15, 15, '−', () => {
          this.minus()
        }),
      )
    }
  },

  /** Reconstrói a forma com os eventos desativados (não polui o histórico). */
  syncShape_(this: ArrayMutatorBlock, opts?: { shadows?: boolean }): void {
    Blockly.Events.disable()
    try {
      this.rebuild_(opts)
    } finally {
      Blockly.Events.enable()
    }
  },

  plus(this: ArrayMutatorBlock): void {
    if (this.itemCount_ >= MAX_ITEMS) return
    withMutation(this, () => {
      this.itemCount_ += 1
      this.rebuild_()
    })
  },

  minus(this: ArrayMutatorBlock): void {
    if (this.itemCount_ <= 0) return
    withMutation(this, () => {
      this.itemCount_ -= 1
      this.rebuild_()
    })
  },
}

function clampItemCount(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_ITEMS
  return Math.max(0, Math.min(MAX_ITEMS, Math.trunc(value)))
}

function arrayMutatorHelper(this: ArrayMutatorBlock): void {
  // Forma inicial: dois espaços com sombra de número.
  this.syncShape_()
}

let registered = false

/** Registra o mutator `sz_array_mutator`. Idempotente. */
export function registerArrayMutator(): void {
  if (registered) return
  Blockly.Extensions.registerMutator(
    'sz_array_mutator',
    ARRAY_MUTATOR_MIXIN,
    arrayMutatorHelper as unknown as () => void,
  )
  registered = true
}
