import { describe, expect, test } from 'bun:test'
import { Package } from 'lucide-react'
import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdultAvatarConfigurator } from '../src/components/cosmetics/avatar3d/configurator-adult'
import { RoomBuilderView } from '../src/components/cosmetics/room/room-builder-view'
import { AdultRoomBuilderView } from '../src/components/cosmetics/room/room-builder-view-adult'
import { roomItemIcon } from '../src/components/cosmetics/room/room-item-icon'
import {
  ADULT_AVATAR_COPY,
  ADULT_COLOR_NAMES,
  ADULT_ROOM_COPY,
  AVATAR_MESSAGES,
  adultColorName,
  ROOM_MESSAGES,
} from '../src/components/cosmetics/skin'
import { AVATAR_CATEGORIES, AVATAR_CATEGORY_PALETTES } from '../src/lib/avatar3d-catalog'
import { PALAVRAS_DA_ESCOLA } from '../src/lib/lesson-copy-kids'
import { ROOM_ITEM_INFO, TROPHY_HINT } from '../src/lib/room-catalog'

/**
 * A pele ADULTA dos editores 3D (avatar e espaço). O que este arquivo protege:
 *
 * 1. ⚠️ O Kids não muda: as mensagens que a lógica compartilhada emite seguem letra por letra, e
 *    sem `skin` a tela continua a do Kids.
 * 2. O texto adulto não tem emoji, nem exclamação, nem a voz de criança (aventura, fase). As
 *    dicas adultas dos troféus moram no app (`community/tests/adult-cosmetics.test.ts`).
 * 3. Nada fica só na cor: toda cor do avatar tem nome, e todo item do espaço tem ícone de linha.
 */

const EMOJI = /\p{Extended_Pictographic}/u

/** Todas as frases de um objeto de texto (as funções são chamadas com valores de exemplo). */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (typeof value === 'function') {
    const out = (value as (...args: unknown[]) => unknown)('Mesa', 'Estante')
    const asNumber = (value as (...args: unknown[]) => unknown)(3, 'Estante')
    return [...strings(out), ...strings(asNumber)]
  }
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings)
  return []
}

const ADULT_TEXT = [
  ...strings(ADULT_AVATAR_COPY),
  ...strings(ADULT_ROOM_COPY),
  ...strings(AVATAR_MESSAGES.adult),
  ...strings(ROOM_MESSAGES.adult),
  ...Object.values(ADULT_COLOR_NAMES),
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
      savedAndLeaving: 'Avatar salvo! 😄',
      saved: 'Mudanças salvas! 😄',
      saveFailed: 'Não consegui salvar agora. Tente de novo!',
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
  test('toda cor das paletas do avatar tem nome, único dentro da paleta', () => {
    for (const [category, palette] of Object.entries(AVATAR_CATEGORY_PALETTES)) {
      const names = (palette ?? []).map((hex, i) => adultColorName(hex, i))
      for (const [i, name] of names.entries())
        expect(name, `${category} ${palette?.[i]} sem nome`).not.toMatch(/^Cor \d+$/)
      expect(new Set(names).size, `nomes repetidos em ${category}`).toBe(names.length)
      expect(
        ADULT_AVATAR_COPY.colorHeading[category as keyof typeof ADULT_AVATAR_COPY.colorHeading],
      ).toBeDefined()
    }
    // Cor desconhecida (catálogo novo) não ganha nome inventado.
    expect(adultColorName('#123456', 2)).toBe('Cor 3')
  })

  test('toda parte do avatar tem rótulo e título de grade', () => {
    for (const category of AVATAR_CATEGORIES) {
      expect(ADULT_AVATAR_COPY.categories[category]).toBeTruthy()
      expect(ADULT_AVATAR_COPY.itemsHeading[category]).toBeTruthy()
    }
  })

  test('todo item do espaço tem ícone de linha próprio', () => {
    for (const id of Object.keys(ROOM_ITEM_INFO))
      expect(roomItemIcon(id), `item ${id} sem ícone`).not.toBe(Package)
  })
})

function roomProps(): ComponentProps<typeof RoomBuilderView> {
  const noop = () => {}
  const draft = {
    theme: 'aconchego',
    placedItems: [
      { itemId: 'mesa', x: 1, y: 1 },
      { itemId: 'ursinho', x: 5, y: 5 },
      { itemId: 'vela', x: 0, y: 0, on: 'mesa', slot: 0 },
    ],
    pet: null,
  }
  return {
    scene: {
      avatarPhotoUrl: null,
      data: {
        state: draft,
        items: [
          {
            id: 'cama',
            category: 'furniture',
            tier: 'coins',
            price: 50,
            owned: false,
            locked: true,
          },
          { id: 'mesa', category: 'furniture', tier: 'free', price: 0, owned: true, locked: false },
          {
            id: 'trofeu-primeiro-jogo',
            category: 'decor',
            tier: 'trophy',
            price: 0,
            owned: true,
            locked: false,
          },
          {
            id: 'trofeu-chama',
            category: 'decor',
            tier: 'trophy',
            price: 0,
            owned: false,
            locked: true,
          },
        ],
        themes: [],
        floors: [],
        lightings: [],
        balance: 120,
      },
      loadState: 'ready',
      draft,
      onMoveItem: noop,
      onPaintWall: noop,
      paintColor: null,
      onRetry: noop,
    },
    selection: {
      selected: 1,
      onSelectPiece: noop,
      stackPicker: false,
      surfaces: [{ itemId: 'mesa', free: 1 }],
      onBringDown: noop,
      onToggleStackPicker: noop,
      onRotateSelected: noop,
      onRemoveSelected: noop,
      onPlaceOnSurface: noop,
      onCloseStackPicker: noop,
    },
    wallet: { coinsUnlimited: false, balance: 120, saving: false, onSave: noop },
    catalog: {
      tab: 'moveis',
      onSelectTab: noop,
      confirmBuyId: 'cama',
      busy: null,
      onCancelBuy: noop,
      onBuy: noop,
      isOwned: (id) => id !== 'cama' && id !== 'trofeu-chama',
      onPickItem: noop,
      onApplyFloor: noop,
      onApplyLighting: noop,
      onApplyTheme: noop,
      brush: '#f3ede1',
      onPickBrush: noop,
      onPickPet: noop,
    },
  }
}

describe('as duas telas do espaço', () => {
  test('RoomBuilderView é a tela do Kids de sempre', () => {
    const html = renderToStaticMarkup(<RoomBuilderView {...roomProps()} />)
    expect(html).toContain('Salvar quarto')
    expect(html).toContain('Em cima…')
    expect(html).toContain('Comprar por 50')
    expect(html).not.toContain('sz-cos-')
  })

  test('AdultRoomBuilderView: texto adulto, atalhos escritos, sem emoji e com as classes da pele', () => {
    const html = renderToStaticMarkup(<AdultRoomBuilderView {...roomProps()} />)
    expect(html).toContain('Salvar espaço')
    expect(html).toContain('Pôr em cima de…')
    expect(html).toContain('Peça selecionada: Ursinho')
    expect(html).toContain(ADULT_ROOM_COPY.keyboardHint)
    expect(html).toContain('Vela<span class="sz-cos-chip-note"> · na Mesa</span>')
    expect(html).toContain('Cama: 50 moedas.')
    expect(html).toContain('Desbloquear por 50 moedas')
    expect(html).toContain('120<span> moedas</span>')
    expect(html).not.toContain('Prévia')
    expect(EMOJI.test(html)).toBe(false)
  })

  test('AdultRoomBuilderView: troféus com a dica que o APP passa e o conquistado em texto', () => {
    const props = roomProps()
    const trophies = { ...props, catalog: { ...props.catalog, tab: 'trofeus' as const } }
    const hints = { 'trofeu-chama': 'Dica do app para a chama.' }
    const html = renderToStaticMarkup(<AdultRoomBuilderView {...trophies} trophyHints={hints} />)
    expect(html).toContain(ADULT_ROOM_COPY.trophiesIntro)
    expect(html).toContain('Conquistado')
    expect(html).toContain('Dica do app para a chama.')
    // Nunca a dica do Kids na pele adulta: sem a do app, a frase neutra.
    const semDica = renderToStaticMarkup(<AdultRoomBuilderView {...trophies} />)
    expect(semDica).not.toContain(TROPHY_HINT['trofeu-chama'] as string)
    expect(semDica).toContain(ADULT_ROOM_COPY.trophyFallback)
    expect(EMOJI.test(html)).toBe(false)
  })
})

describe('AdultAvatarConfigurator', () => {
  const noop = () => {}
  const base: ComponentProps<typeof AdultAvatarConfigurator> = {
    returnTo: '/perfil',
    dark: false,
    state: {
      style: 'avatar3d',
      equipped: { hair: { asset: 'hair-01', color: '#4a3120' } },
      parts: [],
      balance: 120,
    },
    loadState: 'loading',
    slots: { hair: { asset: 'hair-01', color: '#4a3120' } },
    balance: 120,
    coinsUnlimited: false,
    mode: 'customize',
    onMode: noop,
    pose: 'Idle',
    onPose: noop,
    category: 'hair',
    onCategory: noop,
    busy: null,
    saving: false,
    hasLocked: true,
    pendingPart: {
      id: 'hair-03',
      category: 'hair',
      tier: 'coins',
      price: 40,
      owned: false,
      locked: true,
    },
    items: [
      { id: 'hair-none', category: 'hair', tier: 'free', price: 0, owned: true, locked: false },
      { id: 'hair-03', category: 'hair', tier: 'coins', price: 40, owned: false, locked: true },
    ],
    palette: AVATAR_CATEGORY_PALETTES.hair,
    currentColor: '#4a3120',
    activePose: 'Idle',
    onReady: noop,
    onRetry: noop,
    onRandomize: noop,
    onSave: noop,
    onSelectPart: noop,
    onCancelBuy: noop,
    onSelectColor: noop,
  }

  test('título, voltar com texto, sortear, cores com nome e a barra da prévia', () => {
    const html = renderToStaticMarkup(<AdultAvatarConfigurator {...base} />)
    expect(html).toContain('<h1 class="sz-cos-av-title">Meu avatar 3D</h1>')
    expect(html).toContain('href="/perfil"')
    expect(html).toContain('Voltar<span class="sz-cos-narrow-hide"> ao meu perfil</span>')
    expect(html).toContain('Sortear<span class="sz-cos-narrow-hide"> visual</span>')
    expect(html).toContain('Salvar<span class="sz-cos-narrow-hide"> (peça bloqueada)</span>')
    expect(html).toContain('Cor do cabelo')
    expect(html).toContain('aria-label="Castanho escuro"')
    expect(html).toContain('aria-label="Cabelo 3, em prévia. Selecione de novo para desbloquear')
    expect(html).toContain(
      '<strong>Prévia: Cabelo 3.</strong> Gostou? Desbloqueie para usar sempre.',
    )
    expect(html).toContain('Agora não')
    expect(html).toContain('Desbloquear por 40 moedas')
    expect(html).toContain('Pintura de rosto')
    expect(EMOJI.test(html)).toBe(false)
  })

  test('voltar ao início quando veio da home; cabine com as poses adultas', () => {
    const html = renderToStaticMarkup(
      <AdultAvatarConfigurator
        {...base}
        returnTo="/"
        mode="photo"
        hasLocked={false}
        pendingPart={null}
      />,
    )
    expect(html).toContain('Voltar<span class="sz-cos-narrow-hide"> ao início</span>')
    expect(html).toContain('Tirar foto')
    expect(html).toContain('Relaxado')
    expect(html).toContain('no alto da tela')
    expect(EMOJI.test(html)).toBe(false)
  })

  test('sem o avatar carregado, o painel diz que está carregando (e não "nenhum modelo")', () => {
    const html = renderToStaticMarkup(<AdultAvatarConfigurator {...base} state={null} />)
    expect(html).toContain('<p role="status" class="sz-cos-muted">Carregando o seu avatar…</p>')
    expect(html).not.toContain('Cor do cabelo')
  })

  test('falha de carga: a frase e o "Tentar de novo", com o voltar à mão', () => {
    const html = renderToStaticMarkup(<AdultAvatarConfigurator {...base} loadState="error" />)
    expect(html).toContain('Não consegui carregar o seu avatar.')
    expect(html).toContain('Tentar de novo')
    expect(html).toContain('href="/perfil"')
  })
})

test('compra compatível informa a posse compartilhada nos dois temas, sem prometer modelos ausentes', () => {
  for (const View of [RoomBuilderView, AdultRoomBuilderView]) {
    const props = roomProps()
    if (!props.scene.data) throw new Error('Fixture do quarto sem catálogo')
    props.scene.data.items = [
      { id: 'aquario', category: 'decor', tier: 'coins', price: 70, owned: false, locked: true },
    ]
    props.catalog.confirmBuyId = 'aquario'
    const html = renderToStaticMarkup(<View {...props} />)
    expect(html).toContain('A posse também vale no Arquipélago, quando você construir esse objeto.')
    const original = renderToStaticMarkup(<View {...roomProps()} />)
    expect(original).not.toContain('A posse também vale no Arquipélago')
  }
})
