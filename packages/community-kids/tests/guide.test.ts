import { afterEach, describe, expect, it } from 'bun:test'
import {
  type ChildGuideInput,
  childGuideAvatarDismissedKey,
  childGuideStartDismissedKey,
  childGuideWelcomeSeenKey,
  childWelcomeSteps,
  clearGuideFlag,
  type GuideWelcomeStepId,
  guideDismissedKey,
  guideWelcomeSeenKey,
  hasActionableWelcomeStep,
  type ParentGuideInput,
  parentWelcomeSteps,
  readGuideFlag,
  readSessionGuideFlag,
  resolveChildGuideStep,
  resolveParentGuideStep,
  writeGuideFlag,
  writeSessionGuideFlag,
} from '../src/lib/guide'

describe('guia dos pais acompanha a autorização do aparelho', () => {
  const base: ParentGuideInput = {
    profilesCount: 0,
    canCreateProfile: true,
    accessReady: false,
    dismissed: false,
  }
  it('começa no cadastro só quando ainda não existe perfil e há vaga', () => {
    expect(resolveParentGuideStep(base)).toBe('profile')
    expect(resolveParentGuideStep({ ...base, canCreateProfile: false })).toBeNull()
  })
  it('perfil criado ainda precisa de autorização', () => {
    expect(resolveParentGuideStep({ ...base, profilesCount: 1 })).toBe('access')
    expect(resolveParentGuideStep({ ...base, profilesCount: 1, accessReady: true })).toBe('ready')
  })
  it('dispensar esconde o guia sem alterar as permissões', () => {
    expect(resolveParentGuideStep({ ...base, dismissed: true })).toBeNull()
  })
  it('família antiga usa perfil existente e guia aponta o novo acesso', () => {
    const copy = parentWelcomeSteps({ profilesCount: 1, canCreateProfile: false })
      .map((step) => step.text)
      .join(' ')
    expect(copy).toContain('perfil que já existe')
    expect(copy).toContain('Acesso nos aparelhos')
    expect(copy).not.toContain('Adicionar criança')
  })
  it('os passos citam os rótulos reais da tela e o título acompanha a família', () => {
    const existing = parentWelcomeSteps({ profilesCount: 1, canCreateProfile: true })
    const copy = existing.map((step) => step.text).join(' ')
    for (const label of [
      'Acesso nos aparelhos',
      'Autorizar aparelho',
      'Neste aparelho',
      'Em outro aparelho',
      'Autorizar este aparelho',
      'Gerar código',
      'Ir para a área da criança',
    ])
      expect(copy).toContain(`"${label}"`)
    expect(copy).not.toContain('Libere este navegador')
    // Botão se clica; "toque" sai do fluxo dos pais.
    expect(copy).not.toMatch(/\btoqu?e\b/i)
    expect(existing.map((step) => step.title)).toEqual([
      '1. Escolha a criança',
      '2. Autorize o aparelho',
      '3. A criança entra',
    ])
    // Sem criança, o primeiro passo não fala em escolher uma que não existe.
    expect(parentWelcomeSteps({ profilesCount: 0, canCreateProfile: true })[0]?.title).toBe(
      '1. Adicione a criança',
    )
  })
  it('criação continua com nascimento opcional e sem compartilhar senha', () => {
    const copy = parentWelcomeSteps({ profilesCount: 0, canCreateProfile: true })
      .map((step) => step.text)
      .join(' ')
    expect(copy).toContain('opcional')
    expect(copy).toContain('Eu sou criador(a)')
    expect(copy).not.toMatch(/[—–“”]/)
  })
})

/** Base: perfil novinho — sem avatar, sem aula, com curso liberado. */
function childInput(over: Partial<ChildGuideInput> = {}): ChildGuideInput {
  return {
    hasAvatar: false,
    hasCourseActivity: false,
    startAvailable: true,
    avatarDismissed: false,
    startDismissed: false,
    ...over,
  }
}

describe('resolveChildGuideStep — fase 2, a criança na home', () => {
  it('perfil novinho → o avatar vem primeiro (a ordem da usuária)', () => {
    expect(resolveChildGuideStep(childInput())).toBe('avatar')
  })

  it('montou o avatar → o passo some SOZINHO e o "Começar" assume', () => {
    expect(resolveChildGuideStep(childInput({ hasAvatar: true }))).toBe('start')
  })

  it('"Agora não" no avatar → segue para o "Começar" (não trava o guia)', () => {
    expect(resolveChildGuideStep(childInput({ avatarDismissed: true }))).toBe('start')
  })

  it('avatar desconhecido por falha da API não é tratado como avatar ausente', () => {
    expect(resolveChildGuideStep(childInput({ hasAvatar: null }))).toBe('start')
    expect(
      resolveChildGuideStep(childInput({ hasAvatar: null, hasCourseActivity: true })),
    ).toBeNull()
  })

  it('abriu a 1ª aula → o "Começar" some SOZINHO', () => {
    expect(
      resolveChildGuideStep(childInput({ hasAvatar: true, hasCourseActivity: true })),
    ).toBeNull()
  })

  it('sem curso liberado NÃO aponta um "Começar" que não existe', () => {
    expect(resolveChildGuideStep(childInput({ hasAvatar: true, startAvailable: false }))).toBeNull()
  })

  it('"Entendi" no Começar respeitado', () => {
    expect(resolveChildGuideStep(childInput({ hasAvatar: true, startDismissed: true }))).toBeNull()
  })

  it('tudo dispensado → nada', () => {
    expect(
      resolveChildGuideStep(childInput({ avatarDismissed: true, startDismissed: true })),
    ).toBeNull()
  })

  /** A explicação FIXA do app, na ordem em que a criança a lê. */
  const EXPLICACAO: GuideWelcomeStepId[] = [
    'aulas',
    'xp',
    'criar',
    'mural',
    'jornada',
    'ajuda',
    'voltar',
  ]

  it('boas-vindas de quem já estudou não promete uma primeira aula', () => {
    const steps = childWelcomeSteps({
      hasAvatar: false,
      hasCourseActivity: true,
      startAvailable: true,
    })
    expect(steps.map((step) => step.id)).toEqual(['avatar', ...EXPLICACAO])
    expect(steps.map((step) => step.text).join(' ')).not.toContain('primeira fase')
  })

  it('boas-vindas sem curso liberado não manda tocar em um Começar inexistente', () => {
    const steps = childWelcomeSteps({
      hasAvatar: false,
      hasCourseActivity: false,
      startAvailable: false,
    })
    expect(steps.map((step) => step.id)).toEqual(['avatar', ...EXPLICACAO])
  })

  it('mostra só as ações que faltam, na frente da explicação', () => {
    const steps = childWelcomeSteps({
      hasAvatar: true,
      hasCourseActivity: false,
      startAvailable: true,
    })
    expect(steps.map((step) => step.id)).toEqual(['start', ...EXPLICACAO])
    expect(steps[0]).toEqual({
      id: 'start',
      emoji: '▶️',
      text: 'Clique em "Começar" e a sua primeira aula abre na hora.',
    })
  })

  /**
   * ⚠️ O defeito de 14/08: quem já tinha avatar e já tinha estudado abria o "Como funciona"
   * e recebia UMA linha sobre XP; o "Vamos lá" fechava e nada acontecia. A explicação do app
   * agora existe sempre, e é ela que o botão entrega.
   */
  it('quem já fez tudo continua recebendo a explicação inteira do app', () => {
    const steps = childWelcomeSteps({
      hasAvatar: true,
      hasCourseActivity: true,
      startAvailable: true,
    })
    expect(steps.map((step) => step.id)).toEqual(EXPLICACAO)
    expect(steps.length).toBeGreaterThan(3)
  })

  it('a modal só abre sozinha quando há AÇÃO a guiar, nunca por causa da explicação', () => {
    const semAcao = childWelcomeSteps({
      hasAvatar: true,
      hasCourseActivity: true,
      startAvailable: true,
    })
    expect(hasActionableWelcomeStep(semAcao)).toBe(false)

    for (const comAcao of [
      childWelcomeSteps({ hasAvatar: false, hasCourseActivity: true, startAvailable: true }),
      childWelcomeSteps({ hasAvatar: true, hasCourseActivity: false, startAvailable: true }),
    ]) {
      expect(hasActionableWelcomeStep(comAcao)).toBe(true)
    }
  })

  it('cada passo tem emoji próprio e nenhum é o ⭐ de sobra da numeração antiga', () => {
    const steps = childWelcomeSteps({
      hasAvatar: false,
      hasCourseActivity: false,
      startAvailable: true,
    })
    const emojis = steps.map((step) => step.emoji)
    expect(new Set(emojis).size).toBe(steps.length)
    expect(emojis).not.toContain('⭐')
  })

  it('a jornada fala de progresso sem prometer um posto por curso', () => {
    const jornada = childWelcomeSteps({
      hasAvatar: true,
      hasCourseActivity: true,
      startAvailable: true,
    }).find((step) => step.id === 'jornada')

    expect(jornada?.text).toContain('progresso')
    expect(jornada?.text).not.toContain('um posto')
  })

  it('as chaves da criança são por PERFIL e independentes entre si', () => {
    const keys = [
      childGuideWelcomeSeenKey('p1'),
      childGuideAvatarDismissedKey('p1'),
      childGuideStartDismissedKey('p1'),
    ]
    expect(new Set(keys).size).toBe(3)
    expect(childGuideWelcomeSeenKey('p1')).not.toBe(childGuideWelcomeSeenKey('p2'))
    // E não colidem com as chaves do guia dos PAIS.
    expect(keys).not.toContain(guideWelcomeSeenKey('p1'))
    expect(keys.every((key) => key.includes(':v2:'))).toBe(true)
    expect(guideWelcomeSeenKey('p1')).toContain(':v3:')
  })
})

describe('storage do guia — fail-soft, chave por conta', () => {
  const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const originalSessionStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
  afterEach(() => {
    if (originalLocalStorage)
      Object.defineProperty(globalThis, 'localStorage', originalLocalStorage)
    else Reflect.deleteProperty(globalThis, 'localStorage')
    if (originalSessionStorage)
      Object.defineProperty(globalThis, 'sessionStorage', originalSessionStorage)
    else Reflect.deleteProperty(globalThis, 'sessionStorage')
  })

  function fakeStorage(kind: 'localStorage' | 'sessionStorage' = 'localStorage') {
    const map = new Map<string, string>()
    Object.defineProperty(globalThis, kind, {
      configurable: true,
      value: {
        getItem: (k: string) => map.get(k) ?? null,
        setItem: (k: string, v: string) => void map.set(k, v),
        removeItem: (k: string) => void map.delete(k),
      },
    })
    return map
  }

  it('grava, lê e limpa pela chave da CONTA', () => {
    fakeStorage()
    const key = guideDismissedKey('conta-1')
    expect(readGuideFlag(key)).toBe(false)
    writeGuideFlag(key)
    expect(readGuideFlag(key)).toBe(true)
    // Chave de OUTRA conta não vaza.
    expect(readGuideFlag(guideDismissedKey('conta-2'))).toBe(false)
    clearGuideFlag(key)
    expect(readGuideFlag(key)).toBe(false)
  })

  it('as duas chaves são independentes (boas-vindas ≠ dispensa)', () => {
    fakeStorage()
    writeGuideFlag(guideWelcomeSeenKey('conta-1'))
    expect(readGuideFlag(guideWelcomeSeenKey('conta-1'))).toBe(true)
    expect(readGuideFlag(guideDismissedKey('conta-1'))).toBe(false)
  })

  it('"Agora não" do avatar vale somente para a sessão atual', () => {
    fakeStorage('sessionStorage')
    const key = childGuideAvatarDismissedKey('perfil-1')
    expect(readSessionGuideFlag(key)).toBe(false)
    writeSessionGuideFlag(key)
    expect(readSessionGuideFlag(key)).toBe(true)
    expect(readGuideFlag(key)).toBe(false)

    // Nova sessão do navegador começa com outro sessionStorage.
    fakeStorage('sessionStorage')
    expect(readSessionGuideFlag(key)).toBe(false)
  })

  it('sem localStorage (modo privado) nada quebra — o guia só perde a memória', () => {
    Reflect.deleteProperty(globalThis, 'localStorage')
    expect(readGuideFlag(guideDismissedKey('conta-1'))).toBe(false)
    expect(() => writeGuideFlag(guideDismissedKey('conta-1'))).not.toThrow()
    expect(() => clearGuideFlag(guideDismissedKey('conta-1'))).not.toThrow()
  })

  it('localStorage que LANÇA (quota/Safari) também não quebra', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => {
          throw new Error('quota')
        },
        setItem: () => {
          throw new Error('quota')
        },
        removeItem: () => {
          throw new Error('quota')
        },
      },
    })
    expect(readGuideFlag('x')).toBe(false)
    expect(() => writeGuideFlag('x')).not.toThrow()
    expect(() => clearGuideFlag('x')).not.toThrow()
  })

  it('sessionStorage indisponível também é fail-soft', () => {
    Reflect.deleteProperty(globalThis, 'sessionStorage')
    expect(readSessionGuideFlag('x')).toBe(false)
    expect(() => writeSessionGuideFlag('x')).not.toThrow()
  })
})
