'use client'

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
 * estão guardados (vivem no servidor), sem atalho para o Estúdio (aqui não dá para confirmar que
 * a conta tem o Estúdio). Mesmo molde
 * `KidsRecado` do `KidsAccessUnavailable`, sem a pílula do motivo (tropeço não é conquista).
 */
export function KidsPensaUnavailable() {
  const router = useRouter()
  return (
    <KidsRecado
      art={<KidsMascot expression="thinking" className="kid-float size-24" />}
      title="O Pensa não abriu agora"
      actions={
        <button type="button" onClick={() => router.refresh()} className="sz-btn-gradient">
          Tentar de novo
        </button>
      }
    >
      <p>Nada do que você fez no Pensa se perde. Tente de novo daqui a pouco.</p>
    </KidsRecado>
  )
}
