import { afterEach, describe, expect, test } from 'bun:test'
import type { InteractiveBlock } from '@sistemazero/core/learning'
import {
  applyDemonstrationSegment,
  type DemonstrationSession,
  packDemonstration,
  readSceneSegment,
  SCENE_MODELS,
  type SceneCheckpoint,
  type SceneId,
  sceneScript,
  sceneStart,
} from '@sistemazero/core/learning/scene'
import { ExperienceConnection } from '@sistemazero/member-shell/components/experience-connection'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import { LessonPlayerProvider } from '@sistemazero/member-shell/components/lesson-player-context'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const matchMediaOriginal = window.matchMedia
afterEach(() => {
  cleanup()
  window.matchMedia = matchMediaOriginal
})
/**
 * Menos movimento. ⚠️ Mudou de propósito (consertos do review do lote 2): a parte não salta mais
 * para o fim, ela TOCA em passos de 0,2 s. Percorrer uma demonstração num teste pede o relógio na
 * mão (`relogioManual`).
 */
function menosMovimento() {
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
/** O relógio do navegador na MÃO: cada `tocar(n)` roda `n` quadros a 60 Hz. */
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
function renderMission(
  scene: SceneId,
  type: 'experimentation' | 'demonstration' = 'experimentation',
) {
  const modelo = SCENE_MODELS[scene]
  const content: InteractiveBlock = {
    kind: 'interactive',
    title: modelo.title,
    instructions: modelo.instruction,
    hints: [...modelo.hints],
    required: false,
    activity: { type, scene },
  }
  return render(
    <InteractiveLessonBlock
      block={{
        id: 'experience',
        blockRevision: 'revision',
        kind: 'interactive',
        sortOrder: 0,
        content,
      }}
      previewContent={content}
    />,
  )
}
describe('o laboratório da cena', () => {
  test('contact, same-position area comparison and undo work through accessible controls', async () => {
    renderMission('hitbox')
    fireEvent.change(screen.getByRole('slider', { name: 'Distância do cacto' }), {
      target: { value: '25' },
    })
    // ⚠️ Mudou de propósito (lote 2): "Guardar para comparar" virou "Guardar este jeito".
    fireEvent.click(screen.getByRole('button', { name: 'Guardar este jeito' }))
    fireEvent.change(screen.getByRole('slider', { name: 'Distância do cacto' }), {
      target: { value: '60' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
    expect(
      (screen.getByRole('slider', { name: 'Distância do cacto' }) as HTMLInputElement).value,
    ).toBe('25')
    // A área abre em 100%: comparar 80% revela o primeiro contraste. Em 40%, a área fica
    // pequena demais e deixa de marcar uma batida visível, a terceira descoberta da cena.
    fireEvent.change(screen.getByRole('slider', { name: 'Distância do cacto' }), {
      target: { value: '50' },
    })
    fireEvent.change(screen.getByRole('slider', { name: 'Tamanho da área do Dino' }), {
      target: { value: '80' },
    })
    fireEvent.change(screen.getByRole('slider', { name: 'Distância do cacto' }), {
      target: { value: '40' },
    })
    fireEvent.change(screen.getByRole('slider', { name: 'Tamanho da área do Dino' }), {
      target: { value: '40' },
    })
    expect(screen.getByText('Experiência guardada')).toBeTruthy()
    expect(screen.getByText(SCENE_MODELS.hitbox.success)).toBeTruthy()
    // ⚠️ Cumprir o objetivo NÃO encerra a cena (14/09/2026). O `<fieldset disabled>` que
    // travava tudo aqui desabilitava também Recomeçar, Uma pista e Ligar som — e ao reabrir a
    // aula a cena já nascia morta, porque o checkpoint salvo faz `passed` nascer true. A
    // criança que acertou apertando botão de qualquer jeito precisa poder refazer.
    // ⚠️ `button.disabled` NÃO reflete a herança do `<fieldset disabled>`: quem morde é o
    // fieldset. Os quatro botões são conferidos por ele, um a um.
    // ⚠️ Mudou de propósito (lote 2): `hitbox` não faz som, e as ferramentas moram FORA do fieldset
    // da cena, então a asserção olha se há algum fieldset DESABILITADO acima delas.
    for (const nome of ['Desfazer', 'Recomeçar'])
      expect(screen.getByRole('button', { name: nome }).closest('fieldset[disabled]')).toBeNull()
    // ⚠️ Mudou de propósito (consertos do review do lote 2): "Uma pista" some ao concluir (era um
    // clique mudo que ainda contava pista para o professor).
    expect(screen.queryByRole('button', { name: 'Uma pista' })).toBeNull()
    // E continuam FUNCIONANDO: o guard dos comandos também olhava o `passed`, então destravar
    // só o fieldset deixaria os botões clicáveis e mudos.
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
    expect(
      (screen.getByRole('slider', { name: 'Tamanho da área do Dino' }) as HTMLInputElement).value,
    ).not.toBe('40')
    expect(screen.queryByRole('button', { name: 'Ver um exemplo' })).toBeNull()
    expect(screen.queryByText(SCENE_MODELS.hitbox.extra)).toBeNull()
    // ⚠️ Mudou de propósito (lote 2): o cartão "Descoberta registrada." saiu. Sem pergunta anexa no
    // bloco, a conclusão diz "Você descobriu!" e a regra da cena logo embaixo.
    expect(screen.getByText('Você descobriu!', { selector: 'p' })).toBeTruthy()
    expect(screen.getByText('Prévia: nada é guardado.')).toBeTruthy()
  })
  test('a demonstration offers playback only and cannot turn into an experiment', async () => {
    // ⚠️ Mudou de propósito (lote 2 do Raio-X): "Observar", "Um passo", "Próxima etapa" e "Rever
    // desde o começo" viraram UM botão principal que muda com o estado.
    menosMovimento()
    const relogio = relogioManual()
    renderMission('hitbox', 'demonstration')
    expect(screen.queryByRole('slider')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Eu quero experimentar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Uma pista' })).toBeNull()
    expect(screen.queryByText('Arraste o cacto. Ou use o controle de distância abaixo.')).toBeNull()
    for (const saiu of ['Um passo', 'Próxima etapa', 'Rever desde o começo', 'Observar'])
      expect(screen.queryByRole('button', { name: saiu })).toBeNull()
    try {
      fireEvent.click(await screen.findByRole('button', { name: 'Ver a parte 1' }))
      // ⚠️ Mudou de propósito (consertos do review do lote 2): com menos movimento a parte TOCA
      // (passos de 0,2 s), e o principal pausa enquanto ela toca.
      expect(await screen.findByRole('button', { name: 'Pausar' })).toBeTruthy()
      for (let i = 0; i < 40 && screen.queryByRole('button', { name: 'Pausar' }); i++)
        await relogio.tocar(12)
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Ver a parte 2' })).toBeTruthy(),
      )
      // ⚠️ E ainda não é a vez dela: "Agora é sua vez" só existe no fim.
      expect(screen.queryByRole('button', { name: 'Agora é sua vez' })).toBeNull()
    } finally {
      relogio.restaurar()
    }
  })
  test('connection can be cancelled with Escape and completed with two activations', () => {
    let connected = false
    render(
      <ExperienceConnection
        source="Som"
        target="Pulou"
        alternative="Desligar"
        enabled={false}
        onConnect={(value) => {
          connected = value
        }}
      />,
    )
    const source = screen.getByRole('button', { name: '◉ Som' })
    fireEvent.click(source)
    fireEvent.keyDown(source, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: '◎ Pulou' }))
    expect(connected).toBe(false)
    fireEvent.click(source)
    fireEvent.click(screen.getByRole('button', { name: '◎ Pulou' }))
    expect(connected).toBe(true)
  })
})

test('⚠️ a demonstração assistida até o fim REGISTRA a tentativa no servidor', async () => {
  // O portão do registro perguntava ao avaliador da EXPERIMENTAÇÃO, que cobra as metas da cena.
  // Em `jump-sound` o roteiro do modelo termina SEM fechar as metas: a criança via "Demonstração
  // concluída", nenhuma tentativa subia, e o bloco ficava para sempre em "Guardando…".
  const activity = { type: 'demonstration', scene: 'jump-sound' } as const
  const start = sceneStart(activity)
  const script = sceneScript(activity)
  let checkpoint: SceneCheckpoint<DemonstrationSession> | null = null
  const rotas: string[] = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    rotas.push(url.split('/').at(-1) ?? '')
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {}
    const segment = readSceneSegment(body.answers)
    if (segment) checkpoint = applyDemonstrationSegment(start, script, checkpoint, segment)
    const answers = {
      sceneSequence: checkpoint?.sequence ?? 0,
      sceneSessionId: checkpoint?.sessionId ?? '',
      sceneSegmentId: checkpoint?.segmentId ?? '',
      sceneCheckpoint: checkpoint ? packDemonstration('jump-sound', checkpoint.session) : [],
    }
    const progress = {
      blockId: 'scene',
      revision: 'revision',
      answers,
      hintsUsed: 0,
      positionSeconds: null,
      attemptsCount: 0,
      result: null,
      updatedAt: new Date().toISOString(),
    }
    if (url.endsWith('/learning-attempts'))
      return Response.json({
        attempt: { result: { participated: true, passed: true, feedback: 'ok' } },
        progress,
      })
    return Response.json(progress)
  }) as unknown as typeof fetch
  // ⚠️ Mudou de propósito (lote 2): sem "Um passo", o caminho é o botão principal. ⚠️ E desde os
  // consertos do review do lote 2 a parte TOCA também com menos movimento: o relógio vai na mão.
  // ANTES de montar: o player lê ao montar.
  menosMovimento()
  const relogio = relogioManual()
  try {
    render(
      <LessonPlayerProvider
        value={{
          lessonId: 'lesson',
          courseSlug: 'course',
          viewerId: 'child',
          viewerWatermark: null,
          initialPositionSeconds: null,
        }}
      >
        <InteractiveLessonBlock
          block={{
            id: 'scene',
            blockRevision: 'revision',
            kind: 'interactive',
            sortOrder: 0,
            content: {
              kind: 'interactive',
              title: SCENE_MODELS['jump-sound'].title,
              instructions: SCENE_MODELS['jump-sound'].instruction,
              hints: [],
              required: false,
              activity,
            },
          }}
        />
      </LessonPlayerProvider>,
    )
    const principal = () =>
      screen.getByRole('button', { name: /^Ver a parte|^Ver tudo de novo|^Pausar/ })
    await waitFor(() => expect(principal().getAttribute('aria-disabled')).toBeNull())
    for (let i = 0; i < 60 && !rotas.some((r) => r === 'learning-attempts'); i++) {
      if (principal().textContent !== 'Pausar')
        await act(async () => {
          fireEvent.click(principal())
        })
      await relogio.tocar(12)
    }
    await waitFor(() => expect(rotas).toContain('learning-attempts'), { timeout: 5000 })
  } finally {
    relogio.restaurar()
    globalThis.fetch = originalFetch
    localStorage.clear()
  }
})
