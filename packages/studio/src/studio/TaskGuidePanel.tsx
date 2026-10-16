import { pensaCodeTransitionInstructions } from '@sistemazero/core/pensa'
import { PensaInstructions } from '@sistemazero/ui/pensa-instructions'
import type { JSX } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { IconChevronDown } from '../ui-internal/icons'
import { useStudioTutor } from './tutor'
import type { StudioTaskSession } from './types'

/** Os genéricos são de FALHA DE REDE: só valem quando o erro não traz a frase da criança. */
const GENERICO_CONCLUIR = 'Não consegui concluir agora. Confira a internet e tente de novo.'
const GENERICO_PROXIMA = 'Não consegui abrir a próxima missão. Confira a internet e tente de novo.'
const GENERICO_AJUDA = 'Não consegui abrir a ajuda agora. Confira a internet e tente de novo.'
const AVISO_GUARDANDO = 'Guardando seu jogo na conta…'
const AVISO_PROXIMA = 'Abrindo a próxima missão…'
const AVISO_CONCLUIDA = 'Missão concluída!'

/**
 * A frase que a criança lê quando um callback do guia rejeita (14/10/2026). Antes TODA falha
 * virava "Confira a internet": dependência que falta, plano que mudou e "espere o jogo ficar
 * guardado" recebiam a mesma frase falsa. A convenção (ver `StudioTaskSession`) é o host mandar
 * `childMessage` quando a frase é para ela; sem ela, é rede, e vale o genérico. A `message`
 * crua nunca vai à tela — ela pode ser técnica.
 */
function fraseDoErro(error: unknown, generico: string): string {
  const frase = (error as { childMessage?: unknown } | null | undefined)?.childMessage
  return typeof frase === 'string' && frase.trim() ? frase : generico
}

export function TaskGuidePanel({ session }: { session: StudioTaskSession }): JSX.Element {
  const tutor = useStudioTutor()
  const [updating, setUpdating] = useState(false)
  const v2 = session.guide.contractVersion === 2
  const LegacyStepsContainer = session.codeTransition ? 'details' : 'div'
  // A região viva do guia v2 (montada VAZIA: uma que nasce com o texto não é anunciada). Diz o
  // que está acontecendo durante a espera da nuvem, que pode levar até 15 s.
  const [aviso, setAviso] = useState('')
  // ⚠️ O foco não pode cair no `body` quando o "Experimentei e funcionou" some: ele vai ao
  // "Continuar" (quando existe) ou ao próprio aviso, que é o alvo estável (`tabIndex=-1`).
  const [focoPendente, setFocoPendente] = useState(false)
  const avisoRef = useRef<HTMLParagraphElement | null>(null)
  const continuarRef = useRef<HTMLButtonElement | null>(null)
  const concluida = session.progress.status === 'completed'
  useEffect(() => {
    if (!focoPendente || !concluida) return
    setFocoPendente(false)
    const ativo = document.activeElement
    // A criança já foi para outro lugar (o canvas, outro botão)? Não roubamos o foco dela.
    if (ativo && ativo !== document.body && ativo.isConnected) return
    const alvo = continuarRef.current ?? avisoRef.current
    alvo?.focus()
  }, [focoPendente, concluida])
  // ⚠ O host manda o `collapsed` quando LEMBRA (uma chave por criança, valendo para as três
  // oficinas). Sem o par, o guia recolhe por conta própria e esquece ao sair: é o caso do
  // playground, do bloco de aula e do admin, que não têm perfil para lembrar de nada.
  const [recolhidoLocal, setRecolhidoLocal] = useState(false)
  const recolhido = session.collapsed ?? recolhidoLocal
  const corpoId = useId()
  function trocarRecolhido(): void {
    const proximo = !recolhido
    setRecolhidoLocal(proximo)
    session.onCollapsedChange?.(proximo)
  }
  const [syncError, setSyncError] = useState<string | null>(null)
  const change = async (kind: 'step' | 'criterion', id: string, checked: boolean) => {
    if (updating || session.progress.status === 'completed') return
    setUpdating(true)
    const values =
      kind === 'step' ? session.progress.completedStepIds : session.progress.completedCriteriaIds
    const next = checked ? [...new Set([...values, id])] : values.filter((value) => value !== id)
    try {
      setSyncError(null)
      await session.onProgress(
        kind === 'step' ? { completedStepIds: next } : { completedCriteriaIds: next },
      )
    } catch (error) {
      setSyncError(
        fraseDoErro(error, 'Não consegui salvar agora. Confira a internet e tente de novo.'),
      )
    } finally {
      setUpdating(false)
    }
  }
  const complete = async () => {
    if (updating) return
    setUpdating(true)
    setSyncError(null)
    if (v2) setAviso(AVISO_GUARDANDO)
    try {
      await session.onProgress({
        status: 'completed',
        ...(v2 ? { completedCriteriaIds: session.guide.criteria.map((c) => c.id) } : {}),
      })
      if (v2) {
        setAviso(AVISO_CONCLUIDA)
        setFocoPendente(true)
      }
    } catch (error) {
      setAviso('')
      setSyncError(fraseDoErro(error, GENERICO_CONCLUIR))
    } finally {
      setUpdating(false)
    }
  }
  const ready =
    !!session.progress.outputRef &&
    session.guide.steps
      .filter((item) => item.required)
      .every((item) => session.progress.completedStepIds.includes(item.id)) &&
    session.guide.criteria
      .filter((item) => item.required)
      .every((item) => session.progress.completedCriteriaIds.includes(item.id))
  return (
    /*
     * ⚠ A margem de baixo (`mb-2`) só vale ABAIXO de `lg`: até ali o guia é a faixa do topo e
     * encostava no editor (só uma borda entre os dois, que é o "grudado" que ela relatou). A
     * partir de `lg` ele vira coluna lateral e quem separa é a borda da direita.
     * ⚠ O teto de altura e a rolagem só existem ABERTO: recolhido, o guia é uma linha só.
     */
    <aside
      className={`sz-tool-guide sz-tool-guide--aside mb-2 shrink-0 lg:mb-0 ${
        recolhido
          ? // ⚠ Recolhido, a coluna ENCOLHE até o conteúdo (18/09/2026, achado do full review).
            // Com o `lg:w-80` fixo na base, a partir de `lg` o guia é coluna lateral e recolher
            // devolvia altura nenhuma e largura nenhuma: 320px de título e vazio, com a seta
            // parecendo inerte justo onde a largura é cara. O teto mantém o pior caso igual ao
            // de antes: título longo continua em 320px, título curto devolve o resto.
            'lg:w-auto lg:max-w-80'
          : 'lg:w-80'
      }`}
      aria-label="Guia da tarefa"
    >
      <div className="sz-tool-guide__head">
        {/*
         * ⭐ A seta que recolhe (18/09/2026): o guia do Estúdio era o único dos três que NÃO
         * recolhia, e ele come um quarto da altura da tela no celular. Botão DENTRO do título
         * (o padrão de disclosure com cabeçalho), alvo de 44px, `aria-expanded`/`aria-controls`.
         */}
        <h2 className="min-w-0 flex-1 font-bold text-base">
          <button
            type="button"
            className="flex min-h-11 w-full items-center gap-2 text-left"
            aria-expanded={!recolhido}
            // ⚠ Recolhido o corpo DESMONTA: apontar para um id que não existe é referência
            // pendurada para o leitor de tela. Mesma régua do `Panel` do pacote.
            aria-controls={recolhido ? undefined : corpoId}
            onClick={trocarRecolhido}
          >
            <IconChevronDown
              aria-hidden="true"
              className={`size-5 shrink-0 transition-transform ${recolhido ? '' : 'rotate-180'}`}
            />
            <span className="min-w-0">
              {/* ⚠ `aria-hidden` no sobretítulo: o `<aside>` em volta já se chama "Guia da
                  tarefa", e sem isto o leitor anunciaria duas vezes uma coisa que é a mesma
                  ("Guia da tarefa, complementar" e logo depois o sobretítulo). O nome do botão
                  é a TAREFA. O texto dele virou "Guia do Pensa" em 19/09/2026, igual ao dos
                  irmãos do Pinta e do Molda — para a criança, o que importa é de onde veio. */}
              {/* ⚠ Recolhido o sobretítulo SAI: ela pediu "só uma linha, o título e a
                  setinha". Aberto ele volta, e aqui ele é o que diz que aquela coluna é o
                  Cartão de Criação que ela montou no Pensa. */}
              {recolhido ? null : (
                <span aria-hidden="true" className="sz-tool-guide__kicker">
                  Guia do Pensa
                </span>
              )}
              <span className="sz-tool-guide__title">{session.title}</span>
            </span>
          </button>
        </h2>
        <span className="sz-tool-guide__state">
          {session.progress.status === 'planned'
            ? 'Planejada'
            : session.progress.status === 'in_progress'
              ? 'Em andamento'
              : 'Concluída'}
        </span>
      </div>
      {recolhido ? null : (
        /* ⚠️⚠️ Quem rola é o CORPO, nunca o cartão (achado do full review de 19/09/2026). Com o
           `max-h-64 overflow-auto` no `<aside>`, a seta e o recado de falha — que é o último
           filho — ficavam DENTRO da área rolável: o recado nascia abaixo da dobra do painel
           justo quando a criança marca um passo. É também o que os irmãos do Pinta e do Molda
           sempre fizeram (`max-h-52`/`max-h-80` no corpo). */
        <div id={corpoId} className="sz-tool-guide__body max-h-64 overflow-auto lg:max-h-none">
          {session.summary ? (
            <p className="mt-1 mb-3 text-sz-fg-soft text-xs">{session.summary}</p>
          ) : (
            <div className="mb-3" />
          )}
          <div className="grid gap-2 text-sm">
            {session.codeTransition ? (
              <>
                <p>
                  Este jogo passou para o modo Pro. Continue pelo código, mantendo o objetivo e o
                  teste desta missão.
                </p>
                <PensaInstructions
                  key={`${session.taskId}-code`}
                  steps={pensaCodeTransitionInstructions()}
                />
              </>
            ) : null}
            {session.guide.contractVersion === 2 ? (
              session.codeTransition ? null : (
                <PensaInstructions
                  key={session.taskId}
                  steps={session.guide.steps}
                  renderListen={session.renderListen}
                />
              )
            ) : (
              <LegacyStepsContainer>
                {session.codeTransition && (
                  <>
                    <summary>Conferir passos do plano original em blocos</summary>
                    <p>Marque cada uma só depois de verificar o resultado equivalente no código.</p>
                  </>
                )}
                {session.guide.steps.map((item) => (
                  <label
                    key={item.id}
                    className="flex min-h-9 items-start gap-2 rounded-lg bg-sz-bg p-2"
                  >
                    <input
                      type="checkbox"
                      name={`task-step-${item.id}`}
                      className="mt-1"
                      disabled={updating || session.progress.status === 'completed'}
                      checked={session.progress.completedStepIds.includes(item.id)}
                      onChange={(event) => void change('step', item.id, event.target.checked)}
                    />
                    <span>
                      {item.text}
                      {item.hint ? (
                        <small className="block text-sz-fg-soft">{item.hint}</small>
                      ) : null}
                    </span>
                  </label>
                ))}
              </LegacyStepsContainer>
            )}
          </div>
          {session.blocks.length ? (
            <div className="my-3">
              <p className="mb-1 text-xs font-bold">Blocos úteis</p>
              <div className="flex flex-wrap gap-1">
                {session.blocks.map((block) => (
                  <code
                    key={block.id}
                    className="rounded-md bg-sz-accent/10 px-2 py-1 text-[11px] text-sz-accent"
                    title={`${block.category} › ${block.subcategory}`}
                  >
                    {block.label}
                  </code>
                ))}
              </div>
            </div>
          ) : null}
          <div className="grid gap-2 border-sz-border border-t pt-3 text-sm">
            {session.guide.contractVersion === 2
              ? session.guide.criteria.map((item) => (
                  <p key={item.id}>
                    <strong>Experimente: </strong>
                    {item.text}
                    <br />
                    {item.hint}
                  </p>
                ))
              : session.guide.criteria.map((item) => (
                  <label key={item.id} className="flex min-h-9 items-start gap-2 font-semibold">
                    <input
                      type="checkbox"
                      name={`task-criterion-${item.id}`}
                      className="mt-1"
                      disabled={updating || session.progress.status === 'completed'}
                      checked={session.progress.completedCriteriaIds.includes(item.id)}
                      onChange={(event) => void change('criterion', item.id, event.target.checked)}
                    />
                    <span>Pronto quando: {item.text}</span>
                  </label>
                ))}
          </div>
          {session.progress.status !== 'completed' ? (
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--primary mt-3 w-full"
              // ⚠️ Esperando a nuvem (até 15 s) o botão fica `aria-disabled`, não `disabled`:
              // desligar o botão focado manda o foco para o `body` no meio da espera.
              disabled={v2 ? !session.progress.outputRef : updating || !ready}
              aria-disabled={v2 && updating ? true : undefined}
              aria-busy={v2 && updating ? true : undefined}
              onClick={() => void complete()}
            >
              {v2 ? 'Experimentei e funcionou' : 'Concluir tarefa'}
            </button>
          ) : null}
          {v2 && concluida && session.onNextMission ? (
            <button
              ref={continuarRef}
              type="button"
              className="sz-tool-pill sz-tool-pill--primary mt-3"
              aria-disabled={updating ? true : undefined}
              aria-busy={updating ? true : undefined}
              onClick={() => {
                const abrir = session.onNextMission
                if (updating || !abrir) return
                setUpdating(true)
                setSyncError(null)
                setAviso(AVISO_PROXIMA)
                void abrir()
                  .catch((error: unknown) => {
                    setAviso('')
                    setSyncError(fraseDoErro(error, GENERICO_PROXIMA))
                  })
                  .finally(() => setUpdating(false))
              }}
            >
              {session.nextMissionLabel ?? 'Continuar meu caminho'}
            </button>
          ) : null}
          {v2 && session.onNeedHelp ? (
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--outline mt-3"
              disabled={updating}
              onClick={() => {
                if (tutor.config) {
                  tutor.setOpen(true)
                  return
                }
                setUpdating(true)
                setSyncError(null)
                void Promise.resolve()
                  .then(() => session.onNeedHelp?.())
                  .catch((error: unknown) => setSyncError(fraseDoErro(error, GENERICO_AJUDA)))
                  .finally(() => setUpdating(false))
              }}
            >
              Travei aqui
            </button>
          ) : null}
        </div>
      )}
      {/*
       * ⚠⚠ O recado de falha fica FORA do que recolhe. É a mesma lição que o irmão do Pinta
       * pagou com o "Voltar ao plano": com o guia recolhido, a marcação que não subiu ficaria
       * invisível e a criança acharia que guardou. Desde 19/09/2026 essa é a regra dos TRÊS
       * guias, e o recado é a única coisa que sobrevive ao recolher: o pé de ROTINA (a volta ao
       * plano dos irmãos) recolhe junto, porque ela pediu uma linha só. Recolher esconde
       * conteúdo e ação de rotina, NUNCA um problema.
       */}
      {syncError ? (
        <p className="sz-tool-guide__alert text-xs font-bold" role="alert">
          {syncError}
        </p>
      ) : null}
      {/*
       * O aviso do guia v2 (14/10/2026): fora do que recolhe, para o "Guardando…" seguir à vista
       * com o guia recolhido. Monta VAZIO e sem respiro (`empty:p-0`), e é o alvo estável do
       * foco depois de concluir quando não há "Continuar".
       */}
      {v2 ? (
        <p
          ref={avisoRef}
          role="status"
          tabIndex={-1}
          className="px-[1.125rem] pb-3 font-bold text-xs empty:p-0"
        >
          {aviso}
        </p>
      ) : null}
    </aside>
  )
}
