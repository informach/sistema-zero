'use client'

import { KidsAccessUnavailable } from './kids-access-unavailable'

/**
 * Estúdio: NÃO consegui verificar o acesso agora (gateway/token soluçou —
 * `checkStudioAccessReadonly` devolveu status ≠ 200). É DISTINTO do bloqueio real
 * (`KidsLockedStudio`, "peça a um responsável"): mostrar "ainda não liberado" a quem
 * JÁ tem o produto, num erro transitório, mentiria que ela não tem acesso.
 *
 * ⚠️ Era uma cópia inteira da mesma tela, uma por ferramenta, e as quatro já tinham
 * drifado entre si. Agora é uma casca do `KidsAccessUnavailable`, que é o mesmo molde
 * usado pelo Clube e pelo Mural — cinco telas, um lugar só para consertar.
 */
export function KidsStudioUnavailable() {
  return <KidsAccessUnavailable title="Estúdio" />
}
