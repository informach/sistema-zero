'use client'

import { useRouter } from 'next/navigation'
import { KidsMascot } from './mascot'

/**
 * Produto à parte (Estúdio/Clube): NÃO consegui verificar o acesso agora (gateway/token
 * soluçou — o `checkAccess` devolveu status ≠ 200). DISTINTO do bloqueio real ("ainda não
 * liberado"): mostrar "não liberado" a quem JÁ comprou, num erro transitório, mentiria.
 * Recado "tente de novo" + botão que re-renderiza a página (re-checa o acesso no servidor).
 */
export function KidsAccessUnavailable({ title }: { title: string }) {
  const router = useRouter()
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12 text-center">
      <KidsMascot expression="thinking" className="mx-auto size-24" />
      <h1 className="mt-4 [font-family:var(--font-display)] font-bold text-2xl">{title}</h1>
      <p className="mt-4 text-muted-foreground">
        Não consegui verificar agora se está liberado pra você. Pode ter sido um tropeço na conexão.
        Tenta de novo? 😊
      </p>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="sz-btn-gradient mt-6 h-11 px-6 text-base"
      >
        Tentar de novo
      </button>
    </div>
  )
}
