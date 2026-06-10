import * as Blockly from 'blockly/core'
import { withMutation } from './mutatorEvents'
import { getParamNames } from './paramsMutator'

/**
 * Mutator dos argumentos de `sz_js_new_var` (construtor) e `sz_js_call_method` /
 * `sz_val_call_method` (método, comando ou valor). Tem dois modos:
 *
 *  - AUTO: quando a classe/método é encontrada no workspace, os espaços de valor
 *    se ajustam à assinatura e ganham o RÓTULO de cada parâmetro
 *    (`nome: [..] idade: [..]`). Sem +/−, sem decorar ordem (estilo MakeCode).
 *  - MANUAL: quando não dá para resolver a assinatura, cai nos botões +/− que
 *    criam/removem espaços posicionais.
 *
 * Os rótulos são PURAMENTE cosméticos: a geração de código e o IR usam só os
 * valores posicionais (`ARG0..ARG{n-1}`), então um rótulo desatualizado nunca
 * quebra o código nem o round-trip. A contagem vai no `extraState` (Blockly 11).
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

const CONTROLS_INPUT = 'SZ_ARGS_CONTROLS'
const MAX_ITEMS = 32

interface ArgsMutatorBlock extends Blockly.Block {
  itemCount_: number
  lastKey_?: string
  syncShape_(): void
  rebuild_(sig: string[] | null, opts?: { shadows?: boolean }): void
  resolveSignature_(): string[] | null
  plus(): void
  minus(): void
}

/** Acha o bloco de uma classe pelo nome no workspace. */
function findClass(ws: Blockly.Workspace, name: string): Blockly.Block | null {
  if (!name) return null
  for (const b of ws.getBlocksByType('sz_js_class', false)) {
    if (b.getFieldValue('NAME') === name) return b
  }
  return null
}

/** Acha a declaração de uma função (`sz_js_function`) pelo nome no workspace. */
function findFunction(ws: Blockly.Workspace, name: string): Blockly.Block | null {
  if (!name) return null
  for (const b of ws.getBlocksByType('sz_js_function', false)) {
    if (b.getFieldValue('NAME') === name) return b
  }
  return null
}

/** Dado o nome de uma variável de instância, acha a classe (via `criar x = novo Classe`). */
function classOfInstance(ws: Blockly.Workspace, varName: string): Blockly.Block | null {
  if (!varName) return null
  for (const b of ws.getBlocksByType('sz_js_new_var', false)) {
    if (b.getFieldValue('VARNAME') === varName) {
      return findClass(ws, b.getFieldValue('CLASS') ?? '')
    }
  }
  return null
}

/** Parâmetros do construtor encaixado no input MEMBERS de uma classe. */
function constructorParams(classBlock: Blockly.Block): string[] {
  let cur: Blockly.Block | null = classBlock.getInputTargetBlock('MEMBERS')
  while (cur) {
    if (cur.isInsertionMarker()) {
      cur = cur.getNextBlock()
      continue
    }
    if (cur.type === 'sz_js_constructor') return getParamNames(cur)
    cur = cur.getNextBlock()
  }
  return []
}

/** Parâmetros de um método (pelo nome) encaixado no input MEMBERS de uma classe. */
function methodParams(classBlock: Blockly.Block, method: string): string[] | null {
  let cur: Blockly.Block | null = classBlock.getInputTargetBlock('MEMBERS')
  while (cur) {
    if (cur.isInsertionMarker()) {
      cur = cur.getNextBlock()
      continue
    }
    if (cur.type === 'sz_js_class_method' && cur.getFieldValue('NAME') === method) {
      return getParamNames(cur)
    }
    cur = cur.getNextBlock()
  }
  return null
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

const ARGS_MUTATOR_MIXIN = {
  itemCount_: 0,

  saveExtraState(this: ArgsMutatorBlock): { items: number } | null {
    let count = 0
    while (this.getInput(`ARG${count}`)) count += 1
    return count > 0 ? { items: count } : null
  },

  loadExtraState(this: ArgsMutatorBlock, state: { items?: number } | null): void {
    this.itemCount_ = clampItemCount(state?.items ?? 0)
    // Constrói espaços "crus" a partir da contagem salva (sem criar sombras
    // durante a desserialização). O onchange pós-load resolve assinatura,
    // rótulos, sombras e controles quando a classe já está no workspace.
    this.rebuild_(null, { shadows: false })
    this.lastKey_ = undefined
  },

  /** Resolve a assinatura (nomes dos parâmetros) ou `null` se não der (modo manual). */
  resolveSignature_(this: ArgsMutatorBlock): string[] | null {
    const ws = this.workspace
    if (!ws || this.isInFlyout) return null
    if (this.type === 'sz_js_new_var') {
      const cls = findClass(ws, this.getFieldValue('CLASS') ?? '')
      return cls ? constructorParams(cls) : null
    }
    if (this.type === 'sz_js_call_method' || this.type === 'sz_val_call_method') {
      const cls = classOfInstance(ws, this.getFieldValue('OBJ') ?? '')
      return cls ? methodParams(cls, this.getFieldValue('METHOD') ?? '') : null
    }
    if (this.type === 'sz_js_call_function' || this.type === 'sz_val_call_function') {
      const fn = findFunction(ws, this.getFieldValue('NAME') ?? '')
      return fn ? getParamNames(fn) : null
    }
    return null
  },

  /** Reconstrói os espaços ARG conforme `sig` (auto, com rótulos) ou contagem manual. */
  rebuild_(this: ArgsMutatorBlock, sig: string[] | null, opts?: { shadows?: boolean }): void {
    const auto = sig !== null
    const withShadows = opts?.shadows !== false
    const count = auto ? Math.min(sig.length, MAX_ITEMS) : this.itemCount_

    // Captura os filhos reais (não-sombra) por índice, para preservá-los.
    const saved: Array<Blockly.Block | null> = []
    for (let i = 0; this.getInput(`ARG${i}`); i += 1) {
      const target = this.getInput(`ARG${i}`)?.connection?.targetBlock() ?? null
      saved.push(target && !target.isShadow() ? target : null)
    }

    if (this.getInput(CONTROLS_INPUT)) this.removeInput(CONTROLS_INPUT)
    for (let i = 0; this.getInput(`ARG${i}`); i += 1) {
      const conn = this.getInput(`ARG${i}`)?.connection
      const child = conn?.targetBlock()
      if (child && !child.isShadow()) conn?.disconnect()
      this.removeInput(`ARG${i}`)
    }

    for (let k = 0; k < count; k += 1) {
      const input = this.appendValueInput(`ARG${k}`).setCheck('JSValue')
      if (auto) input.appendField(`${sig[k]}:`)
      const child = saved[k]
      if (child && !child.disposed && child.outputConnection) {
        input.connection?.connect(child.outputConnection)
      } else if (withShadows) {
        attachNumberShadow(this, input)
      }
    }

    if (!auto) {
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
    }
    this.itemCount_ = count
  },

  /** Recalcula a forma se a assinatura resolvida (ou a contagem manual) mudou. */
  syncShape_(this: ArgsMutatorBlock): void {
    const sig = this.resolveSignature_()
    const key = sig ? `auto:${sig.join('')}` : `manual:${this.itemCount_}`
    if (key === this.lastKey_) return
    this.lastKey_ = key
    Blockly.Events.disable()
    try {
      this.rebuild_(sig)
    } finally {
      Blockly.Events.enable()
    }
  },

  onchange(this: ArgsMutatorBlock, event?: Blockly.Events.Abstract): void {
    if (!this.workspace || this.isInFlyout) return
    const workspace = this.workspace as Blockly.WorkspaceSvg
    if (typeof workspace.isDragging === 'function' && workspace.isDragging()) return
    if (
      event &&
      event.type !== Blockly.Events.BLOCK_CREATE &&
      event.type !== Blockly.Events.BLOCK_DELETE &&
      event.type !== Blockly.Events.BLOCK_CHANGE &&
      event.type !== Blockly.Events.BLOCK_MOVE &&
      event.type !== Blockly.Events.FINISHED_LOADING
    ) {
      return
    }
    this.syncShape_()
  },

  plus(this: ArgsMutatorBlock): void {
    if (this.itemCount_ >= MAX_ITEMS) return
    withMutation(this, () => {
      this.itemCount_ += 1
      this.lastKey_ = `manual:${this.itemCount_}`
      this.rebuild_(null)
    })
  },

  minus(this: ArgsMutatorBlock): void {
    if (this.itemCount_ <= 0) return
    withMutation(this, () => {
      this.itemCount_ -= 1
      this.lastKey_ = `manual:${this.itemCount_}`
      this.rebuild_(null)
    })
  },
}

function clampItemCount(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(MAX_ITEMS, Math.trunc(value)))
}

function argsMutatorHelper(this: ArgsMutatorBlock): void {
  this.syncShape_()
}

let registered = false

/** Registra o mutator `sz_args_mutator`. Idempotente. */
export function registerArgsMutator(): void {
  if (registered) return
  Blockly.Extensions.registerMutator(
    'sz_args_mutator',
    ARGS_MUTATOR_MIXIN,
    argsMutatorHelper as unknown as () => void,
  )
  registered = true
}
