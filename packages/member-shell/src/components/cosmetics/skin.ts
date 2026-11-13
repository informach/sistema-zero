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

import type { AvatarFilter } from '@sistemazero/core/avatar'
import type { AvatarTabId } from '../../lib/avatar-pack'
import type { AvatarReturnPath } from '../../lib/avatar-return'
import type { SaveStatus } from './avatar3d/use-avatar-editor'

export type CosmeticsSkin = 'kids' | 'adult'

// ── Mensagens da LÓGICA compartilhada (toasts) ─────────────────────────────────────────────

/** O que o configurador do avatar avisa. O Kids lê as frases de sempre, letra por letra. */
export interface AvatarMessages {
  notEnoughCoins: string
  buyRefused: string
  bought: string
  buyFailed: string
  photoNotUpdated: string
  photoTaken: string
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
    photoTaken: 'Foto nova no seu avatar! 📸',
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
    photoTaken: 'Foto do avatar atualizada.',
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

export const ADULT_AVATAR_COPY = {
  title: 'Meu avatar 3D',
  back: (returnTo: AvatarReturnPath): ShortText => ({
    lead: 'Voltar',
    rest: returnTo === '/' ? ' ao início' : ' ao meu perfil',
  }),
  backToGame: 'Voltar ao jogo',
  randomize: { lead: 'Sortear', rest: ' visual' } satisfies ShortText,
  takePhoto: 'Tirar foto',
  /** O avatar se salva sozinho: no lugar do antigo "Salvar", o estado do salvamento. */
  saveStatus: {
    saved: 'Salvo',
    waiting: 'Salvando…',
    saving: 'Salvando…',
    preview: 'Em prévia',
  } satisfies Record<Exclude<SaveStatus, 'error'>, string>,
  saveError: 'Não salvou. Tentar de novo',
  loading: 'Carregando o seu avatar…',
  loadError: 'Não consegui carregar o seu avatar.',
  retry: 'Tentar de novo',
  stage: 'Pré-visualização 3D do seu avatar',
  panel: 'Opções do avatar',
  modeGroup: 'Modo',
  customize: 'Personalizar',
  photo: 'Cabine de fotos',
  filterLabel: 'Mostrar peças',
  filterQuestion: 'Quais peças você quer ver?',
  filterHint: 'Dá para trocar quando quiser, no alto deste painel.',
  filters: { girl: 'Femininas', boy: 'Masculinas', all: 'Todas' } satisfies Record<
    AvatarFilter,
    string
  >,
  partGroup: 'Parte do avatar',
  tabs: {
    corpo: 'Cor do corpo',
    rosto: 'Rosto',
    acessorio_rosto: 'No rosto',
    cabelo: 'Cabelo',
    chapeu: 'Chapéu',
    oculos: 'Óculos',
    roupa_cima: 'Blusa',
    roupa_inteira: 'Vestido e macacão',
    calca: 'Calça e bermuda',
    calcado: 'Calçado',
    meias: 'Meias',
    luvas: 'Luvas',
    costas: 'Capa',
    fantasia: 'Fantasia',
  } satisfies Record<AvatarTabId, string>,
  kindGroup: 'Tipo',
  none: 'Nenhum',
  /** As regras do pack à vista: o que a escolha tirou do avatar. */
  notice: (chosen: string, removed: readonly string[]) =>
    `Para usar ${chosen}, saiu: ${
      removed.length > 3
        ? `${removed.slice(0, 3).join(', ')} e mais ${removed.length - 3}`
        : removed.join(', ')
    }.`,
  undo: 'Desfazer',
  emptyItems: 'Nenhum modelo nesta parte ainda.',
  /** Peça travada: o motivo e o preço entram no nome do botão (o cadeado é só desenho). */
  lockedTile: (label: string, price: number) => `${label}, bloqueado, ${adultPrice(price)}`,
  /** Roupa da festa (B16): vem da festa do Arquipélago, sem preço nem compra. */
  festaTile: (label: string) => `${label}, vem da festa do Arquipélago`,
  festaBadge: 'Da festa',
  previewFesta: (label: string) => ({
    strong: `Prévia: ${label}.`,
    text: ' Esta peça vem da festa do Arquipélago e chega pelo jogo, na época da festa.',
  }),
  previewTile: (label: string, price: number) =>
    `${label}, em prévia. Selecione de novo para desbloquear por ${adultPrice(price)}`,
  preview: (label: string) => ({
    strong: `Prévia: ${label}.`,
    text: ' Gostou? Desbloqueie para usar sempre. Até lá, o avatar não é salvo.',
  }),
  notNow: 'Agora não',
  photoHint: {
    before: 'Escolha uma pose e clique em ',
    strong: 'Tirar foto',
    after: ', no alto da tela.',
  },
  poseGroup: 'Pose',
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
