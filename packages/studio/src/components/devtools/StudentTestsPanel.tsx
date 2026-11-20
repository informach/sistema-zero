import type { StudioStudentTest } from '@sistemazero/core/studio/student-tests'
import { STUDENT_TESTS_MAX } from '@sistemazero/core/studio/student-tests'
import { type JSX, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { IconCheckCircle, IconPlay, IconX } from '#ui'
import { javaScriptProject } from '../../core/editableProject'
import { createDictionaryTranslator, type Translator } from '../../core/i18n/translator'
import { useProjectStore } from '../../state/projectStore'
import { studentTestResultsFor } from '../../state/studentTestResults'
import { usePreviewDocumentSource } from '../../state/studioStores'
import { useUIStoreApi } from '../../state/uiStore'
import { runStudentTest, type StudentTestOutcome } from '../../studentTests/runner'
import { useT } from '../../studio/i18n'
import { useStudioExecution } from '../../studio/observation'
import { STUDENT_TESTS_COPY } from './studentTestsCopy'
import { type StudentTestNames, studentTestNames } from './studentTestsNames'
import {
  type CheckKind,
  comparesFor,
  describeOutcome,
  describeTest,
  FORM_KEYS,
  type FormProblem,
  type FormStep,
  formFromTest,
  isFormKey,
  keyLabel,
  newTestId,
  type TestForm,
  testFromForm,
} from './studentTestsText'

function useTestsT(): Translator {
  const t = useT()
  return createDictionaryTranslator(STUDENT_TESTS_COPY, t.locale ?? 'pt-BR')
}

/** O círculo com o X (Lucide "circle-x"): o teste que não passou. */
function IconCircleX(): JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6M9 9l6 6" />
    </svg>
  )
}

const FIELD =
  'min-h-8 rounded-lg border border-sz-border bg-sz-bg px-2.5 text-sm font-normal text-sz-fg'

/**
 * A aba Meus testes da gaveta (proposta aprovada em 20/11/2026, pranchas "Meus testes" e "Meus
 * testes: um teste novo" de `docs/estudio-evolucao/paineis-proposta.md`). Cada teste roda o jogo
 * do zero num palco escondido (`studentTests/runner.ts`), aperta as teclas e confere um valor no
 * fim, com o formato e o julgamento dos objetivos das aulas. Os testes ficam guardados no projeto;
 * rodar não muda nada nele. Fechar a gaveta para a rodada.
 */
export function StudentTestsPanel(): JSX.Element {
  const t = useTestsT()
  const ui = useUIStoreApi()
  const results = useMemo(() => studentTestResultsFor(ui), [ui])
  const { outcomes, running, resultsProject } = useStore(
    results,
    useShallow((s) => ({
      outcomes: s.outcomes,
      running: s.running,
      resultsProject: s.projectId,
    })),
  )
  const project = useProjectStore((s) => (s.project ? javaScriptProject(s.project) : null))
  const setStudentTests = useProjectStore((s) => s.setStudentTests)
  const readOnly = useStudioExecution().editingAccess === 'observer'
  const previewDocument = usePreviewDocumentSource()
  const tests = project?.studentTests ?? []
  const own = project && resultsProject === project.id ? outcomes : {}
  const [editing, setEditing] = useState<{ test: StudioStudentTest | null } | null>(null)
  const [openEnding, setOpenEnding] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)
  // A aba saiu de cena (a gaveta fechou): a rodada para e o quadro escondido sai.
  useEffect(
    () => () => {
      abort.current?.abort()
      results.setState({ running: null })
    },
    [results],
  )

  const runAll = async () => {
    if (!project || running || tests.length === 0) return
    const controller = new AbortController()
    abort.current = controller
    setOpenEnding(null)
    results.setState({
      projectId: project.id,
      outcomes: {},
      running: { current: 1, total: tests.length },
    })
    for (const [index, test] of tests.entries()) {
      if (controller.signal.aborted) break
      results.setState({ running: { current: index + 1, total: tests.length } })
      const outcome = await runStudentTest({
        test,
        documentFactory: previewDocument?.get() ?? null,
        parentOrigin: window.location.origin,
        signal: controller.signal,
      })
      if (controller.signal.aborted) break
      results.setState((s) => ({ outcomes: { ...s.outcomes, [test.id]: outcome } }))
    }
    if (abort.current === controller) abort.current = null
    results.setState({ running: null })
  }

  const save = (next: StudioStudentTest[], changedId: string | null) => {
    const error = setStudentTests(next)
    if (error) {
      setSaveError(error)
      return false
    }
    setSaveError(null)
    // O resultado de um teste mudado não vale mais.
    if (changedId && own[changedId])
      results.setState((s) => {
        const { [changedId]: _old, ...rest } = s.outcomes
        return { outcomes: rest }
      })
    return true
  }

  if (editing && project && !readOnly)
    return (
      <TestEditor
        t={t}
        test={editing.test}
        names={studentTestNames(project.files['script.js'] ?? '', project.blocksState)}
        error={saveError}
        onCancel={() => {
          setSaveError(null)
          setEditing(null)
        }}
        onSave={(form) => {
          const id = editing.test?.id ?? newTestId(new Set(tests.map((test) => test.id)))
          const built = testFromForm(t, form, id)
          if ('problem' in built) return built.problem
          const next = editing.test
            ? tests.map((test) => (test.id === id ? built.test : test))
            : [...tests, built.test]
          if (save(next, id)) setEditing(null)
          return null
        }}
        onDelete={
          editing.test
            ? () => {
                const id = editing.test?.id ?? ''
                if (
                  save(
                    tests.filter((test) => test.id !== id),
                    id,
                  )
                )
                  setEditing(null)
              }
            : undefined
        }
      />
    )

  const done = tests.filter((test) => own[test.id])
  const passed = done.filter((test) => own[test.id]?.status === 'passed').length
  const full = tests.length >= STUDENT_TESTS_MAX
  const summary =
    done.length === tests.length && tests.length > 0
      ? tests.length === 1
        ? t('tests.summary.one', { passed })
        : passed === 1
          ? t('tests.summary.manyOne', { total: tests.length })
          : t('tests.summary.many', { passed, total: tests.length })
      : null

  return (
    <div className="flex flex-col gap-2" data-sz-devtools="tests">
      <div className="flex flex-wrap items-center gap-2.5">
        {!readOnly ? (
          <button
            type="button"
            className="sz-pro-btn sz-pro-btn--sm sz-pro-btn--primary"
            disabled={Boolean(running) || tests.length === 0}
            onClick={() => void runAll()}
          >
            <IconPlay />
            {t('tests.run')}
          </button>
        ) : null}
        {!readOnly ? (
          <button
            type="button"
            className="sz-pro-btn sz-pro-btn--sm"
            disabled={Boolean(running) || full}
            title={full ? t('tests.form.full') : undefined}
            onClick={() => setEditing({ test: null })}
          >
            {t('tests.new')}
          </button>
        ) : null}
        <span className="text-sm" role="status">
          {running ? (
            t('tests.running', running)
          ) : tests.length === 0 ? (
            t('tests.empty')
          ) : (
            <>
              {summary ? <b>{summary}</b> : null}
              {summary ? ' ' : null}
              {t(tests.length === 1 ? 'tests.note.one' : 'tests.note.many')}
            </>
          )}
        </span>
      </div>
      {saveError ? (
        <p role="alert" className="m-0 text-sm text-sz-error">
          {saveError}
        </p>
      ) : null}
      {tests.map((test) => (
        <TestCard
          key={test.id}
          t={t}
          test={test}
          outcome={own[test.id]}
          endingOpen={openEnding === test.id}
          readOnly={readOnly || Boolean(running)}
          onEdit={() => setEditing({ test })}
          onToggleEnding={() => setOpenEnding(openEnding === test.id ? null : test.id)}
        />
      ))}
    </div>
  )
}

function TestCard({
  t,
  test,
  outcome,
  endingOpen,
  readOnly,
  onEdit,
  onToggleEnding,
}: {
  t: Translator
  test: StudioStudentTest
  outcome: StudentTestOutcome | undefined
  endingOpen: boolean
  readOnly: boolean
  onEdit: () => void
  onToggleEnding: () => void
}): JSX.Element {
  const line = outcome ? describeOutcome(t, test, outcome) : null
  const failed = line?.tone === 'failed'
  const ending = outcome?.status === 'failed' ? outcome.ending : undefined
  const endingId = useId()
  return (
    <article
      className={`sz-pro-card sz-student-test${failed ? ' sz-student-test--failed' : ''}`}
      data-sz-test-status={outcome?.status ?? 'idle'}
    >
      <span
        className={
          line?.tone === 'passed' ? 'text-sz-success' : failed ? 'text-sz-error' : 'text-sz-fg-mute'
        }
      >
        {line?.tone === 'passed' ? <IconCheckCircle /> : failed ? <IconCircleX /> : null}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="m-0 text-sm font-bold">{test.name}</p>
        <p className="m-0 text-xs text-sz-fg-soft">{describeTest(t, test)}</p>
        {line ? (
          <p
            className={`m-0 text-xs font-bold ${
              line.tone === 'passed'
                ? 'text-sz-success'
                : line.tone === 'failed'
                  ? 'text-sz-error'
                  : 'text-sz-fg-soft'
            }`}
          >
            {line.text}
          </p>
        ) : null}
        {endingOpen && outcome?.status === 'failed' ? (
          <div id={endingId} className="pt-1">
            {ending ? (
              <img
                src={ending}
                alt={t('tests.ending.alt', { name: test.name })}
                className="sz-student-test__ending"
              />
            ) : (
              <p className="m-0 text-xs text-sz-fg-soft">{t('tests.ending.none')}</p>
            )}
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-end gap-1.5">
        {outcome?.status === 'failed' ? (
          <button
            type="button"
            className="sz-pro-btn sz-pro-btn--sm"
            aria-expanded={endingOpen}
            aria-controls={endingOpen ? endingId : undefined}
            onClick={onToggleEnding}
          >
            {t('tests.ending')}
          </button>
        ) : null}
        {!readOnly ? (
          <button type="button" className="sz-pro-btn sz-pro-btn--sm" onClick={onEdit}>
            {t('tests.edit')}
          </button>
        ) : null}
      </div>
    </article>
  )
}

const CHECK_KINDS: readonly CheckKind[] = ['value', 'spriteX', 'spriteY', 'text', 'console']

function TestEditor({
  t,
  test,
  names,
  error,
  onSave,
  onCancel,
  onDelete,
}: {
  t: Translator
  test: StudioStudentTest | null
  names: StudentTestNames
  error: string | null
  onSave: (form: TestForm) => FormProblem | null
  onCancel: () => void
  onDelete?: () => void
}): JSX.Element {
  const [form, setForm] = useState<TestForm>(() => formFromTest(t, test))
  const [problem, setProblem] = useState<FormProblem | null>(null)
  const nameId = useId()
  const headingId = useId()
  const change = (patch: Partial<TestForm>) => {
    setProblem(null)
    setForm((current) => ({ ...current, ...patch }))
  }
  const setStep = (index: number, step: FormStep) =>
    change({ steps: form.steps.map((item, at) => (at === index ? step : item)) })
  const subjects =
    form.check === 'value'
      ? names.variables
      : form.check === 'spriteX' || form.check === 'spriteY'
        ? names.sprites
        : []
  const compares = comparesFor(form.check)
  const needsValue = !['changed', 'increased', 'decreased', 'truthy'].includes(form.compare)
  const secondsUnit = (text: string) => {
    const value = Number(text.replace(',', '.'))
    return t(Number.isFinite(value) && value < 2 ? 'tests.second' : 'tests.seconds')
  }

  return (
    <form
      className="sz-pro-card sz-student-test-form"
      aria-labelledby={headingId}
      onSubmit={(event) => {
        event.preventDefault()
        setProblem(onSave(form))
      }}
    >
      <h3 id={headingId} className="m-0 text-base font-bold">
        {t(test ? 'tests.form.edit' : 'tests.form.new')}
      </h3>
      <div className="sz-student-test-form__columns">
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor={nameId} className="text-xs font-bold">
            {t('tests.form.name')}
          </label>
          <input
            id={nameId}
            className={FIELD}
            value={form.name}
            maxLength={60}
            autoComplete="off"
            onChange={(event) => change({ name: event.target.value })}
          />
          <p className="m-0 text-xs font-bold">{t('tests.form.when')}</p>
          <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
            {form.steps.map((step, index) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: os passos não têm id; a ordem é o que a criança vê
                key={index}
                className="flex flex-wrap items-center gap-1.5 text-sm"
              >
                <span className="w-5 text-xs text-sz-fg-soft">{index + 1}.</span>
                <select
                  aria-label={t('tests.form.step', { n: index + 1 })}
                  className={FIELD}
                  value={step.kind}
                  onChange={(event) => {
                    const kind = event.target.value as FormStep['kind']
                    const key = step.kind === 'wait' ? 'Enter' : step.key
                    setStep(
                      index,
                      kind === 'press'
                        ? { kind, key }
                        : kind === 'hold'
                          ? { kind, key, seconds: step.kind === 'press' ? '1' : step.seconds }
                          : { kind, seconds: step.kind === 'press' ? '1' : step.seconds },
                    )
                  }}
                >
                  <option value="press">{t('tests.form.step.press')}</option>
                  <option value="hold">{t('tests.form.step.hold')}</option>
                  <option value="wait">{t('tests.form.step.wait')}</option>
                </select>
                {step.kind !== 'wait' ? (
                  <select
                    aria-label={t('tests.form.key', { n: index + 1 })}
                    className={FIELD}
                    value={step.key}
                    onChange={(event) => {
                      const key = event.target.value
                      if (isFormKey(key)) setStep(index, { ...step, key })
                    }}
                  >
                    {FORM_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {keyLabel(t, key)}
                      </option>
                    ))}
                  </select>
                ) : null}
                {step.kind !== 'press' ? (
                  <>
                    {step.kind === 'hold' ? <span>{t('tests.form.for')}</span> : null}
                    <input
                      aria-label={t('tests.form.seconds', { n: index + 1 })}
                      className={`${FIELD} w-16`}
                      inputMode="decimal"
                      value={step.seconds}
                      onChange={(event) => setStep(index, { ...step, seconds: event.target.value })}
                    />
                    <span>{secondsUnit(step.seconds)}</span>
                  </>
                ) : null}
                <button
                  type="button"
                  className="sz-pro-btn sz-pro-btn--sm sz-student-test-form__remove"
                  aria-label={t('tests.form.remove', { n: index + 1 })}
                  onClick={() => change({ steps: form.steps.filter((_, at) => at !== index) })}
                >
                  <IconX />
                </button>
              </li>
            ))}
          </ol>
          <div>
            <button
              type="button"
              className="sz-pro-btn sz-pro-btn--sm"
              disabled={form.steps.length >= 20}
              onClick={() => change({ steps: [...form.steps, { kind: 'press', key: 'Enter' }] })}
            >
              {t('tests.form.more')}
            </button>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <p className="m-0 text-xs font-bold">{t('tests.form.check')}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <select
              aria-label={t('tests.form.target')}
              className={FIELD}
              value={form.check}
              onChange={(event) => {
                const check = event.target.value as CheckKind
                const list = comparesFor(check)
                change({
                  check,
                  subject: '',
                  compare: list.includes(form.compare) ? form.compare : 'equals',
                })
              }}
            >
              {CHECK_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {t(`tests.form.target.${kind}`)}
                </option>
              ))}
            </select>
            {form.check !== 'text' && form.check !== 'console' ? (
              <select
                aria-label={t(
                  form.check === 'value' ? 'tests.form.name.variable' : 'tests.form.name.sprite',
                )}
                className={FIELD}
                value={form.subject}
                onChange={(event) => change({ subject: event.target.value })}
              >
                <option value="" disabled>
                  {subjects.length ? '' : t('tests.form.noNames')}
                </option>
                {/* O nome guardado num teste que o projeto não tem mais continua na lista. */}
                {form.subject && !subjects.includes(form.subject) ? (
                  <option value={form.subject}>{form.subject}</option>
                ) : null}
                {subjects.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            ) : null}
            <select
              aria-label={t('tests.form.compare')}
              className={FIELD}
              value={form.compare}
              onChange={(event) => change({ compare: event.target.value as TestForm['compare'] })}
            >
              {compares.map((compare) => (
                <option key={compare} value={compare}>
                  {t(`tests.compare.${compare}`)}
                </option>
              ))}
            </select>
            {needsValue ? (
              <input
                aria-label={t('tests.form.value')}
                className={`${FIELD} w-32`}
                value={form.value}
                autoComplete="off"
                onChange={(event) => change({ value: event.target.value })}
              />
            ) : null}
          </div>
          <p className="m-0 text-xs text-sz-fg-soft">{t('tests.form.note')}</p>
          {problem || error ? (
            <p role="alert" className="m-0 text-sm text-sz-error">
              {problem ? t(problem) : error}
            </p>
          ) : null}
          <div className="mt-auto flex flex-wrap gap-1.5">
            <button type="submit" className="sz-pro-btn sz-pro-btn--sm sz-pro-btn--primary">
              {t('tests.form.save')}
            </button>
            <button type="button" className="sz-pro-btn sz-pro-btn--sm" onClick={onCancel}>
              {t('tests.form.cancel')}
            </button>
            {onDelete ? (
              <button
                type="button"
                className="sz-pro-btn sz-pro-btn--sm sz-student-test-form__delete"
                onClick={onDelete}
              >
                {t('tests.form.delete')}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </form>
  )
}
