/** Original, self-contained vector art for the Construtor prototype.
 * Every skin in a category uses the same canvas and normalized hitbox.
 * Generated assets are embedded in .szproject; no external downloads needed.
 */
import { Buffer } from 'node:buffer';

const svg = (w, h, content) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${content}</svg>`;
const metal = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const stars = (seed, color) => Array.from({ length: 74 }, (_, i) => {
  const x = (i * 137 + seed * 67 + (i % 5) * 13) % 800;
  const y = (i * 73 + seed * 41 + (i % 7) * 17) % 480;
  const r = i % 9 === 0 ? 1.65 : .7;
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${i % 3 === 0 ? .75 : .35}"/>`;
}).join('');

const images = [
  {
    name: 'cenario-aurora', category: 'cenario', width: 800, height: 480,
    art: svg(800, 480, `<defs>${metal('bg', '#051529', '#101e44')}<radialGradient id="neb"><stop stop-color="#176c85" stop-opacity=".4"/><stop offset="1" stop-color="#0c2a4c" stop-opacity="0"/></radialGradient>${metal('planet', '#4dd7d6', '#164373')}</defs><rect width="800" height="480" fill="url(#bg)"/><ellipse cx="600" cy="150" rx="380" ry="250" fill="url(#neb)"/><g opacity=".8"><circle cx="685" cy="128" r="84" fill="url(#planet)"/><path d="M615 106Q681 130 753 92M610 136Q677 161 760 119M623 169Q687 188 756 151" fill="none" stroke="#77d9e8" stroke-width="9" opacity=".3"/><ellipse cx="685" cy="134" rx="124" ry="24" transform="rotate(-22 685 134)" fill="none" stroke="#a9edf4" stroke-width="5" opacity=".4"/></g>${stars(2, '#b7e9ff')}<path d="M0 422Q180 387 358 440T800 419V480H0Z" fill="#09152f" opacity=".45"/>`),
  },
  {
    name: 'cenario-orbita', category: 'cenario', width: 800, height: 480,
    art: svg(800, 480, `<defs>${metal('bg', '#111a36', '#291832')}${metal('planet', '#eeaa76', '#91436b')}<radialGradient id="glow"><stop stop-color="#d46b63" stop-opacity=".22"/><stop offset="1" stop-color="#261733" stop-opacity="0"/></radialGradient></defs><rect width="800" height="480" fill="url(#bg)"/><ellipse cx="136" cy="157" rx="310" ry="265" fill="url(#glow)"/><circle cx="98" cy="128" r="102" fill="url(#planet)" opacity=".72"/><path d="M0 85Q80 112 184 92M0 113Q99 141 200 119M12 161Q106 191 193 165" stroke="#ffd499" stroke-width="14" fill="none" opacity=".22"/><ellipse cx="99" cy="133" rx="154" ry="33" transform="rotate(22 99 133)" fill="none" stroke="#f4c19b" stroke-width="8" opacity=".48"/><circle cx="691" cy="316" r="36" fill="#493860" opacity=".7"/><circle cx="680" cy="309" r="8" fill="#322b4d"/><circle cx="705" cy="329" r="6" fill="#322b4d"/>${stars(7, '#ffe4ce')}`),
  },
  {
    name: 'cenario-nebulosa', category: 'cenario', width: 800, height: 480,
    art: svg(800, 480, `<defs>${metal('bg', '#0e1534', '#24163e')}<radialGradient id="violet"><stop stop-color="#7653b0" stop-opacity=".42"/><stop offset="1" stop-color="#24163e" stop-opacity="0"/></radialGradient><radialGradient id="cyan"><stop stop-color="#216d84" stop-opacity=".32"/><stop offset="1" stop-color="#0e1534" stop-opacity="0"/></radialGradient></defs><rect width="800" height="480" fill="url(#bg)"/><ellipse cx="565" cy="132" rx="330" ry="220" fill="url(#violet)"/><ellipse cx="210" cy="332" rx="350" ry="195" fill="url(#cyan)"/><path d="M-30 345C148 304 246 150 445 197S660 179 830 28" fill="none" stroke="#c49cf0" stroke-width="22" opacity=".065"/><path d="M-30 370C148 329 246 175 445 222S660 204 830 53" fill="none" stroke="#87d7ee" stroke-width="12" opacity=".055"/><g fill="#dac5ff" opacity=".4"><circle cx="106" cy="92" r="2"/><circle cx="180" cy="130" r="2"/><circle cx="233" cy="70" r="2"/><circle cx="295" cy="116" r="2"/></g><path d="M106 92L180 130L233 70L295 116" fill="none" stroke="#d1b6fa" opacity=".16"/>${stars(11, '#e9d6ff')}`),
  },
  {
    name: 'nave-falcao-azul', category: 'nave', width: 112, height: 128,
    art: svg(112, 128, `<defs>${metal('body', '#e0f8ff', '#5b9dd5')}${metal('wing', '#3fc7f7', '#2256ba')}${metal('glass', '#8af6ff', '#177897')}</defs><path d="M43 101L48 124L56 113L64 124L69 101" fill="#55d9ff" opacity=".8"/><path d="M38 52L8 93L13 108L45 92M74 52L104 93L99 108L67 92" fill="url(#wing)" stroke="#153f76" stroke-width="3"/><path d="M56 5C46 20 37 41 37 68L43 104H69L75 68C75 41 66 20 56 5Z" fill="url(#body)" stroke="#1b487a" stroke-width="3"/><path d="M56 30C48 43 46 54 47 69H65C66 54 64 43 56 30Z" fill="url(#glass)" stroke="#1b5079" stroke-width="3"/><path d="M50 40L48 56" stroke="#e4ffff" stroke-width="3" stroke-linecap="round"/><path d="M22 87L16 97M90 87L96 97" stroke="#b7f4ff" stroke-width="4" stroke-linecap="round"/><path d="M49 91H63" stroke="#2d6ca5" stroke-width="3"/><circle cx="56" cy="82" r="4" fill="#ffdb6a"/>`),
  },
  {
    name: 'nave-exploradora-coral', category: 'nave', width: 112, height: 128,
    art: svg(112, 128, `<defs>${metal('body', '#ffe6b4', '#ef925f')}${metal('wing', '#ff9e83', '#b54767')}${metal('glass', '#8cf2ed', '#2b9aa4')}</defs><path d="M28 104L31 124L37 115L43 124L46 104M66 104L69 124L75 115L81 124L84 104" fill="#ffc457" opacity=".85"/><path d="M27 40Q13 50 12 78L12 108L40 108L43 61ZM85 40Q99 50 100 78L100 108L72 108L69 61Z" fill="url(#wing)" stroke="#763b60" stroke-width="3"/><path d="M56 7C34 7 28 41 30 65L38 106H74L82 65C84 41 78 7 56 7Z" fill="url(#body)" stroke="#844464" stroke-width="3"/><path d="M39 37Q56 22 73 37V60Q56 70 39 60Z" fill="url(#glass)" stroke="#38637b" stroke-width="3"/><path d="M44 39L43 53" stroke="#dffff8" stroke-width="3" stroke-linecap="round"/><path d="M40 80H72M44 87H68" stroke="#c86f57" stroke-width="4" stroke-linecap="round"/><circle cx="22" cy="87" r="4" fill="#ffe7b5"/><circle cx="90" cy="87" r="4" fill="#ffe7b5"/>`),
  },
  {
    name: 'nave-arraia-lilas', category: 'nave', width: 112, height: 128,
    art: svg(112, 128, `<defs>${metal('body', '#ecdbff', '#9d83d7')}${metal('wing', '#b398ed', '#574b9e')}${metal('glass', '#f8bffa', '#9e57b2')}</defs><path d="M43 103L48 123L56 113L64 123L69 103" fill="#c4adff" opacity=".9"/><path d="M56 7L71 51Q84 69 105 79L100 102Q77 99 62 88H50Q35 99 12 102L7 79Q28 69 41 51Z" fill="url(#wing)" stroke="#484078" stroke-width="3"/><path d="M56 9Q43 30 42 53L45 103H67L70 53Q69 30 56 9Z" fill="url(#body)" stroke="#64508d" stroke-width="3"/><path d="M56 32L47 54L49 70H63L65 54Z" fill="url(#glass)" stroke="#74538d" stroke-width="3"/><path d="M50 46L48 56" stroke="#fff0ff" stroke-width="3" stroke-linecap="round"/><path d="M22 83L36 77M90 83L76 77" stroke="#b8f5ed" stroke-width="4" stroke-linecap="round"/><circle cx="56" cy="84" r="4" fill="#8de7dc"/>`),
  },
  {
    name: 'asteroide-rocha-lunar', category: 'asteroide', width: 96, height: 96,
    art: svg(96, 96, `<defs>${metal('rock', '#b7c6d4', '#617488')}</defs><path d="M34 6L61 8L83 26L89 51L76 78L52 90L26 82L9 61L7 35L20 16Z" fill="url(#rock)" stroke="#42536c" stroke-width="5"/><path d="M20 22L39 16L31 34L14 39M62 16L76 31L62 39L52 28" fill="#d4e0e9" opacity=".46"/><ellipse cx="36" cy="47" rx="13" ry="11" fill="#52687e"/><path d="M25 48Q35 37 48 45" fill="none" stroke="#3b5068" stroke-width="4"/><ellipse cx="64" cy="64" rx="10" ry="8" fill="#52687e"/><circle cx="62" cy="31" r="5" fill="#6b8297"/><circle cx="28" cy="68" r="4" fill="#c2d0dd"/><path d="M49 81L58 78" stroke="#d5dfe8" stroke-width="3" stroke-linecap="round"/>`),
  },
  {
    name: 'asteroide-gelo-azul', category: 'asteroide', width: 96, height: 96,
    art: svg(96, 96, `<defs>${metal('ice', '#c8ffff', '#4b98c6')}</defs><path d="M37 6L65 13L85 32L87 60L65 84L37 89L14 70L8 41L21 17Z" fill="url(#ice)" stroke="#39719f" stroke-width="5"/><path d="M37 6L41 35L8 41M41 35L65 13M41 35L68 52L85 32M41 35L27 61L37 89M27 61L65 84M68 52L65 84M27 61L68 52" fill="none" stroke="#e3ffff" stroke-width="3" opacity=".8"/><path d="M21 17L37 6L41 35Z" fill="#fff" opacity=".38"/><path d="M68 52L87 60L65 84Z" fill="#337caf" opacity=".5"/><circle cx="29" cy="30" r="3" fill="#fff"/><path d="M61 28V38M56 33H66" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`),
  },
  {
    name: 'asteroide-cristal-violeta', category: 'asteroide', width: 96, height: 96,
    art: svg(96, 96, `<defs>${metal('crystal', '#dab5ff', '#8262bb')}</defs><path d="M34 7L63 10L84 28L89 56L72 80L46 89L20 76L8 51L13 27Z" fill="url(#crystal)" stroke="#5d4c91" stroke-width="5"/><path d="M34 7L46 37L13 27M46 37L63 10M46 37L71 47L84 28M46 37L28 61L8 51M28 61L46 89M28 61L71 47L72 80M71 47L89 56" fill="none" stroke="#eddbff" stroke-width="3" opacity=".85"/><path d="M34 7L63 10L46 37Z" fill="#f6e6ff" opacity=".4"/><path d="M28 61L46 89L72 80Z" fill="#5d50a2" opacity=".5"/><path d="M25 31V41M20 36H30M64 59V69M59 64H69" stroke="#fff0ff" stroke-width="2.5" stroke-linecap="round"/>`),
  },
  ...[
    ['laser-ciano', '#55eaff'],
    ['laser-dourado', '#ffd36c'],
    ['laser-lilas', '#dab0ff'],
  ].map(([name, color]) => ({
    name, category: 'laser', width: 20, height: 56,
    art: svg(20, 56, `<rect x="1" y="1" width="18" height="54" rx="9" fill="${color}" opacity=".16"/><rect x="5" y="3" width="10" height="50" rx="5" fill="${color}" opacity=".65"/><rect x="8" y="5" width="4" height="46" rx="2" fill="#fff"/>`),
  })),
];

export const artCatalog = images;
export const assets = images.map(({ name, width, height, art }) => ({
  id: `construtor-2d-${name}`,
  name,
  kind: 'image',
  source: 'library',
  dataUrl: `data:image/svg+xml;base64,${Buffer.from(art).toString('base64')}`,
  width,
  height,
}));

export const presets = [
  { id: 'aurora', label: 'Aurora', nave: 'nave-falcao-azul', cenario: 'cenario-aurora', asteroide: 'asteroide-rocha-lunar', laser: 'laser-ciano' },
  { id: 'orbita', label: 'Órbita', nave: 'nave-exploradora-coral', cenario: 'cenario-orbita', asteroide: 'asteroide-gelo-azul', laser: 'laser-dourado' },
  { id: 'nebulosa', label: 'Nebulosa', nave: 'nave-arraia-lilas', cenario: 'cenario-nebulosa', asteroide: 'asteroide-cristal-violeta', laser: 'laser-lilas' },
];
