'use client'

import { useRouter } from 'next/navigation'
import { KidsRecado } from '../kids-recado'
import { KidsScene } from '../kids-scene'

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
      art={<KidsScene name="alivio" className="kid-float w-40" />}
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
