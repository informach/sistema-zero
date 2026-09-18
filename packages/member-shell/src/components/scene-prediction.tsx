'use client'

import type { LearningPrediction } from '@sistemazero/core/learning'
import { falaDoPalpite } from '@sistemazero/core/learning/scene'
import { Check, Eye } from 'lucide-react'
import { type ReactNode, type RefObject, useId } from 'react'
import type { DialogueSpeech } from './dialogue-block'
import { SceneButton } from './exploration-stage'
import { LugarReservado } from './scene-lugar-reservado'

/**
 * O PALPITE, nos tempos em que ele aparece: aberto, congelado e retomado.
 *
 * ⭐⭐ Lote 2 do Raio-X (16/09/2026), o ciclo do Brilliant fechado: apostar ANTES de ver, mexer, e
 * então saber se acertou. Até aqui o palpite nunca era retomado (o gabarito era podado da projeção
 * pública), os rádios continuavam editáveis depois de ela ver o resultado, e a frase "Agora mexa na
 * cena e veja se foi isso mesmo" ficava na tela para sempre, sem nunca fechar.
 *
 * ⚠️⚠️ O palpite retomado tem DOIS tempos (consertos do review do lote 2). No instante em que a
 * cena responde, a frase completa ("Você achou: X. Olhe a tela…") mora JUNTO do aviso da
 * descoberta, embaixo do palco (quem desenha é o player). Aqui em cima fica só a linha no PASSADO
 * ("Seu palpite: X. Não era isso."): a frase que manda OLHAR só é verdade naquele instante, e
 * minutos depois, com o palco em outro estado, ela mentia ("o Dino está só nos bastidores" com o
 * Dino desenhado na tela).
 *
 * ⚠️ A previsão NÃO vale nota: retomar é mostrar, nunca punir. O "errou" é âmbar e diz para onde
 * olhar; o palpite continua subindo junto da tentativa, para o relatório do professor.
 */

/** Onde o palpite mora: por PERFIL, aula, bloco e revisão (o `scope` do player). */
const chave = (scope: string) => `sz:scene-prediction:${scope}`

/**
 * A IMPRESSÃO da pergunta: o enunciado e as opções (id e texto).
 *
 * ⚠️⚠️ O `scope` só muda quando o BLOCO é reimportado, e a previsão que o bloco herda é do MODELO
 * da cena, que muda no deploy (o lote 2 trocou os ids de 22 previsões, e na `game-state` manteve os
 * ids e trocou o SENTIDO). Guardada sem a impressão, a escolha de uma pergunta que não existe mais
 * abria um estado impossível: palco destravado com os rádios abertos, e o id morto subindo na
 * tentativa. Com ela, pergunta diferente = palpite descartado, e a criança palpita de novo.
 */
function impressao(prediction: LearningPrediction): string {
  return [prediction.prompt, ...prediction.choices.map((c) => `${c.id}:${c.label}`)].join('\n')
}

/**
 * ⚠️⚠️ No `localStorage`, e não mais no `sessionStorage` (lote 2). No da SESSÃO, outro dia, outra
 * aba ou outro aparelho reabriam uma atividade JÁ CONCLUÍDA com o palco trancado atrás de "escolha
 * um palpite", enquanto o cartão logo abaixo dizia que ela tinha concluído: o palpite ali já não era
 * palpite. O `scope` leva o perfil, então irmãos no mesmo navegador não herdam o palpite um do outro.
 */
export function lerPalpite(
  scope: string | null,
  prediction: LearningPrediction | undefined,
): string {
  if (typeof window === 'undefined' || !scope || !prediction) return ''
  const existe = (id: unknown): id is string =>
    typeof id === 'string' && prediction.choices.some((c) => c.id === id)
  try {
    const guardado = localStorage.getItem(chave(scope))
    if (!guardado) return ''
    const lido: unknown = JSON.parse(guardado)
    if (
      typeof lido === 'object' &&
      lido !== null &&
      'pergunta' in lido &&
      'escolha' in lido &&
      lido.pergunta === impressao(prediction) &&
      existe(lido.escolha)
    )
      return lido.escolha
    return ''
  } catch {
    return ''
  }
}
export function guardarPalpite(
  scope: string | null,
  prediction: LearningPrediction,
  escolha: string,
) {
  if (!scope) return
  try {
    localStorage.setItem(chave(scope), JSON.stringify({ escolha, pergunta: impressao(prediction) }))
  } catch {
    /* aba privada: o palpite vale para esta tela mesmo assim */
  }
}

/** Apaga a escolha persistida quando a criança decide formular outro palpite. */
export function apagarPalpite(scope: string | null) {
  if (!scope) return
  try {
    localStorage.removeItem(chave(scope))
  } catch {
    /* aba privada: o estado em memória ainda volta ao início */
  }
}

/** Acertou, errou, ou não há o que conferir (previsão sem gabarito). */
export function vereditoDoPalpite(
  prediction: LearningPrediction,
  escolha: string,
): 'acertou' | 'errou' | null {
  if (typeof prediction.correctChoiceId !== 'string') return null
  return prediction.correctChoiceId === escolha ? 'acertou' : 'errou'
}

export function ScenePrediction({
  prediction,
  escolha,
  onEscolher,
  onTrocar,
  trocavel,
  revelado,
  demonstracao,
  bloqueado,
  preview,
  renderDialogue,
  dialogueRef,
}: {
  prediction: LearningPrediction
  escolha: string
  onEscolher: (id: string) => void
  /** A troca volta a atividade inteira ao momento anterior à descoberta. */
  onTrocar?: () => void
  /** Ainda dá para trocar: nenhum gesto na cena depois do palpite. */
  trocavel: boolean
  /** A meta que responde o palpite caiu (ou, sem `revealOn`, a cena concluiu). */
  revelado: boolean
  demonstracao: boolean
  /** Sem gravação possível (conflito, abrindo): as opções não respondem. */
  bloqueado: boolean
  /** O retrato seguro da cena, usado apenas antes da escolha. */
  preview: ReactNode
  /** Balão hospedado pelo app, com mascote e uma fala independente. */
  renderDialogue: (text: string, speech: DialogueSpeech) => ReactNode
  /** Alvo do foco quando a criança escolhe trocar seu palpite. */
  dialogueRef: RefObject<HTMLDivElement | null>
}) {
  const id = useId()
  const escolhida = prediction.choices.find((c) => c.id === escolha)

  if (!escolhida)
    return (
      <fieldset className="space-y-2 rounded-2xl bg-primary/5 p-4">
        <legend className="float-left mb-2 w-full">
          <span className="block text-sm font-bold uppercase tracking-[.14em] text-primary">
            {demonstracao ? 'Antes de assistir' : 'Seu palpite'}
          </span>
        </legend>
        <div ref={dialogueRef} tabIndex={-1} className="clear-left outline-none">
          {renderDialogue(`${prediction.context.explanation}\n\n${prediction.prompt}`, {
            texts: [falaDoPalpite(demonstracao ? 'Antes de assistir' : 'Seu palpite', prediction)],
            fallbackToBrowser: true,
          })}
        </div>
        {preview}
        <div className="space-y-2">
          {prediction.choices.map((choice) => {
            const atual = choice.id === escolha
            return (
              <button
                key={choice.id}
                id={`${id}-${choice.id}`}
                type="button"
                aria-current={atual ? 'true' : undefined}
                aria-disabled={bloqueado || undefined}
                onClick={() => {
                  if (bloqueado) return
                  onEscolher(choice.id)
                }}
                className={`flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl border bg-card p-3 text-left text-base outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  atual ? 'border-primary bg-primary/10' : 'border-border'
                } ${bloqueado ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                {choice.label}
              </button>
            )
          })}
        </div>
        <p className="text-sm text-muted-foreground">
          {demonstracao
            ? 'Escolha o que você acha. Depois assista.'
            : 'Escolha o que você acha. Pode errar: a cena mostra depois.'}
        </p>
      </fieldset>
    )

  const veredito = vereditoDoPalpite(prediction, escolha)
  return (
    <LugarReservado marca="palpite">
      {!revelado ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-sm">
          <p>
            <span className="font-semibold">Seu palpite:</span> {escolhida.label}
          </p>
          {demonstracao && <p className="text-muted-foreground">Agora assista e confira.</p>}
          {trocavel && onTrocar && (
            <SceneButton tom="discreta" className="min-h-11 px-2" onClick={onTrocar}>
              Trocar meu palpite
            </SceneButton>
          )}
        </div>
      ) : (
        /* ⚠️ No PASSADO e sem mandar olhar nada: esta linha fica na tela para sempre, com o palco em
           qualquer estado. Sem fundo (a tela já tinha caixas demais): a cor mora no ícone e na palavra. */
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-sm">
          <span>
            <span className="font-semibold">Seu palpite:</span> {semPontoFinal(escolhida.label)}.
          </span>
          {veredito === 'acertou' && (
            <span className="inline-flex items-center gap-1 font-semibold text-success-foreground">
              <Check size={16} aria-hidden />
              Acertou!
            </span>
          )}
          {veredito === 'errou' && (
            <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
              <Eye size={16} aria-hidden />
              Não era isso.
            </span>
          )}
        </p>
      )}
    </LugarReservado>
  )
}

/**
 * A frase do palpite retomado NO INSTANTE em que a cena responde. Exportada porque é ela que o
 * player desenha junto do aviso da descoberta, e que a região de anúncios fala na mesma hora: a
 * tela e o leitor de tela dizem a MESMA coisa.
 *
 * ⚠️ Sem `shows` na opção errada, "Olhe a cena de novo." e nada de punição. Sem gabarito nenhum
 * (previsão de exploração livre, escrita pelo professor), só o palpite: não há o que conferir.
 */
export function fraseDoPalpite(prediction: LearningPrediction, escolha: string): string {
  const escolhida = prediction.choices.find((c) => c.id === escolha)
  if (!escolhida) return ''
  const achou = `Você achou: ${semPontoFinal(escolhida.label)}.`
  const veredito = vereditoDoPalpite(prediction, escolha)
  if (veredito === null) return achou
  if (veredito === 'acertou') return `${achou} E foi isso mesmo!`
  return `${achou} ${escolhida.shows ?? 'Olhe a cena de novo.'}`
}

/** O que a região de anúncios fala quando ela escolhe: o palpite e o que acontece agora. */
export function anuncioDaEscolha(
  prediction: LearningPrediction,
  escolha: string,
  demonstracao: boolean,
): string {
  const escolhida = prediction.choices.find((c) => c.id === escolha)
  if (!escolhida) return ''
  return `Seu palpite: ${semPontoFinal(escolhida.label)}. ${demonstracao ? 'Agora assista.' : 'A cena abriu.'}`
}

const semPontoFinal = (texto: string) => texto.trim().replace(/[.!?…]+$/, '')
