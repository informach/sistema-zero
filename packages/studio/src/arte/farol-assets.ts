import { FAROL_ASSETS } from './farol-assets.generated'

export { FAROL_ASSETS }
export type FarolAssetName = keyof typeof FAROL_ASSETS

/** Coordenadas do cenário original. O barco chega pelo mar, à direita da ilha. */
export const FAROL_LAYOUT = {
  palco: { w: 480, h: 360 },
  personagem: { x: 21, y: 141, w: 64, h: 64 },
  chave: { x: 211, y: 53, w: 32, h: 32 },
  farol: { x: 328, y: 40, w: 152, h: 152 },
  barco: { x: 492, y: 240, w: 88, h: 88 },
  chegadaBarcoX: 387,
  personagemNaPorta: { x: 358, y: 137, w: 64, h: 64 },
} as const

/**
 * As imagens que a criança pode dar ao sprite `personagem` (o original primeiro). Trocar a imagem
 * não muda o jogo: todas têm a caixa de 64 × 64, os pés na mesma linha e a MESMA área de contato
 * (`arte/__tests__/farol-personagens.test.ts` confere caixa, contato e silhueta).
 */
export const FAROL_PERSONAGENS = [
  'aventureiro',
  'menina-de-laco',
  'marinheira',
  'menino-de-bone',
  'exploradora-de-chapeu',
  'pirata',
  'mergulhador',
  'robo',
] as const satisfies readonly FarolAssetName[]
export type FarolPersonagem = (typeof FAROL_PERSONAGENS)[number]

export const FAROL_CENARIOS = [
  'praia-tropical',
  'costa-rochosa',
  'ilha-nevada',
  'noite-na-ilha',
] as const satisfies readonly FarolAssetName[]

export const FAROL_BARCOS = [
  'veleiro',
  'barco-de-pesca',
  'lancha',
  'barco-pirata',
] as const satisfies readonly FarolAssetName[]

export const FAROL_CHAVES = [
  'chave-dourada',
  'chave-prateada',
  'chave-de-estrela',
] as const satisfies readonly FarolAssetName[]

/** Cada escolha tem dois estados; o desenho da porta e seu contato são idênticos. */
export const FAROL_FAROIS = [
  { nome: 'farol listrado', apagado: 'farol-listrado-apagado', aceso: 'farol-listrado-aceso' },
  { nome: 'farol de pedra', apagado: 'farol-de-pedra-apagado', aceso: 'farol-de-pedra-aceso' },
  {
    nome: 'farol de madeira',
    apagado: 'farol-de-madeira-apagado',
    aceso: 'farol-de-madeira-aceso',
  },
  { nome: 'farol colorido', apagado: 'farol-colorido-apagado', aceso: 'farol-colorido-aceso' },
] as const satisfies readonly { nome: string; apagado: FarolAssetName; aceso: FarolAssetName }[]

/** Pontos visíveis na terra, livres do início, da porta e dos detalhes dos quatro cenários. */
export const FAROL_POSICOES_CHAVE = [
  { nome: 'perto da trilha', x: 211, y: 53 },
  { nome: 'na parte de baixo', x: 160, y: 250 },
  { nome: 'perto da ponte', x: 280, y: 160 },
] as const

/** Frações do SVG: ignoram transparência e luz; o contato da torre fica na base. */
const porta = { x: 46 / 128, y: 105 / 128, w: 36 / 128, h: 23 / 128 }
/** Do alto da cabeça ao pé: a mesma para todo personagem. */
const corpo = { x: 16 / 64, y: 11 / 64, w: 30 / 64, h: 53 / 64 }
const chave = { x: 3 / 32, y: 2 / 32, w: 28 / 32, h: 29 / 32 }
export const FAROL_HITBOXES: Partial<
  Record<FarolAssetName, { x: number; y: number; w: number; h: number }>
> = {
  ...Object.fromEntries(FAROL_PERSONAGENS.map((nome) => [nome, corpo])),
  ...Object.fromEntries(FAROL_CHAVES.map((nome) => [nome, chave])),
  ...Object.fromEntries(
    FAROL_FAROIS.flatMap(({ apagado, aceso }) => [
      [apagado, porta],
      [aceso, porta],
    ]),
  ),
  // Compatibilidade com projetos salvos e cenas anteriores ao catálogo com nomes legíveis.
  personagem: corpo,
  menina: corpo,
  marinheira: corpo,
  menino: corpo,
  exploradora: corpo,
  chave,
  'farol-apagado': porta,
  'farol-aceso': porta,
}

export function farolSvg(name: FarolAssetName): string {
  const { width, height, body } = FAROL_ASSETS[name]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`
}

export function farolSvgUrl(name: FarolAssetName): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(farolSvg(name))}`
}
