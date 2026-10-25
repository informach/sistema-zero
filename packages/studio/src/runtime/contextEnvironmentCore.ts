import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { studioProjectContinuityIssue } from '@sistemazero/core/studio/project-continuity'
import type { StudioProjectDocument } from '@sistemazero/core/studio/project-document'
import type { StudioPythonAnalysisAuthorization } from '@sistemazero/core/studio/python-language-authorization'
import {
  studioPythonDeploymentRoute,
  studioPythonRuntimeRoute,
} from '@sistemazero/core/studio/python-runtime-distribution'
import {
  type StudioRuntimeCandidate,
  type StudioRuntimeDecision,
  StudioRuntimeDecisionSchema,
  type StudioRuntimeOperation,
} from '@sistemazero/core/studio/runtime-authorization'
import {
  createStudioRuntimeCatalog,
  type StudioProjectCapability,
} from '@sistemazero/core/studio/runtime-catalog'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import type {
  createContextualPythonLanguageProvider,
  createPythonAnalysisAuthorization,
} from '../python/language/contextProvider'
import { createStudioRuntimeAuthority } from './authority'
import type { StudioRuntimeEnvironment } from './environment'
import { createStudioRuntimeRegistry } from './registry'

type Receipt = { decision: StudioRuntimeDecision; deadline: number }
const cancelled = () => new DOMException('O contexto do projeto mudou.', 'AbortError')
function denied(error: unknown) {
  return (
    error !== null &&
    typeof error === 'object' &&
    'status' in error &&
    [401, 403, 404, 409].includes(Number(error.status))
  )
}

export type ContextualRuntimeEnvironmentOptions = {
  project: StudioProjectDocument
  scope: { userId: string | null; context: StudioRuntimeDecision['context'] }
  signal: AbortSignal
  request(input: StudioRuntimeCandidate, signal: AbortSignal): Promise<unknown>
  clock?: () => number
  /** Live hosts capture revision and send the BFF acknowledgement in the journal queue. */
  language?: {
    context(): StudioPythonAnalysisAuthorization['context']
    schedule?(operation: () => Promise<Response>): Promise<Response>
    request?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  }
}

/** Code analysis is injected by editor hosts, so the public play page never loads it. */
export type ContextualPythonAnalysis = {
  createContextualPythonLanguageProvider: typeof createContextualPythonLanguageProvider
  createPythonAnalysisAuthorization: typeof createPythonAnalysisAuthorization
}

/** Per-editor authority. Its signal belongs to the host's actor/lesson/baseline lifecycle. */
export async function createContextualRuntimeEnvironmentCore(
  options: ContextualRuntimeEnvironmentOptions,
  /** Required so a new editor host cannot lose analysis by omission; only public play passes null. */
  analysis: ContextualPythonAnalysis | null,
): Promise<StudioRuntimeEnvironment> {
  if (options.project.programmingLanguage !== 'python')
    throw new Error('Este ambiente precisa de um projeto Python.')
  const clock = options.clock ?? (() => performance.now())
  const initialSubject = studioRuntimeSubject(options.project)
  const scope = { userId: options.scope.userId, context: { ...options.scope.context } }
  const publicPlay = scope.context.kind === 'public'
  if (publicPlay !== (scope.userId === null)) throw new Error('Identidade do contexto inválida.')
  const authority = new AbortController()
  const scopeSignal = AbortSignal.any([options.signal, authority.signal])
  let sequence = 0
  let denialSequence = 0
  let installedSequence = 0
  let inaccessible = false
  let base: Receipt | undefined
  let executions = new WeakMap<StudioProjectDocument, Receipt>()
  let lastExecution: Receipt | undefined
  let initialPublicExecution: Receipt | undefined
  let authorityStore: ReturnType<typeof createStudioRuntimeAuthority> | undefined

  function authoritySnapshot(receipt: Receipt) {
    const available = !scopeSignal.aborted && !inaccessible
    const decision = receipt.decision
    return {
      available,
      pythonAuthoring: [
        { runtime: decision.runtime, blockIds: available ? decision.blockIds : [] },
      ],
      grantedExtensionIds: available ? decision.grantedExtensionIds : [],
      capabilities: available ? decision.capabilities : [],
      releaseStatus: decision.releaseStatus,
      curation: decision.curation,
    }
  }

  async function authorize(
    project: StudioProjectDocument,
    operation: StudioRuntimeOperation,
    revision: string,
    signal: AbortSignal,
  ): Promise<Receipt> {
    const joined = AbortSignal.any([scopeSignal, signal])
    joined.throwIfAborted()
    const subject = studioRuntimeSubject(project)
    if (publicPlay && operation !== 'execute')
      throw new Error('Esta página permite somente jogar a revisão publicada.')
    if (project.id !== initialSubject.id || studioProjectContinuityIssue(subject, initialSubject))
      throw new Error('O projeto mudou de ambiente. Reabra o Estúdio para continuar.')
    const subjectSha256 = await sha256Hex(canonicalJson(subject))
    joined.throwIfAborted()
    if (publicPlay && initialPublicExecution) {
      const initial = initialPublicExecution
      initialPublicExecution = undefined // One initial start; every restart asks the BFF again.
      if (
        initial.deadline > clock() &&
        initial.decision.revision === revision &&
        initial.decision.subjectSha256 === subjectSha256
      ) {
        executions.set(project, initial)
        lastExecution = initial
        return initial
      }
    }
    const turn = ++sequence
    const started = clock()
    try {
      const raw = await options.request({ operation, revision, subject }, joined)
      joined.throwIfAborted()
      const decision = StudioRuntimeDecisionSchema.parse(raw)
      const lifetime = decision.expiresAt - decision.issuedAt
      if (
        (decision.actor?.userId ?? null) !== scope.userId ||
        (base && canonicalJson(decision.actor) !== canonicalJson(base.decision.actor)) ||
        canonicalJson(decision.context) !== canonicalJson(scope.context) ||
        decision.projectId !== subject.id ||
        decision.operation !== operation ||
        decision.revision !== revision ||
        decision.subjectSha256 !== subjectSha256 ||
        canonicalJson(decision.runtime) !== canonicalJson(subject.runtime) ||
        decision.releaseStatus === 'revoked' ||
        lifetime <= 0 ||
        lifetime > 30_000 ||
        started + lifetime <= clock()
      )
        throw new Error('A autorização não corresponde ao projeto atual. Tente novamente.')
      const url = new URL(decision.frame.url)
      if (
        decision.frame.allowedOrigins.length !== 1 ||
        decision.frame.allowedOrigins[0] !== url.origin ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== `${studioPythonRuntimeRoute(subject.runtime.manifestSha256)}frame.html` ||
        (url.protocol !== 'https:' &&
          !(
            url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
          )) ||
        (base && decision.frame.url !== base.decision.frame.url)
      )
        throw new Error('O ambiente Python mudou. Reabra o Estúdio para continuar.')
      if (turn <= denialSequence || turn < installedSequence) throw cancelled()
      const receipt = { decision, deadline: started + lifetime }
      if (turn > installedSequence) {
        installedSequence = turn
        base = receipt
        inaccessible = false
        if (operation !== 'analyze') {
          executions.set(project, receipt)
          lastExecution = receipt
        }
        authorityStore?.update(authoritySnapshot(receipt))
      }
      joined.throwIfAborted()
      return receipt
    } catch (error) {
      if (!joined.aborted && denied(error) && turn >= installedSequence) {
        denialSequence = turn
        installedSequence = turn
        inaccessible = true
        executions = new WeakMap()
        lastExecution = undefined
        authority.abort(new Error('Seu acesso mudou. Reabra o ambiente para continuar.'))
      }
      throw error
    }
  }

  const initialRevision = publicPlay
    ? (await (await import('./python/snapshot')).preparePythonExecutionSnapshot(options.project))
        .revision
    : await sha256Hex(canonicalJson(initialSubject))
  const bootstrap = await authorize(
    options.project,
    publicPlay ? 'execute' : 'analyze',
    initialRevision,
    options.signal,
  )
  if (publicPlay) initialPublicExecution = bootstrap
  const catalog = await createStudioRuntimeCatalog(bootstrap.decision.catalog)
  scopeSignal.throwIfAborted()
  const release = catalog.releases[0]
  if (
    !release ||
    canonicalJson(bootstrap.decision.runtime) !==
      canonicalJson({
        profileId: release.profileId,
        releaseId: release.releaseId,
        manifestSha256: release.manifestSha256,
      })
  )
    throw new Error('O catálogo não corresponde ao ambiente autorizado.')
  const currentAuthority = createStudioRuntimeAuthority(authoritySnapshot(bootstrap))
  authorityStore = currentAuthority
  scopeSignal.addEventListener(
    'abort',
    () => {
      authorityStore?.update(authoritySnapshot(base ?? bootstrap))
    },
    { once: true },
  )
  const providerId = 'context-python-browser'
  const analysisContext =
    options.language?.context ??
    (() => {
      if (scope.context.kind === 'public' || scope.context.kind === 'live')
        throw new Error('O contexto da análise Python não está disponível.')
      return scope.context
    })
  const environment: StudioRuntimeEnvironment = {
    signal: scopeSignal,
    authority: currentAuthority.authority,
    ...(analysis && !publicPlay && (scope.context.kind !== 'live' || options.language)
      ? {
          createPythonLanguage: (project: () => StudioProjectDocument | null) =>
            analysis.createContextualPythonLanguageProvider({
              initialProject: options.project,
              project,
              context: analysisContext,
              signal: scopeSignal,
              schedule: options.language?.schedule,
              request: options.language?.request,
            }),
          requestPythonAssistance: (project, send) => {
            const operation = async () => {
              scopeSignal.throwIfAborted()
              const current = project()
              if (!current) throw cancelled()
              const authorization = await analysis.createPythonAnalysisAuthorization({
                initialProject: options.project,
                project,
                context: analysisContext,
              })(current.id, scopeSignal)
              scopeSignal.throwIfAborted()
              return send(authorization, scopeSignal)
            }
            return options.language?.schedule ? options.language.schedule(operation) : operation()
          },
        }
      : {}),
    catalog,
    ...(!publicPlay
      ? {
          async resolvePythonWebExport({ project, revision, signal }) {
            const receipt = await authorize(project, 'execute', revision, signal)
            const capabilities = new Set<StudioProjectCapability>(receipt.decision.capabilities)
            if (!capabilities.has('execute') || !capabilities.has('export-source'))
              throw new Error('A exportação web não está disponível neste contexto.')
            const frame = new URL(receipt.decision.frame.url)
            return {
              metadataURL: new URL(
                studioPythonDeploymentRoute(project.runtime.manifestSha256),
                frame.origin,
              ).href,
              directoryURL: new URL('./', frame).href,
            }
          },
        }
      : {}),
    get pythonAuthoring() {
      return currentAuthority.authority.getSnapshot().pythonAuthoring
    },
    registry: createStudioRuntimeRegistry([
      {
        id: providerId,
        profileId: release.profileId,
        programmingLanguage: 'python',
        kinds: release.manifest.kinds,
        async load() {
          const [{ createPythonRuntimeProvider }, { createGameStorageSession }] = await Promise.all(
            [import('./python/provider'), import('../state/gameStorage')],
          )
          return createPythonRuntimeProvider({
            id: providerId,
            savedFiles: createGameStorageSession,
            allowedOrigins: bootstrap.decision.frame.allowedOrigins,
            async resolveFrame(selection, signal, identity) {
              signal.throwIfAborted()
              scopeSignal.throwIfAborted()
              const receipt = lastExecution
              if (
                inaccessible ||
                !receipt ||
                receipt.deadline <= clock() ||
                receipt.decision.projectId !== identity.projectId ||
                receipt.decision.revision !== identity.revision ||
                canonicalJson(receipt.decision.runtime) !== canonicalJson(selection)
              )
                throw new Error('Confirme novamente a execução deste projeto.')
              return {
                url: receipt.decision.frame.url,
                runtimeManifestSha256: selection.manifestSha256,
              }
            },
          })
        },
      },
    ]),
    access(project) {
      const current = base ?? bootstrap
      const compatible =
        project.id === initialSubject.id && !studioProjectContinuityIssue(project, initialSubject)
      const available = !scopeSignal.aborted && !inaccessible && compatible
      const granted = new Set<StudioProjectCapability>(current.decision.capabilities)
      // Editing already-downloaded local work survives expiry/offline. Starting a runtime or
      // issuing a command needs a fresh per-snapshot receipt through authorize above.
      const capabilities = new Set<StudioProjectCapability>(
        available
          ? ['edit', 'export-source'].filter(
              (capability): capability is 'edit' | 'export-source' =>
                (capability === 'edit' || capability === 'export-source') &&
                granted.has(capability),
            )
          : [],
      )
      const execution = executions.get(project)
      if (available && execution && execution.deadline > clock())
        for (const capability of execution.decision.capabilities) capabilities.add(capability)
      return {
        releaseStatus: current.decision.releaseStatus,
        grantedCapabilities: [...capabilities],
        hostOperations: [...capabilities].map((capability) => ({ capability, state: 'available' })),
        grantedExtensionIds: available ? current.decision.grantedExtensionIds : [],
        curation: current.decision.curation,
      }
    },
    async authorize({ project, operation, revision, signal }) {
      await authorize(project, operation, revision, signal)
    },
    async resolvePythonAnalysis(project, signal) {
      if (publicPlay) throw new Error('A análise do código não está disponível na página de jogar.')
      const revision = await sha256Hex(canonicalJson(studioRuntimeSubject(project)))
      const current = base
      if (
        !scopeSignal.aborted &&
        !signal.aborted &&
        !inaccessible &&
        current &&
        current.deadline > clock() &&
        current.decision.operation === 'analyze' &&
        current.decision.subjectSha256 === revision &&
        current.decision.projectId === project.id
      )
        return analysisFrame(current.decision.frame)
      return analysisFrame((await authorize(project, 'analyze', revision, signal)).decision.frame)
    },
  }
  return environment
}

function analysisFrame(frame: StudioRuntimeDecision['frame']) {
  return { url: new URL('analysis.html', frame.url).href, allowedOrigins: frame.allowedOrigins }
}
