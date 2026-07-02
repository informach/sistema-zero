import { describe, expect, it, mock } from 'bun:test'

// `server-only` lança fora do React Server — neutraliza p/ testar os prompts puros.
mock.module('server-only', () => ({}))

const { buildStageZSystem } = await import('../src/server/pensa-agents/stage-z')
const { PENSA_CHILD_SAFETY_CLAUSE } = await import('../src/server/pensa-agents/safety')
const { transcriptForEvaluator } = await import('../src/server/pensa-agents/stage-z-evaluator')
const { pensaChatRateLimited } = await import('../src/routes/pensa-ai')

describe('buildStageZSystem (agente de clareza — etapa Z)', () => {
  const base = {
    mode: 'kids' as const,
    projectName: 'Dino Ninja',
    projectKind: 'game' as const,
    cycleNumber: 1,
  }

  it('SEMPRE inclui a cláusula de segurança infantil no modo kids', () => {
    // Espelha o contrato do studio (ensureSafetyClause): nenhum caminho de prompt
    // kids sai sem a blindagem — NÃO pode regredir.
    expect(buildStageZSystem(base)).toContain(PENSA_CHILD_SAFETY_CLAUSE)
  })

  it('carrega a regra anti-inferência (PRD §11.3) e a linha de sugestões clicáveis', () => {
    const system = buildStageZSystem(base)
    expect(system).toContain('anti-inferência')
    expect(system).toContain('TODA resposta das perguntas vem da criança')
    expect(system).toContain('SUGESTÕES:')
  })

  it('contextualiza projeto/versão e foca no que FALTA responder', () => {
    const system = buildStageZSystem({
      ...base,
      state: {
        answered: { who: true, problem: true, action: false, screens: false, success: false },
        ready: false,
      },
    })
    expect(system).toContain('Dino Ninja')
    expect(system).toContain('Versão 1')
    expect(system).toContain('AÇÃO PRINCIPAL')
    // As já respondidas não entram na lista de pendências.
    expect(system).toContain('Falta clarear: AÇÃO PRINCIPAL, TELAS, FICOU BOM')
  })

  it('Versão 2+ vira conversa de INCREMENTO (não redesenha o jogo inteiro)', () => {
    const system = buildStageZSystem({
      ...base,
      cycleNumber: 2,
      cycleGoal: 'sons novos e mais fases',
    })
    expect(system).toContain('NOVA VERSÃO')
    expect(system).toContain('sons novos e mais fases')
  })
})

describe('transcriptForEvaluator', () => {
  it('rotula os papéis e injeta o resumo das mensagens cortadas', () => {
    const t = transcriptForEvaluator(
      [
        { role: 'user', content: 'quero um jogo de\npular', at: '' },
        { role: 'assistant', content: 'Boa! Quem vai jogar?', at: '' },
      ],
      'A criança quer um jogo de dinossauro.',
    )
    expect(t).toContain('RESUMO das mensagens antigas: A criança quer um jogo de dinossauro.')
    expect(t).toContain('CRIANÇA: quero um jogo de pular') // quebra de linha achatada
    expect(t).toContain('ZAPPY: Boa! Quem vai jogar?')
  })
})

describe('pensaChatRateLimited (custo/compulsão — por sessão)', () => {
  it('libera 10 por minuto e barra a 11ª; janela nova libera de novo', () => {
    const key = `t-${Math.random()}`
    const t0 = 1_700_000_000_000
    for (let i = 0; i < 10; i += 1) expect(pensaChatRateLimited(key, t0)).toBe(false)
    expect(pensaChatRateLimited(key, t0)).toBe(true)
    // Janela do minuto virou → libera (o teto diário segue contando).
    expect(pensaChatRateLimited(key, t0 + 61_000)).toBe(false)
  })

  it('teto DIÁRIO barra mesmo com janelas de minuto folgadas', () => {
    const key = `t-${Math.random()}`
    const t0 = 1_700_000_000_000
    let now = t0
    let allowed = 0
    for (let i = 0; i < 200; i += 1) {
      if (!pensaChatRateLimited(key, now)) allowed += 1
      // Espaça p/ nunca esbarrar no teto do minuto — isola o teto diário.
      now += 7_000
    }
    expect(allowed).toBe(150)
    // Dia seguinte zera.
    expect(pensaChatRateLimited(key, t0 + 26 * 60 * 60 * 1000)).toBe(false)
  })

  it('sessões diferentes não dividem o balde', () => {
    const a = `t-${Math.random()}`
    const b = `t-${Math.random()}`
    const t0 = 1_700_000_000_000
    for (let i = 0; i < 10; i += 1) pensaChatRateLimited(a, t0)
    expect(pensaChatRateLimited(a, t0)).toBe(true)
    expect(pensaChatRateLimited(b, t0)).toBe(false)
  })
})
