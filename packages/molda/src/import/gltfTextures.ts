import { GLTF_INPUT_LIMITS, gltfInteger, gltfList, gltfRecord } from './gltfInput'
import { gltfChoice, gltfName } from './gltfMetadata'

export interface GltfSampler {
  name: string | null
  magFilter: 9728 | 9729 | null
  minFilter: 9728 | 9729 | 9984 | 9985 | 9986 | 9987 | null
  wrapS: 33071 | 33648 | 10497
  wrapT: 33071 | 33648 | 10497
}
export interface GltfTexture {
  name: string | null
  sampler: number | null
  source: number | null
}

/** null filtering retains the format's implementation-dependent default, not an arbitrary choice. */
export function readGltfSamplers(input: unknown): GltfSampler[] {
  return gltfList(input, 'samplers', GLTF_INPUT_LIMITS.appearanceItems).map((value, i) => {
    const path = `samplers[${i}]`,
      row = gltfRecord(value, path)
    return {
      name: gltfName(row.name, `${path}.name`),
      magFilter:
        row.magFilter === undefined
          ? null
          : gltfChoice(row.magFilter, [9728, 9729], `${path}.magFilter`),
      minFilter:
        row.minFilter === undefined
          ? null
          : gltfChoice(row.minFilter, [9728, 9729, 9984, 9985, 9986, 9987], `${path}.minFilter`),
      wrapS:
        row.wrapS === undefined
          ? 10497
          : gltfChoice(row.wrapS, [33071, 33648, 10497], `${path}.wrapS`),
      wrapT:
        row.wrapT === undefined
          ? 10497
          : gltfChoice(row.wrapT, [33071, 33648, 10497], `${path}.wrapT`),
    }
  })
}

export function readGltfTextures(
  input: unknown,
  imageCount: number,
  samplerCount: number,
): GltfTexture[] {
  return gltfList(input, 'textures', GLTF_INPUT_LIMITS.appearanceItems).map((value, i) => {
    const path = `textures[${i}]`,
      row = gltfRecord(value, path)
    return {
      name: gltfName(row.name, `${path}.name`),
      source:
        row.source === undefined
          ? null
          : gltfInteger(row.source, `${path}.source`, 0, imageCount - 1),
      sampler:
        row.sampler === undefined
          ? null
          : gltfInteger(row.sampler, `${path}.sampler`, 0, samplerCount - 1),
    }
  })
}
