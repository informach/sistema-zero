'use client'

import type { EditableStudioProject, StudioRuntimeEnvironment } from '@sistemazero/studio'
import { useEffect, useState } from 'react'
import { apiSend } from '../../lib/api'

function message(error: unknown) {
  return error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
    ? error.message
    : 'Não foi possível preparar o ambiente Python. Seu rascunho continua guardado.'
}

/**
 * O ambiente Python do Estúdio de desafio do jogo (C02b). Cada análise e execução pede a decisão
 * ao serviço do jogo, que confere o desafio aberto, e ao Members, que confere o projeto contra o
 * inicial. Não usa o Estúdio livre: o desafio não depende do Estúdio Completo.
 */
export function useArquipelagoChallengeRuntime(input: {
  project: EditableStudioProject | null
  userId: string
  audience: 'kids' | 'adult'
  desafioId: string
  revisao: number
}) {
  const { project, userId, audience, desafioId, revisao } = input
  const [attempt, setAttempt] = useState(0)
  const key = `${userId}:${audience}:${desafioId}:${revisao}:${attempt}`
  const [state, setState] = useState<{
    key: string
    project: EditableStudioProject
    environment?: StudioRuntimeEnvironment
    error?: string
  } | null>(null)
  useEffect(() => {
    if (project?.programmingLanguage !== 'python') return
    const controller = new AbortController()
    let releaseAuthority: (() => void) | undefined
    void import('@sistemazero/studio/challenge-runtime')
      .then(({ createArquipelagoChallengeRuntimeEnvironment }) =>
        createArquipelagoChallengeRuntimeEnvironment({
          project,
          userId,
          context: { audience, desafioId, revisao, projectId: project.id },
          signal: controller.signal,
          request: (pedido, signal) =>
            apiSend(
              `/api/arquipelago/desafios/${encodeURIComponent(desafioId)}/ambiente`,
              'POST',
              { revisao, pedido },
              undefined,
              { signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]) },
            ),
        }),
      )
      .then((environment) => {
        if (controller.signal.aborted) return
        const lost = () => {
          if (!controller.signal.aborted)
            setState({
              key,
              project,
              error: 'O desafio mudou ou seu acesso mudou. Seu rascunho continua guardado.',
            })
        }
        environment.signal?.addEventListener('abort', lost, { once: true })
        releaseAuthority = () => environment.signal?.removeEventListener('abort', lost)
        if (environment.signal?.aborted) lost()
        else setState({ key, project, environment })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ key, project, error: message(error) })
      })
    return () => {
      releaseAuthority?.()
      controller.abort()
    }
  }, [project, userId, audience, desafioId, revisao, key])
  const current = state?.key === key && state.project === project ? state : null
  return {
    environment: current?.environment,
    error: current?.error,
    loading: project?.programmingLanguage === 'python' && !current,
    retry: () => setAttempt((value) => value + 1),
  }
}
