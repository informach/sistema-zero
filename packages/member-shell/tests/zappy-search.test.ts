import { describe, expect, it, mock } from 'bun:test'

mock.module('server-only', () => ({}))

process.env.JWT_HS256_SECRET ??= 'test-jwt-secret-with-32-characters'
process.env.OPENROUTER_API_KEY ??= 'test-openrouter-key'

const { SERVER_BLOCK_CATALOG } = await import('@sistemazero/studio/server-catalog')
const { expandedTerms, scoreTokens, searchTerms, tokenizeSearchable } = await import(
  '../src/server/zappy-search'
)
const { buildStudioZappyPrompt } = await import('../src/server/zappy-ai')
const { resolveStudioTier } = await import('../src/lib/studio-tier')

describe('zappy-search (busca léxica do tutor)', () => {
  it('tokeniza ids de bloco em palavras além da palavra inteira', () => {
    const tokens = tokenizeSearchable('sz_g2d_jump_on_ground')
    expect(tokens.has('jump')).toBe(true)
    expect(tokens.has('ground')).toBe(true)
    expect(tokens.has('sz_g2d_jump_on_ground')).toBe(true)
  })

  it('descarta o linguajar de criança que não ajuda a buscar', () => {
    // "como faço ele pular?" → só "pular" sobra ("ele" era o vilão: casava por
    // substring com "elemento" e punha sz_html_image em 1º lugar).
    expect(searchTerms('como faço ele pular?')).toEqual(['pular'])
    expect(searchTerms('quero ajuda agora, não sei')).toEqual(['sei'])
  })

  it('sinônimos infantis casam o vocabulário dos rótulos', () => {
    const terms = expandedTerms(searchTerms('como faço ele saltar?'))
    const label = tokenizeSearchable('Fazer o sprite pular no chão')
    expect(scoreTokens(terms, label)).toBeGreaterThan(0)
  })

  it('prefixo exige 4+ chars — "ele" nunca casa "elemento"', () => {
    expect(scoreTokens([['ele']], tokenizeSearchable('elemento da página'))).toBe(0)
    expect(scoreTokens([['pulando']], tokenizeSearchable('pular no chão'))).toBeGreaterThan(0)
    expect(scoreTokens([['pular']], tokenizeSearchable('pulando de alegria'))).toBeGreaterThan(0)
  })

  it('"como faço ele pular?" põe o bloco de pulo no prompt (sem sz_html_image no topo)', () => {
    const tier = resolveStudioTier('god', 'staff')
    const prompt = buildStudioZappyPrompt({
      question: 'como faço ele pular?',
      context: {
        projectId: 'projeto-1',
        mode: 'blocks',
        kind: 'classic',
        blocks: [],
        installedExtensions: ['game-2d'],
        selectedBlockId: null,
        lastError: null,
      },
      tier,
    })
    const top5 = prompt.catalog.slice(0, 5).map((entry) => entry.type)
    expect(top5).toContain('sz_g2d_jump_on_ground')
    expect(prompt.catalog[0]?.type).not.toBe('sz_html_image')
  })

  it('projeto maduro (60 tipos) não expulsa o bloco novo que responde a dúvida', () => {
    // O bônus de presença era +10_000 e dominava o léxico: num projeto de 60
    // tipos o bloco de pulo SAÍA do prompt mesmo com a pergunta sendre pulo.
    const tier = resolveStudioTier('god', 'staff')
    const projectTypes = SERVER_BLOCK_CATALOG.filter(
      (entry) => entry.extension === 'game-2d' && entry.type !== 'sz_g2d_jump_on_ground',
    )
      .slice(0, 60)
      .map((entry) => entry.type)
    const prompt = buildStudioZappyPrompt({
      question: 'como faço ele pular?',
      context: {
        projectId: 'projeto-1',
        mode: 'blocks',
        kind: 'classic',
        blocks: projectTypes.map((type, index) => ({
          id: `b-${index}`,
          type,
          topLevel: true,
        })),
        installedExtensions: ['game-2d'],
        selectedBlockId: null,
        lastError: null,
      },
      tier,
    })
    expect(prompt.catalog.some((entry) => entry.type === 'sz_g2d_jump_on_ground')).toBe(true)
  })
})
