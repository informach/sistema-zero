'use client'

import { type KidsRequirement, kidsRequirementKey } from '@sistemazero/core/journey'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { AdminHeader } from '@/components/admin/admin-header'
import {
  KIDS_POST_LABELS,
  KIDS_TIER_LABELS,
  KIDS_TOOL_LABELS,
  type KidsPreview,
} from '@/lib/kids-journey-editor'
import { KidsJourneyPolicyForm } from './journey-policy-form'
import { useKidsJourneyEditor } from './use-journey-editor'

function milestone(value: 'complete' | 'showcase') {
  return value === 'complete' ? 'concluir' : 'concluir e publicar no Mural'
}
function requirement(value: KidsRequirement) {
  return value.kind === 'course'
    ? `Curso ${value.courseId}: ${milestone(value.milestone)}`
    : `${KIDS_TIER_LABELS[value.tier]}, posição ${value.slot}: ${milestone(value.milestone)}`
}
function Comparison({ preview }: { preview: KidsPreview }) {
  const mode = { active: 'Ativa', paused: 'Pausada' }
  const impact = preview.newLearner
  return (
    <Card className="space-y-4 p-5" aria-labelledby="kids-comparison-title">
      <div className="space-y-1">
        <h2 id="kids-comparison-title" className="text-lg font-semibold">
          Comparação com a versão {preview.baseVersion}
        </h2>
        <p className="text-sm">
          {mode[impact.before.mode]} → {mode[impact.after.mode]}
        </p>
        <p className="text-sm text-muted-foreground">
          Simulação de um novo aluno. Não é um levantamento de todos os perfis. A preparação
          verifica os perfis e preserva suas conquistas antes de publicar.
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
                Novo requisito: {requirement(entry)}
              </li>
            ))}
            {change.requirementsRemoved.map((entry) => (
              <li key={`removed-${kidsRequirementKey(entry)}`}>
                Requisito retirado: {requirement(entry)}
              </li>
            ))}
            {change.requirementsChanged.map((entry) => (
              <li key={`changed-${kidsRequirementKey(entry.before)}`}>
                Marco alterado: {requirement(entry.before)} → {milestone(entry.after.milestone)}
              </li>
            ))}
            {change.capabilitiesAdded.map((tool) => (
              <li key={`add-${tool}`}>Passa a conquistar: {KIDS_TOOL_LABELS[tool]}</li>
            ))}
            {change.capabilitiesRemoved.map((tool) => (
              <li key={`remove-${tool}`}>
                Deixa de conquistar aqui: {KIDS_TOOL_LABELS[tool]}. Concessões anteriores são
                preservadas.
              </li>
            ))}
          </ul>
        </section>
      ))}
      {impact.tierAccessChanges.map(({ before, after }) => (
        <section key={after.tier} className="space-y-1 border-t pt-3 text-sm">
          <h3 className="font-semibold">Acesso: {KIDS_TIER_LABELS[after.tier]}</h3>
          <p>
            Entrada: {KIDS_POST_LABELS[before.opensAt]} → {KIDS_POST_LABELS[after.opensAt]}
          </p>
          <p>
            Revisão da etapa: {KIDS_POST_LABELS[before.completedAt]} →{' '}
            {KIDS_POST_LABELS[after.completedAt]}
          </p>
          <p>
            Primeira aventura: {milestone(before.foundation.milestone)} →{' '}
            {milestone(after.foundation.milestone)}
          </p>
          <p>
            Sem primeira aventura no catálogo conhecido:{' '}
            {before.foundation.whenMissing === 'open' ? 'dispensar requisito' : 'manter pendente'} →{' '}
            {after.foundation.whenMissing === 'open' ? 'dispensar requisito' : 'manter pendente'}
          </p>
        </section>
      ))}
      <section className="space-y-2 border-t pt-3" aria-label="Condições do percurso">
        <h3 className="text-sm font-semibold">Condições do percurso</h3>
        <p className="text-sm text-muted-foreground">
          Alcance conferido:{' '}
          {preview.readiness.horizon ? KIDS_POST_LABELS[preview.readiness.horizon] : 'indisponível'}
          . Aventuras futuras ausentes podem gerar avisos; bloqueios precisam ser corrigidos.
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
  preparing: 'Preservando conquistas',
  ready: 'Pronta para publicar',
  stale: 'Preparação desatualizada',
  published: 'Preparação já publicada',
}

export function KidsJourneyEditor({ initialPreparation }: { initialPreparation?: unknown }) {
  const editor = useKidsJourneyEditor(initialPreparation)
  const { record, preparation, preview } = editor
  return (
    <div className="space-y-6">
      <AdminHeader
        title="Jornada Kids"
        description="Planeje os avanços, confira o percurso e publique uma versão para a plataforma."
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
      {editor.platform !== 'kids' ? (
        <Card className="p-5">
          <p>Selecione a plataforma Kids para consultar esta jornada.</p>
        </Card>
      ) : (
        <>
          {editor.loading && (
            <p role="status" className="text-sm text-muted-foreground">
              Carregando jornada…
            </p>
          )}
          {editor.loadError && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            >
              <p>{editor.loadError}</p>
              <p>
                Os dados já carregados são mantidos para consulta. Novas operações ficam bloqueadas
                até a jornada responder.
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
                A configuração inicial e as conquistas existentes estão sendo conferidas no
                servidor. Aguarde a publicação inicial antes de editar. Esta tela não cria nem
                substitui a política.
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
                {!record.permissions.canEdit && <span>Somente leitura · equipe</span>}
                {editor.changed && <span className="text-primary">Rascunho com mudanças</span>}
              </div>
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
                    Revisar e preparar
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Compare o rascunho antes de preparar. Publicar preserva os postos, as
                    ferramentas e os acessos já conquistados; não concede licença ou matrícula.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!editor.canCompare}
                  onClick={() => void editor.compare()}
                >
                  Comparar mudanças
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
                    Registrado no histórico. Até 500 caracteres; não inclua dados de crianças.
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
                    É preciso haver mudanças, comparação válida e motivo. A preparação não publica a
                    versão.
                  </p>
                )}
              </Card>
              {preview && <Comparison preview={preview} />}
              {preparation && (
                <Card className="space-y-4 p-5" aria-labelledby="kids-preparation-title">
                  <div className="space-y-1">
                    <h2 id="kids-preparation-title" className="text-lg font-semibold">
                      {preparationLabels[preparation.status]}
                    </h2>
                    <p className="break-all font-mono text-xs text-muted-foreground">
                      {preparation.id}
                    </p>
                    <p className="text-sm">{preparation.processed} perfis verificados</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    O candidato fica fixo durante esta preparação. Você pode sair e retomar pelo
                    endereço desta página. Cada clique verifica um lote; não há publicação ou nova
                    tentativa automática.
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
                        Verificar próximo lote
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
                      O catálogo ou a configuração mudou. Volte ao rascunho, compare e prepare
                      novamente. Nenhuma versão foi publicada por esta preparação.
                    </p>
                  )}
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
                  Somente versões publicadas. Rascunhos e preparações não substituem a versão atual.
                </p>
              </div>
              {editor.historyError && (
                <p role="alert" className="text-sm text-destructive">
                  Histórico indisponível: {editor.historyError}
                </p>
              )}
              {!editor.history.length && !editor.historyError && (
                <p className="text-sm text-muted-foreground">Nenhuma versão listada.</p>
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
                    <p className="break-all text-xs text-muted-foreground">
                      {revision.actorKind === 'system'
                        ? 'Sistema · configuração inicial'
                        : `Conta da equipe · ${revision.actorId}`}
                    </p>
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
