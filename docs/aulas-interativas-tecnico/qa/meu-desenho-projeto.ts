/**
 * Os projetos do extra "Meu primeiro desenho no Pinta" (Faísca). O jogo é a Chave do Farol
 * concluída; a criança troca a imagem da chave pelo desenho que fez no bloco de Pinta da aula.
 *
 * O desenho chega ao Estúdio pela vaga de arte `minha-chave`
 * (`docs/plans/2026-10-29-desenho-da-crianca-no-jogo-design.md`): o host põe a imagem nos materiais
 * do jogo com `source: 'lesson-art'`. O projeto inicial NÃO tem essa imagem (quem a traz é a aula);
 * o gabarito tem uma chave de exemplo com o mesmo nome, para o Admin conferir e testar.
 */

import { pintaAssetToWire } from '../../../packages/pinta/src/assets/wire'
import { createLessonAsset } from '../../../packages/pinta/src/core/newAsset'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import type { Project, ProjectAsset } from '../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import { montarProjetoFarol } from './desafio-farol-projeto'

export const MEU_DESENHO_CURSO = 'jornada-faisca-extra-2'
/** A vaga de arte: o nome do desenho, que vira o nome da imagem nos materiais do jogo. */
export const VAGA_CHAVE = 'minha-chave'
/** A imagem do jogo que o desenho redesenha. */
export const CHAVE_DO_JOGO = 'chave-dourada'
/** O quadro do desenho no Pinta: quadrado, como a chave do jogo (32 × 32 na tela). */
export const QUADRO_DA_CHAVE = 64

const NOME = 'A Chave do Farol'

/**
 * Uma chave rosa como a aula ensina (o gabarito do Admin e o jogo pronto): argola com o Círculo,
 * haste e dois dentes com o Retângulo, preenchimento rosa e o contorno preto que o Pinta já traz.
 */
const chaveExemploSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><g fill="#e8458b" stroke="#1f2433" stroke-width="2"><rect x="44" y="35" width="6" height="11"/><rect x="53" y="35" width="6" height="14"/><rect x="26" y="28" width="35" height="8"/><circle cx="17" cy="32" r="13"/></g><circle cx="13" cy="27" r="3" fill="#ffffff"/></svg>`

/** O desenho de exemplo como a vaga de arte o põe no projeto (o host faz isso na aula). */
export const CHAVE_EXEMPLO: ProjectAsset = {
  id: `lesson-art-${VAGA_CHAVE}`,
  name: VAGA_CHAVE,
  kind: 'image',
  source: 'lesson-art',
  dataUrl: `data:image/svg+xml;base64,${Buffer.from(chaveExemploSvg).toString('base64')}`,
  width: QUADRO_DA_CHAVE,
  height: QUADRO_DA_CHAVE,
}

/** O jogo pronto da Chave do Farol: o ponto de partida do bloco de Estúdio. */
export function projetoInicialMeuDesenho(): Project {
  return montarProjetoFarol('concluido')
}

/** O gabarito: a chave do jogo criada com a imagem `minha-chave`, e o desenho nos materiais. */
export function projetoComMinhaChave(): Project {
  const base = projetoInicialMeuDesenho()
  const ir = structuredClone(base.ir)
  if (!ir || !('behavior' in ir)) throw Error('O jogo do Farol perdeu a IR')
  let trocou = 0
  for (const statement of ir.behavior.start)
    if (statement.type === 'g2d:createImageSprite' && statement.varName === 'chave') {
      statement.image = VAGA_CHAVE
      trocou++
    }
  if (trocou !== 1) throw Error('A chave do Farol mudou de forma: ajuste o gabarito do extra')
  return {
    ...base,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: NOME }),
    assets: [...(base.assets ?? []), CHAVE_EXEMPLO],
  }
}

/**
 * O desenho inicial do bloco de Pinta: quadro vetorial quadrado, vazio, com o nome da vaga. Ids e
 * datas fixos, para o manifesto sair igual a cada geração (a fábrica sorteia os ids).
 */
export function desenhoInicialDaChave(): unknown {
  const asset = createLessonAsset('vector-sprite', QUADRO_DA_CHAVE, VAGA_CHAVE)
  if (asset.kind !== 'vector-sprite') throw Error('O desenho da chave deveria ser vetorial')
  return pintaAssetToWire({
    ...asset,
    id: 'fa15ca0e-0000-4000-8000-00000000c4a0',
    createdAt: 0,
    updatedAt: 0,
    animations: asset.animations.map((animation, index) => ({
      ...animation,
      id: `fa15ca0e-0000-4000-8000-00000000c4a${index + 1}`,
    })),
  })
}
