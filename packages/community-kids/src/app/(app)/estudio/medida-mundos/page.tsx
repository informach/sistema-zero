import { WorldMeasurementClient } from '@sistemazero/member-shell/components/creator/world-measurement-client'
import { isPrivilegedRole } from '@sistemazero/member-shell/lib/studio-tier'
import { studioExampleFilesBase } from '@sistemazero/member-shell/server/studio-example-files'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Medida dos mundos grandes',
  robots: { index: false, follow: false },
}

/**
 * A medida dos mundos de 2 km num aparelho de verdade (plano "Mundos de 2 km", lote 8), só para a
 * equipe: quem não é da equipe vê 404, e sem o endereço dos exemplos grandes do ambiente também.
 */
export default async function MedidaDosMundosPage() {
  const session = await getSession()
  if (!isPrivilegedRole(session?.role)) notFound()
  const base = studioExampleFilesBase()
  if (!base) notFound()
  return <WorldMeasurementClient filesBase={base} />
}
