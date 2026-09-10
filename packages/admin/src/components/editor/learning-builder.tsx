'use client'

import {
  type InteractiveBlock,
  type LearningActivity,
  type LearningChoice,
  publicInteractiveBlock,
} from '@sistemazero/core/learning'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Textarea } from '@sistemazero/ui/textarea'
import { useId, useState } from 'react'
import { ImageUploader } from '@/components/media/image-uploader'
import { HtmlCodeEditor } from './html-code-editor'

const initialChoices = (): LearningChoice[] => [
  { id: 'first', label: 'Primeira possibilidade' },
  { id: 'second', label: 'Segunda possibilidade' },
]
export function newLearningActivity(type: LearningActivity['type']): LearningActivity {
  switch (type) {
    case 'prediction':
      return { type, choices: initialChoices(), outcome: '' }
    case 'comparison':
      return {
        type,
        left: { label: 'Antes', url: '', alt: '' },
        right: { label: 'Depois', url: '', alt: '' },
      }
    case 'sequence':
      return {
        type,
        mode: 'order',
        items: initialChoices(),
        solution: ['first', 'second'],
        targets: ['Primeira relação', 'Segunda relação'],
      }
    case 'experiment':
      return { type, preset: 'motion', parameters: { gravity: 0.6 } }
    case 'html':
      return {
        type,
        html: "<h2>Experimente uma ideia</h2>\n<button onclick=\"learning.save({tests:(learning.state.tests||0)+1});learning.participated();this.textContent='Você fez '+learning.state.tests+' testes'\">Experimentar</button>",
      }
  }
}
export const EMPTY_LEARNING: InteractiveBlock = {
  kind: 'interactive',
  title: '',
  instructions: '',
  hints: [],
  required: false,
  activity: newLearningActivity('prediction'),
}
function ChoiceFields({
  choices,
  onChange,
}: {
  choices: LearningChoice[]
  onChange: (choices: LearningChoice[]) => void
}) {
  return (
    <div className="space-y-2">
      {choices.map((choice, i) => (
        <div key={choice.id} className="flex gap-2">
          <Input
            aria-label={`Texto da opção ${i + 1}`}
            value={choice.label}
            onChange={(e) =>
              onChange(
                choices.map((item) =>
                  item.id === choice.id ? { ...item, label: e.target.value } : item,
                ),
              )
            }
          />
          <Button
            variant="ghost"
            disabled={choices.length <= 2}
            onClick={() => onChange(choices.filter((item) => item.id !== choice.id))}
          >
            Remover
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        disabled={choices.length >= 20}
        onClick={() => onChange([...choices, { id: crypto.randomUUID(), label: '' }])}
      >
        Adicionar opção
      </Button>
    </div>
  )
}

export function LearningBuilder({
  value,
  onChange,
}: {
  value: InteractiveBlock
  onChange: (value: InteractiveBlock) => void
}) {
  const id = useId()
  const [preview, setPreview] = useState(false)
  const a = value.activity
  const activity = (next: LearningActivity) => onChange({ ...value, activity: next })
  const checkpoint = value.checkpoint
  return (
    <div className="space-y-5">
      <Field label="Título da atividade" htmlFor={`${id}-title`}>
        <Input
          id={`${id}-title`}
          value={value.title}
          maxLength={200}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
        />
      </Field>
      <Field label="O que o aluno vai experimentar" htmlFor={`${id}-instructions`}>
        <Textarea
          id={`${id}-instructions`}
          value={value.instructions}
          maxLength={10000}
          onChange={(e) => onChange({ ...value, instructions: e.target.value })}
        />
      </Field>
      <Field label="Modelo" htmlFor={`${id}-model`}>
        <Select
          id={`${id}-model`}
          value={a.type}
          onChange={(e) => {
            const type = e.target.value
            if (
              type === 'prediction' ||
              type === 'comparison' ||
              type === 'sequence' ||
              type === 'experiment' ||
              type === 'html'
            )
              activity(newLearningActivity(type))
          }}
        >
          <option value="prediction">Prever e observar</option>
          <option value="comparison">Comparar duas possibilidades</option>
          <option value="sequence">Ordenar ou associar</option>
          <option value="experiment">Experimentar um modelo 2D</option>
          <option value="html">Experiência especial em HTML</option>
        </Select>
      </Field>
      {a.type === 'prediction' && (
        <>
          <Field label="Previsões possíveis">
            <ChoiceFields choices={a.choices} onChange={(choices) => activity({ ...a, choices })} />
          </Field>
          <Field
            label="Resultado observado"
            htmlFor={`${id}-outcome`}
            hint="A previsão não recebe nota. Explique o que aconteceu e convide a comparar com a hipótese."
          >
            <Textarea
              id={`${id}-outcome`}
              value={a.outcome}
              onChange={(e) => activity({ ...a, outcome: e.target.value })}
            />
          </Field>
        </>
      )}
      {a.type === 'comparison' && (
        <div className="grid gap-5 sm:grid-cols-2">
          {(['left', 'right'] as const).map((side) => (
            <div key={side} className="space-y-3 rounded-xl border border-border p-4">
              <Field label={side === 'left' ? 'Primeira possibilidade' : 'Segunda possibilidade'}>
                <Input
                  aria-label={`Título ${side === 'left' ? 'da primeira' : 'da segunda'} possibilidade`}
                  value={a[side].label}
                  onChange={(e) =>
                    activity({ ...a, [side]: { ...a[side], label: e.target.value } })
                  }
                />
              </Field>
              <ImageUploader
                scope="block"
                allowManualUrl={false}
                value={a[side].url}
                onChange={(url) => activity({ ...a, [side]: { ...a[side], url } })}
              />
              <Field label="Descrição acessível">
                <Textarea
                  aria-label={`Descrição ${side === 'left' ? 'da primeira' : 'da segunda'} imagem`}
                  value={a[side].alt}
                  onChange={(e) => activity({ ...a, [side]: { ...a[side], alt: e.target.value } })}
                />
              </Field>
            </div>
          ))}
        </div>
      )}
      {a.type === 'sequence' && (
        <div className="space-y-4">
          <Field label="Tipo de relação">
            <Select
              aria-label="Tipo de relação"
              value={a.mode}
              onChange={(e) =>
                activity({ ...a, mode: e.target.value === 'match' ? 'match' : 'order' })
              }
            >
              <option value="order">Colocar em ordem</option>
              <option value="match">Associar pares</option>
            </Select>
          </Field>
          <ChoiceFields
            choices={a.items}
            onChange={(items) => {
              const ids = new Set(items.map((item) => item.id))
              const remaining = a.solution.filter((item) => ids.has(item))
              activity({
                ...a,
                items,
                solution: [
                  ...remaining,
                  ...items.filter((item) => !remaining.includes(item.id)).map((item) => item.id),
                ],
                targets: items.map((_, i) => a.targets[i] ?? `Relação ${i + 1}`),
              })
            }}
          />
          <fieldset className="space-y-2 rounded-xl bg-muted/30 p-4">
            <legend className="font-medium">Resposta esperada (somente professor)</legend>
            {a.solution.map((choice, index) => (
              <div key={a.items[index]?.id} className="flex items-center gap-3">
                {a.mode === 'match' ? (
                  <Input
                    aria-label={`Relação ${index + 1}`}
                    value={a.targets[index] ?? ''}
                    onChange={(e) =>
                      activity({
                        ...a,
                        targets: a.targets.map((label, i) =>
                          i === index ? e.target.value : label,
                        ),
                      })
                    }
                  />
                ) : (
                  <span>{index + 1}.</span>
                )}
                <Select
                  aria-label={`Resposta da posição ${index + 1}`}
                  value={choice}
                  onChange={(e) => {
                    const solution = [...a.solution]
                    const previous = solution.indexOf(e.target.value)
                    solution[index] = e.target.value
                    if (previous >= 0) solution[previous] = choice
                    activity({ ...a, solution })
                  }}
                >
                  {a.items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </fieldset>
        </div>
      )}
      {a.type === 'experiment' && (
        <Field
          label="Modelo de experimento"
          hint="O aluno controla uma variável e compara os testes, sem alterar seu jogo."
        >
          <Select
            aria-label="Modelo de experimento"
            value={a.preset}
            onChange={(e) => {
              const preset = e.target.value
              if (preset === 'motion' || preset === 'population' || preset === 'collision')
                activity({ ...a, preset, parameters: {} })
            }}
          >
            <option value="motion">Movimento e gravidade</option>
            <option value="population">Nascimento e saída de objetos</option>
            <option value="collision">Áreas de colisão</option>
          </Select>
        </Field>
      )}
      {a.type === 'html' && (
        <Field
          label="HTML da experiência"
          hint="Use learning.state, learning.save(estado), learning.participated() e o evento learning:restore. Sem rede ou acesso à sessão. A pergunta de verificação fica fora do HTML."
        >
          <HtmlCodeEditor value={a.html} onChange={(html) => activity({ ...a, html })} />
        </Field>
      )}
      <Field label="Pistas (uma por linha)" htmlFor={`${id}-hints`}>
        <Textarea
          id={`${id}-hints`}
          rows={3}
          value={value.hints.join('\n')}
          onChange={(e) => onChange({ ...value, hints: e.target.value.split('\n').slice(0, 10) })}
        />
      </Field>
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          checked={value.required}
          onChange={(e) => onChange({ ...value, required: e.target.checked })}
        />
        Essencial para concluir esta aula
      </label>
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          checked={Boolean(checkpoint)}
          onChange={(e) =>
            onChange({
              ...value,
              checkpoint: e.target.checked
                ? {
                    prompt: '',
                    choices: initialChoices(),
                    correctChoiceId: 'first',
                    explanation: '',
                  }
                : undefined,
            })
          }
        />
        Incluir pergunta de verificação
      </label>
      {value.required && (a.type === 'html' || a.type === 'experiment') && !checkpoint && (
        <p role="status" className="text-sm text-destructive">
          Adicione uma pergunta de verificação para tornar este experimento essencial.
        </p>
      )}
      {checkpoint && (
        <div className="space-y-4 rounded-xl border border-border p-4">
          <Field label="Pergunta" htmlFor={`${id}-question`}>
            <Textarea
              id={`${id}-question`}
              value={checkpoint.prompt}
              onChange={(e) =>
                onChange({ ...value, checkpoint: { ...checkpoint, prompt: e.target.value } })
              }
            />
          </Field>
          <ChoiceFields
            choices={checkpoint.choices}
            onChange={(choices) =>
              onChange({
                ...value,
                checkpoint: {
                  ...checkpoint,
                  choices,
                  correctChoiceId: choices.some(
                    (choice) => choice.id === checkpoint.correctChoiceId,
                  )
                    ? checkpoint.correctChoiceId
                    : (choices[0]?.id ?? ''),
                },
              })
            }
          />
          <Field label="Resposta esperada">
            <Select
              aria-label="Resposta esperada"
              value={checkpoint.correctChoiceId}
              onChange={(e) =>
                onChange({
                  ...value,
                  checkpoint: { ...checkpoint, correctChoiceId: e.target.value },
                })
              }
            >
              {checkpoint.choices.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Feedback explicativo">
            <Textarea
              aria-label="Feedback explicativo"
              value={checkpoint.explanation}
              onChange={(e) =>
                onChange({ ...value, checkpoint: { ...checkpoint, explanation: e.target.value } })
              }
            />
          </Field>
        </div>
      )}
      <Button variant="outline" onClick={() => setPreview((open) => !open)}>
        {preview ? 'Fechar prévia' : 'Experimentar a prévia'}
      </Button>
      {preview && (
        <InteractiveLessonBlock
          previewContent={value}
          block={{
            id: 'author-preview',
            kind: 'interactive',
            sortOrder: 0,
            content: publicInteractiveBlock(value),
          }}
        />
      )}
    </div>
  )
}
