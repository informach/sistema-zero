import { COPY } from '../../../core/copy'
import { setSceneNodeFlag } from '../../../scene/commands'
import type { ModelSceneNode } from '../../../scene/document'
import { useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { Group, ListChecks, Ungroup } from '../../ui/icons'
import { focusWorkshopStage } from './focusStage'
import { SceneHierarchy, type SceneHierarchyShape } from './SceneHierarchy'
import { useSceneHierarchyOrganization } from './useSceneHierarchyOrganization'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function SceneHierarchyPanel({
  workshop,
  shapeOf,
  joinPieces,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
  shapeOf(node: ModelSceneNode): SceneHierarchyShape
  joinPieces?: () => void
}) {
  const { can } = useMoldaToolAccess()
  const { document, mode, selected, run } = workshop
  const organization = useSceneHierarchyOrganization(workshop)
  const organize = mode === 'model' && can('model.pieces')
  const copy = COPY.scene
  return (
    <>
      <div className="flex items-center justify-between gap-2 px-1 pb-1">
        <h3 className="mld-kicker">{copy.hierarchy}</h3>
        {mode === 'animation' && (
          <button
            type="button"
            className="mld-tree-action ml-auto"
            aria-label={copy.addSelection}
            title={copy.addSelection}
            aria-pressed={workshop.additive}
            onClick={() => workshop.setAdditive(!workshop.additive)}
          >
            <ListChecks aria-hidden="true" className="size-4" />
          </button>
        )}
        {document.nodes.length > 0 && (
          <span
            aria-hidden="true"
            className="rounded-full bg-mld-bg px-2 py-0.5 text-[0.6875rem] font-extrabold text-mld-muted tabular-nums"
          >
            {document.nodes.length}
          </span>
        )}
      </div>
      {mode === 'model' && (
        <fieldset className="mld-hierarchy-tools" aria-label="Organizar peças e grupos">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              className="mld-tree-action"
              aria-label={copy.addSelection}
              title={copy.addSelection}
              aria-pressed={workshop.additive}
              onClick={() => workshop.setAdditive(!workshop.additive)}
            >
              <ListChecks aria-hidden="true" className="size-4" />
            </button>
            {organize && (
              <>
                <button
                  type="button"
                  className="mld-chip-btn"
                  disabled={!organization.plan.editable}
                  onClick={organization.group}
                >
                  <Group aria-hidden="true" />
                  {copy.group}
                </button>
                <button
                  type="button"
                  className="mld-chip-btn"
                  disabled={!organization.canUngroup}
                  onClick={(event) => {
                    const from = event.currentTarget
                    if (organization.ungroup()) focusWorkshopStage(from)
                  }}
                >
                  <Ungroup aria-hidden="true" />
                  {copy.ungroup}
                </button>
              </>
            )}
          </div>
          {organize && (
            <select
              name="scene-hierarchy-destination"
              aria-label="Mover para grupo"
              className="mld-hierarchy-destination"
              value=""
              disabled={!organization.plan.allows(null) && !organization.destinations.length}
              onChange={(event) => {
                if (event.target.value)
                  organization.move(
                    selected,
                    event.target.value === 'root' ? null : event.target.value.slice(6),
                  )
              }}
            >
              <option value="" disabled>
                Mover para grupo…
              </option>
              {organization.plan.allows(null) && <option value="root">Fora dos grupos</option>}
              {organization.destinations.map((node) => (
                <option key={node.id} value={`group:${node.id}`}>
                  {node.name}
                </option>
              ))}
            </select>
          )}
        </fieldset>
      )}
      {mode !== 'paint' && document.nodes.length > 1 && (
        <p className="px-1 pb-1 text-xs text-mld-muted">
          Shift + clique: escolher várias. Ctrl + clique no começo e no fim: escolher um intervalo.
        </p>
      )}
      {!document.nodes.length && <p className="px-1 text-sm text-mld-muted">{copy.empty}</p>}
      <SceneHierarchy
        index={workshop.index.scene}
        selected={selected}
        onSelect={workshop.select}
        onSelectRange={(ids) => {
          if (mode === 'paint') workshop.select(ids.at(-1) ?? null, false)
          else workshop.selectMany(ids, 'replace')
        }}
        shapeOf={shapeOf}
        organization={organize ? organization : undefined}
        poseCounts={mode === 'animation' ? workshop.poseCounts : undefined}
        paintColors={mode === 'paint' ? workshop.paintColors : undefined}
        onFlag={
          organize
            ? (id, flag, value) => run((source) => setSceneNodeFlag(source, [id], flag, value))
            : undefined
        }
      />
      {joinPieces && (
        <div className="px-1 pt-2">
          <Button variant="primary" className="w-full" onClick={joinPieces}>
            {COPY.scene.joinPieces}
          </Button>
          <p className="mt-1 text-xs text-mld-muted">{COPY.scene.joinPiecesHint}</p>
        </div>
      )}
      {mode === 'paint' && workshop.paintColorsStatus && (
        <p role="status" className="px-1 text-xs text-mld-muted">
          {workshop.paintColorsStatus}
        </p>
      )}
    </>
  )
}
