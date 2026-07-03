import type { ChangeEvent, JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import { t } from '#core'
import { Button, IconCheckCircle, IconLink, Modal } from '#ui'
import { captureCoverFromProject } from '../../cover/coverCapture'
import { useProjectStore } from '../../state/projectStore'
import type { StudioShareAdapter, StudioShareResult } from '../../studio/share'
import { Spinner } from './LoadingViews'

export interface ShareDialogProps {
  open: boolean
  onClose: () => void
  /** Adapter do host. Quando `null` o dialog não renderiza (botão também some). */
  adapter: StudioShareAdapter | null
}

const MAX_DESCRIPTION = 280
const MAX_TITLE = 120
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
/**
 * Teto de gerações de IA POR abertura do modal (conta a automática + os cliques em
 * "Regerar"). Evita a criança "brincar" no botão e queimar IA. Reseta ao reabrir; o
 * servidor (`/api/studio/describe`) ainda tem o backstop de 10/min por sessão.
 */
const MAX_AI_GENERATIONS = 3

/** Capa escolhida: imagem (print automático OU upload) ou a padrão do curso. */
type Cover = { kind: 'image'; dataUrl: string } | { kind: 'preset' }

/**
 * Fluxo de COMPARTILHAR (publicar no Mural) — UX do Studio, I/O do host.
 *
 * UM MODAL só (redesenho 06/2026): texto do que vai acontecer → título quando o
 * host permite edição → resumo (pré-carregado do admin ou da IA, editável) → capa
 * (botão "Gerar capa" que tenta o print; se falhar, usa a do curso; senão a criança
 * envia a sua) → Publicar (só habilita quando os campos necessários estão prontos).
 * A imutabilidade do post é garantida no SERVIDOR; aqui só avisamos.
 */
export function ShareDialog({ open, onClose, adapter }: ShareDialogProps): JSX.Element | null {
  // Projeto da store POR INSTÂNCIA (hook com seletor) — não a estática.
  const project = useProjectStore((s) => s.project)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [generating, setGenerating] = useState(false)
  const [aiUses, setAiUses] = useState(0)
  const [cover, setCover] = useState<Cover | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [coverNote, setCoverNote] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [result, setResult] = useState<StudioShareResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)
  // Desafio do mês: opt-in EXPLÍCITO da criança (checkbox; só com adapter.challenge).
  const [joinChallenge, setJoinChallenge] = useState(false)

  const fileRef = useRef<HTMLInputElement | null>(null)
  // Gera o rascunho da descrição UMA vez por abertura (quando não há preset).
  const describeStartedRef = useRef(false)

  // Reseta tudo a cada abertura (o componente fica montado entre aberturas).
  useEffect(() => {
    if (!open) return
    // Preset do admin (aula): título/descrição já vêm prontos. Sem preset (Estúdio
    // Completo) → título = nome do projeto e descrição vazia (a IA tenta preencher).
    const editableTitle = adapter?.titleEditable !== false
    setTitle(adapter?.presetTitle?.trim() || (editableTitle ? (project?.name ?? '') : ''))
    setDescription(adapter?.presetDescription?.trim() ?? '')
    setGenerating(false)
    setAiUses(0)
    setCover(null)
    setCapturing(false)
    setCoverNote(null)
    setPublishing(false)
    setResult(null)
    setErrorMsg('')
    setCopied(false)
    setJoinChallenge(false)
    describeStartedRef.current = false
  }, [
    open,
    project?.name,
    adapter?.presetTitle,
    adapter?.presetDescription,
    adapter?.titleEditable,
  ])

  // Rascunho da descrição na abertura (1x) SÓ quando há IA (Estúdio Completo) e o
  // admin não pré-definiu. Na AULA (sem `generateDescription`) NÃO gera nada.
  useEffect(() => {
    if (!open || describeStartedRef.current) return
    if (!adapter || !project) return
    describeStartedRef.current = true
    if (adapter.presetDescription?.trim()) return
    const generate = adapter.generateDescription
    if (!generate) return
    setGenerating(true)
    setAiUses((n) => n + 1) // a geração automática conta no teto de IA
    generate({ project, title: title.trim() || project.name })
      .then((draft) => {
        const clean = (draft ?? '').trim().slice(0, MAX_DESCRIPTION)
        if (clean) setDescription(clean)
      })
      .catch(() => {})
      .finally(() => setGenerating(false))
  }, [open, adapter, project, title])

  if (!open || !adapter || !project) return null
  const titleEditable = adapter.titleEditable ?? true

  const regenerate = () => {
    const generate = adapter.generateDescription
    if (!generate || generating || aiUses >= MAX_AI_GENERATIONS) return
    setGenerating(true)
    setAiUses((n) => n + 1)
    generate({ project, title: title.trim() || project.name })
      .then((draft) => {
        const clean = (draft ?? '').trim().slice(0, MAX_DESCRIPTION)
        if (clean) setDescription(clean)
      })
      .catch(() => {})
      .finally(() => setGenerating(false))
  }

  // "Gerar capa": tenta o print do projeto rodando; se não der, usa a capa do
  // curso (admin); se não houver, pede o upload da criança.
  const generateCover = async () => {
    if (capturing) return
    setCapturing(true)
    setCoverNote(null)
    try {
      const url = await captureCoverFromProject(project)
      if (url) {
        setCover({ kind: 'image', dataUrl: url })
        return
      }
      if (adapter.presetCoverUrl) {
        setCover({ kind: 'preset' })
        setCoverNote(t('share.cover.failUsedAdmin'))
        return
      }
      setCoverNote(t('share.cover.failUpload'))
    } finally {
      setCapturing(false)
    }
  }

  const onPickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // permite re-selecionar o mesmo arquivo
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setCoverNote(t('share.cover.badType'))
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setCoverNote(t('share.cover.tooBig'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setCover({ kind: 'image', dataUrl: String(reader.result) })
      setCoverNote(null)
    }
    reader.onerror = () => setCoverNote(t('share.cover.badType'))
    reader.readAsDataURL(file)
  }

  const doPublish = () => {
    setPublishing(true)
    setErrorMsg('')
    adapter
      .publish({
        project,
        title: title.trim() || project.name,
        description: description.trim().slice(0, MAX_DESCRIPTION),
        coverDataUrl: cover?.kind === 'image' ? cover.dataUrl : null,
        useAdminCover: cover?.kind === 'preset',
        ...(adapter.challenge && joinChallenge ? { challengeKey: adapter.challenge.key } : {}),
      })
      .then((res) => {
        // Host com celebração própria (kids): entrega os links e SAI. Sem
        // `onPublished` (Estúdio Completo) → tela de sucesso interna.
        if (adapter.onPublished) {
          adapter.onPublished(res ?? {})
          onClose()
        } else {
          setResult(res ?? {})
        }
      })
      .catch((e: unknown) => setErrorMsg(e instanceof Error ? e.message : String(e)))
      .finally(() => setPublishing(false))
  }

  const copyLink = async () => {
    const url = result?.playUrl
    if (!url) return
    try {
      const abs = typeof window !== 'undefined' ? new URL(url, window.location.origin).href : url
      await navigator.clipboard?.writeText(abs)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard pode falhar (permissão) — silencioso.
    }
  }

  const coverPreviewSrc =
    cover?.kind === 'image'
      ? cover.dataUrl
      : cover?.kind === 'preset'
        ? (adapter.presetCoverUrl ?? null)
        : null
  const titleReady = titleEditable ? title.trim().length > 0 : true
  const ready = titleReady && description.trim().length > 0 && cover !== null

  // Rodapé: sucesso → Fechar; senão → Cancelar + Publicar (gated).
  const footer = result ? (
    <Button variant="primary" size="sm" onClick={onClose}>
      {t('share.close')}
    </Button>
  ) : (
    <>
      <Button variant="ghost" size="sm" onClick={onClose} disabled={publishing}>
        {t('share.cancel')}
      </Button>
      <Button
        variant="primary"
        size="sm"
        disabled={!ready || publishing}
        onClick={doPublish}
        title={!ready ? t('share.needAll') : undefined}
      >
        {publishing ? (
          <span className="flex items-center gap-1.5">
            <Spinner className="h-3.5 w-3.5" />
            {t('share.publishing')}
          </span>
        ) : (
          t('share.publish')
        )}
      </Button>
    </>
  )

  return (
    <Modal
      open={open}
      onClose={publishing ? () => {} : onClose}
      title={t('share.title')}
      footer={footer}
    >
      {result ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 font-medium text-sz-fg">
            <IconCheckCircle className="text-sz-success" />
            {t('share.success.heading')}
          </p>
          <p>{t('share.success.body')}</p>
          <div className="flex flex-wrap gap-2">
            {result.muralUrl && (
              <a href={result.muralUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm">
                  {t('share.success.openMural')}
                </Button>
              </a>
            )}
            {result.playUrl && (
              <a href={result.playUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="primary" size="sm">
                  {t('share.success.openPlay')}
                </Button>
              </a>
            )}
            {result.playUrl && (
              <Button variant="subtle" size="sm" onClick={() => void copyLink()}>
                <span className="flex items-center gap-1.5">
                  <IconLink size={14} />
                  {copied ? t('share.success.copied') : t('share.success.copyLink')}
                </span>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sz-fg-soft text-sm">{t('share.intro')}</p>

          {titleEditable ? (
            <label className="block">
              <span className="mb-1 block font-medium text-sz-fg-soft text-xs">
                {t('share.step.title.label')}
              </span>
              <input
                aria-label={t('share.step.title.label')}
                value={title}
                maxLength={MAX_TITLE}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-sz-border bg-sz-bg px-3 py-2 text-sm text-sz-fg"
              />
            </label>
          ) : null}

          {/* Resumo */}
          <label className="block">
            <span className="mb-1 block font-medium text-sz-fg-soft text-xs">
              {t('share.field.summary')}
            </span>
            <textarea
              aria-label={t('share.field.summary')}
              value={description}
              maxLength={MAX_DESCRIPTION}
              rows={3}
              placeholder={t('share.step.describe.placeholder')}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
              disabled={generating}
              className="w-full resize-none rounded-md border border-sz-border bg-sz-bg px-3 py-2 text-sm text-sz-fg disabled:opacity-60"
            />
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-sz-fg-mute text-xs">
                {description.length}/{MAX_DESCRIPTION}
              </span>
              {/* Botão de IA SÓ quando o host fornece `generateDescription` (Estúdio
                  Completo). Na AULA não aparece — o resumo do admin é só editado. */}
              {adapter.generateDescription ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={regenerate}
                  disabled={generating || aiUses >= MAX_AI_GENERATIONS}
                  aria-label={t('share.ai.button')}
                >
                  {generating ? (
                    <span className="flex items-center gap-1.5">
                      <Spinner className="h-3.5 w-3.5" />
                      {t('share.step.describe.generating')}
                    </span>
                  ) : description ? (
                    t('share.step.describe.regenerate')
                  ) : (
                    t('share.step.describe.generate')
                  )}
                </Button>
              ) : null}
            </div>
            {adapter.generateDescription && aiUses >= MAX_AI_GENERATIONS && !generating ? (
              <p className="mt-1 text-sz-fg-mute text-xs" role="status">
                {t('share.ai.capped')}
              </p>
            ) : null}
          </label>

          {/* Capa */}
          <div className="space-y-2">
            <span className="block font-medium text-sz-fg-soft text-xs">
              {t('share.cover.heading')}
            </span>
            {coverPreviewSrc ? (
              <img
                src={coverPreviewSrc}
                alt=""
                className="max-h-48 w-auto rounded-md border border-sz-border"
              />
            ) : (
              <p className="rounded-md border border-sz-border border-dashed bg-sz-bg px-3 py-4 text-center text-sz-fg-mute text-sm">
                {t('share.cover.empty')}
              </p>
            )}
            {cover?.kind === 'preset' && !coverNote ? (
              <p className="text-sz-fg-mute text-xs">{t('share.cover.usingAdmin')}</p>
            ) : null}
            {coverNote ? (
              <p className="text-sz-fg-soft text-xs" role="status">
                {coverNote}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              {/* "Gerar capa" é a ação PRINCIPAL (print) — botão primário, destacado. */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => void generateCover()}
                disabled={capturing}
              >
                {capturing ? (
                  <span className="flex items-center gap-1.5">
                    <Spinner className="h-3.5 w-3.5" />
                    {t('share.step.cover.capturing')}
                  </span>
                ) : (
                  t('share.cover.generate')
                )}
              </Button>
              {/* Upload é ÚLTIMO recurso → o MENOS destacado (subtle). */}
              <Button
                variant="subtle"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={capturing}
              >
                {t('share.cover.upload')}
              </Button>
              {adapter.presetCoverUrl && cover?.kind !== 'preset' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCover({ kind: 'preset' })
                    setCoverNote(null)
                  }}
                  disabled={capturing}
                >
                  {t('share.cover.useAdmin')}
                </Button>
              ) : null}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={onPickFile}
              />
            </div>
          </div>

          {/* Desafio do mês (game jam) — só com adapter.challenge (posse Clube+Estúdio). */}
          {adapter.challenge ? (
            <label className="flex items-start gap-2 rounded-md border border-sz-border bg-sz-bg px-3 py-2">
              <input
                type="checkbox"
                checked={joinChallenge}
                onChange={(e) => setJoinChallenge(e.target.checked)}
                disabled={publishing}
                className="mt-0.5"
              />
              <span>
                <span className="block font-medium text-sm text-sz-fg">
                  <span aria-hidden="true">🏆 </span>
                  {t('share.challenge.label', { title: adapter.challenge.title })}
                </span>
                {joinChallenge ? (
                  <span className="block text-sz-fg-mute text-xs">{t('share.challenge.hint')}</span>
                ) : null}
              </span>
            </label>
          ) : null}

          <p
            role="alert"
            className="rounded-md border border-sz-warn/40 bg-sz-warn/10 px-3 py-2 text-sz-warn text-xs"
          >
            {t('share.step.confirm.irreversible')}
          </p>

          {errorMsg ? (
            <p className="text-sz-error text-sm" role="alert">
              {t('share.error', { reason: errorMsg })}
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  )
}
