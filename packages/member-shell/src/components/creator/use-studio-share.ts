'use client'

import { dataUrlBase64ToBlob } from '@sistemazero/member-shell/lib/data-url'
import { sessionFetch as fetch } from '@sistemazero/member-shell/lib/session-fetch'
import { showcaseErrorMessage } from '@sistemazero/member-shell/lib/showcase-failure'
import { studioDescriptionInput } from '@sistemazero/member-shell/lib/studio-description-input'
import {
  createStudioPublicationAdapter,
  createStudioShareStatus,
} from '@sistemazero/member-shell/lib/studio-publication-adapter'
import type { EditableStudioProject, StudioShareAdapter } from '@sistemazero/studio'
import { projectPublicationId } from '@sistemazero/studio/project-publication'
import { useMemo } from 'react'

/** Formato de id que o hub aceita como identidade do projeto. */
const PROJECT_ID = /^[A-Za-z0-9_-]{1,128}$/
/** O link local de uma publicação antiga (Pro/Python) para o hub adotar o post de antes. */
function adoptPlayId(project: EditableStudioProject): { adoptPlayId?: string } {
  const playId = projectPublicationId(project)
  return playId ? { adoptPlayId: playId } : {}
}

/** The same publication contract for the classic and Pro Kids hosts. */
export function useStudioShare(
  challenge: { key: string; title: string } | null,
  descriptionAiEnabled = true,
) {
  const adapter = useMemo<StudioShareAdapter>(
    () => ({
      proVerifiedCover: true,
      publication: createStudioPublicationAdapter(),
      // Republicar o mesmo projeto ATUALIZA o post; "Publicar como jogo novo" fica escondido.
      status: createStudioShareStatus((project) =>
        PROJECT_ID.test(project.id)
          ? {
              kind: 'free',
              projectId: project.id,
              ...adoptPlayId(project as EditableStudioProject),
            }
          : null,
      ),
      allowNewPost: true,
      // Desafio do mês: liga o checkbox no ShareDialog (posse checada na página).
      ...(challenge ? { challenge } : {}),
      async generateDescription({ project, title }) {
        try {
          const res = await fetch('/api/studio/describe', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(studioDescriptionInput(project, title)),
          })
          if (!res.ok) return ''
          const body = (await res.json()) as {
            description?: string
            quotaExceeded?: boolean
            scope?: 'day' | 'month'
          }
          // Teto de IA da conta atingido → o ShareDialog esconde o "Gerar" e cai
          // no modo manual (o throw com code é duck-typed lá).
          if (body.quotaExceeded) {
            // ⚠️ O `scope` PRECISA viajar: sem ele o dialog dizia "a ajuda de HOJE
            // acabou" mesmo quando o teto estourado era o do MÊS, mandando a
            // criança voltar amanhã para nada.
            throw Object.assign(new Error('créditos esgotados'), {
              code: 'AI_QUOTA_EXCEEDED' as const,
              scope: body.scope,
            })
          }
          return body.description ?? ''
        } catch (error) {
          if ((error as { code?: string })?.code === 'AI_QUOTA_EXCEEDED') throw error
          return '' // fail-soft: a criança escreve do zero
        }
      },
      async publish({
        project,
        coverDataUrl,
        title,
        description,
        challengeKey,
        requestId,
        asNewPost,
      }) {
        const form = new FormData()
        if (asNewPost) form.set('asNewPost', '1')
        const adopt = adoptPlayId(project).adoptPlayId
        if (adopt) form.set('adoptPlayId', adopt)
        form.set('title', title)
        form.set('description', description)
        form.set('clientIdempotencyKey', requestId ?? crypto.randomUUID())
        // Tag do desafio (checkbox marcado) — o hub valida posse+mês (drop silencioso).
        if (challengeKey) form.set('challengeKey', challengeKey)
        form.set(
          'project',
          new File([JSON.stringify(project)], 'project.json', { type: 'application/json' }),
        )
        if (coverDataUrl) {
          // ⚠️ NÃO usar fetch(data:) — a CSP (connect-src) bloqueia → "Failed to fetch".
          const blob = dataUrlBase64ToBlob(coverDataUrl)
          form.set('cover', new File([blob], 'cover', { type: blob.type || 'image/png' }))
        }
        const res = await fetch('/api/studio/publish-standalone', { method: 'POST', body: form })
        const body = (await res.json().catch(() => null)) as {
          muralUrl?: string
          playUrl?: string
          publicationId?: string
          updated?: boolean
        } | null
        if (!res.ok) throw new Error(showcaseErrorMessage(body))
        return {
          muralUrl: body?.muralUrl,
          playUrl: body?.playUrl,
          publicationId: body?.publicationId,
          ...(body?.updated ? { updated: true } : {}),
        }
      },
    }),
    [challenge],
  )
  return useMemo(
    () => (descriptionAiEnabled ? adapter : { ...adapter, generateDescription: undefined }),
    [adapter, descriptionAiEnabled],
  )
}
