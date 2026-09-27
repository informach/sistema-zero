/**
 * A coluna da ESQUERDA do Modelar, no desenho da tela-modelo (11/09/2026): "Ferramentas" em
 * ladrilhos de duas colunas, "Mais ferramentas" recolhido, as formas à vista e a linha do que
 * vem por aí.
 *
 * Escolher, Mover, Girar e Mudar tamanho (e, recolhidos, a caixa e o laço) são do PALCO: é ele
 * o dono da ferramenta ligada, e ele os desenha aqui por portal, nos dois lugares marcados com
 * `display: contents` (os ladrilhos entram na grade como se fossem daqui).
 */
import { type RefObject, useId } from 'react'
import { COPY } from '../../../core/copy'
import { SCENE_SHELL_COPY } from '../../../core/sceneShellCopy'
import {
  convertSceneNodesToMesh,
  deleteSceneNodes,
  duplicateSceneNodes,
  groupSceneNodes,
  ungroupSceneNodes,
} from '../../../scene/commands'
import { RequiresTool } from '../../toolAccess'
import {
  ChevronDown,
  Copy,
  Group,
  ListChecks,
  Shapes,
  Trash2,
  Ungroup,
  Waypoints,
} from '../../ui/icons'
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
    // Abaixo de `lg` a coluna deita: uma fileira que rola de lado, cada grupo com os ladrilhos
    // numa linha só (o palco precisa da altura no tablet e no celular).
    <div className="mld-bar mld-scroll-x mld-scroll-y flex shrink-0 items-start gap-4 overflow-x-auto border-b p-3 lg:w-60 lg:flex-col lg:items-stretch lg:overflow-x-hidden lg:overflow-y-auto lg:border-r lg:border-b-0">
      <section aria-labelledby={headingId} className="shrink-0 space-y-2">
        <h3 id={headingId} className="mld-kicker">
          {SCENE_SHELL_COPY.tools}
        </h3>
        <div className={TILES}>
          <div ref={toolsSlot} className="contents" />
          <RequiresTool family="model.pieces">
            <SceneTile
              icon={Copy}
              label={copy.duplicate}
              disabled={!selected.length}
              onClick={() => run((source) => duplicateSceneNodes(source, selected), 'created')}
            />
            <SceneTile
              icon={Trash2}
              label={copy.remove}
              disabled={!selected.length || components.selection !== null}
              onClick={() => run((source) => deleteSceneNodes(source, selected), 'clear')}
            />
          </RequiresTool>
          <RequiresTool family="model.mesh">
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
          </RequiresTool>
        </div>
      </section>
      {/*
       * O que se usa menos, recolhido: a caixa e o laço, escolher várias, os grupos e a malha.
       * É ele que paga as formas à vista (a catraca dos controles encarados não sobe).
       */}
      <details className="group shrink-0 rounded-xl border border-mld-border">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-bold text-mld-text [&::-webkit-details-marker]:hidden">
          {SCENE_SHELL_COPY.moreTools}
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 transition group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <div className={`${TILES} p-1.5 pt-0`}>
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
              onClick={() => run((source) => ungroupSceneNodes(source, selected), 'clear')}
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
        <SceneCreateMenu run={run} />
      </div>
      <div className="shrink-0 max-lg:w-56">
        <SceneUpcomingTools tabs={['model', 'files']} />
      </div>
    </div>
  )
}
