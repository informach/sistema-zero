import {
  ilhaCollect,
  ilhaCollectWithMessage,
  ilhaMemory,
  ilhaMissing,
  ilhaWin,
} from './ilha-do-farol-observacao'
import type {
  SectionProjectCheck,
  SectionStructureRule,
  ProjectBlockPattern,
} from '../../../packages/core/src/learning/section-progression'
import type { IlhaParte } from './ilha-do-farol-projeto'
const check = (id: string, label: string, rule: SectionStructureRule): SectionProjectCheck => ({
  id,
  label,
  rule,
})
const encounter = (group: string, body: ProjectBlockPattern[]): SectionStructureRule => ({
  type: 'usesBlock',
  area: 'events',
  blockType: 'sz_g3d_on_touch_group',
  fields: { OBJ: 'personagem', GROUP: group },
  inputBlocksAll: { BODY: body },
})
const set = (name: string, value?: boolean): ProjectBlockPattern => ({
  blockType: 'sz_js_var_assign',
  fields: { NAME: name },
  ...(value === undefined
    ? { inputBlocks: { VALUE: { blockType: 'sz_val_text' } } }
    : { inputs: { VALUE: value } }),
})
const visibility = (OBJ: string, MODE: string): ProjectBlockPattern => ({
  blockType: 'sz_g3d_set_visible',
  fields: { OBJ, MODE },
})
const branch = (where: 'THEN' | 'ELSE', body: ProjectBlockPattern[]) =>
  encounter('portas', [
    {
      blockType: 'sz_js_if_else',
      inputBlocks: { COND: { blockType: 'sz_val_variable', fields: { NAME: 'temChave' } } },
      inputBlocksAll: { [where]: body },
    },
  ])
const movement = check(
  'movimento-no-quadro',
  'Dentro de A cada quadro, coloque o comando que move personagem com o teclado.',
  {
    type: 'usesBlock',
    area: 'loops',
    blockType: 'sz_g3d_animate',
    inputBlocks: { BODY: { blockType: 'sz_g3d_control_keys', fields: { OBJ: 'personagem' } } },
  },
)
const directions: SectionProjectCheck[] = (
  ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'] as const
).map((key, i) => ({
  id: `andar-${i}`,
  label: `Faça o personagem andar ${['para a direita', 'para a esquerda', 'para o fundo', 'para a frente'][i]} com a seta correspondente.`,
  rule: {
    type: 'behavior',
    steps: [
      { action: 'press', key, holdMs: 250 },
      { action: 'wait', ms: 90 },
    ],
    checkpoints: [
      {
        afterStep: 2,
        expect: {
          target: { kind: 'value', path: `personagem.userData.sz.${i < 2 ? 'vx' : 'vz'}` },
          compare: 'equals',
          value: 0,
        },
      },
    ],
    expect: {
      target: { kind: 'value', path: `personagem.position.${i < 2 ? 'x' : 'z'}` },
      compare: i === 0 || i === 3 ? 'increased' : 'decreased',
    },
  },
}))
const position = check(
  'posicao-chave',
  'Em Ao iniciar, defina os três valores da posição de chave.',
  { type: 'usesBlock', area: 'start', blockType: 'sz_g3d_set_position', fields: { OBJ: 'chave' } },
)
// Esta parte pede uma alteração em cada direção do chão, sem exigir os valores da solução.
const changedPosition: SectionProjectCheck[] = (['x', 'z'] as const).map((axis) => ({
  id: `posicao-alterada-${axis}`,
  label: `Mude ${axis} da chave e confira o novo lugar no chão.`,
  rule: {
    type: 'behavior',
    steps: [],
    expect: {
      target: { kind: 'value', path: `chave.position.${axis}` },
      compare: 'notEquals',
      value: axis === 'x' ? -2 : -3,
    },
  },
}))
const collect = check(
  'recolher-no-encontro',
  'Esconda chave dentro do encontro do personagem com chaves.',
  encounter('chaves', [visibility('chave', 'hide')]),
)
const memory = check('memoria-inicial', 'Comece temChave em falso, em Ao iniciar.', {
  type: 'usesBlock',
  area: 'start',
  blockType: 'sz_js_var_create',
  fields: { NAME: 'temChave' },
  inputs: { VALUE: false },
})
const remember = check(
  'guardar-na-coleta',
  'No mesmo encontro com chaves, esconda a chave e guarde temChave verdadeiro.',
  encounter('chaves', [visibility('chave', 'hide'), set('temChave', true)]),
)
const message = check(
  'aviso-na-coleta',
  'Mude aviso dentro do encontro com chaves.',
  encounter('chaves', [set('aviso')]),
)
const missing = check(
  'resposta-sem-chave',
  'No encontro com portas, consulte temChave e mude aviso no senão.',
  branch('ELSE', [set('aviso')]),
)
const win = check(
  'resposta-com-chave',
  'No então do encontro com portas, troque os faróis, guarde ganhou e mude aviso.',
  branch('THEN', [
    visibility('farol', 'hide'),
    visibility('farolAceso', 'show'),
    set('ganhou', true),
    set('aviso'),
  ]),
)
export function ilhaChecks(part: IlhaParte): SectionProjectCheck[] {
  const ids = [
      'inicio',
      'movimento',
      'posicao',
      'recolher',
      'memoria',
      'aviso',
      'sem-chave',
      'decisao',
      'personalizar',
    ],
    n = ids.indexOf(part)
  return [
    movement,
    ...directions,
    ...(n >= 2 ? [position] : []),
    ...(part === 'posicao' ? changedPosition : []),
    ...(n >= 3 ? [collect, n >= 5 ? ilhaCollectWithMessage : ilhaCollect] : []),
    ...(n >= 4 ? [memory, remember, ...(n < 7 ? [ilhaMemory] : [])] : []),
    ...(n >= 5 ? [message] : []),
    ...(n >= 6 ? [missing, ilhaMissing] : []),
    ...(n >= 7 ? [win, ilhaWin] : []),
  ]
}
