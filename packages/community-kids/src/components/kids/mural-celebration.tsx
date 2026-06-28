'use client'

import type { StudioShareResult } from '@sistemazero/studio'
import { useModalA11y } from '@sistemazero/ui/use-modal-a11y'
import { Gamepad2, Link2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { KidsConfetti } from './kids-confetti'
import { KidsMascot } from './mascot'

/**
 * Celebração ao PUBLICAR o jogo no Mural — o clímax do projeto. Overlay com o Zappy comemorando,
 * confete e, como herói, o link público de JOGAR. Disparada pelo `onShared` do `StudioBlockView`
 * (o `ShareDialog` do editor fecha e entrega os links aqui), no lugar da tela de sucesso sóbria do
 * editor. Só no kids (o Estúdio Completo segue com a telinha padrão do `ShareDialog`).
 */
export function MuralCelebration({
  result,
  onClose,
}: {
  result: StudioShareResult
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const cardRef = useModalA11y<HTMLDivElement>({ open: true, onClose })
  // Limpa o timer do "Link copiado!" se a criança fechar a celebração antes dos 2s.
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(copiedTimer.current), [])

  async function copyLink() {
    if (!result.playUrl) return
    try {
      const abs = new URL(result.playUrl, window.location.origin).href
      if (!navigator.clipboard) throw new Error('clipboard indisponível')
      await navigator.clipboard.writeText(abs)
      setCopyFailed(false)
      setCopied(true)
      clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard pode falhar (permissão/contexto inseguro) — avisa em vez de morrer no clique.
      setCopyFailed(true)
    }
  }

  return (
    <div
      className="sz-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <KidsConfetti />
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Jogo publicado no Mural"
        onClick={(e) => e.stopPropagation()}
        className="sz-modal w-full max-w-md rounded-3xl bg-card p-6 text-center shadow-xl outline-none md:p-8"
      >
        <KidsMascot expression="celebrating" className="kid-wiggle mx-auto size-24" />
        <h2 className="sz-display mt-3 text-2xl">Seu jogo está no Mural! 🎉</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Agora todo mundo pode jogar o que você criou.
        </p>

        <div className="mt-7 flex flex-col items-stretch gap-3">
          {result.playUrl ? (
            <a
              href={result.playUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="sz-btn-gradient inline-flex h-12 items-center justify-center gap-2 text-base"
            >
              <Gamepad2 className="size-5" /> Jogar meu jogo
            </a>
          ) : null}
          {result.playUrl ? (
            <button
              type="button"
              onClick={() => void copyLink()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border-2 border-border font-semibold text-sm transition-colors hover:bg-muted"
            >
              <Link2 className="size-4" />
              {copied ? 'Link copiado!' : 'Copiar link de jogar'}
            </button>
          ) : null}
          {/* Anuncia o sucesso ao leitor de tela (a troca de rótulo no botão não é falada). */}
          <span aria-live="polite" className="sr-only">
            {copied ? 'Link copiado!' : ''}
          </span>
          {copyFailed ? (
            <p role="status" className="text-muted-foreground text-xs">
              Não consegui copiar agora. Toque em Jogar meu jogo para abrir o link.
            </p>
          ) : null}
          {result.muralUrl ? (
            <a
              href={result.muralUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground text-sm transition-colors hover:text-foreground"
            >
              Ver no Mural dos Criadores
            </a>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
