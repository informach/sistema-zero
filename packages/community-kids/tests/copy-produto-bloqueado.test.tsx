import { afterEach, describe, expect, test } from 'bun:test'
import {
  initialKidsJourneyPolicy,
  type KidsJourneyView,
  projectKidsJourney,
} from '@sistemazero/core/journey'
import { cleanup, render, screen } from '@testing-library/react'
import { KidsLockedClube } from '../src/components/kids/kids-locked-clube'
import { KidsLockedMolda } from '../src/components/kids/kids-locked-molda'
import { KidsLockedMural } from '../src/components/kids/kids-locked-mural'
import { KidsLockedPensa } from '../src/components/kids/kids-locked-pensa'
import { KidsLockedPinta } from '../src/components/kids/kids-locked-pinta'
import {
  KidsLockedProduct,
  LOCKED_PRODUCT_ASK,
  LOCKED_PRODUCTS,
  type LockedProductId,
  lockedProductText,
} from '../src/components/kids/kids-locked-product'
import { KidsLockedStudio } from '../src/components/kids/kids-locked-studio'
import { toolEarnedInJourney, toolOpensAtLevel } from '../src/lib/tool-opens-at'
import { facts } from './fixtures/canonical-journey-map'
import { linhasVisiveis, listarFontes, varrerCopy } from './helpers/copy-scan'
import { kidsStaffPreview } from './kids-journey-fixtures'

/**
 * A tela do produto bloqueado prometia "fica tudo liberado" com a assinatura (20/10/2026). Era
 * falso: na Comunidade as ferramentas abrem por posto da Jornada, e só o Clube e o Mural abrem
 * direto com a assinatura. Este guarda reprova a promessa em qualquer texto de tela do app e
 * trava a copy aprovada das seis telas, o botão e o UTM do link de continuidade.
 */
afterEach(cleanup)

const PROMESSA = /tudo liberado/i

describe('nenhuma tela promete "tudo liberado"', () => {
  test('o src/ não tem a frase fora de comentário', () => {
    // Anti-vácuo: guarda que não lê nada aprova tudo.
    expect(listarFontes().length).toBeGreaterThan(100)
    expect(varrerCopy((texto) => PROMESSA.test(texto))).toEqual([])
  })

  test('o detector pega a frase e ignora comentário', () => {
    const achar = (fonte: string) => linhasVisiveis(fonte).filter((l) => PROMESSA.test(l.texto))
    expect(achar('<p>Assim que você entrar, fica tudo liberado pra você</p>')).toHaveLength(1)
    expect(achar("const t = 'Tudo liberado'")).toHaveLength(1)
    expect(achar('// a tela antiga dizia "tudo liberado"')).toEqual([])
  })
})

/** A jornada publicada (seed) sem nenhum posto conquistado. */
function seedJourney(): KidsJourneyView {
  return projectKidsJourney({
    policy: initialKidsJourneyPolicy(),
    policyVersion: 2,
    catalog: facts,
    milestones: [],
    earned: {
      level: 'noob',
      capabilities: [],
      courseAccess: { entry: [], expanded: [], reward: [] },
    },
  })
}

describe('o posto vem da política, nunca digitado', () => {
  test('cada ferramenta abre no posto que a política publicada diz', () => {
    const journey = seedJourney()
    expect(journey.readiness.horizon).not.toBeNull()
    expect(toolOpensAtLevel('estudio-completo', journey)).toBe('coder')
    expect(toolOpensAtLevel('pinta', journey)).toBe('coder')
    // O Pensa precisa também da IA: o posto que cobre as duas.
    expect(toolOpensAtLevel('pensa', journey)).toBe('hacker')
    expect(toolOpensAtLevel('molda', journey)).toBe('explorer')
  })

  test('o que a criança já conquistou não muda a resposta', () => {
    const journey = seedJourney()
    const withStudio = {
      ...journey,
      earned: { ...journey.earned, capabilities: ['studio' as const, 'pinta' as const] },
    }
    expect(toolOpensAtLevel('pinta', withStudio)).toBe('coder')
  })

  test('sem política ativa ou na prévia da equipe, nenhum posto é citado', () => {
    const journey = seedJourney()
    expect(toolOpensAtLevel('pinta', null)).toBeNull()
    expect(toolOpensAtLevel('pinta', kidsStaffPreview)).toBeNull()
    expect(toolOpensAtLevel('pinta', { ...journey, mode: 'paused' })).toBeNull()
    expect(
      toolOpensAtLevel('pinta', { ...journey, readiness: { ...journey.readiness, horizon: null } }),
    ).toBeNull()
  })
})

describe('quem já chegou ao posto e a assinatura acabou', () => {
  test('a Jornada que já entregou a ferramenta conta como conquistada', () => {
    const journey = seedJourney()
    expect(toolEarnedInJourney('pinta', journey)).toBe(false)
    const withPinta = {
      ...journey,
      earned: { ...journey.earned, capabilities: ['studio' as const, 'pinta' as const] },
    }
    expect(toolEarnedInJourney('pinta', withPinta)).toBe(true)
    // O Pensa pede também a IA.
    const withPensa = {
      ...journey,
      earned: { ...journey.earned, capabilities: ['pensa' as const] },
    }
    expect(toolEarnedInJourney('pensa', withPensa)).toBe(false)
    expect(toolEarnedInJourney('pinta', null)).toBe(false)
    expect(toolEarnedInJourney('pinta', kidsStaffPreview)).toBe(false)
  })

  test('a frase diz que a ferramenta volta a abrir com a assinatura', () => {
    expect(lockedProductText('pinta', 'coder', true)).toBe(
      'Você já chegou ao posto Construtor(a). Com a assinatura, o Pinta volta a abrir para você. Chame o seu responsável para ver com você como entrar na Comunidade.',
    )
    // Sem posto conhecido, só a volta.
    expect(lockedProductText('molda', null, true)).toBe(
      'Com a assinatura, o Molda volta a abrir para você. Chame o seu responsável para ver com você como entrar na Comunidade.',
    )
    render(<KidsLockedPinta opensAt="coder" earned />)
    expect(
      screen.getByText(
        'Você já chegou ao posto Construtor(a). Com a assinatura, o Pinta volta a abrir para você. Chame o seu responsável para ver com você como entrar na Comunidade.',
      ),
    ).toBeTruthy()
  })
})

describe('a copy aprovada das seis telas', () => {
  const TELAS: { id: LockedProductId; render: () => ReturnType<typeof render> }[] = [
    { id: 'estudio', render: () => render(<KidsLockedStudio opensAt="coder" />) },
    { id: 'pinta', render: () => render(<KidsLockedPinta opensAt="coder" />) },
    { id: 'pensa', render: () => render(<KidsLockedPensa opensAt="hacker" />) },
    { id: 'molda', render: () => render(<KidsLockedMolda opensAt="explorer" />) },
    { id: 'clube', render: () => render(<KidsLockedClube />) },
    { id: 'mural', render: () => render(<KidsLockedMural />) },
  ]

  test.each(TELAS)('$id: pílula, título, pedido ao responsável e link com UTM', ({
    id,
    render: montar,
  }) => {
    const { container } = montar()
    const nome = LOCKED_PRODUCTS[id].name
    expect(screen.getByText('Parte da Comunidade')).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: `O ${nome} faz parte da Comunidade dos Criadores` }),
    ).toBeTruthy()
    expect(container.textContent).toContain(
      'Chame o seu responsável para ver com você como entrar na Comunidade.',
    )
    const link = screen.getByRole('link', { name: 'Ver com o meu responsável' })
    expect(link.getAttribute('href')).toBe(
      `https://sistemazero.com.br/kids/comunidade-dos-criadores/oferta/continuar?utm_source=plataforma&utm_medium=app&utm_content=ferramenta-${LOCKED_PRODUCTS[id].slug}`,
    )
    expect(link.getAttribute('href')).toContain('utm_content=ferramenta-')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(container.textContent).not.toMatch(PROMESSA)
  })

  test('as ferramentas citam o posto pelo nome de exibição do nível', () => {
    expect(lockedProductText('pinta', 'coder')).toBe(
      'Na Comunidade, cada posto da Jornada abre ferramentas novas. O Pinta abre no posto Construtor(a). Chame o seu responsável para ver com você como entrar na Comunidade.',
    )
    expect(lockedProductText('molda', 'explorer')).toContain(
      'O Molda abre no posto Explorador(a) de Mundos.',
    )
    // Sem posto conhecido, a frase do posto sai inteira.
    expect(lockedProductText('pensa', null)).toBe(
      'Na Comunidade, cada posto da Jornada abre ferramentas novas. Chame o seu responsável para ver com você como entrar na Comunidade.',
    )
  })

  test('o Clube e o Mural abrem com a assinatura', () => {
    expect(lockedProductText('mural')).toBe(
      'Com a assinatura, o Mural abre para você publicar e comentar. Chame o seu responsável para ver com você como entrar na Comunidade.',
    )
    expect(lockedProductText('clube')).toBe(
      'Com a assinatura, o Clube abre para você conversar com a turma e mostrar as suas criações. Chame o seu responsável para ver com você como entrar na Comunidade.',
    )
  })

  test('as frases novas seguem a Light Copy', () => {
    const frases = [
      'Parte da Comunidade',
      'Ver com o meu responsável',
      LOCKED_PRODUCT_ASK,
      ...(Object.keys(LOCKED_PRODUCTS) as LockedProductId[]).flatMap((id) => [
        `O ${LOCKED_PRODUCTS[id].name} faz parte da Comunidade dos Criadores`,
        lockedProductText(id, 'coder'),
        lockedProductText(id, null),
        lockedProductText(id, 'coder', true),
        lockedProductText(id, null, true),
      ]),
    ]
    for (const frase of frases) {
      expect({ frase, ruim: /[!?—–]|\p{Extended_Pictographic}/u.test(frase) }).toEqual({
        frase,
        ruim: false,
      })
    }
  })

  test('o componente aceita o produto sem posto', () => {
    render(<KidsLockedProduct product="estudio" title="Estúdio Completo" intro="x" preview={[]} />)
    expect(
      screen.getByText(
        'Na Comunidade, cada posto da Jornada abre ferramentas novas. Chame o seu responsável para ver com você como entrar na Comunidade.',
      ),
    ).toBeTruthy()
  })
})

describe('o Pensa bloqueado mostra o que o Pensa faz de verdade', () => {
  test('a prévia são os três passos, sem a promessa antiga de desenhar telas', () => {
    const { container } = render(<KidsLockedPensa opensAt="hacker" />)
    const itens = [...container.querySelectorAll('li')].map((item) => item.textContent)
    expect(itens).toEqual([
      '1Conte a ideia do jogo, escrevendo ou falando',
      '2Confira o plano que o Zappy monta com você',
      '3Construa uma missão de cada vez no Estúdio, no Pinta e no Molda',
    ])
    expect(container.textContent).not.toMatch(/telas e o fluxo/)
  })
  test('quem já conquistou o Pensa lê que os jogos estão guardados', () => {
    render(<KidsLockedPensa opensAt="hacker" earned />)
    expect(screen.getByText(/Os seus jogos e os planos estão guardados/)).toBeTruthy()
  })
})
