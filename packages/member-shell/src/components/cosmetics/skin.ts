/**
 * A PELE dos editores 3D (avatar e espaço) — os mesmos componentes no Kids e na comunidade adulta.
 *
 * `skin="kids"` é o padrão e é o desenho de sempre: as telas do Kids não leem nada deste arquivo
 * além das MENSAGENS que a lógica compartilhada emite (os avisos de salvar, comprar, colocar), e
 * essas frases estão aqui exatamente como eram. `skin="adult"` (direção de arte de 18/10/2026) troca
 * o texto e o desenho: frases de adulto para adulto, sem emoji, ícones de linha no lugar das
 * figurinhas e as classes `sz-cos-*` que moram em `community/src/app/cosmetics-adult.css`.
 *
 * ⭐ TODO texto da pele adulta que o member-shell desenha mora neste arquivo; nada de frase solta
 * nos componentes adultos. ⚠️ O guarda de vocabulário do Kids (`copy-vocabulario.test.ts`) varre o
 * member-shell inteiro: frase adulta com curso, aula, seção, professor ou aluno mora no APP e
 * chega por prop (as dicas dos troféus: `community/src/lib/adult-trophy-hints.ts`).
 */
import type { AvatarReturnPath } from '../../lib/avatar-return'
import type { AvatarCategory } from '../../lib/avatar3d-catalog'

export type CosmeticsSkin = 'kids' | 'adult'

// ── Mensagens da LÓGICA compartilhada (toasts) ─────────────────────────────────────────────

/** O que o configurador do avatar avisa. O Kids lê as frases de sempre, letra por letra. */
export interface AvatarMessages {
  notEnoughCoins: string
  buyRefused: string
  bought: string
  buyFailed: string
  photoNotUpdated: string
  savedAndLeaving: string
  saved: string
  saveFailed: string
}

export const AVATAR_MESSAGES: Record<CosmeticsSkin, AvatarMessages> = {
  kids: {
    notEnoughCoins: 'Você ainda não tem moedas suficientes!',
    buyRefused: 'Não consegui comprar.',
    bought: 'Desbloqueado! 🎉',
    buyFailed: 'Não consegui comprar agora.',
    photoNotUpdated: 'Avatar salvo, mas a foto não atualizou agora.',
    savedAndLeaving: 'Avatar salvo! 😄',
    saved: 'Mudanças salvas! 😄',
    saveFailed: 'Não consegui salvar agora. Tente de novo!',
  },
  adult: {
    notEnoughCoins: 'Você ainda não tem moedas suficientes.',
    buyRefused: 'Não consegui desbloquear agora. Tente de novo.',
    bought: 'Peça desbloqueada.',
    buyFailed: 'Não consegui desbloquear agora. Tente de novo.',
    photoNotUpdated: 'Avatar salvo, mas a foto não atualizou agora.',
    savedAndLeaving: 'Avatar salvo.',
    saved: 'Mudanças salvas.',
    saveFailed: 'Não consegui salvar agora. Tente de novo.',
  },
}

/** O que o construtor do espaço (o quarto do Kids) avisa. */
export interface RoomMessages {
  full: (maxPieces: number) => string
  wallFull: string
  floorFull: string
  placed: (label: string) => string
  /** ⚠️ As superfícies de hoje são todas femininas (mesa, estante, escrivaninha): "na". */
  placedOn: (label: string, surfaceLabel: string) => string
  childrenRemoved: string
  surfaceFull: string
  noRoomToRotate: string
  notEnoughCoins: string
  buyRefused: string
  bought: string
  buyFailed: string
  saved: string
  saveFailed: string
}

export const ROOM_MESSAGES: Record<CosmeticsSkin, RoomMessages> = {
  kids: {
    full: () => 'Seu quarto está cheio! Tire algo antes de adicionar mais. 🧹',
    wallFull: 'Não cabe mais nada nessa parede! 🧱',
    floorFull: 'Não cabe mais nada no chão! 🧹',
    placed: (label) => `${label} no quarto! ✨`,
    placedOn: (label) => `${label} em cima! ✨`,
    childrenRemoved: 'O que estava em cima voltou para a bandeja! 🧺',
    surfaceFull: 'Essa superfície está cheia! 🧺',
    noRoomToRotate: 'Sem espaço para girar aqui! 🔄',
    notEnoughCoins: 'Você ainda não tem moedas suficientes!',
    buyRefused: 'Não consegui comprar.',
    bought: 'Desbloqueado! 🎉',
    buyFailed: 'Não consegui comprar agora.',
    saved: 'Quarto salvo! 🏠',
    saveFailed: 'Não consegui salvar agora. Tente de novo!',
  },
  adult: {
    full: (max) => `O seu espaço já tem ${max} peças. Tire uma antes de colocar outra.`,
    wallFull: 'Não há mais lugar livre nas paredes.',
    floorFull: 'Não há mais lugar livre no chão.',
    placed: (label) => `Peça colocada: ${label}.`,
    placedOn: (label, surface) => `Peça colocada na ${surface}: ${label}.`,
    childrenRemoved: 'O que estava em cima também saiu do espaço.',
    surfaceFull: 'Este móvel não tem mais lugar em cima.',
    noRoomToRotate: 'Não há espaço para girar a peça aqui.',
    notEnoughCoins: 'Você ainda não tem moedas suficientes.',
    buyRefused: 'Não consegui desbloquear agora. Tente de novo.',
    bought: 'Item desbloqueado.',
    buyFailed: 'Não consegui desbloquear agora. Tente de novo.',
    saved: 'Espaço salvo.',
    saveFailed: 'Não consegui salvar agora. Tente de novo.',
  },
}

// ── O texto das telas ADULTAS ──────────────────────────────────────────────────────────────

/** Texto que encolhe no celular: `lead` fica sempre à vista, `rest` some só da TELA (o nome
 *  acessível continua inteiro, e o visível é o começo dele — WCAG 2.5.3). */
export interface ShortText {
  lead: string
  rest: string
}

function moedas(n: number): string {
  return n === 1 ? 'moeda' : 'moedas'
}

/** O saldo: "120 moedas" (no celular, "120" + "moedas" só para o leitor de tela). */
export function adultCoins(balance: number, unlimited: boolean): ShortText {
  return unlimited
    ? { lead: 'Sem limite', rest: ' de moedas' }
    : { lead: String(balance), rest: ` ${moedas(balance)}` }
}

export function adultUnlock(price: number): string {
  return `Desbloquear por ${price} ${moedas(price)}`
}

export function adultPrice(price: number): string {
  return `${price} ${moedas(price)}`
}

/**
 * Os nomes das cores das paletas do avatar (`AVATAR_CATEGORY_PALETTES`, valores FIXOS do catálogo,
 * espelhados do members). O Kids continua com "Cor 1", "Cor 2". Cor que não estiver aqui (catálogo
 * novo) cai em "Cor N": nunca um nome inventado. A cobertura é travada em teste.
 */
export const ADULT_COLOR_NAMES: Record<string, string> = {
  // Pele
  '#f2d3b1': 'Pele muito clara',
  '#ecad80': 'Pele clara',
  '#cf9b6e': 'Pele média',
  '#9e5622': 'Pele morena',
  '#763900': 'Pele escura',
  '#5a2e0a': 'Pele muito escura',
  // Cabelo, sobrancelha e barba
  '#2c1b18': 'Preto',
  '#4a3120': 'Castanho escuro',
  '#6a4e35': 'Castanho',
  '#a5673f': 'Castanho claro',
  '#d6a04b': 'Loiro escuro',
  '#e6c84a': 'Loiro',
  '#ece0c8': 'Branco',
  '#c0392b': 'Vermelho',
  '#8e44ad': 'Roxo',
  '#2980b9': 'Azul',
  '#27ae60': 'Verde',
  '#e84393': 'Rosa',
  // Roupas, calçado e óculos
  '#e74c3c': 'Vermelho',
  '#e67e22': 'Laranja',
  '#f1c40f': 'Amarelo',
  '#2ecc71': 'Verde',
  '#1abc9c': 'Turquesa',
  '#3498db': 'Azul',
  '#9b59b6': 'Roxo',
  '#ecf0f1': 'Branco',
  '#34495e': 'Azul-acinzentado',
  '#7f8c8d': 'Cinza',
  '#2c3e50': 'Azul-marinho',
  '#16a085': 'Verde-petróleo',
  '#d35400': 'Laranja-escuro',
}

export function adultColorName(hex: string, index: number): string {
  return ADULT_COLOR_NAMES[hex.toLowerCase()] ?? `Cor ${index + 1}`
}

export const ADULT_AVATAR_COPY = {
  title: 'Meu avatar 3D',
  back: (returnTo: AvatarReturnPath): ShortText => ({
    lead: 'Voltar',
    rest: returnTo === '/' ? ' ao início' : ' ao meu perfil',
  }),
  randomize: { lead: 'Sortear', rest: ' visual' } satisfies ShortText,
  save: 'Salvar',
  saving: 'Salvando…',
  takePhoto: 'Tirar foto',
  /** Com uma peça travada de prévia o botão fica indisponível; no celular sobra o verbo. */
  lockedSuffix: ' (peça bloqueada)',
  loading: 'Carregando o seu avatar…',
  loadError: 'Não consegui carregar o seu avatar.',
  retry: 'Tentar de novo',
  stage: 'Pré-visualização 3D do seu avatar',
  panel: 'Opções do avatar',
  modeGroup: 'Modo',
  customize: 'Personalizar',
  photo: 'Cabine de fotos',
  partGroup: 'Parte do avatar',
  categories: {
    head: 'Rosto',
    hair: 'Cabelo',
    eyes: 'Olhos',
    eyebrows: 'Sobrancelhas',
    nose: 'Nariz',
    faceDecor: 'Pintura de rosto',
    facialHair: 'Barba',
    glasses: 'Óculos',
    hat: 'Chapéu',
    hairAccessory: 'Enfeite',
    top: 'Blusa',
    bottom: 'Calça',
    outfit: 'Vestido',
    shoes: 'Calçado',
    accessory: 'Acessório',
  } satisfies Record<AvatarCategory, string>,
  /** Título da fileira de cores (só as categorias que têm paleta). */
  colorHeading: {
    head: 'Cor da pele',
    hair: 'Cor do cabelo',
    eyebrows: 'Cor das sobrancelhas',
    facialHair: 'Cor da barba',
    glasses: 'Cor dos óculos',
    top: 'Cor da blusa',
    bottom: 'Cor da calça',
    outfit: 'Cor do vestido',
    shoes: 'Cor do calçado',
    hairAccessory: 'Cor do enfeite',
    accessory: 'Cor do acessório',
  } as Partial<Record<AvatarCategory, string>>,
  colorFallback: 'Cores',
  itemsHeading: {
    head: 'Formatos de rosto',
    hair: 'Modelos de cabelo',
    eyes: 'Modelos de olhos',
    eyebrows: 'Modelos de sobrancelha',
    nose: 'Modelos de nariz',
    faceDecor: 'Pinturas de rosto',
    facialHair: 'Modelos de barba',
    glasses: 'Modelos de óculos',
    hat: 'Modelos de chapéu',
    hairAccessory: 'Modelos de enfeite',
    top: 'Modelos de blusa',
    bottom: 'Modelos de calça',
    outfit: 'Modelos de vestido',
    shoes: 'Modelos de calçado',
    accessory: 'Modelos de acessório',
  } satisfies Record<AvatarCategory, string>,
  emptyItems: 'Nenhum modelo nesta parte ainda.',
  /** Peça travada: o motivo e o preço entram no nome do botão (o cadeado é só desenho). */
  lockedTile: (label: string, price: number) => `${label}, bloqueado, ${adultPrice(price)}`,
  previewTile: (label: string, price: number) =>
    `${label}, em prévia. Selecione de novo para desbloquear por ${adultPrice(price)}`,
  preview: (label: string) => ({
    strong: `Prévia: ${label}.`,
    text: ' Gostou? Desbloqueie para usar sempre.',
  }),
  notNow: 'Agora não',
  photoHint: {
    before: 'Escolha uma pose e clique em ',
    strong: 'Tirar foto',
    after: ', no alto da tela.',
  },
  poseGroup: 'Pose',
  /** Rótulo de cada pose do `Poses.glb` (o id é o nome da animação). */
  poses: {
    Idle: 'Parado',
    Chill: 'Relaxado',
    Cool: 'Estiloso',
    Punch: 'Soco',
    Ninja: 'Ninja',
    King: 'Rei',
    Busy: 'Ocupado',
  } as Record<string, string>,
} as const

export const ADULT_ROOM_COPY = {
  emptyHint: 'Escolha um item na lista de itens para começar a montar o seu espaço.',
  loading: 'Carregando o seu espaço…',
  loadError: 'Não consegui carregar o seu espaço.',
  retry: 'Tentar de novo',
  stageRegion: 'O seu espaço',
  toolbar: (label: string) => `Peça selecionada: ${label}`,
  bringDown: 'Pôr no chão',
  stackOn: 'Pôr em cima de…',
  rotate: 'Girar',
  remove: 'Tirar',
  stackGroup: 'Pôr em cima de qual móvel?',
  stackTitle: 'Pôr em cima de:',
  freeSlots: (n: number) => `${n} ${n === 1 ? 'vaga livre' : 'vagas livres'}`,
  cancel: 'Cancelar',
  keyboardHint:
    'No teclado: as setas movem a peça, R gira, Delete tira e Esc solta. Com o mouse, arraste a peça no espaço.',
  pieces: 'Peças no espaço',
  pieceOn: (surface: string) => ` · na ${surface}`,
  save: 'Salvar espaço',
  saving: 'Salvando…',
  shopRegion: 'Itens para o espaço',
  tabsGroup: 'Tipos de item',
  tabs: {
    moveis: 'Móveis',
    enfeites: 'Enfeites',
    trofeus: 'Troféus',
    plantas: 'Plantas',
    luzes: 'Luzes',
    piso: 'Piso',
    parede: 'Parede',
    clima: 'Clima',
    bichinho: 'Bichinho',
    tema: 'Tema',
  },
  /**
   * ⚠️ O espaço NÃO veste o item de prévia (só o avatar faz isso): a barra diz o preço, nunca
   * "Prévia" (o quadro de arte propõe "Prévia: Luminária", que seria mentira aqui).
   */
  pending: (label: string, price: number) => ({
    strong: `${label}: ${adultPrice(price)}.`,
    text: ' Desbloqueie para usar no seu espaço.',
  }),
  notNow: 'Agora não',
  locked: ' (bloqueado)',
  confirmAgain: 'Selecione de novo para desbloquear.',
  inUse: 'Em uso',
  trophiesIntro: 'Cada conquista na comunidade vira um troféu para o seu espaço.',
  trophyOwned: 'Conquistado',
  trophyFallback: 'Continue criando para conquistar.',
  wallHint: 'Escolha uma cor e depois clique ou toque numa parede para pintar.',
  wallGroup: 'Cores da parede',
  wallChosen: (name: string) => `Cor escolhida: ${name}.`,
  paint: (name: string) => `Pintar de ${name}`,
  none: 'Nenhum',
  empty: 'Nenhum item nesta categoria ainda.',
} as const
