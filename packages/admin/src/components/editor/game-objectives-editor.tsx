'use client'
import {
  isExecutionRule,
  type SectionJavaScriptProjectCheck,
  type SectionObjectiveRule,
  type SectionProjectCheck,
  type SectionPythonProjectCheck,
} from '@sistemazero/core/learning'
import { StudioProjectDocumentSchema } from '@sistemazero/core/studio/project-document'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'
import { challengeProjectLanguage, challengeRule } from '@/lib/game-challenge-authoring'
import { ExecutionRuleEditor } from './execution-rule-editor'
import { ProjectRuleEditor } from './project-rule-editor'
import { PythonSectionObjectives } from './python-section-objectives'
import { ScriptRuleEditor } from './script-rule-editor'

/**
 * Os objetivos do desafio. Com o gabarito Python (C02, 30/10/2026), o mesmo editor dos objetivos
 * Python das aulas, com o perfil do ambiente do gabarito; senão, o editor JavaScript de sempre.
 */
export function GameObjectivesEditor({
  value,
  onChange,
  gabarito,
}: {
  value: SectionProjectCheck[]
  onChange(value: SectionProjectCheck[]): void
  gabarito: unknown
}) {
  if (challengeProjectLanguage(gabarito) === 'python')
    return <PythonGameObjectives value={value} onChange={onChange} gabarito={gabarito} />
  const outros = value.filter((c) => c.programmingLanguage === 'python')
  if (outros.length)
    return (
      <OtherEnvironment
        texto="Os objetivos guardados são Python, mas o gabarito é JavaScript."
        onClear={() => onChange([])}
      />
    )
  return (
    <JavaScriptGameObjectives
      value={value as SectionJavaScriptProjectCheck[]}
      onChange={onChange}
      gabarito={gabarito}
    />
  )
}

function OtherEnvironment({ texto, onClear }: { texto: string; onClear(): void }) {
  return (
    <div role="alert" className="space-y-2 text-sm">
      <p>{texto} Limpe-os para configurar os objetivos deste projeto.</p>
      <Button type="button" variant="outline" onClick={onClear}>
        Limpar objetivos de outro ambiente
      </Button>
    </div>
  )
}

function PythonGameObjectives({
  value,
  onChange,
  gabarito,
}: {
  value: SectionProjectCheck[]
  onChange(value: SectionProjectCheck[]): void
  gabarito: unknown
}) {
  const lido = StudioProjectDocumentSchema.safeParse(gabarito)
  const perfil =
    lido.success && lido.data.programmingLanguage === 'python'
      ? lido.data.runtime.profileId
      : undefined
  const python = value.filter(
    (c): c is SectionPythonProjectCheck => c.programmingLanguage === 'python',
  )
  if (python.length !== value.length || python.some((c) => c.profileId !== perfil))
    return (
      <OtherEnvironment
        texto="Os objetivos guardados não usam o ambiente Python deste gabarito."
        onClear={() => onChange([])}
      />
    )
  return (
    <div className="space-y-4">
      {!perfil && (
        <p role="alert" className="text-sm text-destructive">
          O gabarito Python não é um projeto válido do Estúdio. Troque-o pelo manifesto.
        </p>
      )}
      <PythonSectionObjectives checks={python} project={gabarito} onChange={onChange} />
      <Button
        type="button"
        variant="outline"
        disabled={!perfil || value.length >= 20}
        onClick={() =>
          perfil &&
          onChange([
            ...python,
            {
              id: crypto.randomUUID(),
              label: '',
              programmingLanguage: 'python',
              profileId: perfil,
              rule: {
                type: 'behavior',
                steps: [],
                expect: { target: { kind: 'console' }, compare: 'contains', value: 'Olá' },
              },
            },
          ])
        }
      >
        Adicionar objetivo Python
      </Button>
    </div>
  )
}

function JavaScriptGameObjectives({
  value,
  onChange,
  gabarito,
}: {
  value: SectionJavaScriptProjectCheck[]
  onChange(value: SectionJavaScriptProjectCheck[]): void
  gabarito: unknown
}) {
  function update(index: number, patch: Partial<SectionJavaScriptProjectCheck>) {
    onChange(value.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }
  function rule(index: number, next: SectionObjectiveRule) {
    update(index, { rule: next })
  }
  // C02: com o gabarito Pro, a função e o valor conferidos moram num arquivo do projeto.
  const pro =
    typeof gabarito === 'object' &&
    gabarito !== null &&
    (gabarito as { kind?: unknown }).kind === 'pro'
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Escreva o que a pessoa precisa construir. Use comportamento para conferir o jogo rodando;
        preserve a liberdade de cor, aparência e valores quando não forem essenciais.
      </p>
      {value.map((check, index) => (
        <fieldset key={check.id} className="space-y-3 rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-medium">Objetivo {index + 1}</legend>
          <label className="block text-sm">
            O que a pessoa vai ler
            <Input
              value={check.label}
              maxLength={200}
              onChange={(e) => update(index, { label: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Dica quando faltar
            <Input
              value={check.hint ?? ''}
              maxLength={300}
              onChange={(e) => update(index, { hint: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Como conferir
            <Select
              value={check.rule.type}
              onChange={(e) => rule(index, challengeRule(e.target.value))}
            >
              <option value="usesBlock">Bloco e seus parâmetros</option>
              <option value="behavior">Comportamento do jogo</option>
              <option value="functionReturns">Resultado de uma função</option>
              <option value="script">Regra em JavaScript</option>
              <option value="usesLoop">Usa repetição</option>
              <option value="declaresVariable">Declara variável</option>
              <option value="definesFunction">Define função</option>
              <option value="callsFunction">Chama função</option>
            </Select>
          </label>
          {check.rule.type === 'usesBlock' ? (
            <ProjectRuleEditor
              rule={check.rule}
              workspace={{ initialProject: gabarito }}
              onChange={(r) => rule(index, r)}
            />
          ) : check.rule.type === 'script' ? (
            <ScriptRuleEditor
              rule={check.rule}
              index={index}
              isPro={pro}
              isKit={false}
              onChange={(r) => rule(index, r)}
            />
          ) : isExecutionRule(check.rule) ? (
            <ExecutionRuleEditor
              rule={check.rule}
              index={index}
              isPro={pro}
              isKit={false}
              onChange={(r) => rule(index, r)}
            />
          ) : 'name' in check.rule ? (
            <label className="block text-sm">
              Nome
              <Input
                value={check.rule.name}
                onChange={(e) => {
                  const r = check.rule
                  if ('name' in r) rule(index, { ...r, name: e.target.value })
                }}
              />
            </label>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!check.optional}
                onChange={(e) => update(index, { optional: e.target.checked ? true : undefined })}
              />
              Faz parte do desafio extra
            </label>
            <Button
              type="button"
              variant="outline"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              Remover objetivo
            </Button>
          </div>
        </fieldset>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={value.length >= 20}
        onClick={() =>
          onChange([
            ...value,
            { id: crypto.randomUUID(), label: '', rule: challengeRule('usesBlock') },
          ])
        }
      >
        Adicionar objetivo
      </Button>
    </div>
  )
}
