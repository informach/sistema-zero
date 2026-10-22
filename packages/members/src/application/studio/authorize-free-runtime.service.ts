import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { StudioFreeOptionsSchema } from '@sistemazero/core/studio/authoring-catalog'
import {
  StudioFreeRuntimeDecisionSchema,
  type StudioFreeRuntimeRequest,
} from '@sistemazero/core/studio/runtime-authorization'
import { pythonCourseUnlockIssue } from '@sistemazero/studio/python-course-unlocks'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import type { StudioAuthoringPolicy } from '../../domain/studio/authoring-policy'
import {
  freePythonCurriculum,
  hasPythonCourseAccess,
} from '../../domain/studio/free-python-curriculum'
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
    const catalog = this.catalog?.describe() ?? null
    const releases = new Map(
      (catalog?.catalog.releases ?? []).map((release) => [release.manifestSha256, release]),
    )
    const pythonGrantedExtensionIds = new Set<string>()
    for (const policy of catalog?.releases ?? []) {
      const release = releases.get(policy.runtime.manifestSha256)
      if (release?.manifest.programmingLanguage !== 'python') continue
      const curriculum = freePythonCurriculum(
        policy.blockIds,
        release.manifest.extensions.map(({ id }) => id),
        reward.blocks,
      )
      policy.blockIds = curriculum.blockIds
      for (const id of curriculum.grantedExtensionIds) pythonGrantedExtensionIds.add(id)
    }
    return StudioFreeOptionsSchema.parse({
      legacyJavaScript: true,
      catalog,
      canCreatePro: reward.pro,
      canCreatePython: hasPythonCourseAccess(reward.blocks),
      pythonGrantedExtensionIds: [...pythonGrantedExtensionIds],
      pythonCuration: { pythonLevel: 3, allowedModes: reward.modes, allowLevelReveal: false },
    })
  }

  async execute(actor: FreeStudioActor, request: StudioFreeRuntimeRequest) {
    actor = { ...actor }
    request = structuredClone(request)
    if (actor.audience !== request.context.audience)
      throw new AccessDeniedError('O público precisa corresponder à sessão do Estúdio.')
    if (!this.policy)
      throw new AccessDeniedError('O ambiente de execução ainda não está disponível.')
    const reward = await this.access.execute(
      actor,
      request.subject.kind === 'pro' ? 'existing-pro' : 'creation',
      'python',
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
    const catalog = this.catalog?.describe()
    const approval = catalog?.releases.find(
      ({ runtime }) =>
        runtime.profileId === request.subject.runtime.profileId &&
        runtime.releaseId === request.subject.runtime.releaseId &&
        runtime.manifestSha256 === request.subject.runtime.manifestSha256,
    )
    const release = catalog?.catalog.releases.find(
      (candidate) => candidate.manifestSha256 === request.subject.runtime.manifestSha256,
    )
    if (!approval || !release || release.manifest.programmingLanguage !== 'python')
      throw new AccessDeniedError('O ambiente Python não pertence ao catálogo aprovado.')
    const curriculum = freePythonCurriculum(
      approval.blockIds,
      release.manifest.extensions.map(({ id }) => id),
      reward.blocks,
    )
    if (
      !hasPythonCourseAccess(reward.blocks) ||
      (request.subject.kind === 'classic' &&
        (curriculum.blockIds.length === 0 || pythonCourseUnlockIssue(curriculum.blockIds) !== null))
    )
      throw new AccessDeniedError(
        'Conclua um curso Python para liberar este ambiente no Estúdio Completo.',
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
      grantedExtensionIds: curriculum.grantedExtensionIds,
      // Publication and Zappy remain absent unless the selected release declares them.
      grantedCapabilities: [
        'edit',
        'execute',
        'pause',
        'publish',
        'export-source',
        'python-repl',
        'assist',
      ],
    })
    const issuedAt = this.clock()
    const allowedBlockIds = new Set(curriculum.blockIds)
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
      blockIds: resolved.blockIds.filter((id) => allowedBlockIds.has(id)),
      curation,
      issuedAt,
      expiresAt: issuedAt + 30_000,
    })
  }
}
