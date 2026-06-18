'use client'

import type {
  ActivityCheck,
  BehaviorCheck,
  CodeCheck,
  LessonActivity,
  StructureCheck,
  TestCaseCheck,
} from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { RichTextEditor } from '@/components/editor/rich-text-editor'

/** Atividade vazia (default ao ligar a auto-correção num bloco). */
export const EMPTY_ACTIVITY: LessonActivity = { instructions: '', checks: [] }

const KIND_LABELS: Record<ActivityCheck['kind'], string> = {
  structure: 'Estrutura',
  behavior: 'Comportamento',
  testcase: 'Caso de teste',
  code: 'Código (JS)',
}

const SELECT_CLASS =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

/**
 * Espelha o `validateStudioActivityAuthoring` do members. Primeiro erro ou `null`.
 * Atividade VAZIA é permitida (= bloco só de entrega) — exceto com nota de corte.
 */
export function validateStudioActivity(activity: LessonActivity): string | null {
  if (activity.passingScore !== undefined && activity.checks.length === 0) {
    return 'Uma atividade com nota de corte precisa de ao menos uma checagem.'
  }
  const ids = new Set<string>()
  for (const [i, check] of activity.checks.entries()) {
    const n = i + 1
    if (!check.label.trim()) return `Checagem ${n}: informe um rótulo.`
    if (ids.has(check.id)) return `Checagem ${n}: id duplicado.`
    ids.add(check.id)
    if (check.kind === 'code' && !check.source.trim()) {
      return `Checagem ${n} (código): escreva a asserção.`
    }
    if (check.kind === 'testcase') {
      if (!check.functionName.trim()) return `Checagem ${n} (caso de teste): informe a função.`
      if (check.cases.length === 0)
        return `Checagem ${n} (caso de teste): adicione ao menos um caso.`
    }
    if (check.kind === 'structure') {
      const r = check.rule
      if (
        (r.type === 'declaresVariable' ||
          r.type === 'definesFunction' ||
          r.type === 'callsFunction') &&
        !r.name.trim()
      ) {
        return `Checagem ${n} (estrutura): informe o nome.`
      }
      if (r.type === 'usesBlock' && !r.blockType.trim()) {
        return `Checagem ${n} (estrutura): informe o tipo de bloco.`
      }
    }
  }
  return null
}

function newCheck(kind: ActivityCheck['kind']): ActivityCheck {
  const base = { id: crypto.randomUUID(), label: '' }
  switch (kind) {
    case 'structure':
      return { ...base, kind, rule: { type: 'usesLoop' } }
    case 'behavior':
      return { ...base, kind, rule: { type: 'consoleContains', text: '' } }
    case 'testcase':
      return {
        ...base,
        kind,
        functionName: '',
        cases: [{ id: crypto.randomUUID(), args: [], expected: null }],
      }
    case 'code':
      return { ...base, kind, source: '' }
  }
}

/** Input de JSON: edita texto local, comita no model só quando o JSON é válido. */
function JsonInput({
  value,
  onChange,
  placeholder,
}: {
  value: unknown
  onChange: (v: unknown) => void
  placeholder?: string
}) {
  const [text, setText] = useState(() => JSON.stringify(value))
  const [invalid, setInvalid] = useState(false)
  // Último valor que ESTE input emitiu — p/ distinguir o eco da própria digitação de
  // uma troca EXTERNA do `value` (ex.: mudar o tipo de regra zera p/ null).
  const lastEmitted = useRef<unknown>(value)
  useEffect(() => {
    // O parent trocou o value por fora → re-sincroniza o texto (senão fica obsoleto).
    if (value !== lastEmitted.current) {
      setText(JSON.stringify(value))
      setInvalid(false)
      lastEmitted.current = value
    }
  }, [value])
  return (
    <Input
      value={text}
      placeholder={placeholder}
      className={invalid ? 'border-destructive' : ''}
      onChange={(e) => {
        const t = e.target.value
        setText(t)
        try {
          const parsed = JSON.parse(t)
          lastEmitted.current = parsed
          onChange(parsed)
          setInvalid(false)
        } catch {
          setInvalid(true)
        }
      }}
    />
  )
}

/**
 * Builder da atividade com auto-correção (form curado dos 4 tipos + escape em JS).
 * Gera o `LessonActivity` que vira `StudioBlock.activity`. Espelha a validação do
 * members; o servidor recalcula só `structure` (anti-cola) — ver studio-activity.
 */
export function ActivityBuilder({
  value,
  onChange,
}: {
  value: LessonActivity
  onChange: (v: LessonActivity) => void
}) {
  function updateCheck(id: string, next: ActivityCheck) {
    onChange({ ...value, checks: value.checks.map((c) => (c.id === id ? next : c)) })
  }
  function removeCheck(id: string) {
    onChange({ ...value, checks: value.checks.filter((c) => c.id !== id) })
  }
  function addCheck(kind: ActivityCheck['kind']) {
    onChange({ ...value, checks: [...value.checks, newCheck(kind)] })
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Enunciado" hint="O que o aluno deve fazer (formatação rica).">
        <RichTextEditor
          content={value.instructions}
          onChange={(markdown) => onChange({ ...value, instructions: markdown })}
        />
      </Field>

      <Field
        label="Nota de corte (%)"
        htmlFor="ab-passing"
        hint="Com nota: o aluno precisa atingir para concluir a aula. Vazio: formativa (não trava)."
      >
        <Input
          id="ab-passing"
          type="number"
          min={0}
          max={100}
          step={1}
          className="max-w-32"
          value={value.passingScore ?? ''}
          onChange={(e) => {
            const raw = e.target.value.trim()
            const n = Math.round(Number(raw))
            onChange({
              ...value,
              passingScore:
                raw === '' || Number.isNaN(n) ? undefined : Math.min(100, Math.max(0, n)),
            })
          }}
        />
      </Field>

      {value.checks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-4 text-center text-sm text-muted-foreground">
          Nenhuma checagem ainda. A atividade fica só com o enunciado (entrega livre).
        </p>
      ) : (
        value.checks.map((check, ci) => (
          <div key={check.id} className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                Checagem {ci + 1} · {KIND_LABELS[check.kind]}
              </span>
              <Button variant="ghost" size="icon" onClick={() => removeCheck(check.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_6rem]">
              <Field label="Rótulo" hint="O que esta checagem cobra (mostrado ao aluno).">
                <Input
                  value={check.label}
                  onChange={(e) => updateCheck(check.id, { ...check, label: e.target.value })}
                />
              </Field>
              <Field label="Peso" hint="Default 1.">
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={check.weight ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value.trim()
                    const n = Number(raw)
                    updateCheck(check.id, {
                      ...check,
                      weight: raw === '' || Number.isNaN(n) || n <= 0 ? undefined : n,
                    })
                  }}
                />
              </Field>
            </div>

            <Field label="Dica (ao falhar)" hint="Ajuda o aluno a consertar.">
              <Input
                value={check.hint ?? ''}
                onChange={(e) =>
                  updateCheck(check.id, { ...check, hint: e.target.value.trim() || undefined })
                }
              />
            </Field>

            {check.kind === 'structure' ? (
              <StructureFields check={check} onChange={(c) => updateCheck(check.id, c)} />
            ) : check.kind === 'behavior' ? (
              <BehaviorFields check={check} onChange={(c) => updateCheck(check.id, c)} />
            ) : check.kind === 'testcase' ? (
              <TestCaseFields check={check} onChange={(c) => updateCheck(check.id, c)} />
            ) : (
              <CodeFields check={check} onChange={(c) => updateCheck(check.id, c)} />
            )}
          </div>
        ))
      )}

      <div className="flex flex-wrap gap-2">
        {(['structure', 'behavior', 'testcase', 'code'] as const).map((kind) => (
          <Button key={kind} variant="outline" size="sm" onClick={() => addCheck(kind)}>
            <Plus className="size-4" /> {KIND_LABELS[kind]}
          </Button>
        ))}
      </div>
    </div>
  )
}

function StructureFields({
  check,
  onChange,
}: {
  check: StructureCheck
  onChange: (c: StructureCheck) => void
}) {
  const r = check.rule
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label="Regra">
        <select
          className={SELECT_CLASS}
          value={r.type}
          onChange={(e) => {
            const type = e.target.value as StructureCheck['rule']['type']
            const rule: StructureCheck['rule'] =
              type === 'usesLoop'
                ? { type }
                : type === 'usesBlock'
                  ? { type, blockType: '' }
                  : { type, name: '' }
            onChange({ ...check, rule })
          }}
        >
          <option value="usesLoop">Usou um laço</option>
          <option value="declaresVariable">Declarou a variável…</option>
          <option value="definesFunction">Definiu a função…</option>
          <option value="callsFunction">Chamou a função…</option>
          <option value="usesBlock">Usou o bloco…</option>
        </select>
      </Field>
      {r.type === 'usesBlock' ? (
        <Field label="Tipo do bloco">
          <Input
            value={r.blockType}
            onChange={(e) =>
              onChange({ ...check, rule: { type: 'usesBlock', blockType: e.target.value } })
            }
          />
        </Field>
      ) : r.type !== 'usesLoop' ? (
        <Field label="Nome">
          <Input
            value={r.name}
            onChange={(e) => onChange({ ...check, rule: { type: r.type, name: e.target.value } })}
          />
        </Field>
      ) : null}
    </div>
  )
}

function BehaviorFields({
  check,
  onChange,
}: {
  check: BehaviorCheck
  onChange: (c: BehaviorCheck) => void
}) {
  const r = check.rule
  return (
    <div className="space-y-3">
      <Field label="Regra">
        <select
          className={SELECT_CLASS}
          value={r.type}
          onChange={(e) => {
            const type = e.target.value as BehaviorCheck['rule']['type']
            const rule: BehaviorCheck['rule'] =
              type === 'consoleContains'
                ? { type, text: '' }
                : type === 'domSelectorExists'
                  ? { type, selector: '' }
                  : type === 'domSelectorText'
                    ? { type, selector: '', text: '' }
                    : { type: 'globalEquals', name: '', value: null }
            onChange({ ...check, rule })
          }}
        >
          <option value="consoleContains">Console contém o texto…</option>
          <option value="domSelectorExists">Existe um elemento no seletor…</option>
          <option value="domSelectorText">Elemento no seletor contém o texto…</option>
          <option value="globalEquals">Variável global é igual a…</option>
        </select>
      </Field>
      {r.type === 'consoleContains' ? (
        <Field label="Texto no console">
          <Input
            value={r.text}
            onChange={(e) => onChange({ ...check, rule: { type: r.type, text: e.target.value } })}
          />
        </Field>
      ) : r.type === 'domSelectorExists' ? (
        <Field label="Seletor CSS">
          <Input
            value={r.selector}
            onChange={(e) =>
              onChange({ ...check, rule: { type: r.type, selector: e.target.value } })
            }
          />
        </Field>
      ) : r.type === 'domSelectorText' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Seletor CSS">
            <Input
              value={r.selector}
              onChange={(e) => onChange({ ...check, rule: { ...r, selector: e.target.value } })}
            />
          </Field>
          <Field label="Texto esperado">
            <Input
              value={r.text}
              onChange={(e) => onChange({ ...check, rule: { ...r, text: e.target.value } })}
            />
          </Field>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nome da variável">
            <Input
              value={r.name}
              onChange={(e) =>
                onChange({
                  ...check,
                  rule: { type: 'globalEquals', name: e.target.value, value: r.value },
                })
              }
            />
          </Field>
          <Field label="Valor (JSON)" hint='Ex.: 42, "oi", true'>
            <JsonInput
              value={r.value}
              onChange={(v) =>
                onChange({
                  ...check,
                  rule: { type: 'globalEquals', name: r.name, value: v as never },
                })
              }
            />
          </Field>
        </div>
      )}
    </div>
  )
}

function TestCaseFields({
  check,
  onChange,
}: {
  check: TestCaseCheck
  onChange: (c: TestCaseCheck) => void
}) {
  return (
    <div className="space-y-3">
      <Field label="Nome da função" hint="A função global que o aluno deve definir.">
        <Input
          value={check.functionName}
          onChange={(e) => onChange({ ...check, functionName: e.target.value })}
        />
      </Field>
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">
          Casos (entrada → esperado)
        </span>
        {check.cases.map((tc, i) => (
          <div
            key={tc.id ?? `case-${i}`}
            className="grid grid-cols-1 gap-2 rounded-lg border border-border p-2 sm:grid-cols-[1fr_1fr_auto]"
          >
            <Field label="Argumentos (JSON)" hint="Ex.: [2, 3]">
              <JsonInput
                value={tc.args}
                placeholder="[]"
                onChange={(v) => {
                  const args = (Array.isArray(v) ? v : [v]) as never
                  onChange({
                    ...check,
                    cases: check.cases.map((c, j) => (j === i ? { ...c, args } : c)),
                  })
                }}
              />
            </Field>
            <Field label="Esperado (JSON)" hint="Ex.: 5">
              <JsonInput
                value={tc.expected}
                onChange={(v) =>
                  onChange({
                    ...check,
                    cases: check.cases.map((c, j) =>
                      j === i ? { ...c, expected: v as never } : c,
                    ),
                  })
                }
              />
            </Field>
            <Button
              variant="ghost"
              size="icon"
              title="Remover caso"
              disabled={check.cases.length <= 1}
              onClick={() => onChange({ ...check, cases: check.cases.filter((_, j) => j !== i) })}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({
              ...check,
              cases: [...check.cases, { id: crypto.randomUUID(), args: [], expected: null }],
            })
          }
        >
          <Plus className="size-4" /> Caso
        </Button>
      </div>
    </div>
  )
}

function CodeFields({ check, onChange }: { check: CodeCheck; onChange: (c: CodeCheck) => void }) {
  return (
    <Field
      label="Asserção (JS)"
      hint="Recebe `ctx` ({doc, consoleText, getGlobal, callFn, assert}). Retorne booleano ou use ctx.assert."
    >
      <textarea
        className="min-h-32 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        value={check.source}
        spellCheck={false}
        onChange={(e) => onChange({ ...check, source: e.target.value })}
        placeholder={'return ctx.getGlobal("total") === 10;'}
      />
    </Field>
  )
}
