import { describe, expect, test } from 'bun:test'
import {
  evaluateLearning,
  type InteractiveBlock,
  publicInteractiveBlock,
} from '@sistemazero/core/learning'
import {
  applyExperimentSegment,
  type ExperimentSession,
  packExperiment,
  readSceneSegment,
  SCENE_MODELS,
  SCENE_QUESTIONS,
  type SceneCheckpoint,
  sceneStart,
} from '@sistemazero/core/learning/scene'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import { LessonPlayerProvider } from '@sistemazero/member-shell/components/lesson-player-context'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

/**
 * ⚠️⚠️ O que o player faz quando o servidor RECUSA o que ele produz (full review final de dados e
 * deploy, MÉDIO-1). Um 400 numa gravação de cena não é falha de rede: tentar de novo não resolve, e
 * "Sem internet… a gente guarda quando voltar" prometia o que nunca acontece.
 * Relatório: `tmp/storyboard/implementacao/consertos-full-dados.md`.
 *
 * ⚠️ O `test-setup.ts` só devolve os globais da JANELA: cada teste aqui restaura o `fetch` no `finally`.
 */

const mundo: InteractiveBlock = {
  kind: 'interactive',
  title: SCENE_MODELS.world.title,
  instructions: SCENE_MODELS.world.instruction,
  hints: [],
  required: true,
  activity: { type: 'experimentation', scene: 'world' },
  prediction: SCENE_QUESTIONS.world.prediction,
}

/**
 * Um members em miniatura. `recusa`: a tentativa volta `passed:false` (a cena não fechou lá).
 * `statusDoSegmento`: a gravação do segmento responde com esse erro.
 */
function servidor({
  recusa = false,
  statusDoSegmento,
}: {
  recusa?: boolean
  statusDoSegmento?: number
} = {}) {
  const start = sceneStart(mundo.activity as { type: 'experimentation'; scene: 'world' })
  let checkpoint: SceneCheckpoint<ExperimentSession> | null = null
  const tentativas: Record<string, unknown>[] = []
  const answers = () => ({
    sceneSequence: checkpoint?.sequence ?? 0,
    sceneSessionId: checkpoint?.sessionId ?? '',
    sceneSegmentId: checkpoint?.segmentId ?? '',
    sceneCheckpoint: checkpoint ? packExperiment('world', checkpoint.session) : [],
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
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {}
    if (url.endsWith('/learning-progress')) {
      if (statusDoSegmento)
        return Response.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Comando inválido.' } },
          { status: statusDoSegmento },
        )
      const segment = readSceneSegment(body.answers)
      if (segment) checkpoint = applyExperimentSegment(start, checkpoint, segment)
      return Response.json(progresso())
    }
    tentativas.push(body)
    const enviadas = body.answers as Record<string, unknown>
    const avaliado = evaluateLearning(mundo, {
      ...answers(),
      ...(typeof enviadas.checkpoint === 'string' ? { checkpoint: enviadas.checkpoint } : {}),
    })
    const result = recusa
      ? { ...avaliado, passed: false, feedback: 'Ainda falta: uma meta de outra versão.' }
      : avaliado
    return Response.json({ attempt: { result }, progress: progresso(result) })
  }) as unknown as typeof fetch
  return { tentativas, restaurar: () => (globalThis.fetch = original) }
}

/** ⚠️ Um perfil por teste: o rascunho local e a aba da cena são por perfil, aula e bloco. */
function aluno(viewerId: string) {
  return render(
    <LessonPlayerProvider
      value={{
        lessonId: 'aula',
        courseSlug: 'curso',
        viewerId,
        viewerWatermark: null,
        initialPositionSeconds: null,
      }}
    >
      <InteractiveLessonBlock
        block={{
          id: 'bloco',
          blockRevision: 'rev',
          kind: 'interactive',
          sortOrder: 0,
          content: publicInteractiveBlock(mundo),
        }}
      />
    </LessonPlayerProvider>,
  )
}

async function concluirEResponder(certa: boolean) {
  fireEvent.click(
    await screen.findByRole('button', {
      name: SCENE_QUESTIONS.world.prediction.choices[0]?.label as string,
    }),
  )
  fireEvent.click(await screen.findByRole('button', { name: 'Criar o Dino' }))
  fireEvent.click(screen.getByRole('button', { name: 'Mostrar o Dino na tela' }))
  await waitFor(() => expect(screen.getByText('Agora explique')).toBeTruthy(), { timeout: 5000 })
  const explicar = SCENE_QUESTIONS.world.explain
  fireEvent.click(
    screen.getByRole('button', {
      name: explicar.choices.find((c) => (c.id === explicar.correctChoiceId) === certa)
        ?.label as string,
    }),
  )
}

describe('⚠️⚠️ MÉDIO-1: o player não fica prometendo uma gravação que o servidor recusou', () => {
  test('a resposta ERRADA continua sendo da criança: "Ainda não é essa", sem recado de erro', async () => {
    const { restaurar } = servidor()
    try {
      aluno('crianca-2')
      await concluirEResponder(false)
      await waitFor(() => expect(screen.getByText(/Ainda não é essa/)).toBeTruthy(), {
        timeout: 5000,
      })
      expect(screen.queryByText('Esta atividade mudou.')).toBeNull()
      expect(screen.getByText('Agora explique')).toBeTruthy()
    } finally {
      restaurar()
    }
  })

  test('⚠️⚠️ o segmento recusado com 400 não é "Sem internet": a saída é o "Abrir de novo"', async () => {
    const { restaurar } = servidor({ statusDoSegmento: 400 })
    try {
      aluno('crianca-3')
      fireEvent.click(
        await screen.findByRole('button', {
          name: SCENE_QUESTIONS.world.prediction.choices[0]?.label as string,
        }),
      )
      fireEvent.click(await screen.findByRole('button', { name: 'Criar o Dino' }))
      await waitFor(
        () => expect(screen.getByRole('alert').textContent).toBe('Esta atividade mudou.'),
        {
          timeout: 5000,
        },
      )
      expect(screen.getByRole('button', { name: 'Abrir de novo' })).toBeTruthy()
      expect(screen.queryByText(/Sem internet/)).toBeNull()
    } finally {
      restaurar()
    }
  })

  test('BAIXO-6: o 409 diz que a atividade mudou OU está aberta em outro lugar', async () => {
    const { restaurar } = servidor({ statusDoSegmento: 409 })
    try {
      aluno('crianca-4')
      fireEvent.click(
        await screen.findByRole('button', {
          name: SCENE_QUESTIONS.world.prediction.choices[0]?.label as string,
        }),
      )
      fireEvent.click(await screen.findByRole('button', { name: 'Criar o Dino' }))
      await waitFor(
        () =>
          expect(screen.getByRole('alert').textContent).toBe(
            'Esta atividade mudou ou está aberta em outro lugar.',
          ),
        { timeout: 5000 },
      )
      expect(screen.getByRole('button', { name: 'Abrir de novo' })).toBeTruthy()
    } finally {
      restaurar()
    }
  })
})
