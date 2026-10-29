import type {
  ProjectBlockPattern,
  SectionProjectCheck,
  SectionStructureRule,
} from '../../../packages/core/src/learning/section-progression'
import {
  ilhaCollect,
  ilhaCollectWithMessage,
  ilhaMemory,
  ilhaMissing,
  ilhaOnce,
  ilhaWin,
} from './ilha-do-farol-observacao'
import type { IlhaParte } from './ilha-do-farol-projeto'

const check = (id: string, label: string, rule: SectionStructureRule): SectionProjectCheck => ({
  id,
  label,
  rule,
})
const encounter = (other: string, body: ProjectBlockPattern[]): SectionStructureRule => ({
  type: 'usesBlock',
  area: 'events',
  blockType: 'sz_g3d_on_touch',
  fields: { OBJ: 'personagem', OTHER: other },
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
/** A guarda da partida: o encontro com farol só responde enquanto não ganhou. */
const notWon = (body: ProjectBlockPattern[]): ProjectBlockPattern => ({
  blockType: 'sz_js_if_else',
  inputBlocks: {
    COND: {
      blockType: 'sz_val_not',
      inputBlocks: { VALUE: { blockType: 'sz_val_variable', fields: { NAME: 'ganhou' } } },
    },
  },
  inputBlocksAll: { THEN: body },
})
/** A decisão da chave no encontro com farol; da parte uma-vez em diante, dentro da guarda. */
const branch = (where: 'THEN' | 'ELSE', body: ProjectBlockPattern[], guarded = false) => {
  const decision: ProjectBlockPattern = {
    blockType: 'sz_js_if_else',
    inputBlocks: { COND: { blockType: 'sz_val_variable', fields: { NAME: 'temChave' } } },
    inputBlocksAll: { [where]: body },
  }
  return encounter('farol', [guarded ? notWon([decision]) : decision])
}
const movement = check(
  'movimento-no-quadro',
  'Dentro de A cada quadro, coloque o comando que move personagem com o teclado.',
  {
    type: 'usesBlock',
    area: 'loops',
    blockType: 'sz_g3d_animate',
    inputBlocks: { BODY: { blockType: 'sz_g3d_top_down', fields: { OBJ: 'personagem' } } },
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
  'Esconda chave dentro do encontro do personagem com chave.',
  encounter('chave', [visibility('chave', 'hide')]),
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
  'No mesmo encontro com chave, esconda a chave e guarde temChave verdadeiro.',
  encounter('chave', [visibility('chave', 'hide'), set('temChave', true)]),
)
const message = check(
  'aviso-na-coleta',
  'Mude aviso dentro do encontro com chave.',
  encounter('chave', [set('aviso')]),
)
const missingBody = [set('aviso')]
const winBody: ProjectBlockPattern[] = [
  {
    blockType: 'sz_g3d_play_animation',
    fields: { CLIP: 'acender', OBJ: 'farol', MODE: 'uma-vez' },
  },
  set('ganhou', true),
  set('aviso'),
]
const missingLabel = 'No encontro com farol, consulte temChave e mude aviso no senão.'
const winLabel =
  'No então do encontro com farol, toque a animação acender no farol uma vez, guarde ganhou e mude aviso.'
const missing = check('resposta-sem-chave', missingLabel, branch('ELSE', missingBody))
const win = check('resposta-com-chave', winLabel, branch('THEN', winBody))
// Os mesmos ids da decisão: o que muda é só onde ela mora, dentro da guarda.
const missingGuarded = check('resposta-sem-chave', missingLabel, branch('ELSE', missingBody, true))
const winGuarded = check('resposta-com-chave', winLabel, branch('THEN', winBody, true))
const guard = check(
  'uma-vez-guarda',
  'No encontro com farol, coloque o Se temChave dentro de Se não ganhou.',
  encounter('farol', [
    notWon([
      {
        blockType: 'sz_js_if_else',
        inputBlocks: { COND: { blockType: 'sz_val_variable', fields: { NAME: 'temChave' } } },
      },
    ]),
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
      'uma-vez',
      'aparencia',
      'personalizar',
    ],
    n = ids.indexOf(part)
  const guarded = n >= 8
  return [
    movement,
    ...directions,
    ...(n >= 2 ? [position] : []),
    ...(part === 'posicao' ? changedPosition : []),
    ...(n >= 3 ? [collect, n >= 5 ? ilhaCollectWithMessage : ilhaCollect] : []),
    ...(n >= 4 ? [memory, remember, ...(n < 7 ? [ilhaMemory] : [])] : []),
    ...(n >= 5 ? [message] : []),
    ...(n >= 6 ? [guarded ? missingGuarded : missing, ilhaMissing] : []),
    // A parte uma-vez confere a volta ao farol; a vitória com o recomeço (R) fica nas outras
    // partes: as duas idas mais a volta não cabem com ela nos 40 s de uma parte.
    ...(n >= 7 ? [guarded ? winGuarded : win, part === 'uma-vez' ? ilhaOnce : ilhaWin] : []),
    ...(guarded ? [guard] : []),
  ]
}
