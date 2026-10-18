'use client'

import '@sistemazero/studio/styles.css'
import type { EditableStudioProject, StudioFeatures, StudioHandle } from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import { ConfirmDialog } from '@sistemazero/ui/confirm-dialog'
import { Select } from '@sistemazero/ui/select'
import { Spinner } from '@sistemazero/ui/spinner'
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react'
import {
  type PreparedStudioAuthoringOptions,
  studioAuthoringChoiceKey,
  studioAuthoringChoices,
  studioAuthoringTemplate,
} from '../../lib/studio-authoring-options'
import {
  createStudioAuthoringProject,
  resolveStudioAuthoringSelection,
} from '../../lib/studio-authoring-project'
import { createAdminProRuntimeAdapter } from '../../lib/studio-pro-authoring'
import { loadStudioEmbedModule } from './studio-embed-loader'
import {
  type StudioAuthoringRuntimeScope,
  useStudioAuthoringRuntime,
} from './use-studio-authoring-runtime'

type StudioComponent = typeof import('@sistemazero/studio')['StudioLesson']
type StudioModule = typeof import('@sistemazero/studio')
type ProjectKindChoice = 'classic' | 'pro'
type Replacement = { kind: ProjectKindChoice; environmentKey: string; templateId: string }
const legacyOptions: PreparedStudioAuthoringOptions = {
  options: { legacyJavaScript: true, catalog: null },
  catalog: null,
}

interface Props {
  editingAccess?: import('@sistemazero/studio').StudioLessonProps['editingAccess']
  runtimeScope?: StudioAuthoringRuntimeScope
  lessonConfig?: Pick<
    import('@sistemazero/studio').StudioLessonProps,
    | 'level'
    | 'pythonLevel'
    | 'allowedModes'
    | 'allowBlocks'
    | 'allowCategories'
    | 'allowLevelReveal'
  >
  onChange?: (project: EditableStudioProject) => void
  /** Projeto inicial; ausente → cria um vazio (autoria de bloco novo). */
  initialProject?: EditableStudioProject | null
  /** Nome do projeto vazio criado quando não há `initialProject`. */
  defaultName?: string
  /** Handle imperativo: o pai lê `getProject()` ao salvar / chama `replaceProject()`. */
  handleRef: RefObject<StudioHandle | null>
  features?: StudioFeatures
  /** Exibe os controles para o autor criar e trocar projetos Pro. */
  professionalAuthoring?: boolean
  authoringOptions?: PreparedStudioAuthoringOptions | null
  authoringError?: string | null
  onReloadAuthoringOptions?: () => void
  /** Only an explicit confirmed replacement resets the parent curation. */
  onProjectReset?: (project: EditableStudioProject) => void
  /** Altura do container (o Studio preenche 100%). */
  className?: string
  /**
   * Esconde os botões internos "Projeto em blocos/Pro" — o FORM escolhe o tipo fora
   * (redesenho 24/07). O seletor de modelo Pro continua aqui (só aparece no Pro).
   */
  hideKindChooser?: boolean
  /**
   * Tipo pedido pelo form (controle externo): quando difere do kind atual do projeto,
   * dispara o MESMO fluxo confirm+replace da troca interna. Cancelar notifica o kind
   * real via `onKindResolved` (o form desfaz o seletor).
   */
  requestedKind?: 'blocks' | 'pro'
  /** Kind REAL do projeto (carga inicial / troca confirmada / cancelamento). */
  onKindResolved?: (kind: 'blocks' | 'pro') => void
}

/**
 * Estúdio embutido no painel (autoria do bloco + inspeção de entrega). Carregado SÓ
 * no client (Monaco/Blockly/IndexedDB não existem no SSR): o import dinâmico roda
 * dentro de um effect. `persistence="none"` — o pai captura via `handleRef.getProject()`.
 */
export function StudioEmbed({
  editingAccess,
  runtimeScope,
  initialProject,
  defaultName = 'Projeto da aula',
  handleRef,
  features,
  professionalAuthoring = false,
  authoringOptions,
  authoringError,
  onReloadAuthoringOptions,
  onProjectReset,
  className = 'h-[32rem]',
  hideKindChooser = false,
  requestedKind,
  onKindResolved,
  onChange,
  lessonConfig,
}: Props) {
  const [studioModule, setStudioModule] = useState<StudioModule | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [seed, setSeed] = useState<EditableStudioProject | null>(initialProject ?? null)
  // Editor imports update the controls without feeding source edits back into hydration.
  const [observed, setObserved] = useState<EditableStudioProject | null>(null)
  const activeProject = observed ?? seed
  const runtime = useStudioAuthoringRuntime(activeProject, runtimeScope)
  const [templateId, setTemplateId] = useState(initialProject?.proMeta?.templateId ?? 'vanilla-js')
  const [pending, setPending] = useState<Replacement | null>(null)
  const [replacementError, setReplacementError] = useState<string | null>(null)
  const replacement = useRef(0)
  const latestAuthoringOptions = useRef(authoringOptions)
  latestAuthoringOptions.current = authoringOptions
  useEffect(
    () => () => {
      replacement.current++
    },
    [],
  )
  const proRuntime = useMemo(() => createAdminProRuntimeAdapter(), [])
  const StudioLesson: StudioComponent | null = studioModule?.StudioLesson ?? null
  const seedKind: 'blocks' | 'pro' = activeProject?.kind === 'pro' ? 'pro' : 'blocks'
  const environmentKey = studioAuthoringChoiceKey(activeProject)
  const choices = studioAuthoringChoices(
    authoringOptions ?? legacyOptions,
    seedKind === 'pro' ? 'pro' : 'classic',
  )
  const currentChoice = choices.find((choice) => choice.key === environmentKey)
  const templates =
    currentChoice?.language === 'python'
      ? [{ id: 'python-blank', name: 'Python — projeto vazio' }]
      : (studioModule?.listProTemplates() ?? []).filter(
          (template) =>
            !currentChoice?.policy || currentChoice.policy.proTemplateIds.includes(template.id),
        )
  // Callback em ref: notificar não deve re-rodar os effects de sincronização.
  const onKindResolvedRef = useRef(onKindResolved)
  onKindResolvedRef.current = onKindResolved

  // Informa o kind REAL ao form (carga inicial / troca confirmada).
  useEffect(() => {
    if (seed) onKindResolvedRef.current?.(seedKind)
  }, [seed, seedKind])

  // Controle EXTERNO do tipo (form): pedido difere do atual → abre o confirm da troca.
  useEffect(() => {
    if (!requestedKind || !seed) return
    const current = seedKind
    if (requestedKind !== current) {
      const kind = requestedKind === 'pro' ? 'pro' : 'classic'
      const choice = studioAuthoringChoices(authoringOptions ?? legacyOptions, kind).find(
        (item) => item.key === environmentKey,
      )
      if (!choice) {
        setReplacementError('Este ambiente não oferece o tipo de projeto escolhido.')
        onKindResolvedRef.current?.(current)
        return
      }
      setPending({
        kind,
        environmentKey,
        templateId: studioAuthoringTemplate(choice, templateId),
      })
    }
  }, [requestedKind, seed, seedKind, authoringOptions, environmentKey, templateId])

  useEffect(() => {
    let active = true
    if (loadAttempt > 0) setStudioModule(null)
    void (async () => {
      setLoadError(false)
      const result = await loadStudioEmbedModule()
      if (!active) return
      if (!result.module) {
        console.error('Não foi possível carregar o editor da autoria.', result.error)
        setLoadError(true)
        return
      }
      const mod = result.module
      setStudioModule(mod)
      setTemplateId((current) =>
        current === 'python-blank' ||
        mod.listProTemplates().some((template) => template.id === current)
          ? current
          : 'vanilla-js',
      )
      setSeed(
        (prev) =>
          prev ?? initialProject ?? mod.createEmptyProject(crypto.randomUUID(), defaultName),
      )
    })()
    return () => {
      active = false
    }
  }, [initialProject, defaultName, loadAttempt])

  async function replaceProject(selection: Replacement) {
    if (!studioModule || !seed) return
    const request = ++replacement.current
    setReplacementError(null)
    try {
      const current = handleRef.current?.getProject() ?? seed
      const choice = studioAuthoringChoices(authoringOptions ?? legacyOptions, selection.kind).find(
        (item) => item.key === selection.environmentKey,
      )
      const nextTemplateId =
        choice && selection.kind !== (current.kind ?? 'classic')
          ? studioAuthoringTemplate(choice, selection.templateId)
          : selection.templateId
      const next = await createStudioAuthoringProject(
        { ...selection, templateId: nextTemplateId, id: current.id, name: current.name },
        authoringOptions ?? null,
      )
      if (request !== replacement.current) return
      resolveStudioAuthoringSelection(
        { ...selection, templateId: nextTemplateId },
        latestAuthoringOptions.current ?? null,
      )
      setSeed(next)
      setObserved(next)
      handleRef.current?.replaceProject(next)
      setTemplateId(nextTemplateId)
      onProjectReset?.(next)
      onChange?.(next)
      setPending(null)
    } catch (error) {
      if (request === replacement.current)
        setReplacementError(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar o projeto. Tente novamente.',
        )
    }
  }

  if (loadError) {
    return (
      <div className={className}>
        <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted p-6 text-center text-sm text-muted-foreground">
          <p>Não foi possível carregar o Estúdio.</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setLoadAttempt((n) => n + 1)}
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    )
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
          {!hideKindChooser ? (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={seedKind !== 'pro' ? 'default' : 'outline'}
                onClick={() =>
                  seedKind === 'pro' && setPending({ kind: 'classic', environmentKey, templateId })
                }
              >
                Projeto em blocos
              </Button>
              <Button
                type="button"
                size="sm"
                variant={seedKind === 'pro' ? 'default' : 'outline'}
                onClick={() =>
                  seedKind !== 'pro' && setPending({ kind: 'pro', environmentKey, templateId })
                }
              >
                Projeto Pro
              </Button>
            </div>
          ) : null}
          <label className="flex min-w-0 flex-1 flex-col gap-1 font-medium text-xs">
            Ambiente do projeto
            <Select
              value={environmentKey}
              onChange={(event) => {
                const choice = choices.find((item) => item.key === event.target.value)
                if (choice && choice.key !== environmentKey)
                  setPending({
                    kind: seedKind === 'pro' ? 'pro' : 'classic',
                    environmentKey: choice.key,
                    templateId:
                      choice.language === 'python'
                        ? 'python-blank'
                        : (choice.policy?.proTemplateIds.find((id) =>
                            studioModule.listProTemplates().some((template) => template.id === id),
                          ) ?? 'vanilla-js'),
                  })
              }}
            >
              {!currentChoice ? (
                <option value={environmentKey} disabled>
                  Ambiente salvo — indisponível para novos projetos
                </option>
              ) : null}
              {choices.map((choice) => (
                <option key={choice.key} value={choice.key}>
                  {choice.label}
                </option>
              ))}
            </Select>
          </label>
          {seedKind === 'pro' ? (
            <label className="flex min-w-0 flex-1 flex-col gap-1 font-medium text-xs">
              Modelo Pro
              <Select
                disabled={!currentChoice}
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
              >
                {!templates.some((template) => template.id === templateId) ? (
                  <option value={templateId} disabled>
                    Modelo salvo — indisponível
                  </option>
                ) : null}
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
          {seedKind === 'pro' &&
          currentChoice &&
          activeProject?.proMeta?.templateId !== templateId ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPending({ kind: 'pro', environmentKey, templateId })}
            >
              Aplicar este modelo
            </Button>
          ) : null}
          {seedKind === 'pro' && activeProject?.programmingLanguage !== 'python' ? (
            <p className="w-full text-muted-foreground text-xs">
              O preview Pro é compilado no ambiente seguro da plataforma, igual ao que a criança usa
              na aula.
            </p>
          ) : null}
          {authoringError ? (
            <p role="alert" className="w-full text-sm text-destructive">
              {authoringError}{' '}
              <Button type="button" size="sm" variant="outline" onClick={onReloadAuthoringOptions}>
                Tentar novamente
              </Button>
            </p>
          ) : !authoringOptions ? (
            <p role="status" className="w-full text-xs text-muted-foreground">
              Consultando os ambientes disponíveis…
            </p>
          ) : null}
        </div>
      ) : null}
      {runtime.loading || runtime.error ? (
        <div
          role={runtime.error ? 'alert' : 'status'}
          className="flex items-center gap-3 border-b border-border px-3 py-2 text-sm"
        >
          <p>{runtime.error ?? 'Preparando Python…'}</p>
          {runtime.error ? (
            <Button type="button" size="sm" variant="outline" onClick={runtime.retry}>
              Tentar novamente
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        <StudioLesson
          {...lessonConfig}
          pythonLevel={lessonConfig?.pythonLevel ?? (professionalAuthoring ? 3 : undefined)}
          ref={handleRef}
          initialProject={seed}
          runtimeEnvironment={runtime.environment}
          editingAccess={editingAccess}
          persistence="none"
          onChange={(project) => {
            setObserved(project)
            onChange?.(project)
          }}
          features={{
            ...features,
            ...(seedKind === 'pro' ? { professional: true, terminal: false } : {}),
          }}
          // SEMPRE presente: o StudioCore trava o adapter no MOUNT (useState latch) —
          // condicionar ao kind deixava o preview Pro sem runtime remoto quando o
          // autor trocava blocos→Pro na mesma sessão (caía no WebContainer, que a
          // página do admin não suporta sem COOP/COEP). Inerte em projeto de blocos.
          proRuntime={proRuntime}
          blockUnloadWhenDirty={false}
        />
      </div>
      <ConfirmDialog
        open={pending !== null}
        onClose={() => {
          replacement.current++
          setPending(null)
          // Cancelou a troca pedida pelo form → devolve o kind REAL (desfaz o seletor).
          onKindResolvedRef.current?.(seedKind)
        }}
        title="Criar outro projeto inicial?"
        message="O código, os materiais, as extensões e a seleção de blocos atuais serão substituídos por um projeto novo no ambiente escolhido. Esta troca não pode ser desfeita depois que o bloco for salvo."
        confirmText="Trocar projeto"
        onConfirm={() => {
          if (pending) return replaceProject(pending)
        }}
      >
        {replacementError ? (
          <p role="alert" className="text-destructive">
            {replacementError}
          </p>
        ) : null}
      </ConfirmDialog>
      {replacementError && !pending && (
        <p role="alert" className="px-3 py-2 text-sm text-destructive">
          {replacementError}
        </p>
      )}
    </div>
  )
}
