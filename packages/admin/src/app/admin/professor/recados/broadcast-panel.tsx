'use client'

import { renderMarkdown } from '@sistemazero/member-shell/lib/markdown'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { ReplyTemplatesMenu } from '@/components/professor/reply-templates'
import { apiGet, apiSend } from '@/lib/api'
import { COMMUNITY_NAMES } from '@/lib/platform'
import type { CourseView } from '@/lib/types'
import { ThreadDialog } from './thread-dialog'

interface Recipient {
  profileId: string
  name: string
  accountName: string
  accountEmail: string
  status?: string
  threadId?: string
  read?: boolean
}
interface Broadcast {
  id: string
  title: string
  body: string
  recipients: number
  delivered: number
  failed: number
  read: number
  sentAt: string | null
  items?: Recipient[]
}
const base = '/api/members/teacher-broadcasts'
function errorMessage(error: unknown, fallback: string): string {
  return typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
    ? error.message
    : fallback
}

export function BroadcastPanel({
  courses,
  initialProfileId,
}: {
  courses: CourseView[]
  initialProfileId?: string
}) {
  const [compose, setCompose] = useState(Boolean(initialProfileId))
  const [sentOpen, setSentOpen] = useState(false)
  const [sent, setSent] = useState<Broadcast[]>([])
  const [kind, setKind] = useState('student')
  const [courseId, setCourseId] = useState('')
  const [q, setQ] = useState('')
  const [students, setStudents] = useState<Recipient[]>([])
  const [searchError, setSearchError] = useState('')
  const [student, setStudent] = useState<Recipient | null>(
    initialProfileId
      ? {
          profileId: initialProfileId,
          name: 'Criança escolhida na ficha',
          accountName: '',
          accountEmail: '',
        }
      : null,
  )
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<Broadcast | null>(null)
  const [detail, setDetail] = useState<Broadcast | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailPages, setDetailPages] = useState(1)
  const [detailBusy, setDetailBusy] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [reading, setReading] = useState<{ id: string; name: string } | null>(null)
  const request = useRef<{ fingerprint: string; id: string } | null>(null)

  useEffect(() => {
    if (!compose || kind !== 'student' || student) return
    let active = true
    const timer = setTimeout(() => {
      setSearchError('')
      void apiGet<{ items: Recipient[] }>(`${base}/recipients?q=${encodeURIComponent(q)}`)
        .then((r) => {
          if (active) setStudents(r.items)
        })
        .catch(() => {
          if (active)
            setSearchError('Não conseguimos buscar as crianças. Mude a busca para tentar de novo.')
        })
    }, 250)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [q, compose, kind, student])

  useEffect(() => {
    if (!sentOpen) return
    let active = true
    const refresh = () => {
      void apiGet<Broadcast[]>(base)
        .then((r) => {
          if (active) setSent(r)
        })
        .catch(() => {
          if (active) toast.error('Não conseguimos atualizar os recados enviados.')
        })
    }
    refresh()
    const timer = setInterval(() => {
      if (!document.hidden) refresh()
    }, 5000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [sentOpen])

  useEffect(() => {
    if (!sentOpen || !detailId) return
    let active = true
    let refreshing = false
    const refresh = async () => {
      if (refreshing) return
      refreshing = true
      setDetailBusy(true)
      try {
        const pages = await Promise.all(
          Array.from({ length: detailPages }, (_, page) =>
            apiGet<Broadcast>(`${base}/${detailId}?offset=${page * 50}`),
          ),
        )
        const first = pages[0]
        if (active && first) {
          setDetail({ ...first, items: pages.flatMap((page) => page.items ?? []) })
          setDetailError('')
        }
      } catch {
        if (active)
          setDetailError(
            'Não conseguimos atualizar quem recebeu. Vamos tentar de novo sozinhos em instantes.',
          )
      } finally {
        refreshing = false
        if (active) setDetailBusy(false)
      }
    }
    void refresh()
    const timer = setInterval(() => {
      if (!document.hidden) void refresh()
    }, 5000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [sentOpen, detailId, detailPages])

  async function prepare() {
    setBusy(true)
    try {
      const audience =
        kind === 'student'
          ? { kind, profileId: student?.profileId }
          : kind === 'course'
            ? { kind, courseId }
            : { kind }
      const fingerprint = JSON.stringify({ audience, title, body })
      if (request.current?.fingerprint !== fingerprint)
        request.current = { fingerprint, id: crypto.randomUUID() }
      const result = await apiSend<Broadcast>(base, 'POST', {
        id: request.current.id,
        audience,
        title,
        body,
      })
      setPreview(await apiGet<Broadcast>(`${base}/${result.id}`))
    } catch (error) {
      toast.error(errorMessage(error, 'Não conseguimos preparar o recado. Tente de novo.'))
    } finally {
      setBusy(false)
    }
  }

  async function confirm() {
    if (!preview) return
    setBusy(true)
    try {
      await apiSend(`${base}/${preview.id}/confirm`, 'POST', {})
      setCompose(false)
      setPreview(null)
      setTitle('')
      setBody('')
      request.current = null
      setSentOpen(true)
      toast.success('Recado enviado. Acompanhe quem já recebeu em Recados enviados.')
    } catch (error) {
      toast.error(errorMessage(error, 'O recado não foi enviado. Tente de novo.'))
    } finally {
      setBusy(false)
    }
  }

  async function more(target: Broadcast, update: (value: Broadcast) => void) {
    try {
      const next = await apiGet<Broadcast>(
        `${base}/${target.id}?offset=${target.items?.length ?? 0}`,
      )
      update({ ...next, items: [...(target.items ?? []), ...(next.items ?? [])] })
    } catch {
      toast.error('Não conseguimos carregar mais crianças da lista.')
    }
  }

  function recipientList(target: Broadcast, update: (value: Broadcast) => void, live = false) {
    return (
      <div className="space-y-2">
        <ul className="max-h-56 space-y-2 overflow-auto text-sm">
          {target.items?.map((r) => (
            <li key={r.profileId} className="rounded border p-2">
              <strong>{r.name}</strong> · {r.accountName}{' '}
              <span className="text-muted-foreground">{r.accountEmail}</span>
              {target.sentAt && (
                <span className="block">
                  {r.status === 'delivered'
                    ? r.read
                      ? 'Leu'
                      : 'Recebeu'
                    : r.status === 'failed'
                      ? 'Não chegou'
                      : 'Enviando'}
                </span>
              )}
              {target.sentAt && r.status === 'delivered' && r.threadId && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (r.threadId) {
                      setReading({ id: r.threadId, name: r.name })
                      setSentOpen(false)
                    }
                  }}
                >
                  Abrir o recado
                </Button>
              )}
            </li>
          ))}
        </ul>
        {(target.items?.length ?? 0) < target.recipients && (
          <Button
            variant="outline"
            disabled={live && detailBusy}
            onClick={() =>
              live ? setDetailPages((pages) => pages + 1) : void more(target, update)
            }
          >
            Ver mais crianças
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="flex gap-2">
        <Button className="min-h-11 px-4" onClick={() => setCompose(true)}>
          Novo recado
        </Button>
        <Button variant="outline" className="min-h-11 px-4" onClick={() => setSentOpen(true)}>
          Recados enviados
        </Button>
      </div>
      <Dialog
        open={compose}
        onClose={() => {
          if (!busy) setCompose(false)
        }}
        title={preview ? 'Conferir antes de enviar' : `Novo recado para a ${COMMUNITY_NAMES.kids}`}
        className="max-w-2xl"
      >
        {preview ? (
          <div className="space-y-4">
            <p>
              <strong>{preview.title}</strong>
            </p>
            <div className="prose prose-sm max-w-none">{renderMarkdown(preview.body)}</div>
            <p>
              {preview.recipients === 1
                ? '1 criança vai receber este recado em Recados da equipe.'
                : `${preview.recipients} crianças vão receber este recado em Recados da equipe, cada uma só o seu.`}{' '}
              A lista ficou fixa agora e vale por 30 minutos.
            </p>
            {recipientList(preview, setPreview)}
            <div className="flex gap-2">
              <Button disabled={busy} onClick={() => void confirm()}>
                {busy ? 'Enviando…' : `Enviar para ${preview.recipients}`}
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  request.current = null
                  setPreview(null)
                }}
              >
                Voltar e editar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block space-y-1">
              Público
              <Select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="student">Uma criança</option>
                <option value="course">Crianças de um curso</option>
                <option value="kids">Toda a {COMMUNITY_NAMES.kids}</option>
              </Select>
            </label>
            {kind === 'course' && (
              <label className="block">
                Curso
                <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                  <option value="">Selecione um curso</option>
                  {courses
                    .filter((c) => c.audience === 'kids' && c.status !== 'draft')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                </Select>
              </label>
            )}
            {kind === 'student' && (
              <div className="space-y-2">
                {student ? (
                  <p>
                    {student.name} · {student.accountName}{' '}
                    <Button variant="ghost" onClick={() => setStudent(null)}>
                      Trocar criança
                    </Button>
                  </p>
                ) : (
                  <>
                    <label className="block">
                      Criança ou responsável
                      <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Nome da criança, responsável ou e-mail"
                      />
                    </label>
                    {searchError && <p role="alert">{searchError}</p>}
                    <ul className="max-h-44 overflow-auto">
                      {students.map((r) => (
                        <li key={r.profileId}>
                          <button
                            type="button"
                            className="w-full rounded p-2 text-left hover:bg-muted"
                            onClick={() => setStudent(r)}
                          >
                            <strong>{r.name}</strong> · {r.accountName}
                            <span className="block text-xs">{r.accountEmail}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground">
                      Digite mais do nome para achar a criança. O acesso dela é conferido antes do
                      envio.
                    </p>
                  </>
                )}
              </div>
            )}
            <label className="block">
              Assunto
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
            </label>
            <div>
              <p className="mb-1">Mensagem</p>
              <RichTextEditor content={body} onChange={setBody} compact />
              <ReplyTemplatesMenu value={body} onChange={setBody} />
            </div>
            <p className="text-xs text-muted-foreground">
              Só recebem as crianças com acesso em dia ao público escolhido.
            </p>
            <Button
              disabled={
                busy ||
                !title.trim() ||
                !body.trim() ||
                (kind === 'student' && !student) ||
                (kind === 'course' && !courseId)
              }
              onClick={() => void prepare()}
            >
              {busy ? 'Conferindo quem vai receber…' : 'Conferir antes de enviar'}
            </Button>
          </div>
        )}
      </Dialog>
      <Dialog
        open={sentOpen}
        onClose={() => {
          setSentOpen(false)
          setDetailId(null)
          setDetail(null)
        }}
        title="Recados enviados"
        className="max-w-2xl"
      >
        {detailId ? (
          <div className="space-y-3">
            <Button
              variant="ghost"
              onClick={() => {
                setDetailId(null)
                setDetail(null)
              }}
            >
              Voltar aos recados enviados
            </Button>
            {detailError && <p role="alert">{detailError}</p>}
            {detailBusy && <p role="status">Atualizando quem recebeu…</p>}
            {detail && (
              <>
                <p>
                  <strong>{detail.title}</strong>
                </p>
                {recipientList(detail, setDetail, true)}
              </>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {sent.map((item) => (
              <li key={item.id} className="space-y-2 rounded border p-3">
                <strong>{item.title}</strong>
                <p className="text-sm">
                  {item.delivered} de {item.recipients} receberam · {item.read} leram
                  {item.failed > 0 ? ` · ${item.failed} não chegaram` : ''}
                  {item.delivered + item.failed < item.recipients ? ' · Ainda enviando' : ''}
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDetail(null)
                    setDetailError('')
                    setDetailPages(1)
                    setDetailId(item.id)
                  }}
                >
                  Ver quem recebeu
                </Button>
                {item.failed > 0 && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      void apiSend(`${base}/${item.id}/retry`, 'POST', {})
                        .then(() => toast.success('Vamos tentar de novo onde não chegou.'))
                        .catch(() => toast.error('Não conseguimos tentar de novo agora.'))
                    }
                  >
                    Tentar de novo onde não chegou
                  </Button>
                )}
              </li>
            ))}
            {sent.length === 0 && <li>Nenhum recado enviado ainda.</li>}
          </ul>
        )}
      </Dialog>
      {reading && (
        <ThreadDialog
          threadId={reading.id}
          studentName={reading.name}
          onClose={() => {
            setReading(null)
            setSentOpen(true)
          }}
        />
      )}
    </>
  )
}
