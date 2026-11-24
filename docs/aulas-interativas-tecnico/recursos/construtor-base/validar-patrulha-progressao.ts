/** Testa a mudança real de comportamento de cada etapa, sem alterar os JSONs entregues. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createExecutionObservationCodec } from '../../../../packages/core/src/learning/execution-observation'
import {
  isExecutionRule,
  judgeExecutionObservation,
} from '../../../../packages/core/src/learning/project-execution'
import { config3D } from '../../qa/construtor-3d'
import { formatarJson } from '../../qa/formatar-json'
import { bootPatrulha } from './patrulha-runtime-3d'

async function avaliarObjetivo(project: any, objective: any) {
  const rule: any = objective.rule
  const test = await bootPatrulha(project)
  test.frames(15) // SETTLE_MS = 250 antes da primeira observação no executor.
  const codec = createExecutionObservationCodec()
  const observe = (expect: any) => {
    const value =
      expect.target.kind === 'text'
        ? test.window.document.body.textContent
        : expect.target.path.split('.').reduce((object: any, key: string) => object?.[key], test.p)
    assert.ok(
      ['value', 'text'].includes(expect.target.kind),
      'Usar uma observação suportada pelo executor oficial',
    )
    return {
      found: value !== undefined,
      ...(value !== undefined ? { value: codec.encode(value, 20_000) } : {}),
    }
  }
  assert.equal(
    rule.type,
    'behavior',
    'Scripts não podem serializar a cena Three.js; usar paths escalares',
  )
  const initial = observe(rule.expect)
  const checkpoints: any[] = []
  const checkpointInitial = (rule.checkpoints ?? []).map((checkpoint: any) =>
    observe(checkpoint.expect),
  )
  const capture = (afterStep: number) => {
    for (const [j, checkpoint] of (rule.checkpoints ?? []).entries())
      if (checkpoint.afterStep === afterStep)
        checkpoints[j] = { initial: checkpointInitial[j], final: observe(checkpoint.expect) }
  }
  capture(0)
  for (const [i, step] of rule.steps.entries()) {
    if (step.action === 'wait') test.frames(Math.ceil(step.ms / (1000 / 60)))
    else if (step.action === 'press') {
      test.down(step.key)
      test.frames(Math.ceil((step.holdMs ?? 80) / (1000 / 60)))
      test.up(step.key)
    } else throw new Error(`Passo de execução sem adaptador: ${step.action}`)
    capture(i + 1)
  }
  test.frames(15) // O executor espera mais 250 ms depois de todos os passos.
  let observation: any = { id: objective.id, type: rule.type }
  observation = {
    ...observation,
    initial,
    final: observe(rule.expect),
    ...(rule.checkpoints ? { checkpoints } : {}),
  }
  const verdict = judgeExecutionObservation(rule, observation)
  test.noErrors()
  test.dispose()
  return { observation, verdict }
}

const idx = (stage: string) => config3D.etapas.indexOf(stage)
const reports: object[] = []
const objectives: object[] = []
for (const [n, stage] of config3D.etapas.entries()) {
  const file = resolve(config3D.pasta, 'projetos', `${stage}.szproject.json`)
  const bytes = readFileSync(file)
  const project = JSON.parse(bytes.toString('utf8'))
  assert.equal(
    project.files['script.js'],
    config3D.montarProjeto(stage).files['script.js'],
    'O teste precisa executar o script entregue desta etapa',
  )
  const has = (feature: string) => n >= idx(feature)
  const checks: string[] = []
  const g = await bootPatrulha(project)
  assert.equal(g.names.includes('pontos'), has('contador'))
  assert.equal(g.p.nave._szLife !== undefined, has('vidas'))
  checks.push(
    'Três GLBs reais carregados; pontos e vida existem somente nas etapas em que foram construídos',
  )

  g.frames(120)
  g.press('Space')
  g.down('ArrowRight')
  g.frames(20)
  g.up('ArrowRight')
  assert.equal(g.p.read().estado, 'inicio')
  assert.equal(g.p.read().x, 0)
  assert.equal(g.p.tiros.length, 0)
  assert.equal(g.p.asteroides.length, 0)
  checks.push('Abertura preservada: sem movimento, tiros ou asteroides antes de Enter')

  g.press('Enter')
  g.down('ArrowRight')
  g.frames(20)
  g.up('ArrowRight')
  const x = g.p.read().x
  assert.ok(x > 0)
  g.press('Space')
  assert.equal(g.p.tiros.length, has('disparo') ? 1 : 0)
  if (has('disparo')) {
    const shot = g.p.tiros[0]
    assert.equal(shot.position.x, has('origem') ? x : 0)
    assert.equal(shot.position.y, 1)
    assert.equal(shot.position.z, -1.6)
    g.frames(6)
    assert.equal(shot.position.z < -1.6, has('trajeto-tiro'))
    g.frames(124)
    assert.equal(g.p.tiros.includes(shot), !has('limite-tiro'))
  }
  checks.push(
    'Progressão do laser: inexistente → cópia parada central → origem na nave → Z negativo → retirada no limite',
  )

  g.clean()
  if (has('relogio')) {
    g.frames(100)
    assert.ok(g.p.asteroides.length > 0)
    for (const rock of g.p.asteroides) {
      if (!has('entrada')) assert.equal(rock.position.x, 0)
      assert.ok(rock.position.x >= -5.2 && rock.position.x <= 5.2)
      assert.equal(rock.position.y, 1)
      assert.equal(rock.position.z > -28, has('trajeto-asteroide'))
    }
  } else {
    g.frames(100)
    assert.equal(g.p.asteroides.length, 0)
  }
  g.clean()
  const escaped = g.asteroid(0, 7)
  g.step()
  assert.equal(g.p.asteroides.includes(escaped), !has('limite-asteroide'))
  if (has('vidas')) assert.equal(g.p.read().vidas, 3)
  checks.push(
    'Progressão do asteroide: sem relógio → cópia parada → faixa X → aproximação em Z → retirada, sem dano ao escapar',
  )

  g.clean()
  const pointsBeforeHit = g.p.pontos
  g.asteroid(0, -8)
  g.bullet(0, -8)
  g.bullet(0, -8)
  g.step()
  assert.equal(g.p.asteroides.length, has('contato') ? 0 : 1)
  assert.equal(g.p.tiros.length, has('contato') ? 1 : 2)
  if (has('contador')) assert.equal(g.p.pontos, pointsBeforeHit + (has('soma') ? 1 : 0))
  const text = g.window.document.body.textContent
  assert.equal(text.includes('Acertos:'), has('placar'))
  if (has('placar')) assert.ok(text.includes(`Acertos: ${pointsBeforeHit + 1} / 20`))
  const points = g.p.pontos
  g.clean()
  g.asteroid(0, -8)
  g.bullet(4, -8)
  g.step()
  assert.equal(g.p.asteroides.length, 1)
  assert.equal(g.p.pontos, points)
  checks.push(
    'Contato consome apenas o par; contador não soma antes da etapa soma; dois lasers não duplicam ponto; placar aparece só na sua etapa',
  )

  g.clean()
  const hitRock = g.asteroid(g.p.read().x, 0)
  g.step()
  if (has('vidas')) assert.equal(g.p.read().vidas, has('dano') ? 2 : 3)
  assert.equal(g.p.asteroides.includes(hitRock), !has('retirada-batida'))
  if (has('dano')) {
    g.asteroid(g.p.read().x, 0)
    g.step()
    assert.equal(g.p.read().vidas, 2, 'A proteção nativa impede outro desconto imediato')
  }
  checks.push(
    'Vida começa em três; dano surge somente no encontro ensinado; retirada da pedra só na etapa seguinte; proteção nativa preservada',
  )

  if (has('vidas')) {
    g.clean()
    g.context.SZGame3D.setLife(g.p.nave, 1) // Preparação de fronteira exclusiva do QA.
    g.asteroid(g.p.read().x, 0)
    g.step()
    g.step()
    assert.equal(g.p.read().vidas, has('dano') ? 0 : 1)
    assert.equal(g.p.read().estado, has('derrota') ? 'derrota' : 'jogando')
    if (has('derrota')) {
      await g.restart()
      assert.equal(g.p.read().estado, 'inicio')
      assert.equal(g.p.pontos, 0)
      assert.equal(g.p.read().vidas, 3)
      assert.equal(g.p.tiros.length, 0)
      assert.equal(g.p.asteroides.length, 0)
      assert.equal(g.p.read().x, 0)
      g.press('Enter')
      if (!has('vitoria')) {
        g.p.pontos = 20
        g.step()
        g.step()
        assert.equal(g.p.read().estado, 'jogando', 'A etapa derrota ainda não pode ensinar vitória')
      } else {
        g.clean()
        g.p.pontos = 19
        g.asteroid(0, -8)
        g.bullet(0, -8)
        g.step()
        g.step()
        assert.equal(g.p.read().estado, 'vitoria')
        await g.restart()
        assert.equal(g.p.pontos, 0)
        assert.equal(g.p.read().vidas, 3)
        g.press('Enter')
        g.clean()
        g.context.SZGame3D.setLife(g.p.nave, 1)
        g.p.pontos = 19
        g.asteroid(g.p.read().x, 0)
        g.asteroid(0, -8)
        g.bullet(0, -8)
        g.step()
        assert.equal(g.p.pontos, 20)
        assert.equal(g.p.read().vidas, 0)
        g.step()
        assert.equal(g.p.read().estado, 'derrota')
      }
    }
  }
  checks.push(
    'Resultados só surgem na etapa ensinada; quando presentes, botão nativo reinicia e derrota precede vitória simultânea',
  )
  g.noErrors()
  reports.push({
    stage,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    checks,
    consoleMessages: g.logs,
  })
  g.dispose()

  for (const objective of config3D.checks(stage).filter((check) => isExecutionRule(check.rule))) {
    const { observation, verdict } = await avaliarObjetivo(project, objective)
    assert.equal(
      verdict.passed,
      true,
      `${stage}/${objective.id}: ${JSON.stringify({ verdict, observation })}`,
    )
    objectives.push({ stage, id: objective.id, observation, verdict })
  }
  console.log(JSON.stringify({ stage, passed: true }))
}

// Regressões que passaram despercebidas quando critérios antigos eram descartados.
// Só a cópia em memória é alterada; nenhum snapshot do curso recebe a mutação.
const mutations = [
  {
    name: 'contador-nunca-comeca-em-zero',
    objective: 'valores-do-comeco',
    before: 'let pontos = 0;',
    after: 'let pontos = 5;',
  },
  {
    name: 'vida-inicial-alterada',
    objective: 'valores-do-comeco',
    before: 'SZGame3D.setLife(nave, 3);',
    after: 'SZGame3D.setLife(nave, 2);',
  },
  {
    name: 'movimento-preparado-removido',
    objective: 'pilotar-so-na-partida',
    before: 'SZGame3D.setPosition(nave, naveX, 1, 0);',
    after: 'SZGame3D.setPosition(nave, 0, 1, 0);',
  },
  {
    name: 'transporte-dos-tiros-removido',
    objective: 'tiro-sai-do-grupo',
    before: 'SZGame3D.updateGroupNoGravity(tiros);',
    after: '',
  },
  {
    name: 'aviso-de-controles-incompleto',
    objective: 'avisos-da-partida',
    before: 'SETAS: mover | ESPAÇO: atirar | Asteroide que passa não tira vida',
    after: 'SETAS: mover',
  },
]
const regressions: object[] = []
for (const mutation of mutations) {
  const project = config3D.montarProjeto('completo')
  assert.ok(project.files['script.js'].includes(mutation.before), mutation.name)
  project.files['script.js'] = project.files['script.js'].replace(mutation.before, mutation.after)
  const objective = config3D.checks('completo').find((check) => check.id === mutation.objective)!
  const { verdict } = await avaliarObjetivo(project, objective)
  assert.equal(
    verdict.passed,
    false,
    `A regressão ${mutation.name} precisa ser recusada no curso completo`,
  )
  regressions.push({
    mutation: mutation.name,
    objective: mutation.objective,
    rejected: true,
    verdict,
  })
}

const report = {
  engine:
    'Runtime oficial Jogo 3D, GLTFLoader oficial, geometria Three.js e Canvas2D reais; renderer WebGL sem desenho. Passos de teclado/espera adaptados para relógio determinístico, incluindo 80 ms padrão de tecla e checkpoints desde afterStep 0; observações escalares passam pelo codec oficial, e os vereditos usam judgeExecutionObservation oficial.',
  limitation:
    'Não é importação no Estúdio publicado, inspeção visual WebGL, gravação de aula nem execução pelo navegador do aluno.',
  reports,
  objectives,
  regressions,
}
writeFileSync(resolve(config3D.pasta, 'qa-runtime-progressao.json'), formatarJson(report))
console.log(
  JSON.stringify({
    passed: true,
    stages: reports.length,
    executionObjectives: objectives.length,
    regressions: regressions.length,
  }),
)
