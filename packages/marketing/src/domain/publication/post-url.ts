import type { Network } from './publication'

const hosts: Record<Network, string[]> = {
  instagram: ['instagram.com'],
  facebook: ['facebook.com', 'fb.watch'],
  youtube: ['youtube.com', 'youtu.be'],
  tiktok: ['tiktok.com'],
}
/** Parse the origin before inspecting a path. Tracking parameters never identify a post. */
export function postUrl(network: Network, input: string): URL | null {
  try {
    const url = new URL(input)
    return url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      hosts[network].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)) &&
      url.pathname !== '/'
      ? url
      : null
  } catch {
    return null
  }
}
export function instagramShortcode(input: string): string | null {
  return (
    postUrl('instagram', input)?.pathname.match(/^\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)\/?$/)?.[1] ??
    null
  )
}
export function youtubeVideoId(input: string): string | null {
  const url = postUrl('youtube', input)
  if (!url) return null
  const value =
    url.hostname === 'youtu.be' || url.hostname.endsWith('.youtu.be')
      ? url.pathname.match(/^\/([A-Za-z0-9_-]+)\/?$/)?.[1]
      : url.pathname === '/watch'
        ? url.searchParams.get('v')
        : url.pathname.match(/^\/(?:shorts|live)\/([A-Za-z0-9_-]+)\/?$/)?.[1]
  return value && /^[A-Za-z0-9_-]{11}$/.test(value) ? value : null
}
export function facebookPostIdentity(input: string): string | null {
  const url = postUrl('facebook', input)
  if (!url) return null
  for (const key of ['story_fbid', 'fbid', 'v']) {
    const value = url.searchParams.get(key)
    if (value && /^[A-Za-z0-9]+$/.test(value)) return `post:${value}`
  }
  const post = url.pathname.match(/\/(?:posts|videos|reel)\/([A-Za-z0-9]+)\/?$/)?.[1]
  if (post) return `post:${post}`
  // The publisher may return Graph's pageId_postId URL before a permalink is available.
  const compound = url.pathname.match(/^\/\d+_(\d+)\/?$/)?.[1]
  if (compound) return `post:${compound}`
  if (url.hostname === 'fb.watch' && /^\/[A-Za-z0-9_-]+\/?$/.test(url.pathname))
    return `watch:${url.pathname.replace(/\/$/, '')}`
  // /photo and /story.php without a post id are ambiguous; a page id is never a post id.
  return null
}
