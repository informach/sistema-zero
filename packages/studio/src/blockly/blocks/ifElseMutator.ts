import * as Blockly from 'blockly/core'
import { withMutation } from './mutatorEvents'

/**
 * Mutator do bloco "Se / senão" (`sz_js_if_else`) estilo MakeCode Arcade:
 *
 *  - o bloco NASCE só com "Se <cond> então [C]" (sem "senão" desnecessário);
 *  - um `+ senão se` adiciona um ramo "senão se <cond> então [C]" (quantos quiser),
 *    já SEMEADO com uma comparação `x > 0` (igual ao "Se");
 *  - um `+ senão` liga o "senão [C]" final;
 *  - um `−` remove o ÚLTIMO ramo (o "senão" primeiro, depois os "senão se").
 *
 * O modelo (`elseIf_` = quantidade de "senão se", `hasElse_` = tem "senão") é
 * serializado por `saveExtraState`/`loadExtraState`. O `buildIR` lê os inputs
 * `ELSEIF_COND{i}`/`ELSEIF_THEN{i}` + `ELSE` (só os que existem), então o
 * round-trip é estável. Os inputs base `COND`/`THEN` vêm da definição JSON.
 */

const FOOTER = 'IF_ELSE_FOOTER'
const MAX_ELSEIF = 20

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

interface IfElseBlock extends Blockly.Block {
  elseIf_: number
  hasElse_: boolean
  updateShape_(): void
  addElseIf_(): void
  addElse_(): void
  removeLast_(): void
}

const condName = (i: number): string => `ELSEIF_COND${i}`
const thenName = (i: number): string => `ELSEIF_THEN${i}`

/** Desconecta o filho de um input (se houver) e devolve a conexão dele — o bloco
 * fica flutuando (não é descartado), pronto para reconectar. */
function detach(input: Blockly.Input | null): Blockly.Connection | null {
  const conn = input?.connection
  const target = conn?.targetConnection ?? null
  if (conn && target) conn.disconnect()
  return target
}

/** Reconecta um filho guardado num input reconstruído (ignora se incompatível). */
function reattach(input: Blockly.Input | null, target: Blockly.Connection | null): void {
  if (input?.connection && target) {
    try {
      input.connection.connect(target)
    } catch {
      // Tipos incompatíveis: o filho fica solto (não quebra a remontagem).
    }
  }
}

/**
 * Semeia o soquete de condição com uma comparação `x > 0` — bloco REAL (editável)
 * com operandos SOMBRA substituíveis, idêntico à semente do "Se" (ver
 * `valueSockets.ts CUSTOM_SOCKETS`). Best-effort: sem workspace/render fica vazio
 * (o gerador trata condição ausente como `true`).
 */
function seedCondition(block: Blockly.Block, input: Blockly.Input): void {
  const ws = block.workspace as Blockly.Workspace & { isFlyout?: boolean }
  if (!ws || ws.isFlyout) return
  try {
    const compare = ws.newBlock('sz_val_compare')
    compare.setFieldValue('>', 'OP')
    const left = ws.newBlock('sz_val_variable')
    left.setShadow(true)
    left.setFieldValue('x', 'NAME')
    const right = ws.newBlock('sz_val_number')
    right.setShadow(true)
    right.setFieldValue(0, 'NUM')
    for (const b of [compare, left, right]) {
      const svg = b as unknown as Partial<Blockly.BlockSvg>
      svg.initSvg?.()
      svg.render?.()
    }
    if (left.outputConnection) compare.getInput('LEFT')?.connection?.connect(left.outputConnection)
    if (right.outputConnection)
      compare.getInput('RIGHT')?.connection?.connect(right.outputConnection)
    if (compare.outputConnection) input.connection?.connect(compare.outputConnection)
  } catch {
    // Sem semente se algo faltar — o soquete fica vazio.
  }
}

const IF_ELSE_MUTATOR_MIXIN = {
  elseIf_: 0,
  hasElse_: false,

  saveExtraState(this: IfElseBlock): { elseIf?: number; hasElse?: boolean } | null {
    const state: { elseIf?: number; hasElse?: boolean } = {}
    if (this.elseIf_ > 0) state.elseIf = this.elseIf_
    if (this.hasElse_) state.hasElse = true
    return Object.keys(state).length > 0 ? state : null
  },

  loadExtraState(this: IfElseBlock, state: { elseIf?: number; hasElse?: boolean } | null): void {
    const n = Number(state?.elseIf)
    this.elseIf_ = Number.isFinite(n) ? Math.min(Math.max(0, Math.floor(n)), MAX_ELSEIF) : 0
    this.hasElse_ = Boolean(state?.hasElse)
    this.updateShape_()
  },

  /**
   * (Re)constrói os inputs de ramo (senão-se/senão) + o rodapé com os botões
   * +/−, PRESERVANDO os blocos já encaixados: desconecta os filhos → derruba os
   * inputs dinâmicos → reconstrói → reconecta. `removeInput` de um input já VAZIO
   * nunca descarta bloco, então nada se perde (o ramo removido fica flutuando).
   */
  updateShape_(this: IfElseBlock): void {
    const savedCond: Array<Blockly.Connection | null> = []
    const savedThen: Array<Blockly.Connection | null> = []
    for (let i = 0; this.getInput(condName(i)); i++) {
      savedCond.push(detach(this.getInput(condName(i))))
      savedThen.push(detach(this.getInput(thenName(i))))
    }
    const savedElse = this.getInput('ELSE') ? detach(this.getInput('ELSE')) : null

    if (this.getInput(FOOTER)) this.removeInput(FOOTER, true)
    if (this.getInput('ELSE')) this.removeInput('ELSE', true)
    for (let i = 0; this.getInput(condName(i)); i++) {
      this.removeInput(condName(i), true)
      this.removeInput(thenName(i), true)
    }

    for (let i = 0; i < this.elseIf_; i++) {
      this.appendValueInput(condName(i)).setCheck('JSValue').appendField('senão se')
      this.appendStatementInput(thenName(i)).appendField('então')
    }
    if (this.hasElse_) this.appendStatementInput('ELSE').appendField('senão')

    const footer = this.appendDummyInput(FOOTER)
    footer.appendField(
      new Blockly.FieldImage(PLUS_ICON, 15, 15, 'adicionar senão se', () => this.addElseIf_()),
    )
    footer.appendField('senão se')
    if (!this.hasElse_) {
      footer.appendField(
        new Blockly.FieldImage(PLUS_ICON, 15, 15, 'adicionar senão', () => this.addElse_()),
      )
      footer.appendField('senão')
    }
    if (this.elseIf_ > 0 || this.hasElse_) {
      footer.appendField(
        new Blockly.FieldImage(MINUS_ICON, 15, 15, 'remover o último', () => this.removeLast_()),
      )
    }

    for (let i = 0; i < savedCond.length && i < this.elseIf_; i++) {
      reattach(this.getInput(condName(i)), savedCond[i] ?? null)
      reattach(this.getInput(thenName(i)), savedThen[i] ?? null)
    }
    if (this.hasElse_) reattach(this.getInput('ELSE'), savedElse)
  },

  addElseIf_(this: IfElseBlock): void {
    if (this.elseIf_ >= MAX_ELSEIF) return
    withMutation(this, () => {
      this.elseIf_ += 1
      this.updateShape_()
      const input = this.getInput(condName(this.elseIf_ - 1))
      if (input && !input.connection?.targetConnection) seedCondition(this, input)
    })
  },

  addElse_(this: IfElseBlock): void {
    if (this.hasElse_) return
    withMutation(this, () => {
      this.hasElse_ = true
      this.updateShape_()
    })
  },

  removeLast_(this: IfElseBlock): void {
    if (this.hasElse_) {
      withMutation(this, () => {
        this.hasElse_ = false
        this.updateShape_()
      })
    } else if (this.elseIf_ > 0) {
      withMutation(this, () => {
        this.elseIf_ -= 1
        this.updateShape_()
      })
    }
  },
}

function ifElseMutatorHelper(this: IfElseBlock): void {
  if (typeof this.elseIf_ !== 'number') this.elseIf_ = 0
  if (typeof this.hasElse_ !== 'boolean') this.hasElse_ = false
  this.updateShape_()
}

let registered = false

/** Registra o mutator `sz_if_else_mutator`. Idempotente. */
export function registerIfElseMutator(): void {
  if (registered) return
  Blockly.Extensions.registerMutator(
    'sz_if_else_mutator',
    IF_ELSE_MUTATOR_MIXIN,
    ifElseMutatorHelper as unknown as () => void,
  )
  registered = true
}
