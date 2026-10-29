/**
 * Os objetivos da parte "A sua chave no jogo" do extra "Meu primeiro desenho no Pinta". O da
 * montagem confere a imagem `minha-chave` (a vaga de arte) no "Criar sprite … com imagem …" da
 * chave; o que roda o jogo confere que a chave começa com o desenho e continua sendo recolhida.
 *
 * O projeto inicial é a Chave do Farol pronta: o objetivo de execução ele já cumpre na coleta, e é
 * o ponto de partida do aviso ("a chave continua funcionando"); o que só o gabarito cumpre é a
 * imagem (montagem e o ponto de conferência antes da primeira ida).
 */
import type { SectionProjectCheck } from '../../../packages/core/src/learning/section-progression'
import { VAGA_CHAVE } from './meu-desenho-projeto'

export const chaveNaMontagem: SectionProjectCheck = {
  id: 'minha-chave-no-sprite',
  label: `Em Ao iniciar, no bloco Criar sprite chave, use a imagem ${VAGA_CHAVE}.`,
  hint: `Procure o bloco Criar sprite chave em Ao iniciar. No fim dele, clique na imagem e escolha ${VAGA_CHAVE}.`,
  rule: {
    type: 'usesBlock',
    blockType: 'sz_g2d_create_image_sprite',
    area: 'start',
    fields: { NAME: 'chave', IMAGE: VAGA_CHAVE },
  },
}

export const chaveEmExecucao: SectionProjectCheck = {
  id: 'minha-chave-em-execucao',
  label: 'A chave começa com o seu desenho e continua sendo recolhida.',
  hint: 'Teste uma partida nova: leve o personagem até a chave. Ela precisa aparecer com o seu desenho e sumir quando o personagem encostar.',
  rule: {
    type: 'behavior',
    steps: [
      {
        action: 'approachSprite',
        actorPath: 'personagem',
        targetPath: 'chave',
        timeoutMs: 7500,
      },
    ],
    checkpoints: [
      {
        afterStep: 0,
        expect: {
          target: { kind: 'value', path: 'chave.imageName' },
          compare: 'equals',
          value: VAGA_CHAVE,
        },
      },
    ],
    expect: { target: { kind: 'value', path: 'temChave' }, compare: 'equals', value: true },
  },
}

export const meuDesenhoChecks: SectionProjectCheck[] = [chaveEmExecucao, chaveNaMontagem]
