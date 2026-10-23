import { redirect } from 'next/navigation'

/**
 * O acompanhamento virou a parte Acompanhamento da área dos pais (11/10/2026). O endereço antigo
 * continua valendo para links salvos e e-mails já enviados.
 */
export default function ResponsavelPage() {
  redirect('/pais/acompanhamento')
}
