'use client'

import { useRouter } from 'next/navigation'
import { KidsRecado } from './kids-recado'
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
    <KidsRecado
      // Zappy pensativo, a mesma pose das outras telas de "a gente tropeçou" (erro do app,
      // 404, perfis indisponíveis): algo deu errado e ele está conferindo. A cena `alivio`
      // (sorriso com coração) contradizia a mensagem de problema. Decorativo (alt vazio): o
      // texto ao lado diz tudo. Sem a pílula amarela do motivo: tropeço não é conquista.
      art={<KidsMascot expression="thinking" className="kid-float size-24" />}
      title={title}
      actions={
        <button
          type="button"
          onClick={onRetry ?? (() => router.refresh())}
          className="sz-btn-gradient"
        >
          Tentar de novo
        </button>
      }
    >
      <p>
        Não consegui verificar agora se está liberado pra você. Pode ter sido um tropeço na conexão.
        Tenta de novo?
      </p>
    </KidsRecado>
  )
}
