/** Autoria de documentos. Não é runtime, currículo, nem parte importada pelo jogo. */
import type {
  ExecutionExpectation,
  ExecutionStep,
} from '../../../packages/core/src/learning/project-execution'
import type { SectionJavaScriptProjectCheck } from '../../../packages/core/src/learning/section-progression'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import {
  createEmptyProject,
  type Project,
  type ProjectAsset,
} from '../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import { assignStableIdsToIR } from '../../../packages/studio/src/ir/ids'
import type { JSExpr, JSStatement, SZIRV2 } from '../../../packages/studio/src/ir/schema'

/**
 * O Pega-conchas da sua ilha (C03a, 30/10/2026): seis quadros do posto Faísca, só com os blocos da
 * trilha dele (evento, ação, informação verdadeira ou falsa, se/senão, posição e reinício). As
 * posições e os tempos de tecla são os mesmos dos quadros do Bosque, já conferidos no executor.
 */
const bool = (value: boolean): JSExpr => ({ type: 'bool', value })
const v = (name: string): JSExpr => ({ type: 'var', name })
const assign = (name: string, value: boolean): JSStatement => ({
  type: 'assign',
  name,
  value: bool(value),
})
const iff = (name: string, then: JSStatement[], otherwise: JSStatement[] = []): JSStatement => ({
  type: 'if',
  cond: v(name),
  then,
  else: otherwise,
})
const image = (varName: string, asset: string, x: number, y: number): JSStatement => ({
  type: 'g2d:createImageSprite',
  varName,
  image: asset,
  x,
  y,
  w: 48,
  h: 48,
})
const draw = (spriteVar: string): JSStatement => ({
  type: 'g2d:drawSprite',
  ctxVar: 'ctx',
  spriteVar,
})
const label = (text: string | JSExpr, x: number, y: number): JSStatement => ({
  type: 'g2d:drawLabel',
  ctxVar: 'ctx',
  text,
  x,
  y,
  size: 18,
  color: '#1d4f63',
  align: 'left',
})
const key = (key: string, body: JSStatement[]): JSStatement => ({ type: 'g2d:onKey', key, body })
const contact = (bVar: string, body: JSStatement[]): JSStatement => ({
  type: 'g2d:onOverlap',
  aVar: 'guia',
  bVar,
  body,
})
const destroy = (spriteVar: string): JSStatement => ({ type: 'g2d:destroySprite', spriteVar })
/** Um bloco novo a cada uso: o mesmo objeto em dois eventos repete o identificador. */
const restart = (): JSStatement => ({ type: 'g2d:restart' })

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">${body}</svg>`
const arts = {
  guia: svg(
    '<circle cx="24" cy="25" r="18" fill="#f2b84b"/><circle cx="18" cy="21" r="3" fill="#3b2a1a"/><circle cx="30" cy="21" r="3" fill="#3b2a1a"/><path d="M17 31q7 6 14 0" fill="none" stroke="#3b2a1a" stroke-width="2"/><path d="M14 10l6 6m14-6-6 6" stroke="#3b2a1a" stroke-width="2"/>',
  ),
  concha: svg(
    '<path d="M24 6C10 8 4 24 8 38h32c4-14-2-30-16-32Z" fill="#f7c9b8" stroke="#c9826d" stroke-width="2"/><path d="M24 8v30M16 12l-4 26m20-26 4 26" stroke="#c9826d" stroke-width="2"/><rect x="16" y="38" width="16" height="5" rx="2" fill="#c9826d"/>',
  ),
  rosa: svg(
    '<path d="M24 6C10 8 4 24 8 38h32c4-14-2-30-16-32Z" fill="#ee7fa4" stroke="#b44a72" stroke-width="2"/><path d="M24 8v30M16 12l-4 26m20-26 4 26" stroke="#b44a72" stroke-width="2"/><rect x="16" y="38" width="16" height="5" rx="2" fill="#b44a72"/>',
  ),
  cinza: svg(
    '<path d="M24 6C10 8 4 24 8 38h32c4-14-2-30-16-32Z" fill="#c9cbc8" stroke="#888b86" stroke-width="2"/><path d="M24 8v30M16 12l-4 26m20-26 4 26" stroke="#888b86" stroke-width="2"/><rect x="16" y="38" width="16" height="5" rx="2" fill="#888b86"/>',
  ),
  balde: svg(
    '<path d="M10 16h28l-4 28H14Z" fill="#4aa3c9" stroke="#24617c" stroke-width="2"/><path d="M12 16q12-14 24 0" fill="none" stroke="#24617c" stroke-width="3"/><path d="M12 24h24" stroke="#d8f0f8" stroke-width="3"/>',
  ),
}
const assets: ProjectAsset[] = Object.entries(arts).map(([name, body]) => ({
  id: `sua-ilha-${name}`,
  name,
  kind: 'image',
  source: 'library',
  dataUrl: `data:image/svg+xml;base64,${Buffer.from(body).toString('base64')}`,
}))

export const QUADROS_DA_SUA_ILHA = [
  {
    slug: 'passos-na-areia',
    titulo: 'Passos na areia',
    instrucao: 'As setas levam o guia pela praia.',
    texto:
      'A praia está pronta, mas o guia ainda não sai do lugar. No laço que roda a cada quadro, faça as setas moverem o guia. Ele precisa continuar dentro da praia, sem passar da borda da tela.',
    dica: 'Use o bloco que move com as setas visto de cima e o bloco que segura o personagem na tela.',
  },
  {
    slug: 'a-primeira-concha',
    titulo: 'A primeira concha',
    instrucao: 'Leve o guia até a concha.',
    texto:
      'Há uma concha na areia. No contato do guia com a concha, guarde verdadeiro em temConcha e tire a concha da areia. Assim o guia lembra que pegou a concha, e ela não aparece de novo.',
    dica: 'O evento de contato já está no espaço de blocos. Dentro dele vão duas ações.',
  },
  {
    slug: 'o-balde-do-nico',
    titulo: 'O balde do Nico',
    instrucao: 'Pegue a concha e leve ao balde.',
    texto:
      'O Nico guarda as conchas num balde. No contato com o balde, entregue só se o guia tiver a concha: marque entregue e deixe temConcha falso. Sem a concha, use o Senão para marcar pediu, e o Nico pede uma concha.',
    dica: 'A informação temConcha decide. O Se entrega, o Senão pede.',
  },
  {
    slug: 'a-concha-rosa',
    titulo: 'A concha rosa',
    instrucao: 'O Nico quer a concha rosa, a do alto.',
    texto:
      'Agora há duas conchas. A cinza fica no caminho e já marca temCinza. A rosa fica mais no alto. Pegue a rosa guardando temRosa e tirando a concha da areia. No balde, entregue só com a rosa. Com a cinza ou sem nada, o Senão marca pediu.',
    dica: 'Só uma das duas informações decide a entrega. A cinza não serve para o Nico.',
  },
  {
    slug: 'a-mare-volta',
    titulo: 'A maré volta',
    instrucao: 'Entregue a concha. Depois, Enter recomeça a praia.',
    texto:
      'O jogo da concha já funciona. Falta recomeçar: complete o evento da tecla Enter para que a praia volte como era, com a concha na areia, o guia no começo e nada entregue.',
    dica: 'Há um bloco que recomeça o jogo inteiro. Ele vai dentro do evento da tecla Enter.',
  },
  {
    slug: 'pega-conchas',
    titulo: 'Pega-conchas',
    instrucao: 'Pegue as três conchas e leve ao balde.',
    texto:
      'Três conchas esperam na praia, uma delas no alto. Cada concha guarda a própria informação quando o guia encosta e sai da areia. O balde só fica cheio se as três foram pegas. Com alguma faltando, o balde continua esperando.',
    dica: 'Use pegou1, pegou2 e pegou3. Um Se dentro do outro confere as três antes de encher o balde.',
  },
] as const
export type QuadroDaSuaIlha = 1 | 2 | 3 | 4 | 5 | 6

export function projetoDoQuadro(quadro: QuadroDaSuaIlha, pronto: boolean): Project {
  const meta = QUADROS_DA_SUA_ILHA[quadro - 1]!
  const start: JSStatement[] = [
    { type: 'g2d:setupStage', width: 640, height: 480, bg: '#f6e7c1' },
    { type: 'g2d:enableClassicControls', mode: 'always' },
    image('guia', 'guia', 48, 240),
  ]
  const events: JSStatement[] = [key('Enter', pronto ? [restart()] : [])]
  const movement: JSStatement[] =
    quadro === 1 && !pronto
      ? []
      : [
          { type: 'g2d:topDown', spriteVar: 'guia', speed: 4 },
          { type: 'g2d:clampToScreen', spriteVar: 'guia', ctxVar: 'ctx' },
        ]
  const drawing: JSStatement[] = [label(meta.titulo, 20, 35), label(meta.instrucao, 20, 68)]
  const informacoes = (...names: string[]) =>
    start.push(...names.map((name): JSStatement => ({ type: 'var', name, value: bool(false) })))
  // Do quadro 5 em diante o jogo da concha já vem pronto: o objetivo é outro.
  const feito = (q: QuadroDaSuaIlha) => pronto || quadro > q
  if (quadro === 2 || quadro === 3 || quadro === 5) {
    informacoes('temConcha')
    start.push(image('concha', 'concha', 220, 240))
    events.push(contact('concha', feito(2) ? [assign('temConcha', true), destroy('concha')] : []))
    drawing.push(draw('concha'))
  }
  if (quadro === 3 || quadro === 5) {
    informacoes('entregue', 'pediu')
    start.push(image('balde', 'balde', 480, 240))
    events.push(
      contact(
        'balde',
        feito(3)
          ? [
              iff(
                'temConcha',
                [assign('entregue', true), assign('temConcha', false)],
                [assign('pediu', true)],
              ),
            ]
          : [],
      ),
    )
    drawing.push(
      draw('balde'),
      iff('entregue', [label('Concha entregue ao Nico.', 20, 120)]),
      iff('pediu', [label('O Nico pede uma concha.', 20, 150)]),
    )
  }
  if (quadro === 4) {
    informacoes('temCinza', 'temRosa', 'entregue', 'pediu')
    start.push(
      image('cinza', 'cinza', 220, 240),
      image('rosa', 'rosa', 350, 120),
      image('balde', 'balde', 480, 240),
    )
    events.push(
      contact('cinza', [assign('temCinza', true), destroy('cinza')]),
      contact('rosa', pronto ? [assign('temRosa', true), destroy('rosa')] : []),
      contact(
        'balde',
        pronto
          ? [
              iff(
                'temRosa',
                [assign('entregue', true), assign('temRosa', false)],
                [assign('pediu', true)],
              ),
            ]
          : [],
      ),
    )
    drawing.push(
      draw('cinza'),
      draw('rosa'),
      draw('balde'),
      iff('entregue', [label('A concha rosa chegou ao Nico.', 20, 120)]),
      iff('pediu', [label('O Nico pede a concha rosa.', 20, 150)]),
    )
  }
  if (quadro === 6) {
    informacoes('pegou1', 'pegou2', 'pegou3', 'cheio')
    const lugares = [
      [200, 240],
      [330, 120],
      [460, 240],
    ] as const
    for (const [i, [x, y]] of lugares.entries()) {
      const nome = `concha${i + 1}`
      start.push(image(nome, i === 1 ? 'rosa' : 'concha', x, y))
      events.push(contact(nome, pronto ? [assign(`pegou${i + 1}`, true), destroy(nome)] : []))
      drawing.push(draw(nome))
    }
    start.push(image('balde', 'balde', 560, 240))
    events.push(
      contact(
        'balde',
        pronto ? [iff('pegou1', [iff('pegou2', [iff('pegou3', [assign('cheio', true)])])])] : [],
      ),
    )
    drawing.push(draw('balde'), iff('cheio', [label('O balde do Nico está cheio.', 20, 120)]))
  }
  if (quadro === 5 && pronto) events.push(key('Space', [restart()]))
  drawing.push(draw('guia'))
  const source: SZIRV2 = {
    version: 2,
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d' }],
    behavior: {
      start,
      events,
      loops: [
        { type: 'g2d:updateEachFrame', body: [...movement, { type: 'g2d:clear' }, ...drawing] },
      ],
    },
  }
  const ir = assignStableIdsToIR(source, `sua-ilha-quadro-${quadro}`)
  return {
    ...createEmptyProject(`sua-ilha-${meta.slug}`, meta.titulo),
    programmingLanguage: 'javascript',
    mode: 'blocks',
    createdAt: 0,
    updatedAt: 0,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: meta.titulo }),
    assets,
    installedExtensions: [{ id: 'game-2d', version: '1.2.0', installedAt: 0 }],
  }
}

const press = (key: string, holdMs = 30): ExecutionStep => ({ action: 'press', key, holdMs })
const right = (ms: number) => press('ArrowRight', ms)
const val = (
  path: string,
  value: boolean | number,
  compare: ExecutionExpectation['compare'] = 'equals',
): ExecutionExpectation => ({ target: { kind: 'value', path }, compare, value })
const check = (
  id: string,
  label: string,
  steps: ExecutionStep[],
  expect: ExecutionExpectation,
  checkpoints: { afterStep: number; expect: ExecutionExpectation }[] = [],
  optional = false,
): SectionJavaScriptProjectCheck => ({
  id,
  label,
  programmingLanguage: 'javascript',
  ...(optional ? { optional: true } : {}),
  rule: { type: 'behavior', steps, expect, ...(checkpoints.length ? { checkpoints } : {}) },
})

/** A reta da praia: passa pelo que está no chão (x 220 e 480) e chega à borda. */
const RETA = [right(650), right(1700)]
/** Pelo alto até o balde (x 480): passa pela concha do alto e desce no balde. */
const PELO_ALTO = [press('ArrowUp', 400), right(1800), press('ArrowDown', 400)]

export function objetivosDoQuadro(quadro: QuadroDaSuaIlha): SectionJavaScriptProjectCheck[] {
  const recomecar = (
    passos: ExecutionStep[],
    final: ExecutionExpectation,
    inicio: ExecutionExpectation,
  ) =>
    check(
      'recomecar',
      'Extra: Enter recomeça a praia.',
      [...passos, press('Enter')],
      inicio,
      [{ afterStep: passos.length, expect: final }],
      true,
    )
  if (quadro === 1)
    return [
      check(
        'andar',
        'A seta para a direita leva o guia pela areia.',
        [right(650)],
        val('guia.x', 100, 'greaterThan'),
      ),
      check(
        'na-praia',
        'Segurando a seta, o guia para na borda da tela.',
        [right(4000)],
        val('guia.x', 600, 'lessThan'),
        [{ afterStep: 1, expect: val('guia.x', 400, 'greaterThan') }],
      ),
      recomecar([right(650)], val('guia.x', 100, 'greaterThan'), val('guia.x', 48)),
    ]
  if (quadro === 2)
    return [
      check(
        'pegar',
        'No contato, o guia guarda que tem a concha.',
        [right(650)],
        val('temConcha', true),
        [{ afterStep: 0, expect: val('temConcha', false) }],
      ),
      check(
        'so-no-contato',
        'Passar por cima da concha não pega; descer até ela pega.',
        [press('ArrowUp', 400), right(650), press('ArrowDown', 400)],
        val('temConcha', true),
        [{ afterStep: 2, expect: val('temConcha', false) }],
      ),
      recomecar([right(650)], val('temConcha', true), val('temConcha', false)),
    ]
  if (quadro === 3)
    return [
      check('entregar', 'Pegue a concha e entregue no balde.', RETA, val('entregue', true), [
        { afterStep: 0, expect: val('entregue', false) },
      ]),
      check(
        'sem-concha',
        'Sem a concha, o balde marca que o Nico pediu.',
        PELO_ALTO,
        val('pediu', true),
      ),
      check(
        'buscar-e-voltar',
        'Sem a concha o balde espera; buscar a concha e voltar entrega.',
        [...PELO_ALTO, press('ArrowLeft', 1100), right(1100)],
        val('entregue', true),
        [{ afterStep: 3, expect: val('entregue', false) }],
      ),
      recomecar(RETA, val('entregue', true), val('entregue', false)),
    ]
  if (quadro === 4)
    return [
      check(
        'com-rosa',
        'Pela concha rosa, o balde recebe a entrega.',
        PELO_ALTO,
        val('entregue', true),
        [{ afterStep: 0, expect: val('entregue', false) }],
      ),
      check(
        'cinza-nao-vale',
        'Só com a cinza, o Nico pede a rosa e nada é entregue.',
        RETA,
        val('entregue', false),
        [{ afterStep: 2, expect: val('pediu', true) }],
      ),
      recomecar(PELO_ALTO, val('entregue', true), val('entregue', false)),
    ]
  if (quadro === 5)
    return [
      check(
        'recomecar',
        'Depois da entrega, Enter traz a praia de volta.',
        [...RETA, press('Enter')],
        val('entregue', false),
        [{ afterStep: 2, expect: val('entregue', true) }],
      ),
      check(
        'concha-volta',
        'Enter devolve a concha para a areia.',
        [right(650), press('Enter')],
        val('temConcha', false),
        [{ afterStep: 1, expect: val('temConcha', true) }],
      ),
      check(
        'espaco',
        'Extra: a barra de espaço também recomeça.',
        [...RETA, press('Space')],
        val('entregue', false),
        [{ afterStep: 2, expect: val('entregue', true) }],
        true,
      ),
    ]
  const tres = [right(650), press('ArrowUp', 400), right(600), press('ArrowDown', 400), right(1700)]
  return [
    check('cheio', 'Com as três conchas, o balde fica cheio.', tres, val('cheio', true), [
      { afterStep: 0, expect: val('cheio', false) },
    ]),
    check(
      'faltou-uma',
      'Sem a concha do alto, o balde continua esperando.',
      RETA,
      val('cheio', false),
      [{ afterStep: 2, expect: val('pegou3', true) }],
    ),
    recomecar(tres, val('cheio', true), val('cheio', false)),
  ]
}
