import type { JSX } from 'react'
import { useId, useState } from 'react'
import { IconChevronDown } from '../ui-internal/icons'
import type { StudioTaskSession } from './types'

export function TaskGuidePanel({ session }: { session: StudioTaskSession }): JSX.Element {
  const [updating, setUpdating] = useState(false)
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
      className={`mb-2 shrink-0 border-sz-border border-b bg-sz-surface p-3 text-sz-fg lg:mb-0 lg:border-r lg:border-b-0 ${
        recolhido
          ? // ⚠ Recolhido, a coluna ENCOLHE até o conteúdo (18/09/2026, achado do full review).
            // Com o `lg:w-80` fixo na base, a partir de `lg` o guia é coluna lateral e recolher
            // devolvia altura nenhuma e largura nenhuma: 320px de título e vazio, com a seta
            // parecendo inerte justo onde a largura é cara. O teto mantém o pior caso igual ao
            // de antes: título longo continua em 320px, título curto devolve o resto.
            'lg:w-auto lg:max-w-80'
          : 'max-h-64 overflow-auto lg:max-h-none lg:w-80'
      }`}
      aria-label="Guia da tarefa"
    >
      <div className="flex items-start justify-between gap-2">
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
                  tarefa", e sem isto o leitor anunciava "Guia da tarefa, complementar" e logo
                  depois "Guia da tarefa <título>, botão". O nome do botão é a TAREFA. */}
              <span
                aria-hidden="true"
                className="block text-sz-accent text-xs font-bold uppercase tracking-wide"
              >
                Guia da tarefa
              </span>
              <span className="block truncate">{session.title}</span>
            </span>
          </button>
        </h2>
        <span className="mt-1 shrink-0 rounded-full bg-sz-bg px-2 py-1 text-[10px] font-bold">
          {session.progress.status === 'planned'
            ? 'Planejada'
            : session.progress.status === 'in_progress'
              ? 'Em andamento'
              : 'Concluída'}
        </span>
      </div>
      {recolhido ? null : (
        <div id={corpoId}>
          {session.summary ? (
            <p className="mt-1 mb-3 text-sz-fg-soft text-xs">{session.summary}</p>
          ) : (
            <div className="mb-3" />
          )}
          <div className="grid gap-2 text-sm">
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
                  {item.hint ? <small className="block text-sz-fg-soft">{item.hint}</small> : null}
                </span>
              </label>
            ))}
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
            {session.guide.criteria.map((item) => (
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
              className="mt-3 min-h-11 w-full rounded-lg bg-sz-accent px-3 font-bold text-white disabled:opacity-50"
              disabled={updating || !ready}
              onClick={() => void complete()}
            >
              Concluir tarefa
            </button>
          ) : null}
        </div>
      )}
      {/*
       * ⚠⚠ O recado de falha fica FORA do que recolhe. É a mesma lição que o irmão do Pinta
       * pagou com o "Voltar ao plano": com o guia recolhido, a marcação que não subiu ficaria
       * invisível e a criança acharia que guardou. Recolher esconde o brief, nunca um problema.
       */}
      {syncError ? (
        <p className="mt-2 text-xs font-bold text-sz-danger" role="alert">
          {syncError}
        </p>
      ) : null}
    </aside>
  )
}
