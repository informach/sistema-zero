import 'server-only'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import type { StudioPythonAnalysisAuthorization } from '@sistemazero/core/studio/python-language-authorization'
import { StudioContextualRuntimeDecisionSchema } from '@sistemazero/core/studio/runtime-authorization'

/** Shared acknowledgement check for native analysis and read-only Python assistance.
 * It consumes a fresh Members response, never a browser-supplied approval. */
export async function validatePythonAnalysisDecision(
  raw: unknown,
  authorization: StudioPythonAnalysisAuthorization,
  actor: { userId: string; accountId: string },
  now = Date.now(),
) {
  const parsed = StudioContextualRuntimeDecisionSchema.safeParse(raw)
  if (!parsed.success) return null
  const decision = parsed.data
  const { context } = authorization
  const expectedContext =
    context.kind === 'live'
      ? (({ expectedWorkspaceRevision: _, ...lease }) => lease)(context)
      : context
  if (
    decision.actor.userId !== actor.userId ||
    decision.actor.accountId !== actor.accountId ||
    decision.operation !== 'analyze' ||
    decision.projectId !== authorization.subject.id ||
    decision.revision !== authorization.revision ||
    decision.subjectSha256 !== (await sha256Hex(canonicalJson(authorization.subject))) ||
    canonicalJson(decision.context) !== canonicalJson(expectedContext) ||
    canonicalJson(decision.runtime) !== canonicalJson(authorization.subject.runtime) ||
    (context.kind === 'live' &&
      (!('workspaceRevision' in decision) ||
        decision.workspaceRevision !== context.expectedWorkspaceRevision)) ||
    decision.releaseStatus === 'revoked' ||
    decision.expiresAt <= now ||
    decision.issuedAt > now + 5000 ||
    decision.expiresAt <= decision.issuedAt ||
    decision.expiresAt - decision.issuedAt > 30_000
  )
    return null
  return decision
}
