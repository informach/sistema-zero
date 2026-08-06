import { describe, expect, it, mock } from 'bun:test'

mock.module('server-only', () => ({}))

process.env.JWT_HS256_SECRET ??= 'test-jwt-secret-with-32-characters'
process.env.OPENROUTER_API_KEY ??= 'test-openrouter-key'

const { buildProjectOutline } = await import('../src/server/zappy-project-outline')
const { buildStudioZappyPrompt, relevantExampleRecipes } = await import('../src/server/zappy-ai')
const { resolveStudioTier } = await import('../src/lib/studio-tier')

const CATALOG = new Map([
  ['sz_g2d_create_sprite', { label: 'Criar sprite com imagem', category: 'Jogo 2D' }],
  ['sz_g2d_on_key', { label: 'Quando apertar a tecla', category: 'Jogo 2D' }],
  ['sz_css_color', { label: 'Cor do texto', category: 'CSS' }],
])

describe('esboço legível do projeto (buildProjectOutline)', () => {
  it('monta a árvore com rótulos reais, recuo e resumo por categoria', () => {
    const outline = buildProjectOutline(
      [
        { id: 'a', type: 'sz_g2d_on_key', topLevel: true },
        { id: 'b', type: 'sz_g2d_create_sprite', parentId: 'a', topLevel: false },
        { id: 'c', type: 'sz_css_color', topLevel: true },
      ],
      CATALOG,
    )
    expect(outline).toContain('- Quando apertar a tecla')
    expect(outline).toContain('  - Criar sprite com imagem')
    expect(outline).toContain('Resumo por categoria: Jogo 2D: 2 · CSS: 1')
  })

  it('tipo desconhecido NUNCA é ecoado — vira contador (anti prompt-injection)', () => {
    const outline = buildProjectOutline(
      [
        { id: 'a', type: 'sz_bloco_forjado', topLevel: true },
        { id: 'b', type: 'sz_g2d_on_key', parentId: 'a', topLevel: false },
      ],
      CATALOG,
    )
    expect(outline).not.toContain('sz_bloco_forjado')
    expect(outline).toContain('Blocos não reconhecidos: 1')
    // O filho de um desconhecido continua visível, no mesmo nível.
    expect(outline).toContain('- Quando apertar a tecla')
  })

  it('bloco acima do tier aparece com "(nível futuro)"', () => {
    const outline = buildProjectOutline(
      [{ id: 'a', type: 'sz_g2d_create_sprite', topLevel: true }],
      CATALOG,
      { futureTypes: new Set(['sz_g2d_create_sprite']) },
    )
    expect(outline).toContain('Criar sprite com imagem (nível futuro)')
  })

  it('projeto grande é cortado com "… e mais N blocos"', () => {
    const blocks = Array.from({ length: 10 }, (_, index) => ({
      id: `b${index}`,
      type: 'sz_css_color',
      topLevel: true,
    }))
    const outline = buildProjectOutline(blocks, CATALOG, { maxLines: 4 })
    expect(outline).toContain('… e mais 6 blocos')
  })
})

describe('receitas internas dos exemplos (anônimas, por nível)', () => {
  const context = {
    projectId: 'projeto-1',
    mode: 'blocks' as const,
    kind: 'classic' as const,
    blocks: [],
    installedExtensions: ['game-2d'],
    selectedBlockId: null,
    lastError: null,
  }

  it('injeta receitas SEM nome/chave — a criança não pode saber que exemplos existem', () => {
    const prompt = buildStudioZappyPrompt({
      question: 'como faço um jogo de plataforma com pulo?',
      context,
      tier: resolveStudioTier('god', 'staff'),
    })
    expect(prompt.system).toContain('RECEITAS INTERNAS')
    expect(prompt.system).toContain('NUNCA mencione "exemplo"')
    // A receita é anônima: o payload não carrega name/key dos exemplos.
    expect(prompt.system).not.toContain('"key"')
    expect(prompt.system).not.toContain('"name"')
  })

  it('nível iniciante 2D não recebe receita de mundo 3D', () => {
    // "costeiro" só existe no exemplo world-3d "Coastal World Procedural".
    const hacker = resolveStudioTier('hacker', 'student')
    expect(hacker.allowedExtensions).not.toContain('world-3d')
    expect(relevantExampleRecipes('costeiro', context, hacker)).toEqual([])
    expect(
      relevantExampleRecipes('costeiro', context, resolveStudioTier('god', 'staff')).length,
    ).toBeGreaterThan(0)
  })

  it('o esboço entra no prompt do usuário com os rótulos do projeto', () => {
    const prompt = buildStudioZappyPrompt({
      question: 'o que falta no meu jogo?',
      context: {
        ...context,
        blocks: [{ id: 's1', type: 'sz_g2d_create_sprite', topLevel: true }],
      },
      tier: resolveStudioTier('god', 'staff'),
    })
    expect(prompt.user).toContain('esboco')
    expect(prompt.user).toContain('Criar sprite')
    expect(prompt.system).toContain('project-review')
  })
})
