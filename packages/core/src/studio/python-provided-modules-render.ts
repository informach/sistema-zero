import { canonicalJson, sha256Hex } from '../creations/content-fingerprint'
import { StudioDependencyArtifactSchema } from './project-environment'
import {
  pythonProvidedModuleArtifactPaths,
  StudioPythonProvidedModuleDescriptorSchema,
  StudioPythonProvidedModuleSchema,
  studioPythonProvidedModuleArtifactIssue,
} from './python-provided-modules'

/** Plain reference text shared by assistance and help; not an instruction to install or execute. */
export function renderPythonProvidedModuleReference(raw: unknown): string {
  const descriptor = StudioPythonProvidedModuleDescriptorSchema.parse(raw)
  const { audio, native } = descriptor
  const policy = audio.policy
  return [
    `${descriptor.importName} ${descriptor.version} — Sistema Zero`,
    descriptor.summary,
    ...descriptor.api.map(
      (entry) => `${descriptor.importName}.${entry.name}${entry.signature}\n${entry.summary}`,
    ),
    ...descriptor.browser.notes,
    `Formato: ${audio.container} ${audio.encoding}, mono ou estéreo; ${policy.minimumSampleRate}–${policy.maximumSampleRate} Hz; até ${policy.durationSeconds} segundos.`,
    `Limites: ${policy.fileBytes} bytes por som, ${audio.assetsTotalBytes} bytes de materiais no projeto, ${policy.voices} vozes e ${policy.commandsPerSecond} comandos por segundo.`,
    `Computador: ${native.distribution} ${descriptor.version}; Python ${native.requiresPython}.`,
    `Dependências nativas: ${Object.entries(native.dependencies)
      .map(([name, version]) => `${name}==${version}`)
      .join(', ')}.`,
    ...native.notes,
  ].join('\n\n')
}

/**
 * Produces declarations only. Verify implementation signatures by parsing the trusted
 * module and this stub with CPython ast.parse, never importing or executing learner code.
 * Compare FunctionDef name, positional/keyword-only args and literal defaults; ignore
 * annotations absent from the current implementation. Reject decorators/async/variadics
 * in that comparison. For sz_audio, inspect the __version__ = _MODULE['version']
 * AST binding and compare generated _module.json with the descriptor as data;
 * never evaluate its import-time file reader.
 */
export function renderPythonProvidedModuleStub(raw: unknown): string {
  const descriptor = StudioPythonProvidedModuleDescriptorSchema.parse(raw)
  return [
    JSON.stringify(descriptor.summary),
    '__version__: str',
    '__all__: list[str]',
    '',
    ...descriptor.api.flatMap((entry) => [
      `def ${entry.name}${entry.signature}:`,
      `    ${JSON.stringify(entry.summary)}`,
      '    ...',
      '',
    ]),
  ].join('\n')
}

/** Exact UTF-8 contents/digests to emit as logical distribution files. No IO or approval. */
export async function buildPythonProvidedModuleMetadata(raw: unknown) {
  const descriptor = StudioPythonProvidedModuleDescriptorSchema.parse(raw)
  const paths = pythonProvidedModuleArtifactPaths(descriptor)
  const json = canonicalJson(descriptor)
  const stub = renderPythonProvidedModuleStub(descriptor)
  return {
    descriptor,
    descriptorFile: { path: paths.descriptor, text: json, sha256: await sha256Hex(json) },
    typingFile: { path: paths.typing, text: stub, sha256: await sha256Hex(stub) },
  }
}

/**
 * Checks references against a supplied artifact list. The caller still owns release
 * identity/status/authorization and verification of actual browser bytes. Never use
 * this structural check as permission to execute, install or advertise availability.
 */
export async function verifyPythonProvidedModuleArtifacts(raw: unknown, releaseArtifacts: unknown) {
  // Zod copies and freezes metadata before the first await.
  const module = StudioPythonProvidedModuleSchema.parse(raw)
  const artifacts = StudioDependencyArtifactSchema.array().min(1).max(512).parse(releaseArtifacts)
  const issue = studioPythonProvidedModuleArtifactIssue(module, artifacts)
  if (issue) throw new Error(issue)
  const metadata = await buildPythonProvidedModuleMetadata(module.descriptor)
  if (
    module.descriptorArtifact.sha256 !== metadata.descriptorFile.sha256 ||
    module.typingArtifact.sha256 !== metadata.typingFile.sha256
  )
    throw new Error('O descriptor ou a tipagem difere dos bytes declarados.')
  return module
}
