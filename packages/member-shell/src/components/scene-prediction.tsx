'use client'

import type { LearningPrediction } from '@sistemazero/core/learning'
import { falaDaEscolhaDoPalpite, falaDoContextoDoPalpite } from '@sistemazero/core/learning/scene'
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
  onTrocar,
  trocavel,
  revelado,
}: {
  prediction: LearningPrediction
  escolha: string
  /** A troca volta a atividade inteira ao momento anterior à descoberta. */
  onTrocar?: () => void
  /** Ainda dá para trocar: nenhum gesto na cena depois do palpite. */
  trocavel: boolean
  /** A meta que responde o palpite caiu (ou, sem `revealOn`, a cena concluiu). */
  revelado: boolean
}) {
  const escolhida = prediction.choices.find((c) => c.id === escolha)

  // ⚠️⚠️ O ramo PENDENTE saiu daqui em 18/09/2026: as peças dele (o balão do contexto, o do
  // enunciado e as opções) passaram a ser montadas pelo `scene-activity` DENTRO do console, na
  // ordem que ela aprovou — contexto → mundo → pergunta → opções. Ver `PalpiteContexto`,
  // `PalpitePergunta` e `PalpiteOpcoes` no fim deste arquivo. Este componente ficou com o que
  // vem DEPOIS da escolha: a linha congelada e a revelação.
  if (!escolhida) return null

  const veredito = vereditoDoPalpite(prediction, escolha)
  return (
    <LugarReservado marca="palpite">
      {!revelado ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-sm">
          <p>
            <span className="font-semibold">Seu palpite:</span> {escolhida.label}
          </p>
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
export function anuncioDaEscolha(prediction: LearningPrediction, escolha: string): string {
  const escolhida = prediction.choices.find((c) => c.id === escolha)
  if (!escolhida) return ''
  return `Seu palpite: ${semPontoFinal(escolhida.label)}. A cena abriu.`
}

const semPontoFinal = (texto: string) => texto.trim().replace(/[.!?…]+$/, '')

/**
 * As três peças do palpite PENDENTE, montadas pelo console.
 *
 * ⚠️⚠️ A cena fica NO MEIO delas, e isso é proposital: o contexto vem antes ("vamos usar os
 * números x e y…"), aí a criança OLHA o retrato da cena, e só então vem a pergunta, logo acima
 * das opções. Juntar os dois balões num só faria ela responder antes de olhar — foi o primeiro
 * desenho da maquete, e ela reparou na hora.
 */
export function PalpiteContexto({
  prediction,
  renderDialogue,
  dialogueRef,
}: {
  prediction: LearningPrediction
  renderDialogue: (text: string, speech: DialogueSpeech) => ReactNode
  dialogueRef: RefObject<HTMLDivElement | null>
}) {
  return (
    <div ref={dialogueRef} tabIndex={-1} className="outline-none">
      {renderDialogue(prediction.context.explanation, {
        texts: [falaDoContextoDoPalpite('Seu palpite', prediction.context)],
        fallbackToBrowser: true,
      })}
    </div>
  )
}

export function PalpitePergunta({
  prediction,
  renderDialogue,
}: {
  prediction: LearningPrediction
  renderDialogue: (text: string, speech: DialogueSpeech) => ReactNode
}) {
  return (
    <>
      {renderDialogue(prediction.prompt, {
        texts: [falaDaEscolhaDoPalpite(prediction)],
        fallbackToBrowser: true,
      })}
    </>
  )
}

/**
 * ⚠️⚠️ As opções são BOTÕES, nunca rádios: num grupo de rádios a SETA escolhia, congelava o
 * palpite e mandava uma tentativa por seta. O enunciado vai no `legend` em `sr-only`, porque quem
 * o mostra à vista é o balão do Zappy logo acima.
 */
export function PalpiteOpcoes({
  prediction,
  escolha,
  bloqueado,
  onEscolher,
}: {
  prediction: LearningPrediction
  escolha: string
  bloqueado: boolean
  onEscolher: (id: string) => void
}) {
  const id = useId()
  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">{prediction.prompt}</legend>
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
        Escolha o que você acha. Pode errar: a cena mostra depois.
      </p>
    </fieldset>
  )
}
