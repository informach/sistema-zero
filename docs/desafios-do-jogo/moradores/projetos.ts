/** Autoria de documentos. Não é runtime, currículo, nem parte importada pelo jogo. */
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
 * O pedido do Nico (§6.28, A23; a proposta: "Dos moradores: pedidos curtos, como uma placa que
 * acende à noite"). Um pedido curto do Faísca: o cenário, a placa apagada e a acesa e o Se que
 * escolhe qual desenhar já vêm prontos; falta o evento da barra de espaço guardar verdadeiro em
 * `acesa`. O extra faz o Enter apagar. Só blocos da trilha do Faísca, como a sua ilha.
 */
const bool = (value: boolean): JSExpr => ({ type: 'bool', value })
const assign = (name: string, value: boolean): JSStatement => ({
  type: 'assign',
  name,
  value: bool(value),
})
const iff = (name: string, then: JSStatement[], otherwise: JSStatement[]): JSStatement => ({
  type: 'if',
  cond: { type: 'var', name },
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
const key = (key: string, body: JSStatement[]): JSStatement => ({ type: 'g2d:onKey', key, body })

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
const assets: ProjectAsset[] = Object.entries(arts).map(([name, body]) => ({
  id: `pedido-do-nico-${name}`,
  name,
  kind: 'image',
  source: 'library',
  dataUrl: `data:image/svg+xml;base64,${Buffer.from(body).toString('base64')}`,
}))

export const PEDIDO_DO_NICO = {
  slug: 'a-placa-da-noite',
  titulo: 'A placa da noite',
  instrucao: 'A barra de espaço acende a placa.',
} as const

export function projetoDoPedido(pronto: boolean) {
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
        image('placa', 'apagada'),
        image('luz', 'acesa'),
      ],
      events: [
        key('Space', pronto ? [assign('acesa', true)] : []),
        key('Enter', pronto ? [assign('acesa', false)] : []),
      ],
      loops: [
        {
          type: 'g2d:updateEachFrame',
          body: [
            { type: 'g2d:clear' },
            label(PEDIDO_DO_NICO.titulo, 20, 35),
            label(PEDIDO_DO_NICO.instrucao, 20, 68),
            iff(
              'acesa',
              [draw('luz'), label('A placa do Nico acendeu.', 20, 120)],
              [draw('placa')],
            ),
          ],
        },
      ],
    },
  }
  const ir = assignStableIdsToIR(source, 'pedido-do-nico')
  return {
    ...createEmptyProject(`pedido-do-nico-${PEDIDO_DO_NICO.slug}`, PEDIDO_DO_NICO.titulo),
    programmingLanguage: 'javascript' as const,
    mode: 'blocks' as const,
    createdAt: 0,
    updatedAt: 0,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: PEDIDO_DO_NICO.titulo }),
    assets,
    installedExtensions: [{ id: 'game-2d', version: '1.2.0', installedAt: 0 }],
  }
}

const press = (key: string, holdMs = 30): ExecutionStep => ({ action: 'press', key, holdMs })
const val = (path: string, value: boolean): ExecutionExpectation => ({
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

export function objetivosDoPedido(): SectionJavaScriptProjectCheck[] {
  return [
    check('acender', 'A barra de espaço acende a placa.', [press('Space')], val('acesa', true), [
      { afterStep: 0, expect: val('acesa', false) },
    ]),
    check(
      'so-no-espaco',
      'Andar com as setas não acende a placa.',
      [press('ArrowRight', 300), press('Space')],
      val('acesa', true),
      [{ afterStep: 1, expect: val('acesa', false) }],
    ),
    check(
      'apagar',
      'Extra: o Enter apaga a placa.',
      [press('Space'), press('Enter')],
      val('acesa', false),
      [{ afterStep: 1, expect: val('acesa', true) }],
      true,
    ),
  ]
}
