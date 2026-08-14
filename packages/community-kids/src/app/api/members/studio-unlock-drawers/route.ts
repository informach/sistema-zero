import { drawerSnapshotsForBlocks } from '@sistemazero/member-shell/server/studio-unlocks'
import { checkStudioAccessReadonly, getStudioUnlocksReadonly } from '@/server/members'

export async function GET() {
  const access = await checkStudioAccessReadonly().catch(() => null)
  if (!access) {
    return Response.json({ error: { code: 'UPSTREAM_UNAVAILABLE' } }, { status: 503 })
  }
  if (access.status !== 200) {
    return Response.json({ error: { code: 'ACCESS_CHECK_FAILED' } }, { status: access.status })
  }
  const ownsStudio = access.body?.access?.['estudio-completo']
  if (typeof ownsStudio !== 'boolean') {
    return Response.json({ error: { code: 'INVALID_ACCESS_RESPONSE' } }, { status: 502 })
  }
  if (!ownsStudio) {
    return Response.json({ error: { code: 'FORBIDDEN' } }, { status: 403 })
  }

  const unlocks = await getStudioUnlocksReadonly().catch(() => null)
  if (!unlocks) {
    return Response.json({ error: { code: 'UPSTREAM_UNAVAILABLE' } }, { status: 503 })
  }
  if (unlocks.status !== 200) {
    return Response.json({ error: { code: 'UNLOCKS_FETCH_FAILED' } }, { status: unlocks.status })
  }

  return Response.json({
    drawers: drawerSnapshotsForBlocks(unlocks.body?.blocks ?? []),
  })
}
