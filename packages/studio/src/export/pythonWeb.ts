import { canonicalJson } from '@sistemazero/core/creations'
import { StudioPythonWebPayloadSchema } from '@sistemazero/core/studio/python-execution-content'
import {
  STUDIO_PYTHON_DISTRIBUTION_LIMITS,
  studioPythonDeploymentRoute,
  studioPythonLogicalFiles,
  studioPythonRuntimeRoute,
  verifyStudioPythonDeployment,
} from '@sistemazero/core/studio/python-runtime-distribution'
import { buildPythonAssetBundle } from '../core/pythonAssets'
import type { StudioRuntimeEnvironment } from '../runtime/environment'
import { preparePythonExecutionSnapshot } from '../runtime/python/snapshot'
import { fetchPythonWebBytes, pythonWebBytesSha256 } from '../runtime/python/webFiles'
import { PYTHON_WEB_METADATA_BYTES } from '../runtime/python/webPayload'
import { refinePythonProjectDocument } from '../state/pythonProjectValidation'
import { isStudioTutorSensitivePath, redactStudioTutorSecrets } from '../studio/tutorSafety'
import type { ExportFileMap } from './fileMap'
import { pythonWebTemplates } from './pythonWebTemplates'

/** Runs only on an explicit export, outside the editor's typing/Run path. */
export async function buildPythonWebFiles(
  raw: unknown,
  environment: StudioRuntimeEnvironment | undefined,
  signal: AbortSignal,
) {
  const project = await refinePythonProjectDocument(raw)
  const joined = environment?.signal ? AbortSignal.any([signal, environment.signal]) : signal
  joined.throwIfAborted()
  if (!environment?.resolvePythonWebExport)
    throw new Error('A exportação web Python não está disponível neste ambiente.')
  const snapshot = await preparePythonExecutionSnapshot(project)
  for (const file of snapshot.files) {
    if (
      file.path
        .split('/')
        .some(
          (part) => part.toLowerCase().startsWith('.env') || isStudioTutorSensitivePath(part),
        ) ||
      (file.kind === 'source' &&
        redactStudioTutorSecrets(new TextDecoder('utf-8', { fatal: true }).decode(file.bytes))
          .hadSecret)
    )
      throw new Error(
        `Revise ${file.path}: o pacote web não pode incluir arquivos ou valores identificados como secretos.`,
      )
  }
  const resolve = () =>
    environment.resolvePythonWebExport!({ project, revision: snapshot.revision, signal: joined })
  const host = await resolve()
  const directory = new URL(host.directoryURL)
  const metadataURL = new URL(host.metadataURL)
  const runtimeHash = snapshot.configuration.runtime.manifestSha256
  if (
    !['http:', 'https:'].includes(directory.protocol) ||
    directory.username ||
    directory.password ||
    directory.hash ||
    directory.search ||
    directory.pathname !== studioPythonRuntimeRoute(runtimeHash) ||
    metadataURL.href !== new URL(studioPythonDeploymentRoute(runtimeHash), directory.origin).href ||
    (directory.protocol === 'http:' &&
      !['localhost', '127.0.0.1', '[::1]'].includes(directory.hostname))
  )
    throw new Error('O host não forneceu uma distribuição Python válida.')
  const metadata = await fetchPythonWebBytes(metadataURL, PYTHON_WEB_METADATA_BYTES, joined)
  const deployment = await verifyStudioPythonDeployment(
    JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(metadata)),
  )
  joined.throwIfAborted()
  if (
    deployment.release.manifestSha256 !== runtimeHash ||
    deployment.release.profileId !== project.runtime.profileId ||
    deployment.release.releaseId !== project.runtime.releaseId ||
    deployment.distribution.pythonVersion !== project.python.dependencyLock.pythonVersion
  )
    throw new Error('A distribuição não corresponde ao ambiente deste projeto.')
  if (!deployment.distribution.files.some((file) => file.path === 'standalone.mjs'))
    throw new Error(
      'Esta versão do ambiente Python não oferece exportação web. Ela continua disponível para executar e baixar a fonte.',
    )
  const files: ExportFileMap = pythonWebTemplates(runtimeHash)
  for (const file of studioPythonLogicalFiles(deployment.distribution)) {
    const bytes = await fetchPythonWebBytes(
      new URL(file.path, directory),
      Math.min(file.bytes, STUDIO_PYTHON_DISTRIBUTION_LIMITS.fileBytes),
      joined,
    )
    if (bytes.byteLength !== file.bytes || (await pythonWebBytesSha256(bytes)) !== file.sha256)
      throw new Error(`Integridade inválida do runtime: ${file.path}.`)
    joined.throwIfAborted()
    files[`runtime/${runtimeHash}/${file.path}`] = bytes
  }
  for (const file of snapshot.files) files[`project/${file.path}`] = file.bytes
  const payload = StudioPythonWebPayloadSchema.parse({
    version: 1,
    name: project.name,
    snapshot: {
      ...snapshot,
      files: snapshot.files.map(({ bytes, ...file }) => ({
        ...file,
        byteLength: bytes.byteLength,
      })),
    },
  })
  const payloadJSON = JSON.stringify(payload)
  if (new TextEncoder().encode(payloadJSON).byteLength > PYTHON_WEB_METADATA_BYTES)
    throw new Error('Os metadados do projeto excedem o limite da exportação web.')
  files['payload.json'] = payloadJSON
  files['runtime-deployment.json'] = canonicalJson({
    release: deployment.release,
    distribution: deployment.distribution,
  })
  const assets = await buildPythonAssetBundle(project.assets)
  files['asset-attributions.json'] = JSON.stringify(assets.manifest, null, 2)
  const warnings: string[] = []
  return {
    files,
    warnings,
    async revalidate() {
      const finalHost = await resolve()
      joined.throwIfAborted()
      if (canonicalJson(finalHost) !== canonicalJson(host))
        throw new Error('O ambiente mudou durante a exportação. Tente novamente.')
    },
  }
}
