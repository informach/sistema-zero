/** Autoria de documentos. Não é runtime, currículo, nem parte importada pelo jogo. */
import type { IlhaId } from '../../../packages/arquipelago-contracts/src/ilhas'
import type { MoradorDoPedido } from '../../../packages/arquipelago-contracts/src/pedidos-entrega'
import type {
  ExecutionExpectation,
  ExecutionStep,
} from '../../../packages/core/src/learning/project-execution'
import type { SectionJavaScriptProjectCheck } from '../../../packages/core/src/learning/section-progression'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import { createEmptyProject, type ProjectAsset } from '../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import { assignStableIdsToIR } from '../../../packages/studio/src/ir/ids'
import type { JSExpr, JSStatement, SZIRV2 } from '../../../packages/studio/src/ir/schema'

/**
 * Os pedidos dos moradores das ilhas do anel (lacunas, 01/11/2026; a proposta: "Dos moradores:
 * pedidos curtos, como uma placa que acende à noite", em toda ilha). Cada morador pede uma luz
 * que acende com uma regra do jeito da ilha, só com teclas (sem caminho a pé, que depende do
 * tempo de cada passo). Pela Jornada, a primeira atividade de uma ilha reaplica o que veio antes:
 * o Bosque usa só o Faísca; as outras ilhas, os blocos do Faísca e do Construtor (contar e
 * comparar). O extra muda uma regra a mais. Feito, a placa ao lado do morador acende à noite.
 */
const bool = (value: boolean): JSExpr => ({ type: 'bool', value })
const num = (value: number): JSExpr => ({ type: 'num', value })
const v = (name: string): JSExpr => ({ type: 'var', name })
const compara = (name: string, op: '>' | '>=', value: number): JSExpr => ({
  type: 'binop',
  op,
  left: v(name),
  right: num(value),
})
const guarda = (name: string, value: boolean | number): JSStatement => ({
  type: 'assign',
  name,
  value: typeof value === 'boolean' ? bool(value) : num(value),
})
/** `name = name + delta`: vira o bloco "mudar em" (Construtor). */
const muda = (name: string, delta: number): JSStatement => ({
  type: 'assign',
  name,
  value: { type: 'binop', op: '+', left: v(name), right: num(delta) },
})
const se = (cond: JSExpr, then: JSStatement[], otherwise: JSStatement[] = []): JSStatement => ({
  type: 'if',
  cond,
  then,
  else: otherwise,
})
const image = (varName: string, asset: string): JSStatement => ({
  type: 'g2d:createImageSprite',
  varName,
  image: asset,
  x: 296,
  y: 200,
  w: 48,
  h: 48,
})
const draw = (spriteVar: string): JSStatement => ({
  type: 'g2d:drawSprite',
  ctxVar: 'ctx',
  spriteVar,
})
const label = (text: string, x: number, y: number): JSStatement => ({
  type: 'g2d:drawLabel',
  ctxVar: 'ctx',
  text,
  x,
  y,
  size: 18,
  color: '#fff3ce',
  align: 'left',
})
const key = (k: string, body: JSStatement[]): JSStatement => ({ type: 'g2d:onKey', key: k, body })

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">${body}</svg>`
const arts = {
  apagada: svg(
    '<rect x="6" y="8" width="36" height="22" rx="3" fill="#6b5a45" stroke="#3d3226" stroke-width="2"/><rect x="21" y="30" width="6" height="14" fill="#3d3226"/><path d="M12 19h24" stroke="#4a3f33" stroke-width="3"/>',
  ),
  acesa: svg(
    '<circle cx="24" cy="19" r="20" fill="#ffe27a" opacity="0.35"/><rect x="6" y="8" width="36" height="22" rx="3" fill="#ffd34d" stroke="#b8862b" stroke-width="2"/><rect x="21" y="30" width="6" height="14" fill="#3d3226"/><path d="M12 19h24" stroke="#fff7d1" stroke-width="3"/>',
  ),
}
const assets = (quem: string): ProjectAsset[] =>
  Object.entries(arts).map(([name, body]) => ({
    id: `pedido-${quem}-${name}`,
    name,
    kind: 'image',
    source: 'library',
    dataUrl: `data:image/svg+xml;base64,${Buffer.from(body).toString('base64')}`,
  }))

const press = (k: string, holdMs = 30): ExecutionStep => ({ action: 'press', key: k, holdMs })
const val = (path: string, value: boolean | number): ExecutionExpectation => ({
  target: { kind: 'value', path },
  compare: 'equals',
  value,
})
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
const S = press('Space')
const ENTER = press('Enter')

export interface PedidoDaIlha {
  quem: Exclude<MoradorDoPedido, 'nico'>
  ilha: IlhaId
  slug: string
  titulo: string
  instrucao: string
  /** O que a tela diz com a luz acesa. */
  acesa: string
  textos: Record<'kids' | 'adulto', { enunciado: string; dicas: string[]; extra: string }>
  /** A tecla do extra (o ensaio "sem o extra" esvazia o evento dela no gabarito). */
  teclaDoExtra: string
  /** As informações do começo, além de `acesa`. */
  informacoes: [string, boolean | number][]
  eventos(pronto: boolean): JSStatement[]
  objetivos(): SectionJavaScriptProjectCheck[]
}

export const PEDIDOS_DAS_ILHAS: readonly PedidoDaIlha[] = [
  {
    quem: 'capi',
    ilha: 'bosque',
    slug: 'a-lanterna-da-cabana',
    titulo: 'A lanterna da cabana',
    instrucao: 'A barra de espaço liga e desliga.',
    acesa: 'A lanterna da Capi acendeu.',
    textos: {
      kids: {
        enunciado:
          'A Capi quer uma lanterna na porta da cabana que liga e desliga no mesmo botão. Programe a barra de espaço: se a lanterna está acesa, ela apaga; senão, ela acende.',
        dicas: [
          'O evento da barra de espaço já está pronto. Dentro dele vai um Se com senão.',
          'O Se olha para acesa. Em um lado, guarde falso; no outro, guarde verdadeiro.',
        ],
        extra: 'Faça o Enter apagar a lanterna sempre, sem acender de novo.',
      },
      adulto: {
        enunciado:
          'A lanterna da Capi alterna no mesmo comando. No evento da barra de espaço, use uma decisão sobre acesa: verdadeira passa a falsa, falsa passa a verdadeira.',
        dicas: [
          'O evento da barra de espaço já existe; falta a decisão dentro dele.',
          'Cada ramo da decisão atribui um valor à variável acesa.',
        ],
        extra: 'O Enter apaga sempre: atribua falso a acesa, sem alternar.',
      },
    },
    teclaDoExtra: 'Enter',
    informacoes: [],
    eventos: (pronto) => [
      key(
        'Space',
        pronto ? [se(v('acesa'), [guarda('acesa', false)], [guarda('acesa', true)])] : [],
      ),
      key('Enter', pronto ? [guarda('acesa', false)] : []),
    ],
    objetivos: () => [
      check('liga', 'A barra de espaço acende a lanterna.', [S], val('acesa', true), [
        { afterStep: 0, expect: val('acesa', false) },
      ]),
      check('desliga', 'Apertando de novo, a lanterna apaga.', [S, S], val('acesa', false), [
        { afterStep: 1, expect: val('acesa', true) },
      ]),
      check(
        'apagar',
        'Extra: o Enter apaga sempre.',
        [S, ENTER, ENTER],
        val('acesa', false),
        [{ afterStep: 1, expect: val('acesa', true) }],
        true,
      ),
    ],
  },
  {
    quem: 'bento',
    ilha: 'vila-doce',
    slug: 'o-letreiro-da-confeitaria',
    titulo: 'O letreiro da confeitaria',
    instrucao: 'Cada espaço assa um bolo.',
    acesa: 'O letreiro do Bento acendeu.',
    textos: {
      kids: {
        enunciado:
          'O Bento quer o letreiro da confeitaria aceso quando a fornada estiver pronta. Cada barra de espaço já assa um bolo. Complete: quando bolos chegar a 3, guarde verdadeiro em acesa.',
        dicas: [
          'Dentro do evento da barra de espaço, depois de somar o bolo, vai um Se.',
          'O Se compara bolos com 3. Use maior ou igual.',
        ],
        extra: 'Faça o Enter começar uma fornada nova: bolos volta a 0 e o letreiro apaga.',
      },
      adulto: {
        enunciado:
          'O letreiro do Bento acende com a fornada completa. O evento da barra de espaço já incrementa bolos; acrescente a decisão que atribui verdadeiro a acesa quando bolos for pelo menos 3.',
        dicas: [
          'A decisão vem depois do incremento, no mesmo evento.',
          'Compare bolos com 3 usando maior ou igual.',
        ],
        extra: 'O Enter reinicia a fornada: bolos recebe 0 e acesa recebe falso.',
      },
    },
    teclaDoExtra: 'Enter',
    informacoes: [['bolos', 0]],
    eventos: (pronto) => [
      key('Space', [
        muda('bolos', 1),
        ...(pronto ? [se(compara('bolos', '>=', 3), [guarda('acesa', true)])] : []),
      ]),
      key('Enter', pronto ? [guarda('bolos', 0), guarda('acesa', false)] : []),
    ],
    objetivos: () => [
      check(
        'acende-no-terceiro',
        'O letreiro acende no terceiro bolo, não antes.',
        [S, S, S],
        val('acesa', true),
        [{ afterStep: 2, expect: val('acesa', false) }],
      ),
      check(
        'fornada-nova',
        'Extra: o Enter começa uma fornada nova.',
        [S, S, S, ENTER],
        val('bolos', 0),
        [{ afterStep: 3, expect: val('acesa', true) }],
        true,
      ),
    ],
  },
  {
    quem: 'mare',
    ilha: 'recife',
    slug: 'a-boia-de-luz',
    titulo: 'A boia de luz',
    instrucao: 'Enter baixa a maré. Espaço acende.',
    acesa: 'A boia da Maré acendeu.',
    textos: {
      kids: {
        enunciado:
          'A boia de luz da Maré só pode acender com a maré baixa. O Enter já baixa a maré. Programe a barra de espaço: se a maré está alta, nada acontece; senão, guarde verdadeiro em acesa.',
        dicas: [
          'Dentro do evento da barra de espaço vai um Se com senão que olha para mareAlta.',
          'Deixe o primeiro lado vazio e acenda a boia no senão.',
        ],
        extra: 'Faça a seta para cima subir a maré de novo e apagar a boia.',
      },
      adulto: {
        enunciado:
          'A boia acende só com a maré baixa. O Enter já atribui falso a mareAlta. No evento da barra de espaço, decida por mareAlta e atribua verdadeiro a acesa só quando ela for falsa.',
        dicas: [
          'Uma decisão com dois ramos resolve: o primeiro fica vazio.',
          'A variável mareAlta começa verdadeira.',
        ],
        extra: 'A seta para cima sobe a maré: mareAlta verdadeira e acesa falsa.',
      },
    },
    teclaDoExtra: 'ArrowUp',
    informacoes: [['mareAlta', true]],
    eventos: (pronto) => [
      key('Enter', [guarda('mareAlta', false)]),
      key('Space', pronto ? [se(v('mareAlta'), [], [guarda('acesa', true)])] : []),
      key('ArrowUp', pronto ? [guarda('mareAlta', true), guarda('acesa', false)] : []),
    ],
    objetivos: () => [
      check(
        'espera-a-mare',
        'Com a maré alta a boia não acende; depois do Enter, acende.',
        [S, ENTER, S],
        val('acesa', true),
        [{ afterStep: 1, expect: val('acesa', false) }],
      ),
      check(
        'mare-sobe',
        'Extra: a seta para cima sobe a maré e apaga a boia.',
        [ENTER, S, press('ArrowUp')],
        val('acesa', false),
        [{ afterStep: 2, expect: val('acesa', true) }],
        true,
      ),
    ],
  },
  {
    quem: 'floco',
    ilha: 'pico',
    slug: 'a-luz-do-iglu',
    titulo: 'A luz do iglu',
    instrucao: 'Cada espaço gasta uma lenha.',
    acesa: 'A luz do iglu do Floco acendeu.',
    textos: {
      kids: {
        enunciado:
          'O iglu do Floco tem duas lenhas. Programe a barra de espaço: se ainda há lenha, a luz acende e gasta uma lenha; sem lenha, a luz apaga.',
        dicas: [
          'Dentro do evento da barra de espaço vai um Se com senão que compara lenha com 0.',
          'Quando lenha for maior que 0, guarde verdadeiro em acesa e mude lenha em menos 1.',
        ],
        extra: 'Faça o Enter buscar lenha nova: lenha volta a 2.',
      },
      adulto: {
        enunciado:
          'A luz do iglu consome lenha. No evento da barra de espaço: com lenha maior que 0, atribua verdadeiro a acesa e decremente lenha; sem lenha, atribua falso a acesa.',
        dicas: ['A decisão compara lenha com 0.', 'O decremento é a mudança de lenha em menos 1.'],
        extra: 'O Enter repõe a lenha: atribua 2 a lenha.',
      },
    },
    teclaDoExtra: 'Enter',
    informacoes: [['lenha', 2]],
    eventos: (pronto) => [
      key(
        'Space',
        pronto
          ? [
              se(
                compara('lenha', '>', 0),
                [guarda('acesa', true), muda('lenha', -1)],
                [guarda('acesa', false)],
              ),
            ]
          : [],
      ),
      key('Enter', pronto ? [guarda('lenha', 2)] : []),
    ],
    objetivos: () => [
      check('acende', 'Com lenha, a barra de espaço acende a luz.', [S], val('acesa', true), [
        { afterStep: 0, expect: val('acesa', false) },
      ]),
      check('sem-lenha', 'Depois das duas lenhas, a luz apaga.', [S, S, S], val('acesa', false), [
        { afterStep: 2, expect: val('acesa', true) },
      ]),
      check(
        'buscar-lenha',
        'Extra: o Enter traz lenha nova e a luz acende de novo.',
        [S, S, S, ENTER, S],
        val('acesa', true),
        [{ afterStep: 3, expect: val('acesa', false) }],
        true,
      ),
    ],
  },
  {
    quem: 'jade',
    ilha: 'vale-dos-dinos',
    slug: 'a-fogueira-dos-ninhos',
    titulo: 'A fogueira dos ninhos',
    instrucao: 'Setas pegam lenha. Espaço acende.',
    acesa: 'A fogueira da Jade acendeu.',
    textos: {
      kids: {
        enunciado:
          'A Jade quer a fogueira dos ninhos acesa, mas só com as duas lenhas. As setas para os lados já pegam lenha1 e lenha2. Programe a barra de espaço: só com as duas, guarde verdadeiro em acesa.',
        dicas: [
          'Dentro do evento da barra de espaço vai um Se que olha para lenha1.',
          'Dentro desse Se vai outro, que olha para lenha2. Só lá dentro a fogueira acende.',
        ],
        extra: 'Faça o Enter apagar a fogueira e devolver as duas lenhas.',
      },
      adulto: {
        enunciado:
          'A fogueira acende com as duas lenhas. As setas já atribuem verdadeiro a lenha1 e lenha2. No evento da barra de espaço, atribua verdadeiro a acesa só quando as duas forem verdadeiras.',
        dicas: [
          'Duas decisões, uma dentro da outra, resolvem.',
          'A atribuição fica dentro da decisão mais interna.',
        ],
        extra: 'O Enter apaga: acesa, lenha1 e lenha2 recebem falso.',
      },
    },
    teclaDoExtra: 'Enter',
    informacoes: [
      ['lenha1', false],
      ['lenha2', false],
    ],
    eventos: (pronto) => [
      key('ArrowLeft', [guarda('lenha1', true)]),
      key('ArrowRight', [guarda('lenha2', true)]),
      key('Space', pronto ? [se(v('lenha1'), [se(v('lenha2'), [guarda('acesa', true)])])] : []),
      key(
        'Enter',
        pronto ? [guarda('acesa', false), guarda('lenha1', false), guarda('lenha2', false)] : [],
      ),
    ],
    objetivos: () => [
      check(
        'com-as-duas',
        'Com uma lenha só a fogueira espera; com as duas, acende.',
        [press('ArrowLeft'), S, press('ArrowRight'), S],
        val('acesa', true),
        [{ afterStep: 2, expect: val('acesa', false) }],
      ),
      check(
        'apagar',
        'Extra: o Enter apaga e devolve as lenhas.',
        [press('ArrowLeft'), press('ArrowRight'), S, ENTER, S],
        val('acesa', false),
        [{ afterStep: 3, expect: val('acesa', true) }],
        true,
      ),
    ],
  },
  {
    quem: 'irie',
    ilha: 'nuvens',
    slug: 'o-farol-das-nuvens',
    titulo: 'O farol das nuvens',
    instrucao: 'Acender gasta 2 de energia.',
    acesa: 'O farol da Iriê acendeu.',
    textos: {
      kids: {
        enunciado:
          'O farol das nuvens da Iriê gasta 2 de energia para acender, e a reserva começa com 3. Programe a barra de espaço: só com energia 2 ou mais, a luz acende e gasta 2. O Enter já apaga a luz.',
        dicas: [
          'Dentro do evento da barra de espaço vai um Se que compara energia com 2.',
          'Lá dentro, guarde verdadeiro em acesa e mude energia em menos 2.',
        ],
        extra: 'Faça a seta para cima recarregar a reserva: energia volta a 3.',
      },
      adulto: {
        enunciado:
          'Acender o farol custa 2 de energia, e a reserva começa em 3. No evento da barra de espaço, com energia de pelo menos 2, atribua verdadeiro a acesa e reduza energia em 2. Sem saldo, nada muda.',
        dicas: [
          'A decisão compara energia com 2 usando maior ou igual.',
          'O custo é a mudança de energia em menos 2.',
        ],
        extra: 'A seta para cima recarrega: atribua 3 a energia.',
      },
    },
    teclaDoExtra: 'ArrowUp',
    informacoes: [['energia', 3]],
    eventos: (pronto) => [
      key(
        'Space',
        pronto
          ? [se(compara('energia', '>=', 2), [guarda('acesa', true), muda('energia', -2)])]
          : [],
      ),
      key('Enter', [guarda('acesa', false)]),
      key('ArrowUp', pronto ? [guarda('energia', 3)] : []),
    ],
    objetivos: () => [
      check('acende-e-gasta', 'Acender gasta 2 de energia.', [S], val('energia', 1), [
        { afterStep: 1, expect: val('acesa', true) },
      ]),
      check(
        'sem-saldo',
        'Sem energia bastante, o farol não acende de novo.',
        [S, ENTER, S],
        val('acesa', false),
        [{ afterStep: 1, expect: val('acesa', true) }],
      ),
      check(
        'recarregar',
        'Extra: a seta para cima recarrega e o farol acende de novo.',
        [S, ENTER, press('ArrowUp'), S],
        val('acesa', true),
        [{ afterStep: 3, expect: val('energia', 3) }],
        true,
      ),
    ],
  },
]

export function projetoDoPedidoDaIlha(p: PedidoDaIlha, pronto: boolean) {
  const source: SZIRV2 = {
    version: 2,
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d' }],
    behavior: {
      start: [
        { type: 'g2d:setupStage', width: 640, height: 480, bg: '#1d2b4f' },
        { type: 'g2d:enableClassicControls', mode: 'always' },
        { type: 'var', name: 'acesa', value: bool(false) },
        ...p.informacoes.map(
          ([name, value]): JSStatement => ({
            type: 'var',
            name,
            value: typeof value === 'boolean' ? bool(value) : num(value),
          }),
        ),
        image('placa', 'apagada'),
        image('luz', 'acesa'),
      ],
      events: p.eventos(pronto),
      loops: [
        {
          type: 'g2d:updateEachFrame',
          body: [
            { type: 'g2d:clear' },
            label(p.titulo, 20, 35),
            label(p.instrucao, 20, 68),
            se(v('acesa'), [draw('luz'), label(p.acesa, 20, 120)], [draw('placa')]),
          ],
        },
      ],
    },
  }
  const ir = assignStableIdsToIR(source, `pedido-${p.quem}`)
  return {
    ...createEmptyProject(`pedido-${p.quem}-${p.slug}`, p.titulo),
    programmingLanguage: 'javascript' as const,
    mode: 'blocks' as const,
    createdAt: 0,
    updatedAt: 0,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: p.titulo }),
    assets: assets(p.quem),
    installedExtensions: [{ id: 'game-2d', version: '1.2.0', installedAt: 0 }],
  }
}
