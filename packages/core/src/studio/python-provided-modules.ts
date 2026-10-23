import { z } from 'zod'
import { canonicalJson } from '../creations/content-fingerprint'
import {
  StudioDependencyArtifactSchema,
  StudioExactVersionSchema,
  studioPortableFileConflict,
} from './project-environment'
import { STUDIO_PYTHON_MATERIAL_LIMITS } from './python-material-policy'

export const PYTHON_PROVIDED_MODULE_LIMITS = Object.freeze({
  descriptorBytes: 16_384,
  modules: 32,
  browserArtifacts: 16,
})

const text = z
  .string()
  .min(1)
  .max(1200)
  .regex(/^[^\p{Cc}]+$/u)
const version = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/)
  .max(32)
const identifier = z
  .string()
  .regex(/^[a-z_][a-z0-9_]*$/)
  .max(64)
const artifact = z.strictObject(StudioDependencyArtifactSchema.shape).readonly()
const api = z
  .strictObject({
    name: identifier,
    // A bounded declaration for these simple APIs, not arbitrary Python source or a type DSL.
    signature: z
      .string()
      .max(256)
      .regex(/^\([A-Za-z0-9_ :|,.*=]*\) -> (?:None|bool|int|float|str)$/),
    summary: text,
  })
  .readonly()

/** Wire-compatible projection consumed by the portable audio implementation. */
export const StudioPythonProvidedAudioPolicySchema = z
  .strictObject({
    version: z.literal(1),
    requestBytes: z.number().int().min(1).max(2048),
    voices: z.number().int().min(1).max(16),
    commandsPerSecond: z.number().int().min(1).max(64),
    wavChunks: z.number().int().min(1).max(256),
    fileBytes: z.number().int().min(44).max(STUDIO_PYTHON_MATERIAL_LIMITS.audioBytes),
    durationSeconds: z.number().int().min(1).max(600),
    minimumSampleRate: z.number().int().min(8000).max(96000),
    maximumSampleRate: z.number().int().min(8000).max(96000),
  })
  .refine((value) => value.minimumSampleRate <= value.maximumSampleRate, {
    message: 'O intervalo de frequências de áudio é inválido.',
  })
  .readonly()

/**
 * Data about the first provided-module family. This is neither stdlib, an installed
 * extension nor an authorization. Future families need their own explicit contract.
 * No default/transform: descriptors are explicit current metadata.
 */
export const StudioPythonProvidedModuleDescriptorSchema = z
  .strictObject({
    descriptorVersion: z.literal(1),
    kind: z.literal('portable-audio'),
    importName: identifier,
    version,
    provider: z.literal('sistema-zero'),
    summary: text,
    api: z.array(api).min(1).max(16).readonly(),
    browser: z
      .strictObject({
        installation: z.literal('runtime-bundled'),
        paths: z.literal('captured-project-assets'),
        requiresUserGesture: z.literal(true),
        lifetime: z.literal('execution-session'),
        notes: z.array(text).min(1).max(8).readonly(),
      })
      .readonly(),
    audio: z
      .strictObject({
        container: z.literal('RIFF/WAVE'),
        encoding: z.literal('PCM16'),
        channels: z.tuple([z.literal(1), z.literal(2)]).readonly(),
        assetsTotalBytes: z.number().int().min(44).max(STUDIO_PYTHON_MATERIAL_LIMITS.totalBytes),
        policy: StudioPythonProvidedAudioPolicySchema,
      })
      .readonly(),
    native: z
      .strictObject({
        distribution: z
          .string()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
          .max(96),
        requiresPython: z
          .string()
          .regex(/^>=\d+\.\d+\.\d+,<\d+\.\d+$/)
          .max(64),
        installation: z.literal('exported-package'),
        lifetime: z.literal('process'),
        dependencies: z
          .strictObject({
            setuptools: StudioExactVersionSchema,
            miniaudio: StudioExactVersionSchema,
            cffi: StudioExactVersionSchema,
            pycparser: StudioExactVersionSchema,
          })
          .readonly(),
        notes: z.array(text).min(1).max(8).readonly(),
      })
      .readonly(),
  })
  .superRefine((value, context) => {
    if (new Set(value.api.map((entry) => entry.name)).size !== value.api.length)
      context.addIssue({ code: 'custom', path: ['api'], message: 'Há funções repetidas.' })
    if (value.audio.policy.fileBytes > value.audio.assetsTotalBytes)
      context.addIssue({
        code: 'custom',
        path: ['audio'],
        message: 'O som excede a cota de materiais.',
      })
    if (
      new TextEncoder().encode(canonicalJson(value)).byteLength >
      PYTHON_PROVIDED_MODULE_LIMITS.descriptorBytes
    )
      context.addIssue({ code: 'custom', message: 'A descrição do módulo excede o limite.' })
  })
  .readonly()
export type StudioPythonProvidedModuleDescriptor = z.infer<
  typeof StudioPythonProvidedModuleDescriptorSchema
>

export function pythonProvidedModuleArtifactPaths(
  descriptor: Pick<StudioPythonProvidedModuleDescriptor, 'importName' | 'version'>,
) {
  const name = identifier.parse(descriptor.importName)
  const revision = version.parse(descriptor.version)
  const root = `python-modules/${name}/${revision}`
  return { descriptor: `${root}/descriptor.json`, typing: `${root}/__init__.pyi` }
}

/** References are metadata only; the release must bind every path/hash and approve its use. */
export const StudioPythonProvidedModuleSchema = z
  .strictObject({
    descriptor: StudioPythonProvidedModuleDescriptorSchema,
    descriptorArtifact: artifact,
    typingArtifact: artifact,
    browserArtifacts: z
      .array(artifact)
      .min(1)
      .max(PYTHON_PROVIDED_MODULE_LIMITS.browserArtifacts)
      .readonly(),
  })
  .superRefine((value, context) => {
    const paths = pythonProvidedModuleArtifactPaths(value.descriptor)
    if (
      value.descriptorArtifact.path !== paths.descriptor ||
      value.typingArtifact.path !== paths.typing
    )
      context.addIssue({
        code: 'custom',
        message: 'Os artefatos descrevem outro módulo ou versão.',
      })
    const references = [value.descriptorArtifact, value.typingArtifact, ...value.browserArtifacts]
    if (studioPortableFileConflict(references.map((entry) => entry.path)))
      context.addIssue({
        code: 'custom',
        message: 'Há caminhos conflitantes nos artefatos do módulo.',
      })
    if (
      value.browserArtifacts.some(
        (entry) => entry.path.startsWith('_http/') || !entry.path.endsWith('.mjs'),
      )
    )
      context.addIssue({
        code: 'custom',
        path: ['browserArtifacts'],
        message: 'Use os módulos lógicos do navegador.',
      })
  })
  .readonly()
export type StudioPythonProvidedModule = z.infer<typeof StudioPythonProvidedModuleSchema>

/** Synchronous reference check for already parsed metadata; does not validate artifact bytes. */
export function studioPythonProvidedModuleArtifactIssue(
  module: StudioPythonProvidedModule,
  artifacts: readonly Readonly<{ path: string; sha256: string }>[],
): string | null {
  if (studioPortableFileConflict(artifacts.map((entry) => entry.path)))
    return 'Há caminhos conflitantes na lista de artefatos da release.'
  const hashes = new Map(artifacts.map((entry) => [entry.path, entry.sha256]))
  for (const entry of [
    module.descriptorArtifact,
    module.typingArtifact,
    ...module.browserArtifacts,
  ])
    if (hashes.get(entry.path) !== entry.sha256)
      return 'O artefato do módulo está ausente ou difere da release.'
  return null
}

export const StudioPythonProvidedModulesSchema = z
  .array(StudioPythonProvidedModuleSchema)
  .max(PYTHON_PROVIDED_MODULE_LIMITS.modules)
  .superRefine((value, context) => {
    if (new Set(value.map((entry) => entry.descriptor.importName)).size !== value.length)
      context.addIssue({ code: 'custom', message: 'Há módulos fornecidos repetidos.' })
  })
  .readonly()
