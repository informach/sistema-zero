import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { generateProjectFiles, generateProjectFilesWithMap } from '#generators'
import {
  assignStableIdsToIR,
  EVENT_KINDS,
  type EventTargetKind,
  type JSStatement,
  type SZIR,
  type SZIRV2,
  SZIRV2Schema,
} from '#ir'
import { parseProjectFiles } from '#parsers'
import { buildIRFromWorkspace } from '../buildIR'
import { ensureBlocklyInitialized } from '../setup'
import { buildWorkspaceStateFromIR, type SerializedBlocklyBlock } from '../workspaceState'

describe('buildWorkspaceStateFromIR', () => {
  it('mapeia HTML, CSS, JS, Canvas, avançado e game-2d para blocos serializados', () => {
    const ir: SZIR = {
      html: [
        { type: 'element', tag: 'h1', text: 'Meu projeto' },
        { type: 'canvas', id: 'tela', width: 320, height: 180 },
      ],
      css: [
        { selector: 'body', declarations: { background: '#111827', color: '#ffffff' } },
        { type: 'rawCSS', code: '@media (max-width: 600px) {}', advanced: true },
      ],
      js: [
        { type: 'consoleLog', value: { type: 'str', value: 'oi' } },
        { type: 'canvasSetup', canvasId: 'tela', varName: 'ctx' },
        { type: 'rawJS', code: 'setTimeout(() => console.log("avançado"), 100);', advanced: true },
        {
          type: 'g2d:createSprite',
          varName: 'jogador',
          x: 10,
          y: 20,
          w: 30,
          h: 40,
          color: '#22d3ee',
        },
      ],
      extensions: [{ extensionId: 'game-2d' }],
    }

    const state = buildWorkspaceStateFromIR(ir)
    const types = collectTypes(state.blocks.blocks)

    expect(types).toContain('sz_html_h1')
    expect(types).toContain('sz_html_canvas')
    expect(types).toContain('sz_css_body_background')
    expect(types).toContain('sz_css_body_text_color')
    expect(types).toContain('sz_adv_raw_css')
    expect(types).toContain('sz_js_console_log_text')
    expect(types).toContain('sz_canvas_setup')
    expect(types).toContain('sz_adv_raw_js')
    expect(types).toContain('sz_g2d_create_sprite')
  })

  it('preserva um roundtrip parcial de arquivos simples para blocos', () => {
    const source: SZIR = {
      html: [{ type: 'element', tag: 'h1', text: 'Olá' }],
      css: [{ selector: 'body', declarations: { background: '#000000' } }],
      js: [{ type: 'consoleLog', value: { type: 'str', value: 'ponte' } }],
      extensions: [],
    }

    const files = generateProjectFiles({ ir: source, projectName: 'Roundtrip' })
    const parsed = parseProjectFiles(files)
    const state = buildWorkspaceStateFromIR(parsed)
    const types = collectTypes(state.blocks.blocks)

    expect(types).toContain('sz_html_h1')
    expect(types).toContain('sz_css_body_background')
    expect(types).toContain('sz_js_console_log_text')
  })

  it('mapeia containers aninhados e folhas novas para blocos com CHILDREN', () => {
    const ir: SZIR = {
      html: [
        {
          type: 'element',
          tag: 'section',
          id: 'hero',
          children: [
            { type: 'element', tag: 'h2', text: 'Título' },
            { type: 'element', tag: 'a', text: 'Link', attrs: { href: '#' } },
            { type: 'element', tag: 'img', attrs: { src: 'a.png', alt: 'a' } },
          ],
        },
      ],
      css: [
        {
          selector: '#hero',
          declarations: {
            display: 'flex',
            'flex-direction': 'column',
            gap: '16px',
            'border-radius': '12px',
          },
        },
      ],
      js: [],
      extensions: [],
    }
    const types = collectTypes(buildWorkspaceStateFromIR(ir).blocks.blocks)
    expect(types).toContain('sz_html_section')
    expect(types).toContain('sz_html_h2')
    expect(types).toContain('sz_html_link')
    expect(types).toContain('sz_html_image')
    expect(types).toContain('sz_css_display_flex')
    expect(types).toContain('sz_css_gap')
    expect(types).toContain('sz_css_border_radius')
  })

  it('faz roundtrip de uma landing aninhada sem virar bloco avançado', () => {
    const source: SZIR = {
      html: [
        {
          type: 'element',
          tag: 'header',
          id: 'topo',
          children: [{ type: 'element', tag: 'h1', text: 'Marca' }],
        },
        {
          type: 'element',
          tag: 'section',
          id: 'hero',
          children: [
            { type: 'element', tag: 'h2', text: 'Bem-vindo' },
            { type: 'element', tag: 'button', id: 'cta', text: 'Comprar' },
          ],
        },
      ],
      css: [{ selector: '#hero', declarations: { 'max-width': '1100px', 'text-align': 'center' } }],
      js: [],
      extensions: [],
    }
    const files = generateProjectFiles({ ir: source, projectName: 'Landing' })
    const parsed = parseProjectFiles(files)
    const types = collectTypes(buildWorkspaceStateFromIR(parsed).blocks.blocks)
    expect(types).toContain('sz_html_header')
    expect(types).toContain('sz_html_section')
    expect(types).toContain('sz_html_h2')
    expect(types).toContain('sz_css_max_width')
    expect(types).toContain('sz_css_text_align')
    expect(types).not.toContain('sz_adv_raw_html')
  })

  it('mapeia estilos de texto/link (caixa, sublinhado, espaçamento) para blocos', () => {
    const ir: SZIR = {
      html: [],
      css: [
        {
          selector: '#menu a',
          declarations: {
            'text-transform': 'uppercase',
            'text-decoration': 'none',
            'letter-spacing': '2px',
          },
        },
      ],
      js: [],
      extensions: [],
    }
    const types = collectTypes(buildWorkspaceStateFromIR(ir).blocks.blocks)
    expect(types).toContain('sz_css_text_transform')
    expect(types).toContain('sz_css_text_decoration')
    expect(types).toContain('sz_css_letter_spacing')
    expect(types).not.toContain('sz_adv_raw_css')
  })

  it('mapeia alert, get/setProperty para blocos próprios (não viram avançado)', () => {
    const ir: SZIR = {
      html: [],
      css: [],
      js: [
        { type: 'alert', value: { type: 'str', value: 'Olá!' } },
        { type: 'alert', value: { type: 'var', name: 'contador' } },
        { type: 'getProperty', targetId: 'campo', property: 'value', varName: 'digitado' },
        {
          type: 'setProperty',
          targetId: 'saida',
          property: 'textContent',
          value: { type: 'str', value: 'Oi' },
        },
        {
          type: 'setProperty',
          targetId: 'campo',
          property: 'value',
          value: { type: 'var', name: 'nome' },
        },
      ],
      extensions: [],
    }
    const types = collectTypes(buildWorkspaceStateFromIR(ir).blocks.blocks)
    expect(types).toContain('sz_js_alert_text')
    expect(types).toContain('sz_js_alert_var')
    expect(types).toContain('sz_js_get_property')
    expect(types).toContain('sz_js_set_property_text')
    expect(types).toContain('sz_js_set_property_var')
    expect(types).not.toContain('sz_adv_raw_js')
  })

  it('faz roundtrip de alert/get/setProperty via geração+parse sem perder código', () => {
    const source: SZIR = {
      html: [],
      css: [],
      js: [
        { type: 'alert', value: { type: 'str', value: 'Pronto!' } },
        { type: 'getProperty', targetId: 'saida', property: 'textContent', varName: 'conteudo' },
        {
          type: 'setProperty',
          targetId: 'saida',
          property: 'textContent',
          value: { type: 'str', value: 'Oi' },
        },
        {
          type: 'setProperty',
          targetId: 'campo',
          property: 'value',
          value: { type: 'var', name: 'nome' },
        },
      ],
      extensions: [],
    }
    const files = generateProjectFiles({ ir: source, projectName: 'AlertProp' })
    const parsed = parseProjectFiles(files)
    const types = collectTypes(buildWorkspaceStateFromIR(parsed).blocks.blocks)
    expect(types).toContain('sz_js_alert_text')
    expect(types).toContain('sz_js_get_property')
    expect(types).toContain('sz_js_set_property_text')
    expect(types).toContain('sz_js_set_property_var')
    expect(types).not.toContain('sz_adv_raw_js')
  })

  it('faz roundtrip do ano no rodapé (setProperty com valor calculado now)', () => {
    const source: SZIR = {
      html: [],
      css: [],
      js: [
        { type: 'getElementById', id: 'ano', varName: 'currentYear' },
        {
          type: 'setProperty',
          targetId: 'currentYear',
          targetKind: 'var',
          property: 'textContent',
          value: { type: 'now', kind: 'year' },
        },
      ],
      extensions: [],
    }
    const files = generateProjectFiles({ ir: source, projectName: 'Rodape' })
    const parsed = parseProjectFiles(files)
    const blocks = collectBlocks(buildWorkspaceStateFromIR(parsed).blocks.blocks)
    const calc = blocks.find((b) => b.type === 'sz_js_set_property_calc')
    expect(calc).toBeDefined()
    expect(calc?.fields?.CALC).toBe('year')
    expect(calc?.fields?.TARGET_KIND).toBe('var')
    expect(calc?.fields?.TARGET).toBe('currentYear')
    expect(blocks.map((b) => b.type)).not.toContain('sz_adv_raw_js')
  })

  it('faz roundtrip de blocos mirando uma variável (targetKind var) sem virar avançado', () => {
    const source: SZIR = {
      html: [],
      css: [],
      js: [
        { type: 'querySelector', selector: '#caixa', varName: 'caixa' },
        {
          type: 'setProperty',
          targetId: 'caixa',
          targetKind: 'var',
          property: 'textContent',
          value: { type: 'str', value: 'Oi' },
        },
        {
          type: 'getProperty',
          targetId: 'caixa',
          targetKind: 'var',
          property: 'value',
          varName: 'v',
        },
        { type: 'classOp', targetId: 'caixa', targetKind: 'var', op: 'add', className: 'ativo' },
        { type: 'event', target: 'caixa', targetKind: 'var', event: 'click', body: [] },
      ],
      extensions: [],
    }
    const files = generateProjectFiles({ ir: source, projectName: 'VarTarget' })
    const parsed = parseProjectFiles(files)
    const blocks = collectBlocks(buildWorkspaceStateFromIR(parsed).blocks.blocks)
    const types = blocks.map((b) => b.type)
    expect(types).toContain('sz_js_query_selector')
    expect(types).toContain('sz_js_set_property_text')
    expect(types).toContain('sz_js_get_property')
    expect(types).toContain('sz_js_class_op')
    expect(types).toContain('sz_js_on_click')
    expect(types).not.toContain('sz_adv_raw_js')
    // O alvo-variável precisa sobreviver ao roundtrip (campo TARGET_KIND = 'var').
    const setBlock = blocks.find((b) => b.type === 'sz_js_set_property_text')
    expect(setBlock?.fields?.TARGET_KIND).toBe('var')
    expect(setBlock?.fields?.TARGET).toBe('caixa')
  })

  it('faz roundtrip texto→blocos dos blocos novos (clique global, trig, vetores)', () => {
    const source: SZIR = {
      html: [],
      css: [],
      js: [
        {
          type: 'var',
          name: 'pos',
          value: { type: 'vec2', x: { type: 'num', value: 10 }, y: { type: 'num', value: 20 } },
        },
        {
          type: 'var',
          name: 'p3',
          value: {
            type: 'vec3',
            x: { type: 'num', value: 1 },
            y: { type: 'num', value: 2 },
            z: { type: 'num', value: 3 },
          },
        },
        {
          type: 'var',
          name: 's',
          value: { type: 'mathUnary', fn: 'sin', arg: { type: 'var', name: 'a' } },
        },
        {
          type: 'var',
          name: 'ang',
          value: {
            type: 'mathBinary',
            fn: 'atan2',
            a: { type: 'var', name: 'dy' },
            b: { type: 'var', name: 'dx' },
          },
        },
        { type: 'var', name: 'pi', value: { type: 'mathConst', name: 'PI' } },
        {
          type: 'var',
          name: 'rad',
          value: { type: 'angleConvert', dir: 'degToRad', arg: { type: 'num', value: 90 } },
        },
        {
          type: 'event',
          target: 'document',
          targetKind: 'document',
          event: 'click',
          body: [
            { type: 'var', name: 'mx', value: { type: 'eventProp', prop: 'clientX' } },
            { type: 'var', name: 'my', value: { type: 'eventProp', prop: 'clientY' } },
          ],
        },
      ],
      extensions: [],
    }

    const files = generateProjectFiles({ ir: source, projectName: 'NovosBlocos' })
    const parsed = parseProjectFiles(files)
    const types = collectTypes(buildWorkspaceStateFromIR(parsed).blocks.blocks)

    expect(types).toContain('sz_val_vector2d')
    expect(types).toContain('sz_val_vector3d')
    expect(types).toContain('sz_math_trig')
    expect(types).toContain('sz_math_atan2')
    expect(types).toContain('sz_val_math_pi')
    expect(types).toContain('sz_math_angle_convert')
    expect(types).toContain('sz_js_on_click_anywhere')
    expect(types).toContain('sz_val_event_pos')
    // Nada pode cair em "código avançado": o round-trip texto→blocos é completo.
    expect(types).not.toContain('sz_adv_raw_js')
  })

  it('faz roundtrip texto→blocos dos eventos novos (teclado/janela/segundos)', () => {
    const source: SZIR = {
      html: [],
      css: [],
      js: [
        {
          type: 'event',
          target: 'document',
          targetKind: 'document',
          event: 'keydown',
          body: [{ type: 'var', name: 't', value: { type: 'eventProp', prop: 'code' } }],
        },
        {
          type: 'event',
          target: 'window',
          targetKind: 'window',
          event: 'resize',
          body: [{ type: 'consoleLog', value: { type: 'str', value: 'r' } }],
        },
        {
          type: 'setIntervalSeconds',
          delay: { type: 'num', value: 3 },
          body: [{ type: 'consoleLog', value: { type: 'str', value: 's' } }],
        },
      ],
      extensions: [],
    }

    const files = generateProjectFiles({ ir: source, projectName: 'Eventos' })
    const parsed = parseProjectFiles(files)
    const types = collectTypes(buildWorkspaceStateFromIR(parsed).blocks.blocks)

    expect(types).toContain('sz_js_on_key')
    expect(types).toContain('sz_val_event_key')
    expect(types).toContain('sz_js_on_resize')
    expect(types).toContain('sz_js_set_interval_seconds')
    expect(types).not.toContain('sz_adv_raw_js')
  })

  it.each([
    {
      label: 'ponteiro em variável de elemento',
      source: 'canvas.addEventListener("pointerdown", (event) => { console.log("ok"); });',
      expected: 'canvas?.addEventListener("pointerdown"',
      expectedBlock: 'sz_js_on_pointer_down',
    },
    {
      label: 'teclado em elemento por id',
      source:
        'document.getElementById("campo")?.addEventListener("keydown", (event) => { console.log(event.key); });',
      expected: 'document.getElementById("campo")?.addEventListener("keydown"',
      expectedBlock: 'sz_js_on_key',
    },
    {
      label: 'change em variável de elemento',
      source: 'campo.addEventListener("change", (event) => { console.log("mudou"); });',
      expected: 'campo?.addEventListener("change"',
      expectedBlock: 'sz_adv_raw_js',
    },
    {
      label: 'clique inline na janela',
      source: 'window.addEventListener("click", (event) => { console.log("ok"); });',
      expected: 'window.addEventListener("click"',
      expectedBlock: 'sz_adv_raw_js',
    },
    {
      label: 'handler nomeado no documento',
      source: 'document.addEventListener("click", tratar);',
      expected: 'document.addEventListener("click", tratar',
      expectedBlock: 'sz_adv_raw_js',
    },
  ])('preserva $label em um bloco válido na área de eventos', ({
    source,
    expected,
    expectedBlock,
  }) => {
    const parsed = parseProjectFiles({
      'index.html': '<!doctype html><script src="script.js"></script>',
      'style.css': '',
      'script.js': source,
    })
    const state = buildWorkspaceStateFromIR(parsed)
    expect(collectTypes(state.blocks.blocks)).toContain(expectedBlock)

    ensureBlocklyInitialized()
    const workspace = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state, workspace)
      const rebuilt = buildIRFromWorkspace(workspace)
      const validated = SZIRV2Schema.safeParse(rebuilt)
      const lifecycleIssues = validated.success
        ? []
        : validated.error.issues.filter(
            (issue) =>
              issue.path.length === 3 &&
              issue.path[0] === 'behavior' &&
              issue.message.includes('não pode ficar na área'),
          )
      expect(lifecycleIssues).toEqual([])
      const code = generateProjectFiles({ ir: rebuilt, projectName: 'Eventos' })['script.js']
      expect(code).toContain(expected)
    } finally {
      workspace.dispose()
    }
  })

  it('preserva o destino em toda combinação EventKind × targetKind, inline e nomeada', () => {
    const targets: ReadonlyArray<{ kind: EventTargetKind; target: string; expected: string }> = [
      {
        kind: 'id',
        target: 'alvo',
        expected: 'document.getElementById("alvo")?.addEventListener(',
      },
      { kind: 'var', target: 'alvo', expected: 'alvo?.addEventListener(' },
      { kind: 'document', target: 'document', expected: 'document.addEventListener(' },
      { kind: 'window', target: 'window', expected: 'window.addEventListener(' },
    ]

    ensureBlocklyInitialized()
    for (const event of EVENT_KINDS) {
      for (const { kind, target, expected } of targets) {
        for (const statementType of ['event', 'eventHandler'] as const) {
          const statement: JSStatement =
            statementType === 'event'
              ? { type: 'event', target, targetKind: kind, event, body: [] }
              : {
                  type: 'eventHandler',
                  target,
                  targetKind: kind,
                  event,
                  handlerName: 'tratar',
                }
          const ir: SZIRV2 = {
            version: 2,
            html: [],
            css: [],
            behavior: { start: [], events: [statement], loops: [] },
            extensions: [],
          }
          const workspace = new Blockly.Workspace()
          try {
            Blockly.serialization.workspaces.load(buildWorkspaceStateFromIR(ir), workspace)
            const rebuilt = buildIRFromWorkspace(workspace)
            const code = generateProjectFiles({ ir: rebuilt, projectName: 'Matriz' })['script.js']
            expect(code, `${statementType}/${event}/${kind}`).toContain(expected)
          } finally {
            workspace.dispose()
          }
        }
      }
    }
  })

  it('faz roundtrip texto→blocos de lista (array): criar, tamanho, adicionar e remover', () => {
    const source: SZIR = {
      html: [],
      css: [],
      js: [
        {
          type: 'var',
          name: 'itens',
          value: {
            type: 'array',
            items: [
              { type: 'num', value: 1 },
              { type: 'num', value: 2 },
            ],
          },
        },
        { type: 'var', name: 'vazia', value: { type: 'array', items: [] } },
        { type: 'arrayPush', arrayVar: 'itens', value: { type: 'num', value: 3 } },
        { type: 'arrayRemove', arrayVar: 'itens', end: 'pop' },
        { type: 'arrayRemove', arrayVar: 'itens', end: 'shift' },
        { type: 'var', name: 'n', value: { type: 'arrayLength', arrayVar: 'itens' } },
      ],
      extensions: [],
    }

    const files = generateProjectFiles({ ir: source, projectName: 'Listas' })
    const parsed = parseProjectFiles(files)
    const types = collectTypes(buildWorkspaceStateFromIR(parsed).blocks.blocks)

    expect(types).toContain('sz_val_array')
    expect(types).toContain('sz_val_array_length')
    expect(types).toContain('sz_js_array_push')
    expect(types).toContain('sz_js_array_remove')
    expect(types).not.toContain('sz_adv_raw_js')
  })

  it('preserva __id da IR como id do bloco Blockly', () => {
    const ir: SZIR = {
      html: [{ __id: 'h1_bloco', type: 'element', tag: 'h1', text: 'Olá' }],
      css: [{ __id: 'css_body', selector: 'body', declarations: { color: '#ffffff' } }],
      js: [{ __id: 'log_bloco', type: 'consoleLog', value: { type: 'str', value: 'oi' } }],
      extensions: [],
    }

    const state = buildWorkspaceStateFromIR(ir)
    const blocks = collectBlocks(state.blocks.blocks)
    expect(blocks.some((block) => block.id === 'h1_bloco')).toBe(true)
    expect(blocks.some((block) => block.id === 'css_body')).toBe(true)
    expect(blocks.some((block) => block.id === 'log_bloco')).toBe(true)
  })

  it('mantém ids sintéticos no roundtrip parseado para alimentar source map da Ponte', () => {
    const source: SZIR = {
      html: [{ type: 'element', tag: 'h1', text: 'Olá' }],
      css: [{ selector: 'body', declarations: { background: '#000000' } }],
      js: [{ type: 'consoleLog', value: { type: 'str', value: 'ponte' } }],
      extensions: [],
    }

    const files = generateProjectFiles({ ir: source, projectName: 'Roundtrip' })
    const parsed = assignStableIdsToIR(parseProjectFiles(files), 'bridge')
    const state = buildWorkspaceStateFromIR(parsed)
    const { sourceMap } = generateProjectFilesWithMap({ ir: parsed, projectName: 'Roundtrip' })
    const blocks = collectBlocks(state.blocks.blocks)

    for (const block of blocks) {
      // Os 3 frames são estruturais (não vêm do código), então não têm id/origem.
      if (block.type.startsWith('sz_frame_')) continue
      expect(block.id ? sourceMap[block.id] : null).toBeTruthy()
    }
  })

  it('Fase 5: listener por nome e this fazem roundtrip sem cair em avançado', () => {
    const source: SZIR = {
      html: [],
      css: [],
      js: [
        {
          type: 'eventHandler',
          target: 'restartBtn',
          targetKind: 'var',
          event: 'click',
          handlerName: 'startGame',
        },
        { type: 'classOp', targetId: '', targetKind: 'this', op: 'add', className: 'flip' },
        { type: 'arrayPush', arrayVar: 'selecionadas', value: { type: 'thisRef' } },
        {
          type: 'var',
          name: 'v',
          value: { type: 'classContains', targetId: '', targetKind: 'this', className: 'flip' },
        },
      ],
      extensions: [],
    }
    const files = generateProjectFiles({ ir: source, projectName: 'Fase5' })
    const parsed = parseProjectFiles(files)
    const types = collectTypes(buildWorkspaceStateFromIR(parsed).blocks.blocks)
    expect(types).toContain('sz_js_on_event_named')
    expect(types).toContain('sz_val_this')
    expect(types).toContain('sz_js_class_op')
    expect(types).toContain('sz_val_class_contains')
    expect(types).not.toContain('sz_adv_raw_js')
  })

  it('Fase 4: juntar texto, índice, juntar listas e embaralhar fazem roundtrip', () => {
    const source: SZIR = {
      html: [],
      css: [],
      js: [
        {
          type: 'var',
          name: 'msg',
          value: {
            type: 'concat',
            parts: [
              { type: 'str', value: 'Oi ' },
              { type: 'var', name: 'nome' },
            ],
          },
        },
        {
          type: 'var',
          name: 'primeiro',
          value: { type: 'index', arrayVar: 'cartas', index: { type: 'num', value: 0 } },
        },
        {
          type: 'var',
          name: 'todas',
          value: {
            type: 'concatArrays',
            parts: [
              { type: 'var', name: 'a' },
              { type: 'var', name: 'b' },
            ],
          },
        },
        { type: 'var', name: 'baralho', value: { type: 'shuffle', arrayVar: 'cartas' } },
      ],
      extensions: [],
    }
    const files = generateProjectFiles({ ir: source, projectName: 'Fase4' })
    const parsed = parseProjectFiles(files)
    const types = collectTypes(buildWorkspaceStateFromIR(parsed).blocks.blocks)
    expect(types).toContain('sz_val_join')
    expect(types).toContain('sz_val_array_index')
    expect(types).toContain('sz_val_concat_arrays')
    expect(types).toContain('sz_val_shuffle')
    expect(types).not.toContain('sz_adv_raw_js')
  })

  it('Fase 3: DOM dinâmico faz roundtrip sem cair em avançado', () => {
    const source: SZIR = {
      html: [],
      css: [],
      js: [
        { type: 'createElement', tag: 'div', varName: 'card' },
        {
          type: 'setDataset',
          targetId: 'card',
          targetKind: 'var',
          key: 'emoji',
          value: { type: 'str', value: '🐶' },
        },
        {
          type: 'setProperty',
          targetId: 'card',
          targetKind: 'var',
          property: 'innerHTML',
          value: { type: 'str', value: '<b>?</b>' },
        },
        { type: 'appendChild', parentVar: 'board', childVar: 'card' },
        {
          type: 'var',
          name: 'tem',
          value: {
            type: 'classContains',
            targetId: 'card',
            targetKind: 'var',
            className: 'flip',
          },
        },
        {
          type: 'var',
          name: 'e',
          value: { type: 'datasetGet', objectVar: 'card', key: 'emoji' },
        },
      ],
      extensions: [],
    }
    const files = generateProjectFiles({ ir: source, projectName: 'Fase3' })
    const parsed = parseProjectFiles(files)
    const types = collectTypes(buildWorkspaceStateFromIR(parsed).blocks.blocks)
    expect(types).toContain('sz_js_create_element')
    expect(types).toContain('sz_js_set_dataset')
    expect(types).toContain('sz_js_append_child')
    expect(types).toContain('sz_val_class_contains')
    expect(types).toContain('sz_val_dataset')
    expect(types).toContain('sz_adv_raw_js')
  })

  it('Fase 2: forEach e setTimeout fazem roundtrip sem cair em avançado', () => {
    const source: SZIR = {
      html: [],
      css: [],
      js: [
        {
          type: 'forEach',
          arrayExpr: { type: 'var', name: 'cards' },
          itemName: 'carta',
          indexName: 'i',
          body: [{ type: 'consoleLog', value: { type: 'var', name: 'carta' } }],
        },
        {
          type: 'setTimeout',
          delay: { type: 'num', value: 1000 },
          body: [{ type: 'consoleLog', value: { type: 'str', value: 'fim' } }],
        },
        {
          type: 'setInterval',
          delay: { type: 'num', value: 500 },
          body: [{ type: 'consoleLog', value: { type: 'str', value: 'tick' } }],
        },
      ],
      extensions: [],
    }
    const files = generateProjectFiles({ ir: source, projectName: 'Fase2' })
    const parsed = parseProjectFiles(files)
    const types = collectTypes(buildWorkspaceStateFromIR(parsed).blocks.blocks)
    expect(types).toContain('sz_js_for_each')
    expect(types).toContain('sz_js_set_timeout')
    expect(types).toContain('sz_js_set_interval')
    expect(types).not.toContain('sz_adv_raw_js')
  })

  it('animationLoop cancelável + cancelAnimationFrame fazem roundtrip sem avançado', () => {
    const source: SZIRV2 = {
      version: 2,
      html: [],
      css: [],
      behavior: {
        start: [],
        events: [
          {
            type: 'event',
            target: 'parar',
            event: 'click',
            body: [{ type: 'cancelAnimationFrame', handle: { type: 'var', name: 'animId' } }],
          },
        ],
        loops: [
          {
            type: 'animationLoop',
            handle: 'animId',
            body: [{ type: 'consoleLog', value: { type: 'str', value: 'tick' } }],
          },
        ],
      },
      extensions: [],
    }
    const files = generateProjectFiles({ ir: source, projectName: 'Anim' })
    const parsed = parseProjectFiles(files)
    // O id sobrevive ao parse da Ponte (animationLoop.handle preservado).
    expect(parsed.behavior.loops).toEqual([
      expect.objectContaining({ type: 'animationLoop', handle: 'animId' }),
    ])
    const parsedEvent = parsed.behavior.events[0]
    expect(parsedEvent?.type).toBe('event')
    expect(parsedEvent?.type === 'event' ? parsedEvent.body[0]?.type : undefined).toBe(
      'cancelAnimationFrame',
    )
    const types = collectTypes(buildWorkspaceStateFromIR(parsed).blocks.blocks)
    expect(types).toContain('sz_canvas_anim_loop')
    expect(types).toContain('sz_canvas_cancel_anim')
    expect(types).not.toContain('sz_adv_raw_js')
  })

  it('animationLoop sem id continua idêntico ao comportamento atual', () => {
    const source: SZIR = {
      html: [],
      css: [],
      js: [
        { type: 'animationLoop', body: [{ type: 'consoleLog', value: { type: 'num', value: 1 } }] },
      ],
      extensions: [],
    }
    const files = generateProjectFiles({ ir: source, projectName: 'AnimSimples' })
    expect(files['script.js']).not.toContain('cancelAnimationFrame')
    expect(files['script.js']).not.toMatch(/let \w+;\n\s*function/)
    const parsed = parseProjectFiles(files)
    expect(parsed.behavior.loops[0]).toMatchObject({ type: 'animationLoop' })
    expect(parsed.behavior.loops[0]).not.toHaveProperty('handle')
  })

  it('Fase 1: função, chamada-comando e chamada-valor fazem roundtrip sem avançado', () => {
    const source: SZIR = {
      html: [],
      css: [],
      js: [
        {
          type: 'funcDecl',
          name: 'dobro',
          params: ['n'],
          body: [
            {
              type: 'return',
              value: {
                type: 'binop',
                op: '*',
                left: { type: 'var', name: 'n' },
                right: { type: 'num', value: 2 },
              },
            },
          ],
        },
        { type: 'callFunction', name: 'iniciar', args: [{ type: 'num', value: 1 }] },
        {
          type: 'var',
          name: 'r',
          value: { type: 'call', name: 'dobro', args: [{ type: 'num', value: 5 }] },
        },
      ],
      extensions: [],
    }
    const files = generateProjectFiles({ ir: source, projectName: 'Fase1' })
    const parsed = parseProjectFiles(files)
    const types = collectTypes(buildWorkspaceStateFromIR(parsed).blocks.blocks)
    expect(types).toContain('sz_js_function')
    expect(types).toContain('sz_js_call_function')
    expect(types).toContain('sz_val_call_function')
    expect(types).toContain('sz_js_return')
    expect(types).not.toContain('sz_adv_raw_js')
  })

  it('preserva função nomeada assíncrona e await no round-trip por blocos', () => {
    const source: SZIR = {
      html: [],
      css: [],
      js: [
        {
          type: 'funcDecl',
          name: 'carregar',
          params: ['url'],
          async: true,
          body: [
            {
              type: 'awaitStmt',
              value: {
                type: 'call',
                name: 'fetch',
                args: [{ type: 'var', name: 'url' }],
              },
            },
          ],
        },
      ],
      extensions: [],
    }
    const state = buildWorkspaceStateFromIR(source)
    // A espera virou o TIPO do bloco: não há mais campo ASYNC para conferir.
    const functionBlock = collectBlocks(state.blocks.blocks).find(
      (candidate) => candidate.type === 'sz_js_function_async',
    )
    expect(functionBlock?.fields).toMatchObject({ NAME: 'carregar' })

    const workspace = new Blockly.Workspace()
    Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, workspace)
    expect(buildIRFromWorkspace(workspace).behavior.start[0]).toMatchObject({
      type: 'funcDecl',
      name: 'carregar',
      async: true,
    })
    workspace.dispose()
  })

  it('Fase 0: booleano e incremento fazem roundtrip sem cair em avançado', () => {
    const source: SZIR = {
      html: [],
      css: [],
      js: [
        { type: 'var', name: 'lockBoard', value: { type: 'bool', value: false } },
        { type: 'var', name: 'moves', value: { type: 'num', value: 0 } },
        {
          type: 'assign',
          name: 'moves',
          value: {
            type: 'binop',
            op: '+',
            left: { type: 'var', name: 'moves' },
            right: { type: 'num', value: 1 },
          },
        },
      ],
      extensions: [],
    }
    const files = generateProjectFiles({ ir: source, projectName: 'Fase0' })
    const parsed = parseProjectFiles(files)
    const types = collectTypes(buildWorkspaceStateFromIR(parsed).blocks.blocks)
    expect(types).toContain('sz_val_bool')
    expect(types).toContain('sz_js_var_increment')
    expect(types).not.toContain('sz_adv_raw_js')
  })

  it('null faz roundtrip como sz_val_null (não cai em avançado)', () => {
    const source: SZIR = {
      html: [],
      css: [],
      js: [
        { type: 'var', name: 'alvo', value: { type: 'null' } },
        {
          type: 'assign',
          name: 'temAlvo',
          value: {
            type: 'binop',
            op: '!==',
            left: { type: 'var', name: 'alvo' },
            right: { type: 'null' },
          },
        },
      ],
      extensions: [],
    }
    const files = generateProjectFiles({ ir: source, projectName: 'Null' })
    const parsed = parseProjectFiles(files)
    const types = collectTypes(buildWorkspaceStateFromIR(parsed).blocks.blocks)
    expect(types).toContain('sz_val_null')
    expect(types).toContain('sz_val_compare')
    expect(types).not.toContain('sz_adv_raw_js')
  })
})

describe('Canvas — round-trip de width/height pela Ponte', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('preserva <canvas width=200 height=100> no ciclo código→blocos→código', () => {
    // Regressão (finding #20): largura/altura saíram dos campos do bloco, mas a
    // IR ainda as carrega. Sem stash no `data` do bloco, o round-trip blocos→IR
    // lia campos W/H inexistentes e o tamanho do canvas desaparecia.
    const html = '<canvas id="tela" width="200" height="100"></canvas>'
    const parsed = parseProjectFiles({ 'index.html': html, 'style.css': '', 'script.js': '' })
    // O parser leu width/height do HTML para a IR.
    expect(parsed.html[0]).toMatchObject({ type: 'canvas', id: 'tela', width: 200, height: 100 })

    // Carrega num workspace de verdade e lê a IR de volta (exercita o stash em
    // `data` + a recuperação em buildIR).
    const state = buildWorkspaceStateFromIR(parsed)
    const ws = new Blockly.Workspace()
    Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
    const ir2 = buildIRFromWorkspace(ws)
    expect(ir2.html[0]).toMatchObject({ type: 'canvas', id: 'tela', width: 200, height: 100 })

    // E o HTML regenerado mantém os atributos.
    const out = generateProjectFiles({ ir: ir2, projectName: 'Canvas' })
    expect(out['index.html']).toContain('width="200"')
    expect(out['index.html']).toContain('height="100"')
  })

  it('canvas sem width/height continua sem stash no `data` (round-trip estável)', () => {
    const state = buildWorkspaceStateFromIR({
      html: [{ type: 'canvas', id: 'tela' }],
      css: [],
      js: [],
      extensions: [],
    })
    const canvasBlock = collectBlocks(state.blocks.blocks).find((b) => b.type === 'sz_html_canvas')
    expect(canvasBlock).toBeDefined()
    expect(canvasBlock?.data).toBeUndefined()
  })

  it('fallback de bloco "código avançado" carrega JS válido, não um dump do IR', () => {
    // storageSet com chave NÃO-literal (variável) não cabe no bloco estruturado
    // (cuja chave é um campo de texto) → cai no bloco de código avançado. O CODE
    // tem que ser a CHAMADA real, não um JSON.stringify do nó (que sumia com o
    // setItem ao gerar o código).
    const state = buildWorkspaceStateFromIR({
      html: [],
      css: [],
      js: [
        {
          type: 'storageSet',
          store: 'local',
          key: { type: 'var', name: 'chave' },
          value: { type: 'var', name: 'valor' },
        },
      ],
      extensions: [],
    })
    const raw = collectBlocks(state.blocks.blocks).find((b) => b.type === 'sz_adv_raw_js')
    expect(raw).toBeDefined()
    expect(raw?.fields?.CODE).toBe('localStorage.setItem(chave, valor);')
    // E NÃO um dump do IR.
    expect(raw?.fields?.CODE).not.toContain('"type"')
  })
})

function collectTypes(blocks: SerializedBlocklyBlock[]): string[] {
  const types: string[] = []
  for (const block of blocks) visit(block, types)
  return types
}

function collectBlocks(blocks: SerializedBlocklyBlock[]): SerializedBlocklyBlock[] {
  const all: SerializedBlocklyBlock[] = []
  for (const block of blocks) visitBlock(block, all)
  return all
}

function visit(block: SerializedBlocklyBlock, types: string[]): void {
  types.push(block.type)
  if (block.inputs) {
    for (const input of Object.values(block.inputs)) {
      if (input.block) visit(input.block, types)
      if (input.shadow) visit(input.shadow, types)
    }
  }
  if (block.next) visit(block.next.block, types)
}

function visitBlock(block: SerializedBlocklyBlock, blocks: SerializedBlocklyBlock[]): void {
  blocks.push(block)
  if (block.inputs) {
    for (const input of Object.values(block.inputs)) {
      if (input.block) visitBlock(input.block, blocks)
      if (input.shadow) visitBlock(input.shadow, blocks)
    }
  }
  if (block.next) visitBlock(block.next.block, blocks)
}
