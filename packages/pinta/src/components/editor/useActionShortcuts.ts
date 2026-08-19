/**
 * Atalhos de AÇÃO (Ctrl+G agrupa, X troca as cores, Shift+H espelha, `.` avança o
 * quadro…) — o irmão do `useToolShortcuts`, que só troca de ferramenta.
 *
 * Cada componente liga os SEUS (o escopo vetorial liga agrupar/ordem, a caixa
 * do pixel liga espelhar/trocar cor, a faixa de quadros liga os quadros…): as
 * ações moram onde já moram, e o hook só amarra a tecla ao `run` — sem içar
 * estado. Os `combo`s vêm de `core/shortcuts.ts` (`shortcut('group')`), nunca
 * escritos à mão, para a ajuda e o listener nunca divergirem.
 *
 * Regras (as mesmas dos listeners históricos): ignora campos de texto; ignora
 * evento já consumido (`defaultPrevented` — o Esc da Caneta, o Esc do Dialog);
 * ignora quando um modal do PINTA está aberto (as ações mexem no desenho por
 * trás); tecla SEGURADA (`event.repeat`) não roda de novo (senão Alt+N criava
 * quadros em rajada) — mas o combo casado é SEMPRE prevenido, repetido ou não:
 * segurar Ctrl+= por meio segundo não pode virar zoom da página inteira a partir
 * do 2º keydown. Quem quer repetir (zoom, `.`/`,` varrendo quadros) pede
 * `repeat: true`. `preventDefault` SÓ quando casa (senão o Ctrl+= do navegador
 * continua livre onde não há ação). Cmd vale como Ctrl (Mac).
 *
 * Como a tecla casa (revisão de 18/08/2026, teclado ABNT2 e Mac):
 * - primeiro pelo `event.key` NORMALIZADO (o caractere que a criança vê na tecla:
 *   `{` conta como `[`, `+` como `=`, `?` como `/`…). É o que faz Ctrl+`[` ser
 *   Ctrl+`[` no ABNT2 — onde a tecla física `[` fica na posição do `BracketRight`
 *   americano — em vez de casar "para a frente";
 * - o `code` físico só entra quando o `key` não é um caractere imprimível
 *   (`Dead`, `Unidentified`, `Process`) ou é uma letra que o Alt transformou (no
 *   Mac, Option+N produz `Dead`, Option+M produz `µ`, Option+C `ç`): aí Alt+N casa
 *   pelo `code: KeyN`.
 */
import { useEffect, useRef } from 'react'
import { isTextEntryTarget } from '../../core/dom'

export interface ActionShortcutBinding {
  /** "Ctrl+Shift+G", "Shift+H", "X", "?", "F3", "Ctrl+]", "Alt+N", "Esc", "Enter", ".", ",". */
  combo: string
  run: () => void
  /** Portão extra (ex.: só com seleção; ou "não em cima de um botão"). Sem portão = sempre. */
  when?: (event: KeyboardEvent) => boolean
  /** Tecla segurada repete a ação (zoom, varrer quadros). Padrão: roda só no 1º keydown. */
  repeat?: boolean
}

interface ParsedCombo {
  ctrl: boolean
  shift: boolean
  alt: boolean
  key: string
}

/**
 * O caractere "com Shift" e o "sem Shift" da mesma tecla, no teclado americano e no
 * ABNT2: os dois viram o símbolo do combo. `Ctrl+Shift+]` chega como `}` — casa com `]`.
 */
const SHIFTED_SYMBOL: Readonly<Record<string, string>> = {
  '{': '[',
  '}': ']',
  '"': "'",
  '+': '=',
  _: '-',
  '>': '.',
  '<': ',',
  '?': '/',
  ')': '0',
  '!': '1',
  '@': '2',
  '#': '3',
  $: '4',
  '%': '5',
  '¨': '6',
  '^': '6',
  '&': '7',
  '*': '8',
  '(': '9',
}

/**
 * Símbolos e dígitos casados pelo `code` físico quando o `key` não ajuda (tecla morta).
 * Só posições da fileira principal: as do teclado numérico com NumLock desligado chegam
 * como `Delete`/`Insert`/setas (`key` sem caractere) e NÃO podem virar `.`/`0`.
 */
const CODE_BY_KEY: Readonly<Record<string, readonly string[]>> = {
  '[': ['BracketLeft'],
  ']': ['BracketRight'],
  "'": ['Quote'],
  '=': ['Equal'],
  '-': ['Minus'],
  '.': ['Period'],
  ',': ['Comma'],
  '/': ['Slash'],
  '0': ['Digit0'],
  '1': ['Digit1'],
  '2': ['Digit2'],
  '3': ['Digit3'],
  '4': ['Digit4'],
  '5': ['Digit5'],
  '6': ['Digit6'],
  '7': ['Digit7'],
  '8': ['Digit8'],
  '9': ['Digit9'],
}

/** Teclas cujo Shift é PARTE da tecla (`?` = Shift+/): o Shift não é conferido. */
const SHIFT_IMPLIED = new Set(['?'])
/** `Ctrl+=` também aceita `Ctrl+Shift+=` (o "Ctrl++" que muita gente digita para aproximar). */
const SHIFT_TOLERANT = new Set(['='])

const KEY_ALIASES: Readonly<Record<string, string>> = {
  esc: 'Escape',
  escape: 'Escape',
  enter: 'Enter',
  space: ' ',
  espaço: ' ',
  delete: 'Delete',
  backspace: 'Backspace',
}

/** `key` sem valor de caractere (tecla morta / composição / desconhecida). */
const NON_CHARACTER_KEYS = new Set(['Dead', 'Unidentified', 'Process'])

export function parseCombo(combo: string): ParsedCombo {
  const parts = combo.split('+')
  // Um combo que TERMINA em '+' ("Ctrl++") teria o último token vazio: tratamos como '='.
  const rawKey = parts.length > 0 ? (parts[parts.length - 1] ?? '') : ''
  const modifiers = parts.slice(0, -1).map((p) => p.toLowerCase())
  const lowered = rawKey.toLowerCase()
  const key = KEY_ALIASES[lowered] ?? (rawKey === '' ? '=' : rawKey)
  return {
    ctrl: modifiers.includes('ctrl') || modifiers.includes('cmd'),
    shift: modifiers.includes('shift'),
    alt: modifiers.includes('alt'),
    key,
  }
}

/** O caractere do evento, já sem o efeito do Shift (`}` → `]`, `+` → `=`). */
function normalizedKey(event: KeyboardEvent): string {
  const key = event.key
  if (key.length !== 1) return key
  return SHIFTED_SYMBOL[key] ?? key
}

/** A letra da tecla FÍSICA (`KeyN` → `n`), quando o `code` diz que é uma letra. */
function letterFromCode(code: string): string | null {
  return /^Key[A-Z]$/.test(code) ? (code.slice(3).toLowerCase() ?? null) : null
}

/** A tecla do evento casa com a do combo? */
function keyMatches(event: KeyboardEvent, key: string): boolean {
  // `?` é sempre um caractere (Shift+/ no americano, tecla própria em outros — e nunca
  // tecla morta): só pelo `key`. Casar pela POSIÇÃO `Slash` faria Shift+; (o `:` do
  // ABNT2, que mora nessa posição) abrir a ajuda.
  if (key === '?') return event.key === '?'
  const wanted = key.length === 1 ? key.toLowerCase() : key
  const seen = normalizedKey(event)
  const seenLower = seen.length === 1 ? seen.toLowerCase() : seen
  // 1) Pelo caractere que a criança vê na tecla (independe da posição física — ABNT2).
  if (seenLower === wanted) return true
  // 2) Sem caractere útil (tecla morta / Alt no Mac / composição): pela tecla física.
  //    Só nesses casos: `Delete`, `Insert`, setas… têm `key` próprio e não caem aqui
  //    (o `.` do numérico com NumLock desligado chega como `Delete` e não é "próximo quadro").
  const noCharacter = NON_CHARACTER_KEYS.has(event.key) || (event.altKey && /^[a-z]$/.test(wanted))
  if (noCharacter) {
    const codes = CODE_BY_KEY[wanted]
    if (codes?.includes(event.code)) return true
    if (/^[a-z]$/.test(wanted) && letterFromCode(event.code) === wanted) return true
  }
  // 3) Uma letra que o Alt/Option deformou (`µ` no lugar de `m`): pela tecla física.
  if (event.altKey && /^[a-z]$/.test(wanted) && letterFromCode(event.code) === wanted) return true
  return false
}

export function matchesCombo(event: KeyboardEvent, combo: string): boolean {
  const parsed = parseCombo(combo)
  const ctrl = event.ctrlKey || event.metaKey
  if (ctrl !== parsed.ctrl) return false
  if (event.altKey !== parsed.alt) return false
  if (!SHIFT_IMPLIED.has(parsed.key)) {
    if (SHIFT_TOLERANT.has(parsed.key)) {
      // Ctrl+= aceita Shift (Ctrl++), mas Ctrl+Shift+= não vira Ctrl+= quando o combo
      // exige Shift explicitamente.
      if (parsed.shift && !event.shiftKey) return false
    } else if (event.shiftKey !== parsed.shift) {
      return false
    }
  }
  return keyMatches(event, parsed.key)
}

/**
 * Há um modal DO PINTA aberto? Aí as ações do desenho (que está atrás dele) ficam
 * mudas. Só os diálogos do pacote contam (`data-pinta-dialog`): um `role="dialog"`
 * do host sempre montado (um painel qualquer da comunidade) não pode matar os atalhos.
 */
export function isPintaModalOpen(): boolean {
  return typeof document !== 'undefined' && document.querySelector('[data-pinta-dialog]') !== null
}

export function useActionShortcuts(bindings: ReadonlyArray<ActionShortcutBinding>): void {
  // As ações mudam de identidade a cada render (arrows no call site); o ref
  // mantém o listener registrado UMA vez e sempre com as ações do último render.
  const bindingsRef = useRef(bindings)
  bindingsRef.current = bindings

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.defaultPrevented) return
      if (isTextEntryTarget(event.target)) return
      // O `?` e o Enter dentro de um modal são do modal; e agrupar por trás de
      // uma janela aberta seria mexer no que a criança não está olhando.
      if (isPintaModalOpen()) return
      for (const binding of bindingsRef.current) {
        if (!matchesCombo(event, binding.combo)) continue
        if (binding.when && !binding.when(event)) continue
        // Casou: o navegador não recebe (nem a repetição — senão segurar Ctrl+= vira
        // zoom da página a partir do 2º keydown, com o Ctrl+0 de volta também tomado).
        event.preventDefault()
        if (event.repeat && !binding.repeat) return
        binding.run()
        return
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
