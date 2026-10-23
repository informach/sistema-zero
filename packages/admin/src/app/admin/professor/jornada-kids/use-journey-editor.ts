'use client'

import { IdentityUuidSchema } from '@sistemazero/core/identity'
import { type KidsJourneyPolicy, KidsJourneyPolicySchema } from '@sistemazero/core/journey'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePlatform } from '@/components/admin/platform-provider'
import { apiGet, apiSend } from '@/lib/api'
import {
  KidsAdvanceSchema,
  type KidsHistory,
  KidsHistorySchema,
  type KidsPolicyRecord,
  KidsPolicyRecordSchema,
  type KidsPreparation,
  KidsPreparationSchema,
  type KidsPreview,
  KidsPreviewSchema,
  KidsPublicationSchema,
  kidsEditorError,
} from '@/lib/kids-journey-editor'
import type { CourseView, Paginated } from '@/lib/types'

const base = '/api/members/journey/kids'
const pagePath = '/admin/professor/jornada-kids'

async function coursesForEditor(current: () => boolean): Promise<CourseView[]> {
  const courses: CourseView[] = []
  let offset = 0
  while (current()) {
    const page = await apiGet<Paginated<CourseView>>(
      `/api/members/courses?audience=kids&modality=recorded&limit=100&offset=${offset}`,
    )
    if (!current()) return []
    if (!Array.isArray(page.items) || !Number.isSafeInteger(page.total) || page.total < 0)
      throw new Error('Não foi possível conferir a lista de cursos.')
    courses.push(
      ...page.items.filter((course) => course.audience === 'kids' && course.modality !== 'live'),
    )
    offset += page.items.length
    if (!page.items.length || offset >= page.total) return courses
  }
  return []
}

export function useKidsJourneyEditor(initialPreparation: unknown) {
  const platform = usePlatform()
  const router = useRouter()
  const resumeId =
    initialPreparation === undefined
      ? null
      : typeof initialPreparation === 'string'
        ? initialPreparation
        : ''
  const [record, setRecord] = useState<KidsPolicyRecord | null>(null)
  const [draft, setDraft] = useState<KidsJourneyPolicy | null>(null)
  const [courses, setCourses] = useState<CourseView[]>([])
  const [preview, setPreview] = useState<KidsPreview | null>(null)
  const [preparation, setPreparation] = useState<KidsPreparation | null>(null)
  const [reason, setReason] = useState('')
  const [history, setHistory] = useState<KidsHistory>([])
  const [moreHistory, setMoreHistory] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [blocked, setBlocked] = useState(false)
  const generation = useRef(0)
  const operation = useRef<number | null>(null)
  const compared = useRef<string | null>(null)

  const load = useCallback(
    async (options: { keepDraft?: boolean; resume?: string | null } = {}) => {
      const token = ++generation.current
      operation.current = null
      compared.current = null
      setBusy(null)
      setLoading(true)
      setPreview(null)
      setLoadError(null)
      setError(null)
      let stopped = false
      const current = () => token === generation.current && !stopped
      try {
        const requestedId = options.resume === undefined ? resumeId : options.resume
        const id = requestedId === null ? null : IdentityUuidSchema.parse(requestedId)
        const [raw, items, saved, historyResult] = await Promise.all([
          apiGet<unknown>(base),
          coursesForEditor(current),
          id ? apiGet<unknown>(`${base}/preparations/${id}`) : Promise.resolve(null),
          apiGet<unknown>(`${base}/history?limit=25`)
            .then((body) => ({ body, error: null as string | null }))
            .catch((cause: unknown) => ({ body: null, error: kidsEditorError(cause) })),
        ])
        if (!current()) return
        const next = KidsPolicyRecordSchema.parse(raw)
        const savedPreparation = id ? KidsPreparationSchema.parse(saved) : null
        if (savedPreparation && savedPreparation.id !== id)
          throw new Error('A preparação recebida não corresponde ao endereço.')
        setRecord(next)
        setCourses(items)
        setPreparation(savedPreparation)
        setDraft(
          (previous) =>
            savedPreparation?.candidatePolicy ??
            (options.keepDraft && previous ? previous : next.policy),
        )
        if (savedPreparation) setReason(savedPreparation.reason)
        const conflict = Boolean(
          savedPreparation &&
            savedPreparation.status !== 'published' &&
            savedPreparation.expectedVersion !== next.version,
        )
        setBlocked(conflict)
        if (conflict)
          setError('A versão publicada mudou. Volte ao rascunho para comparar novamente.')
        if (historyResult.error) setHistoryError(historyResult.error)
        else {
          try {
            const revisions = KidsHistorySchema.parse(historyResult.body)
            setHistory(revisions)
            setMoreHistory(revisions.length === 25)
            setHistoryError(null)
          } catch (cause) {
            setHistoryError(kidsEditorError(cause))
          }
        }
        // Resume is read-only: no automatic advance or publication.
        if (
          savedPreparation &&
          next.phase === 'published' &&
          !conflict &&
          savedPreparation.status !== 'published' &&
          savedPreparation.status !== 'stale'
        ) {
          const result = KidsPreviewSchema.parse(
            await apiSend(`${base}/preview`, 'POST', {
              expectedVersion: next.version,
              policy: savedPreparation.candidatePolicy,
            }),
          )
          if (!current()) return
          if (result.baseVersion !== next.version)
            throw new Error('A comparação pertence a outra versão. Atualize a jornada.')
          setPreview(result)
          compared.current = JSON.stringify(savedPreparation.candidatePolicy)
        }
      } catch (cause) {
        if (token === generation.current) setLoadError(kidsEditorError(cause))
      } finally {
        stopped = true
        if (token === generation.current) setLoading(false)
      }
    },
    [resumeId],
  )

  useEffect(() => {
    if (platform === 'kids') void load({ keepDraft: true })
    else {
      generation.current++
      operation.current = null
      setBusy(null)
    }
    return () => {
      generation.current++
      operation.current = null
    }
  }, [platform, load])

  const validation = useMemo(
    () => (draft ? KidsJourneyPolicySchema.safeParse(draft) : null),
    [draft],
  )
  const draftKey = validation?.success
    ? JSON.stringify(validation.data)
    : draft
      ? JSON.stringify(draft)
      : null
  const changed = Boolean(draft && record && draftKey !== JSON.stringify(record.policy))
  const available = platform === 'kids' && record?.phase === 'published' && !loading && !loadError
  const canEdit = Boolean(
    available && record?.permissions.canEdit && !busy && !preparation && !blocked,
  )
  const canCompare = Boolean(available && !busy && validation?.success && !blocked)
  const previewAllowsPublication = Boolean(
    preview &&
      !preview.readiness.issues.some(
        (issue) => issue.severity === 'error' || issue.severity === 'unavailable',
      ),
  )
  const canPrepare = Boolean(
    canEdit &&
      changed &&
      previewAllowsPublication &&
      compared.current === draftKey &&
      reason.trim() &&
      reason.trim().length <= 500,
  )
  const canPublish = Boolean(
    available &&
      record?.permissions.canEdit &&
      !busy &&
      !blocked &&
      preview &&
      previewAllowsPublication &&
      preparation?.status === 'ready' &&
      preparation.cohortHash &&
      preparation.expectedVersion === record.version &&
      compared.current === draftKey,
  )

  async function run(
    name: string,
    work: (current: () => boolean) => Promise<void>,
    onFailure?: (cause: unknown) => void,
  ) {
    if (operation.current !== null) return
    const token = generation.current
    operation.current = token
    setBusy(name)
    if (!onFailure) setError(null)
    const current = () => token === generation.current
    try {
      await work(current)
    } catch (cause) {
      if (current()) {
        if (onFailure) onFailure(cause)
        else {
          setError(kidsEditorError(cause))
          if (
            typeof cause === 'object' &&
            cause !== null &&
            'status' in cause &&
            (cause.status === 409 || cause.status === 403)
          )
            setBlocked(true)
        }
      }
    } finally {
      if (current()) {
        operation.current = null
        setBusy(null)
      }
    }
  }

  function updateDraft(next: KidsJourneyPolicy) {
    if (!canEdit || operation.current !== null) return
    setDraft(next)
    setPreview(null)
    compared.current = null
    setSuccess(null)
  }
  async function compare() {
    if (!canCompare || !record || !draft) return
    const candidate = KidsJourneyPolicySchema.parse(draft)
    const expectedVersion = record.version
    const key = JSON.stringify(candidate)
    await run('Comparando', async (current) => {
      const result = KidsPreviewSchema.parse(
        await apiSend(`${base}/preview`, 'POST', { expectedVersion, policy: candidate }),
      )
      if (!current()) return
      if (result.baseVersion !== expectedVersion)
        throw new Error('A comparação pertence a outra versão. Atualize a jornada.')
      setPreview(result)
      compared.current = key
    })
  }
  async function prepare() {
    if (!canPrepare || !record || !draft) return
    const payload = {
      expectedVersion: record.version,
      policy: KidsJourneyPolicySchema.parse(draft),
      reason: reason.trim(),
    }
    await run('Preparando', async (current) => {
      const saved = KidsPreparationSchema.parse(
        await apiSend(`${base}/preparations`, 'POST', payload),
      )
      if (!current()) return
      if (
        saved.expectedVersion !== payload.expectedVersion ||
        JSON.stringify(saved.candidatePolicy) !== JSON.stringify(payload.policy)
      )
        throw new Error('A preparação recebida não corresponde ao rascunho. Atualize a jornada.')
      setPreparation(saved)
      setReason(saved.reason)
      router.replace(`${pagePath}?preparacao=${saved.id}`, { scroll: false })
    })
  }
  async function advance() {
    if (
      !available ||
      !record?.permissions.canEdit ||
      blocked ||
      !preparation ||
      (preparation.status !== 'capturing' && preparation.status !== 'preparing')
    )
      return
    const id = preparation.id
    await run('Conferindo os perfis', async (current) => {
      const result = KidsAdvanceSchema.parse(
        await apiSend(`${base}/preparations/${id}/advance`, 'POST'),
      )
      if (!current()) return
      if (result.preparation.id !== id)
        throw new Error('A preparação recebida não corresponde ao endereço.')
      setPreparation(result.preparation)
      if (result.status !== 'advanced') {
        setError(
          result.status === 'unowned'
            ? 'Há um perfil sem vínculo confirmado. Nenhuma versão foi publicada.'
            : 'A preparação mudou. Atualize para conferir o andamento.',
        )
        if (result.status === 'conflict') setBlocked(true)
      }
    })
  }
  async function publish() {
    if (!canPublish || !preparation?.cohortHash) return
    const saved = preparation
    const payload = {
      expectedVersion: saved.expectedVersion,
      draftHash: saved.draftHash,
      catalogHash: saved.catalogHash,
      cohortHash: saved.cohortHash,
    }
    await run('Publicando', async (current) => {
      const published = KidsPublicationSchema.parse(
        await apiSend(`${base}/preparations/${saved.id}/publish`, 'POST', payload),
      )
      if (!current()) return
      if (published.version !== saved.expectedVersion + 1)
        throw new Error('Não foi possível confirmar a versão publicada. Atualize a jornada.')
      setRecord((previous) => (previous ? { ...previous, ...published } : previous))
      setDraft(published.policy)
      setSuccess(
        `Versão ${published.version} publicada. As conquistas anteriores continuam preservadas.`,
      )
      router.replace(pagePath, { scroll: false })
      await load({ resume: null })
    })
  }
  async function returnToDraft() {
    if (operation.current !== null) return
    if (preparation?.status === 'published' && record) setDraft(record.policy)
    setPreparation(null)
    setPreview(null)
    compared.current = null
    router.replace(pagePath, { scroll: false })
    await load({ keepDraft: true, resume: null })
  }
  async function earlierHistory() {
    const last = history.at(-1)?.version
    if (!last || !moreHistory) return
    await run(
      'Carregando histórico',
      async (current) => {
        const rows = KidsHistorySchema.parse(
          await apiGet(`${base}/history?beforeVersion=${last}&limit=25`),
        )
        if (!current()) return
        setHistory((previous) => [
          ...previous,
          ...rows.filter((row) => !previous.some((old) => old.version === row.version)),
        ])
        setMoreHistory(rows.length === 25)
        setHistoryError(null)
      },
      (cause) => setHistoryError(kidsEditorError(cause)),
    )
  }
  return {
    platform,
    record,
    draft,
    courses,
    preview,
    preparation,
    reason,
    history,
    moreHistory,
    loading,
    loadError,
    error,
    success,
    busy,
    blocked,
    canEdit,
    canCompare,
    canPrepare,
    canPublish,
    changed,
    validationError:
      validation && !validation.success
        ? (validation.error.issues[0]?.message ?? 'Revise os requisitos.')
        : null,
    historyError,
    updateDraft,
    updateReason: (value: string) => {
      if (canEdit && operation.current === null) setReason(value)
    },
    compare,
    prepare,
    advance,
    publish,
    earlierHistory,
    returnToDraft,
    refresh: () => load({ keepDraft: true, resume: preparation?.id ?? null }),
  }
}
