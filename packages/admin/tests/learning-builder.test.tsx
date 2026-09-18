import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { type InteractiveBlock, isInteractiveBlock } from '@sistemazero/core/learning'
import { SCENE_MODELS, SCENE_QUESTIONS, type SceneStep } from '@sistemazero/core/learning/scene'

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
  /** As caixas de marcar (a pergunta anexa, a previsão, "sem a pergunta do fim"). */
  const marcar = async (trecho: string) => {
    const alvo = [...container.querySelectorAll('input[type="checkbox"]')].find((c) =>
      c.closest('label')?.textContent?.includes(trecho),
    ) as HTMLInputElement | undefined
    if (!alvo)
      throw new Error(
        `Sem a caixa "${trecho}". Disponíveis: ${[
          ...container.querySelectorAll('input[type="checkbox"]'),
        ]
          .map((c) => c.closest('label')?.textContent?.slice(0, 50))
          .join(' | ')}`,
      )
    await act(async () => alvo.click())
  }
  return {
    clicar,
    marcar,
    temCaixa: (trecho: string) =>
      [...container.querySelectorAll('input[type="checkbox"]')].some((c) =>
        c.closest('label')?.textContent?.includes(trecho),
      ),
    get texto() {
      return container.textContent ?? ''
    },
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

test('⭐ a pergunta de verificação ATRAVESSA a troca para uma cena', async () => {
  // Ela era apagada porque a cena recusava pergunta anexa. Desde 15/09/2026 a cena a aceita (é
  // o terceiro tempo do ciclo), então apagá-la voltou a ser perda de trabalho — e a caixa de
  // desmarcar existe nos quatro tipos, então o professor tem como tirá-la se quiser.
  const b = await montar(EMPTY_LEARNING)
  try {
    await b.clicar('Pergunta curta')
    expect(b.value.checkpoint).toBeDefined()
    await b.clicar('Experimentação')
    // A pergunta em BRANCO continua não ficando presa: ela invalidaria o bloco sem dizer onde.
    expect(b.value.checkpoint).toBeUndefined()
    expect(isInteractiveBlock(b.value)).toBe(true)
  } finally {
    await b.fechar()
  }
})

test('⭐ a pergunta ESCRITA sobrevive à troca para uma cena', async () => {
  const b = await montar({
    ...EMPTY_LEARNING,
    activity: { type: 'question' },
    checkpoint: {
      prompt: 'Por que o y desceu?',
      choices: [
        { id: 'a', label: 'Porque cresce para baixo' },
        { id: 'b', label: 'Porque cresce para cima' },
      ],
      correctChoiceId: 'a',
      explanation: 'Na tela, a contagem começa no alto.',
    },
  })
  try {
    await b.clicar('Experimentação')
    expect(b.value.checkpoint?.prompt).toBe('Por que o y desceu?')
    expect(isInteractiveBlock(b.value)).toBe(true)
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
    await b.clicar('Para onde vai o cacto que sai da tela?')
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

test('a previsão própria começa com o contexto claro da cena', async () => {
  const b = await montar(EMPTY_LEARNING)
  try {
    await b.marcar('Escrever a minha previsão')
    expect(b.value.prediction?.context).toEqual(SCENE_QUESTIONS.world.prediction.context)
    expect(b.texto).toContain('O que vamos usar')
    expect(b.texto).toContain('Como apresentar antes do palpite')
  } finally {
    await b.fechar()
  }
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
    await b.clicar('Para onde vai o cacto que sai da tela?')
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

test('⚠️⚠️ "Experimentar a prévia" CORRIGE de verdade: errar recebe recado, acertar a explicação', async () => {
  /**
   * Lote 2 do Raio-X (16/09/2026). A prévia do editor montava o bloco sem ensaio em volta, e sem
   * ensaio não havia quem corrigisse: QUALQUER resposta da pergunta concluía sem recado. O professor
   * que testava ali concluía que toda opção passava e nunca lia a explicação que ele mesmo escreveu.
   */
  const { SCENE_QUESTIONS } = await import('@sistemazero/core/learning/scene')
  const b = await montar({
    kind: 'interactive',
    title: SCENE_MODELS.world.title,
    instructions: SCENE_MODELS.world.instruction,
    hints: [],
    required: false,
    activity: { type: 'experimentation', scene: 'world' },
  })
  const esperar = () => act(async () => await new Promise((r) => setTimeout(r, 60)))
  const botao = (raiz: ParentNode, nome: string) =>
    [...raiz.querySelectorAll('button')].find((x) => x.textContent?.trim() === nome)
  // ⚠️ Mudou de propósito (consertos do review do lote 2): as opções do palpite e da pergunta são
  // BOTÕES, não rádios (a seta do teclado escolhia e mandava uma tentativa por seta).
  const radio = (raiz: ParentNode, rotulo: string) =>
    [...raiz.querySelectorAll('button')].find((r) => r.textContent?.trim() === rotulo) as
      | HTMLButtonElement
      | undefined
  try {
    await act(async () => botao(document, 'Experimentar a prévia')?.click())
    const previa = document.querySelector('.sz-lesson-scene') as HTMLElement
    expect(previa.textContent).toContain('Prévia: nada é guardado.')
    const modelo = SCENE_QUESTIONS.world
    await act(async () => radio(previa, modelo.prediction.choices[0]?.label as string)?.click())
    await act(async () => botao(previa, '＋ Criar Dino')?.click())
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): o fio do desenho da `world` virou uma chave.
    await act(async () => botao(previa, 'Desenhar o Dino na tela: desligado')?.click())
    await esperar()
    expect(previa.textContent).toContain('Agora explique')
    const errada = modelo.explain.choices.find((c) => c.id !== modelo.explain.correctChoiceId)
    const certa = modelo.explain.choices.find((c) => c.id === modelo.explain.correctChoiceId)
    await act(async () => radio(previa, errada?.label as string)?.click())
    await esperar()
    expect(previa.textContent).toContain('Ainda não é essa')
    expect(previa.textContent).not.toContain(modelo.explain.explanation)
    await act(async () => radio(previa, certa?.label as string)?.click())
    await esperar()
    expect(previa.textContent).toContain('Certo!')
    expect(previa.textContent).toContain(modelo.explain.explanation)
  } finally {
    await b.fechar()
  }
})

test('⚠️⚠️ a pilha de camadas: só na layers, acompanha a cena irmã e sai ao trocar de cena', async () => {
  // Full review de experiência do conjunto (A1): a `layers` do Meu Jeito fala com o painel Camadas do
  // Pinta. Levada para outra cena, a pilha invalidaria o bloco sem nada na tela para consertar.
  const b = await montar(EMPTY_LEARNING)
  try {
    await b.clicar('Quem fica na frente?')
    await b.clicar('Painel Camadas do Pinta')
    const atividade = () => b.value.activity as { type: string; pilha?: string; scene?: string }
    expect(atividade().pilha).toBe('camadas')
    expect(isInteractiveBlock(b.value)).toBe(true)
    await b.clicar('Demonstração')
    expect(atividade().type).toBe('demonstration')
    expect(atividade().pilha).toBe('camadas')
    expect(isInteractiveBlock(b.value)).toBe(true)
    await b.clicar('Para onde vai o cacto que sai da tela?')
    expect(atividade().scene).toBe('cleanup')
    expect(atividade().pilha).toBeUndefined()
    expect(isInteractiveBlock(b.value)).toBe(true)
    await b.clicar('Quem fica na frente?')
    await b.clicar('Lista de blocos do Estúdio')
    expect(atividade().pilha).toBeUndefined()
  } finally {
    await b.fechar()
  }
})

const SEM_PERGUNTA = 'sem a pergunta do fim'

test('⭐⭐ a caixa "sem a pergunta do fim" tira a pergunta de fábrica da experimentação', async () => {
  // Decisão da dona (17/09/2026): a Aula 1 do Corre Dino tem quatro cenas seguidas, cada uma com
  // previsão E pergunta. Até aqui não havia como uma aula dizer "aqui a criança só mexe".
  const b = await montar(EMPTY_LEARNING)
  try {
    const modelo = SCENE_QUESTIONS.world.explain
    expect(b.texto).toContain(modelo.prompt)
    await b.marcar(SEM_PERGUNTA)
    expect(b.value.semPerguntaFinal).toBe(true)
    expect(isInteractiveBlock(b.value)).toBe(true)
    // A pergunta herdada some da tela junto: prometê-la ali seria mentira.
    expect(b.texto).not.toContain(modelo.prompt)
    expect(b.texto).toContain('sem pergunta')
    await b.marcar(SEM_PERGUNTA)
    expect(b.value.semPerguntaFinal).toBeUndefined()
    expect(b.texto).toContain(modelo.prompt)
  } finally {
    await b.fechar()
  }
})

test('⚠️ escrever a minha pergunta DESMARCA a caixa (as duas juntas são recusadas)', async () => {
  const b = await montar(EMPTY_LEARNING)
  try {
    await b.marcar(SEM_PERGUNTA)
    expect(b.value.semPerguntaFinal).toBe(true)
    await b.marcar('Escrever a minha pergunta')
    expect(b.value.semPerguntaFinal).toBeUndefined()
    expect(b.value.checkpoint?.prompt).toBe(SCENE_QUESTIONS.world.explain.prompt)
    expect(isInteractiveBlock(b.value)).toBe(true)
  } finally {
    await b.fechar()
  }
})

test('⚠️ a caixa NÃO existe onde não há pergunta de fábrica para tirar', async () => {
  const b = await montar(EMPTY_LEARNING)
  try {
    expect(b.temCaixa(SEM_PERGUNTA)).toBe(true)
    // A demonstração não herda pergunta (a criança assistiu), e o core recusa o campo ali.
    await b.clicar('Demonstração')
    expect(b.temCaixa(SEM_PERGUNTA)).toBe(false)
    await b.clicar('Pergunta curta')
    expect(b.temCaixa(SEM_PERGUNTA)).toBe(false)
  } finally {
    await b.fechar()
  }
})
