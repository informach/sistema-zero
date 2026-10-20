import { expect, test } from 'bun:test'
import { evaluateStudioSectionProject } from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { etapasDino } from './corre-dino-etapas'
import { aulasDino } from './gerar-corre-dino'
import { fixtureBlock, fixtureBlocks, setFixtureLiteral } from './project-block-test-helpers'

const stages = etapasDino()
for (const [index, lesson] of aulasDino.entries()) {
  test(`${lesson.slug}: aceita escolhas coerentes sem copiar números ou frases da demonstração`, () => {
    const project = structuredClone(stages[index + 1]!)
    for (const block of fixtureBlocks(project)) {
      switch (block.type) {
        case 'sz_g2d_stage_border':
          setFixtureLiteral(block, 'WIDTH', 6)
          break
        case 'sz_g2d_create_dino':
          setFixtureLiteral(block, 'X', 120)
          setFixtureLiteral(block, 'Y', 160)
          setFixtureLiteral(block, 'SIZE', 72)
          break
        case 'sz_g2d_forest':
          setFixtureLiteral(block, 'SPEED', 3)
          break
        case 'sz_g2d_every_seconds':
          setFixtureLiteral(block, 'SECS', 2.5)
          break
        case 'sz_g2d_spawn_obstacle':
          for (const [name, value] of Object.entries({ X: 600, VX: -6, SIZE: 38 })) {
            const input = block.inputs?.[name]
            if ((input?.block ?? input?.shadow)?.type === 'sz_val_number')
              setFixtureLiteral(block, name, value)
          }
          break
        case 'sz_g2d_random_between': {
          const min = block.inputs?.MIN
          const value = Number((min?.block ?? min?.shadow)?.fields?.NUM)
          setFixtureLiteral(block, 'MIN', value >= 400 ? 520 : 0)
          setFixtureLiteral(block, 'MAX', value >= 400 ? 600 : 2)
          break
        }
        case 'sz_math_arithmetic': {
          const input = block.inputs?.A
          if ((input?.block ?? input?.shadow)?.type === 'sz_val_number')
            setFixtureLiteral(block, 'A', -6)
          break
        }
        case 'sz_g2d_set_hitbox_scale':
          setFixtureLiteral(block, 'PERCENT', 75)
          break
        case 'sz_g2d_shake':
          setFixtureLiteral(block, 'INTENSITY', 4)
          break
        case 'sz_g2d_play_fx':
          block.fields = { ...block.fields, FX: 'jump' }
          break
        case 'sz_g2d_set_stage_description':
          block.fields = {
            ...block.fields,
            DESCRIPTION: 'Desvie dos obstáculos: pule com Espaço, seta para cima ou toque.',
          }
          break
        case 'sz_g2d_draw_score':
          block.fields = { ...block.fields, LABEL: 'Meu placar:' }
          break
        case 'sz_g2d_show_screen':
          setFixtureLiteral(block, 'HINT', 'Use uma tecla ou toque para seguir.')
          break
        case 'sz_val_text':
          if (String(block.fields?.TEXT).startsWith('Você fez'))
            block.fields = { ...block.fields, TEXT: 'Minha marca: ' }
          else if (String(block.fields?.TEXT).includes('Tente bater essa marca'))
            block.fields = { ...block.fields, TEXT: ' pontos nesta corrida.' }
          break
        case 'sz_js_var_create':
          if (block.fields?.NAME === 'velocidade') setFixtureLiteral(block, 'VALUE', -6)
          break
        case 'sz_val_compare': {
          const left = block.inputs?.LEFT
          if ((left?.block ?? left?.shadow)?.fields?.NAME === 'velocidade')
            setFixtureLiteral(block, 'RIGHT', -11)
          break
        }
      }
    }
    for (const section of lesson.sections) {
      const sample = structuredClone(project)
      // Same authored transient as the course QA: the debug contour is removed before delivery.
      if (section.checks?.some((check) => check.id === 'raio-x')) {
        const draw = fixtureBlock(sample, 'sz_g2d_draw_sprite')
        draw.next = {
          block: {
            type: 'sz_g2d_draw_hitbox',
            fields: { SPRITE: 'dino' },
            ...(draw.next ? { next: draw.next } : {}),
          },
        }
      }
      expect(
        evaluateStudioSectionProject(section.checks ?? [], sample).filter((row) => !row.passed),
        section.key,
      ).toEqual([])
    }
  })
}

for (const [stage, section, id, type, parameter, value] of [
  [1, 'area-e-tela', 'tela', 'sz_g2d_setup_stage', 'W', 0],
  [2, 'ordem-certa', 'floresta', 'sz_g2d_forest', 'SPEED', 0],
  [5, 'criar-cactos', 'relogio', 'sz_g2d_spawn_obstacle', 'VX', 1],
  [5, 'grupo-e-relogio', 'relogio-vazio', 'sz_g2d_every_seconds', 'SECS', 0],
  [10, 'ajustar-area', 'colisao-area', 'sz_g2d_set_hitbox_scale', 'PERCENT', 69],
  [10, 'ajustar-area', 'colisao-area', 'sz_g2d_set_hitbox_scale', 'PERCENT', 86],
] as const) {
  test(`etapa ${stage}/${section}: recusa ${parameter}=${value}`, () => {
    const project = structuredClone(stages[stage]!)
    setFixtureLiteral(fixtureBlock(project, type), parameter, value)
    const check = aulasDino[stage - 1]!.sections.find((s) => s.key === section)?.checks?.find(
      (check) => check.id === id,
    )
    if (!check) throw new Error('Authored check missing')
    expect(evaluateStudioSectionProject([check], project)[0]?.passed).toBe(false)
  })
}

for (const [variable, stage, section, id, values] of [
  ['pontos', 11, 'relogio-dos-pontos', 'relogio-pontos', [0.4, 3.1]],
  ['velocidade', 13, 'acelerador-e-freio', 'acelerar-com-limite', [1, 11]],
] as const) {
  for (const value of values) {
    test(`${id}: recusa intervalo ${value} fora da faixa ensinada`, () => {
      const project = structuredClone(stages[stage]!)
      const clock = fixtureBlocks(project).find(
        (block) =>
          block.type === 'sz_g2d_every_seconds' &&
          fixtureBlocks(block.inputs?.BODY).some(
            (child) => child.type === 'sz_js_var_increment' && child.fields?.NAME === variable,
          ),
      )
      if (!clock) throw new Error('Authored clock missing')
      setFixtureLiteral(clock, 'SECS', value)
      const check = aulasDino[stage - 1]!.sections.find((s) => s.key === section)?.checks?.find(
        (check) => check.id === id,
      )
      if (!check) throw new Error('Authored clock check missing')
      expect(evaluateStudioSectionProject([check], project)[0]?.passed).toBe(false)
    })
  }
}

for (const value of [-15, -6]) {
  test(`o freio recusa o limite ${value} fora da faixa ensinada`, () => {
    const project = structuredClone(stages[13]!)
    const comparison = fixtureBlocks(project).find((block) => {
      const input = block.inputs?.LEFT
      return (
        block.type === 'sz_val_compare' &&
        (input?.block ?? input?.shadow)?.fields?.NAME === 'velocidade'
      )
    })
    if (!comparison) throw new Error('Authored speed comparison missing')
    setFixtureLiteral(comparison, 'RIGHT', value)
    const check = aulasDino[12]!.sections
      .find((s) => s.key === 'acelerador-e-freio')
      ?.checks?.find((check) => check.id === 'acelerar-com-limite')
    if (!check) throw new Error('Authored speed check missing')
    expect(evaluateStudioSectionProject([check], project)[0]?.passed).toBe(false)
  })
}

for (const [stage, section, id, type, axis, value] of [
  [1, 'criar-dino', 'dino', 'sz_g2d_create_dino', 'X', 1_000_000],
  [1, 'criar-dino', 'dino', 'sz_g2d_create_dino', 'Y', -1_000_000],
  [1, 'criar-dino', 'dino', 'sz_g2d_create_dino', 'X', 480],
  [1, 'criar-dino', 'dino', 'sz_g2d_create_dino', 'Y', 270],
  [11, 'numero-na-tela', 'mostrar-pontos', 'sz_g2d_draw_score', 'X', 1_000_000],
  [11, 'numero-na-tela', 'mostrar-pontos', 'sz_g2d_draw_score', 'Y', -1_000_000],
  [1, 'area-e-tela', 'tela', 'sz_g2d_setup_stage', 'W', 500],
] as const) {
  test(`${section}/${id}: conserva o mundo da aventura e recusa ${axis}=${value}`, () => {
    const project = structuredClone(stages[stage]!)
    setFixtureLiteral(fixtureBlock(project, type), axis, value)
    const check = aulasDino[stage - 1]!.sections.find((s) => s.key === section)?.checks?.find(
      (c) => c.id === id,
    )
    if (!check) throw new Error('Authored spatial check missing')
    expect(evaluateStudioSectionProject([check], project)[0]?.passed).toBe(false)
  })
}

for (const section of ['faxina', 'entrega']) {
  for (const position of ['expressao', 'borda'] as const) {
    test(`${section}: recusa o medidor provisório mesmo com posição ${position}`, () => {
      const project = structuredClone(stages[6]!)
      const draw = fixtureBlock(project, 'sz_g2d_draw_sprite')
      const score = structuredClone(fixtureBlock(stages[11], 'sz_g2d_draw_score'))
      delete score.next
      score.inputs!.VALUE = { shadow: { type: 'sz_val_number', fields: { NUM: 0 } } }
      if (position === 'expressao') {
        score.inputs!.X = {
          block: {
            type: 'sz_math_arithmetic',
            fields: { OP: '+' },
            inputs: {
              A: { shadow: { type: 'sz_val_number', fields: { NUM: 12 } } },
              B: { shadow: { type: 'sz_val_number', fields: { NUM: 0 } } },
            },
          },
        }
        setFixtureLiteral(score, 'Y', 30)
      } else {
        setFixtureLiteral(score, 'X', 480)
        setFixtureLiteral(score, 'Y', 0)
      }
      score.next = draw.next
      draw.next = { block: score }
      const check = aulasDino[5]!.sections
        .find((s) => s.key === section)
        ?.checks?.find((candidate) => candidate.id === 'sem-medidor')
      if (!check) throw new Error('Authored absence check missing')
      expect(evaluateStudioSectionProject([check], project)[0]?.passed).toBe(false)
    })
  }
}

for (const section of ['descricao-completa', 'entrega']) {
  for (const [description, accepted] of [
    ['Corra com o dino e pule os cactos apertando espaço', false],
    ['Pule os cactos com espaço e seta para cima.', false],
    ['Pule os cactos com espaço, seta para baixo ou toque na tela.', false],
    ['Pule cactos: espacoso, seta para cima e toque.', false],
    ['Desvie dos obstáculos: pule com Espaço, seta para cima ou toque.', true],
    ['PARA SALTAR OBSTÁCULOS: use SPACE, ARROWUP ou TOCAR a tela.', true],
    ['Evite os cactos: use barra de espaço, seta superior ou toque para saltar.', true],
  ] as const) {
    test(`${section}: descrição ${accepted ? 'completa' : 'incompleta'}: ${description}`, () => {
      const project = structuredClone(stages[13]!)
      const block = fixtureBlock(project, 'sz_g2d_set_stage_description')
      block.fields = { ...block.fields, DESCRIPTION: description }
      const check = aulasDino[12]!.sections
        .find((s) => s.key === section)
        ?.checks?.find((candidate) => candidate.id === 'descricao-completa')
      if (!check) throw new Error('Authored complete description check missing')
      expect(evaluateStudioSectionProject([check], project)[0]?.passed).toBe(accepted)
    })
  }
}
