import type { StudioStudentTest } from '@sistemazero/core/studio/student-tests'
import { STUDENT_TESTS_MAX } from '@sistemazero/core/studio/student-tests'
import { type JSX, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { IconCheckCircle, IconPlay, IconX } from '#ui'
import { isPythonProject, javaScriptProject } from '../../core/editableProject'
import { createDictionaryTranslator, type Translator } from '../../core/i18n/translator'
import { pythonCanvasExtension } from '../../runtime/python/canvasExtension'
import { useProjectStore } from '../../state/projectStore'
import { studentTestResultsFor } from '../../state/studentTestResults'
import { usePreviewDocumentSource, usePythonTestHostSource } from '../../state/studioStores'
import { useUIStoreApi } from '../../state/uiStore'
import { runStudentTest, type StudentTestOutcome } from '../../studentTests/runner'
import { useT } from '../../studio/i18n'
import { useStudioExecution } from '../../studio/observation'
import { pythonTopLevelNames } from './pythonInvestigation'
import { STUDENT_TESTS_COPY, STUDENT_TESTS_PYTHON_COPY } from './studentTestsCopy'
import { type StudentTestNames, studentTestNames } from './studentTestsNames'
import { functionKey, type PythonTestFunction, pythonTestFunctions } from './studentTestsPython'
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

/** No Python, as frases falam do programa (`STUDENT_TESTS_PYTHON_COPY` troca as do jogo). */
const PYTHON_TESTS_COPY = {
  'pt-BR': { ...STUDENT_TESTS_COPY['pt-BR'], ...STUDENT_TESTS_PYTHON_COPY['pt-BR'] },
  en: { ...STUDENT_TESTS_COPY.en, ...STUDENT_TESTS_PYTHON_COPY.en },
}

function useTestsT(python: boolean): Translator {
  const t = useT()
  return createDictionaryTranslator(
    python ? PYTHON_TESTS_COPY : STUDENT_TESTS_COPY,
    t.locale ?? 'pt-BR',
  )
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
 *
 * No Python clássico (a tabela da proposta: "testar o programa e testar uma função"), cada teste
 * roda numa execução escondida do Python (`studentTests/pythonRunner.ts`); o teste novo escolhe
 * entre testar o programa (com Turtle, Pygame Zero, pygame-ce ou Raylib) e testar uma função.
 */
export function StudentTestsPanel(): JSX.Element {
  const python = useProjectStore((s) =>
    s.project && isPythonProject(s.project) && s.project.kind === 'classic' ? s.project : null,
  )
  const t = useTestsT(Boolean(python))
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
  const javascript = useProjectStore((s) => (s.project ? javaScriptProject(s.project) : null))
  const project = python ?? javascript
  const setStudentTests = useProjectStore((s) => s.setStudentTests)
  const readOnly = useStudioExecution().editingAccess === 'observer'
  const previewDocument = usePreviewDocumentSource()
  const pythonHost = usePythonTestHostSource()
  const tests = project?.studentTests ?? []
  // Testar o programa é do programa Python que desenha; sem biblioteca de jogo, só função.
  const testsProgram = !python || pythonCanvasExtension(python.installedExtensions) !== undefined
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
      const outcome = python
        ? await import('../../studentTests/pythonRunner').then(({ runPythonStudentTest }) =>
            runPythonStudentTest({
              test,
              host: pythonHost?.get() ?? null,
              signal: controller.signal,
            }),
          )
        : await runStudentTest({
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
        language={python ? 'python' : 'javascript'}
        testsProgram={testsProgram}
        functions={python ? pythonTestFunctions(python.files, python.python.entrypoint) : []}
        names={
          python
            ? pythonNames(python.files[python.python.entrypoint] ?? '')
            : studentTestNames(project.files['script.js'] ?? '', project.blocksState)
        }
        canClick={
          !python && project.installedExtensions.some((extension) => extension.id === 'game-2d')
        }
        error={saveError}
        onCancel={() => {
          setSaveError(null)
          setEditing(null)
        }}
        onSave={(form) => {
          const id = editing.test?.id ?? newTestId(new Set(tests.map((test) => test.id)))
          const built = testFromForm(t, form, id, python ? 'python' : 'javascript')
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
            t(testsProgram ? 'tests.empty' : 'tests.empty.function')
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
/** No Python a tela é um desenho: não há texto de página para conferir. */
const PYTHON_CHECK_KINDS: readonly CheckKind[] = ['value', 'spriteX', 'spriteY', 'console']

/** Os nomes que o formulário oferece no Python: as variáveis do topo do arquivo inicial. */
function pythonNames(source: string): StudentTestNames {
  const names = pythonTopLevelNames(source)
  return { variables: names, sprites: names, groups: [] }
}

/** O exemplo da prancha, em Python: a função que soma os pontos. */
const PYTHON_FUNCTION_SAMPLE = 'def somar_pontos(pontos, bonus):\n    return pontos + bonus'

function TestEditor({
  t,
  test,
  language,
  testsProgram,
  functions,
  names,
  canClick,
  error,
  onSave,
  onCancel,
  onDelete,
}: {
  t: Translator
  test: StudioStudentTest | null
  language: 'javascript' | 'python'
  /** O teste do programa existe (no Python, só no programa com biblioteca de jogo). */
  testsProgram: boolean
  /** As funções que o teste de função oferece (só no Python). */
  functions: readonly PythonTestFunction[]
  names: StudentTestNames
  /** O clique no sprite de um grupo lê o grupo pelo inspetor do Jogo 2D: só com ele instalado. */
  canClick: boolean
  error: string | null
  onSave: (form: TestForm) => FormProblem | null
  onCancel: () => void
  onDelete?: () => void
}): JSX.Element {
  const [form, setForm] = useState<TestForm>(() =>
    formFromTest(t, test, testsProgram ? 'behavior' : 'function'),
  )
  const [problem, setProblem] = useState<FormProblem | null>(null)
  const nameId = useId()
  const headingId = useId()
  const fnId = useId()
  const casesId = useId()
  const python = language === 'python'
  const checkKinds = python ? PYTHON_CHECK_KINDS : CHECK_KINDS
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
  const nameOptions = (list: readonly string[], current: string) => (
    <>
      <option value="" disabled>
        {list.length ? '' : t('tests.form.noNames')}
      </option>
      {/* O nome guardado num teste que o projeto não tem mais continua na lista. */}
      {current && !list.includes(current) ? <option value={current}>{current}</option> : null}
      {list.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </>
  )
  const secondsUnit = (text: string) => {
    const value = Number(text.replace(',', '.'))
    return t(Number.isFinite(value) && value < 2 ? 'tests.second' : 'tests.seconds')
  }
  const nameField = (
    <>
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
    </>
  )
  const footer = (
    <>
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
    </>
  )
  // O teste guardado com uma função que o projeto não tem mais continua na lista.
  const fnOptions =
    functions.some((fn) => functionKey(fn) === form.fn) || !form.fn
      ? functions
      : [
          {
            name: form.fn.slice(form.fn.lastIndexOf(':') + 1),
            ...(form.fn.includes(':')
              ? { module: form.fn.slice(0, form.fn.lastIndexOf(':')) }
              : {}),
          },
          ...functions,
        ]

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
      {python && testsProgram ? (
        <fieldset className="m-0 flex flex-wrap items-center gap-1.5 border-0 p-0">
          <legend className="sr-only">{t('tests.kind')}</legend>
          {(['behavior', 'function'] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              className={`sz-pro-btn sz-pro-btn--sm${form.kind === kind ? ' sz-pro-btn--primary' : ''}`}
              aria-pressed={form.kind === kind}
              onClick={() => change({ kind })}
            >
              {t(`tests.kind.${kind}`)}
            </button>
          ))}
        </fieldset>
      ) : null}
      {python && form.kind === 'function' ? (
        <div className="sz-student-test-form__columns">
          <div className="flex min-w-0 flex-col gap-2">
            {nameField}
            {fnOptions.length === 0 ? (
              <>
                <p className="m-0 text-sm">{t('tests.function.none')}</p>
                <pre className="sz-student-test-form__sample m-0 rounded-lg bg-sz-bg p-2.5 text-xs">
                  <code>{PYTHON_FUNCTION_SAMPLE}</code>
                </pre>
                <p className="m-0 text-xs text-sz-fg-soft">{t('tests.function.after')}</p>
              </>
            ) : (
              <>
                <label htmlFor={fnId} className="text-xs font-bold">
                  {t('tests.function.pick')}
                </label>
                <select
                  id={fnId}
                  className={FIELD}
                  value={form.fn}
                  onChange={(event) => change({ fn: event.target.value })}
                >
                  <option value="" disabled />
                  {fnOptions.map((fn) => (
                    <option key={functionKey(fn)} value={functionKey(fn)}>
                      {fn.module ? `${fn.name} (${fn.module})` : fn.name}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor={casesId} className="text-xs font-bold">
              {t('tests.function.cases')}
            </label>
            <textarea
              id={casesId}
              className={`${FIELD} min-h-24 py-1.5 font-mono`}
              value={form.cases}
              spellCheck={false}
              autoComplete="off"
              placeholder="2, 3 -> 5"
              onChange={(event) => change({ cases: event.target.value })}
            />
            <p className="m-0 text-xs text-sz-fg-soft">{t('tests.function.casesNote')}</p>
            <p className="m-0 text-xs text-sz-fg-soft">{t('tests.function.note')}</p>
            {footer}
          </div>
        </div>
      ) : (
        <div className="sz-student-test-form__columns">
          <div className="flex min-w-0 flex-col gap-2">
            {nameField}
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
                      const key = step.kind === 'press' || step.kind === 'hold' ? step.key : 'Enter'
                      const seconds =
                        step.kind === 'hold' || step.kind === 'wait' ? step.seconds : '1'
                      setStep(
                        index,
                        kind === 'press'
                          ? { kind, key }
                          : kind === 'hold'
                            ? { kind, key, seconds }
                            : kind === 'wait'
                              ? { kind, seconds }
                              : { kind, sprite: '', group: '' },
                      )
                    }}
                  >
                    <option value="press">{t('tests.form.step.press')}</option>
                    <option value="hold">{t('tests.form.step.hold')}</option>
                    <option value="wait">{t('tests.form.step.wait')}</option>
                    {canClick || step.kind === 'click' ? (
                      <option value="click">{t('tests.form.step.click')}</option>
                    ) : null}
                  </select>
                  {step.kind === 'click' ? (
                    <>
                      <select
                        aria-label={t('tests.form.clickSprite', { n: index + 1 })}
                        className={FIELD}
                        value={step.sprite}
                        onChange={(event) =>
                          setStep(index, { ...step, sprite: event.target.value })
                        }
                      >
                        {nameOptions(names.sprites, step.sprite)}
                      </select>
                      <span>{t('tests.form.ofGroup')}</span>
                      <select
                        aria-label={t('tests.form.clickGroup', { n: index + 1 })}
                        className={FIELD}
                        value={step.group}
                        onChange={(event) => setStep(index, { ...step, group: event.target.value })}
                      >
                        {nameOptions(names.groups, step.group)}
                      </select>
                    </>
                  ) : null}
                  {step.kind === 'press' || step.kind === 'hold' ? (
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
                  {step.kind === 'hold' || step.kind === 'wait' ? (
                    <>
                      {step.kind === 'hold' ? <span>{t('tests.form.for')}</span> : null}
                      <input
                        aria-label={t('tests.form.seconds', { n: index + 1 })}
                        className={`${FIELD} w-16`}
                        inputMode="decimal"
                        value={step.seconds}
                        onChange={(event) =>
                          setStep(index, { ...step, seconds: event.target.value })
                        }
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
                {checkKinds.map((kind) => (
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
                  {nameOptions(subjects, form.subject)}
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
            {footer}
          </div>
        </div>
      )}
    </form>
  )
}
