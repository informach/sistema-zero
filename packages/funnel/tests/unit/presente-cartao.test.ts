import { describe, expect, test } from 'bun:test'
import type { OfferGiftMode } from '../../src/server/offer-page'
import { CTA_DO_PRESENTE, cartaoDoPresente } from '../../src/server/presente-cartao'

// O cartão do modo presente (26/11/2026): a mesma página e o mesmo cartão da venda, com a etiqueta de
// quem dá o presente, o preço riscado até R$ 0 e o cadastro numa janela.
const presente = (
  extra: {
    kind?: string
    audience?: 'kids' | 'adult'
    campanha?: boolean
    dias?: number | null
    mural?: boolean
    learner?: 'child' | 'parents' | null
    escolhida?: string | null
    endsAt?: string | null
  } = {},
) =>
  ({
    kind: extra.kind ?? 'ready',
    chosenOffer: extra.escolhida ?? null,
    gift: {
      code: 'marta-x7k2',
      displayName: extra.campanha ? 'Feira de Ciências' : 'Marta',
      ownerKind: extra.campanha ? 'campaign' : 'ambassador',
      source: extra.campanha
        ? { kind: 'campaign', name: 'Feira de Ciências', context: 'event', description: '' }
        : { kind: 'ambassador', name: 'Marta' },
      state: 'active',
      startsAt: '2026-11-01T13:00:00Z',
      endsAt: extra.endsAt === undefined ? '2026-12-01T03:00:00Z' : extra.endsAt,
      giftAvailable: true,
      audience: extra.audience ?? 'kids',
      gift: {
        offerId: '44444444-4444-4444-8444-444444444444',
        offerSlug: 'cade-todo-mundo-7-dias',
        offerTitle: 'Cadê Todo Mundo?',
        courseSlug: 'cade-todo-mundo',
        courseTitle: 'Cadê Todo Mundo?',
        learner: extra.learner === undefined ? 'child' : extra.learner,
        accessDays: extra.dias === undefined ? 7 : extra.dias,
        includesMural: extra.mural ?? true,
      },
    },
  }) as unknown as OfferGiftMode

const opts = { communityUrl: 'https://kids.qa.local', priceReais: '37.00' }

describe('cartaoDoPresente', () => {
  test('pessoa: a etiqueta com o primeiro nome, o preço do catálogo riscado até R$ 0 e o prazo divulgado', () => {
    const c = cartaoDoPresente(presente(), opts)
    expect(c.etiqueta).toBe('Um presente de Marta para você')
    expect(c.precoCheio.replace(/\s/g, ' ')).toBe('R$ 37')
    expect(c.precoFinal.replace(/\s/g, ' ')).toBe('R$ 0')
    expect(c.texto).toBe(
      '7 dias de acesso ao curso e ao Mural, contados do cadastro. Sem custo e sem cartão.',
    )
    expect(c.cta).toBe(CTA_DO_PRESENTE)
    expect(c.aberto).toBe(true)
    expect(c.estado).toBeNull()
    expect(c.resgate.code).toBe('marta-x7k2')
    expect(c.resgate.campaign).toBe(false)
    expect('oferta' in c.resgate).toBe(false)
  })

  test('campanha: "Um presente da campanha <título> para você"; a escolha do embaixador vai ao resgate', () => {
    const c = cartaoDoPresente(
      presente({ campanha: true, escolhida: 'cade-todo-mundo-7-dias' }),
      opts,
    )
    expect(c.etiqueta).toBe('Um presente da campanha Feira de Ciências para você')
    expect(c.resgate.campaign).toBe(true)
    expect(c.resgate.oferta).toBe('cade-todo-mundo-7-dias')
  })

  test('o guia para pais fala do guia, sem Mural; o adulto cita o Mural adulto', () => {
    const guia = cartaoDoPresente(presente({ learner: 'parents', mural: false }), {
      ...opts,
      priceReais: '27.00',
      formulario: 'guia',
    })
    expect(guia.precoCheio.replace(/\s/g, ' ')).toBe('R$ 27')
    expect(guia.texto).toBe(
      '7 dias de acesso ao guia, contados do cadastro. Sem custo e sem cartão.',
    )
    expect(guia.resgate.variante).toBe('guia')
    const adulto = cartaoDoPresente(presente({ audience: 'adult' }), opts)
    expect(adulto.adulto).toBe(true)
    expect(adulto.texto).toContain('ao curso e ao Mural adulto')
  })

  test('sem prazo, nunca promete "sem prazo"', () => {
    const c = cartaoDoPresente(presente({ dias: null }), opts)
    expect(c.texto).toBe('Acesso ao curso e ao Mural, sem custo e sem cartão.')
    expect(c.texto).not.toMatch(/sem prazo|vitalíci/i)
  })

  test('pausada ou encerrada: o estado no lugar do botão, com a retomada; agendada: só o estado', () => {
    for (const kind of ['paused', 'ended']) {
      const c = cartaoDoPresente(presente({ kind }), opts)
      expect(c.aberto).toBe(false)
      expect(c.retomavel).toBe(true)
      expect(c.estado?.titulo).toBeTruthy()
      expect(c.retomar.botao).toBeTruthy()
    }
    const agendada = cartaoDoPresente(presente({ kind: 'scheduled' }), opts)
    expect(agendada.aberto).toBe(false)
    expect(agendada.retomavel).toBe(false)
    expect(agendada.estado?.titulo).toContain('/2026')
  })
})
