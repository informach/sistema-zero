'use client'

import { useEffect } from 'react'

// Trava de scroll do body REFCONTADA: vários travadores (modais empilhados, overlay de tela
// cheia) coexistem — o body só destrava quando o ÚLTIMO solta. Guarda o overflow original p/
// restaurar exatamente o que havia antes. Estado de módulo (uma trava por documento).
let bodyScrollLocks = 0
let previousBodyOverflow: string | null = null

export function lockBodyScroll(): void {
  if (bodyScrollLocks === 0) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  bodyScrollLocks++
}

export function unlockBodyScroll(): void {
  bodyScrollLocks = Math.max(0, bodyScrollLocks - 1)
  if (bodyScrollLocks === 0) {
    document.body.style.overflow = previousBodyOverflow ?? ''
    previousBodyOverflow = null
  }
}

/**
 * Trava o scroll do body enquanto `active` for true. Refcontado: coexiste com o `<Dialog>` e
 * qualquer outro travador — fechar um diálogo aberto POR CIMA de um overlay de tela cheia não
 * destrava o body cedo demais (a barra de rolagem fantasma da página não volta).
 */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    lockBodyScroll()
    return unlockBodyScroll
  }, [active])
}
