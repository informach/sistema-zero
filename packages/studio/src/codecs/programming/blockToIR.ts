import type * as Blockly from 'blockly/core'
import type { JSExpr, JSStatement } from '#ir'
import { normalizeJsonData } from '../../blockly/fields/jsonData'

export const PROGRAMMING_CODEC_UNHANDLED = Symbol('programming-codec-unhandled')

export interface ProgrammingBlockToIRContext {
  f(block: Blockly.Block, name: string): string
  fn(block: Blockly.Block, name: string, fallback?: number): number
  constructorReference(rawReference: string): { namespace?: string; className: string }
  targetKindField(block: Blockly.Block): {
    targetKind?: 'var' | 'document' | 'window'
  }
  eventTargetFields(
    block: Blockly.Block,
    fallback: 'document' | 'window',
  ): { target: string; targetKind: 'id' | 'var' | 'document' | 'window' }
  classTargetKind(block: Blockly.Block): { targetKind?: 'var' | 'this' }
  getStatementChildren(block: Blockly.Block, name: string, seen: Set<string>): JSStatement[]
  getSwitchCases(
    block: Blockly.Block,
    name: string,
    seen: Set<string>,
  ): Array<{ __id?: string; match: JSExpr; body: JSStatement[] }>
  exprInput(block: Blockly.Block, name: string, fallback: JSExpr): JSExpr
  getArgs(block: Blockly.Block): JSExpr[]
  getArrayItems(block: Blockly.Block): JSExpr[]
  getObjectEntries(block: Blockly.Block): Array<{ key: string; value: JSExpr }>
  getClassMembers(
    block: Blockly.Block,
    seen: Set<string>,
  ): {
    ctorParams: string[]
    ctorId?: string
    ctorBody: JSStatement[]
    methods: Array<{
      __id?: string
      name: string
      params: string[]
      body: JSStatement[]
      async?: boolean
    }>
  }
  getParamNames(block: Blockly.Block): string[]
  getSuperName(block: Blockly.Block): string
}

export type ProgrammingStatementRoutedNode = { kind: 'js'; value: JSStatement }

export function programmingBlockToExpression(
  block: Blockly.Block,
  context: ProgrammingBlockToIRContext,
): JSExpr | null | typeof PROGRAMMING_CODEC_UNHANDLED {
  const {
    classTargetKind,
    constructorReference,
    exprInput,
    f,
    fn,
    getArgs,
    getArrayItems,
    getObjectEntries,
    getStatementChildren,
  } = context
  switch (block.type) {
    case 'sz_val_number':
      return { type: 'num', value: fn(block, 'NUM') }
    case 'sz_val_text':
      return { type: 'str', value: f(block, 'TEXT') }
    case 'sz_val_color':
      return { type: 'color', value: f(block, 'COLOR') }
    case 'sz_val_color_alpha':
      return { type: 'colorAlpha', hex: f(block, 'COLOR'), alpha: fn(block, 'ALPHA') / 100 }
    case 'sz_val_variable':
      return { type: 'var', name: f(block, 'NAME') }
    case 'sz_val_bool':
      return { type: 'bool', value: f(block, 'VALUE') === 'true' }
    case 'sz_val_null':
      return { type: 'null' }
    case 'sz_val_is_fullscreen':
      return { type: 'isFullscreen' }
    case 'sz_val_device_pixel_ratio':
      return { type: 'global', kind: 'devicePixelRatio' }
    case 'sz_val_system_dark':
      return { type: 'systemDark' }
    case 'sz_val_system_reduced_motion':
      return { type: 'systemReducedMotion' }
    case 'sz_val_perf_now':
      return { type: 'perfNow' }
    case 'sz_val_date_part':
      return {
        type: 'dateGet',
        part: f(block, 'PART') as
          | 'year'
          | 'month'
          | 'dayOfMonth'
          | 'weekday'
          | 'hours'
          | 'minutes'
          | 'seconds'
          | 'ms',
      }
    case 'sz_val_window_width':
      return { type: 'global', kind: 'innerWidth' }
    case 'sz_val_window_height':
      return { type: 'global', kind: 'innerHeight' }
    case 'sz_val_canvas_width':
      return { type: 'canvasDim', ctxVar: f(block, 'CTX'), dim: 'width' }
    case 'sz_val_canvas_height':
      return { type: 'canvasDim', ctxVar: f(block, 'CTX'), dim: 'height' }
    case 'sz_val_random':
      return {
        type: 'random',
        min: exprInput(block, 'MIN', { type: 'num', value: 0 }),
        max: exprInput(block, 'MAX', { type: 'num', value: 100 }),
      }
    case 'sz_val_color_hsl':
      return {
        type: 'hslColor',
        h: exprInput(block, 'H', { type: 'num', value: 0 }),
        s: exprInput(block, 'S', { type: 'num', value: 50 }),
        l: exprInput(block, 'L', { type: 'num', value: 50 }),
      }
    case 'sz_val_random_float':
      return { type: 'randomFloat' }
    case 'sz_math_arithmetic':
      return {
        type: 'binop',
        op: f(block, 'OP') as '+' | '-' | '*' | '/' | '%' | '**',
        left: exprInput(block, 'A', { type: 'num', value: 0 }),
        right: exprInput(block, 'B', { type: 'num', value: 0 }),
      }
    case 'sz_val_compare':
      return {
        type: 'binop',
        op: f(block, 'OP') as '>' | '<' | '>=' | '<=' | '==' | '!=' | '===' | '!==',
        left: exprInput(block, 'LEFT', { type: 'num', value: 0 }),
        right: exprInput(block, 'RIGHT', { type: 'num', value: 0 }),
      }
    case 'sz_val_logic':
      return {
        type: 'logical',
        op: f(block, 'OP') as '&&' | '||',
        left: exprInput(block, 'LEFT', { type: 'bool', value: true }),
        right: exprInput(block, 'RIGHT', { type: 'bool', value: true }),
      }
    case 'sz_val_not':
      return {
        type: 'logicalNot',
        value: exprInput(block, 'VALUE', { type: 'bool', value: true }),
      }
    case 'sz_val_ternary':
      return {
        type: 'ternary',
        condition: exprInput(block, 'COND', { type: 'bool', value: true }),
        whenTrue: exprInput(block, 'TRUE_VAL', { type: 'num', value: 0 }),
        whenFalse: exprInput(block, 'FALSE_VAL', { type: 'num', value: 0 }),
      }
    case 'sz_math_function':
      return {
        type: 'mathUnary',
        fn: f(block, 'FN') as 'round' | 'floor' | 'ceil' | 'abs' | 'sqrt' | 'sign',
        arg: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
      }
    case 'sz_val_array_map':
      return {
        type: 'arrayMap',
        arrayVar: f(block, 'ARR'),
        itemName: f(block, 'ITEM') || 'item',
        transform: exprInput(block, 'TRANSFORM', { type: 'num', value: 0 }),
      }
    case 'sz_math_trig':
      return {
        type: 'mathUnary',
        fn: f(block, 'FN') as 'sin' | 'cos' | 'tan' | 'asin' | 'acos' | 'atan',
        arg: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
      }
    case 'sz_math_minmax':
      return {
        type: 'mathBinary',
        fn: f(block, 'FN') as 'min' | 'max',
        a: exprInput(block, 'A', { type: 'num', value: 0 }),
        b: exprInput(block, 'B', { type: 'num', value: 0 }),
      }
    case 'sz_math_atan2':
      return {
        type: 'mathBinary',
        fn: 'atan2',
        a: exprInput(block, 'A', { type: 'num', value: 0 }),
        b: exprInput(block, 'B', { type: 'num', value: 0 }),
      }
    case 'sz_math_hypot':
      return {
        type: 'mathBinary',
        fn: 'hypot',
        a: exprInput(block, 'A', { type: 'num', value: 0 }),
        b: exprInput(block, 'B', { type: 'num', value: 0 }),
      }
    case 'sz_val_distance':
      return {
        type: 'distance',
        a: exprInput(block, 'OBJ1', { type: 'var', name: 'player' }),
        b: exprInput(block, 'OBJ2', { type: 'var', name: 'enemy' }),
      }
    case 'sz_math_angle_convert':
      return {
        type: 'angleConvert',
        dir: f(block, 'DIR') as 'degToRad' | 'radToDeg',
        arg: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
      }
    case 'sz_val_math_pi':
      return { type: 'mathConst', name: 'PI' }
    case 'sz_val_event_pos':
      return { type: 'eventProp', prop: f(block, 'AXIS') as 'clientX' | 'clientY' }
    case 'sz_val_event_key':
      return { type: 'eventProp', prop: f(block, 'PROP') as 'key' | 'code' }
    case 'sz_val_event_pointer_id':
      return { type: 'eventProp', prop: 'pointerId' }
    case 'sz_val_vector2d':
      return {
        type: 'vec2',
        x: exprInput(block, 'X', { type: 'num', value: 0 }),
        y: exprInput(block, 'Y', { type: 'num', value: 0 }),
      }
    case 'sz_val_vector3d':
      return {
        type: 'vec3',
        x: exprInput(block, 'X', { type: 'num', value: 0 }),
        y: exprInput(block, 'Y', { type: 'num', value: 0 }),
        z: exprInput(block, 'Z', { type: 'num', value: 0 }),
      }
    case 'sz_val_array':
      return { type: 'array', items: getArrayItems(block) }
    case 'sz_val_array_length':
      return { type: 'arrayLength', arrayVar: f(block, 'NAME') }
    case 'sz_val_this_prop':
      return { type: 'thisProp', name: f(block, 'NAME') }
    case 'sz_val_get_prop':
      return { type: 'propAccess', objectVar: f(block, 'OBJ'), name: f(block, 'NAME') }
    case 'sz_val_call_method':
      return {
        type: 'callMethodExpr',
        objectVar: f(block, 'OBJ'),
        method: f(block, 'METHOD'),
        args: getArgs(block),
      }
    case 'sz_val_object':
      return { type: 'objectLiteral', entries: getObjectEntries(block) }
    case 'sz_val_member_get':
      return {
        type: 'memberGet',
        object: exprInput(block, 'OBJ', { type: 'var', name: 'objeto' }),
        name: f(block, 'NAME'),
      }
    case 'sz_val_member_get_optional':
      return {
        type: 'memberGet',
        object: exprInput(block, 'OBJ', { type: 'var', name: 'objeto' }),
        name: f(block, 'NAME'),
        optional: true,
      }
    case 'sz_val_method_on':
      return {
        type: 'memberCallExpr',
        object: exprInput(block, 'OBJ', { type: 'var', name: 'objeto' }),
        method: f(block, 'METHOD'),
        args: getArgs(block),
      }
    case 'sz_val_new': {
      const reference = constructorReference(f(block, 'CLASS'))
      return {
        type: 'newExpr',
        ...reference,
        args: getArgs(block),
      }
    }
    case 'sz_val_object_op':
      return {
        type: 'objectOp',
        op: (f(block, 'OP') || 'keys') as 'keys' | 'values' | 'entries',
        object: exprInput(block, 'OBJ', { type: 'var', name: 'objeto' }),
      }
    case 'sz_val_index_get':
      return {
        type: 'indexGet',
        object: exprInput(block, 'OBJ', { type: 'var', name: 'lista' }),
        index: exprInput(block, 'INDEX', { type: 'num', value: 0 }),
      }
    case 'sz_val_call_function':
      return { type: 'call', name: f(block, 'NAME'), args: getArgs(block) }
    case 'sz_val_join':
      return { type: 'concat', parts: getArrayItems(block) }
    case 'sz_val_array_index':
      return {
        type: 'index',
        arrayVar: f(block, 'NAME'),
        index: exprInput(block, 'INDEX', { type: 'num', value: 0 }),
      }
    case 'sz_val_array_last':
      return { type: 'arrayLast', arrayVar: f(block, 'NAME') }
    case 'sz_val_array_find':
      return {
        type: 'arrayFind',
        arrayVar: f(block, 'NAME'),
        itemName: f(block, 'ITEM'),
        cond: exprInput(block, 'COND', { type: 'bool', value: true }),
      }
    case 'sz_val_array_filter':
      return {
        type: 'arrayFilter',
        array: exprInput(block, 'ARRAY', { type: 'var', name: 'lista' }),
        itemName: f(block, 'ITEM'),
        cond: exprInput(block, 'COND', { type: 'bool', value: true }),
      }
    case 'sz_val_concat_arrays':
      return { type: 'concatArrays', parts: getArrayItems(block) }
    case 'sz_val_shuffle':
      return { type: 'shuffle', arrayVar: f(block, 'NAME') }
    case 'sz_val_dataset':
      return { type: 'datasetGet', objectVar: f(block, 'OBJ'), key: f(block, 'KEY') }
    case 'sz_val_get_element':
      return { type: 'getElement', id: f(block, 'ID') }
    case 'sz_val_query_select':
      return {
        type: 'querySelectorValue',
        selector: f(block, 'SELECTOR'),
        all: f(block, 'MODE') !== 'one',
      }
    case 'sz_val_promise_all':
      return { type: 'promiseAll', list: exprInput(block, 'LIST', { type: 'array', items: [] }) }
    case 'sz_val_new_promise':
      return {
        type: 'newPromise',
        param: f(block, 'PARAM'),
        body: getStatementChildren(block, 'DO', new Set()),
      }
    case 'sz_val_storage_get':
      return {
        type: 'storageGet',
        store: f(block, 'STORE') === 'session' ? 'session' : 'local',
        key: { type: 'str', value: f(block, 'KEY') },
      }
    case 'sz_val_storage_get_dynamic':
      return {
        type: 'storageGet',
        store: f(block, 'STORE') === 'session' ? 'session' : 'local',
        key: exprInput(block, 'KEY', { type: 'str', value: '' }),
      }
    case 'sz_val_json_data':
      return { type: 'jsonLiteral', json: normalizeJsonData(f(block, 'JSON'))?.canonical ?? '{}' }
    case 'sz_val_json_parse':
      return { type: 'jsonParse', value: exprInput(block, 'VALUE', { type: 'str', value: '{}' }) }
    case 'sz_val_json_stringify':
      return { type: 'jsonStringify', value: exprInput(block, 'VALUE', { type: 'null' }) }
    case 'sz_val_gamepad_connected':
      return {
        type: 'gamepadConnected',
        index: exprInput(block, 'INDEX', { type: 'num', value: 0 }),
      }
    case 'sz_val_gamepad_axis':
      return {
        type: 'gamepadAxis',
        index: exprInput(block, 'INDEX', { type: 'num', value: 0 }),
        axis: exprInput(block, 'AXIS', { type: 'num', value: 0 }),
      }
    case 'sz_val_gamepad_button':
      return {
        type: 'gamepadButton',
        index: exprInput(block, 'INDEX', { type: 'num', value: 0 }),
        button: exprInput(block, 'BUTTON', { type: 'num', value: 0 }),
      }
    case 'sz_val_class_contains':
      return {
        type: 'classContains',
        targetId: f(block, 'TARGET'),
        ...classTargetKind(block),
        className: f(block, 'CLASS'),
      }
    case 'sz_val_this':
      return { type: 'thisRef' }
    case 'sz_val_arg':
      // Relator de parâmetro: no IR é apenas uma variável (mesmo identificador).
      return { type: 'var', name: f(block, 'NAME') }
    default:
      return PROGRAMMING_CODEC_UNHANDLED
  }
}

export function programmingBlockToStatement(
  block: Blockly.Block,
  seen: Set<string>,
  context: ProgrammingBlockToIRContext,
): ProgrammingStatementRoutedNode | null | typeof PROGRAMMING_CODEC_UNHANDLED {
  const {
    classTargetKind,
    constructorReference,
    eventTargetFields,
    exprInput,
    f,
    fn,
    getArgs,
    getClassMembers,
    getParamNames,
    getStatementChildren,
    getSuperName,
    getSwitchCases,
    targetKindField,
  } = context
  const elementTargetKindField = (target: Blockly.Block): { targetKind?: 'var' } =>
    targetKindField(target).targetKind === 'var' ? { targetKind: 'var' } : {}
  switch (block.type) {
    case 'sz_js_on_click':
      return {
        kind: 'js',
        value: {
          type: 'event',
          target: f(block, 'TARGET'),
          ...targetKindField(block),
          event: 'click',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_click_anywhere':
      return {
        kind: 'js',
        value: {
          type: 'event',
          target: 'document',
          targetKind: 'document',
          event: 'click',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_key':
      return {
        kind: 'js',
        value: {
          type: 'event',
          ...eventTargetFields(block, 'document'),
          event: f(block, 'WHEN') as 'keydown' | 'keyup',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_mousemove':
      return {
        kind: 'js',
        value: {
          type: 'event',
          ...eventTargetFields(block, 'document'),
          event: 'pointermove',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_pointer_down':
      return {
        kind: 'js',
        value: {
          type: 'event',
          ...eventTargetFields(block, 'window'),
          event: 'pointerdown',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_pointer_up':
      return {
        kind: 'js',
        value: {
          type: 'event',
          ...eventTargetFields(block, 'window'),
          event: 'pointerup',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_load':
      return {
        kind: 'js',
        value: {
          type: 'event',
          target: 'window',
          targetKind: 'window',
          event: 'load',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_resize':
      return {
        kind: 'js',
        value: {
          type: 'event',
          target: 'window',
          targetKind: 'window',
          event: 'resize',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_context_menu':
      return {
        kind: 'js',
        value: {
          type: 'event',
          target: 'window',
          targetKind: 'window',
          event: 'contextmenu',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_blur':
      return {
        kind: 'js',
        value: {
          type: 'event',
          target: 'window',
          targetKind: 'window',
          event: 'blur',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_fullscreen_change':
      return {
        kind: 'js',
        value: {
          type: 'event',
          target: 'document',
          targetKind: 'document',
          event: 'fullscreenchange',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_request_fullscreen':
      return { kind: 'js', value: { type: 'requestFullscreen' } }
    case 'sz_js_exit_fullscreen':
      return { kind: 'js', value: { type: 'exitFullscreen' } }
    case 'sz_js_toggle_fullscreen':
      return { kind: 'js', value: { type: 'toggleFullscreen' } }
    case 'sz_js_array_push':
      return {
        kind: 'js',
        value: {
          type: 'arrayPush',
          arrayVar: f(block, 'NAME'),
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_js_array_remove':
      return {
        kind: 'js',
        value: {
          type: 'arrayRemove',
          arrayVar: f(block, 'NAME'),
          end: f(block, 'END') as 'pop' | 'shift',
        },
      }
    case 'sz_js_array_splice':
      return {
        kind: 'js',
        value: {
          type: 'arraySplice',
          arrayVar: f(block, 'NAME'),
          start: exprInput(block, 'START', { type: 'num', value: 0 }),
          count: exprInput(block, 'COUNT', { type: 'num', value: 1 }),
        },
      }
    case 'sz_js_console_log_text':
      return {
        kind: 'js',
        value: { type: 'consoleLog', value: { type: 'str', value: f(block, 'VALUE') } },
      }
    case 'sz_js_console_log_var':
      return {
        kind: 'js',
        value: { type: 'consoleLog', value: { type: 'var', name: f(block, 'NAME') } },
      }
    case 'sz_js_console_log_value':
      return {
        kind: 'js',
        value: { type: 'consoleLog', value: exprInput(block, 'VALUE', { type: 'str', value: '' }) },
      }
    case 'sz_js_alert_text':
      return {
        kind: 'js',
        value: { type: 'alert', value: { type: 'str', value: f(block, 'VALUE') } },
      }
    case 'sz_js_alert_var':
      return {
        kind: 'js',
        value: { type: 'alert', value: { type: 'var', name: f(block, 'NAME') } },
      }
    case 'sz_js_get_property':
      return {
        kind: 'js',
        value: {
          type: 'getProperty',
          targetId: f(block, 'TARGET'),
          ...elementTargetKindField(block),
          property: f(block, 'PROP') as 'textContent' | 'value',
          varName: f(block, 'NAME'),
        },
      }
    case 'sz_js_set_property_text':
      return {
        kind: 'js',
        value: {
          type: 'setProperty',
          targetId: f(block, 'TARGET'),
          ...elementTargetKindField(block),
          property: f(block, 'PROP') as 'textContent' | 'value',
          value: { type: 'str', value: f(block, 'VALUE') },
        },
      }
    case 'sz_js_set_property_var':
      return {
        kind: 'js',
        value: {
          type: 'setProperty',
          targetId: f(block, 'TARGET'),
          ...elementTargetKindField(block),
          property: f(block, 'PROP') as 'textContent' | 'value',
          value: { type: 'var', name: f(block, 'NAME') },
        },
      }
    case 'sz_js_set_property_calc':
      return {
        kind: 'js',
        value: {
          type: 'setProperty',
          targetId: f(block, 'TARGET'),
          ...elementTargetKindField(block),
          property: f(block, 'PROP') as 'textContent' | 'value',
          value: { type: 'now', kind: f(block, 'CALC') as 'year' | 'date' | 'time' },
        },
      }
    case 'sz_js_set_property':
      return {
        kind: 'js',
        value: {
          type: 'setProperty',
          targetId: f(block, 'TARGET'),
          ...elementTargetKindField(block),
          property: f(block, 'PROP') as 'textContent' | 'value' | 'innerHTML',
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_js_set_style': {
      const custom = f(block, 'CUSTOM').trim()
      return {
        kind: 'js',
        value: {
          type: 'setStyle',
          targetId: f(block, 'TARGET'),
          ...elementTargetKindField(block),
          property: custom || f(block, 'PROP') || 'left',
          value: exprInput(block, 'VALUE', { type: 'str', value: '' }),
        },
      }
    }
    case 'sz_js_set_style_text':
      return {
        kind: 'js',
        value: {
          type: 'setStyle',
          targetId: f(block, 'TARGET'),
          ...elementTargetKindField(block),
          property: 'cssText',
          value: exprInput(block, 'VALUE', { type: 'str', value: '' }),
        },
      }
    case 'sz_js_set_attribute':
      return {
        kind: 'js',
        value: {
          type: 'setAttribute',
          targetId: f(block, 'TARGET'),
          ...elementTargetKindField(block),
          name: f(block, 'NAME') || 'stroke',
          value: exprInput(block, 'VALUE', { type: 'str', value: '' }),
        },
      }
    case 'sz_js_set_text':
      return {
        kind: 'js',
        value: {
          type: 'setProperty',
          targetId: f(block, 'TARGET'),
          targetKind: 'id',
          property: 'textContent',
          value: { type: 'str', value: f(block, 'VALUE') },
        },
      }
    case 'sz_js_var_declare':
      return {
        kind: 'js',
        value: { type: 'declareVar', name: f(block, 'NAME') },
      }
    case 'sz_js_var_create':
      return {
        kind: 'js',
        value: {
          type: 'var',
          name: f(block, 'NAME'),
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_js_const_create':
      return {
        kind: 'js',
        value: {
          type: 'var',
          kind: 'const',
          name: f(block, 'NAME'),
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_js_var_assign':
      return {
        kind: 'js',
        value: {
          type: 'assign',
          name: f(block, 'NAME'),
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_js_var_increment': {
      // DELTA negativo relê como `x = x - |n|` (não `x = x + -n`): é a forma
      // canônica que o gerador emite p/ `x -= n`/`x = x - n`, então o
      // round-trip de blocos fica byte-estável com o caminho textual.
      const delta = fn(block, 'DELTA', 1)
      const name = f(block, 'NAME')
      return {
        kind: 'js',
        value: {
          type: 'assign',
          name,
          value: {
            type: 'binop',
            op: delta < 0 ? '-' : '+',
            left: { type: 'var', name },
            right: { type: 'num', value: delta < 0 ? -delta : delta },
          },
        },
      }
    }
    case 'sz_js_if_else': {
      // Ramos "senão se" dinâmicos do mutator: lê ELSEIF_COND{i}/ELSEIF_THEN{i}
      // enquanto existirem; o "senão" (ELSE) só entra se o input existir.
      const elseif: Array<{ cond: JSExpr; then: JSStatement[] }> = []
      for (let i = 0; block.getInput(`ELSEIF_COND${i}`); i += 1) {
        elseif.push({
          cond: exprInput(block, `ELSEIF_COND${i}`, { type: 'bool', value: true }),
          then: getStatementChildren(block, `ELSEIF_THEN${i}`, seen),
        })
      }
      const hasElse = Boolean(block.getInput('ELSE'))
      return {
        kind: 'js',
        value: {
          type: 'if',
          cond: exprInput(block, 'COND', { type: 'bool', value: true }),
          then: getStatementChildren(block, 'THEN', seen),
          ...(elseif.length > 0 ? { elseif } : {}),
          ...(hasElse ? { else: getStatementChildren(block, 'ELSE', seen) } : {}),
        },
      }
    }
    case 'sz_js_repeat':
      return {
        kind: 'js',
        value: {
          type: 'repeat',
          times: exprInput(block, 'TIMES', { type: 'num', value: 5 }),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_while':
      return {
        kind: 'js',
        value: {
          type: 'while',
          cond: exprInput(block, 'COND', { type: 'bool', value: true }),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_do_while':
      return {
        kind: 'js',
        value: {
          type: 'doWhile',
          cond: exprInput(block, 'COND', { type: 'bool', value: true }),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_break':
      return { kind: 'js', value: { type: 'break' } }
    case 'sz_js_continue':
      return { kind: 'js', value: { type: 'continue' } }
    case 'sz_js_for_of':
      return {
        kind: 'js',
        value: {
          type: 'forOf',
          itemName: f(block, 'ITEM') || 'item',
          iterableVar: f(block, 'NAME'),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_for_range':
      return {
        kind: 'js',
        value: {
          type: 'forRange',
          varName: f(block, 'VAR') || 'i',
          from: exprInput(block, 'FROM', { type: 'num', value: 0 }),
          to: exprInput(block, 'TO', { type: 'num', value: 10 }),
          step: exprInput(block, 'STEP', { type: 'num', value: 1 }),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_try_catch': {
      const errorName = f(block, 'ERR').trim()
      const finalizer = getStatementChildren(block, 'FINALLY', seen)
      return {
        kind: 'js',
        value: {
          type: 'tryCatch',
          body: getStatementChildren(block, 'BODY', seen),
          ...(errorName ? { errorName } : {}),
          handler: getStatementChildren(block, 'HANDLER', seen),
          ...(finalizer.length ? { finalizer } : {}),
        },
      }
    }
    case 'sz_js_for_each': {
      const indexName = f(block, 'INDEX').trim()
      return {
        kind: 'js',
        value: {
          type: 'forEach',
          arrayExpr: exprInput(block, 'ARRAY', { type: 'var', name: 'lista' }),
          itemName: f(block, 'ITEM'),
          ...(indexName ? { indexName } : {}),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    }
    case 'sz_js_set_timeout':
      return {
        kind: 'js',
        value: {
          type: 'setTimeout',
          delay: exprInput(block, 'MS', { type: 'num', value: 1000 }),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_set_interval':
      return {
        kind: 'js',
        value: {
          type: 'setInterval',
          delay: exprInput(block, 'MS', { type: 'num', value: 1000 }),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_set_timeout_seconds':
      return {
        kind: 'js',
        value: {
          type: 'setTimeoutSeconds',
          delay: exprInput(block, 'S', { type: 'num', value: 1 }),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_set_interval_seconds':
      return {
        kind: 'js',
        value: {
          type: 'setIntervalSeconds',
          delay: exprInput(block, 'S', { type: 'num', value: 1 }),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_mouseover':
      return {
        kind: 'js',
        value: {
          type: 'event',
          target: f(block, 'TARGET'),
          ...targetKindField(block),
          event: 'mouseover',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_submit':
      return {
        kind: 'js',
        value: {
          type: 'event',
          target: f(block, 'TARGET'),
          ...targetKindField(block),
          event: 'submit',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_input':
      return {
        kind: 'js',
        value: {
          type: 'event',
          target: f(block, 'TARGET'),
          ...targetKindField(block),
          event: 'input',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_query_selector':
      return {
        kind: 'js',
        value: {
          type: 'querySelector',
          selector: f(block, 'SELECTOR'),
          varName: f(block, 'NAME'),
        },
      }
    case 'sz_js_query_selector_all':
      return {
        kind: 'js',
        value: {
          type: 'querySelectorAll',
          selector: f(block, 'SELECTOR'),
          varName: f(block, 'NAME'),
        },
      }
    case 'sz_js_storage_set':
      return {
        kind: 'js',
        value: {
          type: 'storageSet',
          store: f(block, 'STORE') === 'session' ? 'session' : 'local',
          key: { type: 'str', value: f(block, 'KEY') },
          value: exprInput(block, 'VALUE', { type: 'str', value: '' }),
        },
      }
    case 'sz_js_storage_remove':
      return {
        kind: 'js',
        value: {
          type: 'storageRemove',
          store: f(block, 'STORE') === 'session' ? 'session' : 'local',
          key: { type: 'str', value: f(block, 'KEY') },
        },
      }
    case 'sz_js_storage_set_dynamic':
      return {
        kind: 'js',
        value: {
          type: 'storageSet',
          store: f(block, 'STORE') === 'session' ? 'session' : 'local',
          key: exprInput(block, 'KEY', { type: 'str', value: '' }),
          value: exprInput(block, 'VALUE', { type: 'str', value: '' }),
        },
      }
    case 'sz_js_storage_remove_dynamic':
      return {
        kind: 'js',
        value: {
          type: 'storageRemove',
          store: f(block, 'STORE') === 'session' ? 'session' : 'local',
          key: exprInput(block, 'KEY', { type: 'str', value: '' }),
        },
      }
    case 'sz_js_event_method':
      return {
        kind: 'js',
        value: {
          type: 'eventMethod',
          method: f(block, 'METHOD') === 'stopPropagation' ? 'stopPropagation' : 'preventDefault',
        },
      }
    case 'sz_js_fetch_json': {
      const catchBody = getStatementChildren(block, 'CATCH', seen)
      const catchName = f(block, 'ERR').trim()
      return {
        kind: 'js',
        value: {
          type: 'fetchJson',
          url: { type: 'str', value: f(block, 'URL') },
          okName: f(block, 'OK') || 'dados',
          body: getStatementChildren(block, 'BODY', seen),
          ...(catchBody.length ? { catchName: catchName || 'erro', catchBody } : {}),
        },
      }
    }
    case 'sz_js_get_element_by_id':
      return {
        kind: 'js',
        value: {
          type: 'getElementById',
          id: f(block, 'ID'),
          varName: f(block, 'NAME'),
        },
      }
    case 'sz_js_class_op':
      return {
        kind: 'js',
        value: {
          type: 'classOp',
          targetId: f(block, 'TARGET'),
          ...classTargetKind(block),
          op: f(block, 'OP') as 'add' | 'remove' | 'toggle',
          className: f(block, 'CLASS'),
        },
      }
    case 'sz_js_on_event_named':
      return {
        kind: 'js',
        value: {
          type: 'eventHandler',
          target: f(block, 'TARGET'),
          ...targetKindField(block),
          event: f(block, 'EVENT') as
            | 'click'
            | 'keydown'
            | 'keyup'
            | 'mouseover'
            | 'mouseout'
            | 'pointerdown'
            | 'pointerup'
            | 'pointercancel'
            | 'lostpointercapture'
            | 'blur'
            | 'submit'
            | 'input'
            | 'change',
          handlerName: f(block, 'HANDLER'),
        },
      }
    case 'sz_js_create_element':
      return {
        kind: 'js',
        value: { type: 'createElement', tag: f(block, 'TAG'), varName: f(block, 'NAME') },
      }
    case 'sz_js_create_element_ns':
      return {
        kind: 'js',
        value: {
          type: 'createElementNS',
          tag: f(block, 'TAG') || 'circle',
          varName: f(block, 'NAME'),
        },
      }
    case 'sz_js_get_attribute':
      return {
        kind: 'js',
        value: {
          type: 'getAttribute',
          targetId: f(block, 'TARGET'),
          ...elementTargetKindField(block),
          name: f(block, 'ATTR') || 'cx',
          varName: f(block, 'NAME'),
        },
      }
    case 'sz_js_append_child':
      return {
        kind: 'js',
        value: { type: 'appendChild', parentVar: f(block, 'PARENT'), childVar: f(block, 'CHILD') },
      }
    case 'sz_js_throw':
      return {
        kind: 'js',
        value: {
          type: 'throwError',
          message: exprInput(block, 'MESSAGE', { type: 'str', value: 'Erro' }),
        },
      }
    case 'sz_js_object_assign':
      return {
        kind: 'js',
        value: {
          type: 'objectAssign',
          targetVar: f(block, 'TARGET'),
          sourceVar: f(block, 'SOURCE'),
        },
      }
    case 'sz_js_switch': {
      const def = getStatementChildren(block, 'DEFAULT', seen)
      return {
        kind: 'js',
        value: {
          type: 'switch',
          subject: exprInput(block, 'SUBJECT', { type: 'num', value: 0 }),
          cases: getSwitchCases(block, 'CASES', seen),
          ...(def.length > 0 ? { default: def } : {}),
        },
      }
    }
    case 'sz_js_case':
      // Só faz sentido dentro de "escolha" (coletado por getSwitchCases).
      return null
    case 'sz_js_set_dataset':
      return {
        kind: 'js',
        value: {
          type: 'setDataset',
          targetId: f(block, 'TARGET'),
          ...elementTargetKindField(block),
          key: f(block, 'KEY'),
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_js_class': {
      const members = getClassMembers(block, seen)
      const superClass = getSuperName(block)
      return {
        kind: 'js',
        value: {
          type: 'classDecl',
          name: f(block, 'NAME'),
          ...(superClass ? { superClass } : {}),
          ctorParams: members.ctorParams,
          ...(members.ctorId ? { ctorId: members.ctorId } : {}),
          ctorBody: members.ctorBody,
          methods: members.methods,
        },
      }
    }
    case 'sz_js_new_var': {
      const reference = constructorReference(f(block, 'CLASS'))
      return {
        kind: 'js',
        value: {
          type: 'newInstance',
          varName: f(block, 'VARNAME'),
          ...reference,
          args: getArgs(block),
        },
      }
    }
    case 'sz_js_call_method':
      return {
        kind: 'js',
        value: {
          type: 'callMethod',
          objectVar: f(block, 'OBJ'),
          method: f(block, 'METHOD'),
          args: getArgs(block),
        },
      }
    case 'sz_js_set_this_prop':
      return {
        kind: 'js',
        value: {
          type: 'setThisProp',
          name: f(block, 'NAME'),
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_js_set_prop':
      return {
        kind: 'js',
        value: {
          type: 'setProp',
          objectVar: f(block, 'OBJ'),
          name: f(block, 'NAME'),
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_js_member_set':
      return {
        kind: 'js',
        value: {
          type: 'memberSet',
          object: exprInput(block, 'OBJ', { type: 'var', name: 'objeto' }),
          name: f(block, 'NAME'),
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_js_element_onclick':
      return {
        kind: 'js',
        value: {
          type: 'onClickAssign',
          target: exprInput(block, 'TARGET', { type: 'getElement', id: 'botao' }),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_await':
      return {
        kind: 'js',
        value: { type: 'awaitStmt', value: exprInput(block, 'VALUE', { type: 'null' }) },
      }
    case 'sz_js_set_timeout_call':
      return {
        kind: 'js',
        value: {
          type: 'setTimeoutCall',
          fn: f(block, 'FN'),
          delay: exprInput(block, 'MS', { type: 'num', value: 1000 }),
        },
      }
    case 'sz_js_index_set':
      return {
        kind: 'js',
        value: {
          type: 'indexSet',
          object: exprInput(block, 'OBJ', { type: 'var', name: 'objeto' }),
          index: exprInput(block, 'INDEX', { type: 'str', value: 'chave' }),
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_js_method_on':
      return {
        kind: 'js',
        value: {
          type: 'memberCall',
          object: exprInput(block, 'OBJ', { type: 'var', name: 'objeto' }),
          method: f(block, 'METHOD'),
          args: getArgs(block),
        },
      }
    case 'sz_js_super_ctor':
      return { kind: 'js', value: { type: 'superCall', args: getArgs(block) } }
    case 'sz_js_super_method':
      return {
        kind: 'js',
        value: { type: 'superMethodCall', method: f(block, 'METHOD'), args: getArgs(block) },
      }
    case 'sz_js_expr_statement':
      return {
        kind: 'js',
        value: {
          type: 'exprStatement',
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_js_return':
      return {
        kind: 'js',
        value: {
          type: 'return',
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_js_return_void':
      return { kind: 'js', value: { type: 'return' } }
    case 'sz_js_function':
    case 'sz_js_function_async':
      return {
        kind: 'js',
        value: {
          type: 'funcDecl',
          name: f(block, 'NAME'),
          params: getParamNames(block),
          ...(block.type === 'sz_js_function_async' ? { async: true } : {}),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_js_call_function':
      return {
        kind: 'js',
        value: { type: 'callFunction', name: f(block, 'NAME'), args: getArgs(block) },
      }
    default:
      return PROGRAMMING_CODEC_UNHANDLED
  }
}
