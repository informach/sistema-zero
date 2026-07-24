import { ProfessorHomeClient } from './professor-home-client'

export const dynamic = 'force-dynamic'

/** Home da Sala do Professor: pendências consolidadas + últimos recebidos. */
export default function ProfessorHomePage() {
  return <ProfessorHomeClient />
}
