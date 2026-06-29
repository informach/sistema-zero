'use client'

import { useRouter } from 'next/navigation'
import { KidsMascot } from './mascot'

/**
 * Produto/servidor gated: o hub não conseguiu verificar o acesso agora. Diferente
 * de bloqueio real ("ainda não liberado"), porque pode ser falha transitória.
 *
 * O retry precisa re-executar a checagem. Quando a tela é montada por um Client
 * Component (a decisão "indisponível" é estado dele), `router.refresh()` NÃO basta:
 * ele preserva o estado do client e não re-dispara o efeito de carga. Por isso o
 * `onRetry` (callback que re-roda o fetch) é o caminho real; sem ele (uso avulso),
 * cai no `router.refresh()` server-side.
 */
export function KidsAccessUnavailable({ title, onRetry }: { title: string; onRetry?: () => void }) {
  const router = useRouter()
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12 text-center">
      <KidsMascot expression="thinking" className="mx-auto size-24" />
      <h1 className="mt-4 [font-family:var(--font-display)] font-bold text-2xl">{title}</h1>
      <p className="mt-4 text-muted-foreground">
        Não consegui verificar agora se está liberado pra você. Pode ter sido um tropeço na conexão.
        Tenta de novo?
      </p>
      <button
        type="button"
        onClick={onRetry ?? (() => router.refresh())}
        className="sz-btn-gradient mt-6 h-11 px-6 text-base"
      >
        Tentar de novo
      </button>
    </div>
  )
}
