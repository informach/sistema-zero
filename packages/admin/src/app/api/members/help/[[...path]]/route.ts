import { NextResponse } from 'next/server'
import { forwardUpstream } from '@/server/forward'
import { createHelpAdminClient } from '@/server/help'

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
  const audience = url.searchParams.get('audience') ?? 'kids'
  if (audience !== 'kids' && audience !== 'adult')
    return NextResponse.json({ error: { message: 'Público inválido.' } }, { status: 400 })
  const help = createHelpAdminClient(audience)

  if (head === 'collections') {
    if (path.length === 1) {
      if (req.method === 'GET') return forwardUpstream(await help.listHelpCollections())
      if (req.method === 'POST')
        return forwardUpstream(await help.createHelpCollection(await json()))
      return invalid()
    }
    if (path.length === 2 && second === 'order' && req.method === 'PUT') {
      const body = (await json()) as { ids?: unknown } | null
      const ids = Array.isArray(body?.ids) ? body.ids.filter((id) => typeof id === 'string') : []
      return forwardUpstream(await help.reorderHelpCollections(ids))
    }
    if (second && UUID.test(second)) {
      if (path.length === 2 && req.method === 'PATCH') {
        return forwardUpstream(await help.updateHelpCollection(second, await json()))
      }
      if (path.length === 3 && req.method === 'POST' && third === 'archive') {
        return forwardUpstream(await help.archiveHelpCollection(second))
      }
      if (path.length === 3 && req.method === 'POST' && third === 'restore') {
        return forwardUpstream(await help.restoreHelpCollection(second))
      }
    }
    return invalid()
  }

  if (head === 'tutorials') {
    if (path.length === 1) {
      if (req.method === 'GET') {
        return forwardUpstream(
          await help.listHelpTutorials({
            status: url.searchParams.get('status') ?? undefined,
            collectionId: url.searchParams.get('collectionId') ?? undefined,
            q: url.searchParams.get('q') ?? undefined,
          }),
        )
      }
      if (req.method === 'POST') return forwardUpstream(await help.createHelpTutorial(await json()))
      return invalid()
    }
    if (path.length === 2 && second === 'export' && req.method === 'GET') {
      return forwardUpstream(await help.exportHelp())
    }
    if (path.length === 2 && second === 'import' && req.method === 'POST') {
      return forwardUpstream(await help.importHelp(await json()))
    }
    if (second && UUID.test(second)) {
      if (path.length === 2 && req.method === 'GET') {
        return forwardUpstream(await help.getHelpTutorial(second))
      }
      if (path.length === 2 && req.method === 'PATCH') {
        return forwardUpstream(await help.updateHelpTutorial(second, await json()))
      }
      if (
        path.length === 3 &&
        req.method === 'POST' &&
        (third === 'publish' || third === 'unpublish' || third === 'archive')
      ) {
        return forwardUpstream(await help.actHelpTutorial(second, third, await json()))
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
