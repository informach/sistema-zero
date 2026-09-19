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
     * O quadro é o cartão da comunidade (`.sz-tool-guide`, receita compartilhada das quatro
     * ferramentas desde 19/09/2026) e tem três partes: o cabeçalho que recolhe, o corpo que
     * ROLA (`max-h-52 overflow-auto`) e o pé.
     *
     * ⚠️⚠️ O pé fica fora do corpo que rola, e isso não mudou: medido em 375x812, o corpo
     * mostrava 208px de 364px, o botão nascia em y=342 com o painel cortando em y=264, e o que
     * a criança via ali era o "Voltar" do editor, que leva à galeria. O que MUDOU em 19/09 é
     * que o pé recolhe junto com o corpo (ver o comentário dele, mais abaixo): é rotina, e ela
     * pediu uma linha só. Problema, não — esse fica fora dos dois.
     */
    <div className="sz-tool-guide mx-2 mt-2 mb-2 shrink-0">
      {/*
       * ⭐ A seta que recolhe (18/09/2026). Era um `<details open>`: recolhia, mas o
       * triângulo do navegador é discreto demais para uma criança achar, e o estado morria
       * ao sair. Agora é botão de verdade (44px, `aria-expanded`/`aria-controls`) e quem
       * LEMBRA é o host, por criança — sem o par no contrato ele recolhe sozinho e esquece.
       */}
      <button
        type="button"
        className="sz-tool-guide__head"
        aria-expanded={!recolhido}
        // ⚠ Recolhido o corpo DESMONTA: apontar para um id que não existe é referência
        // pendurada para o leitor de tela. Mesma régua do `Panel` do pacote.
        aria-controls={recolhido ? undefined : corpoId}
        onClick={trocarRecolhido}
      >
        {/* O sobretítulo diz de ONDE veio este painel, e é o mesmo nos três guias (19/09/2026):
            "Brief do meu jogo" não contava a história de que aquilo é o Cartão de Criação que
            ela montou no Pensa. */}
        <span className="min-w-0">
          {/* ⚠ Recolhido o sobretítulo SAI: ela pediu "só uma linha, o título e a setinha", e
              com ele o cabeçalho tem duas (63px contra 47px, medido no playground). Aberto ele
              volta, que é quando dizer de onde veio o painel ajuda. */}
          {recolhido ? null : (
            <span aria-hidden="true" className="sz-tool-guide__kicker">
              Guia do Pensa
            </span>
          )}
          <span className="sz-tool-guide__title">Brief do meu jogo · {session.title}</span>
        </span>
        {/*
         * ⚠️⚠️ A situação vive no CABEÇALHO desde 19/09/2026 (full review): ela morava no corpo,
         * que recolhe, então a criança perdia de vista se a tarefa já estava pronta justo quando
         * escolhia recolher. Aqui ela fica sempre, e é a mesma pílula dos irmãos do Estúdio e do
         * Molda. Dentro do botão de propósito: entra no nome falado ("Brief do meu jogo ·
         * Desenhar a heroína, Concluída").
         */}
        <span className="sz-tool-guide__state">
          {session.progress.status === 'planned'
            ? 'Planejada'
            : session.progress.status === 'in_progress'
              ? 'Em andamento'
              : 'Concluída'}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`size-5 shrink-0 transition-transform ${recolhido ? '' : 'rotate-180'}`}
        />
      </button>
      {recolhido ? null : (
        <div
          id={corpoId}
          className="sz-tool-guide__body grid max-h-52 gap-3 overflow-auto text-sm md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]"
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
            {session.progress.status !== 'completed' ? (
              <button
                type="button"
                // A pílula primária da comunidade (chapada: o relevo 3D é das galerias). Ela
                // já traz o alvo de `--sz-tool-hit`, o anel de foco do acento e o estado
                // desligado — antes isto era um botão só deste painel.
                className="sz-tool-pill sz-tool-pill--primary"
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
       * ⭐⭐ O que recolhe, e o que NUNCA recolhe (19/09/2026). Pedido dela: recolhido, "pode
       * fechar tudo, mantendo só uma linha ali: o título e a setinha de abrir e fechar, para a
       * gente deixar bastante espaço para as ferramentas". Então o pé de ROTINA — a volta ao
       * plano e o aviso de que está guardando — passou a viver dentro do que recolhe.
       *
       * ⚠️⚠️ Isso revoga EM PARTE o invariante de 18/09 ("o pé fica FORA do que recolhe"), que
       * nasceu porque recolher escondia a única saída. O que o substitui, e é decisão dela:
       * recolher esconde conteúdo e ação de ROTINA, NUNCA um PROBLEMA. O recado de falha e o
       * aviso do desenho ausente — com os dois botões que o resolvem — seguem FORA do que
       * recolhe, e é por isso que a criança que recolheu uma vez não fica sem caminho. A
       * rotina ela recupera com um clique na seta, que nunca sai da tela.
       */}
      {outputMissing ? (
        <div className="sz-tool-guide__alert grid gap-2" role="alert">
          <small className="text-center font-bold">Este desenho não está neste aparelho.</small>
          <button type="button" className="sz-tool-pill sz-tool-pill--outline" onClick={onRecreate}>
            Recriar com este brief
          </button>
          {/* ⚠️ `--outline`, não `--quiet`: a pílula quieta tem o fundo do APP e fio transparente
              no tema claro, e dentro do recado tingido ela media 1,04:1 — um dos dois únicos
              caminhos de recuperação perdia a cara de botão (full review de 19/09/2026). */}
          <button type="button" className="sz-tool-pill sz-tool-pill--outline" onClick={onRelink}>
            Vincular outro desenho
          </button>
          <small className="text-center opacity-80">
            Para vincular, abra um desenho da galeria e salve-o.
          </small>
        </div>
      ) : null}
      {/* 14px: o recado saía em 11,2px (um `<small>` dentro do `text-sm` do corpo) e o piso da
          casa para criança é 12px. É a única coisa na tela dizendo a uma criança de 8 anos que o
          desenho dela não foi guardado. */}
      {syncError ? (
        <p className="sz-tool-guide__alert text-sm font-bold" role="alert">
          {syncError}
        </p>
      ) : null}
      {/*
       * ⚠️⚠️ `!recolhido || syncError`: com o recado de falha na tela, o botão que REFAZ a
       * tentativa fica junto (achado do full review de 19/09/2026). A regra do lote é "o
       * problema e o que o resolve nunca recolhem", e o `syncError` da volta só se resolve por
       * este botão — sem ele a criança lia um recado vermelho sem nada para fazer. É a mesma
       * companhia que o aviso do desenho ausente tem, logo acima.
       */}
      {onReturn && (!recolhido || syncError) ? (
        <div className="sz-tool-guide__foot grid gap-1">
          {/* Fica na tela INCLUSIVE com a tarefa concluída: terminar o desenho é justamente
              quando ela quer voltar ao plano. Sem `aria-label` e sem `title`: o nome acessível
              é o texto visível. */}
          <button
            type="button"
            className="sz-tool-pill sz-tool-pill--outline w-full md:w-auto md:justify-self-end"
            disabled={returning}
            aria-busy={returning}
            onClick={() => void returnToPlan()}
          >
            {COPY.task.back}
          </button>
          {/*
           * ⚠️ A região viva monta VAZIA: um `role="status"` que nasce junto com o texto
           * costuma não ser anunciado. Enquanto guarda, o único outro sinal é o botão a 50% de
           * opacidade mais um `aria-busy` num botão `disabled`, que quase nada anuncia. A linha
           * em branco de 16px é deliberada: nada se mexe debaixo do dedo quando o recado chega.
           * ⚠️ Desde 19/09/2026 ela vive DENTRO do que recolhe, então o anúncio só existe com o
           * guia aberto — recolher no meio da navegação e reabrir traz a região já preenchida,
           * que é justamente o caso que não é anunciado. Aceito: o guia recolhido é uma linha
           * só (pedido dela), e quem recolhe no meio de um "Voltar ao plano" de 2 segundos é
           * caso de borda. O que NÃO é aceito é perder o problema, e o `syncError` acima fica.
           */}
          <p className="min-h-4 text-xs font-bold text-pin-muted md:text-right" role="status">
            {returning ? COPY.task.backBusy : ''}
          </p>
        </div>
      ) : null}
    </div>
  )
}
