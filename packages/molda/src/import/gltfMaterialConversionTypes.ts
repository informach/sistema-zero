export interface GltfMaterialIssue {
  code:
    | 'name-generated'
    | 'name-shortened'
    | 'base-color-factor-baked'
    | 'rgba16-to-rgba8'
    | 'image-alias-shared'
    | 'sampler-filter-nearest'
    | 'sampler-wrap-clamp'
    | 'occlusion-omitted'
    | 'emissive-omitted'
  path: string
  /** Native material or image affected. Source details remain in the staged glTF. */
  targetId: string
}

export { linearUnitToSrgb as gltfLinearToSrgb } from '../core/colorTransfer'
