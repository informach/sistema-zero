export const dynamic = 'force-dynamic'

export function GET(): Response {
  return Response.json({ ok: true, commit: process.env.RAILWAY_GIT_COMMIT_SHA ?? null })
}
