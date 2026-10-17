/**
 * Trilho vertical comum: ferramentas nomeadas, formas e detalhes conforme o acesso.
 * A oficina controla a ferramenta; os controles do palco chegam por portais.
 */
import { useId } from 'react'
import { COPY } from '../../../core/copy'
import { SCENE_SHELL_COPY } from '../../../core/sceneShellCopy'
import {
  convertSceneNodesToMesh,
  groupSceneNodes,
  ungroupSceneNodes,
} from '../../../scene/commands'
import { RequiresTool } from '../../toolAccess'
import { ChevronDown, Crosshair, Group, ListChecks, Shapes, Slice, Ungroup } from '../../ui/icons'
import { focusWorkshopStage } from './focusStage'
import { SceneCreateMenu } from './SceneCreateMenu'
import { SceneTile, SCENE_TILE_GRID as TILES } from './SceneTile'
import { SceneUpcomingTools } from './SceneUpcomingTools'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function SceneModelColumn({
  workshop,
  toolsSlot,
  areaToolsSlot,
  canConvert,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
  toolsSlot(element: HTMLDivElement | null): void
  areaToolsSlot(element: HTMLDivElement | null): void
  canConvert: boolean
}) {
  const copy = COPY.scene
  const headingId = useId()
  const { selected, run, components, index } = workshop
  return (
    // O trilho rola sem deslocar o palco; a edição de componentes termina no painel direito.
    <div className="mld-workshop-rail mld-bar">
      <section aria-labelledby={headingId} className="shrink-0 space-y-2">
        <h3 id={headingId} className="mld-kicker">
          {SCENE_SHELL_COPY.tools}
        </h3>
        <div className={TILES}>
          <div ref={toolsSlot} className="contents" />
          {selected.length === 1 && !components.selection && (
            <RequiresTool family="model.pivot">
              <SceneTile
                icon={Crosshair}
                label="Pivô"
                keyHint="P"
                aria-keyshortcuts="P"
                title="Onde gira"
                pressed={workshop.tool === 'pivot'}
                onClick={() => workshop.setTool('pivot')}
              />
            </RequiresTool>
          )}
          <RequiresTool family="model.cut">
            <SceneTile
              icon={Slice}
              label="Cortar"
              keyHint="K"
              aria-keyshortcuts="K"
              pressed={workshop.tool === 'knife'}
              onClick={() => workshop.setTool('knife')}
            />
          </RequiresTool>
        </div>
      </section>
      <div className="shrink-0 border-t border-mld-border pt-3">
        <SceneCreateMenu run={run} document={workshop.document} selected={selected} />
      </div>
      {/*
       * O que se usa menos, recolhido: a caixa e o laço, escolher várias, os grupos e a malha.
       * As ferramentas básicas permanecem na mesma ordem ao abrir os detalhes.
       */}
      <details className="mld-rail-more shrink-0">
        <summary>
          Seleção e organização
          <ChevronDown aria-hidden="true" />
        </summary>
        <div className={TILES}>
          <div ref={areaToolsSlot} className="contents" />
          <RequiresTool family="model.cut">
            <SceneTile
              icon={Slice}
              label="Separar peça"
              title="Divide o volume em duas peças fechadas"
              pressed={workshop.tool === 'cut'}
              onClick={() => workshop.setTool('cut')}
            />
          </RequiresTool>
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
        <SceneUpcomingTools tabs={['model', 'files']} />
      </details>
    </div>
  )
}
