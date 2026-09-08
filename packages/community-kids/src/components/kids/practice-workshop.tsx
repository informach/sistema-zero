'use client'

import type { PracticeSessionView, PracticeTopicView } from '@sistemazero/core/practice'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { apiGet, apiSend } from '@/lib/api'

const Draft = z.record(z.string(), z.array(z.string()))
const actionClass =
  'inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-2 font-bold text-primary-foreground disabled:opacity-50'
const secondaryClass =
  'inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 py-2 font-bold disabled:opacity-50'
const draftKey = (profileId: string, id: string) => `sz-practice:${profileId}:${id}`

export function PracticeWorkshop({
  profileId,
  enabled,
  courses,
  history: initialHistory,
}: {
  profileId: string
  enabled: boolean | null
  courses: { slug: string; title: string }[] | null
  history: PracticeSessionView[] | null
}) {
  const [history, setHistory] = useState(initialHistory)
  const [courseSlug, setCourseSlug] = useState('')
  const [topics, setTopics] = useState<PracticeTopicView[] | null>(null)
  const [session, setSession] = useState<PracticeSessionView | null>(null)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [index, setIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftError, setDraftError] = useState(false)
  const lock = useRef(false)
  const startRequest = useRef<{ id: string; blockId: string } | null>(null)
  const questionTitle = useRef<HTMLLegendElement>(null)
  const viewerHeaders = { 'x-sz-viewer': profileId }

  useEffect(() => {
    if (!session || session.completedAt) return
    // Current question is focusable for keyboard and screen-reader users.
    if (session.questions[index]) questionTitle.current?.focus()
  }, [session, index])

  async function run(operation: () => Promise<void>) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError(null)
    try {
      await operation()
    } catch (cause) {
      const detail = z.object({ message: z.string() }).safeParse(cause)
      setError(
        detail.success ? detail.data.message : 'Não conseguimos concluir agora. Tente novamente.',
      )
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  function open(value: PracticeSessionView) {
    let saved: Record<string, string[]> = value.answers ?? {}
    if (!value.completedAt) {
      try {
        const raw = localStorage.getItem(draftKey(profileId, value.id))
        const parsed = Draft.safeParse(raw ? JSON.parse(raw) : {})
        if (parsed.success)
          saved = Object.fromEntries(
            value.questions.map((question) => [
              question.id,
              (parsed.data[question.id] ?? []).filter((id) =>
                question.choices.some((choice) => choice.id === id),
              ),
            ]),
          )
      } catch {
        setDraftError(true)
      }
    }
    setSession(value)
    setAnswers(saved)
    setIndex(0)
  }

  function choose(questionId: string, choiceId: string, multiple: boolean) {
    const current = answers[questionId] ?? []
    const selected = multiple
      ? current.includes(choiceId)
        ? current.filter((id) => id !== choiceId)
        : [...current, choiceId]
      : [choiceId]
    const next = { ...answers, [questionId]: selected }
    setAnswers(next)
    if (session)
      try {
        localStorage.setItem(draftKey(profileId, session.id), JSON.stringify(next))
        setDraftError(false)
      } catch {
        setDraftError(true)
      }
  }

  async function start(topic: PracticeTopicView) {
    await run(async () => {
      if (startRequest.current?.blockId !== topic.blockId)
        startRequest.current = { id: crypto.randomUUID(), blockId: topic.blockId }
      const result = await apiSend<{ session: PracticeSessionView }>(
        '/api/practice/sessions',
        'POST',
        {
          id: startRequest.current.id,
          courseSlug: topic.courseSlug,
          lessonId: topic.lessonId,
          blockId: topic.blockId,
        },
        viewerHeaders,
      )
      setHistory((current) =>
        [result.session, ...(current ?? []).filter((item) => item.id !== result.session.id)].slice(
          0,
          20,
        ),
      )
      open(result.session)
      startRequest.current = null
    })
  }

  const question = session?.questions[index]
  return (
    <>
      {error ? (
        <p role="alert" className="rounded-xl border border-destructive/40 bg-card p-4">
          {error}
        </p>
      ) : null}
      {session ? (
        <section
          aria-label="Sua prática"
          className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-8"
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">{session.title}</h2>
            <button
              type="button"
              className={secondaryClass}
              disabled={busy}
              onClick={() => {
                setSession(null)
                setError(null)
              }}
            >
              Voltar às práticas
            </button>
          </div>
          {session.review ? (
            <div className="space-y-5">
              <p role="status" className="text-lg font-bold">
                Você revisou {session.questions.length}{' '}
                {session.questions.length === 1 ? 'pergunta' : 'perguntas'}.
              </p>
              {session.questions.map((item) => {
                const review = session.review?.questions.find(
                  (result) => result.questionId === item.id,
                )
                return (
                  <article key={item.id} className="rounded-2xl border border-border p-5">
                    <h3 className="font-bold">{item.prompt}</h3>
                    <p className="mt-3 font-semibold text-primary">
                      {review?.correct ? 'Você acertou!' : 'Vamos entender juntos.'}
                    </p>
                    <p className="mt-2 text-sm">
                      Sua resposta:{' '}
                      {item.choices
                        .filter((choice) => session.answers?.[item.id]?.includes(choice.id))
                        .map((choice) => choice.label)
                        .join('; ')}
                    </p>
                    <p className="mt-2 text-sm">
                      Resposta esperada:{' '}
                      {item.choices
                        .filter((choice) => review?.correctChoiceIds.includes(choice.id))
                        .map((choice) => choice.label)
                        .join('; ')}
                    </p>
                    {review?.explanation ? (
                      <p className="mt-3 text-muted-foreground">{review.explanation}</p>
                    ) : null}
                  </article>
                )
              })}
              <Link
                className={actionClass}
                href={`/cursos/${encodeURIComponent(session.courseSlug)}/aulas/${encodeURIComponent(session.lessonId)}`}
              >
                Rever a aula
              </Link>
            </div>
          ) : question ? (
            <>
              <p className="mb-4 text-sm font-semibold text-muted-foreground">
                Pergunta {index + 1} de {session.questions.length} · No seu ritmo
              </p>
              <fieldset disabled={busy}>
                <legend
                  ref={questionTitle}
                  tabIndex={-1}
                  className="mb-5 text-xl font-bold focus:outline-none"
                >
                  {question.prompt}
                </legend>
                <p className="mb-3 text-sm text-muted-foreground">
                  {question.multiple
                    ? 'Marque todas as respostas que achar corretas.'
                    : 'Escolha uma resposta.'}
                </p>
                <div className="grid gap-3">
                  {question.choices.map((choice) => (
                    <label
                      key={choice.id}
                      className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border p-4 focus-within:ring-2 focus-within:ring-ring ${(answers[question.id] ?? []).includes(choice.id) ? 'border-primary bg-primary/10' : 'border-border'}`}
                    >
                      <input
                        type={question.multiple ? 'checkbox' : 'radio'}
                        name={question.id}
                        checked={(answers[question.id] ?? []).includes(choice.id)}
                        onChange={() => choose(question.id, choice.id, question.multiple)}
                        className="size-5 accent-primary"
                      />
                      <span>{choice.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="mt-6 flex flex-wrap justify-between gap-3">
                <button
                  type="button"
                  className={secondaryClass}
                  disabled={busy || index === 0}
                  onClick={() => setIndex((current) => current - 1)}
                >
                  Anterior
                </button>
                {index < session.questions.length - 1 ? (
                  <button
                    type="button"
                    className={actionClass}
                    disabled={busy || !answers[question.id]?.length}
                    onClick={() => setIndex((current) => current + 1)}
                  >
                    Próxima
                  </button>
                ) : (
                  <button
                    type="button"
                    className={actionClass}
                    disabled={busy || session.questions.some((item) => !answers[item.id]?.length)}
                    onClick={() =>
                      run(async () => {
                        const result = await apiSend<{ session: PracticeSessionView }>(
                          `/api/practice/sessions/${session.id}/answers`,
                          'POST',
                          { answers },
                          viewerHeaders,
                        )
                        setSession(result.session)
                        setHistory((current) =>
                          [
                            result.session,
                            ...(current ?? []).filter((item) => item.id !== result.session.id),
                          ].slice(0, 20),
                        )
                        try {
                          localStorage.removeItem(draftKey(profileId, session.id))
                        } catch {
                          /* A local draft never changes the saved result. */
                        }
                      })
                    }
                  >
                    {busy ? 'Conferindo…' : 'Conferir e entender'}
                  </button>
                )}
              </div>
              {draftError ? (
                <p role="status" className="mt-4 text-sm">
                  Este navegador não conseguiu guardar suas escolhas. Conclua a prática antes de
                  sair desta página.
                </p>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Suas escolhas ficam guardadas neste navegador até você conferir.
                </p>
              )}
            </>
          ) : null}
        </section>
      ) : (
        <>
          {enabled === true ? (
            <section className="rounded-3xl border border-border bg-card p-5 sm:p-8">
              <h2 className="text-xl font-bold">O que você quer relembrar?</h2>
              <p className="mt-2 text-muted-foreground">
                Escolha um curso. Aparecem aqui os quizzes que você já concluiu nas aulas.
              </p>
              {courses === null ? (
                <p role="status" className="mt-4">
                  Não conseguimos consultar seus cursos. Atualize a página para tentar novamente.
                </p>
              ) : courses.length ? (
                <>
                  <label htmlFor="practice-course" className="mt-5 block font-bold">
                    Curso
                  </label>
                  <select
                    id="practice-course"
                    value={courseSlug}
                    disabled={busy}
                    className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-4"
                    onChange={(event) => {
                      const slug = event.target.value
                      setCourseSlug(slug)
                      setTopics(null)
                      if (slug)
                        void run(async () => {
                          const result = await apiGet<{ topics: PracticeTopicView[] }>(
                            `/api/practice/topics?courseSlug=${encodeURIComponent(slug)}`,
                            viewerHeaders,
                          )
                          setTopics(result.topics)
                        })
                    }}
                  >
                    <option value="">Escolha um curso</option>
                    {courses.map((course) => (
                      <option key={course.slug} value={course.slug}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                  {topics ? (
                    <div className="mt-5 grid gap-3">
                      {topics.length ? (
                        topics.map((topic) => (
                          <button
                            key={topic.blockId}
                            type="button"
                            disabled={busy}
                            onClick={() => start(topic)}
                            className="flex min-h-16 items-center justify-between gap-4 rounded-2xl border border-border p-4 text-left hover:border-primary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                          >
                            <span className="font-bold">{topic.title}</span>
                            <span className="shrink-0 text-sm">
                              {topic.questionCount}{' '}
                              {topic.questionCount === 1 ? 'pergunta' : 'perguntas'}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p>Este curso ainda não tem quizzes concluídos para relembrar por aqui.</p>
                      )}
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="mt-4">
                  Depois de concluir uma aula e seu quiz, você poderá relembrar esse conteúdo aqui.{' '}
                  <Link href="/cursos" className="underline">
                    Ir aos cursos
                  </Link>
                </p>
              )}
            </section>
          ) : (
            <p role="status" className="rounded-2xl border border-border bg-card p-5">
              {enabled === null
                ? 'Não conseguimos consultar a disponibilidade da prática. Tente atualizar a página.'
                : 'Novas práticas ainda não estão disponíveis para sua conta. Você pode consultar as que já começou abaixo.'}
            </p>
          )}
          <section aria-labelledby="practice-history">
            <h2 id="practice-history" className="text-xl font-bold">
              Suas últimas práticas
            </h2>
            <div className="mt-4 grid gap-3">
              {history === null ? (
                <p role="status">
                  Não conseguimos consultar seu histórico. Atualize a página para tentar novamente.
                </p>
              ) : history.length ? (
                history.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={busy}
                    onClick={() => open(item)}
                    className="flex min-h-16 flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left hover:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span>
                      <span className="block font-bold">{item.title}</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString('pt-BR', {
                          timeZone: 'America/Sao_Paulo',
                        })}
                      </span>
                    </span>
                    <span className="font-bold text-primary">
                      {item.completedAt ? 'Ver respostas' : 'Continuar'}
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-muted-foreground">Sua primeira prática aparecerá aqui.</p>
              )}
            </div>
          </section>
        </>
      )}
      {busy ? (
        <p role="status" className="text-sm text-muted-foreground">
          Carregando…
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        Este espaço é para relembrar. A Carreira do Criador continua nas aulas e nos jogos que você
        cria.
      </p>
    </>
  )
}
