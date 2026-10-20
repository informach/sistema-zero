import { createHash } from 'node:crypto'
import { StudioPythonProvidedModuleSchema } from '@sistemazero/core/studio/python-provided-modules'
import { buildPythonProvidedModuleMetadata } from '@sistemazero/core/studio/python-provided-modules-render'
import { SZ_AUDIO_MODULE_DESCRIPTOR } from '@sistemazero/core/studio/python-provided-modules-sz-audio'

/** Build-owned logical artifacts. This packages metadata, never approves a release. */
export async function buildPythonProvidedModuleArtifacts(
  contents: ReadonlyMap<string, Uint8Array>,
) {
  // Hash the already-built implementation before awaiting; no circular manifest digest.
  const browserArtifacts = ['worker.mjs', 'frame.mjs', 'standalone.mjs', 'playtest.mjs'].map(
    (path) => {
      const bytes = contents.get(path)
      if (!bytes) throw new Error(`Implementação do módulo Python ausente: ${path}.`)
      return { path, sha256: createHash('sha256').update(bytes).digest('hex') }
    },
  )
  const metadata = await buildPythonProvidedModuleMetadata(SZ_AUDIO_MODULE_DESCRIPTOR)
  const files = new Map<string, Uint8Array<ArrayBuffer>>()
  for (const artifact of [metadata.descriptorFile, metadata.typingFile]) {
    if (contents.has(artifact.path))
      throw new Error(`O caminho de metadados Python já está ocupado: ${artifact.path}.`)
    files.set(artifact.path, new TextEncoder().encode(artifact.text))
  }
  const module = StudioPythonProvidedModuleSchema.parse({
    descriptor: metadata.descriptor,
    descriptorArtifact: {
      path: metadata.descriptorFile.path,
      sha256: metadata.descriptorFile.sha256,
    },
    typingArtifact: { path: metadata.typingFile.path, sha256: metadata.typingFile.sha256 },
    browserArtifacts,
  })
  return { files, modules: [module] }
}
