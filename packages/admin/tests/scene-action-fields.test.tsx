import { describe, expect, test } from 'bun:test'
import {
  isSceneAction,
  SCENE_IDS,
  SCENE_MODELS,
  type SceneAction,
  type SceneId,
} from '@sistemazero/core/learning/scene'
import {
  avisoDoTempo,
  campoNumerico,
  camposDoEndereco,
  rotuloDaAcaoAntiga,
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

describe('⚠️ o editor avisa o tempo que não cai em quadro inteiro (review do lote 4)', () => {
  // ⚠️ Mudou de propósito (lote 5 do Raio-X, G6): era a `pool`, que passou a 10 quadros por segundo.
  // A `entity-state` segue com o quadro de 1 s.
  test('menos de um quadro: no roteiro não mostra nada, no caso não muda nada', () => {
    expect(avisoDoTempo('entity-state', 0.5, false)).toBe(
      'Nesta cena um quadro dura 1 s: 0,5 s não mostra nada nesta etapa. Use pelo menos 1 s.',
    )
    expect(avisoDoTempo('entity-state', 0.5, true)).toBe(
      'Nesta cena um quadro dura 1 s: 0,5 s não muda nada no caso. Use pelo menos 1 s.',
    )
  })

  test('fora do quadro inteiro: diz quantos quadros, para onde vai o resto e os dois tempos certos', () => {
    expect(avisoDoTempo('draw-loop', 0.6, false)).toBe(
      'Nesta cena um quadro dura 0,25 s: 0,6 s mostra 2 quadros, e o resto fica para a ação seguinte. Use 0,5 s ou 0,75 s.',
    )
    expect(avisoDoTempo('score', 1.5, true)).toBe(
      'Nesta cena um quadro dura 1 s: 1,5 s anda 1 quadro e o resto se perde ao abrir a cena. Use 1 s ou 2 s.',
    )
  })

  test('quadro inteiro, e cena sem relógio: sem aviso', () => {
    expect(avisoDoTempo('draw-loop', 0.5, false)).toBeNull()
    expect(avisoDoTempo('entity-state', 3, true)).toBeNull()
    // A soma binária de 1/30 não pode virar aviso falso.
    expect(avisoDoTempo('gravity', 0.1, false)).toBeNull()
    expect(avisoDoTempo('world', 0.5, false)).toBeNull()
  })

  test('anti-ruído: nenhum roteiro de modelo dispara o aviso', () => {
    const avisos: string[] = []
    for (const scene of SCENE_IDS)
      for (const passo of SCENE_MODELS[scene].script)
        for (const acao of passo.actions)
          if (acao.type === 'advance' && avisoDoTempo(scene, acao.seconds, false))
            avisos.push(`${scene} · ${passo.id}`)
    expect(avisos).toEqual([])
  })
})

describe('⚠️⚠️ os nomes por cena e as ações legadas (consertos do review da onda A do lote 5, B7)', () => {
  const nomes = (scene: SceneId) => sceneActionChoices(scene).map((c) => c.label)

  test('acceleration: "Passar 5 segundos", e o relógio antigo (que não faz nascer cacto) some da lista', () => {
    expect(nomes('acceleration')).toContain('Passar 5 segundos')
    expect(nomes('acceleration')).not.toContain('Sortear velocidade')
    expect(nomes('acceleration')).not.toContain('Avançar o relógio')
    // Continua legal: o roteiro antigo abre, com o nome e a marca de antiga.
    expect(isSceneAction({ type: 'clock' }, 'acceleration')).toBe(true)
    expect(rotuloDaAcaoAntiga({ type: 'clock' }, 'acceleration')).toBe(
      'Avançar o relógio · ação antiga',
    )
  })

  test('restart: sem "Mover o obstáculo" nem "Provocar colisão", e o toque com o nome da bancada', () => {
    expect(nomes('restart')).not.toContain('Mover o obstáculo')
    expect(nomes('restart')).not.toContain('Provocar colisão')
    expect(nomes('restart')).toContain('Tocar na tela')
    // A random segue com o nome de sempre.
    expect(nomes('random')).toContain('Sortear velocidade')
  })

  test('hitbox: a largura diz a porcentagem da bancada', () => {
    const campo = campoNumerico({ type: 'resize', width: 64 })
    expect(campo?.label).toBe('Largura da área (100% do Dino)')
    expect(rotuloDaAcaoAntiga({ type: 'shoot' }, 'hitbox')).toBe('Ação incompatível · revisar')
  })
})
