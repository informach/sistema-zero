/** Shared by the visitor collector and the isolated screenshot worker. No form values. */
export const TRACKABLE =
  'section, main, [data-analytics-section], a[href], button, summary, video, [data-analytics-id], [data-analytics-question]'
const PRIVATE =
  'form, input, textarea, select, [contenteditable], [data-analytics-private], dialog, [role="dialog"], #sz-metrics-controls'
const cleanId = (s: string) => s.replace(/[^a-zA-Z0-9_./:#-]/g, '-').slice(0, 150)
export function elementId(el: Element): string {
  const explicit = el.getAttribute('data-analytics-id') || el.getAttribute('data-home-cta') || el.id
  if (explicit) return cleanId(explicit)
  const parts: string[] = []
  let node: Element | null = el
  while (node && node !== document.body && parts.length < 9) {
    if (node.id) {
      parts.unshift(cleanId(node.id))
      break
    }
    const tag = node.tagName.toLowerCase()
    const siblings: Element[] = node.parentElement
      ? Array.from(node.parentElement.children).filter((s) => s.tagName === node!.tagName)
      : []
    parts.unshift(`${tag}:${siblings.indexOf(node) + 1}`)
    node = node.parentElement
  }
  return parts.join('/')
}
export function publicLabel(el: Element): string {
  if (el.closest(PRIVATE)) return ''
  const copy = el.cloneNode(true) as Element
  for (const node of Array.from(
    copy.querySelectorAll(
      `${PRIVATE}, script, style, [aria-hidden="true"], .material-symbols-rounded, .material-symbols-outlined`,
    ),
  ))
    node.remove()
  return (el.getAttribute('aria-label') || copy.textContent || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
    .replace(/\S+@\S+|\b\d[\d .()+-]{8,}\d\b/g, '[oculto]')
}
export function describe(el: Element, publicText: boolean) {
  const section = el.closest('section, [data-analytics-section], main')
  const heading = section?.querySelector('h1, h2, h3')
  let destination: string | undefined
  if (el instanceof HTMLAnchorElement) {
    const url = new URL(el.href, location.href)
    if (url.origin === location.origin && /^\/[a-z0-9/_-]*$/.test(url.pathname))
      destination = `${url.pathname}${/^#[a-zA-Z0-9_-]+$/.test(url.hash) ? url.hash : ''}`.slice(
        0,
        220,
      )
  }
  return {
    elementId: elementId(el),
    sectionId: section ? elementId(section) : undefined,
    label: publicText ? publicLabel(el.matches('section,main') ? heading || el : el) : undefined,
    destination,
  }
}
export function discover(): Element[] {
  return Array.from(document.querySelectorAll(TRACKABLE)).filter((el) => !el.closest(PRIVATE))
}
export async function pageRevision(
  publicText: boolean,
  definition: string,
  release: string,
): Promise<string> {
  let content = `${location.pathname}|${definition}|${release}`
  // Bundled CSS filenames change with the build, even without a hosting release variable.
  content += Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
    .map((link) => new URL(link.href, location.href).pathname)
    .sort()
    .join('|')
  if (publicText) {
    const root = document.querySelector('main') || document.body
    const clone = root.cloneNode(true) as Element
    for (const node of Array.from(
      clone.querySelectorAll(`${PRIVATE},script,style,noscript,astro-island`),
    ))
      node.remove()
    content += (clone.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100000)
    content += Array.from(root.querySelectorAll('img'))
      .map((img) => new URL(img.src, location.href).pathname)
      .join('|')
    content += discover()
      .map((el) => `${elementId(el)}:${el.getAttribute('href')?.split('?')[0] || ''}`)
      .join('|')
  }
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content))
  return Array.from(new Uint8Array(bytes), (n) => n.toString(16).padStart(2, '0')).join('')
}
export async function snapshot(publicText: boolean, definition: string, release: string) {
  const elements: Record<string, { x: number; y: number; width: number; height: number }> = {}
  for (const el of discover()) {
    const r = el.getBoundingClientRect()
    if (r.width && r.height && getComputedStyle(el).visibility !== 'hidden')
      elements[elementId(el)] = {
        x: r.x + scrollX,
        y: r.y + scrollY,
        width: r.width,
        height: r.height,
      }
  }
  return {
    revision: await pageRevision(publicText, definition, release),
    viewport: innerWidth,
    height: document.documentElement.scrollHeight,
    elements,
  }
}
