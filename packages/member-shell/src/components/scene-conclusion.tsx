'use client'

import { PERGUNTA_MUDOU, type PublicInteractiveBlock } from '@sistemazero/core/learning'
import { Check, ChevronDown, RotateCcw } from 'lucide-react'
import { type Ref, useEffect, useId, useRef } from 'react'
import { SceneButton } from './exploration-stage'

/**
 * O PASSADO e o DEPOIS da experimentação: a faixa da revisita e o que aparece quando ela descobre.
 *
 * ⭐⭐ Lote 2 do Raio-X (16/09/2026). A tela contava a atividade em três relógios que não
 * conversavam: o palco mostra o presente, o cartão "Você concluiu a investigação" mostrava o
 * passado (um latch), e a pergunta pedia a regra ao mesmo tempo que o cartão a enunciava. Os
 * prints da dona eram isso: "Você concluiu" sobre um palco vazio depois de "Ver de novo" + F5.
 * A saída foi dar a cada tempo o SEU lugar, em vez de remendar a frase (o `revendo`/`recomeçou`,
 * que adivinhava o estado do palco pelo último gesto e morria no primeiro toque, saiu inteiro).
 */

/**
 * ⚠️⚠️ A faixa da REVISITA fala DELA, nunca do palco: "Você já descobriu isto." é verdade com o
 * palco vazio, pela metade ou montado, e é por isso que ela sobrevive ao "Recomeçar" e ao F5.
 *
 * ⚠️ A explicação guardada VOLTA (fechada): o F5 dizia "Esta pergunta já está resolvida" e o porquê
 * sumia para sempre, mas ele estava no navegador (`saved.result.feedback` é a explicação quando o
 * servidor corrigiu a pergunta). Bloco concluído antes de a pergunta existir não tem explicação a
 * mostrar, e aí fica só a regra da cena.
 */
export function SceneRevisitBanner({
  regra,
  explicacao,
}: {
  /** A frase de sucesso da cena, vestida pelo elenco. */
  regra: string
  /** A explicação do professor, quando foi o servidor que corrigiu a pergunta. */
  explicacao?: string
}) {
  return (
    <div className="rounded-2xl bg-success/10 px-4 py-3 text-success-foreground">
      <p className="flex items-center gap-2 font-semibold">
        <Check size={18} aria-hidden />
        Você já descobriu isto.
      </p>
      <details className="group mt-1 text-foreground">
        {/* ⚠️ Com `inline-flex` o `summary` perde o triângulo nativo e vira um texto verde parado
            (review do lote 2): a seta que gira diz que aquilo abre. */}
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 text-sm font-semibold text-success-foreground [&::-webkit-details-marker]:hidden">
          <ChevronDown
            size={16}
            aria-hidden
            className="transition-transform group-open:rotate-180 motion-reduce:transition-none"
          />
          Ver a explicação
        </summary>
        <p className="mt-1 text-sm leading-relaxed">{regra}</p>
        {explicacao && explicacao !== regra ? (
          <p className="mt-2 text-sm leading-relaxed">{explicacao}</p>
        ) : null}
      </details>
    </div>
  )
}

type Pergunta = NonNullable<PublicInteractiveBlock['checkpoint']>

/**
 * Por quanto tempo depois de a pergunta APARECER um toque não conta como resposta.
 *
 * ⚠️⚠️ A conclusão chega no meio de uma série de toques ("+100" repetido na `camera`, "+" na
 * `velocity`) e a tela anda até a pergunta: o próximo toque, no MESMO ponto da tela, caía numa opção
 * e mandava uma tentativa que a criança nem leu (medido na banca, review do lote 2). Só o toque de
 * PONTEIRO espera: o teclado não tem esse problema, porque o foco já foi para a pergunta.
 */
export const TEMPO_PARA_LER_A_PERGUNTA_MS = 800

/**
 * O que aparece quando a cena FECHA por um gesto dela: "✓ Você descobriu!" e, logo embaixo, a
 * pergunta que pede a regra.
 *
 * ⚠️⚠️ A frase de SUCESSO da cena (a regra) só aparece DEPOIS de ela responder. O cartão de
 * sucesso nascia junto com a pergunta e dizia a resposta dela com quase as mesmas palavras ("existir
 * e aparecer são coisas diferentes!" em cima de "Existir e aparecer são duas coisas"): o terceiro
 * tempo do ciclo virava copiar a frase de baixo. Sem pergunta, a regra aparece na hora.
 *
 * ⚠️ Certo e errado têm ÍCONE, COR e PALAVRA, não só texto numa caixa cinza igual: criança que lê
 * devagar não sabia se tinha acertado.
 */
export function SceneConclusion({
  pergunta,
  regra,
  resposta,
  certa,
  feedback,
  aguardaCena,
  bloqueada,
  onResponder,
  faixaRef,
  perguntaRef,
}: {
  pergunta?: Pergunta
  regra: string
  resposta: string
  /** `null` enquanto ela não respondeu (ou a resposta ainda não voltou do servidor). */
  certa: boolean | null
  feedback: string
  /**
   * A resposta NÃO foi corrigida porque a cena saiu do estado descoberto (`layers` e `jump-sound`
   * pedem a montagem assentada). Não é resposta errada, e pintar de âmbar ali mentia.
   */
  aguardaCena: boolean
  bloqueada: boolean
  onResponder: (id: string) => void
  faixaRef: Ref<HTMLParagraphElement>
  perguntaRef: Ref<HTMLLegendElement>
}) {
  const id = useId()
  const abertaEm = useRef(0)
  useEffect(() => {
    abertaEm.current = performance.now()
  }, [])
  const mudou = certa === false && feedback === PERGUNTA_MUDOU
  return (
    <section className="space-y-3 rounded-2xl bg-primary/5 p-4" aria-labelledby={`${id}-faixa`}>
      {/* `tabIndex={-1}`: é para onde o foco vai quando a cena fecha SEM pergunta. ⚠️ O anel com o
          mesmo respiro da pergunta (T4 da onda B), sem tirar o texto do lugar. */}
      <p
        id={`${id}-faixa`}
        ref={faixaRef}
        tabIndex={-1}
        data-anel-com-respiro=""
        className="-mx-2 flex items-center gap-2 rounded-lg px-2 text-lg font-bold text-success-foreground outline-none focus:ring-2 focus:ring-primary"
      >
        <Check size={20} aria-hidden />
        Você descobriu!
      </p>
      {!pergunta ? (
        <p className="font-medium">{regra}</p>
      ) : (
        <fieldset className="space-y-2">
          {/* ⚠️⚠️ A pergunta dentro do `legend`, e o `legend` focável: é para onde o foco vai
              depois do gesto que conclui. ⚠️ Com anel VISÍVEL quando recebe o foco: quem usa o
              teclado precisa ver onde chegou (sem ele, o "Continuar" parecia não fazer nada).
              ⚠️ O anel com RESPIRO (consertos do review da onda B do lote 5, T4): sem folga ele
              passava por cima do "A" de "AGORA EXPLIQUE" e encostava embaixo da pergunta, nas 45
              cenas. O `px-2`/`py-1` afasta o anel do texto e o `-mx-2` com a largura + 1rem devolve
              o texto ao mesmo alinhamento de antes. */}
          <legend
            ref={perguntaRef}
            tabIndex={-1}
            data-anel-com-respiro=""
            className="float-left -mx-2 mb-2 w-[calc(100%+1rem)] rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-primary"
          >
            <span className="block text-sm font-bold uppercase tracking-[.14em] text-primary">
              Agora explique
            </span>
            <span className="mt-1 block text-base font-medium">{pergunta.prompt}</span>
          </legend>
          {/* ⚠️⚠️ BOTÕES, e não rádios (review do lote 2): num grupo de rádios cada SETA do teclado
              escolhe, e aqui escolher manda a resposta ao servidor. Uma seta para baixo e outra para
              cima eram DUAS tentativas no relatório do professor. ⚠️ E `aria-disabled`, nunca
              `disabled`: com a resposta certa o botão desabilitado tirava o foco de quem tinha
              acabado de responder, e o próximo Tab voltava para o topo da cena. */}
          <div className="clear-left space-y-2">
            {pergunta.choices.map((choice) => {
              const escolhida = resposta === choice.id
              return (
                <button
                  key={choice.id}
                  id={`${id}-pergunta-${choice.id}`}
                  type="button"
                  aria-current={escolhida ? 'true' : undefined}
                  aria-disabled={bloqueada || undefined}
                  onClick={(e) => {
                    if (bloqueada) return
                    if (
                      e.detail > 0 &&
                      performance.now() - abertaEm.current < TEMPO_PARA_LER_A_PERGUNTA_MS
                    )
                      return
                    onResponder(choice.id)
                  }}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-xl border bg-card p-3 text-left text-base outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    escolhida ? 'border-primary bg-primary/10 font-semibold' : 'border-border'
                  } ${bloqueada ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {choice.label}
                </button>
              )
            })}
          </div>
          {!resposta && (
            <p className="clear-left text-sm text-muted-foreground">
              Última parte: escolha a frase que explica.
            </p>
          )}
          {/* ⚠️ A região existe SEMPRE, com o texto por dentro: `aria-live` montada junto do
              conteúdo não é anunciada de forma confiável. */}
          <div role="status" aria-live="polite" className="clear-left">
            {certa === true && (
              /* ⚠️ Fundo do CARTÃO com a borda verde: o verde translúcido sobre o azul translúcido
                 da conclusão dava um cinza-azulado longe do verde da faixa (review do lote 2). */
              <div className="space-y-1 rounded-xl border-l-4 border-success bg-card p-3 text-sm leading-relaxed">
                <p className="flex items-center gap-2 font-bold text-success-foreground">
                  <Check size={18} aria-hidden />
                  Certo!
                </p>
                {feedback ? <p>{feedback}</p> : null}
                {regra && regra !== feedback ? <p className="font-medium">{regra}</p> : null}
              </div>
            )}
            {certa === false && (
              /* ⚠️ A palavra vem do SERVIDOR ("Ainda não é essa…"): o gabarito não sai de lá, e
                 repetir "Ainda não." aqui em cima faria a criança ler a mesma coisa duas vezes. */
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-500/15 p-3 text-sm font-semibold leading-relaxed text-amber-950">
                <p className="flex items-start gap-2">
                  <RotateCcw size={18} className="mt-0.5 shrink-0" aria-hidden />
                  {feedback || 'Ainda não é essa. Olhe a cena de novo e tente outra.'}
                </p>
                {/* ⚠️ A pergunta mudou enquanto a aba estava aberta: nenhuma opção desta tela
                    passa, então a saída é abrir de novo, e não "tentar outra". */}
                {mudou && (
                  <SceneButton tom="ferramenta" onClick={() => window.location.reload()}>
                    Abrir de novo
                  </SceneButton>
                )}
              </div>
            )}
            {aguardaCena && certa === null && (
              <p className="rounded-xl bg-card p-3 text-sm leading-relaxed">
                Para conferir, deixe a cena como estava quando você descobriu.
              </p>
            )}
          </div>
        </fieldset>
      )}
    </section>
  )
}
