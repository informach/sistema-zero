import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { type LearningBlockProgress, videoCoverageAnswers } from '@sistemazero/core/learning'
import {
  type LessonPlayerContextValue,
  LessonPlayerProvider,
  useLessonPlayer,
} from '@sistemazero/member-shell/components/lesson-player-context'
import {
  LessonSections,
  useLessonLearning,
} from '@sistemazero/member-shell/components/lesson-sections'
import { LessonVideoFrame } from '@sistemazero/member-shell/components/lesson-video-float'
import { useReportActivityExpanded } from '@sistemazero/member-shell/lib/lesson-activity-expansion'
import type { LessonBlockView, LessonDetailView } from '@sistemazero/member-shell/lib/types'
import { useModalA11y } from '@sistemazero/ui/use-modal-a11y'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { type ReactNode, useEffect, useRef, useState } from 'react'

/**
 * "Assistir ao vídeo antes da atividade" + o vídeo flutuante (03/10/2026), na aula de verdade
 * (`LessonSections`), com um player de vídeo e uma atividade de mentira que falam o mesmo
 * contrato dos de produção: o player avisa "tocando" e entrega o play; a atividade avisa que
 * ampliou.
 */

const lesson: LessonDetailView = {
  id: 'aula',
  slug: 'aula',
  courseSlug: 'cade',
  moduleId: 'm',
  title: 'Cadê Todo Mundo?',
  completed: false,
  positionSeconds: null,
  estimatedMinutes: null,
  attachments: [],
  videoBeforeActivity: true,
  blocks: [
    {
      id: 'video',
      kind: 'video',
      sortOrder: 0,
      blockRevision: 'r1',
      content: { kind: 'video', provider: 'file', src: '/video.webm' },
    },
    { id: 'jogo', kind: 'studio', sortOrder: 1, content: { kind: 'studio' } },
  ],
  sections: [
    {
      id: 'secao',
      title: 'Procure os amigos',
      externalTool: null,
      blockIds: ['video', 'jogo'],
      workspaceBlockId: null,
    },
  ],
}

const plays: string[] = []

/** O contrato dos três players: avisa tocando/parado e entrega play e pausa. */
function VideoDeMentira() {
  const player = useLessonPlayer()
  const atual = useRef(player)
  atual.current = player
  useEffect(() => {
    atual.current?.registerVideoControls?.({
      play: () => {
        plays.push('play')
        atual.current?.onVideoPlayingChange?.(true)
      },
      pause: () => atual.current?.onVideoPlayingChange?.(false),
    })
    return () => atual.current?.registerVideoControls?.(null)
  }, [])
  return (
    <LessonVideoFrame>
      <div className="aspect-video">
        {/* biome-ignore lint/a11y/useMediaCaption: vídeo de mentira do teste, sem fala nem som */}
        <video data-testid="o-video" />
        <button type="button" onClick={() => player?.onVideoPlayingChange?.(true)}>
          tocar
        </button>
        <button type="button" onClick={() => player?.onVideoPlayingChange?.(false)}>
          pausar
        </button>
        <button
          type="button"
          onClick={() => player?.onVideoCoverage?.({ duration: 100, ranges: [[0, 95]] })}
        >
          ver quase tudo
        </button>
      </div>
    </LessonVideoFrame>
  )
}

function AtividadeAmpliavel() {
  const [expanded, setExpanded] = useState(false)
  useReportActivityExpanded(expanded)
  return (
    <button type="button" onClick={() => setExpanded((v) => !v)}>
      {expanded ? 'Voltar à aula' : 'Ampliar jogo'}
    </button>
  )
}

const renderBlocks = (items: LessonBlockView[]) =>
  items.map((b) =>
    b.kind === 'video' ? <VideoDeMentira key={b.id} /> : <AtividadeAmpliavel key={b.id} />,
  )

let avancar: ((progress: LearningBlockProgress) => void) | null = null

/** Como a cena ampliada: um modal de verdade (`useModalA11y`), com o Tab preso no cartão. */
function AtividadeModal() {
  const [expanded, setExpanded] = useState(false)
  const card = useModalA11y<HTMLElement>({
    open: expanded,
    onClose: () => setExpanded(false),
    companions: true,
  })
  useReportActivityExpanded(expanded)
  return (
    <section ref={card} tabIndex={-1} aria-label="Experiência">
      <button type="button" onClick={() => setExpanded((v) => !v)}>
        {expanded ? 'Voltar à aula' : 'Ampliar jogo'}
      </button>
      {/* O "Ver a explicação" da cena: um `summary`, parada do Tab que o FOCUSABLE não lista. */}
      <details>
        <summary>Ver a explicação</summary>
        <p>A regra da cena.</p>
      </details>
    </section>
  )
}

function Aula({
  aula = lesson,
  base,
  blocks = renderBlocks,
}: {
  aula?: LessonDetailView
  base?: Partial<LessonPlayerContextValue>
  blocks?: (items: LessonBlockView[]) => ReactNode
}) {
  const learning = useLessonLearning(aula, 'crianca')
  avancar = learning.onProgress
  return (
    <LessonPlayerProvider
      value={{
        lessonId: aula.id,
        courseSlug: aula.courseSlug,
        viewerId: 'crianca',
        viewerWatermark: null,
        initialPositionSeconds: null,
        learningProgress: learning.progress,
        onLearningProgress: learning.onProgress,
        videoGateMascot: <span data-testid="zappy" />,
        ...base,
      }}
    >
      <LessonSections lesson={aula} kids renderBlocks={blocks} />
    </LessonPlayerProvider>
  )
}

function assistiu(fracao: number): LearningBlockProgress {
  return {
    blockId: 'video',
    revision: 'r1',
    answers: videoCoverageAnswers({ duration: 100, ranges: [[0, fracao * 100]] }),
    hintsUsed: 0,
    attemptsCount: 0,
    result: null,
    positionSeconds: Math.round(fracao * 100),
    updatedAt: new Date().toISOString(),
  }
}

beforeEach(() => {
  localStorage.clear()
  plays.length = 0
})
afterEach(() => {
  cleanup()
  avancar = null
})

describe('assistir ao vídeo antes da atividade', () => {
  test('tranca a atividade com o aviso do Zappy, e a atividade fica fora do alcance', () => {
    render(<Aula />)
    expect(screen.getByRole('heading', { name: 'Primeiro, assista ao vídeo' })).toBeDefined()
    expect(screen.getByTestId('zappy')).toBeDefined()
    const ampliar = screen.getByRole('button', { name: 'Ampliar jogo', hidden: true })
    expect(ampliar.closest('[inert]')).not.toBeNull()
    // O vídeo não tranca: é ele que destranca.
    expect(screen.getByRole('button', { name: 'tocar' }).closest('[inert]')).toBeNull()
  })

  test('abre na hora em que o vídeo passa de 90%, com o "Pronto!", sem remontar a atividade', () => {
    render(<Aula />)
    const atividade = screen.getByRole('button', { name: 'Ampliar jogo', hidden: true })
    act(() => avancar?.(assistiu(0.45)))
    expect(screen.getByText('Você já viu 45% do vídeo')).toBeDefined()
    act(() => avancar?.(assistiu(0.95)))
    expect(screen.queryByRole('heading', { name: 'Primeiro, assista ao vídeo' })).toBeNull()
    const pronto = screen.getByText(/Pronto! Agora assista de novo e faça junto/)
    // Fora do fluxo e fora do painel da atividade: não empurra nada e aparece em qualquer aba.
    expect(pronto.closest('[role="status"]')?.className).toContain('fixed')
    expect(pronto.closest('#lesson-tool')).toBeNull()
    // ⚠️⚠️ O MESMO nó: destrancar não pode remontar o editor (Blockly caro, rascunho re-semeado).
    expect(screen.getByRole('button', { name: 'Ampliar jogo' })).toBe(atividade)
    expect(atividade.closest('[inert]')).toBeNull()
    // O primeiro toque em qualquer lugar tira o recado.
    fireEvent.pointerDown(document.body)
    expect(screen.queryByText(/Pronto! Agora assista de novo/)).toBeNull()
  })

  test('o que o player mediu abre a tranca mesmo com a gravação falhando', async () => {
    const fetchOriginal = globalThis.fetch
    globalThis.fetch = (async () => {
      throw new Error('sem rede')
    }) as unknown as typeof fetch
    try {
      render(<Aula />)
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'ver quase tudo' }))
      })
      expect(screen.queryByRole('heading', { name: 'Primeiro, assista ao vídeo' })).toBeNull()
      expect(screen.getByRole('button', { name: 'Ampliar jogo' }).closest('[inert]')).toBeNull()
    } finally {
      globalThis.fetch = fetchOriginal
    }
  })

  test('"Ver o vídeo" leva o foco ao vídeo e tenta dar play', () => {
    render(<Aula />)
    fireEvent.click(screen.getByRole('button', { name: 'Ver o vídeo' }))
    expect(document.activeElement?.id).toBe('lesson-block-video')
    expect(plays).toEqual(['play'])
  })

  test('curso sem a opção, ou a aula sem player (prévia do admin), nunca tranca', () => {
    render(<Aula aula={{ ...lesson, videoBeforeActivity: false }} />)
    expect(screen.queryByRole('heading', { name: 'Primeiro, assista ao vídeo' })).toBeNull()
    cleanup()
    render(<LessonSections lesson={lesson} kids renderBlocks={renderBlocks} />)
    expect(screen.queryByRole('heading', { name: 'Primeiro, assista ao vídeo' })).toBeNull()
  })

  test('seção já concluída não tranca ao revisitar', () => {
    render(<Aula aula={{ ...lesson, completed: true }} />)
    expect(screen.queryByRole('heading', { name: 'Primeiro, assista ao vídeo' })).toBeNull()
  })
})

describe('o vídeo flutuante', () => {
  const aberta = { ...lesson, videoBeforeActivity: false }

  test('ampliar com o vídeo TOCANDO: o mesmo vídeo flutua, sem sair do lugar no DOM', () => {
    render(<Aula aula={aberta} />)
    const video = screen.getByTestId('o-video')
    fireEvent.click(screen.getByRole('button', { name: 'tocar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar jogo' }))
    const flutuante = screen.getByRole('region', { name: 'Vídeo da aula' })
    expect(flutuante.className).toContain('fixed')
    expect(flutuante.hasAttribute('data-sz-modal-companion')).toBe(true)
    // ⚠️⚠️ O MESMO nó: remontar o player recarregaria o vídeo do Vimeo.
    expect(screen.getByTestId('o-video')).toBe(video)
    expect(flutuante.contains(video)).toBe(true)
  })

  test('ampliar com o vídeo PARADO: a pílula "Vídeo", que abre e dá play', () => {
    render(<Aula aula={aberta} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar jogo' }))
    expect(screen.queryByRole('region', { name: 'Vídeo da aula' })).toBeNull()
    // Embaixo da tela ampliada o vídeo fica longe do Tab.
    expect(screen.getByTestId('o-video').closest('[inert]')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Abrir o vídeo da aula' }))
    expect(screen.getByRole('region', { name: 'Vídeo da aula' })).toBeDefined()
    expect(plays).toEqual(['play'])
  })

  test('minimizar volta à pílula com o vídeo tocando; voltar à aula devolve o vídeo ao lugar', () => {
    render(<Aula aula={aberta} />)
    const video = screen.getByTestId('o-video')
    fireEvent.click(screen.getByRole('button', { name: 'tocar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar jogo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Minimizar o vídeo' }))
    expect(screen.queryByRole('region', { name: 'Vídeo da aula' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Abrir o vídeo da aula' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar à aula' }))
    expect(screen.queryByRole('button', { name: 'Abrir o vídeo da aula' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Vídeo da aula' })).toBeNull()
    expect(screen.getByTestId('o-video')).toBe(video)
    expect(video.closest('[inert]')).toBeNull()
  })

  test('com a experiência ampliada (modal), o Tab passa pelo flutuante e volta ao cartão', () => {
    render(
      <Aula
        aula={aberta}
        blocks={(items) =>
          items.map((b) =>
            b.kind === 'video' ? <VideoDeMentira key={b.id} /> : <AtividadeModal key={b.id} />,
          )
        }
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'tocar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar jogo' }))
    const nome = () => {
      const ativo = document.activeElement as HTMLElement | null
      return ativo?.getAttribute('aria-label') ?? ativo?.textContent?.trim() ?? ''
    }
    const tab = (shiftKey = false) =>
      fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Tab', shiftKey })
    // Dentro do cartão quem anda é o navegador: o Tab no "Voltar à aula" não é desviado, e o
    // `summary` ("Ver a explicação") continua sendo a última parada do cartão.
    screen.getByRole('button', { name: 'Voltar à aula' }).focus()
    tab()
    expect(nome()).toBe('Voltar à aula')
    screen.getByText('Ver a explicação').focus()
    const visitados: string[] = []
    for (let i = 0; i < 6; i++) {
      tab()
      visitados.push(nome())
    }
    expect(visitados).toEqual([
      'Tamanho do vídeo',
      'Vídeo da aula: mover para outro canto',
      'Minimizar o vídeo',
      'tocar',
      'pausar',
      'ver quase tudo',
    ])
    tab()
    expect(nome()).toBe('Voltar à aula')
    tab(true)
    expect(nome()).toBe('ver quase tudo')
  })

  test('outro diálogo por cima (o "Enviar para o professor?"): o vídeo some e sai do Tab', async () => {
    render(<Aula aula={aberta} />)
    fireEvent.click(screen.getByRole('button', { name: 'tocar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar jogo' }))
    const flutuante = screen.getByRole('region', { name: 'Vídeo da aula' })
    const dialogo = document.createElement('div')
    dialogo.setAttribute('role', 'dialog')
    dialogo.setAttribute('aria-modal', 'true')
    await act(async () => {
      document.body.append(dialogo)
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(flutuante.className).toContain('invisible')
    expect(flutuante.hasAttribute('inert')).toBe(true)
    expect(flutuante.hasAttribute('data-sz-modal-companion')).toBe(false)
    await act(async () => {
      dialogo.remove()
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(flutuante.className).not.toContain('invisible')
    expect(flutuante.hasAttribute('data-sz-modal-companion')).toBe(true)
  })

  test('a pílula muda de canto pelas setas, sem dar play', () => {
    render(<Aula aula={aberta} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar jogo' }))
    const pilula = screen.getByRole('button', { name: 'Abrir o vídeo da aula' })
    fireEvent.keyDown(pilula, { key: 'ArrowLeft' })
    expect(plays).toEqual([])
    expect(
      JSON.parse(localStorage.getItem('sz:lesson-video-float:v1:crianca') ?? '{}').corner,
    ).toBe('top-left')
    expect(pilula.style.left).toBe('16px')
  })

  test('o lugar escolhido fica guardado por perfil', () => {
    render(<Aula aula={aberta} />)
    fireEvent.click(screen.getByRole('button', { name: 'tocar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar jogo' }))
    const mover = screen.getByRole('button', { name: 'Vídeo da aula: mover para outro canto' })
    fireEvent.keyDown(mover, { key: 'ArrowDown' })
    expect(screen.getByRole('region', { name: 'Vídeo da aula' }).getAttribute('data-corner')).toBe(
      'bottom-right',
    )
    expect(JSON.parse(localStorage.getItem('sz:lesson-video-float:v1:crianca') ?? '{}')).toEqual({
      corner: 'bottom-right',
      width: 320,
    })
  })
})
