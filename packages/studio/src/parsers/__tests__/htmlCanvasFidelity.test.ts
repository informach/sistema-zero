import { beforeAll, describe, expect, it } from 'bun:test'
import 'blockly/blocks'
import * as Blockly from 'blockly/core'
import { CANVAS_BLOCKS } from '../../blockly/blocks/canvas'
import { HTML_BLOCKS } from '../../blockly/blocks/html'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { generateHTML } from '../../generators/html'
import { parseHTML } from '../html'

function stripBlocklyIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripBlocklyIds)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) =>
      key === '__id' ? [] : [[key, stripBlocklyIds(child)]],
    ),
  )
}

describe('HTML/Canvas — fidelidade e semântica acessível', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('preserva atributos, conteúdo alternativo e ausência de id no Canvas', () => {
    const source =
      '<canvas class="responsiva" aria-label="Jogo" data-level="2">Desenho interativo</canvas>'
    const nodes = parseHTML(source)

    expect(nodes).toEqual([
      {
        type: 'canvas',
        attrs: { class: 'responsiva', 'aria-label': 'Jogo', 'data-level': '2' },
        children: [{ type: 'text', text: 'Desenho interativo' }],
      },
    ])
    const generated = generateHTML({ body: nodes })
    expect(generated).toContain(source)
    expect(generated).not.toContain('id="tela"')
  })

  it('preserva o Canvas completo ao atravessar IR, Blockly e IR', () => {
    const original = {
      html: parseHTML(
        '<canvas class="responsiva" aria-label="Jogo" width="320" height="180">Uma arena</canvas>',
      ),
      css: [],
      js: [],
      extensions: [],
    }
    const state = buildWorkspaceStateFromIR(original)
    const workspace = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, workspace)
      expect(stripBlocklyIds(buildIRFromWorkspace(workspace).html)).toEqual(original.html)
    } finally {
      workspace.dispose()
    }
  })

  it('oferece descrição no Canvas e completa os dados nativos de formulário', () => {
    const canvas = CANVAS_BLOCKS.find((block) => block.type === 'sz_html_canvas')
    const label = HTML_BLOCKS.find((block) => block.type === 'sz_html_label')
    const input = HTML_BLOCKS.find((block) => block.type === 'sz_html_input')
    const textarea = HTML_BLOCKS.find((block) => block.type === 'sz_html_textarea')

    expect(canvas?.args2).toContainEqual(expect.objectContaining({ name: 'DESCRIPTION' }))
    expect(label?.args0).toContainEqual(expect.objectContaining({ name: 'FOR' }))
    const inputArgs = [input?.args0, input?.args1, input?.args2, input?.args3].flat()
    expect(inputArgs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'NAME' }),
        expect.objectContaining({ name: 'VALUE' }),
        expect.objectContaining({ name: 'CHECKED' }),
      ]),
    )
    const textareaArgs = [textarea?.args0, textarea?.args1, textarea?.args2].flat()
    expect(textareaArgs).toContainEqual(expect.objectContaining({ name: 'NAME' }))
  })

  it('preserva associação, nome, valor e estado dos campos no round-trip Blockly', () => {
    const source =
      '<form><label for="aceite">Aceitar?</label><input id="aceite" name="termos" type="checkbox" value="sim" checked><textarea id="recado" name="mensagem" placeholder="Conte aqui">Olá</textarea></form>'
    const original = { html: parseHTML(source), css: [], js: [], extensions: [] }
    const state = buildWorkspaceStateFromIR(original)
    const workspace = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, workspace)
      const rebuilt = stripBlocklyIds(buildIRFromWorkspace(workspace).html)
      expect(rebuilt).toEqual(original.html)
      const generated = generateHTML({ body: rebuilt as ReturnType<typeof parseHTML> })
      expect(generated).toContain('<label for="aceite">Aceitar?</label>')
      expect(generated).toContain('name="termos"')
      expect(generated).toContain('value="sim"')
      expect(generated).toContain('checked=""')
      expect(generated).toContain('name="mensagem"')
    } finally {
      workspace.dispose()
    }
  })

  it('distingue imagem sem alt de imagem decorativa com alt vazio no round-trip Blockly', () => {
    for (const source of ['<img src="foto.png">', '<img src="foto.png" alt="">']) {
      const original = { html: parseHTML(source), css: [], js: [], extensions: [] }
      const state = buildWorkspaceStateFromIR(original)
      const workspace = new Blockly.Workspace()
      try {
        Blockly.serialization.workspaces.load(
          state as unknown as Record<string, unknown>,
          workspace,
        )
        const rebuilt = stripBlocklyIds(buildIRFromWorkspace(workspace).html)
        expect(rebuilt, source).toEqual(original.html)
      } finally {
        workspace.dispose()
      }
    }
  })

  it('expõe uma escolha explícita para imagem decorativa', () => {
    const image = HTML_BLOCKS.find((block) => block.type === 'sz_html_image')
    const args = [image?.args0, image?.args1, image?.args2].flat()

    expect(args).toContainEqual(
      expect.objectContaining({ type: 'field_checkbox', name: 'DECORATIVE' }),
    )
  })
})
