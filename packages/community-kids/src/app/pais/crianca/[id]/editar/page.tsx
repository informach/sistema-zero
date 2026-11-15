import { redirect } from 'next/navigation'
import { childHref } from '../../../parent-routes'

export const dynamic = 'force-dynamic'

/**
 * Editar o perfil virou a aba Perfil da página do filho (redesenho de 14/11/2026). O endereço
 * antigo continua valendo para os links já enviados e leva direto à aba.
 */
export default async function EditChildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(childHref(id, 'perfil'))
}
