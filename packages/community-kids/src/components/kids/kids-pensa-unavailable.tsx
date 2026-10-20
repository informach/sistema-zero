'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { KidsRecado } from './kids-recado'
import { KidsMascot } from './mascot'

/**
 * Pensa: NÃO consegui verificar o acesso agora (gateway/token soluçou —
 * `checkPensaAccessReadonly` devolveu status ≠ 200). É DISTINTO do bloqueio real
 * (`KidsLockedPensa`): mostrar "ainda não liberado" a quem JÁ tem o produto, num erro
 * transitório, mentiria que ela não tem acesso.
 *
 * Copy do Canvas "Estados" (20/10/2026): "O Pensa não abriu agora", dizendo que os jogos
 * estão guardados (vivem no servidor) e com o Estúdio como caminho enquanto isso. Mesmo molde
 * `KidsRecado` do `KidsAccessUnavailable`, sem a pílula do motivo (tropeço não é conquista).
 */
export function KidsPensaUnavailable() {
  const router = useRouter()
  return (
    <KidsRecado
      art={<KidsMascot expression="thinking" className="kid-float size-24" />}
      title="O Pensa não abriu agora"
      actions={
        <>
          <button type="button" onClick={() => router.refresh()} className="sz-btn-gradient">
            Tentar de novo
          </button>
          <Link href="/estudio" className="sz-btn-gradient sz-btn-contorno">
            Ir para o Estúdio
          </Link>
        </>
      }
    >
      <p>Os seus jogos e as suas missões estão guardados. Tente de novo daqui a pouco.</p>
    </KidsRecado>
  )
}
