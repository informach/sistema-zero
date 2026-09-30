import { afterEach, describe, expect, test } from 'bun:test'
import { type InteractiveBlock, publicInteractiveBlock } from '@sistemazero/core/learning'
import { SCENE_MODELS, type SceneActivity } from '@sistemazero/core/learning/scene'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/**
 * O CONSOLE v2 (30/09/2026), pelo player de verdade: o momento na placa, a lista do que ela já
 * descobriu, a frase da situação no pé do mundo e cada ferramenta perto do que ela mexe.
 *
 * ⚠️⚠️ O que mais importa aqui é o ANTI-VÁCUO da lista: o `label` de uma meta é a conclusão (a
 * resposta), e uma lista que o mostrasse antes de a meta cair entregaria a descoberta a quem lê a
 * tela. Decisão dela (30/09): a pendente fica trancada e NEUTRA.
 */

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function bloco(
  activity: SceneActivity,
  prediction?: InteractiveBlock['prediction'],
): InteractiveBlock {
  const modelo = SCENE_MODELS[activity.scene]
  return {
    kind: 'interactive',
    title: modelo.title,
    instructions: modelo.instruction,
    hints: [],
    required: false,
    activity,
    ...(prediction ? { prediction } : {}),
  }
}
/** A prévia do professor: o player inteiro, com o avaliador de verdade e sem servidor. */
function abrir(conteudo: InteractiveBlock) {
  return render(
    <InteractiveLessonBlock
      block={{
        id: 'b',
        blockRevision: 'r',
        kind: 'interactive',
        sortOrder: 0,
        content: publicInteractiveBlock(conteudo),
      }}
      previewContent={conteudo}
    />,
  )
}

const PALPITE: NonNullable<InteractiveBlock['prediction']> = {
  context: {
    label: 'Bastidores e tela do jogo',
    explanation:
      'Nesta experiência, vamos comparar o que existe nos bastidores com o que aparece na tela do jogo.',
  },
  prompt: 'Você cria e não liga o desenho. O que aparece?',
  choices: [
    { id: 'aparece', label: 'O Dino aparece', shows: 'Olhe a tela: ela ficou vazia.' },
    { id: 'vazia', label: 'A tela fica vazia' },
  ],
  correctChoiceId: 'vazia',
  revealOn: 'hidden',
}

// As duas metas da `world`, pelo catálogo: o rótulo de cada uma é a CONCLUSÃO.
const NOS_BASTIDORES = 'O Dino existe nos bastidores'
const NA_TELA = 'O mesmo Dino aparece na tela'
const PENDENTE = 'Ainda tem uma descoberta aqui.'

describe('o console v2: o momento, as descobertas e o pé do mundo', () => {
  test('⚠️⚠️ a lista NÃO entrega a conclusão de uma meta pendente; ela aparece só quando a meta cai', async () => {
    const { container } = abrir(bloco({ type: 'experimentation', scene: 'world' }, PALPITE))
    fireEvent.click(await screen.findByRole('button', { name: 'O Dino aparece' }))
    await waitFor(() => expect(screen.getByText('Seu palpite:')).toBeTruthy())

    const momento = () => container.querySelector('.sz-scene-momento')
    expect(momento()?.textContent).toBe('Sua vez')
    expect(momento()?.getAttribute('data-momento')).toBe('sua-vez')
    // ⚠️ As DUAS classes: a `.sz-scene-placa` base vencia a `.sz-scene-momento` (mesma
    // especificidade, vem depois no CSS) e o momento saía cinza; o CSS mira `.sz-scene-placa.sz-scene-momento`.
    expect(momento()?.classList.contains('sz-scene-placa')).toBe(true)

    // As duas metas, trancadas e neutras: nenhum rótulo de conclusão na tela.
    expect(screen.getAllByText(PENDENTE)).toHaveLength(2)
    expect(screen.queryByText(NOS_BASTIDORES)).toBeNull()
    expect(screen.queryByText(NA_TELA)).toBeNull()

    // A primeira meta cai: só ELA vira rótulo; a segunda segue trancada.
    fireEvent.click(screen.getByRole('button', { name: 'Criar o Dino' }))
    await waitFor(() => expect(screen.getByText(NOS_BASTIDORES)).toBeTruthy())
    expect(screen.getByText(NOS_BASTIDORES).closest('li')?.hasAttribute('data-feita')).toBe(true)
    expect(screen.getAllByText(PENDENTE)).toHaveLength(1)
    expect(screen.queryByText(NA_TELA)).toBeNull()
    expect(momento()?.textContent).toBe('Sua vez')

    // A segunda cai: a cena fecha e o momento muda.
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar o Dino na tela' }))
    await waitFor(() => expect(screen.getByText(NA_TELA)).toBeTruthy())
    expect(screen.queryByText(PENDENTE)).toBeNull()
    await waitFor(() => expect(momento()?.textContent).toBe('Você descobriu'))
    expect(momento()?.getAttribute('data-momento')).toBe('descobriu')
  })

  test('cada ferramenta mora perto do que ela mexe: o mundo à esquerda, a descoberta à direita', async () => {
    const { container } = abrir(bloco({ type: 'experimentation', scene: 'world' }, PALPITE))
    fireEvent.click(await screen.findByRole('button', { name: 'O Dino aparece' }))
    await waitFor(() => expect(screen.getByText('Seu palpite:')).toBeTruthy())

    const visual = container.querySelector('.sz-scene-console-visual') as HTMLElement
    const descobertas = container.querySelector('.sz-scene-descobertas') as HTMLElement
    expect(visual).not.toBeNull()
    expect(descobertas).not.toBeNull()

    // A frase da situação é o narrador do MUNDO: mora sob o palco, no lugar que só cresce.
    const situacao = visual.querySelector('[data-lugar-reservado="situacao"] p.sz-scene-situacao')
    expect(situacao).not.toBeNull()
    expect(situacao?.getAttribute('role')).toBe('status')
    // Desfazer e Recomeçar mexem no mundo; Uma pista e Conferir falam da descoberta.
    expect(visual.contains(screen.getByRole('button', { name: 'Desfazer' }))).toBe(true)
    expect(visual.contains(screen.getByRole('button', { name: 'Recomeçar' }))).toBe(true)
    expect(descobertas.contains(screen.getByRole('button', { name: 'Uma pista' }))).toBe(true)
    expect(descobertas.contains(screen.getByRole('button', { name: 'Conferir' }))).toBe(true)
    // A bancada diz o que ela é.
    expect(container.querySelector('.sz-scene-prancha .sz-scene-prancha-titulo')?.textContent).toBe(
      'Sua vez',
    )

    // ⚠️⚠️ Só a BANCADA rola: fala e prancha no `.sz-scene-console-rolo`, a lista de descobertas FORA
    // dele (review visual de 30/09: numa bancada alta a lista sumia no rolo).
    const rolo = container.querySelector('.sz-scene-console-rolo') as HTMLElement
    expect(rolo).not.toBeNull()
    expect(rolo.contains(container.querySelector('.sz-scene-prancha'))).toBe(true)
    expect(rolo.contains(container.querySelector('.sz-scene-console-fala'))).toBe(true)
    expect(rolo.contains(descobertas)).toBe(false)

    // A resposta do Conferir sai ao lado do botão que a pediu, dentro da lista de descobertas.
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }))
    const resposta = await screen.findByText(/^Ainda não\. Tente:/)
    expect(descobertas.contains(resposta)).toBe(true)
  })

  test('a faixa vira ladrilhos com o valor escuro: a cor do par fica na classe do valor', async () => {
    const { container } = abrir(bloco({ type: 'experimentation', scene: 'coordinates' }))
    await screen.findByRole('meter')
    const ladrilhos = [...container.querySelectorAll('.sz-scene-hud-tile')]
    expect(ladrilhos.length).toBeGreaterThanOrEqual(2)
    for (const ladrilho of ladrilhos) {
      expect(ladrilho.querySelector('dt.sz-scene-hud-rotulo')).not.toBeNull()
      expect(ladrilho.querySelector('dd.sz-scene-hud-valor')).not.toBeNull()
    }
    // O x e o y são o par (a régua dos testes da faixa): `text-scene-a` e `text-scene-b-ink`.
    const tons = ladrilhos.map((l) => l.querySelector('dd')?.className ?? '')
    expect(tons.some((t) => t.includes('text-scene-a'))).toBe(true)
    expect(tons.some((t) => t.includes('text-scene-b-ink'))).toBe(true)
    // Valores curtos ("0"): sem `data-medida`.
    for (const ladrilho of ladrilhos) expect(ladrilho.hasAttribute('data-medida')).toBe(false)
  })

  test('um valor longo na faixa é marcado (`data-medida`) para o CSS não o quebrar em três linhas', async () => {
    // A `frames` lê "4 quadros por segundo" (21 caracteres): é `longa`; "1 de 2" e "parada" não.
    const { container } = abrir(bloco({ type: 'experimentation', scene: 'frames' }))
    await screen.findByRole('meter')
    const longos = [...container.querySelectorAll('.sz-scene-hud-tile[data-medida="longa"]')]
    expect(longos.length).toBe(1)
    expect(longos[0]?.querySelector('dd')?.textContent).toBe('4 quadros por segundo')
    expect(container.querySelectorAll('.sz-scene-hud-tile:not([data-medida])').length).toBe(2)
  })
})
