import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { isSceneSetup, type SceneActivity } from '@sistemazero/core/learning/scene'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { SceneSetupEditor } = await import('../src/components/editor/scene-setup-editor')

/**
 * ⚠️⚠️ O caso citando um objetivo que a cena NÃO tem (full review final de dados e deploy, MÉDIO-3).
 * O editor só desenha as caixas dos objetivos que existem: sem o aviso, a professora lia "desmarque
 * as descobertas" sem ter o que desmarcar, e o bloco não salvava. Quem autora precisa VER o erro.
 */
async function montar(inicial: SceneActivity) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let activity = inicial
  const render = () =>
    root.render(
      <SceneSetupEditor
        activity={activity}
        onChange={(next) => {
          activity = next
          render()
        }}
      />,
    )
  await act(async () => render())
  return {
    container,
    get activity() {
      return activity
    },
    aviso: () => container.querySelector('[role="alert"]'),
    tirar: async () => {
      const botao = [...container.querySelectorAll('button')].find(
        (b) => b.textContent === 'Tirar do caso',
      )
      if (!botao) throw new Error('Faltou o botão "Tirar do caso"')
      await act(async () => botao.click())
    },
    desmontar: async () => {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}

test('⚠️⚠️ o objetivo que não existe é NOMEADO, e "Tirar do caso" deixa o caso salvável', async () => {
  const tela = await montar({
    type: 'experimentation',
    scene: 'coordinates',
    setup: { goals: ['same-x', 'down'] },
  })
  try {
    expect(tela.aviso()?.textContent).toContain('same-x')
    expect(tela.aviso()?.textContent).toContain('não é um objetivo desta cena')
    // O aviso genérico não aparece junto: o que falta resolver é só a meta que saiu.
    expect(tela.container.textContent).not.toContain('Este caso não vale para a cena escolhida')
    await tela.tirar()
    expect(tela.activity.setup).toEqual({ goals: ['down'] })
    expect(isSceneSetup(tela.activity.setup, 'coordinates')).toBe(true)
    expect(tela.aviso()).toBeNull()
  } finally {
    await tela.desmontar()
  }
})

test('⚠️ nenhum objetivo entra sozinho no lugar: o aviso lista os dois e a troca é DELA', async () => {
  const tela = await montar({
    type: 'experimentation',
    scene: 'sheet-vs-sprite',
    setup: { goals: ['cut', 'two-cells', 'crop-whole'] },
  })
  try {
    const texto = tela.aviso()?.textContent ?? ''
    expect(texto).toContain('cut')
    expect(texto).toContain('two-cells')
    await tela.tirar()
    // Só o que ela tinha marcado de verdade sobra: nada é escolhido no lugar do que saiu.
    expect(tela.activity.setup).toEqual({ goals: ['crop-whole'] })
  } finally {
    await tela.desmontar()
  }
})

test('um caso que só tinha objetivos inexistentes some inteiro (caso vazio não é caso)', async () => {
  const tela = await montar({
    type: 'experimentation',
    scene: 'hitbox',
    setup: { goals: ['separate'] },
  })
  try {
    await tela.tirar()
    expect(tela.activity.setup).toBeUndefined()
    expect(tela.aviso()).toBeNull()
  } finally {
    await tela.desmontar()
  }
})
