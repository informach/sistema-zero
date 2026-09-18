import type { JSX } from 'react'
import { useId, useRef, useState } from 'react'
import { COPY } from '../core/copy'
import type { PintaTaskSession } from '../core/types'
import { ChevronDown } from './ui/icons'

export function TaskBriefPanel({
  session,
  outputMissing = false,
  onRecreate,
  onRelink,
  onReturn,
}: {
  session: PintaTaskSession
  outputMissing?: boolean
  onRecreate?: () => void
  onRelink?: () => void
  /**
   * "Voltar ao plano": GUARDA o desenho e navega. Ausente = o botão não aparece
   * (Pinta solto, aula, playground). Rejeitar = não navegou, e o recado aparece
   * no painel.
   */
  onReturn?: () => void | Promise<void>
}): JSX.Element {
  const [updating, setUpdating] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [returning, setReturning] = useState(false)
  // A trava é um REF, não o estado: dois cliques no mesmo turno leem o `returning`
  // do fecho anterior, e aí a criança guardaria e navegaria duas vezes.
  const returningRef = useRef(false)
  const toggle = async (kind: 'step' | 'criterion', id: string, checked: boolean) => {
    if (updating || session.progress.status === 'completed') return
    setUpdating(true)
    const current =
      kind === 'step' ? session.progress.completedStepIds : session.progress.completedCriteriaIds
    const next = checked ? [...new Set([...current, id])] : current.filter((value) => value !== id)
    try {
      setSyncError(null)
      await session.onProgress(
        kind === 'step' ? { completedStepIds: next } : { completedCriteriaIds: next },
      )
    } catch {
      setSyncError('Não consegui salvar agora. Confira a internet e tente de novo.')
    } finally {
      setUpdating(false)
    }
  }
  const complete = async () => {
    setUpdating(true)
    setSyncError(null)
    try {
      await session.onProgress({ status: 'completed' })
    } catch {
      setSyncError('Não consegui concluir agora. Confira a internet e tente de novo.')
    } finally {
      setUpdating(false)
    }
  }
  /**
   * ⚠️ Sem `finally`: no caminho de SUCESSO o botão NÃO é reabilitado. O `router.push`
   * do host volta na hora e a rota `/pensa` ainda vai carregar, então devolver o botão
   * ao normal diria "não aconteceu nada" justamente enquanto a navegação acontece. Quem
   * navegou não volta para esta tela; quem falhou, sim (e o `catch` destrava).
   */
  const returnToPlan = async () => {
    if (!onReturn || returningRef.current) return
    returningRef.current = true
    setReturning(true)
    setSyncError(null)
    try {
      await onReturn()
    } catch (error) {
      // ⚠️⚠️ A mensagem do erro NÃO vai para a tela. No caso comum ela é
      // `COPY.editor.saveError` ("Não consegui salvar"), o rótulo do SELO da barra, e
      // quando quem falha é o host ela é a mensagem crua dele. Nenhuma das duas é frase
      // de criança. Quem a criança lê é sempre a frase desta tela; a técnica fica no
      // console, para o suporte.
      console.error('[pinta] "Voltar ao plano" falhou', error)
      setSyncError(COPY.task.backError)
      // ⚠️ O botão volta a funcionar SÓ aqui: quem falhou continua nesta tela e precisa
      // tentar de novo. No sucesso ele fica travado (ver o `returnToPlan`).
      returningRef.current = false
      setReturning(false)
    }
  }
  const requiredDone =
    session.guide.steps
      .filter((item) => item.required)
      .every((item) => session.progress.completedStepIds.includes(item.id)) &&
    session.guide.criteria
      .filter((item) => item.required)
      .every((item) => session.progress.completedCriteriaIds.includes(item.id))
  // ⚠ O host manda o `collapsed` quando LEMBRA (uma chave por criança, valendo para as três
  // oficinas). Sem o par, o painel recolhe por conta própria e esquece ao sair: é o caso do
  // playground, da aula e dos testes, que não têm perfil para lembrar de nada.
  const [recolhidoLocal, setRecolhidoLocal] = useState(false)
  const recolhido = session.collapsed ?? recolhidoLocal
  const corpoId = useId()
  function trocarRecolhido(): void {
    const proximo = !recolhido
    setRecolhidoLocal(proximo)
    session.onCollapsedChange?.(proximo)
  }
  const outputReady =
    !!session.progress.outputRef &&
    !outputMissing &&
    (!session.brief.requiresStudioUse ||
      (!session.studioUseBlockedReason && !!session.progress.outputRef.usedInStudioAt))
  return (
    /*
     * ⚠️⚠️ O quadro é um `<div>` e o `<details>` mora DENTRO dele, não o contrário: o
     * "Voltar ao plano" e o recado de falha precisam ficar FORA da parte que recolhe e
     * FORA do corpo que rola. Medido em 375x812 antes do conserto: o corpo mostrava
     * 208px de 364px (`max-h-52 overflow-auto`), o botão nascia em y=342 com o painel
     * cortando em y=264, e o que a criança via ali era o "Voltar" do editor, que leva à
     * galeria. Pior: o `<details>` é o MESMO nó do DOM na galeria e no editor, então
     * recolhido ele atravessava a troca de tela e escondia o ÚNICO caminho de volta.
     */
    <div className="mx-2 mt-2 mb-2 shrink-0 rounded-2xl border-2 border-pin-accent/40 bg-pin-surface px-3 py-2">
      {/*
       * ⭐ A seta que recolhe (18/09/2026). Era um `<details open>`: recolhia, mas o
       * triângulo do navegador é discreto demais para uma criança achar, e o estado morria
       * ao sair. Agora é botão de verdade (44px, `aria-expanded`/`aria-controls`) e quem
       * LEMBRA é o host, por criança — sem o par no contrato ele recolhe sozinho e esquece.
       */}
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl text-left text-sm font-black text-pin-text transition hover:bg-pin-border/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pin-accent"
        aria-expanded={!recolhido}
        // ⚠ Recolhido o corpo DESMONTA: apontar para um id que não existe é referência
        // pendurada para o leitor de tela. Mesma régua do `Panel` do pacote.
        aria-controls={recolhido ? undefined : corpoId}
        onClick={trocarRecolhido}
      >
        <span className="min-w-0 truncate">Brief do meu jogo · {session.title}</span>
        <ChevronDown
          aria-hidden="true"
          className={`size-5 shrink-0 transition-transform ${recolhido ? '' : 'rotate-180'}`}
        />
      </button>
      {recolhido ? null : (
        <div
          id={corpoId}
          className="mt-2 grid max-h-52 gap-3 overflow-auto text-sm md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]"
        >
          <div>
            <p className="font-bold text-pin-text">Como deve parecer</p>
            <p className="text-pin-muted">{session.brief.appearance}</p>
            <p className="mt-1 text-pin-muted">
              <b>Uso:</b> {session.brief.usage}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {session.brief.palette.map((color) => (
                <span
                  key={`${color.role}-${color.color}`}
                  className="inline-flex items-center gap-1 rounded-full bg-pin-bg px-2 py-1 text-xs"
                  title={color.role}
                >
                  <i className="size-3 rounded-full" style={{ background: color.color }} />
                  {color.role}
                </span>
              ))}
            </div>
          </div>
          <div className="grid content-start gap-1">
            {session.guide.steps.map((item) => (
              <label key={item.id} className="flex min-h-11 items-start gap-2 py-1">
                <input
                  type="checkbox"
                  name={`task-step-${item.id}`}
                  className="mt-1"
                  disabled={updating || session.progress.status === 'completed'}
                  checked={session.progress.completedStepIds.includes(item.id)}
                  onChange={(event) => void toggle('step', item.id, event.target.checked)}
                />
                <span>
                  {item.text}
                  {item.hint ? <small className="block text-pin-muted">{item.hint}</small> : null}
                </span>
              </label>
            ))}
            {session.guide.criteria.map((item) => (
              <label key={item.id} className="flex min-h-11 items-start gap-2 py-1 font-bold">
                <input
                  type="checkbox"
                  name={`task-criterion-${item.id}`}
                  className="mt-1"
                  disabled={updating || session.progress.status === 'completed'}
                  checked={session.progress.completedCriteriaIds.includes(item.id)}
                  onChange={(event) => void toggle('criterion', item.id, event.target.checked)}
                />
                <span>Pronto quando: {item.text}</span>
              </label>
            ))}
          </div>
          <div className="flex min-w-40 flex-col justify-center gap-2">
            <span className="rounded-full bg-pin-bg px-3 py-1 text-center text-xs font-bold">
              {session.progress.status === 'planned'
                ? 'Planejada'
                : session.progress.status === 'in_progress'
                  ? 'Em andamento'
                  : 'Concluída ✓'}
            </span>
            {session.progress.status !== 'completed' ? (
              <button
                type="button"
                // O anel de 2px do acento, o mesmo que o resto do Pinta usa (`pinta.css`
                // e os diálogos): sem ele estes dois eram os únicos com o anel PADRÃO do
                // navegador, de 1px e sem respiro.
                className="min-h-11 rounded-xl bg-pin-accent px-3 font-black text-pin-accent-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pin-accent disabled:opacity-50"
                disabled={updating || !requiredDone || !outputReady}
                onClick={() => void complete()}
              >
                Concluir tarefa
              </button>
            ) : null}
            {!session.progress.outputRef ? (
              <small className="text-center text-pin-muted">
                Crie ou vincule um desenho neste aparelho.
              </small>
            ) : null}
            {session.studioUseBlockedReason ? (
              <small className="text-center font-bold text-pin-danger">
                {session.studioUseBlockedReason}
              </small>
            ) : null}
            {!session.studioUseBlockedReason &&
            session.brief.requiresStudioUse &&
            !session.progress.outputRef?.usedInStudioAt ? (
              <small className="text-center text-pin-muted">
                Use “Usar no Estúdio” para liberar a conclusão.
              </small>
            ) : null}
          </div>
        </div>
      )}
      {/*
       * O pé SEMPRE visível. Fica aqui, e não dentro do `<summary>`, porque controle
       * interativo dentro de um resumo é semântica errada (o clique abriria e fecharia o
       * brief). A ordem de leitura e o Tab seguem o texto: resumo, brief, saída.
       *
       * O recado de falha desceu junto com o botão, e não é só o da volta: recolher o
       * brief também escondia o recado de uma marcação que não subiu.
       *
       * ⚠⚠ **E o aviso do desenho AUSENTE desceu junto (18/09/2026).** Ele morava com os dois
       * botões que o resolvem, dentro do brief, e isso era tolerável enquanto o `<details>`
       * nascia aberto toda vez. Com a seta que LEMBRA, deixou de ser: a criança que recolheu
       * uma vez abriria a tarefa noutro aparelho, sem o desenho vinculado, e veria só o título
       * — o aviso e os ÚNICOS dois caminhos de recuperação (recriar, vincular) invisíveis, sem
       * nada dizendo que existem. Recolher esconde o brief, nunca um problema.
       */}
      {onReturn || syncError || outputMissing ? (
        <div className="mt-2 grid gap-1 border-t border-pin-border pt-2">
          {outputMissing ? (
            <div
              className="grid gap-2 rounded-xl border border-pin-danger/40 bg-pin-bg p-2"
              role="alert"
            >
              <small className="text-center font-bold text-pin-danger">
                Este desenho não está neste aparelho.
              </small>
              <button
                type="button"
                className="min-h-11 rounded-lg border border-pin-accent font-bold"
                onClick={onRecreate}
              >
                Recriar com este brief
              </button>
              <button
                type="button"
                className="min-h-11 rounded-lg border border-pin-border font-bold"
                onClick={onRelink}
              >
                Vincular outro desenho
              </button>
              <small className="text-center text-pin-muted">
                Para vincular, abra um desenho da galeria e salve-o.
              </small>
            </div>
          ) : null}
          {onReturn ? (
            <>
              {/* Fica na tela INCLUSIVE com a tarefa concluída: terminar o desenho é
                  justamente quando ela quer voltar ao plano. Sem `aria-label` e sem
                  `title`: o nome acessível é o texto visível. */}
              <button
                type="button"
                className="min-h-11 w-full rounded-lg border border-pin-accent px-4 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pin-accent disabled:opacity-50 md:w-auto md:justify-self-end"
                disabled={returning}
                aria-busy={returning}
                onClick={() => void returnToPlan()}
              >
                {COPY.task.back}
              </button>
              {/*
               * ⚠️ A região viva monta VAZIA e fica montada: um `role="status"` que nasce
               * junto com o texto costuma não ser anunciado. Enquanto guardava, o único
               * sinal era o botão a 50% de opacidade (o rótulo caindo para 3,33:1) mais um
               * `aria-busy` num botão `disabled`, que quase nada anuncia. É o mesmo recurso
               * do gêmeo do Molda. A linha em branco de 16px é deliberada: nada se mexe
               * debaixo do dedo quando o recado chega.
               */}
              <p className="min-h-4 text-xs font-bold text-pin-muted md:text-right" role="status">
                {returning ? COPY.task.backBusy : ''}
              </p>
            </>
          ) : null}
          {/* 14px: o recado saía em 11,2px (um `<small>` dentro do `text-sm` do corpo) e o
              piso da casa para criança é 12px. É a única coisa na tela dizendo a uma
              criança de 8 anos que o desenho dela não foi guardado. */}
          {syncError ? (
            <p className="text-sm font-bold text-pin-danger md:text-right" role="alert">
              {syncError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
