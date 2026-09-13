import {
  isSceneScript,
  SCENE_MODELS,
  type SceneId,
  type SceneStep,
} from '@sistemazero/core/learning/scene'

/**
 * O que acontece com o trabalho do professor quando ele troca o tipo ou a cena do bloco.
 *
 * Puro de propósito: as duas regras abaixo decidem se o texto dele sobrevive, e nenhuma das
 * duas tinha teste — as duas estavam erradas, e o erro só aparecia depois de perder o texto.
 */

export interface TextoDoBloco {
  title: string
  instructions: string
  hints: string[]
}

/**
 * O texto que o bloco passa a ter quando a cena muda.
 *
 * ⚠️ O editor SOBRESCREVIA título, instrução e pistas com os do modelo a cada troca — de tipo
 * e de cena. Quem tinha escrito a própria instrução perdia tudo ao trocar de cena para
 * conferir outra, e nada avisava. A régua: o texto do modelo só entra onde o professor não
 * escreveu nada OU onde o que está escrito é, palavra por palavra, o do modelo anterior (ou
 * seja, ele nunca encostou). Se ele mexeu, o texto é dele e fica.
 */
export function textoAoTrocarCena(
  atual: TextoDoBloco,
  anterior: SceneId | null,
  nova: SceneId,
): TextoDoBloco {
  const modelo = SCENE_MODELS[nova]
  const antigo = anterior ? SCENE_MODELS[anterior] : null
  const intacto = (valor: string, doAntigo: string | undefined) =>
    valor.trim() === '' || (doAntigo !== undefined && valor === doAntigo)
  return {
    title: intacto(atual.title, antigo?.title) ? modelo.title : atual.title,
    instructions: intacto(atual.instructions, antigo?.instruction)
      ? modelo.instruction
      : atual.instructions,
    hints:
      atual.hints.length === 0 ||
      (antigo !== null && atual.hints.join('\n') === antigo.hints.join('\n'))
        ? [...modelo.hints]
        : atual.hints,
  }
}

/**
 * O roteiro autoral sobrevive à troca de cena?
 *
 * ⚠️ O editor reconstruía a atividade do zero na troca de cena, e o roteiro escrito à mão
 * sumia sem uma palavra. Às vezes ele PODE sobreviver: um roteiro só de "observe a cena" vale
 * em qualquer uma. Quando não vale — e é o caso comum, porque as ações são da cena —, ele é
 * descartado, mas quem descarta AVISA: é isso que `descartado` existe para dizer.
 */
export function roteiroAoTrocarCena(
  script: readonly SceneStep[] | undefined,
  nova: SceneId,
): { script: SceneStep[] | undefined; descartado: boolean } {
  if (!script) return { script: undefined, descartado: false }
  if (isSceneScript(script, nova)) return { script: [...script], descartado: false }
  return { script: undefined, descartado: true }
}
