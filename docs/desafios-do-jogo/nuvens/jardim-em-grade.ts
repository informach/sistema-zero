import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import {
  createEmptyProject,
  type Project,
  type ProjectAsset,
} from '../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import { assignStableIdsToIR } from '../../../packages/studio/src/ir/ids'
import type { JSExpr, JSStatement, SZIRV2 } from '../../../packages/studio/src/ir/schema'
import { assetsDoNuvens } from './projetos'

/**
 * O Jardim em grade das Nuvens (lacunas, 01/11/2026): a construção e gestão de um mundo do Gênio
 * (a proposta e a Jornada: grade, ocupação, custo e produção), em blocos e só com o que a trilha
 * ensina. Três canteiros lado a lado; as teclas 1, 2 e 3 escolhem o canteiro (pronto no cenário);
 * plantar custa moedas; um canteiro ocupado recusa; cada planta produz moedas pelo relógio; colher
 * esvazia os canteiros; e o jardim tem uma meta. Sem lista: um Se por canteiro. A persistência e a
 * grade de verdade, em arquivos, ficam no quadro 6 (o Pro).
 */
export const GRADE = {
  moedas: 6,
  custo: 2,
  producao: 1,
  meta: 20,
  canteiros: [
    { x: 120, y: 250 },
    { x: 272, y: 250 },
    { x: 424, y: 250 },
  ],
  tamanho: 96,
} as const

const n = (value: number): JSExpr => ({ type: 'num', value })
const v = (name: string): JSExpr => ({ type: 'var', name })
const b = (value: boolean): JSExpr => ({ type: 'bool', value })
const set = (name: string, value: JSExpr): JSStatement => ({ type: 'assign', name, value })
const bin = (op: '===' | '+' | '-' | '>=', left: JSExpr, right: JSExpr): JSExpr => ({
  type: 'binop',
  op,
  left,
  right,
})
/** `x = x + d` (ou `x - d`, como os blocos escrevem a subtração). */
const mais = (name: string, d: number) =>
  set(name, bin(d < 0 ? '-' : '+', v(name), n(Math.abs(d))))
const iff = (cond: JSExpr, then: JSStatement[], otherwise: JSStatement[] = []): JSStatement => ({
  type: 'if',
  cond,
  then,
  else: otherwise,
})
const key = (k: string, body: JSStatement[]): JSStatement => ({ type: 'g2d:onKey', key: k, body })
const label = (text: string | JSExpr, x: number, y: number, size = 16): JSStatement => ({
  type: 'g2d:drawLabel',
  ctxVar: 'ctx',
  text,
  x,
  y,
  size,
  color: '#3b2f6b',
  align: 'left',
})
const placar = (rotulo: string, name: string, x: number, y: number): JSStatement => ({
  type: 'g2d:drawScore',
  ctxVar: 'ctx',
  label: rotulo,
  value: v(name),
  x,
  y,
  size: 18,
  color: '#3b2f6b',
})
const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`
const canteiro = svg(
  96,
  96,
  '<ellipse cx="48" cy="70" rx="44" ry="20" fill="#e9e1f7" stroke="#8f7bc4" stroke-width="3"/><ellipse cx="48" cy="66" rx="36" ry="13" fill="#a88a6a"/><path d="M22 66h52" stroke="#8a6d50" stroke-width="3" stroke-dasharray="6 6"/>',
)
const assets: ProjectAsset[] = [
  ...assetsDoNuvens,
  {
    id: 'nuvens-canteiro',
    name: 'canteiro',
    kind: 'image',
    source: 'library',
    dataUrl: `data:image/svg+xml;base64,${Buffer.from(canteiro).toString('base64')}`,
  },
]

const CANTEIROS = [1, 2, 3] as const

/** O Jardim montado até o passo do quadro; o passo dele só vem no gabarito. */
export function projetoDoJardimEmPassos(
  quadro: 1 | 2 | 3 | 4 | 5,
  pronto: boolean,
  titulo: string,
): Project {
  const tem = (passo: number) => passo < quadro || (pronto && passo === quadro)
  const plantarNo = (c: number): JSStatement[] => {
    const plantar = [set(`plantado${c}`, b(true)), mais('moedas', -GRADE.custo)]
    return [
      iff(bin('===', v('escolhido'), n(c)), [
        // A ocupação (passo 2): um canteiro com planta recusa outra.
        ...(tem(2) ? [iff(bin('===', v(`plantado${c}`), b(false)), plantar)] : plantar),
      ]),
    ]
  }
  const espaco = tem(1)
    ? [iff(bin('>=', v('moedas'), n(GRADE.custo)), CANTEIROS.flatMap(plantarNo))]
    : []
  const relogio = [
    ...(tem(3)
      ? CANTEIROS.map((c) => iff(v(`plantado${c}`), [mais('moedas', GRADE.producao)]))
      : []),
    ...(tem(5)
      ? [
          iff(bin('>=', v('moedas'), n(GRADE.meta)), [
            iff(bin('===', v('meta'), b(false)), [set('meta', b(true))]),
          ]),
        ]
      : []),
  ]
  const colher = tem(4)
    ? CANTEIROS.map((c) =>
        iff(v(`plantado${c}`), [set(`plantado${c}`, b(false)), mais('colhidas', 1)]),
      )
    : []
  const inicio: [string, JSExpr][] = [
    ['moedas', n(GRADE.moedas)],
    ['escolhido', n(1)],
    ['plantado1', b(false)],
    ['plantado2', b(false)],
    ['plantado3', b(false)],
    ['colhidas', n(0)],
    ['meta', b(false)],
  ]
  const source: SZIRV2 = {
    version: 2,
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d' }],
    behavior: {
      start: [
        { type: 'g2d:setupStage', width: 640, height: 480, bg: '#efe8ff' },
        { type: 'g2d:enableClassicControls', mode: 'auto' },
        ...inicio.map(([name, value]): JSStatement => ({ type: 'var', name, value })),
        ...CANTEIROS.map(
          (c): JSStatement => ({
            type: 'g2d:createImageSprite',
            varName: `canteiro${c}`,
            image: 'canteiro',
            ...GRADE.canteiros[c - 1]!,
            w: GRADE.tamanho,
            h: GRADE.tamanho,
          }),
        ),
      ],
      events: [
        // Escolher o canteiro é pronto no cenário.
        ...CANTEIROS.map((c) => key(String(c), [set('escolhido', n(c))])),
        key('Space', espaco),
        // Colher fica na tecla C; até o quarto quadro, ela vem vazia.
        ...(quadro >= 4 ? [key('c', colher)] : []),
        key('Enter', pronto ? [{ type: 'g2d:restart' }] : []),
      ],
      loops: [
        // O relógio do jardim: a produção (passo 3) e a meta (passo 5).
        ...(quadro >= 3
          ? [{ type: 'g2d:everySeconds', seconds: n(1), body: relogio } as JSStatement]
          : []),
        {
          type: 'g2d:updateEachFrame',
          body: [
            ...CANTEIROS.map((c) =>
              iff(
                v(`plantado${c}`),
                [{ type: 'g2d:setImage', spriteVar: `canteiro${c}`, image: 'muda' }],
                [{ type: 'g2d:setImage', spriteVar: `canteiro${c}`, image: 'canteiro' }],
              ),
            ),
            { type: 'g2d:clear' },
            { type: 'g2d:drawBackdrop', ctxVar: 'ctx', image: 'jardim' },
            label(titulo, 18, 32, 24),
            label('1, 2 e 3 escolhem o canteiro. Espaço ou A planta por 2 moedas.', 18, 60),
            ...(quadro >= 4 ? [label('C colhe os canteiros plantados.', 18, 84)] : []),
            ...CANTEIROS.map(
              (c): JSStatement => ({
                type: 'g2d:drawSprite',
                ctxVar: 'ctx',
                spriteVar: `canteiro${c}`,
              }),
            ),
            placar('Moedas: ', 'moedas', 470, 100),
            placar('Canteiro: ', 'escolhido', 470, 126),
            ...(quadro >= 4 ? [placar('Colhidas: ', 'colhidas', 470, 152)] : []),
            ...(quadro >= 5
              ? [iff(v('meta'), [label('O jardim chegou à meta.', 220, 420, 20)])]
              : []),
          ],
        },
      ],
    },
  }
  const ir = assignStableIdsToIR(source, `nuvens_quadro_${quadro}`)
  return {
    ...createEmptyProject(`nuvens-quadro-${quadro}`, titulo),
    programmingLanguage: 'javascript',
    mode: 'blocks',
    createdAt: 0,
    updatedAt: 0,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: titulo }),
    assets,
    installedExtensions: [{ id: 'game-2d', version: '1.2.0', installedAt: 0 }],
  }
}
