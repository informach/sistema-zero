import { describe, expect, it } from 'bun:test'
import { isInteractiveControlTarget, isTextEntryTarget } from './dom'

describe('guards de alvo dos atalhos globais', () => {
  it('reconhece campos e descendentes de conteúdo editável', () => {
    const input = document.createElement('input')
    const editor = document.createElement('div')
    const child = document.createElement('span')
    editor.contentEditable = 'true'
    editor.append(child)

    expect(isTextEntryTarget(input)).toBe(true)
    expect(isTextEntryTarget(child)).toBe(true)
    expect(isTextEntryTarget(document.body)).toBe(false)
  })

  it('reconhece ícones dentro de botões como controles interativos', () => {
    const button = document.createElement('button')
    const icon = document.createElement('svg')
    button.append(icon)

    expect(isInteractiveControlTarget(icon)).toBe(true)
    expect(isTextEntryTarget(icon)).toBe(false)
  })
})
