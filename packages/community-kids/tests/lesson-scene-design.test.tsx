import { afterEach, describe, expect, test } from 'bun:test'
import type { InteractiveBlock } from '@sistemazero/core/learning'
import {
  openScene,
  SCENE_MODELS,
  type SceneId,
  sceneHint,
  sceneSituation,
} from '@sistemazero/core/learning/scene'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

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

/** O texto da pista passou a trazer a situação ANTES do degrau; o que importa é o degrau estar lá. */
const contendo = (trecho: string) => (_: string, node: Element | null) =>
  node?.textContent?.includes(trecho) === true &&
  !Array.from(node.children).some((filho) => filho.textContent?.includes(trecho))

describe('a pista não apaga a instrução', () => {
  test('⚠️ o enunciado FICA na tela depois de pedir ajuda', async () => {
    // Era o defeito mais caro dos sete: a pista entrava no MESMO balão e o enunciado sumia.
    // Quem pede ajuda é exatamente quem ainda vai reler o que foi pedido.
    render(<InteractiveLessonBlock block={block('layers')} previewContent={content('layers')} />)
    expect(screen.getByText(SCENE_MODELS.layers.instruction)).toBeTruthy()
    fireEvent.click(await screen.findByRole('button', { name: 'Uma pista' }))
    expect(screen.getByText(contendo(SCENE_MODELS.layers.hints[0] as string))).toBeTruthy()
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
    expect(linha?.textContent).toContain('se tocam')
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
    await screen.findByRole('button', { name: '＋ Criar Dino' })
    expect(screen.queryByText('Siga a missão e observe o resultado.')).toBeNull()
    // ⚠️ Mira no `role="status"`: a narração mora ali. A descrição do SVG fala do DESENHO
    // (o que está no palco) e não repete a frase — foi uma duplicação achada no full review,
    // que fazia o leitor de tela ouvir a mesma coisa duas vezes.
    const status = screen
      .getAllByRole('status')
      .map((el) => el.textContent)
      .join(' | ')
    expect(status).toContain('Os bastidores estão vazios: ninguém foi criado ainda.')
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
      await screen.findByText('Distância 140 e área 48: as áreas ainda não se tocam.'),
    ).toBeTruthy()
    fireEvent.change(screen.getByRole('slider', { name: 'Distância do cacto' }), {
      target: { value: '25' },
    })
    // E o acontecimento do motor continua vencendo a descrição do estado.
    await waitFor(() => expect(screen.getByText('As áreas encostaram: batida!')).toBeTruthy())
  })
})

describe('uma variável por vez', () => {
  test('⚠️ a largura da área abre só depois da descoberta sobre distância', async () => {
    // Duas medidas soltas ao mesmo tempo não ensinam qual causou o quê. O controle fica na
    // tela, com o motivo escrito: sumir com ele faria a cena parecer outra a cada descoberta.
    render(<InteractiveLessonBlock block={block('hitbox')} previewContent={content('hitbox')} />)
    const largura = (await screen.findByRole('slider', {
      name: 'Largura da área do Dino',
    })) as HTMLInputElement
    expect(largura.disabled).toBe(true)
    expect(screen.getByText('Abre quando você descobrir o que a distância faz.')).toBeTruthy()
    fireEvent.change(screen.getByRole('slider', { name: 'Distância do cacto' }), {
      target: { value: '25' },
    })
    await waitFor(() => expect(largura.disabled).toBe(false))
    expect(screen.queryByText('Abre quando você descobrir o que a distância faz.')).toBeNull()
  })
})

describe('o rodapé tem uma ação principal', () => {
  test('⚠️ as ferramentas e a pista continuam com os MESMOS nomes', async () => {
    // O que mudou foi o peso visual. Os nomes são o contrato de quem navega por leitor de tela
    // (e dos outros testes desta pasta): trocá-los quebraria os dois.
    render(<InteractiveLessonBlock block={block('layers')} previewContent={content('layers')} />)
    for (const nome of ['Desfazer', 'Recomeçar', 'Uma pista', 'Ligar som'])
      expect(await screen.findByRole('button', { name: nome })).toBeTruthy()
  })

  test('⚠️ cada ferramenta aparece UMA vez', async () => {
    // A reorganização moveu "Ligar som" e "Ouvir instrução" para o lado das ferramentas; deixar
    // as cópias antigas para trás renderizaria dois botões com o mesmo nome acessível — e
    // `getByRole` passa a estourar em vez de achar.
    render(<InteractiveLessonBlock block={block('layers')} previewContent={content('layers')} />)
    await screen.findByRole('button', { name: 'Ligar som' })
    expect(screen.getAllByRole('button', { name: 'Ligar som' })).toHaveLength(1)
  })

  test('a demonstração não oferece pista nem desfazer, mas continua com o som', async () => {
    const demo: InteractiveBlock = {
      ...content('layers'),
      activity: { type: 'demonstration', scene: 'layers' },
    }
    render(
      <InteractiveLessonBlock
        block={{ ...block('layers'), content: demo }}
        previewContent={demo}
      />,
    )
    expect(await screen.findByRole('button', { name: 'Ligar som' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Uma pista' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Desfazer' })).toBeNull()
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
    expect(faixa?.textContent).toContain('área da nave')
    // A frase da situação e o controle travado também.
    expect(screen.getByText(/Distância 140 e área 48/)).toBeTruthy()
    // A pista cita o personagem pelo nome, e é a do atalho da cena (não a do catálogo).
    fireEvent.click(screen.getByRole('button', { name: 'Uma pista' }))
    expect(screen.getByText(/Aproxime o asteroide devagar/)).toBeTruthy()
    expect(screen.getByText(/borda da área da nave/)).toBeTruthy()
  })

  test('sem elenco declarado, nada muda para o Corre Dino', async () => {
    render(<InteractiveLessonBlock block={block('hitbox')} previewContent={content('hitbox')} />)
    expect(await screen.findByText(/Aproxime o cacto/)).toBeTruthy()
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
    await waitFor(() => expect(screen.getByText(/o Dino DESCEU/)).toBeTruthy())
    expect((screen.getByRole('slider', { name: /^x/ }) as HTMLInputElement).value).toBe('110')
    // E o passo de 20 é a via de quem não arrasta.
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar x em 20' }))
    await waitFor(() =>
      expect((screen.getByRole('slider', { name: /^x/ }) as HTMLInputElement).value).toBe('130'),
    )
  })

  test('⚠️ o leitor de tela: ouvir o VAZIO é a descoberta que abre a cena', async () => {
    const c = cena('screen-reader')
    render(
      <InteractiveLessonBlock
        block={{ id: 'b', blockRevision: 'r', kind: 'interactive', sortOrder: 0, content: c }}
        previewContent={c}
      />,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Ouvir a tela' }))
    await waitFor(() => expect(screen.getByText('Tela do jogo. Imagem.')).toBeTruthy())
    const campo = screen.getByLabelText('Descrição do jogo')
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
    const frase = 'Corra com o dino e pule os cactos apertando espaço'
    for (let i = 1; i <= frase.length; i++)
      fireEvent.change(campo, { target: { value: frase.slice(0, i) } })
    // Nada subiu ainda: o campo é local até ela parar.
    expect(campo.value).toBe(frase)
    fireEvent.blur(campo)
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir a tela' }))
    await waitFor(() => expect(screen.getByText(`Tela do jogo. ${frase}`)).toBeTruthy())
    // Duas ações no total (escrever e ouvir), não cinquenta e uma. O medidor de descobertas é
    // a prova mais barata de que o motor recebeu o texto certo de uma vez só.
    expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('2')
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
    // Sem a moldura, a frase diz exatamente a queixa que o roteiro usa para apresentar o bloco.
    expect(await screen.findByText(/a cor do fundo cobre tudo/i)).toBeTruthy()
    // ⚠️ O rótulo diz o ESTADO, não a ação (o molde da `Chave` das bancadas): o botão pintado
    // de primário com `aria-pressed="false"` fazia o desenho e o texto se contradizerem.
    fireEvent.click(screen.getByRole('button', { name: 'A borda da tela: escondida' }))
    await waitFor(() => expect(screen.getByText(/A moldura apareceu/)).toBeTruthy())
    fireEvent.change(screen.getByRole('slider', { name: 'largura da tela' }), {
      target: { value: '600' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Usar 480 por 270' }))
    await waitFor(() => expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('3'))
  })

  test('⚠️ o laço: as três situações só aparecem com o relógio andando', async () => {
    montar('draw-loop')
    const passo = await screen.findByRole('button', { name: 'Um passo' })
    // 1. Congelado: o relógio anda e nada muda.
    fireEvent.click(passo)
    await waitFor(() => expect(screen.getByText(/a tela continua igual/i)).toBeTruthy())
    // 2. Rastro: desenha sem limpar.
    fireEvent.click(screen.getByRole('button', { name: /Desenhar a cada quadro/ }))
    fireEvent.click(passo)
    fireEvent.click(passo)
    // ⚠️ Mira na FRASE, não no rótulo da faixa (que também diz "Dinos na tela").
    await waitFor(() => expect(screen.getByText(/Desenhou de novo sem limpar: 2/)).toBeTruthy())
    // 3. Movimento: limpa e desenha.
    fireEvent.click(screen.getByRole('button', { name: /Limpar antes/ }))
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

  test('⚠️ o palco fica fechado até o palpite, e as ferramentas do rodapé NÃO', async () => {
    // O gate é o motivo de a previsão existir: ver a cena mexer antes de palpitar acaba com a
    // pergunta. ⚠️ Mas ele trava o PALCO, não o bloco: "Ligar som" e "Ouvir instrução" ficam
    // no rodapé, e travar a fala gravada do professor fecharia a porta de quem ainda não lê.
    const c = comPrevisao('hitbox')
    render(
      <InteractiveLessonBlock
        block={{ id: 'b', blockRevision: 'r', kind: 'interactive', sortOrder: 0, content: c }}
        previewContent={c}
      />,
    )
    expect(await screen.findByText(PREVISAO.prompt)).toBeTruthy()
    // ⚠️ `input.disabled` NÃO reflete a herança do `<fieldset disabled>`: quem morde é o
    // fieldset, e é nele que a asserção precisa mirar (mesma lição dos botões do rodapé).
    const distancia = screen.getByRole('slider', { name: 'Distância do cacto' })
    expect(distancia.closest('fieldset')?.disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Ligar som' }).closest('fieldset')?.disabled).toBe(
      false,
    )
    fireEvent.click(screen.getByRole('radio', { name: PREVISAO.choices[0]?.label as string }))
    await waitFor(() => expect(distancia.closest('fieldset')?.disabled).toBe(false))
    // E a cena responde de verdade depois de aberta.
    fireEvent.change(distancia, { target: { value: '25' } })
    await waitFor(() => expect(screen.getByText('As áreas encostaram: batida!')).toBeTruthy())
  })

  test('o recado muda de "escolha para abrir" para "agora mexa e veja"', async () => {
    const c = comPrevisao('hitbox')
    render(
      <InteractiveLessonBlock
        block={{ id: 'b', blockRevision: 'r', kind: 'interactive', sortOrder: 0, content: c }}
        previewContent={c}
      />,
    )
    expect(await screen.findByText(/Escolha um palpite para abrir a cena/)).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: PREVISAO.choices[1]?.label as string }))
    await waitFor(() =>
      expect(screen.getByText('Agora mexa na cena e veja se foi isso mesmo que aconteceu.')),
    )
    // ⚠️ Nada diz se ela acertou: quem responde a previsão é a cena, não um selo verde.
    expect(screen.queryByText(/você acertou/i)).toBeNull()
    expect(screen.queryByText(/errou/i)).toBeNull()
  })

  test('sem previsão declarada, a cena abre como sempre abriu', async () => {
    render(<InteractiveLessonBlock block={block('hitbox')} previewContent={content('hitbox')} />)
    const distancia = await screen.findByRole('slider', { name: 'Distância do cacto' })
    expect(distancia.closest('fieldset')?.disabled).toBe(false)
    expect(screen.queryByText('Antes de mexer')).toBeNull()
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

  test('⚠️ a troca dos quadros: na mão são dois desenhos, rápido vira movimento', async () => {
    montar('frames')
    // Os dois quadros parados primeiro: é a descoberta que a cena existe para construir.
    fireEvent.click(await screen.findByRole('button', { name: 'Quadro 2' }))
    await waitFor(() => expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('1'))
    fireEvent.change(screen.getByRole('slider', { name: 'trocas por segundo' }), {
      target: { value: '1' },
    })
    // ⚠️ "Ligar a troca" liga o RELÓGIO junto: sem isso a criança apertava o interruptor e a
    // tela ficava parada, com a saída escondida no play ao lado (achado do full review).
    fireEvent.click(screen.getByRole('button', { name: 'Ligar a troca' }))
    // ⚠️ E o relógio é PAUSADO em seguida, de propósito: o resto do teste conta trocas a passo
    // dado, e um relógio correndo por conta faria a contagem depender do tempo da máquina.
    fireEvent.click(screen.getByRole('button', { name: 'Pausar experiência' }))
    const passo = screen.getByRole('button', { name: 'Um passo' })
    // ⚠️ O passo do relógio é de 0,2 s: cinco deles fazem um segundo, e é o segundo que conta
    // uma troca a 1 por segundo. Dez passos dão as duas trocas que a meta pede.
    for (let i = 0; i < 10; i++) fireEvent.click(passo)
    await waitFor(() => expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('2'))
    fireEvent.change(screen.getByRole('slider', { name: 'trocas por segundo' }), {
      target: { value: '8' },
    })
    for (let i = 0; i < 5; i++) fireEvent.click(passo)
    await waitFor(() => expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('3'))
  })

  test('⚠️ o fantasma: o passo fica fechado no quadro 1, com o motivo escrito', async () => {
    montar('onion-skin')
    const passo = (await screen.findByRole('slider', {
      name: 'passo do quadro 2',
    })) as HTMLInputElement
    expect(passo.disabled).toBe(true)
    expect(screen.getByText('Vá para o quadro 2 para mover o desenho dele.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Quadro 2' }))
    await waitFor(() => expect(passo.disabled).toBe(false))
    // E esta cena não tem relógio: um play parado prometeria o que ela não faz.
    expect(screen.queryByRole('button', { name: 'Um passo' })).toBeNull()
  })

  test('⚠️ o espelho: o eixo só abre com o espelho ligado, e o traço espera o clique', async () => {
    montar('symmetry')
    const eixo = (await screen.findByRole('slider', { name: 'linha do eixo' })) as HTMLInputElement
    expect(eixo.disabled).toBe(true)
    // Arrastar a coluna NÃO pinta: quem pinta é o botão. Sem isso, cada ponto do deslizante
    // viraria um traço no papel e um comando no relatório do professor.
    fireEvent.change(screen.getByRole('slider', { name: 'coluna do traço' }), {
      target: { value: '4' },
    })
    expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('0')
    fireEvent.click(screen.getByRole('button', { name: 'Pintar aqui' }))
    await waitFor(() => expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('1'))
    fireEvent.click(screen.getByRole('button', { name: /Espelho:/ }))
    await waitFor(() => expect(eixo.disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Pintar aqui' }))
    await waitFor(() => expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('2'))
  })

  test('a lupa: as duas pedras ficam na tela, e a borda muda de nome de perto', async () => {
    montar('pixel-vector')
    const faixa = (await screen.findByText('borda')).closest('dl')
    expect(faixa?.textContent).toContain('de longe, igual')
    fireEvent.change(screen.getByRole('slider', { name: 'lupa' }), { target: { value: '6' } })
    await waitFor(() => expect(faixa?.textContent).toContain('escadinha'))
    fireEvent.click(screen.getByRole('button', { name: 'Olhar a de vetor' }))
    await waitFor(() => expect(faixa?.textContent).toContain('lisa'))
  })

  test('⚠️⚠️ a folha: mudar o tamanho no jogo não mexe no que está na folha', async () => {
    montar('sheet-vs-sprite')
    fireEvent.click(await screen.findByRole('button', { name: 'Pedaço 3' }))
    const faixa = (await screen.findByText('pedaço da folha')).closest('dl')
    await waitFor(() => expect(faixa?.textContent).toContain('3 de 4'))
    fireEvent.change(screen.getByRole('slider', { name: 'tamanho no jogo' }), {
      target: { value: '80' },
    })
    await waitFor(() => expect(faixa?.textContent).toContain('80'))
    // O pedaço recortado e a folha continuam os mesmos: é a cena inteira nesta linha.
    expect(faixa?.textContent).toContain('3 de 4')
    expect(faixa?.textContent).toContain('64 por 64')
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

  test('⚠️ cena sem relógio não mostra "Um passo", e a com relógio mostra', async () => {
    // A lista de cenas com tempo era escrita à mão no player e já tinha deixado `stage-size`
    // com um passo que não fazia nada. Hoje quem decide é a régua de legalidade do core.
    montar('stage-size')
    expect(await screen.findByRole('button', { name: 'A borda da tela: escondida' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Um passo' })).toBeNull()
    cleanup()
    montar('draw-loop')
    expect(await screen.findByRole('button', { name: 'Um passo' })).toBeTruthy()
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
  /**
   * As cenas que o elenco existe para reaproveitar (proposta, lote 2) e a das vidas.
   *
   * ⚠️⚠️ E as que têm PALCO E BANCADA PRÓPRIOS. As sete primeiras caem todas no palco
   * compartilhado, então a varredura ficou verde enquanto `scene-core-controls` e
   * `scene-engine-controls` — extraídos depois — voltavam a escrever "cacto" e "Dino" crus nos
   * rótulos dos controles. Teste que não alcança o arquivo novo não trava nada: cena com
   * bancada própria entra AQUI no mesmo commit em que a bancada nasce.
   */
  const REAPROVEITAVEIS: SceneId[] = [
    'world',
    'layers',
    'spawn',
    'hitbox',
    'score',
    'game-state',
    'lives',
    // As do núcleo, com bancada própria — `contact`, `camera` e `group-loop` são exatamente as
    // que o elenco existe para reaproveitar nos níveis 2 e 3.
    'velocity',
    'contact',
    'camera',
    'group-loop',
    'enemy-type',
    'variable',
    'cooldown',
    'aim',
    // As do motor e do 3D.
    'pool',
    'entity-state',
    'delta-time',
    'circle-collision',
    'axis-z',
    'camera-3d',
    'mesh',
    'pick-ray',
  ]

  test('⚠️⚠️ nenhuma palavra do Corre Dino sobra na tela vestida de outro curso', () => {
    for (const scene of REAPROVEITAVEIS) {
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
      // O texto visível E os nomes acessíveis: quem usa leitor de tela ouve os `aria-label`.
      const visivel = document.body.textContent ?? ''
      const rotulos = [...document.querySelectorAll('[aria-label]')]
        .map((el) => el.getAttribute('aria-label') ?? '')
        .join(' | ')
      for (const alvo of [/Dino/i, /cactos?/i, /floresta/i])
        for (const [onde, texto] of [
          ['texto', visivel],
          ['rótulo', rotulos],
        ] as const)
          if (alvo.test(texto))
            throw new Error(`${scene}: ${onde} ainda fala do Corre Dino (${alvo})`)
      cleanup()
    }
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
    fireEvent.click(await screen.findByRole('button', { name: '＋ Criar nave' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: '＋ Criar nave' })).toBeNull())
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
})
