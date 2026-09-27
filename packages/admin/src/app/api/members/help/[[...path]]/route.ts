import { NextResponse } from 'next/server'
import { forwardUpstream } from '@/server/forward'
import {
  actHelpTutorial,
  archiveHelpCollection,
  createHelpCollection,
  createHelpTutorial,
  exportHelp,
  getHelpTutorial,
  importHelp,
  listHelpCollections,
  listHelpTutorials,
  reorderHelpCollections,
  restoreHelpCollection,
  updateHelpCollection,
  updateHelpTutorial,
} from '@/server/help'

type Context = { params: Promise<{ path?: string[] }> }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const invalid = () => NextResponse.json({ error: { message: 'Rota inválida.' } }, { status: 404 })

/**
 * BFF do "Como fazer" (`/api/members/help/*` → `/members/admin/help/*`). Um catch-all com
 * allowlist explícita, molde do `teacher-broadcasts`: cada sufixo aceito aponta para UM adapter,
 * então uma rota nova no members não vira porta aberta aqui sem ninguém decidir.
 */
async function handle(req: Request, context: Context) {
  const { path = [] } = await context.params
  const [head, second, third] = path
  const json = async () => req.json().catch(() => null)
  const url = new URL(req.url)

  if (head === 'collections') {
    if (path.length === 1) {
      if (req.method === 'GET') return forwardUpstream(await listHelpCollections())
      if (req.method === 'POST') return forwardUpstream(await createHelpCollection(await json()))
      return invalid()
    }
    if (path.length === 2 && second === 'order' && req.method === 'PUT') {
      const body = (await json()) as { ids?: unknown } | null
      const ids = Array.isArray(body?.ids) ? body.ids.filter((id) => typeof id === 'string') : []
      return forwardUpstream(await reorderHelpCollections(ids))
    }
    if (second && UUID.test(second)) {
      if (path.length === 2 && req.method === 'PATCH') {
        return forwardUpstream(await updateHelpCollection(second, await json()))
      }
      if (path.length === 3 && req.method === 'POST' && third === 'archive') {
        return forwardUpstream(await archiveHelpCollection(second))
      }
      if (path.length === 3 && req.method === 'POST' && third === 'restore') {
        return forwardUpstream(await restoreHelpCollection(second))
      }
    }
    return invalid()
  }

  if (head === 'tutorials') {
    if (path.length === 1) {
      if (req.method === 'GET') {
        return forwardUpstream(
          await listHelpTutorials({
            status: url.searchParams.get('status') ?? undefined,
            collectionId: url.searchParams.get('collectionId') ?? undefined,
            q: url.searchParams.get('q') ?? undefined,
          }),
        )
      }
      if (req.method === 'POST') return forwardUpstream(await createHelpTutorial(await json()))
      return invalid()
    }
    if (path.length === 2 && second === 'export' && req.method === 'GET') {
      return forwardUpstream(await exportHelp())
    }
    if (path.length === 2 && second === 'import' && req.method === 'POST') {
      return forwardUpstream(await importHelp(await json()))
    }
    if (second && UUID.test(second)) {
      if (path.length === 2 && req.method === 'GET') {
        return forwardUpstream(await getHelpTutorial(second))
      }
      if (path.length === 2 && req.method === 'PATCH') {
        return forwardUpstream(await updateHelpTutorial(second, await json()))
      }
      if (
        path.length === 3 &&
        req.method === 'POST' &&
        (third === 'publish' || third === 'unpublish' || third === 'archive')
      ) {
        return forwardUpstream(await actHelpTutorial(second, third, await json()))
      }
    }
    return invalid()
  }
  return invalid()
}

export const GET = handle
export const POST = handle
export const PATCH = handle
export const PUT = handle
