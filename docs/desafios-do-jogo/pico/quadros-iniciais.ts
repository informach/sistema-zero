import {
  DesafioDoManifestoSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import type {
  ExecutionExpectation,
  ExecutionStep,
} from '../../../packages/core/src/learning/project-execution'
import type { SectionJavaScriptProjectCheck } from '../../../packages/core/src/learning/section-progression'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import { createEmptyProject, type Project } from '../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import { assignStableIdsToIR } from '../../../packages/studio/src/ir/ids'
import type { JSExpr, JSStatement, SZIRV2 } from '../../../packages/studio/src/ir/schema'
import { PEDIDOS_DOS_MORADORES } from '../pedidos-dos-moradores'
import { assetsDoPico } from './projetos'

const n = (value: number): JSExpr => ({ type: 'num', value })
const v = (name: string): JSExpr => ({ type: 'var', name })
const set = (name: string, value: number | JSExpr): JSStatement => ({
  type: 'assign',
  name,
  value: typeof value === 'number' ? n(value) : value,
})
const bin = (op: '===' | '<' | '>' | '+' | '-', left: JSExpr, right: JSExpr): JSExpr => ({
  type: 'binop',
  op,
  left,
  right,
})
const eq = (name: string, value: number) => bin('===', v(name), n(value))
const add = (name: string, value: number) =>
  set(name, bin(value < 0 ? '-' : '+', v(name), n(Math.abs(value))))
const iff = (cond: JSExpr, then: JSStatement[], otherwise: JSStatement[] = []): JSStatement => ({
  type: 'if',
  cond,
  then,
  else: otherwise,
})
const key = (key: string, body: JSStatement[]): JSStatement => ({ type: 'g2d:onKey', key, body })
const velocity = (vy: number | JSExpr, vx = 0): JSStatement => ({
  type: 'g2d:setVelocity',
  spriteVar: 'pinguim',
  vx: n(vx),
  vy: typeof vy === 'number' ? n(vy) : vy,
})
// Não compartilhar instâncias entre ocorrências: cada peça recebe seu próprio ID.
const apply = (): JSStatement => ({ type: 'g2d:applyVelocity', spriteVar: 'pinguim' })
const y = (): JSExpr => ({ type: 'g2d:spriteY', spriteVar: 'pinguim' })
const label = (text: string | JSExpr, x: number, y: number): JSStatement => ({
  type: 'g2d:drawLabel',
  ctxVar: 'ctx',
  text,
  x,
  y,
  size: 19,
  color: '#173956',
  align: 'left',
})

export const QUADROS_INICIAIS_DO_PICO = [
  {
    slug: 'pulo-com-apoio',
    titulo: 'Pulo com apoio',
    linhas: ['Espaço pula quando o pinguim está no chão.', 'No ar, espere o próximo pouso.'],
    texto:
      'A gravidade e o chão já funcionam. Complete Espaço: se noChao for 1, dê velocidade y negativa ao pinguim, marque noChao como 0 e some um em pulos. Teste com -10. Tocar de novo no ar não inicia outro pulo.',
    dica: 'A velocidade, a marca de apoio e a contagem ficam dentro da mesma condição.',
  },
  {
    slug: 'freio-no-gelo',
    titulo: 'Freio no gelo',
    linhas: ['O pinguim desliza. Espaço freia.', 'Depois de parar, ele fica no mesmo lugar.'],
    texto:
      'O deslize está pronto. Complete Espaço para mudar deslizando para 0 e deixar as duas velocidades do pinguim em zero. Outros toques não fazem ele andar nem mudam sua posição. Enter será o extra de uma rodada nova.',
    dica: 'Pare o estado de deslize e a velocidade. Não reinicie o jogo para frear.',
  },
  {
    slug: 'floco-recolhido',
    titulo: 'Floco recolhido',
    linhas: ['Direita leva o pinguim até o floco.', 'Encostar recolhe o floco uma única vez.'],
    texto:
      'As setas e o desenho já funcionam. Complete o contato do pinguim com floco: quando pegou for zero, marque pegou como 1, esconda o floco e some um em flocos. Ficar no lugar ou voltar não pode contar de novo.',
    dica: 'Use a marca pegou para separar o primeiro contato dos seguintes.',
  },
  {
    slug: 'mochila-de-neve',
    titulo: 'Mochila de neve',
    linhas: [
      'Esquerda leva peso 1. Direita leva peso 2.',
      'A mochila comporta até 4. Espaço esvazia.',
    ],
    texto:
      'Complete as setas para adicionar o peso escolhido somente se o total couber na mochila. O limite é 4: peso 1 cabe até 3; peso 2 cabe até 2. Espaço já esvazia a mochila. Recusar uma carga não muda o peso que já estava guardado.',
    dica: 'Confira o espaço para a carga inteira antes de somar.',
  },
  {
    slug: 'passagem-segura',
    titulo: 'Passagem segura',
    linhas: [
      'A neve está cedendo. Espere o contador zerar.',
      'Espaço atravessa a passagem uma vez.',
    ],
    texto:
      'O contador da neve e o caminho já estão prontos. Complete Espaço para marcar atravessou como 1 e somar um em passagens, apenas quando faltam for zero e atravessou ainda for zero. Antes de liberar ou depois da travessia, o contador de passagens não muda.',
    dica: 'Confira a liberação da passagem e a marca da travessia, juntas.',
  },
] as const
export type QuadroInicialDoPico = 1 | 2 | 3 | 4 | 5

export function projetoDoQuadroPico(quadro: QuadroInicialDoPico, pronto: boolean): Project {
  const meta = QUADROS_INICIAIS_DO_PICO[quadro - 1]!
  const start: JSStatement[] = [
    { type: 'g2d:setupStage', width: 640, height: 480, bg: '#dcebf7' },
    { type: 'g2d:enableClassicControls', mode: 'always' },
  ]
  const events: JSStatement[] = [key('Enter', pronto ? [{ type: 'g2d:restart' }] : [])]
  const update: JSStatement[] = []
  const draw: JSStatement[] = [
    { type: 'g2d:drawBackdrop', ctxVar: 'ctx', image: 'pico' },
    label(meta.titulo, 24, 35),
    label(meta.linhas[0], 24, 72),
    label(meta.linhas[1], 24, 103),
  ]
  const vars = (values: Record<string, number>) => {
    for (const [name, value] of Object.entries(values))
      start.push({ type: 'var', name, value: n(value) })
  }
  const image = (varName: string, image: string, x: number, y: number, w: number, h: number) => {
    start.push({ type: 'g2d:createImageSprite', varName, image, x, y, w, h })
    draw.push({ type: 'g2d:drawSprite', ctxVar: 'ctx', spriteVar: varName })
  }
  const soDesenharSe = (spriteVar: string, cond: JSExpr) => {
    const i = draw.findIndex((d) => d.type === 'g2d:drawSprite' && d.spriteVar === spriteVar)
    const desenho = draw[i]
    if (!desenho) throw new Error(`desenho de ${spriteVar} ausente`)
    draw[i] = iff(cond, [desenho])
  }
  const value = (text: string, name: string, y: number) =>
    draw.push(label(text, 24, y), label(v(name), 320, y))
  if (quadro === 1) {
    vars({ noChao: 1, pulos: 0 })
    image('pinguim', 'pinguim', 280, 300, 44, 48)
    image('chao', 'gelo', 120, 348, 400, 40)
    events.push(
      key(
        'Space',
        pronto ? [iff(eq('noChao', 1), [velocity(-10), set('noChao', 0), add('pulos', 1)])] : [],
      ),
    )
    update.push(
      { type: 'g2d:applyGravity', spriteVar: 'pinguim' },
      apply(),
      iff(bin('>', y(), n(299)), [
        velocity(bin('-', n(300), y())),
        apply(),
        velocity(0),
        set('noChao', 1),
      ]),
    )
    value('Pulos:', 'pulos', 420)
  } else if (quadro === 2) {
    vars({ deslizando: 1 })
    image('pinguim', 'pinguim', 160, 260, 44, 48)
    image('chao', 'gelo', 60, 308, 520, 40)
    start.push(velocity(0, 1))
    events.push(key('Space', pronto ? [set('deslizando', 0), velocity(0)] : []))
    update.push(iff(eq('deslizando', 1), [apply()]), {
      type: 'g2d:clampToScreen',
      spriteVar: 'pinguim',
      ctxVar: 'ctx',
    })
    value('Deslizando:', 'deslizando', 420)
  } else if (quadro === 3) {
    vars({ pegou: 0, flocos: 0 })
    image('pinguim', 'pinguim', 80, 260, 44, 48)
    image('floco', 'floco', 270, 260, 32, 48)
    image('chao', 'gelo', 60, 308, 520, 40)
    events.push({
      type: 'g2d:onOverlap',
      aVar: 'pinguim',
      bVar: 'floco',
      body: pronto ? [iff(eq('pegou', 0), [set('pegou', 1), add('flocos', 1)])] : [],
    })
    update.push(
      { type: 'g2d:arrowsX', spriteVar: 'pinguim', speed: 3 },
      { type: 'g2d:clampToScreen', spriteVar: 'pinguim', ctxVar: 'ctx' },
    )
    // O floco só é desenhado até ser recolhido (pronto no cenário; sem opacidade, C01b).
    soDesenharSe('floco', eq('pegou', 0))
    value('Flocos:', 'flocos', 420)
  } else if (quadro === 4) {
    vars({ peso: 0 })
    image('pinguim', 'pinguim', 280, 260, 44, 48)
    image('carga1', 'floco', 140, 260, 40, 40)
    image('carga2', 'floco', 400, 240, 70, 70)
    events.push(
      key('ArrowLeft', pronto ? [iff(bin('<', v('peso'), n(4)), [add('peso', 1)])] : []),
      key('ArrowRight', pronto ? [iff(bin('<', v('peso'), n(3)), [add('peso', 2)])] : []),
      key('Space', [set('peso', 0)]),
    )
    value('Peso na mochila:', 'peso', 420)
  } else {
    vars({ faltam: 120, atravessou: 0, passagens: 0 })
    image('pinguim', 'pinguim', 160, 260, 44, 48)
    image('barreira', 'gelo', 320, 240, 60, 100)
    image('bandeira', 'bandeira', 500, 228, 40, 80)
    soDesenharSe('barreira', bin('>', v('faltam'), n(0)))
    events.push(
      key(
        'Space',
        pronto
          ? [
              iff(eq('faltam', 0), [
                iff(eq('atravessou', 0), [set('atravessou', 1), add('passagens', 1)]),
              ]),
            ]
          : [],
      ),
    )
    update.push(
      iff(bin('>', v('faltam'), n(0)), [add('faltam', -1)]),
      iff(eq('atravessou', 1), [
        iff(bin('<', { type: 'g2d:spriteX', spriteVar: 'pinguim' }, n(500)), [
          velocity(0, 2),
          apply(),
        ]),
      ]),
    )
    value('Neve cedendo:', 'faltam', 380)
    value('Passagens:', 'passagens', 420)
  }
  draw.push(label('Enter: nova rodada depois de completar o extra.', 24, 445))
  const ir = assignStableIdsToIR(
    {
      version: 2,
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-2d' }],
      behavior: {
        start,
        events,
        loops: [{ type: 'g2d:updateEachFrame', body: [...update, { type: 'g2d:clear' }, ...draw] }],
      },
    } satisfies SZIRV2,
    `pico-quadro-${quadro}`,
  )
  return {
    ...createEmptyProject(`pico-${meta.slug}`, meta.titulo),
    programmingLanguage: 'javascript',
    mode: 'blocks',
    createdAt: 0,
    updatedAt: 0,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: meta.titulo }),
    assets: assetsDoPico,
    installedExtensions: [{ id: 'game-2d', version: '1.2.0', installedAt: 0 }],
  }
}

const press = (key: string, holdMs = 30): ExecutionStep => ({ action: 'press', key, holdMs })
const wait = (ms: number): ExecutionStep => ({ action: 'wait', ms })
const val = (
  path: string,
  value: number,
  compare: ExecutionExpectation['compare'] = 'equals',
): ExecutionExpectation => ({ target: { kind: 'value', path }, compare, value })
const at = (
  afterStep: number,
  path: string,
  value: number,
  compare: ExecutionExpectation['compare'] = 'equals',
) => ({ afterStep, expect: val(path, value, compare) })
export function objetivosDoQuadroPico(
  quadro: QuadroInicialDoPico,
): SectionJavaScriptProjectCheck[] {
  const check = (
    id: string,
    label: string,
    steps: ExecutionStep[],
    path: string,
    expected: number,
    checkpoints: ReturnType<typeof at>[] = [],
  ): SectionJavaScriptProjectCheck => ({
    id,
    label,
    programmingLanguage: 'javascript',
    rule: { type: 'behavior', steps, expect: val(path, expected), checkpoints },
  })
  const passos =
    quadro === 3
      ? [press('ArrowRight', 1000)]
      : quadro === 4
        ? [press('ArrowRight'), press('ArrowLeft')]
        : quadro === 5
          ? [wait(2400), press('Space')]
          : [press('Space')]
  const alvo =
    quadro === 1
      ? 'pulos'
      : quadro === 2
        ? 'deslizando'
        : quadro === 3
          ? 'flocos'
          : quadro === 4
            ? 'peso'
            : 'passagens'
  const inicio = quadro === 2 ? 1 : 0
  const fim = quadro === 2 ? 0 : quadro === 4 ? 3 : 1
  const checks = [
    check(
      'acao',
      PEDIDOS_DOS_MORADORES[QUADROS_INICIAIS_DO_PICO[quadro - 1]!.slug]!.objetivo,
      passos,
      alvo,
      fim,
      [
        at(0, alvo, inicio),
        ...(quadro === 1 ? [at(1, 'noChao', 0), at(1, 'pinguim.y', 295, 'lessThan')] : []),
      ],
    ),
  ]
  if (quadro === 1)
    checks.push(
      check(
        'apoio',
        'O pulo sobe, espera o pouso e pode começar de novo.',
        [press('Space'), wait(160), press('Space'), wait(1200), press('Space')],
        'pulos',
        2,
        [
          at(2, 'pinguim.y', 300, 'lessThan'),
          at(3, 'pulos', 1),
          at(4, 'noChao', 1),
          at(5, 'noChao', 0),
        ],
      ),
    )
  if (quadro === 2)
    checks.push(
      check(
        'parada',
        'Frear zera a velocidade e conserva a parada.',
        [wait(200), press('Space'), wait(1000), press('Space'), wait(200)],
        'deslizando',
        0,
        [
          at(2, 'pinguim.vx', 0),
          at(3, 'pinguim.x', 240, 'lessThan'),
          at(3, 'pinguim.x', 160, 'greaterThan'),
          at(4, 'pinguim.vx', 0),
        ],
      ),
    )
  if (quadro === 3)
    checks.push(
      check(
        'uma-vez',
        'Só o contato recolhe o floco, uma única vez.',
        [wait(300), press('ArrowRight', 1000), press('ArrowLeft', 1000), press('ArrowRight', 1000)],
        'flocos',
        1,
        [at(1, 'flocos', 0), at(2, 'pegou', 1), at(3, 'flocos', 1)],
      ),
    )
  if (quadro === 4)
    checks.push(
      check(
        'capacidade',
        'A carga inteira cabe no limite e a mochila pode ser esvaziada.',
        [
          press('ArrowRight'),
          press('ArrowLeft'),
          press('ArrowRight'),
          press('ArrowLeft'),
          press('ArrowLeft'),
          press('Space'),
          press('ArrowRight'),
          press('ArrowRight'),
        ],
        'peso',
        4,
        [at(3, 'peso', 3), at(5, 'peso', 4), at(6, 'peso', 0)],
      ),
    )
  if (quadro === 5)
    checks.push(
      check(
        'espera',
        'A travessia espera a passagem e não se repete.',
        [press('Space'), wait(2400), press('Space'), press('Space')],
        'passagens',
        1,
        [at(1, 'passagens', 0), at(2, 'faltam', 0), at(3, 'atravessou', 1)],
      ),
    )
  checks.push({
    ...check(
      'recomecar',
      'Extra: Enter começa outra rodada.',
      [...passos, press('Enter')],
      alvo,
      inicio,
      [at(passos.length, alvo, fim)],
    ),
    optional: true,
  })
  return checks
}

export function desafiosIniciaisDoPico(publico: PublicoDoDesafio) {
  return QUADROS_INICIAIS_DO_PICO.map((meta, i) => {
    const quadro = (i + 1) as QuadroInicialDoPico
    const moedas = MOEDAS_PADRAO_POR_TIPO['quadro-das-cores']
    return DesafioDoManifestoSchema.parse({
      slug: `pico-${meta.slug}${publico === 'adulto' ? '-adulto' : ''}`,
      publico,
      ilha: 'pico',
      tipo: 'quadro-das-cores',
      quadro,
      ordem: quadro * 10,
      // C01b: todas as fontes na trilha; a importação continua com a equipe.
      publicar: true,
      conteudo: {
        versao: 1,
        titulo: meta.titulo,
        // A44: o pedido do morador; o texto técnico de antes vira a primeira dica.
        enunciado: PEDIDOS_DOS_MORADORES[meta.slug]!.pedido,
        dicas: [
          meta.texto,
          meta.dica,
          'Cenário e movimento já estão prontos. Complete apenas os eventos indicados.',
        ],
        projetoInicial: projetoDoQuadroPico(quadro, false),
        gabarito: projetoDoQuadroPico(quadro, true),
        objetivos: objetivosDoQuadroPico(quadro),
        desafioExtra: {
          titulo: 'Mais um desafio',
          texto: 'Complete Enter para começar uma nova rodada do início.',
        },
        recompensa: {
          cor: true,
          atracao: `pico-${meta.slug}`,
          moedas: moedas.principal,
          moedasExtra: moedas.extra,
        },
        blocosManuais: { acrescentar: [], retirar: [] },
      },
    })
  })
}
