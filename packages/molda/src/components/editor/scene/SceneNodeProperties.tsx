import { useId, useState } from 'react'
import { COPY } from '../../../core/copy'
import { SCENE_SHELL_COPY } from '../../../core/sceneShellCopy'
import {
  renameSceneNode,
  reparentSceneNodes,
  resizeScenePrimitive,
  setSceneNodeFlag,
  setScenePrimitiveDetail,
} from '../../../scene/commands'
import { editScenePath } from '../../../scene/pathCommands'
import { primitiveDetail } from '../../../scene/primitiveDetail'
import { RequiresTool, useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { SceneAdjustmentForm } from './SceneAdjustmentForm'
import { SceneCurveDetails } from './SceneCurveDetails'
import { SceneMirrors } from './SceneMirrors'
import { ScenePathProperties } from './ScenePathProperties'
import { SceneSkinTools } from './SceneSkinTools'
import { SceneVectorForm } from './SceneVectorForm'
import { adjustScene, type SceneAdjustment } from './sceneAdjustment'
import type { useSceneWorkshop } from './useSceneWorkshop'

/** O `<details>` do painel: cartão claro, o resumo em negrito com 44px de alvo. */
const DISCLOSURE = 'rounded-xl bg-mld-bg p-2'
const SUMMARY = 'flex min-h-11 cursor-pointer items-center px-1 text-sm font-bold text-mld-text'

/**
 * O painel da peça escolhida, no desenho da tela-modelo (11/09/2026): à vista o que se usa todo
 * dia (o ajuste de mover, girar, mudar tamanho e o ponto de giro, com X, Y e Z lado a lado), e
 * recolhido o resto. A cor e o acabamento SAÍRAM daqui para a faixa de baixo do Modelar; o nome,
 * mostrar, travar e o grupo moram em "Mais sobre a peça".
 */
export function SceneNodeProperties({
  workshop,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
}) {
  const copy = COPY.scene
  const nameId = useId()
  const [chosenMode, setMode] = useState<SceneAdjustment>('move')
  // O portão: mover, girar e mudar tamanho são `model.pieces`; o ponto de giro e as medidas,
  // `model.precise`. Trancado não aparece.
  const { can } = useMoldaToolAccess()
  const modes = (['move', 'rotate', 'scale', 'pivot'] as const).filter((name) =>
    can(name === 'pivot' ? 'model.precise' : 'model.pieces'),
  )
  const mode = modes.includes(chosenMode) ? chosenMode : modes[0]
  const precise = can('model.precise')
  const { primary, selected, run, document, index, covered } = workshop
  const groups = document.nodes.filter((node) => node.kind === 'group' && !covered.has(node.id))
  const geometry = primary?.kind === 'mesh' ? index.geometries.get(primary.geometryId) : undefined
  if (!selected.length) return <p className="p-2 text-sm text-mld-muted">{copy.choose}</p>
  return (
    <div className="space-y-4 border-t border-mld-border pt-3">
      <p className="text-sm font-bold text-mld-text">{copy.selection(selected.length)}</p>
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
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-mld-bg p-1">
            {modes.map((name) => (
              <button
                key={name}
                type="button"
                className="min-h-11 rounded-xl px-2 text-sm font-bold text-mld-muted transition hover:text-mld-text focus-visible:outline-2 focus-visible:outline-mld-accent disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:bg-mld-accent aria-pressed:text-mld-accent-fg"
                aria-pressed={mode === name}
                disabled={name === 'pivot' && selected.length !== 1}
                onClick={() => setMode(name)}
              >
                {copy[name]}
              </button>
            ))}
          </div>
          <SceneAdjustmentForm
            key={`${mode}-${selected.join(',')}-${document.updatedAt}`}
            mode={mode}
            disabled={mode === 'pivot' && selected.length !== 1}
            onApply={(values) => run((source) => adjustScene(source, selected, mode, values))}
          />
        </div>
      )}
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
