'use client'

import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { useEffect, useState } from 'react'
import { KidsMascot } from './mascot'

/** Os "combinados" do Clube — regras gentis, em tom kids, que dão segurança ao espaço. */
const COMBINADOS = [
  { emoji: '💛', text: 'Seja gentil: trate a turma como você gostaria de ser tratado.' },
  { emoji: '🎉', text: 'Mostre as suas criações e comemore as dos colegas.' },
  { emoji: '🔒', text: 'Não combine encontros nem passe telefone, senha ou endereço.' },
  { emoji: '🚩', text: 'Se algo te incomodar, toque em "Avisar professor".' },
] as const

/** Chave por PERFIL (mesmo padrão do `level-up-watcher`) — cada criança vê 1x. */
function storageKey(viewerId: string): string {
  return `sz:kids:clube:onboarded:${viewerId}`
}

/**
 * "Os combinados do Clube": um modal gentil que ABRE SOZINHO na 1ª visita da criança
 * (gated por `localStorage` por perfil) e fica sempre acessível por um botão no
 * cabeçalho. É o onboarding + as regras de convivência — o que faz o espaço parecer
 * seguro e acolhedor. Best-effort: `localStorage` indisponível (modo privado) só faz o
 * modal não auto-abrir; o botão segue funcionando.
 */
export function ClubeCombinados({ viewerId }: { viewerId: string }) {
  const [open, setOpen] = useState(false)

  // 1ª visita → abre sozinho. Roda só no cliente (efeito), fora do render.
  useEffect(() => {
    if (!viewerId) return
    try {
      if (!localStorage.getItem(storageKey(viewerId))) setOpen(true)
    } catch {
      // sem localStorage (modo privado) → não auto-abre; o botão ainda abre.
    }
  }, [viewerId])

  const close = () => {
    setOpen(false)
    try {
      localStorage.setItem(storageKey(viewerId), '1')
    } catch {
      // best-effort: se não salvar, reabre na próxima — sem prejuízo.
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-border bg-card px-3 py-1.5 font-bold text-foreground text-xs transition-colors hover:border-primary"
      >
        <span aria-hidden="true">📋</span> Combinados
      </button>
      <Dialog
        open={open}
        onClose={close}
        title="Os combinados do Clube"
        description="Um lugar seguro e legal pra todo mundo criar junto. 💛"
        footer={<Button onClick={close}>Vamos lá! 🚀</Button>}
      >
        <div className="flex flex-col items-center gap-3">
          <KidsMascot expression="happy" className="size-20" />
          <ul className="flex w-full flex-col gap-2 text-left">
            {COMBINADOS.map((c) => (
              <li
                key={c.text}
                className="flex items-center gap-3 rounded-2xl border-2 border-border bg-card p-3"
              >
                <span aria-hidden="true" className="shrink-0 text-2xl leading-none">
                  {c.emoji}
                </span>
                <span className="text-sm">{c.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </Dialog>
    </>
  )
}
