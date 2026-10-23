import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import {
  StudioPublicRuntimeDecisionSchema,
  type StudioPublicRuntimeRequest,
} from '@sistemazero/core/studio/runtime-authorization'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import type { StudioRuntimePolicy } from '../../domain/studio/runtime-policy'

/** No learner entitlement is used for anonymous play. Only the authenticated
 * member-shell caller may attest a Hub-visible retained publication revision.
 */
export class AuthorizePublicRuntimeService {
  constructor(
    private readonly policy: StudioRuntimePolicy | undefined,
    private readonly clock: () => number = Date.now,
  ) {}

  async execute(request: StudioPublicRuntimeRequest) {
    if (
      !this.policy ||
      request.subject.programmingLanguage !== 'python' ||
      request.operation !== 'execute'
    )
      throw new AccessDeniedError('O ambiente deste jogo não está disponível.')
    const curation = {
      pythonLevel: 3 as const,
      allowedModes: [request.subject.mode],
      allowLevelReveal: false,
    }
    const resolved = this.policy.authorize({
      project: request.subject,
      operation: 'execute',
      curation,
      grantedCapabilities: ['execute', 'pause'],
    })
    const issuedAt = this.clock()
    return StudioPublicRuntimeDecisionSchema.parse({
      version: 1,
      actor: null,
      context: request.context,
      projectId: request.subject.id,
      revision: request.revision,
      subjectSha256: await sha256Hex(canonicalJson(request.subject)),
      runtime: request.subject.runtime,
      operation: 'execute',
      ...resolved,
      // Public play never exposes authoring palettes or editing/install/REPL grants.
      capabilities: resolved.capabilities.filter(
        (capability) => capability === 'execute' || capability === 'pause',
      ),
      blockIds: [],
      curation,
      issuedAt,
      expiresAt: issuedAt + 30_000,
    })
  }
}
