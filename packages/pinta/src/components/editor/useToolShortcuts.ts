/**
 * Atalhos de TECLA para trocar de ferramenta (P lápis, E borracha, G balde…),
 * nas letras dos programas de desenho de gente grande — a criança leva o hábito
 * junto. Serve os três editores: o pixel e o mapa trocam a ferramenta da sessão,
 * o vetor troca o estado local dele.
 *
 * Combinação com Ctrl/Cmd/Alt/Shift é ignorada (Ctrl+C/V/Z continuam sendo
 * copiar/colar/desfazer; Shift+H/V/R/X/N são atalhos de AÇÃO do
 * `useActionShortcuts`, 08/2026 — antes Shift+H trocava para a Mão junto) e
 * campos de texto também — digitar o nome do desenho não pode trocar de
 * ferramenta. Mesmo guard dos outros listeners do editor.
 */
import { useEffect, useRef } from 'react'
import { isTextEntryTarget } from '../../core/dom'
import { isPintaModalOpen } from './useActionShortcuts'

/** Monta o mapa tecla → ferramenta a partir da lista de botões do editor. */
export function toolShortcutMap<T extends string>(
  tools: ReadonlyArray<{ id: T; shortcut?: string }>,
): Record<string, T> {
  const map: Record<string, T> = {}
  for (const tool of tools) {
    if (tool.shortcut) map[tool.shortcut.toLowerCase()] = tool.id
  }
  return map
}

export function useToolShortcuts<T extends string>(
  shortcuts: Readonly<Record<string, T>>,
  setTool: (id: T) => void,
): void {
  // O callback muda de identidade a cada render (arrow no call site); o ref
  // mantém o listener registrado UMA vez.
  const setToolRef = useRef(setTool)
  setToolRef.current = setTool

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
      if (isTextEntryTarget(event.target)) return
      // Modal do Pinta aberto (a ajuda `?`, o Degradê): a letra é do modal, não
      // troca a ferramenta por trás dele. No meio de uma captura de cor, a troca
      // ainda cancelaria a captura em silêncio.
      if (isPintaModalOpen()) return
      const tool = shortcuts[event.key.toLowerCase()]
      if (tool) setToolRef.current(tool)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [shortcuts])
}
