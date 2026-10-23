'use client'

import {
  readStudioProjectExamples,
  type StudioProjectExampleChange,
  type StudioProjectExampleRole,
} from '@sistemazero/core/learning'
import type { EditableStudioProject, StudioHandle } from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import { Select } from '@sistemazero/ui/select'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useConfirm } from '@/components/admin/use-confirm'
import { StudioEmbed } from '@/components/studio/studio-embed'
import type { StudioAuthoringRuntimeScope } from '@/components/studio/use-studio-authoring-runtime'
import type { StudioBlock } from '@/lib/types'

const labels = { entry: 'Entrada para ensaio', solution: 'Uma solução possível' }

/** A single working editor; immutable examples are saved by the canonical draft command. */
export function SectionProjectExamples({
  workspace,
  blockId,
  sectionId,
  canWrite,
  canCapture,
  runtimeScope,
  onChange,
  registerCapture,
  onEditingChange,
}: {
  workspace: StudioBlock
  blockId: string
  sectionId: string
  canWrite: boolean
  canCapture?: () => boolean
  runtimeScope?: StudioAuthoringRuntimeScope
  onChange: (change: StudioProjectExampleChange, immediate?: boolean) => boolean
  registerCapture?: (capture: () => Promise<void>) => () => void
  onEditingChange?: (editing: boolean) => void
}) {
  const registry = useMemo(
    () => readStudioProjectExamples(workspace.projectExamples),
    [workspace.projectExamples],
  )
  const [editing, setEditing] = useState<{
    role: StudioProjectExampleRole
    seed: EditableStudioProject
    generation: number
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { confirm, confirmDialog } = useConfirm()
  const handle = useRef<StudioHandle | null>(null)
  const latest = useRef({ workspace, canWrite, canCapture, onChange, editing })
  latest.current = { workspace, canWrite, canCapture, onChange, editing }
  const opening = useRef(0)
  const lastCaptured = useRef('')

  const captureProject = useCallback(
    (project: EditableStudioProject, owner: NonNullable<typeof editing>) => {
      if (
        !(latest.current.canCapture?.() ?? latest.current.canWrite) ||
        latest.current.editing !== owner ||
        opening.current !== owner.generation
      )
        throw new Error('A abertura do exemplo mudou. O projeto anterior foi preservado.')
      const bytes = JSON.stringify(project)
      if (bytes === lastCaptured.current) return
      if (
        latest.current.onChange(
          {
            type: 'studio-example',
            blockId,
            sectionId,
            role: owner.role,
            action: { type: 'save', exampleId: crypto.randomUUID(), project },
          },
          true,
        ) !== true
      )
        throw new Error('O rascunho não aceitou este exemplo. O editor continua aberto.')
      if (latest.current.editing !== owner)
        throw new Error('A abertura do exemplo mudou durante a captura.')
      lastCaptured.current = bytes
    },
    [blockId, sectionId],
  )

  const capture = useCallback(async () => {
    const owner = latest.current.editing
    if (!owner) return
    const generation = opening.current
    const assertCurrent = () => {
      if (
        !(latest.current.canCapture?.() ?? latest.current.canWrite) ||
        latest.current.editing !== owner ||
        opening.current !== generation
      )
        throw new Error(
          'A abertura do exemplo mudou. Seus dados não foram aplicados a outra parte.',
        )
    }
    assertCurrent()
    if (!handle.current) throw new Error('Aguarde o Estúdio carregar antes de salvar o exemplo.')
    await handle.current.save()
    assertCurrent()
    const project = handle.current?.getProject()
    if (!project) throw new Error('Não foi possível capturar o projeto deste exemplo.')
    captureProject(project, owner)
    assertCurrent()
  }, [captureProject])

  useLayoutEffect(() => registerCapture?.(capture), [registerCapture, capture])
  const isEditing = Boolean(editing)
  useLayoutEffect(() => {
    onEditingChange?.(isEditing)
    return () => onEditingChange?.(false)
  }, [isEditing, onEditingChange])
  useLayoutEffect(
    () => () => {
      opening.current++
    },
    [],
  )

  async function edit(role: StudioProjectExampleRole, raw: unknown) {
    const generation = ++opening.current
    setBusy(true)
    setError('')
    try {
      const { prepareEditableStudioProject } = await import(
        '@sistemazero/studio/editable-project-validation'
      )
      const prepared = await prepareEditableStudioProject(raw)
      if (generation !== opening.current || !latest.current.canWrite) return
      if (!prepared) throw new Error('Este projeto não pôde ser aberto no Estúdio.')
      // Stable for the lifetime of this working copy; snapshot IDs never become React keys.
      const seed = { ...prepared, id: crypto.randomUUID() }
      lastCaptured.current = ''
      setEditing({ role, seed, generation })
    } catch (cause) {
      if (generation === opening.current)
        setError(cause instanceof Error ? cause.message : 'Não foi possível abrir o exemplo.')
    } finally {
      if (generation === opening.current) setBusy(false)
    }
  }

  async function save(close = false) {
    const owner = latest.current.editing
    setBusy(true)
    setError('')
    try {
      await capture()
      if (latest.current.editing !== owner || opening.current !== owner?.generation)
        throw new Error('A abertura mudou durante a gravação do exemplo.')
      if (close) {
        opening.current++
        setEditing(null)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o exemplo.')
    } finally {
      setBusy(false)
    }
  }

  function change(role: StudioProjectExampleRole, action: StudioProjectExampleChange['action']) {
    setError('')
    try {
      if (
        !canWrite ||
        onChange({ type: 'studio-example', blockId, sectionId, role, action }, true) !== true
      )
        throw new Error('O rascunho não aceitou a alteração do exemplo.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível alterar o exemplo.')
    }
  }

  if (registry.kind === 'invalid')
    return (
      <p role="alert">Os exemplos desta parte estão inválidos: {registry.issues[0]?.message}</p>
    )
  if (workspace.solutionProject)
    return (
      <p role="alert">
        Converta o gabarito antigo para exemplos por parte antes de editar esta aula.
      </p>
    )
  const examples = registry.kind === 'valid' ? registry.value : null
  const binding = examples?.sections[sectionId]
  return (
    <fieldset className="space-y-3 rounded-lg border border-border p-3">
      <legend className="px-1 font-medium">Exemplos privados desta parte</legend>
      <p className="text-sm text-muted-foreground">
        O projeto inicial continua sendo o da criança. A entrada serve para ensaiar esta parte; a
        solução é uma possibilidade, com cores e detalhes livres.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {editing ? (
        <>
          <h3 className="font-medium">{labels[editing.role]}</h3>
          <StudioEmbed
            key={editing.seed.id}
            initialProject={editing.seed}
            runtimeScope={runtimeScope}
            handleRef={handle}
            editingAccess={canWrite ? 'author' : 'observer'}
            hideKindChooser
            className="h-[32rem]"
            features={{ ai: false, export: true }}
            lessonConfig={{
              level: workspace.level,
              allowedModes: workspace.allowedModes,
              allowBlocks: workspace.allowBlocks,
              allowCategories: workspace.allowCategories,
              allowLevelReveal: workspace.allowLevelReveal,
              pythonLevel: workspace.pythonLevel,
            }}
            onChange={(project) => {
              if (latest.current.editing !== editing || opening.current !== editing.generation)
                return
              try {
                captureProject(project, editing)
                setError('')
              } catch (cause) {
                if (latest.current.editing === editing)
                  setError(
                    cause instanceof Error ? cause.message : 'Não foi possível capturar o exemplo.',
                  )
              }
            }}
          />
          <div className="flex gap-2">
            <Button disabled={!canWrite || busy} onClick={() => void save()}>
              Salvar exemplo
            </Button>
            <Button variant="outline" disabled={!canWrite || busy} onClick={() => void save(true)}>
              Salvar e voltar aos objetivos
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() =>
                confirm({
                  title: 'Fechar a edição deste exemplo?',
                  message:
                    'A última versão capturada no rascunho será mantida. Alterações ainda não capturadas neste editor serão descartadas; você pode baixar uma cópia antes de fechar.',
                  confirmText: 'Fechar sem capturar',
                  onConfirm: () => {
                    if (
                      latest.current.editing !== editing ||
                      opening.current !== editing.generation
                    )
                      return
                    opening.current++
                    setEditing(null)
                    setError('')
                  },
                })
              }
            >
              Fechar sem capturar
            </Button>
          </div>
        </>
      ) : (
        (['entry', 'solution'] as const).map((role) => {
          const id = role === 'entry' ? binding?.entryExampleId : binding?.solutionExampleId
          const project = id ? examples?.examples[id] : undefined
          return (
            <div key={role} className="space-y-2">
              <p className="text-sm font-medium">
                {labels[role]}: {project?.name ?? 'não configurada'}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={!canWrite || busy}
                  onClick={() => void edit(role, project ?? workspace.initialProject)}
                >
                  {project
                    ? `Editar ${labels[role].toLowerCase()}`
                    : `Criar ${labels[role].toLowerCase()}`}
                </Button>
                {id && (
                  <Button
                    variant="ghost"
                    disabled={!canWrite || busy}
                    onClick={() => change(role, { type: 'clear' })}
                  >
                    Remover {labels[role].toLowerCase()}
                  </Button>
                )}
                <Select
                  aria-label={`Usar exemplo existente como ${labels[role].toLowerCase()}`}
                  value=""
                  disabled={!canWrite || busy || !examples}
                  onChange={(event) => {
                    if (event.target.value)
                      change(role, { type: 'reuse', exampleId: event.target.value })
                  }}
                >
                  <option value="">Usar exemplo existente…</option>
                  {Object.entries(examples?.examples ?? {}).map(([exampleId, example]) => (
                    <option key={exampleId} value={exampleId}>
                      {example.name} ({exampleId.slice(0, 8)})
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )
        })
      )}
      {confirmDialog}
    </fieldset>
  )
}
