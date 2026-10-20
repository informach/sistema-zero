import {
  type PensaProjectListItem,
  PensaProjectListItemSchema,
  type PensaProjectView,
  PensaProjectViewSchema,
} from '@sistemazero/core/pensa'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PensaTransport } from '../core/types'

export function usePensaProject(transport: PensaTransport, initialProjectId: string | null) {
  const [view, setView] = useState<PensaProjectView | null>(null)
  const [projects, setProjects] = useState<PensaProjectListItem[]>([])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [archived, setArchived] = useState(false)
  const [counts, setCounts] = useState<{ active: number; archived: number } | null>(null)
  const [listState, setListState] = useState<'loading' | 'ready' | 'failed'>('loading')
  const selected = useRef<string | null>(initialProjectId)
  const sequence = useRef(0)
  const readSequence = useRef(0)
  const listSequence = useRef(0)
  const mutation = useRef(false)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      sequence.current += 1
    }
  }, [])
  // As duas abas (Em andamento e Guardados) mostram a contagem: as duas listas vêm juntas.
  const list = useCallback(async () => {
    const visit = ++listSequence.current
    try {
      const [active, stored] = await Promise.all(
        (['active', 'archived'] as const).map(async (status) =>
          PensaProjectListItemSchema.array().parse(
            (await transport.request<unknown>(`/projects?status=${status}`)) ?? [],
          ),
        ),
      )
      if (!alive.current || visit !== listSequence.current) return
      setProjects(archived ? stored! : active!)
      setCounts({ active: active!.length, archived: stored!.length })
      setListState('ready')
    } catch (cause) {
      if (alive.current && visit === listSequence.current)
        setListState((current) => (current === 'ready' ? current : 'failed'))
      throw cause
    }
  }, [transport, archived])
  const reloadList = useCallback(async () => {
    setListState('loading')
    setError(null)
    await list().catch((cause: unknown) => setError(message(cause)))
  }, [list])
  const refresh = useCallback(async () => {
    const projectId = selected.current
    if (!projectId) return
    const visit = sequence.current
    const read = ++readSequence.current
    const next = PensaProjectViewSchema.parse(
      await transport.request<unknown>(`/projects/${projectId}`),
    )
    if (
      alive.current &&
      visit === sequence.current &&
      read === readSequence.current &&
      selected.current === projectId
    )
      setView(next)
  }, [transport])
  const open = useCallback(
    async (projectId: string) => {
      selected.current = projectId
      const visit = ++sequence.current
      const read = ++readSequence.current
      setView(null)
      setLoading(true)
      setError(null)
      try {
        const next = PensaProjectViewSchema.parse(
          await transport.request<unknown>(`/projects/${projectId}`),
        )
        if (
          alive.current &&
          visit === sequence.current &&
          read === readSequence.current &&
          selected.current === projectId
        )
          setView(next)
      } catch (cause) {
        if (alive.current && visit === sequence.current) setError(message(cause))
      } finally {
        if (alive.current && visit === sequence.current) setLoading(false)
      }
    },
    [transport],
  )
  const home = useCallback(() => {
    sequence.current += 1
    readSequence.current += 1
    selected.current = null
    setView(null)
    setLoading(false)
    setError(null)
    void list().catch((cause: unknown) => setError(message(cause)))
  }, [list])
  const execute = useCallback(
    async (path: string, body?: unknown, method: 'POST' | 'PATCH' | 'DELETE' | 'PUT' = 'POST') => {
      if (mutation.current) return null
      mutation.current = true
      const visit = sequence.current
      readSequence.current += 1
      setBusy(true)
      setError(null)
      try {
        const result = await transport.request<unknown>(path, {
          method,
          body: body ?? { requestId: crypto.randomUUID() },
        })
        if (!alive.current || visit !== sequence.current) return null
        readSequence.current += 1
        const next = PensaProjectViewSchema.parse(result)
        selected.current = next.project.id
        setView(next)
        return next
      } catch (cause) {
        if (alive.current && visit === sequence.current) {
          // A sessão de suporte só lê: quem avisa é a faixa de suporte, não um erro solto.
          if (isReadOnlyRefusal(cause)) return null
          setError(message(cause))
          if (cause && typeof cause === 'object' && 'status' in cause && cause.status === 409)
            await refresh().catch(() => {})
        }
        return null
      } finally {
        mutation.current = false
        if (alive.current) setBusy(false)
      }
    },
    [transport, refresh],
  )
  useEffect(() => {
    void list().catch((cause: unknown) => setError(message(cause)))
  }, [list])
  useEffect(() => {
    if (initialProjectId) void open(initialProjectId)
  }, [initialProjectId, open])
  const operationId = view?.operation?.id
  const operationStatus = view?.operation?.status
  const projectId = view?.project.id
  useEffect(() => {
    if (!operationId || !projectId || !['queued', 'running'].includes(operationStatus ?? '')) return
    let active = true
    let fetching = false
    async function poll() {
      if (!active || fetching || mutation.current || document.visibilityState === 'hidden') return
      fetching = true
      try {
        await transport.request(`/projects/${projectId}/operations/${operationId}/work`, {
          method: 'POST',
          body: { requestId: crypto.randomUUID() },
        })
        if (active) await refresh()
      } catch (cause) {
        if (active) setError(message(cause))
      } finally {
        fetching = false
      }
    }
    const timer = window.setInterval(() => void poll(), 5_000)
    void poll()
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [operationId, operationStatus, projectId, transport, refresh])
  useEffect(() => {
    if (!projectId) return
    const timer = window.setInterval(() => {
      if (!mutation.current && document.visibilityState !== 'hidden') void refresh().catch(() => {})
    }, 30_000)
    return () => clearInterval(timer)
  }, [projectId, refresh])
  return {
    view,
    projects,
    busy,
    loading,
    error,
    setError,
    open,
    home,
    refresh,
    execute,
    archived,
    setArchived,
    counts,
    listState,
    reloadList,
  }
}

export function isReadOnlyRefusal(cause: unknown): boolean {
  return (
    typeof cause === 'object' &&
    cause !== null &&
    'code' in cause &&
    cause.code === 'IMPERSONATION_READONLY'
  )
}

function message(cause: unknown) {
  return cause instanceof Error ? cause.message : 'Não consegui abrir seu plano. Tente novamente.'
}
