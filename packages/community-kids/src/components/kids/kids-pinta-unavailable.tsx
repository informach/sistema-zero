'use client'

import { useRouter } from 'next/navigation'
import { KidsMascot } from './mascot'

/**
 * Pinta: NÃO consegui verificar o acesso agora (gateway/token soluçou —
 * `checkPintaAccessReadonly` devolveu status ≠ 200). É DISTINTO do bloqueio real
 * (`KidsLockedPinta`, "peça a um responsável"): mostrar "ainda não liberado" a quem
 * JÁ tem o produto, num erro transitório, mentiria que ela não tem acesso. Aqui o
 * recado é "tente de novo" + um botão que re-renderiza a página (re-checa no servidor).
 */
export function KidsPintaUnavailable() {
  const router = useRouter()
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12 text-center">
      <KidsMascot expression="thinking" className="mx-auto size-24" />
      <h1 className="mt-4 [font-family:var(--font-display)] font-bold text-2xl">Pinta</h1>
      <p className="mt-4 text-muted-foreground">
        Não consegui verificar agora se o Pinta está liberado pra você. Pode ter sido um tropeço na
        conexão. Tenta de novo? 😊
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
