import * as Blockly from 'blockly/core'
// Importar um helper de `generators` na camada de blocos é intencional: garante
// que o nome do parâmetro no MODELO do bloco seja idêntico ao identificador
// emitido no código (sem dígito inicial nem palavra reservada solta).
import { normalizeIdentifier } from '../../generators/identifier'
import { withMutation } from './mutatorEvents'

/**
 * Mutator dos PARÂMETROS do construtor (`sz_js_constructor`) e dos métodos
 * (`sz_js_class_method`). Estilo Blockly `block-plus-minus`/MakeCode:
 *
 *  - cada parâmetro é uma linha editável com um botão `−` e um campo de texto
 *    (nome); um botão `+` no fim adiciona um novo parâmetro;
 *  - o modelo (`params_`) é serializado por `saveExtraState`/`loadExtraState` —
 *    a fonte da verdade são os NOMES (o texto/IR não tem id de parâmetro);
 *  - renomear um parâmetro propaga para os blocos-relator (`sz_val_arg`) do
 *    corpo daquela definição. Os blocos de chamada (`new`/chamar método) se
 *    re-sincronizam sozinhos via o `onchange` do `sz_args_mutator`.
 */

interface Param {
  name: string
  id: string
}

interface ParamsBlock extends Blockly.Block {
  params_: Param[]
  updateParamsShape_(): void
  addParam_(): void
  removeParam_(id: string): void
}

const PARAMS_INPUT = 'PARAMS'
const MAX_PARAMS = 32
const MAX_PARAM_CHARS = 80

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

let counter = 0
function genId(): string {
  counter += 1
  return `pp${Date.now().toString(36)}_${counter}`
}

function sanitize(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback
  const trimmed = raw.trim().slice(0, MAX_PARAM_CHARS)
  if (trimmed.length === 0) return fallback
  // `normalizeIdentifier` é a MESMA normalização do gerador de código: prefixa
  // dígito inicial (`2x` → `_2x`) e desambigua palavra reservada (`class` →
  // `class_`), além de colapsar caracteres ilegais. Sem isso, nomes como `2x`
  // ou `return` entravam no modelo do bloco e só quebravam ao gerar o código.
  const normalized = normalizeIdentifier(trimmed)
  // `normalizeIdentifier` nunca devolve vazio, mas `_` (seu fallback p/ nome só
  // de caracteres ilegais) não é um nome útil — cai para o fallback posicional.
  return normalized === '_' ? fallback : normalized
}

function sanitizeParamId(raw: unknown): string {
  if (typeof raw !== 'string') return genId()
  const cleaned = raw.trim().slice(0, MAX_PARAM_CHARS)
  return cleaned.length > 0 ? cleaned : genId()
}

// O construtor e os métodos têm o corpo no input `BODY`; a linha de parâmetros
// fica logo antes dele.
const BODY_INPUT = 'BODY'

/** Input do corpo cujo escopo são estes parâmetros. */
function bodyRoot(block: ParamsBlock): Blockly.Block | null {
  return block.getInputTargetBlock(BODY_INPUT)
}

/**
 * Tipos que abrem um NOVO escopo de parâmetros: ao renomear um parâmetro desta
 * definição NÃO podemos descer para o corpo de uma definição aninhada — lá o
 * mesmo nome de relator (`sz_val_arg`) pode ser uma variável SOMBREADA que
 * pertence àquela definição interna, não a esta.
 */
const NESTED_DEFINITION_TYPES = new Set([
  'sz_js_function',
  'sz_js_class_method',
  'sz_js_constructor',
])

/**
 * Atualiza os relatores `sz_val_arg` do corpo desta definição ao renomear um
 * parâmetro. Caminha o corpo MANUALMENTE e PARA nas fronteiras de definição
 * aninhada (função/método/construtor) — assim um parâmetro de mesmo nome num
 * escopo interno (sombra) não é renomeado por engano.
 */
function renameReporters(block: ParamsBlock, oldName: string, newName: string): void {
  if (oldName === newName) return
  const root = bodyRoot(block)
  if (!root) return

  const visit = (start: Blockly.Block | null): void => {
    let cur: Blockly.Block | null = start
    while (cur) {
      // Uma definição aninhada abre um novo escopo: não descemos para o corpo
      // dela (evita renomear uma sombra), mas seguimos a cadeia `next` irmã.
      if (!NESTED_DEFINITION_TYPES.has(cur.type)) {
        if (cur.type === 'sz_val_arg' && cur.getFieldValue('NAME') === oldName) {
          cur.setFieldValue(newName, 'NAME')
        }
        // Desce pelos filhos de cada input (statements e value inputs). A cadeia
        // `next` deste nível é seguida pelo laço; `inputList` nunca a inclui.
        for (const input of cur.inputList) {
          const target = input.connection?.targetBlock()
          if (target) visit(target)
        }
      }
      cur = cur.getNextBlock()
    }
  }

  visit(root)
}

/**
 * Nomes dos parâmetros declarados num bloco classe/método (lê o modelo do
 * mutator). Usado pelo `sz_args_mutator`, pelo flyout e pelo `buildIR`.
 */
export function getParamNames(block: Blockly.Block | null | undefined): string[] {
  const p = (block as ParamsBlock | null | undefined)?.params_
  return Array.isArray(p) ? p.map((x) => x.name).filter((n) => n.length > 0) : []
}

const PARAMS_MUTATOR_MIXIN = {
  saveExtraState(this: ParamsBlock): { params: Param[] } | null {
    if (!this.params_ || this.params_.length === 0) return null
    return { params: this.params_.map((p) => ({ name: p.name, id: p.id })) }
  },

  loadExtraState(this: ParamsBlock, state: { params?: Param[] } | null): void {
    const params = Array.isArray(state?.params) ? state.params : []
    this.params_ = params.slice(0, MAX_PARAMS).map((p, index) => ({
      name: sanitize(p.name, `param${index + 1}`),
      id: sanitizeParamId(p.id),
    }))
    this.updateParamsShape_()
  },

  updateParamsShape_(this: ParamsBlock): void {
    if (this.getInput(PARAMS_INPUT)) this.removeInput(PARAMS_INPUT, true)
    const input = this.appendDummyInput(PARAMS_INPUT)
    input.appendField('(')
    this.params_.forEach((param, index) => {
      input.appendField(
        new Blockly.FieldImage(MINUS_ICON, 15, 15, '−', () => {
          this.removeParam_(param.id)
        }),
      )
      // Nome do campo POSICIONAL e maiúsculo (`P0`, `P1`, …): o estado salvo
      // precisa casar com `/^[A-Z0-9_]+$/` do sanitizador do projeto. A
      // identidade do parâmetro vive em `param.id` (no extraState), não no campo.
      input.appendField(
        new Blockly.FieldTextInput(param.name, (value: string) => {
          const clean = sanitize(value, param.name)
          // Nomes duplicados gerariam `constructor(x, x)` → SyntaxError ao rodar.
          // Rejeita a renomeação (mantém o nome anterior) se colidir com OUTRO
          // parâmetro deste bloco — `addParam_` já garante unicidade na criação.
          const collides = this.params_.some((p) => p !== param && p.name === clean)
          if (collides) return param.name
          renameReporters(this, param.name, clean)
          param.name = clean
          return clean
        }),
        `P${index}`,
      )
    })
    input.appendField(
      new Blockly.FieldImage(PLUS_ICON, 15, 15, '+', () => {
        this.addParam_()
      }),
    )
    input.appendField(')')
    if (this.getInput(BODY_INPUT)) this.moveInputBefore(PARAMS_INPUT, BODY_INPUT)
  },

  addParam_(this: ParamsBlock): void {
    if (this.params_.length >= MAX_PARAMS) return
    withMutation(this, () => {
      const existing = new Set(this.params_.map((p) => p.name))
      let name = 'param'
      let i = 1
      while (existing.has(name)) {
        i += 1
        name = `param${i}`
      }
      this.params_.push({ name, id: genId() })
      this.updateParamsShape_()
    })
  },

  removeParam_(this: ParamsBlock, id: string): void {
    withMutation(this, () => {
      this.params_ = this.params_.filter((p) => p.id !== id)
      this.updateParamsShape_()
    })
  },
}

function paramsMutatorHelper(this: ParamsBlock): void {
  if (!Array.isArray(this.params_)) this.params_ = []
  this.updateParamsShape_()
}

let registered = false

/** Registra o mutator `sz_params_mutator`. Idempotente. */
export function registerParamsMutator(): void {
  if (registered) return
  Blockly.Extensions.registerMutator(
    'sz_params_mutator',
    PARAMS_MUTATOR_MIXIN,
    paramsMutatorHelper as unknown as () => void,
  )
  registered = true
}
