import { readJsonBodyWithLimit } from '@sistemazero/core/http'
import {
  createStudioPythonPublicationRecipe,
  isStudioProjectId,
  isStudioProPublication,
  isStudioProValidationIdentity,
  isStudioPublication,
  isStudioPublicationHash,
  isStudioPublicationId,
  isStudioPythonPublication,
  parseStudioArtifactManifest,
  STUDIO_PRO_PUBLICATION_LIMITS,
  STUDIO_PYTHON_PUBLICATION_RECIPE_LIMITS,
  StudioProjectDocumentSchema,
  type StudioProPublishedRevision,
  type StudioPublication,
  type StudioPublishedRevision,
  type StudioPythonPublication,
  StudioPythonPublicationApprovalSchema,
  StudioPythonPublicationManifestSchema,
  StudioPythonPublicationSchema,
  type StudioPythonPublishedRevision,
  studioPythonPublicationLegacyRecipeText,
  studioPythonPublicationRecipeText,
  studioPythonRecipeMatchesProject,
  validStudioArtifactPath,
} from '@sistemazero/core/studio'
import { pythonExternalDependenciesIssue } from '@sistemazero/core/studio/python-dependency-policy'
import {
  type ArtifactBucket,
  artifactPrefix,
  serveCompiledFile,
  sha256,
  unavailableArtifact,
} from './artifacts'

/** R2 conditional writes serialize pointer changes without an application-local lock. */
export interface PublicationBucket extends ArtifactBucket {
  list(options: { prefix: string; limit: number; cursor?: string }): Promise<{
    objects: { key: string; uploaded: Date }[]
    truncated: boolean
    cursor?: string
  }>
  get(
    key: string,
  ): Promise<{ body: ReadableStream; size: number; etag: string; text(): Promise<string> } | null>
  put(
    key: string,
    value: Uint8Array | string,
    options?: { sha256?: string; onlyIf?: Headers },
  ): Promise<{ etag: string } | null>
}

type Revision = StudioPublishedRevision & { requestId: string }
interface StoredPublication {
  playId: string
  version: number
  activeRevision: string
  disabled: boolean
  python?: Pick<
    StudioPythonPublication,
    'publicationVersion' | 'programmingLanguage' | 'kind' | 'runtime'
  >
  owner: string
  parentOrigin: string
  projectId: string
  revisions: Revision[]
  lastOperation: { id: string; revision: string; disabled: boolean }
}
export class PublicationError extends Error {
  constructor(
    readonly status: 400 | 403 | 404 | 409 | 413,
    message: string,
  ) {
    super(message)
  }
}
export const publicationKey = (playId: string) => `publications/${playId}/state.json`
export const publishedRevisionPrefix = (playId: string, revision: string) =>
  `published/${playId}/${revision}/`
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new PublicationError(400, 'Publicação inválida.')
  return value as Record<string, unknown>
}
function origin(value: unknown): string {
  if (typeof value !== 'string') throw new PublicationError(400, 'Origem inválida.')
  const url = new URL(value)
  if (
    url.origin !== value ||
    !(
      url.protocol === 'https:' ||
      (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))
    )
  )
    throw new PublicationError(400, 'Origem inválida.')
  return value
}
async function readState(bucket: PublicationBucket, playId: string) {
  const stored = await bucket.get(publicationKey(playId))
  if (!stored) return null
  if (stored.size > 32_768) throw new PublicationError(409, 'Registro de publicação inválido.')
  const raw: unknown = JSON.parse(await stored.text())
  const value = object(raw)
  // A minimal tombstone remains at the CAS key. Even a promotion that started
  // before moderation cannot recreate a removed publication with If-None-Match.
  if (value.deleted === true && value.playId === playId) return null
  if (
    !isStudioPublication(raw) ||
    raw.playId !== playId ||
    !isStudioPublicationHash(value.owner) ||
    !(
      isStudioProjectId(value.projectId) ||
      // Older JS publication admission allowed dots/colons; retain those records.
      (!isStudioPythonPublication(raw) &&
        typeof value.projectId === 'string' &&
        /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value.projectId))
    )
  )
    throw new PublicationError(409, 'Registro de publicação inválido.')
  const parentOrigin = origin(value.parentOrigin)
  const revisions = raw.revisions.map((revision) => {
    const requestId = object(revision).requestId
    if (!isStudioPublicationId(requestId)) throw new PublicationError(409, 'Histórico inválido.')
    return { ...revision, requestId }
  })
  const last = object(value.lastOperation)
  if (
    !isStudioPublicationId(last.id) ||
    !isStudioPublicationHash(last.revision) ||
    typeof last.disabled !== 'boolean'
  )
    throw new PublicationError(409, 'Operação inválida.')
  const state: StoredPublication = {
    playId: raw.playId,
    version: raw.version,
    activeRevision: raw.activeRevision,
    disabled: raw.disabled,
    ...(isStudioPythonPublication(raw)
      ? {
          python: {
            publicationVersion: raw.publicationVersion,
            programmingLanguage: raw.programmingLanguage,
            kind: raw.kind,
            runtime: raw.runtime,
          },
        }
      : {}),
    owner: value.owner,
    projectId: value.projectId,
    parentOrigin,
    revisions,
    lastOperation: { id: last.id, revision: last.revision, disabled: last.disabled },
  }
  return { state, etag: stored.etag }
}
function view(state: StoredPublication): StudioPublication {
  const result = {
    playId: state.playId,
    version: state.version,
    activeRevision: state.activeRevision,
    disabled: state.disabled,
    revisions: state.revisions.map(({ requestId: _requestId, ...revision }) => revision),
  }
  if (state.python) return StudioPythonPublicationSchema.parse({ ...result, ...state.python })
  if (!isStudioProPublication(result))
    throw new PublicationError(409, 'Histórico JavaScript inválido.')
  return result
}
async function commit(bucket: PublicationBucket, state: StoredPublication, etag?: string) {
  const value = view(state)
  const stored = {
    ...value,
    owner: state.owner,
    projectId: state.projectId,
    parentOrigin: state.parentOrigin,
    revisions: state.revisions,
    lastOperation: state.lastOperation,
  }
  const written = await bucket.put(publicationKey(state.playId), JSON.stringify(stored), {
    onlyIf: new Headers(etag ? { 'If-Match': etag } : { 'If-None-Match': '*' }),
  })
  if (!written)
    throw new PublicationError(
      409,
      'A publicação mudou. Atualize o histórico antes de tentar novamente.',
    )
  return value
}

/** Files and source precede the CAS pointer; ambiguous pointer writes retain their immutable data. */
async function retainPublicationRevision(
  bucket: PublicationBucket,
  input: {
    playId: string
    owner: string
    projectId: string
    parentOrigin: string
    requestId: string
    sourceBytes: Uint8Array<ArrayBuffer>
    sourceHash: string
    artifactHash: string
    /** Exact retained bytes; artifactHash was computed over this text. */
    manifestText: string
    proof:
      | Pick<StudioProPublishedRevision, 'validation'>
      | Pick<StudioPythonPublishedRevision, 'approval'>
    python?: StoredPublication['python']
    saved: Awaited<ReturnType<typeof readState>>
    files?: {
      path: string
      bytes: number
      sha256: string
      read(): Promise<Uint8Array<ArrayBuffer>>
    }[]
  },
  now: number,
) {
  const id = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '')
  const prefix = publishedRevisionPrefix(input.playId, id)
  const written: string[] = []
  try {
    for (const file of input.files ?? []) {
      const bytes = await file.read()
      if (bytes.length !== file.bytes || (await sha256(bytes)) !== file.sha256)
        throw new PublicationError(409, 'Arquivo da publicação incompleto ou alterado.')
      const key = `${prefix}files/${file.path}`
      written.push(key)
      await bucket.put(key, bytes, { sha256: file.sha256 })
    }
    written.push(`${prefix}source.json`, `${prefix}manifest.json`)
    await bucket.put(`${prefix}source.json`, input.sourceBytes, { sha256: input.sourceHash })
    await bucket.put(`${prefix}manifest.json`, input.manifestText)
  } catch (error) {
    await bucket.delete(written).catch(() =>
      console.error('[studio-publication] partial revision cleanup pending', {
        playId: input.playId,
        id,
      }),
    )
    throw error
  }
  const revision: Revision = {
    id,
    requestId: input.requestId,
    sourceHash: input.sourceHash,
    artifactHash: input.artifactHash,
    createdAt: now,
    ...input.proof,
  }
  try {
    return await commit(
      bucket,
      {
        playId: input.playId,
        owner: input.owner,
        projectId: input.projectId,
        parentOrigin: input.parentOrigin,
        version: (input.saved?.state.version ?? 0) + 1,
        activeRevision: id,
        disabled: false,
        ...(input.python ? { python: input.python } : {}),
        revisions: [...(input.saved?.state.revisions ?? []), revision],
        lastOperation: { id: input.requestId, revision: id, disabled: false },
      },
      input.saved?.etag,
    )
  } catch (error) {
    if (error instanceof PublicationError && error.status === 409)
      await bucket.delete(written).catch(() =>
        console.error('[studio-publication] conflicting revision cleanup pending', {
          playId: input.playId,
          id,
        }),
      )
    throw error
  }
}

/** Called only behind the runtime's private bearer boundary. Owner is derived by the BFF. */
export async function publicationCommand(
  bucket: PublicationBucket,
  raw: unknown,
  now = Date.now(),
): Promise<
  StudioPublication | { source: string; publication: StudioPublication } | { png: string } | null
> {
  const input = object(raw)
  if (!isStudioPublicationId(input.playId) || !isStudioPublicationHash(input.owner))
    throw new PublicationError(400, 'Identificação de publicação inválida.')
  const playId = input.playId,
    owner = input.owner
  const saved = await readState(bucket, playId)
  if (saved && saved.state.owner !== owner)
    throw new PublicationError(404, 'Publicação não encontrada.')
  if (input.operation === 'get') return saved ? view(saved.state) : null
  if (input.operation === 'cover') {
    if (!saved) throw new PublicationError(404, 'Publicação não encontrada.')
    if (saved.state.python)
      throw new PublicationError(404, 'A capa deste jogo é fornecida pelo autor.')
    const prefix = publishedRevisionPrefix(playId, saved.state.activeRevision)
    const stored = await bucket.get(`${prefix}manifest.json`)
    if (!stored || stored.size > 100_000) throw new PublicationError(404, 'Captura não encontrada.')
    const manifest = parseStudioArtifactManifest(JSON.parse(await stored.text()))
    const revision = saved.state.revisions.find((r) => r.id === saved.state.activeRevision)
    if (
      !revision ||
      (await sha256(new TextEncoder().encode(JSON.stringify(manifest)))) !== revision.artifactHash
    )
      throw new PublicationError(409, 'Captura inválida.')
    const file = manifest.files.find((file) => file.path === '__studio-proof.png')
    const content = file ? await bucket.get(`${prefix}files/${file.path}`) : null
    if (!file || !content || content.size !== file.bytes)
      throw new PublicationError(404, 'Captura não encontrada.')
    const bytes = new Uint8Array(await new Response(content.body).arrayBuffer())
    if (
      (await sha256(bytes)) !== file.sha256 ||
      ![137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)
    )
      throw new PublicationError(409, 'Captura inválida.')
    let binary = ''
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
    return { png: btoa(binary) }
  }
  if (input.operation === 'lookup') {
    if (!isStudioPublicationId(input.requestId) || !isStudioPublicationHash(input.sourceHash))
      throw new PublicationError(400, 'Operação inválida.')
    const revision = saved?.state.revisions.find((r) => r.requestId === input.requestId)
    if (!revision || !saved) return null
    if (revision.sourceHash !== input.sourceHash)
      throw new PublicationError(409, 'Esta operação já foi usada com outra fonte.')
    return view(saved.state)
  }
  if (input.operation === 'source') {
    if (!saved) throw new PublicationError(404, 'Publicação não encontrada.')
    const revision = saved.state.revisions.find((r) => r.id === input.revision)
    if (!revision) throw new PublicationError(404, 'Revisão não encontrada.')
    const source = await readSource(bucket, playId, revision)
    return { source, publication: view(saved.state) }
  }
  if (
    !isStudioPublicationId(input.requestId) ||
    !Number.isSafeInteger(input.expectedVersion) ||
    Number(input.expectedVersion) < 0
  )
    throw new PublicationError(400, 'Versão ou operação inválida.')
  if (input.operation === 'activate') {
    if (!saved) throw new PublicationError(404, 'Publicação não encontrada.')
    const state = saved.state
    if (
      !isStudioPublicationHash(input.revision) ||
      typeof input.disabled !== 'boolean' ||
      !state.revisions.some((r) => r.id === input.revision)
    )
      throw new PublicationError(400, 'Revisão inválida.')
    if (state.lastOperation.id === input.requestId) {
      if (
        state.lastOperation.revision !== input.revision ||
        state.lastOperation.disabled !== input.disabled
      )
        throw new PublicationError(409, 'Esta operação já foi usada com outro conteúdo.')
      return view(state)
    }
    if (state.version !== input.expectedVersion)
      throw new PublicationError(409, 'A publicação mudou. Atualize o histórico.')
    return commit(
      bucket,
      {
        ...state,
        version: state.version + 1,
        activeRevision: input.revision,
        disabled: input.disabled,
        lastOperation: { id: input.requestId, revision: input.revision, disabled: input.disabled },
      },
      saved.etag,
    )
  }
  if (input.operation === 'promote-python')
    return promotePythonPublication(bucket, input, saved, now)
  if (
    input.operation !== 'promote' ||
    typeof input.source !== 'string' ||
    !isStudioPublicationHash(input.artifactId) ||
    !isStudioPublicationHash(input.artifactHash) ||
    !isStudioProjectId(input.projectId)
  )
    throw new PublicationError(400, 'Revisão de publicação inválida.')
  if (saved?.state.python)
    throw new PublicationError(
      409,
      'A publicação Python não pode receber uma compilação JavaScript.',
    )
  const parentOrigin = origin(input.parentOrigin)
  const sourceBytes = new TextEncoder().encode(input.source)
  if (sourceBytes.length > STUDIO_PRO_PUBLICATION_LIMITS.maxSourceBytes)
    throw new PublicationError(413, 'Fonte grande demais.')
  const sourceHash = await sha256(sourceBytes)
  if (saved) {
    if (saved.state.projectId !== input.projectId || saved.state.parentOrigin !== parentOrigin)
      throw new PublicationError(409, 'A publicação pertence a outro projeto ou ambiente.')
    const previous = saved.state.revisions.find((r) => r.requestId === input.requestId)
    if (previous) {
      if (previous.sourceHash !== sourceHash)
        throw new PublicationError(409, 'Esta operação já foi usada com outra fonte.')
      return view(saved.state)
    }
  }
  if ((saved?.state.version ?? 0) !== input.expectedVersion)
    throw new PublicationError(409, 'A publicação mudou. Atualize o histórico.')
  if ((saved?.state.revisions.length ?? 0) >= STUDIO_PRO_PUBLICATION_LIMITS.maxRevisions)
    throw new PublicationError(
      409,
      'O histórico atingiu 20 versões. Crie uma nova publicação para continuar.',
    )
  const preview = await bucket.get(`${artifactPrefix(input.artifactId)}manifest.json`)
  if (!preview || preview.size > 100_000)
    throw new PublicationError(404, 'Compilação não encontrada.')
  const metadata = object(JSON.parse(await preview.text()))
  const manifest = parseStudioArtifactManifest(metadata)
  if (
    metadata.validated !== true ||
    !isStudioProValidationIdentity(metadata.validation) ||
    metadata.parentOrigin !== parentOrigin ||
    !Number.isSafeInteger(metadata.expiresAt) ||
    Number(metadata.expiresAt) <= now ||
    (await sha256(new TextEncoder().encode(JSON.stringify(manifest)))) !== input.artifactHash
  )
    throw new PublicationError(
      409,
      'A compilação precisa de uma nova verificação antes de publicar.',
    )
  const artifactId = input.artifactId
  return retainPublicationRevision(
    bucket,
    {
      playId,
      owner,
      projectId: input.projectId,
      parentOrigin,
      requestId: input.requestId,
      sourceBytes,
      sourceHash,
      artifactHash: input.artifactHash,
      manifestText: JSON.stringify(manifest),
      proof: { validation: metadata.validation },
      saved,
      files: manifest.files.map((file) => ({
        ...file,
        async read() {
          const content = await bucket.get(`${artifactPrefix(artifactId)}files/${file.path}`)
          if (!content || content.size !== file.bytes)
            throw new PublicationError(409, 'Arquivo compilado incompleto.')
          return new Uint8Array(await new Response(content.body).arrayBuffer())
        },
      })),
    },
    now,
  )
}

/** Private BFF refines media/IR, checks the catalog and computes the actual execution snapshot.
 * This boundary independently binds the retained bytes, language, project, runtime and lock.
 */
async function promotePythonPublication(
  bucket: PublicationBucket,
  input: Record<string, unknown>,
  saved: Awaited<ReturnType<typeof readState>>,
  now: number,
) {
  if (
    !isStudioPublicationId(input.playId) ||
    !isStudioPublicationHash(input.owner) ||
    !isStudioPublicationId(input.requestId) ||
    typeof input.source !== 'string'
  )
    throw new PublicationError(400, 'Pacote Python inválido.')
  const sourceBytes = new TextEncoder().encode(input.source)
  if (sourceBytes.length > STUDIO_PRO_PUBLICATION_LIMITS.maxSourceBytes)
    throw new PublicationError(413, 'Fonte grande demais.')
  const approvalResult = StudioPythonPublicationApprovalSchema.safeParse(input.approval)
  if (!approvalResult.success) throw new PublicationError(400, 'Aprovação Python inválida.')
  const approval = approvalResult.data
  const project = await validatePythonPublicationSource(input.source, approval.runtime)
  if (project.id !== input.projectId)
    throw new PublicationError(409, 'O pacote pertence a outro projeto.')
  const parentOrigin = origin(input.parentOrigin)
  const sourceHash = await sha256(sourceBytes)
  // New revisions retain recipe v2. A request first committed as v1 before this
  // version shipped is still recognized by its exact legacy bytes on replay.
  const manifestText = studioPythonPublicationRecipeText(
    createStudioPythonPublicationRecipe({ project, sourceHash, approval }),
  )
  const artifactHash = await sha256(new TextEncoder().encode(manifestText))
  const legacyArtifactHash = await sha256(
    new TextEncoder().encode(studioPythonPublicationLegacyRecipeText({ sourceHash, approval })),
  )
  if (saved) {
    if (
      !saved.state.python ||
      saved.state.python.kind !== project.kind ||
      !sameRuntime(saved.state.python.runtime, project.runtime) ||
      saved.state.projectId !== project.id ||
      saved.state.parentOrigin !== parentOrigin
    )
      throw new PublicationError(409, 'A publicação pertence a outro projeto ou ambiente.')
    const previous = saved.state.revisions.find(
      (revision) => revision.requestId === input.requestId,
    )
    if (previous) {
      if (
        previous.sourceHash !== sourceHash ||
        (previous.artifactHash !== artifactHash && previous.artifactHash !== legacyArtifactHash)
      )
        throw new PublicationError(409, 'Esta operação já foi usada com outro conteúdo.')
      return view(saved.state)
    }
  }
  if ((saved?.state.version ?? 0) !== input.expectedVersion)
    throw new PublicationError(409, 'A publicação mudou. Atualize o histórico.')
  if ((saved?.state.revisions.length ?? 0) >= STUDIO_PRO_PUBLICATION_LIMITS.maxRevisions)
    throw new PublicationError(
      409,
      'O histórico atingiu 20 versões. Crie uma nova publicação para continuar.',
    )
  return retainPublicationRevision(
    bucket,
    {
      playId: input.playId,
      owner: input.owner,
      requestId: input.requestId,
      projectId: project.id,
      parentOrigin,
      sourceBytes,
      sourceHash,
      artifactHash,
      manifestText,
      proof: { approval },
      python: {
        publicationVersion: 2,
        programmingLanguage: 'python',
        kind: project.kind,
        runtime: project.runtime,
      },
      saved,
    },
    now,
  )
}

function sameRuntime(a: StudioPythonPublication['runtime'], b: StudioPythonPublication['runtime']) {
  return (
    a.profileId === b.profileId &&
    a.releaseId === b.releaseId &&
    a.manifestSha256 === b.manifestSha256
  )
}

async function validatePythonPublicationSource(
  source: string,
  runtime: StudioPythonPublication['runtime'],
) {
  let raw: unknown
  try {
    raw = JSON.parse(source)
  } catch {
    throw new PublicationError(400, 'Documento Python inválido.')
  }
  const parsed = StudioProjectDocumentSchema.safeParse(raw)
  if (!parsed.success || parsed.data.programmingLanguage !== 'python')
    throw new PublicationError(400, 'Documento Python inválido.')
  const project = parsed.data
  if (!sameRuntime(project.runtime, runtime))
    throw new PublicationError(409, 'O pacote não corresponde ao ambiente aprovado.')
  const requirementNode = project.kind === 'pro' ? project.tree['requirements.txt'] : null
  const requirements =
    project.kind === 'classic'
      ? (project.files['requirements.txt'] ?? '')
      : requirementNode?.kind === 'file'
        ? requirementNode.content
        : ''
  const issue = pythonExternalDependenciesIssue(requirements, project.python.dependencyLock)
  if (issue) throw new PublicationError(409, issue)
  if (
    (await sha256(new TextEncoder().encode(requirements))) !==
    project.python.dependencyLock.requirementsSha256
  )
    throw new PublicationError(409, 'O lock não corresponde ao requirements.txt.')
  return project
}

/** Private moderation operation; no author data is retained in the tombstone. */
export async function purgePublication(
  bucket: PublicationBucket,
  playId: string,
  now = Date.now(),
) {
  if (!isStudioPublicationId(playId)) throw new PublicationError(400, 'Publicação inválida.')
  await bucket.put(
    publicationKey(playId),
    JSON.stringify({ playId, deleted: true, deletedAt: now }),
  )
  const prefix = `published/${playId}/`
  const page = await bucket.list({ prefix, limit: 1000 })
  const keys = ownedKeys(page.objects, prefix)
  if (keys.length) await bucket.delete(keys)
  return { deleted: true as const }
}

/** Retire an unfinalized reservation without treating a missing pointer as ownership proof. */
export async function retirePublicationReservation(
  bucket: PublicationBucket,
  input: { playId: string; owner: string; snapshotHash: string; retirementHash: string },
  now = Date.now(),
) {
  if (
    !isStudioPublicationId(input.playId) ||
    ![input.owner, input.snapshotHash, input.retirementHash].every(isStudioPublicationHash)
  )
    throw new PublicationError(400, 'Reserva inválida.')
  const key = publicationKey(input.playId)
  const previous = await bucket.get(key)
  let alreadyRetired = false
  if (previous) {
    if (previous.size > 32_768) throw new PublicationError(409, 'Registro de publicação inválido.')
    const raw = object(JSON.parse(await previous.text()))
    const storedOwner = raw.owner
    if (raw.deleted === true && raw.playId === input.playId) {
      if (typeof raw.deletedAt !== 'number' || !Number.isFinite(raw.deletedAt))
        throw new PublicationError(409, 'Registro terminal inválido.')
      if (
        Object.keys(raw).some(
          (key) => !['playId', 'deleted', 'deletedAt', 'retirementHash'].includes(key),
        )
      )
        throw new PublicationError(409, 'Registro terminal inválido.')
      if (raw.retirementHash !== undefined && raw.retirementHash !== input.retirementHash)
        throw new PublicationError(409, 'A retirada pertence a outra reserva.')
      alreadyRetired = true
    } else if (
      !isStudioPublication(raw) ||
      raw.playId !== input.playId ||
      storedOwner !== input.owner ||
      raw.version !== 1 ||
      raw.revisions.length !== 1 ||
      raw.revisions[0]?.sourceHash !== input.snapshotHash
    ) {
      throw new PublicationError(409, 'A reserva não comprova a propriedade desta publicação.')
    }
  }
  if (!alreadyRetired) {
    const written = await bucket.put(
      key,
      JSON.stringify({
        playId: input.playId,
        deleted: true,
        deletedAt: now,
        retirementHash: input.retirementHash,
      }),
      { onlyIf: new Headers(previous ? { 'If-Match': previous.etag } : { 'If-None-Match': '*' }) },
    )
    if (!written) throw new PublicationError(409, 'A publicação mudou durante a retirada.')
  }
  const prefix = `published/${input.playId}/`
  const page = await bucket.list({ prefix, limit: 1000 })
  const keys = ownedKeys(page.objects, prefix)
  if (keys.length) await bucket.delete(keys)
  if (page.truncated)
    throw new PublicationError(409, 'A retirada dos arquivos ainda está em andamento.')
  return { deleted: true as const }
}

/** Deletion never trusts a listing to honor its prefix: shared runtime bytes live beside it. */
function ownedKeys(objects: readonly { key: string }[], prefix: string) {
  return objects.map((file) => file.key).filter((key) => key.startsWith(prefix))
}

/**
 * Retention closure of one publication record (R13). Every retained revision stays
 * restorable through `activate`, so history counts even while disabled or inactive.
 * Each Python revision, v1 or v2, also pins its runtime release
 * (`runtimes/<manifestSha256>/`, which closes over the release artifacts and extension
 * versions); the v2 recipe and the revision approval must agree on it when read.
 * A tombstone (moderation or reservation retirement) retains nothing.
 */
export function publicationRetention(revisions: readonly StudioPublishedRevision[]) {
  return {
    revisions: new Set(revisions.map((revision) => revision.id)),
    runtimes: new Set(
      revisions.flatMap((revision) =>
        'approval' in revision ? [revision.approval.runtime.manifestSha256] : [],
      ),
    ),
  }
}

const GC_CURSOR_KEY = 'maintenance/publications-cursor.json'
const ORPHAN_GRACE_MS = 48 * 60 * 60 * 1000
const COLLECTABLE_REVISION_OBJECT = /^published\/([a-f0-9-]{36})\/([a-f0-9]{64})\//
/**
 * One bounded page per cron; retained history is never pruned by age.
 *
 * Runtime decision (R13): this collector only ever removes unreferenced objects under
 * `published/<playId>/<revision>/`. Runtime releases under `runtimes/` are immutable,
 * shared and also referenced by drafts, lessons, previews and exports that this worker
 * cannot enumerate; catalog retirement/revocation changes availability, never bytes.
 * So a runtime referenced by any retained revision is never deleted, and unreferenced
 * runtimes are deliberately NOT collected here. Collecting them would need a reference
 * inventory across every owner (catalog configuration, Members/Hub projects, previews)
 * plus its own grace/fence protocol; until such an inventory exists they are retained.
 */
export async function collectPublicationGarbage(bucket: PublicationBucket, now = Date.now()) {
  const checkpoint = await bucket.get(GC_CURSOR_KEY)
  let cursor: string | undefined
  if (checkpoint && checkpoint.size <= 4096) {
    const raw: unknown = JSON.parse(await checkpoint.text())
    if (raw && typeof raw === 'object' && 'cursor' in raw && typeof raw.cursor === 'string')
      cursor = raw.cursor
  }
  const page = await bucket.list({
    prefix: 'published/',
    limit: 1000,
    ...(cursor ? { cursor } : {}),
  })
  const retained = new Map<string, ReturnType<typeof publicationRetention> | 'unreadable'>()
  const remove: string[] = []
  let unreadable = 0
  for (const file of page.objects) {
    const match = COLLECTABLE_REVISION_OBJECT.exec(file.key)
    if (!match || !isStudioPublicationId(match[1]) || !match[2]) continue
    // Fresh objects may belong to an in-flight copy or an ambiguous CAS response.
    if (
      !Number.isFinite(file.uploaded.getTime()) ||
      now - file.uploaded.getTime() < ORPHAN_GRACE_MS
    )
      continue
    const playId = match[1]
    let retention = retained.get(playId)
    if (!retention) {
      try {
        const saved = await readState(bucket, playId)
        retention = publicationRetention(saved?.state.revisions ?? [])
      } catch {
        // Fail closed and keep going: an unreadable record proves nothing about its
        // history, and one bad record must not stall collection of every later page.
        retention = 'unreadable'
        unreadable++
      }
      retained.set(playId, retention)
    }
    if (retention !== 'unreadable' && !retention.revisions.has(match[2])) remove.push(file.key)
  }
  if (remove.length) await bucket.delete(remove)
  // Commit after deletion; failed batches are safe to repeat. Concurrent cron
  // runs can repeat work, but neither can remove a referenced immutable revision.
  await bucket.put(
    GC_CURSOR_KEY,
    JSON.stringify({ cursor: page.truncated ? page.cursor : undefined }),
  )
  return { scanned: page.objects.length, removed: remove.length, unreadable }
}

async function readSource(
  bucket: PublicationBucket,
  playId: string,
  revision: StudioPublishedRevision,
): Promise<string> {
  const content = await bucket.get(`${publishedRevisionPrefix(playId, revision.id)}source.json`)
  if (!content || content.size > STUDIO_PRO_PUBLICATION_LIMITS.maxSourceBytes)
    throw new PublicationError(404, 'Fonte não encontrada.')
  const source = await content.text()
  if ((await sha256(new TextEncoder().encode(source))) !== revision.sourceHash)
    throw new PublicationError(409, 'Fonte inválida.')
  if ('approval' in revision) {
    const stored = await bucket.get(`${publishedRevisionPrefix(playId, revision.id)}manifest.json`)
    if (!stored || stored.size > STUDIO_PYTHON_PUBLICATION_RECIPE_LIMITS.v2Bytes)
      throw new PublicationError(409, 'Pacote Python incompleto.')
    const manifestText = await stored.text()
    let raw: unknown
    try {
      raw = JSON.parse(manifestText)
    } catch {
      throw new PublicationError(409, 'Receita Python inválida.')
    }
    const parsed = StudioPythonPublicationManifestSchema.safeParse(raw)
    if (
      !parsed.success ||
      // v1 bytes stay legacy-hashed as written; v2 must also be its own canonical form.
      (parsed.data.version === 1
        ? stored.size > STUDIO_PYTHON_PUBLICATION_RECIPE_LIMITS.v1Bytes
        : studioPythonPublicationRecipeText(parsed.data) !== manifestText) ||
      (await sha256(new TextEncoder().encode(manifestText))) !== revision.artifactHash ||
      parsed.data.sourceHash !== revision.sourceHash ||
      parsed.data.approval.kind !== revision.approval.kind ||
      parsed.data.approval.snapshotSha256 !== revision.approval.snapshotSha256 ||
      !sameRuntime(parsed.data.approval.runtime, revision.approval.runtime)
    )
      throw new PublicationError(409, 'Receita Python inválida.')
    const project = await validatePythonPublicationSource(source, revision.approval.runtime)
    if (!studioPythonRecipeMatchesProject(parsed.data, project))
      throw new PublicationError(409, 'Receita Python inválida.')
  }
  return source
}

export async function currentPublishedSource(bucket: PublicationBucket, playId: string) {
  const saved = await readState(bucket, playId)
  if (!saved || saved.state.disabled) return null
  const revision = saved.state.revisions.find((r) => r.id === saved.state.activeRevision)
  if (!revision) return null
  return { source: await readSource(bucket, playId, revision), publication: view(saved.state) }
}

/** Private lightweight fence after authorization: no second copy of the source/media bundle. */
export async function currentPublishedPublication(bucket: PublicationBucket, playId: string) {
  const saved = await readState(bucket, playId)
  return saved && !saved.state.disabled ? view(saved.state) : null
}

/** Every request is gated; conditional 304 responses cannot bypass moderation or rollback. */
export async function servePublishedArtifact(
  request: Request,
  bucket: PublicationBucket,
  authorize: (playId: string) => Promise<boolean>,
): Promise<Response> {
  const url = new URL(request.url)
  const match = /^\/v1\/published\/([a-f0-9-]{36})\/([a-f0-9]{64})\/(.+)$/.exec(url.pathname)
  const [, playId, revisionId, path] = match ?? []
  if (
    !isStudioPublicationId(playId) ||
    !revisionId ||
    !path ||
    !validStudioArtifactPath(path) ||
    !['GET', 'HEAD'].includes(request.method)
  )
    return unavailableArtifact()
  const saved = await readState(bucket, playId)
  if (
    !saved ||
    saved.state.python ||
    saved.state.disabled ||
    saved.state.activeRevision !== revisionId ||
    !(await authorize(playId))
  )
    return unavailableArtifact()
  const prefix = publishedRevisionPrefix(playId, revisionId)
  const stored = await bucket.get(`${prefix}manifest.json`)
  if (!stored || stored.size > 100_000) return unavailableArtifact()
  const manifest = parseStudioArtifactManifest(JSON.parse(await stored.text()))
  const revision = saved.state.revisions.find((r) => r.id === revisionId)
  if (
    !revision ||
    (await sha256(new TextEncoder().encode(JSON.stringify(manifest)))) !== revision.artifactHash
  )
    return unavailableArtifact()
  return serveCompiledFile({
    request,
    bucket,
    prefix,
    path,
    manifest,
    parentOrigin: saved.state.parentOrigin,
    base: `${url.origin}/v1/published/${playId}/${revisionId}/`,
    cacheControl: 'private, no-cache, must-revalidate',
  })
}

/** The endpoint is configuration, never a URL taken from a project or request. No redirect or cookies. */
export function createPublicationAuthorizer(
  endpoint: string | readonly string[] | undefined,
  token: string,
  fetchImpl: (url: string, init?: RequestInit) => Promise<Response> = fetch,
) {
  const endpoints = Object.freeze(typeof endpoint === 'string' ? [endpoint] : [...(endpoint ?? [])])
  const pending = new Map<string, Promise<boolean>>()
  return (playId: string): Promise<boolean> => {
    if (endpoints.length === 0 || !token || !isStudioPublicationId(playId))
      return Promise.resolve(false)
    const current = pending.get(playId)
    if (current) return current
    if (pending.size >= 1000) return Promise.resolve(false)
    const controllers = endpoints.map(() => new AbortController())
    const result = Promise.resolve()
      .then(() =>
        Promise.any(
          endpoints.map(async (url, index) => {
            const response = await fetchImpl(url, {
              method: 'POST',
              // Workers supports manual/follow; manual keeps the service token on this endpoint.
              redirect: 'manual',
              cache: 'no-store',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ playId }),
              signal: AbortSignal.any([AbortSignal.timeout(5000), controllers[index]!.signal]),
            })
            if (!response.ok) {
              void response.body?.cancel().catch(() => {})
              throw new Error('Publication authorization unavailable')
            }
            const value = object(await readJsonBodyWithLimit(response, 1024))
            if (value.visible !== true) throw new Error('Publication is not visible')
            return true
          }),
        )
          .then((approved) => {
            for (const controller of controllers) controller.abort()
            return approved
          })
          .catch(() => false),
      )
      .finally(() => {
        pending.delete(playId)
      })
    pending.set(playId, result)
    return result
  }
}
