import * as Blockly from 'blockly/core'
import { withMutation } from './mutatorEvents'

/**
 * Mutator do bloco de objeto literal (`sz_val_object`). Cada campo do objeto é uma
 * linha com um campo de texto `KEY{i}` (a chave) e uma tomada de valor `ITEM{i}`
 * (o valor), com sombra de número por padrão. Os botões +/− adicionam/removem
 * campos.
 *
 * A contagem vai no `extraState` (Blockly 11); os valores das chaves são campos
 * normais (serializados pelo Blockly). Em rebuilds interativos preservamos tanto
 * o filho real quanto o texto da chave por índice, para não perder edições.
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

const CONTROLS_INPUT = 'SZ_OBJECT_CONTROLS'
const DEFAULT_ITEMS = 1
const MAX_ITEMS = 32

interface ObjectMutatorBlock extends Blockly.Block {
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

const OBJECT_MUTATOR_MIXIN = {
  itemCount_: DEFAULT_ITEMS,

  saveExtraState(this: ObjectMutatorBlock): { items: number } {
    let count = 0
    while (this.getInput(`ITEM${count}`)) count += 1
    return { items: count }
  },

  loadExtraState(this: ObjectMutatorBlock, state: { items?: number } | null): void {
    this.itemCount_ = clampItemCount(state?.items ?? DEFAULT_ITEMS)
    // Constrói os campos a partir da contagem salva (sem sombras: filhos reais e
    // valores das chaves reconectam pela desserialização do Blockly).
    this.rebuild_({ shadows: false })
  },

  /** Reconstrói os pares KEY/ITEM conforme `itemCount_`, preservando chave e filho. */
  rebuild_(this: ObjectMutatorBlock, opts?: { shadows?: boolean }): void {
    const withShadows = opts?.shadows !== false
    const count = this.itemCount_

    // Captura, por índice, o texto da chave e o filho real (não-sombra).
    const savedChild: Array<Blockly.Block | null> = []
    const savedKey: string[] = []
    for (let i = 0; this.getInput(`ITEM${i}`); i += 1) {
      const target = this.getInput(`ITEM${i}`)?.connection?.targetBlock() ?? null
      savedChild.push(target && !target.isShadow() ? target : null)
      savedKey.push((this.getFieldValue(`KEY${i}`) as string | null) ?? '')
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
      input
        .appendField(new Blockly.FieldTextInput(savedKey[k] ?? `chave${k + 1}`), `KEY${k}`)
        .appendField(':')
      const child = savedChild[k]
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
  syncShape_(this: ObjectMutatorBlock, opts?: { shadows?: boolean }): void {
    Blockly.Events.disable()
    try {
      this.rebuild_(opts)
    } finally {
      Blockly.Events.enable()
    }
  },

  plus(this: ObjectMutatorBlock): void {
    if (this.itemCount_ >= MAX_ITEMS) return
    withMutation(this, () => {
      this.itemCount_ += 1
      this.rebuild_()
    })
  },

  minus(this: ObjectMutatorBlock): void {
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

function objectMutatorHelper(this: ObjectMutatorBlock): void {
  // Forma inicial: um campo com sombra de número.
  this.syncShape_()
}

let registered = false

/** Registra o mutator `sz_object_mutator`. Idempotente. */
export function registerObjectMutator(): void {
  if (registered) return
  Blockly.Extensions.registerMutator(
    'sz_object_mutator',
    OBJECT_MUTATOR_MIXIN,
    objectMutatorHelper as unknown as () => void,
  )
  registered = true
}
