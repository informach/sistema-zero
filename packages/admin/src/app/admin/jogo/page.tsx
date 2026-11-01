import { getSession } from '@/server/session'
import { JogoClient } from './jogo-client'

export default async function GamePage() {
  const user = await getSession()
  return <JogoClient canWrite={user?.role === 'admin' || user?.role === 'superadmin'} />
}
