import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { type InteractiveBlock, publicInteractiveBlock } from '@sistemazero/core/learning'
import {
  castText,
  openScene,
  packExperiment,
  SCENE_IDS,
  SCENE_MODELS,
  SCENE_QUESTIONS,
  type SceneAction,
  type SceneId,
  type ScenePort,
  type SceneState,
  sceneCactiOnScreen,
  sceneGoalIds,
  sceneGoals,
  sceneHint,
  sceneModel,
  scenePorts,
  sceneReadout,
  sceneSituation,
  sceneTargets,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { ExplorationPieces } from '@sistemazero/member-shell/components/exploration-pieces'
import { ExplorationStage } from '@sistemazero/member-shell/components/exploration-stage'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import { LessonPlayerProvider } from '@sistemazero/member-shell/components/lesson-player-context'
import {
  type LessonPreviewContextValue,
  LessonPreviewProvider,
} from '@sistemazero/member-shell/components/lesson-preview-context'
import { LessonSectionProvider } from '@sistemazero/member-shell/components/lesson-section-context'
import { PecaQueMudaDeCaixa } from '@sistemazero/member-shell/components/scene-dino-controls'
import { LessonSceneControls } from '@sistemazero/member-shell/components/scene-lesson-controls'
import { ScenePredictionPreview } from '@sistemazero/member-shell/components/scene-prediction-preview'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { act, useState } from 'react'
import { scenePaths } from '../../core/tests/fixtures/exploration-paths'

/**
 * Os ajustes de desenho das cenas (14/09/2026).
 *
 * Todos nasceram do estudo do Brilliant e do levantamento das 282 seções dos três cursos v6
 * (`docs/aulas-interativas/proposta-experiencias.md`). São regras de APRESENTAÇÃO: nenhuma
 * mexe no motor, na avaliação ou no que sobe para o servidor — e é justamente por isso que
 * precisam de rede própria, senão voltam no primeiro refactor de JSX.
 */

const fetchOriginal = globalThis.fetch
afterEach(() => {
  cleanup()
  globalThis.fetch = fetchOriginal
  localStorage.clear()
})

function content(scene: SceneId, hints: string[] = []): InteractiveBlock {
  const modelo = SCENE_MODELS[scene]
  return {
    kind: 'interactive',
    title: modelo.title,
    instructions: modelo.instruction,
    hints,
    required: false,
    activity: { type: 'experimentation', scene },
  }
}
function block(scene: SceneId, hints: string[] = []) {
  return {
    id: 'discovery',
    blockRevision: 'revision',
    kind: 'interactive',
    sortOrder: 0,
    content: content(scene, hints),
  }
}

describe('a prévia antes do palpite', () => {
  test('mostra o palco inicial e apresenta o botão do leitor de tela sem liberá-lo', () => {
    render(
      <ScenePredictionPreview
        activity={{ type: 'experimentation', scene: 'screen-reader' }}
        contextLabel="Ouvir a tela"
      />,
    )
    const previa = screen.getByTestId('scene-prediction-preview')
    expect(previa.getAttribute('role')).toBe('group')
    expect(previa.getAttribute('aria-label')).toContain('Ouvir a tela')
    expect(previa.querySelector('[data-preview-stage]')?.getAttribute('role')).toBe('img')
    expect(previa.querySelector('[data-preview-stage]')?.className).toContain('[&_button]:hidden')
    expect(screen.queryByRole('textbox')).toBeNull()
    const botao = screen.getByRole('button', { name: 'Ouvir a tela' }) as HTMLButtonElement
    expect(botao.disabled).toBe(true)
    expect(botao.getAttribute('aria-describedby')).toBeTruthy()
    expect(previa.textContent).toContain('Você vai usar este botão depois do seu palpite.')
    expect(screen.queryByRole('meter')).toBeNull()
  })

  test('oculta a ordem das camadas e não monta as ferramentas da cena', () => {
    render(
      <ScenePredictionPreview
        activity={{ type: 'experimentation', scene: 'layers' }}
        contextLabel="A ordem dos desenhos"
      />,
    )
    const previa = screen.getByTestId('scene-prediction-preview')
    expect(previa.hasAttribute('data-scene-prediction-preview')).toBeTrue()
    expect(previa.querySelector('desc')?.textContent).toContain('aparecem separados')
    expect(previa.textContent).not.toContain('A floresta fica na frente')
    expect(previa.textContent).not.toContain('Nada fica na frente do Dino')
    expect(screen.queryByRole('button', { name: /^Descer / })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Recomeçar' })).toBeNull()
    expect(screen.queryByRole('meter')).toBeNull()
  })
})

describe('a pista não apaga a instrução', () => {
  test('⚠️ o enunciado FICA na tela depois de pedir ajuda', async () => {
    // Era o defeito mais caro dos sete: a pista entrava no MESMO balão e o enunciado sumia.
    // Quem pede ajuda é exatamente quem ainda vai reler o que foi pedido.
    render(<InteractiveLessonBlock block={block('layers')} previewContent={content('layers')} />)
    expect(screen.getByText(SCENE_MODELS.layers.instruction)).toBeTruthy()
    fireEvent.click(await screen.findByRole('button', { name: 'Uma pista' }))
    expect(document.querySelector('[data-pista]')?.textContent).toContain(
      SCENE_MODELS.layers.hints[0] as string,
    )
    expect(screen.getByText(SCENE_MODELS.layers.instruction)).toBeTruthy()
  })

  test('⭐ o primeiro degrau da pista DIZ onde a criança está antes de dizer o que fazer', () => {
    // O padrão da ajuda do Brilliant: ela cita o estado atual ("seu primeiro ponto foi parar em
    // (−2, 2)") e só então orienta. Repetir a frase genérica para quem travou é não responder.
    const estado = openScene({ scene: 'layers' })
    const primeira = sceneHint('layers', estado, 1)
    expect(primeira.startsWith(sceneSituation('layers', estado))).toBe(true)
    expect(primeira).toContain(SCENE_MODELS.layers.hints[0] as string)
    // ⚠️ Do segundo degrau em diante, só a escada: repetir a situação a cada clique vira ruído.
    expect(sceneHint('layers', estado, 2)).toBe(SCENE_MODELS.layers.hints[1] as string)
  })

  test('a pista mostra o degrau, e o degrau anda', async () => {
    // A escada de três já estava escrita no catálogo; o que faltava era ela aparecer COMO
    // escada, para a criança decidir entre pedir a próxima e tentar de novo.
    render(<InteractiveLessonBlock block={block('layers')} previewContent={content('layers')} />)
    const pista = await screen.findByRole('button', { name: 'Uma pista' })
    fireEvent.click(pista)
    expect(screen.getByText('Pista 1 de 3.')).toBeTruthy()
    fireEvent.click(pista)
    expect(screen.getByText('Pista 2 de 3.')).toBeTruthy()
    expect(screen.getByText(SCENE_MODELS.layers.hints[1] as string)).toBeTruthy()
  })

  test('a pista do PROFESSOR entra no lugar da do modelo, com o total dele', async () => {
    render(
      <InteractiveLessonBlock
        block={block('layers', ['Olhe a faixa de desenho.', 'Agora troque a ordem.'])}
        previewContent={content('layers', ['Olhe a faixa de desenho.', 'Agora troque a ordem.'])}
      />,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Uma pista' }))
    expect(screen.getByText('Pista 1 de 2.')).toBeTruthy()
    expect(screen.getByText('Olhe a faixa de desenho.')).toBeTruthy()
  })
})

describe('a faixa de estado', () => {
  test('os números da cena aparecem antes do palco e acompanham o controle', async () => {
    // É o elo que faltava entre o valor que a criança vai digitar no bloco e o desenho.
    render(<InteractiveLessonBlock block={block('hitbox')} previewContent={content('hitbox')} />)
    const faixa = await screen.findByText('distância do cacto')
    const linha = faixa.closest('dl')
    expect(linha).toBeTruthy()
    expect(linha?.textContent).toContain('área do Dino')
    const distancia = screen.getByRole('slider', { name: 'Distância do cacto' })
    fireEvent.change(distancia, { target: { value: '25' } })
    await waitFor(() => expect(linha?.textContent).toContain('25'))
    // E o encosto salta aos olhos na própria faixa.
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): a área está em PORCENTAGEM, e é ela que acende em
    // alerta quando as áreas encostam ("se tocam" era a conclusão escrita na faixa).
    expect(linha?.querySelector('.text-scene-alert')?.textContent).toBe('100%')
  })

  test('⚠️⚠️ a faixa é LEGÍVEL por leitor de tela', async () => {
    // A primeira versão a escondia com `aria-hidden`, argumentando que a frase abaixo do palco
    // dizia o mesmo. Achado do full review: a faixa é conteúdo ESTÁTICO (quem anuncia a cada
    // mudança é o `role="status"` da frase, outro elemento), então escondê-la só tirava de
    // quem usa leitor justamente os números que a cena existe para mostrar. Numa plataforma
    // que ensina acessibilidade na primeira aula, isso é contradição.
    render(<InteractiveLessonBlock block={block('hitbox')} previewContent={content('hitbox')} />)
    const faixa = (await screen.findByText('distância do cacto')).closest('dl')
    expect(faixa?.getAttribute('aria-hidden')).toBeNull()
    // E a relação nome/valor vem da própria marcação, não de um texto corrido.
    expect(faixa?.querySelectorAll('dt').length).toBeGreaterThan(1)
    expect(faixa?.querySelectorAll('dd').length).toBe(faixa?.querySelectorAll('dt').length)
  })
})

describe('a frase embaixo do palco', () => {
  test('⚠️ descreve a situação, e não "siga a missão e observe o resultado"', async () => {
    // A frase genérica era a mesma nas catorze cenas e em todo estado. Esta asserção morde: o
    // texto antigo está escrito aqui de propósito.
    render(<InteractiveLessonBlock block={block('world')} previewContent={content('world')} />)
    await screen.findByRole('button', { name: 'Criar o Dino' })
    expect(screen.queryByText('Siga a missão e observe o resultado.')).toBeNull()
    // ⚠️ Mira no `role="status"`: a narração mora ali. A descrição do SVG fala da CENA
    // (o que está no palco) e não repete a frase — foi uma duplicação achada no full review,
    // que fazia o leitor de tela ouvir a mesma coisa duas vezes.
    const status = screen
      .getAllByRole('status')
      .map((el) => el.textContent)
      .join(' | ')
    // ⚠️ Mudou de propósito (lote 2 do Raio-X): a frase descreve o ESTADO, sem "ninguém foi criado
    // ainda" puxando a resposta da previsão.
    expect(status).toContain('Os bastidores estão vazios e a tela do jogo também.')
    const desenho = document.querySelector('svg desc')?.textContent ?? ''
    expect(desenho).not.toContain('Os bastidores estão vazios')
    expect(desenho.length).toBeGreaterThan(10)
  })

  test('a frase descreve o estado quando o motor não legenda o gesto', async () => {
    // ⚠️ A cena da colisão abre SEM caption: mexer no controle deslizante não é um
    // acontecimento que o motor narre. Era exatamente aí que caía a frase genérica, e é o
    // caso que esta asserção guarda.
    render(<InteractiveLessonBlock block={block('hitbox')} previewContent={content('hitbox')} />)
    expect(
      // ⚠️ Mudou de propósito (lote 2 do Raio-X): as duas formas da frase ficaram paralelas ("se
      // tocam" / "estão separadas"), sem "é aí que a batida acontece", que era a regra.
      // ⚠️ E de novo no review do lote 2: as duas medidas, nomeadas, e sem "as áreas se tocam", que
      // o selo do palco e a faixa já dizem.
      // ⚠️ E no lote 5: a área está em porcentagem na faixa, e a frase diz se as áreas encostam.
      // ⚠️ E nos consertos do review da onda A do lote 5: a cena abre em 149 (o − de 10 cai em 59).
      await screen.findByText(
        'O cacto está a 149 do Dino. As áreas pontilhadas ainda não se encostam.',
      ),
    ).toBeTruthy()
    // ⚠️ Em 100 as áreas não encostam: o toque que encosta tem legenda própria (BATEU).
    fireEvent.change(screen.getByRole('slider', { name: 'Distância do cacto' }), {
      target: { value: '100' },
    })
    // ⚠️ Mudou de propósito (review do lote 2): o toque na distância não tem legenda ("As áreas
    // encostaram: batida!" respondia a previsão), e a frase acompanha o estado novo.
    await waitFor(() =>
      expect(
        screen.getByText('O cacto está a 100 do Dino. As áreas pontilhadas ainda não se encostam.'),
      ).toBeTruthy(),
    )
    expect(screen.queryByText('As áreas encostaram: batida!')).toBeNull()
  })
})

describe('uma variável por vez', () => {
  test('⚠️ a largura da área abre só depois da descoberta sobre distância', async () => {
    // Duas medidas soltas ao mesmo tempo não ensinam qual causou o quê. O controle fica na
    // tela, com o motivo escrito: sumir com ele faria a cena parecer outra a cada descoberta.
    render(<InteractiveLessonBlock block={block('hitbox')} previewContent={content('hitbox')} />)
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): em porcentagem, "Tamanho da área do Dino".
    const largura = (await screen.findByRole('slider', {
      name: 'Tamanho da área do Dino',
    })) as HTMLInputElement
    // ⚠️ Fechado é `aria-disabled`, e não `disabled` (review do lote 1): continua no Tab, dizendo
    // o motivo ao leitor de tela pelo `aria-describedby`.
    expect(largura.getAttribute('aria-disabled')).toBe('true')
    expect(largura.disabled).toBe(false)
    expect(
      document.getElementById(largura.getAttribute('aria-describedby') ?? '')?.textContent,
      // ⚠️ Mudou de propósito (lote 2 do Raio-X): o motivo diz o que ABRE, e não "o que a distância
      // faz", que soava como a descoberta. E no lote 5: abre com a batida VISTA com um vão entre
      // os desenhos, que é o que o toque de 10 em 10 mostra (em 50).
    ).toBe('Abre depois que você aproximar o cacto um toque de cada vez.')
    fireEvent.change(screen.getByRole('slider', { name: 'Distância do cacto' }), {
      target: { value: '50' },
    })
    await waitFor(() => expect(largura.getAttribute('aria-disabled')).toBeNull())
    expect(
      screen.queryByText('Abre depois que você aproximar o cacto um toque de cada vez.'),
    ).toBeNull()
  })
})

describe('o rodapé tem uma ação principal', () => {
  test('⚠️ as ferramentas e a pista continuam com os MESMOS nomes', async () => {
    // O que mudou foi o peso visual. Os nomes são o contrato de quem navega por leitor de tela
    // (e dos outros testes desta pasta): trocá-los quebraria os dois.
    // ⚠️ Mudou de propósito (lote 2 do Raio-X): "Ligar som" saiu da lista porque `layers` não faz
    // som, e o principal do rodapé é "Conferir" (era "Já descobri").
    render(<InteractiveLessonBlock block={block('layers')} previewContent={content('layers')} />)
    for (const nome of ['Desfazer', 'Recomeçar', 'Uma pista', 'Conferir'])
      expect(await screen.findByRole('button', { name: nome })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Já descobri/ })).toBeNull()
  })

  test('⚠️ cada ferramenta aparece UMA vez', async () => {
    // A reorganização moveu "Ligar som" e "Ouvir instrução" para o lado das ferramentas; deixar
    // as cópias antigas para trás renderizaria dois botões com o mesmo nome acessível — e
    // `getByRole` passa a estourar em vez de achar. ⚠️ `jump-sound`: é a cena que faz som.
    render(
      <InteractiveLessonBlock block={block('jump-sound')} previewContent={content('jump-sound')} />,
    )
    // ⚠️ Mudou de propósito (consertos do review da onda A do lote 5): na experimentação da cena do som
    // ele é a CHAVE "Som" da bancada, e o rodapé não repete o controle.
    await screen.findByRole('button', { name: 'Som: desligado' })
    expect(screen.getAllByRole('button', { name: /^Som: |Ligar som/ })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Recomeçar' })).toHaveLength(1)
  })
})

describe('o elenco por curso', () => {
  const NAVE = {
    hero: { name: 'nave', gender: 'f' as const },
    obstacle: { name: 'asteroide', gender: 'm' as const },
  }
  function vestido(scene: SceneId): InteractiveBlock {
    return {
      ...content(scene),
      // ⚠️ Título e instrução são do PROFESSOR: ele escreve com os nomes do curso dele, e o
      // elenco não reescreve o que uma pessoa digitou. O que o elenco veste é o que a
      // PLATAFORMA gera — pistas, metas, faixa de estado, frase de sucesso e roteiro.
      title: 'Onde a batida acontece?',
      instructions: 'Aproxime o asteroide. Depois mude a área da nave, sem mudar o desenho.',
      activity: { type: 'experimentation', scene, cast: NAVE },
    }
  }

  test('⚠️ a criança lê a cena com o elenco do CURSO dela: faixa, frase e pista', async () => {
    // É o que faz a mesma cena servir ao Corre Dino e ao Desafio do Primeiro Jogo. Sem isto,
    // as seis cenas reaproveitáveis continuam presas a um curso só.
    const bloco = { ...block('hitbox'), content: vestido('hitbox') }
    render(<InteractiveLessonBlock block={bloco} previewContent={vestido('hitbox')} />)
    const faixa = (await screen.findByText('distância do asteroide')).closest('dl')
    // ⚠️ Mudou de propósito (consertos do review da onda A do lote 5): a cena abre em 149.
    expect(faixa?.textContent).toContain('área da nave')
    // A frase da situação e o controle travado também.
    // ⚠️ Mudou de propósito (review do lote 2): a frase da `hitbox` nomeia as duas medidas.
    // ⚠️ E no lote 5: a frase diz se as áreas pontilhadas encostam.
    expect(
      screen.getByText(
        /O asteroide está a 149 da nave\. As áreas pontilhadas ainda não se encostam/,
      ),
    ).toBeTruthy()
    // A pista cita o personagem pelo nome, e é a do atalho da cena (não a do catálogo).
    fireEvent.click(screen.getByRole('button', { name: 'Uma pista' }))
    expect(document.querySelector('[data-pista]')?.textContent).toContain(
      'Aproxime o asteroide devagar',
    )
    expect(document.querySelector('[data-pista]')?.textContent).toContain('borda da área da nave')
  })

  test('sem elenco declarado, nada muda para o Corre Dino', async () => {
    render(<InteractiveLessonBlock block={block('hitbox')} previewContent={content('hitbox')} />)
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): a instrução do modelo é "Traga o cacto devagar…". E nos
    // consertos do review da onda A do lote 5: "um toque de cada vez" (o "olhe o espaço" respondia a
    // previsão logo abaixo).
    expect(await screen.findByText(/Traga o cacto um toque de cada vez/)).toBeTruthy()
    expect(screen.getByText('distância do cacto')).toBeTruthy()
  })
})

describe('as duas cenas da Aula 1', () => {
  function cena(scene: SceneId): InteractiveBlock {
    const m = SCENE_MODELS[scene]
    return {
      kind: 'interactive',
      title: m.title,
      instructions: m.instruction,
      hints: [],
      required: false,
      activity: { type: 'experimentation', scene },
    }
  }

  test('⚠️ o endereço: a criança mexe em x e em y, e o teclado chega ao mesmo lugar', async () => {
    // Era o buraco que motivou o estudo: o roteiro ensinava x e y com "um marcador se move,
    // sem arraste nem parâmetros para a criança", e o fecho da aula cobrava os dois.
    const c = cena('coordinates')
    render(
      <InteractiveLessonBlock
        block={{ id: 'b', blockRevision: 'r', kind: 'interactive', sortOrder: 0, content: c }}
        previewContent={c}
      />,
    )
    const x = (await screen.findByRole('slider', { name: /^x/ })) as HTMLInputElement
    const y = screen.getByRole('slider', { name: /^y/ }) as HTMLInputElement
    expect(x.value).toBe('110')
    expect(y.value).toBe('150')
    // Um eixo por vez: o controle de y NÃO mexe no x.
    fireEvent.change(y, { target: { value: '210' } })
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): "DESCEU, sem sair do lugar na largura" gritava.
    await waitFor(() => expect(screen.getByText(/o Dino desceu\. O x ficou igual/)).toBeTruthy())
    expect((screen.getByRole('slider', { name: /^x/ }) as HTMLInputElement).value).toBe('110')
    // E o passo de 20 é a via de quem não arrasta.
    // ⚠️ O nome do botão agora é o RÓTULO INTEIRO que a criança vê no controle, e não o nome
    // curto do eixo: a bancada passou a ser a peça `Medida`, e quem usa leitor de tela ouve a
    // mesma coisa que está escrita na tela. O "em 20" continua, porque o botão anda mais que o
    // deslizante — é justamente o que ele precisa dizer.
    // ⚠️ Mudou de propósito (lote 2 do Raio-X): o rótulo é só "x". "y, de cima a baixo" ficava à
    // vista durante a previsão e era a resposta dela.
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar x em 20' }))
    await waitFor(() =>
      expect((screen.getByRole('slider', { name: /^x/ }) as HTMLInputElement).value).toBe('130'),
    )
    // ⭐ Lote 5: a terceira descoberta é CHEGAR no 0, 0, e a marca do endereço fica no canto de cima
    // da caixa do sprite. Lá ela encosta no canto da tela, e não no meio do corpo do Dino.
    fireEvent.change(screen.getByRole('slider', { name: /^x/ }), { target: { value: '0' } })
    fireEvent.change(screen.getByRole('slider', { name: /^y/ }), { target: { value: '0' } })
    await waitFor(() => expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('3'))
    const marca = document.querySelector('[data-marca-do-endereco]')
    const caixa = document.querySelector('[data-caixa-do-sprite]')
    expect(marca?.getAttribute('cx')).toBe(caixa?.getAttribute('x'))
    expect(marca?.getAttribute('cy')).toBe(caixa?.getAttribute('y'))
  })

  test('⚠️⚠️ o endereço no Desafio: a TELA é a do caso (800 por 480), e a régua acompanha', async () => {
    const c: InteractiveBlock = {
      ...cena('coordinates'),
      activity: {
        type: 'experimentation',
        scene: 'coordinates',
        cast: { hero: { name: 'nave', gender: 'f' } },
        setup: {
          actions: [
            { type: 'stage', width: 800, height: 480 },
            { type: 'place', x: 400, y: 40 },
          ],
          goals: ['down'],
        },
      },
    }
    render(
      <InteractiveLessonBlock
        block={{ id: 'b', blockRevision: 'r', kind: 'interactive', sortOrder: 0, content: c }}
        previewContent={c}
      />,
    )
    const x = (await screen.findByRole('slider', { name: /^x/ })) as HTMLInputElement
    expect(x.max).toBe('800')
    expect((screen.getByRole('slider', { name: /^y/ }) as HTMLInputElement).max).toBe('480')
    const regua = [...document.querySelectorAll('svg text')].map((t) => t.textContent)
    expect(regua).toContain('800')
    expect(regua).toContain('480')
    expect(document.querySelector('[data-figure="nave"]')).toBeTruthy()
    expect(document.querySelector('[data-figure="dino"]')).toBeNull()
  })

  test('⚠️ o leitor de tela: ouvir o VAZIO é a descoberta que abre a cena', async () => {
    const c = cena('screen-reader')
    render(
      <InteractiveLessonBlock
        block={{ id: 'b', blockRevision: 'r', kind: 'interactive', sortOrder: 0, content: c }}
        previewContent={c}
      />,
    )
    // ⚠️⚠️ Lote 5: o campo nasce FECHADO até a tela vazia ser ouvida (fechado não é escondido: fica
    // no Tab, com o motivo ligado). Aberto, quem escrevia antes só fechava a meta apagando a frase.
    const fechado = screen.getByLabelText('Descrição do jogo') as HTMLTextAreaElement
    expect(fechado.getAttribute('aria-disabled')).toBe('true')
    expect(fechado.disabled).toBe(false)
    expect(
      document.getElementById(fechado.getAttribute('aria-describedby') ?? '')?.textContent,
    ).toBe('Abre depois de ouvir a tela vazia.')
    fireEvent.click(await screen.findByRole('button', { name: 'Ouvir a tela' }))
    await waitFor(() => expect(screen.getByText('Tela do jogo. Imagem.')).toBeTruthy())
    const campo = screen.getByLabelText('Descrição do jogo')
    expect(campo.getAttribute('aria-disabled')).toBeNull()
    fireEvent.change(campo, {
      target: { value: 'Corra com o dino e pule os cactos apertando espaço' },
    })
    // ⚠️ O texto só sobe quando ela para de digitar ou sai do campo — e é o clique no botão
    // que tira o foco. Despachar por tecla gerava ~50 comandos para uma frase (achado do full
    // review), com o relatório do professor contando cinquenta ações.
    fireEvent.blur(campo)
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir a tela' }))
    await waitFor(() =>
      expect(
        screen.getByText('Tela do jogo. Corra com o dino e pule os cactos apertando espaço'),
      ).toBeTruthy(),
    )
    // As três descobertas fecham a cena.
    await waitFor(() => expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('3'))
    // ⭐ Lote 5: as DUAS escutas ficam no painel, uma embaixo da outra, e os selos acendem.
    expect(document.querySelector('[data-escuta="sem-frase"]')?.textContent).toContain(
      'Tela do jogo. Imagem.',
    )
    expect(document.querySelector('[data-escuta="com-frase"]')?.textContent).toContain(
      'Corra com o dino',
    )
    expect(document.querySelectorAll('[data-selo][data-aceso]')).toHaveLength(2)
  })

  test('⭐⭐ o leitor de tela FALA de verdade, a cada escuta, e o painel continua escrito', async () => {
    // Decisão da dona (lote 5): a cena fala com a voz do navegador em pt-BR. O happy-dom não tem
    // voz, então a síntese é trocada por uma falsa que só GUARDA as falas.
    const falas: string[] = []
    const antes = {
      synth: (window as { speechSynthesis?: unknown }).speechSynthesis,
      utt: (window as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance,
    }
    class Fala {
      lang = ''
      voice: unknown = null
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor(readonly text: string) {}
    }
    Object.assign(window, {
      SpeechSynthesisUtterance: Fala,
      speechSynthesis: {
        getVoices: () => [],
        cancel: () => {},
        speak: (f: Fala) => {
          falas.push(f.text)
          f.onend?.()
        },
      },
    })
    try {
      const c = cena('screen-reader')
      render(
        <InteractiveLessonBlock
          block={{ id: 'b', blockRevision: 'r', kind: 'interactive', sortOrder: 0, content: c }}
          previewContent={c}
        />,
      )
      // Abrir a cena não fala nada.
      const ouvir = await screen.findByRole('button', { name: 'Ouvir a tela' })
      expect(falas).toEqual([])
      fireEvent.click(ouvir)
      await waitFor(() => expect(falas.join(' ')).toContain('Imagem.'))
      // A segunda escuta da MESMA tela fala de novo.
      const quantas = falas.length
      fireEvent.click(ouvir)
      await waitFor(() => expect(falas.length).toBeGreaterThan(quantas))
      // A chave desliga a voz, e o painel continua sendo o caminho escrito.
      fireEvent.click(screen.getByRole('button', { name: /Voz: ligada/ }))
      const caladas = falas.length
      fireEvent.click(ouvir)
      await waitFor(() => expect(document.querySelector('[data-escuta="sem-frase"]')).toBeTruthy())
      expect(falas.length).toBe(caladas)
    } finally {
      Object.assign(window, {
        speechSynthesis: antes.synth,
        SpeechSynthesisUtterance: antes.utt,
      })
    }
  })
})

describe('o que sobe ao servidor', () => {
  test('⚠️⚠️ escrever a descrição não gera um comando por tecla', async () => {
    // Regressão em número: 50 teclas produziam 50 comandos, cada um carregando o texto inteiro
    // para o histórico, para o segmento e para a contagem de ações da evidência.
    const c: InteractiveBlock = {
      kind: 'interactive',
      title: SCENE_MODELS['screen-reader'].title,
      instructions: SCENE_MODELS['screen-reader'].instruction,
      hints: [],
      required: false,
      activity: { type: 'experimentation', scene: 'screen-reader' },
    }
    render(
      <InteractiveLessonBlock
        block={{ id: 'b', blockRevision: 'r', kind: 'interactive', sortOrder: 0, content: c }}
        previewContent={c}
      />,
    )
    const campo = (await screen.findByLabelText('Descrição do jogo')) as HTMLTextAreaElement
    // ⚠️ Mudou de propósito (lote 5): o campo abre depois de ouvir a tela vazia.
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir a tela' }))
    await waitFor(() => expect(campo.getAttribute('aria-disabled')).toBeNull())
    const frase = 'Corra com o dino e pule os cactos apertando espaço'
    for (let i = 1; i <= frase.length; i++)
      fireEvent.change(campo, { target: { value: frase.slice(0, i) } })
    // Nada subiu ainda: o campo é local até ela parar.
    expect(campo.value).toBe(frase)
    fireEvent.blur(campo)
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir a tela' }))
    await waitFor(() => expect(screen.getByText(`Tela do jogo. ${frase}`)).toBeTruthy())
    // Três ações no total (ouvir, escrever e ouvir), não cinquenta e duas. O medidor de descobertas
    // é a prova mais barata de que o motor recebeu o texto certo de uma vez só.
    expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('3')
  })
})

describe('as duas cenas da Aula 1 e da Aula 2', () => {
  function bloco(scene: SceneId): InteractiveBlock {
    const m = SCENE_MODELS[scene]
    return {
      kind: 'interactive',
      title: m.title,
      instructions: m.instruction,
      hints: [],
      required: false,
      activity: { type: 'experimentation', scene },
    }
  }
  const montar = (scene: SceneId) => {
    const c = bloco(scene)
    render(
      <InteractiveLessonBlock
        block={{ id: 'b', blockRevision: 'r', kind: 'interactive', sortOrder: 0, content: c }}
        previewContent={c}
      />,
    )
  }

  test('⚠️ a tela: a borda é o que revela o limite, e o número da aula fecha a cena', async () => {
    montar('stage-size')
    // ⚠️ Mudou de propósito (lote 2 do Raio-X): sem a borda, a frase diz só o ESTADO. "A cor do fundo
    // cobre tudo" era a resposta da previsão da cena, embaixo do palco desde a abertura.
    expect(await screen.findByText('Tela de 800 por 480, com a borda escondida.')).toBeTruthy()
    expect(screen.queryByText(/a cor do fundo cobre tudo/i)).toBeNull()
    // A criança precisa ler a PRÓXIMA ação. O estado continua no `aria-pressed`, que é o contrato
    // acessível do controle alternável.
    const ligar = screen.getByRole('button', { name: 'Ligue a borda' })
    expect(ligar.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(ligar)
    // ⚠️ Mudou de propósito (review do lote 2): ligar a borda não tem legenda ("A moldura apareceu:
    // é ali que o jogo acontece" era a regra), e a frase diz o estado.
    await waitFor(() => expect(screen.getByText(/com a borda à vista/)).toBeTruthy())
    expect(
      screen.getByRole('button', { name: 'Desligue a borda' }).getAttribute('aria-pressed'),
    ).toBe('true')
    expect(screen.queryByText(/A moldura apareceu/)).toBeNull()
    fireEvent.change(screen.getByRole('slider', { name: 'largura da tela' }), {
      target: { value: '600' },
    })
    // ⚠️⚠️ Mudou de propósito (lote 5): o atalho "Usar 480 por 270" SAIU (fechava duas metas num
    // toque e fazia pela criança a ligação número × formato). Ela DIGITA, como no bloco do Estúdio.
    expect(screen.queryByRole('button', { name: 'Usar 480 por 270' })).toBeNull()
    const digitar = (nome: string, valor: string) => {
      const campo = screen.getByRole('textbox', { name: nome })
      fireEvent.change(campo, { target: { value: valor } })
      fireEvent.keyDown(campo, { key: 'Enter' })
    }
    digitar('Digitar largura da tela', '480')
    digitar('Digitar altura da tela', '270')
    await waitFor(() => expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('3'))
  })

  test('⚠️⚠️ a tela: os números nascem FECHADOS até a borda aparecer, e o palco tem escala fixa', async () => {
    montar('stage-size')
    const largura = (await screen.findByRole('slider', {
      name: 'largura da tela',
    })) as HTMLInputElement
    expect(largura.getAttribute('aria-disabled')).toBe('true')
    expect(
      document.getElementById(largura.getAttribute('aria-describedby') ?? '')?.textContent,
    ).toBe('Abre quando a borda estiver à vista.')
    // Sem a borda, nada tracejado nem cantoneira: a página e a tela interna formam uma superfície só.
    expect(document.querySelector('[data-pagina-da-experiencia]')).toBeTruthy()
    expect(document.querySelector('[data-tela-do-jogo]')).toBeTruthy()
    expect(document.querySelector('[data-alvo]')).toBeNull()
    expect(document.querySelector('[data-borda]')).toBeNull()
    fireEvent.change(largura, { target: { value: '600' } })
    expect(largura.value).toBe('800')
    fireEvent.click(screen.getByRole('button', { name: 'Ligue a borda' }))
    await waitFor(() => expect(document.querySelector('[data-borda]')).toBeTruthy())
    const larguraDaBorda = () =>
      Number(document.querySelector('[data-borda]')?.getAttribute('width'))
    const em800 = larguraDaBorda()
    fireEvent.change(screen.getByRole('slider', { name: 'largura da tela' }), {
      target: { value: '480' },
    })
    // ⚠️⚠️ ESCALA FIXA: 480 fica visivelmente mais estreito que 800 (a escala era recalculada, e
    // diminuir o número fazia o desenho CRESCER).
    await waitFor(() => expect(larguraDaBorda()).toBeCloseTo((em800 * 480) / 800, 1))
    expect(document.querySelector('[data-alvo]')).toBeTruthy()
  })

  test('⚠️ o laço: as três situações só aparecem com o relógio andando', async () => {
    montar('draw-loop')
    // ⚠️ Mudou de propósito (lote 4 do Raio-X): o quadro é o assunto desta cena, e o passo avança
    // exatamente UM quadro (0,25 s). É por isso que cada clique abaixo é um desenho a mais.
    const passo = await screen.findByRole('button', { name: 'Avançar 1 quadro' })
    // 1. Só no começo: o relógio anda, o x do Dino anda na faixa, e a tela não muda.
    const xNaFaixa = () =>
      [...document.querySelectorAll('dt')].find((dt) => dt.textContent === 'x do Dino')
        ?.nextElementSibling?.textContent
    expect(xNaFaixa()).toBe('10')
    fireEvent.click(passo)
    await waitFor(() => expect(screen.getByText(/a tela continua igual/i)).toBeTruthy())
    expect(xNaFaixa()).toBe('54')
    // 2. Rastro: desenha a cada quadro, sem limpar.
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): "Desenhar a cada quadro: ligado/desligado" virou a
    // ESCOLHA "Desenhar o Dino: só no começo / a cada quadro", e sem `aria-pressed` (os dois valores
    // estão vivos).
    const cada = screen.getByRole('button', { name: 'A cada quadro' })
    expect(cada.getAttribute('aria-pressed')).toBeNull()
    fireEvent.click(cada)
    fireEvent.click(passo)
    fireEvent.click(passo)
    // ⚠️ Mira na FRASE, não no rótulo da faixa (que também diz "Dinos na tela"). São 3: trocar a
    // escolha não apaga o desenho do começo, que fica na tela junto com os dois novos.
    await waitFor(() => expect(screen.getByText(/Desenhou sem limpar: 3/)).toBeTruthy())
    // 3. Movimento: limpa e desenha.
    fireEvent.click(screen.getByRole('button', { name: /Limpar a tela antes/ }))
    fireEvent.click(passo)
    await waitFor(() => expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('3'))
  })
})

describe('a previsão antes de mexer', () => {
  /**
   * ⭐ O padrão mais forte do Brilliant: arriscar um palpite ANTES de a cena abrir. Ele não
   * avalia nada — errar é parte da descoberta, e reprovar por isso ensinaria a não arriscar.
   */
  const PREVISAO = {
    context: {
      label: 'A batida do Dino no cacto',
      explanation: 'Você vai aproximar o cacto do Dino para descobrir quando os dois encostam.',
    },
    prompt: 'O que acontece quando o cacto chega bem perto do Dino?',
    choices: [
      { id: 'toca', label: 'As áreas se tocam e dá batida' },
      { id: 'nada', label: 'Não acontece nada' },
    ],
  }
  const comPrevisao = (scene: SceneId): InteractiveBlock => ({
    ...content(scene),
    prediction: PREVISAO,
  })

  test('⚠️ o palpite mostra contexto e prévia antes de montar a cena e as ferramentas', async () => {
    const c = comPrevisao('hitbox')
    render(
      <InteractiveLessonBlock
        block={{ id: 'b', blockRevision: 'r', kind: 'interactive', sortOrder: 0, content: c }}
        previewContent={c}
      />,
    )
    expect(
      await screen.findAllByText(
        (_, node) => node?.textContent?.includes(PREVISAO.prompt) === true,
      ),
    ).not.toHaveLength(0)
    expect(await screen.findByText(PREVISAO.context.explanation)).toBeTruthy()
    expect(screen.getByTestId('scene-prediction-preview').getAttribute('aria-label')).toBe(
      `Prévia da experiência: ${PREVISAO.context.label}`,
    )
    // O rodapé não existe no momento do palpite.
    for (const nome of ['Recomeçar', 'Uma pista']) {
      expect(screen.queryByRole('button', { name: nome })).toBeNull()
    }
    // ⚠️⚠️ A bancada, essa, fica À VISTA e FECHADA (o console de 18/09/2026, a "Proposta B"): a
    // criança vê o que vai poder mexer. O que não pode é MEXER — a prancha é `inert`, e o gesto
    // não chega ao motor.
    expect(
      screen.getByRole('slider', { name: 'Distância do cacto' }).closest('[inert]'),
    ).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: PREVISAO.choices[0]?.label as string }))
    const distancia = await screen.findByRole('slider', { name: 'Distância do cacto' })
    // E a cena responde de verdade depois de aberta.
    fireEvent.change(distancia, { target: { value: '100' } })
    // ⚠️ Mudou de propósito (review do lote 2): sem a legenda "As áreas encostaram: batida!".
    // ⚠️ E no lote 5: em 100 as áreas não encostam, e a frase segue o estado novo.
    await waitFor(() =>
      expect(
        screen.getByText('O cacto está a 100 do Dino. As áreas pontilhadas ainda não se encostam.'),
      ).toBeTruthy(),
    )
  })

  test('o cartão do palpite vira uma LINHA congelada depois de escolher', async () => {
    // ⚠️ Mudou de propósito (lote 2 do Raio-X): "Escolha um palpite para abrir a cena" e "Agora
    // mexa na cena e veja se foi isso mesmo" saíram. O cartão encolhe para "Seu palpite: …".
    const c = comPrevisao('hitbox')
    render(
      <InteractiveLessonBlock
        block={{ id: 'b', blockRevision: 'r', kind: 'interactive', sortOrder: 0, content: c }}
        previewContent={c}
      />,
    )
    expect(await screen.findByText(/Pode errar: a cena mostra depois/)).toBeTruthy()
    expect(screen.getByTestId('scene-prediction-preview')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: PREVISAO.choices[1]?.label as string }))
    await waitFor(() => expect(screen.getByText('Seu palpite:')).toBeTruthy())
    expect(screen.queryByRole('button', { name: PREVISAO.choices[0]?.label as string })).toBeNull()
    expect(screen.queryByTestId('scene-prediction-preview')).toBeNull()
    // ⚠️ Nada diz se ela acertou antes de a cena mostrar.
    expect(screen.queryByText(/Você achou/)).toBeNull()
  })

  test('⚠️⚠️ sem previsão declarada, a criança recebe a DA CENA — pela projeção pública', async () => {
    /**
     * ⚠️⚠️ Este é o único teste da suíte que monta o bloco como a CRIANÇA o recebe. Todos os
     * outros desenham o conteúdo de AUTORIA (é o que a prévia do admin faz), e desde 15/09/2026
     * a previsão e a pergunta não vêm mais dos campos crus do bloco: vêm dos RESOLVEDORES do
     * core, aplicados pelo `publicInteractiveBlock`. A versão anterior deste teste afirmava que
     * "a cena abre como sempre abriu" — verdade só no caminho que a criança não usa, e falsa em
     * produção desde que toda cena passou a ter previsão.
     */
    const publico = publicInteractiveBlock(content('hitbox'))
    render(
      <InteractiveLessonBlock
        block={{ id: 'b', blockRevision: 'r', kind: 'interactive', sortOrder: 0, content: publico }}
      />,
    )
    const modelo = SCENE_QUESTIONS.hitbox
    expect(
      await screen.findAllByText(
        (_, node) => node?.textContent?.includes(modelo.prediction.prompt) === true,
      ),
    ).not.toHaveLength(0)
    // ⚠️⚠️ A bancada fica À VISTA e FECHADA no palpite (o console de 18/09/2026), dentro da
    // cortina `inert`: a criança vê o que vai poder mexer e não alcança nada.
    expect(
      screen.getByRole('slider', { name: 'Distância do cacto' }).closest('[inert]'),
    ).not.toBeNull()
    // ⚠️ E o que é do servidor NÃO atravessa: a explicação só chega quando ela acerta.
    expect(document.body.innerHTML).not.toContain(modelo.explain.explanation)
    // O palpite abre a cena, e a cena responde de verdade.
    fireEvent.click(
      screen.getByRole('button', { name: modelo.prediction.choices[0]?.label as string }),
    )
    const distancia = await screen.findByRole('slider', { name: 'Distância do cacto' })
    fireEvent.change(distancia, { target: { value: '100' } })
    // ⚠️ Mudou de propósito (review do lote 2): sem a legenda "As áreas encostaram: batida!".
    // ⚠️ E no lote 5: em 100 as áreas não encostam, e a frase segue o estado novo.
    await waitFor(() =>
      expect(
        screen.getByText('O cacto está a 100 do Dino. As áreas pontilhadas ainda não se encostam.'),
      ).toBeTruthy(),
    )
  })
})

describe('as cinco cenas de desenho e a das vidas', () => {
  /**
   * O lote 4 da proposta. O Jogo do Meu Jeito não tinha UMA cena nativa: as cinco de desenho
   * são as seções de demonstração dele que hoje esperam vídeo. A das vidas é o dia 4 do
   * Desafio, onde ponto e vida mudam por motivos diferentes.
   */
  function montar(scene: SceneId) {
    const c = content(scene)
    render(
      <InteractiveLessonBlock
        block={{ id: 'b', blockRevision: 'r', kind: 'interactive', sortOrder: 0, content: c }}
        previewContent={c}
      />,
    )
  }

  /**
   * ⚠️⚠️ Mudaram de propósito (lote 5 do Raio-X, G4): o ateliê foi REDESENHADO com o desenho e os
   * nomes do Pinta (a nave 32 × 32, a Prévia, o fogo que cresce, os dois espelhos no meio da grade,
   * uma lupa para as duas pedras, a largura do recorte). Os cinco testes antigos exercitavam a troca
   * do Dino que andava, o passo do quadro 2, a coluna e a linha do eixo, a pedra escolhida e o pedaço
   * de uma folha de 64 × 64: controles que não existem mais.
   */
  /**
   * ⚠️⚠️ O relógio falso sai depois de cada teste (full review de 16/09/2026): sem o `afterEach`, o
   * `requestAnimationFrame` deste `describe` sobrevivia ao arquivo, e o arquivo seguinte o guardava como
   * "original" no carregamento (`lesson-scene-motor-3d`) e o "restaurava" para sempre.
   */
  const rafOriginal = window.requestAnimationFrame
  const cafOriginal = window.cancelAnimationFrame
  afterEach(() => {
    window.requestAnimationFrame = rafOriginal
    window.cancelAnimationFrame = cafOriginal
  })
  const relogio = () => {
    let fila: FrameRequestCallback[] = []
    window.requestAnimationFrame = (cb) => {
      fila.push(cb)
      return fila.length
    }
    window.cancelAnimationFrame = () => {}
    let agora = 0
    return async (quadros: number) => {
      for (let i = 0; i < quadros; i++) {
        agora += 1000 / 60
        const chamados = fila
        fila = []
        await act(async () => {
          for (const cb of chamados) cb(agora)
        })
      }
    }
  }
  const medidor = () => screen.getByRole('meter').getAttribute('aria-valuenow')

  test('⚠️⚠️ a prévia: a chave É o relógio (sem ▶ nem "Um passo"), e parar a rápida mostra um quadro', async () => {
    const tocar = relogio()
    montar('frames')
    fireEvent.click(await screen.findByRole('button', { name: 'Quadro 2' }))
    await waitFor(() => expect(medidor()).toBe('1'))
    // O ▶ e o passo eram um segundo interruptor para a mesma coisa, e mudos com a prévia parada.
    expect(screen.queryByRole('button', { name: 'Soltar o tempo' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Um passo' })).toBeNull()
    // Os dois quadros com MINIATURA na faixa: é "cada quadro guarda um desenho inteiro" à vista.
    expect(document.querySelectorAll('[data-miniatura]')).toHaveLength(2)
    expect(document.querySelector('[data-previa]')?.getAttribute('data-quadro')).toBe('2')
    fireEvent.click(screen.getByRole('button', { name: '8' }))
    const previa = screen.getByRole('button', { name: 'Prévia: parada' })
    expect(previa.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(previa)
    await tocar(60)
    await waitFor(() => expect(medidor()).toBe('2'))
    // Parar a prévia RÁPIDA é a meta que responde a previsão: fica um quadro só na tela.
    fireEvent.click(screen.getByRole('button', { name: 'Prévia: tocando' }))
    await waitFor(() => expect(medidor()).toBe('3'))
    const faixa = (await screen.findByText('prévia')).closest('dl')
    expect(faixa?.textContent).toContain('parada')
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Prévia: parada' }))
    await tocar(70)
    await waitFor(() => expect(medidor()).toBe('4'))
  })

  test('⚠️⚠️ o fantasma: o fogo 2 fecha no quadro 1, e o deslizante só conta quando a mão SOLTA', async () => {
    montar('onion-skin')
    const fogo = (await screen.findByRole('slider', {
      name: 'tamanho do fogo 2',
    })) as HTMLInputElement
    expect(fogo.getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByText('Vá para o quadro 2 para mudar o fogo dele.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Quadro 2' }))
    await waitFor(() => expect(fogo.getAttribute('aria-disabled')).toBeNull())
    // Sem o fantasma, nem régua nem número do fogo 1 no desenho.
    expect(document.querySelector('[data-pontas]')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Fantasma: desligado' }))
    await waitFor(() => expect(medidor()).toBe('1'))
    expect(document.querySelector('[data-fantasma]')).toBeTruthy()
    expect(document.querySelector('[data-pontas]')).toBeTruthy()
    // ⚠️ Arrastar de 40 até 0 passa pelo "um pouco maior" (20) SEM soltar: não é gesto terminado.
    // ⚠️ Mudou de propósito (full review de 16/09/2026): o dedo APERTA antes (`pointerdown`), como no
    // navegador; um `change` sem dedo nem tecla é o ajuste do leitor de tela e vai na hora.
    fireEvent.pointerDown(fogo)
    fireEvent.change(fogo, { target: { value: '20' } })
    fireEvent.change(fogo, { target: { value: '0' } })
    expect(medidor()).toBe('1')
    expect(screen.getByText('5 quadradinhos')).toBeTruthy()
    fireEvent.pointerUp(fogo)
    await waitFor(() => expect(fogo.value).toBe('0'))
    expect(medidor()).toBe('1')
    // A seta do teclado é um gesto inteiro: o valor vai ao soltar a tecla.
    fireEvent.keyDown(fogo, { key: 'ArrowRight' })
    fireEvent.change(fogo, { target: { value: '20' } })
    fireEvent.keyUp(fogo, { key: 'ArrowRight' })
    await waitFor(() => expect(medidor()).toBe('2'))
    const faixa = (await screen.findByText('fantasma')).closest('dl')
    expect(faixa?.textContent).toContain('um pouco')
    expect(screen.queryByRole('button', { name: 'Um passo' })).toBeNull()
  })

  test('⚠️⚠️ os espelhos do Pinta: DUAS chaves, a de cima e de baixo fechada até o lado a lado', async () => {
    // ⚠️ Mudou de propósito (consertos do review da onda B do lote 5): a escolha de três virou as duas
    // chaves independentes do Pinta, e a cópia COLADA no meio (a cabine) não conta como a outra asa.
    montar('symmetry')
    const cimaBaixo = await screen.findByRole('button', {
      name: 'Espelho de cima e de baixo: desligado',
    })
    expect(cimaBaixo.getAttribute('aria-disabled')).toBe('true')
    const motivo = document.getElementById(cimaBaixo.getAttribute('aria-describedby') ?? '')
    expect(motivo?.textContent).toBe('Abre depois que você pintar a asa com o Espelho lado a lado.')
    // O eixo móvel e a coluna do traço saíram: o Pinta reflete sempre no meio.
    expect(screen.queryByRole('slider', { name: 'linha do eixo' })).toBeNull()
    expect(screen.queryByRole('slider', { name: 'coluna do traço' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Pintar a asa' }))
    await waitFor(() => expect(medidor()).toBe('1'))
    expect(document.querySelectorAll('[data-casa]')).toHaveLength(10)
    expect(document.querySelector('[data-meio]')).toBeNull()
    const lado = screen.getByRole('button', { name: 'Espelho lado a lado: desligado' })
    expect(lado.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(lado)
    await screen.findByRole('button', { name: 'Espelho lado a lado: ligado' })
    // A cabine mora no meio: a cópia ENCOSTA no traço, e é o desenho da resposta errada da previsão.
    fireEvent.click(screen.getByRole('button', { name: 'Pintar a cabine' }))
    await waitFor(() => expect(document.querySelectorAll('[data-casa]')).toHaveLength(16))
    expect(medidor()).toBe('1')
    fireEvent.click(screen.getByRole('button', { name: 'Pintar a asa' }))
    await waitFor(() => expect(medidor()).toBe('2'))
    expect(document.querySelector('[data-meio]')?.getAttribute('data-meio')).toBe('x')
    // A cópia do último traço tem o destaque desenhado (sem animação).
    expect(document.querySelectorAll('[data-copia-nova]')).toHaveLength(10)
    await waitFor(() => expect(cimaBaixo.getAttribute('aria-disabled')).toBeNull())
    // Com as DUAS ligadas: três cópias da asa, e nenhuma meta (o de cima e de baixo pede ele só).
    fireEvent.click(cimaBaixo)
    await screen.findByRole('button', { name: 'Espelho de cima e de baixo: ligado' })
    fireEvent.click(screen.getByRole('button', { name: 'Pintar a asa' }))
    await waitFor(() => expect(document.querySelectorAll('[data-copia-nova]')).toHaveLength(30))
    expect(medidor()).toBe('2')
    fireEvent.click(screen.getByRole('button', { name: 'Espelho lado a lado: ligado' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pintar a ponta' }))
    await waitFor(() => expect(medidor()).toBe('3'))
    expect(document.querySelector('[data-meio]')?.getAttribute('data-meio')).toBe('y')
    fireEvent.click(screen.getByRole('button', { name: 'Apagar o papel' }))
    await waitFor(() => expect(document.querySelectorAll('[data-casa]')).toHaveLength(0))
  })

  test('⚠️⚠️ a lupa: UMA medida para as duas pedras, e a faixa não escreve o que a borda virou', async () => {
    montar('pixel-vector')
    const faixa = (await screen.findByText('aproximar')).closest('dl')
    expect(faixa?.textContent).toContain('1 vez')
    expect(faixa?.textContent).toContain('de longe')
    // A escolha "Qual pedra olhar" saiu: a comparação acontece na MESMA lupa.
    expect(screen.queryByRole('button', { name: 'Olhar a de vetor' })).toBeNull()
    const lupa = screen.getByRole('slider', { name: 'Aproximar' })
    // ⚠️ Mudou de propósito (consertos do review da onda B do lote 5, M5): "de perto" é a partir de 4.
    fireEvent.change(lupa, { target: { value: '3' } })
    await waitFor(() => expect(faixa?.textContent).toContain('3 vezes'))
    expect(faixa?.textContent).toContain('de longe')
    fireEvent.change(lupa, { target: { value: '4' } })
    await waitFor(() => expect(faixa?.textContent).toContain('4 vezes'))
    expect(faixa?.textContent).toContain('de perto')
    expect(faixa?.textContent).not.toMatch(/escadinha|degrau|lisa|igual/)
    expect(
      [...document.querySelectorAll('[data-pedra]')].map((p) => p.getAttribute('data-lupa')),
    ).toEqual(['4', '4'])
    expect(document.querySelector('[data-grade-da-pedra]')).toBeNull()
    expect(document.querySelector('svg desc')?.textContent ?? '').toContain('lisa')
    expect(document.querySelectorAll('[data-ponto]')).toHaveLength(0)
    fireEvent.change(lupa, { target: { value: '6' } })
    await waitFor(() => expect(document.querySelectorAll('[data-ponto]')).toHaveLength(4))
    fireEvent.change(lupa, { target: { value: '1' } })
    await waitFor(() => expect(medidor()).toBe('3'))
  })

  test('⚠️⚠️ a folha: a largura do recorte muda o jogo, a folha fica, e o tamanho no jogo espera a nave inteira', async () => {
    montar('sheet-vs-sprite')
    const faixa = (await screen.findByText('recorte')).closest('dl')
    // ⚠️ Mudou de propósito (consertos do review da onda B do lote 5, A4): o jogo abre VAZIO, sem
    // recorte e sem largura em destaque na bancada.
    expect(faixa?.textContent).toContain('nenhum')
    expect(faixa?.textContent).toContain('54 por 54')
    expect(document.querySelector('[data-jogo-vazio]')).toBeTruthy()
    expect(screen.getByRole('button', { name: '64' }).getAttribute('aria-current')).toBeNull()
    const tamanho = screen.getByRole('slider', { name: 'tamanho no jogo' })
    expect(tamanho.getAttribute('aria-disabled')).toBe('true')
    expect(
      screen.getByText('Abre depois que você achar o recorte que mostra uma nave inteira.'),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Quadro 2' }).getAttribute('aria-disabled')).toBe(
      'true',
    )
    const sprite = () => document.querySelector('[data-sprite-no-jogo]')
    expect(sprite()).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '16' }))
    await waitFor(() => expect(sprite()?.getAttribute('viewBox')).toBe('0 0 16 32'))
    fireEvent.click(screen.getByRole('button', { name: '32' }))
    await waitFor(() => expect(tamanho.getAttribute('aria-disabled')).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: 'Quadro 2' }))
    await waitFor(() => expect(sprite()?.getAttribute('viewBox')).toBe('32 0 32 32'))
    fireEvent.change(tamanho, { target: { value: '80' } })
    await waitFor(() => expect(faixa?.textContent).toContain('80 por 80'))
    // A folha e o recorte continuam os mesmos: é a cena inteira nestas linhas.
    expect(faixa?.textContent).toContain('32 por 32')
    expect(screen.getByText('folha 64 por 32')).toBeTruthy()
    expect(document.querySelector('[data-recorte]')?.getAttribute('data-recorte')).toBe('32')
    // `crop-half`, `crop-whole` e `size-apart` (a folha inteira, `squeezed`, não foi escolhida).
    expect(medidor()).toBe('3')
  })

  test('Preenchimento, Contorno e Sem cor; o sol e os três tons de azul', async () => {
    montar('fill-stroke')
    fireEvent.click(await screen.findByRole('button', { name: 'Contorno: com cor' }))
    const semCor = await screen.findByRole('button', { name: 'Contorno: Sem cor' })
    expect(semCor.getAttribute('aria-pressed')).toBe('false')
    expect(document.querySelector('[data-amostra="stroke"]')?.hasAttribute('data-acesa')).toBe(true)
    expect(document.querySelector('[data-xadrez]')).toBeTruthy()
    cleanup()
    montar('shading')
    expect(document.querySelectorAll('[data-tom="sombra"]')).toHaveLength(0)
    fireEvent.click(await screen.findByRole('button', { name: 'A sombra e a luz: desligadas' }))
    await waitFor(() =>
      expect(document.querySelectorAll('[data-tom="sombra"]').length).toBeGreaterThan(0),
    )
    expect(document.querySelectorAll('[data-tom="luz"]').length).toBeGreaterThan(0)
    const sol = screen.getByRole('button', { name: 'O sol: na esquerda' })
    // Um SELETOR: nenhum dos dois lados é "desligado".
    expect(sol.getAttribute('aria-pressed')).toBeNull()
    fireEvent.click(sol)
    await waitFor(() =>
      expect(document.querySelector('[data-sol]')?.getAttribute('data-sol')).toBe('right'),
    )
  })

  test('as vidas: os dois fios mudam contagens diferentes', async () => {
    montar('lives')
    const faixa = (await screen.findByText('vidas')).closest('dl')
    expect(faixa?.textContent).toContain('3')
    // Sem o fio, bater não custa nada.
    fireEvent.click(screen.getByRole('button', { name: 'Bater no cacto' }))
    await waitFor(() => expect(faixa?.textContent).toContain('3'))
    expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('0')
  })

  test('⚠️ cena sem relógio não mostra o passo, e a com relógio mostra, com o nome do core', async () => {
    // A lista de cenas com tempo era escrita à mão no player e já tinha deixado `stage-size`
    // com um passo que não fazia nada. Hoje quem decide é a régua de legalidade do core.
    montar('stage-size')
    expect(await screen.findByRole('button', { name: 'Ligue a borda' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Um passo' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Avançar 1 quadro' })).toBeNull()
    cleanup()
    // ⚠️ Mudou de propósito (lote 4 do Raio-X): onde o QUADRO é o assunto o botão diz "Avançar 1
    // quadro"; nas outras continua "Um passo". O nome vem do core (`sceneStepLabel`).
    montar('draw-loop')
    expect(await screen.findByRole('button', { name: 'Avançar 1 quadro' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Um passo' })).toBeNull()
    cleanup()
    montar('lives')
    expect(await screen.findByRole('button', { name: 'Um passo' })).toBeTruthy()
  })
})

describe('⚠️⚠️ a seção conta ao bloco o que ela já disse', () => {
  const bloco = (scene: SceneId): InteractiveBlock => ({
    kind: 'interactive',
    title: SCENE_MODELS[scene].title,
    instructions: SCENE_MODELS[scene].instruction,
    hints: [],
    required: false,
    activity: { type: 'experimentation', scene },
  })
  const montar = (scene: SceneId, secao: { titulo: string; temDialogo: boolean } | null) => {
    const c = bloco(scene)
    const cena = (
      <InteractiveLessonBlock
        block={{ id: 'b', blockRevision: 'r', kind: 'interactive', sortOrder: 0, content: c }}
        previewContent={c}
      />
    )
    render(secao ? <LessonSectionProvider value={secao}>{cena}</LessonSectionProvider> : cena)
    return c
  }

  test('⚠️ o título não aparece DUAS vezes quando a seção já disse o mesmo', async () => {
    // A Aula 1 do Corre Dino mostrava a mesma pergunta no cabeçalho da seção e no cartão da
    // cena, a 130px de distância.
    const c = montar('world', { titulo: SCENE_MODELS.world.title, temDialogo: false })
    const titulo = await screen.findByRole('heading', { name: c.title })
    expect(titulo.className).toContain('sr-only')
    cleanup()

    // ⚠️ E ele CONTINUA existindo: é o nome acessível da seção da cena.
    montar('world', { titulo: 'Outro assunto', temDialogo: false })
    const proprio = await screen.findByRole('heading', { name: c.title })
    expect(proprio.className).not.toContain('sr-only')
  })

  test('⚠️⚠️ com um balão de fala na seção, a cena não desenha um SEGUNDO Zappy', async () => {
    // A instrução continua inteira; o que sai é a repetição do mensageiro. Sem este teste o
    // ramo inteiro podia ser apagado com as três suítes verdes.
    const c = montar('world', { titulo: 'Outro assunto', temDialogo: true })
    expect(await screen.findByText(c.instructions)).toBeTruthy()
    expect(document.querySelectorAll('img[alt*="Zappy" i]')).toHaveLength(0)
    cleanup()

    // Sem diálogo na seção, o Zappy da cena é o único da tela e continua lá.
    montar('world', { titulo: 'Outro assunto', temDialogo: false })
    expect(await screen.findByText(c.instructions)).toBeTruthy()
  })

  test('⚠️ sem seção em volta, o bloco desenha como sempre', async () => {
    // O ensaio do admin e qualquer bloco solto não têm seção: o padrão não pode mudar.
    const c = montar('world', null)
    const titulo = await screen.findByRole('heading', { name: c.title })
    expect(titulo.className).not.toContain('sr-only')
  })
})

describe('⚠️ a cena não desenha caixa vazia', () => {
  const montar = (scene: SceneId) => {
    const c: InteractiveBlock = {
      kind: 'interactive',
      title: SCENE_MODELS[scene].title,
      instructions: SCENE_MODELS[scene].instruction,
      hints: [],
      required: false,
      activity: { type: 'experimentation', scene },
    }
    render(
      <InteractiveLessonBlock
        block={{ id: 'b', blockRevision: 'r', kind: 'interactive', sortOrder: 0, content: c }}
        previewContent={c}
      />,
    )
  }

  test('⚠️⚠️ cena sem salto, sem relógio e sem comparação não mostra a caixa dos botões', async () => {
    // O container dos botões da cena não perguntava se tinha filho. Em `world` nenhum deles
    // renderiza, e sobrava uma caixa com borda e padding e NADA dentro, entre a frase embaixo do
    // palco e a bancada — um elemento que a criança vê e não entende.
    montar('world')
    await screen.findByRole('meter')
    const vazias = [...document.querySelectorAll('div')].filter(
      (el) =>
        el.className.includes('rounded-2xl') &&
        el.className.includes('border-border') &&
        (el.textContent ?? '').trim() === '',
    )
    expect(vazias).toHaveLength(0)
    cleanup()

    // E a cena COM relógio continua mostrando a caixa: o guard não pode esconder o que existe.
    montar('draw-loop')
    expect(await screen.findByRole('button', { name: 'Avançar 1 quadro' })).toBeTruthy()
  })
})

describe('o elenco veste a cena INTEIRA, não só o texto do catálogo', () => {
  /**
   * ⚠️⚠️ Achado do full review: o elenco vestia o que o CORE gera (metas, pistas, faixa, frase,
   * sucesso) e deixava intacto tudo o que o PLAYER escreve à mão: o selo do palco, a descrição
   * do desenho, os nomes das peças da bancada e os rótulos dos controles. Numa turma de nave a
   * criança lia "distância do asteroide" na faixa e "Distância do cacto" no controle logo
   * abaixo, na mesma tela. Esta varredura é o que impede a volta disso.
   */
  const NAVE = {
    hero: { name: 'nave', gender: 'f' as const },
    obstacle: { name: 'asteroide', gender: 'm' as const },
    scenery: { name: 'nebulosa', gender: 'f' as const },
  }
  test('⚠️⚠️ nenhuma palavra do Corre Dino sobra na tela vestida de outro curso', () => {
    /**
     * ⚠️⚠️ **As 45, e não uma lista curada.** Ela era a lista das cenas "que o elenco existe
     * para reaproveitar", e o comentário dela já registrava o defeito da própria ideia: a
     * varredura ficou verde enquanto duas bancadas extraídas voltavam a escrever "cacto" e
     * "Dino" crus, porque os arquivos novos não estavam nela. Curar a lista é carregar uma
     * segunda lista de cenas para manter em dia — exatamente o que o lote 3 inteiro ataca —, e
     * o custo de varrer todas é 800ms. O full review achou mais uma assim: a `screen-reader`
     * descrevia o desenho como "Um dinossauro correndo diante de cactos", e "dinossauro" não é
     * termo do elenco (a régua casa "Dino"), então numa turma de nave a frase saía com meio
     * elenco trocado — justo na cena que ENSINA a descrever a tela para quem não a vê.
     *
     * ⚠️ O `<title>`/`<desc>` do SVG entrou junto pelo mesmo motivo: é o que o leitor de tela
     * anuncia NO LUGAR do desenho, e não aparece nem no texto visível nem nos `aria-label`.
     */
    const falhas: string[] = []
    for (const scene of SCENE_IDS) {
      const c: InteractiveBlock = {
        ...content(scene),
        title: 'Título do professor',
        instructions: 'Instrução do professor.',
        activity: { type: 'experimentation', scene, cast: NAVE },
      }
      render(
        <InteractiveLessonBlock
          block={{ id: 'b', blockRevision: 'r', kind: 'interactive', sortOrder: 0, content: c }}
          previewContent={c}
        />,
      )
      // O texto visível, os nomes acessíveis e o que o SVG conta a quem não enxerga.
      const visivel = document.body.textContent ?? ''
      const rotulos = [...document.querySelectorAll('[aria-label]')]
        .map((el) => el.getAttribute('aria-label') ?? '')
        .join(' | ')
      const desenho = [...document.querySelectorAll('title, desc')]
        .map((el) => el.textContent ?? '')
        .join(' | ')
      for (const alvo of [/Dino/i, /cactos?/i, /floresta/i])
        for (const [onde, texto] of [
          ['texto', visivel],
          ['rótulo', rotulos],
          ['desenho', desenho],
        ] as const)
          if (alvo.test(texto))
            falhas.push(
              `${scene}: ${onde} ainda fala do Corre Dino (${alvo}) — ${
                texto.match(new RegExp(`.{0,40}${alvo.source}.{0,40}`, 'i'))?.[0] ?? ''
              }`,
            )
      cleanup()
    }
    expect([...new Set(falhas)]).toEqual([])
  })

  test('⚠️ e a concordância sobrevive à troca, inclusive nos textos do player', async () => {
    // "A nave continua guardado" é o tipo de frase que a régua do elenco não conserta: ela só
    // flexiona o que está COLADO ao nome. Quem escreve texto no player precisa escrevê-lo de um
    // jeito que sobreviva à troca, e é isso que esta asserção cobra.
    const c: InteractiveBlock = {
      ...content('world'),
      activity: { type: 'experimentation', scene: 'world', cast: NAVE },
    }
    render(
      <InteractiveLessonBlock
        block={{ id: 'b', blockRevision: 'r', kind: 'interactive', sortOrder: 0, content: c }}
        previewContent={c}
      />,
    )
    // ⚠️ A cena `world` nasce VAZIA, e a frase mais arriscada do player ("o Dino continua…") só
    // existe DEPOIS de criar. Sem este clique a varredura lia uma tela onde ela nem está, e
    // aprovava a frase errada em silêncio (achado por mutação).
    fireEvent.click(await screen.findByRole('button', { name: 'Criar a nave' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Criar a nave' })).toBeNull())
    const texto = document.body.textContent ?? ''
    // ⚠️⚠️ A janela de até duas palavras no meio é o ponto desta varredura: a régua do elenco só
    // flexiona o que está COLADO ao nome, então o erro real do player é sempre com alguma coisa
    // entre os dois ("a nave continua guardado"). Uma regex de palavras adjacentes passa por ele
    // sem ver, e foi assim que a primeira versão deste teste aprovou a frase que ele existe para
    // pegar (provado por mutação).
    const meio = '(?: [a-zà-ú]+){0,2}'
    for (const errado of [
      new RegExp(`\\bnaves?${meio} (criado|guardado|desenhado|ligado|novo|antigo)\\b`, 'i'),
      /\b(o|um|este|esse|aquele|mesmo|novo|antigo) naves?\b/i,
      new RegExp(`\\basteroides?${meio} (criada|guardada|desenhada|ligada|nova|antiga)\\b`, 'i'),
    ])
      if (errado.test(texto)) throw new Error(`concordância errada na tela: ${errado}`)
  })

  /**
   * O estado de uma cena CONCLUÍDA, pronto para voltar como checkpoint: todas as metas do modelo
   * descobertas. ⚠️ `world.front` e `sound.onJump` ligados porque `layers` e `jump-sound` exigem a
   * montagem ASSENTADA para passar (`settled`, no core); nas outras 43 os dois campos não pesam.
   */
  function concluida(scene: SceneId) {
    const base = openScene({ scene })
    const estado: SceneState = {
      ...base,
      world: { ...base.world, front: true },
      sound: { ...base.sound, onJump: true },
      animation: { ...base.animation, sameFrames: true },
      mirror: { ...base.mirror, filled: true },
      evidence: { ...base.evidence, actions: 1, discoveries: [...sceneGoalIds(scene)] },
    }
    return {
      sceneSequence: 1,
      sceneSessionId: 'sessao',
      sceneSegmentId: 'segmento',
      sceneCheckpoint: packExperiment(scene, { state: estado, past: [], trials: [] }),
    }
  }

  test('⚠️⚠️ e o CARTÃO de sucesso, que só existe depois de concluir, também é vestido', async () => {
    /**
     * Achado do relatório g7 (lote 1 do Raio-X, 16/09/2026). A varredura acima olha o estado de
     * ABERTURA, onde o cartão de sucesso não existe, e foi por isso que ela ficou verde enquanto o
     * efeito da conclusão trocava a frase vestida pela CRUA do catálogo: numa turma de nave a
     * pergunta, a faixa e a explicação falavam da nave e o cartão dizia "É o mesmo Dino". Aqui a
     * cena abre JÁ concluída (o checkpoint volta com as metas feitas), que é o caminho ao vivo E o
     * do F5: nos dois é o efeito da conclusão que escreve o cartão.
     */
    const falhas: string[] = []
    for (const scene of SCENE_IDS) {
      const c: InteractiveBlock = {
        ...content(scene),
        title: 'Título do professor',
        instructions: 'Instrução do professor.',
        activity: { type: 'experimentation', scene, cast: NAVE },
      }
      const ensaio: LessonPreviewContextValue = {
        answers: { b: concluida(scene) },
        hintsUsed: {},
        results: {},
        workspaces: {},
        onWorkspaceChange: () => {},
        onProjectCheck: async () => '',
        onChange: () => {},
        onAttempt: async () => ({
          participated: true,
          passed: true,
          feedback: 'Feito.',
          verifiedBy: 'client',
          evidence: 'exploration',
        }),
        onQuiz: async () => {},
      }
      render(
        <LessonPreviewProvider value={ensaio}>
          <InteractiveLessonBlock
            block={{ id: 'b', blockRevision: 'r', kind: 'interactive', sortOrder: 0, content: c }}
            previewContent={c}
          />
        </LessonPreviewProvider>,
      )
      // O cartão existe: sem isto a varredura leria uma tela sem ele e aprovaria em silêncio.
      const metas = [...sceneTargets({ type: 'experimentation', scene, cast: NAVE })]
        .sort()
        .join('+')
      const modelo = sceneModel(scene)
      const sucesso = castText(modelo.successNoCaso?.[metas] ?? modelo.success, NAVE)
      const cartao = await screen.findByText(sucesso)
      const texto = cartao.parentElement?.textContent ?? ''
      for (const alvo of [/Dino/i, /cactos?/i, /floresta/i])
        if (alvo.test(texto))
          falhas.push(`${scene}: o cartão de sucesso fala do Corre Dino — ${texto}`)
      cleanup()
    }
    expect(falhas).toEqual([])
    // ⚠️ Prazo PRÓPRIO: a varredura monta a cena INTEIRA (palco, faixa e bancada) das 45, e desde o
    // console de 18/09/2026 a bancada também é montada no momento do palpite. É tempo, não regra.
  }, 30_000)

  test('⚠️ depois do F5 o cartão continua vestido', async () => {
    // O F5 tem dois caminhos para a frase: o latch que NASCE do progresso salvo e o efeito da
    // conclusão que roda de novo quando o checkpoint volta. Os dois precisam dizer a MESMA frase.
    const c: InteractiveBlock = {
      ...content('world'),
      activity: { type: 'experimentation', scene: 'world', cast: NAVE },
    }
    const fetchFalso = (async () => Response.json({})) as unknown as typeof fetch
    globalThis.fetch = fetchFalso
    render(
      <LessonPlayerProvider
        value={{
          lessonId: 'lesson',
          courseSlug: 'course',
          viewerId: 'child-f5',
          viewerWatermark: null,
          initialPositionSeconds: null,
          learningProgress: {
            sectionId: null,
            blocks: [
              {
                blockId: 'b',
                revision: 'r',
                positionSeconds: null,
                answers: concluida('world'),
                hintsUsed: 0,
                attemptsCount: 1,
                result: {
                  participated: true,
                  passed: true,
                  feedback: 'Feito.',
                  verifiedBy: 'client',
                  evidence: 'exploration',
                },
                updatedAt: new Date().toISOString(),
              },
            ],
          },
        }}
      >
        <InteractiveLessonBlock
          block={{ id: 'b', blockRevision: 'r', kind: 'interactive', sortOrder: 0, content: c }}
        />
      </LessonPlayerProvider>,
    )
    const vestida = castText(SCENE_MODELS.world.success, NAVE)
    expect(vestida).not.toMatch(/Dino/)
    expect(await screen.findByText(vestida)).toBeTruthy()
    expect(screen.queryByText(SCENE_MODELS.world.success)).toBeNull()
  })
})

describe('o vocabulário da bancada', () => {
  /**
   * A ESCOLHA existe separada da CHAVE por uma razão de acessibilidade, e ela precisa de rede
   * própria: a migração de cinco grupos (quadro 1/2 nas duas cenas de animação, pixel×vetor, o
   * pedaço da folha, o modo da batida e os estados do motor) não quebrou teste nenhum — ou seja,
   * ninguém estava olhando.
   */
  test('⚠️⚠️ escolha de dois valores NÃO usa `aria-pressed`', async () => {
    // ⚠️ Mudou de propósito (lote 5 do Raio-X, G4): a escolha "pixel × vetor" saiu (uma lupa para as
    // duas pedras). O mesmo contrato, na escolha do quadro da `onion-skin`.
    render(
      <InteractiveLessonBlock block={block('onion-skin')} previewContent={content('onion-skin')} />,
    )
    const pixel = await screen.findByRole('button', { name: 'Quadro 1' })
    const vetor = screen.getByRole('button', { name: 'Quadro 2' })
    // Nenhum dos dois valores é "desligado": o leitor de tela anunciava "não pressionado" para a
    // alternativa que a criança não escolheu, como se ela estivesse apagada.
    expect(pixel.getAttribute('aria-pressed')).toBeNull()
    expect(vetor.getAttribute('aria-pressed')).toBeNull()
    // Quem vale diz que vale, e só um de cada vez.
    expect(pixel.getAttribute('aria-current')).toBe('true')
    expect(vetor.getAttribute('aria-current')).toBeNull()

    fireEvent.click(vetor)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Quadro 2' }).getAttribute('aria-current')).toBe(
        'true',
      ),
    )
    expect(screen.getByRole('button', { name: 'Quadro 1' }).getAttribute('aria-current')).toBeNull()
  })

  test('⚠️⚠️ todo deslizante tem os dois botões de passo, e eles dizem o salto', async () => {
    // A régua da casa é que toque, teclado e leitor de tela levem ao MESMO lugar. As quatorze
    // bancadas que moravam dentro do player escreviam o deslizante à mão e não tinham nenhum.
    render(
      <InteractiveLessonBlock
        block={block('pixel-vector')}
        previewContent={content('pixel-vector')}
      />,
    )
    // ⚠️ Mudou de propósito (lote 5, G4): a lupa se chama "Aproximar", como na proposta do g4.
    expect(await screen.findByRole('button', { name: 'Aumentar Aproximar' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Diminuir Aproximar' })).toBeTruthy()
    // O salto só entra no nome quando ele é MAIOR que o passo do deslizante ("aumentar a lupa
    // em 1" seria ruído); na cena do endereço, onde o botão pula 20, ele entra.
    cleanup()
    render(
      <InteractiveLessonBlock
        block={block('coordinates')}
        previewContent={content('coordinates')}
      />,
    )
    expect(await screen.findByRole('button', { name: 'Aumentar x em 20' })).toBeTruthy()
  })

  test('⚠️ fechado NÃO é escondido: o controle trancado fica na tela com o motivo', async () => {
    // Uma variável por vez é régua de várias cenas. Sumir com o controle faria a criança
    // procurar o que ela ainda não pode mexer.
    render(<InteractiveLessonBlock block={block('hitbox')} previewContent={content('hitbox')} />)
    const largura = await screen.findByRole('slider', { name: /área do Dino/i })
    expect(largura.getAttribute('aria-disabled')).toBe('true')
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): o motivo diz o gesto do pedido da meta `contact`.
    expect(screen.getByText(/Abre depois que você aproximar o cacto/)).toBeTruthy()
  })
})

describe('⚠️⚠️ a peça que muda de caixa: TOCAR seleciona', () => {
  /**
   * Relatório g3 (lote 1 do Raio-X, 16/09/2026), em `score` (Aula 11) e `game-state` (Aula 7):
   * a ajuda diz "toque nela e depois em Colocar aqui", mas o `pointerup` de um toque caía dentro
   * das caixas e SOLTAVA a peça no próprio lugar, desmarcando-a. "Colocar aqui" continuava
   * desligado e só arrastando (ou pelo teclado) dava para mover.
   *
   * ⚠️⚠️ As caixas têm TAMANHO neste teste. O happy-dom mede tudo como 0 × 0, e um toque fora de
   * uma caixa de tamanho zero nunca cai "dentro" dela: o teste passaria com o defeito de pé.
   */
  const medirOriginal = HTMLElement.prototype.getBoundingClientRect
  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = medirOriginal
  })
  const caixasDeVerdade = () => {
    HTMLElement.prototype.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 600, bottom: 200, width: 600, height: 200, x: 0, y: 0 }) as DOMRect
  }
  // ⚠️ Mudou de propósito (lote 5 do Raio-X): a `game-state` saiu daqui. A peça dela é Criar cacto,
  // DENTRO do relógio, na peça que muda de caixa da bancada do Corre Dino (conferida mais abaixo).
  // ⚠️ Mudou de propósito (consertos do review da onda A do lote 5): a `score` passou para a PEÇA QUE
  // MUDA DE CAIXA. O símbolo fica fora do nome ("Somar ponto"), e o "Colocar aqui" funciona SEMPRE
  // (era `disabled` nativo até escolher a peça, fora do Tab e sem motivo); o toque o põe em destaque.
  const PECAS = [['score', 'Somar ponto']] as const

  for (const [scene, peca] of PECAS)
    test(`${scene}: um toque sem arrasto marca a peça e liga o "Colocar aqui"`, async () => {
      caixasDeVerdade()
      render(<InteractiveLessonBlock block={block(scene)} previewContent={content(scene)} />)
      const colocar = () =>
        screen.getByRole('button', {
          name: 'Colocar aqui : Somar ponto em A cada quadro, dentro do bloco “o estado do jogo é jogando ?”',
        })
      const botao = await screen.findByRole('button', { name: peca })
      expect(colocar()).toHaveProperty('disabled', false)
      expect(colocar().getAttribute('aria-disabled')).toBeNull()
      // O toque: encosta e solta quase no MESMO lugar (o dedo treme), dentro da caixa de origem.
      fireEvent.pointerDown(botao, { pointerId: 7, button: 0, clientX: 100, clientY: 50 })
      fireEvent.pointerUp(botao, { pointerId: 7, button: 0, clientX: 103, clientY: 52 })
      await waitFor(() =>
        expect(screen.getByRole('button', { name: peca }).getAttribute('aria-pressed')).toBe(
          'true',
        ),
      )
      // E o segundo toque, em "Colocar aqui", leva a peça para a outra caixa.
      fireEvent.click(colocar())
      await waitFor(() =>
        expect(screen.getByRole('button', { name: peca }).parentElement?.dataset.caixa).toBe(
          'quadro-se',
        ),
      )
    })

  test('⚠️ layers: a ordem de desenhar é uma PILHA; tocar numa peça não troca, e Descer troca', async () => {
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): os cartões Antes/Depois lado a lado viraram a pilha
    // numerada do Estúdio (1º em cima), com Descer e Subir em cada peça e sem a seleção invisível.
    caixasDeVerdade()
    render(<InteractiveLessonBlock block={block('layers')} previewContent={content('layers')} />)
    const lista = await screen.findByRole('list', { name: 'A ordem de desenhar' })
    const itens = [...lista.querySelectorAll('li')]
    expect(itens.map((i) => i.textContent)).toEqual([
      expect.stringContaining('Dino'),
      expect.stringContaining('Floresta'),
    ])
    // Um toque sem arrasto na peça de baixo: nada troca e nenhuma meta cai.
    fireEvent.pointerDown(itens[1] as HTMLElement, {
      pointerId: 9,
      button: 0,
      clientX: 300,
      clientY: 150,
    })
    fireEvent.pointerUp(itens[1] as HTMLElement, {
      pointerId: 9,
      button: 0,
      clientX: 301,
      clientY: 150,
    })
    expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('0')
    fireEvent.click(screen.getByRole('button', { name: 'Descer Dino para o 2º lugar' }))
    await waitFor(() => expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('1'))
    expect(screen.getByRole('button', { name: 'Subir Dino para o 1º lugar' })).toBeTruthy()
  })

  test('o arrasto de verdade continua soltando a peça onde o dedo parou', async () => {
    // ⚠️ Mudou de propósito (consertos do review da onda A do lote 5): na peça que muda de caixa as
    // duas caixas precisam de lugares DIFERENTES (a de destino à direita).
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      return (
        this.dataset?.caixa === 'quadro-se'
          ? { left: 300, top: 0, right: 600, bottom: 200, width: 300, height: 200, x: 300, y: 0 }
          : { left: 0, top: 0, right: 290, bottom: 200, width: 290, height: 200, x: 0, y: 0 }
      ) as DOMRect
    }
    render(<InteractiveLessonBlock block={block('score')} previewContent={content('score')} />)
    const botao = await screen.findByRole('button', { name: 'Somar ponto' })
    fireEvent.pointerDown(botao, { pointerId: 8, button: 0, clientX: 100, clientY: 50 })
    fireEvent.pointerMove(botao, { pointerId: 8, button: 0, clientX: 450, clientY: 60 })
    fireEvent.pointerUp(botao, { pointerId: 8, button: 0, clientX: 450, clientY: 60 })
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Somar ponto' }).parentElement?.textContent,
      ).toContain('A cada quadro, dentro do bloco'),
    )
  })
})

describe('⚠️⚠️ toda porta da cena tem controle na BANCADA', () => {
  /**
   * Relatório g5 (lote 1 do Raio-X, 16/09/2026): `group-loop`, `camera`, `aim` e `diagonal`
   * declaravam uma porta no motor e a instrução mandava ligá-la, mas nenhuma bancada desenhava o
   * controle. As metas travavam em 1 de 2 para sempre, e os testes do core passavam porque chamam
   * `connect` direto — um caminho que a criança não tem.
   *
   * O contrato, varrido nas 45 cenas a partir de `scenePorts` (nunca de uma lista escrita aqui):
   * 1. na ABERTURA, operando cada botão da bancada, a porta é ligada; ou
   * 2. o controle que a liga depois das descobertas JÁ ESTAVA na abertura, fechado e dizendo o
   *    motivo ao leitor de tela (`aria-describedby`). Fechado não é escondido.
   *
   * ⚠️ "Depois das descobertas" é o roteiro do próprio modelo SEM os `connect` (o roteiro
   * ligando a porta esconderia um controle que não existe) e com todas as metas marcadas.
   */
  function operar(scene: SceneId, state: SceneState) {
    const acoes: SceneAction[] = []
    const dispatch = (a: SceneAction) => {
      acoes.push(a)
    }
    const { container, unmount } = render(
      <>
        <LessonSceneControls
          scene={scene}
          state={state}
          dispatch={dispatch}
          goals={sceneGoals(scene, state)}
          onRunning={() => {}}
        />
        <ExplorationPieces
          activity={{ type: 'experimentation', scene }}
          state={state}
          dispatch={dispatch}
          more={false}
        />
      </>,
    )
    const nome = (b: HTMLButtonElement) =>
      (b.getAttribute('aria-label') ?? b.textContent ?? '').trim()
    const motivo = (b: HTMLButtonElement) =>
      (b.getAttribute('aria-describedby') ?? '')
        .split(' ')
        .map((id) => (id ? (document.getElementById(id)?.textContent ?? '') : ''))
        .join(' ')
        .trim()
    // O que chega FECHADO, antes de qualquer toque, e o motivo que o botão anuncia.
    // ⚠️ Fechado é `aria-disabled` (review do lote 1): um `disabled` nativo tiraria o controle do
    // Tab, e o motivo nunca seria ouvido por quem navega por teclado.
    const fechado = (b: HTMLButtonElement) => b.getAttribute('aria-disabled') === 'true'
    const fechados = new Map<string, string>()
    const foraDoTab = new Set<string>()
    for (const b of container.querySelectorAll('button')) {
      if (fechado(b)) fechados.set(nome(b), motivo(b))
      if (b.disabled) foraDoTab.add(nome(b))
    }
    // Cada botão aberto, na ordem da tela, relido a cada volta: marcar uma peça ou a origem de um
    // fio é o que abre o destino logo depois.
    const portas = new Map<ScenePort, string>()
    for (let i = 0; ; i++) {
      const b = container.querySelectorAll('button')[i]
      if (!b) break
      if (b.disabled || fechado(b)) continue
      const antes = acoes.length
      fireEvent.click(b)
      for (const a of acoes.slice(antes)) {
        if (a.type === 'connect' && !portas.has(a.port)) portas.set(a.port, nome(b))
        if (scene === 'score' && a.type === 'score-place' && a.guarded)
          portas.set('condition', nome(b))
      }
    }
    unmount()
    return { fechados, foraDoTab, portas }
  }

  function depoisDasDescobertas(scene: SceneId): SceneState {
    const start = { scene }
    let estado = openScene(start)
    for (const acao of scenePaths[scene])
      if (acao.type !== 'connect') estado = stepScene(start, estado, acao)
    return {
      ...estado,
      evidence: { ...estado.evidence, discoveries: [...sceneGoalIds(scene)] },
    }
  }

  test('⚠️⚠️ nas 45 cenas, nenhuma porta fica sem controle', () => {
    const falhas: string[] = []
    let portasVarridas = 0
    let abertasNaChegada = 0
    let fechadasComMotivo = 0
    for (const scene of SCENE_IDS) {
      const portas = scenePorts(scene)
      if (!portas.length) continue
      const chegada = operar(scene, openScene({ scene }))
      const depois = operar(scene, depoisDasDescobertas(scene))
      for (const port of portas) {
        portasVarridas++
        if (chegada.portas.has(port)) {
          abertasNaChegada++
          continue
        }
        const quem = depois.portas.get(port)
        if (!quem) {
          falhas.push(`${scene}: nenhum controle da bancada liga a porta "${port}"`)
          continue
        }
        const porque = chegada.fechados.get(quem)
        if (chegada.foraDoTab.has(quem))
          falhas.push(`${scene}: o controle da porta "${port}" (${quem}) fecha FORA do Tab`)
        else if (porque === undefined)
          falhas.push(`${scene}: o controle da porta "${port}" (${quem}) só APARECE depois`)
        else if (!porque)
          falhas.push(`${scene}: o controle da porta "${port}" (${quem}) fecha sem dizer por quê`)
        else fechadasComMotivo++
      }
    }
    expect(falhas).toEqual([])
    // Anti-vácuo: a varredura mediu portas de verdade, e passou pelos DOIS caminhos do contrato.
    expect(portasVarridas).toBeGreaterThanOrEqual(17)
    expect(abertasNaChegada).toBeGreaterThan(0)
    expect(fechadasComMotivo).toBeGreaterThan(0)
  })

  test('⚠️ a chave diz o ESTADO e o elenco, e a fechada diz o motivo', async () => {
    const NAVE = { hero: { name: 'nave', gender: 'f' as const } }
    const c: InteractiveBlock = {
      ...content('camera'),
      activity: { type: 'experimentation', scene: 'camera', cast: NAVE },
    }
    render(
      <InteractiveLessonBlock
        block={{ id: 'b', blockRevision: 'r', kind: 'interactive', sortOrder: 0, content: c }}
        previewContent={c}
      />,
    )
    const chave = await screen.findByRole('button', { name: 'A câmera segue a nave: desligada' })
    expect(chave.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(chave)
    const ligada = await screen.findByRole('button', { name: 'A câmera segue a nave: ligada' })
    expect(ligada.getAttribute('aria-pressed')).toBe('true')
    cleanup()

    render(
      <InteractiveLessonBlock block={block('diagonal')} previewContent={content('diagonal')} />,
    )
    const correcao = await screen.findByRole('button', {
      name: 'A correção da diagonal: desligada',
    })
    expect(correcao.getAttribute('aria-disabled')).toBe('true')
    // No Tab, e sem responder: tocar na chave fechada não liga a correção.
    expect((correcao as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(correcao)
    expect(
      screen
        .getByRole('button', { name: 'A correção da diagonal: desligada' })
        .getAttribute('aria-pressed'),
    ).toBe('false')
    const nota = document.getElementById(correcao.getAttribute('aria-describedby') ?? '')
    expect(nota?.textContent).toMatch(/^Abre depois/)
  })
})

describe('⭐⭐ lote 5 do Raio-X: a PEÇA QUE MUDA DE CAIXA no lugar do fio', () => {
  /**
   * Decisão da dona: em `jump-sound`, `spawn`, `game-state` e `controls` a bancada troca o FIO pela
   * peça que muda de caixa, o gesto do Estúdio ("mova Tocar efeito para dentro de Quando o dino
   * pular"). À vista desde a abertura, e por toque, arrasto e teclado.
   */
  const medirOriginal = HTMLElement.prototype.getBoundingClientRect
  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = medirOriginal
  })
  const CASOS = [
    [
      'jump-sound',
      '♪ Tocar efeito',
      'Quando o Dino pular',
      'pulo',
      { type: 'connect', port: 'sound', enabled: true },
    ],
    [
      'spawn',
      'Criar cacto',
      '◷ No relógio, a cada 1 s',
      'relogio',
      { type: 'connect', port: 'timer', enabled: true },
    ],
    [
      'game-state',
      'Criar cacto',
      'Se o estado do jogo é jogando',
      'se',
      { type: 'connect', port: 'condition', enabled: true },
    ],
    [
      'controls',
      '▷ Começar',
      'Quando apertar qualquer tecla ou tocar na tela',
      'toque',
      { type: 'connect', port: 'touch', enabled: true },
    ],
  ] as const
  const bancada = (scene: SceneId, acoes: SceneAction[]) =>
    render(
      <ExplorationPieces
        activity={{ type: 'experimentation', scene }}
        state={openScene({ scene })}
        dispatch={(a) => acoes.push(a)}
        more={false}
      />,
    )

  /**
   * ⚠️ Mudou de propósito (consertos do review da onda A do lote 5): o símbolo do começo ("♪", "◷", "▷")
   * fica FORA do nome acessível, e o botão da caixa começa pelo que está escrito nele ("Colocar aqui:
   * Tocar som em Quando o Dino pular"), para quem usa controle por voz.
   */
  const semSimbolo = (t: string) => t.replace(/^[^\p{L}\p{N}\s]+\s+/u, '')
  for (const [scene, pecaComSimbolo, destinoComSimbolo, caixa, acao] of CASOS) {
    const peca = semSimbolo(pecaComSimbolo)
    const destino = semSimbolo(destinoComSimbolo)
    test(`${scene}: a peça está à vista e ABERTA desde a abertura, e "Colocar aqui" leva pelo teclado`, () => {
      const acoes: SceneAction[] = []
      bancada(scene, acoes)
      const botao = screen.getByRole('button', { name: peca })
      expect(botao.getAttribute('aria-disabled')).toBeNull()
      // O fio saiu: nenhuma ponta ◉/◎ nesta bancada.
      expect(screen.queryByRole('button', { name: /^◉|^◎/ })).toBeNull()
      // O happy-dom junta o texto do `span` com um espaço antes dos dois-pontos.
      const colocar = (nome: string) =>
        nome.replace(/\s+:/, ':') === `Colocar aqui: ${peca} em ${destino}`
      fireEvent.click(screen.getByRole('button', { name: colocar }))
      expect(acoes).toEqual([acao as SceneAction])
    })

    test(`${scene}: um toque ESCOLHE a peça, e o arrasto até a caixa a move`, () => {
      const acoes: SceneAction[] = []
      // ⚠️ As caixas têm TAMANHO (o happy-dom mede tudo 0 × 0). A de destino é a metade de baixo à
      // direita, e mora DENTRO da outra no relógio aninhado da `game-state`.
      HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
        const alvo = this.dataset?.caixa === caixa
        return (
          alvo
            ? {
                left: 300,
                top: 100,
                right: 580,
                bottom: 190,
                width: 280,
                height: 90,
                x: 300,
                y: 100,
              }
            : { left: 0, top: 0, right: 290, bottom: 200, width: 290, height: 200, x: 0, y: 0 }
        ) as DOMRect
      }
      bancada(scene, acoes)
      const botao = screen.getByRole('button', { name: peca })
      fireEvent.pointerDown(botao, { pointerId: 4, button: 0, clientX: 100, clientY: 50 })
      fireEvent.pointerUp(botao, { pointerId: 4, button: 0, clientX: 102, clientY: 51 })
      expect(screen.getByRole('button', { name: peca }).getAttribute('aria-pressed')).toBe('true')
      expect(acoes).toEqual([])
      const denovo = screen.getByRole('button', { name: peca })
      fireEvent.pointerDown(denovo, { pointerId: 5, button: 0, clientX: 100, clientY: 50 })
      fireEvent.pointerMove(denovo, { pointerId: 5, button: 0, clientX: 400, clientY: 150 })
      fireEvent.pointerUp(denovo, { pointerId: 5, button: 0, clientX: 400, clientY: 150 })
      expect(acoes).toEqual([acao as SceneAction])
    })
  }

  /**
   * ⚠️⚠️ Consertos do review da onda A do lote 5 (T1, ALTO): arrastar com o MOUSE devolvia a peça. Depois
   * do `pointerup` que move, o navegador dispara um `click` no nó que recebeu o ponteiro, e o React tinha
   * reaproveitado aquele nó para o "Colocar aqui" da caixa de ORIGEM: o clique movia a peça de volta. O
   * happy-dom não dispara esse `click` sozinho, então o teste o dispara como o navegador, no MESMO nó, e
   * a bancada tem ESTADO de verdade (a peça muda de caixa entre o `pointerup` e o `click`).
   */
  test('⚠️⚠️ arrastar com o MOUSE: o clique que o navegador dispara depois não devolve a peça', async () => {
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      const alvo = this.dataset?.caixa === 'pulo'
      return (
        alvo
          ? { left: 300, top: 100, right: 580, bottom: 190, width: 280, height: 90, x: 300, y: 100 }
          : { left: 0, top: 0, right: 290, bottom: 200, width: 290, height: 200, x: 0, y: 0 }
      ) as DOMRect
    }
    const movidas: string[] = []
    function Bancada() {
      const [atual, setAtual] = useState<'tecla' | 'pulo'>('tecla')
      return (
        <PecaQueMudaDeCaixa
          legenda="Onde está Tocar som"
          peca="♪ Tocar som"
          caixas={[
            { id: 'tecla', titulo: 'Quando apertar Espaço' },
            { id: 'pulo', titulo: 'Quando o Dino pular' },
          ]}
          atual={atual}
          onMover={(caixa) => {
            movidas.push(caixa)
            setAtual(caixa)
          }}
        />
      )
    }
    render(<Bancada />)
    const no = screen.getByRole('button', { name: 'Tocar som' })
    const mouse = { pointerId: 1, pointerType: 'mouse', button: 0 }
    fireEvent.pointerDown(no, { ...mouse, clientX: 100, clientY: 50 })
    fireEvent.pointerMove(no, { ...mouse, clientX: 400, clientY: 150 })
    fireEvent.pointerUp(no, { ...mouse, clientX: 400, clientY: 150 })
    // O navegador: o clique do mouse no MESMO nó do ponteiro, logo depois do `pointerup`.
    fireEvent.click(no, { detail: 1, clientX: 400, clientY: 150 })
    expect(movidas).toEqual(['pulo'])
    const pulo = document.querySelector('[data-caixa="pulo"]') as HTMLElement
    expect(pulo.querySelector('button')?.textContent).toContain('Tocar som')
    // E o foco acompanha a peça na caixa nova.
    expect(document.activeElement?.textContent).toContain('Tocar som')
    // Um clique DEPOIS (na tarefa seguinte, sem arrasto) volta a valer: o "Colocar aqui" da origem.
    await act(() => new Promise((r) => setTimeout(r, 0)))
    const tecla = document.querySelector('[data-caixa="tecla"]') as HTMLElement
    fireEvent.click(tecla.querySelector('button') as HTMLElement, { detail: 1 })
    expect(movidas).toEqual(['pulo', 'tecla'])
  })
})

describe('⚠️⚠️ o palco não mente', () => {
  const avancar = (scene: SceneId, acoes: SceneAction[]) => {
    const start = { scene }
    return acoes.reduce((estado, acao) => stepScene(start, estado, acao), openScene(start))
  }
  // ⚠️ Mudou de propósito (lote 4 do Raio-X): UM quadro do `draw-loop` é 0,25 s. Um `advance` de 0,2 s
  // não fecha quadro nenhum, e "a cada quadro, um lugar diferente" só vale passo a passo de quadro.
  const passo: SceneAction = { type: 'advance', seconds: 1 / 4 }
  const palco = (scene: SceneId, state: SceneState) =>
    render(
      <ExplorationStage
        activity={{ type: 'experimentation', scene }}
        state={state}
        dispatch={() => {}}
      />,
    )
  /**
   * Onde o Dino do `draw-loop` está desenhado (o `translate` do grupo dele), ou nada.
   * ⚠️ Pelo `data-figure`, o contrato das figuras (full review de 16/09/2026): o seletor pelo TRAÇO
   * (`path[d^="M-22 -8"]`) quebrava no primeiro retoque do desenho do Dino, sem ser defeito nenhum.
   */
  const DINO = '[data-figure="dino"]'
  const xDosDinos = () =>
    [...document.querySelectorAll(DINO)].map((g) =>
      Number(/translate\(([-\d.]+)/.exec(g.getAttribute('transform') ?? '')?.[1]),
    )

  test('⚠️⚠️ draw-loop: com as duas chaves, o Dino NUNCA para de andar', () => {
    // Era `Math.min(frames, 7)`: sete casas e parado para sempre, com a frase dizendo "Isso é o
    // movimento". Com o ▶ isso acontecia em menos de meio segundo.
    const ligar: SceneAction[] = [
      { type: 'loop', on: true },
      { type: 'erase', on: true },
    ]
    const lugares: number[] = []
    for (let quadros = 1; quadros <= 24; quadros++) {
      palco('draw-loop', avancar('draw-loop', [...ligar, ...Array(quadros).fill(passo)]))
      const xs = xDosDinos()
      expect(xs).toHaveLength(1)
      lugares.push(xs[0] as number)
      cleanup()
    }
    // Cada quadro, um lugar diferente do anterior: parar é o defeito.
    for (let i = 1; i < lugares.length; i++) expect(lugares[i]).not.toBe(lugares[i - 1])
    // E ele não sai da tela (480 de largura desde o lote 5, a do Corre Dino): ao passar da borda,
    // volta ao começo.
    for (const x of lugares) expect(x).toBeLessThanOrEqual(460)
    expect(Math.min(...lugares.slice(12))).toBeLessThan(Math.max(...lugares.slice(0, 12)))
  })

  test('⚠️⚠️ draw-loop: limpar SEM desenhar deixa a tela VAZIA', () => {
    // A pergunta do próprio modelo é "E se limpar sem desenhar? O que sobra na tela?", e o palco
    // desenhava o Dino inteiro nesse estado.
    palco('draw-loop', avancar('draw-loop', [{ type: 'erase', on: true }]))
    // Antes de o relógio andar ninguém limpou nada: o Dino da abertura continua lá.
    expect(xDosDinos()).toHaveLength(1)
    cleanup()
    const vazia = avancar('draw-loop', [{ type: 'erase', on: true }, passo])
    palco('draw-loop', vazia)
    expect(xDosDinos()).toHaveLength(0)
    // E o palco diz o mesmo número que a faixa.
    expect(sceneReadout('draw-loop', vazia).find((r) => r.label === 'Dinos na tela')?.value).toBe(
      '0',
    )
    // ⚠️ E sem o rodapé "Limpou…" (review do lote 1): a frase e a faixa já dizem, e ele ficava lá
    // depois de desligar a limpeza, ao lado de "limpar antes: desligado".
    expect(document.body.textContent).not.toContain('Limpou e ninguém desenhou')
  })

  test('⚠️⚠️ spawn: o Dino é desenhado DEPOIS dos cactos, e não some atrás da parede', () => {
    palco('spawn', avancar('spawn', [{ type: 'advance', seconds: 5 }]))
    const dino = document.querySelector(DINO)
    const cactos = [...document.querySelectorAll(CACTO)]
    expect(dino).toBeTruthy()
    expect(cactos.length).toBeGreaterThan(0)
    // DOCUMENT_POSITION_FOLLOWING: no SVG, quem vem depois é pintado por cima.
    expect((cactos.at(-1) as Element).compareDocumentPosition(dino as Element) & 4).toBe(4)
  })

  /**
   * Os cactos desenhados.
   *
   * ⚠️⚠️ Era a NERVURA do cacto (`path[d="M0 -49V-8"]`), copiada do SVG que o palco desenhava à
   * mão. Quando o palco passou a desenhar pela arte do Jogo 2D aquele caminho deixou de existir, o
   * seletor parou de casar com qualquer coisa e os dois testes que o usam passariam a medir zero —
   * um deles compara a ORDEM de pintura, que com zero cactos não compara nada. O contrato durável
   * é o `data-figure`, que a única porta de figura (`ActorFigure`) sempre escreve.
   */
  const CACTO = '[data-figure="cacto"]'

  // ⚠️ Mudou de propósito (review do lote 2): o rodapé "N na tela · N no grupo · N removidos" saiu do
  // palco (a faixa e a frase já contam). O desenho é conferido contra a MESMA régua da faixa.
  test('⚠️⚠️ spawn: a parede é UMA fileira contínua, e não cinco fileiras empilhadas', () => {
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): os 144 cactos da tela em cinco fileiras viravam um
    // borrão ("parece um ônibus"). A parede desenha um de cada tantos, numa fileira só, com os
    // troncos encostados; a conta de verdade está na faixa.
    const estado = avancar('spawn', [{ type: 'advance', seconds: 5 }])
    palco('spawn', estado)
    const posicoes = [...document.querySelectorAll('[data-figure="cacto"]')].map((g) => {
      const [, x, y] =
        /translate\(([-\d.]+) ([-\d.]+)\)/.exec(g.getAttribute('transform') ?? '') ?? []
      return { x: Number(x), y: Number(y) }
    })
    expect(posicoes.length).toBeGreaterThan(20)
    expect(posicoes.length).toBeLessThan(sceneCactiOnScreen(estado.crowd))
    expect(new Set(posicoes.map((p) => p.y)).size).toBe(1)
    const xs = posicoes.map((p) => p.x).sort((a, b) => a - b)
    const maiorVao = Math.max(...xs.slice(1).map((x, i) => x - (xs[i] as number)))
    // O cacto tem 42 de largura: vão menor que ele é parede.
    expect(maiorVao).toBeLessThan(42)
    expect(document.body.textContent).not.toMatch(/\d+ na tela ·/)
  })

  test('⚠️ cleanup: o desenho e a faixa contam os mesmos cactos na tela', () => {
    // A faixa contava todos os vivos ("na tela 17" com 8 desenhados), justo na cena que separa o
    // que está na tela do que continua guardado nos bastidores.
    const estado = avancar('cleanup', [{ type: 'advance', seconds: 12 }])
    palco('cleanup', estado)
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): o palco é a tela AO LADO dos bastidores, e a
    // prateleira dos bastidores também desenha cactos. "Na tela" é o primeiro lado.
    const [tela, bastidores] = [...document.querySelectorAll('svg[role="img"]')]
    const desenhados = tela?.querySelectorAll(CACTO).length ?? 0
    expect(desenhados).toBeGreaterThan(0)
    expect(sceneCactiOnScreen(estado.crowd)).toBe(desenhados)
    // A prateleira enche com quem saiu (até 16 à vista).
    const fora = estado.crowd.born - estado.crowd.removed - desenhados
    expect(bastidores?.querySelectorAll(CACTO).length).toBe(Math.min(16, fora))
    const faixa = sceneReadout('cleanup', estado).find((r) => r.label === 'na tela')
    expect(Number(faixa?.value)).toBe(desenhados)
    // E a conta do grupo é outra coisa: é justamente a diferença que a cena existe para mostrar.
    expect(estado.crowd.born - estado.crowd.removed).toBeGreaterThan(desenhados)
  })
})

describe('⚠️⚠️ consertos do review do lote 1 (Raio-X)', () => {
  const rafOriginal = window.requestAnimationFrame
  const cafOriginal = window.cancelAnimationFrame
  const matchMediaOriginal = window.matchMedia
  const medirOriginal = HTMLElement.prototype.getBoundingClientRect
  let fila: FrameRequestCallback[] = []
  /** O relógio do navegador na mão: cada chamada toca os quadros pedidos, a 60 Hz. */
  const relogioManual = () => {
    fila = []
    window.requestAnimationFrame = (cb) => {
      fila.push(cb)
      return fila.length
    }
    window.cancelAnimationFrame = () => {}
    let agora = 0
    return async (quantos: number) => {
      for (let i = 0; i < quantos; i++) {
        agora += 1000 / 60
        const chamados = fila.splice(0)
        await act(async () => {
          for (const cb of chamados) cb(agora)
        })
      }
    }
  }
  const menosMovimento = () => {
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  }
  afterEach(() => {
    window.requestAnimationFrame = rafOriginal
    window.cancelAnimationFrame = cafOriginal
    window.matchMedia = matchMediaOriginal
    HTMLElement.prototype.getBoundingClientRect = medirOriginal
  })
  const faixa = (rotulo: string) =>
    [...document.querySelectorAll('dl > div')]
      .find((d) => d.querySelector('dt')?.textContent === rotulo)
      ?.querySelector('dd')?.textContent

  test('⚠️⚠️ Aula 3 com MENOS MOVIMENTO: pular liga o relógio, em passos visíveis de 0,2 s', async () => {
    // "Toque no Dino para pular" não ligava o relógio para quem pediu menos movimento: o Dino
    // ficava no chão, o fio da gravidade seguia fechado e o segundo toque dizia "já está no ar".
    menosMovimento()
    const tocar = relogioManual()
    render(<InteractiveLessonBlock block={block('gravity')} previewContent={content('gravity')} />)
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): "↑ Pular", "altura agora" e "◉ Gravidade".
    fireEvent.click(await screen.findByRole('button', { name: '↑ Pular' }))
    // Menos de 0,2 s de relógio: nada anda ainda (não é animação suave).
    await tocar(8)
    expect(faixa('altura agora')).toBe('0')
    // Passou de 0,2 s: um passo inteiro de uma vez.
    await tocar(8)
    await waitFor(() => expect(Number(faixa('altura agora'))).toBeGreaterThan(0))
    // E o fio da gravidade abre quando o Dino passa de 360 sem gravidade (1,4 s).
    await tocar(90)
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: '◉ Gravidade' }).getAttribute('aria-disabled'),
      ).toBeNull(),
    )
  })

  test('⚠️ draw-loop: o ▶ avança UM quadro a cada 0,25 s, e não 25 por segundo', async () => {
    // Com o ▶ o Dino saltava 52 px a cada 50 ms e virava um borrão que lembra o rastro.
    // ⚠️ Desde o lote 4 quem garante isto é o MOTOR (quatro quadros por segundo, qualquer que seja a
    // fatia), e não mais um limiar de 0,25 s só desta cena no player: o ▶ manda fatias de 0,04 s.
    const tocar = relogioManual()
    render(
      <InteractiveLessonBlock block={block('draw-loop')} previewContent={content('draw-loop')} />,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Soltar o tempo' }))
    await tocar(61)
    const quadro = Number(/quadro (\d+)/.exec(document.body.textContent ?? '')?.[1])
    expect(quadro).toBeGreaterThanOrEqual(3)
    expect(quadro).toBeLessThanOrEqual(4)
  })

  test('⚠️⚠️ antes do palpite a bancada fica na CORTINA, e depois dele abre completa', async () => {
    // ⚠️⚠️ Mudou de propósito (o console de 18/09/2026, a "Proposta B" que ela aprovou): a bancada
    // não some mais no palpite — ela fica À VISTA e FECHADA ("a cena do jogo e alguns controles
    // desativados"), dentro da cortina `inert`, que a tira do Tab e do leitor e desfoca as notas
    // (elas sopram a resposta). O que o teste guarda é que ela NÃO é alcançável ali.
    const publico = publicInteractiveBlock(content('hitbox'))
    render(
      <InteractiveLessonBlock
        block={{ id: 'b', blockRevision: 'r', kind: 'interactive', sortOrder: 0, content: publico }}
      />,
    )
    const modelo = SCENE_QUESTIONS.hitbox
    await screen.findByRole('button', { name: modelo.prediction.choices[0]?.label as string })
    expect(
      screen.getByRole('slider', { name: 'Distância do cacto' }).closest('[inert]'),
    ).not.toBeNull()
    fireEvent.click(
      screen.getByRole('button', { name: modelo.prediction.choices[0]?.label as string }),
    )
    await waitFor(() =>
      expect(
        screen.getByRole('slider', { name: 'Distância do cacto' }).closest('[inert]'),
      ).toBeNull(),
    )
  })

  test('⚠️ a peça escolhida MUDA de cara, e escolher de novo desescolhe', async () => {
    render(<InteractiveLessonBlock block={block('score')} previewContent={content('score')} />)
    // ⚠️ Mudou de propósito (consertos do review da onda A do lote 5): a peça que muda de caixa, com o
    // símbolo fora do nome acessível.
    const peca = () => screen.getByRole('button', { name: 'Somar ponto' })
    await screen.findByRole('button', { name: 'Somar ponto' })
    const antes = peca().className
    // Teclado (clique sem ponteiro): alterna, como o `aria-pressed` promete.
    fireEvent.click(peca())
    await waitFor(() => expect(peca().getAttribute('aria-pressed')).toBe('true'))
    expect(peca().className).not.toBe(antes)
    fireEvent.click(peca())
    await waitFor(() => expect(peca().getAttribute('aria-pressed')).toBe('false'))
    // E o toque sem arrasto também alterna (o `pointerdown` marca, o `pointerup` decide).
    HTMLElement.prototype.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 600, bottom: 200, width: 600, height: 200, x: 0, y: 0 }) as DOMRect
    for (const esperado of ['true', 'false']) {
      fireEvent.pointerDown(peca(), { pointerId: 5, button: 0, clientX: 100, clientY: 50 })
      fireEvent.pointerUp(peca(), { pointerId: 5, button: 0, clientX: 102, clientY: 51 })
      await waitFor(() => expect(peca().getAttribute('aria-pressed')).toBe(esperado))
    }
    expect(
      screen.getByText('Arraste Somar ponto para a outra caixa. Ou toque em Colocar aqui.'),
    ).toBeTruthy()
  })

  test('⚠️⚠️ fio FECHADO: as duas pontas dizem o motivo, ficam no Tab e não ligam por arrasto', () => {
    const acoes: SceneAction[] = []
    HTMLElement.prototype.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 600, bottom: 200, width: 600, height: 200, x: 0, y: 0 }) as DOMRect
    render(
      <ExplorationPieces
        activity={{ type: 'experimentation', scene: 'gravity' }}
        state={openScene({ scene: 'gravity' })}
        dispatch={(a) => acoes.push(a)}
        more={false}
      />,
    )
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): a ponta é "Gravidade".
    const origem = screen.getByRole('button', { name: '◉ Gravidade' })
    const destino = screen.getByRole('button', { name: '◎ Dino' })
    for (const ponta of [origem, destino]) {
      expect(ponta.getAttribute('aria-disabled')).toBe('true')
      expect((ponta as HTMLButtonElement).disabled).toBe(false)
      expect(
        document.getElementById(ponta.getAttribute('aria-describedby') ?? '')?.textContent,
        // ⚠️ Mudou de propósito (lote 2 do Raio-X): sem "subir", que respondia a previsão da cena.
      ).toBe('Abre depois que você fizer o Dino pular e esperar.')
    }
    // O arrasto com o mouse, que antes só o CSS do botão do ui impedia.
    fireEvent.pointerDown(origem, { pointerId: 3, button: 0, clientX: 10, clientY: 10 })
    fireEvent.pointerUp(origem, { pointerId: 3, button: 0, clientX: 300, clientY: 100 })
    fireEvent.click(destino)
    expect(acoes).toEqual([])
  })
})

describe('⚠️⚠️ consertos do review do lote 4 (Raio-X): as cenas de quadro longo não parecem travadas', () => {
  const rafOriginal = window.requestAnimationFrame
  const cafOriginal = window.cancelAnimationFrame
  let fila: FrameRequestCallback[] = []
  /** O relógio do navegador na mão: cada chamada toca os quadros pedidos, a 60 Hz. */
  const relogioManual = () => {
    fila = []
    window.requestAnimationFrame = (cb) => {
      fila.push(cb)
      return fila.length
    }
    window.cancelAnimationFrame = () => {}
    let agora = 0
    return async (quantos: number) => {
      for (let i = 0; i < quantos; i++) {
        agora += 1000 / 60
        const chamados = fila.splice(0)
        await act(async () => {
          for (const cb of chamados) cb(agora)
        })
      }
    }
  }
  /**
   * ⚠️⚠️ "Menos movimento" DESLIGADO de propósito (full review de 16/09/2026): com ele o relógio anda em
   * passos de 0,2 s e a barra não recomeça nos 33 quadros abaixo. A suíte inteira reprovava aqui quando
   * um arquivo anterior deixava um `matchMedia` falso respondendo `true` a toda consulta.
   */
  const matchMediaOriginal = window.matchMedia
  beforeEach(() => {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    })) as unknown as typeof window.matchMedia
  })
  afterEach(() => {
    window.requestAnimationFrame = rafOriginal
    window.cancelAnimationFrame = cafOriginal
    window.matchMedia = matchMediaOriginal
  })
  const barra = () => document.querySelector<HTMLElement>('[data-quadro-em-andamento]')
  const largura = () => Number.parseFloat(barra()?.querySelector('div')?.style.width ?? 'NaN')

  // ⚠️ Mudou de propósito (lote 5 do Raio-X, G6): era a `pool`, que passou a 10 quadros por segundo (o
  // cacto atravessa a pista em pedaços à vista) e saiu das cenas de quadro longo. A `entity-state`
  // segue a 1 por segundo, e é nela que a barra continua sendo o único sinal de que o ▶ anda.
  test('⚠️⚠️ entity-state: com o ▶ rodando, a faixa mostra o quadro em andamento, e ele zera no quadro', async () => {
    // A primeira mudança do palco vinha 1,1 s depois do ▶, e o único retorno era o ícone virar ⏸.
    const tocar = relogioManual()
    render(
      <InteractiveLessonBlock
        block={block('entity-state')}
        previewContent={content('entity-state')}
      />,
    )
    // Parado, não há barra: ela é do tempo CORRENDO.
    expect(barra()).toBeNull()
    fireEvent.click(await screen.findByRole('button', { name: 'Soltar o tempo' }))
    await tocar(31)
    await waitFor(() => expect(barra()).not.toBeNull())
    // ⚠️ Decorativa: quem usa leitor de tela não ouve a barra a cada fatia.
    expect(barra()?.getAttribute('aria-hidden')).toBe('true')
    // Meio segundo de ▶: a barra está no meio do caminho do quadro de 1 s.
    const meio = largura()
    expect(meio).toBeGreaterThan(30)
    expect(meio).toBeLessThan(70)
    // Passou do segundo: o quadro fechou e a barra recomeçou.
    await tocar(33)
    await waitFor(() => expect(largura()).toBeLessThan(meio))
    // Pausado, ela sai.
    fireEvent.click(screen.getByRole('button', { name: 'Parar o tempo' }))
    await waitFor(() => expect(barra()).toBeNull())
  })

  test('⚠️ nas de 4 quadros por segundo em diante a barra não existe: o palco já muda à vista', async () => {
    const tocar = relogioManual()
    render(<InteractiveLessonBlock block={block('contact')} previewContent={content('contact')} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Soltar o tempo' }))
    await tocar(20)
    expect(screen.getByRole('button', { name: 'Parar o tempo' })).toBeTruthy()
    expect(barra()).toBeNull()
  })
})

describe('⚠️⚠️ consertos do review da onda B do lote 5 (G4): a prévia, o espelho e a bancada', () => {
  const rafOriginal = window.requestAnimationFrame
  const cafOriginal = window.cancelAnimationFrame
  const matchMediaOriginal = window.matchMedia
  const medirOriginal = Element.prototype.getBoundingClientRect
  const escondidaOriginal = Object.getOwnPropertyDescriptor(document, 'hidden')
  afterEach(() => {
    window.requestAnimationFrame = rafOriginal
    window.cancelAnimationFrame = cafOriginal
    window.matchMedia = matchMediaOriginal
    Element.prototype.getBoundingClientRect = medirOriginal
    if (escondidaOriginal) Object.defineProperty(document, 'hidden', escondidaOriginal)
    else Reflect.deleteProperty(document, 'hidden')
  })
  /**
   * O relógio do navegador na mão, a 60 Hz: cada chamada toca os quadros pedidos. ⚠️ Com o
   * `cancelAnimationFrame` de verdade: a fatia da prévia muda com a velocidade, o laço do relógio é
   * refeito, e um cancelamento mudo deixaria DOIS laços andando o mesmo motor.
   */
  const relogioManual = () => {
    let fila = new Map<number, FrameRequestCallback>()
    let proximo = 0
    window.requestAnimationFrame = (cb) => {
      proximo += 1
      fila.set(proximo, cb)
      return proximo
    }
    window.cancelAnimationFrame = (id) => {
      fila.delete(id)
    }
    let agora = 0
    return async (quadros: number) => {
      for (let i = 0; i < quadros; i++) {
        agora += 1000 / 60
        const chamados = [...fila.values()]
        fila = new Map()
        await act(async () => {
          for (const cb of chamados) cb(agora)
        })
      }
    }
  }
  const menosMovimento = () => {
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  }
  const montar = (scene: SceneId) => {
    const c = content(scene)
    render(
      <InteractiveLessonBlock
        block={{ id: 'b', blockRevision: 'r', kind: 'interactive', sortOrder: 0, content: c }}
        previewContent={c}
      />,
    )
  }
  const medidor = () => screen.getByRole('meter').getAttribute('aria-valuenow')
  const quadroDaPrevia = () => document.querySelector('[data-previa]')?.getAttribute('data-quadro')

  test('frames (A1): com MENOS MOVIMENTO, a 8 por segundo a prévia troca 8 vezes por segundo', async () => {
    // Com a fatia de 0,2 s o motor passava 1,6 troca por fatia, e a prévia a 8 trocava ~2 vezes por
    // segundo, igual ao "devagar" (medido na banca: 5 trocas em 2 s).
    menosMovimento()
    const tocar = relogioManual()
    montar('frames')
    const trocasEmDoisSegundos = async () => {
      const vistos: (string | null | undefined)[] = []
      for (let i = 0; i < 120; i++) {
        await tocar(1)
        vistos.push(quadroDaPrevia())
      }
      return vistos.filter((q, i) => i > 0 && q !== vistos[i - 1]).length
    }
    fireEvent.click(await screen.findByRole('button', { name: '8' }))
    fireEvent.click(screen.getByRole('button', { name: 'Prévia: parada' }))
    const oito = await trocasEmDoisSegundos()
    expect(oito).toBeGreaterThanOrEqual(14)
    expect(oito).toBeLessThanOrEqual(17)
    // ⚠️ A 12 por segundo a fatia vai EXATA ao motor: com o tempo medido, a cada cinco fatias duas trocas
    // caíam juntas, e o fogo ficava parado uma fatia.
    fireEvent.click(screen.getByRole('button', { name: '12' }))
    const doze = await trocasEmDoisSegundos()
    expect(doze).toBeGreaterThanOrEqual(22)
    expect(doze).toBeLessThanOrEqual(25)
  })

  test('frames (B1): com a prévia tocando, a escolha do quadro fica FECHADA, sem destaque, com o motivo', async () => {
    const tocar = relogioManual()
    montar('frames')
    fireEvent.click(await screen.findByRole('button', { name: 'Prévia: parada' }))
    await tocar(30)
    const um = screen.getByRole('button', { name: 'Quadro 1' })
    const dois = screen.getByRole('button', { name: 'Quadro 2' })
    expect(um.getAttribute('aria-disabled')).toBe('true')
    expect(um.getAttribute('aria-current')).toBeNull()
    expect(dois.getAttribute('aria-current')).toBeNull()
    const motivo = document.getElementById(um.getAttribute('aria-describedby') ?? '')
    expect(motivo?.textContent).toBe('Pare a prévia para escolher um quadro.')
    fireEvent.click(screen.getByRole('button', { name: 'Prévia: tocando' }))
    await waitFor(() => expect(um.getAttribute('aria-disabled')).toBeNull())
  })

  test('frames (MÉDIO-4): a aba escondida para o relógio, a tela diz "parada", e passar do quadro 1 ao 2 conta', async () => {
    const tocar = relogioManual()
    montar('frames')
    fireEvent.click(await screen.findByRole('button', { name: '8' }))
    fireEvent.click(screen.getByRole('button', { name: 'Prévia: parada' }))
    await tocar(40)
    await waitFor(() => expect(medidor()).toBe('1'))
    // A aba some: o player para o relógio sem passar pelo motor, que segue "tocando".
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    const faixa = (await screen.findByText('prévia')).closest('dl')
    await waitFor(() => expect(faixa?.textContent).toContain('parada'))
    expect(screen.getByRole('button', { name: 'Prévia: parada' })).toBeTruthy()
    // O pedido de `two-drawings` ao pé da letra: com a prévia parada, do quadro 1 para o quadro 2.
    fireEvent.click(screen.getByRole('button', { name: 'Quadro 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Quadro 2' }))
    await waitFor(() => expect(medidor()).toBe('2'))
    // E parar assim não é `paused-one`: ninguém parou a prévia rápida.
    expect(medidor()).toBe('2')
  })

  test('symmetry (M3, BAIXO-12): o convite ao toque e o dedo que pinta só com casa de dedo', async () => {
    montar('symmetry')
    const convite = await screen.findByText('Ou toque num quadradinho da grade.')
    const grade = document.querySelector('[data-toque-na-grade]') as SVGElement | null
    // Sem medida (a grade de 8 px do celular), o convite some e a página rola com o dedo na grade.
    expect(convite.hasAttribute('hidden')).toBe(true)
    expect(grade?.style.touchAction).toBe('auto')
    cleanup()
    // Com a coluna larga, cada casa passa de 16 px: a grade vira papel de desenho.
    Element.prototype.getBoundingClientRect = () =>
      ({ width: 320, height: 320, x: 0, y: 0, top: 0, left: 0, right: 320, bottom: 320 }) as DOMRect
    montar('symmetry')
    const largo = await screen.findByText('Ou toque num quadradinho da grade.')
    await waitFor(() => expect(largo.hasAttribute('hidden')).toBe(false))
    expect(
      (document.querySelector('[data-toque-na-grade]') as SVGElement | null)?.style.touchAction,
    ).toBe('none')
  })

  test('as escolhas de NÚMERO (velocidade, recorte) têm 44 px de largura (M2)', async () => {
    montar('frames')
    for (const numero of ['2', '4', '8', '12'])
      expect((await screen.findByRole('button', { name: numero })).className).toContain('min-w-11')
  })
})
