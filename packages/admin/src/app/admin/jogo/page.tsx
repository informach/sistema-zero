import { getSession } from '@/server/session'
import { GameAdmin } from './game-admin'

export default async function GamePage() {
  const user = await getSession()
  return <GameAdmin canWrite={user?.role === 'admin' || user?.role === 'superadmin'} />
}
