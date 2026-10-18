import { describe, expect, test } from 'bun:test'
import {
  defaultLessonSection,
  type SectionExecutionRule,
  type SectionStructureRule,
} from '@sistemazero/core/learning'
import {
  evaluateStudioProjectStructure,
  evaluateStudioSectionObjectives,
  projectCheckAuthoring,
  studioSectionCompletionIssues,
} from '../projectCheckAuthoring'

const workspace = {
  kind: 'studio',
  purpose: 'experiment',
  initialProject: { installedExtensions: [{ id: 'game-2d' }] },
  allowBlocks: ['sz_g2d_setup_stage', 'sz_g2d_create_sprite', 'sz_val_number'],
}
const stage = { type: 'usesBlock', blockType: 'sz_g2d_setup_stage' } as const

describe('objective authoring uses the actual workspace contracts', () => {
  test('validates every allowed field option against the real block parameter', () => {
    const model = projectCheckAuthoring({
      initialProject: { installedExtensions: [{ id: 'game-2d' }] },
    })
    expect(
      model.issues({
        type: 'usesBlock',
        blockType: 'sz_g2d_set_image',
        fieldOptions: { IMAGE: ['farol-listrado-aceso', 'farol-de-pedra-aceso'] },
      }),
    ).toEqual([])
    expect(
      model.issues({
        type: 'usesBlock',
        blockType: 'sz_g2d_set_image',
        fieldOptions: { DOES_NOT_EXIST: ['farol'] },
      }).length,
    ).toBeGreaterThan(0)
    expect(
      model.issues({
        type: 'usesBlock',
        blockType: 'sz_g2d_enable_classic_controls',
        fieldOptions: { MODE: ['directions', 'invalid'] },
      }).length,
    ).toBeGreaterThan(0)
  })
  test('named connections validate sockets, placement and dynamic branches', () => {
    const model = projectCheckAuthoring({
      initialProject: { installedExtensions: [{ id: 'game-2d' }] },
    })
    expect(
      model.issues({
        type: 'usesBlock',
        blockType: 'sz_g2d_spawn_obstacle',
        inputBlocks: { VX: { blockType: 'sz_g2d_random_between', inputs: { MIN: 0, MAX: 1 } } },
      }),
    ).toEqual([])
    expect(
      model.issues({
        type: 'usesBlock',
        blockType: 'sz_g2d_spawn_obstacle',
        inputBlocks: { WRONG: { blockType: 'sz_val_number' } },
      }).length,
    ).toBeGreaterThan(0)
    expect(
      model.issues({
        type: 'usesBlock',
        blockType: 'sz_g2d_update_each_frame',
        inputBlocks: { BODY: { blockType: 'sz_g2d_every_seconds' } },
      }).length,
    ).toBeGreaterThan(0)
    expect(
      model.issues({
        type: 'usesBlock',
        blockType: 'sz_js_if_else',
        inputBlocks: { ELSEIF_COND1: { blockType: 'sz_g2d_scene_is', fields: { SCENE: 'fim' } } },
      }),
    ).toEqual([])
    expect(
      model.issues({
        type: 'usesBlock',
        blockType: 'sz_val_join',
        inputBlocks: { ITEM2: { blockType: 'sz_val_variable', fields: { NAME: 'pontos' } } },
      }),
    ).toEqual([])
    expect(
      model.issues({ type: 'usesBlock', blockType: 'sz_g2d_forest', beforeBlock: 'sz_val_number' })
        .length,
    ).toBeGreaterThan(0)
  })
  test('offers only valid areas and containers for start-only setup', () => {
    const model = projectCheckAuthoring(workspace)
    expect(model.areas(stage)).toEqual(['start'])
    expect(model.containers(stage)).toEqual([])
    expect(model.issues({ ...stage, area: 'start', inputs: { W: 480, H: 320 } })).toEqual([])
  })
  const invalidRules: SectionStructureRule[] = [
    { ...stage, area: 'appearance' },
    { ...stage, withinBlock: 'sz_g2d_create_sprite' },
    { ...stage, blockType: 'sz_unknown' },
    { ...stage, blockType: 'sz_js_repeat' },
    { ...stage, inputs: { WIDTH_DOES_NOT_EXIST: 480 } },
    { ...stage, fields: { W: 480 } },
    { type: 'usesBlock', blockType: 'sz_val_number', fields: { NUM: 'not a number' } },
  ]
  test.each(invalidRules)('publication refuses an impossible criterion: %j', (rule) => {
    const section = {
      ...defaultLessonSection('section', 'Praticar', []),
      workspaceBlockId: 'workspace',
      completion: {
        version: 1 as const,
        blockIds: [],
        projectChecks: [{ id: 'check', label: 'Preparar', rule }],
      },
    }
    expect(
      studioSectionCompletionIssues([section], [{ id: 'workspace', content: workspace }]).length,
    ).toBeGreaterThan(0)
  })
  test('requires the installed extension and an editable block mode', () => {
    expect(
      projectCheckAuthoring({ ...workspace, initialProject: {} }).issues(stage).length,
    ).toBeGreaterThan(0)
    expect(
      projectCheckAuthoring({ ...workspace, initialProject: { kind: 'pro' } }).issues(stage).length,
    ).toBeGreaterThan(0)
    expect(
      projectCheckAuthoring({ ...workspace, allowedModes: ['code'] }).issues(stage).length,
    ).toBeGreaterThan(0)
  })
  test('semantic objectives also require blocks that can express them (só Blocos)', () => {
    const onlyBlocks = { ...workspace, allowedModes: ['blocks'] }
    expect(projectCheckAuthoring(onlyBlocks).issues({ type: 'usesLoop' }).length).toBeGreaterThan(0)
    expect(
      projectCheckAuthoring({ ...onlyBlocks, allowBlocks: ['sz_js_repeat'] }).issues({
        type: 'usesLoop',
      }),
    ).toEqual([])
  })
  test('com a Ponte a ideia pode ser digitada: não exige o bloco na paleta', () => {
    const bridge = { ...workspace, allowedModes: ['blocks', 'bridge'] }
    expect(projectCheckAuthoring(bridge).issues({ type: 'usesLoop' })).toEqual([])
    // Sem modos declarados (bloco antigo) a Ponte vale também.
    expect(projectCheckAuthoring(workspace).issues({ type: 'usesLoop' })).toEqual([])
  })
  test('no Pro as ideias sempre valem e "usar um bloco" nunca', () => {
    const pro = { kind: 'studio', initialProject: { kind: 'pro', tree: {} } }
    expect(projectCheckAuthoring(pro).issues({ type: 'definesFunction', name: 'pular' })).toEqual(
      [],
    )
    expect(projectCheckAuthoring(pro).issues(stage).join(' ')).toContain(
      'Projeto Pro não tem blocos',
    )
  })
  test('a conferência do servidor lê o código do Pro e o rawJS da Ponte', () => {
    const proProject = {
      kind: 'pro',
      tree: { 'src/main.ts': { kind: 'file', content: 'function pular() {}\nfor (;;) break' } },
    }
    const checks = [
      { id: 'f', label: 'f', rule: { type: 'definesFunction' as const, name: 'pular' } },
      { id: 'l', label: 'l', rule: { type: 'usesLoop' as const }, optional: true as const },
    ]
    expect(evaluateStudioSectionObjectives(checks, proProject)).toEqual({
      results: [
        { checkId: 'f', passed: true, optional: false },
        { checkId: 'l', passed: true, optional: true },
      ],
      passed: true,
    })
    const bridgeProject = {
      ir: { version: 2, behavior: { start: [{ type: 'rawJS', code: 'let vida = 3' }] } },
    }
    expect(
      evaluateStudioSectionObjectives(
        [{ id: 'v', rule: { type: 'declaresVariable', name: 'vida' } }],
        bridgeProject,
      ).passed,
    ).toBe(true)
    // Anti-vácuo: o nome errado continua falhando.
    expect(
      evaluateStudioSectionObjectives(
        [{ id: 'v', rule: { type: 'declaresVariable', name: 'pontos' } }],
        bridgeProject,
      ).passed,
    ).toBe(false)
  })
  test('evaluates active nonliteral value shadows from the actual catalog', () => {
    const variable = { type: 'sz_val_variable', fields: { NAME: 'pontos' } }
    const project = (input: unknown) => ({
      blocksState: {
        blocks: {
          blocks: [
            {
              type: 'sz_frame_start',
              inputs: {
                CHILDREN: { block: { type: 'sz_js_alert_var', inputs: { VALUE: input } } },
              },
            },
          ],
        },
      },
    })
    const rule = {
      type: 'usesBlock' as const,
      blockType: variable.type,
      fields: { NAME: 'pontos' },
    }
    expect(evaluateStudioProjectStructure(rule, project({ shadow: variable }))).toBe(true)
    expect(
      evaluateStudioProjectStructure(
        rule,
        project({ shadow: variable, block: { type: 'sz_val_number', fields: { NUM: 1 } } }),
      ),
    ).toBe(false)
    expect(
      evaluateStudioProjectStructure(rule, project({ shadow: { ...variable, disabled: true } })),
    ).toBe(false)
    expect(
      evaluateStudioProjectStructure(
        { type: 'usesBlock', blockType: 'sz_g2d_create_sprite' },
        project({ shadow: { type: 'sz_g2d_create_sprite' } }),
      ),
    ).toBe(false)
  })
  test('allows a number within a connected stage input, not a stage within a value', () => {
    const model = projectCheckAuthoring(workspace)
    expect(
      model.issues({
        type: 'usesBlock',
        blockType: 'sz_val_number',
        withinBlock: 'sz_g2d_setup_stage',
        area: 'start',
        fields: { NUM: 480 },
      }),
    ).toEqual([])
    expect(model.issues({ ...stage, withinBlock: 'sz_val_number' }).length).toBeGreaterThan(0)
  })
  test('honors the fixed level without revealing advanced blocks', () => {
    expect(
      projectCheckAuthoring({
        initialProject: {},
        level: 'iniciante-2d',
        allowLevelReveal: false,
      }).available.some((block) => block.type === 'sz_js_class'),
    ).toBe(false)
  })
})

describe('o gabarito da professora na publicação (18/10/2026)', () => {
  const loopWorkspace = (solutionProject?: unknown) => ({
    kind: 'studio',
    initialProject: {},
    ...(solutionProject === undefined ? {} : { solutionProject }),
  })
  const comLaco = {
    ir: {
      version: 2,
      html: [],
      css: [],
      extensions: [],
      behavior: {
        molds: [],
        start: [],
        events: [],
        loops: [{ type: 'repeat', times: { type: 'num', value: 3 }, body: [] }],
      },
    },
  }
  const semNada = {
    ir: {
      version: 2,
      html: [],
      css: [],
      extensions: [],
      behavior: { molds: [], start: [], events: [], loops: [] },
    },
  }
  const section = (optional?: true) => ({
    ...defaultLessonSection('section', 'Repetir', []),
    workspaceBlockId: 'workspace',
    completion: {
      version: 1 as const,
      blockIds: [],
      projectChecks: [
        { id: 'laco', label: 'Use um laço', rule: { type: 'usesLoop' as const } },
        ...(optional
          ? [
              {
                id: 'funcao',
                label: 'Crie a função pular',
                rule: { type: 'definesFunction' as const, name: 'pular' },
                optional,
              },
            ]
          : []),
      ],
    },
  })
  const issues = (solution: unknown, optional?: true) =>
    studioSectionCompletionIssues(
      [section(optional)],
      [{ id: 'workspace', content: loopWorkspace(solution) }],
    ).map((issue) => issue.message)

  test('sem gabarito, nada muda', () => {
    expect(issues(undefined)).toEqual([])
  })
  test('gabarito que cumpre os obrigatórios publica, mesmo sem o extra', () => {
    expect(issues(comLaco, true)).toEqual([])
  })
  test('projeto inicial que já cumpre um obrigatório bloqueia a publicação', () => {
    const messages = studioSectionCompletionIssues(
      [section()],
      [{ id: 'workspace', content: { kind: 'studio', initialProject: comLaco } }],
    ).map((issue) => issue.message)
    expect(messages).toEqual([
      'O projeto inicial já cumpre o objetivo obrigatório "Use um laço". Mude o objetivo ou o projeto inicial.',
    ])
  })
  test('no Pro, o laço que o modelo já traz não cumpre; o gabarito precisa acrescentar um', () => {
    const tree = (code: string) => ({
      kind: 'pro',
      tree: { 'src/main.ts': { kind: 'file', content: code } },
    })
    const modelo = tree('for (const x of lista) desenhar(x)')
    const pro = (solution: unknown) =>
      studioSectionCompletionIssues(
        [section()],
        [
          {
            id: 'workspace',
            content: { kind: 'studio', initialProject: modelo, solutionProject: solution },
          },
        ],
      ).map((issue) => issue.message)
    expect(pro(modelo)).toEqual([
      'O gabarito não cumpre o objetivo obrigatório "Use um laço". Ajuste o gabarito ou o objetivo.',
    ])
    expect(pro(tree('for (const x of lista) desenhar(x)\nwhile (vivo) andar()'))).toEqual([])
  })
  test('gabarito que não cumpre um obrigatório bloqueia e nomeia o objetivo', () => {
    expect(issues(semNada)).toEqual([
      'O gabarito não cumpre o objetivo obrigatório "Use um laço". Ajuste o gabarito ou o objetivo.',
    ])
  })
})

describe('objetivos que rodam o jogo (etapa 3, 18/10/2026)', () => {
  const anda: SectionExecutionRule = {
    type: 'behavior',
    steps: [{ action: 'press', key: 'ArrowRight' }],
    expect: { target: { kind: 'value', path: 'heroi.x' }, compare: 'changed' },
  }
  const fase: SectionExecutionRule = {
    type: 'behavior',
    steps: [],
    expect: { target: { kind: 'game', field: 'phase' }, compare: 'equals', value: 'won' },
  }
  const dobro: Extract<SectionExecutionRule, { type: 'functionReturns' }> = {
    type: 'functionReturns',
    name: 'dobro',
    cases: [{ args: [2], expected: 4 }],
  }
  const classico = (extra: Record<string, unknown> = {}) =>
    projectCheckAuthoring({ initialProject: { installedExtensions: [] }, ...extra })
  const pro = (templateId: string) =>
    projectCheckAuthoring({ initialProject: { kind: 'pro', tree: {}, proMeta: { templateId } } })

  test('valem no jogo clássico e no kit Pro, com o alvo de cada um', () => {
    expect(classico().issues(anda)).toEqual([])
    expect(classico().issues(dobro)).toEqual([])
    expect(pro('canvas-puzzle').issues(fase)).toEqual([])
    expect(pro('canvas-puzzle').issues({ ...dobro, module: 'src/regras.ts' })).toEqual([])
  })

  test('o 3D clássico não roda no teste (precisa de internet): a autoria avisa', () => {
    const tresD = projectCheckAuthoring({
      initialProject: { installedExtensions: [{ id: 'game-3d' }] },
    })
    expect(tresD.issues(anda)).toEqual([
      'Jogos 3D do modo Blocos não rodam no teste (ele roda sem internet e o 3D precisa dela). Use uma ideia de programação.',
    ])
    // Nem a função escapa: o arquivo inteiro para na importação do three.js, que o teste (sem
    // internet) não alcança. Achado do review da etapa 3.
    expect(tresD.issues(dobro)).toEqual([
      'Jogos 3D do modo Blocos não rodam no teste (ele roda sem internet e o 3D precisa dela). Use uma ideia de programação.',
    ])
  })

  test('o clique tem que caber na tela do teste (1024 por 640)', () => {
    const clique = (x: number, y: number): SectionExecutionRule => ({
      ...anda,
      steps: [{ action: 'click', x, y }],
    })
    expect(classico().issues(clique(1000, 600))).toEqual([])
    expect(classico().issues(clique(1024, 10))).toEqual([
      'O teste abre o jogo numa tela de 1024 por 640: o clique precisa caber nela.',
    ])
    expect(classico().issues(clique(10, 700))).toHaveLength(1)
  })

  test('regra em JavaScript: Ponte ou Pro, e a escrita é conferida sem rodar', () => {
    const regra = (code: string): SectionExecutionRule => ({ type: 'script', steps: [], code })
    expect(classico().issues(regra('return jogo.pontos > 2'))).toEqual([])
    expect(pro('canvas-puzzle').issues(regra('return jogo.score > 0'))).toEqual([])
    expect(
      projectCheckAuthoring({ initialProject: {}, allowedModes: ['blocks'] }).issues(
        regra('return true'),
      ),
    ).toEqual(['A regra em JavaScript vale na Ponte e no Pro.'])
    const [escrita] = classico().issues(regra('return ('))
    expect(escrita).toStartWith('A regra em JavaScript tem um erro de escrita:')
    // Compilar não roda: um laço infinito na regra não trava a autoria.
    expect(classico().issues(regra('while (true) {}'))).toEqual([])
  })

  test('cada alvo só onde ele existe', () => {
    expect(pro('vanilla-vite').issues(anda)).toEqual([
      'No projeto Pro, confira o texto da página, o console ou o estado do kit.',
    ])
    expect(classico().issues(fase)).toEqual([
      'O estado do jogo (fase, pontos, vida) só existe nos kits Pro.',
    ])
    expect(pro('vanilla-vite').issues(fase)).toEqual([
      'O estado do jogo (fase, pontos, vida) só existe nos kits Pro.',
    ])
  })

  test('a função: arquivo obrigatório no Pro, proibido no clássico, Ponte no clássico', () => {
    expect(pro('canvas-puzzle').issues(dobro)[0]).toContain('em que arquivo a função está')
    expect(classico().issues({ ...dobro, module: 'src/regras.ts' })).toEqual([
      'O arquivo da função só vale no projeto Pro.',
    ])
    expect(classico({ allowedModes: ['blocks'] }).issues(dobro)[0]).toContain('precisa da Ponte')
    expect(classico({ allowedModes: ['blocks', 'bridge'] }).issues(dobro)).toEqual([])
  })

  test('regra malformada é recusada antes de qualquer outra conta', () => {
    expect(classico().issues({ ...anda, steps: [{ action: 'wait', ms: 99_999 }] })).toEqual([
      'O objetivo tem passos, valores ou casos inválidos.',
    ])
  })

  test('a estrutura não responde por execução: sem o resultado do executor, não passa', () => {
    expect(evaluateStudioProjectStructure(anda, {})).toBe(false)
    const checks = [
      { id: 'a', rule: anda },
      { id: 'b', rule: { type: 'usesLoop' as const }, optional: true as const },
    ]
    expect(evaluateStudioSectionObjectives(checks, {}).passed).toBe(false)
    expect(
      evaluateStudioSectionObjectives(checks, {}, undefined, new Map([['a', true]])).passed,
    ).toBe(true)
  })

  test('a publicação exige o gabarito quando há objetivo que roda o jogo', () => {
    const section = {
      ...defaultLessonSection('section', 'Andar', []),
      workspaceBlockId: 'workspace',
      completion: {
        version: 1 as const,
        blockIds: [],
        projectChecks: [{ id: 'anda', label: 'Faça o herói andar', rule: anda }],
      },
    }
    const issues = (content: Record<string, unknown>) =>
      studioSectionCompletionIssues(
        [section],
        [{ id: 'workspace', content: { kind: 'studio', initialProject: {}, ...content } }],
      ).map((issue) => issue.message)
    expect(issues({})).toEqual([
      'Objetivos que rodam o jogo precisam de um gabarito: crie o gabarito no bloco do Estúdio e use "Testar agora".',
    ])
    expect(issues({ solutionProject: {} })).toEqual([])
  })
})
