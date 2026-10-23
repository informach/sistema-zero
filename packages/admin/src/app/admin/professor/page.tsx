import { getSession } from '@/server/session'
import { ProfessorHomeClient } from './professor-home-client'

export const dynamic = 'force-dynamic'

/** Hoje (Turma): os encontros do dia e o que espera pela equipe, numa lista só. */
export default async function ProfessorHomePage() {
  const session = await getSession()
  return <ProfessorHomeClient firstName={session?.firstName?.trim() ?? ''} />
}
