import type {
  ProjectBlockPattern,
  SectionProjectCheck,
  SectionStructureRule,
} from '../../../packages/core/src/learning/section-progression'
import { farolDirecaoObservada } from './desafio-farol-direcao'
import {
  memoriaFarolObservada,
  portaComChaveObservada,
  portaSemChaveObservada,
} from './desafio-farol-observacao'

const check = (id: string, label: string, rule: SectionStructureRule): SectionProjectCheck => ({
  id,
  label,
  rule,
})
const noEncontro = (
  target: string,
  body: ProjectBlockPattern | ProjectBlockPattern[],
): SectionStructureRule => ({
  type: 'usesBlock',
  blockType: 'sz_g2d_on_overlap',
  area: 'events',
  fieldAlternatives: [
    { A: 'personagem', B: target },
    { A: target, B: 'personagem' },
  ],
  ...(Array.isArray(body) ? { inputBlocksAll: { BODY: body } } : { inputBlocks: { BODY: body } }),
})
const naResposta = (branch: 'THEN' | 'ELSE', action: ProjectBlockPattern | ProjectBlockPattern[]) =>
  noEncontro('farol', {
    blockType: 'sz_js_if_else',
    inputBlocks: {
      COND: { blockType: 'sz_val_variable', fields: { NAME: 'temChave' } },
      ...(!Array.isArray(action) ? { [branch]: action } : {}),
    },
    ...(Array.isArray(action) ? { inputBlocksAll: { [branch]: action } } : {}),
  })
const aviso: ProjectBlockPattern = {
  blockType: 'sz_js_var_assign',
  fields: { NAME: 'aviso' },
  inputBlocks: { VALUE: { blockType: 'sz_val_text' } },
}
const guardarColeta: ProjectBlockPattern = {
  blockType: 'sz_js_var_assign',
  fields: { NAME: 'temChave' },
  inputs: { VALUE: true },
}
const retirarChave: ProjectBlockPattern = {
  blockType: 'sz_g2d_destroy_sprite',
  fields: { SPRITE: 'chave' },
}

export const movimento: SectionProjectCheck[] = [
  check('direcional', 'Em Ao iniciar, use Ativar controles clássicos com só as quatro direções.', {
    type: 'usesBlock',
    blockType: 'sz_g2d_enable_classic_controls',
    area: 'start',
    fields: { MODE: 'directions' },
  }),
  // A montagem usa 3; a conferência conserva também os projetos anteriores do curso.
  check(
    'andar',
    'Dentro de A cada quadro do jogo, o bloco que move o personagem vem antes de Manter o sprite dentro da tela.',
    {
      type: 'usesBlock',
      blockType: 'sz_g2d_update_each_frame',
      area: 'loops',
      inputBlocks: {
        BODY: {
          blockType: 'sz_g2d_top_down',
          fields: { SPRITE: 'personagem' },
          beforeBlock: 'sz_g2d_clamp_to_screen',
        },
      },
    },
  ),
  check('borda', 'Dentro de A cada quadro do jogo, mantenha o personagem dentro da tela.', {
    type: 'usesBlock',
    blockType: 'sz_g2d_update_each_frame',
    area: 'loops',
    inputBlocks: {
      BODY: { blockType: 'sz_g2d_clamp_to_screen', fields: { SPRITE: 'personagem' } },
    },
  }),
]

/**
 * Etapas do Dia 1 antes do limite de tela (uma ideia por seção, 05/10/2026). O movimento ainda não
 * tem o limite logo abaixo, então a ordem só é cobrada na entrega (`movimento`).
 */
export const movimentoSemBorda: SectionProjectCheck[] = [
  movimento[0]!,
  check('andar', 'Dentro de A cada quadro do jogo, mova o personagem.', {
    type: 'usesBlock',
    blockType: 'sz_g2d_update_each_frame',
    area: 'loops',
    inputBlocks: {
      BODY: { blockType: 'sz_g2d_top_down', fields: { SPRITE: 'personagem' } },
    },
  }),
  ...farolDirecaoObservada('personagem'),
]

/** Cada entrega conserva também as regras essenciais dos dias anteriores. */
export const coleta: SectionProjectCheck[] = [
  memoriaFarolObservada,
  ...movimento,
  check('memoria', 'Crie temChave começando em falso.', {
    type: 'usesBlock',
    blockType: 'sz_js_var_create',
    area: 'start',
    fields: { NAME: 'temChave' },
    inputs: { VALUE: false },
  }),
  check(
    'encontro-chave',
    // A montagem conserva a ordem gravada; a avaliação aceita ações equivalentes no encontro.
    'No encontro com a chave, retire a chave e atualize temChave e o aviso.',
    noEncontro('chave', [retirarChave, guardarColeta, aviso]),
  ),
  check(
    'recolher',
    'Retire a chave dentro do encontro entre personagem e chave.',
    noEncontro('chave', { blockType: 'sz_g2d_destroy_sprite', fields: { SPRITE: 'chave' } }),
  ),
  check(
    'lembrar',
    'Mude temChave para verdadeiro dentro do encontro com a chave.',
    noEncontro('chave', {
      blockType: 'sz_js_var_assign',
      fields: { NAME: 'temChave' },
      inputs: { VALUE: true },
    }),
  ),
  check(
    'aviso-chave',
    'Mude aviso para um texto dentro do encontro com a chave.',
    noEncontro('chave', aviso),
  ),
]

/** Etapas do Dia 2: primeiro a chave sai do chão, depois o jogo guarda a coleta, por fim o aviso. */
const porId = (id: string) => {
  const found = coleta.find((item) => item.id === id)
  if (!found) throw new Error(`Critério ${id} ausente`)
  return found
}
export const chaveRecolhida: SectionProjectCheck[] = [...movimento, porId('recolher')]
export const coletaGuardada: SectionProjectCheck[] = [
  memoriaFarolObservada,
  ...movimento,
  porId('memoria'),
  // Exige coleta e memória no mesmo evento; o aviso só é montado na seção seguinte.
  {
    ...porId('encontro-chave'),
    label: 'No encontro com a chave, retire a chave e mude temChave.',
    rule: noEncontro('chave', [retirarChave, guardarColeta]),
  },
  porId('recolher'),
  porId('lembrar'),
]

export const portaSemChave: SectionProjectCheck[] = [
  portaSemChaveObservada,
  ...coleta,
  check(
    'condicao',
    'Faça o Se consultar temChave no encontro com o farol.',
    noEncontro('farol', {
      blockType: 'sz_js_if_else',
      inputBlocks: { COND: { blockType: 'sz_val_variable', fields: { NAME: 'temChave' } } },
    }),
  ),
  check(
    'aviso-sem-chave',
    'Altere aviso com um texto dentro de senão, no encontro com o farol.',
    naResposta('ELSE', aviso),
  ),
]

export const portaCompleta: SectionProjectCheck[] = [
  portaComChaveObservada,
  ...portaSemChave,
  check(
    'encontro-farol',
    'No mesmo então de temChave, registre a vitória, acenda o farol e atualize o aviso.',
    naResposta('THEN', [
      {
        blockType: 'sz_js_var_assign',
        fields: { NAME: 'ganhou' },
        inputs: { VALUE: true },
      },
      { blockType: 'sz_g2d_set_image', fields: { SPRITE: 'farol' } },
      aviso,
    ]),
  ),
  check(
    'acender',
    'Troque a imagem do farol dentro de então, no encontro com o farol.',
    naResposta('THEN', { blockType: 'sz_g2d_set_image', fields: { SPRITE: 'farol' } }),
  ),
  check(
    'vitoria',
    'Mude ganhou para verdadeiro dentro de então, no encontro com o farol.',
    naResposta('THEN', {
      blockType: 'sz_js_var_assign',
      fields: { NAME: 'ganhou' },
      inputs: { VALUE: true },
    }),
  ),
  check(
    'aviso-vitoria',
    'Altere aviso com um texto dentro de então, no encontro com o farol.',
    naResposta('THEN', aviso),
  ),
]

/**
 * A parte em que a criança troca o farol (`personalizar`): a mesma regra `acender` da entrega,
 * para o jogo publicado continuar acendendo. Desde 29/10/2026 (`docs/plans/2026-10-29-desenho-da-
 * crianca-no-jogo-design.md`) qualquer imagem vale no "Trocar imagem do sprite farol" do então,
 * inclusive um farol desenhado pela criança: quem confere que o farol de fato muda ao vencer é o
 * objetivo que roda o jogo (`porta-com-chave-em-execucao`, `farol.imageName` mudou).
 */
export const farolEscolhido: SectionProjectCheck[] = [
  {
    ...(portaCompleta.find((item) => item.id === 'acender') as SectionProjectCheck),
    label:
      'Dentro de então, no encontro com o farol, use a imagem acesa do farol que você escolheu.',
  },
]
