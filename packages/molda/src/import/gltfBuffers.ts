import { materializeGltfBuffers, planGltfBuffers } from './gltfBufferPlan'
import type { GltfBufferView } from './gltfBufferViews'
import type { GltfEnvelope } from './gltfEnvelope'
import { type GltfLocalFile, GltfResourcePlan } from './gltfResourcePlan'

export type { GltfLocalFile } from './gltfResourcePlan'
export type GltfBufferRead =
  | { status: 'missing'; paths: string[] }
  | { status: 'ready'; buffers: Uint8Array[]; views: GltfBufferView[]; resourceBytes: number }

/** Buffer-only reader. Use readGltfResources to budget buffers and images together. */
export function readGltfBuffers(
  envelope: GltfEnvelope,
  files: readonly GltfLocalFile[] = [],
  entryPath = 'model.gltf',
): GltfBufferRead {
  const resources = new GltfResourcePlan(files, entryPath)
  const { buffers, views } = planGltfBuffers(envelope, resources)
  const result = resources.finish()
  if (result.status === 'missing') return result
  return {
    status: 'ready',
    buffers: materializeGltfBuffers(buffers, result.owned),
    views,
    resourceBytes: result.resourceBytes,
  }
}
