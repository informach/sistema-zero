import { describe, expect, test } from 'bun:test'
import {
  isSceneAction,
  SCENE_IDS,
  type SceneAction,
  type SceneId,
} from '@sistemazero/core/learning/scene'
import {
  campoNumerico,
  camposDoEndereco,
  sceneActionChoices,
} from '../src/components/editor/scene-action-editor'

/**
 * ⚠️⚠️ Todo NÚMERO de uma ação autorável precisa alcançar mais de um valor.
 *
 * Uma ação com número e sem forma de mexer nele é uma ação que o professor escolhe e não
 * consegue ajustar: ela fica cravada no valor de fábrica da lista, para sempre, naquele bloco.
 * Aconteceu com dezessete tipos de uma vez quando as cenas do núcleo, do motor e do 3D entraram
 * — e em `camera-3d`, `circle-collision` e `axis-z` o valor de fábrica era o PRÓPRIO estado
 * inicial da cena, então a única ação autorável era um gesto que não muda nada. O `setup` (o
 * caso do professor, a peça-título do lote) ficou inútil justamente nessas cenas.
 *
 * Há três saídas legítimas, e o teste aceita as três: um CAMPO no editor, várias OPÇÕES na
 * lista com valores diferentes (é como `frame` e `define` funcionam), ou o DOMÍNIO pinar o
 * campo num valor só — caso da altura da câmera no `mesh`, onde quem gira é o modelo.
 */

/** Os campos numéricos de uma ação, sem o discriminador. */
function numeros(a: SceneAction): string[] {
  return Object.entries(a as Record<string, unknown>)
    .filter(([chave, valor]) => chave !== 'type' && typeof valor === 'number')
    .map(([chave]) => chave)
}

/** O domínio aceita OUTRO valor neste campo, nesta cena? */
function aceitaOutroValor(a: SceneAction, campo: string, scene: SceneId): boolean {
  const atual = (a as unknown as Record<string, number>)[campo] ?? 0
  return [1, -1, 2, -2, 5, -5, 10, -10, 0.5].some((delta) =>
    isSceneAction({ ...a, [campo]: atual + delta }, scene),
  )
}

/** Os campos que o EDITOR desenha para esta ação. */
function camposDoEditor(a: SceneAction, scene: SceneId): Set<string> {
  const um = campoNumerico(a)
  const grupo = camposDoEndereco(a, scene)
  return new Set([...(um ? [um.field as string] : []), ...(grupo ?? []).map((c) => c.field)])
}

describe('⚠️ o editor de ações do admin deixa mexer em todo número', () => {
  for (const scene of SCENE_IDS)
    test(`${scene}: cada número tem campo, opção, ou é travado pelo domínio`, () => {
      const porTipo = new Map<string, SceneAction[]>()
      for (const c of sceneActionChoices(scene)) {
        const lista = porTipo.get(c.value.type) ?? []
        lista.push(c.value)
        porTipo.set(c.value.type, lista)
      }
      for (const variantes of porTipo.values()) {
        const acao = variantes[0]
        if (!acao) continue
        const campos = camposDoEditor(acao, scene)
        for (const campo of numeros(acao)) {
          const porOpcao =
            new Set(variantes.map((v) => (v as Record<string, unknown>)[campo])).size > 1
          const travado = !aceitaOutroValor(acao, campo, scene)
          expect(
            campos.has(campo) || porOpcao || travado,
            `${scene} · ${acao.type}.${campo} não tem como mudar de valor`,
          ).toBe(true)
        }
      }
    })
})
