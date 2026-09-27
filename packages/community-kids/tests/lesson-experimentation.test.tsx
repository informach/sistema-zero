import { afterEach, describe, expect, spyOn, test } from 'bun:test'
import {
  evaluateLearning,
  type InteractiveBlock,
  type LearningBlockProgress,
  PERGUNTA_MUDOU,
  publicInteractiveBlock,
} from '@sistemazero/core/learning'
import {
  applyExperimentSegment,
  type ExperimentSession,
  initialScene,
  openScene,
  packExperiment,
  readSceneSegment,
  SCENE_IDS,
  SCENE_MODELS,
  SCENE_QUESTIONS,
  type SceneActivity,
  type SceneCheckpoint,
  type SceneId,
  sceneEmitsSound,
  sceneGoals,
  sceneStart,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { ExperienceConnection } from '@sistemazero/member-shell/components/experience-connection'
import { ExplorationStage } from '@sistemazero/member-shell/components/exploration-stage'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import { LessonPlayerProvider } from '@sistemazero/member-shell/components/lesson-player-context'
import { guardarPalpite } from '@sistemazero/member-shell/components/scene-prediction'
import { registerLessonMedia } from '@sistemazero/member-shell/lib/lesson-media-focus'
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

/**
 * Força a gravação que a batida de 1 s do player faria (o `pagehide` chama o mesmo `flush`) e dá uma volta
 * de tarefas para o envio sair. ⚠️ Esperar a batida em tempo REAL (1,3 s contra 1 s) passava sem conferir
 * nada com a máquina carregada (full review de 16/09/2026).
 */
async function forcarAGravacao() {
  await act(async () => {
    window.dispatchEvent(new Event('pagehide'))
    await new Promise((r) => setTimeout(r, 50))
  })
}
const progressos = (enviados: { url: string }[]) =>
  enviados.filter((e) => e.url.endsWith('/learning-progress')).length

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
    // ⚠️ `toContain` e não igualdade: o primeiro degrau passou a citar a SITUAÇÃO antes do
    // degrau do modelo (15/09/2026), então o texto exibido é maior que a frase do catálogo.
    expect(document.querySelector('[data-pista]')?.textContent).toContain(
      SCENE_MODELS.layers.hints[0] as string,
    )
    // O que importa é o que SOBE: a evidência guardada tem que contar a pista lida.
    // ⚠️ O player grava numa batida de 1s, então o `waitFor` padrão (1s) é cara ou coroa: o
    // teste passava sozinho e caía na suíte inteira, que é a pior forma de vermelho.
    await waitFor(() => expect(enviados.some((e) => e.hintsUsed === 1)).toBe(true), {
      timeout: 5000,
    })
    expect(progresso.length).toBeGreaterThan(0)
  })

  test('⚠️ o sorteio da `random` pode REPETIR, e a régua mostra a marquinha 2×', () => {
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): o sorteio é de verdade, um lugar de 500 a 560 de
    // 10 em 10, e os cactos não correm mais pela pista (eram quatro exemplos fixos, e a cena que
    // pergunta se o lugar pode repetir nunca repetia). O número vem do gesto (`unit`).
    const activity = { type: 'experimentation', scene: 'random' } as const
    const start = sceneStart(activity)
    let state = initialScene(start)
    for (const unit of [0.3, 0.75, 0.35])
      state = stepScene(start, state, { type: 'sample', kind: 'position', unit, guided: false })
    render(<ExplorationStage activity={activity} state={state} dispatch={() => {}} />)
    expect(screen.getByText('2×')).toBeTruthy()
    expect(document.querySelector('svg desc')?.textContent).toBe('Na régua: 520, 2 vezes; 550.')
  })

  test('⚠️ o desfazer volta o mundo mas NÃO apaga a descoberta', async () => {
    // A criança desfaz para tentar de outro jeito, não para perder o que já entendeu. Sem isso
    // o medidor andaria para trás e a cena castigaria justamente quem experimenta mais.
    render(<InteractiveLessonBlock block={block('layers')} previewContent={content('layers')} />)
    expect(screen.queryByRole('button', { name: 'Testar' })).toBeNull()
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): as duas metas pedem DUAS trocas de ordem (o Dino
    // aparece, e depois esconde de novo). Um toque fechava as duas.
    await trocarOrdem(2)
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
    const largura = screen.getByRole('slider', { name: 'Tamanho da área do Dino' })
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): a área abre GRANDE (130%) e diminui até 80%, com o
    // cacto parado onde bateu com um vão entre os desenhos (em 50, um vão de 10).
    fireEvent.change(distancia, { target: { value: '50' } })
    fireEvent.change(largura, { target: { value: '80' } })
    await waitFor(() =>
      expect(Number(screen.getByRole('meter').getAttribute('aria-valuenow'))).toBeGreaterThan(0),
    )
    expect(screen.queryByRole('button', { name: 'Ver movimento' })).toBeNull()
  })

  test('a ligação tem alternativa de dois toques (o fio, fora de cena)', () => {
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): este teste usava o fio da `world`, que virou uma
    // chave. O fio segue vivo em outras cenas, e a mecânica dele é conferida no próprio componente.
    const ligados: boolean[] = []
    render(
      <ExperienceConnection
        source="Desenhar"
        target="Tela do jogo"
        alternative="Desligar fio"
        enabled={false}
        onConnect={(ligado) => ligados.push(ligado)}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '◉ Desenhar' }))
    expect(screen.getByText('Agora toque em Tela do jogo para ligar.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '◎ Tela do jogo' }))
    expect(ligados).toEqual([true])
  })

  test('⭐⭐ criar nos bastidores vem antes de mostrar na tela, sem esconder o próximo passo', async () => {
    render(<InteractiveLessonBlock block={block('world')} previewContent={content('world')} />)
    expect(screen.getByRole('group', { name: 'Nos bastidores' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Na tela do jogo' })).toBeTruthy()
    const mostrar = () => screen.getByRole('button', { name: 'Mostrar o Dino na tela' })
    expect(mostrar().getAttribute('aria-disabled')).toBe('true')
    expect(mostrar().getAttribute('aria-describedby')).toBe('world-tela-do-jogo-nota')
    expect(screen.getByText('Primeiro, crie o Dino nos bastidores.')).toBeTruthy()
    fireEvent.click(mostrar())
    expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('0')

    fireEvent.click(screen.getByRole('button', { name: 'Criar o Dino' }))
    await waitFor(() => expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('1'))
    expect(
      screen.getByRole('button', { name: '✓ Dino nos bastidores' }).getAttribute('aria-disabled'),
    ).toBe('true')
    expect(mostrar().getAttribute('aria-disabled')).toBeNull()
    const descricoes = () => [...document.querySelectorAll('desc')].map((d) => d.textContent ?? '')
    expect(descricoes()).toContain('A tela do jogo sem o Dino.')

    fireEvent.click(mostrar())
    await waitFor(() => expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('2'))
    expect(screen.getByRole('button', { name: 'Tirar o Dino da tela' })).toBeTruthy()
    // O mesmo Dino que foi criado continua na ficha e aparece no mesmo lugar do jogo.
    expect(screen.getByTitle('Nos bastidores')).toBeTruthy()
    expect(descricoes()).toContain('A tela do jogo com o Dino.')
    expect(descricoes()).toContain('Uma ficha guardada, do Dino: nome dino, x 110, y 150.')

    fireEvent.click(screen.getByRole('button', { name: 'Tirar o Dino da tela' }))
    expect(descricoes()).toContain('A tela do jogo sem o Dino.')
    expect(descricoes()).toContain('Uma ficha guardada, do Dino: nome dino, x 110, y 150.')
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
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): concluir a `layers` são três trocas de ordem.
    await trocarOrdem(3)
    // ⚠️ Mudou de propósito (lote 2 do Raio-X): "Descoberta registrada." virou "✓ Guardado".
    await waitFor(() => expect(screen.getByText('✓ Guardado')).toBeTruthy(), {
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
    // ⚠️ Mudou de propósito (lote 2): "Ligar som" saiu da lista porque `layers` não faz som, e as
    // ferramentas moram fora do fieldset da cena (o som tem de sobreviver a um conflito).
    for (const nome of ['Desfazer', 'Recomeçar']) {
      const botao = screen.getByRole('button', { name: nome })
      expect(botao).toHaveProperty('disabled', false)
      expect(botao.closest('fieldset[disabled]')).toBeNull()
    }
    // ⚠️ Mudou de propósito (consertos do review do lote 2): "Uma pista" SAI depois de concluir. A
    // caixa da pista já sumia na conclusão, e o botão virava um clique mudo que contava pista no
    // relatório do professor.
    expect(screen.queryByRole('button', { name: 'Uma pista' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Recomeçar' }))
    // Os comandos RODARAM: o guard dos comandos também olhava o `passed`, então destravar só
    // o fieldset deixaria os botões clicáveis e mudos — e o servidor não veria gesto nenhum.
    await waitFor(() => expect(gestos()).toBeGreaterThan(antes), { timeout: 5000 })
    // A descoberta ficou (desfazer volta o MUNDO, não o que ela aprendeu) e o cartão de
    // conclusão continua ali.
    // ⚠️ Mudou de propósito (full review de experiência, M4): a volta ao arranjo do jogo é a terceira
    // META da `layers`, e as três descobertas ficam.
    expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('3')
    expect(screen.getByText('✓ Guardado')).toBeTruthy()
    expect(screen.getByText('Você descobriu!', { selector: 'p' })).toBeTruthy()
    // E ninguém registra duas vezes: a marcação é primeira-vez-só.
    expect(tentativas()).toBe(registradas)
  })

  test('⚠️⚠️ um TOQUE no botão de segurar não deixa a tecla presa', async () => {
    // O botão tem os três eventos: `pointerdown` segura, `pointerup` solta, e o `click`
    // alterna — este último para quem usa teclado ou leitor de tela, que não têm "segurar".
    // Um toque de mouse dispara os TRÊS em fila, e o `click` alternava o já-falso de volta
    // para verdadeiro: um clique simples terminava com a tecla presa e o rótulo dizendo
    // "Soltar a tecla", o contrário do que tinha acontecido — justo na cena que existe para
    // separar acontecimento de estado.
    const { fetchFalso } = servidorFalso('hold-vs-press')
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
        <InteractiveLessonBlock block={block('hold-vs-press')} />
      </LessonPlayerProvider>,
    )
    // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): UMA tecla, com o ESTADO no rótulo ("A tecla:
    // solta/segurada"), no lugar de "Apertar uma vez" e "Segurar a tecla".
    const botao = await screen.findByRole('button', { name: 'A tecla: solta' })
    fireEvent.pointerDown(botao)
    expect(await screen.findByRole('button', { name: 'A tecla: segurada' })).toBeTruthy()
    fireEvent.pointerUp(botao)
    // `detail: 1` é o clique de PONTEIRO, que chega depois do `pointerup`. O de leitor de tela chega
    // com `detail: 0` e sem tecla antes.
    fireEvent.click(botao, { detail: 1 })
    expect(await screen.findByRole('button', { name: 'A tecla: solta' })).toBeTruthy()

    // O leitor de tela ALTERNA, e alcança os dois estados.
    fireEvent.click(screen.getByRole('button', { name: 'A tecla: solta' }), { detail: 0 })
    expect(await screen.findByRole('button', { name: 'A tecla: segurada' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'A tecla: segurada' }), { detail: 0 })
    expect(await screen.findByRole('button', { name: 'A tecla: solta' })).toBeTruthy()

    // ⚠️⚠️ E o teclado SEGURA de verdade: Espaço afunda no `keydown` e solta no `keyup`, e o `click`
    // que o navegador gera com a tecla não alterna de volta.
    const tecla = screen.getByRole('button', { name: 'A tecla: solta' })
    fireEvent.keyDown(tecla, { key: ' ' })
    expect(await screen.findByRole('button', { name: 'A tecla: segurada' })).toBeTruthy()
    fireEvent.keyUp(tecla, { key: ' ' })
    fireEvent.click(tecla, { detail: 0 })
    expect(await screen.findByRole('button', { name: 'A tecla: solta' })).toBeTruthy()
  })

  test('⚠️⚠️ depois de concluir há UM botão de voltar ao começo, e nada afirma conclusão sobre o palco', async () => {
    // ⚠️ Mudou de propósito (lote 2 do Raio-X). "Ver de novo" (o azul do rodapé) e "Recomeçar"
    // faziam o mesmo `reset`, lado a lado, e o cartão "Você concluiu a investigação" ficava sobre o
    // palco vazio. O `revendo` que tentava adivinhar o estado do palco morria no primeiro gesto.
    // Hoje há um "Recomeçar" só, e o que fica é "Você descobriu!", que fala DELA e não do palco.
    // ⚠️⚠️ A cena é `world`, e a escolha É o teste: `layers` é uma das DUAS (de 45) em que o
    // avaliador se auto-reprova depois do reset, e uma cena comum é o que prova o caso geral.
    const { fetchFalso } = servidorFalso('world')
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
        <InteractiveLessonBlock block={block('world')} />
      </LessonPlayerProvider>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Criar o Dino' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar o Dino na tela' }))
    await waitFor(
      () => expect(screen.getByText('Você descobriu!', { selector: 'p' })).toBeTruthy(),
      { timeout: 5000 },
    )
    expect(screen.queryByRole('button', { name: /Ver de novo/ })).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Recomeçar' })).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Recomeçar' }))
    await screen.findByRole('button', { name: 'Criar o Dino' })
    // A descoberta FICA (ela não se desfaz), e nada diz que o palco vazio está concluído.
    expect(screen.getByText('Você descobriu!', { selector: 'p' })).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/Você concluiu|investigação|mexendo de novo/)
    // E voltar a mexer não troca a frase por outra afirmação sobre o palco.
    fireEvent.click(screen.getByRole('button', { name: 'Criar o Dino' }))
    expect(screen.getByText('Você descobriu!', { selector: 'p' })).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/Você concluiu|investigação/)
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
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): concluir a `layers` são três trocas de ordem, e o
    // gesto feito com o pedido em voo é uma quarta ("Descer" a peça de cima).
    await trocarOrdem(3)
    await waitFor(() => expect(liberar).toBeDefined(), { timeout: 5000 })
    // A cena continua viva enquanto o pedido está em voo.
    const antes = screen.getByRole('button', { name: /^Descer / })
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
        context: {
          label: 'A ordem dos desenhos',
          explanation:
            'Nesta experiência, vamos organizar a ordem em que os desenhos entram para ver o que fica na frente.',
        },
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
    // O palpite mostra apenas contexto, cena parada, pergunta e alternativas. A bancada só é
    // montada depois da escolha, para não misturar controles indisponíveis com a reflexão.
    expect(screen.queryByRole('button', { name: /^Descer / })).toBeNull()
    // ⚠️ Mudou de propósito (consertos do review do lote 2): as opções são BOTÕES, não rádios.
    const escolha = await screen.findByRole('button', { name: 'Quem foi desenhado antes' })
    await waitFor(() => expect(escolha.getAttribute('aria-disabled')).toBeNull())
    fireEvent.click(escolha)
    // E aí a prancha é montada e pode ser usada.
    expect(await screen.findByRole('button', { name: /^Descer / })).toBeTruthy()
    await trocarOrdem(3)
    await waitFor(() => expect(screen.getByText('✓ Guardado')).toBeTruthy(), {
      timeout: 5000,
    })
    const tentativa = enviados.find((e) => String(e.url).endsWith('/learning-attempts'))
    const respostas = tentativa?.answers as Record<string, unknown>
    expect(respostas.prediction).toBe('antes')
    // ⚠️ E o palpite errado não muda o veredito: a cena registrou a descoberta do mesmo jeito.
    expect(screen.getByText('✓ Guardado')).toBeTruthy()
    // O segmento que o motor manda continua sem ela (é o que o servidor aplica no checkpoint).
    for (const enviado of enviados.filter((e) => String(e.url).endsWith('/learning-progress')))
      expect((enviado.answers as Record<string, unknown>).prediction).toBeUndefined()
    // E ela sobrevive ao recarregar: o palpite é do PERFIL, não da aba. ⚠️ Mudou de propósito
    // (lote 2): no `sessionStorage`, uma sessão nova reabria a atividade concluída trancada.
    // ⚠️ E guardado junto da IMPRESSÃO da pergunta (consertos do review do lote 2).
    expect(
      JSON.parse(
        localStorage.getItem('sz:scene-prediction:child-previsao:lesson:discovery:revision') ??
          '{}',
      ).escolha,
    ).toBe('antes')
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────────────
// ⭐⭐ A MOLDURA do lote 2 do Raio-X (16/09/2026), pelo caminho do ALUNO.
//
// ⚠️⚠️ Tudo aqui monta o bloco pela PROJEÇÃO PÚBLICA (`publicInteractiveBlock`), que é o que a
// criança recebe, com o `LessonPlayerProvider` e um servidor que corrige com as MESMAS funções do
// members (`evaluateLearning`). A prévia de autoria desenha outra coisa (o rascunho), e foi assim
// que o player ficou meses com defeitos que nenhum teste de render via.
// ─────────────────────────────────────────────────────────────────────────────────────────────

/** O members em miniatura: aplica os segmentos de experimentação e corrige a tentativa. */
function servidorQueCorrige(bloco: InteractiveBlock) {
  const atividade = bloco.activity as SceneActivity
  const start = sceneStart(atividade)
  let checkpoint: SceneCheckpoint<ExperimentSession> | null = null
  const enviados: { url: string; body: Record<string, unknown> }[] = []
  const answers = () => ({
    sceneSequence: checkpoint?.sequence ?? 0,
    sceneSessionId: checkpoint?.sessionId ?? '',
    sceneSegmentId: checkpoint?.segmentId ?? '',
    sceneCheckpoint: checkpoint ? packExperiment(atividade.scene, checkpoint.session) : [],
  })
  const progresso = (result: unknown = null) => ({
    blockId: 'bloco',
    revision: 'rev',
    answers: answers(),
    hintsUsed: 0,
    positionSeconds: null,
    attemptsCount: 0,
    result,
    updatedAt: new Date().toISOString(),
  })
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {}
    enviados.push({ url, body })
    if (url.endsWith('/learning-progress')) {
      const segment = readSceneSegment(body.answers)
      if (segment) checkpoint = applyExperimentSegment(start, checkpoint, segment)
      return Response.json(progresso())
    }
    const enviadas = body.answers as Record<string, unknown>
    const result = evaluateLearning(bloco, {
      ...answers(),
      ...(typeof enviadas.checkpoint === 'string' ? { checkpoint: enviadas.checkpoint } : {}),
    })
    return Response.json({ attempt: { result }, progress: progresso(result) })
  }) as unknown as typeof fetch
  return { enviados }
}

function aluno(
  bloco: InteractiveBlock,
  salvo?: Partial<LearningBlockProgress>,
  viewerId = 'crianca-moldura',
) {
  // Estes testes exercitam deliberadamente o percurso com palpite. Desde 21/09/2026 o catálogo
  // oferece apenas um modelo de autoria: o palpite precisa ser declarado no bloco para chegar à
  // criança, em vez de ser acrescentado implicitamente pela projeção pública.
  const atividade = bloco.activity as SceneActivity
  const autorado =
    !bloco.prediction && atividade.type === 'experimentation'
      ? { ...bloco, prediction: SCENE_QUESTIONS[atividade.scene].prediction }
      : bloco
  return render(
    <LessonPlayerProvider
      value={{
        lessonId: 'aula',
        courseSlug: 'curso',
        viewerId,
        viewerWatermark: null,
        initialPositionSeconds: null,
        ...(salvo
          ? {
              learningProgress: {
                sectionId: null,
                blocks: [
                  {
                    blockId: 'bloco',
                    revision: 'rev',
                    positionSeconds: null,
                    answers: {},
                    hintsUsed: 0,
                    attemptsCount: 1,
                    result: null,
                    updatedAt: new Date().toISOString(),
                    ...salvo,
                  },
                ],
              },
            }
          : {}),
      }}
    >
      <InteractiveLessonBlock
        block={{
          id: 'bloco',
          blockRevision: 'rev',
          kind: 'interactive',
          sortOrder: 0,
          content: publicInteractiveBlock(autorado),
        }}
      />
    </LessonPlayerProvider>,
  )
}

/** O `world` do Corre Dino com um palpite ESCRITO no bloco: o texto do modelo é de outro lote. */
function mundoComPalpite(revealOn?: string): InteractiveBlock {
  return {
    ...content('world'),
    prediction: {
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
      ...(revealOn ? { revealOn } : {}),
    },
  }
}
const anunciado = () =>
  [...document.querySelectorAll('p.sr-only[aria-live]')].map((p) => p.textContent).join(' ')

/**
 * O relógio do navegador na MÃO: cada `tocar(n)` roda `n` quadros a 60 Hz.
 *
 * ⚠️ Desde os consertos do review do lote 2 a demonstração com menos movimento TOCA (em passos de
 * 0,2 s) em vez de saltar para o fim da parte, então percorrer uma demonstração num teste pede
 * relógio. Com o de verdade o teste dependeria do tempo da máquina.
 */
function relogioManual() {
  const rafOriginal = window.requestAnimationFrame
  const cafOriginal = window.cancelAnimationFrame
  const fila = new Map<number, FrameRequestCallback>()
  let proximo = 0
  let agora = 0
  window.requestAnimationFrame = (cb) => {
    proximo += 1
    fila.set(proximo, cb)
    return proximo
  }
  window.cancelAnimationFrame = (id) => {
    fila.delete(id)
  }
  return {
    async tocar(quadros: number) {
      for (let i = 0; i < quadros; i++) {
        agora += 1000 / 60
        const chamados = [...fila.values()]
        fila.clear()
        await act(async () => {
          for (const cb of chamados) cb(agora)
        })
      }
    },
    restaurar() {
      window.requestAnimationFrame = rafOriginal
      window.cancelAnimationFrame = cafOriginal
    },
  }
}

describe('⭐⭐ a moldura do lote 2: o palpite congelado e retomado', () => {
  test('⚠️⚠️ o palpite apresenta o assunto antes de montar a descoberta, e trocar fecha tudo de novo', async () => {
    servidorQueCorrige(mundoComPalpite('hidden'))
    aluno(mundoComPalpite('hidden'))
    expect(await screen.findByTestId('scene-prediction-preview')).toBeTruthy()
    expect(
      screen.getByText(
        (_, node) =>
          node?.tagName === 'P' &&
          node.textContent?.startsWith(
            'Nesta experiência, vamos comparar o que existe nos bastidores com o que aparece na tela do jogo.',
          ) === true,
      ),
    ).toBeTruthy()
    const previa = screen.getByTestId('scene-prediction-preview')
    expect(previa.getAttribute('aria-label')).toBe(
      'Prévia da experiência: Bastidores e tela do jogo',
    )
    expect(screen.queryByText('Hoje vamos usar:')).toBeNull()
    // A bancada e seus controles ainda não existem durante o palpite.
    expect(screen.queryByRole('button', { name: 'Criar o Dino' })).toBeNull()
    // O rodapé, esse, não existe no momento do palpite.
    expect(screen.queryByRole('button', { name: 'Conferir' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Recomeçar' })).toBeNull()
    expect(screen.queryByRole('meter')).toBeNull()

    const escolha = screen.getByRole('button', { name: 'O Dino aparece' })
    await waitFor(() => expect(escolha.getAttribute('aria-disabled')).toBeNull())
    fireEvent.click(escolha)
    await waitFor(() => expect(screen.getByText('Seu palpite:')).toBeTruthy())
    expect(await screen.findByRole('button', { name: 'Criar o Dino' })).toBeTruthy()
    expect(document.activeElement?.textContent).toContain(SCENE_MODELS.world.instruction)
    expect(screen.getByRole('button', { name: 'Trocar meu palpite' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Trocar meu palpite' }))
    await waitFor(() => expect(screen.getByTestId('scene-prediction-preview')).toBeTruthy())
    expect(screen.queryByRole('button', { name: 'Criar o Dino' })).toBeNull()
    expect(document.activeElement?.textContent).toContain(
      'Nesta experiência, vamos comparar o que existe nos bastidores',
    )
    expect(localStorage.getItem('sz:scene-prediction:crianca-moldura:aula:bloco:rev')).toBeNull()
  })

  test('⚠️ sem `revealOn`, o palpite só volta quando a cena CONCLUI, sem avaliar a criança', async () => {
    servidorQueCorrige(mundoComPalpite())
    aluno(mundoComPalpite())
    fireEvent.click(await screen.findByRole('button', { name: 'A tela fica vazia' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Criar o Dino' }))
    await waitFor(() => expect(screen.getByText('Descoberta 1 de 2')).toBeTruthy())
    expect(screen.queryByText(/Você achou/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar o Dino na tela' }))
    const acerto = await screen.findByText(
      'Seu palpite: A tela fica vazia. Ao testar: A tela fica vazia.',
      {
        selector: 'p',
      },
    )
    expect(acerto.parentElement?.className).not.toContain('text-success-foreground')
  })

  test('⚠️⚠️ a projeção pública não inventa um palpite ausente no bloco', () => {
    const publico = publicInteractiveBlock(content('world'))
    expect(publico.prediction).toBeUndefined()
    expect(JSON.stringify(publico.checkpoint)).not.toContain('correctChoiceId')
  })
})

describe('⭐⭐ a moldura do lote 2: Conferir, a pergunta e a revisita', () => {
  test('⚠️⚠️ "Conferir" responde com o PEDIDO da meta que falta, nunca com o rótulo', async () => {
    // "Ainda falta: Dino existe sem aparecer" entregava a descoberta a quem apertava o botão maior
    // da tela. A varredura é nas 45: é a MOLDURA que escolhe o texto, então vale para todas.
    const falhas: string[] = []
    for (const scene of SCENE_IDS) {
      render(<InteractiveLessonBlock block={block(scene)} previewContent={content(scene)} />)
      fireEvent.click(await screen.findByRole('button', { name: 'Conferir' }))
      const falta = sceneGoals(scene, openScene({ scene })).find((g) => !g.complete)
      const resposta =
        [...document.querySelectorAll('p[aria-live]')]
          .map((p) => p.textContent ?? '')
          .find((t) => t.startsWith('Ainda não')) ?? ''
      if (!resposta) falhas.push(`${scene}: "Conferir" não respondeu`)
      else if (falta && falta.label !== falta.pedido && resposta.includes(falta.label))
        falhas.push(`${scene}: "Conferir" entregou o rótulo "${falta.label}"`)
      else if (falta?.pedido && !resposta.toLowerCase().includes(falta.pedido.toLowerCase()))
        falhas.push(`${scene}: "Conferir" não disse o pedido "${falta.pedido}"`)
      cleanup()
    }
    expect(falhas).toEqual([])
    // ⚠️ Prazo PRÓPRIO: esta varredura monta as 45 cenas inteiras (palco, faixa e bancada) e já
    // rodava colada nos 5 s de fábrica do bun — sozinha passava, junto da suíte caía nas últimas
    // quatro, e o estouro deixava o DOM sujo para os testes seguintes. É tempo, não regra.
  }, 30_000)

  test('⚠️⚠️ concluir leva o FOCO à pergunta, e a regra da cena só aparece DEPOIS de responder', async () => {
    const bloco = content('world')
    const { enviados } = servidorQueCorrige(bloco)
    aluno(bloco)
    const modelo = SCENE_QUESTIONS.world
    const regra = SCENE_MODELS.world.success
    fireEvent.click(
      await screen.findByRole('button', { name: modelo.prediction.choices[0]?.label as string }),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Criar o Dino' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar o Dino na tela' }))
    await waitFor(() => expect(document.activeElement?.tagName).toBe('LEGEND'))
    expect(document.activeElement?.textContent).toContain(modelo.explain.prompt)
    await waitFor(() => expect(anunciado()).toContain('Você descobriu! Agora responda a pergunta.'))
    // O "Continuar" leva à pergunta; a regra ainda não está em lugar nenhum.
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeTruthy()
    expect(document.body.textContent).not.toContain(regra)
    const errada = modelo.explain.choices.find((c) => c.id !== modelo.explain.correctChoiceId)
    const certa = modelo.explain.choices.find((c) => c.id === modelo.explain.correctChoiceId)
    fireEvent.click(screen.getByRole('button', { name: errada?.label as string }))
    await waitFor(() => expect(screen.getByText(/Ainda não é essa/)).toBeTruthy(), {
      timeout: 5000,
    })
    expect(document.body.textContent).not.toContain(regra)
    fireEvent.click(screen.getByRole('button', { name: certa?.label as string }))
    await waitFor(() => expect(screen.getByText('Certo!')).toBeTruthy(), { timeout: 5000 })
    expect(screen.getByText(modelo.explain.explanation)).toBeTruthy()
    expect(screen.getByText(regra)).toBeTruthy()
    expect(screen.getByText('✓ Guardado')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Continuar' })).toBeNull()
    // A resposta certa subiu por último, junto do palpite.
    const tentativas = enviados.filter((e) => e.url.endsWith('/learning-attempts'))
    const ultima = tentativas.at(-1)?.body.answers as Record<string, unknown>
    expect(ultima.checkpoint).toBe(certa?.id)
    expect(ultima.prediction).toBe(modelo.prediction.choices[0]?.id)
  })

  test('⚠️⚠️ revisita depois do F5: a faixa fala DELA, a explicação volta, e nada tranca', async () => {
    const bloco = content('world')
    servidorQueCorrige(bloco)
    aluno(bloco, {
      result: {
        participated: true,
        passed: true,
        feedback: 'A EXPLICAÇÃO QUE O SERVIDOR GUARDOU.',
        verifiedBy: 'server',
        evidence: 'exploration',
      },
      hintsUsed: 2,
    })
    expect(await screen.findByText('Você já descobriu isto.')).toBeTruthy()
    const explicacao = screen.getByText('A EXPLICAÇÃO QUE O SERVIDOR GUARDOU.')
    expect(explicacao.closest('details')?.open).toBe(false)
    expect(explicacao.closest('details')?.textContent).toContain('Ver a explicação')
    // ⚠️ O palpite NÃO tranca a revisita (sem palpite guardado neste perfil) e a pergunta some.
    const criar = await screen.findByRole('button', { name: 'Criar o Dino' })
    await waitFor(() => expect(criar.closest('fieldset[disabled]')).toBeNull())
    expect(screen.queryByText('Primeiro, seu palpite ↑')).toBeNull()
    expect(screen.queryByText('Agora explique')).toBeNull()
    expect(screen.queryByText(/já está resolvida/)).toBeNull()
    // ⚠️ UM botão de voltar ao começo, e nenhum principal (não há o que conferir).
    expect(screen.getAllByRole('button', { name: 'Recomeçar' })).toHaveLength(1)
    for (const saiu of [/Ver de novo/, /Já descobri/, /^Conferir$/, /^Continuar$/])
      expect(screen.queryByRole('button', { name: saiu })).toBeNull()
    // ⚠️ Mudou de propósito (consertos do review do lote 2): na revisita não há pista. O botão
    // continuava ali, mudo (a caixa não volta com a cena concluída), e cada clique somava uma pista
    // no relatório do professor.
    expect(screen.queryByRole('button', { name: 'Uma pista' })).toBeNull()
    expect(screen.queryByText(/Pista \d de 3/)).toBeNull()
    // Mexer e recomeçar não mudam a faixa: ela é verdade com o palco em qualquer estado.
    fireEvent.click(criar)
    fireEvent.click(screen.getByRole('button', { name: 'Recomeçar' }))
    expect(screen.getByText('Você já descobriu isto.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/Você concluiu|investigação/)
  })

  test('⚠️ revisita de bloco concluído ANTES de a pergunta existir: só a faixa, sem pergunta', async () => {
    const bloco = content('world')
    servidorQueCorrige(bloco)
    aluno(bloco, {
      result: {
        participated: true,
        passed: true,
        feedback: 'Feito.',
        verifiedBy: 'client',
        evidence: 'exploration',
      },
    })
    expect(await screen.findByText('Você já descobriu isto.')).toBeTruthy()
    expect(screen.queryByText('Feito.')).toBeNull()
    expect(screen.queryByText('Agora explique')).toBeNull()
  })

  test('⚠️ o degrau da pista VOLTA do servidor no F5', async () => {
    const bloco = content('world')
    servidorQueCorrige(bloco)
    aluno(bloco, { hintsUsed: 2 })
    await palpitar('world')
    expect(await screen.findByText('Pista 2 de 3.')).toBeTruthy()
  })

  test('a pista desliga no último degrau e a caixa some quando a cena conclui', async () => {
    render(<InteractiveLessonBlock block={block('world')} previewContent={content('world')} />)
    const pista = await screen.findByRole('button', { name: 'Uma pista' })
    for (let i = 0; i < 3; i++) fireEvent.click(pista)
    expect(screen.getByText('Pista 3 de 3.')).toBeTruthy()
    expect(pista).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button', { name: 'Criar o Dino' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar o Dino na tela' }))
    await waitFor(() => expect(screen.getByText('Você descobriu!', { selector: 'p' })).toBeTruthy())
    expect(screen.queryByText('Pista 3 de 3.')).toBeNull()
  })
})

describe('⭐⭐ a moldura do lote 2: o som, a voz e a demonstração', () => {
  // Esta varredura monta as 45 cenas reais. Sob a suíte inteira, o desenho SVG e a limpeza de
  // cada bancada podem passar do teto padrão de 5 s, embora cada cena permaneça síncrona para a
  // criança. O teto representa o contrato completo, não uma espera para uma API.
  test('⚠️⚠️ "Ligar som" só nas cenas que FAZEM som, e sem `aria-pressed`', async () => {
    const falhas: string[] = []
    for (const scene of SCENE_IDS) {
      render(<InteractiveLessonBlock block={block(scene)} previewContent={content(scene)} />)
      const resetName =
        scene === 'found-counter'
          ? 'Recomeçar a busca'
          : scene === 'touch-response'
            ? 'Recomeçar com a reação desligada'
            : /^(Recomeçar|Voltar ao começo)$/
      expect((await screen.findAllByRole('button', { name: resetName })).length).toBeGreaterThan(0)
      const ligarSom = screen.queryByRole('button', { name: 'Ligar som' })
      // ⚠️ Mudou de propósito (consertos do review da onda A do lote 5): na EXPERIMENTAÇÃO da cena cujo
      // assunto é o som, ele é a CHAVE "Som: desligado" da bancada, com o estado no rótulo (e aí o
      // `aria-pressed` diz a mesma coisa que o texto). O "Ligar som" do rodapé segue sem `aria-pressed`.
      const som = ligarSom ?? screen.queryByRole('button', { name: /^Som: (ligado|desligado)$/ })
      if (Boolean(som) !== sceneEmitsSound(scene))
        falhas.push(`${scene}: som ${som ? 'aparece' : 'falta'}`)
      if (ligarSom?.hasAttribute('aria-pressed')) falhas.push(`${scene}: som com aria-pressed`)
      cleanup()
    }
    expect(falhas).toEqual([])
    // Anti-vácuo: a régua disse "sim" em alguma cena, senão a varredura aprovaria "nunca".
    expect(SCENE_IDS.some((s) => sceneEmitsSound(s))).toBe(true)
  }, 15000)

  test('⭐ "Ouvir" lê somente a instrução na voz pt-BR do navegador, sem áudio gravado', async () => {
    const falas: { texto: string; lang: string }[] = []
    const janela = window as unknown as Record<string, unknown>
    const vozOriginal = janela.speechSynthesis
    const falaOriginal = janela.SpeechSynthesisUtterance
    class Fala {
      lang = ''
      voice: unknown = null
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor(public text: string) {}
    }
    janela.speechSynthesis = {
      getVoices: () => [{ lang: 'pt-BR', name: 'Luciana' }],
      cancel: () => {},
      speak: (f: Fala) => falas.push({ texto: f.text, lang: f.lang }),
    }
    janela.SpeechSynthesisUtterance = Fala
    try {
      render(<InteractiveLessonBlock block={block('world')} previewContent={content('world')} />)
      fireEvent.click(await screen.findByRole('button', { name: 'Uma pista' }))
      fireEvent.click(await screen.findByRole('button', { name: 'Ouvir' }))
      // ⚠️ Mudou de propósito (consertos do review do lote 2): uma fala por FRASE (o Chrome corta
      // uma fala longa sem avisar), e a fala sai na hora do clique, sem esperar a pausa das mídias.
      await waitFor(() => expect(falas.length).toBeGreaterThan(0))
      expect(falas.every((f) => f.lang === 'pt-BR')).toBe(true)
      const lido = falas.map((f) => f.texto).join(' ')
      expect(lido).toContain(SCENE_MODELS.world.instruction.slice(0, 20))
      expect(lido).not.toContain(SCENE_MODELS.world.hints[0]?.slice(0, 15) as string)
    } finally {
      janela.speechSynthesis = vozOriginal
      janela.SpeechSynthesisUtterance = falaOriginal
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────────────
// ⭐⭐ Os consertos do PLAYER depois dos reviews do lote 2 (16/09/2026), pelo caminho do ALUNO.
// Cada teste aqui reprova sem o conserto que ele guarda (conferido desfazendo o conserto).
// ─────────────────────────────────────────────────────────────────────────────────────────────

/** O primeiro palpite do MODELO da cena: escolher abre o palco. */
async function palpitar(scene: SceneId) {
  const escolha = await screen.findByRole('button', {
    name: SCENE_QUESTIONS[scene].prediction.choices[0]?.label as string,
  })
  await waitFor(() => expect(escolha.getAttribute('aria-disabled')).toBeNull())
  fireEvent.click(escolha)
  await waitFor(() => expect(screen.getByText('Seu palpite:')).toBeTruthy())
}
/** A resposta de uma escolha da pergunta final, pelo rótulo. */
const opcao = (scene: SceneId, certa: boolean) =>
  screen.getByRole('button', {
    name: SCENE_QUESTIONS[scene].explain.choices.find(
      (c) => (c.id === SCENE_QUESTIONS[scene].explain.correctChoiceId) === certa,
    )?.label as string,
  })
/**
 * Troca a ordem de desenhar da `layers` (lote 5 do Raio-X): o botão da peça de CIMA a leva para
 * baixo. Três trocas concluem a cena (o Dino aparece, esconde de novo e volta para a frente).
 */
async function trocarOrdem(vezes: number) {
  for (let i = 0; i < vezes; i++)
    fireEvent.click(await screen.findByRole('button', { name: /^Descer / }))
}
/** Conclui o `world` a partir do palco aberto. */
function concluirMundo() {
  fireEvent.click(screen.getByRole('button', { name: 'Criar o Dino' }))
  fireEvent.click(screen.getByRole('button', { name: 'Mostrar o Dino na tela' }))
}
const tentativas = (enviados: { url: string; body: Record<string, unknown> }[]) =>
  enviados.filter((e) => e.url.endsWith('/learning-attempts'))

describe('⭐⭐ consertos do review do lote 2: a resposta e a gravação', () => {
  test('⚠️⚠️ `layers`: a resposta certa depois de "Recomeçar" é corrigida na hora, sem pedir a montagem de volta', async () => {
    // O ALTO do review de correção: a `layers` OBRIGATÓRIA do Meu Jeito aula 5 travava. O servidor
    // recusava a resposta (a cena saiu do estado descoberto), a tela a pintava de errada, e remontar
    // não reenviava nada, porque a assinatura não mudava.
    // ⚠️ Mudou de propósito (full review de experiência, M4): a volta ao arranjo do jogo virou a META
    // `back-in-front`, e descoberta não se desfaz. Depois de "Recomeçar" a `layers` continua concluída
    // para o servidor, e a resposta é corrigida sem a caixa "deixe a cena como estava" (que segue só na
    // `jump-sound`, a única cena que ainda pede a montagem ASSENTADA).
    const bloco = content('layers')
    const { enviados } = servidorQueCorrige(bloco)
    aluno(bloco)
    await palpitar('layers')
    await trocarOrdem(3)
    await waitFor(() => expect(screen.getByText('Agora explique')).toBeTruthy(), { timeout: 5000 })
    fireEvent.click(screen.getByRole('button', { name: 'Recomeçar' }))
    fireEvent.click(opcao('layers', true))
    await waitFor(() => expect(screen.getByText('Certo!')).toBeTruthy(), { timeout: 5000 })
    expect(
      screen.queryByText('Para conferir, deixe a cena como estava quando você descobriu.'),
    ).toBeNull()
    expect(screen.getByText('✓ Guardado')).toBeTruthy()
    const ultima = tentativas(enviados).at(-1)?.body.answers as Record<string, unknown>
    expect(ultima.checkpoint).toBe(SCENE_QUESTIONS.layers.explain.correctChoiceId)
  })

  test('⚠️ mexer com a montagem desfeita NÃO repete a tentativa da resposta errada', async () => {
    const bloco = content('layers')
    const { enviados } = servidorQueCorrige(bloco)
    aluno(bloco)
    await palpitar('layers')
    await trocarOrdem(3)
    await waitFor(() => expect(screen.getByText('Agora explique')).toBeTruthy(), { timeout: 5000 })
    fireEvent.click(opcao('layers', false))
    await waitFor(() => expect(screen.getByText(/não é essa/)).toBeTruthy(), { timeout: 5000 })
    const antes = tentativas(enviados).length
    const progressoAntes = progressos(enviados)
    fireEvent.click(screen.getByRole('button', { name: 'Recomeçar' }))
    await trocarOrdem(1)
    // ⚠️ Mudou de propósito (full review de 16/09/2026): em vez de 1,3 s reais contra a batida de 1 s, a
    // gravação é forçada, e o segmento dos gestos SUBINDO prova que ela rodou (senão "nenhuma tentativa"
    // passava sem conferir nada).
    await forcarAGravacao()
    await waitFor(() => expect(progressos(enviados)).toBeGreaterThan(progressoAntes), {
      timeout: 5000,
    })
    expect(tentativas(enviados).length).toBe(antes)
  })

  test('⚠️ a pergunta que MUDOU oferece "Abrir de novo", e não "tente outra"', async () => {
    const bloco = content('world')
    servidorQueCorrige(bloco)
    const real = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {}
      const respostas = body.answers as Record<string, unknown> | undefined
      if (!String(input).endsWith('/learning-attempts') || !respostas?.checkpoint)
        return real(input, init)
      return Response.json({
        attempt: {
          result: {
            participated: true,
            passed: false,
            feedback: PERGUNTA_MUDOU,
            verifiedBy: 'server',
          },
        },
        progress: {},
      })
    }) as unknown as typeof fetch
    aluno(bloco)
    await palpitar('world')
    concluirMundo()
    await waitFor(() => expect(screen.getByText('Agora explique')).toBeTruthy(), { timeout: 5000 })
    fireEvent.click(opcao('world', true))
    expect(await screen.findByRole('button', { name: 'Abrir de novo' })).toBeTruthy()
  })

  test('⚠️ uma escolha ANTERIOR que responde depois não pinta a escolha nova de âmbar', async () => {
    const bloco = content('world')
    servidorQueCorrige(bloco)
    const real = globalThis.fetch
    let soltarErrada: (() => void) | undefined
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {}
      const respostas = body.answers as Record<string, unknown> | undefined
      const errada = SCENE_QUESTIONS.world.explain.choices.find(
        (c) => c.id !== SCENE_QUESTIONS.world.explain.correctChoiceId,
      )?.id
      if (
        String(input).endsWith('/learning-attempts') &&
        respostas?.checkpoint === errada &&
        !soltarErrada
      )
        await new Promise<void>((resolve) => {
          soltarErrada = resolve
        })
      return real(input, init)
    }) as unknown as typeof fetch
    aluno(bloco)
    await palpitar('world')
    concluirMundo()
    await waitFor(() => expect(screen.getByText('Agora explique')).toBeTruthy(), { timeout: 5000 })
    fireEvent.click(opcao('world', false))
    await waitFor(() => expect(soltarErrada).toBeDefined(), { timeout: 5000 })
    // Ela troca de ideia antes de a primeira voltar.
    fireEvent.click(opcao('world', true))
    await act(async () => {
      soltarErrada?.()
      await new Promise((r) => setTimeout(r, 50))
    })
    // A resposta da errada chegou DEPOIS da troca: ela não pinta a certa de âmbar.
    expect(screen.queryByText(/não é essa/) === null).toBe(true)
    await waitFor(() => expect(screen.getByText('Certo!')).toBeTruthy(), { timeout: 5000 })
    expect(screen.queryByText(/não é essa/) === null).toBe(true)
  })
})

describe('⭐⭐ consertos do review do lote 2: o palpite', () => {
  test('⚠️⚠️ antes do palpite o gesto direto do Dino nem é montado', async () => {
    // Aula 3: "Toque no Dino para pular" deixava a criança ver a resposta antes de palpitar.
    const bloco = content('gravity')
    const { enviados } = servidorQueCorrige(bloco)
    aluno(bloco)
    expect(await screen.findByTestId('scene-prediction-preview')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Fazer o Dino pular' })).toBeNull()
    await forcarAGravacao()
    for (const e of enviados.filter((x) => x.url.endsWith('/learning-progress')))
      expect(JSON.stringify(e.body)).not.toContain('jump')
  })

  test('⚠️⚠️ palpite guardado de uma pergunta que NÃO existe mais volta ao momento do palpite', async () => {
    // O lote 2 trocou os ids de 22 previsões do modelo. Com o id morto no `localStorage`, o palco
    // abria destrancado com as opções à vista, e o id morto subia na tentativa.
    const bloco = content('world')
    servidorQueCorrige(bloco)
    localStorage.setItem(
      'sz:scene-prediction:crianca-moldura:aula:bloco:rev',
      JSON.stringify({ escolha: 'id-velho', pergunta: 'outra pergunta' }),
    )
    aluno(bloco)
    expect(await screen.findByTestId('scene-prediction-preview')).toBeTruthy()
    cleanup()
    // O mesmo id de hoje, mas guardado para OUTRA pergunta (a `game-state` manteve os ids e mudou o
    // sentido): também reabre.
    localStorage.setItem(
      'sz:scene-prediction:crianca-moldura:aula:bloco:rev',
      JSON.stringify({
        escolha: SCENE_QUESTIONS.world.prediction.choices[0]?.id,
        pergunta: 'outra pergunta',
      }),
    )
    aluno(bloco)
    expect(await screen.findByTestId('scene-prediction-preview')).toBeTruthy()
    cleanup()
    // E o palpite da pergunta de HOJE volta com a criança.
    localStorage.clear()
    guardarPalpite(
      'crianca-moldura:aula:bloco:rev',
      SCENE_QUESTIONS.world.prediction,
      SCENE_QUESTIONS.world.prediction.choices[0]?.id as string,
    )
    try {
      aluno(bloco)
      expect(await screen.findByText('Seu palpite:')).toBeTruthy()
    } finally {
      localStorage.clear()
    }
  })

  test('⚠️⚠️ as opções são BOTÕES e o foco segue para o balão da descoberta', async () => {
    // Num grupo de rádios a seta do teclado já escolhia: uma seta fechava o cartão e o foco caía no
    // nada, sem a criança ouvir a segunda opção.
    const bloco = content('world')
    servidorQueCorrige(bloco)
    aluno(bloco)
    await screen.findByRole('button', {
      name: SCENE_QUESTIONS.world.prediction.choices[0]?.label as string,
    })
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
    await palpitar('world')
    await waitFor(() =>
      expect(document.activeElement?.textContent).toContain(SCENE_MODELS.world.instruction),
    )
    await waitFor(() => expect(anunciado()).toContain('A cena abriu.'))
  })

  test('⚠️⚠️ o palpite retomado fica no PASSADO: a frase "olhe…" some no gesto seguinte', async () => {
    // "Olhe os dois lados: o Dino está só nos bastidores" ficava na tela com o Dino desenhado.
    servidorQueCorrige(mundoComPalpite('hidden'))
    aluno(mundoComPalpite('hidden'))
    fireEvent.click(await screen.findByRole('button', { name: 'O Dino aparece' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Criar o Dino' }))
    const retomado = 'Seu palpite: O Dino aparece. Ao testar: Olhe a tela: ela ficou vazia.'
    expect(await screen.findByText(retomado)).toBeTruthy()
    // Colado ao aviso da descoberta, SOBRE o pé do palco (e não lá em cima, fora da janela).
    // ⚠️ Mudou de propósito (full review de experiência, M2): o cartão da frase tem o ✕ ao lado.
    const aviso = screen.getByText('Descoberta 1 de 2')
    expect(aviso.nextElementSibling?.querySelector('p')?.textContent).toBe(retomado)
    // O gesto seguinte (ligar o desenho, que também conclui a cena) tira a frase do instante.
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar o Dino na tela' }))
    await waitFor(() => expect(screen.queryByText(retomado) === null).toBe(true))
    // Lá em cima, a linha no passado, sem mandar olhar nada.
    expect(screen.getByText('Ao testar:')).toBeTruthy()
    expect(screen.queryByText('Não era isso.')).toBeNull()
    expect(screen.getByText('Seu palpite:').parentElement?.parentElement?.textContent).toContain(
      'Ao testar: Olhe',
    )
  })

  test('⚠️⚠️ na revisita de OUTRO aparelho, sem palpite guardado, só aparece a descoberta concluída', async () => {
    const bloco = content('world')
    servidorQueCorrige(bloco)
    const aprovado = {
      result: {
        participated: true,
        passed: true,
        feedback: 'x',
        verifiedBy: 'server' as const,
        evidence: 'exploration' as const,
      },
    }
    aluno(bloco, aprovado)
    expect(await screen.findByText('Você já descobriu isto.')).toBeTruthy()
    expect(screen.queryByText(SCENE_QUESTIONS.world.prediction.prompt) === null).toBe(true)
    cleanup()
    // Com o palpite guardado neste aparelho, a linha curta no passado.
    const previsao = SCENE_QUESTIONS.world.prediction
    guardarPalpite('crianca-moldura:aula:bloco:rev', previsao, previsao.correctChoiceId as string)
    aluno(bloco, aprovado)
    expect(await screen.findByText('Ao testar:')).toBeTruthy()
    expect(screen.queryByText('Acertou!')).toBeNull()
  })

  test('⚠️ antes do palpite não há ferramentas, e uma pista depois dele não apaga o trocar', async () => {
    const bloco = content('world')
    servidorQueCorrige(bloco)
    aluno(bloco)
    await screen.findByTestId('scene-prediction-preview')
    // Antes do palpite, nenhuma ferramenta da descoberta é montada.
    for (const nome of ['Recomeçar', 'Uma pista']) {
      expect(screen.queryByRole('button', { name: nome })).toBeNull()
    }
    await palpitar('world')
    expect(screen.getByRole('button', { name: 'Trocar meu palpite' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Uma pista' }))
    expect(await screen.findByText('Pista 1 de 3.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Trocar meu palpite' })).toBeTruthy()
  })

  test('⚠️⚠️ o palpite do leitor de tela apresenta o recurso antes de perguntar', async () => {
    const bloco: InteractiveBlock = {
      ...content('screen-reader'),
      prediction: SCENE_QUESTIONS['screen-reader'].prediction,
    }
    servidorQueCorrige(bloco)
    aluno(bloco)

    expect(
      await screen.findByText(
        (_, node) =>
          node?.tagName === 'P' &&
          node.textContent?.startsWith(
            'Nesta experiência, vamos usar o botão “Ouvir a tela”. Ele lê em voz alta o que aparece no jogo.',
          ) === true,
      ),
    ).toBeTruthy()
    expect(screen.queryByText('Hoje vamos usar:')).toBeNull()
    const previa = screen.getByTestId('scene-prediction-preview')
    expect(previa.getAttribute('aria-label')).toBe('Prévia da experiência: Ouvir a tela')
    expect(previa.querySelector('[data-preview-control]')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ouvir a tela' })).toBeNull()
    expect(screen.queryByLabelText('Descrição do jogo')).toBeNull()

    await palpitar('screen-reader')
    expect(await screen.findByLabelText('Descrição do jogo')).toBeTruthy()
    expect(
      ((await screen.findByRole('button', { name: 'Ouvir a tela' })) as HTMLButtonElement).disabled,
    ).toBe(false)
  })
})

describe('⭐⭐ consertos do review do lote 2: o que se vê e o que se ouve', () => {
  test('⚠️⚠️ "Conferir" e depois o gesto que conclui: a REGRA nunca passa por uma região viva', async () => {
    // O leitor de tela ouvia "Ainda não." + a frase de sucesso da cena no instante da conclusão,
    // antes de "Você descobriu!": a resposta da pergunta, e um "Ainda não" que contradizia tudo.
    const bloco = content('world')
    servidorQueCorrige(bloco)
    aluno(bloco)
    await palpitar('world')
    fireEvent.click(screen.getByRole('button', { name: 'Criar o Dino' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Conferir' }))
    // ⚠️ O texto errado vivia UM render e sumia no seguinte, dentro do mesmo `act`: ler a região na
    // hora do aviso já a encontraria vazia. Os registros guardam o valor ANTIGO e os nós que saíram.
    const falado: string[] = []
    const naRegiao = (n: Node | null) =>
      Boolean((n instanceof Element ? n : n?.parentElement)?.closest('[aria-live]'))
    const observador = new MutationObserver((registros) => {
      for (const r of registros) {
        if (
          !naRegiao(r.target) &&
          !(r.target instanceof Element && r.target.closest('[aria-live]'))
        )
          continue
        falado.push(r.target.textContent ?? '', r.oldValue ?? '')
        for (const n of [...r.addedNodes, ...r.removedNodes]) falado.push(n.textContent ?? '')
      }
    })
    observador.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      characterDataOldValue: true,
    })
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Mostrar o Dino na tela' }))
      await waitFor(() => expect(screen.getByText('Agora explique')).toBeTruthy(), {
        timeout: 5000,
      })
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50))
      })
    } finally {
      observador.disconnect()
    }
    expect(falado.length).toBeGreaterThan(0)
    const regra = SCENE_MODELS.world.success
    expect(falado.filter((t) => t.includes(regra))).toEqual([])
  })

  test('⚠️⚠️ a pergunta ignora o TOQUE dos primeiros instantes, e a tela não rola quando ela já está à vista', async () => {
    // O toque em série no gesto que conclui caía numa opção da pergunta que tinha acabado de correr
    // para baixo do dedo, e mandava uma tentativa que a criança nem leu.
    const rolagens: unknown[] = []
    const rolarOriginal = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = (arg?: boolean | ScrollIntoViewOptions) => {
      rolagens.push(arg)
    }
    try {
      const bloco = content('world')
      const { enviados } = servidorQueCorrige(bloco)
      aluno(bloco)
      await palpitar('world')
      concluirMundo()
      await waitFor(() => expect(screen.getByText('Agora explique')).toBeTruthy(), {
        timeout: 5000,
      })
      const antes = tentativas(enviados).length
      // `detail: 1` é o toque de ponteiro.
      // ⚠️ Mudou de propósito (full review de 16/09/2026): o clique dependia de cair nos 800 ms REAIS
      // desde que a pergunta abriu (`TEMPO_PARA_LER_A_PERGUNTA_MS`), e com a máquina carregada a espera
      // pela pergunta passava disso. O relógio fica PARADO no instante em que a pergunta abriu.
      const agora = performance.now()
      const relogioParado = spyOn(performance, 'now').mockImplementation(() => agora)
      try {
        fireEvent.click(opcao('world', false), { detail: 1 })
        await forcarAGravacao()
      } finally {
        relogioParado.mockRestore()
      }
      expect(tentativas(enviados).length).toBe(antes)
      expect(screen.queryByText(/não é essa/) === null).toBe(true)
      // O teclado (`detail: 0`) responde na hora: o foco já está na pergunta.
      fireEvent.click(opcao('world', false), { detail: 0 })
      await waitFor(() => expect(screen.getByText(/não é essa/)).toBeTruthy(), { timeout: 5000 })
      expect(rolagens).toEqual([])
    } finally {
      Element.prototype.scrollIntoView = rolarOriginal
    }
  })

  test('⚠️ a resposta certa deixa o botão FOCÁVEL (`aria-disabled`, e não `disabled`)', async () => {
    const bloco = content('world')
    servidorQueCorrige(bloco)
    aluno(bloco)
    await palpitar('world')
    concluirMundo()
    await waitFor(() => expect(screen.getByText('Agora explique')).toBeTruthy(), { timeout: 5000 })
    const certa = opcao('world', true)
    certa.focus()
    fireEvent.click(certa)
    await waitFor(() => expect(screen.getByText('Certo!')).toBeTruthy(), { timeout: 5000 })
    expect(opcao('world', true).getAttribute('aria-disabled')).toBe('true')
    expect(opcao('world', true)).toHaveProperty('disabled', false)
    expect(document.activeElement).toBe(opcao('world', true))
  })

  test('⚠️⚠️ "Ouvir" lê a pergunta do PALPITE e as opções, e fala na hora do clique', async () => {
    // Para quem ainda não lê, o véu só abria chutando. E a fala esperava a pausa das outras mídias:
    // com uma que não responde (o Safari só aceita `speak()` dentro do gesto), ficava muda.
    const falas: string[] = []
    const janela = window as unknown as Record<string, unknown>
    const vozOriginal = janela.speechSynthesis
    const falaOriginal = janela.SpeechSynthesisUtterance
    class Fala {
      lang = ''
      voice: unknown = null
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor(public text: string) {}
    }
    janela.speechSynthesis = {
      getVoices: () => [{ lang: 'pt-BR', name: 'Luciana' }],
      cancel: () => {},
      speak: (f: Fala) => falas.push(f.text),
    }
    janela.SpeechSynthesisUtterance = Fala
    // Uma outra mídia da aula que nunca termina de pausar.
    const sair = registerLessonMedia(Symbol('video'), () => new Promise(() => {}))
    try {
      servidorQueCorrige(mundoComPalpite())
      aluno(mundoComPalpite())
      const ouvir = await screen.findAllByRole('button', { name: 'Ouvir' })
      expect(ouvir).toHaveLength(2)

      fireEvent.click(ouvir[0] as HTMLButtonElement)
      await waitFor(() => expect(falas.length).toBeGreaterThan(0))
      expect(falas.join(' ')).toContain(
        'Nesta experiência, vamos comparar o que existe nos bastidores com o que aparece na tela do jogo.',
      )
      expect(falas.join(' ')).not.toContain('O que aparece?')

      falas.length = 0
      fireEvent.click(ouvir[1] as HTMLButtonElement)
      await waitFor(() => expect(falas.length).toBeGreaterThan(0))
      expect(falas.join(' ')).toContain('O que aparece?')
      expect(falas.join(' ')).toContain('O Dino aparece')
      expect(falas.join(' ')).toContain('A tela fica vazia')
      expect(falas.join(' ')).not.toContain(
        'Nesta experiência, vamos comparar o que existe nos bastidores com o que aparece na tela do jogo.',
      )
    } finally {
      sair()
      janela.speechSynthesis = vozOriginal
      janela.SpeechSynthesisUtterance = falaOriginal
    }
  })

  test('⚠️ com o relógio andando a frase da situação NÃO é região viva, e a final é dita ao parar', async () => {
    const relogio = relogioManual()
    try {
      servidorQueCorrige(content('gravity'))
      aluno(content('gravity'))
      await palpitar('gravity')
      const frase = () => document.querySelector('p.min-h-6.text-center') as HTMLElement
      expect(frase().getAttribute('role')).toBe('status')
      // ⚠️ Mudou de propósito (lote 5 do Raio-X): "↑ Pular", sem "com toque".
      fireEvent.click(screen.getByRole('button', { name: '↑ Pular' }))
      await relogio.tocar(24)
      expect(frase().getAttribute('role')).toBeNull()
      expect(frase().getAttribute('aria-live')).toBe('off')
      fireEvent.click(screen.getByRole('button', { name: 'Parar o tempo' }))
      await waitFor(() => expect(frase().getAttribute('role')).toBe('status'))
      await waitFor(() => expect(anunciado()).toContain(frase().textContent ?? '?'))
    } finally {
      relogio.restaurar()
    }
  })

  test('⚠️ a caixa da pista não é região viva, e a pista é dita UMA vez no clique', async () => {
    const bloco = content('world')
    servidorQueCorrige(bloco)
    aluno(bloco)
    await palpitar('world')
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }))
    expect(await screen.findByText(/^Ainda não\. Tente:/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Uma pista' }))
    const caixa = (await screen.findByText('Pista 1 de 3.')).closest('div') as HTMLElement
    expect(caixa.getAttribute('role')).toBeNull()
    await waitFor(() => expect(anunciado()).toContain('Pista 1 de 3.'))
    // ⚠️ Uma caixa de ajuda por vez: a pista toma o lugar da resposta do Conferir.
    expect(screen.queryByText(/^Ainda não\. Tente:/) === null).toBe(true)
  })

  test('⚠️ "Continuar ↓" só aparece com a pergunta FORA da janela', async () => {
    const original = globalThis.IntersectionObserver
    let visivel = true
    globalThis.IntersectionObserver = class {
      constructor(private readonly avisar: IntersectionObserverCallback) {}
      observe() {
        this.avisar(
          [{ isIntersecting: visivel } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        )
      }
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return []
      }
    } as unknown as typeof IntersectionObserver
    try {
      const bloco = content('world')
      servidorQueCorrige(bloco)
      aluno(bloco)
      await palpitar('world')
      concluirMundo()
      await waitFor(() => expect(screen.getByText('Agora explique')).toBeTruthy(), {
        timeout: 5000,
      })
      expect(screen.queryByRole('button', { name: 'Continuar' }) === null).toBe(true)
      cleanup()
      localStorage.clear()
      visivel = false
      servidorQueCorrige(bloco)
      aluno(bloco)
      await palpitar('world')
      concluirMundo()
      expect(
        await screen.findByRole('button', { name: 'Continuar' }, { timeout: 5000 }),
      ).toBeTruthy()
    } finally {
      globalThis.IntersectionObserver = original
    }
  })

  test('⚠️⚠️ missão restrita sem pistas do professor: a pista fala da meta que a AULA cobra', async () => {
    // Dia 1 do Desafio: a aula cobra só "y maior leva para baixo", e a pista do modelo mandava
    // "Mexa só no x", o eixo errado.
    const bloco: InteractiveBlock = {
      ...content('coordinates'),
      activity: { type: 'experimentation', scene: 'coordinates', setup: { goals: ['down'] } },
    }
    servidorQueCorrige(bloco)
    aluno(bloco)
    await palpitar('coordinates')
    fireEvent.click(screen.getByRole('button', { name: 'Uma pista' }))
    const caixa = (await screen.findByText('Pista 1 de 1.')).closest('div') as HTMLElement
    const pedido = SCENE_MODELS.coordinates.goals.find((g) => g.id === 'down')?.pedido as string
    expect(caixa.textContent?.toLowerCase()).toContain(`tente: ${pedido.toLowerCase()}`)
    for (const dica of SCENE_MODELS.coordinates.hints) expect(caixa.textContent).not.toContain(dica)
    expect(screen.getByRole('button', { name: 'Uma pista' })).toHaveProperty('disabled', true)
  })
})

describe('restart: o toque que começa a partida solta o tempo (lote 5 do Raio-X, G3)', () => {
  test('⚠️⚠️ pelo PALCO e pela bancada: sem isso o toque só trocava o selo para JOGANDO', async () => {
    // A tela inteira é o botão no palco, e ele não conhece o ▶ do player: quem solta o tempo é o
    // `dispatch` do player, ao ver a partida começar. Achado na banca: o cacto nunca chegava.
    for (const qual of [0, 1]) {
      render(
        <InteractiveLessonBlock block={block('restart')} previewContent={content('restart')} />,
      )
      const toques = await screen.findAllByRole('button', { name: /Tocar na tela/ })
      expect(toques.length).toBe(2)
      expect(screen.queryByRole('button', { name: 'Parar o tempo' })).toBeNull()
      fireEvent.click(toques[qual] as HTMLElement)
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Parar o tempo' })).toBeTruthy(),
      )
      cleanup()
    }
  })
})

describe('⭐⭐ consertos do review da onda A do lote 5: o player', () => {
  /**
   * Relatório: `tmp/storyboard/implementacao/consertos-lote5-ondaA.md`. Os palcos e as bancadas estão em
   * `member-shell/tests/consertos-onda-a.test.tsx`; aqui fica o que só o PLAYER faz.
   */
  test('⚠️⚠️ layers (ALTO): com as duas descobertas e o Dino escondido de novo, "Conferir" diz o que falta', async () => {
    render(<InteractiveLessonBlock block={block('layers')} previewContent={content('layers')} />)
    // Frente (1ª troca) e escondido de novo (2ª): as duas metas, e a montagem fora do arranjo do jogo.
    await trocarOrdem(1)
    await waitFor(() => expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('1'))
    fireEvent.click(await screen.findByRole('button', { name: /^Subir / }))
    await waitFor(() => expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('2'))
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }))
    await waitFor(() => {
      const resposta = [...document.querySelectorAll('p[aria-live]')]
        .map((p) => p.textContent ?? '')
        .find((t) => t.startsWith('Ainda não'))
      // ⚠️ Mudou de propósito (full review de experiência, M4): a volta é a terceira META, e o
      // "Conferir" diz o pedido dela.
      expect(resposta).toContain('leve o Dino de novo para o fim da ordem de desenhar')
    })
  })

  test('⚠️ layers (MÉDIO): antes do palpite só a prévia mostra os desenhos separados', async () => {
    aluno(content('layers'))
    await screen.findByRole('button', {
      name: SCENE_QUESTIONS.layers.prediction.choices[0]?.label as string,
    })
    // A faixa e a bancada não são montadas no palpite; só a cena inicial parada permanece.
    expect(document.querySelector('dl')).toBeNull()
    const previa = screen.getByTestId('scene-prediction-preview')
    expect(previa.querySelector('desc')?.textContent).toContain('aparecem separados')
    expect(previa.textContent).not.toContain('A floresta fica na frente')
  })

  test('⚠️⚠️ T3: começar a partida pelo palco leva o foco à bancada, e não ao body', async () => {
    render(<InteractiveLessonBlock block={block('restart')} previewContent={content('restart')} />)
    const palco = await screen.findByRole('button', { name: 'Tocar na tela do jogo' })
    palco.focus()
    fireEvent.click(palco)
    await waitFor(() =>
      expect(document.activeElement?.hasAttribute('data-foco-depois-de-comecar')).toBe(true),
    )
    expect(document.activeElement?.textContent).toContain('Tocar na tela')
  })

  test('⚠️ screen-reader: o campo fechado diz o motivo DENTRO dele e avisa quem tenta digitar', async () => {
    render(
      <InteractiveLessonBlock
        block={block('screen-reader')}
        previewContent={content('screen-reader')}
      />,
    )
    const campo = (await screen.findByLabelText('Descrição do jogo')) as HTMLTextAreaElement
    expect(campo.getAttribute('placeholder')).toBe('🔒 Primeiro aperte Ouvir a tela.')
    expect(campo.className).toContain('bg-muted')
    fireEvent.keyDown(campo, { key: 'p' })
    expect(
      await screen.findByText('O campo ainda está fechado. Abre depois de ouvir a tela vazia.'),
    ).toBeTruthy()
  })

  test('⚠️ B4: com vozes carregadas e nenhuma em português, sem "Voz: ligada" e com o aviso escrito', async () => {
    const antes = {
      synth: (window as { speechSynthesis?: unknown }).speechSynthesis,
      utt: (window as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance,
    }
    class Fala {
      lang = ''
      constructor(readonly text: string) {}
    }
    Object.assign(window, {
      SpeechSynthesisUtterance: Fala,
      speechSynthesis: { getVoices: () => [{ lang: 'en-US' }], cancel: () => {}, speak: () => {} },
    })
    try {
      render(
        <InteractiveLessonBlock
          block={block('screen-reader')}
          previewContent={content('screen-reader')}
        />,
      )
      fireEvent.click(await screen.findByRole('button', { name: 'Ouvir a tela' }))
      expect(
        await screen.findByText('Este navegador não tem voz. A leitura fica escrita aqui.'),
      ).toBeTruthy()
      expect(screen.queryByRole('button', { name: /^Voz:/ })).toBeNull()
      // ⚠️⚠️ E o "🔊 Ouvir" do PLAYER também não aparece (full review de 16/09/2026): ele olhava só se a
      // API existia, e o clique ficava mudo. Com voz pt-BR ele aparece (o teste "Ouvir lê a instrução").
      expect(screen.queryByRole('button', { name: 'Ouvir' })).toBeNull()
    } finally {
      Object.assign(window, { speechSynthesis: antes.synth, SpeechSynthesisUtterance: antes.utt })
    }
  })
})
