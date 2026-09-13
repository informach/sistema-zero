import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { type InteractiveBlock, isInteractiveBlock } from '@sistemazero/core/learning'
import { SCENE_MODELS, type SceneStep } from '@sistemazero/core/learning/scene'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { EMPTY_LEARNING, LearningBuilder } = await import(
  '../src/components/editor/learning-builder'
)

/**
 * ⚠️ Estes testes montam o COMPONENTE, e não as regras puras.
 *
 * As regras têm teste próprio e estavam certas; o que não tinha rede era o editor CHAMAR cada
 * uma no gesto certo. Foi ali que os defeitos moraram: a pergunta que atravessava a troca de
 * tipo, o impulso que atravessava a troca de cena e o roteiro que sumia sem aviso.
 */
async function montar(inicial: InteractiveBlock) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let value = inicial
  const render = () =>
    root.render(
      <LearningBuilder
        value={value}
        onChange={(next) => {
          value = next
          render()
        }}
      />,
    )
  await act(async () => render())
  const clicar = async (nome: string) => {
    const alvo = [...container.querySelectorAll('input[type="radio"]')].find((r) =>
      r.closest('label')?.textContent?.startsWith(nome),
    ) as HTMLInputElement | undefined
    if (!alvo)
      throw new Error(
        `Sem "${nome}". Disponíveis: ${[...container.querySelectorAll('input[type="radio"]')]
          .map((r) => r.closest('label')?.textContent?.slice(0, 30))
          .join(' | ')}`,
      )
    await act(async () => alvo.click())
  }
  return {
    clicar,
    get value() {
      return value
    },
    get alerta() {
      return container.querySelector('[role="alert"]')?.textContent ?? ''
    },
    async fechar() {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}

test('⚠️ a pergunta de verificação não atravessa a troca para uma cena', async () => {
  // Ela travava o bloco para sempre: a atividade vira inválida e a caixa de desmarcar some
  // junto com o tipo. O professor levava um erro que fala de outra coisa, na hora de publicar.
  const b = await montar(EMPTY_LEARNING)
  try {
    await b.clicar('Pergunta curta')
    expect(b.value.checkpoint).toBeDefined()
    await b.clicar('Experimentação')
    expect(b.value.checkpoint).toBeUndefined()
    expect(isInteractiveBlock(b.value)).toBe(true)
    expect(b.alerta).toContain('pergunta de verificação')
  } finally {
    await b.fechar()
  }
})

test('⚠️ o impulso inicial não atravessa a troca de cena', async () => {
  const b = await montar({
    ...EMPTY_LEARNING,
    activity: { type: 'experimentation', scene: 'impulse', initialImpulse: 14 },
  })
  try {
    expect(isInteractiveBlock(b.value)).toBe(true)
    await b.clicar('Faça o Dino aparecer')
    expect(isInteractiveBlock(b.value)).toBe(true)
    expect(b.alerta).toContain('impulso inicial')
  } finally {
    await b.fechar()
  }
})

test('⚠️ trocar de cena não sobrescreve o texto que o professor escreveu', async () => {
  const b = await montar({
    ...EMPTY_LEARNING,
    title: 'O Dino sumiu!',
    instructions: 'Descubra por que ele não aparece.',
  })
  try {
    await b.clicar('Quem fica na frente?')
    expect(b.value.title).toBe('O Dino sumiu!')
    expect(b.value.instructions).toBe('Descubra por que ele não aparece.')
  } finally {
    await b.fechar()
  }
})

test('trocar de cena leva o texto do modelo junto para quem não escreveu o próprio', async () => {
  const b = await montar(EMPTY_LEARNING)
  try {
    expect(b.value.title).toBe(SCENE_MODELS.world.title)
    await b.clicar('Quem fica na frente?')
    expect(b.value.title).toBe(SCENE_MODELS.layers.title)
    expect(b.value.instructions).toBe(SCENE_MODELS.layers.instruction)
  } finally {
    await b.fechar()
  }
})

test('⚠️ a cena ACOMPANHA entre demonstração e experimentação', async () => {
  const b = await montar(EMPTY_LEARNING)
  try {
    await b.clicar('Cuide dos cactos invisíveis')
    await b.clicar('Demonstração')
    if (b.value.activity.type !== 'demonstration') throw new Error('tipo errado')
    expect(b.value.activity.scene).toBe('cleanup')
  } finally {
    await b.fechar()
  }
})

test('⚠️ o bloco NOVO já nasce com o texto do modelo', () => {
  // Nascia em branco, e as regras de troca só disparam numa TROCA: clicar no cartão já marcado
  // não emite evento. Quem aceitava o padrão escrevia tudo à mão e ainda levava o erro de
  // campo obrigatório; quem clicava em qualquer outra cena ganhava o texto de graça.
  expect(EMPTY_LEARNING.title).toBe(SCENE_MODELS.world.title)
  expect(EMPTY_LEARNING.instructions).toBe(SCENE_MODELS.world.instruction)
  expect(EMPTY_LEARNING.hints).toEqual([...SCENE_MODELS.world.hints])
  expect(isInteractiveBlock(EMPTY_LEARNING)).toBe(true)
})

test('⚠️ passar por outro tipo e voltar devolve o roteiro escrito à mão', async () => {
  // Os quatro cartões são UM grupo de rádio, e a seta do teclado já seleciona ao passar: ir de
  // Demonstração até HTML atravessa os outros dois. Cada passagem apagava o roteiro autoral.
  const roteiro: SceneStep[] = [
    { id: 'unico', caption: 'Veja o Dino nascer.', actions: [{ type: 'create' }] },
  ]
  const b = await montar({
    ...EMPTY_LEARNING,
    activity: { type: 'demonstration', scene: 'world', script: roteiro },
  })
  try {
    await b.clicar('Pergunta curta')
    expect(b.alerta).toContain('roteiro')
    await b.clicar('Demonstração')
    if (b.value.activity.type !== 'demonstration') throw new Error('tipo errado')
    expect(b.value.activity.script).toEqual(roteiro)
    expect(isInteractiveBlock(b.value)).toBe(true)
  } finally {
    await b.fechar()
  }
})

test('⚠️ a cena escolhida sobrevive a uma passagem por Pergunta curta', async () => {
  const b = await montar(EMPTY_LEARNING)
  try {
    await b.clicar('Cuide dos cactos invisíveis')
    await b.clicar('Pergunta curta')
    await b.clicar('Experimentação')
    if (b.value.activity.type !== 'experimentation') throw new Error('tipo errado')
    expect(b.value.activity.scene).toBe('cleanup')
  } finally {
    await b.fechar()
  }
})

test('⚠️ sair da experimentação avisa que o impulso ajustado não vai junto', async () => {
  const b = await montar({
    ...EMPTY_LEARNING,
    activity: { type: 'experimentation', scene: 'impulse', initialImpulse: 14 },
  })
  try {
    await b.clicar('Pergunta curta')
    expect(b.alerta).toContain('impulso inicial')
    await b.clicar('Experimentação')
    if (b.value.activity.type !== 'experimentation') throw new Error('tipo errado')
    expect(b.value.activity.initialImpulse).toBe(14)
  } finally {
    await b.fechar()
  }
})

test('⚠️ o roteiro de salto atravessa as cenas do meio e chega inteiro na cena irmã', async () => {
  // As catorze cenas são UM grupo de rádio: ir de `gravity` a `impulse` pela seta passa por
  // doze cenas em que o roteiro de salto não vale. A primeira delas o descartava para sempre.
  const roteiro: SceneStep[] = [
    { id: 'pulo', caption: 'Veja o salto.', actions: [{ type: 'impulse', force: 12 }] },
  ]
  const b = await montar({
    ...EMPTY_LEARNING,
    activity: { type: 'demonstration', scene: 'gravity', script: roteiro },
  })
  try {
    await b.clicar('Quem fica na frente?')
    expect(b.alerta).toContain('guardado')
    await b.clicar('Escolha a altura do salto')
    if (b.value.activity.type !== 'demonstration') throw new Error('tipo errado')
    expect(b.value.activity.script).toEqual(roteiro)
    expect(b.alerta).toBe('')
    expect(isInteractiveBlock(b.value)).toBe(true)
  } finally {
    await b.fechar()
  }
})

test('⚠️ o impulso ajustado atravessa uma cena sem salto e volta na cena irmã', async () => {
  const b = await montar({
    ...EMPTY_LEARNING,
    activity: { type: 'experimentation', scene: 'gravity', initialImpulse: 15 },
  })
  try {
    await b.clicar('Quem fica na frente?')
    await b.clicar('Escolha a altura do salto')
    if (b.value.activity.type !== 'experimentation') throw new Error('tipo errado')
    expect(b.value.activity.initialImpulse).toBe(15)
  } finally {
    await b.fechar()
  }
})
