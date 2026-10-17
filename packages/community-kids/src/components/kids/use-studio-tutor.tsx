'use client'

import type { AiCreditsView } from '@sistemazero/core/ai-credits'
import { PrivateZappyVoice } from '@sistemazero/member-shell/components/private-zappy-voice'
import { VoiceInputButton } from '@sistemazero/member-shell/components/voice-input/voice-input-button'
import { createStudioZappyAdapter } from '@sistemazero/member-shell/lib/studio-zappy-adapter'
import type { StudioTutorConfig } from '@sistemazero/studio'
import { useMemo, useRef } from 'react'
import { openStudioZappyHelp, openStudioZappyLesson } from '../../lib/studio-zappy-navigation'

export interface KidsStudioTutorOptions {
  viewerId: string | null
  zappyEnabled: boolean
  aiCredits: AiCreditsView | null
  narrationEnabled: boolean
  voiceInputEnabled: boolean
  taskId: string | null
}

/** StudioCore keeps the adapter; resolve the current mission at request time. */
export function useKidsStudioTutor({
  viewerId,
  zappyEnabled,
  aiCredits,
  narrationEnabled,
  voiceInputEnabled,
  taskId,
}: KidsStudioTutorOptions) {
  const task = useRef(taskId)
  task.current = taskId
  return useMemo<StudioTutorConfig | undefined>(
    () =>
      zappyEnabled
        ? {
            adapter: createStudioZappyAdapter(undefined, { pensaMissionId: () => task.current }),
            renderListen:
              narrationEnabled && viewerId
                ? (projectId, messageId) => (
                    <PrivateZappyVoice
                      viewerId={viewerId}
                      reference={{ origin: 'studio_message', projectId, messageId }}
                    />
                  )
                : undefined,
            renderVoiceInput:
              voiceInputEnabled && viewerId
                ? (input) => (
                    <VoiceInputButton
                      {...input}
                      viewerId={viewerId}
                      context="Estúdio: dúvida para o Zappy"
                      maxLength={1000}
                      preserveOverflow
                      onSpoken={() => {}}
                    />
                  )
                : undefined,
            openLesson: openStudioZappyLesson,
            openHelp: openStudioZappyHelp,
            cooldownMs: 1_500,
            credits: aiCredits,
          }
        : undefined,
    [viewerId, zappyEnabled, aiCredits, narrationEnabled, voiceInputEnabled],
  )
}
