export const CREATOR_SHOWCASE_SLUGS = {
  kids: 'mural-dos-criadores',
  adult: 'mural-dos-criadores-adulto',
} as const
export function creatorCommunityAccessRef(ref: string, audience: 'adult' | 'kids') {
  return audience === 'adult' ? `adult-${ref}` : ref
}
