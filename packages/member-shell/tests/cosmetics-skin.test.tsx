import { describe, expect, test } from 'bun:test'
import { AVATAR_CATALOG as C, equipPart, withEars } from '@sistemazero/core/avatar'
import { Package } from 'lucide-react'
import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdultAvatarConfigurator } from '../src/components/cosmetics/avatar3d/configurator-adult'
import type { AvatarEditor } from '../src/components/cosmetics/avatar3d/use-avatar-editor'
import { moradaTrophyHint } from '../src/components/cosmetics/room/morada-trophy-hint'
import { RoomBuilderView } from '../src/components/cosmetics/room/room-builder-view'
import { AdultRoomBuilderView } from '../src/components/cosmetics/room/room-builder-view-adult'
import { roomItemIcon } from '../src/components/cosmetics/room/room-item-icon'
import {
  ADULT_AVATAR_COPY,
  ADULT_ROOM_COPY,
  AVATAR_MESSAGES,
  ROOM_MESSAGES,
} from '../src/components/cosmetics/skin'
import {
  AVATAR_FILTERS,
  AVATAR_TABS,
  avatarKinds,
  avatarShopItems,
  avatarTab,
  isAvatarItemOwned,
} from '../src/lib/avatar-pack'
import { PALAVRAS_DA_ESCOLA } from '../src/lib/lesson-copy-kids'
import { ROOM_ITEM_INFO, TROPHY_HINT } from '../src/lib/room-catalog'

/**
 * A pele ADULTA dos editores 3D (avatar e espaço). O que este arquivo protege:
 *
 * 1. ⚠️ O Kids não muda: as mensagens que a lógica compartilhada emite seguem letra por letra, e
 *    sem `skin` a tela continua a do Kids.
 * 2. O texto adulto não tem emoji, nem exclamação, nem a voz de criança (aventura, fase). As
 *    dicas adultas dos troféus moram no app (`community/tests/adult-cosmetics.test.ts`).
 * 3. Nada fica só na cor: toda cor do corpo tem nome, e todo item do espaço tem ícone de linha.
 */

const EMOJI = /\p{Extended_Pictographic}/u

/** Todas as frases de um objeto de texto (as funções são chamadas com valores de exemplo). */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (typeof value === 'function') {
    // Cada frase com argumentos de exemplo; a que não aceita aquele formato é pulada (a de lista
    // de peças recebe a lista).
    const exemplos: unknown[][] = [
      ['Mesa', 'Estante'],
      [3, 'Estante'],
      ['Mesa', ['Estante', 'Vaso']],
    ]
    return exemplos.flatMap((args) => {
      try {
        return strings((value as (...args: unknown[]) => unknown)(...args))
      } catch {
        return []
      }
    })
  }
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings)
  return []
}

const ADULT_TEXT = [
  ...strings(ADULT_AVATAR_COPY),
  ...strings(ADULT_ROOM_COPY),
  ...strings(AVATAR_MESSAGES.adult),
  ...strings(ROOM_MESSAGES.adult),
]

describe('pele adulta — o texto', () => {
  test('a varredura encontra as frases (anti-vácuo)', () => {
    expect(ADULT_TEXT.length).toBeGreaterThan(120)
    expect(ADULT_TEXT).toContain('Salvar espaço')
    expect(ADULT_TEXT).toContain('Espaço salvo.')
  })

  test('sem emoji, sem exclamação e sem a voz de criança', () => {
    for (const text of ADULT_TEXT) {
      expect(EMOJI.test(text), `emoji em "${text}"`).toBe(false)
      expect(text.includes('!'), `exclamação em "${text}"`).toBe(false)
      expect(/aventura|inteirinha|\bfases?\b|lojinha|senhor|senhora/i.test(text), text).toBe(false)
    }
  })

  test('nenhuma palavra da escola: o guarda do Kids varre este pacote inteiro', () => {
    // Frase adulta com curso, aula, seção, professor ou aluno mora no APP e chega por prop.
    for (const text of ADULT_TEXT) expect(PALAVRAS_DA_ESCOLA.test(text), text).toBe(false)
  })

  test('o Kids segue com as frases de sempre', () => {
    expect(TROPHY_HINT['trofeu-diploma']).toBe('Conclua um curso!')
    expect(AVATAR_MESSAGES.kids).toEqual({
      notEnoughCoins: 'Você ainda não tem moedas suficientes!',
      buyRefused: 'Não consegui comprar.',
      bought: 'Desbloqueado! 🎉',
      buyFailed: 'Não consegui comprar agora.',
      photoNotUpdated: 'Avatar salvo, mas a foto não atualizou agora.',
      photoTaken: 'Foto nova no seu avatar! 📸',
      savedAndLeaving: 'Avatar salvo! 😄',
      saved: 'Mudanças salvas! 😄',
      saveFailed: 'Não consegui salvar agora. Tente de novo!',
      exitUnsaved: 'Não consegui salvar seu avatar. Toque em voltar de novo para sair assim mesmo.',
    })
    const kids = ROOM_MESSAGES.kids
    expect(kids.full(40)).toBe('Seu quarto está cheio! Tire algo antes de adicionar mais. 🧹')
    expect(kids.wallFull).toBe('Não cabe mais nada nessa parede! 🧱')
    expect(kids.floorFull).toBe('Não cabe mais nada no chão! 🧹')
    expect(kids.placed('Sofá')).toBe('Sofá no quarto! ✨')
    expect(kids.placedOn('Vela', 'Mesa')).toBe('Vela em cima! ✨')
    expect(kids.childrenRemoved).toBe('O que estava em cima voltou para a bandeja! 🧺')
    expect(kids.surfaceFull).toBe('Essa superfície está cheia! 🧺')
    expect(kids.noRoomToRotate).toBe('Sem espaço para girar aqui! 🔄')
    expect(kids.bought).toBe('Desbloqueado! 🎉')
    expect(kids.saved).toBe('Quarto salvo! 🏠')
    expect(kids.saveFailed).toBe('Não consegui salvar agora. Tente de novo!')
  })
})

describe('pele adulta — nada só na cor', () => {
  test('toda aba e todo filtro do avatar têm nome adulto; toda cor do corpo tem nome', () => {
    for (const tab of AVATAR_TABS) expect(ADULT_AVATAR_COPY.tabs[tab.id]).toBeTruthy()
    for (const f of AVATAR_FILTERS) expect(ADULT_AVATAR_COPY.filters[f.id]).toBeTruthy()
    for (const id of C.rules.groups.corpo?.parts ?? []) {
      expect(C.parts[id]?.label).toMatch(/^Corpo \S/)
      expect(C.parts[id]?.swatch).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  test('todo item do espaço tem ícone de linha próprio', () => {
    for (const id of Object.keys(ROOM_ITEM_INFO))
      expect(roomItemIcon(id), `item ${id} sem ícone`).not.toBe(Package)
  })
})

function roomProps(): ComponentProps<typeof RoomBuilderView> {
  return {
    wallet: { balance: 120, unlimited: false },
    saving: false,
    ready: true,
    onSave: () => {},
    tab: 'moveis',
    onTab: () => {},
    stage: <div>Espaço Morada</div>,
    actions: <button type="button">Em cima…</button>,
    pieces: <button type="button">Mesa</button>,
    extras: null,
    tray: <button type="button">Cama</button>,
    notice: null,
  }
}

describe('as duas telas do espaço', () => {
  test('a pele Kids conserva o gradiente, as categorias e o painel ao lado', () => {
    const html = renderToStaticMarkup(<RoomBuilderView {...roomProps()} />)
    expect(html).toContain('Salvar quarto')
    expect(html).toContain('Em cima…')
    expect(html).toContain('sz-btn-gradient')
    expect(html).toContain('grid-cols-4')
    expect(html).toContain('Itens do quarto')
    expect(html).not.toContain('sz-cos-')
    expect(html).not.toContain('Comprar por')
  })

  test('a pele adulta conserva tokens próprios, moedas, atalhos e dez abas sem emoji', () => {
    const props = roomProps()
    const html = renderToStaticMarkup(
      <AdultRoomBuilderView {...props} actions={<button type="button">Pôr em cima de…</button>} />,
    )
    expect(html).toContain('Salvar espaço')
    expect(html).toContain('Pôr em cima de…')
    expect(html).toContain(ADULT_ROOM_COPY.keyboardHint)
    expect(html).toContain('sz-cos-room-wrap')
    expect(html).toContain('sz-cos-room-tabs')
    expect(html).toContain('sz-cos-room-tray')
    expect(html).toContain('120<span> moedas</span>')
    expect(EMOJI.test(html)).toBe(false)
  })

  test('dicas de troféus usam a voz do app e preservam o texto neutro adulto', () => {
    const hints = { 'trofeu-chama': 'Dica do app para a chama.' }
    expect(moradaTrophyHint('trophy/trofeu-chama', true, hints)).toBe(hints['trofeu-chama'])
    expect(moradaTrophyHint('trophy/trofeu-chama', true)).toBe(ADULT_ROOM_COPY.trophyFallback)
    expect(moradaTrophyHint('trophy/trofeu-chama', false)).toBe(TROPHY_HINT['trofeu-chama'] ?? '')
  })
})

describe('AdultAvatarConfigurator', () => {
  const noop = () => {}
  const base = withEars(C, {
    corpo: C.rules.default.corpo ?? '',
    rosto: C.rules.default.rosto ?? '',
  })
  const cabelo = C.rules.groups.cabelo?.parts.find((id) => C.parts[id]?.tier === 'free') ?? ''
  const chapeuPago = C.rules.groups.chapeu?.parts.find((id) => C.parts[id]?.tier === 'coins') ?? ''
  const slots = equipPart(C, base, chapeuPago)
  const tab = avatarTab('chapeu')
  const kinds = avatarKinds(C, tab)
  const kind = kinds[0]
  const items = kind ? avatarShopItems(C, tab, kind, 'boy', new Set(), slots) : []
  const pago = items.find((i) => i.id === chapeuPago) ?? null
  const editor = (over: Partial<AvatarEditor> = {}): AvatarEditor => ({
    catalog: C,
    state: {
      style: 'cute-v1',
      equipped: base,
      filter: 'boy',
      customized: true,
      owned: [],
      photoUrl: null,
      balance: 120,
    },
    loadState: 'ready',
    slots,
    filter: 'boy',
    owned: new Set(),
    balance: 120,
    coinsUnlimited: false,
    mode: 'customize',
    setMode: noop,
    pose: 'parado_relaxado',
    poseTake: 0,
    setPose: noop,
    tab,
    chooseTab: noop,
    kinds,
    kind,
    chooseKind: noop,
    items,
    busy: null,
    status: 'preview',
    pending: pago,
    notice: {
      chosen: C.parts[chapeuPago]?.label ?? '',
      removed: [C.parts[cabelo]?.label ?? ''],
      undo: base,
    },
    photoBusy: false,
    onReady: noop,
    retry: () => undefined,
    retrySave: noop,
    choose: noop,
    chooseById: noop,
    cancelBuy: noop,
    undoNotice: noop,
    dismissNotice: noop,
    randomize: noop,
    chooseFilter: noop,
    photoFraming: 'body',
    choosePhotoFraming: noop,
    takePhoto: async () => {},
    finishBeforeExit: async () => ({ ok: true, saved: false }),
    ...over,
  })
  const render = (over: Partial<AvatarEditor> = {}, returnTo: '/' | '/perfil' = '/perfil') =>
    renderToStaticMarkup(
      <AdultAvatarConfigurator
        editor={editor(over)}
        returnTo={returnTo}
        onExit={noop}
        embedded={false}
        dark={false}
      />,
    )

  test('título, voltar com texto, sortear, filtro, tipos, a regra à vista e a barra da prévia', () => {
    const html = render()
    const chapeu = C.parts[chapeuPago]
    expect(html).toContain('<h1 class="sz-cos-av-title">Meu avatar 3D</h1>')
    expect(html).toContain('Voltar<span class="sz-cos-narrow-hide"> ao meu perfil</span>')
    expect(html).toContain('Sortear<span class="sz-cos-narrow-hide"> visual</span>')
    expect(html).toContain('Em prévia')
    expect(html).toContain('Mostrar peças')
    expect(html).toContain('Masculinas')
    expect(html).toContain('Capuz e capacete')
    expect(html).toContain(`Para usar ${chapeu?.label}, saiu: ${C.parts[cabelo]?.label}.`)
    expect(html).toContain('Desfazer')
    expect(html).toContain(`<strong>Prévia: ${chapeu?.label}.</strong>`)
    expect(html).toContain('Agora não')
    expect(html).toContain(`Desbloquear por ${pago?.price} moedas`)
    expect(html).toContain(`src="/api/avatar3d/${chapeu?.thumb}"`)
    expect(EMOJI.test(html)).toBe(false)
  })

  test('salvo: o estado no lugar do antigo botão; a cor do corpo com o nome da cor', () => {
    const corpo = avatarTab('corpo')
    const [k] = avatarKinds(C, corpo)
    const cores = k ? avatarShopItems(C, corpo, k, 'all', new Set(), base) : []
    const html = render({
      status: 'saved',
      pending: null,
      notice: null,
      tab: corpo,
      kinds: k ? [k] : [],
      kind: k,
      items: cores,
    })
    expect(html).toContain('data-status="saved"')
    expect(html).toContain('Salvo')
    expect(html).toContain('aria-label="Cor pele média-clara"')
    expect(html).not.toContain('>Tipo<')
    for (const c of cores) expect(isAvatarItemOwned(C, c.id, new Set())).toBe(true)
  })

  test('voltar ao início quando veio da home; cabine com as poses do pack', () => {
    const html = render({ mode: 'photo', status: 'saved', pending: null }, '/')
    expect(html).toContain('Voltar<span class="sz-cos-narrow-hide"> ao início</span>')
    expect(html).toContain('Tirar foto')
    expect(html).toContain('Olhando')
    expect(html).toContain('Defesa')
    expect(html).not.toContain('Pulando')
    expect(html).toContain('no alto da tela')
    expect(EMOJI.test(html)).toBe(false)
  })

  test('quem nunca escolheu o filtro é perguntado antes de ver as peças', () => {
    const html = render({ filter: null, status: 'saved', pending: null, notice: null })
    expect(html).toContain('Quais peças você quer ver?')
    expect(html).toContain('Femininas')
    expect(html).not.toContain('Parte do avatar')
  })

  test('sem o avatar carregado, o painel diz que está carregando (e não "nenhum modelo")', () => {
    const html = render({ state: null })
    expect(html).toContain('<p role="status" class="sz-cos-muted">Carregando o seu avatar…</p>')
    expect(html).not.toContain('Parte do avatar')
  })

  test('falha de carga: a frase e o "Tentar de novo", com o voltar', () => {
    const html = render({ loadState: 'error' })
    expect(html).toContain('Não consegui carregar o seu avatar.')
    expect(html).toContain('Tentar de novo')
    expect(html).toContain('Voltar')
  })
})

test('a biblioteca Morada não apresenta compra de arte antiga nas peles', () => {
  for (const View of [RoomBuilderView, AdultRoomBuilderView]) {
    const html = renderToStaticMarkup(<View {...roomProps()} />)
    expect(html).not.toContain('Comprar por')
    expect(html).not.toContain('Desbloquear por')
  }
})
