import { redirect } from 'next/navigation'

/**
 * O atendimento mora em `/pais/ajuda/atendimento` desde 11/10/2026. Os avisos de resposta por e-mail
 * já enviados apontam para cá: o redirecionamento mantém esses links vivos.
 */
export default function AjudaDoResponsavelPage() {
  redirect('/pais/ajuda/atendimento')
}
