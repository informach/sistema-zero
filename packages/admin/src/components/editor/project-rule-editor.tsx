'use client'
import { PROJECT_CHECK_AREAS, type SectionStructureRule } from '@sistemazero/core/learning'
import type { ServerBlockCatalogEntry } from '@sistemazero/studio/server-catalog'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'
import { useEffect, useMemo, useState } from 'react'
import { ProjectPatternEditor } from './project-pattern-editor'

type Rule = Extract<SectionStructureRule, { type: 'usesBlock' }>
export function ProjectRuleEditor({
  rule,
  onChange,
  allowBlocks,
  workspace,
}: {
  rule: Rule
  onChange: (rule: Rule) => void
  allowBlocks?: string[]
  workspace?: unknown
}) {
  const [factory, setFactory] = useState<
    typeof import('@sistemazero/studio/server-project-checks').projectCheckAuthoring | null
  >(null)
  const [query, setQuery] = useState('')
  useEffect(() => {
    let active = true
    void import('@sistemazero/studio/server-project-checks').then((module) => {
      if (active) setFactory(() => module.projectCheckAuthoring)
    })
    return () => {
      active = false
    }
  }, [])
  const fallbackAllowBlocks = workspace === undefined ? allowBlocks : undefined
  const model = useMemo(
    () => factory?.(workspace ?? { allowBlocks: fallbackAllowBlocks }),
    [factory, workspace, fallbackAllowBlocks],
  )
  const catalog: readonly ServerBlockCatalogEntry[] = model?.available ?? []
  const selected = catalog.find((block) => block.type === rule.blockType)
  const options = catalog.filter((block) =>
    `${block.label} ${block.category}`
      .toLocaleLowerCase('pt-BR')
      .includes(query.toLocaleLowerCase('pt-BR')),
  )
  const locationRule = useMemo(
    () => ({
      type: 'usesBlock' as const,
      blockType: rule.blockType,
      area: rule.area,
      withinBlock: rule.withinBlock,
    }),
    [rule.blockType, rule.area, rule.withinBlock],
  )
  const validAreas = useMemo(() => model?.areas(locationRule) ?? [], [model, locationRule])
  const containers = useMemo(() => model?.containers(locationRule) ?? [], [model, locationRule])
  const issues = model && rule.blockType ? model.issues(rule) : []
  function parameter(kind: 'fields' | 'inputs', name: string, value: string | number) {
    const values = { ...rule[kind] }
    if (value === '') delete values[name]
    else values[name] = value
    onChange({ ...rule, [kind]: Object.keys(values).length ? values : undefined })
  }
  return (
    <div className="space-y-2">
      <label className="block text-sm">
        Buscar bloco pelo nome
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tela, personagem, repetição…"
        />
      </label>
      <label className="block text-sm">
        Bloco a conferir
        <Select
          value={rule.blockType}
          onChange={(e) => {
            onChange({
              type: 'usesBlock',
              blockType: e.target.value,
            })
          }}
        >
          <option value="">Selecione um bloco</option>
          {rule.blockType && !selected && (
            <option value={rule.blockType}>Bloco indisponível: {rule.blockType}</option>
          )}
          {selected && !options.includes(selected) && (
            <option value={selected.type}>
              {selected.category} · {selected.label}
            </option>
          )}
          {options.map((block) => (
            <option value={block.type} key={block.type}>
              {block.category} · {block.label}
            </option>
          ))}
        </Select>
      </label>
      <label className="block text-sm">
        Encaixado na área
        <Select
          value={rule.area ?? ''}
          onChange={(e) =>
            onChange({
              ...rule,
              area: e.target.value ? (e.target.value as Rule['area']) : undefined,
            })
          }
        >
          <option value="">Qualquer área válida</option>
          {rule.area && !validAreas.includes(rule.area) && (
            <option value={rule.area}>{PROJECT_CHECK_AREAS[rule.area]} (incompatível)</option>
          )}
          {validAreas.map((value) => (
            <option key={value} value={value}>
              {PROJECT_CHECK_AREAS[value]}
            </option>
          ))}
        </Select>
      </label>
      <p className="text-xs text-muted-foreground">
        Blocos soltos ou desativados não contam. Valores abaixo são opcionais e exigem uma
        configuração literal.
      </p>
      <label className="block text-sm">
        Quantidade exata (opcional; zero confere a retirada)
        <Input
          type="number"
          min={0}
          max={200000}
          step={1}
          value={rule.count ?? ''}
          onChange={(event) =>
            onChange({
              ...rule,
              count: event.target.value === '' ? undefined : Number(event.target.value),
            })
          }
        />
      </label>
      {selected?.connections.previous !== undefined && (
        <label className="block text-sm">
          Deve vir antes de
          <Select
            value={rule.beforeBlock ?? ''}
            onChange={(event) =>
              onChange({ ...rule, beforeBlock: event.target.value || undefined })
            }
          >
            <option value="">Sem exigência de ordem</option>
            {catalog
              .filter((block) => block.connections.previous !== undefined)
              .map((block) => (
                <option key={block.type} value={block.type}>
                  {block.label}
                </option>
              ))}
          </Select>
        </label>
      )}
      {selected?.parameters.map((param) => (
        <label className="block text-sm" key={`${param.kind}:${param.name}`}>
          {param.label}
          {param.options?.length ? (
            <Select
              value={String(rule[param.kind]?.[param.name] ?? '')}
              onChange={(e) => parameter(param.kind, param.name, e.target.value)}
            >
              <option value="">Qualquer valor</option>
              {param.options.map(([label, value]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              disabled={Boolean(param.kind === 'inputs' && rule.inputBlocks?.[param.name])}
              type={param.numeric ? 'number' : 'text'}
              placeholder="Qualquer valor"
              value={String(rule[param.kind]?.[param.name] ?? '')}
              onChange={(e) =>
                parameter(
                  param.kind,
                  param.name,
                  param.numeric && e.target.value !== '' ? Number(e.target.value) : e.target.value,
                )
              }
            />
          )}
        </label>
      ))}
      {model && (
        <ProjectPatternEditor
          pattern={rule}
          model={model}
          onChange={(pattern) => onChange({ ...rule, ...pattern })}
        />
      )}
      {issues.map((issue) => (
        <p key={issue} role="alert" className="text-xs text-destructive">
          {issue}
        </p>
      ))}
      <details>
        <summary className="cursor-pointer text-sm">Exigir encaixe dentro de outro bloco</summary>
        <Select
          aria-label="Bloco que contém a ação"
          value={rule.withinBlock ?? ''}
          onChange={(e) => onChange({ ...rule, withinBlock: e.target.value || undefined })}
        >
          <option value="">Sem exigência adicional</option>
          {rule.withinBlock && !containers.some((block) => block.type === rule.withinBlock) && (
            <option value={rule.withinBlock}>{rule.withinBlock} (verifique o encaixe)</option>
          )}
          {containers.map((block) => (
            <option value={block.type} key={block.type}>
              {block.category} · {block.label}
            </option>
          ))}
        </Select>
      </details>
    </div>
  )
}
