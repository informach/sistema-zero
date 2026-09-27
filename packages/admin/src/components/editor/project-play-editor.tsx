'use client'

import type { ProjectPlayActivity } from '@sistemazero/core/learning'
import type { StudioHandle } from '@sistemazero/studio'
import type { Project } from '@sistemazero/studio/project'
import { sanitizeProjectForHost } from '@sistemazero/studio/project-validation'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  PROJECT_PLAY_MAX_CHARS,
  prepareProjectPlaySnapshot,
  readProjectPlayFile,
  validProjectPlayActivity,
} from '../../lib/project-play-authoring'

const StudioEmbed = lazy(() =>
  import('../studio/studio-embed').then((module) => ({ default: module.StudioEmbed })),
)

export function ProjectPlayEditor({
  value,
  onChange,
}: {
  value: ProjectPlayActivity
  onChange: (value: ProjectPlayActivity) => void
}) {
  const id = useId()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<{ project: Project | null } | null>(null)
  const handle = useRef<StudioHandle | null>(null)
  const current = useRef({ value, onChange })
  current.current = { value, onChange }
  // O ID é editável: usá-lo como key desmontaria o campo a cada letra digitada.
  const targetKeys = useRef(new WeakMap<object, string>())
  function targetKey(target: ProjectPlayActivity['targets'][number]) {
    const existing = targetKeys.current.get(target)
    if (existing) return existing
    const key = crypto.randomUUID()
    targetKeys.current.set(target, key)
    return key
  }
  const operation = useRef(0)
  useEffect(
    () => () => {
      operation.current++
    },
    [],
  )
  const project = useMemo(() => {
    try {
      return sanitizeProjectForHost(value.project)
    } catch {
      return null
    }
  }, [value.project])

  async function replace(read: () => Promise<Project>) {
    const token = ++operation.current
    setError('')
    setBusy(true)
    try {
      const next = await read()
      if (token !== operation.current) return
      current.current.onChange({ ...current.current.value, project: next })
      setEditing(null)
    } catch (cause) {
      if (token === operation.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'Não foi possível carregar o projeto. O jogo anterior foi mantido.',
        )
    } finally {
      if (token === operation.current) setBusy(false)
    }
  }

  function editTarget(index: number, patch: Partial<ProjectPlayActivity['targets'][number]>) {
    onChange({
      ...value,
      targets: value.targets.map((target, i) => {
        if (i !== index) return target
        const next = { ...target, ...patch }
        targetKeys.current.set(next, targetKey(target))
        return next
      }),
    })
  }

  return (
    <div className="min-w-0 space-y-4 rounded-xl border border-border p-4">
      <div className="space-y-1">
        <h3 className="font-semibold">Projeto que a criança vai jogar</h3>
        <p className="text-sm text-muted-foreground">
          Esta é uma cópia pronta para jogar. Ela não altera o projeto inicial nem o trabalho da
          criança no Estúdio.
        </p>
        <p className="break-words text-sm" role="status">
          {project ? `Projeto carregado: ${project.name}` : 'Nenhum projeto carregado.'}
        </p>
      </div>
      <fieldset disabled={busy || editing !== null} className="min-w-0 space-y-3">
        <Field label="Arquivo do projeto" htmlFor={`${id}-file`}>
          <Input
            id={`${id}-file`}
            type="file"
            accept=".json,.sz"
            aria-describedby={`${id}-file-help`}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (!file) return
              void replace(async () => {
                // UTF-8 pode ocupar até quatro bytes por caractere. O limite contratual é de caracteres.
                if (file.size > PROJECT_PLAY_MAX_CHARS * 4)
                  throw new Error('O arquivo excede o limite de 1.500.000 caracteres.')
                return readProjectPlayFile(await file.text())
              })
            }}
          />
        </Field>
        <p id={`${id}-file-help`} className="text-xs text-muted-foreground">
          Use o arquivo JSON exportado pelo Estúdio, com os recursos embutidos. Até 1.500.000
          caracteres. Projetos Pro não são aceitos.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setError('')
            setEditing({ project: project ? structuredClone(project) : null })
          }}
        >
          {project ? 'Editar cópia no Estúdio' : 'Criar jogo no Estúdio'}
        </Button>
      </fieldset>
      {editing && (
        <div className="space-y-3">
          <p className="text-sm">
            As alterações só entram no bloco quando você aplicar esta edição.
          </p>
          <Suspense fallback={<p role="status">Carregando o Estúdio…</p>}>
            <StudioEmbed
              initialProject={editing.project}
              defaultName="Jogo de apresentação"
              handleRef={handle}
              hideKindChooser
            />
          </Suspense>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                void replace(async () => {
                  const next = handle.current?.getProject()
                  if (!next) throw new Error('Aguarde o Estúdio carregar antes de aplicar.')
                  return prepareProjectPlaySnapshot(next)
                })
              }
            >
              Aplicar edição ao bloco
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setEditing(null)
                setError('')
              }}
            >
              Cancelar edição
            </Button>
          </div>
        </div>
      )}
      {busy && (
        <p role="status" className="text-sm">
          Conferindo o projeto…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <fieldset disabled={busy} className="min-w-0 space-y-4">
        <legend className="mb-2 text-sm font-medium">Palco e conclusão</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(['width', 'height'] as const).map((dimension) => (
            <Field
              key={dimension}
              label={dimension === 'width' ? 'Largura do palco' : 'Altura do palco'}
              htmlFor={`${id}-${dimension}`}
            >
              <Input
                id={`${id}-${dimension}`}
                type="number"
                min={1}
                max={8192}
                step={1}
                value={value.stage[dimension]}
                onChange={(e) =>
                  onChange({
                    ...value,
                    stage: { ...value.stage, [dimension]: Number(e.target.value) },
                  })
                }
              />
            </Field>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Use as dimensões lógicas do jogo, em pixels. Elas definem a proporção da prévia e as
          coordenadas dos alvos.
        </p>
        <Field label="Conclusão do jogo" htmlFor={`${id}-completion`}>
          <Select
            id={`${id}-completion`}
            value={value.completion ?? 'targets'}
            onChange={(e) => {
              const completion = e.target.value
              if (completion === 'participation' || completion === 'targets')
                onChange({ ...value, completion })
            }}
          >
            <option value="participation">
              Experimentar o jogo (recomendado para apresentações)
            </option>
            <option value="targets">Encontrar todos os alvos configurados</option>
          </Select>
        </Field>
        <p className="text-sm text-muted-foreground">
          {value.completion === 'participation'
            ? 'Um toque, clique ou comando de teclado dentro do jogo registra a participação. Abrir, ampliar ou reiniciar não conta. O vídeo continua sendo um critério separado da seção.'
            : 'Para jogos Jogo 2D com evento de clique/toque em grupo. Cada evento deve acontecer dentro de um dos retângulos abaixo. Isto não detecta vitória automaticamente em qualquer jogo.'}
        </p>
        {(value.completion !== 'participation' || value.targets.length > 0) && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Alvos do jogo ({value.targets.length}/12)</p>
            {value.completion === 'participation' && (
              <p className="text-xs text-muted-foreground">
                Estes alvos estão guardados, mas não são exigidos no critério de participação.
              </p>
            )}
            {value.targets.map((target, index) => (
              <fieldset
                key={targetKey(target)}
                className="min-w-0 space-y-3 rounded-lg border border-border p-3"
              >
                <legend className="px-1 text-sm">Alvo {index + 1}</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(['id', 'label'] as const).map((key) => (
                    <Field
                      key={key}
                      label={key === 'id' ? 'Identificador' : 'Nome do alvo'}
                      htmlFor={`${id}-${index}-${key}`}
                    >
                      <Input
                        id={`${id}-${index}-${key}`}
                        value={target[key]}
                        maxLength={key === 'id' ? 80 : 100}
                        onChange={(e) => editTarget(index, { [key]: e.target.value })}
                      />
                    </Field>
                  ))}
                  {(
                    [
                      ['x', 'X'],
                      ['y', 'Y'],
                      ['width', 'Largura'],
                      ['height', 'Altura'],
                    ] as const
                  ).map(([key, label]) => (
                    <Field key={key} label={label} htmlFor={`${id}-${index}-${key}`}>
                      <Input
                        id={`${id}-${index}-${key}`}
                        type="number"
                        step="any"
                        min={key === 'x' || key === 'y' ? 0 : 0.01}
                        max={8192}
                        value={target[key]}
                        onChange={(e) => editTarget(index, { [key]: Number(e.target.value) })}
                      />
                    </Field>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    onChange({ ...value, targets: value.targets.filter((_, i) => i !== index) })
                  }
                >
                  Remover alvo {index + 1}
                </Button>
              </fieldset>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={value.targets.length >= 12}
              onClick={() =>
                onChange({
                  ...value,
                  targets: [
                    ...value.targets,
                    {
                      id: crypto.randomUUID(),
                      label: `Alvo ${value.targets.length + 1}`,
                      x: 0,
                      y: 0,
                      width: Math.min(100, value.stage.width),
                      height: Math.min(100, value.stage.height),
                    },
                  ],
                })
              }
            >
              Adicionar alvo
            </Button>
          </div>
        )}
      </fieldset>
      {project && !validProjectPlayActivity(value) && (
        <p role="alert" className="text-sm text-destructive">
          Confira as dimensões do palco (1 a 8192) e os alvos: identificadores únicos, nomes
          preenchidos e retângulos dentro do palco. Para concluir por alvos, inclua pelo menos um e
          use a extensão Jogo 2D.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Use “Experimentar a prévia” abaixo para testar exatamente o jogo que a criança verá,
        inclusive ampliar e jogar de novo.
      </p>
    </div>
  )
}
