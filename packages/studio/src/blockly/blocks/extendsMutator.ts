import * as Blockly from 'blockly/core'
import { withMutation } from './mutatorEvents'

/**
 * Mutator de HERANÇA da classe (`sz_js_class`). O cabeçalho mostra só o nome da
 * classe e um botão `+`; ao clicar, abre a cláusula opcional `estende [Classe]`
 * (gera `class X extends Base`). Um `−` remove a herança.
 *
 * Estado serializado por `saveExtraState`/`loadExtraState`: `{ extends: nome }`
 * quando há herança, `null` caso contrário. O nome da classe-mãe vive no campo
 * `SUPER` (lido de volta no save).
 */

interface ExtendsBlock extends Blockly.Block {
  hasExtends_: boolean
  superName_: string
  updateExtendsShape_(): void
  addExtends_(): void
  removeExtends_(): void
}

const EXT_INPUT = 'EXT'
const MAX_CLASS_NAME_CHARS = 80

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

function sanitize(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback
  const cleaned = raw
    .trim()
    .replace(/[^A-Za-z0-9_$]/g, '')
    .slice(0, MAX_CLASS_NAME_CHARS)
  return cleaned.length > 0 ? cleaned : fallback
}

/** Nome da classe-mãe declarada num bloco de classe (`''` se não há herança). */
export function getSuperName(block: Blockly.Block | null | undefined): string {
  const b = block as ExtendsBlock | null | undefined
  if (!b?.hasExtends_) return ''
  return (b.getFieldValue('SUPER') ?? b.superName_ ?? '').trim()
}

const EXTENDS_MUTATOR_MIXIN = {
  saveExtraState(this: ExtendsBlock): { extends: string } | null {
    if (!this.hasExtends_) return null
    return { extends: (this.getFieldValue('SUPER') ?? this.superName_ ?? '').trim() }
  },

  loadExtraState(this: ExtendsBlock, state: { extends?: string } | null): void {
    this.hasExtends_ = state?.extends != null
    this.superName_ = sanitize(state?.extends, 'Base')
    this.updateExtendsShape_()
  },

  updateExtendsShape_(this: ExtendsBlock): void {
    if (this.getInput(EXT_INPUT)) {
      const current = this.getFieldValue('SUPER')
      if (typeof current === 'string') this.superName_ = current
      this.removeInput(EXT_INPUT, true)
    }
    const input = this.appendDummyInput(EXT_INPUT)
    if (this.hasExtends_) {
      input.appendField('estende')
      input.appendField(
        new Blockly.FieldTextInput(this.superName_ || 'Base', (value: string) => {
          const clean = sanitize(value, this.superName_ || 'Base')
          this.superName_ = clean
          return clean
        }),
        'SUPER',
      )
      input.appendField(
        new Blockly.FieldImage(MINUS_ICON, 15, 15, 'remover herança', () => {
          this.removeExtends_()
        }),
      )
    } else {
      input.appendField(
        new Blockly.FieldImage(PLUS_ICON, 15, 15, 'herdar de outra classe', () => {
          this.addExtends_()
        }),
      )
    }
    if (this.getInput('MEMBERS')) this.moveInputBefore(EXT_INPUT, 'MEMBERS')
  },

  addExtends_(this: ExtendsBlock): void {
    withMutation(this, () => {
      this.hasExtends_ = true
      this.updateExtendsShape_()
    })
  },

  removeExtends_(this: ExtendsBlock): void {
    withMutation(this, () => {
      this.hasExtends_ = false
      this.updateExtendsShape_()
    })
  },
}

function extendsMutatorHelper(this: ExtendsBlock): void {
  if (typeof this.hasExtends_ !== 'boolean') this.hasExtends_ = false
  if (typeof this.superName_ !== 'string') this.superName_ = 'Base'
  this.updateExtendsShape_()
}

let registered = false

/** Registra o mutator `sz_extends_mutator`. Idempotente. */
export function registerExtendsMutator(): void {
  if (registered) return
  Blockly.Extensions.registerMutator(
    'sz_extends_mutator',
    EXTENDS_MUTATOR_MIXIN,
    extendsMutatorHelper as unknown as () => void,
  )
  registered = true
}
