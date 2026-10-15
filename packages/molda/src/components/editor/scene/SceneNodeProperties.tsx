import { useId } from 'react'
import { COPY } from '../../../core/copy'
import { SCENE_SHELL_COPY } from '../../../core/sceneShellCopy'
import {
  deleteSceneNodes,
  renameSceneNode,
  reparentSceneNodes,
  resizeScenePrimitive,
  setSceneNodeFlag,
  setScenePrimitiveDetail,
} from '../../../scene/commands'
import { editScenePath } from '../../../scene/pathCommands'
import { duplicateSceneNodesNearby } from '../../../scene/placement'
import { primitiveDetail } from '../../../scene/primitiveDetail'
import { RequiresTool, useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { Copy, Trash2 } from '../../ui/icons'
import { SceneAdjustmentForm } from './SceneAdjustmentForm'
import { SceneCurveDetails } from './SceneCurveDetails'
import { SceneMirrors } from './SceneMirrors'
import { ScenePivotChoices } from './SceneModelGuideControls'
import { ScenePathProperties } from './ScenePathProperties'
import { SceneSkinTools } from './SceneSkinTools'
import { SceneSurfaceStrip } from './SceneSurfaceStrip'
import { SceneTransformCoordinates } from './SceneTransformCoordinates'
import { SceneTransformSteps } from './SceneTransformSteps'
import { SceneVectorForm } from './SceneVectorForm'
import { adjustScene } from './sceneAdjustment'
import type { useSceneWorkshop } from './useSceneWorkshop'

/** O `<details>` do painel: cartão claro, o resumo em negrito com 44px de alvo. */
const DISCLOSURE = 'rounded-xl bg-mld-bg p-2'
const SUMMARY = 'flex min-h-11 cursor-pointer items-center px-1 text-sm font-bold text-mld-text'

/**
 * Cartão contextual da peça: apenas o ajuste da ferramenta ativa, seguido da aparência.
 * Medidas, organização e operações avançadas ficam em detalhes com seus respectivos acessos.
 */
export function SceneNodeProperties({
  workshop,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
}) {
  const copy = COPY.scene
  const nameId = useId()
  const chosenMode = workshop.tool
  // O portão: mover, girar e mudar tamanho são `model.pieces`; o ponto de giro e as medidas,
  // `model.precise`. Trancado não aparece.
  const { can } = useMoldaToolAccess()
  const modes = (['move', 'rotate', 'scale', 'pivot'] as const).filter((name) =>
    can(name === 'pivot' ? 'model.precise' : 'model.pieces'),
  )
  const mode = modes.find((mode) => mode === chosenMode)
  const precise = can('model.precise')
  const { primary, selected, run, document, index, covered } = workshop
  const groups = document.nodes.filter((node) => node.kind === 'group' && !covered.has(node.id))
  const geometry = primary?.kind === 'mesh' ? index.geometries.get(primary.geometryId) : undefined
  if (!selected.length) return <p className="p-2 text-sm text-mld-muted">{copy.choose}</p>
  return (
    <div className="space-y-4 border-t border-mld-border pt-3">
      <div className="flex min-w-0 items-center gap-1">
        <p className="min-w-0 flex-1 truncate text-sm font-bold text-mld-text">
          {primary?.name ?? copy.selection(selected.length)}
        </p>
        <RequiresTool family="model.pieces">
          <Button
            className="px-2"
            aria-label={copy.duplicate}
            onClick={() => run((source) => duplicateSceneNodesNearby(source, selected), 'created')}
          >
            <Copy aria-hidden="true" className="size-4" />
          </Button>
          <Button
            className="px-2"
            aria-label={copy.remove}
            onClick={() => run((source) => deleteSceneNodes(source, selected), 'clear')}
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </Button>
        </RequiresTool>
      </div>
      {geometry?.kind === 'mesh' && (
        <p className="text-sm text-mld-muted">
          {copy.meshCounts(
            Object.keys(geometry.vertices).length,
            Object.keys(geometry.faces).length,
          )}
        </p>
      )}
      {mode && (
        <div className="space-y-3">
          <h3 className="font-bold">
            {mode === 'pivot' ? 'Pivô — onde gira' : mode === 'scale' ? 'Tamanho' : copy[mode]}
          </h3>
          {mode === 'pivot' ? (
            <>
              <ScenePivotChoices workshop={workshop} />
              <details className={DISCLOSURE}>
                <summary className={SUMMARY}>Valores do pivô</summary>
                <SceneAdjustmentForm
                  mode="pivot"
                  disabled={selected.length !== 1}
                  onApply={(values) =>
                    run((source) => adjustScene(source, selected, 'pivot', values))
                  }
                />
              </details>
            </>
          ) : (
            <>
              <SceneTransformSteps workshop={workshop} />
              {precise && (
                <details className={DISCLOSURE}>
                  <summary className={SUMMARY}>Medidas e valores</summary>
                  <SceneTransformCoordinates workshop={workshop} />
                </details>
              )}
            </>
          )}
        </div>
      )}
      <SceneSurfaceStrip workshop={workshop} />
      {precise && primary && geometry && geometry.kind !== 'mesh' && geometry.kind !== 'path' && (
        <details className={DISCLOSURE}>
          <summary className={SUMMARY}>{copy.dimensions}</summary>
          <SceneVectorForm
            key={`${primary.id}-${document.updatedAt}-dimensions`}
            label={copy.dimensions}
            hint={copy.dimensionsHint}
            values={[
              geometry.to[0] - geometry.from[0],
              geometry.to[1] - geometry.from[1],
              geometry.to[2] - geometry.from[2],
            ]}
            min={Number.MIN_VALUE}
            onApply={(values) => run((source) => resizeScenePrimitive(source, primary.id, values))}
          />
        </details>
      )}
      {precise && primary && (geometry?.kind === 'cylinder' || geometry?.kind === 'sphere') && (
        <details className={DISCLOSURE}>
          <summary className="min-h-11 cursor-pointer px-1 py-3 text-sm font-bold text-mld-text">
            {copy.curveDetail}
          </summary>
          <SceneCurveDetails
            key={`${primary.id}-${geometry.id}-${JSON.stringify(primitiveDetail(geometry))}`}
            geometry={geometry}
            onApply={(detail) =>
              run((source) => setScenePrimitiveDetail(source, primary.id, detail))
            }
          />
        </details>
      )}
      {primary && geometry?.kind === 'path' && (
        <ScenePathProperties
          key={primary.id}
          geometry={geometry}
          onSettings={(settings) => run((source) => editScenePath(source, primary.id, settings))}
          onPoint={(point, position) =>
            run((source) => editScenePath(source, primary.id, { point, position }))
          }
        />
      )}
      <SceneMirrors workshop={workshop} />
      {primary?.kind === 'mesh' && geometry?.kind === 'mesh' && (
        <SceneSkinTools key={`skin:${document.id}:${primary.id}`} workshop={workshop} />
      )}
      {/* Com várias escolhidas sobra o grupo: colocar todas de uma vez num grupo continua aqui. */}
      <details className={DISCLOSURE}>
        <summary className={SUMMARY}>{SCENE_SHELL_COPY.moreAboutPiece}</summary>
        <div className="space-y-3 px-1 pb-1">
          {primary && (
            <>
              <form
                key={`${primary.id}-${primary.name}`}
                className="space-y-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  const name = new FormData(event.currentTarget).get('name')
                  if (typeof name === 'string')
                    run((source) => renameSceneNode(source, primary.id, name))
                }}
              >
                <label htmlFor={nameId} className="text-sm font-bold text-mld-text">
                  {copy.nodeName}
                </label>
                <input
                  id={nameId}
                  name="name"
                  required
                  maxLength={48}
                  defaultValue={primary.name}
                  className="min-h-11 w-full rounded-lg border border-mld-border bg-mld-surface px-3 text-sm text-mld-text focus-visible:outline-2 focus-visible:outline-mld-accent"
                />
                <Button type="submit" className="w-full text-sm">
                  {copy.rename}
                </Button>
              </form>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-mld-text">
                <input
                  type="checkbox"
                  name="visible"
                  checked={!primary.hidden}
                  className="size-5 accent-mld-accent"
                  onChange={(event) =>
                    run((source) =>
                      setSceneNodeFlag(source, [primary.id], 'hidden', !event.target.checked),
                    )
                  }
                />
                {copy.visible}
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-mld-text">
                <input
                  type="checkbox"
                  name="locked"
                  checked={primary.locked}
                  className="size-5 accent-mld-accent"
                  onChange={(event) =>
                    run((source) =>
                      setSceneNodeFlag(source, [primary.id], 'locked', event.target.checked),
                    )
                  }
                />
                {copy.locked}
              </label>
            </>
          )}
          <RequiresTool family="model.pieces">
            <details className="rounded-xl bg-mld-surface p-2">
              <summary className={SUMMARY}>{copy.organize}</summary>
              <div className="space-y-1">
                <Button
                  className="w-full text-sm"
                  disabled={selected.every((id) => index.scene.nodes.get(id)?.parentId === null)}
                  onClick={() => run((source) => reparentSceneNodes(source, selected, null))}
                >
                  {copy.root}
                </Button>
                {groups.map((group) => (
                  <Button
                    key={group.id}
                    className="w-full justify-start text-sm"
                    onClick={() => run((source) => reparentSceneNodes(source, selected, group.id))}
                  >
                    {group.name}
                  </Button>
                ))}
                {groups.length === 0 && (
                  <p className="p-2 text-sm text-mld-muted">{copy.noGroups}</p>
                )}
              </div>
            </details>
          </RequiresTool>
        </div>
      </details>
    </div>
  )
}
