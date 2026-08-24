'use client'

import { usePlatform } from '@/components/admin/platform-store'
import { ChildrenClient } from './children-client'
import { MembersClient } from './members-client'

/**
 * "Alunos" — o MODO do seletor global decide a listagem: Kids lista CRIANÇAS
 * (perfis, busca por nome da criança); Adultos lista as CONTAS (comportamento
 * de sempre). Mesma URL — alternar plataforma troca a lista sem navegar.
 */
export default function MembrosPage() {
  const platform = usePlatform()
  return platform === 'kids' ? <ChildrenClient /> : <MembersClient />
}
