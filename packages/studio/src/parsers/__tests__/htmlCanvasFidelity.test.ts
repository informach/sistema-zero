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

function allBlockArgs(block: (typeof HTML_BLOCKS)[number] | undefined): unknown[] {
  return [block?.args0, block?.args1, block?.args2, block?.args3, block?.args4, block?.args5].flat()
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
    const image = HTML_BLOCKS.find((block) => block.type === 'sz_html_image')
    const imageArgs = allBlockArgs(image)
    expect(imageArgs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'WIDTH' }),
        expect.objectContaining({ name: 'HEIGHT' }),
        expect.objectContaining({ name: 'LOADING' }),
      ]),
    )
    const inputArgs = allBlockArgs(input)
    expect(inputArgs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'NAME' }),
        expect.objectContaining({ name: 'VALUE' }),
        expect.objectContaining({ name: 'CHECKED' }),
        expect.objectContaining({ name: 'AUTOCOMPLETE' }),
      ]),
    )
    const textareaArgs = allBlockArgs(textarea)
    expect(textareaArgs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'NAME' }),
        expect.objectContaining({ name: 'AUTOCOMPLETE' }),
      ]),
    )
  })

  it('preserva associação, nome, valor e estado dos campos no round-trip Blockly', () => {
    const source =
      '<form><label for="aceite">Aceitar?</label><input id="aceite" name="termos" type="checkbox" value="sim" autocomplete="off" checked><textarea id="recado" name="mensagem" placeholder="Conte aqui" autocomplete="shipping street-address">Olá</textarea></form>'
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
      expect(generated).toContain('autocomplete="off"')
      expect(generated).toContain('autocomplete="shipping street-address"')
    } finally {
      workspace.dispose()
    }
  })

  it('normaliza a capitalização dos tipos de botão sem mudar sua ação', () => {
    const original = {
      html: parseHTML(
        '<form><button type="SUBMIT">Enviar</button><button type="Reset">Limpar</button><button type="BUTTON">Ação</button></form>',
      ),
      css: [],
      js: [],
      extensions: [],
    }
    const expected = parseHTML(
      '<form><button type="submit">Enviar</button><button type="reset">Limpar</button><button type="button">Ação</button></form>',
    )
    const workspace = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(
        buildWorkspaceStateFromIR(original) as unknown as Record<string, unknown>,
        workspace,
      )
      expect(stripBlocklyIds(buildIRFromWorkspace(workspace).html)).toEqual(expected)
    } finally {
      workspace.dispose()
    }
  })

  it('normaliza a capitalização dos tipos de input sem cair em HTML avançado', () => {
    const original = {
      html: parseHTML(
        '<form><input type="EMAIL"><input type="SUBMIT" value="Enviar"><input type="Reset"></form>',
      ),
      css: [],
      js: [],
      extensions: [],
    }
    const expected = parseHTML(
      '<form><input type="email"><input type="submit" value="Enviar"><input type="reset"></form>',
    )
    const workspace = new Blockly.Workspace()
    try {
      const state = buildWorkspaceStateFromIR(original)
      expect(JSON.stringify(state)).not.toContain('sz_adv_raw_html')
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, workspace)
      expect(stripBlocklyIds(buildIRFromWorkspace(workspace).html)).toEqual(expected)
    } finally {
      workspace.dispose()
    }
  })

  it('preserva type de input com espaços como HTML avançado sem mudar o controle', () => {
    const source = '<form><input id="contato" type=" EMAIL "></form>'
    const original = {
      html: parseHTML(source),
      css: [],
      js: [],
      extensions: [],
    }
    const state = buildWorkspaceStateFromIR(original)

    expect(JSON.stringify(state)).toContain('sz_adv_raw_html')

    const workspace = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, workspace)
      const rebuilt = buildIRFromWorkspace(workspace).html
      const generated = generateHTML({ body: rebuilt })
      expect(generated).toContain('<input id="contato" type=" EMAIL "')
      expect(generated).not.toContain('type="email"')
    } finally {
      workspace.dispose()
    }
  })

  it('preserva tipo de botão desconhecido como HTML avançado', () => {
    const source = '<button type="menu">Abrir menu</button>'
    const state = buildWorkspaceStateFromIR({
      html: parseHTML(source),
      css: [],
      js: [],
      extensions: [],
    })
    expect(JSON.stringify(state)).toContain('sz_adv_raw_html')
    expect(JSON.stringify(state)).toContain(source.replaceAll('"', '\\"'))
  })

  it('distingue imagem sem alt de imagem decorativa com alt vazio no round-trip Blockly', () => {
    for (const source of [
      '<img src="foto.png">',
      '<img src="foto.png" alt="">',
      '<img src="foto.png" alt="Paisagem" width="640" height="360" loading="lazy">',
      '<img src="foto.png" alt="Paisagem" loading="instant">',
    ]) {
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
    const args = allBlockArgs(image)

    expect(args).toContainEqual(
      expect.objectContaining({ type: 'field_checkbox', name: 'DECORATIVE' }),
    )
  })
})
