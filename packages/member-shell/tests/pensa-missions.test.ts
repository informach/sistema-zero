import { describe, expect, it, mock } from 'bun:test'

// `server-only` lança fora do React Server — neutraliza p/ testar os prompts puros.
mock.module('server-only', () => ({}))

const { missionsSystem, clampMissions, STUDIO_BLOCK_HINTS, STUDIO_CATEGORY_HINTS } = await import(
  '../src/server/pensa-agents/stage-r-missions'
)

describe('missionsSystem (agente de missões — etapa R)', () => {
  it('no Estúdio: ensina a INSTALAR a extensão, cita blocos reais e a arquitetura do loop', () => {
    const system = missionsSystem({ mode: 'kids', cycleNumber: 1, buildEnv: 'embedded' })
    // Projeto semeado nasce SEM extensão — a 1ª missão ensina o caminho exato.
    expect(system).toContain('Extensões')
    expect(system).toContain('aperte Instalar')
    expect(system).toContain('Mais opções')
    // Labels EXATOS dos blocos (catálogo curado do game-2d).
    expect(system).toContain('"A cada quadro do jogo, fazer"')
    expect(system).toContain('"Quando apertar a tecla"')
    expect(system).toContain('"Controlar o dinossauro"')
    // Arquitetura real: setup fora do loop → eventos → UM loop.
    expect(system).toContain('FORA do loop')
    expect(system).toContain('UM ÚNICO loop')
  })

  it('external: sem instalação de extensão nem labels de bloco (Estúdio só na proibição)', () => {
    const system = missionsSystem({ mode: 'kids', cycleNumber: 1, buildEnv: 'external' })
    // A ÚNICA menção ao Estúdio é a instrução negativa ("construído FORA do Estúdio").
    expect(system).toContain('FORA do Estúdio')
    expect(system).not.toContain('abrir o projeto no Estúdio')
    expect(system).not.toContain('Extensões')
    expect(system).not.toContain('"A cada quadro do jogo, fazer"')
  })
})

describe('STUDIO_BLOCK_HINTS (snapshot curado dos labels reais)', () => {
  it('toda categoria do catálogo de blocos existe no catálogo de categorias', () => {
    const valid = new Set<string>(STUDIO_CATEGORY_HINTS)
    for (const [category] of STUDIO_BLOCK_HINTS) {
      expect(valid.has(category)).toBe(true)
    }
  })

  it('labels curtos (cabem no teto de 120 chars do campo blocks com folga)', () => {
    for (const [, labels] of STUDIO_BLOCK_HINTS) {
      expect(labels.length).toBeGreaterThan(0)
      for (const label of labels) {
        expect(label.length).toBeLessThanOrEqual(60)
      }
    }
  })
})

describe('clampMissions', () => {
  const baseTask = {
    title: 'Faça o pulo',
    summary: 'O herói pula.',
    taskType: 'gameplay',
    story: 'O Bolt precisa saltar os lasers!',
    steps: [{ text: 'Arraste o bloco', hint: '' }],
    categories: ['Jogo 2D › 🕹️ Movimento', 'Categoria Inventada'],
    blocks: ['"Fazer o sprite pular no chão"'],
    doneWhen: ['O Bolt pula ao apertar espaço', 'a', 'b', 'c'],
  }

  it('mantém categoria válida do catálogo e derruba a inventada; corta doneWhen em 3', () => {
    const [task] = clampMissions({ tasks: [baseTask] })
    expect(task?.mission.studioHints?.categories).toEqual(['Jogo 2D › 🕹️ Movimento'])
    expect(task?.mission.studioHints?.blocks).toEqual(['"Fazer o sprite pular no chão"'])
    expect(task?.mission.doneWhen).toHaveLength(3)
  })

  it('clipa textos nos tetos (text 200, hint 160)', () => {
    const [task] = clampMissions({
      tasks: [
        {
          ...baseTask,
          steps: [{ text: 'x'.repeat(400), hint: 'y'.repeat(400) }],
        },
      ],
    })
    expect(task?.mission.steps[0]?.text).toHaveLength(200)
    expect(task?.mission.steps[0]?.hint).toHaveLength(160)
  })

  it('fallback de steps respeita o buildEnv (external não fala em Estúdio)', () => {
    const empty = { ...baseTask, steps: [] }
    const [studio] = clampMissions({ tasks: [empty] })
    expect(studio?.mission.steps[0]?.text).toBe('Abra seu projeto no Estúdio')
    const [external] = clampMissions({ tasks: [empty] }, true)
    expect(external?.mission.steps[0]?.text).toBe('Abra seu projeto no editor')
  })
})
