/** Reviewed, public curriculum illustrations. No uploaded SVG or arbitrary file path is served. */
const dino =
  '<path d="M-22 -8V-33H-12V-51H20V-30H4V-20H18V-13H-1V0H-11V-9H-18V0H-27V-12L-39 -24V-36L-22 -22Z" fill="#285ce8"/><rect x="9" y="-44" width="5" height="5" fill="white"/>'
const tree =
  '<path d="M-6 0V-95H6V0Z" fill="#896746"/><path d="M-52 -12L-27 -55H-40L-15 -88H-27L0 -130L27 -88H15L40 -55H27L52 -12Z" fill="#457953"/>'
const cactus =
  '<path d="M-7 0V-20H-20V-40H-12V-29H-7V-54Q0 -64 7 -54V-36H14V-47H22V-27H7V0Z" fill="#457953"/>'
const wrap = (title: string, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 240" role="img"><title>${title}</title><rect width="640" height="240" rx="20" fill="#f8f6e9"/><path d="M20 200H620M320 18V222" stroke="#aebda0"/><g font-family="sans-serif" font-size="18" fill="#35452f"><text x="30" y="32">A</text><text x="350" y="32">B</text></g>${body}</svg>`
const images = new Map<string, string>([
  [
    'dino-camadas-v1.svg',
    wrap(
      'Dino coberto em A e visível em B',
      `<g transform="translate(165 200)">${dino}${tree}</g><g transform="translate(485 200)">${tree}${dino}</g>`,
    ),
  ],
  [
    'dino-impulso-v1.svg',
    wrap(
      'Dois saltos da mesma posição, com alturas diferentes',
      `<path d="M165 200V135M485 200V70" stroke="#c67431" stroke-width="4" stroke-dasharray="6 4"/><g opacity=".25" transform="translate(165 200)">${dino}</g><g opacity=".25" transform="translate(485 200)">${dino}</g><g transform="translate(165 135)">${dino}</g><g transform="translate(485 70)">${dino}</g>`,
    ),
  ],
  [
    'dino-area-v1.svg',
    wrap(
      'Mesmos desenhos e posições, áreas do Dino diferentes',
      `<g transform="translate(130 200)">${dino}</g><g transform="translate(195 200)">${cactus}</g><g transform="translate(450 200)">${dino}</g><g transform="translate(515 200)">${cactus}</g><g fill="none" stroke-width="3" stroke-dasharray="5 3"><path d="M106 146H154V200H106Z M177 140H213V200H177Z" stroke="#315f92"/><path d="M400 146H500V200H400Z M497 140H533V200H497Z" stroke="#ae3e2c"/></g>`,
    ),
  ],
])

export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params
  const svg = images.get(name)
  return new Response(svg ?? 'Imagem não encontrada', {
    status: svg ? 200 : 404,
    headers: {
      'content-type': svg ? 'image/svg+xml; charset=utf-8' : 'text/plain; charset=utf-8',
      'cache-control': svg ? 'public, max-age=31536000, immutable' : 'no-store',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  })
}
