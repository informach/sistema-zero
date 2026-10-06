/** Arte de Cadê Todo Mundo?, compartilhada pelo projeto, caderno e experiências. */
import { JARDIM_SPRITE_BODIES } from './jardim-sprites.generated'

/**
 * ⭐⭐ Uma caixa SÓ por tipo (05/10/2026). O bloco que cria o sprite guarda largura e altura, e
 * quando a criança troca só a imagem o desenho novo é esticado para a caixa antiga. Com todo
 * bicho na mesma caixa e todo esconderijo em outra, qualquer troca fica sem deformar e sem sair
 * do lugar.
 *
 * O desenho nunca é esticado para caber: o `viewBox` de cada um tem a MESMA proporção da caixa
 * e centraliza o desenho nela, com a base (os pés, o chão do esconderijo) na mesma linha. Os
 * bichos são desenhados a 3 px por unidade da folha; os esconderijos a 3,5, exceto o arbusto, a
 * 4,1 (do jeito antigo, a coruja escapava pelos lados dele).
 *
 * ⚠️ Os dois Y abaixo valem juntos: com a caixa do esconderijo 13 px abaixo da do bicho
 * (281 × 268 no pé), todo esconderijo cobre todo bicho por inteiro, na silhueta, com folga.
 * Quem prova é `__tests__/jardim-cobertura.test.ts`; mexer num desenho ou numa caixa pede rodar.
 */
export const JARDIM_CAIXAS = {
  bicho: { width: 72, height: 87 },
  esconderijo: { width: 161, height: 144 },
} as const

/** O Y do canto de cima de cada caixa, um por tipo. */
export const JARDIM_SPRITE_Y = { bicho: 181, esconderijo: 137 } as const

export const JARDIM_BICHOS = [
  'coelho',
  'raposa',
  'coruja',
  'gato',
  'sapo',
  'tartaruga',
  'esquilo',
] as const
export const JARDIM_ESCONDERIJOS = [
  'arbusto',
  'pedras',
  'flores',
  'toco',
  'cogumelo',
  'folhas',
] as const

const bicho = JARDIM_CAIXAS.bicho
const esconderijo = JARDIM_CAIXAS.esconderijo

export const JARDIM_ASSETS = {
  jardim: {
    width: 640,
    height: 360,
    viewBox: '0 0 640 360',
    body: '<rect width="640" height="360" fill="#c7effb"/><circle cx="559" cy="67" r="36" fill="#ffec9b"/><path d="M0 250Q124 209 246 244T478 244T640 244V360H0" fill="#a9db8d"/><path d="M0 286Q130 257 256 284T512 282T640 274V360H0" fill="#70bb75"/><path d="M0 323Q98 302 184 324T376 320T640 319V360H0" fill="#54a96c"/><g fill="#f7f4cf"><circle cx="86" cy="273" r="4"/><circle cx="361" cy="273" r="4"/><circle cx="544" cy="300" r="4"/></g>',
  },
  coruja: { ...bicho, viewBox: '18.7 16.9 24 29', body: JARDIM_SPRITE_BODIES.coruja },
  raposa: { ...bicho, viewBox: '19.35 15.7 24 29', body: JARDIM_SPRITE_BODIES.raposa },
  coelho: { ...bicho, viewBox: '19.8 19 24 29', body: JARDIM_SPRITE_BODIES.coelho },
  gato: { ...bicho, viewBox: '21.3 18.8 24 29', body: JARDIM_SPRITE_BODIES.gato },
  sapo: { ...bicho, viewBox: '20 18.9 24 29', body: JARDIM_SPRITE_BODIES.sapo },
  tartaruga: { ...bicho, viewBox: '20.25 18.3 24 29', body: JARDIM_SPRITE_BODIES.tartaruga },
  esquilo: { ...bicho, viewBox: '20.95 18.9 24 29', body: JARDIM_SPRITE_BODIES.esquilo },
  pedras: { ...esconderijo, viewBox: '7.5 8.129 46 41.143', body: JARDIM_SPRITE_BODIES.pedras },
  arbusto: {
    ...esconderijo,
    viewBox: '12.316 15.632 39.268 35.122',
    body: JARDIM_SPRITE_BODIES.arbusto,
  },
  flores: { ...esconderijo, viewBox: '8 10.729 46 41.143', body: JARDIM_SPRITE_BODIES.flores },
  toco: { ...esconderijo, viewBox: '9.45 10.529 46 41.143', body: JARDIM_SPRITE_BODIES.toco },
  cogumelo: {
    ...esconderijo,
    viewBox: '9 10.529 46 41.143',
    body: JARDIM_SPRITE_BODIES.cogumelo,
  },
  folhas: { ...esconderijo, viewBox: '9 11.529 46 41.143', body: JARDIM_SPRITE_BODIES.folhas },
} as const

export type JardimAssetName = keyof typeof JARDIM_ASSETS
export type JardimSpriteName = Exclude<JardimAssetName, 'jardim'>
export type JardimBicho = (typeof JARDIM_BICHOS)[number]
export type JardimEsconderijo = (typeof JARDIM_ESCONDERIJOS)[number]
export type JardimTipo = keyof typeof JARDIM_CAIXAS

export const JARDIM_PARES = [
  { personagem: 'coelho', esconderijo: 'arbusto', centroX: 137 },
  { personagem: 'raposa', esconderijo: 'pedras', centroX: 310 },
  { personagem: 'coruja', esconderijo: 'flores', centroX: 483 },
] as const

export function jardimTipo(name: JardimSpriteName): JardimTipo {
  return (JARDIM_BICHOS as readonly string[]).includes(name) ? 'bicho' : 'esconderijo'
}

export function jardimSpriteRect(name: JardimSpriteName, centroX: number, baseY?: number) {
  const { width, height } = JARDIM_ASSETS[name]
  return {
    x: centroX - width / 2,
    y: baseY === undefined ? JARDIM_SPRITE_Y[jardimTipo(name)] : baseY - height,
    w: width,
    h: height,
  }
}

/**
 * `cobrir`: a arte PREENCHE a caixa em que for colocada, cortando as sobras, em vez de caber
 * inteira com faixas vazias dos lados.
 *
 * ⚠️⚠️ Um `<image>` de SVG que aponta para OUTRO SVG não manda no encaixe de dentro: o
 * `preserveAspectRatio="slice"` do `<image>` de fora vale só para a caixa dele, e quem decide
 * como o desenho de 640 × 360 entra nessa caixa é a RAIZ do SVG apontado, que por padrão é
 * "meet". Foi assim que o fundo do jardim, num palco de 560 × 300, ficou com ~13 px de beirada
 * vazia de cada lado (30/09/2026): as cenas assumiam a escala 0,875 do "slice" e recebiam 0,833.
 */
export function jardimSvg(name: JardimAssetName, opcoes: { cobrir?: boolean } = {}): string {
  const { width, height, viewBox, body } = JARDIM_ASSETS[name]
  const encaixe = opcoes.cobrir ? ' preserveAspectRatio="xMidYMid slice"' : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}"${encaixe}>${body}</svg>`
}

export function jardimSvgUrl(name: JardimAssetName, opcoes: { cobrir?: boolean } = {}): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(jardimSvg(name, opcoes))}`
}
