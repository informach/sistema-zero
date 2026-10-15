/**
 * Trilho vertical comum: ferramentas nomeadas, formas e detalhes conforme o acesso.
 * A oficina controla a ferramenta; os controles do palco chegam por portais.
 */
import { type RefObject, useId } from 'react'
import { COPY } from '../../../core/copy'
import { SCENE_SHELL_COPY } from '../../../core/sceneShellCopy'
import {
  convertSceneNodesToMesh,
  groupSceneNodes,
  ungroupSceneNodes,
} from '../../../scene/commands'
import { RequiresTool } from '../../toolAccess'
import { Button } from '../../ui/Button'
import {
  ChevronDown,
  Crosshair,
  Group,
  ListChecks,
  Shapes,
  Ungroup,
  Waypoints,
} from '../../ui/icons'
import { focusWorkshopStage } from './focusStage'
import { SceneCreateMenu } from './SceneCreateMenu'
import { SceneTile, SCENE_TILE_GRID as TILES } from './SceneTile'
import { SceneUpcomingTools } from './SceneUpcomingTools'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function SceneModelColumn({
  workshop,
  toolsSlot,
  areaToolsSlot,
  faceToggle,
  onToggleFaces,
  canConvert,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
  toolsSlot(element: HTMLDivElement | null): void
  areaToolsSlot(element: HTMLDivElement | null): void
  faceToggle: RefObject<HTMLButtonElement | null>
  onToggleFaces(): void
  canConvert: boolean
}) {
  const copy = COPY.scene
  const headingId = useId()
  const { selected, run, components, index } = workshop
  return (
    // O trilho rola sem deslocar o palco e mantém o retorno da edição de componentes.
    <div className="mld-workshop-rail mld-bar">
      {components.selection && (
        <Button
          className="sticky top-0 z-10 shrink-0 bg-mld-surface px-1 text-xs"
          onClick={onToggleFaces}
        >
          {copy.finishFaces}
        </Button>
      )}
      <section aria-labelledby={headingId} className="shrink-0 space-y-2">
        <h3 id={headingId} className="mld-kicker">
          {SCENE_SHELL_COPY.tools}
        </h3>
        <div className={TILES}>
          <div ref={toolsSlot} className="contents" />
          {selected.length === 1 && !components.selection && (
            <RequiresTool family="model.precise">
              <SceneTile
                icon={Crosshair}
                label="Pivô"
                title="Onde gira"
                pressed={workshop.tool === 'pivot'}
                onClick={() => workshop.setTool('pivot')}
              />
            </RequiresTool>
          )}
        </div>
      </section>
      {/*
       * O que se usa menos, recolhido: a caixa e o laço, escolher várias, os grupos e a malha.
       * As ferramentas básicas permanecem na mesma ordem ao abrir os detalhes.
       */}
      <details className="mld-rail-more shrink-0">
        <summary>
          {SCENE_SHELL_COPY.moreTools}
          <ChevronDown aria-hidden="true" />
        </summary>
        <div className={TILES}>
          <RequiresTool family="model.mesh">
            {!components.selection && (
              <SceneTile
                ref={faceToggle}
                icon={Waypoints}
                label={
                  components.selection
                    ? copy.finishFaces
                    : selected.length === 1 && index.skinsByNode.has(selected[0]!)
                      ? copy.editSkinBase
                      : copy.editFaces
                }
                pressed={components.selection !== null}
                disabled={!components.canEdit}
                onClick={onToggleFaces}
              />
            )}
          </RequiresTool>
          <div ref={areaToolsSlot} className="contents" />
          <SceneTile
            icon={ListChecks}
            label={copy.addSelection}
            pressed={workshop.additive}
            onClick={() => workshop.setAdditive(!workshop.additive)}
          />
          <RequiresTool family="model.pieces">
            <SceneTile
              icon={Group}
              label={copy.group}
              disabled={!selected.length}
              onClick={() =>
                run(
                  (source) => groupSceneNodes(source, selected, { name: copy.groupName }),
                  'created',
                )
              }
            />
            <SceneTile
              icon={Ungroup}
              label={copy.ungroup}
              disabled={
                !selected.length ||
                selected.some((id) => index.scene.nodes.get(id)?.kind !== 'group')
              }
              onClick={(event) => {
                const from = event.currentTarget
                if (run((source) => ungroupSceneNodes(source, selected), 'clear'))
                  focusWorkshopStage(from)
              }}
            />
          </RequiresTool>
          <RequiresTool family="model.mesh">
            <SceneTile
              icon={Shapes}
              label={copy.convertMesh}
              title={copy.convertMeshHint}
              disabled={!canConvert}
              onClick={() => run((source) => convertSceneNodesToMesh(source, selected))}
            />
          </RequiresTool>
        </div>
      </details>
      <div className="shrink-0">
        <SceneCreateMenu run={run} document={workshop.document} selected={selected} />
      </div>
      <div className="min-w-0 shrink-0">
        <SceneUpcomingTools tabs={['model', 'files']} />
      </div>
    </div>
  )
}
