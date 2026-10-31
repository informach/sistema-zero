import { lazy, Suspense, useCallback, useState } from 'react'
import { COPY } from '../../../core/copy'
import { evaluateSceneNodeFlags } from '../../../scene/evaluate'
import { SCENE_SKIN_LIMITS } from '../../../scene/skin'
import { Button } from '../../ui/Button'
import {
  ArrowLeft,
  Check,
  CircleDot,
  GitFork,
  MousePointer2,
  Play,
  RotateCcw,
  X,
} from '../../ui/icons'
import { SceneCharacterRigSection } from './SceneCharacterRigSection'
import { SceneSkinWeightTools } from './SceneSkinWeightTools'
import type { useSceneWorkshop } from './useSceneWorkshop'

const Skin = lazy(() =>
  import('./SceneSkinPanel').then((module) => ({ default: module.SceneSkinPanel })),
)

/** One decision at a time; the actual 3D model remains the child's work surface. */
export function SceneRigPanel({ workshop }: { workshop: ReturnType<typeof useSceneWorkshop> }) {
  const { primary, rig, rigDraft: draft, rigError, index } = workshop
  const [advanced, setAdvanced] = useState(false)
  const focusTitle = useCallback((heading: HTMLHeadingElement | null) => heading?.focus(), [])
  const node = primary?.kind === 'mesh' ? primary : null
  const selectedBone = primary
    ? [...index.skins.values()].some((binding) =>
        binding.joints.some((joint) => joint.nodeId === primary.id),
      )
    : false
  const skin = node ? index.skinsByNode.get(node.id) : null
  const flags = node ? evaluateSceneNodeFlags(index.scene).get(node.id) : null
  const locked = !node || flags?.locked || flags?.hidden
  const phase = draft?.phase === 'try' ? 2 : draft?.phase === 'busy' ? 1 : 0
  return (
    <section className="space-y-3" aria-label="Área Ossos e pesos" data-workspace-area="skin">
      <div className="flex items-center justify-between gap-2">
        <h2 ref={focusTitle} tabIndex={-1} className="text-sm font-bold">
          Ossos e movimentos
        </h2>
        <button
          type="button"
          className="mld-tree-action"
          aria-label="Fechar área"
          onClick={() => workshop.openArea(null)}
        >
          <X aria-hidden="true" />
        </button>
      </div>
      {!draft && <SceneCharacterRigSection workshop={workshop} />}
      {workshop.characterRig.draft ? null : !node ? (
        selectedBone ? (
          <div className="space-y-3">
            <p className="text-sm font-bold">{primary!.name}</p>
            <p className="text-sm text-mld-muted">
              Osso escolhido. Use Mover ou Girar no palco. Para guardar movimentos, abra Animar.
            </p>
            <Button
              size="compact"
              className="w-full"
              onClick={() => workshop.changeMode('animation')}
            >
              <Play aria-hidden="true" className="size-4" />
              Animar este osso
            </Button>
          </div>
        ) : (
          <p className="text-sm text-mld-muted">Escolha a peça que você quer movimentar.</p>
        )
      ) : (
        <>
          <p className="truncate text-xs font-bold text-mld-muted">{node.name}</p>
          {locked && !advanced && (
            <p role="status" className="text-xs text-mld-muted">
              {COPY.scene.skinBinding.locked}
            </p>
          )}
          {skin ? (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-bold">
                <Check aria-hidden="true" className="size-4" />
                Montagem pronta
              </p>
              <p className="text-xs leading-relaxed text-mld-muted">
                Esta peça acompanha seus ossos. Toque em um ponto no palco para escolher o osso.
                Depois, marque as poses em Animar.
              </p>
              <Button
                size="compact"
                className="w-full"
                onClick={() => {
                  workshop.select(
                    skin.joints[Math.floor((skin.joints.length - 1) / 2)]!.nodeId,
                    false,
                  )
                  workshop.changeMode('animation')
                }}
              >
                <Play aria-hidden="true" className="size-4" />
                Animar os ossos
              </Button>
            </div>
          ) : (
            <>
              <ol aria-label="Passos da montagem" className="flex gap-2 text-xs">
                {['Montar', 'Ligar', 'Testar'].map((label, i) => (
                  <li
                    key={label}
                    aria-current={phase === i ? 'step' : undefined}
                    className={`flex flex-1 items-center gap-1.5 rounded-lg px-2 py-2 font-bold ${phase === i ? 'bg-mld-accent/10 text-mld-accent' : 'text-mld-muted'}`}
                  >
                    <span>{i + 1}</span>
                    {label}
                  </li>
                ))}
              </ol>
              {!draft ? (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed">
                    Marque onde a peça vai dobrar, como o ombro, o cotovelo e a mão.
                  </p>
                  <p className="text-xs leading-relaxed text-mld-muted">
                    Você escolhe os pontos. O Molda liga os ossos e prepara a peça para acompanhar o
                    movimento.
                  </p>
                  <Button
                    size="compact"
                    variant="primary"
                    className="w-full"
                    disabled={!!locked}
                    onClick={() => rig.start(node.id)}
                  >
                    <GitFork aria-hidden="true" className="size-4" />
                    Montar ossos
                  </Button>
                </div>
              ) : draft.phase === 'busy' ? (
                <p role="status" className="rounded-lg bg-mld-bg p-3 text-sm">
                  Ligando os ossos e preparando a dobra…
                </p>
              ) : draft.phase === 'mark' ? (
                <>
                  <p role="status" className="text-sm font-bold">
                    {draft.editing !== null
                      ? `Marque de novo o ponto ${draft.editing + 1}.`
                      : draft.points.length === 0
                        ? 'Toque onde o movimento começa.'
                        : draft.points.length === 1
                          ? 'Agora toque na próxima articulação.'
                          : 'Marque a ponta ou adicione outra articulação.'}
                  </p>
                  <p className="text-xs leading-relaxed text-mld-muted">
                    Marque os pontos na ordem. Escolha outro lado para acertar a profundidade.
                  </p>
                  <fieldset className="grid grid-cols-3 gap-1" aria-label="Por qual lado montar">
                    {(['front', 'left', 'top'] as const).map((view, i) => (
                      <Button
                        key={view}
                        size="compact"
                        aria-pressed={draft.view === view}
                        onClick={() => rig.setView(view)}
                      >
                        {['Frente', 'Lado', 'Cima'][i]}
                      </Button>
                    ))}
                  </fieldset>
                  {!!draft.points.length && (
                    <ol aria-label="Articulações marcadas" className="space-y-1">
                      {draft.points.map((_, i) => (
                        <li key={draft.pointIds[i]} className="flex items-center gap-2">
                          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-mld-bg text-xs font-bold">
                            {i + 1}
                          </span>
                          <span className="flex-1 text-sm">
                            {i === 0 ? 'Começo' : `Ponto ${i + 1}`}
                          </span>
                          <button
                            type="button"
                            className="mld-chip-btn"
                            aria-label={`Mudar ponto ${i + 1}`}
                            aria-pressed={draft.editing === i}
                            onClick={() => rig.edit(i)}
                          >
                            Mudar
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button size="compact" disabled={!draft.points.length} onClick={rig.back}>
                      <ArrowLeft aria-hidden="true" className="size-4" />
                      Último ponto
                    </Button>
                    {draft.editing !== null && (
                      <Button size="compact" onClick={() => rig.edit(-1)}>
                        Continuar pontos
                      </Button>
                    )}
                  </div>
                  {draft.points.length >= SCENE_SKIN_LIMITS.joints && (
                    <p className="text-xs text-mld-muted">
                      Já há muitos ossos nesta montagem. Ligue à peça para continuar.
                    </p>
                  )}
                  <Button
                    size="compact"
                    variant="primary"
                    className="w-full"
                    disabled={draft.points.length < 2}
                    onClick={() => void rig.prepare()}
                  >
                    <Check aria-hidden="true" className="size-4" />
                    Ligar à peça
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold">Experimente a dobra</p>
                  <p className="text-xs leading-relaxed text-mld-muted">
                    Escolha um osso e deslize para dobrar. Este teste não grava um movimento.
                  </p>
                  <fieldset className="flex flex-wrap gap-1" aria-label="Osso para experimentar">
                    {draft.prepared!.jointIds.slice(0, -1).map((id, i) => (
                      <Button
                        size="compact"
                        key={id}
                        aria-pressed={draft.jointId === id}
                        onClick={() => rig.test(id, 0)}
                      >
                        <CircleDot aria-hidden="true" className="size-4" />
                        Osso {i + 1}
                      </Button>
                    ))}
                  </fieldset>
                  <label className="block space-y-2 text-xs font-bold">
                    Dobrar o osso
                    <input
                      name="rig-bend"
                      type="range"
                      min={-70}
                      max={70}
                      step={1}
                      value={draft.angle}
                      aria-valuetext={
                        draft.angle === 0
                          ? 'Posição inicial'
                          : draft.angle < 0
                            ? 'Dobrando para um lado'
                            : 'Dobrando para o outro lado'
                      }
                      className="block min-h-11 w-full accent-mld-accent"
                      onChange={(event) => rig.test(draft.jointId!, Number(event.target.value))}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button size="compact" onClick={() => rig.test(draft.jointId!, 0)}>
                      <RotateCcw aria-hidden="true" className="size-4" />
                      Voltar ao início
                    </Button>
                    <Button size="compact" onClick={() => rig.edit(0)}>
                      Ajustar pontos
                    </Button>
                  </div>
                  <p className="text-xs leading-relaxed text-mld-muted">
                    A montagem volta à posição inicial ao guardar. Você pode desfazer tudo de uma
                    vez.
                  </p>
                  <Button size="compact" variant="primary" className="w-full" onClick={rig.confirm}>
                    <Check aria-hidden="true" className="size-4" />
                    Usar montagem
                  </Button>
                </>
              )}
              {draft && (
                <Button size="compact" className="w-full" onClick={rig.cancel}>
                  Cancelar montagem
                </Button>
              )}
            </>
          )}
          {rigError && (
            <p role="alert" className="text-xs text-mld-danger">
              {rigError}
            </p>
          )}
          {!draft && (
            <details
              className="mld-disclosure"
              onToggle={(event) => setAdvanced(event.currentTarget.open)}
            >
              <summary>Ajustes avançados</summary>
              {advanced && (
                <Suspense fallback={<p role="status">Abrindo ajustes…</p>}>
                  {index.geometries.get(node.geometryId)?.kind === 'mesh' ? (
                    <>
                      <Skin
                        editor={workshop.editor}
                        nodeId={node.id}
                        onClose={() => workshop.openArea(null)}
                      />
                      {skin && (
                        <Button
                          size="compact"
                          className="w-full"
                          disabled={!!locked}
                          onClick={() => workshop.components.open('vertex')}
                        >
                          <MousePointer2 aria-hidden="true" className="size-4" />
                          Escolher pontos para ajustar forças
                        </Button>
                      )}
                      {workshop.components.weights && (
                        <SceneSkinWeightTools {...workshop.components.weights} />
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-mld-muted">
                      Para usar apoios existentes nesta forma, transforme-a em malha. A montagem
                      guiada prepara isso para você.
                    </p>
                  )}
                </Suspense>
              )}
            </details>
          )}
        </>
      )}
    </section>
  )
}
