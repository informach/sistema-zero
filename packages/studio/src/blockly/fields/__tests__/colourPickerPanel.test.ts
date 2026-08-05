import { afterEach, describe, expect, it } from 'bun:test'
import {
  buildColourPickerPanel,
  hexToHsv,
  hsvToHex,
  supportsEyeDropper,
  svFromPointer,
} from '../colourPickerPanel'

type GlobalWithEyeDropper = typeof globalThis & { EyeDropper?: unknown }

afterEach(() => {
  ;(globalThis as GlobalWithEyeDropper).EyeDropper = undefined
})

describe('conversões hex ↔ hsv', () => {
  it('faz round-trip nas cores saturadas e nos extremos', () => {
    for (const hex of ['#ff0000', '#00ff00', '#0000ff', '#22d3ee', '#000000', '#ffffff']) {
      expect(hsvToHex(hexToHsv(hex))).toBe(hex)
    }
  })

  it('svFromPointer clampa nas bordas e inverte o eixo do brilho', () => {
    const rect = { width: 200, height: 100 }
    expect(svFromPointer(rect, 0, 100)).toEqual({ h: 0, s: 0, v: 0 })
    expect(svFromPointer(rect, 200, 0)).toEqual({ h: 0, s: 1, v: 1 })
    expect(svFromPointer(rect, -50, 999).s).toBe(0)
    expect(svFromPointer(rect, -50, 999).v).toBe(0)
  })
})

describe('buildColourPickerPanel', () => {
  it('mostra controles em português e emite hex ao mexer no matiz', () => {
    const changes: string[] = []
    const panel = buildColourPickerPanel({
      initial: '#ff0000',
      onChange: (hex) => changes.push(hex),
    })

    const sv = panel.root.querySelector('.sz-colour-sv')
    expect(sv?.getAttribute('aria-label')).toBe('Saturação e brilho da cor')
    const hue = panel.root.querySelector<HTMLInputElement>('.sz-colour-hue')
    expect(hue?.getAttribute('aria-label')).toBe('Matiz da cor')

    if (!hue) throw new Error('slider de matiz ausente')
    hue.value = '120'
    hue.dispatchEvent(new Event('input'))
    expect(changes.at(-1)).toBe('#00ff00')
  })

  it('setHex sincroniza o estado sem emitir onChange', () => {
    const changes: string[] = []
    const panel = buildColourPickerPanel({
      initial: '#ff0000',
      onChange: (hex) => changes.push(hex),
    })
    panel.setHex('#0000ff')
    expect(changes).toEqual([])
    const hue = panel.root.querySelector<HTMLInputElement>('.sz-colour-hue')
    expect(hue?.value).toBe('240')
  })

  it('sem a API EyeDropper (Firefox), o conta-gotas não aparece', () => {
    const panel = buildColourPickerPanel({ initial: '#ff0000', onChange: () => {} })
    expect(panel.root.querySelector('.sz-colour-eyedropper')).toBeNull()
    expect(supportsEyeDropper()).toBe(false)
  })

  it('com a API EyeDropper, o botão aparece em PT e aplica a cor pega', async () => {
    ;(globalThis as GlobalWithEyeDropper).EyeDropper = class {
      open() {
        return Promise.resolve({ sRGBHex: '#123456' })
      }
    }
    const changes: string[] = []
    const panel = buildColourPickerPanel({
      initial: '#ff0000',
      onChange: (hex) => changes.push(hex),
    })
    const button = panel.root.querySelector<HTMLButtonElement>('.sz-colour-eyedropper')
    expect(button?.textContent).toBe('💧 Conta-gotas')
    if (!button) throw new Error('botão do conta-gotas ausente')
    button.click()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(changes.at(-1)).toBe('#123456')
  })
})
