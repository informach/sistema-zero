import { z } from 'zod'
import { canonicalJson, sha256Hex } from '../creations/content-fingerprint'
import { StudioProjectIdSchema } from './project-document'
import {
  isStudioPortablePath,
  StudioRuntimeSelectionSchema,
  StudioSha256Schema,
  studioPortableFileConflict,
} from './project-environment'
import {
  StudioPythonExecutionMetadataSchema,
  verifyStudioPythonExecutionMetadata,
} from './python-execution-content'
import { STUDIO_PYTHON_MATERIAL_LIMITS } from './python-material-policy'
import { STUDIO_PYTHON_PLAYTEST_LIMITS } from './python-playtest'
import {
  STUDIO_PYTHON_PREVIEW_LIFETIME_MS,
  StudioPythonWebOriginSchema,
} from './python-preview-input'
import {
  STUDIO_PYTHON_VALIDATION_LIMITS,
  StudioPythonValidationReportSchema,
  verifyStudioPythonValidationReport,
} from './python-validation'

/** Temporary Python previews do not inherit or increase the JavaScript compiled-file budget. */
export const STUDIO_PYTHON_PREVIEW_LIMITS = Object.freeze({
  lifetimeMs: STUDIO_PYTHON_PREVIEW_LIFETIME_MS,
  manifestBytes: 256 * 1024,
  payloadBytes: 2 * 1024 * 1024,
  launcherBytes: 64 * 1024,
  maxFiles: 213,
})

export {
  isStudioPythonWebOrigin,
  StudioPythonPreviewRequestSchema,
  StudioPythonWebOriginSchema,
} from './python-preview-input'

export {
  type StudioPythonPreviewReference,
  StudioPythonPreviewReferenceSchema,
  studioPythonPreviewRoute,
  verifyStudioPythonPreviewReference,
} from './python-preview-reference'

const generatedPaths = {
  launcher: 'index.html',
  stylesheet: 'player.css',
  payload: 'payload.json',
  validation: 'validation.json',
  capture: 'python-playtest.png',
} as const
const PreviewFileSchema = z
  .strictObject({
    role: z.enum(['project', 'launcher', 'stylesheet', 'payload', 'validation', 'capture']),
    path: z.string().max(248),
    bytes: z.number().int().nonnegative().max(STUDIO_PYTHON_MATERIAL_LIMITS.snapshotBytes),
    sha256: StudioSha256Schema,
  })
  .superRefine((file, context) => {
    if (
      file.role === 'project'
        ? !file.path.startsWith('project/') || !isStudioPortablePath(file.path.slice(8))
        : file.path !== generatedPaths[file.role]
    )
      context.addIssue({ code: 'custom', message: 'Caminho do preview Python inválido.' })
  })
export const StudioPythonPreviewManifestSchema = z
  .strictObject({
    kind: z.literal('python-preview'),
    version: z.literal(1),
    id: StudioSha256Schema,
    jobId: StudioSha256Schema,
    projectId: StudioProjectIdSchema,
    revision: StudioSha256Schema,
    runtime: StudioRuntimeSelectionSchema,
    pythonVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    createdAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().nonnegative(),
    parentOrigin: StudioPythonWebOriginSchema,
    validation: z.strictObject({
      profileVersion: z.literal(1),
      runtimeFingerprint: StudioSha256Schema,
    }),
    files: z.array(PreviewFileSchema).min(5).max(STUDIO_PYTHON_PREVIEW_LIMITS.maxFiles),
  })
  .superRefine((manifest, context) => {
    const totals = { project: 0, launcher: 0, stylesheet: 0, payload: 0, validation: 0, capture: 0 }
    const counts = { ...totals }
    for (const file of manifest.files) {
      totals[file.role] += file.bytes
      counts[file.role]++
    }
    if (
      studioPortableFileConflict(manifest.files.map((file) => file.path)) ||
      counts.project < 1 ||
      counts.project > 208 ||
      counts.launcher !== 1 ||
      counts.stylesheet !== 1 ||
      counts.payload !== 1 ||
      counts.validation !== 1 ||
      counts.capture > 1 ||
      totals.project > STUDIO_PYTHON_MATERIAL_LIMITS.snapshotBytes ||
      totals.launcher + totals.stylesheet > STUDIO_PYTHON_PREVIEW_LIMITS.launcherBytes ||
      totals.payload > STUDIO_PYTHON_PREVIEW_LIMITS.payloadBytes ||
      totals.validation > STUDIO_PYTHON_VALIDATION_LIMITS.reportBytes ||
      totals.capture > STUDIO_PYTHON_PLAYTEST_LIMITS.captureBytes ||
      manifest.expiresAt !== manifest.createdAt + STUDIO_PYTHON_PREVIEW_LIMITS.lifetimeMs
    )
      context.addIssue({ code: 'custom', message: 'Conteúdo ou prazo do preview Python inválido.' })
  })
export type StudioPythonPreviewManifest = z.infer<typeof StudioPythonPreviewManifestSchema>

/** Parse every caller-owned value before awaiting. Storage must additionally verify every byte stream. */
export async function verifyStudioPythonPreviewManifest(
  raw: unknown,
  snapshotInput: unknown,
  reportInput: unknown,
) {
  const manifest = StudioPythonPreviewManifestSchema.parse(raw)
  const snapshotCopy = StudioPythonExecutionMetadataSchema.parse(snapshotInput)
  const reportCopy = StudioPythonValidationReportSchema.parse(reportInput)
  const [snapshot, report] = await Promise.all([
    verifyStudioPythonExecutionMetadata(snapshotCopy),
    verifyStudioPythonValidationReport(reportCopy, snapshotCopy, reportCopy.recipe),
  ])
  const projectFiles = manifest.files.filter((file) => file.role === 'project')
  const reportText = canonicalJson(report)
  const reportFile = manifest.files.find((file) => file.role === 'validation')
  const capture = manifest.files.find((file) => file.role === 'capture')
  const expectedCapture = report.execution?.capture
  if (
    report.status !== 'passed' ||
    manifest.projectId !== snapshot.projectId ||
    manifest.revision !== snapshot.revision ||
    canonicalJson(manifest.runtime) !== canonicalJson(snapshot.configuration.runtime) ||
    manifest.pythonVersion !== snapshot.configuration.python.dependencyLock.pythonVersion ||
    projectFiles.length !== snapshot.files.length ||
    snapshot.files.some(
      (file) =>
        !projectFiles.some(
          (item) =>
            item.path === `project/${file.path}` &&
            item.bytes === file.byteLength &&
            item.sha256 === file.sha256,
        ),
    ) ||
    reportFile?.bytes !== new TextEncoder().encode(reportText).byteLength ||
    reportFile.sha256 !== (await sha256Hex(reportText)) ||
    Boolean(capture) !== Boolean(expectedCapture) ||
    (capture &&
      (capture.bytes !== expectedCapture?.byteLength ||
        capture.sha256 !== expectedCapture?.sha256)) ||
    new TextEncoder().encode(canonicalJson(manifest)).byteLength >
      STUDIO_PYTHON_PREVIEW_LIMITS.manifestBytes
  )
    throw new Error('O preview Python não corresponde aos arquivos e à validação.')
  return manifest
}
