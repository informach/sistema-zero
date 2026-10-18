'use client'

import {
  EXECUTION_LIMITS,
  executionRuleBudgetMs,
  isExecutionRule,
  type SectionJavaScriptProjectCheck,
} from '@sistemazero/core/learning'
import { Button } from '@sistemazero/ui/button'
import { Select } from '@sistemazero/ui/select'
import { Textarea } from '@sistemazero/ui/textarea'
import { useId, useState } from 'react'
import { kitSuggestions, type ObjectiveTemplate, templatesFor } from '@/lib/objective-templates'
import {
  MAX_PROJECT_CHECKS,
  parseObjectivesClipboard,
  serializeObjectives,
} from '@/lib/objectives-clipboard'

/** O objetivo de um modelo, pronto para a lista: id novo e, no Pro, o arquivo da função. */
export function checkFromTemplate(
  template: ObjectiveTemplate,
  isPro: boolean,
  newId: () => string = () => crypto.randomUUID(),
): SectionJavaScriptProjectCheck {
  const rule =
    template.check.rule.type === 'functionReturns' && isPro && !template.check.rule.module
      ? { ...template.check.rule, module: 'src/regras.ts' }
      : template.check.rule
  return { ...structuredClone(template.check), rule: structuredClone(rule), id: newId() }
}

/**
 * Atalhos da lista de objetivos (etapa 4, 18/10/2026): começar de um MODELO (ou de uma sugestão do
 * kit Pro do bloco) e copiar a lista para colar em outra parte ou aula. Tudo que entra passa pelos
 * mesmos tetos da parte; o "Testar agora" é quem prova que o modelo ajustado serve.
 */
export function ObjectiveTools({
  checks,
  isPro,
  kitTemplateId,
  bridge,
  issuesOf = () => [],
  onAdd,
}: {
  checks: readonly SectionJavaScriptProjectCheck[]
  isPro: boolean
  /** O modelo do kit Pro do bloco, quando é kit (as sugestões usam o estado dele). */
  kitTemplateId?: string
  /** O bloco clássico libera a Ponte (os modelos de código cabem). */
  bridge: boolean
  /** A régua de autoria do bloco: modelo que ela acusaria neste projeto nem aparece. */
  issuesOf?: (rule: SectionJavaScriptProjectCheck['rule']) => string[]
  onAdd: (added: SectionJavaScriptProjectCheck[]) => void
}) {
  const ids = useId()
  // Só o que a autoria aceita NESTE projeto (3D clássico, paleta restrita, Pro sem kit…).
  const fits = (template: ObjectiveTemplate) =>
    issuesOf(checkFromTemplate(template, isPro, () => 'x').rule).length === 0
  const suggestions = (kitTemplateId ? kitSuggestions(kitTemplateId) : []).filter(fits)
  const templates = templatesFor({ pro: isPro, kit: Boolean(kitTemplateId), bridge }).filter(fits)
  const all = [...suggestions, ...templates]
  const [chosen, setChosen] = useState('')
  const [pasted, setPasted] = useState('')
  // O texto para copiar à mão vale para a lista daquele clique: mudou a lista, ele some.
  const [copied, setCopied] = useState<{
    text: string
    of: readonly SectionJavaScriptProjectCheck[]
  }>()
  const copyText = copied && copied.of === checks ? copied.text : ''
  const [message, setMessage] = useState<string[]>([])
  const template = all.find((item) => item.id === chosen)
  const executionCount = checks.filter((check) => isExecutionRule(check.rule)).length
  const full = checks.length >= MAX_PROJECT_CHECKS
  const budget = checks.reduce(
    (sum, check) => sum + (isExecutionRule(check.rule) ? executionRuleBudgetMs(check.rule) : 0),
    0,
  )
  const templateBlocked =
    template !== undefined &&
    isExecutionRule(template.check.rule) &&
    (executionCount >= EXECUTION_LIMITS.maxObjectives ||
      budget + executionRuleBudgetMs(template.check.rule) > EXECUTION_LIMITS.maxSectionWaitMs)
  const copy = async () => {
    const text = serializeObjectives(checks)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(undefined)
      setMessage([
        `${checks.length === 1 ? 'Objetivo copiado' : `${checks.length} objetivos copiados`}. Abra outra parte e use "Colar objetivos".`,
      ])
    } catch {
      // Sem permissão para a área de transferência: o texto aparece para copiar à mão.
      setCopied({ text, of: checks })
      setMessage(['Copie o texto abaixo (Ctrl+C) e cole em outra parte.'])
    }
  }
  const paste = () => {
    const result = parseObjectivesClipboard(pasted, checks, undefined, issuesOf)
    if (result.checks.length) {
      onAdd(result.checks)
      setPasted('')
    }
    setMessage([
      ...(result.checks.length
        ? [
            result.checks.length === 1
              ? 'Um objetivo colado no fim da lista.'
              : `${result.checks.length} objetivos colados no fim da lista.`,
          ]
        : []),
      ...result.notes,
    ])
  }
  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border p-3 text-sm">
      {all.length > 0 && (
        <div className="space-y-2">
          <label htmlFor={`${ids}-modelo`} className="block font-medium">
            Começar de um modelo
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              id={`${ids}-modelo`}
              value={chosen}
              onChange={(event) => setChosen(event.target.value)}
            >
              <option value="">Escolha um modelo…</option>
              {suggestions.length > 0 && (
                <optgroup label="Sugestões deste kit Pro">
                  {suggestions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Modelos">
                {templates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </optgroup>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={!template || full || templateBlocked}
              onClick={() => {
                if (!template) return
                onAdd([checkFromTemplate(template, isPro)])
                setChosen('')
                setMessage([`"${template.check.label}" entrou no fim da lista. ${template.adjust}`])
              }}
            >
              Usar o modelo
            </Button>
          </div>
          {template && <p className="text-xs text-muted-foreground">{template.adjust}</p>}
          {templateBlocked && (
            <p className="text-xs text-destructive">
              Não cabe mais um objetivo que roda o jogo nesta parte (até{' '}
              {EXECUTION_LIMITS.maxObjectives}, com {EXECUTION_LIMITS.maxSectionWaitMs / 1000}{' '}
              segundos de esperas somadas).
            </p>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={checks.length === 0} onClick={copy}>
          Copiar objetivos
        </Button>
      </div>
      {copyText && (
        <Textarea
          aria-label="Objetivos copiados"
          readOnly
          rows={4}
          className="font-mono text-xs"
          value={copyText}
          onFocus={(event) => event.currentTarget.select()}
        />
      )}
      <details>
        <summary className="cursor-pointer">Colar objetivos</summary>
        <div className="mt-2 space-y-2">
          <Textarea
            aria-label="Objetivos para colar"
            rows={4}
            className="font-mono text-xs"
            placeholder="Cole aqui o que você copiou em outra parte."
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
          />
          <Button variant="outline" size="sm" disabled={!pasted.trim() || full} onClick={paste}>
            Adicionar os objetivos colados
          </Button>
        </div>
      </details>
      {message.length > 0 && (
        <div role="status" className="space-y-1 text-xs">
          {message.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}
    </div>
  )
}
