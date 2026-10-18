import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { StudioFreeOptionsSchema } from '@sistemazero/core/studio/authoring-catalog'
import {
  StudioFreeRuntimeDecisionSchema,
  type StudioFreeRuntimeRequest,
} from '@sistemazero/core/studio/runtime-authorization'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import type { StudioAuthoringPolicy } from '../../domain/studio/authoring-policy'
import type { StudioRuntimePolicy } from '../../domain/studio/runtime-policy'
import type { FreeStudioAccessService, FreeStudioActor } from './free-studio-access.service'

export class AuthorizeFreeRuntimeService {
  constructor(
    private readonly access: FreeStudioAccessService,
    private readonly policy: StudioRuntimePolicy | undefined,
    private readonly catalog: Pick<StudioAuthoringPolicy, 'describe'> | undefined,
    private readonly clock: () => number = Date.now,
  ) {}

  async options(actor: FreeStudioActor) {
    const reward = await this.access.execute(actor)
    return StudioFreeOptionsSchema.parse({
      legacyJavaScript: true,
      catalog: this.catalog?.describe() ?? null,
      canCreatePro: reward.pro,
      pythonCuration: { pythonLevel: 3, allowedModes: reward.modes, allowLevelReveal: false },
    })
  }

  async execute(actor: FreeStudioActor, request: StudioFreeRuntimeRequest) {
    if (actor.audience !== request.context.audience)
      throw new AccessDeniedError('O público precisa corresponder à sessão do Estúdio.')
    if (!this.policy)
      throw new AccessDeniedError('O ambiente de execução ainda não está disponível.')
    const reward = await this.access.execute(
      actor,
      request.subject.kind === 'pro' ? 'existing-pro' : 'creation',
    )
    if (
      request.context.projectId !== request.subject.id ||
      request.subject.programmingLanguage !== 'python'
    )
      throw new AccessDeniedError('A execução precisa corresponder ao projeto Python aberto.')
    if (request.subject.kind === 'pro' && !reward.pro)
      throw new AccessDeniedError(
        'Seu nível ainda não libera criar projetos Pro no Estúdio Completo.',
      )
    const curation = {
      pythonLevel: 3 as const,
      allowedModes: request.subject.kind === 'pro' ? ['code' as const] : [...reward.modes],
      allowLevelReveal: false,
    }
    const resolved = this.policy.authorize({
      project: request.subject,
      operation: request.operation,
      curation,
      grantedCapabilities: ['edit', 'execute', 'pause', 'export-source', 'python-repl'],
    })
    const issuedAt = this.clock()
    return StudioFreeRuntimeDecisionSchema.parse({
      version: 1,
      actor: { userId: actor.userId, accountId: actor.accountId },
      context: request.context,
      projectId: request.subject.id,
      revision: request.revision,
      subjectSha256: await sha256Hex(canonicalJson(request.subject)),
      runtime: request.subject.runtime,
      operation: request.operation,
      ...resolved,
      curation,
      issuedAt,
      expiresAt: issuedAt + 30_000,
    })
  }
}
