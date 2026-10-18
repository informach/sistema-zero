import { isStudioProArtifact, type StudioProArtifact } from '@sistemazero/core/studio/pro-artifact'
import {
  type StudioPythonPreviewReference,
  StudioPythonPreviewReferenceSchema,
} from '@sistemazero/core/studio/python-preview-reference'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  captureProjectStorageScope,
  type ProjectStorageScope,
} from '../state/projectStorageRuntime'
import { useProjectStore, useProjectStoreApi } from '../state/projectStore'
import { useUIStore } from '../state/uiStore'
import { useStudioConfig } from './config'

interface CandidateIdentity {
  projectId: string
  jobId: string
  revisionHash: string
}
export type ProCandidatePreviewInput = CandidateIdentity &
  (
    | { kind?: 'javascript'; artifact: StudioProArtifact; version?: number }
    | { kind: 'python'; reference: StudioPythonPreviewReference; version: number }
  )
export type ProCandidatePreview = ProCandidatePreviewInput & {
  status: 'loading' | 'ready' | 'expired' | 'unavailable'
}
export const candidatePreviewId = (candidate: ProCandidatePreviewInput) =>
  candidate.kind === 'python' ? candidate.reference.id : candidate.artifact.id
const candidateExpiresAt = (candidate: ProCandidatePreviewInput) =>
  candidate.kind === 'python' ? candidate.reference.expiresAt : candidate.artifact.expiresAt
const candidateLanguage = (candidate: ProCandidatePreviewInput) =>
  candidate.kind === 'python' ? 'python' : 'javascript'
type Mode = 'current' | 'candidate'
interface CandidatePreviewContext {
  candidate: ProCandidatePreview | null
  mode: Mode
  focusNonce: number
  show(input: ProCandidatePreviewInput): boolean
  select(mode: Mode): void
  close(): void
  report(artifactId: string, status: ProCandidatePreview['status']): void
}
const EMPTY: CandidatePreviewContext = {
  candidate: null,
  mode: 'current',
  focusNonce: 0,
  show: () => false,
  select() {},
  close() {},
  report() {},
}
const Context = createContext<CandidatePreviewContext>(EMPTY)

/** UI-only selection. Never substitutes the document or writes a proposal to the project store. */
export function StudioProCandidatePreviewProvider({ children }: { children: ReactNode }) {
  const project = useProjectStore((state) => state.project)
  const store = useProjectStoreApi()
  const allowed = useStudioConfig().preview
  const setShowPreview = useUIStore((state) => state.setShowPreview)
  const scope = captureProjectStorageScope()
  const [selection, setSelection] = useState<{
    candidate: ProCandidatePreview
    scope: ProjectStorageScope
    mode: Mode
    focusNonce: number
  } | null>(null)
  const matches =
    project?.kind === 'pro' &&
    selection?.candidate.projectId === project.id &&
    candidateLanguage(selection.candidate) === (project.programmingLanguage ?? 'javascript') &&
    selection.scope === scope
  const candidate = matches ? selection.candidate : null
  const mode = matches ? selection.mode : 'current'
  useEffect(
    () =>
      store.subscribe((state, previous) => {
        // Observe every transition, including A -> B -> A in one React batch.
        if (
          state.project?.id !== previous.project?.id ||
          state.project?.kind !== previous.project?.kind ||
          state.project?.programmingLanguage !== previous.project?.programmingLanguage
        )
          setSelection(null)
      }),
    [store],
  )
  useEffect(() => {
    setSelection((previous) =>
      previous &&
      project?.kind === 'pro' &&
      previous.candidate.projectId === project.id &&
      candidateLanguage(previous.candidate) === (project.programmingLanguage ?? 'javascript') &&
      previous.scope === scope
        ? previous
        : null,
    )
  }, [project?.id, project?.kind, project?.programmingLanguage, scope])
  const close = useCallback(() => setSelection(null), [])
  const show = useCallback(
    (input: ProCandidatePreviewInput) => {
      const current = store.getState().project
      if (
        !allowed ||
        current?.kind !== 'pro' ||
        current.id !== input.projectId ||
        scope !== captureProjectStorageScope() ||
        candidateLanguage(input) !== (current.programmingLanguage ?? 'javascript') ||
        (input.kind === 'python'
          ? !StudioPythonPreviewReferenceSchema.safeParse(input.reference).success ||
            input.reference.projectId !== input.projectId ||
            !Number.isSafeInteger(input.version) ||
            input.version < 0
          : !isStudioProArtifact(input.artifact)) ||
        !/^[a-f0-9]{64}$/.test(input.revisionHash)
      )
        return false
      const identity = {
        projectId: input.projectId,
        jobId: input.jobId,
        revisionHash: input.revisionHash,
        version: input.version,
      }
      const captured: ProCandidatePreviewInput =
        input.kind === 'python'
          ? {
              ...identity,
              kind: 'python',
              version: input.version,
              reference: { ...input.reference },
            }
          : { ...identity, kind: input.kind, artifact: { ...input.artifact } }
      setSelection((previous) => ({
        candidate: {
          ...captured,
          status:
            candidateExpiresAt(input) <= Date.now()
              ? 'expired'
              : previous?.scope === scope &&
                  previous.mode === 'candidate' &&
                  previous.candidate.jobId === input.jobId &&
                  previous.candidate.revisionHash === input.revisionHash &&
                  candidatePreviewId(previous.candidate) === candidatePreviewId(input) &&
                  previous.candidate.version === input.version
                ? previous.candidate.status
                : 'loading',
        },
        scope,
        mode: 'candidate',
        focusNonce: (previous?.focusNonce ?? 0) + 1,
      }))
      setShowPreview(true)
      return true
    },
    [allowed, scope, setShowPreview, store],
  )
  const select = useCallback(
    (next: Mode) => {
      setSelection((previous) =>
        previous &&
        previous.scope === captureProjectStorageScope() &&
        previous.candidate.projectId === store.getState().project?.id
          ? { ...previous, mode: next, focusNonce: previous.focusNonce + 1 }
          : null,
      )
      setShowPreview(true)
    },
    [setShowPreview, store],
  )
  const report = useCallback(
    (artifactId: string, status: ProCandidatePreview['status']) => {
      setSelection((previous) =>
        previous &&
        previous.scope === captureProjectStorageScope() &&
        previous.candidate.projectId === store.getState().project?.id &&
        candidatePreviewId(previous.candidate) === artifactId &&
        previous.candidate.status !== status
          ? { ...previous, candidate: { ...previous.candidate, status } }
          : previous,
      )
    },
    [store],
  )
  // Derivation hides stale selections immediately; a new show never revives an old profile scope.
  const value = useMemo(
    () => ({
      candidate,
      mode,
      focusNonce: matches ? selection.focusNonce : 0,
      show,
      select,
      close,
      report,
    }),
    [candidate, mode, matches, selection, show, select, close, report],
  )
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useProCandidatePreview(): CandidatePreviewContext {
  return useContext(Context)
}
