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
import {
  createEmptyProject,
  type Project,
  type ProjectAsset,
} from '../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import { assignStableIdsToIR } from '../../../packages/studio/src/ir/ids'
import type { JSExpr, JSStatement, SZIRV2 } from '../../../packages/studio/src/ir/schema'

const n = (value: number): JSExpr => ({ type: 'num', value })
const v = (name: string): JSExpr => ({ type: 'var', name })
const set = (name: string, value: number | JSExpr): JSStatement => ({
  type: 'assign',
  name,
  value: typeof value === 'number' ? n(value) : value,
})
const bin = (op: '===' | '<' | '>' | '+' | '-' | '*', left: JSExpr, right: JSExpr): JSExpr => ({
  type: 'binop',
  op,
  left,
  right,
})
const eq = (name: string, value: number) => bin('===', v(name), n(value))
const add = (name: string, value: number | JSExpr) =>
  set(
    name,
    bin(
      typeof value === 'number' && value < 0 ? '-' : '+',
      v(name),
      typeof value === 'number' ? n(Math.abs(value)) : value,
    ),
  )
const velocity = (spriteVar: string, vx: number, vy: number): JSStatement => ({
  type: 'g2d:setVelocity',
  spriteVar,
  vx: n(vx),
  vy: n(vy),
})
const apply = (spriteVar: string): JSStatement => ({ type: 'g2d:applyVelocity', spriteVar })
const iff = (cond: JSExpr, then: JSStatement[], otherwise: JSStatement[] = []): JSStatement => ({
  type: 'if',
  cond,
  then,
  else: otherwise,
})
const key = (key: string, body: JSStatement[]): JSStatement => ({ type: 'g2d:onKey', key, body })
const label = (text: string | JSExpr, x: number, y: number): JSStatement => ({
  type: 'g2d:drawLabel',
  ctxVar: 'ctx',
  text,
  x,
  y,
  size: 19,
  color: '#123d55',
  align: 'left',
})

export const QUADROS_INICIAIS_DO_RECIFE = [
  {
    slug: 'a-corrente-muda',
    titulo: 'A corrente muda',
    linhas: ['Espaço muda o sentido da corrente.', '1 vai para a direita. 0 vai para a esquerda.'],
    texto:
      'A concha já segue a corrente. Complete Espaço para alternar direita entre 1 e 0: se vale 1, passe para 0; senão, passe para 1. Cada toque troca o sentido, sem alterar o movimento pronto.',
    dica: 'Use Se e Senão no mesmo evento. Duas condições seguidas podem desfazer a troca.',
  },
  {
    slug: 'conchas-por-viagem',
    titulo: 'Conchas por viagem',
    linhas: [
      'Esquerda recolhe uma concha. A cesta leva três.',
      'Direita guarda toda a cesta na caixa.',
    ],
    texto:
      'Complete a seta esquerda para somar uma concha em cesta somente quando ela tiver menos de três. Na seta direita, some a cesta em guardadas e deixe cesta em zero. Descarregar de novo não duplica conchas, e a próxima viagem começa com a cesta vazia.',
    dica: 'Na entrega, some a quantidade que já está na cesta antes de esvaziá-la.',
  },
  {
    slug: 'dois-corais-cuidados',
    titulo: 'Dois corais cuidados',
    linhas: [
      'Esquerda escolhe coral 1. Direita escolhe coral 2.',
      'Espaço cuida do coral escolhido, uma vez.',
    ],
    texto:
      'As setas escolhem o coral. Complete Espaço: para o coral 1, confira se cuidado1 é zero; então marque 1 e some um em cuidados. Faça o equivalente com cuidado2 para o coral 2. A ordem é livre, mas cada coral conta uma única vez.',
    dica: 'Cada coral precisa da própria marca. Cuidar de um não muda a marca do outro.',
  },
  {
    slug: 'uma-bolha-por-vez',
    titulo: 'Uma bolha por vez',
    linhas: ['Espaço solta uma bolha.', 'Espere ela voltar antes de soltar a próxima.'],
    texto:
      'O voo e a volta da bolha já estão prontos. Complete Espaço: quando emVoo for zero, marque emVoo como 1 e some um em lancamentos. Enquanto ela vai e volta, novos toques esperam. Quando voltar, o cenário libera outra tentativa.',
    dica: 'As duas ações ficam dentro da condição de que não há bolha em voo.',
  },
  {
    slug: 'a-chave-do-navio',
    titulo: 'A chave do navio',
    linhas: [
      'Esquerda pega a chave. Espaço abre o baú.',
      'A chave abre o baú uma vez e fica usada.',
    ],
    texto:
      'A seta esquerda já pega a chave enquanto o baú está fechado. Complete Espaço para abrir só quando chave for 1 e aberto for zero. Marque aberto como 1, deixe chave em zero e some um em aberturas. Sem chave ou depois de abrir, não acontece uma nova abertura.',
    dica: 'Confira as duas informações antes de abrir. Use a chave e registre a abertura na mesma condição.',
  },
] as const
export type QuadroInicialDoRecife = 1 | 2 | 3 | 4 | 5

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">${body}</svg>`
const imagens = {
  concha: svg(
    '<path d="M16 88Q-1 38 25 27q12-21 30-8q21-17 35 5q30 9 14 65L60 109Z" fill="#edb8d7" stroke="#85587e" stroke-width="4"/><path d="m60 101-33-69m33 69L54 25m6 76 25-70m-25 70 40-43" fill="none" stroke="#fce4f2" stroke-width="5"/>',
  ),
  coral: svg(
    '<path d="M60 110V30m0 50L25 58V30m35 30 30-22V13m-30 80L95 80V58M60 43 42 25V9" fill="none" stroke="#db8299" stroke-width="13" stroke-linecap="round"/><path d="M22 111h78" stroke="#b57b61" stroke-width="12" stroke-linecap="round"/>',
  ),
  /** O coral ainda sem cuidado, desbotado pelo Cinza (troca de imagem no lugar da opacidade). */
  'coral-cinza': svg(
    '<path d="M60 110V30m0 50L25 58V30m35 30 30-22V13m-30 80L95 80V58M60 43 42 25V9" fill="none" stroke="#c9c3c6" stroke-width="13" stroke-linecap="round"/><path d="M22 111h78" stroke="#a9a29d" stroke-width="12" stroke-linecap="round"/>',
  ),
  bolha: svg(
    '<circle cx="60" cy="60" r="48" fill="#bcf5fa" fill-opacity=".7" stroke="#4ca3bf" stroke-width="5"/><path d="M28 51q5-19 24-22" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round"/>',
  ),
  bau: svg(
    '<path d="M12 53q0-34 48-34t48 34v51H12Z" fill="#bd8056" stroke="#624734" stroke-width="5"/><path d="M12 58h96M34 22v82m52-82v82" stroke="#efc570" stroke-width="7"/><rect x="50" y="48" width="20" height="28" rx="5" fill="#f8d47a"/><circle cx="60" cy="60" r="4" fill="#6f5b46"/>',
  ),
  chave: svg(
    '<circle cx="38" cy="38" r="22" fill="none" stroke="#e4b44f" stroke-width="12"/><path d="m53 54 45 45m-20-20 10-10m-1 21 10-10" fill="none" stroke="#e4b44f" stroke-width="12" stroke-linecap="round"/>',
  ),
}
const assets: ProjectAsset[] = Object.entries(imagens).map(([name, source]) => ({
  id: `recife-quadros-${name}`,
  name,
  kind: 'image',
  source: 'library',
  dataUrl: `data:image/svg+xml;base64,${Buffer.from(source).toString('base64')}`,
}))

export function projetoDoQuadroRecife(quadro: QuadroInicialDoRecife, pronto: boolean): Project {
  const meta = QUADROS_INICIAIS_DO_RECIFE[quadro - 1]!
  const start: JSStatement[] = [
    { type: 'g2d:setupStage', width: 640, height: 480, bg: '#d8f3f3' },
    { type: 'g2d:enableClassicControls', mode: 'always' },
  ]
  const events: JSStatement[] = [key('Enter', pronto ? [{ type: 'g2d:restart' }] : [])]
  const update: JSStatement[] = []
  const draw: JSStatement[] = [
    label(meta.titulo, 24, 35),
    label(meta.linhas[0], 24, 72),
    label(meta.linhas[1], 24, 103),
  ]
  const vars = (values: Record<string, number>) => {
    for (const [name, value] of Object.entries(values))
      start.push({ type: 'var', name, value: n(value) })
  }
  const image = (image: keyof typeof imagens, varName: string, x: number, y = 165) => {
    start.push({ type: 'g2d:createImageSprite', varName, image, x, y, w: 100, h: 100 })
    draw.push({ type: 'g2d:drawSprite', ctxVar: 'ctx', spriteVar: varName })
  }
  const value = (text: string, name: string, y: number) =>
    draw.push(label(text, 24, y), label(v(name), 290, y))
  if (quadro === 1) {
    vars({ direita: 1 })
    image('concha', 'concha', 270)
    events.push(
      key('Space', pronto ? [iff(eq('direita', 1), [set('direita', 0)], [set('direita', 1)])] : []),
    )
    update.push(
      iff(
        eq('direita', 1),
        [
          iff(bin('<', { type: 'g2d:spriteX', spriteVar: 'concha' }, n(500)), [
            velocity('concha', 1, 0),
            apply('concha'),
          ]),
        ],
        [
          iff(bin('>', { type: 'g2d:spriteX', spriteVar: 'concha' }, n(40)), [
            velocity('concha', -1, 0),
            apply('concha'),
          ]),
        ],
      ),
    )
    value('Sentido da corrente:', 'direita', 355)
  } else if (quadro === 2) {
    vars({ cesta: 0, guardadas: 0 })
    image('concha', 'conchas', 150)
    image('bau', 'caixa', 390)
    events.push(
      key('ArrowLeft', pronto ? [iff(bin('<', v('cesta'), n(3)), [add('cesta', 1)])] : []),
      key('ArrowRight', pronto ? [add('guardadas', v('cesta')), set('cesta', 0)] : []),
    )
    value('Conchas na cesta:', 'cesta', 350)
    value('Conchas guardadas:', 'guardadas', 390)
  } else if (quadro === 3) {
    vars({ escolhido: 1, cuidado1: 0, cuidado2: 0, cuidados: 0 })
    image('coral-cinza', 'coral1', 150)
    image('coral-cinza', 'coral2', 390)
    events.push(
      key('ArrowLeft', [set('escolhido', 1)]),
      key('ArrowRight', [set('escolhido', 2)]),
      key(
        'Space',
        pronto
          ? [
              iff(eq('escolhido', 1), [
                iff(eq('cuidado1', 0), [set('cuidado1', 1), add('cuidados', 1)]),
              ]),
              iff(eq('escolhido', 2), [
                iff(eq('cuidado2', 0), [set('cuidado2', 1), add('cuidados', 1)]),
              ]),
            ]
          : [],
      ),
    )
    // O cuidado devolve a cor do coral (pronto no cenário; não faz parte do objetivo).
    update.push(
      iff(eq('cuidado1', 1), [{ type: 'g2d:setImage', spriteVar: 'coral1', image: 'coral' }]),
      iff(eq('cuidado2', 1), [{ type: 'g2d:setImage', spriteVar: 'coral2', image: 'coral' }]),
    )
    value('Coral escolhido:', 'escolhido', 350)
    value('Corais cuidados:', 'cuidados', 390)
  } else if (quadro === 4) {
    vars({ emVoo: 0, subindo: 1, lancamentos: 0 })
    image('bolha', 'bolha', 270, 320)
    events.push(
      key('Space', pronto ? [iff(eq('emVoo', 0), [set('emVoo', 1), add('lancamentos', 1)])] : []),
    )
    update.push(
      iff(eq('emVoo', 1), [
        iff(eq('subindo', 1), [velocity('bolha', 0, -2)], [velocity('bolha', 0, 2)]),
        apply('bolha'),
        iff(bin('<', { type: 'g2d:spriteY', spriteVar: 'bolha' }, n(120)), [set('subindo', 0)]),
        iff(bin('>', { type: 'g2d:spriteY', spriteVar: 'bolha' }, n(319)), [
          set('emVoo', 0),
          set('subindo', 1),
        ]),
      ]),
    )
    value('Bolhas lançadas:', 'lancamentos', 390)
  } else {
    vars({ chave: 0, aberto: 0, aberturas: 0 })
    image('chave', 'desenhoDaChave', 150)
    image('bau', 'bau', 390)
    events.push(
      key('ArrowLeft', [iff(eq('aberto', 0), [set('chave', 1)])]),
      key(
        'Space',
        pronto
          ? [
              iff(eq('chave', 1), [
                iff(eq('aberto', 0), [set('aberto', 1), set('chave', 0), add('aberturas', 1)]),
              ]),
            ]
          : [],
      ),
    )
    // A chave só aparece na mão enquanto não foi usada (desenho condicionado, sem opacidade).
    const desenhoDaChave = draw.findIndex(
      (d) => d.type === 'g2d:drawSprite' && d.spriteVar === 'desenhoDaChave',
    )
    const chaveNaTela = draw[desenhoDaChave]
    if (!chaveNaTela) throw new Error('desenho da chave ausente')
    draw[desenhoDaChave] = iff(eq('chave', 1), [chaveNaTela])
    value('Baú aberto:', 'aberto', 350)
    value('Aberturas:', 'aberturas', 390)
  }
  draw.push(label('Enter: nova rodada depois de completar o extra.', 24, 449))
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
    `recife-quadro-${quadro}`,
  )
  return {
    ...createEmptyProject(`recife-${meta.slug}`, meta.titulo),
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

const press = (key: string): ExecutionStep => ({ action: 'press', key, holdMs: 30 })
const left = () => press('ArrowLeft')
const right = () => press('ArrowRight')
const space = () => press('Space')
const value = (path: string, value: number): ExecutionExpectation => ({
  target: { kind: 'value', path },
  compare: 'equals',
  value,
})
const at = (afterStep: number, path: string, expected: number) => ({
  afterStep,
  expect: value(path, expected),
})
export function objetivosDoQuadroRecife(
  quadro: QuadroInicialDoRecife,
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
    rule: { type: 'behavior', steps, expect: value(path, expected), checkpoints },
  })
  const passos =
    quadro === 1
      ? [space()]
      : quadro === 2
        ? [left(), left(), left(), right()]
        : quadro === 3
          ? [space(), right(), space()]
          : quadro === 4
            ? [space()]
            : [left(), space()]
  const alvo =
    quadro === 1
      ? 'direita'
      : quadro === 2
        ? 'guardadas'
        : quadro === 3
          ? 'cuidados'
          : quadro === 4
            ? 'lancamentos'
            : 'aberturas'
  const inicio = quadro === 1 ? 1 : 0
  const fim = quadro === 1 ? 0 : quadro === 2 ? 3 : quadro === 3 ? 2 : 1
  const checks = [
    check('acao', 'Complete as ações indicadas para esta rodada.', passos, alvo, fim, [
      at(0, alvo, inicio),
    ]),
  ]
  if (quadro === 1)
    checks.push(
      check(
        'alternar',
        'Cada toque muda o sentido uma vez.',
        [space(), space(), space()],
        'direita',
        0,
        [at(0, 'direita', 1), at(1, 'direita', 0), at(2, 'direita', 1)],
      ),
    )
  if (quadro === 2)
    checks.push(
      check(
        'capacidade',
        'A cesta leva até três e descarrega sem duplicar.',
        [left(), left(), left(), left(), right(), right(), left(), right()],
        'guardadas',
        4,
        [at(4, 'cesta', 3), at(5, 'cesta', 0), at(6, 'guardadas', 3), at(8, 'cesta', 0)],
      ),
    )
  if (quadro === 3)
    checks.push(
      check(
        'uma-vez',
        'Cada coral conta uma vez, também na ordem inversa.',
        [right(), space(), space(), left(), space(), space()],
        'cuidados',
        2,
        [at(2, 'cuidado1', 0), at(2, 'cuidado2', 1), at(3, 'cuidados', 1), at(5, 'cuidado1', 1)],
      ),
    )
  if (quadro === 4)
    checks.push(
      check(
        'esperar',
        'Toques durante o voo esperam pela próxima bolha.',
        [space(), space(), space(), { action: 'wait', ms: 4500 }, space()],
        'lancamentos',
        2,
        [at(3, 'lancamentos', 1), at(4, 'emVoo', 0)],
      ),
    )
  if (quadro === 5)
    checks.push(
      check(
        'chave',
        'Sem chave não abre, e abrir usa a chave uma vez.',
        [space(), left(), space(), space(), left(), space()],
        'aberturas',
        1,
        [at(1, 'aberturas', 0), at(3, 'chave', 0), at(3, 'aberto', 1), at(5, 'chave', 0)],
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

export function desafiosIniciaisDoRecife(publico: PublicoDoDesafio) {
  return QUADROS_INICIAIS_DO_RECIFE.map((meta, i) => {
    const quadro = (i + 1) as QuadroInicialDoRecife
    const moedas = MOEDAS_PADRAO_POR_TIPO['quadro-das-cores']
    return DesafioDoManifestoSchema.parse({
      slug: `recife-${meta.slug}${publico === 'adulto' ? '-adulto' : ''}`,
      publico,
      ilha: 'recife',
      tipo: 'quadro-das-cores',
      quadro,
      ordem: quadro * 10,
      // C01b: todas as fontes na trilha; a importação continua com a equipe.
      publicar: true,
      conteudo: {
        versao: 1,
        titulo: meta.titulo,
        enunciado: meta.texto,
        dicas: [
          meta.dica,
          'Cenário e movimento já estão prontos. Complete apenas os eventos indicados.',
        ],
        projetoInicial: projetoDoQuadroRecife(quadro, false),
        gabarito: projetoDoQuadroRecife(quadro, true),
        objetivos: objetivosDoQuadroRecife(quadro),
        desafioExtra: {
          titulo: 'Mais um desafio',
          texto: 'Complete Enter para começar uma nova rodada do início.',
        },
        recompensa: {
          cor: true,
          atracao: `recife-${meta.slug}`,
          moedas: moedas.principal,
          moedasExtra: moedas.extra,
        },
        blocosManuais: { acrescentar: [], retirar: [] },
      },
    })
  })
}
