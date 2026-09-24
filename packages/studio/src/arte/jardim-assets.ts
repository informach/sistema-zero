/** Arte preparada para Cadê Todo Mundo?, usada pelo projeto e pela experiência da aula. */
export const JARDIM_ASSETS = {
  jardim: {
    width: 640,
    height: 360,
    body: '<rect width="640" height="360" fill="#c7effb"/><circle cx="559" cy="67" r="36" fill="#ffec9b"/><path d="M0 250Q124 209 246 244T478 244T640 244V360H0" fill="#a9db8d"/><path d="M0 286Q130 257 256 284T512 282T640 274V360H0" fill="#70bb75"/><path d="M0 323Q98 302 184 324T376 320T640 319V360H0" fill="#54a96c"/><g fill="#f7f4cf"><circle cx="86" cy="273" r="4"/><circle cx="361" cy="273" r="4"/><circle cx="544" cy="300" r="4"/></g>',
  },
  coelho: {
    width: 96,
    height: 112,
    body: '<ellipse cx="48" cy="86" rx="36" ry="24" fill="#fff4e6" stroke="#594863" stroke-width="3"/><path d="M23 60Q9 4 27 7Q41 11 39 56M56 56Q61 3 76 8Q89 15 68 62" fill="#fff4e6" stroke="#594863" stroke-width="3"/><ellipse cx="48" cy="62" rx="35" ry="31" fill="#fff4e6" stroke="#594863" stroke-width="3"/><circle cx="35" cy="58" r="4" fill="#382e42"/><circle cx="61" cy="58" r="4" fill="#382e42"/><path d="M43 70L48 74L53 70" fill="#f79e9f" stroke="#594863" stroke-width="2"/>',
  },
  raposa: {
    width: 96,
    height: 112,
    body: '<path d="M6 24L24 4L37 27Q48 21 59 27L73 4L91 24L84 79Q74 103 48 105Q22 103 12 79Z" fill="#f6a35c" stroke="#77444a" stroke-width="3"/><path d="M14 72Q26 91 48 86Q70 91 82 72Q70 101 48 105Q26 101 14 72" fill="#fff3df"/><circle cx="32" cy="62" r="4" fill="#3e3443"/><circle cx="64" cy="62" r="4" fill="#3e3443"/><circle cx="48" cy="79" r="5" fill="#3e3443"/>',
  },
  coruja: {
    width: 96,
    height: 112,
    body: '<path d="M13 28L10 5L29 18Q48 7 67 18L86 5L83 28Q91 50 84 80Q72 105 48 106Q24 105 12 80Q5 50 13 28" fill="#9e80c2" stroke="#5b497d" stroke-width="3"/><circle cx="33" cy="56" r="17" fill="#fff6df"/><circle cx="63" cy="56" r="17" fill="#fff6df"/><circle cx="33" cy="56" r="6" fill="#353047"/><circle cx="63" cy="56" r="6" fill="#353047"/><path d="M42 73L48 82L54 73Z" fill="#f6ad60"/>',
  },
  arbusto: {
    width: 150,
    height: 122,
    body: '<rect x="69" y="61" width="12" height="61" rx="5" fill="#8e6a53"/><ellipse cx="75" cy="76" rx="70" ry="45" fill="#408c5b" stroke="#2e7051" stroke-width="3"/><ellipse cx="39" cy="64" rx="33" ry="34" fill="#60ad68"/><ellipse cx="106" cy="60" rx="37" ry="37" fill="#60ad68"/><ellipse cx="73" cy="39" rx="39" ry="36" fill="#74bf75"/><circle cx="25" cy="87" r="6" fill="#f5ad9c"/><circle cx="119" cy="84" r="6" fill="#f5ad9c"/>',
  },
  pedras: {
    width: 150,
    height: 122,
    body: '<path d="M6 115L14 57L39 33L64 52L85 24L125 39L145 79L144 115Z" fill="#8fa1b3" stroke="#65788d" stroke-width="3"/><path d="M14 57L39 33L64 52L43 91Z" fill="#b9c8ce"/><path d="M85 24L125 39L145 79L92 72Z" fill="#b9c8ce"/><path d="M34 101Q75 78 119 101" fill="none" stroke="#dae1d9" stroke-width="5"/>',
  },
  flores: {
    width: 150,
    height: 122,
    body: '<path d="M15 119Q26 74 38 85M70 119Q71 64 74 72M131 119Q122 71 113 83" fill="none" stroke="#519567" stroke-width="7"/><g fill="#f5a5bd"><circle cx="38" cy="69" r="18"/><circle cx="74" cy="55" r="19"/><circle cx="112" cy="70" r="18"/></g><g fill="#ffe79f"><circle cx="38" cy="69" r="8"/><circle cx="74" cy="55" r="8"/><circle cx="112" cy="70" r="8"/></g><path d="M4 118Q75 96 146 118Z" fill="#63ae6c"/>',
  },
} as const

export type JardimAssetName = keyof typeof JARDIM_ASSETS

export function jardimSvg(name: JardimAssetName): string {
  const { width, height, body } = JARDIM_ASSETS[name]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`
}

export function jardimSvgUrl(name: JardimAssetName): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(jardimSvg(name))}`
}
