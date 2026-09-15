'use client'

import {
  type InteractiveBlock,
  type LearningActivity,
  type LearningChoice,
  publicInteractiveBlock,
} from '@sistemazero/core/learning'
import { isSceneAudioUrl, SCENE_LIMITS, sceneModelFor } from '@sistemazero/core/learning/scene'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Textarea } from '@sistemazero/ui/textarea'
import { useId, useRef, useState } from 'react'
// ⚠️ Caminho relativo, e não o alias `@/`: o ensaio visual do kids compila este arquivo pelo
// CAMINHO, e lá o alias do admin não existe.
import {
  lembrar,
  type MemoriaDaAutoria,
  textoAoTrocarCena,
  trocarCena,
  trocarTipo,
} from '../../lib/scene-authoring-rules'
import { HtmlCodeEditor } from './html-code-editor'
import { SceneAuthoring } from './scene-authoring'
import { SceneCastEditor } from './scene-cast-editor'
import { ScenePicker } from './scene-picker'

const initialChoices = (): LearningChoice[] => [
  { id: 'first', label: 'Primeira possibilidade' },
  { id: 'second', label: 'Segunda possibilidade' },
]

/**
 * As quatro formas de atividade, na língua do professor.
 *
 * ⚠️ Eram OITO opções num `<select>`, e três delas nomeavam versões do mesmo motor ("Exploração
 * anterior (versão 1)"). Pior: a cena tinha um segundo seletor de MODO dentro dela, então
 * "demonstração" e "experimentação" eram o mesmo tipo com um interruptor — duas coisas
 * diferentes escondidas atrás de uma. Agora são quatro tipos irmãos, e cada um diz o que é.
 */
export const ACTIVITY_KINDS = [
  {
    type: 'experimentation',
    label: 'Experimentação',
    hint: 'A criança mexe na cena e descobre sozinha. Fecha quando ela alcança as descobertas.',
  },
  {
    type: 'demonstration',
    label: 'Demonstração',
    hint: 'A cena se move sozinha, passo a passo, e a criança assiste. Fecha quando ela vê até o fim.',
  },
  {
    type: 'question',
    label: 'Pergunta curta',
    hint: 'Uma pergunta de múltipla escolha, conferida no servidor.',
  },
  {
    type: 'html',
    label: 'Experiência em HTML',
    hint: 'Uma página sua, isolada num quadro. Para o que as cenas não cobrem.',
  },
] as const satisfies readonly { type: LearningActivity['type']; label: string; hint: string }[]

export function newLearningActivity(type: LearningActivity['type']): LearningActivity {
  switch (type) {
    case 'demonstration':
      return { type, scene: 'world' }
    case 'experimentation':
      return { type, scene: 'world' }
    case 'question':
      return { type }
    case 'html':
      return {
        type,
        html: "<h2>Experimente uma ideia</h2>\n<button onclick=\"learning.save({tests:(learning.state.tests||0)+1});learning.participated();this.textContent='Você fez '+learning.state.tests+' testes'\">Experimentar</button>",
      }
  }
}

/**
 * ⚠️ O bloco novo já nasce com o texto do modelo da cena padrão. Nascia em branco, e as regras
 * de troca só disparam numa TROCA — clicar no cartão já marcado não emite evento. Quem aceitava
 * o padrão escrevia tudo à mão e ainda levava o erro de campo obrigatório; quem clicava em
 * qualquer outra cena ganhava o texto de graça. O mesmo botão, dois comportamentos.
 */
export const EMPTY_LEARNING: InteractiveBlock = {
  kind: 'interactive',
  required: false,
  activity: newLearningActivity('experimentation'),
  ...textoAoTrocarCena({ title: '', instructions: '', hints: [] }, null, 'world'),
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
  sectionCriteria = false,
}: {
  value: InteractiveBlock
  onChange: (value: InteractiveBlock) => void
  sectionCriteria?: boolean
}) {
  const id = useId()
  const [preview, setPreview] = useState(false)
  const [aviso, setAviso] = useState('')
  // ⚠️ A memória do que o professor escreveu, viva enquanto este editor estiver aberto. Num
  // grupo de rádio a SETA já seleciona ao passar, então ir de um cartão ao outro pelo teclado
  // atravessava os do meio destruindo roteiro, HTML, áudio, impulso e a cena escolhida.
  const memoria = useRef<MemoriaDaAutoria>({})
  memoria.current = lembrar(memoria.current, value)
  const a = value.activity
  const activity = (next: LearningActivity) => onChange({ ...value, activity: next })
  const checkpoint = value.checkpoint
  const cena = a.type === 'demonstration' || a.type === 'experimentation' ? a : null
  // ⚠️ Em const: dentro dos callbacks o TS perde o estreitamento de `value.prediction` (é
  // propriedade mutável) e o espalhamento volta a ter `prompt` opcional, que não é o tipo.
  const previsao = value.prediction
  // ⚠️ Só o ÁUDIO. Antes era `!isSceneActivity(cena)`, que também é falso por roteiro inválido
  // e por impulso fora de faixa — então a tela acusava o endereço (um `https://` perfeito)
  // quando o defeito era outro. Apontar o culpado errado com precisão é pior que a parede.
  const audioInvalido =
    Boolean(cena?.instructionAudioUrl) && !isSceneAudioUrl(cena?.instructionAudioUrl)

  /**
   * ⚠️ O editor NÃO decide mais o que sobrevive a uma troca: quem decide são as regras puras de
   * `lib/scene-authoring-rules`, e aqui só se aplica o resultado e se mostra o recado. Cada
   * uma delas já esteve errada, e o erro só aparecia quando o trabalho já tinha sumido.
   */
  const aplicar = ({ bloco, aviso: recado }: { bloco: InteractiveBlock; aviso: string }) => {
    setAviso(recado)
    onChange(bloco)
  }

  /** O recado da última troca. ⚠️ FORA do `{cena && …}`: o aviso mais importante é justamente o
   *  de SAIR de uma cena, e ali ele desmontava junto com o bloco que o mostrava. */
  const avisoDaTroca = aviso ? (
    <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
      {aviso}
    </p>
  ) : null

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

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Tipo de atividade</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {ACTIVITY_KINDS.map((kind) => (
            <label
              key={kind.type}
              className={`flex cursor-pointer flex-col gap-1 rounded-xl border-2 p-4 ${
                a.type === kind.type
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <span className="flex items-center gap-3 font-semibold">
                <input
                  type="radio"
                  name={`${id}-kind`}
                  value={kind.type}
                  checked={a.type === kind.type}
                  onChange={() => aplicar(trocarTipo(value, kind.type, memoria.current))}
                  className="accent-primary"
                />
                {kind.label}
              </span>
              <span className="pl-7 text-sm text-muted-foreground">{kind.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {avisoDaTroca}

      {cena && (
        <div className="space-y-4">
          {/* ⚠️ Sem `<Field>`: ele desenha um `<label>` sem `for` e sem controle dentro, então a
              palavra "Cena" não nomeia nada para o leitor de tela. O `ScenePicker` já traz os
              próprios `<fieldset>`/`<legend>`, um por família. */}
          <ScenePicker
            value={cena.scene}
            onChange={(scene) => aplicar(trocarCena(value, scene, memoria.current))}
          />
          {cena.type === 'demonstration' ? (
            <SceneAuthoring activity={cena} onChange={activity} />
          ) : (
            <p className="rounded-xl bg-muted/40 p-4 text-sm">
              A criança usa os controles da cena. Toque, arraste e teclado levam ao mesmo lugar, e a
              atividade fecha em:{' '}
              {sceneModelFor(cena)
                .goals.map((g) => g.label)
                .join('; ')}
              .
            </p>
          )}
          <details className="rounded-xl border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Elenco, áudio e ajustes da cena
            </summary>
            <div className="mt-3 space-y-3">
              <SceneCastEditor activity={cena} onChange={activity} />
              {cena.type === 'experimentation' &&
                (cena.scene === 'gravity' || cena.scene === 'impulse') && (
                  <Field
                    label="Impulso inicial do modelo"
                    htmlFor={`${id}-initial-impulse`}
                    hint={`Entre ${SCENE_LIMITS.impulse.min} e ${SCENE_LIMITS.impulse.max}. A gravidade permanece igual para comparar os saltos.`}
                  >
                    <Input
                      id={`${id}-initial-impulse`}
                      type="number"
                      min={SCENE_LIMITS.impulse.min}
                      max={SCENE_LIMITS.impulse.max}
                      step={1}
                      value={cena.initialImpulse ?? 9}
                      onChange={(event) => {
                        const força = Number(event.target.value)
                        if (
                          Number.isInteger(força) &&
                          força >= SCENE_LIMITS.impulse.min &&
                          força <= SCENE_LIMITS.impulse.max
                        )
                          activity({ ...cena, initialImpulse: força })
                      }}
                    />
                  </Field>
                )}
              {/* ⚠️ A mensagem é explícita: `http://` INVALIDA a atividade, e sem ela o
                  professor levava a parede genérica de "complete os campos" na publicação, que
                  fala de outra coisa. O `type="url"` do navegador aceita http. */}
              <Field
                label="Áudio revisado da instrução (opcional)"
                htmlFor={`${id}-audio`}
                hint="A criança poderá escolher Ouvir. A instrução escrita permanece disponível. Precisa ser https:// ou um caminho do próprio site."
                error={
                  audioInvalido ? 'O endereço precisa começar com https:// ou com /.' : undefined
                }
              >
                <Input
                  id={`${id}-audio`}
                  type="url"
                  placeholder="https://…"
                  value={cena.instructionAudioUrl ?? ''}
                  onChange={(event) =>
                    activity({ ...cena, instructionAudioUrl: event.target.value || undefined })
                  }
                />
              </Field>
            </div>
          </details>
        </div>
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
          // ⚠️ Linha em branco NÃO vira pista. `isInteractiveBlock` recusa pistas repetidas, e
          // duas linhas vazias são repetidas — separar as pistas com uma linha em branco, que é
          // o gesto mais natural desta caixa, derrubava a publicação com o recado genérico de
          // "complete os campos da descoberta", sem nada apontar para aqui.
          onChange={(e) =>
            onChange({
              ...value,
              hints: e.target.value
                .split('\n')
                .map((linha) => linha.trim())
                .filter(Boolean)
                .slice(0, 10),
            })
          }
        />
      </Field>
      {!sectionCriteria && (
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            checked={value.required}
            onChange={(e) => onChange({ ...value, required: e.target.checked })}
          />
          Essencial para concluir esta aula
        </label>
      )}
      {sectionCriteria && (
        <p className="text-sm text-muted-foreground">
          A obrigatoriedade é escolhida nos critérios da seção, no percurso da aula.
        </p>
      )}
      {cena && (
        /* ⭐ A previsão é o padrão mais forte do Brilliant: a criança arrisca um palpite antes
           de a cena abrir, mexe e descobre sozinha se acertou. ⚠️ Ela NÃO avalia nada — errar
           faz parte, e reprovar por isso ensinaria a não arriscar. Por isso tem campo próprio
           e não reusa a pergunta de verificação. */
        <div className="space-y-3 rounded-xl border border-border p-4">
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={Boolean(previsao)}
              onChange={(e) =>
                onChange({
                  ...value,
                  prediction: e.target.checked
                    ? { prompt: '', choices: initialChoices() }
                    : undefined,
                })
              }
            />
            Perguntar o que ela acha que vai acontecer, antes de abrir a cena
          </label>
          {previsao && (
            <>
              <Field
                label="Pergunta de antes"
                htmlFor={`${id}-prediction`}
                // ⚠️ Sem esta linha, uma previsão com a pergunta em branco só aparece lá em cima,
                // no "Complete os campos da descoberta antes de publicar" — a mesma armadilha da
                // caixa de pistas, que custou uma sessão para alguém achar.
                error={
                  previsao.prompt.trim() ? undefined : 'Escreva a pergunta, ou a aula não publica.'
                }
              >
                <Textarea
                  id={`${id}-prediction`}
                  value={previsao.prompt}
                  onChange={(e) =>
                    onChange({ ...value, prediction: { ...previsao, prompt: e.target.value } })
                  }
                />
              </Field>
              <ChoiceFields
                choices={previsao.choices}
                onChange={(choices) =>
                  onChange({
                    ...value,
                    prediction: {
                      ...previsao,
                      choices,
                      // O gabarito é OPCIONAL e não vale nota, mas se apontar para uma opção
                      // apagada o guard do core reprova a publicação.
                      correctChoiceId: choices.some((c) => c.id === previsao.correctChoiceId)
                        ? previsao.correctChoiceId
                        : undefined,
                    },
                  })
                }
              />
              <Field label="O que acontece de verdade (opcional)">
                <Select
                  aria-label="O que acontece de verdade"
                  value={previsao.correctChoiceId ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      prediction: { ...previsao, correctChoiceId: e.target.value || undefined },
                    })
                  }
                >
                  <option value="">Não dizer</option>
                  {previsao.choices.map((choice) => (
                    <option key={choice.id} value={choice.id}>
                      {choice.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <p className="text-sm text-muted-foreground">
                Sem nota: errar aqui não reprova nada, e a criança não vê se acertou. Quem responde
                a previsão é a cena, quando ela mexer. Marcar a opção certa serve só para o seu
                acompanhamento.
              </p>
            </>
          )}
        </div>
      )}
      {!cena && (
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            checked={Boolean(checkpoint)}
            disabled={a.type === 'question'}
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
      )}
      {value.required && a.type === 'html' && !checkpoint && (
        <p role="status" className="text-sm text-destructive">
          Adicione uma pergunta de verificação para tornar esta experiência essencial.
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
        // ⚠️ O `sz-lesson-block` é o que dá o cartão à cena: ela não desenha o dela, e sem este
        // embrulho a prévia sai solta na página — diferente do que o ensaio e a aula mostram.
        <div className="sz-lesson-block">
          <InteractiveLessonBlock
            previewContent={value}
            block={{
              id: 'author-preview',
              kind: 'interactive',
              sortOrder: 0,
              content: publicInteractiveBlock(value),
            }}
          />
        </div>
      )}
    </div>
  )
}
