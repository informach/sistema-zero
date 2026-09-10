/** The pinned official package ships JS/JSDoc only. Keep the unvalidated report unknown. */
declare module 'gltf-validator' {
  export function validateBytes(
    data: Uint8Array,
    options?: { format?: 'glb' | 'gltf'; maxIssues?: number; writeTimestamp?: boolean },
  ): Promise<unknown>
}
