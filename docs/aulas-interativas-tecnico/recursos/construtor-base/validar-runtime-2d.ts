/** Integração dos 26 progressivos com o motor oficial e Canvas2D real. */
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { etapas2D, projeto2D } from '../../qa/construtor-2d-projetos'
import { boot } from './runtime-2d'

const report: any[] = []
for (const etapa of etapas2D) {
  const at = etapas2D.indexOf(etapa)
  const reached = (key: (typeof etapas2D)[number]) => at >= etapas2D.indexOf(key)
  const project = projeto2D(etapa)
  const g = await boot(project, project.files)
  const checks: string[] = []
  const s = g.state
  try {
    g.key('ArrowRight')
    g.press('Space')
    g.tick(120)
    g.key('ArrowRight', false)
    assert.equal(s().nave.x, 372)
    if (s().tiros) assert.equal(s().tiros.items.length, 0)
    if (s().asteroides) assert.equal(s().asteroides.items.length, 0)
    checks.push('Abertura conserva nave, tiro e relógio protegidos')
    g.press('Enter')
    assert(g.api.sceneIs('jogando'))
    g.key('ArrowRight')
    g.tick(12)
    g.key('ArrowRight', false)
    assert.equal(s().nave.x, reached('movimento') ? 432 : 372)
    checks.push(
      reached('movimento')
        ? 'Movimento lateral funciona após Enter'
        : 'Movimento ainda não foi entregue',
    )
    if (reached('limite') && !reached('asteroides')) {
      g.key('ArrowRight')
      g.tick(180)
      g.key('ArrowRight', false)
      assert.equal(s().nave.x, 744)
      g.key('ArrowLeft')
      g.tick(180)
      g.key('ArrowLeft', false)
      assert.equal(s().nave.x, 0)
      checks.push('As duas bordas mantêm toda a nave na tela')
    }
    g.api.setPosition(s().nave, 172, 396)
    g.key('Space')
    g.key('Space', true, true)
    g.key('Space', false)
    if (reached('grupo-tiros')) {
      assert.equal(s().tiros.items.length, 1)
      const bullet = s().tiros.items[0]
      assert.equal(bullet.x, reached('origem-tiro') ? 195 : 395)
      assert.equal(bullet.y, 372)
      assert.equal(bullet.vy, reached('voo-tiros') ? -7 : 0)
      g.tick()
      assert.equal(bullet.y, reached('voo-tiros') ? 365 : 372)
      checks.push('Um tiro por toque; posição e velocidade correspondem à conquista atual')
      g.tick(80)
      assert.equal(s().tiros.items.length, reached('limpeza-tiros') ? 0 : 1)
      checks.push(
        reached('limpeza-tiros')
          ? 'Tiro que saiu é retirado do grupo'
          : 'Sem a retirada, o tiro continua no grupo mesmo fora da tela',
      )
      g.api.clearGroup(s().tiros)
    } else {
      assert(!s().tiros)
      checks.push('O grupo de tiros não aparece antes da sua montagem')
    }
    if (reached('relogio-asteroides') && !reached('asteroides')) {
      g.tick(180)
      assert.equal(s().asteroides.items.length, 0)
      checks.push('Relógio intermediário funciona sem antecipar a criação')
    }
    if (reached('asteroides')) {
      g.api.clearGroup(s().asteroides)
      g.tick(91)
      assert.equal(s().asteroides.items.length, 1)
      const meteor = s().asteroides.items[0]
      assert(meteor.x >= 24 && meteor.x <= 728)
      assert.equal(meteor.vy, 2)
      assert.equal(meteor.w, 48)
      assert.equal(meteor.h, 48)
      checks.push('Relógio cria na faixa aprovada, com tamanho e velocidade constantes')
      g.api.clearGroup(s().asteroides)
      g.api.spawn(s().asteroides, { x: 20, y: 560, w: 48, h: 48, vx: 0, vy: 2 })
      const points = s().pontos
      const life = g.api.getHealth(s().nave)
      g.tick()
      assert.equal(s().asteroides.items.length, reached('limpeza-asteroides') ? 0 : 1)
      assert.equal(s().pontos, points)
      assert.equal(g.api.getHealth(s().nave), life)
      checks.push('Saída do asteroide corresponde à etapa, sem ponto nem dano')
      g.api.clearGroup(s().asteroides)
    }
    if (reached('colisao-tiros')) {
      const points = s().pontos
      g.api.spawn(s().asteroides, { x: 100, y: 200, w: 48, h: 48, vx: 0, vy: 0 })
      g.api.spawn(s().asteroides, { x: 600, y: 200, w: 48, h: 48, vx: 0, vy: 0 })
      for (let i = 0; i < 2; i++)
        g.api.spawn(s().tiros, { x: 110, y: 210, w: 10, h: 28, vx: 0, vy: 0 })
      g.tick()
      assert.equal(s().asteroides.items.length, 1)
      assert.equal(s().asteroides.items[0].x, 600)
      assert.equal(s().tiros.items.length, 1)
      assert.equal(s().pontos, reached('pontos') ? points + 1 : points)
      checks.push('Contato retira somente o par, consome uma vez e não antecipa pontos')
      g.api.clearGroup(s().asteroides)
      g.api.clearGroup(s().tiros)
    }
    if (reached('vidas')) {
      assert.equal(g.api.getHealth(s().nave), 3)
      g.api.spawn(s().asteroides, { x: s().nave.x, y: s().nave.y, w: 48, h: 48, vx: 0, vy: 0 })
      g.tick()
      assert.equal(s().asteroides.items.length, reached('colisao-nave') ? 0 : 1)
      assert.equal(g.api.getHealth(s().nave), reached('dano') ? 2 : 3)
      checks.push('Vidas, contato e dano entram somente quando ensinados')
      g.api.clearGroup(s().asteroides)
      if (reached('dano')) {
        g.api.spawn(s().asteroides, { x: s().nave.x, y: s().nave.y, w: 48, h: 48, vx: 0, vy: 0 })
        g.tick()
        assert.equal(g.api.getHealth(s().nave), 2)
        g.tick(65)
        g.api.clearGroup(s().asteroides)
        g.api.spawn(s().asteroides, { x: s().nave.x, y: s().nave.y, w: 48, h: 48, vx: 0, vy: 0 })
        g.tick()
        assert.equal(g.api.getHealth(s().nave), 1)
        checks.push('Proteção impede dano repetido e permite nova perda depois do intervalo')
      }
    }
    if (reached('vitoria')) {
      g.api.clearGroup(s().asteroides)
      s().pontos = 20
      g.tick()
      assert(g.api.sceneIs('vitoria'))
      const x = s().nave.x
      g.key('ArrowRight')
      g.press('Space')
      g.tick(120)
      g.key('ArrowRight', false)
      assert.equal(s().nave.x, x)
      assert.equal(s().tiros.items.length, 0)
      assert.equal(s().asteroides.items.length, 0)
      g.press('Enter')
      assert(g.api.sceneIs('inicio'))
      assert.equal(s().pontos, 0)
      assert.equal(g.api.getHealth(s().nave), 3)
      assert.equal(s().nave.x, 372)
      g.press('Enter')
      g.api.setHealth(s().nave, 0)
      s().pontos = 20
      g.tick()
      assert(g.api.sceneIs(reached('derrota') ? 'derrota' : 'vitoria'))
      checks.push(
        reached('derrota')
          ? 'Resultado único: derrota tem prioridade; final bloqueia ações; reinício restaura os dados'
          : 'Vitória funciona antes da montagem da derrota; o reinício já preparado restaura os dados',
      )
    } else if (reached('pontos')) {
      s().pontos = 20
      g.tick()
      assert(g.api.sceneIs('jogando'))
      checks.push('Pontos não encerram o jogo antes da condição da vitória')
    }
    assert.equal(g.errors.length, 0, g.errors.join('\n'))
    report.push({ etapa, passed: true, checks, warnings: g.warnings })
  } finally {
    g.dispose()
  }
}
const output = resolve(import.meta.dir, '../../qa/relatorios/construtor-base-runtime-2d.json')
mkdirSync(resolve(output, '..'), { recursive: true })
const result = {
  engine:
    'Motor Jogo 2D oficial e script gerado oficial; happy-dom com Canvas2D nativo real. Sem importação pela interface do Estúdio.',
  stages: report.length,
  checkGroups: report.reduce((n, item) => n + item.checks.length, 0),
  passed: true,
  report,
}
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`)
console.log(
  JSON.stringify({ passed: true, stages: result.stages, checkGroups: result.checkGroups }),
)
