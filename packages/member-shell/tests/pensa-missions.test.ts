import { describe, expect, it, mock } from 'bun:test'

// `server-only` lança fora do React Server — neutraliza p/ testar os prompts puros.
mock.module('server-only', () => ({}))

const {
  missionsSystem,
  clampMissions,
  missionTargetFromSpec,
  MISSION_CEILING,
  STUDIO_BLOCK_HINTS,
  STUDIO_CATEGORY_HINTS,
} = await import('../src/server/pensa-agents/stage-r-missions')

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
    // Arquitetura real: setup na área "Ao iniciar" (fora do loop) → eventos → UM loop.
    expect(system).toContain('SETUP dentro de')
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

describe('missionTargetFromSpec (alvo proporcional ao tamanho do jogo)', () => {
  const spec = (f: number, s: number) => ({ flows: Array(f).fill({}), screens: Array(s).fill({}) })

  it('null sem spec legível (cai no range padrão por versão)', () => {
    expect(missionTargetFromSpec(null, 1)).toBeNull()
    expect(missionTargetFromSpec({ flows: [], screens: [] }, 1)).toBeNull()
    expect(missionTargetFromSpec({}, 1)).toBeNull()
  })

  it('jogo GRANDE gera MAIS missões que um pequeno (V1), sem passar do teto', () => {
    const small = missionTargetFromSpec(spec(3, 3), 1)
    const big = missionTargetFromSpec(spec(8, 12), 1)
    // V1 já tem piso alto (a arquitetura pede setup→loop→HUD→título).
    expect(small?.max).toBeGreaterThanOrEqual(8)
    expect(big?.max).toBeGreaterThan(small?.max ?? 0)
    expect(big?.max).toBeLessThanOrEqual(MISSION_CEILING)
    expect(big?.min).toBeGreaterThanOrEqual(5)
    expect(big?.min).toBeLessThan(big?.max ?? 0)
  })

  it('Versão 2+ é mais enxuta que a V1 (incremento)', () => {
    const v1 = missionTargetFromSpec(spec(5, 6), 1)
    const v2 = missionTargetFromSpec(spec(5, 6), 2)
    expect(v2?.max).toBeLessThanOrEqual(12)
    expect(v2?.max).toBeLessThan(v1?.max ?? 0)
  })

  it('missionsSystem injeta o alvo derivado da spec quando informado', () => {
    const system = missionsSystem({
      mode: 'kids',
      cycleNumber: 1,
      buildEnv: 'embedded',
      targetMissions: { min: 9, max: 14 },
    })
    expect(system).toContain('entre 9 e 14 missões')
  })
})

describe('missionsSystem — append ("sugerir mais missões")', () => {
  it('append: NÃO pede a 1ª "Monte o palco" nem a última "Toque final"; avisa que ADICIONA', () => {
    const system = missionsSystem({
      mode: 'kids',
      cycleNumber: 1,
      buildEnv: 'embedded',
      append: true,
      targetMissions: { min: 3, max: 5 },
    })
    expect(system).toContain('ADICIONANDO')
    expect(system).toContain('NÃO inclua "Monte o palco" nem "Toque final"')
    // As regras POSITIVAS de 1ª/última missão somem no append.
    expect(system).not.toContain('A PRIMEIRA missão é sempre "Monte o palco"')
    expect(system).not.toContain('A ÚLTIMA missão é sempre "Toque final"')
  })

  it('sem append: mantém as regras de "Monte o palco" e "Toque final"', () => {
    const system = missionsSystem({ mode: 'kids', cycleNumber: 1, buildEnv: 'embedded' })
    expect(system).toContain('A PRIMEIRA missão é sempre "Monte o palco"')
    expect(system).toContain('A ÚLTIMA missão é sempre "Toque final"')
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
    // Strict mode do JSON schema exige o campo; vazio = missão normal.
    artKind: '',
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

  it('missão de ARTE: artKind válido carrega o tipo + a paleta FILTRADA (só hex)', () => {
    const art = { ...baseTask, artKind: 'sprite' }
    const [task] = clampMissions({ tasks: [art] }, false, ['#FF2121', 'azul', '#00a0c8'])
    expect(task?.mission.artKind).toBe('sprite')
    expect(task?.mission.palette).toEqual(['#FF2121', '#00a0c8'])
    // Missão normal (artKind vazio) NÃO ganha nem artKind nem paleta.
    const [normal] = clampMissions({ tasks: [baseTask] }, false, ['#ff2121'])
    expect(normal?.mission.artKind).toBeUndefined()
    expect(normal?.mission.palette).toBeUndefined()
  })

  it('artKind inventado é descartado; em external artKind NUNCA passa (não há Pinta)', () => {
    const inventado = { ...baseTask, artKind: 'gif-animado' }
    const [task] = clampMissions({ tasks: [inventado] })
    expect(task?.mission.artKind).toBeUndefined()
    const art = { ...baseTask, artKind: 'sprite' }
    const [external] = clampMissions({ tasks: [art] }, true, ['#ff2121'])
    expect(external?.mission.artKind).toBeUndefined()
    expect(external?.mission.palette).toBeUndefined()
  })
})

describe('missionsSystem — missões de arte (posse do Pinta)', () => {
  it('includeArtMissions liga a seção do Pinta e o artKind com valores', () => {
    const system = missionsSystem({
      mode: 'kids',
      cycleNumber: 1,
      buildEnv: 'embedded',
      includeArtMissions: true,
    })
    expect(system).toContain('MISSÕES DE ARTE')
    expect(system).toContain('Desenhar no Pinta')
    expect(system).toContain('sprite|background|tileset')
  })

  it('sem a posse (default) e no external: artKind SEMPRE vazio, sem seção do Pinta', () => {
    const semPosse = missionsSystem({ mode: 'kids', cycleNumber: 1, buildEnv: 'embedded' })
    expect(semPosse).not.toContain('MISSÕES DE ARTE')
    expect(semPosse).toContain('SEMPRE string vazia')
    // external ignora includeArtMissions (não há Pinta fora da plataforma).
    const external = missionsSystem({
      mode: 'kids',
      cycleNumber: 1,
      buildEnv: 'external',
      includeArtMissions: true,
    })
    expect(external).not.toContain('MISSÕES DE ARTE')
  })
})
