'use client'

import {
  PYTHON_COURSE_BLOCKS,
  pythonCourseUnlockIssue,
} from '@sistemazero/studio/python-course-unlocks'
import { Button } from '@sistemazero/ui/button'
import { Select } from '@sistemazero/ui/select'
import { useMemo, useState } from 'react'
import { studioAuthoringChoices } from '../../lib/studio-authoring-options'
import type { StudioPaletteProject } from '../../lib/studio-authoring-palette'
import {
  type CourseBlockLanguage,
  changeCourseBlocks,
  courseBlocksForLanguage,
} from '../../lib/studio-course-blocks'
import { StudioBlocksPicker } from './studio-blocks-picker'
import { useStudioAuthoringOptions } from './use-studio-authoring-options'
import { useStudioAuthoringPalette } from './use-studio-authoring-palette'

const pythonLabels = new Map(PYTHON_COURSE_BLOCKS.map((entry) => [entry.id, entry.title]))

/** Course rewards have their own selection lifecycle; lesson allowBlocks remains unchanged. */
export function StudioCourseBlocksPicker({
  value,
  onChange,
}: {
  value: string[]
  onChange(next: string[]): void
}) {
  const [language, setLanguage] = useState<CourseBlockLanguage>('javascript')
  const [environmentKey, setEnvironmentKey] = useState('')
  const [notice, setNotice] = useState<{ added: string[]; removed: string[] } | null>(null)
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const authoring = useStudioAuthoringOptions(language === 'python')
  const choices = authoring.prepared
    ? studioAuthoringChoices(authoring.prepared, 'classic').filter(
        (choice) => choice.language === 'python',
      )
    : []
  const selected = environmentKey
    ? choices.find((choice) => choice.key === environmentKey)
    : choices[0]
  const project = useMemo<StudioPaletteProject | null>(() => {
    const runtime = selected?.policy?.runtime
    const release = authoring.prepared?.catalog?.releases.find(
      (candidate) => candidate.manifestSha256 === runtime?.manifestSha256,
    )
    if (!runtime || !release) return null
    return {
      programmingLanguage: 'python',
      runtime,
      // Rewards may include any approved extension, independently of a lesson seed.
      installedExtensions: release.manifest.extensions.flatMap((extension) =>
        extension.versions[0]
          ? [{ id: extension.id, version: extension.versions[0], installedAt: 0 }]
          : [],
      ),
    }
  }, [selected?.policy?.runtime, authoring.prepared])
  const python = useStudioAuthoringPalette(
    language === 'python' && project !== null,
    project,
    authoring.prepared,
  )
  const catalogError =
    authoring.error ??
    python.error ??
    (authoring.prepared && !selected
      ? 'Não há um catálogo Python aprovado disponível. A seleção salva foi preservada.'
      : null)
  const visible = courseBlocksForLanguage(value, language)
  const issue = pythonCourseUnlockIssue(value)

  function apply(next: string[], action: 'selection' | 'import') {
    setSelectionError(null)
    if (language === 'javascript') {
      onChange([...courseBlocksForLanguage(value, 'python'), ...next])
      setNotice(null)
      return
    }
    try {
      if (catalogError || !python.palette)
        throw new Error(catalogError ?? 'Aguarde o catálogo Python.')
      const change = changeCourseBlocks({
        current: value,
        next,
        language,
        catalog: python.palette.blocks,
        action,
      })
      onChange(change.blocks)
      setNotice({ added: change.added, removed: change.removed })
    } catch (error) {
      setSelectionError(
        error instanceof Error ? error.message : 'Não foi possível atualizar os blocos.',
      )
      if (action === 'import') throw error
    }
  }

  return (
    <div className="space-y-3">
      <label className="block space-y-1 text-sm">
        <span>Linguagem das ferramentas</span>
        <Select
          aria-label="Linguagem das ferramentas"
          value={language}
          onChange={(event) => {
            setLanguage(event.target.value === 'python' ? 'python' : 'javascript')
            setNotice(null)
            setSelectionError(null)
          }}
        >
          <option value="javascript">JavaScript (padrão)</option>
          <option value="python">Python</option>
        </Select>
      </label>
      <p className="text-xs text-muted-foreground">
        Escolha os blocos ensinados neste curso. Trocar a linguagem mantém as ferramentas já
        selecionadas na outra lista.
      </p>
      {language === 'python' && (choices.length > 1 || (!selected && choices.length > 0)) && (
        <label className="block space-y-1 text-sm">
          <span>Ambiente Python</span>
          <Select
            aria-label="Ambiente Python"
            value={selected?.key ?? environmentKey}
            onChange={(event) => {
              setEnvironmentKey(event.target.value)
              setNotice(null)
              setSelectionError(null)
            }}
          >
            {!selected && <option value={environmentKey}>Ambiente indisponível</option>}
            {choices.map((choice) => (
              <option key={choice.key} value={choice.key}>
                {choice.label}
              </option>
            ))}
          </Select>
        </label>
      )}
      {language === 'python' && (
        <p className="text-xs text-muted-foreground">
          Os blocos auxiliares necessários também serão selecionados e salvos. Retirar um auxiliar
          retira os blocos que dependem dele.
        </p>
      )}
      <StudioBlocksPicker
        key={`${language}:${selected?.key ?? ''}`}
        value={visible}
        onChange={(next) => apply(next, 'selection')}
        onImport={(next) => apply(next, 'import')}
        {...(language === 'python'
          ? { catalog: python.palette?.blocks ?? null, error: catalogError }
          : {})}
      />
      {language === 'python' && catalogError && (
        <Button type="button" variant="outline" size="sm" onClick={authoring.retry}>
          Tentar carregar novamente
        </Button>
      )}
      {selectionError && (
        <p role="alert" className="text-sm text-destructive">
          {selectionError}
        </p>
      )}
      {issue && (
        <p role="alert" className="text-sm text-destructive">
          {issue}
        </p>
      )}
      {notice && (notice.added.length > 0 || notice.removed.length > 0) && (
        <div role="status" className="space-y-1 text-sm">
          {notice.added.length > 0 && (
            <p>
              Auxiliares incluídos ({notice.added.length}):{' '}
              {notice.added.map((id) => pythonLabels.get(id) ?? id).join(', ')}.
            </p>
          )}
          {notice.removed.length > 0 && (
            <p>
              Blocos dependentes retirados ({notice.removed.length}):{' '}
              {notice.removed.map((id) => pythonLabels.get(id) ?? id).join(', ')}.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
