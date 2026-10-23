'use client'

import { type KidsRequirement, kidsRequirementKey } from '@sistemazero/core/journey'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Check } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminHeader } from '@/components/admin/admin-header'
import { ReadOnlyNotice } from '@/components/admin/read-only-notice'
import { cn } from '@/lib/cn'
import {
  KIDS_POST_LABELS,
  KIDS_TIER_LABELS,
  KIDS_TOOL_LABELS,
  type KidsPreview,
} from '@/lib/kids-journey-editor'
import { journeyLensHref } from '@/lib/platform-transition'
import { KidsJourneyPolicyForm } from './journey-policy-form'
import { useKidsJourneyEditor } from './use-journey-editor'

/** O item "Jornada" do menu segue a lente: na lente Adultos, esta página leva à de lá. */
const ADULT_JOURNEY_PATH = '/admin/professor/jornada-adulta'

function milestone(value: 'complete' | 'showcase') {
  return value === 'complete' ? 'concluir' : 'concluir e publicar no Mural'
}
type CourseTitles = ReadonlyMap<string, string>
function requirement(value: KidsRequirement, titles: CourseTitles): React.ReactNode {
  if (value.kind !== 'course')
    return `${KIDS_TIER_LABELS[value.tier]}, posição ${value.slot}: ${milestone(value.milestone)}`
  const title = titles.get(value.courseId)
  if (title) return `${title}: ${milestone(value.milestone)}`
  // Curso fora da lista: o nome diz o que houve; o ID fica guardado para quem for procurar.
  return (
    <>
      Curso que não está na lista: {milestone(value.milestone)}
      <details className="mt-1 text-xs text-muted-foreground">
        <summary className="cursor-pointer">Detalhes técnicos</summary>
        <p className="mt-1 break-all font-mono">Curso {value.courseId}</p>
      </details>
    </>
  )
}

/**
 * Os passos da publicação, à vista (a sala da equipe, 23/10/2026). Só LÊ o estado que o editor
 * já tem: nenhum passo dispara nada sozinho, e conferir os perfis continua um clique por grupo.
 */
const PUBLISH_STEPS = [
  'Mudar no rascunho',
  'Comparar com a versão no ar',
  'Dizer o motivo',
  'Conferir os perfis',
  'Publicar',
] as const
function publishStepsDone(editor: ReturnType<typeof useKidsJourneyEditor>): boolean[] {
  const { preparation, preview } = editor
  const published = preparation?.status === 'published'
  const prepared = Boolean(preparation)
  return [
    editor.changed || prepared,
    Boolean(preview) || prepared,
    Boolean(editor.reason.trim()) || prepared,
    preparation?.status === 'ready' || published,
    published,
  ]
}
function PublishStepper({ done }: { done: boolean[] }) {
  const current = done.indexOf(false)
  return (
    <ol aria-label="Passos para publicar" className="grid gap-2 sm:grid-cols-5">
      {PUBLISH_STEPS.map((label, index) => {
        const isDone = done[index] === true
        const isCurrent = index === current
        return (
          <li
            key={label}
            aria-current={isCurrent ? 'step' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm',
              isCurrent && 'border-primary bg-primary/5 font-semibold text-foreground',
              isDone && 'text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold',
                isDone ? 'bg-success/15 text-success-foreground' : 'bg-muted',
              )}
              aria-hidden
            >
              {isDone ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span>
              {label}
              {isDone ? <span className="sr-only"> (feito)</span> : null}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function Comparison({ preview, titles }: { preview: KidsPreview; titles: CourseTitles }) {
  const mode = { active: 'Ativa', paused: 'Pausada' }
  const impact = preview.newLearner
  return (
    <Card className="space-y-4 p-5" aria-labelledby="kids-comparison-title">
      <div className="space-y-1">
        <h2 id="kids-comparison-title" className="text-lg font-semibold">
          Comparação com a versão no ar ({preview.baseVersion})
        </h2>
        <p className="text-sm">
          {mode[impact.before.mode]} → {mode[impact.after.mode]}
        </p>
        <p className="text-sm text-muted-foreground">
          Simulação de uma criança que está começando. Não é uma conta de todos os perfis: os perfis
          são conferidos no passo seguinte, e o que cada criança já ganhou continua com ela.
        </p>
      </div>
      <div className="rounded-lg border bg-muted/20 p-3 text-sm">
        <p>
          Posto na simulação: {KIDS_POST_LABELS[impact.before.earned.level]} →{' '}
          {KIDS_POST_LABELS[impact.after.earned.level]}
        </p>
        <p>
          Ferramentas na simulação:{' '}
          {impact.after.earned.capabilities.length
            ? impact.after.earned.capabilities.map((tool) => KIDS_TOOL_LABELS[tool]).join(', ')
            : 'nenhuma ferramenta global'}
        </p>
      </div>
      {!impact.changes.length && !impact.tierAccessChanges.length && (
        <p className="text-sm text-muted-foreground">
          Requisitos, ferramentas e regras de acesso sem alterações.
        </p>
      )}
      {impact.changes.map((change) => (
        <section key={change.level} className="space-y-2 border-t pt-3">
          <h3 className="text-sm font-semibold">{KIDS_POST_LABELS[change.level]}</h3>
          <ul className="space-y-1 text-sm">
            {change.requirementsAdded.map((entry) => (
              <li key={`added-${kidsRequirementKey(entry)}`}>
                Novo requisito: {requirement(entry, titles)}
              </li>
            ))}
            {change.requirementsRemoved.map((entry) => (
              <li key={`removed-${kidsRequirementKey(entry)}`}>
                Requisito retirado: {requirement(entry, titles)}
              </li>
            ))}
            {change.requirementsChanged.map((entry) => (
              <li key={`changed-${kidsRequirementKey(entry.before)}`}>
                Mudou o que a criança faz: {requirement(entry.before, titles)} →{' '}
                {milestone(entry.after.milestone)}
              </li>
            ))}
            {change.capabilitiesAdded.map((tool) => (
              <li key={`add-${tool}`}>Passa a conquistar: {KIDS_TOOL_LABELS[tool]}</li>
            ))}
            {change.capabilitiesRemoved.map((tool) => (
              <li key={`remove-${tool}`}>
                Deixa de conquistar aqui: {KIDS_TOOL_LABELS[tool]}. Quem já ganhou continua com ela.
              </li>
            ))}
          </ul>
        </section>
      ))}
      {impact.tierAccessChanges.map(({ before, after }) => (
        <section key={after.tier} className="space-y-1 border-t pt-3 text-sm">
          <h3 className="font-semibold">Acesso à trilha {KIDS_TIER_LABELS[after.tier]}</h3>
          <p>
            Posto que abre a trilha: {KIDS_POST_LABELS[before.opensAt]} →{' '}
            {KIDS_POST_LABELS[after.opensAt]}
          </p>
          <p>
            Posto que deixa rever a trilha inteira: {KIDS_POST_LABELS[before.completedAt]} →{' '}
            {KIDS_POST_LABELS[after.completedAt]}
          </p>
          <p>
            Primeiro curso: {milestone(before.foundation.milestone)} →{' '}
            {milestone(after.foundation.milestone)}
          </p>
          <p>
            Trilha ainda sem o primeiro curso:{' '}
            {before.foundation.whenMissing === 'open' ? 'dispensar requisito' : 'manter pendente'} →{' '}
            {after.foundation.whenMissing === 'open' ? 'dispensar requisito' : 'manter pendente'}
          </p>
        </section>
      ))}
      <section className="space-y-2 border-t pt-3" aria-label="O que pode travar o caminho">
        <h3 className="text-sm font-semibold">O que pode travar o caminho</h3>
        <p className="text-sm text-muted-foreground">
          Conferido até o posto:{' '}
          {preview.readiness.horizon ? KIDS_POST_LABELS[preview.readiness.horizon] : 'indisponível'}
          . Curso que ainda falta lá na frente gera aviso. Bloqueio precisa ser resolvido antes de
          publicar.
        </p>
        {!preview.readiness.issues.length ? (
          <p className="text-sm">Nenhuma pendência encontrada.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {preview.readiness.issues.map((issue) => (
              <li
                key={`${issue.code}:${issue.level}:${issue.requirementIndex}:${issue.message}`}
                className={
                  issue.severity === 'warning' ? 'text-muted-foreground' : 'text-destructive'
                }
              >
                <span className="font-medium">
                  {issue.severity === 'warning' ? 'Aviso' : 'Bloqueio'}
                  {issue.level ? ` · ${KIDS_POST_LABELS[issue.level]}` : ''}:{' '}
                </span>
                {issue.message}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Card>
  )
}
const preparationLabels = {
  capturing: 'Preparação em andamento',
  preparing: 'Conferindo os perfis',
  ready: 'Pronta para publicar',
  stale: 'Preparação desatualizada',
  published: 'Preparação já publicada',
}

export function KidsJourneyEditor({ initialPreparation }: { initialPreparation?: unknown }) {
  const editor = useKidsJourneyEditor(initialPreparation)
  const { record, preparation, preview } = editor
  const router = useRouter()
  const { keepDraftForLensChange } = editor
  const [draftNotKept, setDraftNotKept] = useState(false)
  // Trocar a lente para Adultos aqui leva à jornada de lá, em vez de um aviso sem saída. O
  // endereço vai junto (`?preparacao=`): voltar para Kids retoma a preparação aberta. O
  // rascunho com mudanças fica guardado na aba e volta com a lente Kids; se o navegador não
  // deixar guardar, a página não sai sozinha: avisa e deixa a pessoa escolher.
  useEffect(() => {
    if (editor.platform === 'kids') {
      setDraftNotKept(false)
      return
    }
    if (!keepDraftForLensChange()) {
      setDraftNotKept(true)
      return
    }
    router.replace(journeyLensHref(ADULT_JOURNEY_PATH, window.location.search))
  }, [editor.platform, keepDraftForLensChange, router])
  const titles: CourseTitles = new Map(editor.courses.map((course) => [course.id, course.title]))
  return (
    <div className="space-y-6">
      <AdminHeader
        title="Jornada do Criador"
        description="O que a criança precisa fazer para subir de posto e o que ela ganha em cada um. Você muda no rascunho e publica quando estiver tudo conferido."
        action={
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(editor.busy) || editor.loading || editor.platform !== 'kids'}
            onClick={() => void editor.refresh()}
          >
            Atualizar
          </Button>
        }
      />
      {editor.platform !== 'kids' && draftNotKept ? (
        <Card role="alert" className="space-y-3 p-5">
          <h2 className="font-semibold">O rascunho da Jornada do Criador não foi guardado</h2>
          <p className="text-sm text-muted-foreground">
            Este navegador não deixou guardar as mudanças desta aba. Volte para a lente Kids para
            continuar o rascunho, ou abra a jornada da Comunidade Sistema Zero sabendo que ele não
            vai voltar.
          </p>
          <Link
            href={journeyLensHref(
              ADULT_JOURNEY_PATH,
              typeof window === 'undefined' ? '' : window.location.search,
            )}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Abrir a jornada da Comunidade Sistema Zero sem o rascunho
          </Link>
        </Card>
      ) : editor.platform !== 'kids' ? (
        <p role="status" className="text-sm text-muted-foreground">
          Abrindo a jornada da Comunidade Sistema Zero…
        </p>
      ) : (
        <>
          {record?.phase === 'published' && !record.permissions.canEdit && <ReadOnlyNotice />}
          {editor.loading && (
            <p role="status" className="text-sm text-muted-foreground">
              Carregando a jornada…
            </p>
          )}
          {editor.loadError && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            >
              <p>{editor.loadError}</p>
              <p>
                O que já estava na tela continua aqui para consulta. Nada pode ser mudado até a
                jornada responder.
              </p>
            </div>
          )}
          {editor.error && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive"
            >
              {editor.error}
            </p>
          )}
          {editor.success && (
            <p role="status" className="rounded-lg border p-4 text-sm">
              {editor.success}
            </p>
          )}
          {record?.phase === 'initializing' && (
            <Card className="space-y-2 p-5">
              <h2 className="font-semibold">Jornada em preparação inicial</h2>
              <p className="text-sm text-muted-foreground">
                As regras iniciais e o que as crianças já ganharam estão sendo conferidos. Espere a
                primeira versão ser publicada para mudar algo. Esta tela não cria nem troca as
                regras.
              </p>
            </Card>
          )}
          {record?.phase === 'published' && editor.draft && (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b pb-4 text-sm">
                <span className="font-mono font-medium">Versão {record.version}</span>
                <span className="text-muted-foreground">
                  {record.policy.mode === 'paused' ? 'Progressão pausada' : 'Progressão ativa'}
                </span>
                {editor.changed && <span className="text-primary">Rascunho com mudanças</span>}
              </div>
              <PublishStepper done={publishStepsDone(editor)} />
              <KidsJourneyPolicyForm
                value={editor.draft}
                courses={editor.courses}
                disabled={!editor.canEdit}
                onChange={editor.updateDraft}
              />
              {editor.validationError && (
                <p role="alert" className="text-sm text-destructive">
                  {editor.validationError}
                </p>
              )}
              <Card className="space-y-4 p-5" aria-labelledby="kids-review-title">
                <div className="space-y-1">
                  <h2 id="kids-review-title" className="text-lg font-semibold">
                    Comparar, dizer o motivo e preparar
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Publicar mantém os postos, as ferramentas e os acessos que cada criança já
                    ganhou. Não dá licença nem matrícula.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!editor.canCompare}
                  onClick={() => void editor.compare()}
                >
                  Comparar com a versão no ar
                </Button>
                <div className="space-y-2">
                  <label htmlFor="kids-change-reason" className="block text-sm font-medium">
                    Motivo da mudança
                  </label>
                  <textarea
                    id="kids-change-reason"
                    aria-label="Motivo da mudança"
                    className="min-h-24 w-full rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                    value={editor.reason}
                    maxLength={500}
                    disabled={!editor.canEdit}
                    onChange={(event) => editor.updateReason(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Fica no histórico. Até 500 caracteres. Não escreva dados de nenhuma criança.
                  </p>
                </div>
                {!preparation && (
                  <Button
                    type="button"
                    disabled={!editor.canPrepare}
                    onClick={() => void editor.prepare()}
                  >
                    Preparar publicação
                  </Button>
                )}
                {!preparation && (
                  <p className="text-xs text-muted-foreground">
                    Para preparar, o rascunho precisa ter mudanças, a comparação precisa estar em
                    dia e o motivo, escrito. Preparar ainda não publica.
                  </p>
                )}
              </Card>
              {preview && <Comparison preview={preview} titles={titles} />}
              {preparation && (
                <Card className="space-y-4 p-5" aria-labelledby="kids-preparation-title">
                  <div className="space-y-1">
                    <h2 id="kids-preparation-title" className="text-lg font-semibold">
                      {preparationLabels[preparation.status]}
                    </h2>
                    <p className="text-sm">
                      {preparation.processed === 1
                        ? '1 perfil conferido'
                        : `${preparation.processed} perfis conferidos`}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    O rascunho fica travado enquanto os perfis são conferidos. Você pode sair e
                    voltar pelo endereço desta página. Cada clique confere um grupo de perfis, e
                    nada é publicado nem tentado de novo sozinho.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(preparation.status === 'capturing' || preparation.status === 'preparing') && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={
                          !record.permissions.canEdit ||
                          Boolean(editor.busy) ||
                          editor.blocked ||
                          Boolean(editor.loadError) ||
                          editor.loading
                        }
                        onClick={() => void editor.advance()}
                      >
                        Conferir o próximo grupo de perfis
                      </Button>
                    )}
                    {preparation.status !== 'published' && preparation.status !== 'stale' && (
                      <Button
                        type="button"
                        disabled={!editor.canPublish}
                        onClick={() => void editor.publish()}
                      >
                        Publicar versão {preparation.expectedVersion + 1}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={Boolean(editor.busy) || editor.loading}
                      onClick={() => void editor.returnToDraft()}
                    >
                      Voltar ao rascunho
                    </Button>
                  </div>
                  {preparation.status === 'stale' && (
                    <p className="text-sm text-destructive">
                      Os cursos ou as regras mudaram no meio do caminho. Volte ao rascunho, compare
                      e prepare de novo. Nada foi publicado por esta preparação.
                    </p>
                  )}
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer">Detalhes técnicos</summary>
                    <p className="mt-1 break-all font-mono">Preparação {preparation.id}</p>
                  </details>
                </Card>
              )}
            </>
          )}
          {editor.busy && (
            <p role="status" className="text-sm text-muted-foreground">
              {editor.busy}…
            </p>
          )}
          {record && (
            <Card className="space-y-4 p-5" aria-labelledby="kids-history-title">
              <div>
                <h2 id="kids-history-title" className="text-lg font-semibold">
                  Histórico de versões
                </h2>
                <p className="text-sm text-muted-foreground">
                  Só as versões que foram ao ar. Rascunhos e preparações não aparecem aqui.
                </p>
              </div>
              {editor.historyError && (
                <p role="alert" className="text-sm text-destructive">
                  Histórico indisponível: {editor.historyError}
                </p>
              )}
              {!editor.history.length && !editor.historyError && (
                <p className="text-sm text-muted-foreground">Nenhuma versão ainda.</p>
              )}
              <ol className="divide-y">
                {editor.history.map((revision) => (
                  <li key={revision.version} className="space-y-1 py-3 text-sm">
                    <div className="flex flex-wrap gap-x-4">
                      <span className="font-mono font-medium">Versão {revision.version}</span>
                      <time dateTime={revision.updatedAt} className="text-muted-foreground">
                        {new Date(revision.updatedAt).toLocaleString('pt-BR')}
                      </time>
                    </div>
                    <p className="whitespace-pre-wrap break-words">{revision.reason}</p>
                    {revision.actorKind === 'system' ? (
                      <p className="text-xs text-muted-foreground">Sistema · regras iniciais</p>
                    ) : (
                      // O histórico só traz o ID de quem publicou (sem nome): a pessoa aparece
                      // como "Alguém da equipe" e o ID fica nos detalhes.
                      <details className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer">Alguém da equipe</summary>
                        <p className="mt-1 break-all font-mono">
                          Conta {revision.actorId ?? 'sem ID'}
                        </p>
                      </details>
                    )}
                  </li>
                ))}
              </ol>
              {editor.moreHistory && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={Boolean(editor.busy) || editor.loading}
                  onClick={() => void editor.earlierHistory()}
                >
                  Ver versões anteriores
                </Button>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
