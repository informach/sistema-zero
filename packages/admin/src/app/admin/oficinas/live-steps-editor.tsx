'use client'
import { isInteractiveBlock, isLearningManifest } from '@sistemazero/core/learning'
import type { LiveLearningStep } from '@sistemazero/core/live'
import { Button, Input, Textarea } from '@sistemazero/ui'
import dynamic from 'next/dynamic'
import { useEffect, useId, useState } from 'react'
import { useConfirm } from '@/components/admin/use-confirm'
import { EMPTY_LEARNING } from '@/components/editor/learning-builder'

const LearningBuilder = dynamic(() =>
  import('@/components/editor/learning-builder').then((module) => module.LearningBuilder),
)
/** O teto do members para a orientação de cada etapa (acima disso o roteiro inteiro é recusado). */
export const STEP_INSTRUCTIONS_MAX = 10_000

const freshStep = (): LiveLearningStep => ({
  id: crypto.randomUUID(),
  title: '',
  instructions: '',
  blocks: [],
})

export function LiveStepsEditor({
  value = [],
  onChange,
  disabled,
}: {
  value?: LiveLearningStep[]
  onChange(value: LiveLearningStep[]): void
  disabled: boolean
}) {
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  // Etapa nova nasce ABERTA e com o foco no nome: antes ela entrava fechada no fim da lista.
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set())
  const [focusStep, setFocusStep] = useState<string | null>(null)
  const { confirm, confirmDialog } = useConfirm()
  const idPrefix = useId()
  const titleId = (stepId: string) => `${idPrefix}-step-${stepId}`
  useEffect(() => {
    if (!focusStep) return
    document.getElementById(`${idPrefix}-step-${focusStep}`)?.focus()
    setFocusStep(null)
  }, [focusStep, idPrefix])
  const patch = (id: string, update: Partial<LiveLearningStep>) =>
    onChange(value.map((step) => (step.id === id ? { ...step, ...update } : step)))
  async function importManifest(file: File) {
    setError(null)
    setNotice(null)
    try {
      if (file.size > 1_900_000) throw new Error('O arquivo deve ter até 1,9 MB.')
      const document: unknown = JSON.parse(await file.text())
      if (!isLearningManifest(document))
        throw new Error('Use o manifesto de aula exportado pelo editor do Sistema Zero.')
      const imported: LiveLearningStep[] = document.sections.flatMap((section) => {
        const blocks = section.blockKeys.flatMap((key) => {
          const block = document.blocks.find((item) => item.key === key)
          return block && 'content' in block && isInteractiveBlock(block.content)
            ? [
                {
                  id: crypto.randomUUID(),
                  revision: crypto.randomUUID(),
                  content: structuredClone(block.content),
                },
              ]
            : []
        })
        return blocks.length
          ? [
              {
                id: crypto.randomUUID(),
                title: section.title,
                instructions: section.objective,
                blocks,
              },
            ]
          : []
      })
      if (!imported.length)
        throw new Error('Este manifesto não contém atividades interativas para copiar.')
      const combined = [...value, ...imported]
      if (
        combined.length > 24 ||
        combined.some((step) => step.blocks.length > 12) ||
        combined.flatMap((step) => step.blocks).length > 48
      )
        throw new Error(
          'Use até 24 etapas, 12 atividades por etapa e 48 atividades neste encontro.',
        )
      onChange(combined)
      setNotice(
        `${imported.flatMap((step) => step.blocks).length} atividades copiadas. Confira o roteiro e salve. Vídeos, materiais e o projeto do Estúdio são configurados nas seções próprias desta oficina.`,
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível importar.')
    }
  }
  return (
    <div className="space-y-4 rounded-xl border p-4">
      <h3 className="font-semibold">Etapas e atividades</h3>
      <p className="text-sm text-muted-foreground">
        Use as mesmas experimentações, experiências em HTML e jogos prontos das aulas gravadas. Cada
        turma guarda uma cópia deste roteiro.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm">
          {notice}
        </p>
      ) : null}
      {value.map((step, index) => (
        <details
          key={step.id}
          className="rounded-lg border p-3"
          open={opened.has(step.id) || undefined}
        >
          <summary className="cursor-pointer font-medium">
            {index + 1}. {step.title || 'Nova etapa'}
          </summary>
          <div className="mt-4 space-y-4">
            <label className="grid gap-2 text-sm font-medium">
              Nome da etapa
              <Input
                id={titleId(step.id)}
                value={step.title}
                maxLength={160}
                required
                disabled={disabled}
                onChange={(event) => patch(step.id, { title: event.target.value })}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Orientação
              <Textarea
                value={step.instructions}
                maxLength={STEP_INSTRUCTIONS_MAX}
                disabled={disabled}
                onChange={(event) => patch(step.id, { instructions: event.target.value })}
              />
              <span className="text-xs font-normal text-muted-foreground">
                {step.instructions.length.toLocaleString('pt-BR')} de{' '}
                {STEP_INSTRUCTIONS_MAX.toLocaleString('pt-BR')} caracteres
              </span>
            </label>
            {step.blocks.map((block) => (
              <details key={block.id} className="rounded-lg border p-3">
                <summary className="cursor-pointer font-medium">{block.content.title}</summary>
                <fieldset disabled={disabled} className="mt-4 space-y-3">
                  <LearningBuilder
                    kids
                    value={block.content}
                    onChange={(content) =>
                      patch(step.id, {
                        blocks: step.blocks.map((item) =>
                          item.id === block.id
                            ? { ...item, content, revision: crypto.randomUUID() }
                            : item,
                        ),
                      })
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      confirm({
                        title: 'Remover esta atividade?',
                        message: `"${block.content.title || 'Atividade sem nome'}" sai da etapa ${index + 1}. A mudança só vale depois que você salvar o roteiro.`,
                        confirmText: 'Remover atividade',
                        confirmVariant: 'destructive',
                        onConfirm: () =>
                          patch(step.id, {
                            blocks: step.blocks.filter((item) => item.id !== block.id),
                          }),
                      })
                    }
                  >
                    Remover atividade
                  </Button>
                </fieldset>
              </details>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={
                  disabled ||
                  step.blocks.length >= 12 ||
                  value.flatMap((item) => item.blocks).length >= 48
                }
                onClick={() =>
                  patch(step.id, {
                    blocks: [
                      ...step.blocks,
                      {
                        id: crypto.randomUUID(),
                        revision: crypto.randomUUID(),
                        content: structuredClone(EMPTY_LEARNING),
                      },
                    ],
                  })
                }
              >
                Adicionar atividade
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={disabled || index === 0}
                onClick={() => {
                  const next = [...value]
                  ;[next[index - 1], next[index]] = [next[index]!, next[index - 1]!]
                  onChange(next)
                }}
              >
                Mover para cima
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={() =>
                  confirm({
                    title: 'Remover esta etapa?',
                    message: `A etapa ${index + 1}${step.title ? ` (${step.title})` : ''} sai do roteiro com ${step.blocks.length} atividade(s). A mudança só vale depois que você salvar o roteiro.`,
                    confirmText: 'Remover etapa',
                    confirmVariant: 'destructive',
                    onConfirm: () => onChange(value.filter((item) => item.id !== step.id)),
                  })
                }
              >
                Remover etapa
              </Button>
            </div>
          </div>
        </details>
      ))}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || value.length >= 24}
          onClick={() => {
            const step = freshStep()
            onChange([...value, step])
            setOpened((previous) => new Set(previous).add(step.id))
            setFocusStep(step.id)
          }}
        >
          Adicionar etapa
        </Button>
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border px-3 text-sm font-medium">
          Copiar atividades de uma aula
          <input
            className="sr-only"
            type="file"
            accept=".json,application/json"
            disabled={disabled}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              if (file) void importManifest(file)
              event.currentTarget.value = ''
            }}
          />
        </label>
      </div>
      {confirmDialog}
    </div>
  )
}
