import { afterEach, describe, expect, mock, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../core/copy'
import type { PintaTaskSession } from '../core/types'
import { TaskBriefPanel } from './TaskBriefPanel'

afterEach(cleanup)

function session(overrides: Partial<PintaTaskSession['progress']> = {}, requiresStudioUse = true) {
  const onProgress = mock(
    async (_input: Parameters<PintaTaskSession['onProgress']>[0]) => undefined,
  )
  const value: PintaTaskSession = {
    taskId: 'task-art',
    title: 'Desenhar a heroína',
    summary: null,
    project: { id: 'plan', name: 'Bosque' },
    cycle: { id: 'cycle', number: 1, goal: null },
    brief: {
      assetId: 'hero',
      artKind: 'sprite',
      style: 'pixel',
      palette: [{ role: 'roupa', color: '#AA33CC' }],
      appearance: 'Pequena, ágil e com capa roxa',
      animations: ['andar'],
      states: ['parada'],
      usage: 'Personagem principal',
      requiresStudioUse,
    },
    guide: {
      steps: [{ id: 'draw', text: 'Desenhar a personagem', required: true }],
      criteria: [{ id: 'readable', text: 'Silhueta legível', required: true }],
    },
    progress: {
      status: 'in_progress',
      completedStepIds: ['draw'],
      completedCriteriaIds: ['readable'],
      startedAt: '2026-08-04T12:00:00.000Z',
      completedAt: null,
      updatedAt: '2026-08-04T12:00:00.000Z',
      outputRef: { kind: 'pinta_asset', assetId: 'asset-1', ...overrides.outputRef },
      ...overrides,
    },
    onProgress,
  }
  return { value, onProgress }
}

describe('Brief do meu jogo', () => {
  test('checkboxes têm alvo de toque de pelo menos 44px', () => {
    render(<TaskBriefPanel session={session().value} />)
    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox.closest('label')?.classList.contains('min-h-11')).toBe(true)
    }
  })

  test('persiste o contexto e exige envio ao Estúdio quando o cartão pede', async () => {
    const pending = session()
    const view = render(<TaskBriefPanel session={pending.value} />)
    expect(screen.getByText(/Pequena, ágil/)).toBeTruthy()
    expect(screen.getByText('roupa')).toBeTruthy()
    expect(
      (screen.getByRole('button', { name: 'Concluir tarefa' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(screen.getByText(/Usar no Estúdio/)).toBeTruthy()

    const ready = session({
      outputRef: {
        kind: 'pinta_asset',
        assetId: 'asset-1',
        usedInStudioAt: '2026-08-04T12:00:00.000Z',
      },
    })
    view.rerender(<TaskBriefPanel session={ready.value} />)
    fireEvent.click(screen.getByRole('button', { name: 'Concluir tarefa' }))
    await waitFor(() => expect(ready.onProgress).toHaveBeenCalledWith({ status: 'completed' }))
  })

  test('explica o bloqueio quando o Estúdio exigido não foi liberado', () => {
    const blocked = session({ outputRef: { kind: 'pinta_asset', assetId: 'asset-1' } })
    blocked.value.studioUseBlockedReason = 'O Estúdio ainda não está liberado para esta conta.'
    render(<TaskBriefPanel session={blocked.value} />)
    expect(screen.getByText('O Estúdio ainda não está liberado para esta conta.')).toBeTruthy()
    expect(
      (screen.getByRole('button', { name: 'Concluir tarefa' }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  test('mantém o brief e informa falha de rede sem concluir localmente', async () => {
    const failing = session({
      outputRef: {
        kind: 'pinta_asset',
        assetId: 'asset-1',
        usedInStudioAt: '2026-08-04T12:00:00.000Z',
      },
    })
    failing.value.onProgress = mock(async () => {
      throw new Error('offline')
    })
    render(<TaskBriefPanel session={failing.value} />)
    fireEvent.click(screen.getByRole('button', { name: 'Concluir tarefa' }))
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('Confira a internet'),
    )
    expect(screen.getByText(/Pequena, ágil/)).toBeTruthy()
  })

  test('oferece recriar ou vincular quando o desenho existe só em outro aparelho', () => {
    const missing = session()
    const onRecreate = mock(() => undefined)
    const onRelink = mock(() => undefined)
    render(
      <TaskBriefPanel
        session={missing.value}
        outputMissing
        onRecreate={onRecreate}
        onRelink={onRelink}
      />,
    )

    expect(screen.getByRole('alert').textContent).toContain('não está neste aparelho')
    fireEvent.click(screen.getByRole('button', { name: 'Recriar com este brief' }))
    fireEvent.click(screen.getByRole('button', { name: 'Vincular outro desenho' }))
    expect(onRecreate).toHaveBeenCalledTimes(1)
    expect(onRelink).toHaveBeenCalledTimes(1)
    expect(
      (screen.getByRole('button', { name: 'Concluir tarefa' }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })
})

describe('Voltar ao plano', () => {
  test('sem o callback do host o botão não existe', () => {
    render(<TaskBriefPanel session={session().value} />)
    expect(screen.queryByRole('button', { name: COPY.task.back })).toBeNull()
  })

  test('aparece na pílula da comunidade, chama uma vez, e continua com a tarefa concluída', async () => {
    const onReturn = mock(async () => undefined)
    const view = render(<TaskBriefPanel session={session().value} onReturn={onReturn} />)
    const botao = screen.getByRole('button', { name: COPY.task.back })
    // ⚠ Desde 19/09/2026 o alvo de toque vem da receita compartilhada (`--sz-tool-hit`: 40px no
    // mouse e 44 no toque), não de um `min-h-11` deste painel. Trocar a classe pela receita é a
    // mudança: a régua de 44px continua, só que escrita uma vez para as quatro ferramentas.
    expect(botao.classList.contains('sz-tool-pill')).toBe(true)
    // O nome acessível é o texto visível: nada de `aria-label` nem de `title`.
    expect(botao.getAttribute('aria-label')).toBeNull()
    expect(botao.getAttribute('title')).toBeNull()

    fireEvent.click(botao)
    await waitFor(() => expect(onReturn).toHaveBeenCalledTimes(1))

    // Terminar o desenho é justamente quando ela quer voltar: o botão fica.
    const concluida = session({ status: 'completed', completedAt: '2026-09-17T12:00:00.000Z' })
    view.rerender(<TaskBriefPanel session={concluida.value} onReturn={onReturn} />)
    expect(screen.queryByRole('button', { name: 'Concluir tarefa' })).toBeNull()
    expect(screen.getByRole('button', { name: COPY.task.back })).toBeTruthy()
  })

  test('o botão e o recado ficam FORA do brief que recolhe e do corpo que rola', () => {
    const view = render(
      <TaskBriefPanel session={session().value} onReturn={async () => undefined} />,
    )
    const botao = screen.getByRole('button', { name: COPY.task.back })
    // ⚠ Desde 19/09/2026 a volta RECOLHE junto (é rotina), mas ela nunca entra no CORPO do
    // brief nem no que ROLA: o pé é irmão dos dois, e é isso que este caso trava. Sem essa
    // separação, o botão voltaria a nascer abaixo da dobra no celular.
    const seta = view.container.querySelector<HTMLButtonElement>('button[aria-expanded]')
    if (!seta) throw new Error('seta esperada')
    const corpo = view.container.querySelector(`#${seta.getAttribute('aria-controls')}`)
    expect(corpo).toBeTruthy()
    // Nem dentro do corpo do brief nem dentro do `max-h-52 overflow-auto` que rola.
    expect(corpo?.contains(botao)).toBe(false)
    expect(botao.closest('.overflow-auto')).toBeNull()
    // E a volta não entra DENTRO da seta: com o `<details>` de antes, um controle no `<summary>`
    // recolhia o brief ao ser clicado. `seta.querySelector('button')` não serve de trava (a seta
    // É o botão, e ninguém aninha botão em botão) — achado do full review de 18/09/2026.
    expect(seta.contains(botao)).toBe(false)
    // A ordem do DOM é seta, brief, saída — e, sem `tabIndex` em lugar nenhum, ela é a ordem
    // do Tab. Se algum dia aparecer um `tabIndex`, esta asserção para de falar do Tab.
    expect(view.container.querySelector('[tabindex]')).toBeNull()
    const foco = Array.from(view.container.querySelectorAll<HTMLElement>('button, input'))
    expect(foco.at(-1)).toBe(botao)
    expect(foco.at(0)).toBe(seta)
  })

  test('dois cliques seguidos guardam e navegam UMA vez só', async () => {
    let liberar: (() => void) | null = null
    const onReturn = mock(
      () =>
        new Promise<void>((resolve) => {
          liberar = () => resolve()
        }),
    )
    render(<TaskBriefPanel session={session().value} onReturn={onReturn} />)
    const botao = screen.getByRole('button', { name: COPY.task.back }) as HTMLButtonElement

    fireEvent.click(botao)
    // O rótulo NÃO muda enquanto guarda (mudaria o nome acessível no meio da ação).
    expect(botao.disabled).toBe(true)
    expect(botao.getAttribute('aria-busy')).toBe('true')
    // ⚠️⚠️ O `disabled` sai daqui de propósito: no clique duplo REAL o navegador chega ao
    // segundo clique ANTES do re-render que o aplica, e quem segura é a trava por REF.
    // Com o atributo no lugar, o teste passava mesmo sem a trava (medido no full review).
    botao.removeAttribute('disabled')
    fireEvent.click(botao)
    expect(onReturn).toHaveBeenCalledTimes(1)

    await act(async () => {
      liberar?.()
      await Bun.sleep(0)
    })
    expect(onReturn).toHaveBeenCalledTimes(1)
  })

  test('enquanto guarda anuncia numa região viva, e navegar não devolve o botão', async () => {
    let liberar: (() => void) | null = null
    const onReturn = mock(
      () =>
        new Promise<void>((resolve) => {
          liberar = () => resolve()
        }),
    )
    const view = render(<TaskBriefPanel session={session().value} onReturn={onReturn} />)
    // A região viva monta VAZIA (uma que nasce com o texto não é anunciada).
    const status = view.container.querySelector('[role="status"]')
    expect(status?.textContent).toBe('')

    fireEvent.click(screen.getByRole('button', { name: COPY.task.back }))
    await waitFor(() => expect(status?.textContent).toBe(COPY.task.backBusy))

    await act(async () => {
      liberar?.()
      await Bun.sleep(0)
    })
    // Quem navegou não volta para esta tela: o botão NÃO é reabilitado no sucesso.
    const botao = screen.getByRole('button', { name: COPY.task.back }) as HTMLButtonElement
    expect(botao.disabled).toBe(true)
    expect(botao.getAttribute('aria-busy')).toBe('true')
  })

  test('falha ao guardar mostra o recado desta tela, nunca a mensagem do erro', async () => {
    // O caso COMUM: o `flush` do editor rejeita com `COPY.editor.saveError`, que é o
    // rótulo de três palavras do selo da barra.
    const onReturn = mock(async () => {
      throw new Error(COPY.editor.saveError)
    })
    render(<TaskBriefPanel session={session().value} onReturn={onReturn} />)
    fireEvent.click(screen.getByRole('button', { name: COPY.task.back }))

    const alerta = await waitFor(() => screen.getByRole('alert'))
    expect(alerta.textContent).toBe(COPY.task.backError)
    expect(alerta.textContent).not.toContain(COPY.editor.saveError)
    // Nada de "internet": esta gravação é local.
    expect(alerta.textContent).not.toContain('internet')
    // E o recado não sai em letra miúda: o piso da casa para criança é 12px.
    expect(alerta.tagName).toBe('P')
    expect(alerta.className).toContain('text-sm')

    const botao = screen.getByRole('button', { name: COPY.task.back }) as HTMLButtonElement
    expect(botao.disabled).toBe(false)
    expect(botao.getAttribute('aria-busy')).toBe('false')
    // O brief continua na tela: falhar não tira a criança de onde ela estava.
    expect(screen.getByText(/Pequena, ágil/)).toBeTruthy()
  })

  test('erro do HOST também vira a frase desta tela', async () => {
    const onReturn = mock(async () => {
      throw new Error('Falha de mentira do playground.')
    })
    render(<TaskBriefPanel session={session().value} onReturn={onReturn} />)
    fireEvent.click(screen.getByRole('button', { name: COPY.task.back }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(COPY.task.backError))
  })
})

/**
 * 18/09/2026 — "o painel ocupa muito espaço da tela e sobra pouco para a criação".
 * O `<details open>` recolhia, mas com o triângulo do navegador (que criança não acha) e
 * esquecendo a escolha ao sair. Agora é seta de verdade, e quem LEMBRA é o host.
 */
describe('a seta que recolhe o brief', () => {
  function setaDe(container: HTMLElement): HTMLButtonElement {
    const seta = container.querySelector<HTMLButtonElement>('button[aria-expanded]')
    if (!seta) throw new Error('seta esperada')
    return seta
  }

  test('sem o par do host, o painel recolhe sozinho e o corpo some', () => {
    const view = render(<TaskBriefPanel session={session().value} />)
    const seta = setaDe(view.container)
    expect(seta.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Como deve parecer')).toBeTruthy()
    fireEvent.click(seta)
    expect(seta.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Como deve parecer')).toBeNull()
    fireEvent.click(seta)
    expect(screen.getByText('Como deve parecer')).toBeTruthy()
  })

  test('recolhido sobra UMA linha: o título e a seta', () => {
    // ⚠️⚠️ 19/09/2026, decisão dela: "quando fechar pode fechar tudo, mantendo só uma linha
    // ali, o título e a setinha, para a gente deixar bastante espaço para as ferramentas".
    // Isso REVOGA em parte a regra de 18/09 (a volta ficava fora do que recolhe): a volta é
    // ação de ROTINA e recolhe junto; o que nunca recolhe é PROBLEMA (o describe seguinte).
    const view = render(
      <TaskBriefPanel session={session().value} onReturn={async () => undefined} />,
    )
    fireEvent.click(setaDe(view.container))
    expect(screen.queryByText('Como deve parecer')).toBeNull()
    expect(screen.queryByRole('button', { name: COPY.task.back })).toBeNull()
    // ⚠ A linha que sobra é o TÍTULO, e só ele: o sobretítulo sai junto, senão o cabeçalho tem
    // duas (achado do full review de 19/09/2026 — o caso passava sem olhar para ele).
    expect(screen.getByText(/Brief do meu jogo/)).toBeTruthy()
    expect(screen.queryByText('Guia do Pensa')).toBeNull()
    // Anti-vácuo: a seta nunca sai da tela, e é ela que devolve tudo com UM clique.
    fireEvent.click(setaDe(view.container))
    expect(screen.getByRole('button', { name: COPY.task.back })).toBeTruthy()
  })

  test('com o par do host, quem manda é o `collapsed` e a seta só AVISA', () => {
    const onCollapsedChange = mock((_v: boolean) => undefined)
    const base = session().value
    const view = render(
      <TaskBriefPanel session={{ ...base, collapsed: true, onCollapsedChange }} />,
    )
    // Nasce recolhido porque o host lembrou — não porque o painel decidiu.
    expect(setaDe(view.container).getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Como deve parecer')).toBeNull()
    fireEvent.click(setaDe(view.container))
    expect(onCollapsedChange).toHaveBeenCalledWith(false)
    // ⚠️ E NÃO abriu sozinho: o host é a fonte da verdade, e ele ainda diz `true`.
    expect(setaDe(view.container).getAttribute('aria-expanded')).toBe('false')
    // Quando o host devolve o valor novo, aí sim abre.
    view.rerender(<TaskBriefPanel session={{ ...base, collapsed: false, onCollapsedChange }} />)
    expect(screen.getByText('Como deve parecer')).toBeTruthy()
  })

  test('o quadro veste a casca compartilhada das ferramentas', () => {
    // 19/09/2026: os três guias do Pensa (este, o do Estúdio e o do Molda) passaram a vestir a
    // MESMA receita (`.sz-tool-guide` do `@sistemazero/ui/tool-chrome.css`). Antes cada um tinha
    // a própria casca, e foi isso que ela leu como "fora da identidade visual da comunidade".
    const view = render(<TaskBriefPanel session={session().value} onReturn={async () => {}} />)
    const quadro = view.container.firstElementChild as HTMLElement
    expect(quadro.classList.contains('sz-tool-guide')).toBe(true)
    const seta = setaDe(view.container)
    expect(seta.classList.contains('sz-tool-guide__head')).toBe(true)
    // ⚠ E a casca PRÓPRIA saiu: o fio de 2px no acento e o respiro de 12/8px que ela viu como
    // "o texto colando na borda" vinham daqui. Sem esta metade, reintroduzi-los passa verde e o
    // painel volta a ter duas cascas somadas.
    for (const morta of ['rounded-2xl', 'border-2', 'px-3', 'py-2']) {
      expect({ morta, tem: quadro.classList.contains(morta) }).toEqual({ morta, tem: false })
    }
    expect(view.container.querySelector('.sz-tool-guide__body')).toBeTruthy()
    expect(view.container.querySelector('.sz-tool-guide__foot')).toBeTruthy()
  })

  test('o corpo que recolhe é o que a seta aponta, e o painel tem respiro embaixo', () => {
    const view = render(<TaskBriefPanel session={session().value} />)
    const seta = setaDe(view.container)
    const corpo = view.container.querySelector(`#${seta.getAttribute('aria-controls')}`)
    expect(corpo?.contains(screen.getByText('Como deve parecer'))).toBe(true)
    // ⚠️ A margem de baixo é o "não fica grudado na ferramenta" que ela pediu: sem ela o
    // brief encosta no palco do Pinta, porque o host empilha os dois sem vão nenhum.
    const quadro = view.container.firstElementChild as HTMLElement
    // ⚠ `classList.contains`, não `className.toContain`: 'mb-20' contém 'mb-2', e o teste
    // passaria com um respiro dez vezes maior (achado do full review de 18/09/2026).
    expect(quadro.classList.contains('mb-2')).toBe(true)
    // ⚠ Recolhido, o corpo DESMONTA e o `aria-controls` SAI: apontar para um id que não
    // existe é referência pendurada para o leitor de tela (a régua do `Panel` do pacote).
    fireEvent.click(seta)
    expect(seta.getAttribute('aria-controls')).toBeNull()
    expect(seta.getAttribute('aria-expanded')).toBe('false')
  })
})

/**
 * 18/09/2026, achado do full review — e é ALTO justamente porque a seta passou a LEMBRAR.
 * O aviso do desenho ausente morava dentro do brief, com os dois únicos botões que o
 * resolvem. Com o `<details open>` de antes isso era tolerável (nascia aberto toda vez);
 * com a escolha guardada, a criança que recolheu uma vez abriria a tarefa noutro aparelho e
 * veria só o título, sem nada dizendo que existe um caminho de volta.
 */
describe('recolher esconde o brief, nunca um problema', () => {
  test('com o desenho ausente, o aviso e os dois caminhos FICAM na tela recolhido', () => {
    const view = render(
      <TaskBriefPanel
        session={session().value}
        outputMissing
        onRecreate={() => {}}
        onRelink={() => {}}
        onReturn={async () => undefined}
      />,
    )
    const seta = view.container.querySelector<HTMLButtonElement>('button[aria-expanded]')
    if (!seta) throw new Error('seta esperada')
    fireEvent.click(seta)
    // O brief some...
    expect(screen.queryByText('Como deve parecer')).toBeNull()
    // ...mas o alarme e as duas saídas, não.
    expect(screen.getByRole('alert').textContent).toContain('não está neste aparelho')
    expect(screen.getByRole('button', { name: 'Recriar com este brief' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Vincular outro desenho' })).toBeTruthy()
    // ⚠️ E a volta ao plano SAI, porque é rotina (19/09/2026): o que fica é o problema e o que
    // o resolve. Ela pediu uma linha só quando não há nada errado.
    expect(screen.queryByRole('button', { name: COPY.task.back })).toBeNull()
  })

  test('com o recado de falha, o botão que refaz a tentativa FICA recolhido', async () => {
    // ⚠️⚠️ Achado do full review de 19/09/2026: a regra é "o problema e o que o RESOLVE nunca
    // recolhem". O `syncError` da volta só se resolve por este botão; sem ele a criança lia um
    // recado vermelho sem nada para fazer na tela.
    const onReturn = mock(async () => {
      throw new Error('caiu')
    })
    const view = render(<TaskBriefPanel session={session().value} onReturn={onReturn} />)
    fireEvent.click(screen.getByRole('button', { name: COPY.task.back }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(COPY.task.backError))
    const seta = view.container.querySelector<HTMLButtonElement>('button[aria-expanded]')
    if (!seta) throw new Error('seta esperada')
    fireEvent.click(seta)
    // O brief recolheu...
    expect(screen.queryByText('Como deve parecer')).toBeNull()
    // ...e o recado e a volta ficaram.
    expect(screen.getByRole('alert').textContent).toBe(COPY.task.backError)
    expect(screen.getByRole('button', { name: COPY.task.back })).toBeTruthy()
  })

  test('sem problema nenhum, recolhido não sobra nem alerta nem pé', () => {
    // Anti-vácuo do caso acima: o alerta não é um elemento que esteja sempre lá.
    const view = render(
      <TaskBriefPanel session={session().value} onReturn={async () => undefined} />,
    )
    const seta = view.container.querySelector<HTMLButtonElement>('button[aria-expanded]')
    if (!seta) throw new Error('seta esperada')
    fireEvent.click(seta)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Recriar com este brief' })).toBeNull()
    expect(screen.queryByRole('button', { name: COPY.task.back })).toBeNull()
    // Sobra a seta, e só ela: é a "uma linha" que ela pediu.
    expect(view.container.querySelectorAll('button').length).toBe(1)
  })
})
