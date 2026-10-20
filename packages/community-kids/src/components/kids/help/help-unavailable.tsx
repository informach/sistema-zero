'use client'

import { useRouter } from 'next/navigation'
import { KidsRecado } from '../kids-recado'
import { KidsMascot } from '../mascot'

/**
 * O members não respondeu. É o irmão do `KidsAccessUnavailable`, mas SEM a frase "se está
 * liberado pra você": o Como fazer não tem gate nenhum, então falar de liberação aqui
 * sugeriria à criança que a biblioteca pode estar trancada para ela. Renderizado SOZINHO na
 * página (sem o `KidsPageHeader`), porque o recado já traz o título da tela.
 */
export function HelpUnavailable() {
  const router = useRouter()
  return (
    <KidsRecado
      // Zappy pensativo, como no `KidsAccessUnavailable` e nas outras telas de "a gente
      // tropeçou": a cena `alivio` (sorriso com coração) contradizia o recado de problema.
      art={<KidsMascot expression="thinking" className="kid-float size-24" />}
      title="Como fazer"
      actions={
        <button type="button" onClick={() => router.refresh()} className="sz-btn-gradient">
          Tentar de novo
        </button>
      }
    >
      <p>
        Não consegui abrir os tutoriais agora. Pode ter sido um tropeço na conexão. Tenta de novo?
      </p>
    </KidsRecado>
  )
}
