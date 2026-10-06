import type {
  ProjectBlockPattern,
  SectionProjectCheck,
  SectionStructureRule,
} from '../../../packages/core/src/learning/section-progression'
import { FAROL_FAROIS } from '../../../packages/studio/src/arte/farol-assets'

const check = (id: string, label: string, rule: SectionStructureRule): SectionProjectCheck => ({
  id,
  label,
  rule,
})
const noEncontro = (target: string, body: ProjectBlockPattern): SectionStructureRule => ({
  type: 'usesBlock',
  blockType: 'sz_g2d_on_overlap',
  area: 'events',
  fields: { A: 'personagem', B: target },
  inputBlocks: { BODY: body },
})
const naResposta = (branch: 'THEN' | 'ELSE', action: ProjectBlockPattern) =>
  noEncontro('farol', {
    blockType: 'sz_js_if_else',
    inputBlocks: {
      COND: { blockType: 'sz_val_variable', fields: { NAME: 'temChave' } },
      [branch]: action,
    },
  })
const aviso: ProjectBlockPattern = {
  blockType: 'sz_js_var_assign',
  fields: { NAME: 'aviso' },
  inputBlocks: { VALUE: { blockType: 'sz_val_text' } },
}

export const movimento: SectionProjectCheck[] = [
  check('direcional', 'Mostre somente as quatro direções.', {
    type: 'usesBlock',
    blockType: 'sz_g2d_enable_classic_controls',
    area: 'start',
    fields: { MODE: 'directions' },
  }),
  // A montagem usa 3; a conferência conserva também os projetos anteriores do curso.
  check(
    'andar',
    'Dentro de A cada quadro do jogo, mova o personagem, antes de mantê-lo dentro da tela.',
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
]

/** Cada entrega conserva também as regras essenciais dos dias anteriores. */
export const coleta: SectionProjectCheck[] = [
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
    // A ordem é a que o Dia 2 ensina; o texto diz QUAL ordem, porque o jogo funciona com as duas.
    'No encontro com a chave, retire a chave antes de mudar temChave e o aviso.',
    noEncontro('chave', {
      blockType: 'sz_g2d_destroy_sprite',
      fields: { SPRITE: 'chave' },
      beforeBlock: 'sz_js_var_assign',
    }),
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
    'Altere aviso com um texto dentro do encontro com a chave.',
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
  ...movimento,
  porId('memoria'),
  // Mesma regra, sem cobrar o aviso que só é montado na seção seguinte.
  {
    ...porId('encontro-chave'),
    label: 'No encontro com a chave, retire a chave antes de mudar temChave.',
  },
  porId('recolher'),
  porId('lembrar'),
]

export const portaSemChave: SectionProjectCheck[] = [
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
  ...portaSemChave,
  check(
    'encontro-farol',
    'No encontro com o farol, mude ganhou para verdadeiro e depois troque a imagem, dentro de então.',
    naResposta('THEN', {
      blockType: 'sz_js_var_assign',
      fields: { NAME: 'ganhou' },
      inputs: { VALUE: true },
      beforeBlock: 'sz_g2d_set_image',
    }),
  ),
  check(
    'acender',
    'Troque a imagem do farol dentro de então, no encontro com o farol.',
    naResposta('THEN', {
      blockType: 'sz_g2d_set_image',
      fields: { SPRITE: 'farol' },
      fieldOptions: { IMAGE: [...FAROL_FAROIS.map(({ aceso }) => aceso), 'farol-aceso'] },
    }),
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
 * A parte em que a criança troca o farol (`personalizar`, decisão da dona em 06/10/2026): a mesma
 * regra `acender` da entrega, para o jogo publicado continuar acendendo. Aceita os quatro faróis
 * acesos e o antigo `farol-aceso`, então nenhuma escolha de modelo é reprovada; reprova só uma
 * imagem apagada ou que não é farol no espaço do então.
 */
export const farolEscolhido: SectionProjectCheck[] = [
  {
    ...(portaCompleta.find((item) => item.id === 'acender') as SectionProjectCheck),
    label:
      'Dentro de então, no encontro com o farol, use a imagem acesa do farol que você escolheu.',
  },
]
