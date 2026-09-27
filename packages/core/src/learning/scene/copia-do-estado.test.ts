import { describe, expect, test } from 'bun:test'
import { scenePaths } from '../../../tests/fixtures/exploration-paths'
import { SCENE_IDS, type SceneId, sceneFrameRate } from './actions'
import { openScene, stepScene } from './engine'
import { cloneScene, type SceneState } from './state'

/**
 * ⚠️⚠️ `cloneScene` copia FUNDO, em toda cena (full review de 16/09/2026).
 *
 * `stepScene` começa com `cloneScene(anterior)` e depois MUTA a cópia, e o Desfazer e as comparações
 * guardam estados passados. `cloneScene` copia os grupos e as listas à mão: um array esquecido num grupo
 * novo faz o quadro seguinte alterar o estado guardado do Desfazer, em silêncio. Nenhum teste chamava a
 * função. Este caminha pelo estado de cada cena depois dos gestos da experimentação e de 2 s de relógio (os
 * grupos cheios) e reprova qualquer objeto ou lista com a mesma identidade na cópia.
 */

/** Os caminhos em que a cópia compartilha um objeto ou uma lista com o original. */
function compartilhados(original: unknown, copia: unknown, caminho = 'state'): string[] {
  if (typeof original !== 'object' || original === null) return []
  if (original === copia) return [caminho]
  if (typeof copia !== 'object' || copia === null) return []
  const achados: string[] = []
  for (const chave of Object.keys(original)) {
    achados.push(
      ...compartilhados(
        (original as Record<string, unknown>)[chave],
        (copia as Record<string, unknown>)[chave],
        `${caminho}.${chave}`,
      ),
    )
  }
  return achados
}

/** O estado da cena com os grupos preenchidos: gestos e, com relógio, 2 s de ▶. */
function estadoCheio(scene: SceneId): SceneState {
  let estado = openScene({ scene })
  for (const acao of scenePaths[scene]) estado = stepScene({ scene }, estado, acao)
  if (sceneFrameRate(scene) !== null)
    for (let i = 0; i < 50; i++)
      estado = stepScene({ scene }, estado, { type: 'advance', seconds: 0.04 })
  return estado
}

describe('cloneScene não compartilha nada com o original', () => {
  test.each(SCENE_IDS.map((scene) => [scene]))('%s', (scene) => {
    const original = estadoCheio(scene)
    const copia = cloneScene(original)
    expect(copia).toEqual(original)
    expect(compartilhados(original, copia)).toEqual([])
  })

  test('⚠️ a caminhada reprova de verdade uma lista compartilhada (a rede não passa vazia)', () => {
    const original = estadoCheio('cleanup')
    const raso = { ...cloneScene(original), crowd: original.crowd }
    expect(compartilhados(original, raso)).toContain('state.crowd')
  })
})
