'use client'

import '@sistemazero/studio/styles.css'
import type { Project, StudioFeatures, StudioHandle } from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import { ConfirmDialog } from '@sistemazero/ui/confirm-dialog'
import { Select } from '@sistemazero/ui/select'
import { Spinner } from '@sistemazero/ui/spinner'
import { type RefObject, useEffect, useMemo, useState } from 'react'
import { createAdminProRuntimeAdapter } from '@/lib/studio-pro-authoring'

type StudioComponent = typeof import('@sistemazero/studio')['StudioLesson']
type StudioModule = typeof import('@sistemazero/studio')
type ProjectKindChoice = 'classic' | 'pro'

interface Props {
  /** Projeto inicial; ausente → cria um vazio (autoria de bloco novo). */
  initialProject?: Project | null
  /** Nome do projeto vazio criado quando não há `initialProject`. */
  defaultName?: string
  /** Handle imperativo: o pai lê `getProject()` ao salvar / chama `replaceProject()`. */
  handleRef: RefObject<StudioHandle | null>
  features?: StudioFeatures
  /** Exibe os controles para o autor criar e trocar projetos Pro. */
  professionalAuthoring?: boolean
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
  professionalAuthoring = false,
  className = 'h-[32rem]',
}: Props) {
  const [studioModule, setStudioModule] = useState<StudioModule | null>(null)
  const [seed, setSeed] = useState<Project | null>(initialProject ?? null)
  const [templateId, setTemplateId] = useState(initialProject?.proMeta?.templateId ?? 'vanilla-js')
  const [pendingKind, setPendingKind] = useState<ProjectKindChoice | null>(null)
  const proRuntime = useMemo(() => createAdminProRuntimeAdapter(), [])
  const StudioLesson: StudioComponent | null = studioModule?.StudioLesson ?? null

  useEffect(() => {
    let active = true
    void (async () => {
      const mod = await import('@sistemazero/studio')
      if (!active) return
      setStudioModule(mod)
      setTemplateId((current) =>
        mod.listProTemplates().some((template) => template.id === current) ? current : 'vanilla-js',
      )
      setSeed(
        (prev) =>
          prev ?? initialProject ?? mod.createEmptyProject(crypto.randomUUID(), defaultName),
      )
    })()
    return () => {
      active = false
    }
  }, [initialProject, defaultName])

  function replaceProject(kind: ProjectKindChoice) {
    if (!studioModule || !seed) return
    const next =
      kind === 'pro'
        ? studioModule.createProProject(seed.id, seed.name, templateId)
        : studioModule.createEmptyProject(seed.id, seed.name)
    setSeed(next)
    handleRef.current?.replaceProject(next)
    setPendingKind(null)
  }

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
    <div
      className={`${className} flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-muted`}
    >
      {professionalAuthoring && studioModule ? (
        <div className="flex flex-wrap items-end gap-3 border-border border-b bg-background p-3">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={seed.kind !== 'pro' ? 'default' : 'outline'}
              onClick={() => seed.kind === 'pro' && setPendingKind('classic')}
            >
              Projeto em blocos
            </Button>
            <Button
              type="button"
              size="sm"
              variant={seed.kind === 'pro' ? 'default' : 'outline'}
              onClick={() => seed.kind !== 'pro' && setPendingKind('pro')}
            >
              Projeto Pro
            </Button>
          </div>
          <label className="flex min-w-64 flex-1 flex-col gap-1 font-medium text-xs">
            Modelo Pro
            <Select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
              {studioModule.listProTemplates().map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </Select>
          </label>
          {seed.kind === 'pro' && seed.proMeta?.templateId !== templateId ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setPendingKind('pro')}>
              Aplicar este modelo
            </Button>
          ) : null}
          <p className="w-full text-muted-foreground text-xs">
            O preview Pro é compilado no ambiente seguro da plataforma, igual ao que a criança usa
            na aula.
          </p>
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        <StudioLesson
          ref={handleRef}
          initialProject={seed}
          persistence="none"
          features={{
            ...features,
            ...(seed.kind === 'pro' ? { professional: true, terminal: false } : {}),
          }}
          proRuntime={seed.kind === 'pro' ? proRuntime : undefined}
          blockUnloadWhenDirty={false}
        />
      </div>
      <ConfirmDialog
        open={pendingKind !== null}
        onClose={() => setPendingKind(null)}
        title="Trocar o tipo do projeto?"
        message="O projeto inicial atual será substituído por um projeto novo. Esta troca não pode ser desfeita depois que o bloco for salvo."
        confirmText="Trocar projeto"
        onConfirm={() => {
          if (pendingKind) replaceProject(pendingKind)
        }}
      />
    </div>
  )
}
