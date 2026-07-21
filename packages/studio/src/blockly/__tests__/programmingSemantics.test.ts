import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { gameKitBlocks } from '../../official-extensions/game-2d-advanced/blocks'
import { DOM_BLOCKS, registerExtensionBlocks } from '../blocks'
import { buildIRFromWorkspace } from '../buildIR'
import { HTMLConnectionChecker } from '../htmlConnectionChecker'
import { ensureBlocklyInitialized } from '../setup'

function workspace(): Blockly.Workspace {
  return new Blockly.Workspace(
    new Blockly.Options({ plugins: { connectionChecker: HTMLConnectionChecker } }),
  )
}

function connectStatement(parent: Blockly.Block, input: string, child: Blockly.Block): boolean {
  const target = parent.getInput(input)?.connection
  const previous = child.previousConnection
  if (!target || !previous) throw new Error('Conexão de comando ausente no teste')
  return target.connect(previous)
}

function connectValue(parent: Blockly.Block, input: string, child: Blockly.Block): boolean {
  const target = parent.getInput(input)?.connection
  const output = child.outputConnection
  if (!target || !output) throw new Error('Conexão de valor ausente no teste')
  return target.connect(output)
}

function connectNext(parent: Blockly.Block, child: Blockly.Block): boolean {
  const next = parent.nextConnection
  const previous = child.previousConnection
  if (!next || !previous) throw new Error('Conexão seguinte ausente no teste')
  return next.connect(previous)
}

function classWithMember(
  ws: Blockly.Workspace,
  memberType: 'sz_js_constructor' | 'sz_js_class_method',
  options: { async?: boolean; extends?: string } = {},
): { classBlock: Blockly.Block; member: Blockly.Block } {
  const classBlock = ws.newBlock('sz_js_class')
  if (options.extends) classBlock.loadExtraState?.({ extends: options.extends })
  const member = ws.newBlock(memberType)
  if (options.async) member.setFieldValue('TRUE', 'ASYNC')
  if (!connectStatement(classBlock, 'MEMBERS', member)) {
    throw new Error('Não foi possível montar a classe do teste')
  }
  return { classBlock, member }
}

describe('contextos semânticos de Programação', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameKitBlocks)
  })

  it.each([
    'sz_js_on_key',
    'sz_js_on_mousemove',
    'sz_js_on_pointer_down',
    'sz_js_on_pointer_up',
  ])('%s mostra o seletor de alvo somente para elemento ou variável', (type) => {
    const ws = workspace()
    try {
      const event = ws.newBlock(type)
      const target = event.getField('TARGET')
      expect(target?.isVisible()).toBe(false)

      event.setFieldValue('var', 'TARGET_KIND')
      expect(target?.isVisible()).toBe(true)

      event.setFieldValue('window', 'TARGET_KIND')
      expect(target?.isVisible()).toBe(false)
    } finally {
      ws.dispose()
    }
  })

  it('break e continue entram em laços, nunca diretamente no início', () => {
    for (const type of ['sz_js_break', 'sz_js_continue']) {
      const invalid = workspace()
      const start = invalid.newBlock('sz_frame_start')
      const statement = invalid.newBlock(type)
      expect(connectStatement(start, 'CHILDREN', statement), type).toBe(false)
      expect(statement.getParent(), type).toBeNull()
      invalid.dispose()

      const engineLoop = workspace()
      const animation = engineLoop.newBlock('sz_canvas_anim_loop')
      expect(connectStatement(animation, 'BODY', engineLoop.newBlock(type)), type).toBe(true)
      expect(
        connectStatement(engineLoop.newBlock('sz_frame_loops'), 'CHILDREN', animation),
        type,
      ).toBe(false)
      engineLoop.dispose()

      const valid = workspace()
      const repeat = valid.newBlock('sz_js_repeat')
      const nested = valid.newBlock(type)
      expect(connectStatement(repeat, 'DO', nested), type).toBe(true)
      expect(nested.getParent(), type).toBe(repeat)
      valid.dispose()
    }
  })

  it('return entra em função, nunca diretamente no início', () => {
    const invalid = workspace()
    const start = invalid.newBlock('sz_frame_start')
    const returned = invalid.newBlock('sz_js_return_void')
    expect(connectStatement(start, 'CHILDREN', returned)).toBe(false)
    invalid.dispose()

    const valid = workspace()
    const fn = valid.newBlock('sz_js_function')
    const nested = valid.newBlock('sz_js_return_void')
    expect(connectStatement(fn, 'BODY', nested)).toBe(true)
    valid.dispose()
  })

  it('restaura relatores de parâmetros não padrão sem desconectar a árvore', () => {
    const restored = workspace()
    Blockly.serialization.workspaces.load(
      {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'sz_frame_start',
              inputs: {
                CHILDREN: {
                  block: {
                    type: 'sz_js_function',
                    fields: { NAME: 'calcular' },
                    extraState: { params: [{ name: 'total', id: 'param-total' }] },
                    inputs: {
                      BODY: {
                        block: {
                          type: 'sz_js_console_log_value',
                          inputs: {
                            VALUE: {
                              block: { type: 'sz_val_arg', fields: { NAME: 'total' } },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      },
      restored,
    )

    const [argument] = restored.getBlocksByType('sz_val_arg', false)
    expect(argument).toBeDefined()
    expect(argument?.getFieldValue('NAME')).toBe('total')
    expect(argument?.getSurroundParent()?.type).toBe('sz_js_console_log_value')
    restored.dispose()
  })

  it('continua rejeitando interativamente um relator que não pertence à função', () => {
    const invalid = workspace()
    const fn = invalid.newBlock('sz_js_function')
    fn.loadExtraState?.({ params: [{ name: 'total', id: 'param-total' }] })
    const log = invalid.newBlock('sz_js_console_log_value')
    const argument = invalid.newBlock('sz_val_arg')
    argument.setFieldValue('outro', 'NAME')

    expect(connectValue(log, 'VALUE', argument)).toBe(true)
    expect(connectStatement(fn, 'BODY', log)).toBe(true)
    expect(connectStatement(invalid.newBlock('sz_frame_start'), 'CHILDREN', fn)).toBe(false)
    invalid.dispose()
  })

  it('método do evento entra em listener, nunca numa árvore ancorada no início', () => {
    const valid = workspace()
    const click = valid.newBlock('sz_js_on_click')
    const eventMethod = valid.newBlock('sz_js_event_method')
    expect(connectStatement(click, 'DO', eventMethod)).toBe(true)
    valid.dispose()

    const invalid = workspace()
    const repeat = invalid.newBlock('sz_js_repeat')
    expect(connectStatement(repeat, 'DO', invalid.newBlock('sz_js_event_method'))).toBe(true)
    expect(connectStatement(invalid.newBlock('sz_frame_start'), 'CHILDREN', repeat)).toBe(false)
    invalid.dispose()
  })

  it('oferece o objeto Event somente a callbacks que realmente o recebem', () => {
    const dom = workspace()
    const events = dom.newBlock('sz_frame_events')
    const click = dom.newBlock('sz_js_element_onclick')
    expect(connectStatement(events, 'CHILDREN', click)).toBe(true)
    expect(connectStatement(click, 'DO', dom.newBlock('sz_js_event_method'))).toBe(true)
    dom.dispose()

    const game = workspace()
    const gameEvents = game.newBlock('sz_frame_events')
    const gameClick = game.newBlock('sz_gk_on_game_click')
    expect(connectStatement(gameEvents, 'CHILDREN', gameClick)).toBe(true)
    expect(connectStatement(gameClick, 'BODY', game.newBlock('sz_js_event_method'))).toBe(false)
    game.dispose()

    const expired = workspace()
    const expiredEvents = expired.newBlock('sz_frame_events')
    const expiredClick = expired.newBlock('sz_js_on_click_anywhere')
    const timeout = expired.newBlock('sz_js_set_timeout')
    expect(connectStatement(expiredEvents, 'CHILDREN', expiredClick)).toBe(true)
    expect(connectStatement(expiredClick, 'DO', timeout)).toBe(true)
    expect(connectStatement(timeout, 'DO', expired.newBlock('sz_js_event_method'))).toBe(false)
    expired.dispose()

    const header = workspace()
    const headerEvents = header.newBlock('sz_frame_events')
    const headerClick = header.newBlock('sz_js_element_onclick')
    expect(connectStatement(headerEvents, 'CHILDREN', headerClick)).toBe(true)
    expect(connectValue(headerClick, 'TARGET', header.newBlock('sz_val_event_pos'))).toBe(false)
    header.dispose()
  })

  it('valida o contexto de uma pilha montada antes de encaixá-la na área', () => {
    const invalid = workspace()
    const conditional = invalid.newBlock('sz_js_if_else')
    expect(connectStatement(conditional, 'THEN', invalid.newBlock('sz_js_break'))).toBe(true)
    expect(connectStatement(invalid.newBlock('sz_frame_start'), 'CHILDREN', conditional)).toBe(
      false,
    )
    invalid.dispose()

    const valid = workspace()
    const loop = valid.newBlock('sz_js_repeat')
    const nestedConditional = valid.newBlock('sz_js_if_else')
    expect(connectStatement(nestedConditional, 'THEN', valid.newBlock('sz_js_break'))).toBe(true)
    expect(connectStatement(loop, 'DO', nestedConditional)).toBe(true)
    valid.dispose()
  })

  it('não permite aninhar raízes de evento ou loop em outros comandos', () => {
    const eventInsideConditional = workspace()
    const conditional = eventInsideConditional.newBlock('sz_js_if_else')
    const click = eventInsideConditional.newBlock('sz_js_on_click')
    expect(connectStatement(conditional, 'THEN', click)).toBe(false)
    eventInsideConditional.dispose()

    const loopInsideEvent = workspace()
    const outerEvent = loopInsideEvent.newBlock('sz_js_on_click')
    const animation = loopInsideEvent.newBlock('sz_canvas_anim_loop')
    expect(connectStatement(outerEvent, 'DO', animation)).toBe(false)
    loopInsideEvent.dispose()

    const eventInsideLoop = workspace()
    const outerLoop = eventInsideLoop.newBlock('sz_canvas_anim_loop')
    const nestedEvent = eventInsideLoop.newBlock('sz_js_on_click')
    expect(connectStatement(outerLoop, 'BODY', nestedEvent)).toBe(false)
    eventInsideLoop.dispose()
  })

  it('aceita inscrições encapsuladas em funções, mas não dentro de laços', () => {
    const insideFunction = workspace()
    const fn = insideFunction.newBlock('sz_js_function')
    expect(connectStatement(fn, 'BODY', insideFunction.newBlock('sz_js_on_click'))).toBe(true)
    insideFunction.dispose()

    const insideLoop = workspace()
    const repeat = insideLoop.newBlock('sz_js_repeat')
    expect(connectStatement(repeat, 'DO', insideLoop.newBlock('sz_js_on_click'))).toBe(false)
    insideLoop.dispose()
  })

  it.each([
    'sz_js_request_fullscreen',
    'sz_js_toggle_fullscreen',
  ])('%s exige um gesto direto ainda ativo', (type) => {
    const invalid = workspace()
    expect(
      connectStatement(invalid.newBlock('sz_frame_start'), 'CHILDREN', invalid.newBlock(type)),
    ).toBe(false)
    invalid.dispose()

    const eventWorkspace = workspace()
    const click = eventWorkspace.newBlock('sz_js_on_click_anywhere')
    expect(connectStatement(click, 'DO', eventWorkspace.newBlock(type))).toBe(true)
    expect(connectStatement(eventWorkspace.newBlock('sz_frame_events'), 'CHILDREN', click)).toBe(
      true,
    )
    eventWorkspace.dispose()

    const noGesture = workspace()
    const resize = noGesture.newBlock('sz_js_on_resize')
    expect(connectStatement(resize, 'DO', noGesture.newBlock(type))).toBe(true)
    expect(connectStatement(noGesture.newBlock('sz_frame_events'), 'CHILDREN', resize)).toBe(false)
    noGesture.dispose()

    const functionWorkspace = workspace()
    const fn = functionWorkspace.newBlock('sz_js_function')
    expect(connectStatement(fn, 'BODY', functionWorkspace.newBlock(type))).toBe(true)
    expect(connectStatement(functionWorkspace.newBlock('sz_frame_start'), 'CHILDREN', fn)).toBe(
      false,
    )
    functionWorkspace.dispose()

    const delayedWorkspace = workspace()
    const delayedClick = delayedWorkspace.newBlock('sz_js_on_click_anywhere')
    const timeout = delayedWorkspace.newBlock('sz_js_set_timeout_seconds')
    expect(connectStatement(timeout, 'DO', delayedWorkspace.newBlock(type))).toBe(true)
    expect(connectStatement(delayedClick, 'DO', timeout)).toBe(true)
    expect(
      connectStatement(delayedWorkspace.newBlock('sz_frame_events'), 'CHILDREN', delayedClick),
    ).toBe(false)
    delayedWorkspace.dispose()

    const gameClickWorkspace = workspace()
    const gameClick = gameClickWorkspace.newBlock('sz_gk_on_game_click')
    expect(connectStatement(gameClick, 'BODY', gameClickWorkspace.newBlock(type))).toBe(true)
    expect(
      connectStatement(gameClickWorkspace.newBlock('sz_frame_events'), 'CHILDREN', gameClick),
    ).toBe(true)
    gameClickWorkspace.dispose()

    for (const deferredType of ['sz_gk_wait', 'sz_canvas_request_frame_do']) {
      const deferredWorkspace = workspace()
      const deferredClick = deferredWorkspace.newBlock('sz_js_on_click_anywhere')
      const deferred = deferredWorkspace.newBlock(deferredType)
      expect(connectStatement(deferred, 'DO', deferredWorkspace.newBlock(type)), deferredType).toBe(
        true,
      )
      expect(connectStatement(deferredClick, 'DO', deferred), deferredType).toBe(true)
      expect(
        connectStatement(deferredWorkspace.newBlock('sz_frame_events'), 'CHILDREN', deferredClick),
        deferredType,
      ).toBe(false)
      deferredWorkspace.dispose()
    }
  })

  it('permite this em função usada como handler e o recusa fora de função', () => {
    const valid = workspace()
    const fn = valid.newBlock('sz_js_function')
    fn.setFieldValue('tratarClique', 'NAME')
    const log = valid.newBlock('sz_js_console_log_value')
    expect(connectValue(log, 'VALUE', valid.newBlock('sz_val_this'))).toBe(true)
    expect(connectStatement(fn, 'BODY', log)).toBe(true)
    expect(connectStatement(valid.newBlock('sz_frame_start'), 'CHILDREN', fn)).toBe(true)

    const registration = valid.newBlock('sz_js_on_event_named')
    registration.setFieldValue('tratarClique', 'HANDLER')
    expect(connectStatement(valid.newBlock('sz_frame_events'), 'CHILDREN', registration)).toBe(true)
    valid.dispose()

    const invalid = workspace()
    const topLevelLog = invalid.newBlock('sz_js_console_log_value')
    expect(connectValue(topLevelLog, 'VALUE', invalid.newBlock('sz_val_this'))).toBe(true)
    expect(connectStatement(invalid.newBlock('sz_frame_start'), 'CHILDREN', topLevelLog)).toBe(
      false,
    )
    invalid.dispose()
  })

  it('await só entra em função ou método assíncrono', () => {
    const invalid = workspace()
    const regular = classWithMember(invalid, 'sz_js_class_method')
    expect(connectStatement(regular.member, 'BODY', invalid.newBlock('sz_js_await'))).toBe(true)
    expect(
      connectStatement(invalid.newBlock('sz_frame_start'), 'CHILDREN', regular.classBlock),
    ).toBe(false)
    invalid.dispose()

    const valid = workspace()
    const asynchronous = classWithMember(valid, 'sz_js_class_method', { async: true })
    expect(connectStatement(asynchronous.member, 'BODY', valid.newBlock('sz_js_await'))).toBe(true)
    expect(
      connectStatement(valid.newBlock('sz_frame_start'), 'CHILDREN', asynchronous.classBlock),
    ).toBe(true)
    valid.dispose()

    const named = workspace()
    const asyncFunction = named.newBlock('sz_js_function')
    asyncFunction.setFieldValue('TRUE', 'ASYNC')
    expect(connectStatement(asyncFunction, 'BODY', named.newBlock('sz_js_await'))).toBe(true)
    expect(connectStatement(named.newBlock('sz_frame_start'), 'CHILDREN', asyncFunction)).toBe(true)
    named.dispose()
  })

  it('não herda async através do executor síncrono de uma Promise', () => {
    const invalid = workspace()
    const fn = invalid.newBlock('sz_js_function')
    fn.setFieldValue('TRUE', 'ASYNC')
    const log = invalid.newBlock('sz_js_console_log_value')
    const promise = invalid.newBlock('sz_val_new_promise')
    const condition = invalid.newBlock('sz_js_if_else')
    const awaited = invalid.newBlock('sz_js_await')

    expect(connectStatement(condition, 'THEN', awaited)).toBe(true)
    expect(connectStatement(promise, 'DO', condition)).toBe(true)
    expect(connectValue(log, 'VALUE', promise)).toBe(true)
    expect(connectStatement(fn, 'BODY', log)).toBe(true)
    expect(connectStatement(invalid.newBlock('sz_frame_start'), 'CHILDREN', fn)).toBe(false)
    invalid.dispose()
  })

  it('super exige classe com herança e o membro correto', () => {
    const invalid = workspace()
    const plain = classWithMember(invalid, 'sz_js_constructor')
    expect(connectStatement(plain.member, 'BODY', invalid.newBlock('sz_js_super_ctor'))).toBe(true)
    expect(connectStatement(invalid.newBlock('sz_frame_start'), 'CHILDREN', plain.classBlock)).toBe(
      false,
    )
    invalid.dispose()

    const valid = workspace()
    const derived = classWithMember(valid, 'sz_js_constructor', { extends: 'Base' })
    expect(connectStatement(derived.member, 'BODY', valid.newBlock('sz_js_super_ctor'))).toBe(true)
    expect(connectStatement(valid.newBlock('sz_frame_start'), 'CHILDREN', derived.classBlock)).toBe(
      true,
    )
    valid.dispose()
  })

  it('oferece cada valor somente no tipo de evento que realmente o entrega', () => {
    const invalid = workspace()
    const log = invalid.newBlock('sz_js_console_log_value')
    expect(connectValue(log, 'VALUE', invalid.newBlock('sz_val_event_key'))).toBe(true)
    expect(connectStatement(invalid.newBlock('sz_frame_start'), 'CHILDREN', log)).toBe(false)
    invalid.dispose()

    const keyboard = workspace()
    const keyEvent = keyboard.newBlock('sz_js_on_key')
    const keyLog = keyboard.newBlock('sz_js_console_log_value')
    expect(connectValue(keyLog, 'VALUE', keyboard.newBlock('sz_val_event_key'))).toBe(true)
    expect(connectStatement(keyEvent, 'DO', keyLog)).toBe(true)
    expect(connectStatement(keyboard.newBlock('sz_frame_events'), 'CHILDREN', keyEvent)).toBe(true)
    keyboard.dispose()

    const keyInClick = workspace()
    const click = keyInClick.newBlock('sz_js_on_click')
    const clickLog = keyInClick.newBlock('sz_js_console_log_value')
    expect(connectValue(clickLog, 'VALUE', keyInClick.newBlock('sz_val_event_key'))).toBe(true)
    expect(connectStatement(click, 'DO', clickLog)).toBe(true)
    expect(connectStatement(keyInClick.newBlock('sz_frame_events'), 'CHILDREN', click)).toBe(false)
    keyInClick.dispose()

    const pointer = workspace()
    const pointerClick = pointer.newBlock('sz_js_on_click')
    const pointerLog = pointer.newBlock('sz_js_console_log_value')
    expect(connectValue(pointerLog, 'VALUE', pointer.newBlock('sz_val_event_pos'))).toBe(true)
    expect(connectStatement(pointerClick, 'DO', pointerLog)).toBe(true)
    expect(connectStatement(pointer.newBlock('sz_frame_events'), 'CHILDREN', pointerClick)).toBe(
      true,
    )
    pointer.dispose()

    const pointerInKey = workspace()
    const key = pointerInKey.newBlock('sz_js_on_key')
    const pointerInKeyLog = pointerInKey.newBlock('sz_js_console_log_value')
    expect(connectValue(pointerInKeyLog, 'VALUE', pointerInKey.newBlock('sz_val_event_pos'))).toBe(
      true,
    )
    expect(connectStatement(key, 'DO', pointerInKeyLog)).toBe(true)
    expect(connectStatement(pointerInKey.newBlock('sz_frame_events'), 'CHILDREN', key)).toBe(false)
    pointerInKey.dispose()
  })

  it('trata alvos “elemento atual” como uso real de this', () => {
    for (const type of ['sz_js_class_op', 'sz_val_class_contains']) {
      const invalid = workspace()
      const current = invalid.newBlock(type)
      current.setFieldValue('this', 'TARGET_KIND')
      const consumer =
        type === 'sz_js_class_op' ? current : invalid.newBlock('sz_js_console_log_value')
      if (type === 'sz_val_class_contains') {
        expect(connectValue(consumer, 'VALUE', current)).toBe(true)
      }
      expect(connectStatement(invalid.newBlock('sz_frame_start'), 'CHILDREN', consumer)).toBe(false)
      invalid.dispose()

      const valid = workspace()
      const fn = valid.newBlock('sz_js_function')
      const nestedCurrent = valid.newBlock(type)
      nestedCurrent.setFieldValue('this', 'TARGET_KIND')
      const nested =
        type === 'sz_js_class_op' ? nestedCurrent : valid.newBlock('sz_js_console_log_value')
      if (type === 'sz_val_class_contains') {
        expect(connectValue(nested, 'VALUE', nestedCurrent)).toBe(true)
      }
      expect(connectStatement(fn, 'BODY', nested)).toBe(true)
      expect(connectStatement(valid.newBlock('sz_frame_start'), 'CHILDREN', fn)).toBe(true)
      valid.dispose()
    }
  })

  it('aceita no máximo um construtor por classe', () => {
    const ws = workspace()
    const classBlock = ws.newBlock('sz_js_class')
    const first = ws.newBlock('sz_js_constructor')
    const second = ws.newBlock('sz_js_constructor')
    expect(connectStatement(classBlock, 'MEMBERS', first)).toBe(true)
    expect(connectNext(first, second)).toBe(false)
    expect(second.getParent()).toBeNull()
    ws.dispose()
  })

  it('não descarta construtores duplicados de um estado legado ao montar a IR', () => {
    const ws = new Blockly.Workspace()
    const frame = ws.newBlock('sz_frame_start')
    const classBlock = ws.newBlock('sz_js_class')
    const first = ws.newBlock('sz_js_constructor')
    const second = ws.newBlock('sz_js_constructor')
    expect(connectStatement(classBlock, 'MEMBERS', first)).toBe(true)
    expect(connectNext(first, second)).toBe(true)
    expect(connectStatement(frame, 'CHILDREN', classBlock)).toBe(true)

    expect(() => buildIRFromWorkspace(ws)).toThrow('mais de um construtor')
    ws.dispose()
  })

  it('exige uma única chamada super como primeiro comando do construtor derivado', () => {
    const missing = workspace()
    const withoutSuper = classWithMember(missing, 'sz_js_constructor', { extends: 'Base' })
    expect(
      connectStatement(missing.newBlock('sz_frame_start'), 'CHILDREN', withoutSuper.classBlock),
    ).toBe(false)
    missing.dispose()

    const late = workspace()
    const lateSuper = classWithMember(late, 'sz_js_constructor', { extends: 'Base' })
    const before = late.newBlock('sz_js_set_this_prop')
    const superCall = late.newBlock('sz_js_super_ctor')
    expect(connectStatement(lateSuper.member, 'BODY', before)).toBe(true)
    expect(connectNext(before, superCall)).toBe(true)
    expect(
      connectStatement(late.newBlock('sz_frame_start'), 'CHILDREN', lateSuper.classBlock),
    ).toBe(false)
    late.dispose()

    const duplicate = workspace()
    const twoSupers = classWithMember(duplicate, 'sz_js_constructor', { extends: 'Base' })
    const firstSuper = duplicate.newBlock('sz_js_super_ctor')
    const secondSuper = duplicate.newBlock('sz_js_super_ctor')
    expect(connectStatement(twoSupers.member, 'BODY', firstSuper)).toBe(true)
    expect(connectNext(firstSuper, secondSuper)).toBe(true)
    expect(
      connectStatement(duplicate.newBlock('sz_frame_start'), 'CHILDREN', twoSupers.classBlock),
    ).toBe(false)
    duplicate.dispose()
  })

  it('preserva as regras de super ao editar uma classe derivada já ancorada', () => {
    const addingConstructor = workspace()
    const startWithDefault = addingConstructor.newBlock('sz_frame_start')
    const derivedWithDefault = addingConstructor.newBlock('sz_js_class')
    derivedWithDefault.loadExtraState?.({ extends: 'Base' })
    expect(connectStatement(startWithDefault, 'CHILDREN', derivedWithDefault)).toBe(true)
    expect(
      connectStatement(
        derivedWithDefault,
        'MEMBERS',
        addingConstructor.newBlock('sz_js_constructor'),
      ),
    ).toBe(false)
    addingConstructor.dispose()

    const addingSuper = workspace()
    const start = addingSuper.newBlock('sz_frame_start')
    const derived = classWithMember(addingSuper, 'sz_js_constructor', { extends: 'Base' })
    const firstSuper = addingSuper.newBlock('sz_js_super_ctor')
    expect(connectStatement(derived.member, 'BODY', firstSuper)).toBe(true)
    expect(connectStatement(start, 'CHILDREN', derived.classBlock)).toBe(true)

    const secondSuper = addingSuper.newBlock('sz_js_super_ctor')
    expect(connectNext(firstSuper, secondSuper)).toBe(false)
    expect(secondSuper.getParent()).toBeNull()
    addingSuper.dispose()
  })
})

describe('oferta segura de DOM', () => {
  it('não oferece innerHTML nos blocos guiados de propriedade', () => {
    for (const type of [
      'sz_js_set_property_text',
      'sz_js_set_property',
      'sz_js_set_property_var',
      'sz_js_set_property_calc',
      'sz_js_get_property',
    ]) {
      const definition = DOM_BLOCKS.find((block) => block.type === type)
      const serialized = JSON.stringify(definition)
      expect(serialized, type).not.toContain('innerHTML')
    }
  })
})
