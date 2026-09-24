/** Arte local compartilhada pelo projeto A Chave do Farol e pela experiência da porta. */
export const FAROL_ASSETS = {
  cenario: {
    width: 640,
    height: 360,
    body: '<rect width="640" height="360" fill="#b9dfd0"/><path d="M0 0H640V93Q550 83 475 104Q393 116 316 94Q209 76 120 100Q44 112 0 93Z" fill="#a6d5ea"/><path d="M0 270Q120 258 248 277Q354 292 442 273Q530 254 640 272V360H0Z" fill="#96c98d"/><path d="M497 0H640V360H523Q537 304 511 246Q484 197 506 145Q525 94 497 0Z" fill="#5ba9c1"/><path d="M0 165Q86 155 178 175Q255 181 318 157" fill="none" stroke="#e8d7a8" stroke-width="22" stroke-linecap="round"/><path d="M318 157Q404 141 456 177" fill="none" stroke="#e8d7a8" stroke-width="22" stroke-linecap="round"/><g fill="#fff5ca"><circle cx="92" cy="128" r="5"/><circle cx="214" cy="229" r="4"/><circle cx="377" cy="96" r="5"/></g>',
  },
  personagem: {
    width: 40,
    height: 48,
    body: '<ellipse cx="20" cy="43" rx="15" ry="4" fill="#557564" opacity=".4"/><rect x="7" y="19" width="26" height="25" rx="8" fill="#6a68b0" stroke="#3b426c" stroke-width="2"/><circle cx="20" cy="14" r="12" fill="#f2bf91" stroke="#714f50" stroke-width="2"/><path d="M8 13Q8 -1 21 1Q33 3 32 14Z" fill="#443b61"/><circle cx="16" cy="15" r="1.5"/><circle cx="24" cy="15" r="1.5"/>',
  },
  chave: {
    width: 42,
    height: 42,
    body: '<circle cx="12" cy="12" r="8" fill="none" stroke="#d99335" stroke-width="5"/><path d="M18 18L36 36M29 29L33 25M33 33L37 29" fill="none" stroke="#d99335" stroke-width="5" stroke-linecap="round"/>',
  },
  'farol-apagado': {
    width: 100,
    height: 154,
    body: '<path d="M19 151L31 45H69L81 151Z" fill="#f9eee1" stroke="#816474" stroke-width="4"/><path d="M26 84H74L70 101H30Z" fill="#df6962"/><rect data-porta="fechada" x="40" y="113" width="20" height="38" rx="3" fill="#674f63"/><path d="M30 45V20H70V45Z" fill="#6c8196" stroke="#546273" stroke-width="4"/><path d="M23 20L50 5L77 20Z" fill="#dc6864" stroke="#98525a" stroke-width="3"/>',
  },
  'farol-aceso': {
    width: 100,
    height: 154,
    body: '<path d="M50 30L0 0V68Z" fill="#ffe79e" opacity=".65"/><path d="M50 30L100 0V68Z" fill="#ffe79e" opacity=".65"/><path d="M19 151L31 45H69L81 151Z" fill="#f9eee1" stroke="#816474" stroke-width="4"/><path d="M26 84H74L70 101H30Z" fill="#df6962"/><rect x="40" y="113" width="20" height="38" rx="3" fill="#ffe6a0" stroke="#674f63" stroke-width="2"/><path data-porta="aberta" d="M40 114L28 121V150L40 151Z" fill="#674f63" stroke="#4a3b52" stroke-width="2"/><circle cx="33" cy="135" r="1.5" fill="#ffe6a0"/><path d="M30 45V20H70V45Z" fill="#ffde73" stroke="#9e7846" stroke-width="4"/><path d="M23 20L50 5L77 20Z" fill="#dc6864" stroke="#98525a" stroke-width="3"/>',
  },
  barco: {
    width: 72,
    height: 50,
    body: '<path d="M4 28H68L57 44H16Z" fill="#935969" stroke="#654f65" stroke-width="3"/><path d="M35 3V27H61Z" fill="#f9efd7" stroke="#8a7880" stroke-width="2"/><path d="M35 3L16 26H35Z" fill="#fff7e5" stroke="#8a7880" stroke-width="2"/>',
  },
} as const

export type FarolAssetName = keyof typeof FAROL_ASSETS

export function farolSvg(name: FarolAssetName): string {
  const { width, height, body } = FAROL_ASSETS[name]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`
}

export function farolSvgUrl(name: FarolAssetName): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(farolSvg(name))}`
}
