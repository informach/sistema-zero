import { afterEach, describe, expect, test } from 'bun:test'
import type { InteractiveBlock, LearningBlockProgress } from '@sistemazero/core/learning'
import {
  applyExperimentSegment,
  type ExperimentSession,
  initialScene,
  packExperiment,
  readSceneSegment,
  SCENE_MODELS,
  type SceneCheckpoint,
  type SceneId,
  sceneStart,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { ExplorationStage } from '@sistemazero/member-shell/components/exploration-stage'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import { LessonPlayerProvider } from '@sistemazero/member-shell/components/lesson-player-context'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

// ⚠️ `bun:test` não isola módulos entre arquivos: um `globalThis.fetch` deixado para trás vira
// teste vermelho no CI e verde aqui, dependendo da ORDEM em que os arquivos rodam.
const fetchOriginal = globalThis.fetch
afterEach(() => {
  cleanup()
  globalThis.fetch = fetchOriginal
  localStorage.clear()
})
function content(scene: SceneId): InteractiveBlock {
  const modelo = SCENE_MODELS[scene]
  return {
    kind: 'interactive',
    title: modelo.title,
    instructions: modelo.instruction,
    hints: [],
    required: false,
    activity: { type: 'experimentation', scene },
  }
}
function block(scene: SceneId) {
  return {
    id: 'discovery',
    blockRevision: 'revision',
    kind: 'interactive',
    sortOrder: 0,
    content: content(scene),
  }
}

/**
 * O servidor de verdade, em miniatura: aplica o segmento e devolve o checkpoint.
 *
 * ⚠️ Não dá para responder `{}` aqui. O cliente CONFIRMA o que mandou (`acknowledge`) contra o
 * checkpoint que volta, e uma resposta vazia derruba o envio antes do registro da tentativa —
 * um teste montado assim passaria sem exercitar nada depois do primeiro POST.
 */
function servidorFalso(scene: SceneId) {
  const start = sceneStart({ type: 'experimentation', scene })
  let checkpoint: SceneCheckpoint<ExperimentSession> | null = null
  const enviados: Record<string, unknown>[] = []
  const answers = () => ({
    sceneSequence: checkpoint?.sequence ?? 0,
    sceneSessionId: checkpoint?.sessionId ?? '',
    sceneSegmentId: checkpoint?.segmentId ?? '',
    sceneCheckpoint: checkpoint ? packExperiment(scene, checkpoint.session) : [],
  })
  const progresso = () => ({
    blockId: 'discovery',
    revision: 'revision',
    answers: answers(),
    hintsUsed: 0,
    positionSeconds: null,
    attemptsCount: 0,
    result: null,
    updatedAt: new Date().toISOString(),
  })
  const fetchFalso = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {}
    enviados.push({ url, ...body })
    if (url.endsWith('/learning-progress')) {
      const segment = readSceneSegment(body.answers)
      if (segment) checkpoint = applyExperimentSegment(start, checkpoint, segment)
      return Response.json(progresso())
    }
    if (url.endsWith('/learning-attempts'))
      return Response.json({
        attempt: { result: { participated: true, passed: true, feedback: 'Feito.' } },
        progress: { ...progresso(), attemptsCount: 1, result: { passed: true } },
      })
    return Response.json(progresso())
  }) as unknown as typeof fetch
  return { fetchFalso, enviados }
}

describe('a criança mexendo na cena', () => {
  test('a pista do MODELO conta como pista usada, mesmo sem o professor ter escrito uma', async () => {
    // Sem isso a escada de três degraus da cena sairia de graça: a evidência diria que a
    // criança descobriu sozinha o que ela leu na dica.
    const progresso: LearningBlockProgress[] = []
    const { fetchFalso, enviados } = servidorFalso('layers')
    globalThis.fetch = fetchFalso
    render(
      <LessonPlayerProvider
        value={{
          lessonId: 'lesson',
          courseSlug: 'course',
          viewerId: 'child-a',
          viewerWatermark: null,
          initialPositionSeconds: null,
          onLearningProgress: (p) => progresso.push(p),
        }}
      >
        <InteractiveLessonBlock block={block('layers')} />
      </LessonPlayerProvider>,
    )
    expect(SCENE_MODELS.layers.hints).toHaveLength(3)
    fireEvent.click(await screen.findByRole('button', { name: 'Uma pista' }))
    expect(screen.getByText(SCENE_MODELS.layers.hints[0] as string)).toBeTruthy()
    // O que importa é o que SOBE: a evidência guardada tem que contar a pista lida.
    // ⚠️ O player grava numa batida de 1s, então o `waitFor` padrão (1s) é cara ou coroa: o
    // teste passava sozinho e caía na suíte inteira, que é a pior forma de vermelho.
    await waitFor(() => expect(enviados.some((e) => e.hintsUsed === 1)).toBe(true), {
      timeout: 5000,
    })
    expect(progresso.length).toBeGreaterThan(0)
  })

  test('cacto que sai da pista é contado como fora, não pendurado na borda', () => {
    const activity = { type: 'experimentation', scene: 'random' } as const
    const start = sceneStart(activity)
    const nascido = stepScene(start, initialScene(start), {
      type: 'sample',
      kind: 'position',
      unit: 0,
      guided: true,
    })
    const state = stepScene(start, nascido, { type: 'advance', seconds: 4 })
    expect(state.crowd.cacti[0]?.x).toBe(-100)
    render(<ExplorationStage activity={activity} state={state} dispatch={() => {}} paused />)
    expect(screen.getByText('1 cacto fora da pista')).toBeTruthy()
    expect(screen.queryByLabelText('Cacto 1, velocidade -5')).toBeNull()
  })

  test('⚠️ o desfazer volta o mundo mas NÃO apaga a descoberta', async () => {
    // A criança desfaz para tentar de outro jeito, não para perder o que já entendeu. Sem isso
    // o medidor andaria para trás e a cena castigaria justamente quem experimenta mais.
    render(<InteractiveLessonBlock block={block('layers')} previewContent={content('layers')} />)
    expect(screen.queryByRole('button', { name: 'Testar' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Depois' }))
    await waitFor(() => expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('2'))
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
    expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('2')
  })

  test('o encosto é reconhecido por posição E por área, sem precisar tocar em "ver"', async () => {
    // O `hitbox` mostra a cena de referência, onde a criança arrasta. Os controles com rótulo
    // são a via de quem não arrasta (teclado, leitor de tela) e têm que chegar na MESMA
    // descoberta — senão a cena só é jogável com o mouse.
    render(<InteractiveLessonBlock block={block('hitbox')} previewContent={content('hitbox')} />)
    const distancia = screen.getByRole('slider', { name: 'Distância do cacto' })
    const largura = screen.getByRole('slider', { name: 'Largura da área do Dino' })
    fireEvent.change(distancia, { target: { value: '60' } })
    fireEvent.change(largura, { target: { value: '120' } })
    fireEvent.change(distancia, { target: { value: '25' } })
    await waitFor(() =>
      expect(Number(screen.getByRole('meter').getAttribute('aria-valuenow'))).toBeGreaterThan(0),
    )
    expect(screen.queryByRole('button', { name: 'Ver movimento' })).toBeNull()
  })

  test('a ligação tem alternativa de dois toques e o mundo guarda o MESMO objeto', async () => {
    render(<InteractiveLessonBlock block={block('world')} previewContent={content('world')} />)
    fireEvent.click(screen.getByRole('button', { name: '＋ Criar Dino' }))
    fireEvent.click(screen.getByRole('button', { name: '◉ Desenhar' }))
    expect(screen.getByText('Agora toque em Tela do jogo para ligar.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '◎ Tela do jogo' }))
    await waitFor(() => expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('2'))
    expect(screen.getByText('Bastidores · 1 Dino guardado')).toBeTruthy()
  })

  test('⚠️ cumprir o objetivo NÃO encerra a cena, e a descoberta registrada não pisca', async () => {
    // Pedido dela (14/09/2026): "a primeira vez que ela cumpre o objetivo já marca a sessão,
    // mas os botões não podem ficar desativados — ela pode querer refazer para ver se
    // entendeu mesmo". `layers` é o caso duro: ele exige a montagem ASSENTADA no estado
    // descoberto, então desfazer depois de concluir faz o avaliador local dizer "não passou".
    // O registro é um acontecimento e não se desfaz — nem na tela, nem no servidor.
    const { fetchFalso, enviados } = servidorFalso('layers')
    globalThis.fetch = fetchFalso
    render(
      <LessonPlayerProvider
        value={{
          lessonId: 'lesson',
          courseSlug: 'course',
          viewerId: 'child-v6',
          viewerWatermark: null,
          initialPositionSeconds: null,
        }}
      >
        <InteractiveLessonBlock block={block('layers')} />
      </LessonPlayerProvider>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Depois' }))
    await waitFor(() => expect(screen.getByText('Descoberta registrada.')).toBeTruthy(), {
      timeout: 5000,
    })
    const tentativas = () =>
      enviados.filter((e) => String(e.url).endsWith('/learning-attempts')).length
    const gestos = () => enviados.filter((e) => e.hintsUsed !== undefined).length
    const antes = gestos()
    const registradas = tentativas()
    // ⚠️ O `<fieldset disabled>` é quem travava tudo, e ele NÃO marca os botões de dentro:
    // `button.disabled` continua false mesmo desabilitado por herança (e o happy-dom ainda
    // dispara o clique). Quem morde é o fieldset — asserção nos dois níveis.
    for (const nome of ['Desfazer', 'Recomeçar', 'Uma pista', 'Ligar som']) {
      const botao = screen.getByRole('button', { name: nome })
      expect(botao).toHaveProperty('disabled', false)
      expect(botao.closest('fieldset')?.disabled).toBe(false)
    }
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Recomeçar' }))
    // Os comandos RODARAM: o guard dos comandos também olhava o `passed`, então destravar só
    // o fieldset deixaria os botões clicáveis e mudos — e o servidor não veria gesto nenhum.
    await waitFor(() => expect(gestos()).toBeGreaterThan(antes), { timeout: 5000 })
    // A descoberta ficou (desfazer volta o MUNDO, não o que ela aprendeu) e o cartão de
    // conclusão continua ali, embora `layers` peça a montagem assentada para "passar".
    expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('2')
    expect(screen.getByText('Descoberta registrada.')).toBeTruthy()
    // E ninguém registra duas vezes: a marcação é primeira-vez-só.
    expect(tentativas()).toBe(registradas)
  })

  test('⚠️ envio em voo não trava a cena, e o que ela fez DEPOIS não se perde', async () => {
    // O caso real: a criança mexe, o salvamento sai, a rede demora. Se a cena congelasse até a
    // resposta, ela pararia no meio de um pensamento; e se o aceite do servidor limpasse os
    // pendentes por inteiro, o gesto feito durante a espera sumiria sem ninguém ver.
    const { fetchFalso, enviados } = servidorFalso('layers')
    let liberar: (() => void) | undefined
    const submitted: LearningBlockProgress[] = []
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith('/learning-progress') && !liberar)
        await new Promise<void>((resolve) => {
          liberar = resolve
        })
      return fetchFalso(input, init)
    }) as unknown as typeof fetch
    render(
      <LessonPlayerProvider
        value={{
          lessonId: 'lesson',
          courseSlug: 'course',
          viewerId: 'child-v5',
          viewerWatermark: null,
          initialPositionSeconds: null,
          onLearningProgress: (p) => submitted.push(p),
        }}
      >
        <InteractiveLessonBlock block={block('layers')} />
      </LessonPlayerProvider>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Depois' }))
    await waitFor(() => expect(liberar).toBeDefined(), { timeout: 5000 })
    // A cena continua viva enquanto o pedido está em voo.
    const antes = screen.getByRole('button', { name: 'Antes' })
    expect(antes).toHaveProperty('disabled', false)
    fireEvent.click(antes)
    await act(async () => {
      liberar?.()
    })
    // O servidor confirmou o primeiro gesto; o segundo continua a caminho, não apagado.
    await waitFor(() => expect(enviados.filter((e) => e.hintsUsed !== undefined).length).toBe(2), {
      timeout: 5000,
    })
    expect(submitted.length).toBeGreaterThan(0)
  })
})

describe('a previsão sobe junto da tentativa', () => {
  test('⚠️ o palpite viaja nas respostas, e NÃO entra no checkpoint da cena', async () => {
    // O professor quer saber o que a turma achou que ia acontecer. ⚠️ Isso não cabe no
    // checkpoint: o checkpoint alimenta o `passed`, e um palpite errado reprovaria a atividade
    // — exatamente o contrário do que a previsão ensina. Por isso ela viaja em `answers` e o
    // motor da cena nunca a vê.
    const { fetchFalso, enviados } = servidorFalso('layers')
    globalThis.fetch = fetchFalso
    const comPrevisao: InteractiveBlock = {
      ...content('layers'),
      prediction: {
        prompt: 'Quem aparece na frente: quem foi desenhado antes ou depois?',
        choices: [
          { id: 'antes', label: 'Quem foi desenhado antes' },
          { id: 'depois', label: 'Quem foi desenhado depois' },
        ],
      },
    }
    render(
      <LessonPlayerProvider
        value={{
          lessonId: 'lesson',
          courseSlug: 'course',
          viewerId: 'child-previsao',
          viewerWatermark: null,
          initialPositionSeconds: null,
        }}
      >
        <InteractiveLessonBlock block={{ ...block('layers'), content: comPrevisao }} />
      </LessonPlayerProvider>,
    )
    // Antes do palpite a cena está fechada: o botão da montagem é herdeiro do fieldset.
    const depois = await screen.findByRole('button', { name: 'Depois' })
    expect(depois.closest('fieldset')?.disabled).toBe(true)
    fireEvent.click(screen.getByRole('radio', { name: 'Quem foi desenhado antes' }))
    await waitFor(() => expect(depois.closest('fieldset')?.disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Depois' }))
    await waitFor(() => expect(screen.getByText('Descoberta registrada.')).toBeTruthy(), {
      timeout: 5000,
    })
    const tentativa = enviados.find((e) => String(e.url).endsWith('/learning-attempts'))
    const respostas = tentativa?.answers as Record<string, unknown>
    expect(respostas.prediction).toBe('antes')
    // ⚠️ E o palpite errado não muda o veredito: a cena registrou a descoberta do mesmo jeito.
    expect(screen.getByText('Descoberta registrada.')).toBeTruthy()
    // O segmento que o motor manda continua sem ela (é o que o servidor aplica no checkpoint).
    for (const enviado of enviados.filter((e) => String(e.url).endsWith('/learning-progress')))
      expect((enviado.answers as Record<string, unknown>).prediction).toBeUndefined()
    // E ela sobrevive ao recarregar a aba: o palpite é da sessão, não do render.
    expect(
      sessionStorage.getItem('sz:scene-prediction:child-previsao:lesson:discovery:revision'),
    ).toBe('antes')
    sessionStorage.clear()
  })
})
