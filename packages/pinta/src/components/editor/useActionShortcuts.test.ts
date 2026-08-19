import { describe, expect, it } from 'bun:test'
import { renderHook } from '@testing-library/react'
import {
  entryKeys,
  SHORTCUT_CATALOG,
  type ShortcutEntry,
  shortcut,
  shortcutsFor,
} from '../../core/shortcuts'
import { matchesCombo, parseCombo, useActionShortcuts } from './useActionShortcuts'

function key(init: KeyboardEventInit & { key: string }): KeyboardEvent {
  return new KeyboardEvent('keydown', init)
}

describe('parseCombo', () => {
  it('separa modificadores e tecla; Cmd conta como Ctrl; Esc/Enter têm apelidos', () => {
    expect(parseCombo('Ctrl+Shift+G')).toEqual({ ctrl: true, shift: true, alt: false, key: 'G' })
    expect(parseCombo('Cmd+G')).toEqual({ ctrl: true, shift: false, alt: false, key: 'G' })
    expect(parseCombo('Alt+M')).toEqual({ ctrl: false, shift: false, alt: true, key: 'M' })
    expect(parseCombo('Esc').key).toBe('Escape')
    expect(parseCombo('Enter').key).toBe('Enter')
    expect(parseCombo('?').key).toBe('?')
    expect(parseCombo("Ctrl+'").key).toBe("'")
  })
})

describe('matchesCombo', () => {
  it('Ctrl+G casa com Ctrl e com Cmd (Mac), e NÃO com Ctrl+Shift+G', () => {
    expect(matchesCombo(key({ key: 'g', ctrlKey: true }), 'Ctrl+G')).toBe(true)
    expect(matchesCombo(key({ key: 'g', metaKey: true }), 'Ctrl+G')).toBe(true)
    expect(matchesCombo(key({ key: 'G', ctrlKey: true, shiftKey: true }), 'Ctrl+G')).toBe(false)
    expect(matchesCombo(key({ key: 'G', ctrlKey: true, shiftKey: true }), 'Ctrl+Shift+G')).toBe(
      true,
    )
    expect(matchesCombo(key({ key: 'g' }), 'Ctrl+G')).toBe(false)
  })

  it('a letra solta não casa com a combinação (X ≠ Ctrl+X ≠ Shift+X)', () => {
    expect(matchesCombo(key({ key: 'x' }), 'X')).toBe(true)
    expect(matchesCombo(key({ key: 'x', ctrlKey: true }), 'X')).toBe(false)
    expect(matchesCombo(key({ key: 'X', shiftKey: true }), 'X')).toBe(false)
    expect(matchesCombo(key({ key: 'X', shiftKey: true }), 'Shift+X')).toBe(true)
  })

  it('teclado ABNT2: o colchete casa pelo CARACTERE, não pela posição física (Ctrl+[ é Ctrl+[)', () => {
    // No ABNT2 a tecla `[` fica onde o americano tem `BracketRight`, e `]` em `Backslash`.
    expect(matchesCombo(key({ key: '[', code: 'BracketRight', ctrlKey: true }), 'Ctrl+[')).toBe(
      true,
    )
    expect(matchesCombo(key({ key: '[', code: 'BracketRight', ctrlKey: true }), 'Ctrl+]')).toBe(
      false,
    )
    expect(matchesCombo(key({ key: ']', code: 'Backslash', ctrlKey: true }), 'Ctrl+]')).toBe(true)
    expect(
      matchesCombo(
        key({ key: '}', code: 'Backslash', ctrlKey: true, shiftKey: true }),
        'Ctrl+Shift+]',
      ),
    ).toBe(true)
    expect(
      matchesCombo(
        key({ key: '{', code: 'BracketRight', ctrlKey: true, shiftKey: true }),
        'Ctrl+Shift+[',
      ),
    ).toBe(true)
    // A aspa simples do ABNT2 fica na posição do `Backquote`: casa pelo caractere.
    expect(matchesCombo(key({ key: "'", code: 'Backquote', ctrlKey: true }), "Ctrl+'")).toBe(true)
  })

  it('Mac: Option+letra chega como tecla morta ou símbolo (Dead, µ, ç, Â) e casa pela tecla física', () => {
    expect(matchesCombo(key({ key: 'Dead', code: 'KeyN', altKey: true }), 'Alt+N')).toBe(true)
    expect(matchesCombo(key({ key: 'µ', code: 'KeyM', altKey: true }), 'Alt+M')).toBe(true)
    expect(matchesCombo(key({ key: 'ç', code: 'KeyC', altKey: true }), 'Alt+C')).toBe(true)
    expect(
      matchesCombo(key({ key: 'Â', code: 'KeyM', altKey: true, shiftKey: true }), 'Alt+Shift+M'),
    ).toBe(true)
    expect(
      matchesCombo(key({ key: 'Ó', code: 'KeyH', altKey: true, shiftKey: true }), 'Alt+Shift+H'),
    ).toBe(true)
    // Sem Alt, `µ` NÃO é `m`.
    expect(matchesCombo(key({ key: 'µ', code: 'KeyM' }), 'M')).toBe(false)
  })

  it('Ctrl+= também aceita Ctrl+Shift+= (o "Ctrl++" de quem aproxima pelo teclado)', () => {
    expect(
      matchesCombo(key({ key: '+', code: 'Equal', ctrlKey: true, shiftKey: true }), 'Ctrl+='),
    ).toBe(true)
  })

  it('colchetes e aspas casam pelo CARACTERE (Ctrl+Shift+] chega como "}" no teclado americano)', () => {
    expect(matchesCombo(key({ key: ']', code: 'BracketRight', ctrlKey: true }), 'Ctrl+]')).toBe(
      true,
    )
    expect(
      matchesCombo(
        key({ key: '}', code: 'BracketRight', ctrlKey: true, shiftKey: true }),
        'Ctrl+Shift+]',
      ),
    ).toBe(true)
    expect(
      matchesCombo(
        key({ key: '}', code: 'BracketRight', ctrlKey: true, shiftKey: true }),
        'Ctrl+]',
      ),
    ).toBe(false)
    expect(matchesCombo(key({ key: "'", code: 'Quote', ctrlKey: true }), "Ctrl+'")).toBe(true)
  })

  it('zoom: Ctrl+= aceita o = e o + do teclado numérico; Ctrl+- aceita o Minus e o NumpadSubtract', () => {
    expect(matchesCombo(key({ key: '=', code: 'Equal', ctrlKey: true }), 'Ctrl+=')).toBe(true)
    expect(matchesCombo(key({ key: '+', code: 'NumpadAdd', ctrlKey: true }), 'Ctrl+=')).toBe(true)
    expect(matchesCombo(key({ key: '-', code: 'Minus', ctrlKey: true }), 'Ctrl+-')).toBe(true)
    expect(matchesCombo(key({ key: '-', code: 'NumpadSubtract', ctrlKey: true }), 'Ctrl+-')).toBe(
      true,
    )
    expect(matchesCombo(key({ key: '0', code: 'Digit0', ctrlKey: true }), 'Ctrl+0')).toBe(true)
  })

  it('"?" casa só pelo caractere: nunca pela posição Slash (Shift+; do ABNT2 é ":", não a ajuda)', () => {
    expect(matchesCombo(key({ key: '?', code: 'Slash', shiftKey: true }), '?')).toBe(true)
    expect(matchesCombo(key({ key: '?' }), '?')).toBe(true)
    expect(matchesCombo(key({ key: '/', code: 'Slash' }), '?')).toBe(false)
    expect(matchesCombo(key({ key: ':', code: 'Slash', shiftKey: true }), '?')).toBe(false)
  })

  it('teclado numérico com NumLock desligado (Delete/Insert na posição do . e do 0) NÃO casa "." nem "0"', () => {
    expect(matchesCombo(key({ key: 'Delete', code: 'NumpadDecimal' }), '.')).toBe(false)
    expect(matchesCombo(key({ key: 'Insert', code: 'Numpad0', ctrlKey: true }), 'Ctrl+0')).toBe(
      false,
    )
    // Com NumLock ligado o `key` é o caractere e casa normalmente.
    expect(matchesCombo(key({ key: '.', code: 'NumpadDecimal' }), '.')).toBe(true)
    expect(matchesCombo(key({ key: '0', code: 'Numpad0', ctrlKey: true }), 'Ctrl+0')).toBe(true)
  })

  it('sem `code` (evento sintético) o ponto e a vírgula casam pelo `key`', () => {
    expect(matchesCombo(key({ key: '.' }), '.')).toBe(true)
    expect(matchesCombo(key({ key: ',' }), ',')).toBe(true)
    expect(matchesCombo(key({ key: '.', ctrlKey: true }), '.')).toBe(false)
  })

  it('F3, Esc, Enter e Alt+letra', () => {
    expect(matchesCombo(key({ key: 'F3' }), 'F3')).toBe(true)
    expect(matchesCombo(key({ key: 'Escape' }), 'Esc')).toBe(true)
    expect(matchesCombo(key({ key: 'Enter' }), 'Enter')).toBe(true)
    expect(matchesCombo(key({ key: 'm', altKey: true }), 'Alt+M')).toBe(true)
    expect(matchesCombo(key({ key: 'M', altKey: true, shiftKey: true }), 'Alt+Shift+M')).toBe(true)
    expect(matchesCombo(key({ key: 'M', altKey: true, shiftKey: true }), 'Alt+M')).toBe(false)
  })
})

describe('useActionShortcuts (o listener)', () => {
  function fire(init: KeyboardEventInit & { key: string }): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { ...init, cancelable: true })
    window.dispatchEvent(event)
    return event
  }

  it('tecla SEGURADA (repeat): o combo casado é sempre prevenido, mas só roda de novo com `repeat: true`', () => {
    let zoom = 0
    let frames = 0
    const hook = renderHook(() =>
      useActionShortcuts([
        { combo: 'Ctrl+=', run: () => (zoom += 1) },
        { combo: '.', run: () => (frames += 1), repeat: true },
      ]),
    )
    try {
      expect(fire({ key: '=', ctrlKey: true }).defaultPrevented).toBe(true)
      // Segurar Ctrl+=: o navegador NÃO recebe (senão vira zoom da página), e a ação não repete.
      const held = fire({ key: '=', ctrlKey: true, repeat: true })
      expect(held.defaultPrevented).toBe(true)
      expect(zoom).toBe(1)
      // Segurar `.` varre os quadros.
      fire({ key: '.' })
      fire({ key: '.', repeat: true })
      expect(frames).toBe(2)
      // Combo que não é de ninguém segue livre para o navegador.
      expect(fire({ key: 't', ctrlKey: true }).defaultPrevented).toBe(false)
    } finally {
      hook.unmount()
    }
  })
})

describe('catálogo de atalhos', () => {
  it('cada id existe uma vez e `shortcut(id)` devolve a combinação', () => {
    const ids = SHORTCUT_CATALOG.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(shortcut('group')).toBe('Ctrl+G')
    expect(shortcut('help')).toBe('?')
  })

  it('no MESMO editor, duas ações LIGADAS nunca dividem a mesma combinação', () => {
    for (const editor of ['pixel', 'vector', 'tilemap'] as const) {
      const bound = shortcutsFor(editor).filter((s) => s.bound !== false)
      const combos = bound.map((s) => s.combo)
      expect(new Set(combos).size).toBe(combos.length)
    }
  })

  it('as combinações reservadas pelo navegador ou pelo Mac ficam fora do catálogo', () => {
    // Ctrl+N/T/W e Ctrl+1..9 o navegador não entrega; Cmd+H / Cmd+Option+H (Cmd = Ctrl no
    // Mac) escondem o navegador; Cmd+L é a barra de endereço. Alt+Shift+letra troca o
    // idioma do teclado no Windows com dois layouts.
    const reserved = /^Ctrl\+(Shift\+)?(N|T|W|[1-9])$|^Ctrl\+(Alt\+)?(H|L)$|^Alt\+Shift\+/
    for (const entry of SHORTCUT_CATALOG) expect(reserved.test(entry.combo)).toBe(false)
    // Cmd+Shift+[ e Cmd+Shift+] trocam de aba no Mac: essas entradas mostram (e aceitam) o
    // Control físico lá; as demais viram Cmd na ajuda.
    for (const entry of SHORTCUT_CATALOG as readonly ShortcutEntry[]) {
      if (/^Ctrl\+Shift\+[[\]]$/.test(entry.combo)) {
        expect(entry.macCombo).toBe(entry.combo)
        expect(entryKeys(entry, true)[0]).toBe('Control')
      } else if (entry.combo.startsWith('Ctrl+')) {
        expect(entryKeys(entry, true)[0]).toBe('Cmd')
      }
    }
  })

  it('a curadoria da aula tira da ajuda o que a professora escondeu (grade, espelho, seleção)', () => {
    const all = shortcutsFor('pixel').map((s) => s.id)
    expect(all).toContain('grid')
    expect(all).toContain('selectAll')
    const curated = shortcutsFor('pixel', ['pencil', 'eraser']).map((s) => s.id)
    expect(curated).not.toContain('grid')
    expect(curated).not.toContain('mirrorH')
    expect(curated).not.toContain('selectAll')
    expect(curated).not.toContain('paste')
    // O que não depende da caixa continua (desfazer, zoom, ajuda).
    expect(curated).toContain('undo')
    expect(curated).toContain('zoomIn')
    expect(curated).toContain('help')
  })
})
