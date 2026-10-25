/** Engine-owned scenes; page canvas constructors remain available for existing JS projects. */
export const FULLSCREEN_GAME3D_KITS = ['crossing', 'race', 'stack', 'platform'] as const
export type FullscreenGame3DKit = (typeof FULLSCREEN_GAME3D_KITS)[number]
export function isFullscreenGame3DKit(value: unknown): value is FullscreenGame3DKit {
  return FULLSCREEN_GAME3D_KITS.some((kit) => kit === value)
}
