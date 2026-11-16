import { redirect } from 'next/navigation'

/**
 * O acompanhamento virou a parte Acompanhamento da área dos pais (11/10/2026) e, no redesenho de
 * 14/11/2026, a aba Progresso de cada filho, que se abre pela Família. O endereço antigo continua
 * valendo para links salvos e e-mails já enviados.
 */
export default function ResponsavelPage() {
  redirect('/pais/familia')
}
