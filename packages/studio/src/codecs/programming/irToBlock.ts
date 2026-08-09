import type { EventKind, JSExpr, JSStatement } from '#ir'
import { resolveEventTargetKind } from '#ir'
import type { Canvas3DSymbolKind } from '../../three/canvas3dContract'
import type { SerializedBlocklyBlock } from '../types'

export const PROGRAMMING_IR_TO_BLOCK_UNHANDLED = Symbol('programming-ir-to-block-unhandled')

type BlockBuilder = (
  type: string,
  fields?: Record<string, string | number>,
  inputs?: Record<string, SerializedBlocklyBlock[]>,
  id?: string,
  valueInputs?: Record<string, SerializedBlocklyBlock>,
) => SerializedBlocklyBlock

export interface ProgrammingIRToBlockContext {
  ELEMENT_EVENT_BLOCK_TYPES: Partial<Record<EventKind, string>>
  WINDOW_EVENT_BLOCK_TYPES: Partial<Record<EventKind, string>>
  NAMED_ELEMENT_EVENT_KINDS: ReadonlySet<EventKind>
  STYLE_PROP_VALUES: ReadonlySet<string>
  block: BlockBuilder
  statementsToBlocks(
    statements: JSStatement[],
    lifecycleRootsAllowed?: boolean,
  ): SerializedBlocklyBlock[]
  exprToValueBlock(expr: JSExpr): SerializedBlocklyBlock | null
  valueBlocks(map: Record<string, JSExpr>): Record<string, SerializedBlocklyBlock> | null
  rawJSBlock(stmt: JSStatement): SerializedBlocklyBlock
  constructorReference(namespace: string | undefined, className: string): string
  isCanvas3DConstructor(namespace: string | undefined, className: string): boolean
  hasCanvas3DSymbol(rawName: string, kind: Canvas3DSymbolKind): boolean
  asVar(expr: JSExpr | undefined): Extract<JSExpr, { type: 'var' }> | null
  asMemberGet(
    expr: JSExpr | undefined,
    name?: string,
  ): Extract<JSExpr, { type: 'memberGet' }> | null
  recognizeT3dCall(
    stmt: Extract<JSStatement, { type: 'memberCall' }>,
  ): SerializedBlocklyBlock | null
  recognizeT3dSet(stmt: Extract<JSStatement, { type: 'memberSet' }>): SerializedBlocklyBlock | null
  isGuidedDomAttributeName(name: string): boolean
  isGuidedDomProperty(name: string): boolean
  incrementExpr(targetName: string, expr: JSExpr): number | null
  stringExpr(expr: JSExpr): string | null
  varExpr(expr: JSExpr): string | null
  paramsExtra(names: string[]): { params: Array<{ name: string; id: string }> }
  methodToBlock(method: {
    __id?: string
    name: string
    params: string[]
    body: JSStatement[]
    async?: boolean
  }): SerializedBlocklyBlock
  retypeParamsAsArgs(node: SerializedBlocklyBlock, params: Set<string>): void
  callWithArgs(
    type: string,
    fields: Record<string, string | number>,
    args: JSExpr[],
    stmt: JSStatement,
  ): SerializedBlocklyBlock
}

export function programmingStatementIRToBlock(
  stmt: JSStatement,
  context: ProgrammingIRToBlockContext,
): SerializedBlocklyBlock | null | typeof PROGRAMMING_IR_TO_BLOCK_UNHANDLED {
  const {
    ELEMENT_EVENT_BLOCK_TYPES,
    NAMED_ELEMENT_EVENT_KINDS,
    STYLE_PROP_VALUES,
    WINDOW_EVENT_BLOCK_TYPES,
    block,
    callWithArgs,
    constructorReference,
    exprToValueBlock,
    incrementExpr,
    isCanvas3DConstructor,
    isGuidedDomAttributeName,
    isGuidedDomProperty,
    methodToBlock,
    paramsExtra,
    rawJSBlock,
    recognizeT3dCall,
    recognizeT3dSet,
    retypeParamsAsArgs,
    statementsToBlocks,
    stringExpr,
    valueBlocks,
    varExpr,
  } = context
  switch (stmt.type) {
    case 'event': {
      const targetKind = resolveEventTargetKind(stmt.target, stmt.targetKind)
      const targetFields = { TARGET: stmt.target, TARGET_KIND: targetKind }
      if (stmt.event === 'keydown' || stmt.event === 'keyup') {
        return block(
          'sz_js_on_key',
          { ...targetFields, WHEN: stmt.event },
          { DO: statementsToBlocks(stmt.body) },
          stmt.__id,
        )
      }
      if (stmt.event === 'pointermove' || stmt.event === 'mousemove') {
        return block(
          'sz_js_on_mousemove',
          targetFields,
          { DO: statementsToBlocks(stmt.body) },
          stmt.__id,
        )
      }
      if (stmt.event === 'pointerdown' || stmt.event === 'mousedown') {
        return block(
          'sz_js_on_pointer_down',
          targetFields,
          { DO: statementsToBlocks(stmt.body) },
          stmt.__id,
        )
      }
      if (stmt.event === 'pointerup' || stmt.event === 'mouseup') {
        return block(
          'sz_js_on_pointer_up',
          targetFields,
          { DO: statementsToBlocks(stmt.body) },
          stmt.__id,
        )
      }
      if (targetKind === 'document') {
        if (stmt.event === 'click') {
          return block(
            'sz_js_on_click_anywhere',
            {},
            { DO: statementsToBlocks(stmt.body) },
            stmt.__id,
          )
        }
        if (stmt.event === 'fullscreenchange') {
          return block(
            'sz_js_on_fullscreen_change',
            {},
            { DO: statementsToBlocks(stmt.body) },
            stmt.__id,
          )
        }
        return rawJSBlock(stmt)
      }
      if (targetKind === 'window') {
        const blockType = WINDOW_EVENT_BLOCK_TYPES[stmt.event]
        return blockType
          ? block(blockType, {}, { DO: statementsToBlocks(stmt.body) }, stmt.__id)
          : rawJSBlock(stmt)
      }
      const blockType = ELEMENT_EVENT_BLOCK_TYPES[stmt.event]
      if (!blockType) return rawJSBlock(stmt)
      return block(
        blockType,
        { TARGET: stmt.target, TARGET_KIND: targetKind },
        { DO: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    }
    case 'requestFullscreen':
      return block('sz_js_request_fullscreen', {}, {}, stmt.__id)
    case 'exitFullscreen':
      return block('sz_js_exit_fullscreen', {}, {}, stmt.__id)
    case 'toggleFullscreen':
      return block('sz_js_toggle_fullscreen', {}, {}, stmt.__id)
    case 'consoleLog': {
      const text = stringExpr(stmt.value)
      if (text !== null) return block('sz_js_console_log_text', { VALUE: text }, {}, stmt.__id)
      const name = varExpr(stmt.value)
      if (name) return block('sz_js_console_log_var', { NAME: name }, {}, stmt.__id)
      // Qualquer outro valor (juntar texto, objeto, conta…) vai no soquete.
      const value = exprToValueBlock(stmt.value)
      if (value) return block('sz_js_console_log_value', {}, {}, stmt.__id, { VALUE: value })
      return rawJSBlock(stmt)
    }
    case 'alert': {
      const text = stringExpr(stmt.value)
      if (text !== null) return block('sz_js_alert_text', { VALUE: text }, {}, stmt.__id)
      const name = varExpr(stmt.value)
      if (name) return block('sz_js_alert_var', { NAME: name }, {}, stmt.__id)
      return rawJSBlock(stmt)
    }
    case 'getProperty':
      if (!isGuidedDomProperty(stmt.property)) return rawJSBlock(stmt)
      return block(
        'sz_js_get_property',
        {
          PROP: stmt.property,
          TARGET_KIND: stmt.targetKind ?? 'id',
          TARGET: stmt.targetId,
          NAME: stmt.varName,
        },
        {},
        stmt.__id,
      )
    case 'getAttribute':
      return block(
        'sz_js_get_attribute',
        {
          ATTR: stmt.name,
          TARGET_KIND: stmt.targetKind ?? 'id',
          TARGET: stmt.targetId,
          NAME: stmt.varName,
        },
        {},
        stmt.__id,
      )
    case 'setProperty': {
      const kind = stmt.targetKind ?? 'id'
      if (!isGuidedDomProperty(stmt.property)) return rawJSBlock(stmt)
      if (stmt.value.type === 'now')
        return block(
          'sz_js_set_property_calc',
          { PROP: stmt.property, TARGET_KIND: kind, TARGET: stmt.targetId, CALC: stmt.value.kind },
          {},
          stmt.__id,
        )
      const text = stringExpr(stmt.value)
      if (text !== null)
        return block(
          'sz_js_set_property_text',
          { PROP: stmt.property, TARGET_KIND: kind, TARGET: stmt.targetId, VALUE: text },
          {},
          stmt.__id,
        )
      const name = varExpr(stmt.value)
      if (name)
        return block(
          'sz_js_set_property_var',
          { PROP: stmt.property, TARGET_KIND: kind, TARGET: stmt.targetId, NAME: name },
          {},
          stmt.__id,
        )
      // Valor calculado (texto montado, conta, etc.) → bloco com tomada de valor.
      const valueBlock = exprToValueBlock(stmt.value)
      if (valueBlock)
        return block(
          'sz_js_set_property',
          { PROP: stmt.property, TARGET_KIND: kind, TARGET: stmt.targetId },
          {},
          stmt.__id,
          { VALUE: valueBlock },
        )
      return rawJSBlock(stmt)
    }
    case 'setStyle': {
      // 'this' não tem opção no dropdown → mantém como código avançado.
      if (stmt.targetKind === 'this') return rawJSBlock(stmt)
      const valueBlock = exprToValueBlock(stmt.value)
      if (!valueBlock) return rawJSBlock(stmt)
      const known = STYLE_PROP_VALUES.has(stmt.property)
      return block(
        'sz_js_set_style',
        {
          PROP: known ? stmt.property : 'left',
          CUSTOM: known ? '' : stmt.property,
          TARGET_KIND: stmt.targetKind ?? 'id',
          TARGET: stmt.targetId,
        },
        {},
        stmt.__id,
        { VALUE: valueBlock },
      )
    }
    case 'setAttribute': {
      if (stmt.targetKind === 'this' || !isGuidedDomAttributeName(stmt.name)) {
        return rawJSBlock(stmt)
      }
      const valueBlock = exprToValueBlock(stmt.value)
      if (!valueBlock) return rawJSBlock(stmt)
      return block(
        'sz_js_set_attribute',
        { NAME: stmt.name, TARGET_KIND: stmt.targetKind ?? 'id', TARGET: stmt.targetId },
        {},
        stmt.__id,
        { VALUE: valueBlock },
      )
    }
    case 'var': {
      const value = exprToValueBlock(stmt.value)
      if (!value) return rawJSBlock(stmt)
      const type = stmt.kind === 'const' ? 'sz_js_const_create' : 'sz_js_var_create'
      return block(type, { NAME: stmt.name }, {}, stmt.__id, { VALUE: value })
    }
    case 'declareVar':
      return block('sz_js_var_declare', { NAME: stmt.name }, {}, stmt.__id)
    case 'assign': {
      const inc = incrementExpr(stmt.name, stmt.value)
      if (inc !== null)
        return block('sz_js_var_increment', { NAME: stmt.name, DELTA: inc }, {}, stmt.__id)
      const value = exprToValueBlock(stmt.value)
      if (!value) return rawJSBlock(stmt)
      return block('sz_js_var_assign', { NAME: stmt.name }, {}, stmt.__id, { VALUE: value })
    }
    case 'if': {
      const cond = exprToValueBlock(stmt.cond)
      if (!cond) return rawJSBlock(stmt)
      const elseif = stmt.elseif ?? []
      const valueInputs: Record<string, SerializedBlocklyBlock> = { COND: cond }
      const stmtInputs: Record<string, SerializedBlocklyBlock[]> = {
        THEN: statementsToBlocks(stmt.then),
      }
      // Condição de algum "senão se" não representável por bloco (ex.: chamada) →
      // o "Se" inteiro cai em código avançado, igual à condição principal.
      for (const [i, clause] of elseif.entries()) {
        const c = exprToValueBlock(clause.cond)
        if (!c) return rawJSBlock(stmt)
        valueInputs[`ELSEIF_COND${i}`] = c
        stmtInputs[`ELSEIF_THEN${i}`] = statementsToBlocks(clause.then)
      }
      const hasElse = stmt.else !== undefined
      if (hasElse) stmtInputs.ELSE = statementsToBlocks(stmt.else ?? [])
      const b = block('sz_js_if_else', {}, stmtInputs, stmt.__id, valueInputs)
      if (elseif.length > 0 || hasElse) {
        b.extraState = {
          ...(elseif.length > 0 ? { elseIf: elseif.length } : {}),
          ...(hasElse ? { hasElse: true } : {}),
        }
      }
      return b
    }
    case 'repeat': {
      const times = exprToValueBlock(stmt.times)
      return times === null
        ? rawJSBlock(stmt)
        : block('sz_js_repeat', {}, { DO: statementsToBlocks(stmt.body) }, stmt.__id, {
            TIMES: times,
          })
    }
    case 'while': {
      const cond = exprToValueBlock(stmt.cond)
      if (!cond) return rawJSBlock(stmt)
      return block('sz_js_while', {}, { DO: statementsToBlocks(stmt.body) }, stmt.__id, {
        COND: cond,
      })
    }
    case 'doWhile': {
      const cond = exprToValueBlock(stmt.cond)
      if (!cond) return rawJSBlock(stmt)
      return block('sz_js_do_while', {}, { DO: statementsToBlocks(stmt.body) }, stmt.__id, {
        COND: cond,
      })
    }
    case 'break':
      return block('sz_js_break', {}, {}, stmt.__id)
    case 'continue':
      return block('sz_js_continue', {}, {}, stmt.__id)
    case 'forOf':
      return block(
        'sz_js_for_of',
        { ITEM: stmt.itemName, NAME: stmt.iterableVar },
        { DO: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'forRange': {
      const from = exprToValueBlock(stmt.from)
      const to = exprToValueBlock(stmt.to)
      const step = exprToValueBlock(stmt.step)
      if (!from || !to || !step) return rawJSBlock(stmt)
      return block(
        'sz_js_for_range',
        { VAR: stmt.varName },
        { DO: statementsToBlocks(stmt.body) },
        stmt.__id,
        {
          FROM: from,
          TO: to,
          STEP: step,
        },
      )
    }
    case 'tryCatch':
      return block(
        'sz_js_try_catch',
        { ERR: stmt.errorName ?? 'erro' },
        {
          BODY: statementsToBlocks(stmt.body),
          HANDLER: statementsToBlocks(stmt.handler),
          FINALLY: statementsToBlocks(stmt.finalizer ?? []),
        },
        stmt.__id,
      )
    case 'forEach': {
      const array = exprToValueBlock(stmt.arrayExpr)
      if (!array) return rawJSBlock(stmt)
      return block(
        'sz_js_for_each',
        { ITEM: stmt.itemName, INDEX: stmt.indexName ?? '' },
        { DO: statementsToBlocks(stmt.body) },
        stmt.__id,
        { ARRAY: array },
      )
    }
    case 'setTimeout': {
      const vs = valueBlocks({ MS: stmt.delay })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_js_set_timeout', {}, { DO: statementsToBlocks(stmt.body) }, stmt.__id, vs)
    }
    case 'setInterval': {
      const vs = valueBlocks({ MS: stmt.delay })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_js_set_interval', {}, { DO: statementsToBlocks(stmt.body) }, stmt.__id, vs)
    }
    case 'setTimeoutSeconds': {
      const vs = valueBlocks({ S: stmt.delay })
      return vs === null
        ? rawJSBlock(stmt)
        : block(
            'sz_js_set_timeout_seconds',
            {},
            { DO: statementsToBlocks(stmt.body) },
            stmt.__id,
            vs,
          )
    }
    case 'setIntervalSeconds': {
      const vs = valueBlocks({ S: stmt.delay })
      return vs === null
        ? rawJSBlock(stmt)
        : block(
            'sz_js_set_interval_seconds',
            {},
            { DO: statementsToBlocks(stmt.body) },
            stmt.__id,
            vs,
          )
    }
    case 'querySelector':
      return block(
        'sz_js_query_selector',
        { SELECTOR: stmt.selector, NAME: stmt.varName },
        {},
        stmt.__id,
      )
    case 'querySelectorAll':
      return block(
        'sz_js_query_selector_all',
        { SELECTOR: stmt.selector, NAME: stmt.varName },
        {},
        stmt.__id,
      )
    case 'storageSet': {
      // O bloco guarda a chave num campo de texto: só representável se for literal.
      if (stmt.key.type !== 'str') return rawJSBlock(stmt)
      const value = exprToValueBlock(stmt.value)
      if (!value) return rawJSBlock(stmt)
      return block('sz_js_storage_set', { STORE: stmt.store, KEY: stmt.key.value }, {}, stmt.__id, {
        VALUE: value,
      })
    }
    case 'eventMethod':
      return block('sz_js_event_method', { METHOD: stmt.method }, {}, stmt.__id)
    case 'fetchJson': {
      // A URL vai num campo de texto: só representável como bloco se for literal.
      if (stmt.url.type !== 'str') return rawJSBlock(stmt)
      return block(
        'sz_js_fetch_json',
        { URL: stmt.url.value, OK: stmt.okName, ERR: stmt.catchName ?? 'erro' },
        {
          BODY: statementsToBlocks(stmt.body),
          CATCH: statementsToBlocks(stmt.catchBody ?? []),
        },
        stmt.__id,
      )
    }
    case 'getElementById':
      return block('sz_js_get_element_by_id', { ID: stmt.id, NAME: stmt.varName }, {}, stmt.__id)
    case 'classOp':
      return block(
        'sz_js_class_op',
        {
          TARGET_KIND: stmt.targetKind ?? 'id',
          TARGET: stmt.targetId,
          OP: stmt.op,
          CLASS: stmt.className,
        },
        {},
        stmt.__id,
      )
    case 'createElement':
      return block('sz_js_create_element', { TAG: stmt.tag, NAME: stmt.varName }, {}, stmt.__id)
    case 'createElementNS':
      return block('sz_js_create_element_ns', { TAG: stmt.tag, NAME: stmt.varName }, {}, stmt.__id)
    case 'appendChild':
      return block(
        'sz_js_append_child',
        { PARENT: stmt.parentVar, CHILD: stmt.childVar },
        {},
        stmt.__id,
      )
    case 'throwError': {
      const msg = exprToValueBlock(stmt.message)
      if (!msg) return rawJSBlock(stmt)
      return block('sz_js_throw', {}, {}, stmt.__id, { MESSAGE: msg })
    }
    case 'objectAssign':
      return block(
        'sz_js_object_assign',
        { SOURCE: stmt.sourceVar, TARGET: stmt.targetVar },
        {},
        stmt.__id,
      )
    case 'switch': {
      const subject = exprToValueBlock(stmt.subject)
      if (!subject) return rawJSBlock(stmt)
      const caseBlocks: SerializedBlocklyBlock[] = []
      for (const c of stmt.cases) {
        const match = exprToValueBlock(c.match)
        if (!match) return rawJSBlock(stmt)
        caseBlocks.push(
          block('sz_js_case', {}, { DO: statementsToBlocks(c.body) }, c.__id, { MATCH: match }),
        )
      }
      return block(
        'sz_js_switch',
        {},
        { CASES: caseBlocks, DEFAULT: statementsToBlocks(stmt.default ?? []) },
        stmt.__id,
        { SUBJECT: subject },
      )
    }
    case 'setDataset': {
      const value = exprToValueBlock(stmt.value)
      if (!value) return rawJSBlock(stmt)
      return block(
        'sz_js_set_dataset',
        { TARGET_KIND: stmt.targetKind ?? 'id', TARGET: stmt.targetId, KEY: stmt.key },
        {},
        stmt.__id,
        { VALUE: value },
      )
    }
    case 'classDecl': {
      const members: SerializedBlocklyBlock[] = []
      // Construtor só vira bloco se há parâmetros ou corpo (espelha o gerador).
      if ((stmt.ctorParams?.length ?? 0) > 0 || stmt.ctorBody.length > 0) {
        const ctorParams = new Set(stmt.ctorParams ?? [])
        const body = statementsToBlocks(stmt.ctorBody)
        for (const b of body) retypeParamsAsArgs(b, ctorParams)
        // Preserva o `ctorId` no round-trip IR→Blocks: sem isso, recriar a classe
        // a partir do IR daria um id novo ao bloco do construtor e o realce
        // bloco↔código pararia até a próxima edição (o sourcemap usa ctorId).
        const ctor = block('sz_js_constructor', {}, { BODY: body }, stmt.ctorId)
        ctor.extraState = paramsExtra(stmt.ctorParams ?? [])
        members.push(ctor)
      }
      for (const m of stmt.methods) members.push(methodToBlock(m))
      const b = block('sz_js_class', { NAME: stmt.name }, { MEMBERS: members }, stmt.__id)
      if (stmt.superClass) b.extraState = { extends: stmt.superClass }
      return b
    }
    case 'newInstance': {
      // Canvas 3D: com namespace (`new THREE.X`) OU classe de ADDON conhecida sob um
      // projeto three (`new GLTFLoader()`) → o bloco Canvas 3D, com CLASS = referência
      // completa (`THREE.Scene` / `GLTFLoader`). Senão → o bloco genérico do aluno.
      const t3dNamed = isCanvas3DConstructor(stmt.namespace, stmt.className)
      if (t3dNamed) {
        const ref = constructorReference(stmt.namespace, stmt.className)
        return callWithArgs(
          'sz_t3d_new_var',
          { VARNAME: stmt.varName, CLASS: ref },
          stmt.args ?? [],
          stmt,
        )
      }
      return callWithArgs(
        'sz_js_new_var',
        { VARNAME: stmt.varName, CLASS: constructorReference(stmt.namespace, stmt.className) },
        stmt.args ?? [],
        stmt,
      )
    }
    case 'callMethod':
      return callWithArgs(
        'sz_js_call_method',
        { OBJ: stmt.objectVar, METHOD: stmt.method },
        stmt.args ?? [],
        stmt,
      )
    case 'eventHandler': {
      const targetKind = resolveEventTargetKind(stmt.target, stmt.targetKind)
      if (targetKind === 'document' || targetKind === 'window') return rawJSBlock(stmt)
      const canonicalEvent =
        stmt.event === 'mousedown'
          ? 'pointerdown'
          : stmt.event === 'mouseup'
            ? 'pointerup'
            : stmt.event
      if (!NAMED_ELEMENT_EVENT_KINDS.has(canonicalEvent)) return rawJSBlock(stmt)
      return block(
        'sz_js_on_event_named',
        {
          EVENT: canonicalEvent,
          TARGET_KIND: targetKind,
          TARGET: stmt.target,
          HANDLER: stmt.handlerName,
        },
        {},
        stmt.__id,
      )
    }
    case 'setThisProp': {
      const value = exprToValueBlock(stmt.value)
      if (!value) return rawJSBlock(stmt)
      return block('sz_js_set_this_prop', { NAME: stmt.name }, {}, stmt.__id, { VALUE: value })
    }
    case 'setProp': {
      const value = exprToValueBlock(stmt.value)
      if (!value) return rawJSBlock(stmt)
      return block('sz_js_set_prop', { OBJ: stmt.objectVar, NAME: stmt.name }, {}, stmt.__id, {
        VALUE: value,
      })
    }
    case 'memberSet': {
      // Canvas 3D: reconhece obj.visible/castShadow/intensity/background/… →
      // bloco amigável (só em projeto three). Senão, propriedade genérica.
      const t3d = recognizeT3dSet(stmt)
      if (t3d) return t3d
      const obj = exprToValueBlock(stmt.object)
      const value = exprToValueBlock(stmt.value)
      if (!obj || !value) return rawJSBlock(stmt)
      return block('sz_js_member_set', { NAME: stmt.name }, {}, stmt.__id, {
        OBJ: obj,
        VALUE: value,
      })
    }
    case 'onClickAssign': {
      const target = exprToValueBlock(stmt.target)
      if (!target) return rawJSBlock(stmt)
      return block('sz_js_element_onclick', {}, { DO: statementsToBlocks(stmt.body) }, stmt.__id, {
        TARGET: target,
      })
    }
    case 'awaitStmt': {
      const value = exprToValueBlock(stmt.value)
      if (!value) return rawJSBlock(stmt)
      return block('sz_js_await', {}, {}, stmt.__id, { VALUE: value })
    }
    case 'setTimeoutCall': {
      const ms = exprToValueBlock(stmt.delay)
      if (!ms) return rawJSBlock(stmt)
      return block('sz_js_set_timeout_call', { FN: stmt.fn }, {}, stmt.__id, { MS: ms })
    }
    case 'indexSet': {
      const obj = exprToValueBlock(stmt.object)
      const index = exprToValueBlock(stmt.index)
      const value = exprToValueBlock(stmt.value)
      if (!obj || !index || !value) return rawJSBlock(stmt)
      return block('sz_js_index_set', {}, {}, stmt.__id, { OBJ: obj, INDEX: index, VALUE: value })
    }
    case 'memberCall': {
      // Canvas 3D: reconhece scene.add / obj.position.set / renderer.render/… →
      // bloco amigável (só em projeto three). Senão, "chamar método" genérico.
      const t3d = recognizeT3dCall(stmt)
      if (t3d) return t3d
      const obj = exprToValueBlock(stmt.object)
      if (!obj) return rawJSBlock(stmt)
      const valueInputs: Record<string, SerializedBlocklyBlock> = { OBJ: obj }
      for (let i = 0; i < stmt.args.length; i += 1) {
        const vb = exprToValueBlock(stmt.args[i] as JSExpr)
        if (!vb) return rawJSBlock(stmt)
        valueInputs[`ARG${i}`] = vb
      }
      const b = block('sz_js_method_on', { METHOD: stmt.method }, {}, stmt.__id, valueInputs)
      if (stmt.args.length > 0) b.extraState = { items: stmt.args.length }
      return b
    }
    case 'superCall':
      return callWithArgs('sz_js_super_ctor', {}, stmt.args, stmt)
    case 'superMethodCall':
      return callWithArgs('sz_js_super_method', { METHOD: stmt.method }, stmt.args, stmt)
    case 'exprStatement': {
      const value = exprToValueBlock(stmt.value)
      if (!value) return rawJSBlock(stmt)
      return block('sz_js_expr_statement', {}, {}, stmt.__id, { VALUE: value })
    }
    case 'return': {
      // `return;` (saída antecipada) → bloco sem soquete.
      if (stmt.value === undefined) return block('sz_js_return_void', {}, {}, stmt.__id)
      const value = exprToValueBlock(stmt.value)
      if (!value) return rawJSBlock(stmt)
      return block('sz_js_return', {}, {}, stmt.__id, { VALUE: value })
    }
    case 'funcDecl': {
      const params = new Set(stmt.params)
      const body = statementsToBlocks(stmt.body)
      for (const b of body) retypeParamsAsArgs(b, params)
      const blk = block(
        stmt.async ? 'sz_js_function_async' : 'sz_js_function',
        { NAME: stmt.name },
        { BODY: body },
        stmt.__id,
      )
      blk.extraState = paramsExtra(stmt.params)
      return blk
    }
    case 'callFunction':
      return callWithArgs('sz_js_call_function', { NAME: stmt.name }, stmt.args, stmt)
    case 'arrayPush': {
      const value = exprToValueBlock(stmt.value)
      if (!value) return rawJSBlock(stmt)
      return block('sz_js_array_push', { NAME: stmt.arrayVar }, {}, stmt.__id, { VALUE: value })
    }
    case 'arrayRemove':
      return block('sz_js_array_remove', { NAME: stmt.arrayVar, END: stmt.end }, {}, stmt.__id)
    case 'arraySplice': {
      const start = exprToValueBlock(stmt.start)
      const count = exprToValueBlock(stmt.count)
      if (!start || !count) return rawJSBlock(stmt)
      return block('sz_js_array_splice', { NAME: stmt.arrayVar }, {}, stmt.__id, {
        START: start,
        COUNT: count,
      })
    }
    default:
      return PROGRAMMING_IR_TO_BLOCK_UNHANDLED
  }
}

export function programmingExpressionIRToBlock(
  expr: JSExpr,
  context: ProgrammingIRToBlockContext,
): SerializedBlocklyBlock | null | typeof PROGRAMMING_IR_TO_BLOCK_UNHANDLED {
  const {
    asMemberGet,
    asVar,
    block,
    constructorReference,
    exprToValueBlock,
    hasCanvas3DSymbol,
    isCanvas3DConstructor,
    statementsToBlocks,
    valueBlocks,
  } = context
  switch (expr.type) {
    case 'num':
      return block('sz_val_number', { NUM: expr.value })
    case 'str':
      return block('sz_val_text', { TEXT: expr.value })
    case 'color':
      return block('sz_val_color', { COLOR: expr.value })
    case 'colorAlpha':
      return block('sz_val_color_alpha', { COLOR: expr.hex, ALPHA: Math.round(expr.alpha * 100) })
    case 'var':
      return block('sz_val_variable', { NAME: expr.name })
    case 'bool':
      return block('sz_val_bool', { VALUE: expr.value ? 'true' : 'false' })
    case 'null':
      return block('sz_val_null')
    case 'isFullscreen':
      return block('sz_val_is_fullscreen')
    case 'systemDark':
      return block('sz_val_system_dark')
    case 'perfNow':
      return block('sz_val_perf_now')
    case 'dateGet':
      return block('sz_val_date_part', { PART: expr.part })
    case 'global':
      switch (expr.kind) {
        case 'innerWidth':
          return block('sz_val_window_width')
        case 'innerHeight':
          return block('sz_val_window_height')
        case 'devicePixelRatio':
          return block('sz_val_device_pixel_ratio')
      }
      return block('sz_val_window_width')
    case 'canvasDim':
      return block(expr.dim === 'width' ? 'sz_val_canvas_width' : 'sz_val_canvas_height', {
        CTX: expr.ctxVar,
      })
    case 'random': {
      const min = exprToValueBlock(expr.min)
      const max = exprToValueBlock(expr.max)
      return min && max ? block('sz_val_random', {}, {}, undefined, { MIN: min, MAX: max }) : null
    }
    case 'arrayMap': {
      const transform = exprToValueBlock(expr.transform)
      if (!transform) return null
      return block('sz_val_array_map', { ARR: expr.arrayVar, ITEM: expr.itemName }, {}, expr.__id, {
        TRANSFORM: transform,
      })
    }
    case 'hslColor': {
      const vs = valueBlocks({ H: expr.h, S: expr.s, L: expr.l })
      return vs ? block('sz_val_color_hsl', {}, {}, undefined, vs) : null
    }
    case 'randomFloat':
      return block('sz_val_random_float')
    case 'thisRef':
      return block('sz_val_this')
    case 'thisProp':
      return block('sz_val_this_prop', { NAME: expr.name })
    case 'propAccess':
      return block('sz_val_get_prop', { NAME: expr.name, OBJ: expr.objectVar })
    case 'binop': {
      const a = exprToValueBlock(expr.left)
      const b = exprToValueBlock(expr.right)
      if (!a || !b) return null
      // Contas → sz_math_arithmetic; comparações (>, <, ==, ===, …) → sz_val_compare.
      return ['+', '-', '*', '/', '%', '**'].includes(expr.op)
        ? block('sz_math_arithmetic', { OP: expr.op }, {}, undefined, { A: a, B: b })
        : block('sz_val_compare', { OP: expr.op }, {}, undefined, { LEFT: a, RIGHT: b })
    }
    case 'logical': {
      const a = exprToValueBlock(expr.left)
      const b = exprToValueBlock(expr.right)
      return a && b
        ? block('sz_val_logic', { OP: expr.op }, {}, undefined, { LEFT: a, RIGHT: b })
        : null
    }
    case 'logicalNot': {
      const v = exprToValueBlock(expr.value)
      return v ? block('sz_val_not', {}, {}, undefined, { VALUE: v }) : null
    }
    case 'ternary': {
      const cond = exprToValueBlock(expr.condition)
      const whenTrue = exprToValueBlock(expr.whenTrue)
      const whenFalse = exprToValueBlock(expr.whenFalse)
      return cond && whenTrue && whenFalse
        ? block('sz_val_ternary', {}, {}, undefined, {
            COND: cond,
            TRUE_VAL: whenTrue,
            FALSE_VAL: whenFalse,
          })
        : null
    }
    case 'mathUnary': {
      const arg = exprToValueBlock(expr.arg)
      if (!arg) return null
      // Trigonometria tem bloco próprio; arredondamento/raiz ficam em sz_math_function.
      const trig = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan'])
      const type = trig.has(expr.fn) ? 'sz_math_trig' : 'sz_math_function'
      return block(type, { FN: expr.fn }, {}, undefined, { VALUE: arg })
    }
    case 'mathBinary': {
      const a = exprToValueBlock(expr.a)
      const b = exprToValueBlock(expr.b)
      if (!a || !b) return null
      if (expr.fn === 'atan2') {
        return block('sz_math_atan2', {}, {}, undefined, { A: a, B: b })
      }
      if (expr.fn === 'hypot') {
        return block('sz_math_hypot', {}, {}, undefined, { A: a, B: b })
      }
      return block('sz_math_minmax', { FN: expr.fn }, {}, undefined, { A: a, B: b })
    }
    case 'distance': {
      const a = exprToValueBlock(expr.a)
      const b = exprToValueBlock(expr.b)
      return a && b ? block('sz_val_distance', {}, {}, undefined, { OBJ1: a, OBJ2: b }) : null
    }
    case 'mathConst':
      // Só π tem bloco; outras constantes caem em "código avançado".
      return expr.name === 'PI' ? block('sz_val_math_pi') : null
    case 'angleConvert': {
      const arg = exprToValueBlock(expr.arg)
      return arg
        ? block('sz_math_angle_convert', { DIR: expr.dir }, {}, undefined, { VALUE: arg })
        : null
    }
    case 'eventProp':
      return expr.prop === 'key' || expr.prop === 'code'
        ? block('sz_val_event_key', { PROP: expr.prop })
        : block('sz_val_event_pos', { AXIS: expr.prop })
    case 'vec2': {
      const x = exprToValueBlock(expr.x)
      const y = exprToValueBlock(expr.y)
      return x && y ? block('sz_val_vector2d', {}, {}, undefined, { X: x, Y: y }) : null
    }
    case 'vec3': {
      const x = exprToValueBlock(expr.x)
      const y = exprToValueBlock(expr.y)
      const z = exprToValueBlock(expr.z)
      return x && y && z ? block('sz_val_vector3d', {}, {}, undefined, { X: x, Y: y, Z: z }) : null
    }
    case 'array': {
      const valueInputs: Record<string, SerializedBlocklyBlock> = {}
      for (let i = 0; i < expr.items.length; i += 1) {
        const vb = exprToValueBlock(expr.items[i] as JSExpr)
        if (!vb) return null
        valueInputs[`ITEM${i}`] = vb
      }
      const b = block('sz_val_array', {}, {}, expr.__id, valueInputs)
      b.extraState = { items: expr.items.length }
      return b
    }
    case 'arrayLength':
      return block('sz_val_array_length', { NAME: expr.arrayVar })
    case 'concat': {
      const valueInputs: Record<string, SerializedBlocklyBlock> = {}
      for (let i = 0; i < expr.parts.length; i += 1) {
        const vb = exprToValueBlock(expr.parts[i] as JSExpr)
        if (!vb) return null
        valueInputs[`ITEM${i}`] = vb
      }
      const b = block('sz_val_join', {}, {}, expr.__id, valueInputs)
      b.extraState = { items: expr.parts.length }
      return b
    }
    case 'concatArrays': {
      const valueInputs: Record<string, SerializedBlocklyBlock> = {}
      for (let i = 0; i < expr.parts.length; i += 1) {
        const vb = exprToValueBlock(expr.parts[i] as JSExpr)
        if (!vb) return null
        valueInputs[`ITEM${i}`] = vb
      }
      const b = block('sz_val_concat_arrays', {}, {}, expr.__id, valueInputs)
      b.extraState = { items: expr.parts.length }
      return b
    }
    case 'index': {
      const idx = exprToValueBlock(expr.index)
      return idx
        ? block('sz_val_array_index', { NAME: expr.arrayVar }, {}, undefined, { INDEX: idx })
        : null
    }
    case 'arrayLast':
      return block('sz_val_array_last', { NAME: expr.arrayVar })
    case 'arrayFind': {
      const cond = exprToValueBlock(expr.cond)
      return cond
        ? block('sz_val_array_find', { NAME: expr.arrayVar, ITEM: expr.itemName }, {}, expr.__id, {
            COND: cond,
          })
        : null
    }
    case 'arrayFilter': {
      const array = exprToValueBlock(expr.array)
      const cond = exprToValueBlock(expr.cond)
      return array && cond
        ? block('sz_val_array_filter', { ITEM: expr.itemName }, {}, expr.__id, {
            ARRAY: array,
            COND: cond,
          })
        : null
    }
    case 'shuffle':
      return block('sz_val_shuffle', { NAME: expr.arrayVar })
    case 'datasetGet':
      return block('sz_val_dataset', { KEY: expr.key, OBJ: expr.objectVar })
    case 'getElement':
      return block('sz_val_get_element', { ID: expr.id }, {}, expr.__id)
    case 'querySelectorValue':
      return block(
        'sz_val_query_select',
        { MODE: expr.all ? 'all' : 'one', SELECTOR: expr.selector },
        {},
        expr.__id,
      )
    case 'promiseAll': {
      const list = exprToValueBlock(expr.list)
      return list ? block('sz_val_promise_all', {}, {}, expr.__id, { LIST: list }) : null
    }
    case 'newPromise':
      return block(
        'sz_val_new_promise',
        { PARAM: expr.param },
        { DO: statementsToBlocks(expr.body) },
        expr.__id,
      )
    case 'storageGet':
      // A chave vai num campo de texto: só representável como bloco se for literal.
      return expr.key.type === 'str'
        ? block('sz_val_storage_get', { STORE: expr.store, KEY: expr.key.value })
        : null
    case 'classContains':
      return block('sz_val_class_contains', {
        TARGET_KIND: expr.targetKind ?? 'id',
        TARGET: expr.targetId,
        CLASS: expr.className,
      })
    case 'callMethodExpr': {
      const valueInputs: Record<string, SerializedBlocklyBlock> = {}
      for (let i = 0; i < expr.args.length; i += 1) {
        const vb = exprToValueBlock(expr.args[i] as JSExpr)
        if (!vb) return null
        valueInputs[`ARG${i}`] = vb
      }
      const b = block(
        'sz_val_call_method',
        { OBJ: expr.objectVar, METHOD: expr.method },
        {},
        undefined,
        valueInputs,
      )
      if (expr.args.length > 0) b.extraState = { items: expr.args.length }
      return b
    }
    case 'objectLiteral': {
      const fields: Record<string, string> = {}
      const valueInputs: Record<string, SerializedBlocklyBlock> = {}
      for (let i = 0; i < expr.entries.length; i += 1) {
        const e = expr.entries[i] as { key: string; value: JSExpr }
        const vb = exprToValueBlock(e.value)
        if (!vb) return null
        fields[`KEY${i}`] = e.key
        valueInputs[`ITEM${i}`] = vb
      }
      const b = block('sz_val_object', fields, {}, expr.__id, valueInputs)
      b.extraState = { items: expr.entries.length }
      return b
    }
    case 'memberGet': {
      // `cena.children.length` num projeto three → "quantos objetos tem em cena".
      // ANTES do genérico, senão a leitura vira dois memberGet encadeados.
      if (expr.name === 'length' && !expr.optional) {
        const childrenProp = asMemberGet(expr.object, 'children')
        const owner = childrenProp && asVar(childrenProp.object)
        if (owner && hasCanvas3DSymbol(owner.name, 'object3d')) {
          return block('sz_t3d_object_count', { TARGET: owner.name }, {}, expr.__id)
        }
      }
      const obj = exprToValueBlock(expr.object)
      if (!obj) return null
      const type = expr.optional ? 'sz_val_member_get_optional' : 'sz_val_member_get'
      return block(type, { NAME: expr.name }, {}, expr.__id, { OBJ: obj })
    }
    case 'memberCallExpr': {
      const obj = exprToValueBlock(expr.object)
      if (!obj) return null
      const valueInputs: Record<string, SerializedBlocklyBlock> = { OBJ: obj }
      for (let i = 0; i < expr.args.length; i += 1) {
        const vb = exprToValueBlock(expr.args[i] as JSExpr)
        if (!vb) return null
        valueInputs[`ARG${i}`] = vb
      }
      const b = block('sz_val_method_on', { METHOD: expr.method }, {}, expr.__id, valueInputs)
      if (expr.args.length > 0) b.extraState = { items: expr.args.length }
      return b
    }
    case 'newExpr': {
      const valueInputs: Record<string, SerializedBlocklyBlock> = {}
      for (let i = 0; i < expr.args.length; i += 1) {
        const vb = exprToValueBlock(expr.args[i] as JSExpr)
        if (!vb) return null
        valueInputs[`ARG${i}`] = vb
      }
      // Com namespace (`new THREE.X()`) OU classe de ADDON sob three (`new
      // GLTFLoader()`) → o bloco Canvas 3D (CLASS = referência completa); senão → o
      // bloco genérico de classe do aluno.
      const t3dNamed = isCanvas3DConstructor(expr.namespace, expr.className)
      const b = t3dNamed
        ? block(
            'sz_t3d_new',
            { CLASS: constructorReference(expr.namespace, expr.className) },
            {},
            expr.__id,
            valueInputs,
          )
        : block(
            'sz_val_new',
            { CLASS: constructorReference(expr.namespace, expr.className) },
            {},
            expr.__id,
            valueInputs,
          )
      if (expr.args.length > 0) b.extraState = { items: expr.args.length }
      return b
    }
    case 'call': {
      const valueInputs: Record<string, SerializedBlocklyBlock> = {}
      for (let i = 0; i < expr.args.length; i += 1) {
        const vb = exprToValueBlock(expr.args[i] as JSExpr)
        if (!vb) return null
        valueInputs[`ARG${i}`] = vb
      }
      const b = block('sz_val_call_function', { NAME: expr.name }, {}, undefined, valueInputs)
      if (expr.args.length > 0) b.extraState = { items: expr.args.length }
      return b
    }
    case 'objectOp': {
      const obj = exprToValueBlock(expr.object)
      if (!obj) return null
      return block('sz_val_object_op', { OP: expr.op }, {}, expr.__id, { OBJ: obj })
    }
    case 'indexGet': {
      const obj = exprToValueBlock(expr.object)
      const idx = exprToValueBlock(expr.index)
      if (!obj || !idx) return null
      return block('sz_val_index_get', {}, {}, expr.__id, { OBJ: obj, INDEX: idx })
    }
    default:
      return PROGRAMMING_IR_TO_BLOCK_UNHANDLED
  }
}
