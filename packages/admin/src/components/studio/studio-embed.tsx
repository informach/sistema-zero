'use client'

import '@sistemazero/studio/styles.css'
import type { Project, StudioFeatures, StudioHandle } from '@sistemazero/studio'
import { Spinner } from '@sistemazero/ui/spinner'
import { type RefObject, useEffect, useState } from 'react'

type StudioComponent = typeof import('@sistemazero/studio')['StudioLesson']

interface Props {
  /** Projeto inicial; ausente → cria um vazio (autoria de bloco novo). */
  initialProject?: Project | null
  /** Nome do projeto vazio criado quando não há `initialProject`. */
  defaultName?: string
  /** Handle imperativo: o pai lê `getProject()` ao salvar / chama `replaceProject()`. */
  handleRef: RefObject<StudioHandle | null>
  features?: StudioFeatures
  /** Altura do container (o Studio preenche 100%). */
  className?: string
}

/**
 * Estúdio embutido no painel (autoria do bloco + inspeção de entrega). Carregado SÓ
 * no client (Monaco/Blockly/IndexedDB não existem no SSR): o import dinâmico roda
 * dentro de um effect. `persistence="none"` — o pai captura via `handleRef.getProject()`.
 */
export function StudioEmbed({
  initialProject,
  defaultName = 'Projeto da aula',
  handleRef,
  features,
  className = 'h-[32rem]',
}: Props) {
  const [StudioLesson, setStudioLesson] = useState<StudioComponent | null>(null)
  const [seed, setSeed] = useState<Project | null>(initialProject ?? null)

  useEffect(() => {
    let active = true
    void (async () => {
      const mod = await import('@sistemazero/studio')
      if (!active) return
      setStudioLesson(() => mod.StudioLesson)
      setSeed(
        (prev) =>
          prev ?? initialProject ?? mod.createEmptyProject(crypto.randomUUID(), defaultName),
      )
    })()
    return () => {
      active = false
    }
  }, [initialProject, defaultName])

  if (!StudioLesson || !seed) {
    return (
      <div className={className}>
        <div className="flex h-full items-center justify-center gap-2 rounded-lg border border-border bg-muted text-sm text-muted-foreground">
          <Spinner /> Carregando o Estúdio...
        </div>
      </div>
    )
  }

  return (
    <div className={`${className} overflow-hidden rounded-lg border border-border bg-muted`}>
      {/* StudioLesson já aplica os defaults restritos (terminal/IA/profissional/
          export OFF); `features` undefined cai neles. */}
      <StudioLesson
        ref={handleRef}
        initialProject={seed}
        persistence="none"
        features={features}
        blockUnloadWhenDirty={false}
      />
    </div>
  )
}
