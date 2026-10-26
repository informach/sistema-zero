'use client'
import { isGallerySubmission } from '@sistemazero/core/learning'
import { sanitizePintaAsset } from '@sistemazero/pinta/assets'
import type { PintaHandle } from '@sistemazero/pinta/lesson'
import type { EditableStudioProject, StudioHandle } from '@sistemazero/studio'
import { prepareEditableStudioProject } from '@sistemazero/studio/editable-project-validation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PintaEmbed } from '@/components/pinta/pinta-embed'
import { GallerySubmissionViewer } from '@/components/professor/gallery-submission-viewer'
import { StudioEmbed } from '@/components/studio/studio-embed'
import { StudioReviewSource } from '@/components/studio/studio-review-source'

/** The server supplies a frozen snapshot; experimenting here never changes the submitted evidence. */
export function MasteryProjectEvidence({
  payload,
  reviewerId,
  submissionId,
}: {
  payload: unknown
  reviewerId: string
  submissionId: string
}) {
  const raw =
    payload && typeof payload === 'object' && 'project' in payload ? payload.project : null
  const pinta = useMemo(() => sanitizePintaAsset(raw), [raw])
  const gallery = isGallerySubmission(raw) ? raw : null
  const studioRef = useRef<StudioHandle | null>(null)
  const pintaRef = useRef<PintaHandle | null>(null)
  const [project, setProject] = useState<EditableStudioProject | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    setProject(null)
    setError(null)
    if (!pinta && !gallery && raw)
      void prepareEditableStudioProject(raw)
        .then((value) => {
          if (active) {
            setProject(value)
            if (!value) setError('Não foi possível abrir esta versão do projeto.')
          }
        })
        .catch(() => {
          if (active) setError('Não foi possível abrir esta versão do projeto.')
        })
    return () => {
      active = false
    }
  }, [raw, pinta, gallery])
  if (gallery)
    return (
      <GallerySubmissionViewer
        snapshot={gallery}
        masteryReviewScope={{ userId: reviewerId, submissionId }}
      />
    )
  if (pinta) return <PintaEmbed initialAsset={pinta} handleRef={pintaRef} className="h-[34rem]" />
  if (project)
    return (
      <>
        <StudioEmbed
          initialProject={project}
          handleRef={studioRef}
          className="h-[34rem]"
          features={{ ai: false, terminal: false }}
          masteryReviewScope={{ userId: reviewerId, submissionId }}
        />
        <StudioReviewSource project={project} />
      </>
    )
  return (
    <p role={error ? 'alert' : 'status'} className="p-6 text-muted-foreground">
      {error ?? 'Abrindo a versão enviada…'}
    </p>
  )
}
