'use client'
import type { ProjectBlockPattern } from '@sistemazero/core/learning'
import type { ServerBlockCatalogEntry } from '@sistemazero/studio/server-catalog'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'

type Model = {
  available: readonly ServerBlockCatalogEntry[]
  inputs: (block: ServerBlockCatalogEntry) => ServerBlockCatalogEntry['connections']['children']
}

/** Imported flexible criteria stay visible instead of being edited as exact literals. */
export function projectFieldConstraintText(
  pattern: ProjectBlockPattern,
  name: string,
): string | null {
  if (pattern.fieldAlternatives?.some((alternative) => Object.hasOwn(alternative, name)))
    return `Combinações aceitas (campos juntos): ${pattern.fieldAlternatives
      .map((alternative) =>
        Object.entries(alternative)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', '),
      )
      .join(' OU ')}`
  const options = pattern.fieldOptions?.[name]
  if (options) return `Valores aceitos: ${options.join(', ')}`
  const range = pattern.fieldRanges?.[name]
  if (range) {
    const bounds: string[] = []
    if (range.min !== undefined)
      bounds.push(`${range.minExclusive ? 'maior que' : 'maior ou igual a'} ${range.min}`)
    if (range.max !== undefined)
      bounds.push(`${range.maxExclusive ? 'menor que' : 'menor ou igual a'} ${range.max}`)
    return `Número ${bounds.join(' e ')}`
  }
  const text = pattern.fieldText?.[name]
  if (!text) return null
  return text.containsAll
    ? `Texto não vazio; termos exigidos: ${text.containsAll.map((group) => `(${group.join(' OU ')})`).join(' E ')}`
    : 'Texto não vazio'
}

function inputLabel(name: string) {
  const fixed: Record<string, string> = {
    BODY: 'Ações dentro do bloco',
    CHILDREN: 'Conteúdo da área',
    COND: 'Pergunta do Se',
    THEN: 'Ações do então',
    ELSE: 'Ações do senão',
    VALUE: 'Valor',
    SUBTITLE: 'Subtítulo',
    TITLE: 'Título',
    HINT: 'Dica',
    X: 'Posição x',
    Y: 'Posição y',
    VX: 'Velocidade horizontal',
    A: 'Primeiro valor da conta',
    B: 'Segundo valor da conta',
    LEFT: 'Lado esquerdo da comparação',
    RIGHT: 'Lado direito da comparação',
  }
  const branch = /^ELSEIF_(COND|THEN)(\d+)$/.exec(name)
  if (branch)
    return `${branch[1] === 'COND' ? 'Pergunta' : 'Ações'} do senão se ${Number(branch[2]) + 1}`
  const item = /^ITEM(\d+)$/.exec(name)
  return fixed[name] ?? (item ? `Parte ${Number(item[1]) + 1} do texto` : name)
}

/** A bounded tree of actual sockets; teachers never need to write JSON or JavaScript. */
export function ProjectPatternEditor({
  pattern,
  onChange,
  model,
  depth = 0,
}: {
  pattern: ProjectBlockPattern
  onChange: (pattern: ProjectBlockPattern) => void
  model: Model
  depth?: number
}) {
  const block = model.available.find((entry) => entry.type === pattern.blockType)
  if (!block) return null
  const sockets = model.inputs(block)
  return (
    <div className="space-y-2">
      {depth > 0 && block.connections.previous !== undefined && !pattern.beforePattern && (
        <label className="block text-sm">
          Antes de qual comando neste mesmo espaço?
          <Select
            value={pattern.beforeBlock ?? ''}
            onChange={(event) =>
              onChange({ ...pattern, beforeBlock: event.target.value || undefined })
            }
          >
            <option value="">Sem exigência de ordem</option>
            {model.available
              .filter((entry) => entry.connections.previous !== undefined)
              .map((entry) => (
                <option key={entry.type} value={entry.type}>
                  {entry.label}
                </option>
              ))}
          </Select>
        </label>
      )}
      {pattern.beforePattern && depth < 4 && (
        <fieldset className="ml-2 space-y-2 border-l pl-3">
          <legend className="text-sm">Antes deste comando na mesma sequência</legend>
          <p className="text-sm">
            {model.available.find((entry) => entry.type === pattern.beforePattern?.blockType)
              ?.label ?? `Peça indisponível: ${pattern.beforePattern.blockType}`}
          </p>
          <ProjectPatternEditor
            pattern={pattern.beforePattern}
            model={model}
            depth={depth + 1}
            onChange={(updated) => onChange({ ...pattern, beforePattern: updated })}
          />
        </fieldset>
      )}
      {depth > 0 &&
        block.parameters.map((parameter) => {
          const constraint =
            parameter.kind === 'fields' ? projectFieldConstraintText(pattern, parameter.name) : null
          if (constraint)
            return (
              <div key={`fields:${parameter.name}`} className="text-sm">
                <span>
                  {parameter.label} ({parameter.name})
                </span>
                <p className="text-muted-foreground">{constraint}</p>
              </div>
            )
          const value = String(pattern[parameter.kind]?.[parameter.name] ?? '')
          const update = (raw: string) => {
            const values = { ...pattern[parameter.kind] }
            if (raw === '') delete values[parameter.name]
            else values[parameter.name] = parameter.numeric ? Number(raw) : raw
            onChange({
              ...pattern,
              [parameter.kind]: Object.keys(values).length ? values : undefined,
            })
          }
          return (
            <label key={`${parameter.kind}:${parameter.name}`} className="block text-sm">
              {parameter.label} ({parameter.name})
              {parameter.options?.length ? (
                <Select value={value} onChange={(event) => update(event.target.value)}>
                  <option value="">Qualquer valor</option>
                  {parameter.options.map(([label, option]) => (
                    <option key={option} value={option}>
                      {label}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  type={parameter.numeric ? 'number' : 'text'}
                  value={value}
                  disabled={Boolean(
                    pattern.inputBlocks?.[parameter.name] ||
                      pattern.inputBlocksAll?.[parameter.name],
                  )}
                  placeholder="Qualquer valor"
                  onChange={(event) => update(event.target.value)}
                />
              )}
            </label>
          )
        })}
      {depth < 4 && sockets.length > 0 && (
        <details
          open={Boolean(
            Object.keys(pattern.inputBlocks ?? {}).length ||
              Object.keys(pattern.inputBlocksAll ?? {}).length,
          )}
        >
          <summary className="cursor-pointer text-sm">Conferir peças conectadas</summary>
          <p className="text-xs text-muted-foreground">
            Escolha o espaço e a peça esperada nele. Em uma sequência, a peça pode estar em qualquer
            posição dentro desse espaço.
          </p>
          {Object.entries(pattern.inputBlocksAll ?? {}).map(([name, checks]) => (
            <fieldset key={`all:${name}`} className="ml-2 space-y-2 border-l pl-3">
              <legend className="text-sm">
                {inputLabel(name)} — todas as peças no mesmo espaço
              </legend>
              <p className="text-xs text-muted-foreground">
                Cada critério deve aparecer nesta mesma sequência. Isso não exige ocorrências
                diferentes.
              </p>
              {checks.map((check, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Imported criteria have no IDs; this editor only edits fixed slots, never inserts, removes or reorders them.
                <div key={`${name}:${index}`} className="space-y-2">
                  <p className="text-sm">
                    {model.available.find((entry) => entry.type === check.blockType)?.label ??
                      `Peça indisponível: ${check.blockType}`}
                  </p>
                  <ProjectPatternEditor
                    pattern={check}
                    model={model}
                    depth={depth + 1}
                    onChange={(updated) =>
                      onChange({
                        ...pattern,
                        inputBlocksAll: {
                          ...pattern.inputBlocksAll,
                          [name]: checks.map((existing, current) =>
                            current === index ? updated : existing,
                          ),
                        },
                      })
                    }
                  />
                </div>
              ))}
            </fieldset>
          ))}
          {sockets.map((socket) => {
            const child = pattern.inputBlocks?.[socket.name]
            const candidates = model.available.filter((entry) => {
              const connector =
                socket.kind === 'value' ? entry.connections.output : entry.connections.previous
              return (
                connector !== undefined &&
                (connector === null ||
                  socket.checks === null ||
                  connector.some((type) => socket.checks?.includes(type)))
              )
            })
            if (!child && pattern.inputs?.[socket.name] !== undefined) return null
            // Empty mutator sockets stay collapsed in the select; no dozens of empty subforms.
            if (!child) return null
            return (
              <fieldset key={socket.name} className="ml-2 space-y-2 border-l pl-3">
                <legend className="text-sm">{inputLabel(socket.name)}</legend>
                <Select
                  aria-label={`Peça em ${socket.name}`}
                  value={child.blockType}
                  onChange={(event) => {
                    const children = { ...pattern.inputBlocks }
                    if (event.target.value)
                      children[socket.name] = { blockType: event.target.value }
                    else delete children[socket.name]
                    onChange({
                      ...pattern,
                      inputBlocks: Object.keys(children).length ? children : undefined,
                    })
                  }}
                >
                  <option value="">Remover exigência</option>
                  {!candidates.some((entry) => entry.type === child.blockType) && (
                    <option value={child.blockType}>Peça indisponível</option>
                  )}
                  {candidates.map((entry) => (
                    <option key={entry.type} value={entry.type}>
                      {entry.label}
                    </option>
                  ))}
                </Select>
                <ProjectPatternEditor
                  pattern={child}
                  model={model}
                  depth={depth + 1}
                  onChange={(updated) =>
                    onChange({
                      ...pattern,
                      inputBlocks: { ...pattern.inputBlocks, [socket.name]: updated },
                    })
                  }
                />
              </fieldset>
            )
          })}
          <Select
            aria-label="Adicionar espaço a conferir"
            value=""
            onChange={(event) => {
              if (event.target.value)
                onChange({
                  ...pattern,
                  inputBlocks: {
                    ...pattern.inputBlocks,
                    [event.target.value]: { blockType: '' },
                  },
                })
            }}
          >
            <option value="">Adicionar espaço a conferir…</option>
            {sockets
              .filter(
                (socket) =>
                  !pattern.inputBlocks?.[socket.name] &&
                  !pattern.inputBlocksAll?.[socket.name] &&
                  pattern.inputs?.[socket.name] === undefined,
              )
              .map((socket) => (
                <option key={socket.name} value={socket.name}>
                  {inputLabel(socket.name)}
                </option>
              ))}
          </Select>
        </details>
      )}
    </div>
  )
}
